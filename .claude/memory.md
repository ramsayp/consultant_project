# Memory — Key Decisions

Decisions made during development that are not obvious from reading the code.

## Architecture

**Backlog as a sprint record** — Rather than a separate backlog concept, one `Sprint__c` record with `Status__c = 'Backlog'` and `Sequence__c = 9999` absorbs all unassigned items. Keeps the data model uniform; avoids nullable-sprint special cases everywhere except the `sprintSections` getter.

**`getActiveSprints` stays cacheable, `ensureBacklogSprint` is imperative** — Calling `ensureBacklogSprint` from `connectedCallback` (imperative) keeps `getActiveSprints` as a cacheable wire. If both were DML methods, the wire would lose reactivity.

**Two-query hierarchy scoping in `getBoardItems`** — SOQL subqueries can only go one level deep. `getBoardItems` collects valid parent IDs in two pre-queries (Epic IDs, then Story/Task/Bug IDs) and uses `IN :validParents` in the main query. Prevents items from other projects leaking onto the board.

**`updateSprint` cascades to Chapter children** — When a Story moves to a new sprint, its Chapter children move with it automatically. Avoids having to drag each chapter separately.

## LWC Testing

**`moduleNameMapper` for `lightning/uiRecordApi`** — `jest.mock('lightning/uiRecordApi', factory)` does not intercept the component's `require` on Windows because the custom `@salesforce/sfdx-lwc-jest` resolver and Jest's mock registry use different key formats. `moduleNameMapper` has higher priority and always works.

**`@salesforce/schema` mock needs `.default`** — The `schemaScopedImport` babel transformer compiles schema imports to `require('...').default`. Without exporting `.default`, `WORK_ITEM_OBJECT` is `undefined`, which silently causes "Creation failed" toast (no throw until the value is accessed inside `handleCreate`).

**`flushAllPromises` uses chained `.then()`** — `setTimeout` is blocked by the `@lwc/lwc/no-async-operation` ESLint rule in LWC files (including test files matched by `**/lwc/**/*.test.js`). Chained `.then()` achieves the same multi-microtask flush without triggering the rule.

**Inline `jest.fn()` in mock factories** — Variable capture (declaring `const mockFn = jest.fn()` before `jest.mock(...)`) produces a different instance in the component vs the test due to Jest hoisting, even with the `mock`-prefixed variable allowance. Always define `jest.fn()` inline in the factory.

## Compact card layout for backlog

The backlog can grow large. Single-line rows (`compact = true`) allow more items to be visible without scrolling. Sprint columns use taller cards for more detail.
