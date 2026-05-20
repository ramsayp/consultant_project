// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, api, wire, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import getWorkItemMeta from "@salesforce/apex/WorkItemController.getWorkItemMeta";
import getChildren from "@salesforce/apex/WorkItemController.getChildren";

// ── Constants ─────────────────────────────────────────────────────────────────

// Maps a parent record type to the default child type to create
const CHILD_TYPE = {
  Project: "Epic",
  Epic: "Story",
  Story: "Chapter",
  Task: "Step"
};

// Section header labels for each parent type's child list
const SECTION_LABEL = {
  Project: "Epics",
  Epic: "Work Items",
  Story: "Chapters",
  Task: "Steps"
};

// Sub-groups rendered inside an Epic's child list (Epics can have mixed child types)
const EPIC_GROUPS = [
  { label: "Stories", type: "Story" },
  { label: "Tasks", type: "Task" },
  { label: "Bugs", type: "Bug" }
];

// Record-page applet component — displays and manages the children of the current record.
// Shown on Project, Epic, Story, and Task record pages.
export default class WorkItemChildren extends NavigationMixin(
  LightningElement
) {
  // ── Public API ────────────────────────────────────────────────────────────
  @api recordId; // Id of the record whose children are shown

  // ── State ─────────────────────────────────────────────────────────────────
  @track showCreate = false; // controls the inline create form
  @track createType = "Story"; // record type pre-selected in the create form
  @track children = []; // child work items returned by Apex
  @track typeName = ""; // record type name of the current record (e.g. 'Epic')

  sprintId = null; // sprint of the current record, passed into the create form

  // ── Wire adapter ─────────────────────────────────────────────────────────
  // Fetches the type name and sprint of the current record, then loads its children.
  // Using async wire handler so loadChildren can be awaited before the component renders.
  @wire(getWorkItemMeta, { recordId: "$recordId" })
  async wiredMeta({ data }) {
    if (data) {
      this.typeName = data.typeName;
      this.sprintId = data.sprintId || null;
      this.createType = CHILD_TYPE[this.typeName] || "Story"; // default create type from parent type
      await this.loadChildren();
    }
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  async loadChildren() {
    try {
      this.children = await getChildren({ parentId: this.recordId });
    } catch {
      /* silent — children panel is non-critical */
    }
  }

  // ── Computed properties ───────────────────────────────────────────────────
  get showApplet() {
    return !!CHILD_TYPE[this.typeName];
  } // hides the panel for types that have no children (Bug etc.)
  get childType() {
    return this.createType;
  }
  get sectionLabel() {
    return SECTION_LABEL[this.typeName] || "Children";
  }
  get isEmpty() {
    return this.children.length === 0;
  }
  get isEpic() {
    return this.typeName === "Epic";
  } // Epic uses grouped rendering (Stories / Tasks / Bugs)

  // Splits an Epic's children into labelled sub-groups for the template
  get epicChildGroups() {
    return EPIC_GROUPS.map((g) => ({
      ...g,
      items: this.children.filter((c) => c.RecordType.Name === g.type),
      isEmpty:
        this.children.filter((c) => c.RecordType.Name === g.type).length === 0
    }));
  }

  // ── Create handlers ───────────────────────────────────────────────────────
  handleAdd() {
    this.showCreate = true;
  }

  // Allows the epic child-group buttons to specify which type to create
  handleAddType(event) {
    this.createType = event.currentTarget.dataset.type;
    this.showCreate = true;
  }

  handleCancel() {
    this.showCreate = false;
  }

  async handleCreated() {
    this.showCreate = false;
    await this.loadChildren();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  // Opens the standard record page for the clicked child item
  handleOpenChild(event) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: event.currentTarget.dataset.id,
        actionName: "view"
      }
    });
  }
}
