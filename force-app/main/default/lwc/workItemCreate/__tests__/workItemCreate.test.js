import { createElement } from "lwc";
import WorkItemCreate from "c/workItemCreate";
import { getObjectInfo } from "lightning/uiObjectInfoApi";

// ── Apex wire mocks ─────────────────────────────────────────────────────────
jest.mock("@salesforce/apex/WorkItemController.getActiveSprints", () => {
  const {
    createApexTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  const adapter = createApexTestWireAdapter(jest.fn());
  return { default: adapter, __esModule: true };
});
jest.mock("@salesforce/apex/WorkItemController.getEpics", () => ({
  default: jest.fn().mockResolvedValue([]),
  __esModule: true
}));

import { createRecord } from "lightning/uiRecordApi";
import getActiveSprints from "@salesforce/apex/WorkItemController.getActiveSprints";

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

const MOCK_RT_ID = "rt001AAA";
const MOCK_RT_ID_PROJECT = "rt002AAA";
const MOCK_OBJ_INFO = {
  recordTypeInfos: {
    rt001: {
      name: "Story",
      recordTypeId: MOCK_RT_ID,
      available: true,
      defaultRecordTypeMapping: false
    },
    rt002: {
      name: "Project",
      recordTypeId: MOCK_RT_ID_PROJECT,
      available: true,
      defaultRecordTypeMapping: false
    }
  }
};
const MOCK_SPRINTS = [{ Id: "sp001", Name: "Sprint 1" }];

function create(type = "Story") {
  const el = createElement("c-work-item-create", { is: WorkItemCreate });
  el.type = type;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  while (document.body.firstChild)
    document.body.removeChild(document.body.firstChild);
  jest.clearAllMocks();
});

// ── Create button guard ─────────────────────────────────────────────────────
describe("create button guard", () => {
  it("is disabled before objectInfo loads", async () => {
    const el = create();
    await Promise.resolve();
    const btn = getBrandBtn(el.shadowRoot);
    expect(btn.disabled).toBe(true);
  });

  it("is enabled once objectInfo provides a valid recordTypeId", async () => {
    const el = create();
    await Promise.resolve();
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    const btn = getBrandBtn(el.shadowRoot);
    expect(btn.disabled).toBe(false);
  });
});

// ── Field visibility ────────────────────────────────────────────────────────
describe("field visibility by type", () => {
  it("Story: shows sprint picker, estimate, user story, acceptance criteria", async () => {
    const el = create("Story");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    expect(
      el.shadowRoot.querySelector('[data-field="userStory"]')
    ).not.toBeNull();
    expect(
      el.shadowRoot.querySelector('[data-field="acceptanceCriteria"]')
    ).not.toBeNull();
    expect(
      el.shadowRoot.querySelector('[data-field="estimate"]')
    ).not.toBeNull();
  });

  it("Project: hides sprint picker, estimate, user story", async () => {
    const el = create("Project");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    expect(el.shadowRoot.querySelector('[data-field="userStory"]')).toBeNull();
    expect(el.shadowRoot.querySelector('[data-field="estimate"]')).toBeNull();
  });

  it("Epic: shows estimate but not sprint picker or user story", async () => {
    const el = create("Epic");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    expect(
      el.shadowRoot.querySelector('[data-field="estimate"]')
    ).not.toBeNull();
    expect(el.shadowRoot.querySelector('[data-field="userStory"]')).toBeNull();
  });
});

// ── Sprint options ──────────────────────────────────────────────────────────
describe("sprint picker", () => {
  it("populates sprint dropdown from wire data", async () => {
    const el = create("Story");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    getActiveSprints.emit(MOCK_SPRINTS);
    await Promise.resolve();
    const picker = el.shadowRoot.querySelector(
      '[data-field="selectedSprintId"]'
    );
    expect(picker).not.toBeNull();
    // Options include the blank option + 1 sprint
    expect(picker.options.length).toBe(2);
  });
});

// ── Project code ────────────────────────────────────────────────────────────
describe("project code field", () => {
  it("shows for Project type", async () => {
    const el = create("Project");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    expect(
      el.shadowRoot.querySelector('[data-field="projectCode"]')
    ).not.toBeNull();
  });

  it("hidden for Story type", async () => {
    const el = create("Story");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    expect(
      el.shadowRoot.querySelector('[data-field="projectCode"]')
    ).toBeNull();
  });

  it("blocks creation when code is empty", async () => {
    const el = create("Project");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    const nameField = el.shadowRoot.querySelector('[data-field="name"]');
    nameField.value = "New Project";
    nameField.dispatchEvent(new CustomEvent("change"));
    await Promise.resolve();
    getBrandBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await flushAllPromises();
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("blocks creation when code is 2 letters", async () => {
    const el = create("Project");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    const nameField = el.shadowRoot.querySelector('[data-field="name"]');
    nameField.value = "New Project";
    nameField.dispatchEvent(new CustomEvent("change"));
    const codeField = el.shadowRoot.querySelector('[data-field="projectCode"]');
    codeField.value = "AB";
    codeField.dispatchEvent(new CustomEvent("change"));
    await Promise.resolve();
    getBrandBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await flushAllPromises();
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("blocks creation when code contains digits", async () => {
    const el = create("Project");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    const nameField = el.shadowRoot.querySelector('[data-field="name"]');
    nameField.value = "New Project";
    nameField.dispatchEvent(new CustomEvent("change"));
    const codeField = el.shadowRoot.querySelector('[data-field="projectCode"]');
    codeField.value = "1AB";
    codeField.dispatchEvent(new CustomEvent("change"));
    await Promise.resolve();
    getBrandBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await flushAllPromises();
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("normalises lowercase to uppercase and includes in createRecord", async () => {
    createRecord.mockResolvedValue({ id: "newProj001" });
    const el = create("Project");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    const nameField = el.shadowRoot.querySelector('[data-field="name"]');
    nameField.value = "New Project";
    nameField.dispatchEvent(new CustomEvent("change"));
    const codeField = el.shadowRoot.querySelector('[data-field="projectCode"]');
    codeField.value = "abc";
    codeField.dispatchEvent(new CustomEvent("change"));
    await Promise.resolve();
    getBrandBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await flushAllPromises();
    expect(createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({
          Project_Code__c: "ABC"
        })
      })
    );
  });
});

// ── Create record ───────────────────────────────────────────────────────────
describe("handleCreate", () => {
  it("calls createRecord with correct fields and fires created event", async () => {
    createRecord.mockResolvedValue({ id: "new001" });
    const el = create("Story");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();

    // Set name — handleChange reads event.target.value so we must set the property directly
    const nameField = el.shadowRoot.querySelector('[data-field="name"]');
    nameField.value = "My Story";
    nameField.dispatchEvent(new CustomEvent("change"));
    await Promise.resolve();

    const createdHandler = jest.fn();
    el.addEventListener("created", createdHandler);

    getBrandBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await flushAllPromises();

    expect(createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({
          Name: "My Story",
          RecordTypeId: MOCK_RT_ID,
          Status__c: "To Do",
          Priority__c: "Medium"
        })
      })
    );
    expect(createdHandler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { id: "new001" } })
    );
  });

  it("does not call createRecord when name is empty", async () => {
    const el = create("Story");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    getBrandBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await Promise.resolve();
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("fires cancel event on Cancel click", async () => {
    const el = create("Story");
    getObjectInfo.emit(MOCK_OBJ_INFO);
    await Promise.resolve();
    const handler = jest.fn();
    el.addEventListener("cancel", handler);
    getCancelBtn(el.shadowRoot).dispatchEvent(new CustomEvent("click"));
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
