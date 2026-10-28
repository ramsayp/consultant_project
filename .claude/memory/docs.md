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

## Salesforce is the only copy of the technical and user guides

Technical guides, user guides, and change-log entries live **only** in Salesforce (`Documentation__c` and `Change_Log__c`). There are no Markdown copies in the repo — `docs/README.md` is just an index of each guide's `Claude_Doc_Id__c`.

**Why:** The repo used to keep a Markdown copy of every guide plus a drift-check script. Keeping them in sync (Markdown against Quill HTML, users editing in the org) ate whole sessions and still drifted — the User Guide repo copy ended up ~190 words longer than a deliberately trimmed Salesforce edit. Work Item ORG-00011 (2026-10-28) deleted the copies and the script.

**How to apply:**

1. Never recreate Markdown copies of the guides in the repo, and never write a sync or drift check between repo and Salesforce.
2. Query the record via MCP using its External ID:
   `SELECT Id, Name, Body__c FROM Documentation__c WHERE Claude_Doc_Id__c = 'slug-here'`
3. Edit by surgically patching the existing `Body__c` HTML — never regenerate it from Markdown. Assert each find-and-replace matched exactly once. Match Quill serialisation: `<hr></hr>`, `<ol>`/`<ul>` with `<li>`, `<strong>`, `<em>`, `<code>`, `&#39;` for apostrophes, emoji as numeric entities.
4. Create a `Change_Log__c` record. **`Title__c` is the only required field** (everything else, including `Summary__c`, `Version__c`, `Changed_By__c`, `Change_Date__c`, `Environment__c`, `Status__c`, `Work_Item__c`, and the four Before/After snapshot fields, is nillable). The existing CL-0000 through CL-0004 entries all use just `Title__c` + `Technical_Doc__c` and leave `Work_Item__c` null — match that minimal pattern. **Do not search for a `Work_Item__c` to link** — only set it if the user names one explicitly at the start.

**Size check:** `Body__c` and the `Change_Log__c` rich-text fields are capped at 32,768 chars (see [[salesforce]] for the canonical cap and escaping rules). Before any full-document rewrite, check the candidate HTML length. Don't expand a single-stage request into a full backfill without asking (see [[how_i_work]]).

## Writing large document bodies to Salesforce

For a Rich Text Area payload of any real size, write it from a file using `sf data update bulk` rather than pasting the content into a tool call.

**Why:** The agent protocols prescribe generating the value with `node` and passing it through an MCP call. At around twenty thousand characters that is slow and carries transcription risk, since the content has to pass through the response twice. A file-based bulk update removes the risk entirely and was noticeably faster.

**How to apply:**

- Build a comma-separated-values file with `Id` and the target field, wrapping the value in double quotes and doubling any internal double quote.
- Use carriage-return-plus-line-feed line endings — the Bulk Application Programming Interface rejects line-feed-only input with `LineEnding is invalid on user data`. Generate the whole file, Id included, in one `node` step and never edit it afterwards with `sed -i` — in Git Bash it silently rewrites carriage-return-plus-line-feed to line-feed only, and with the console output discarded the failure is invisible until the re-query comes back empty.
- Confirm the body contains no raw line breaks before writing, or the row structure breaks.
- Always re-read the field afterwards and compare it to the intended content. Rich Text Area values can be silently dropped or truncated; see [[salesforce]] for the 32,768 character cap.
- Ignore the bulk command's console output — it is almost entirely progress-spinner redraw noise and can run to tens of kilobytes. Re-querying the field is the verification; the command output is not.

### Expect Salesforce to re-encode apostrophes on save

A byte-for-byte comparison after a Rich Text write will report a mismatch that is **longer** than what was sent, not shorter. Salesforce encodes `'` to `&#39;`, adding four characters per apostrophe.

**Why:** A staged technical body came back 22,594 characters against a 22,586-character source. The instinct is truncation, but truncation makes a value shorter — a longer value means normalisation. The delta was exactly two apostrophes inside a `<code>getCandidateParents('Ticket')</code>` fragment.

**How to apply:** before concluding a write failed, normalise the local copy (`body.replace(/'/g, "&#39;")`) and compare again. Only treat it as a real failure if the value came back **shorter** or still differs after normalising. Either write `&#39;` in generated HTML from the start, or re-sync the local file to the returned value so later comparisons are clean.
