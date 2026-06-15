---
name: project_architecture_decisions
description: Non-obvious architecture and UI decisions for ConsultantProject — the why behind code that would otherwise look like a strange choice
metadata:
  type: project
---

## Backlog as a sprint record

Rather than a separate backlog concept, one `Sprint__c` record with `Status__c = 'Backlog'` and `Sequence__c = 9999` absorbs all unassigned items. Keeps the data model uniform; avoids nullable-sprint special cases everywhere except the `sprintSections` getter. The Backlog sprint is identified by `RecordType.DeveloperName === 'Backlog'`, not by `Status__c`.

## `getActiveSprints` stays cacheable, `ensureBacklogSprint` is imperative

Calling `ensureBacklogSprint` from `connectedCallback` (imperative) keeps `getActiveSprints` as a cacheable wire. If both were DML methods, the wire would lose reactivity.

## Two-query hierarchy scoping in `getBoardItems`

SOQL subqueries can only go one level deep. `getBoardItems` collects valid parent IDs in two pre-queries (Epic IDs, then Story/Task/Bug IDs) and uses `IN :validParents` in the main query. Prevents items from other projects leaking onto the board.

## `updateSprint` cascades to Chapter children

When a Story moves to a new sprint, its Chapter children move with it automatically. Avoids having to drag each chapter separately.

## Compact card layout for backlog

The backlog can grow large. Single-line rows (`compact = true`) allow more items to be visible without scrolling. Sprint columns use taller cards for more detail.
