import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getParentContext     from '@salesforce/apex/WorkItemController.getParentContext';
import getCandidateParents  from '@salesforce/apex/WorkItemController.getCandidateParents';

const PARENT_LABEL = {
    'Epic':    'Project',
    'Story':   'Epic',
    'Task':    'Epic',
    'Bug':     'Epic',
    'Chapter': 'Story',
    'Step':    'Chapter'
};

export default class WorkItemParentSelector extends NavigationMixin(LightningElement) {
    @api recordId;

    @track recordTypeName = null;
    @track parentId       = null;
    @track parentName     = null;
    @track candidates     = [];
    @track selectedParentId = null;
    @track isEditing      = false;
    @track isSaving       = false;

    async connectedCallback() {
        await this.loadContext();
    }

    async loadContext() {
        try {
            const ctx = await getParentContext({ recordId: this.recordId });
            this.recordTypeName = ctx.recordTypeName;
            this.parentId       = ctx.parentId   || null;
            this.parentName     = ctx.parentName || null;
            this.selectedParentId = this.parentId || '';
            if (this.hasParentType) {
                this.candidates = await getCandidateParents({ recordTypeName: this.recordTypeName });
            }
        } catch(e) {
            console.error('workItemParentSelector: failed to load context', e);
        }
    }

    get hasParentType()   { return !!PARENT_LABEL[this.recordTypeName]; }
    get parentTypeLabel() { return PARENT_LABEL[this.recordTypeName] || ''; }

    get parentOptions() {
        const opts = [{ label: '— None —', value: '' }];
        this.candidates.forEach(c => opts.push({ label: c.Name, value: c.Id }));
        return opts;
    }

    handleEdit() {
        this.selectedParentId = this.parentId || '';
        this.isEditing = true;
    }

    handleCancel() {
        this.isEditing = false;
    }

    handleChange(event) {
        this.selectedParentId = event.detail.value;
    }

    async handleSave() {
        this.isSaving = true;
        try {
            await updateRecord({
                fields: {
                    Id:                   this.recordId,
                    Parent_Work_Item__c:  this.selectedParentId || null
                }
            });
            this.isEditing = false;
            await this.loadContext();
            this.toast('Parent updated', '', 'success');
        } catch(e) {
            this.toast('Save failed', e?.body?.message ?? e?.message, 'error');
        } finally {
            this.isSaving = false;
        }
    }

    handleNavigate() {
        if (!this.parentId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: this.parentId, actionName: 'view' }
        });
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
