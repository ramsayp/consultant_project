---
name: prefer_mcp_over_anon_apex
description: use MCP soqlQuery/createSobjectRecord/updateSobjectRecord for ALL Salesforce data operations — not just over Apex scripts, but also over PowerShell REST API calls and sf CLI data commands
metadata:
  node_type: memory
  type: feedback
  originSessionId: 33fa905e-617f-4d98-94bb-b78abc3db522
---

# Prefer MCP tools for ALL Salesforce data operations — no Apex scripts, no PowerShell REST API, no sf CLI workarounds

**Rule:** MCP (`soqlQuery`, `createSobjectRecord`, `updateSobjectRecord`, etc.) is the first and only choice for any Salesforce data read or write. Do **not** reach for anonymous Apex scripts, PowerShell `Invoke-RestMethod`, `sf api request rest`, `sf data record create`, or any other workaround when MCP can do the job.

**Why (Apex):** During the sprint-board rework I wrote `scripts/apex/migrate-selection-status.apex` and ran it via `sf apex run`. User: "why use that when we have the MCP... this just gave us a temp file for no reason." The anonymous-Apex route required creating a file, deploying to the org, running, and cleaning up — pure overhead with a dirty `git status`.

**Why (REST API / PowerShell):** During the Change Log creation for the Triage nav task, I spent many cycles trying to build a PowerShell script that would construct the full staged HTML bodies, write them to a temp file, and `POST` to `/services/data/v66.0/sobjects/Change_Log__c` via `sf api request rest` or `Invoke-RestMethod`. User: "stop, why are you using REST API, we have the MCP." `createSobjectRecord` accepts arbitrary-length string values in its `body` JSON object — there is no size concern that would justify bypassing it.

**How to apply:**

- Default to MCP for **any** Salesforce data operation — reads, creates, updates, one-off corrections, agent workflow writes.
- `createSobjectRecord` can take large string payloads (up to 32,768 chars per field). Pass full HTML bodies directly as JSON string values — no temp files, no REST scaffolding needed.
- Reserve non-MCP routes only for things MCP genuinely can't do: governor-limit-sensitive bulk DML across tens of thousands of records, or transactional all-or-nothing semantics across many objects in a single Apex context.

See also [[trust_your_own_edits]] and [[project_sf_source_of_truth]] — same theme: prefer the direct tool path over building scaffolding around the actual operation.
