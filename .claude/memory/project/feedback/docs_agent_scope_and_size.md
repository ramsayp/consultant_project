---
name: docs_agent_scope_and_size
description: "Docs Agent pipeline: check RTA size before full-doc rewrites, and don't expand scope beyond the requested pipeline stage without asking"
metadata:
  type: feedback
---

**Rule 1 — Check size before attempting a full-document rewrite.** `Documentation__c.Body__c` and `Change_Log__c.Staged_Technical_Body__c` are Rich Text Area fields capped at 32,768 chars. Before converting an entire repo doc file to HTML for one of these fields, check the candidate HTML length first. If the repo `.md` file is already tens of thousands of characters, a literal table-by-table conversion will likely blow the cap — the existing SF baseline is usually a hand-condensed prose summary, not a 1:1 markdown-table translation, and should be treated as the format to match, not the repo file's literal structure.

**Why:** Spent significant session time generating a 61K-char HTML conversion of a 56K-char repo file before realizing the field cap is 32,768 — the size mismatch should have been the first thing checked, not discovered after full conversion.

**Rule 2 — Don't expand scope beyond the requested pipeline stage without asking.** A request like "go straight to code review" or "doc agent go" means: do that one pipeline stage. If a real inconsistency is found mid-stage (e.g. SF doc out of sync with repo), investigate and report it, but don't unilaterally decide to do a full reconciliation/backfill — ask first, as [[routing_from_record_state]] already establishes for _which_ agent role applies; this extends the same discipline to _scope within_ a role.

**How to apply:** When the Docs Agent (or any pipeline stage) surfaces a side issue (doc drift, stale data, missing dependency), stop and flag it with options rather than silently expanding the task. Reserve full backfills for when the user explicitly asks for one.

See also [[large_rta_payload_escaping]] for the mechanical fallout of attempting an oversized payload anyway.
