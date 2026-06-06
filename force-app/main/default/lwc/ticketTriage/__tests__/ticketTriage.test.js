import { createElement } from "lwc";
import TicketTriage from "c/ticketTriage";

// ── Navigation mock ─────────────────────────────────────────────────────────
// The engine seals NavigationMixin's prototype once a component is registered,
// so spying on it post-hoc fails. Mock the module with our own jest.fn()-backed
// mixin instead — the component and the test resolve the same Navigate symbol.
jest.mock("lightning/navigation", () => {
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
  return { NavigationMixin, __esModule: true };
});

import { NavigationMixin } from "lightning/navigation";

// ── Apex wire mock ──────────────────────────────────────────────────────────
// require() inside factory avoids the jest.mock hoisting / out-of-scope error
jest.mock("@salesforce/apex/WorkItemController.getTriageQueue", () => {
  const {
    createApexTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  const adapter = createApexTestWireAdapter(jest.fn());
  return { default: adapter, __esModule: true };
});

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

// ── Rendering ───────────────────────────────────────────────────────────────
describe("rendering", () => {
  it("shows empty state when wire returns no tickets", () => {
    const el = create();
    getTriageQueue.emit([]);
    return Promise.resolve().then(() => {
      expect(el.shadowRoot.querySelector(".wm-empty")).not.toBeNull();
    });
  });

  it("renders one card per queued ticket", () => {
    const el = create();
    getTriageQueue.emit(TICKETS);
    return Promise.resolve().then(() => {
      expect(el.shadowRoot.querySelectorAll(".triage-card").length).toBe(2);
    });
  });
});

// ── Navigation ──────────────────────────────────────────────────────────────
describe("navigation", () => {
  it("navigates to the ticket's record page on card click", async () => {
    const el = create();
    getTriageQueue.emit(TICKETS);
    await Promise.resolve();

    el.shadowRoot.querySelector('[data-id="wi001"]').click();

    expect(NavigationMixin.navigateMock).toHaveBeenCalledWith({
      type: "standard__recordPage",
      attributes: { recordId: "wi001", actionName: "view" }
    });
  });
});
