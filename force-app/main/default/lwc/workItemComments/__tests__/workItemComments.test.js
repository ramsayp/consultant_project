import { createElement } from "lwc";
import WorkItemComments from "c/workItemComments";
import LightningConfirm from "lightning/confirm";

// ── Apex wire mock ──────────────────────────────────────────────────────────
// require() inside factory avoids the jest.mock hoisting / out-of-scope error
jest.mock("@salesforce/apex/WorkItemController.getComments", () => {
  const {
    createApexTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  const adapter = createApexTestWireAdapter(jest.fn());
  return { default: adapter, __esModule: true };
});

// ── Imperative apex mocks ───────────────────────────────────────────────────
// Use jest.fn() inline in factory so the same instance is shared with the import
jest.mock("@salesforce/apex/WorkItemController.addComment", () => ({
  default: jest.fn(),
  __esModule: true
}));
jest.mock("@salesforce/apex/WorkItemController.editComment", () => ({
  default: jest.fn(),
  __esModule: true
}));
jest.mock("@salesforce/apex/WorkItemController.deleteComment", () => ({
  default: jest.fn(),
  __esModule: true
}));

import getComments from "@salesforce/apex/WorkItemController.getComments";
import addComment from "@salesforce/apex/WorkItemController.addComment";
import editComment from "@salesforce/apex/WorkItemController.editComment";
import deleteComment from "@salesforce/apex/WorkItemController.deleteComment";

// ── Helpers ─────────────────────────────────────────────────────────────────

// @api variant is a JS property, not an HTML attribute — attribute selectors don't match
function getBrandBtnIn(container) {
  return [...container.querySelectorAll("lightning-button")].find(
    (b) => b.variant === "brand"
  );
}
function getCancelBtnIn(container) {
  return [...container.querySelectorAll("lightning-button")].find(
    (b) => b.label === "Cancel"
  );
}

const flushAllPromises = () =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());

// ── Test data ───────────────────────────────────────────────────────────────
const NOW = "2025-01-01T10:00:00.000Z";
const LATER = "2025-01-01T12:00:00.000Z"; // > 5s after NOW → isEdited

const COMMENTS = [
  {
    Id: "c001",
    Body__c: "First",
    CreatedDate: NOW,
    LastModifiedDate: NOW,
    CreatedBy: { Name: "Alice" }
  },
  {
    Id: "c002",
    Body__c: "Edited",
    CreatedDate: NOW,
    LastModifiedDate: LATER,
    CreatedBy: { Name: "Bob" }
  }
];

function create(recordId = "wi001") {
  const el = createElement("c-work-item-comments", { is: WorkItemComments });
  el.recordId = recordId;
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
  it("shows empty state when wire returns no data", () => {
    const el = create();
    getComments.emit([]);
    return Promise.resolve().then(() => {
      expect(el.shadowRoot.querySelector(".no-comments")).not.toBeNull();
    });
  });

  it("renders one row per comment", () => {
    const el = create();
    getComments.emit(COMMENTS);
    return Promise.resolve().then(() => {
      expect(el.shadowRoot.querySelectorAll(".comment-item").length).toBe(2);
    });
  });

  it("shows (edited) tag only on modified comments", () => {
    const el = create();
    getComments.emit(COMMENTS);
    return Promise.resolve().then(() => {
      const tags = el.shadowRoot.querySelectorAll(".comment-edited");
      expect(tags.length).toBe(1);
    });
  });

  it("shows comment count badge when comments exist", () => {
    const el = create();
    getComments.emit(COMMENTS);
    return Promise.resolve().then(() => {
      expect(el.shadowRoot.querySelector(".comments-count")).not.toBeNull();
    });
  });
});

// ── Add comment ─────────────────────────────────────────────────────────────
describe("add comment", () => {
  it("shows compose form when Add is clicked", async () => {
    const el = create();
    getComments.emit([]);
    await Promise.resolve();
    el.shadowRoot.querySelector(".add-btn").click();
    await Promise.resolve();
    expect(el.shadowRoot.querySelector(".comment-compose")).not.toBeNull();
  });

  it("hides compose form on Cancel", async () => {
    const el = create();
    getComments.emit([]);
    await Promise.resolve();
    el.shadowRoot.querySelector(".add-btn").click();
    await Promise.resolve();
    const compose = el.shadowRoot.querySelector(".comment-compose");
    getCancelBtnIn(compose).dispatchEvent(new CustomEvent("click"));
    await Promise.resolve();
    expect(el.shadowRoot.querySelector(".comment-compose")).toBeNull();
  });

  it("calls addComment with trimmed body and refreshes wire", async () => {
    addComment.mockResolvedValue();
    const el = create();
    getComments.emit([]);
    await Promise.resolve();
    el.shadowRoot.querySelector(".add-btn").click();
    await Promise.resolve();

    const textarea = el.shadowRoot.querySelector(
      ".comment-compose lightning-textarea"
    );
    textarea.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
        detail: { value: "  Hello  " }
      })
    );
    await Promise.resolve();

    getBrandBtnIn(
      el.shadowRoot.querySelector(".comment-compose")
    ).dispatchEvent(
      new CustomEvent("click", { bubbles: true, composed: true })
    );
    await flushAllPromises();

    expect(addComment).toHaveBeenCalledWith({
      workItemId: "wi001",
      body: "Hello"
    });
  });
});

// ── Edit comment ────────────────────────────────────────────────────────────
describe("edit comment", () => {
  it("shows edit form when Edit is clicked", async () => {
    const el = create();
    getComments.emit(COMMENTS);
    await Promise.resolve();

    const editBtn = el.shadowRoot.querySelector(
      ".action-btn:not(.action-btn--danger)"
    );
    editBtn.dispatchEvent(new CustomEvent("click"));
    await Promise.resolve();

    expect(el.shadowRoot.querySelector(".comment-edit-form")).not.toBeNull();
  });

  it("calls editComment with trimmed body", async () => {
    editComment.mockResolvedValue();
    const el = create();
    getComments.emit(COMMENTS);
    await Promise.resolve();

    el.shadowRoot
      .querySelector(".action-btn:not(.action-btn--danger)")
      .dispatchEvent(new CustomEvent("click"));
    await Promise.resolve();

    const textarea = el.shadowRoot.querySelector(
      ".comment-edit-form lightning-textarea"
    );
    textarea.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
        detail: { value: "  Updated  " }
      })
    );
    await Promise.resolve();

    getBrandBtnIn(
      el.shadowRoot.querySelector(".comment-edit-form")
    ).dispatchEvent(
      new CustomEvent("click", { bubbles: true, composed: true })
    );
    await flushAllPromises();

    expect(editComment).toHaveBeenCalledWith({
      commentId: COMMENTS[0].Id,
      body: "Updated"
    });
  });

  it("cancels edit without saving", async () => {
    const el = create();
    getComments.emit(COMMENTS);
    await Promise.resolve();

    el.shadowRoot
      .querySelector(".action-btn:not(.action-btn--danger)")
      .dispatchEvent(new CustomEvent("click"));
    await Promise.resolve();
    getCancelBtnIn(
      el.shadowRoot.querySelector(".comment-edit-form")
    ).dispatchEvent(new CustomEvent("click"));
    await Promise.resolve();

    expect(el.shadowRoot.querySelector(".comment-edit-form")).toBeNull();
    expect(editComment).not.toHaveBeenCalled();
  });
});

// ── Delete comment ──────────────────────────────────────────────────────────
describe("delete comment", () => {
  it("calls deleteComment when user confirms", async () => {
    deleteComment.mockResolvedValue();
    jest.spyOn(LightningConfirm, "open").mockResolvedValue(true);
    const el = create();
    getComments.emit(COMMENTS);
    await Promise.resolve();

    el.shadowRoot
      .querySelector(".action-btn--danger")
      .dispatchEvent(new CustomEvent("click"));
    await flushAllPromises();

    expect(deleteComment).toHaveBeenCalledWith({ commentId: COMMENTS[0].Id });
  });

  it("does not delete when user cancels confirmation", async () => {
    jest.spyOn(LightningConfirm, "open").mockResolvedValue(false);
    const el = create();
    getComments.emit(COMMENTS);
    await Promise.resolve();

    el.shadowRoot
      .querySelector(".action-btn--danger")
      .dispatchEvent(new CustomEvent("click"));
    await flushAllPromises();

    expect(deleteComment).not.toHaveBeenCalled();
  });
});
