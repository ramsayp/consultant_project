import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getComments from '@salesforce/apex/WorkItemController.getComments';
import addComment  from '@salesforce/apex/WorkItemController.addComment';

export default class WorkItemComments extends LightningElement {
    @api recordId;

    showCreate  = false;
    draftBody   = '';
    isSaving    = false;
    comments    = [];
    _wiredComments;

    @wire(getComments, { workItemId: '$recordId' })
    wiredComments(result) {
        this._wiredComments = result;
        if (result.data) {
            this.comments = result.data.map(c => ({
                Id:            c.Id,
                body:          c.Body__c,
                authorName:    c.CreatedBy?.Name ?? 'Unknown',
                formattedDate: new Date(c.CreatedDate).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })
            }));
        }
    }

    get commentCount() { return this.comments.length; }
    get hasComments()  { return this.comments.length > 0; }
    get isEmpty()      { return !this.showCreate && this.comments.length === 0; }
    get saveDisabled() { return this.isSaving || !this.draftBody.trim(); }

    handleAdd()    { this.showCreate = true; }
    handleCancel() { this.showCreate = false; this.draftBody = ''; }
    handleBodyChange(event) { this.draftBody = event.detail.value; }

    async handleSave() {
        if (!this.draftBody.trim()) return;
        this.isSaving = true;
        try {
            await addComment({ workItemId: this.recordId, body: this.draftBody.trim() });
            this.draftBody   = '';
            this.showCreate  = false;
            await refreshApex(this._wiredComments);
        } finally {
            this.isSaving = false;
        }
    }
}
