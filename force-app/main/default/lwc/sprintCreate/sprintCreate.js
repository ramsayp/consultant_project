// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, track } from "lwc";
import { createRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import SPRINT_OBJECT from "@salesforce/schema/Sprint__c";

// Form component for creating a new sprint record.
// Fired events: 'created' (with { id }) on success, 'cancel' on cancel.
export default class SprintCreate extends LightningElement {
  // ── State ─────────────────────────────────────────────────────────────────
  @track name = "";
  @track startDate = null;
  @track endDate = null;
  @track status = "Planning"; // default status for new sprints
  @track isCreating = false;

  // ── Dropdown options ──────────────────────────────────────────────────────
  get statusOptions() {
    return [
      { label: "Planning", value: "Planning" },
      { label: "Active", value: "Active" },
      { label: "Completed", value: "Completed" }
    ];
  }

  // ── Field change handler ──────────────────────────────────────────────────
  // Reads the data-field attribute on the input to know which property to update.
  // When the start date is set, automatically calculates end date as start + 13 days
  // (two-week sprints, zero-indexed so day 0 = start, day 13 = last day).
  handleChange(event) {
    const field = event.target.dataset.field;
    this[field] = event.target.value;
    if (field === "startDate" && this.startDate) {
      const d = new Date(this.startDate);
      d.setDate(d.getDate() + 13); // two-week sprint: end = start + 13 days
      this.endDate = d.toISOString().split("T")[0]; // strip time portion for date-only field
    }
  }

  // ── Create handler ────────────────────────────────────────────────────────
  // Validates the form, then creates the Sprint__c record via LDS createRecord.
  // Optional date fields are only included when they have a value (LDS rejects explicit null).
  async handleCreate() {
    if (!this.name?.trim()) {
      this.dispatchEvent(
        new ShowToastEvent({ title: "Name is required", variant: "error" })
      );
      return;
    }
    this.isCreating = true;
    const fields = {
      Name: this.name.trim(),
      Status__c: this.status
    };
    if (this.startDate) fields.Start_Date__c = this.startDate; // omit if not set
    if (this.endDate) fields.End_Date__c = this.endDate; // omit if not set

    try {
      const rec = await createRecord({
        apiName: SPRINT_OBJECT.objectApiName,
        fields
      });
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Sprint created",
          message: this.name.trim(),
          variant: "success"
        })
      );
      this.dispatchEvent(
        new CustomEvent("created", { detail: { id: rec.id } })
      );
      this.reset();
    } catch (err) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Creation failed",
          message: err?.body?.message ?? err?.message,
          variant: "error"
        })
      );
    } finally {
      this.isCreating = false;
    }
  }

  // ── Cancel handler ────────────────────────────────────────────────────────
  handleCancel() {
    this.reset();
    this.dispatchEvent(new CustomEvent("cancel"));
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  reset() {
    this.name = "";
    this.startDate = null;
    this.endDate = null;
    this.status = "Planning";
  }
}
