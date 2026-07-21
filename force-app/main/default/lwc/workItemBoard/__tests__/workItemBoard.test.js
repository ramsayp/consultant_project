import { createElement } from "lwc";
// Relative import bypasses the "^c/workItemBoard$" moduleNameMapper stub (used by
// workManager's test) so we exercise the real component here.
import WorkItemBoard from "../workItemBoard";
import getBoardItems from "@salesforce/apex/WorkItemController.getBoardItems";
import ensureBacklogSprint from "@salesforce/apex/WorkItemController.ensureBacklogSprint";
import getActiveSprints from "@salesforce/apex/WorkItemController.getActiveSprints";

// getActiveSprints is consumed via @wire, so it needs a wire adapter rather than
// the plain jest.fn() shared mock. Override it here (see standards.md).
jest.mock("@salesforce/apex/WorkItemController.getActiveSprints", () => {
  const {
    createApexTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  return { default: createApexTestWireAdapter(jest.fn()), __esModule: true };
});

// Only Planning/Active/Backlog sprints are returned by getActiveSprints — a
// Completed sprint (like the "Sprint 7" the bug was reported against) is absent.
const SPRINTS = [
  {
    Id: "sprintBacklog",
    Name: "Backlog",
    Status__c: "Backlog",
    Sequence__c: 9999,
    RecordType: { DeveloperName: "Backlog" }
  },
  {
    Id: "sprintActive",
    Name: "Sprint 10",
    Status__c: "Active",
    Sequence__c: 10,
    RecordType: { DeveloperName: "Sprint" }
  }
];

// One item per interesting bucket. wCompleted sits in a Completed sprint that is
// NOT in SPRINTS; wOrphan has no sprint at all.
const WORK_ITEMS = [
  {
    Id: "wBacklog",
    Name: "Genuinely in backlog",
    Status__c: "Not Selected",
    Priority__c: "Medium",
    Sprint__c: "sprintBacklog",
    RecordType: { Name: "Story" }
  },
  {
    Id: "wCompleted",
    Name: "Done, still in Sprint 7",
    Status__c: "Done",
    Priority__c: "Medium",
    Sprint__c: "sprintCompleted",
    RecordType: { Name: "Story" }
  },
  {
    Id: "wActive",
    Name: "In the active sprint",
    Status__c: "To Do",
    Priority__c: "Medium",
    Sprint__c: "sprintActive",
    RecordType: { Name: "Story" }
  },
  {
    Id: "wOrphan",
    Name: "No sprint at all",
    Status__c: "Not Selected",
    Priority__c: "Medium",
    Sprint__c: null,
    RecordType: { Name: "Story" }
  }
];

// Chained microtask flush — setTimeout is restricted in LWC-land (see standards.md).
const flushAllPromises = () =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());

describe("c-work-item-board sprint sections", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  async function renderBoard() {
    ensureBacklogSprint.mockResolvedValue();
    getBoardItems.mockResolvedValue(WORK_ITEMS);

    const element = createElement("c-work-item-board", { is: WorkItemBoard });
    document.body.appendChild(element);

    getActiveSprints.emit(SPRINTS);
    await flushAllPromises();
    return element;
  }

  it("puts only true Backlog-sprint items in the Backlog swimlane", async () => {
    const element = await renderBoard();

    const backlogList = element.shadowRoot.querySelector(
      '.backlog-list[data-sprint-id="sprintBacklog"]'
    );
    expect(backlogList).not.toBeNull();

    const cardIds = [...backlogList.querySelectorAll("c-work-item-card")].map(
      (c) => c.dataset.id
    );
    expect(cardIds).toEqual(["wBacklog"]);
  });

  it("excludes items from a Completed (non-loaded) sprint entirely", async () => {
    const element = await renderBoard();

    expect(
      element.shadowRoot.querySelector('[data-id="wCompleted"]')
    ).toBeNull();
  });

  it("excludes items with no sprint from the board", async () => {
    const element = await renderBoard();

    expect(element.shadowRoot.querySelector('[data-id="wOrphan"]')).toBeNull();
  });

  it("still renders active-sprint items on the kanban", async () => {
    const element = await renderBoard();

    const activeCard = element.shadowRoot.querySelector('[data-id="wActive"]');
    expect(activeCard).not.toBeNull();
  });
});
