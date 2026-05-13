import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';
import getBoardItems    from '@salesforce/apex/WorkItemController.getBoardItems';
import getActiveSprints from '@salesforce/apex/WorkItemController.getActiveSprints';
import updateStatus     from '@salesforce/apex/WorkItemController.updateStatus';
import updateSprint     from '@salesforce/apex/WorkItemController.updateSprint';

const STAGES = ['To Do', 'In Progress', 'Review', 'Done'];

const STATUS_TO_STAGE = {
    'Backlog': 'To Do', 'Open': 'To Do', 'Draft': 'To Do', 'Ready': 'To Do', 'To Do': 'To Do',
    'In Progress': 'In Progress', 'In Sprint': 'In Progress', 'Active': 'In Progress', 'Triaged': 'In Progress',
    'In Review': 'Review', 'Blocked': 'Review', 'Fixed': 'Review',
    'Done': 'Done', 'Closed': 'Done', 'Completed': 'Done', 'Cancelled': 'Done',
    'Rolled Forward': 'Done', 'Wont Fix': 'Done'
};

const TYPE_STAGE_STATUS = {
    Story:   { 'To Do': 'Ready',       'In Progress': 'In Progress', 'Review': 'In Review',   'Done': 'Done' },
    Task:    { 'To Do': 'Backlog',     'In Progress': 'In Progress', 'Review': 'Blocked',     'Done': 'Done' },
    Bug:     { 'To Do': 'Open',        'In Progress': 'In Progress', 'Review': 'In Review',   'Done': 'Fixed' },
    Chapter: { 'To Do': 'To Do',       'In Progress': 'In Progress', 'Review': 'In Progress', 'Done': 'Done' }
};

const STAGE_OPTS = STAGES.map(s => ({ label: s, value: s }));

export default class WorkItemBoard extends NavigationMixin(LightningElement) {
    @api initiativeId = null;

    @track showCreate    = false;
    @track createType    = 'Story';
    @track createSprint  = null;
    @track createParent  = null;
    @track isLoading     = true;
    @track error         = null;

    workItems = [];
    sprints   = [];
    _wiredResult;

    @wire(getActiveSprints)
    wiredSprints({ data }) { if (data) this.sprints = data; }

    @wire(getBoardItems, { initiativeId: '$initiativeId' })
    wiredItems(result) {
        this._wiredResult = result;
        this.isLoading = false;
        if (result.data)  { this.workItems = result.data; this.error = null; }
        else if (result.error) { this.error = result.error?.body?.message ?? 'Failed to load items.'; }
    }

    get typeOptions() {
        return [
            { label: 'Story', value: 'Story' },
            { label: 'Task',  value: 'Task' },
            { label: 'Bug',   value: 'Bug' }
        ];
    }

    get sprintOptions() {
        const opts = [{ label: '— Backlog —', value: '' }];
        this.sprints.forEach(s => opts.push({ label: s.Name, value: s.Id }));
        return opts;
    }

    get stageOptions() { return STAGE_OPTS; }

    // ── Epic panel ──────────────────────────────────────────────────────────
    get epicGroups() {
        const epics = this.workItems.filter(i => i.RecordType?.Name === 'Epic');
        const groups = [
            { key: 'active',    label: 'Active',    statuses: null },
            { key: 'completed', label: 'Completed', statuses: ['Completed'] },
            { key: 'cancelled', label: 'Cancelled', statuses: ['Cancelled'] }
        ];
        return groups.map(g => {
            const items = g.statuses
                ? epics.filter(e => g.statuses.includes(e.Status__c))
                : epics.filter(e => !['Completed', 'Cancelled'].includes(e.Status__c));
            return { ...g, items, count: items.length, empty: items.length === 0 };
        });
    }

    get epicCount() {
        return this.workItems.filter(i => i.RecordType?.Name === 'Epic').length;
    }

    // ── Sprint kanban ────────────────────────────────────────────────────────
    get sprintSections() {
        return this.sprints.map(sprint => {
            const items = this.workItems.filter(i =>
                i.RecordType?.Name !== 'Epic' && i.Sprint__c === sprint.Id
            );
            const columns = STAGES.map(stage => {
                const colItems = items.filter(i => (STATUS_TO_STAGE[i.Status__c] || 'To Do') === stage);
                return { stage, items: colItems, count: colItems.length, empty: colItems.length === 0 };
            });
            return {
                sprintId:  sprint.Id,
                name:      sprint.Name,
                startDate: sprint.Start_Date__c,
                endDate:   sprint.End_Date__c,
                count:     items.length,
                columns
            };
        });
    }

    // ── Backlog ──────────────────────────────────────────────────────────────
    get backlogItems() {
        const sprintIds = new Set(this.sprints.map(s => s.Id));
        return this.workItems.filter(i => {
            if (i.RecordType?.Name === 'Epic') return false;
            return !i.Sprint__c || !sprintIds.has(i.Sprint__c);
        });
    }

    get backlogCount() { return this.backlogItems.length; }

    // ── Handlers ─────────────────────────────────────────────────────────────
    handleTypeChange(event) { this.createType = event.detail.value; }

    handleNewClick(event) {
        this.createType   = event.currentTarget.dataset.type || this.createType;
        this.createSprint = event.currentTarget.dataset.sprintId || null;
        this.createParent = null;
        this.showCreate   = true;
    }

    handleAddChapter(event) {
        const { parentId, sprintId } = event.detail;
        this.createType   = 'Chapter';
        this.createSprint = sprintId;
        this.createParent = parentId;
        this.showCreate   = true;
    }

    handleCreateCancel() {
        this.showCreate   = false;
        this.createParent = null;
    }

    async handleItemCreated() {
        this.showCreate   = false;
        this.createParent = null;
        await refreshApex(this._wiredResult);
    }

    async handleStatusChange(event) {
        const { id, status: stage } = event.detail;
        const item = this.workItems.find(i => i.Id === id);
        if (!item) return;
        const typeName = item.RecordType?.Name ?? 'Story';
        const actualStatus = (TYPE_STAGE_STATUS[typeName] || {})[stage] || stage;
        try {
            await updateStatus({ workItemId: id, newStatus: actualStatus });
            await refreshApex(this._wiredResult);
        } catch (err) {
            this.toast('Status update failed', err?.body?.message ?? err?.message, 'error');
        }
    }

    async handleSprintChange(event) {
        const { id, sprintId } = event.detail;
        try {
            await updateSprint({ workItemId: id, sprintId: sprintId || null });
            await refreshApex(this._wiredResult);
        } catch (err) {
            this.toast('Sprint update failed', err?.body?.message ?? err?.message, 'error');
        }
    }

    handleOpenItem(event) {
        const id = event.detail?.id || event.currentTarget?.dataset?.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, actionName: 'view' }
        });
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
