import { createElement } from "lwc";
import TicketTriage from "c/ticketTriage";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE
} from "lightning/messageService";

// ── Navigation mock ─────────────────────────────────────────────────────────
// The engine seals NavigationMixin's prototype once a component is registered,
// so spying on it post-hoc fails. Mock the module with our own jest.fn()-backed
// mixin instead — the component and the test resolve the same Navigate symbol.
// CurrentPageReference is a real test wire adapter so tests can simulate
// navigation events (including returning to an already-open, non-remounted tab).
jest.mock("lightning/navigation", () => {
  const {
    createTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  const Navigate = Symbol("Navigate");
  const navigateMock = jest.fn();
  const NavigationMixin = (Base) =>
    class extends Base {
      [Navigate](pageRef) {
        navigateMock(pageRef);
      }
    };
  NavigationMixin.Navigate = Navigate;
  NavigationMixin.navigateMock = navigateMock;
  return {
    NavigationMixin,
    CurrentPageReference: createTestWireAdapter(jest.fn()),
    __esModule: true
  };
});

import { NavigationMixin, CurrentPageReference } from "lightning/navigation";

// ── Apex mock ───────────────────────────────────────────────────────────────
// Loaded imperatively now (not @wire) so a fresh server call happens on every
// mount, rather than serving the cacheable wire's stale cross-instance cache.
jest.mock("@salesforce/apex/WorkItemController.getTriageQueue", () => ({
  default: jest.fn(),
  __esModule: true
}));
import getTriageQueue from "@salesforce/apex/WorkItemController.getTriageQueue";

// ── Test data ───────────────────────────────────────────────────────────────
const TICKETS = [
  {
    Id: "wi001",
    Name: "Login button is unresponsive",
    Priority__c: "High",
    Triage_Status__c: "Reviewed",
    RecordType: { Name: "Bug" },
    RecordTypeId: "rt001",
    CreatedDate: "2026-01-01T10:00:00.000Z"
  },
  {
    Id: "wi002",
    Name: "Add export to CSV",
    Priority__c: "Medium",
    Triage_Status__c: "Not Started",
    RecordType: { Name: "Ticket" },
    RecordTypeId: "rt002",
    CreatedDate: "2026-01-02T10:00:00.000Z"
  }
];

function create() {
  const el = createElement("c-ticket-triage", { is: TicketTriage });
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  while (document.body.firstChild)
    document.body.removeChild(document.body.firstChild);
  jest.clearAllMocks();
});

const flushAllPromises = () =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());

// ── Rendering ───────────────────────────────────────────────────────────────
describe("rendering", () => {
  it("shows empty state when the queue is empty", async () => {
    getTriageQueue.mockResolvedValue([]);
    const el = create();
    CurrentPageReference.emit({});
    await flushAllPromises();
    expect(el.shadowRoot.querySelector(".wm-empty")).not.toBeNull();
  });

  it("renders one card per queued ticket", async () => {
    getTriageQueue.mockResolvedValue(TICKETS);
    const el = create();
    CurrentPageReference.emit({});
    await flushAllPromises();
    expect(el.shadowRoot.querySelectorAll(".triage-card").length).toBe(2);
  });

  it("shows an error message when the load fails", async () => {
    getTriageQueue.mockRejectedValue({ body: { message: "boom" } });
    const el = create();
    CurrentPageReference.emit({});
    await flushAllPromises();
    expect(
      el.shadowRoot.querySelector(".slds-text-color_error").textContent
    ).toBe("boom");
  });
});

// ── Navigation ──────────────────────────────────────────────────────────────
describe("navigation", () => {
  it("navigates to the ticket's record page on card click", async () => {
    getTriageQueue.mockResolvedValue(TICKETS);
    const el = create();
    CurrentPageReference.emit({});
    await flushAllPromises();

    el.shadowRoot.querySelector('[data-id="wi001"]').click();

    expect(NavigationMixin.navigateMock).toHaveBeenCalledWith({
      type: "standard__recordPage",
      attributes: { recordId: "wi001", actionName: "view" }
    });
  });
});

// ── Live refresh ──────────────────────────────────────────────────────────────
describe("triage channel refresh", () => {
  it("subscribes on connect and unsubscribes on disconnect", async () => {
    getTriageQueue.mockResolvedValue([]);
    const el = create();
    CurrentPageReference.emit({});
    await flushAllPromises();
    expect(subscribe).toHaveBeenCalledWith(
      undefined,
      "TicketTriageChannel__c",
      expect.any(Function),
      { scope: APPLICATION_SCOPE }
    );

    document.body.removeChild(el);
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("reloads the queue when a ticket-created message arrives", async () => {
    getTriageQueue.mockResolvedValue([]);
    create();
    CurrentPageReference.emit({});
    await flushAllPromises();
    expect(getTriageQueue).toHaveBeenCalledTimes(1);

    getTriageQueue.mockResolvedValue(TICKETS);
    const onMessage = subscribe.mock.calls[0][2];
    onMessage();
    await flushAllPromises();

    expect(getTriageQueue).toHaveBeenCalledTimes(2);
  });
});

// ── Page reference refresh ───────────────────────────────────────────────────
describe("page reference refresh", () => {
  it("reloads the queue whenever CurrentPageReference changes, even without a remount", async () => {
    // Simulates returning to this tab after deleting a ticket on a record
    // page, when tab persistence keeps the component instance alive instead
    // of destroying and recreating it.
    getTriageQueue.mockResolvedValue([]);
    create();
    CurrentPageReference.emit({});
    await flushAllPromises();
    expect(getTriageQueue).toHaveBeenCalledTimes(1);

    getTriageQueue.mockResolvedValue(TICKETS);
    CurrentPageReference.emit({ attributes: { name: "Kanbans" } });
    await flushAllPromises();

    expect(getTriageQueue).toHaveBeenCalledTimes(2);
  });
});
