# Project Management App — Guide

## Overview

A Salesforce-native project management tool built on Lightning Web Components (LWC) and Apex. It provides a kanban board with drag-and-drop, a backlog list view, sprint management, epic tracking, and record-level applets — all scoped to a selected Project.

---

## Data Model

### `Work_Item__c` (custom object)

The central object. All item types share one object, differentiated by Record Type. A self-referential lookup field (`Parent_Work_Item__c`) connects the hierarchy.

| Field                    | Type                           | Purpose                                        |
| ------------------------ | ------------------------------ | ---------------------------------------------- |
| `Name`                   | Text                           | Title of the work item                         |
| `RecordTypeId`           | Record Type                    | Determines item type (see below)               |
| `Status__c`              | Picklist                       | Workflow stage (values vary by record type)    |
| `Priority__c`            | Picklist                       | Critical / High / Medium / Low                 |
| `Estimate__c`            | Number                         | Story-point estimate                           |
| `Sequence__c`            | Number                         | Drag-and-drop position within a column         |
| `Sprint__c`              | Lookup → Sprint\_\_c           | Sprint assignment (null = absorbed by backlog) |
| `Parent_Work_Item__c`    | Lookup → Work_Item\_\_c (self) | Parent in the hierarchy                        |
| `Assignee__c`            | Lookup → User                  | Assigned team member                           |
| `Work_Mode__c`           | Picklist                       | Auto-stamped on creation (see below)           |
| `Description__c`         | Long Text                      | Free-form description                          |
| `User_Story__c`          | Long Text                      | Story-type only; pre-filled with template      |
| `Acceptance_Criteria__c` | Long Text                      | Story / Task / Bug                             |

#### Record type hierarchy

```
Project
  └─ Epic
       └─ Story | Task | Bug
                     └─ Chapter | Step
```

| Record Type | Status picklist values                           | Work_Mode auto-stamp |
| ----------- | ------------------------------------------------ | -------------------- |
| Project     | Active, On Hold, Completed, Cancelled            | —                    |
| Epic        | Draft, Active, In Progress, Completed, Cancelled | —                    |
| Story       | Backlog, Ready, In Progress, In Review, Done     | Iterative            |
| Task        | Backlog, In Progress, Blocked, Done              | Continuous           |
| Bug         | Open, Triaged, In Progress, Fixed, Closed        | Reactive             |
| Chapter     | To Do, In Progress, Done                         | Iterative            |
| Step        | To Do, In Progress, Done                         | —                    |

Default status on creation: **Project → Active**, all others → **Not Started**.

Two additional values exist outside the per-record-type kanban lists above — **`Not Selected`** and **`Selected`** — used exclusively to track where a Story/Task/Bug sits relative to the Active sprint (see [Selection status](#selection-status) below). They never appear as kanban columns.

#### Hierarchy rules

- Epic's parent is a Project.
- Story / Task / Bug's parent is an Epic.
- Chapter's parent is a Story; Step's parent is a Chapter.
- To display the Epic name on a kanban card for a Chapter, two hops are required:
  `Parent_Work_Item__r.Parent_Work_Item__r.Name`.

---

### `Sprint__c` (custom object)

| Field           | Type        | Purpose                                                                        |
| --------------- | ----------- | ------------------------------------------------------------------------------ |
| `Name`          | Text        | Display name in date-range format (e.g. "Sprint - 15 Jun 2026 to 28 Jun 2026") |
| `RecordTypeId`  | Record Type | `Sprint` (regular iteration) or `Backlog` (permanent catch-all)                |
| `Status__c`     | Picklist    | Backlog / Planning / Active / Completed                                        |
| `Start_Date__c` | Date        | Sprint start date                                                              |
| `End_Date__c`   | Date        | Sprint end date                                                                |
| `Sequence__c`   | Number      | Sort order (lower = earlier)                                                   |

Two record types: **Sprint** (regular two-week iterations) and **Backlog** (permanent catch-all, `Sequence__c = 9999`). Unassigned Story/Task/Bug items are auto-assigned to the Backlog sprint via `WorkItemTrigger`. On the board, the Backlog section always renders last regardless of sequence number.

---

### `Comment__c` (custom object)

| Field          | Type                    | Purpose                               |
| -------------- | ----------------------- | ------------------------------------- |
| `Body__c`      | Long Text               | Comment content                       |
| `Work_Item__c` | Lookup → Work_Item\_\_c | The work item this comment belongs to |

---

## Apex Controller — `WorkItemController.cls`

All methods use `with sharing`. Methods marked cacheable are safe for `@wire`; all others are called imperatively.

### Wire-safe methods (`cacheable=true`)

| Method                                                           | Purpose                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `getActiveSprints()`                                             | Planning, Active, and Backlog sprints ordered by sequence                             |
| `getAllSprints()`                                                | All non-completed sprints plus those completed within the last 30 days                |
| `getWorkItems(String recordTypeName, Id sprintId, Id projectId)` | Items filtered by type; optional sprint and project scope                             |
| `getStatusColumns()`                                             | Returns the per-record-type status picklist map (used by the board to render columns) |
| `getWorkItemMeta(Id recordId)`                                   | Returns `typeName` and `sprintId` for a record — used by record-page applets          |
| `getComments(Id workItemId)`                                     | All comments for a work item, newest first                                            |

### Imperative-only methods

| Method                                          | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getChildren(Id parentId)`                      | Direct child work items of a given parent                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `getEpics(Id projectId)`                        | All Epics — called fresh (not cached) so newly created epics appear immediately                                                                                                                                                                                                                                                                                                                                                                                                     |
| `getParentContext(Id recordId)`                 | Returns `recordTypeName`, `parentId`, `parentName` — used by the parent selector applet                                                                                                                                                                                                                                                                                                                                                                                             |
| `getCandidateParents(String recordTypeName)`    | Eligible parent records for a given child type (e.g. Epics for a Story)                                                                                                                                                                                                                                                                                                                                                                                                             |
| `ensureBacklogSprint()`                         | Ensures a Backlog-RT sprint exists. On first deploy, migrates any existing Status='Backlog' sprint to the Backlog record type; otherwise creates fresh with the Backlog RT                                                                                                                                                                                                                                                                                                          |
| `generateSprints()`                             | Creates 6 two-week Planning sprints (Sprint RT) starting the next Monday; exits early if sprints exist                                                                                                                                                                                                                                                                                                                                                                              |
| `closeSprint(Id sprintId)`                      | Guards against closing the Backlog sprint (checked via `RecordType.DeveloperName`). Marks a sprint Completed; activates the next sprint in sequence; flips any `Selected` items already in that newly-activated sprint to `Not Started` (see [Selection status](#selection-status)); rolls non-terminal items (any status except Completed, Cancelled, Done, Fixed, Closed) forward to it; creates a new Planning sprint (Sprint RT) at the end of the chain with a date-range name |
| `updateStatus(Id workItemId, String newStatus)` | Sets `Status__c` on one item (called on kanban drop)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `updateSprint(Id workItemId, Id sprintId)`      | Sets `Sprint__c`, derives `Status__c` from the destination sprint via `deriveSelectionStatus` (see [Selection status](#selection-status)), and cascades both to Chapter children                                                                                                                                                                                                                                                                                                    |
| `updateSequences(List<Id> workItemIds)`         | Writes 1-based `Sequence__c` values to persist card order after drag-and-drop                                                                                                                                                                                                                                                                                                                                                                                                       |
| `addComment(Id workItemId, String body)`        | Inserts a new Comment\_\_c record                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `editComment(Id commentId, String body)`        | Updates an existing comment body                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `deleteComment(Id commentId)`                   | Permanently deletes a comment                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

#### Project hierarchy scoping in `getBoardItems`

SOQL cannot nest subqueries more than one level deep. `getBoardItems` collects valid parent IDs in two pre-queries:

```
Pass 1: Epic IDs where Parent_Work_Item__c = projectId
Pass 2: Story/Task/Bug IDs where Parent_Work_Item__c IN epicIds
validParents = { projectId } ∪ epicIds ∪ storyIds
Main query: WHERE Parent_Work_Item__c IN :validParents
```

This prevents items from other projects appearing on the board.

---

## Triggers

### `WorkItemTrigger`

**File:** `force-app/main/default/triggers/WorkItemTrigger.trigger`
**Fires:** before insert on `Work_Item__c`

Assigns the Backlog sprint to any Story, Task, or Bug inserted with a null `Sprint__c`. Queries the Backlog sprint by `RecordTypeId` (Backlog record type) once per transaction. Exits silently if no Backlog sprint exists — no error thrown. Bulkified and safe for data load and API creation.

---

## LWC Components

### `workManager`

**Location:** `force-app/main/default/lwc/workManager/`
**Exposed as:** App Page component (entry point)

The top-level shell. Manages a three-view state machine: `projects`, `sprints`, `board`.

- **Projects view:** Lists all Project records. "+ New Project" opens `c-work-item-create` inline. Clicking a row sets `selectedProject` and switches to `board` view.
- **Sprints view:** Lists all non-Backlog sprints with colour-coded status bars. The earliest non-completed sprint gets a "Close" button. Closing a sprint activates the next sprint and rolls forward any non-terminal items. "Generate Sprints" creates 6 future sprints if none exist.
- **Board view:** Renders `c-work-item-board` with `project-id={selectedProjectId}`. Back arrow returns to Projects.

Sprint display logic: `allSprintsForDisplay` getter enriches each sprint with `barClass` (CSS colour by status) and `canClose` (only one sprint at a time is closeable).

---

### `workItemBoard`

**Location:** `force-app/main/default/lwc/workItemBoard/`
**Exposed as:** Child of `workManager`

The kanban board scoped to one project. Receives `projectId` as an `@api` prop.

#### Initialisation

`connectedCallback` calls `ensureBacklogSprint()` imperatively (so it doesn't block the `@wire` for `getActiveSprints`), then calls `loadItems()` to fetch all board items for the project.

#### Data loading

```javascript
@wire(getActiveSprints)             → this.sprints
loadItems() → getBoardItems({ projectId }) → this.workItems  // imperative, refreshed after every DML
```

#### Two tabs

- **Boards tab** (`activeTab = 'boards'`): renders the sprint kanban sections.
- **Epics tab** (`activeTab = 'epics'`): renders `epicGroups` — Epics bucketed into Active, Completed, and Cancelled groups with counts.

#### Sprint sections (`sprintSections` getter)

Only **one** sprint at a time shows the full kanban grid — the Active sprint. Every other
sprint (Planning sprints **and** Backlog) renders as a flat, single-column list, exactly
like the Backlog always has:

- **Active sprint** (`isActive = sprint.Status__c === 'Active'`): 10 columns, one per kanban
  stage in `STAGES`. Items bucketed by `STATUS_TO_STAGE[item.Status__c]`. Gets a green accent
  border/header (`.sprint-section--active`) and an "Active" badge for visual prominence.
- **Everything else** (`isListView = !isActive`): a flat, priority-sorted list (`listItems`),
  rendered with `compact` cards — same layout the Backlog has always used. The drop zone
  carries no `data-stage` attribute, which is what tells `handleDrop` to skip `updateStatus`
  and let `updateSprint`'s server-side `deriveSelectionStatus` own the status change instead.
- **Backlog sprint** (`isBacklog = sprint.RecordType?.DeveloperName === 'Backlog'`): absorbs
  items where `Sprint__c` is null, equals the backlog sprint ID, or references a sprint not
  in the active set.

Sort order: Active sprint first, Backlog always last, everything else in `Sequence__c` order.
`emptyMessage` differs by section type ("Backlog is empty." vs "Nothing selected for this
sprint yet.").

`STATUS_TO_STAGE` maps legacy status values — plus the new `Not Selected`/`Selected` selection
statuses — to the nearest current stage, so any item rendered in a kanban context (mid-drag,
stale cache) still buckets into a sane column instead of vanishing.

#### Selection status

Two `Work_Item__c.Status__c` values exist purely to track a Story/Task/Bug's position
_relative to the Active sprint_, independent of the kanban stage values:

| Value          | Meaning                                                |
| -------------- | ------------------------------------------------------ |
| `Not Selected` | Sitting in the Backlog — not yet queued for any sprint |
| `Selected`     | Queued in a future (Planning) sprint, not yet active   |

**The status is always derived from the destination, never the origin.** Apex's
`deriveSelectionStatus(Sprint__c destSprint)` (in `WorkItemController.cls`) is the single
source of truth:

```apex
Backlog sprint        → 'Not Selected'
Planning-status sprint → 'Selected'
Active (or anything else) → null  // leave Status__c alone — the kanban drop owns it
```

It's invoked from three places, covering every way an item's sprint can change:

- **`updateSprint`** — every drag-and-drop sprint move (Backlog ↔ Planning, either direction
  into/out of Active). Returning `null` for an Active destination is what stops it clobbering
  the kanban stage that `updateStatus` just set on the same drop.
- **`WorkItemTrigger`** (before insert) — re-derives `Status__c` from the item's final
  `Sprint__c` so manually-picked sprints (not just the Backlog default) get the correct
  selection status from creation. `workItemCreate.js` always sends `Status__c = 'Not Started'`
  regardless of the chosen sprint — Apex corrects it.
- **`closeSprint`** — see [Sprint Lifecycle](#sprint-lifecycle): items already `Selected` in
  the sprint being activated flip to `Not Started` so they enter the kanban at its first stage.

Because the rule looks only at where an item _lands_, pulling a card out of the Active sprint
back into the Backlog or a future sprint resets it to `Not Selected`/`Selected` even if it was
`In Progress`/`Blocked`/etc. — it's no longer being actively worked.

#### Drag and drop

Cards encode a JSON payload on `dragstart`: `{ itemId, sprintId }`.

On drop:

1. `updateStatus` is called with the target column's stage.
2. If the sprint changed, `updateSprint` is called (cascades to Chapter children).
3. Source column is re-sequenced (`updateSequences`) after the card leaves.
4. Destination column order is built at the drop position, then stable-sorted by priority, then persisted with `updateSequences`.
5. `loadItems()` re-fetches the board.

Card-level ordering: `handleCardDragOver` tracks `hoverCardId` and `hoverPosition` (`above` / `below`) so cards can be inserted between specific items, not just appended to the end of a column.

#### Create panel

Clicking "+ New" (on a column or the Epics tab) opens `c-work-item-create` with `type`, `createSprint`, and `createParent` pre-populated from the column's data attributes. On creation, `loadItems()` refreshes the board.

---

### `workItemCard`

**Location:** `force-app/main/default/lwc/workItemCard/`
**Exposed as:** Child of `workItemBoard`

Renders a single work item in one of two layouts:

| Layout | `compact` prop | Used in               |
| ------ | -------------- | --------------------- |
| Card   | `false`        | Sprint kanban columns |
| Row    | `true`         | Backlog list          |

**Priority indicator:** a coloured emoji + left-border bar keyed on `Priority__c`.

| Priority | Emoji | Bar colour |
| -------- | ----- | ---------- |
| Critical | 🔴    | Red        |
| Higher   | 🟠    | Orange     |
| High     | 🟡    | Yellow     |
| Medium   | 🟢    | Green      |
| Low      | 🔵    | Blue       |
| Lowest   | ⚪    | Grey       |

**Parent name logic:**

```javascript
// Chapter or Step → grandparent is the Epic
Parent_Work_Item__r.Parent_Work_Item__r.Name;

// Story, Task, Bug → direct parent is the Epic
Parent_Work_Item__r.Name;
```

**Events fired:** `open` (with `{ id }`) on click → parent board navigates to the record page. `dragstart` → encodes `{ itemId, sprintId }` in `dataTransfer`.

---

### `workItemCreate`

**Location:** `force-app/main/default/lwc/workItemCreate/`
**Exposed as:** Child of `workItemBoard` (in modal) and `workItemChildren` (inline)

Form for creating a new Work_Item\_\_c record. `@api` props: `type`, `parentId`, `sprintId`, `projectId`.

Fields shown adapt to the record type:

| Field                         | Shown for                             |
| ----------------------------- | ------------------------------------- |
| Sprint picker                 | Story, Task, Bug                      |
| Estimate                      | Story, Task, Bug, Chapter, Epic       |
| Parent picker (Epic dropdown) | Story, Task, Bug                      |
| User Story                    | Story only (pre-filled with template) |
| Acceptance Criteria           | Story, Task, Bug                      |

**Parent resolution order:** `selectedParentId` (user pick) → `parentId` prop → `projectId` (for Epics only) → null.

**`recordTypeId`** is resolved from the `getObjectInfo` wire result — the Create button is disabled until this resolves.

**Events fired:** `created` (with `{ id }`) on success; `cancel` on dismiss.

---

### `workItemChildren`

**Location:** `force-app/main/default/lwc/workItemChildren/`
**Exposed as:** Record page sidebar applet

Renders and manages child work items of the current record. Visible when the current record type has children:

| Current type | Child type created | Section label |
| ------------ | ------------------ | ------------- |
| Project      | Epic               | Epics         |
| Epic         | Story (default)    | Work Items    |
| Story        | Chapter            | Chapters      |
| Task         | Step               | Steps         |

Hidden for: Bug, Chapter, Step (no child types defined).

**Epic grouped rendering:** When `typeName === 'Epic'`, children are split into three labelled sub-groups (Stories / Tasks / Bugs) with separate "+ Add" buttons per group. `handleAddType` picks the type from the button's `data-type` attribute.

**Data flow:** `getWorkItemMeta` wire → sets `typeName`, `sprintId` → `loadChildren()` (imperative) → sets `children`. After creation, `loadChildren()` re-fetches.

---

### `workItemComments`

**Location:** `force-app/main/default/lwc/workItemComments/`
**Exposed as:** Record page main region applet (Request tab)

Displays the comment thread for the current work item. Supports add, inline edit, and delete.

- **Wire:** `getComments({ workItemId: '$recordId' })` — refreshed after every mutation via `refreshApex`.
- **Add:** "+ Add Comment" reveals a textarea. Save calls `addComment`; cancel clears the draft.
- **Edit:** clicking edit on a comment sets `editingId` and opens an inline textarea pre-filled with the current body. Save calls `editComment`.
- **Delete:** clicking delete opens a `LightningConfirm` destructive dialog before calling `deleteComment`.
- **"Edited" badge:** shown when `LastModifiedDate` is more than 5 seconds after `CreatedDate` (avoids false positives from trigger timestamps).

---

### `workItemParentSelector`

**Location:** `force-app/main/default/lwc/workItemParentSelector/`
**Exposed as:** Record page component (not yet placed on the record page)

Applet for reassigning the parent of a work item. Shows the current parent as a clickable navigation link, with an Edit button to open a combobox of eligible candidates.

- **Data load:** `getParentContext` (imperative, on `connectedCallback`) → sets `recordTypeName`, `parentId`, `parentName`. Then `getCandidateParents` fetches the eligible parents for the type.
- **Parent type map:** Epic → Project, Story/Task/Bug → Epic, Chapter → Story, Step → Chapter. Project has no parent type — the component hides itself (`hasParentType = false`).
- **Save:** calls LDS `updateRecord` with `{ Id, Parent_Work_Item__c }`, then refreshes via `loadContext()`.

---

### `sprintCreate`

**Location:** `force-app/main/default/lwc/sprintCreate/`
**Exposed as:** Standalone form component

Simple form for manually creating a Sprint\_\_c record. Fields: Name, Status (Planning / Active / Completed), Start Date, End Date.

**Auto end-date:** when Start Date is set, End Date is automatically calculated as Start + 13 days (two-week sprint, inclusive).

Uses LDS `createRecord` directly. **Events fired:** `created` (with `{ id }`) on success; `cancel` on dismiss.

---

## Record Page Layout (`Work_Item_Record_Page`)

The Work Item record page uses a two-region desktop layout.

**Main region** (tabset):

| Tab      | Contents                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request  | Synopsis section (Name, Description), Details section (Estimate, Record Type, Assignee, Sprint, Status), User Story section (User Story, Acceptance Criteria), `workItemComments` applet |
| Settings | Configuration section (Sequence, Work Mode), Audit section (Created By, Last Modified By)                                                                                                |

**Sidebar region:**

| Tab              | Contents                  |
| ---------------- | ------------------------- |
| Child Work Items | `workItemChildren` applet |

---

## Kanban Stages

The 10 canonical stages map to left-to-right columns on sprint boards:

| #   | Stage       | Typical meaning              |
| --- | ----------- | ---------------------------- |
| 1   | Not Started | In sprint, not yet begun     |
| 2   | To Do       | Ready to pick up             |
| 3   | In Progress | Active development           |
| 4   | Blocked     | Impediment present           |
| 5   | Code Review | PR open / awaiting review    |
| 6   | UAT         | User acceptance testing      |
| 7   | Pipeline    | In CI/CD pipeline            |
| 8   | Released    | Deployed to production       |
| 9   | Documented  | Release notes / docs written |
| 10  | Done        | Fully complete               |

Legacy status values are remapped to the nearest current stage in `STATUS_TO_STAGE` in `workItemBoard.js` to prevent cards disappearing from the board.

---

## Sprint Lifecycle

```
generateSprints() → creates Backlog sprint + 6 × 2-week Planning sprints
        ↓
closeSprint(id) → marks Completed
               → activates the next sprint in sequence
               → flips 'Selected' items already in that sprint to 'Not Started'
               → rolls non-terminal items forward to that sprint
               → creates new Planning sprint at end of chain
        ↓
(repeat)
```

The Backlog sprint (Record Type: `Backlog`, `Sequence__c = 9999`) is excluded from `closeSprint` and never appears in the Sprints view. On the board, it always renders last — the `sprintSections` getter sorts sprint sections client-side to guarantee this.

**Terminal statuses** (items stay on closed sprint): `Completed`, `Cancelled`, `Done`, `Fixed`, `Closed`. All other statuses roll forward to the next sprint.

---

## Deployment

```bash
# Deploy all metadata
sf project deploy start --source-dir force-app --ignore-conflicts

# Deploy Apex only (faster iteration)
sf project deploy start --source-dir force-app/main/default/classes/workitem --ignore-conflicts

# Open org
sf org open
```

The app is accessed via the **Project Management** app. On first board load, `ensureBacklogSprint()` runs automatically.

To seed sprints for a new org: open the **Sprints** tab in Project Management and click **Generate Sprints**.

---

## Key Design Decisions

**Backlog as a sprint record:** One `Sprint__c` record (Record Type: `Backlog`, `Sequence__c = 9999`) absorbs all unassigned items. Keeps the data model uniform and avoids a nullable-sprint special case everywhere except the `sprintSections` getter. The Backlog RT is the canonical identifier — detection code uses `RecordType.DeveloperName === 'Backlog'` rather than `Status__c`.

**`getActiveSprints` stays cacheable:** `ensureBacklogSprint` is called imperatively from `connectedCallback`. This preserves `@wire` reactivity on `getActiveSprints` while still guaranteeing the Backlog sprint exists before the board renders.

**`getBoardItems` is imperative, not wired:** The board calls `loadItems()` after every DML operation to get a fresh snapshot. Using a wire here would require `refreshApex` after every drop, and the board issues multiple DML calls per drop (status + sprint + sequences), making imperative fetch simpler and more predictable.

**Two-query hierarchy scoping:** SOQL's one-level subquery limit is worked around in `getBoardItems` by collecting valid parent IDs in two pre-queries. This ensures items from other projects cannot appear on the board.

**`updateSprint` cascades to Chapters:** When a Story moves to a new sprint, its Chapter children move with it automatically. Avoids having to reposition each chapter separately.

**Card-level drag ordering:** `hoverCardId` and `hoverPosition` track which half of a target card the dragged item hovers over. On drop, the card is spliced into the destination column array at the correct position, then the whole column is stable-sorted by priority before `updateSequences` persists the result.

**Compact card layout for backlog:** The backlog can grow large. Single-line rows (`compact = true`) allow more items to be visible without scrolling. Sprint columns use taller cards with more detail.

**Sprint close is a cascade operation:** `closeSprint` does four things atomically — marks Completed, activates the next sprint in sequence, rolls non-terminal work items forward to it, then appends a new Planning sprint at the end of the chain. Sprint names use a date-range format (`Sprint - 1 Jun 2026 to 14 Jun 2026`) generated from `Start_Date__c` and `End_Date__c`, so sprints are self-describing without a manual naming step.

**Backlog hidden from Sprints view:** The Backlog sprint never appears in `allSprintsForDisplay` (filtered in the LWC getter). It is a system-internal record — users cannot close it and seeing it in the sprint panel adds noise.

**Backlog pinned last on the board:** The `sprintSections` getter sorts sprint sections client-side so the Backlog always renders at the bottom, regardless of `Sequence__c`. This prevents any future sprint with a sequence number above 9999 from appearing after the Backlog.

**Active-sprint-only kanban:** Showing the full 10-column kanban for every sprint produced a wall of mostly-empty columns — only the Active sprint is ever actively worked. Now every sprint except the Active one renders as a flat list (the same layout the Backlog always used), and the Active sprint sorts to the top with a green accent border and "Active" badge so it stands out. `isBacklog` and `isActive` are independent flags — Backlog is also list-view, but the two are detected differently (`RecordType.DeveloperName` vs `Status__c`) and serve different purposes (Backlog absorption vs kanban-vs-list rendering).

**Selection status is destination-derived, never origin-derived:** `deriveSelectionStatus` looks only at where an item _lands_. This is the only design that handles every drag combination correctly without special-casing: a card pulled out of the Active sprint back into the Backlog or a future sprint resets to `Not Selected`/`Selected` even if it was `In Progress`/`Blocked`, because it's no longer being actively worked — and a card landing in the Active sprint is left alone (`null`) so `updateStatus` (which fires first in the same drop) keeps ownership of the kanban stage.
