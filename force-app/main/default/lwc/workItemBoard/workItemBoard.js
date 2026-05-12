import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';
import getWorkItems    from '@salesforce/apex/WorkItemController.getWorkItems';
import getActiveSprints from '@salesforce/apex/WorkItemController.getActiveSprints';
import updateStatus    from '@salesforce/apex/WorkItemController.updateStatus';

const STATUS_COLS = {
    Story: ['Backlog', 'Ready', 'In Progress', 'In Review', 'Done'],
    Task:  ['Backlog', 'In Progress', 'Blocked', 'Done'],
    Bug:   ['Open', 'Triaged', 'In Progress', 'Fixed', 'Closed'],
    Epic:  ['Draft', 'Active', 'In Progress', 'Completed', 'Cancelled']
};

const BOARD_TYPES = ['Story', 'Task', 'Bug', 'Epic'];

export default class WorkItemBoard extends NavigationMixin(LightningElement) {
    @api initiativeId         = null;

    @track activeType         = 'Story';
    @track selectedSprint     = null;
    @track showCreate         = false;
    @track isLoading          = true;
    @track error              = null;

    workItems  = [];
    sprints    = [];
    _wiredResult;

    @wire(getActiveSprints)
    wiredSprints({ data }) {
        if (data) this.sprints = data;
    }

    @wire(getWorkItems, { recordTypeName: '$activeType', sprintId: '$selectedSprint', initiativeId: '$initiativeId' })
    wiredItems(result) {
        this._wiredResult = result;
        this.isLoading = false;
        if (result.data) {
            this.workItems = result.data;
            this.error = null;
        } else if (result.error) {
            this.error = result.error?.body?.message ?? 'Failed to load work items.';
        }
    }

    get typeOptions() {
        return BOARD_TYPES.map(t => ({
            value: t,
            label: t + 's',
            variant: t === this.activeType ? 'brand' : 'neutral'
        }));
    }

    get sprintOptions() {
        const opts = [{ label: 'All Sprints', value: '' }];
        this.sprints.forEach(s => opts.push({ label: s.Name, value: s.Id }));
        return opts;
    }

    get newLabel()       { return `+ New ${this.activeType}`; }
    get epicParentId()   { return this.activeType === 'Epic' ? this.initiativeId : null; }

    get columns() {
        const statuses = STATUS_COLS[this.activeType] || [];
        const statusOpts = statuses.map(s => ({ label: s, value: s }));
        return statuses.map(status => {
            const items = this.workItems.filter(i => i.Status__c === status);
            return { status, items, count: items.length, empty: items.length === 0, statusOptions: statusOpts };
        });
    }

    handleTypeSelect(event) {
        const chosen = event.target.dataset.type;
        if (chosen !== this.activeType) {
            this.activeType = chosen;
            this.isLoading  = true;
        }
    }

    handleSprintChange(event) {
        this.selectedSprint = event.detail.value || null;
        this.isLoading = true;
    }

    handleNewClick()      { this.showCreate = true; }
    handleCreateCancel()  { this.showCreate = false; }

    async handleItemCreated() {
        this.showCreate = false;
        await refreshApex(this._wiredResult);
    }

    async handleStatusChange(event) {
        const { id, status } = event.detail;
        try {
            await updateStatus({ workItemId: id, newStatus: status });
            await refreshApex(this._wiredResult);
        } catch (err) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Status update failed',
                message: err?.body?.message ?? err?.message,
                variant: 'error'
            }));
        }
    }

    handleOpenItem(event) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: event.detail.id, actionName: 'view' }
        });
    }
}
