# Work Management — Salesforce Context

## Objects

### `Work_Item__c`

Self-referential hierarchy via `Parent_Work_Item__c` (lookup to self).

| Field                    | Type                 | Notes                                                   |
| ------------------------ | -------------------- | ------------------------------------------------------- |
| `Name`                   | Text                 | Title                                                   |
| `RecordTypeId`           | Record Type          | Determines item type                                    |
| `Status__c`              | Picklist             | Workflow stage                                          |
| `Priority__c`            | Picklist             | Critical / High / Medium / Low                          |
| `Estimate__c`            | Number               | Story points                                            |
| `Sequence__c`            | Number               | Manual column order (1-based, set by `updateSequences`) |
| `Sprint__c`              | Lookup → Sprint\_\_c | Null = backlog                                          |
| `Parent_Work_Item__c`    | Lookup → self        | Parent in hierarchy                                     |
| `Assignee__c`            | Lookup → User        |                                                         |
| `Work_Mode__c`           | Picklist             | Iterative / Continuous / Reactive                       |
| `Description__c`         | Long Text            |                                                         |
| `User_Story__c`          | Long Text            | Story type only                                         |
| `Acceptance_Criteria__c` | Long Text            | Story/Task/Bug                                          |

### `Sprint__c`

| Field           | Type     | Notes                                   |
| --------------- | -------- | --------------------------------------- |
| `Name`          | Text     | e.g. "Sprint 3"                         |
| `Status__c`     | Picklist | Backlog / Planning / Active / Completed |
| `Start_Date__c` | Date     |                                         |
| `End_Date__c`   | Date     |                                         |
| `Sequence__c`   | Number   | Sort order; Backlog = 9999              |

### `Comment__c`

| Field          | Type                    | Notes                        |
| -------------- | ----------------------- | ---------------------------- |
| `Work_Item__c` | Lookup → Work_Item\_\_c |                              |
| `Body__c`      | Long Text               |                              |
| `RecordTypeId` | Record Type             | Must be 'Work Item Comments' |

## Record Types (Work_Item\_\_c)

| Type    | Default Status | Kanban columns                                       |
| ------- | -------------- | ---------------------------------------------------- |
| Project | Active         | Active / On Hold / Completed / Cancelled             |
| Epic    | Not Started    | Draft / Active / In Progress / Completed / Cancelled |
| Story   | Not Started    | 10-stage (see below)                                 |
| Task    | Not Started    | Backlog / In Progress / Blocked / Done               |
| Bug     | Not Started    | Open / Triaged / In Progress / Fixed / Closed        |
| Chapter | Not Started    | To Do / In Progress / Done                           |
| Step    | Not Started    | To Do / In Progress / Done                           |

## 10-stage kanban (Story/Task/Bug on sprint board)

Not Started → To Do → In Progress → Blocked → Code Review → UAT → Pipeline → Released → Documented → Done

Legacy status values are mapped to the nearest current stage in `STATUS_TO_STAGE` in `workItemBoard.js`.

## Work_Mode\_\_c stamp (set on create)

| Type                  | Value      |
| --------------------- | ---------- |
| Story / Chapter       | Iterative  |
| Task                  | Continuous |
| Bug                   | Reactive   |
| Project / Epic / Step | (blank)    |
