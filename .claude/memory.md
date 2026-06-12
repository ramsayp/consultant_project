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

## Documentation — source of truth

Salesforce is the source of truth for `docs/technical/` and `docs/user/`. Users may edit `Body__c` directly in the org; the repo copy may lag. Before editing any file in those folders:

1. Query the `Documentation__c` record via MCP using `Claude_Doc_Id__c`:
   `SELECT Id, Name, Body__c FROM Documentation__c WHERE Claude_Doc_Id__c = 'slug-here'`
2. If SF is newer, overwrite the repo file first
3. Make edits
4. Update both the repo file and the SF record (`updateSobjectRecord`)

`Claude_Doc_Id__c` is an External ID field on `Documentation__c` — use it to locate records without hard-coding Salesforce IDs.

| Repo file                                    | `Claude_Doc_Id__c`             | SF Name                                  |
| -------------------------------------------- | ------------------------------ | ---------------------------------------- |
| `docs/technical/project-management-guide.md` | `project-management-technical` | Project Management App — Technical Guide |
| `docs/technical/documentation-guide.md`      | `documentation-technical`      | Documentation App — Technical Guide      |
| `docs/technical/mcp-setup-guide.md`          | `mcp-setup-technical`          | MCP Setup — Technical Guide              |
| `docs/user/documentation-guide.md`           | `documentation-user`           | Documentation App — User Guide           |
| `docs/user/project-management-guide.md`      | `project-management-user`      | Project Management App — User Guide      |

## Salesforce Formula Rules

**RTA field blank check** — `ISBLANK()` and `ISNULL()` do not work on Rich Text Area (HTML) fields in Salesforce validation rules or formula fields. `ISBLANK` always returns `false` for RTA fields regardless of content. Use `LEN(fieldName) > 0` instead.

## Workflow

**After every `git commit`**, report outcome explicitly:

- ✅ Committed to GitHub
- ✅ Branch is up to date with `origin/main` (or flag if ahead/behind)
- ✅ Pushed to Salesforce — when MCP write operations were also performed in the same task
