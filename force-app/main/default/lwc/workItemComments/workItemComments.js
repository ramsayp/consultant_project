import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import LightningConfirm from 'lightning/confirm';
import getComments    from '@salesforce/apex/WorkItemController.getComments';
import addComment     from '@salesforce/apex/WorkItemController.addComment';
import editComment    from '@salesforce/apex/WorkItemController.editComment';
import deleteComment  from '@salesforce/apex/WorkItemController.deleteComment';

const FMT = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

export default class WorkItemComments extends LightningElement {
    @api recordId;

    @track showCreate  = false;
    @track editingId   = null;
    @track editDraft   = '';
    draftBody   = '';
    isSaving    = false;
    _comments   = [];
    _wiredComments;

    @wire(getComments, { workItemId: '$recordId' })
    wiredComments(result) {
        this._wiredComments = result;
        if (result.data) {
            this._comments = result.data.map(c => {
                const created  = new Date(c.CreatedDate);
                const modified = new Date(c.LastModifiedDate);
                const isEdited = (modified - created) > 5000;
                return {
                    Id:            c.Id,
                    body:          c.Body__c,
                    authorName:    c.CreatedBy?.Name ?? 'Unknown',
                    formattedDate: created.toLocaleString('en-GB', FMT),
                    isEdited
                };
            });
        }
    }

    get comments() {
        return this._comments.map(c => ({ ...c, isEditing: c.Id === this.editingId }));
    }

    get commentCount() { return this._comments.length; }
    get hasComments()  { return this._comments.length > 0; }
    get isEmpty()      { return !this.showCreate && this._comments.length === 0; }
    get saveDisabled() { return this.isSaving || !this.draftBody.trim(); }
    get editSaveDisabled() { return this.isSaving || !this.editDraft.trim(); }

    handleAdd()    { this.showCreate = true; }
    handleCancel() { this.showCreate = false; this.draftBody = ''; }
    handleBodyChange(event) { this.draftBody = event.detail.value; }

    async handleSave() {
        if (!this.draftBody.trim()) return;
        this.isSaving = true;
        try {
            await addComment({ workItemId: this.recordId, body: this.draftBody.trim() });
            this.draftBody  = '';
            this.showCreate = false;
            await refreshApex(this._wiredComments);
        } finally {
            this.isSaving = false;
        }
    }

    handleEdit(event) {
        const id = event.currentTarget.dataset.id;
        const comment = this._comments.find(c => c.Id === id);
        if (!comment) return;
        this.editingId = id;
        this.editDraft = comment.body;
    }

    handleEditBodyChange(event) { this.editDraft = event.detail.value; }

    handleEditCancel() { this.editingId = null; this.editDraft = ''; }

    async handleEditSave() {
        if (!this.editDraft.trim()) return;
        this.isSaving = true;
        try {
            await editComment({ commentId: this.editingId, body: this.editDraft.trim() });
            this.editingId = null;
            this.editDraft = '';
            await refreshApex(this._wiredComments);
        } finally {
            this.isSaving = false;
        }
    }

    async handleDelete(event) {
        const id = event.currentTarget.dataset.id;
        const confirmed = await LightningConfirm.open({
            message: 'Are you sure you want to delete this comment?',
            label:   'Delete Comment',
            variant: 'destructive'
        });
        if (!confirmed) return;
        this.isSaving = true;
        try {
            await deleteComment({ commentId: id });
            await refreshApex(this._wiredComments);
        } finally {
            this.isSaving = false;
        }
    }
}
