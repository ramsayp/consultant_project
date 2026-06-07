---
name: agent-pipeline-architecture
description: Formalised multi-agent SDLC pipeline — BA Agent, Dev Agent, Code Review Agent, Docs Agent, Release Agent — backed by Work_Item__c
metadata:
  type: project
---

The project runs a hierarchical multi-agent SDLC pipeline. `Work_Item__c` is both the project management tool and the human-in-the-loop control interface. `Status__c` and `Triage_Status__c` drive agent routing.

**Why:** Moving from ad-hoc development to a disciplined, disciplined pipeline where each stage has a named agent owner. No more vibe coding — every ticket follows the pipeline.

**How to apply:** At the start of every session, map the user's input to an agent role using the routing rules in [[agents.md]]. Read the linked `Work_Item__c` record via MCP to confirm the current status before acting.

## BA Pipeline

Entry point: Ticket in Triage. Handles idea/bug intake before the main pipeline.

```
Ticket created → Triage_Status__c = Not Started
  → BA Agent (Claude): draft User Story, AC, Plan, set Target_Type__c → Triage_Status__c = Reviewed
  → Human BA Review: Approve → Status__c = To Do (Backlog) | Decline → retrigger BA Agent
Human bypass: human creates a fully-formed ticket straight into Backlog
```

## Main Pipeline

Triggered from Backlog. All work stays in the current sprint on failure.

```
To Do → Dev Agent → In Code Review → Code Review Agent → Testing (human) → Documenting → Docs Agent → Releasing → Release Agent → Done
```

## Agent routing rules

| Status                                         | Agent                |
| ---------------------------------------------- | -------------------- |
| `Triage_Status__c = Not Started` or `Declined` | BA Agent             |
| `Status__c = To Do` (in active sprint)         | Dev Agent            |
| `Status__c = In Code Review`                   | Code Review Agent    |
| `Status__c = Testing`                          | Human — Claude waits |
| `Status__c = Documenting`                      | Docs Agent           |
| `Status__c = Releasing`                        | Release Agent        |

## Spike handling

Dev Agent cannot deliver → `Triage_Status__c = Not Started`, `Status__c = To Do`, reason in `Triage_Notes__c`, human Task created. Item fully re-enters BA pipeline.

## Apex architecture (all new Dev Agent work)

```
Trigger → TriggerHandler → Service → Domain → Selector
```

No business logic in triggers. All classes `with sharing`. Mock at Selector or Service interface in tests.

## Status field reference

- `Triage_Status__c` values: Not Started, Reviewing, Reviewed, Approved, Declined
- `Status__c` pipeline values: To Do, On Hold, In Progress, In Code Review, Testing, Documenting, Releasing, Done
