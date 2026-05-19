import { createElement } from "lwc";
import WorkItemCard from "c/workItemCard";

const BASE_ITEM = {
  Id: "a01000000000001AAA",
  Name: "Build login page",
  Priority__c: "Critical",
  Status__c: "In Progress",
  Estimate__c: 3,
  RecordType: { Name: "Story" },
  Assignee__r: { Name: "Jane Smith" },
  Parent_Work_Item__r: { Name: "Auth Epic", Parent_Work_Item__r: null },
  Sprint__c: "a02000000000001AAA"
};

function create(props = {}) {
  const el = createElement("c-work-item-card", { is: WorkItemCard });
  el.workItem = { ...BASE_ITEM, ...props.workItem };
  if (props.compact !== undefined) el.compact = props.compact;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  while (document.body.firstChild)
    document.body.removeChild(document.body.firstChild);
});

describe("card vs compact rendering", () => {
  it("renders kanban card by default", () => {
    const el = create();
    expect(el.shadowRoot.querySelector(".work-card")).not.toBeNull();
    expect(el.shadowRoot.querySelector(".work-row")).toBeNull();
  });

  it("renders compact row when compact=true", () => {
    const el = create({ compact: true });
    expect(el.shadowRoot.querySelector(".work-row")).not.toBeNull();
    expect(el.shadowRoot.querySelector(".work-card")).toBeNull();
  });
});

describe("priority emoji", () => {
  it.each([
    ["Critical", "🔴"],
    ["Higher", "🟠"],
    ["High", "🟡"],
    ["Medium", "🟢"],
    ["Low", "🔵"],
    ["Lowest", "⚪"]
  ])("%s renders as %s", (priority, emoji) => {
    const el = create({ workItem: { Priority__c: priority } });
    const badge = el.shadowRoot.querySelector(".card__priority-emoji");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe(emoji);
  });

  it("omits emoji when priority is null", () => {
    const el = create({ workItem: { Priority__c: null } });
    expect(el.shadowRoot.querySelector(".card__priority-emoji")).toBeNull();
  });
});

describe("priority bar CSS", () => {
  it.each([
    ["Critical", "priority-bar_critical"],
    ["High", "priority-bar_high"],
    ["Medium", "priority-bar_medium"],
    ["Low", "priority-bar_low"]
  ])("%s applies class %s", (priority, cls) => {
    const el = create({ workItem: { Priority__c: priority } });
    const bar = el.shadowRoot.querySelector(".priority-bar");
    expect(bar.classList.contains(cls)).toBe(true);
  });

  it("falls back to medium class when priority unset", () => {
    const el = create({ workItem: { Priority__c: null } });
    const bar = el.shadowRoot.querySelector(".priority-bar");
    expect(bar.classList.contains("priority-bar_medium")).toBe(true);
  });
});

describe("estimate badge", () => {
  it("shows estimate when set", () => {
    const el = create({ workItem: { Estimate__c: 5 } });
    const badge = el.shadowRoot.querySelector(".meta-badge_pts");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("5pt");
  });

  it("hides estimate badge when null", () => {
    const el = create({ workItem: { Estimate__c: null } });
    expect(el.shadowRoot.querySelector(".meta-badge_pts")).toBeNull();
  });
});

describe("open event", () => {
  it("fires open with correct id on card click", () => {
    const el = create();
    const handler = jest.fn();
    el.addEventListener("open", handler);
    el.shadowRoot.querySelector(".work-card").click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.id).toBe(BASE_ITEM.Id);
  });

  it("fires open on compact row click", () => {
    const el = create({ compact: true });
    const handler = jest.fn();
    el.addEventListener("open", handler);
    el.shadowRoot.querySelector(".work-row").click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.id).toBe(BASE_ITEM.Id);
  });
});
