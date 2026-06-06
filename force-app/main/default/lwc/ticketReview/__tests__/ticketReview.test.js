import { createElement } from "lwc";
import TicketReview from "c/ticketReview";
import { updateRecord } from "lightning/uiRecordApi";

// ── Imperative apex mocks ───────────────────────────────────────────────────
// Use jest.fn() inline in factory so the same instance is shared with the import
jest.mock("@salesforce/apex/WorkItemController.getTicketReviewContext", () => ({
  default: jest.fn(),
  __esModule: true
}));
jest.mock("@salesforce/apex/WorkItemController.approveTicket", () => ({
  default: jest.fn(),
  __esModule: true
}));
jest.mock("@salesforce/apex/WorkItemController.declineTicket", () => ({
  default: jest.fn(),
  __esModule: true
}));

import getTicketReviewContext from "@salesforce/apex/WorkItemController.getTicketReviewContext";
import approveTicket from "@salesforce/apex/WorkItemController.approveTicket";
import declineTicket from "@salesforce/apex/WorkItemController.declineTicket";

// ── Helpers ─────────────────────────────────────────────────────────────────
function getButtonByLabel(container, label) {
  return [...container.querySelectorAll("lightning-button")].find(
    (b) => b.label === label
  );
}

const flushAllPromises = () =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());

const TICKET_CONTEXT = {
  recordTypeName: "Ticket",
  triageStatus: "Reviewing",
  triageNotes: null,
  targetType: ""
};

const DECLINED_CONTEXT = {
  recordTypeName: "Ticket",
  triageStatus: "Declined",
  triageNotes: "Needs more detail on the AC",
  targetType: "Story"
};

const STORY_CONTEXT = {
  recordTypeName: "Story",
  triageStatus: "Approved",
  triageNotes: null,
  targetType: "Story"
};

function create() {
  const el = createElement("c-ticket-review", { is: TicketReview });
  el.recordId = "wi001";
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  while (document.body.firstChild)
    document.body.removeChild(document.body.firstChild);
  jest.clearAllMocks();
});

// ── Visibility ──────────────────────────────────────────────────────────────
describe("visibility", () => {
  it("renders nothing for a record that isn't a Ticket", async () => {
    getTicketReviewContext.mockResolvedValue(STORY_CONTEXT);
    const el = create();
    await flushAllPromises();

    expect(el.shadowRoot.querySelector(".tr-root")).toBeNull();
  });

  it("renders the review card for a Ticket record", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_CONTEXT);
    const el = create();
    await flushAllPromises();

    expect(el.shadowRoot.querySelector(".tr-root")).not.toBeNull();
    expect(getTicketReviewContext).toHaveBeenCalledWith({ ticketId: "wi001" });
  });

  it("shows prior reviewer notes on a declined ticket", async () => {
    getTicketReviewContext.mockResolvedValue(DECLINED_CONTEXT);
    const el = create();
    await flushAllPromises();

    expect(el.shadowRoot.querySelector(".tr-notes__body").textContent).toBe(
      "Needs more detail on the AC"
    );
  });
});

// ── Target type ─────────────────────────────────────────────────────────────
describe("target type", () => {
  it("saves the selected target type via updateRecord", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_CONTEXT);
    updateRecord.mockResolvedValue();
    const el = create();
    await flushAllPromises();

    const combobox = el.shadowRoot.querySelector("lightning-combobox");
    combobox.dispatchEvent(
      new CustomEvent("change", { detail: { value: "Bug" } })
    );
    await flushAllPromises();

    expect(updateRecord).toHaveBeenCalledWith({
      fields: { Id: "wi001", Target_Type__c: "Bug" }
    });
  });

  it("disables Approve until a target type is selected", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_CONTEXT);
    const el = create();
    await flushAllPromises();

    expect(getButtonByLabel(el.shadowRoot, "Approve").disabled).toBe(true);
  });
});

// ── Approve ─────────────────────────────────────────────────────────────────
describe("approve", () => {
  it("calls approveTicket and reloads context once a target type is set", async () => {
    getTicketReviewContext.mockResolvedValue(DECLINED_CONTEXT);
    approveTicket.mockResolvedValue();
    const el = create();
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Approve").click();
    await flushAllPromises();

    expect(approveTicket).toHaveBeenCalledWith({ ticketId: "wi001" });
    expect(getTicketReviewContext).toHaveBeenCalledTimes(2);
  });
});

// ── Decline ─────────────────────────────────────────────────────────────────
describe("decline", () => {
  it("requires notes before Confirm Decline is enabled", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_CONTEXT);
    const el = create();
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Decline").click();
    await flushAllPromises();

    expect(getButtonByLabel(el.shadowRoot, "Confirm Decline").disabled).toBe(
      true
    );
  });

  it("calls declineTicket with trimmed notes and reloads context", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_CONTEXT);
    declineTicket.mockResolvedValue();
    const el = create();
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Decline").click();
    await flushAllPromises();

    const textarea = el.shadowRoot.querySelector("lightning-textarea");
    textarea.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: "  Needs more detail on edge cases  " }
      })
    );
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Confirm Decline").click();
    await flushAllPromises();

    expect(declineTicket).toHaveBeenCalledWith({
      ticketId: "wi001",
      notes: "Needs more detail on edge cases"
    });
  });
});
