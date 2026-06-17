// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, wire, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import {
  subscribe,
  unsubscribe,
  MessageContext
} from "lightning/messageService";
import getTriageQueue from "@salesforce/apex/WorkItemController.getTriageQueue";
import TICKET_TRIAGE_CHANNEL from "@salesforce/messageChannel/TicketTriageChannel__c";

// Triage queue for the BA agent pipeline. Lists tickets awaiting BA processing
// or human review. Clicking a card opens the ticket's record page, where the
// ticketReview applet handles classification and approve/decline.
//
// Loaded imperatively (not @wire) because getTriageQueue is cacheable=true —
// a wired call would keep serving the platform's cached response across
// remounts, so newly created/deleted tickets wouldn't show up without a full
// browser refresh. Imperative calls to a cacheable method always hit the
// server fresh. Same-session creates from ticketSubmit (utility bar, outside
// this component's tree) are picked up via the TicketTriageChannel message.
export default class TicketTriage extends NavigationMixin(LightningElement) {
  @track tickets = [];
  @track error;

  @wire(MessageContext)
  messageContext;

  subscription;

  connectedCallback() {
    this.loadTickets();
    this.subscription = subscribe(
      this.messageContext,
      TICKET_TRIAGE_CHANNEL,
      () => this.loadTickets()
    );
  }

  disconnectedCallback() {
    unsubscribe(this.subscription);
    this.subscription = null;
  }

  async loadTickets() {
    try {
      this.tickets = (await getTriageQueue()) ?? [];
      this.error = undefined;
    } catch (err) {
      this.error = err?.body?.message ?? "Failed to load the triage queue.";
    }
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
