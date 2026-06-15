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

## Apex classes for custom MCP servers must be fully global

`@InvocableMethod` classes appear in Flow Builder with `public` access, but the Salesforce API Catalog (which powers the MCP server Add Tools dialog) requires `global` everywhere — outer class, inner Input/Output classes, and the execute method. Anything less and the class will never appear in the Add Tools picker. The correct pattern (confirmed against the Salesforce reference implementation `headless-apex-mcp-tool`):

```apex
global with sharing class ProjectMCPXxx {
  global class Input { ... }
  global class Output { ... }

  @InvocableMethod(label='...' description='...')
  global static List<Output> execute(List<Input> inputs) { ... }
}
```

**Why:** API Catalog indexes across namespace boundaries; `public` is not visible at that scope. Inner classes and the method must also be `global` for the schema to be generated and surfaced.

## MCP connection stability

**Set `tengu_mcp_retry_failed_remote: true` in `~/.claude.json`.** The default is `false`, which causes Claude Code to silently drop the MCP server connection after any failure and never retry. Custom Salesforce MCP servers (`/custom/` endpoint) close the HTTP connection more aggressively than hosted servers (`/hosted/`). With retry disabled, every drop requires a manual ToolSearch to trigger reconnection, and after a restart the `authenticate` tool may never appear.

**Why:** Changing to `true` causes Claude Code to automatically re-establish the connection, making the server stable across multiple sequential calls and across VS Code restarts without manual re-auth.

**How to apply:** If MCP tools keep disappearing mid-session or the `authenticate` tool doesn't appear after restart, check this setting first. It's a global setting in `~/.claude.json` — only needs to be set once.

## Record creation patterns

**Record Type — always pre-query for Id.** Relationship notation (`"RecordType": {"DeveloperName": "Update"}`) is rejected by the Salesforce API with "DeveloperName is not an External ID or indexed field for RecordType". Pre-query: `SELECT Id FROM RecordType WHERE SobjectType = '...' AND DeveloperName = '...'` and pass the explicit `RecordTypeId` in the create payload.

**Comment**c Body**c — always plain text.** The `workItemComments` LWC renders `Body__c` as plain text (no `lightning-formatted-rich-text` or `lwc:inner-html`). Writing HTML tags to the field stores them literally and they appear as raw tag text in the UI. Always write plain text to `Comment__c.Body__c`.

**Large Rich Text Area fields on other objects — two-step create then update.** For RTA fields on objects other than Comment\_\_c: the Salesforce API can silently drop RTA content on `createSobjectRecord` when payloads are large. Fix: create with metadata fields only, then call `updateSobjectRecord` on the new record Id to set the RTA fields. Long Text Area fields are not affected.
