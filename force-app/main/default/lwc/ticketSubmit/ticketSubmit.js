// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import createTicket from "@salesforce/apex/WorkItemController.createTicket";

// Lightweight ticket submission form — the entry point for the BA agent triage
// pipeline. Used both as the utility bar panel (any user) and the admin
// "+ New Ticket" action in the Project Management app. Creates a raw Ticket
// awaiting BA agent triage; no record-type-aware fields here, unlike workItemCreate.
// Fired events: 'created' (with { id }) on success, 'cancel' on cancel.
export default class TicketSubmit extends LightningElement {
  @track title = "";
  @track description = "";
  @track priority = "Medium";
  @track isCreating = false;

  get priorityOptions() {
    return [
      { label: "Critical", value: "Critical" },
      { label: "High", value: "High" },
      { label: "Medium", value: "Medium" },
      { label: "Low", value: "Low" }
    ];
  }

  get isSubmitDisabled() {
    return this.isCreating || !this.title?.trim();
  }

  handleChange(event) {
    const field = event.target.dataset.field;
    this[field] = event.target.value;
  }

  async handleSubmit() {
    if (!this.title?.trim()) {
      this.toast("Title is required", "", "error");
      return;
    }

    this.isCreating = true;
    try {
      const id = await createTicket({
        title: this.title.trim(),
        description: this.description || null,
        priority: this.priority
      });
      this.toast("Ticket submitted", this.title, "success");
      this.dispatchEvent(new CustomEvent("created", { detail: { id } }));
      this.reset();
    } catch (err) {
      this.toast(
        "Submission failed",
        err?.body?.message ?? err?.message,
        "error"
      );
    } finally {
      this.isCreating = false;
    }
  }

  handleCancel() {
    this.reset();
    this.dispatchEvent(new CustomEvent("cancel"));
  }

  reset() {
    this.title = "";
    this.description = "";
    this.priority = "Medium";
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
