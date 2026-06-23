---
name: project_mcp_server_name
description: "Which MCP server exposes DML for ConsultantProject custom objects — sf-project-cli has no record create/update tool"
metadata:
  type: feedback
---

`sf-project-cli` (the Salesforce dev-tooling MCP server) only exposes SOQL query, metadata retrieve/deploy, DevOps Center, and code-analyzer tools — **no generic SObject create/update tool**.

Record DML for this project's six custom objects (`Work_Item__c`, `Sprint__c`, `Documentation__c`, `Change_Log__c`, `Comment__c`, `Folder__c`) lives on a **separate** MCP server: `salesforce-project-doc`. Relevant tools:

- `ProjectMCPCreateRecordapex_ProjectMCPCreateRecord` — `fieldsJson` + `objectApiName`
- `ProjectMCPUpdateRecordapex_ProjectMCPUpdateRecord` — `fieldsJson` + `recordId`
- `ProjectMCPGetObjectSchemaapex_ProjectMCPGetObjectSchema` — field metadata for the six objects
- `ProjectMCPGetRelatedRecordsapex_ProjectMCPGetRelatedRecords` — needs `childObjectApiName`, `parentId`, `parentLookupField` all three, no defaults

**Why:** Got blocked mid-pipeline (Code Review Agent trying to log a `Comment__c` and update `Status__c`) because `sf-project-cli` genuinely has no write tool — this isn't the "avoid Apex/CLI workarounds" case from [[salesforce_mcp_rules]], it's a different server entirely. User had to reauth the `salesforce-project-doc` MCP connection mid-session before its tools appeared via ToolSearch.

**How to apply:** When a Salesforce write is needed (Comment**c logging, Status**c transitions, any of the six custom objects), reach for `salesforce-project-doc` tools first — don't assume `sf-project-cli` covers it just because it's connected. If `salesforce-project-doc` tools aren't showing in ToolSearch results, the connection may need reauth — ask the user rather than falling back to CLI/Apex.
