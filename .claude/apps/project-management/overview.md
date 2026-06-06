# Project Management App — Overview

## What it does

A Salesforce-native project management tool. Users manage work across projects, epics, sprints, and individual work items (stories, tasks, bugs) via a kanban board with drag-and-drop, a backlog list view, and a BA agent ticket triage pipeline for raw intake.

## Entry point

`workManager` — an App Page component. Manages a four-view state machine:

- **Projects** — lists all Project-type work items; clicking one opens the board
- **Sprints** — lists all sprints with status indicators and close controls
- **Triage** — queue of raw `Ticket` intake awaiting BA agent / human review (see [Triage pipeline](#triage-pipeline))
- **Board** — the kanban board scoped to the selected project

## Component tree

```
workManager
├── workItemBoard               (kanban board, receives projectId)
│   ├── workItemCard            (individual card — full or compact mode)
│   └── workItemCreate          (create form — rendered in modal overlay)
└── ticketTriage                (triage queue — fourth view)

workItemChildren                (record page applet — children of current record)
└── workItemCreate              (inline create form)

workItemParentSelector          (record page applet — reassign parent)
workItemComments                (record page applet — comment thread)
sprintCreate                    (standalone sprint creation form)
ticketSubmit                    (utility bar panel — ticket intake)
ticketReview                    (record page applet — Ticket approve/decline)
```

## Data model summary

See `.claude/apps/project-management/salesforce.md` for field-level detail.

```
Project
└── Epic
    └── Story | Task | Bug
        └── Chapter | Step

Ticket   (raw intake — outside the hierarchy, reclassified to Story/Task/Bug on approval)
```

All types share the `Work_Item__c` custom object differentiated by Record Type.
Sprints (`Sprint__c`) are assigned at the Story/Task/Bug level.
`Sprint__c` has two record types — `Sprint` (regular iteration) and `Backlog` (permanent catch-all,
`Sequence__c = 9999`). The Backlog sprint is identified by `RecordType.DeveloperName === 'Backlog'`,
not by `Status__c`.

## Triage pipeline

Scaffolding for an upcoming BA (Business Analyst) agent that classifies raw `Ticket` intake before
it reaches the team backlog: `ticketSubmit` (intake) → BA agent triage (future) → `ticketTriage`
(human review queue) → `ticketReview` (approve reclassifies to `Target_Type__c`; decline captures
`Triage_Notes__c` for re-triage). See `docs/technical/project-management-guide.md` for the full
workflow and field-level detail.

## Apex controller

`WorkItemController.cls` — single controller, `with sharing`.
All board data flows through this class. See inline comments and `docs/technical/project-management-guide.md` for method-level detail.

## Tests

- **LWC Jest**: `workItemCard`, `workItemComments`, `workItemCreate` (39 tests total)
- **Apex**: `WorkItemController_Test.cls` in `classes/workitem/__tests__/`
