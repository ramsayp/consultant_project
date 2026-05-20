// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, api, wire, track } from "lwc";
import { refreshApex } from "@salesforce/apex";
import LightningConfirm from "lightning/confirm";
import getComments from "@salesforce/apex/WorkItemController.getComments";
import addComment from "@salesforce/apex/WorkItemController.addComment";
import editComment from "@salesforce/apex/WorkItemController.editComment";
import deleteComment from "@salesforce/apex/WorkItemController.deleteComment";

// Date/time format used when displaying comment timestamps
const FMT = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
};

// Record-page applet — displays the comment thread for a work item and allows
// adding, editing, and deleting comments inline.
export default class WorkItemComments extends LightningElement {
  // ── Public API ────────────────────────────────────────────────────────────
  @api recordId; // Id of the work item whose comments are shown

  // ── State ─────────────────────────────────────────────────────────────────
  @track showCreate = false; // controls the new-comment compose form
  @track editingId = null; // Id of the comment currently being edited (null = none)
  @track editDraft = ""; // draft text in the edit form
  draftBody = ""; // draft text in the compose form
  isSaving = false; // true while any Apex call is in flight (disables save buttons)
  _comments = []; // shaped comment objects for the template
  _wiredComments; // raw wire result — held so refreshApex can target it

  // ── Wire adapter ─────────────────────────────────────────────────────────
  // Fetches and transforms the raw Comment__c records into display-ready objects.
  // A comment is marked as edited when LastModifiedDate is more than 5 seconds after CreatedDate.
  @wire(getComments, { workItemId: "$recordId" })
  wiredComments(result) {
    this._wiredComments = result;
    if (result.data) {
      this._comments = result.data.map((c) => {
        const created = new Date(c.CreatedDate);
        const modified = new Date(c.LastModifiedDate);
        const isEdited = modified - created > 5000; // 5 s threshold avoids false positives from trigger stamps
        return {
          Id: c.Id,
          body: c.Body__c,
          authorName: c.CreatedBy?.Name ?? "Unknown",
          formattedDate: created.toLocaleString("en-GB", FMT),
          isEdited
        };
      });
    }
  }

  // ── Computed properties ───────────────────────────────────────────────────
  // Merges the editing state into each comment so the template can show/hide inline forms
  get comments() {
    return this._comments.map((c) => ({
      ...c,
      isEditing: c.Id === this.editingId
    }));
  }

  get commentCount() {
    return this._comments.length;
  }
  get hasComments() {
    return this._comments.length > 0;
  }
  get isEmpty() {
    return !this.showCreate && this._comments.length === 0;
  } // shows empty state message
  get saveDisabled() {
    return this.isSaving || !this.draftBody.trim();
  }
  get editSaveDisabled() {
    return this.isSaving || !this.editDraft.trim();
  }

  // ── Compose handlers ──────────────────────────────────────────────────────
  handleAdd() {
    this.showCreate = true;
  }
  handleCancel() {
    this.showCreate = false;
    this.draftBody = "";
  }
  handleBodyChange(event) {
    this.draftBody = event.detail.value;
  }

  // Submits the new comment, clears the compose form, and refreshes the wire
  async handleSave() {
    if (!this.draftBody.trim()) return;
    this.isSaving = true;
    try {
      await addComment({
        workItemId: this.recordId,
        body: this.draftBody.trim()
      });
      this.draftBody = "";
      this.showCreate = false;
      await refreshApex(this._wiredComments);
    } finally {
      this.isSaving = false;
    }
  }

  // ── Edit handlers ─────────────────────────────────────────────────────────
  // Enters edit mode for the clicked comment, pre-filling the textarea with the current body
  handleEdit(event) {
    const id = event.currentTarget.dataset.id;
    const comment = this._comments.find((c) => c.Id === id);
    if (!comment) return;
    this.editingId = id;
    this.editDraft = comment.body;
  }

  handleEditBodyChange(event) {
    this.editDraft = event.detail.value;
  }
  handleEditCancel() {
    this.editingId = null;
    this.editDraft = "";
  }

  // Saves the edited comment body and exits edit mode
  async handleEditSave() {
    if (!this.editDraft.trim()) return;
    this.isSaving = true;
    try {
      await editComment({
        commentId: this.editingId,
        body: this.editDraft.trim()
      });
      this.editingId = null;
      this.editDraft = "";
      await refreshApex(this._wiredComments);
    } finally {
      this.isSaving = false;
    }
  }

  // ── Delete handler ────────────────────────────────────────────────────────
  // Shows a confirmation dialog before permanently deleting the comment
  async handleDelete(event) {
    const id = event.currentTarget.dataset.id;
    const confirmed = await LightningConfirm.open({
      message: "Are you sure you want to delete this comment?",
      label: "Delete Comment",
      variant: "destructive"
    });
    if (!confirmed) return; // user cancelled the dialog
    this.isSaving = true;
    try {
      await deleteComment({ commentId: id });
      await refreshApex(this._wiredComments);
    } finally {
      this.isSaving = false;
    }
  }
}
