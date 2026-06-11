# Agents — Pipeline Protocol

## Agent Routing — Session Start Rule

At the start of every session, read the user's input and determine the agent role:

| User input                                                      | Agent role                                | Detail file                                                |
| --------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| Provides a Ticket in Triage (idea / bug needing classification) | **BA Agent**                              | [agents/ba-agent.md](agents/ba-agent.md)                   |
| Provides a Backlog / `To Do` item to build                      | **Dev Agent**                             | [agents/dev-agent.md](agents/dev-agent.md)                 |
| Says code is ready, or item is `In Code Review`                 | **Code Review Agent**                     | [agents/code-review-agent.md](agents/code-review-agent.md) |
| Item is in `Testing` (human phase)                              | Acknowledge and wait — not Claude's stage |                                                            |
| Says testing passed, or item is `Documenting`                   | **Docs Agent**                            | [agents/docs-agent.md](agents/docs-agent.md)               |
| Says docs are done, or item is `Releasing`                      | **Release Agent**                         | [agents/release-agent.md](agents/release-agent.md)         |

**Pre-flight — before any other action:**

1. Query the `Work_Item__c` record via MCP:
   ```
   SELECT Id, Name, Status__c, Triage_Status__c, Sprint__c, Acceptance_Criteria__c, Triage_Notes__c
   FROM Work_Item__c WHERE Id = '<id>'
   ```
2. Use the returned `Status__c` and `Triage_Status__c` as the authoritative current state. Never assume the status matches what the user said or what the routing table above suggests — the user may have already moved the item, or a previous agent may have updated it.
3. Then read the relevant agent detail file and proceed.

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
