// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, api, wire, track } from "lwc";
import { getObjectInfo } from "lightning/uiObjectInfoApi";
import { createRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import WORK_ITEM_OBJECT from "@salesforce/schema/Work_Item__c";
import getActiveSprints from "@salesforce/apex/WorkItemController.getActiveSprints";
import getEpics from "@salesforce/apex/WorkItemController.getEpics";

// ── Constants ─────────────────────────────────────────────────────────────────

// Work_Mode__c value to stamp on each record type (null = field left blank)
const WORK_MODE = {
  Project: null,
  Epic: null,
  Story: "Iterative",
  Chapter: "Iterative",
  Task: "Continuous",
  Bug: "Reactive",
  Step: null
};

// Default Status__c for each record type on creation
const DEFAULT_STATUS = {
  Project: "Active",
  Epic: "Not Started",
  Story: "Not Started",
  Task: "Not Started",
  Bug: "Not Started",
  Chapter: "Not Started",
  Step: "Not Started"
};

// Sets of record types that show each optional field section
const SPRINT_TYPES = new Set(["Story", "Task", "Bug"]);
const ESTIMATE_TYPES = new Set(["Story", "Task", "Bug", "Chapter", "Epic"]);
const PARENT_TYPES = new Set(["Story", "Task", "Bug"]);
const USER_STORY_TYPES = new Set(["Story"]);
const AC_TYPES = new Set(["Story", "Task", "Bug"]);

const USER_STORY_TEMPLATE = "As a [user], I want [goal], so that [reason].";

// Form component for creating a new Work_Item__c record.
// The rendered fields adapt to the record type specified via the `type` @api prop.
// Fired events: 'created' (with { id }) on success, 'cancel' on cancel.
export default class WorkItemCreate extends LightningElement {
  // ── Public API ──────────────────────────────────────────────────────────────
  @api type = "Story"; // record type to create (controls which fields are shown)
  @api parentId; // pre-selected parent work item Id
  @api sprintId; // pre-selected sprint Id
  @api projectId; // project scope used when creating Epics

  // ── State ────────────────────────────────────────────────────────────────────
  @track name = "";
  @track description = "";
  @track userStory = "";
  @track acceptanceCriteria = "";
  @track priority = "Medium"; // default priority on every new item
  @track estimate = null;
  @track selectedSprintId = null;
  @track selectedParentId = null;
  @track isCreating = false;

  sprints = []; // populated by the getActiveSprints wire
  epics = []; // populated imperatively in connectedCallback

  // ── Wire adapters ─────────────────────────────────────────────────────────
  // Provides the recordTypeId for the current type — create button is disabled until this resolves
  @wire(getObjectInfo, { objectApiName: WORK_ITEM_OBJECT })
  objectInfo;

  // Populates the sprint picker dropdown
  @wire(getActiveSprints)
  wiredSprints({ data }) {
    if (data) this.sprints = data;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  // Fetches epics imperatively (not via wire) so newly created epics are always included
  async connectedCallback() {
    if (USER_STORY_TYPES.has(this.type)) {
      this.userStory = USER_STORY_TEMPLATE; // pre-fill the user story template for Story type
    }
    try {
      this.epics = (await getEpics({ projectId: null })) ?? [];
    } catch {
      /* epics are optional — parent picker just won't populate */
    }
  }

  // ── Field visibility flags ────────────────────────────────────────────────
  get showSprintPicker() {
    return SPRINT_TYPES.has(this.type);
  }
  get showEstimate() {
    return ESTIMATE_TYPES.has(this.type);
  }
  get showParentPicker() {
    return PARENT_TYPES.has(this.type);
  }
  get showUserStory() {
    return USER_STORY_TYPES.has(this.type);
  }
  get showAcceptanceCriteria() {
    return AC_TYPES.has(this.type);
  }

  // ── Computed properties ───────────────────────────────────────────────────
  get createLabel() {
    return `Create ${this.type}`;
  }

  // Button is disabled until objectInfo resolves (provides the recordTypeId)
  get isCreateDisabled() {
    return this.isCreating || !this.recordTypeId;
  }

  // Builds the sprint dropdown options with a blank "No Sprint" entry at the top
  get sprintOptions() {
    const opts = [{ label: "— No Sprint —", value: "" }];
    this.sprints.forEach((s) => opts.push({ label: s.Name, value: s.Id }));
    return opts;
  }

  // Builds the parent dropdown options, showing epic name and its project in parentheses
  get parentOptions() {
    const opts = [{ label: "— No Parent —", value: "" }];
    this.epics.forEach((e) => {
      const project = e.Parent_Work_Item__r?.Name;
      const label = project ? `${e.Name} (${project})` : e.Name;
      opts.push({ label, value: e.Id });
    });
    return opts;
  }

  get priorityOptions() {
    return [
      { label: "Critical", value: "Critical" },
      { label: "High", value: "High" },
      { label: "Medium", value: "Medium" },
      { label: "Low", value: "Low" }
    ];
  }

  // Looks up the recordTypeId for the current type from the objectInfo wire result
  get recordTypeId() {
    if (!this.objectInfo?.data?.recordTypeInfos) return null;
    const match = Object.values(this.objectInfo.data.recordTypeInfos).find(
      (rt) => rt.name === this.type
    );
    return match?.recordTypeId ?? null;
  }

  // ── Field change handler ──────────────────────────────────────────────────
  // Uses data-field attributes on inputs to route changes to the correct state property
  handleChange(event) {
    const field = event.target.dataset.field;
    this[field] = event.target.value;
  }

  // ── Create handler ────────────────────────────────────────────────────────
  // Validates required fields, builds the fields payload, then calls LDS createRecord.
  // Optional fields are only included when they have a value — LDS rejects explicit null
  // for Long Text Area fields.
  async handleCreate() {
    if (!this.name?.trim()) {
      this.toast("Title is required", "", "error");
      return;
    }
    if (!this.recordTypeId) {
      this.toast("Record type not ready — try again", "", "error");
      return;
    }

    this.isCreating = true;
    const fields = {
      Name: this.name.trim(),
      RecordTypeId: this.recordTypeId,
      Status__c: DEFAULT_STATUS[this.type],
      Priority__c: this.priority
    };

    // Optional fields — omit entirely when blank to avoid LDS validation errors
    if (this.description) fields.Description__c = this.description;
    if (this.userStory) fields.User_Story__c = this.userStory;
    if (this.acceptanceCriteria)
      fields.Acceptance_Criteria__c = this.acceptanceCriteria;
    if (WORK_MODE[this.type]) fields.Work_Mode__c = WORK_MODE[this.type];
    if (this.estimate != null) fields.Estimate__c = Number(this.estimate);

    // Resolve parent: user selection > @api prop > projectId (for Epics) > null
    const parentId =
      this.selectedParentId ||
      this.parentId ||
      (this.type === "Epic" ? this.projectId : null) ||
      null;
    if (parentId) fields.Parent_Work_Item__c = parentId;

    const sprint = this.selectedSprintId || this.sprintId || null;
    if (sprint) fields.Sprint__c = sprint;

    try {
      const rec = await createRecord({
        apiName: WORK_ITEM_OBJECT.objectApiName,
        fields
      });
      this.toast(`${this.type} created`, this.name, "success");
      this.dispatchEvent(
        new CustomEvent("created", { detail: { id: rec.id } })
      );
      this.reset();
    } catch (err) {
      this.toast(
        "Creation failed",
        err?.body?.message ?? err?.message,
        "error"
      );
    } finally {
      this.isCreating = false;
    }
  }

  // ── Cancel handler ────────────────────────────────────────────────────────
  handleCancel() {
    this.reset();
    this.dispatchEvent(new CustomEvent("cancel"));
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  reset() {
    this.name = "";
    this.description = "";
    this.userStory = "";
    this.acceptanceCriteria = "";
    this.priority = "Medium";
    this.estimate = null;
    this.selectedSprintId = null;
    this.selectedParentId = null;
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
