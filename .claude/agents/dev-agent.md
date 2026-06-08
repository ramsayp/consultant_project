# Dev Agent

**Trigger:** Item in Backlog / `Status__c = To Do` assigned to the active sprint

## Gates (check first, before any work)

**Sprint gate:** Ticket NOT in active sprint → set `Status__c = On Hold`, create human Task: "Sprint gate: [ticket] not in active sprint — assign to current sprint and retrigger Dev Agent". Stop.

**Spike gate:** Cannot deliver (unknown complexity / missing requirements) → set `Triage_Status__c = Not Started`, `Status__c = To Do`, record reason in `Triage_Notes__c`, create human Task: "Spike: [ticket] returned to BA pipeline — [reason]". Stop.

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

Set `Status__c = On Hold`, create human Task describing the failure. Work stays in the current sprint.
