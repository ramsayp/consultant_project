// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, api, track } from "lwc";
import { updateRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getTicketReviewContext from "@salesforce/apex/WorkItemController.getTicketReviewContext";
import approveTicket from "@salesforce/apex/WorkItemController.approveTicket";
import declineTicket from "@salesforce/apex/WorkItemController.declineTicket";

// ── Constants ─────────────────────────────────────────────────────────────────

const TARGET_TYPE_OPTIONS = [
  { label: "Story", value: "Story" },
  { label: "Task", value: "Task" },
  { label: "Bug", value: "Bug" }
];

// Record-page applet — shown only on Ticket records. Lets the reviewer set what
// the ticket will become (Story/Task/Bug) and approve (→ reclassified into the
// Backlog) or decline (→ reviewer notes, back to the BA agent for re-triage).
export default class TicketReview extends LightningElement {
  // ── Public API ────────────────────────────────────────────────────────────
  @api recordId;

  // ── State ─────────────────────────────────────────────────────────────────
  @track recordTypeName = null; // type of the current record — applet only renders for 'Ticket'
  @track triageStatus = null;
  @track triageNotes = null;
  @track targetType = ""; // bound to the "this will become" combobox
  @track declineNotes = "";
  @track showDeclineForm = false;
  @track isSaving = false;

  targetTypeOptions = TARGET_TYPE_OPTIONS;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  async connectedCallback() {
    await this.loadContext();
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  async loadContext() {
    try {
      const ctx = await getTicketReviewContext({ ticketId: this.recordId });
      this.recordTypeName = ctx.recordTypeName;
      this.triageStatus = ctx.triageStatus;
      this.triageNotes = ctx.triageNotes;
      this.targetType = ctx.targetType || "";
    } catch (e) {
      console.error("ticketReview: failed to load context", e);
    }
  }

  // ── Computed properties ───────────────────────────────────────────────────
  get isTicket() {
    return this.recordTypeName === "Ticket";
  }
  get hasTriageNotes() {
    return !!this.triageNotes;
  }
  get isApproveDisabled() {
    return this.isSaving || !this.targetType;
  }
  get isDeclineDisabled() {
    return this.isSaving || !this.declineNotes?.trim();
  }

  // ── Target type ───────────────────────────────────────────────────────────
  // Saves immediately on change so the choice persists for the BA agent /
  // reviewer even if Approve isn't clicked right away.
  async handleTargetTypeChange(event) {
    this.targetType = event.detail.value;
    try {
      await updateRecord({
        fields: { Id: this.recordId, Target_Type__c: this.targetType }
      });
    } catch (e) {
      this.toast("Save failed", e?.body?.message ?? e?.message, "error");
    }
  }

  // ── Decline form toggle ───────────────────────────────────────────────────
  showDecline() {
    this.showDeclineForm = true;
  }
  hideDecline() {
    this.showDeclineForm = false;
    this.declineNotes = "";
  }
  handleDeclineNotesChange(event) {
    this.declineNotes = event.detail.value;
  }

  // ── Review actions ────────────────────────────────────────────────────────
  async handleApprove() {
    this.isSaving = true;
    try {
      await approveTicket({ ticketId: this.recordId });
      this.toast(
        "Ticket approved",
        "Reclassified and moved to the Backlog",
        "success"
      );
      await this.loadContext();
    } catch (e) {
      this.toast("Approval failed", e?.body?.message ?? e?.message, "error");
    } finally {
      this.isSaving = false;
    }
  }

  async handleDecline() {
    if (!this.declineNotes?.trim()) {
      return;
    }
    this.isSaving = true;
    try {
      await declineTicket({
        ticketId: this.recordId,
        notes: this.declineNotes.trim()
      });
      this.toast(
        "Ticket declined",
        "Sent back to the BA agent for re-review",
        "success"
      );
      this.hideDecline();
      await this.loadContext();
    } catch (e) {
      this.toast("Decline failed", e?.body?.message ?? e?.message, "error");
    } finally {
      this.isSaving = false;
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
