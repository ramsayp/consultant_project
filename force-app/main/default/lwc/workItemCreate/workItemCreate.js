import { LightningElement, api, wire, track } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { createRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import WORK_ITEM_OBJECT from '@salesforce/schema/Work_Item__c';
import getActiveSprints from '@salesforce/apex/WorkItemController.getActiveSprints';
import getEpics from '@salesforce/apex/WorkItemController.getEpics';

const WORK_MODE = {
    Initiative: null, Epic: null,
    Story: 'Iterative', Chapter: 'Iterative',
    Task: 'Continuous', Bug: 'Reactive', Step: null
};

const DEFAULT_STATUS = {
    Initiative: 'Draft', Epic: 'Draft',
    Story: 'Backlog', Task: 'Backlog', Bug: 'Open',
    Chapter: 'To Do', Step: 'To Do'
};

const SPRINT_TYPES   = new Set(['Story', 'Task', 'Bug']);
const ESTIMATE_TYPES = new Set(['Story', 'Task', 'Bug', 'Chapter', 'Epic']);
const PARENT_TYPES   = new Set(['Story', 'Task', 'Bug']);

export default class WorkItemCreate extends LightningElement {
    @api type         = 'Story';
    @api parentId;
    @api sprintId;
    @api initiativeId;

    @track name              = '';
    @track description       = '';
    @track priority          = 'Medium';
    @track estimate          = null;
    @track selectedSprintId  = null;
    @track selectedParentId  = null;
    @track isCreating        = false;

    sprints = [];
    epics   = [];

    @wire(getObjectInfo, { objectApiName: WORK_ITEM_OBJECT })
    objectInfo;

    @wire(getActiveSprints)
    wiredSprints({ data }) { if (data) this.sprints = data; }

    @wire(getEpics, { initiativeId: null })
    wiredEpics({ data }) { if (data) this.epics = data; }

    get showSprintPicker()  { return SPRINT_TYPES.has(this.type); }
    get showEstimate()      { return ESTIMATE_TYPES.has(this.type); }
    get showParentPicker()  { return PARENT_TYPES.has(this.type); }
    get createLabel()       { return `Create ${this.type}`; }

    get sprintOptions() {
        const opts = [{ label: '— No Sprint —', value: '' }];
        this.sprints.forEach(s => opts.push({ label: s.Name, value: s.Id }));
        return opts;
    }

    get parentOptions() {
        const opts = [{ label: '— No Parent —', value: '' }];
        this.epics.forEach(e => {
            const initiative = e.Parent_Work_Item__r?.Name;
            const label = initiative ? `${e.Name} (${initiative})` : e.Name;
            opts.push({ label, value: e.Id });
        });
        return opts;
    }

    get priorityOptions() {
        return [
            { label: 'Critical', value: 'Critical' },
            { label: 'High',     value: 'High' },
            { label: 'Medium',   value: 'Medium' },
            { label: 'Low',      value: 'Low' }
        ];
    }

    get recordTypeId() {
        if (!this.objectInfo?.data) return null;
        const match = Object.values(this.objectInfo.data.recordTypeInfos)
            .find(rt => rt.name === this.type);
        return match?.recordTypeId ?? null;
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    async handleCreate() {
        if (!this.name?.trim()) { this.toast('Title is required', '', 'error'); return; }
        if (!this.recordTypeId) { this.toast('Record type not ready — try again', '', 'error'); return; }

        this.isCreating = true;
        const fields = {
            Name:           this.name.trim(),
            RecordTypeId:   this.recordTypeId,
            Status__c:      DEFAULT_STATUS[this.type],
            Priority__c:    this.priority,
            Description__c: this.description || null
        };

        if (WORK_MODE[this.type])  fields.Work_Mode__c        = WORK_MODE[this.type];
        if (this.estimate != null) fields.Estimate__c         = Number(this.estimate);

        // Epics belong to the Initiative; Stories/Tasks/Bugs belong to the selected Epic
        const parentId = this.selectedParentId || this.parentId
            || (this.type === 'Epic' ? this.initiativeId : null)
            || null;
        if (parentId) fields.Parent_Work_Item__c = parentId;

        const sprint = this.selectedSprintId || this.sprintId || null;
        if (sprint) fields.Sprint__c = sprint;

        try {
            const rec = await createRecord({ apiName: WORK_ITEM_OBJECT.objectApiName, fields });
            this.toast(`${this.type} created`, this.name, 'success');
            this.dispatchEvent(new CustomEvent('created', { detail: { id: rec.id } }));
            this.reset();
        } catch (err) {
            this.toast('Creation failed', err?.body?.message ?? err?.message, 'error');
        } finally {
            this.isCreating = false;
        }
    }

    handleCancel() { this.reset(); this.dispatchEvent(new CustomEvent('cancel')); }

    reset() {
        this.name = ''; this.description = ''; this.priority = 'Medium';
        this.estimate = null; this.selectedSprintId = null; this.selectedParentId = null;
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
