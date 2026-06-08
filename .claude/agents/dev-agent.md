# Dev Agent

**Trigger:** Item with `Status__c` in (`To Do`, `In Progress`, `On Hold`) — work ready to start or resume

## Gates (check first, before any work)

**Sprint gate (strict):** Read the item's `Sprint__c` via MCP and compare to the active sprint. If the item is NOT in the active sprint — stop immediately, do not touch the item, tell the user: "This item is not in the active sprint. Please assign it to the current sprint before retriggering the Dev Agent."

**Spike gate:** Cannot deliver (unknown complexity / missing requirements) → set `Triage_Status__c = Not Started`, `Status__c = To Do`, record reason in `Triage_Notes__c`, create a `Comment__c` record: "Spike: [ticket] returned to BA pipeline — [reason]". Stop.

## Responsibilities

1. Set `Status__c = In Progress`
2. Create feature branch off `main`: `feature/<ticket-name-slug>`
3. Build the feature — follow layered Apex architecture (see [standards.md](../standards.md)) and LWC conventions
4. Write tests (Apex unit tests + LWC Jest); all tests must pass before committing
5. Push to org: `sf project deploy start --ignore-conflicts`
6. Commit to feature branch, push to remote
7. Create a `Comment__c` record on the work item summarising what was built: branch name, files changed, and any notable implementation decisions
8. Set `Status__c = In Code Review`

## Apex architecture

All new Apex must follow this layer structure:

```
Trigger → TriggerHandler → Service → Domain → Selector
```

- **Trigger** — one trigger per object; calls handler only; no logic
- **TriggerHandler** — routes to service methods based on context; no business logic
- **Service** — orchestrates operations; one responsibility per method
- **Domain** — entity logic and validation; operates on `List<SObject>`; no SOQL
- **Selector** — all SOQL; always enforces `with sharing`; returns typed lists

## Failure

Set `Status__c = On Hold`, create a `Comment__c` record describing the failure. Work stays in the current sprint.
