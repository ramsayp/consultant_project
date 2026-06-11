---
name: mcp-sobject-create-patterns
description: SF API quirks when creating records via MCP createSobjectRecord — RecordType Id lookup and large Rich Text Area field handling require a two-step create+update pattern
metadata:
  type: feedback
---

Always use two separate MCP calls when creating records that have a non-default RecordType or large Rich Text Area fields.

**RecordType — query for Id first.** Relationship notation (`"RecordType": {"DeveloperName": "Update"}`) is rejected by the SF API with "DeveloperName is not an External ID or indexed field for RecordType". Always pre-query: `SELECT Id FROM RecordType WHERE SobjectType = 'Change_Log__c' AND DeveloperName = 'Update'` and pass the explicit `RecordTypeId` in the create payload.

**Large Rich Text Area fields — update separately after create.** The SF API silently drops Rich Text Area field content on `createSobjectRecord` when payloads are large — the create returns 201 success with no error, but querying the record shows the field as null. Fix: create with metadata fields only, then call `updateSobjectRecord` on the new record Id to set the large fields.

**Why:** Discovered during the ticket numbering release (2026-06-11). `Staged_User_Body__c` on `Change_Log__c` was null after creation despite being in the payload.

**How to apply:** Any `createSobjectRecord` involving a non-default RecordType or large Rich Text Area fields (Long Text Area is fine; only Rich Text Area exhibits this). Applies especially to `Change_Log__c` creates in the Docs Agent workflow.
