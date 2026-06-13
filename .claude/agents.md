# Agents — Pipeline Protocol

## Agent Routing — Session Start Rule

**Step 1 — Pre-flight query. Do this before reading any further.**

```
SELECT Id, Name, Status__c, Triage_Status__c, Sprint__c, Acceptance_Criteria__c, Triage_Notes__c,
       RecordType.DeveloperName
FROM Work_Item__c WHERE Id = '<id>'
```

**Step 2 — Determine your role from the record state, not the user's message.**

> ⚠️ The user's message is context for your work — it is not the routing trigger. A user describing implementation details, sharing screenshots, or explaining a technical problem does not mean Dev Agent applies. Only the SF record state decides.

**If `RecordType.DeveloperName = 'Ticket'` — route on `Triage_Status__c`:**

| `Triage_Status__c`          | Agent role                                            | Detail file                              |
| --------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| `Not Started` or `Declined` | **BA Agent**                                          | [agents/ba-agent.md](agents/ba-agent.md) |
| `Reviewing` or `Reviewed`   | BA Agent in progress — check Comment\_\_c for context |                                          |
| `Approved`                  | Human moves item to Backlog — not Claude's action     |                                          |

**All other record types — route on `Status__c`:**

| `Status__c`      | Agent role                                | Detail file                                                |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `To Do`          | **Dev Agent**                             | [agents/dev-agent.md](agents/dev-agent.md)                 |
| `In Code Review` | **Code Review Agent**                     | [agents/code-review-agent.md](agents/code-review-agent.md) |
| `Testing`        | Acknowledge and wait — not Claude's stage |                                                            |
| `Documenting`    | **Docs Agent**                            | [agents/docs-agent.md](agents/docs-agent.md)               |
| `Releasing`      | **Release Agent**                         | [agents/release-agent.md](agents/release-agent.md)         |

**Step 3 — Read the agent detail file for the matched role, then proceed.**

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

All pipeline failures: agent sets status + creates a `Comment__c` record describing the failure. Work stays in the current sprint — does not return to Backlog.
