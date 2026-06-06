import { createElement } from "lwc";
import TicketSubmit from "c/ticketSubmit";

// ── Apex mocks ──────────────────────────────────────────────────────────────
jest.mock("@salesforce/apex/WorkItemController.createTicket", () => ({
  default: jest.fn(),
  __esModule: true
}));
import createTicket from "@salesforce/apex/WorkItemController.createTicket";

// ── Helpers ─────────────────────────────────────────────────────────────────

// @api variant is a JS property, not an HTML attribute — attribute selectors don't match
function getBrandBtn(root) {
  return [...root.querySelectorAll("lightning-button")].find(
    (b) => b.variant === "brand"
  );
}
function getCancelBtn(root) {
  return [...root.querySelectorAll("lightning-button")].find(
    (b) => b.label === "Cancel"
  );
}

const flushAllPromises = () =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());

function create() {
  const el = createElement("c-ticket-submit", { is: TicketSubmit });
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  while (document.body.firstChild)
    document.body.removeChild(document.body.firstChild);
  jest.clearAllMocks();
});

describe("submit guard", () => {
  it("disables Submit until a title is entered", async () => {
    const el = create();
    await Promise.resolve();
    expect(getBrandBtn(el.shadowRoot).disabled).toBe(true);

    const titleField = el.shadowRoot.querySelector('[data-field="title"]');
    titleField.value = "New idea";
    titleField.dispatchEvent(new CustomEvent("change"));
    await Promise.resolve();

    expect(getBrandBtn(el.shadowRoot).disabled).toBe(false);
  });
});

describe("handleSubmit", () => {
  it("calls createTicket with form values and fires created event", async () => {
    createTicket.mockResolvedValue("a00001");
    const el = create();
    await Promise.resolve();

    const titleField = el.shadowRoot.querySelector('[data-field="title"]');
    titleField.value = "New idea";
    titleField.dispatchEvent(new CustomEvent("change"));

    const descField = el.shadowRoot.querySelector('[data-field="description"]');
    descField.value = "Some context";
    descField.dispatchEvent(new CustomEvent("change"));
    await Promise.resolve();

    const createdHandler = jest.fn();
    el.addEventListener("created", createdHandler);

    getBrandBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await flushAllPromises();

    expect(createTicket).toHaveBeenCalledWith({
      title: "New idea",
      description: "Some context",
      priority: "Medium"
    });
    expect(createdHandler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { id: "a00001" } })
    );
  });

  it("does not call createTicket when title is empty", async () => {
    const el = create();
    await Promise.resolve();
    getBrandBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await Promise.resolve();
    expect(createTicket).not.toHaveBeenCalled();
  });

  it("fires cancel event on Cancel click", async () => {
    const el = create();
    await Promise.resolve();
    const handler = jest.fn();
    el.addEventListener("cancel", handler);
    getCancelBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
