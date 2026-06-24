---
name: project
description: ConsultantProject-specific knowledge — non-obvious architecture decisions, the multi-agent SDLC pipeline (routing lives in agents.md), the object-to-permission-set mapping, and the historical BA-agent triage scaffolding design
metadata:
  type: project
---

## Architecture decisions (the why behind code that looks odd)

**Backlog as a sprint record.** Rather than a separate backlog concept, one `Sprint__c` record with `Sequence__c = 9999` absorbs all unassigned items. Keeps the data model uniform and avoids nullable-sprint special cases everywhere except the `sprintSections` getter. The Backlog sprint is identified by `RecordType.DeveloperName === 'Backlog'`, not by `Status__c`.

**`getActiveSprints` stays cacheable, `ensureBacklogSprint` is imperative.** Calling `ensureBacklogSprint` from `connectedCallback` (imperative) keeps `getActiveSprints` as a cacheable wire. If both were DML methods, the wire would lose reactivity.

**Two-query hierarchy scoping in `getBoardItems`.** SOQL subqueries can only go one level deep. `getBoardItems` collects valid parent Ids in two pre-queries (Epic Ids, then Story/Task/Bug Ids) and uses `IN :validParents` in the main query, preventing items from other projects leaking onto the board.

**`updateSprint` cascades to Chapter children.** When a Story moves to a new sprint, its Chapter children move with it automatically — no dragging each chapter separately.

**Compact card layout for backlog.** The backlog can grow large; single-line rows (`compact = true`) fit more items on screen. Sprint columns use taller cards for more detail.

## Multi-agent SDLC pipeline

`Work_Item__c` is both the project-management tool and the human-in-the-loop control interface. `Status__c` and `Triage_Status__c` drive agent routing. The goal is a disciplined pipeline where each stage has a named agent owner.

**The authoritative routing tables live in `agents.md` (always loaded).** Do not duplicate them here — route per [[how_i_work]] (from record state, not the user's message).

```
[BA Pipeline]   Ticket created → Triage_Status__c = Not Started
  → BA Agent: draft User Story, Acceptance Criteria, Plan, set Target_Type__c → Triage_Status__c = Reviewed
  → Human review: Approve → To Do (Backlog) | Decline → re-trigger BA Agent
  Human bypass: human creates a fully-formed ticket straight into Backlog

[Main Pipeline] To Do → Dev Agent → In Code Review → Code Review Agent
  → Testing (human) → Documenting → Docs Agent → Releasing → Release Agent → Done
```

What `agents.md` does not cover, kept here:

- **Spike handling.** Dev Agent cannot deliver → `Triage_Status__c = Not Started`, `Status__c = To Do`, reason in `Triage_Notes__c`, human Task created. The item fully re-enters the BA pipeline.
- **Apex layering (all new Dev Agent work).** `Trigger → TriggerHandler → Service → Domain → Selector`. No business logic in triggers. All classes `with sharing`. Mock at the Selector or Service interface in tests.
- **Release Agent — no Change Log.** If the Docs Agent determined no documentation update was required and created no `Change_Log__c`, the Release Agent skips the query/publish/close-out steps entirely. Note the skip in the release Comment.
- **Status value reference.** `Triage_Status__c`: Not Started, Reviewing, Reviewed, Approved, Declined. `Status__c`: To Do, On Hold, In Progress, In Code Review, Testing, Documenting, Releasing, Done.

## Object → permission set mapping

Field access in this org is controlled via permission sets (not profiles). Every new custom field must be added to the relevant permission set before the feature is done — Salesforce defaults new fields to no access, so users get a blank record page until `fieldPermissions` are deployed.

| Object             | Permission Set File                        |
| ------------------ | ------------------------------------------ |
| `Work_Item__c`     | `ProjectManagement.permissionset-meta.xml` |
| `Sprint__c`        | `ProjectManagement.permissionset-meta.xml` |
| `Comment__c`       | `ProjectManagement.permissionset-meta.xml` |
| `Documentation__c` | `Documentation.permissionset-meta.xml`     |
| `Change_Log__c`    | `Documentation.permissionset-meta.xml`     |
| `Folder__c`        | `Documentation.permissionset-meta.xml`     |

**How to apply:**

- `editable: true` for user-editable fields; `editable: false` for system-assigned read-only fields (auto-generated keys, item numbers).
- Required fields (`<required>true</required>`) must NOT appear in permission sets — the deploy is rejected (see [[salesforce]]).
- Deploy the permission set in the same run as the fields, or immediately after.
- Files live at `force-app/main/default/permissionsets/`. Entries must be in alphabetical order by field API name within each object grouping.

## BA agent triage design (historical scaffolding detail)

> Captured 2026-06-06 when agent-building was being planned. Superseded for pipeline architecture by the section above and `agents.md`; retained for the component-level scaffolding decisions.

The first planned agent was a **BA (Business Analyst) agent** triaging incoming tickets (ideas/bugs/tasks) before the backlog: it classifies as Story/Task/Bug, writes a User Story (Stories only — the user explicitly decided NOT to extend `User_Story__c` to Task/Bug), writes `Acceptance_Criteria__c`, and drafts a plan (heavier for Stories, lighter for Bugs); human Approve moves it to the Backlog `Sprint__c`, Decline sends it back with reviewer notes for re-triage.

**Build decisions made:**

- A **"Ticket"** record type on `Work_Item__c` for raw unclassified intake (not a reused record type with a flag, not a separate object).
- A **"Triage" view inside `workManager`** alongside Projects/Sprints/Board — a queue showing BA suggestions with approve/decline.
- **Custom Apex + LWC** for approval, not native Salesforce Approval Processes — matches the existing `WorkItemController` pattern; the decline → notes → re-review loop doesn't map onto declarative approval processes.
