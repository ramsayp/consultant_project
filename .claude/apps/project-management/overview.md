# Project Management App — Overview

## What it does

A Salesforce-native project management tool. Users manage work across projects, epics, sprints, and individual work items (stories, tasks, bugs) via a kanban board with drag-and-drop.

## Entry point

`workManager` — an App Page component. Manages a three-view state machine:

- **Projects** — lists all Project-type work items; clicking one opens the board
- **Sprints** — lists all sprints with status indicators and close controls
- **Board** — the kanban board scoped to the selected project

## Component tree

```
workManager
└── workItemBoard               (kanban board, receives projectId)
    ├── workItemCard            (individual card — full or compact mode)
    └── workItemCreate          (create form — rendered in modal overlay)

workItemChildren                (record page applet — children of current record)
└── workItemCreate              (inline create form)

workItemParentSelector          (record page applet — reassign parent)
workItemComments                (record page applet — comment thread)
sprintCreate                    (standalone sprint creation form)
```

## Data model summary

See `.claude/apps/project-management/salesforce.md` for field-level detail.

```
Project
└── Epic
    └── Story | Task | Bug
        └── Chapter | Step
```

All types share the `Work_Item__c` custom object differentiated by Record Type.
Sprints (`Sprint__c`) are assigned at the Story/Task/Bug level.
One sprint has `Status__c = 'Backlog'` and acts as the permanent backlog container.

## Apex controller

`WorkItemController.cls` — single controller, `with sharing`.
All board data flows through this class. See inline comments and `TECHNICAL.md` for method-level detail.

## Tests

- **LWC Jest**: `workItemCard`, `workItemComments`, `workItemCreate` (39 tests total)
- **Apex**: `WorkItemController_Test.cls` in `classes/workitem/__tests__/`
