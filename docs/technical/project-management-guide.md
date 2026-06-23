# Project Management App — Guide

## Overview

A Salesforce-native project management tool built on Lightning Web Components (LWC) and Apex. It provides a kanban board with drag-and-drop, a backlog list view, sprint management, epic tracking, record-level applets, and a BA agent ticket triage pipeline — all scoped to a selected Project (triage spans projects).

---

## Data Model

### `Work_Item__c` (custom object)

The central object. All item types share one object, differentiated by Record Type. A self-referential lookup (`Parent_Work_Item__c`) connects the hierarchy. Key fields: `Name`, `RecordTypeId`, `Status__c` (workflow stage, varies by type), `Priority__c`, `Estimate__c`, `Sequence__c`, `Sprint__c`, `Parent_Work_Item__c`, `Assignee__c`, `Work_Mode__c`, `Description__c`, `User_Story__c` (Story only), `Acceptance_Criteria__c` (Story/Task/Bug), `Is_General__c` (Epic).

**New for the Ticket triage pipeline:** `Triage_Status__c` (Picklist — Not Started/Reviewing/Reviewed/Approved/Declined), `Triage_Notes__c` (Long Text — reviewer notes), `Target_Type__c` (Picklist — Story/Task/Bug), `Plan__c` (Long Text — BA agent's delivery plan). All four are Ticket-only.

**New for ticket numbering:** `Item_Number__c` (Number — auto-assigned sequence; numeric portion of `Ticket_Key__c`), `Project_Code__c` (Text(3) — 3-letter uppercase code on a Project record; drives child key generation), `Ticket_Key__c` (Text(10) — auto-assigned: `CODE-NNNNN` for Story/Task/Bug, `TRI-NNNNN` for Tickets).

#### Record type hierarchy

```
Project
  └─ Epic
       └─ Story | Task | Bug
                     └─ Chapter | Step

(Ticket sits outside this hierarchy — raw intake awaiting triage)
```

Status values: Project (Active/On Hold/Completed/Cancelled), Epic (Draft/Active/In Progress/Completed/Cancelled), Story/Task/Bug (To Do/On Hold/In Progress/In Code Review/Testing/Documenting/Releasing/Done), Chapter/Step (To Do/In Progress/Done). Ticket uses `Triage_Status__c` instead of `Status__c`. Two extra values — **Not Selected** / **Selected** — track sprint position; they never appear as kanban columns.

#### Hierarchy rules

- Epic's parent is a Project.
- Story/Task/Bug's parent is an Epic (or, for an approved Ticket, the Epic chosen during review).
- Chapter's parent is a Story; Step's parent is a Chapter.
- Epic name on a Chapter card requires two hops: `Parent_Work_Item__r.Parent_Work_Item__r.Name`.

#### General Epic

When a Project is inserted, `WorkItemTrigger` automatically creates a child Epic named **General** (`Is_General__c = true`) as a catch-all. Status mirrors the parent Project via an `afterUpdate` cascade. Terminal statuses are system-only — the cascade bypasses the restriction via a `systemCascade` static boolean.

---

### `Sprint__c` (custom object)

Fields: `Name` (date-range display), `RecordTypeId` (Sprint or Backlog), `Status__c` (Backlog/Planning/Active/Completed), `Start_Date__c`, `End_Date__c`, `Sequence__c`. The Backlog record (`Sequence__c = 9999`) is a permanent catch-all and always renders last on the board.

---

### `Comment__c` (custom object)

`Body__c` (Long Text), `Work_Item__c` (lookup) — comment thread on a work item.

---

## Apex Controller — WorkItemController.cls

All methods `with sharing`. Cacheable methods are wire-safe; all others are imperative (DML).

### Wire-safe (cacheable=true)

`getActiveSprints()`, `getAllSprints()`, `getWorkItems(recordTypeName, sprintId, projectId)`, `getWorkItemMeta(recordId)`, `getComments(workItemId)`.

### Imperative

`getChildren`, `getEpics`, `getTriageQueue()` — tickets not yet approved, oldest first; explicitly not cacheable (see Key Design Decisions below), `getParentContext`, `getCandidateParents`, `ensureBacklogSprint`, `generateSprints`, `closeSprint`, `updateStatus`, `updateSprint` (cascades to Chapters), `updateSequences`, `addComment/editComment/deleteComment`, `createTicket`, `approveTicket`, `declineTicket`, `getTicketReviewContext`.

#### Project hierarchy scoping in getBoardItems

SOQL allows only one level of subquery nesting. `getBoardItems` collects valid parent IDs in two pre-queries (Epic IDs, then Story/Task/Bug IDs) and uses `IN :validParents` in the main query — preventing cross-project leakage.

---

## Triggers

### WorkItemTrigger

**Fires:** before insert, after insert, before update, after update on `Work_Item__c`.

**Before insert — three passes.** Pass 1 (Backlog default): assigns the Backlog sprint to any Story/Task/Bug inserted with a null `Sprint__c`. Pass 2 (ticket key assignment): calls `WorkItemTriggerHandler.beforeInsert` → `WorkItemService.assignTicketKeys` — assigns `Ticket_Key__c` and `Item_Number__c` to incoming Story/Task/Bug and Ticket records. Pass 3 (selection status): re-derives `Status__c` from the final `Sprint__c` — Backlog → Not Selected, Planning → Selected. Bulkified, safe for data load and API creation.

**After insert, before update, after update** — delegated to `WorkItemTriggerHandler`.

### WorkItemTriggerHandler

**File:** `force-app/main/default/classes/workitem/WorkItemTriggerHandler.cls`

Handles General Epic creation, status mirroring, and ticket key assignment. Four entry points:

- **`beforeInsert`** — routes to `WorkItemService.assignTicketKeys` to assign `Ticket_Key__c` and `Item_Number__c` on incoming Story/Task/Bug and Ticket records.
- **`afterInsert`** — for every newly inserted Project, inserts one child General Epic (`Is_General__c = true`) with the same initial `Status__c`.
- **`beforeUpdate`** — (1) blocks manual terminal-status changes on General Epics — skipped when `systemCascade = true`; (2) detects `Parent_Work_Item__c` changes and calls `assignTicketKeys` on reparented items (covers Ticket approval and manual reparenting).
- **`afterUpdate`** — (1) cascades Project `Status__c` changes to General Epics (`systemCascade = true` guards the nested DML); (2) when `Project_Code__c` is set or changed, calls `WorkItemService.cascadeKeysToProjectChildren` to retroactively key existing children.

### WorkItemService.cls

**File:** `force-app/main/default/classes/workitem/WorkItemService.cls`. All methods `with sharing`.

- **`assignTicketKeys(items)`** — assigns `Item_Number__c` and `Ticket_Key__c` in a single bulk-safe pass. Story/Task/Bug receive `CODE-NNNNN` keys using the parent project's `Project_Code__c` and a per-project sequential counter. Tickets receive `TRI-NNNNN` keys from a global counter. Items with no resolvable project code are skipped silently.
- **`cascadeKeysToProjectChildren(projectIds)`** — queries Stories/Tasks/Bugs with no key or a TRI key, calls `assignTicketKeys`, then DML-updates only those that received a new project-sequence key.

### WorkItemSelector.cls — key-related methods

**File:** `force-app/main/default/classes/workitem/WorkItemSelector.cls`. All methods `with sharing`.

- **`getEpicsWithProjectCode(epicIds)`** — returns Epic records with parent Project's `Project_Code__c` via relationship traversal.
- **`getMaxItemNumberByProject(projectIds)`** — max `Item_Number__c` per project as `Map<Id, Integer>`. Excludes TRI-keyed items via `(Ticket_Key__c < 'TRI-' OR Ticket_Key__c > 'TRI-99999')` — `NOT LIKE` is rejected by the VS Code SOQL parser in aggregate WHERE clauses.
- **`getItemsNeedingKeysByProject(projectIds)`** — returns Story/Task/Bug records with null or TRI key.
- **`getMaxTicketItemNumber(ticketRtId)`** — global max `Item_Number__c` across all Ticket records; returns 0 when none exist.

---

## LWC Components

### workManager

App Page entry point. Four-view state machine: triage, projects, sprints, board. Active view and selected project persisted to `localStorage` under user-scoped keys (`wm_view_{userId}`, `wm_project_{userId}`).

### workItemBoard

Kanban board scoped to one project. `connectedCallback` calls `ensureBacklogSprint` imperatively then `loadItems`. Two tabs: Boards (sprint kanban) and Epics (pinned General + grouped regular Epics). Only the Active sprint shows the full 8-column kanban; every other sprint renders as a flat priority-sorted list with compact cards. Drag/drop encodes `{ itemId, sprintId }`.

### workItemCard

Renders a work item as a full card (kanban) or compact row (backlog/list views), with a coloured priority indicator. When `Ticket_Key__c` is set, a `CODE-NNNNN` or `TRI-NNNNN` label is displayed in both layouts. Fires `open` and `dragstart`.

### workItemCreate

Record-type-aware creation form (@api: type/parentId/sprintId/projectId). Sprint picker, Estimate, Parent picker, User Story, and Acceptance Criteria shown by type. When `type = 'Project'`, a **Project Code** input (3 uppercase letters, required) is shown and sent as `Project_Code__c` in the `createRecord` payload. The Create button is disabled until `getObjectInfo` resolves a valid `recordTypeId`.

### workItemChildren

Record-page sidebar applet listing/managing child work items. Visible when the current record type has children.

### workItemComments

Comment thread applet — add, inline edit, delete, 'Edited' badge when modified >5s after creation.

### workItemParentSelector

Reassign a work item's parent via a combobox of eligible candidates. Saves via LDS `updateRecord`.

### sprintCreate

Manual `Sprint__c` creation form; auto-calculates End Date as Start + 13 days.

---

## Triage Pipeline (BA agent scaffolding)

```
Intake (ticketSubmit) → raw Ticket, Triage_Status__c = 'Not Started'
        ↓
BA agent triage (future) → classifies, drafts User_Story__c/AC/Plan
        ↓
Human review: ticketTriage queue → ticketReview applet
        ↓
   Approve → reclassified to Target_Type__c, lands in Backlog
   Decline → Triage_Notes__c captured, re-triage
```

### ticketSubmit

Lightweight submission form (Title required, Description, Priority). Exposed as utility bar panel and App Page component. Calls `createTicket` imperatively. Publishes on the `TicketTriageChannel` Lightning Message Channel after a successful create so an open Triage queue refreshes immediately.

### ticketTriage

Queue of tickets awaiting review — fourth view in `workManager`. Loads `getTriageQueue()` imperatively (not via @wire) — see Key Design Decisions below. Subscribes to the `TicketTriageChannel` Lightning Message Channel with APPLICATION_SCOPE so a ticket created from the Utility Bar (`ticketSubmit`, a different page region) refreshes the queue immediately. Also wired to `CurrentPageReference`, which re-emits on every navigation event — needed because this app has tab persistence enabled, so navigating to a ticket record page and back does not reliably remount this component. Clicking a card navigates to the ticket record page where `ticketReview` handles approve/decline.

### ticketReview

Record-page sidebar applet, visible only on Ticket records (self-hides via `isTicket` getter). Approve calls `approveTicket` then self-hides. Decline reveals a notes textarea and calls `declineTicket`.

---

## Kanban Stages

| Agent stage       | Column         | Meaning                            |
| ----------------- | -------------- | ---------------------------------- |
| Dev Agent         | To Do          | Ready to pick up                   |
| Dev Agent         | On Hold        | Paused or blocked                  |
| Dev Agent         | In Progress    | Active development                 |
| Code Review Agent | In Code Review | PR open / awaiting review          |
| Human Tester      | Testing        | User acceptance testing            |
| Doc Agent         | Documenting    | Release notes / docs being written |
| Release Agent     | Releasing      | In CI/CD pipeline / deploying      |
| End Bucket        | Done           | Fully complete                     |

---

## Sprint Lifecycle

```
generateSprints() → Backlog + 6 × 2-week Planning sprints
        ↓
closeSprint(id) → marks Completed → activates next → flips Selected items to To Do
               → rolls non-terminal items forward → creates new Planning sprint
```

Terminal statuses (stay on closed sprint): Completed, Cancelled, Done, Fixed, Closed.

---

## Key Design Decisions

**Backlog as a sprint record:** one `Sprint__c` (RecordType Backlog, `Sequence__c` = 9999) absorbs all unassigned items. Detection uses `RecordType.DeveloperName === 'Backlog'`, not `Status__c`.

**getActiveSprints stays cacheable:** `ensureBacklogSprint` runs imperatively from connectedCallback, preserving @wire reactivity.

**getBoardItems is imperative:** the board calls loadItems after every DML for a fresh snapshot.

**Two-query hierarchy scoping** works around SOQL's one-level subquery limit and stops cross-project leakage.

**updateSprint cascades to Chapters** so Story moves bring their chapters along automatically.

**Selection status is destination-derived:** deriveSelectionStatus looks only at where an item lands — the only design that handles every drag combination without special-casing.

**Active-sprint-only kanban:** only the Active sprint gets the full 8-column board; every other sprint renders as a flat list.

**Ticket is a record type, not a separate object:** approval is a single RecordTypeId update. `Triage_Status__c` keeps pipeline stage separate from `Status__c` kanban values.

**Review lives on the record, not in the queue:** ticketTriage only lists and links; all approve/decline logic lives in ticketReview.

**`Target_Type__c` decouples classification from reclassification:** the reviewer sets "what this becomes" as its own auto-saved field before approving; approveTicket refuses (AuraHandledException) if it's blank.

**Sequential per-project keys, independent TRI counter:** Story/Task/Bug receive `CODE-NNNNN` keys counted per project; Tickets receive `TRI-NNNNN` keys from a global counter. The two sequences are fully independent.

**TRI exclusion from project counter via range comparison:** `getMaxItemNumberByProject` uses `(Ticket_Key__c < 'TRI-' OR Ticket_Key__c > 'TRI-99999')` to exclude TRI-keyed items. `NOT LIKE` is rejected by the VS Code SOQL parser in aggregate WHERE clauses. Project codes sorting before `TRI-` (e.g. `ORG`) satisfy `< 'TRI-'`; codes sorting after `TRI-99999` (e.g. `TST`) satisfy `> 'TRI-99999'`.

**Cascade on `Project_Code__c` change:** setting a code on a codeless Project does not fire triggers on existing child Story/Task/Bug records — their parents (Epics) have not changed. `WorkItemTriggerHandler.afterUpdate` detects `Project_Code__c` changes and calls `WorkItemService.cascadeKeysToProjectChildren` to retroactively key any children created before the code was set.

**getTriageQueue is imperative and explicitly not cacheable:** Marking it cacheable=true looks natural for a read-only query, but live testing showed the platform's storable-action cache for cacheable=true Apex methods is served even on imperative calls, not only wired ones — a ticket created or deleted elsewhere kept producing the same stale row count no matter how the reload was triggered. Dropping cacheable=true was the actual fix; the cross-component reload triggers (ticketTriage's TicketTriageChannel subscription and CurrentPageReference wiring) are necessary but not sufficient without it.

**Work Item record page hides irrelevant fields per record type:** `Status__c` is hidden on the Ticket record type page (Tickets track pipeline stage via `Triage_Status__c`, not `Status__c`); `Triage_Status__c` is shown only for Tickets; `Project_Code__c` is shown only for Project records. Implemented via FlexiPage field-instance `visibilityRule`s keyed on `{!Record.RecordType.Name}` rather than maintaining separate page variants.
