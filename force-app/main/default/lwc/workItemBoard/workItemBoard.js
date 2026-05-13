import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';
import getBoardItems        from '@salesforce/apex/WorkItemController.getBoardItems';
import getActiveSprints     from '@salesforce/apex/WorkItemController.getActiveSprints';
import ensureBacklogSprint  from '@salesforce/apex/WorkItemController.ensureBacklogSprint';
import updateStatus         from '@salesforce/apex/WorkItemController.updateStatus';
import updateSprint         from '@salesforce/apex/WorkItemController.updateSprint';

const STAGES = [
    'Not Started', 'To Do', 'In Progress', 'Blocked',
    'Code Review', 'UAT', 'Pipeline', 'Released', 'Documented', 'Done'
];

// Maps any status value (including legacy) to a kanban column
const STATUS_TO_STAGE = {
    // Current values — direct
    'Not Started': 'Not Started',
    'To Do':       'To Do',
    'In Progress': 'In Progress',
    'Blocked':     'Blocked',
    'Code Review': 'Code Review',
    'UAT':         'UAT',
    'Pipeline':    'Pipeline',
    'Released':    'Released',
    'Documented':  'Documented',
    'Done':        'Done',
    // Legacy values — mapped to nearest current stage
    'Backlog': 'Not Started', 'Draft': 'Not Started', 'Open': 'Not Started',
    'Ready': 'To Do', 'Triaged': 'To Do',
    'In Sprint': 'In Progress', 'Active': 'In Progress',
    'In Review': 'Code Review', 'Fixed': 'Code Review',
    'Closed': 'Done', 'Completed': 'Done', 'Cancelled': 'Done',
    'Rolled Forward': 'Done', 'Wont Fix': 'Done'
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
    _wiredSprints;

    async connectedCallback() {
        try {
            await ensureBacklogSprint();
            if (this._wiredSprints) await refreshApex(this._wiredSprints);
        } catch(e) { /* backlog sprint already exists */ }
    }

    @wire(getActiveSprints)
    wiredSprints(result) {
        this._wiredSprints = result;
        if (result.data) this.sprints = result.data;
    }

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
        return this.sprints.map(s => ({ label: s.Name, value: s.Id }));
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
        const sprintIds = new Set(this.sprints.map(s => s.Id));
        return this.sprints.map(sprint => {
            const isBacklog = sprint.Status__c === 'Backlog';
            const items = this.workItems.filter(i => {
                if (i.RecordType?.Name === 'Epic') return false;
                // Backlog sprint absorbs items with no sprint or unknown sprint
                if (isBacklog) return i.Sprint__c === sprint.Id || !i.Sprint__c || !sprintIds.has(i.Sprint__c);
                return i.Sprint__c === sprint.Id;
            });
            const columns = STAGES.map(stage => {
                const colItems = items.filter(i => (STATUS_TO_STAGE[i.Status__c] || 'Not Started') === stage);
                return { stage, items: colItems, count: colItems.length, empty: colItems.length === 0 };
            });
            return {
                sprintId:  sprint.Id,
                name:      sprint.Name,
                startDate: sprint.Start_Date__c,
                endDate:   sprint.End_Date__c,
                isBacklog,
                count:     items.length,
                columns
            };
        });
    }

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
        const { id, status } = event.detail;
        try {
            await updateStatus({ workItemId: id, newStatus: status });
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
