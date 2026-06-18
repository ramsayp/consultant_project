// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, wire, track } from "lwc";
import { NavigationMixin, CurrentPageReference } from "lightning/navigation";
import {
  subscribe,
  unsubscribe,
  MessageContext,
  APPLICATION_SCOPE
} from "lightning/messageService";
import getTriageQueue from "@salesforce/apex/WorkItemController.getTriageQueue";
import TICKET_TRIAGE_CHANNEL from "@salesforce/messageChannel/TicketTriageChannel__c";

// Triage queue for the BA agent pipeline. Lists tickets awaiting BA processing
// or human review. Clicking a card opens the ticket's record page, where the
// ticketReview applet handles classification and approve/decline.
//
// Loaded imperatively (not @wire) and getTriageQueue is NOT cacheable — the
// platform's storable-action cache for cacheable=true methods applies even to
// imperative calls, not only wired ones, so a cacheable method here would
// keep serving stale results no matter how loadTickets() is triggered.
// Same-session creates from ticketSubmit (utility bar, outside this
// component's tree) are picked up via the TicketTriageChannel message,
// subscribed with APPLICATION_SCOPE — the default scope only delivers within
// the same page region, and the utility bar is a different region from this
// component's App Page body.
//
// Also wired to CurrentPageReference: this app has tab persistence enabled
// (ProjectManagement.app-meta.xml, isNavTabPersistenceDisabled=false), so
// navigating to a ticket's record page and back does not necessarily destroy
// and recreate this component — connectedCallback alone can't be trusted to
// re-fire. CurrentPageReference re-emits on every navigation event, including
// returning to an already-open tab, so it reloads the queue whether or not
// the component was actually remounted.
export default class TicketTriage extends NavigationMixin(LightningElement) {
  @track tickets = [];
  @track error;

  @wire(MessageContext)
  messageContext;

  subscription;

  @wire(CurrentPageReference)
  handlePageRefChange() {
    this.loadTickets();
  }

  connectedCallback() {
    this.subscription = subscribe(
      this.messageContext,
      TICKET_TRIAGE_CHANNEL,
      () => this.loadTickets(),
      { scope: APPLICATION_SCOPE }
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
