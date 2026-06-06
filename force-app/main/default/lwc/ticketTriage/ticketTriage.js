// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, wire, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import getTriageQueue from "@salesforce/apex/WorkItemController.getTriageQueue";

// Triage queue for the BA agent pipeline. Lists tickets awaiting BA processing
// or human review. Clicking a card opens the ticket's record page, where the
// ticketReview applet handles classification and approve/decline.
export default class TicketTriage extends NavigationMixin(LightningElement) {
  @track tickets = [];

  @wire(getTriageQueue)
  wiredQueue(result) {
    if (result.data) this.tickets = result.data;
  }

  // ── Display flags ─────────────────────────────────────────────────────────
  get hasTickets() {
    return this.tickets.length > 0;
  }

  // Enriches each ticket with display-only properties for the queue cards
  get ticketsForDisplay() {
    return this.tickets.map((t) => ({
      Id: t.Id,
      Name: t.Name,
      typeName: t.RecordType?.Name,
      Triage_Status__c: t.Triage_Status__c,
      Priority__c: t.Priority__c,
      statusClass:
        "triage-card__status triage-card__status--" +
        (t.Triage_Status__c || "Not Started").toLowerCase().replace(/\s+/g, "-")
    }));
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  // Opens the ticket's record page, where review/approve/decline lives
  handleSelect(event) {
    const id = event.currentTarget.dataset.id;
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: { recordId: id, actionName: "view" }
    });
  }
}
