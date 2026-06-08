// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, track, wire, api } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { refreshApex } from "@salesforce/apex";
import { NavigationMixin } from "lightning/navigation";
import getBoardItems from "@salesforce/apex/WorkItemController.getBoardItems";
import getActiveSprints from "@salesforce/apex/WorkItemController.getActiveSprints";
import ensureBacklogSprint from "@salesforce/apex/WorkItemController.ensureBacklogSprint";
import updateStatus from "@salesforce/apex/WorkItemController.updateStatus";
import updateSprint from "@salesforce/apex/WorkItemController.updateSprint";
import updateSequences from "@salesforce/apex/WorkItemController.updateSequences";

// ── Constants ─────────────────────────────────────────────────────────────────

// Ordered list of kanban columns shown on the board
const STAGES = [
  "To Do",
  "On Hold",
  "In Progress",
  "In Code Review",
  "Testing",
  "Documenting",
  "Releasing",
  "Done"
];

// Maps a stored Status__c value to a kanban column name.
const STATUS_TO_STAGE = {
  "To Do": "To Do",
  "On Hold": "On Hold",
  "In Progress": "In Progress",
  "In Code Review": "In Code Review",
  Testing: "Testing",
  Documenting: "Documenting",
  Releasing: "Releasing",
  Done: "Done",
  // Selection statuses (Planning/Backlog sprint items) — bucket sanely if they
  // appear in a kanban context (e.g. mid-drag, stale cache)
  "Not Selected": "To Do",
  Selected: "To Do",
  // Project/Epic terminal statuses — bucket onto the kanban if those items appear
  Active: "In Progress",
  Completed: "Done",
  Cancelled: "Done",
  // Old values — remap to nearest current stage
  "Not Started": "To Do",
  Blocked: "On Hold",
  "Code Review": "In Code Review",
  UAT: "Testing",
  Pipeline: "Releasing",
  Released: "Releasing",
  Documented: "Documenting"
};

// Groups columns under an agent/role owner for visual bucketing on the board
const STAGE_GROUPS = [
  { label: "Dev Agent", stages: ["To Do", "On Hold", "In Progress"] },
  { label: "Code Review Agent", stages: ["In Code Review"] },
  { label: "Human Tester", stages: ["Testing"] },
  { label: "Doc Agent", stages: ["Documenting"] },
  { label: "Release Agent", stages: ["Releasing"] },
  { label: "End Bucket", stages: ["Done"] }
];

// Pre-built options array for the stage filter dropdown
const STAGE_OPTS = STAGES.map((s) => ({ label: s, value: s }));

// Numeric priority ranking used for sorting cards within a column (lower = higher priority)
const PRIORITY_ORDER = {
  Critical: 0,
  Higher: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  Lowest: 5
};

// Kanban board for a single project (or all items when projectId is null).
// Handles drag-and-drop between columns and sprints, plus inline item creation.
export default class WorkItemBoard extends NavigationMixin(LightningElement) {
  // ── Public API ────────────────────────────────────────────────────────────
  @api projectId = null; // Id of the project to scope the board; null = all items

  // ── State ─────────────────────────────────────────────────────────────────
  @track showCreate = false; // controls the new-item creation panel
  @track createType = "Story"; // record type to pre-select in the create form
  @track createSprint = null; // sprint to pre-select in the create form
  @track createParent = null; // parent epic to pre-select in the create form
  @track isLoading = true;
  @track error = null;
  @track activeTab = "boards"; // 'boards' | 'epics'
  @track hoverCardId = null; // Id of the card the dragged item is hovering over
  @track hoverPosition = null; // 'above' | 'below' — half of the hovered card being targeted

  workItems = []; // flat list of all board items returned by Apex
  sprints = []; // active sprints used to build the column sections
  _wiredSprints; // raw wire result — held so refreshApex can target it

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  // Ensures a Backlog sprint always exists before the board first renders
  async connectedCallback() {
    try {
      await ensureBacklogSprint();
      if (this._wiredSprints) await refreshApex(this._wiredSprints);
    } catch {
      /* backlog sprint already exists — safe to ignore */
    }
    await this.loadItems();
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  // Fetches all board items for the current project scope from Apex
  async loadItems() {
    this.isLoading = true;
    try {
      this.workItems = await getBoardItems({ projectId: this.projectId });
      this.error = null;
    } catch (e) {
      this.error = e?.body?.message ?? "Failed to load items.";
    } finally {
      this.isLoading = false;
    }
  }

  // Keeps the sprint list in sync; wire is cacheable so it auto-refreshes on stale data
  @wire(getActiveSprints)
  wiredSprints(result) {
    this._wiredSprints = result;
    if (result.data) this.sprints = result.data;
  }

  // ── Tab state ─────────────────────────────────────────────────────────────
  get isEpicsTab() {
    return this.activeTab === "epics";
  }
  get isBoardsTab() {
    return this.activeTab === "boards";
  }

  get epicsTabClass() {
    return (
      "board-tab" + (this.activeTab === "epics" ? " board-tab--active" : "")
    );
  }
  get boardsTabClass() {
    return (
      "board-tab" + (this.activeTab === "boards" ? " board-tab--active" : "")
    );
  }

  handleTabClick(event) {
    this.activeTab = event.currentTarget.dataset.tab;
  }

  // ── Dropdown options ──────────────────────────────────────────────────────
  get typeOptions() {
    return [
      { label: "Story", value: "Story" },
      { label: "Task", value: "Task" },
      { label: "Bug", value: "Bug" }
    ];
  }

  get sprintOptions() {
    return this.sprints.map((s) => ({ label: s.Name, value: s.Id }));
  }

  get stageOptions() {
    return STAGE_OPTS;
  }

  // ── Epic panel ────────────────────────────────────────────────────────────
  // Returns the auto-created General Epic for this project (Is_General__c = true),
  // displayed in its own pinned section separate from regular Epics.
  get generalEpic() {
    return (
      this.workItems.find(
        (i) => i.RecordType?.Name === "Epic" && i.Is_General__c
      ) ?? null
    );
  }

  // Groups regular (non-General) epics into Active / Completed / Cancelled buckets
  get epicGroups() {
    const epics = this.workItems.filter(
      (i) => i.RecordType?.Name === "Epic" && !i.Is_General__c
    );
    const groups = [
      { key: "active", label: "Active", statuses: null }, // null = everything not Completed or Cancelled
      { key: "completed", label: "Completed", statuses: ["Completed"] },
      { key: "cancelled", label: "Cancelled", statuses: ["Cancelled"] }
    ];
    return groups.map((g) => {
      const items = g.statuses
        ? epics.filter((e) => g.statuses.includes(e.Status__c))
        : epics.filter(
            (e) => !["Completed", "Cancelled"].includes(e.Status__c)
          );
      return { ...g, items, count: items.length, empty: items.length === 0 };
    });
  }

  get epicCount() {
    return this.workItems.filter((i) => i.RecordType?.Name === "Epic").length;
  }

  // ── Sprint kanban ─────────────────────────────────────────────────────────
  // Attaches drop-indicator CSS classes to a card based on the current hover state
  _slotted(item) {
    return {
      ...item,
      aboveClass:
        this.hoverCardId === item.Id && this.hoverPosition === "above"
          ? "drop-indicator drop-indicator--visible"
          : "drop-indicator",
      belowClass:
        this.hoverCardId === item.Id && this.hoverPosition === "below"
          ? "drop-indicator drop-indicator--visible"
          : "drop-indicator"
    };
  }

  // Builds the full data structure the template iterates over:
  // one section per sprint. Only the Active sprint renders as a kanban (columns
  // keyed by stage); every other sprint — Planning sprints and Backlog alike —
  // renders as a flat list, like the Backlog view always has.
  // The Backlog sprint absorbs items with no sprint or with a deleted sprint Id.
  // Sort order: Active sprint first (for prominence), then the rest in their
  // incoming Sequence__c order, with Backlog always pinned last.
  get sprintSections() {
    const sprintIds = new Set(this.sprints.map((s) => s.Id));
    const sorted = [...this.sprints].sort((a, b) => {
      const aIsBacklog = a.RecordType?.DeveloperName === "Backlog";
      const bIsBacklog = b.RecordType?.DeveloperName === "Backlog";
      if (aIsBacklog !== bIsBacklog) return aIsBacklog ? 1 : -1;
      const aIsActive = a.Status__c === "Active";
      const bIsActive = b.Status__c === "Active";
      if (aIsActive !== bIsActive) return aIsActive ? -1 : 1;
      return 0;
    });
    return sorted.map((sprint) => {
      const isBacklog = sprint.RecordType?.DeveloperName === "Backlog";
      const isActive = sprint.Status__c === "Active";
      const isListView = !isActive;
      const items = this.workItems.filter((i) => {
        if (i.RecordType?.Name === "Epic") return false; // epics appear on the epics tab only
        // Backlog absorbs items with no sprint or an unknown sprint Id
        if (isBacklog)
          return (
            i.Sprint__c === sprint.Id ||
            !i.Sprint__c ||
            !sprintIds.has(i.Sprint__c)
          );
        return i.Sprint__c === sprint.Id;
      });
      const columns = isActive
        ? STAGES.map((stage) => {
            const colItems = this._prioritySort(
              items.filter(
                (i) => (STATUS_TO_STAGE[i.Status__c] || "To Do") === stage
              )
            );
            return {
              stage,
              items: colItems.map((i) => this._slotted(i)),
              count: colItems.length,
              empty: colItems.length === 0
            };
          })
        : [];
      const columnGroups = isActive
        ? STAGE_GROUPS.map((group) => ({
            label: group.label,
            key: group.label,
            colFlexStyle: `flex: ${group.stages.length} 1 0; min-width: 0`,
            columns: group.stages
              .map((stage) => columns.find((c) => c.stage === stage))
              .filter(Boolean)
          }))
        : [];
      return {
        sprintId: sprint.Id,
        name: sprint.Name,
        startDate: sprint.Start_Date__c,
        endDate: sprint.End_Date__c,
        isBacklog,
        isActive,
        isListView,
        sectionClass: isActive
          ? "sprint-section sprint-section--active slds-m-bottom_medium"
          : "sprint-section slds-m-bottom_medium",
        emptyMessage: isBacklog
          ? "Backlog is empty."
          : "Nothing selected for this sprint yet.",
        count: items.length,
        columns,
        columnGroups,
        listItems: isListView
          ? this._prioritySort(items).map((i) => this._slotted(i))
          : [] // flat list for non-Active sprints
      };
    });
  }

  // ── Create item handlers ──────────────────────────────────────────────────
  handleTypeChange(event) {
    this.createType = event.detail.value;
  }

  // Opens the create panel, pre-populating type and sprint from the clicked column's data attributes
  handleNewClick(event) {
    this.createType = event.currentTarget.dataset.type || this.createType;
    this.createSprint = event.currentTarget.dataset.sprintId || null;
    this.createParent = null;
    this.showCreate = true;
  }

  handleCreateCancel() {
    this.showCreate = false;
    this.createParent = null;
  }

  async handleItemCreated() {
    this.showCreate = false;
    this.createParent = null;
    await this.loadItems();
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────
  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  handleDragEnter(event) {
    event.preventDefault();
    event.currentTarget.classList.add("col--drag-over");
  }

  handleDragLeave(event) {
    // Only remove the class when the pointer leaves the column entirely (not just a child element)
    if (!event.currentTarget.contains(event.relatedTarget)) {
      event.currentTarget.classList.remove("col--drag-over");
      this.hoverCardId = null;
      this.hoverPosition = null;
    }
  }

  // Tracks which half of a card the dragged item is hovering over (above/below)
  handleCardDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const cardId = event.currentTarget.dataset.id;
    if (!cardId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pos = event.clientY < rect.top + rect.height / 2 ? "above" : "below";
    if (this.hoverCardId !== cardId || this.hoverPosition !== pos) {
      this.hoverCardId = cardId;
      this.hoverPosition = pos;
    }
  }

  // Handles a card being dropped onto a column:
  // 1. Updates the card's status (and sprint if it changed)
  // 2. Re-sequences the source column after the card leaves
  // 3. Inserts the card at the drop position in the destination column,
  //    then stable-sorts by priority to maintain priority grouping
  async handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("col--drag-over");

    // Capture hover state before clearing — event.target can be an indicator div, not the card
    const targetCardId = this.hoverCardId;
    const insertAfter = this.hoverPosition === "below";
    this.hoverCardId = null;
    this.hoverPosition = null;

    let payload;
    try {
      payload = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch {
      return;
    } // malformed drag data — abort

    const { itemId, sprintId: fromSprintId } = payload;
    // List-view drop zones (Planning sprints + Backlog) carry no data-stage —
    // newStage is undefined there, signalling "let updateSprint derive the status"
    const newStage = event.currentTarget.dataset.stage;
    const toSprintId = event.currentTarget.dataset.sprintId || null;

    // Capture source column before any updates so re-sequence uses the pre-move state
    const sourceItem = this.workItems.find((i) => i.Id === itemId);
    const fromStage = STATUS_TO_STAGE[sourceItem?.Status__c] || "To Do";
    const sourceSprint = this.sprints.find((s) => s.Id === fromSprintId);
    const sourceIsActive = sourceSprint?.Status__c === "Active";

    try {
      if (newStage) {
        // Kanban column drop (Active sprint only) — set the card's stage explicitly
        await updateStatus({ workItemId: itemId, newStatus: newStage });
      }
      if (toSprintId !== fromSprintId) {
        // updateSprint derives Status__c from the destination sprint for
        // Backlog/Planning targets; it leaves Status__c alone for the Active
        // sprint so it doesn't clobber what updateStatus just set above
        await updateSprint({ workItemId: itemId, sprintId: toSprintId });
      }

      // Re-sequence source column when the card leaves it. A kanban column is
      // keyed by (stage, sprint); a list view is keyed by sprint alone.
      const leftSourceColumn = sourceIsActive
        ? fromStage !== newStage || fromSprintId !== toSprintId
        : fromSprintId !== toSprintId;
      if (leftSourceColumn) {
        const srcItems = this._prioritySort(
          this._colItems(fromStage, fromSprintId).filter((i) => i.Id !== itemId)
        );
        if (srcItems.length > 0) {
          await updateSequences({ workItemIds: srcItems.map((i) => i.Id) });
        }
      }

      // Build destination column order: insert at drop position then stable-sort by priority
      let destItems = this._prioritySort(
        this._colItems(newStage, toSprintId).filter((i) => i.Id !== itemId)
      );
      const draggedItem = sourceItem;
      if (targetCardId && targetCardId !== itemId) {
        const targetIdx = destItems.findIndex((i) => i.Id === targetCardId);
        destItems.splice(
          targetIdx >= 0
            ? insertAfter
              ? targetIdx + 1
              : targetIdx
            : destItems.length,
          0,
          draggedItem
        );
      } else {
        destItems.push(draggedItem); // no hover target — append to end
      }

      // Stable sort: honour priority order but preserve insertion position for same-priority cards
      const finalOrder = destItems
        .map((item, idx) => ({ item, idx }))
        .sort((a, b) => {
          const pa = PRIORITY_ORDER[a.item.Priority__c] ?? 99;
          const pb = PRIORITY_ORDER[b.item.Priority__c] ?? 99;
          return pa !== pb ? pa - pb : a.idx - b.idx; // tie-break by insertion position
        })
        .map(({ item }) => item);
      await updateSequences({ workItemIds: finalOrder.map((i) => i.Id) });

      await this.loadItems();
    } catch (err) {
      this.toast("Update failed", err?.body?.message ?? err?.message, "error");
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  // Sorts an array of work items by priority then by Sequence__c (position within the column)
  _prioritySort(items) {
    return [...items].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.Priority__c] ?? 99;
      const pb = PRIORITY_ORDER[b.Priority__c] ?? 99;
      if (pa !== pb) return pa - pb;
      return (a.Sequence__c ?? 99999) - (b.Sequence__c ?? 99999); // fall back to sequence order
    });
  }

  // Returns the current items belonging to a specific column — a (stage, sprint)
  // kanban column for the Active sprint, or the whole sprint as one group for
  // list-view sprints (Planning + Backlog), where there's no per-stage grouping.
  // (mirrors the sprintSections filter so drag-drop sequencing stays consistent)
  _colItems(stage, sprintId) {
    const sprintIds = new Set(this.sprints.map((s) => s.Id));
    const sprint = this.sprints.find((s) => s.Id === sprintId);
    const isBacklog = sprint?.RecordType?.DeveloperName === "Backlog";
    const isActive = sprint?.Status__c === "Active";
    return this.workItems.filter((i) => {
      if (i.RecordType?.Name === "Epic") return false;
      if (isActive && (STATUS_TO_STAGE[i.Status__c] || "To Do") !== stage)
        return false;
      if (isBacklog)
        return (
          i.Sprint__c === sprintId ||
          !i.Sprint__c ||
          !sprintIds.has(i.Sprint__c)
        );
      return i.Sprint__c === sprintId;
    });
  }

  // Navigates to the standard record page for the clicked work item
  handleOpenItem(event) {
    const id = event.detail?.id || event.currentTarget?.dataset?.id;
    if (!id) return;
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: { recordId: id, actionName: "view" }
    });
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
