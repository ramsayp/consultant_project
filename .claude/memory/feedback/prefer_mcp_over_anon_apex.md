---
name: prefer_mcp_over_anon_apex
description: use MCP soqlQuery + updateSobjectRecord for one-time data migrations/corrections instead of writing and running anonymous Apex scripts
metadata:
  node_type: memory
  type: feedback
  originSessionId: 33fa905e-617f-4d98-94bb-b78abc3db522
---

# Prefer MCP tools over anonymous Apex for data fixes — never create script files for one-off migrations

**Rule:** When a one-time data correction/migration is needed (read records, apply conditional logic, write updates), do it with `mcp__salesforce-sobject-all__soqlQuery` (including relationship-traversal queries like `Sprint__c.RecordType.DeveloperName`, `Sprint__c.Status__c`) to read, and `updateSobjectRecord` per record to write. Do **not** write an `.apex` file and run it with `sf apex run --file ...`.

**Why:** During the sprint-board rework I wrote `scripts/apex/migrate-selection-status.apex`, deployed it via `sf apex run`, then deleted the file and the now-empty `scripts/` folder afterward. The user's reaction: "why use that when we have the MCP... this just gave us a temp file for no reason." Correct — the exact same logic (query Work_Item**c joined to Sprint**c, branch on RecordType/Status, conditionally update Status\_\_c, skip terminal statuses) maps directly onto `soqlQuery` + `updateSobjectRecord`. The anonymous-Apex route required creating a file, deploying code to the org, running it, and cleaning up — pure overhead with a worse trail (temp files touching git status) for no capability gain.

**How to apply:**

- Default to MCP read/write tools for _any_ one-off data correction — querying, branching in your own reasoning (or simple per-record loops across tool calls), and writing back.
- Reserve anonymous Apex for things MCP genuinely can't do — e.g. operations requiring Apex-only context (governor-limit-sensitive bulk DML across tens of thousands of records, `Schema` reflection that MCP doesn't expose, transactional all-or-nothing semantics across many objects). A handful-to-low-hundreds of records with simple conditional field updates is squarely in MCP's lane.
- This keeps the working tree clean — no `scripts/` folders, no `.apex` files appearing in `git status` mid-task, nothing to remember to delete.

See also [[trust_your_own_edits]] and [[project_sf_source_of_truth]] — same theme: prefer the direct tool path over building scaffolding around the actual operation.
