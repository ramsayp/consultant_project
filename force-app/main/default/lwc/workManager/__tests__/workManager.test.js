import { createElement } from "lwc";
import WorkManager from "c/workManager";

// ── Wire mocks ───────────────────────────────────────────────────────────────
jest.mock("@salesforce/apex/WorkItemController.getWorkItems", () => {
  const {
    createApexTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  return { default: createApexTestWireAdapter(jest.fn()), __esModule: true };
});
jest.mock("@salesforce/apex/WorkItemController.getAllSprints", () => {
  const {
    createApexTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  return { default: createApexTestWireAdapter(jest.fn()), __esModule: true };
});
jest.mock("@salesforce/apex/WorkItemController.generateSprints", () => ({
  default: jest.fn(),
  __esModule: true
}));
jest.mock("@salesforce/apex/WorkItemController.closeSprint", () => ({
  default: jest.fn(),
  __esModule: true
}));

import getWorkItems from "@salesforce/apex/WorkItemController.getWorkItems";

// ── Helpers ──────────────────────────────────────────────────────────────────
const MOCK_USER_ID = "mock-user-001";
const VIEW_KEY = `wm_view_${MOCK_USER_ID}`;
const PROJECT_KEY = `wm_project_${MOCK_USER_ID}`;
const MOCK_PROJECT = { Id: "proj001AAA", Name: "Alpha" };

const flushAllPromises = () =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());

function create() {
  const el = createElement("c-work-manager", { is: WorkManager });
  document.body.appendChild(el);
  return el;
}

function findNavBtn(el, label) {
  return [...el.shadowRoot.querySelectorAll(".wm-nav__tab")].find(
    (b) => b.textContent.trim() === label
  );
}

// ── First visit defaults ─────────────────────────────────────────────────────
describe("WorkManager — first visit defaults", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    localStorage.clear();
  });

  it("shows the projects list when no stored state", () => {
    const el = create();
    expect(el.shadowRoot.querySelector(".wm-projects")).not.toBeNull();
  });

  it("ignores unknown stored view values and defaults to projects", () => {
    localStorage.setItem(VIEW_KEY, "not-a-valid-view");
    const el = create();
    expect(el.shadowRoot.querySelector(".wm-projects")).not.toBeNull();
  });
});

// ── View restore ─────────────────────────────────────────────────────────────
describe("WorkManager — view restore from localStorage", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    localStorage.clear();
  });

  it("restores triage view", () => {
    localStorage.setItem(VIEW_KEY, "triage");
    const el = create();
    expect(el.shadowRoot.querySelector("c-ticket-triage")).not.toBeNull();
  });

  it("restores sprints view", () => {
    localStorage.setItem(VIEW_KEY, "sprints");
    const el = create();
    expect(el.shadowRoot.querySelector(".wm-sprints")).not.toBeNull();
  });

  it("restores projects view", () => {
    localStorage.setItem(VIEW_KEY, "projects");
    const el = create();
    expect(el.shadowRoot.querySelector(".wm-projects")).not.toBeNull();
  });

  it("restores board view with project name in breadcrumb and correct projectId", () => {
    localStorage.setItem(VIEW_KEY, "board");
    localStorage.setItem(PROJECT_KEY, JSON.stringify(MOCK_PROJECT));
    const el = create();
    expect(el.shadowRoot.querySelector(".crumb-current").textContent).toBe(
      "Alpha"
    );
    expect(el.shadowRoot.querySelector("c-work-item-board").projectId).toBe(
      "proj001AAA"
    );
  });

  it("falls back to projects when view=board and no project stored", () => {
    localStorage.setItem(VIEW_KEY, "board");
    const el = create();
    expect(el.shadowRoot.querySelector(".wm-projects")).not.toBeNull();
  });

  it("falls back to projects when view=board and project JSON is malformed", () => {
    localStorage.setItem(VIEW_KEY, "board");
    localStorage.setItem(PROJECT_KEY, "{bad json{{");
    const el = create();
    expect(el.shadowRoot.querySelector(".wm-projects")).not.toBeNull();
  });

  it("falls back to projects when view=board and project is missing Name", () => {
    localStorage.setItem(VIEW_KEY, "board");
    localStorage.setItem(PROJECT_KEY, JSON.stringify({ Id: "proj001AAA" }));
    const el = create();
    expect(el.shadowRoot.querySelector(".wm-projects")).not.toBeNull();
  });

  it("falls back to projects when view=board and project is missing Id", () => {
    localStorage.setItem(VIEW_KEY, "board");
    localStorage.setItem(PROJECT_KEY, JSON.stringify({ Name: "Alpha" }));
    const el = create();
    expect(el.shadowRoot.querySelector(".wm-projects")).not.toBeNull();
  });
});

// ── Navigation persists state ─────────────────────────────────────────────────
describe("WorkManager — navigation persists state", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    localStorage.clear();
  });

  it("clicking Triage tab persists triage to localStorage", () => {
    const el = create();
    findNavBtn(el, "Triage").click();
    expect(localStorage.getItem(VIEW_KEY)).toBe("triage");
  });

  it("clicking Sprints tab persists sprints to localStorage", () => {
    const el = create();
    findNavBtn(el, "Sprints").click();
    expect(localStorage.getItem(VIEW_KEY)).toBe("sprints");
  });

  it("clicking Projects tab persists projects to localStorage", () => {
    localStorage.setItem(VIEW_KEY, "triage");
    const el = create();
    findNavBtn(el, "Projects").click();
    expect(localStorage.getItem(VIEW_KEY)).toBe("projects");
  });

  it("selecting a project persists board view and {Id, Name} to localStorage", async () => {
    const el = create();
    getWorkItems.emit([
      { Id: "proj001AAA", Name: "Alpha", Status__c: "Active" }
    ]);
    await flushAllPromises();
    el.shadowRoot.querySelector(".init-card").click();
    expect(localStorage.getItem(VIEW_KEY)).toBe("board");
    expect(JSON.parse(localStorage.getItem(PROJECT_KEY))).toEqual({
      Id: "proj001AAA",
      Name: "Alpha"
    });
  });

  it("back navigation from board clears stored project and persists projects view", () => {
    localStorage.setItem(VIEW_KEY, "board");
    localStorage.setItem(PROJECT_KEY, JSON.stringify(MOCK_PROJECT));
    const el = create();
    el.shadowRoot.querySelector(".crumb-back-btn").click();
    expect(localStorage.getItem(VIEW_KEY)).toBe("projects");
    expect(localStorage.getItem(PROJECT_KEY)).toBeNull();
  });
});

// ── Per-user key isolation ────────────────────────────────────────────────────
describe("WorkManager — per-user key isolation", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    localStorage.clear();
  });

  it("uses user-scoped localStorage keys, not generic keys", () => {
    const el = create();
    findNavBtn(el, "Triage").click();
    expect(localStorage.getItem(`wm_view_${MOCK_USER_ID}`)).toBe("triage");
    expect(localStorage.getItem("wm_view")).toBeNull();
  });
});
