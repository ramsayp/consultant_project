import { createElement } from "lwc";
import TicketReview from "c/ticketReview";
import {
  updateRecord,
  notifyRecordUpdateAvailable
} from "lightning/uiRecordApi";

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
jest.mock("@salesforce/apex/WorkItemController.getCandidateParents", () => ({
  default: jest.fn(),
  __esModule: true
}));

import getTicketReviewContext from "@salesforce/apex/WorkItemController.getTicketReviewContext";
import approveTicket from "@salesforce/apex/WorkItemController.approveTicket";
import declineTicket from "@salesforce/apex/WorkItemController.declineTicket";
import getCandidateParents from "@salesforce/apex/WorkItemController.getCandidateParents";

// ── Helpers ─────────────────────────────────────────────────────────────────
function getButtonByLabel(container, label) {
  return [...container.querySelectorAll("lightning-button")].find(
    (b) => b.label === label
  );
}

function getComboboxByLabel(container, label) {
  return [...container.querySelectorAll("lightning-combobox")].find(
    (c) => c.label === label
  );
}

// Captures ShowToastEvent payloads — the stub dispatches 'lightning__showtoast'
// with the toast object as detail
function captureToasts(el) {
  const toasts = [];
  el.addEventListener("lightning__showtoast", (e) => toasts.push(e.detail));
  return toasts;
}

const EPICS = [
  { Id: "ep001", Name: "Org Changes" },
  { Id: "ep002", Name: "Project Manager Post Release fixes" }
];

const flushAllPromises = () =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());

const TICKET_CONTEXT = {
  recordTypeName: "Ticket",
  triageStatus: "Reviewing",
  triageNotes: null,
  targetType: "",
  parentId: null,
  parentName: null
};

// Target type already set but still no Epic — the state that used to allow an
// orphaning approval
const TICKET_NO_EPIC_CONTEXT = {
  ...TICKET_CONTEXT,
  targetType: "Story"
};

const DECLINED_CONTEXT = {
  recordTypeName: "Ticket",
  triageStatus: "Declined",
  triageNotes: "Needs more detail on the AC",
  targetType: "Story",
  parentId: "ep002",
  parentName: "Project Manager Post Release fixes"
};

const STORY_CONTEXT = {
  recordTypeName: "Story",
  triageStatus: "Approved",
  triageNotes: null,
  targetType: "Story",
  parentId: "ep001",
  parentName: "Org Changes"
};

function create() {
  const el = createElement("c-ticket-review", { is: TicketReview });
  el.recordId = "wi001";
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  getCandidateParents.mockResolvedValue(EPICS);
  // clearAllMocks resets calls but keeps implementations, so restore the
  // happy-path default explicitly — the refresh-failure tests override it
  notifyRecordUpdateAvailable.mockResolvedValue();
});

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

    const combobox = getComboboxByLabel(el.shadowRoot, "This will become");
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

// ── Epic ────────────────────────────────────────────────────────────────────
describe("epic", () => {
  it("offers the Epics returned by getCandidateParents", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_CONTEXT);
    const el = create();
    await flushAllPromises();

    expect(getCandidateParents).toHaveBeenCalledWith({
      recordTypeName: "Ticket"
    });
    expect(getComboboxByLabel(el.shadowRoot, "Epic").options).toEqual([
      { label: "Org Changes", value: "ep001" },
      { label: "Project Manager Post Release fixes", value: "ep002" }
    ]);
  });

  it("saves the selected Epic via updateRecord", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_CONTEXT);
    updateRecord.mockResolvedValue();
    const el = create();
    await flushAllPromises();

    getComboboxByLabel(el.shadowRoot, "Epic").dispatchEvent(
      new CustomEvent("change", { detail: { value: "ep001" } })
    );
    await flushAllPromises();

    expect(updateRecord).toHaveBeenCalledWith({
      fields: { Id: "wi001", Parent_Work_Item__c: "ep001" }
    });
  });

  it("reflects an Epic that is already set when the page loads", async () => {
    getTicketReviewContext.mockResolvedValue(DECLINED_CONTEXT);
    const el = create();
    await flushAllPromises();

    expect(getComboboxByLabel(el.shadowRoot, "Epic").value).toBe("ep002");
  });

  it("keeps Approve disabled when a target type is set but no Epic is", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_NO_EPIC_CONTEXT);
    const el = create();
    await flushAllPromises();

    expect(getButtonByLabel(el.shadowRoot, "Approve").disabled).toBe(true);
  });

  it("enables Approve once both a target type and an Epic are set", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_NO_EPIC_CONTEXT);
    updateRecord.mockResolvedValue();
    const el = create();
    await flushAllPromises();

    getComboboxByLabel(el.shadowRoot, "Epic").dispatchEvent(
      new CustomEvent("change", { detail: { value: "ep001" } })
    );
    await flushAllPromises();

    expect(getButtonByLabel(el.shadowRoot, "Approve").disabled).toBe(false);
  });

  it("enables Approve on load when the ticket already has both", async () => {
    getTicketReviewContext.mockResolvedValue(DECLINED_CONTEXT);
    const el = create();
    await flushAllPromises();

    expect(getButtonByLabel(el.shadowRoot, "Approve").disabled).toBe(false);
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

  // Approval changes the record type server-side. Without telling LDS, the page
  // keeps serving the cached Ticket and the Epic applet's record-type
  // visibility rule stays false until the user refreshes by hand.
  it("notifies LDS so record-type visibility rules re-evaluate", async () => {
    getTicketReviewContext.mockResolvedValue(DECLINED_CONTEXT);
    approveTicket.mockResolvedValue();
    const el = create();
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Approve").click();
    await flushAllPromises();

    expect(notifyRecordUpdateAvailable).toHaveBeenCalledWith([
      { recordId: "wi001" }
    ]);
  });

  it("does not notify LDS when approval fails", async () => {
    getTicketReviewContext.mockResolvedValue(DECLINED_CONTEXT);
    approveTicket.mockRejectedValue({ body: { message: "nope" } });
    const el = create();
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Approve").click();
    await flushAllPromises();

    expect(notifyRecordUpdateAvailable).not.toHaveBeenCalled();
  });

  // The write has already committed by the time the refresh runs, so a refresh
  // failure must never be reported as a failed approval — that would send the
  // reviewer back to click Approve a second time, resetting Sprint__c.
  it("still reports success when the LDS refresh fails", async () => {
    getTicketReviewContext.mockResolvedValue(DECLINED_CONTEXT);
    approveTicket.mockResolvedValue();
    notifyRecordUpdateAvailable.mockRejectedValue(new Error("network"));
    const el = create();
    const toasts = captureToasts(el);
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Approve").click();
    await flushAllPromises();

    expect(toasts).toHaveLength(1);
    expect(toasts[0].title).toBe("Ticket approved");
    expect(toasts[0].variant).toBe("success");
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
    // Decline writes triage status/notes server-side too, so the page fields
    // would otherwise keep showing pre-decline values.
    expect(notifyRecordUpdateAvailable).toHaveBeenCalledWith([
      { recordId: "wi001" }
    ]);
  });

  it("does not notify LDS when decline fails", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_CONTEXT);
    declineTicket.mockRejectedValue({ body: { message: "nope" } });
    const el = create();
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Decline").click();
    await flushAllPromises();

    el.shadowRoot
      .querySelector("lightning-textarea")
      .dispatchEvent(new CustomEvent("change", { detail: { value: "no" } }));
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Confirm Decline").click();
    await flushAllPromises();

    expect(notifyRecordUpdateAvailable).not.toHaveBeenCalled();
  });

  it("still reports success when the LDS refresh fails", async () => {
    getTicketReviewContext.mockResolvedValue(TICKET_CONTEXT);
    declineTicket.mockResolvedValue();
    notifyRecordUpdateAvailable.mockRejectedValue(new Error("network"));
    const el = create();
    const toasts = captureToasts(el);
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Decline").click();
    await flushAllPromises();

    el.shadowRoot
      .querySelector("lightning-textarea")
      .dispatchEvent(
        new CustomEvent("change", { detail: { value: "Needs detail" } })
      );
    await flushAllPromises();

    getButtonByLabel(el.shadowRoot, "Confirm Decline").click();
    await flushAllPromises();

    expect(toasts).toHaveLength(1);
    expect(toasts[0].title).toBe("Ticket declined");
    expect(toasts[0].variant).toBe("success");
  });
});
