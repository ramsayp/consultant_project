---
name: markdown_double_underscore_api_names
description: "always wrap Salesforce API names containing __ (Field__c, Object__r, Type__mdt) in backticks in Markdown — CommonMark parses double-underscore as bold/emphasis and Prettier will mangle unwrapped text"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 33fa905e-617f-4d98-94bb-b78abc3db522
---

# Wrap `__c`/`__r`/`__mdt` API names in backticks — it's CommonMark, not a Prettier bug

**Rule:** Any Salesforce API name containing a double underscore — custom fields/objects (`Field__c`), relationships (`Object__r`), custom metadata types (`Type__mdt`), custom labels (`Label__c`) — must be wrapped in backticks (code spans) whenever it appears in Markdown prose. Never write it bare.

**Why:** In CommonMark, `__text__` is bold emphasis (equivalent to `**text**`). Writing `Title__c required on Change_Log__c` gives the parser _two_ `__` delimiter pairs: it reads `Title` + bold(`c required on Change_Log`) + `c`, and Prettier normalizes the bold delimiter style to `**`, producing the mangled `Title**c required on Change_Log**c`. A lone unpaired instance like `Work_Item__c` gets escaped instead, to `Work_Item\_\_c`, so it can't later combine with something else into accidental emphasis. **This is correct, spec-compliant Markdown parsing — any CommonMark-compliant formatter (remark, Prettier, GitHub's renderer) behaves the same way.** There's no Prettier setting that fixes it without disabling emphasis-normalization (or Markdown formatting) wholesale, which would cost far more than it saves.

This surfaced when writing memory files (`MEMORY.md`, `sf_source_of_truth.md`, `prefer_mcp_over_anon_apex.md`) that mentioned `Title__c`, `Change_Log__c`, `Work_Item__c`, `Documentation__c` in plain prose — Prettier's pre-commit pass silently rewrote them mid-commit.

**How to apply:**

- Backticks aren't just stylistic here — they're functionally required to prevent CommonMark from parsing `__` as emphasis. `Title__c` and `Change_Log__c` parse as plain code spans; bare `Title__c` and `Change_Log__c` in the same sentence do not.
- This applies to _any_ Markdown you write — memory files, `docs/`, `.claude/*.md` — not just files Prettier touches. GitHub's own renderer has the same CommonMark behavior, so an unwrapped `Field__c` next to another `__`-containing identifier can render as bold/garbled even before Prettier ever runs.
- After any Markdown edit mentioning Salesforce API names, a quick self-check: did I wrap every `__c`/`__r`/`__mdt`/`__e` identifier in backticks? If yes, Prettier (and GitHub) will leave it untouched.

See also [[trust_your_own_edits]] — same session, same theme: understand _why_ something happened before reaching for a tool-config fix.

**Recurrence (2026-06-23):** This rule was _known_ but not _actively applied_ while drafting new Key Design Decision bullets for `docs/technical/project-management-guide.md` — wrote bare `Sprint__c`, `Status__c`, `Triage_Status__c` in bold lead-ins, which Prettier mangled into `Sprint**c` etc. on commit. Wasn't caught until a late pre-publish verification pass, after the corrupted content had already been staged into `Change_Log__c.Staged_Technical_Body__c`. **Add an explicit grep self-check** (`grep -n '\*\*c\b'` or similar) immediately after writing/editing any doc content with Salesforce field names, before staging it anywhere — don't rely on remembering the rule in the moment of writing.
