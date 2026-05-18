import { LightningElement, api, wire, track } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { createRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import WORK_ITEM_OBJECT from '@salesforce/schema/Work_Item__c';
import getActiveSprints from '@salesforce/apex/WorkItemController.getActiveSprints';
import getEpics         from '@salesforce/apex/WorkItemController.getEpics';

const WORK_MODE = {
    Project: null, Epic: null,
    Story: 'Iterative', Chapter: 'Iterative',
    Task: 'Continuous', Bug: 'Reactive', Step: null
};

const DEFAULT_STATUS = {
    Project: 'Active', Epic: 'Not Started',
    Story: 'Not Started', Task: 'Not Started', Bug: 'Not Started',
    Chapter: 'Not Started', Step: 'Not Started'
};

const SPRINT_TYPES        = new Set(['Story', 'Task', 'Bug']);
const ESTIMATE_TYPES      = new Set(['Story', 'Task', 'Bug', 'Chapter', 'Epic']);
const PARENT_TYPES        = new Set(['Story', 'Task', 'Bug']);
const USER_STORY_TYPES    = new Set(['Story']);
const AC_TYPES            = new Set(['Story', 'Task', 'Bug']);

const USER_STORY_TEMPLATE = 'As a [user], I want [goal], so that [reason].';

export default class WorkItemCreate extends LightningElement {
    @api type         = 'Story';
    @api parentId;
    @api sprintId;
    @api projectId;

    @track name               = '';
    @track description        = '';
    @track userStory          = '';
    @track acceptanceCriteria = '';
    @track priority           = 'Medium';
    @track estimate           = null;
    @track selectedSprintId   = null;
    @track selectedParentId   = null;
    @track isCreating         = false;

    sprints = [];
    epics   = [];

    @wire(getObjectInfo, { objectApiName: WORK_ITEM_OBJECT })
    objectInfo;

    @wire(getActiveSprints)
    wiredSprints({ data }) { if (data) this.sprints = data; }

    get showSprintPicker()    { return SPRINT_TYPES.has(this.type); }
    get showEstimate()        { return ESTIMATE_TYPES.has(this.type); }
    get showParentPicker()    { return PARENT_TYPES.has(this.type); }
    get showUserStory()       { return USER_STORY_TYPES.has(this.type); }
    get showAcceptanceCriteria() { return AC_TYPES.has(this.type); }
    get createLabel()         { return `Create ${this.type}`; }
    get isCreateDisabled()    { return this.isCreating || !this.recordTypeId; }

    async connectedCallback() {
        if (USER_STORY_TYPES.has(this.type)) {
            this.userStory = USER_STORY_TEMPLATE;
        }
        // Fetch epics imperatively so newly created epics always appear
        try {
            this.epics = await getEpics({ projectId: null });
        } catch(e) { /* epics optional */ }
    }

    get sprintOptions() {
        const opts = [{ label: '— No Sprint —', value: '' }];
        this.sprints.forEach(s => opts.push({ label: s.Name, value: s.Id }));
        return opts;
    }

    get parentOptions() {
        const opts = [{ label: '— No Parent —', value: '' }];
        this.epics.forEach(e => {
            const project = e.Parent_Work_Item__r?.Name;
            const label = project ? `${e.Name} (${project})` : e.Name;
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
            Name:         this.name.trim(),
            RecordTypeId: this.recordTypeId,
            Status__c:    DEFAULT_STATUS[this.type],
            Priority__c:  this.priority,
        };

        // Only include optional fields when they have a value — LDS rejects explicit null for LTA fields
        if (this.description)        fields.Description__c         = this.description;
        if (this.userStory)          fields.User_Story__c          = this.userStory;
        if (this.acceptanceCriteria) fields.Acceptance_Criteria__c = this.acceptanceCriteria;
        if (WORK_MODE[this.type])    fields.Work_Mode__c           = WORK_MODE[this.type];
        if (this.estimate != null)   fields.Estimate__c            = Number(this.estimate);

        const parentId = this.selectedParentId || this.parentId
            || (this.type === 'Epic' ? this.projectId : null)
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
        this.name = ''; this.description = ''; this.userStory = ''; this.acceptanceCriteria = '';
        this.priority = 'Medium'; this.estimate = null;
        this.selectedSprintId = null; this.selectedParentId = null;
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
