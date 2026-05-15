# Technical Documentation — Consultant Project Work Management App

## Overview

A Salesforce-native project management tool built on Lightning Web Components (LWC) and Apex. It provides a kanban board with drag-and-drop, a backlog list view, sprint management, epic tracking, and record-level chapter/subtask applets — all scoped to a selected Initiative.

---

## Data Model

### `Work_Item__c` (custom object)

The central object. A self-referential hierarchy connects all item types through a single lookup field.

| Field | Type | Purpose |
|---|---|---|
| `Name` | Text | Title of the work item |
| `RecordTypeId` | Record Type | Determines item type (see below) |
| `Status__c` | Picklist | Workflow stage |
| `Priority__c` | Picklist | Critical / High / Medium / Low |
| `Estimate__c` | Number | Story-point estimate |
| `Sequence__c` | Number | Manual ordering within a column |
| `Sprint__c` | Lookup → Sprint__c | Sprint assignment (null = backlog) |
| `Parent_Work_Item__c` | Lookup → Work_Item__c (self) | Parent in hierarchy |
| `Assignee__c` | Lookup → User | Assigned team member |
| `Work_Mode__c` | Picklist | Remote / On-site / Hybrid |
| `Description__c` | Long Text | Free-form description |

#### Record Types and their hierarchy positions

```
Initiative
  └─ Epic
       └─ Story | Task | Bug
                     └─ Chapter | Step
```

| Record Type | Status picklist values |
|---|---|
| Initiative | Not Started, In Progress, Completed, Cancelled |
| Epic | Not Started, In Progress, Completed, Cancelled |
| Story / Task / Bug | Not Started, To Do, In Progress, Blocked, Code Review, UAT, Pipeline, Released, Documented, Done |
| Chapter / Step | Not Started, To Do, In Progress, Blocked, Code Review, UAT, Pipeline, Released, Documented, Done |

Default status for all types: **Not Started**.

#### Hierarchy traversal

- Epic's parent is an Initiative.
- Story/Task/Bug's parent is an Epic.
- Chapter/Step's parent is a Story/Task.
- To display the Epic name on a kanban card for a Chapter, two hops are required: `Parent_Work_Item__r.Parent_Work_Item__r.Name`.

### `Sprint__c` (custom object)

| Field | Type | Purpose |
|---|---|---|
| `Name` | Text | Display name (e.g. "Sprint 3") |
| `Status__c` | Picklist | Backlog / Planning / Active / Completed |
| `Start_Date__c` | Date | Sprint start |
| `End_Date__c` | Date | Sprint end |
| `Sequence__c` | Number | Sort order |

One sprint record has `Status__c = 'Backlog'` and `Sequence__c = 9999`. This is the permanent backlog container. It is created automatically on first board load if it does not exist.

---

## Apex Controller — `WorkItemController.cls`

All methods are `with sharing`. Methods annotated `cacheable=true` are safe for `@wire`; DML methods are called imperatively.

### Cacheable methods (usable with `@wire`)

| Method | Purpose |
|---|---|
| `getActiveSprints()` | Returns Planning, Active, and Backlog sprints ordered by sequence |
| `getAllSprints()` | Returns all non-completed sprints plus those completed within the last 30 days |
| `getBoardItems(Id initiativeId)` | Returns all non-Epic, non-Initiative work items scoped to an initiative (see hierarchy scoping below) |
| `getWorkItems(String recordTypeName, Id sprintId, Id initiativeId)` | Filtered item query for the Initiatives list view |
| `getEpics(Id initiativeId)` | Returns all Epics |
| `getWorkItemMeta(Id recordId)` | Returns `typeName` and `sprintId` for a given record — used by the children applet |
| `getChildren(Id parentId)` | Returns direct children of a work item |

### DML methods (called imperatively)

| Method | Purpose |
|---|---|
| `ensureBacklogSprint()` | Creates the Backlog sprint if none exists |
| `generateSprints()` | Creates 6 two-week sprints starting on the next Monday |
| `closeSprint(Id sprintId)` | Marks a sprint Completed and inserts the next sprint in sequence; throws if target is the Backlog sprint |
| `updateStatus(Id workItemId, String newStatus)` | Sets Status__c on a single item |
| `updateSprint(Id workItemId, Id sprintId)` | Sets Sprint__c on a work item and cascades to its Chapter children |

### Initiative hierarchy scoping in `getBoardItems`

SOQL does not support subqueries nested more than one level deep. The method works around this with two pre-queries:

```
Pass 1: collect Epic IDs where Parent_Work_Item__c = initiativeId
Pass 2: collect Story/Task/Bug IDs where Parent_Work_Item__c IN epicIds
validParents = { initiativeId } ∪ epicIds ∪ storyIds
Main query: WHERE Parent_Work_Item__c IN :validParents
```

This prevents items from other initiatives appearing on the board.

---

## LWC Components

### `workManager`

**Location:** `force-app/main/default/lwc/workManager/`  
**Exposed as:** App page component

The top-level shell. Manages a three-view state machine: `initiatives`, `sprints`, `board`.

- **Initiatives view:** Lists all Initiative records. Clicking one sets `selectedInitiative` and switches to `board` view.
- **Sprints view:** Lists all sprints with status bar indicators. The first non-completed, non-backlog sprint gets a "Close" button. Closing a sprint marks it Completed and auto-creates the next one.
- **Board view:** Renders `c-work-item-board` with `initiative-id={selectedInitiativeId}`.

Sprint display logic: `allSprintsForDisplay` getter maps each sprint to a display record including a `barClass` for colour coding and a `canClose` boolean (only the earliest active/planning sprint can be closed).

---

### `workItemBoard`

**Location:** `force-app/main/default/lwc/workItemBoard/`  
**Exposed as:** Child of `workManager`

The kanban board. Receives `initiativeId` as an `@api` property.

#### Initialisation

`connectedCallback` calls `ensureBacklogSprint()` imperatively so it does not block the cacheable `@wire` for `getActiveSprints`. If the Backlog sprint already exists, the caught exception is silently discarded.

#### Data wiring

```javascript
@wire(getActiveSprints)       → this.sprints
@wire(getBoardItems, { initiativeId: '$initiativeId' }) → this.workItems
```

Both wire results are stored in `_wiredSprints` / `_wiredResult` for use with `refreshApex` after DML.

#### Epic panel

The board header shows all Epics belonging to the initiative grouped into three columns: Active, Completed, Cancelled. Each epic row is clickable and navigates to the record page.

#### Sprint sections (`sprintSections` getter)

For each sprint, a section object is built:

- **Regular sprints** (`isBacklog = false`): 10 kanban columns, one per stage in `STAGES`. Items are bucketed by `STATUS_TO_STAGE[item.Status__c]`. Each column has `data-stage` and `data-sprint-id` attributes for drop targeting.
- **Backlog sprint** (`isBacklog = true`): single "Not Started" column; items include those with `Sprint__c = backlogSprintId`, `Sprint__c = null`, or a sprint ID not in the active sprint set. Items are rendered via `listItems` as compact single-row cards.

`STATUS_TO_STAGE` provides a legacy-value mapping so items created under old status names still appear in the correct column.

#### Drag and drop

Cards carry a JSON payload set during `dragstart`:

```json
{ "itemId": "...", "sprintId": "..." }
```

Drop targets are kanban columns and the backlog list. On drop:

1. `updateStatus` is called with the column's `data-stage`.
2. If `toSprintId !== fromSprintId`, `updateSprint` is called.
3. `refreshApex(this._wiredResult)` re-fetches board items.

Visual feedback: `handleDragEnter` adds `col--drag-over` to the drop target; `handleDragLeave` removes it only when the cursor leaves the element entirely (checked via `element.contains(relatedTarget)`).

#### Create modal

Clicking "+ New" opens `c-work-item-create` in an SLDS modal overlay. On creation, `handleItemCreated` closes the modal and refreshes the board.

---

### `workItemCard`

**Location:** `force-app/main/default/lwc/workItemCard/`  
**Exposed as:** Child of `workItemBoard`

Renders a single work item in one of two layouts, controlled by the `@api compact` boolean.

| Layout | Used in | Description |
|---|---|---|
| Card (`compact = false`) | Sprint kanban columns | White card with colour priority bar, title, type badge, estimate badge, parent name, assignee |
| Row (`compact = true`) | Backlog list | Single-line flex row, all metadata inline left-to-right |

**Priority bar:** a 4px left-edge strip coloured by `Priority__c` (Critical = red, High = orange, Medium = blue, Low = grey).

**Parent name logic:**

```javascript
// Chapter or Step → follow two hops to reach the Epic
Parent_Work_Item__r.Parent_Work_Item__r.Name

// Story, Task, Bug → direct parent is the Epic
Parent_Work_Item__r.Name
```

The SOQL in `getBoardItems` fetches `Parent_Work_Item__r.Parent_Work_Item__r.Name` explicitly to support this.

**Interaction:**

- `click` → dispatches `open` custom event with `{ id }`. Parent (`workItemBoard`) navigates to the record page via `NavigationMixin`.
- `dragstart` → encodes `itemId` and `sprintId` in `dataTransfer` as JSON.

---

### `workItemCreate`

**Location:** `force-app/main/default/lwc/workItemCreate/`  
**Exposed as:** Child of `workItemBoard` (modal) and `workItemChildren` (inline)

Form for creating a new work item. Accepts `type`, `sprint-id`, `parent-id`, and `initiative-id` as `@api` props.

All types default to `Status__c = 'Not Started'` via the `DEFAULT_STATUS` map:

```javascript
const DEFAULT_STATUS = {
    Initiative: 'Not Started', Epic: 'Not Started',
    Story: 'Not Started', Task: 'Not Started', Bug: 'Not Started',
    Chapter: 'Not Started', Step: 'Not Started'
};
```

Dispatches `created` on success and `cancel` when dismissed.

---

### `workItemChildren`

**Location:** `force-app/main/default/lwc/workItemChildren/`  
**Exposed as:** Record page component for `Work_Item__c`

An applet that renders on Story and Task record pages to show and create child items (Chapters for Stories, Subtasks/Steps for Tasks). Hidden for all other record types.

- Wires `getWorkItemMeta` to determine `typeName` and `sprintId`.
- Wires `getChildren` to load child records.
- `showApplet` getter returns `true` only when `typeName === 'Story' || typeName === 'Task'`.
- "+ Add" button opens `c-work-item-create` inline with `type={childType}`, `sprint-id={sprintId}`, `parent-id={recordId}`.
- After creation, `refreshApex` re-fetches children.
- Each child row is clickable and navigates to its record page.

---

## Record Page Layout (`Work_Item_Record_Page.flexipage-meta.xml`)

The Work Item record page has a two-region layout. The `main` region contains:

1. A field section with key fields.
2. `c:workItemChildren` — the chapters/subtasks applet, positioned below the field section.

---

## List View (`Work_Item__c / All`)

Columns: `NAME`, `RECORDTYPE`, `Status__c`, `Parent_Work_Item__c`, `Sprint__c`, `Priority__c`, `Assignee__c`.

Note: the record type column uses the metadata key `RECORDTYPE` (not `RecordTypeId`).

---

## Kanban Stages

The 10 canonical stages map to left-to-right columns on sprint kanban boards:

| # | Stage | Typical meaning |
|---|---|---|
| 1 | Not Started | In sprint, not yet begun |
| 2 | To Do | Ready to pick up |
| 3 | In Progress | Active development |
| 4 | Blocked | Impediment present |
| 5 | Code Review | PR open / awaiting review |
| 6 | UAT | User acceptance testing |
| 7 | Pipeline | In CI/CD pipeline |
| 8 | Released | Deployed to production |
| 9 | Documented | Release notes / docs written |
| 10 | Done | Fully complete |

Legacy status values (from before the 10-stage model) are mapped to the nearest current stage in `STATUS_TO_STAGE` in `workItemBoard.js` to avoid items disappearing from the board.

---

## Sprint Lifecycle

```
generateSprints() → creates 6 × 2-week Planning sprints + Backlog sprint
          ↓
Sprint becomes Active (manual status change in Setup or Sprint record)
          ↓
closeSprint(id) → marks Completed, inserts next sprint with incremented sequence
          ↓
(repeat)
```

The Backlog sprint (`Status__c = 'Backlog'`, `Sequence__c = 9999`) is excluded from `closeSprint` and from the "canClose" logic in `workManager`. It always appears last in sprint lists.

---

## Deployment

```bash
# Deploy all metadata
sf project deploy start --source-dir force-app --target-org consultant-project

# Open org
sf org open --target-org consultant-project
```

The app is accessed via the **Work Manager** app page. On first load, `ensureBacklogSprint()` runs automatically.

If the Backlog sprint is missing, navigate to any kanban board — it will be created.

To seed sprints for a new org, open the **Sprints** tab in Work Manager and click **Generate Sprints**.

---

## Key Design Decisions

**Backlog as a sprint record:** Rather than a separate Backlog concept, one `Sprint__c` record with `Status__c = 'Backlog'` absorbs all unassigned items. This keeps the board data model uniform and avoids a nullable-sprint special case everywhere in the UI except the `sprintSections` getter.

**`getActiveSprints` stays cacheable:** The `ensureBacklogSprint` DML call is separated into its own non-cacheable method and called imperatively from `connectedCallback`. This preserves `@wire` reactivity on `getActiveSprints` while still guaranteeing the Backlog sprint exists before the board renders.

**Two-query hierarchy scoping:** SOQL's one-level subquery limit is worked around in `getBoardItems` by collecting valid parent IDs in two pre-queries and then using `IN :validParents` in the main query. This ensures items from other initiatives cannot appear on the board.

**`updateSprint` cascades to Chapters:** When a Story is dragged to a new sprint, its Chapter children move with it. This keeps parent-child pairs co-located in the same sprint without requiring separate drag operations.

**Compact card layout for backlog:** The backlog can grow large. A single-line row format (`compact = true`) allows more items to be visible without scrolling, while sprint columns use taller cards with more detail.
