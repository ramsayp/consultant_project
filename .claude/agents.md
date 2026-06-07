# Agents — Pipeline Protocol

## Agent Routing — Session Start Rule

At the start of every session, read the user's input and determine the agent role:

| User input                                                      | Agent role                                |
| --------------------------------------------------------------- | ----------------------------------------- |
| Provides a Ticket in Triage (idea / bug needing classification) | **BA Agent**                              |
| Provides a Backlog / `To Do` item to build                      | **Dev Agent**                             |
| Says code is ready, or item is `In Code Review`                 | **Code Review Agent**                     |
| Item is in `Testing` (human phase)                              | Acknowledge and wait — not Claude's stage |
| Says testing passed, or item is `Documenting`                   | **Docs Agent**                            |
| Says docs are done, or item is `Releasing`                      | **Release Agent**                         |

Always read the linked `Work_Item__c` record via MCP before acting. `Status__c` and `Triage_Status__c` are authoritative.

---

## Pipeline Overview

```
Ticket (Idea / Bug)
  ↓
[BA Pipeline]
  Triage → BA Agent → BA Review (human) → Backlog
  Human bypass: human creates a fully-formed ticket and places it directly in Backlog

[Main Pipeline]
  To Do → Dev Agent → Code Review Agent → Human Tester → Docs Agent → Release Agent → Done
```

All pipeline failures: agent sets status + creates a human `Task` work item describing the failure. Work stays in the current sprint — does not return to Backlog.

---

## BA Agent

**Trigger:** `Triage_Status__c = Not Started` or `Declined`

**Inputs:** `Work_Item__c` (Ticket record type) — read via MCP

**Responsibilities:**

1. Set `Triage_Status__c = Reviewing`
2. Analyse the raw ticket description
3. Draft: User Story (`User_Story__c`), Acceptance Criteria (`Acceptance_Criteria__c`), delivery plan (`Plan__c`)
4. Set `Target_Type__c` (Story / Task / Bug)
5. Set `Triage_Status__c = Reviewed`
6. Create a human `Task` work item: "BA Review — [ticket name]" for human to approve or decline

**Human review outcome:**

- Approve → human sets `Triage_Status__c = Approved`, moves item to Backlog (`Status__c = To Do`)
- Decline → human adds notes, sets `Triage_Status__c = Declined`, retriggers BA Agent

**Failure:** Cannot classify → set `Triage_Status__c = Reviewed`, add reason to `Triage_Notes__c`, create human Task

---

## Dev Agent

**Trigger:** Item in Backlog / `Status__c = To Do` assigned to the active sprint

**Sprint gate:** Ticket NOT in active sprint → set `Status__c = On Hold`, create human Task: "Sprint gate: [ticket] not in active sprint — assign to current sprint and retrigger Dev Agent". Stop.

**Spike gate:** Cannot deliver (unknown complexity / missing requirements) → set `Triage_Status__c = Not Started`, `Status__c = To Do`, record reason in `Triage_Notes__c`, create human Task: "Spike: [ticket] returned to BA pipeline — [reason]". Stop.

**Inputs:** `Work_Item__c` record, linked codebase

**Responsibilities:**

1. Set `Status__c = In Progress`
2. Create feature branch off `main`: `feature/<ticket-name-slug>`
3. Build the feature — follow layered Apex architecture (see [standards.md](standards.md)) and LWC conventions
4. Write tests (Apex unit tests + LWC Jest); all tests must pass
5. Push to org: `sf project deploy start --ignore-conflicts`
6. Commit to feature branch, push to remote
7. Set `Status__c = In Code Review`

**Failure:** Set `Status__c = On Hold`, create human Task describing the failure

---

## Code Review Agent

**Trigger:** `Status__c = In Code Review`

**Inputs:** Feature branch diff vs `main`; `Work_Item__c` record

**Responsibilities:**

- Review for: standards compliance, security (SOQL injection, sharing enforcement, XSS), test coverage, functionality vs acceptance criteria
- **Pass:** Set `Status__c = Testing`; create human Task: "Human Testing — [ticket]"
- **Fail:** Add review notes to `Triage_Notes__c`; set `Status__c = On Hold`; create human Task: "Code review failed — [ticket]: [summary]"

---

## Human Tester

Human stage — Claude is not invoked.

Human sets `Status__c = Documenting` on approval, or `Status__c = On Hold` + notes if issues found.

---

## Docs Agent

**Trigger:** `Status__c = Documenting`

**Inputs:** `Work_Item__c` record; feature branch code; `Documentation__c` records (SF is source of truth — pull before editing)

**Responsibilities:**

1. Query relevant `Documentation__c` via MCP using `Claude_Doc_Id__c`
2. If SF is newer than repo copy, overwrite repo file first
3. Update Technical doc `Body__c` in SF via `updateSobjectRecord`; sync repo file to match
4. Update User doc if affected
5. Create `Change_Log__c` — `Title__c` required; link to Technical doc; `Work_Item__c` optional
6. Push Change Log as unpublished — human publishes
7. Update Claude memory files if any architecture decisions changed
8. Set `Status__c = Releasing`

**Failure:** Set `Status__c = On Hold`, create human Task

---

## Release Agent

**Trigger:** `Status__c = Releasing`

**Inputs:** Feature branch; `Work_Item__c` record; `Change_Log__c` record

**Responsibilities:**

1. Merge feature branch to `main`
2. Verify `git status` is clean
3. Publish `Change_Log__c` and any draft `Documentation__c` records
4. Update as-is architecture doc if applicable
5. Set `Status__c = Done`
6. Report: committed to GitHub ✅ | branch clean ✅ | docs published ✅

**Failure:** Set `Status__c = On Hold`, create human Task describing the merge/publish failure
