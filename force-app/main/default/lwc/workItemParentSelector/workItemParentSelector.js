// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { updateRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getParentContext from "@salesforce/apex/WorkItemController.getParentContext";
import getCandidateParents from "@salesforce/apex/WorkItemController.getCandidateParents";

// ── Constants ─────────────────────────────────────────────────────────────────

// Maps a child record type to its parent record type label for the UI heading
const PARENT_LABEL = {
  Epic: "Project",
  Story: "Epic",
  Task: "Epic",
  Bug: "Epic",
  Chapter: "Story",
  Step: "Chapter"
};

// Record-page applet — shows the current parent of a work item and lets the user
// reassign it to a different parent of the correct type.
export default class WorkItemParentSelector extends NavigationMixin(
  LightningElement
) {
  // ── Public API ────────────────────────────────────────────────────────────
  @api recordId;

  // ── State ─────────────────────────────────────────────────────────────────
  @track recordTypeName = null; // type of the current record (e.g. 'Story')
  @track parentId = null; // Id of the current parent record
  @track parentName = null; // Name of the current parent record
  @track candidates = []; // list of eligible parent records for the dropdown
  @track selectedParentId = ""; // value bound to the combobox while editing
  @track isEditing = false;
  @track isSaving = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  async connectedCallback() {
    await this.loadContext();
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  // Fetches the record type and current parent, then loads the candidate parent list
  async loadContext() {
    try {
      const ctx = await getParentContext({ recordId: this.recordId });
      this.recordTypeName = ctx.recordTypeName;
      this.parentId = ctx.parentId || null;
      this.parentName = ctx.parentName || null;
      this.selectedParentId = this.parentId || "";
      if (this.hasParentType) {
        // Only types that have a parent relationship fetch candidates
        this.candidates = await getCandidateParents({
          recordTypeName: this.recordTypeName
        });
      }
    } catch (e) {
      console.error("workItemParentSelector: failed to load context", e);
    }
  }

  // ── Computed properties ───────────────────────────────────────────────────
  get hasParentType() {
    return !!PARENT_LABEL[this.recordTypeName];
  } // false for types like Project that have no parent
  get parentTypeLabel() {
    return PARENT_LABEL[this.recordTypeName] || "";
  }

  // Builds the dropdown options: a blank "None" entry followed by all candidates
  get parentOptions() {
    const opts = [{ label: "— None —", value: "" }];
    this.candidates.forEach((c) => opts.push({ label: c.Name, value: c.Id }));
    return opts;
  }

  // ── Edit handlers ─────────────────────────────────────────────────────────
  // Enters edit mode, resetting the combobox to the current saved parent
  handleEdit() {
    this.selectedParentId = this.parentId || "";
    this.isEditing = true;
  }

  handleCancel() {
    this.isEditing = false;
  }

  handleChange(event) {
    this.selectedParentId = event.detail.value;
  }

  // Saves the new parent via LDS updateRecord, then refreshes the displayed context
  async handleSave() {
    this.isSaving = true;
    try {
      await updateRecord({
        fields: {
          Id: this.recordId,
          Parent_Work_Item__c: this.selectedParentId || null // empty string → null clears the relationship
        }
      });
      this.isEditing = false;
      await this.loadContext(); // refresh to show the updated parent name
      this.toast("Parent updated", "", "success");
    } catch (e) {
      this.toast("Save failed", e?.body?.message ?? e?.message, "error");
    } finally {
      this.isSaving = false;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  // Navigates to the parent record page when the parent name link is clicked
  handleNavigate() {
    if (!this.parentId) return;
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: { recordId: this.parentId, actionName: "view" }
    });
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
