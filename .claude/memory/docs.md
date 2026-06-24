---
name: docs
description: Documentation conventions and workflow — app docs file split (overview.md vs salesforce.md), backticking __c/__r/__mdt API names in Markdown, and Salesforce as the source of truth for tech/user guides and change logs
metadata:
  type: feedback
---

## App docs file split — overview.md vs salesforce.md

Each app under `.claude/apps/*/` has two files:

- **`overview.md`** — purpose, Lightning App/entry point, component tree, data-model diagram (no field tables), Apex controller, tests, key design decisions. References `salesforce.md` for field detail.
- **`salesforce.md`** — objects, full field tables, record types, picklist stages, computed values.

`overview.md` is @-imported in `CLAUDE.md` and always loaded. `salesforce.md` is a reference doc — not @-imported, pointed to from `overview.md`.

**Why:** `overview.md` grew unwieldy when it held both architecture and schema detail. Splitting keeps each file focused.

**How to apply:** Put field tables in `salesforce.md`, not `overview.md`. When adding a new app, copy from `.claude/apps/_template/` (both files), then add only `overview.md` to `CLAUDE.md` @-imports.

## Wrap `__c`/`__r`/`__mdt` API names in backticks — it's CommonMark, not a Prettier bug

Any Salesforce API name containing a double underscore — custom fields/objects (`Field__c`), relationships (`Object__r`), custom metadata types (`Type__mdt`), platform events (`Event__e`) — must be wrapped in backticks (code spans) whenever it appears in Markdown prose. Never write it bare.

**Why:** In CommonMark, `__text__` is bold emphasis (equivalent to `**text**`). Writing `Title__c required on Change_Log__c` gives the parser two `__` delimiter pairs: it reads `Title` + bold(`c required on Change_Log`) + `c`, and Prettier normalizes the bold delimiter to `**`, producing the mangled `Title**c required on Change_Log**c`. A lone unpaired instance like `Work_Item__c` gets escaped to `Work_Item\_\_c` instead. This is correct, spec-compliant parsing — remark, Prettier, and GitHub's renderer all behave the same way. No Prettier setting fixes it without disabling emphasis-normalization wholesale.

**How to apply:**

- Backticks here are functionally required, not stylistic — they prevent CommonMark parsing `__` as emphasis.
- This applies to _any_ Markdown — memory files, `docs/`, `.claude/*.md` — not just files Prettier touches; GitHub's renderer has the same behaviour.
- After any Markdown edit mentioning Salesforce API names, run an explicit grep self-check (e.g. `grep -n '\*\*c\b'`) before staging anywhere. The rule was once _known_ but not _applied_ while drafting doc bullets — bare `Sprint__c`, `Status__c`, `Triage_Status__c` were mangled to `Sprint**c` etc. on commit and not caught until after the corrupted content had been staged into `Change_Log__c.Staged_Technical_Body__c`. Don't rely on remembering the rule in the moment of writing.

## Salesforce is the source of truth for documentation

Technical guides, user guides, and change-log entries live in Salesforce (`Documentation__c` and `Change_Log__c`). Users may edit them directly in the org, so the repo copy may be stale. Editing the repo copy without pulling from SF first risks overwriting user changes.

**How to apply — before editing any file in `docs/technical/` or `docs/user/`:**

1. Query the corresponding `Documentation__c` record via MCP using its External ID:
   `SELECT Id, Name, Body__c FROM Documentation__c WHERE Claude_Doc_Id__c = 'slug-here'`
2. Compare with the repo file — if SF is newer or different, overwrite the repo file first.
3. Make your edits.
4. Update both: the repo file AND the Salesforce record (`updateSobjectRecord`).
5. Create a `Change_Log__c` record. **`Title__c` is the only required field** (everything else, including `Summary__c`, `Version__c`, `Changed_By__c`, `Change_Date__c`, `Environment__c`, `Status__c`, `Work_Item__c`, and the four Before/After snapshot fields, is nillable). The existing CL-0000 through CL-0004 entries all use just `Title__c` + `Technical_Doc__c` and leave `Work_Item__c` null — match that minimal pattern. **Do not search for a `Work_Item__c` to link** — only set it if the user names one explicitly at the start.

**Size check:** `Body__c` and the `Change_Log__c` rich-text fields are capped at 32,768 chars (see [[salesforce]] for the canonical cap and escaping rules). Before any full-document rewrite, check the candidate HTML length — the repo doc may have outgrown the cap, in which case the SF baseline is a hand-condensed summary to match, not a 1:1 conversion. Don't expand a single-stage request into a full backfill without asking (see [[how_i_work]]).

### Folder ↔ object mapping

| Repo path         | SF object          | SF Record Type |
| ----------------- | ------------------ | -------------- |
| `docs/technical/` | `Documentation__c` | Technical      |
| `docs/user/`      | `Documentation__c` | User           |

### Current docs (`Claude_Doc_Id__c` is an External ID — locate records without hard-coding Salesforce IDs)

| Repo file                                    | `Claude_Doc_Id__c`             | SF Name                                  |
| -------------------------------------------- | ------------------------------ | ---------------------------------------- |
| `docs/technical/project-management-guide.md` | `project-management-technical` | Project Management App — Technical Guide |
| `docs/technical/documentation-guide.md`      | `documentation-technical`      | Documentation App — Technical Guide      |
| `docs/technical/mcp-setup-guide.md`          | `mcp-setup-technical`          | MCP Setup — Technical Guide              |
| `docs/user/documentation-guide.md`           | `documentation-user`           | Documentation App — User Guide           |
| `docs/user/project-management-guide.md`      | `project-management-user`      | Project Management App — User Guide      |
