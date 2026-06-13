---
name: feedback_mcp_usage
description: MCP runtime behavioral rules — confirmation rules, always prefer MCP over alternatives, and Salesforce API quirks for record creation
metadata:
  type: feedback
---

## Confirmation rules

Read tools always fire without asking — proceed directly: `soqlQuery`, `getObjectSchema`, `getRelatedRecords`, `getUserInfo`, `listRecentSobjectRecords`, `find`.

Write tools (`createSobjectRecord`, `updateSobjectRecord`, `updateRelatedRecord`) warrant narration before firing if the action is not clearly part of the current task.

**Why:** User explicitly stated reads are always allowed. Asking adds unnecessary friction.

## Always prefer MCP over alternatives

MCP is the first and only choice for any Salesforce data read or write. Do not use:

- Anonymous Apex scripts (`sf apex run`) — creates temp files, dirties git status
- PowerShell `Invoke-RestMethod` or `sf api request rest` — unnecessary scaffolding
- `sf data record create` or similar CLI data commands

`createSobjectRecord` handles large string payloads (up to 32,768 chars per field) — no workarounds needed for payload size.

Reserve non-MCP routes only for things MCP genuinely cannot do: governor-limit-sensitive bulk DML across tens of thousands of records, or transactional all-or-nothing semantics across many objects in a single Apex context.

## Record creation patterns

**Record Type — always pre-query for Id.** Relationship notation (`"RecordType": {"DeveloperName": "Update"}`) is rejected by the Salesforce API with "DeveloperName is not an External ID or indexed field for RecordType". Pre-query: `SELECT Id FROM RecordType WHERE SobjectType = '...' AND DeveloperName = '...'` and pass the explicit `RecordTypeId` in the create payload.

**Large Rich Text Area fields — two-step create then update.** The Salesforce API silently drops Rich Text Area content on `createSobjectRecord` when payloads are large — the create returns 201 success with no error, but the field is null on the created record. Fix: create with metadata fields only, then call `updateSobjectRecord` on the new record Id to set the Rich Text Area fields. Long Text Area fields are not affected.
