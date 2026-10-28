# Documentation — where it lives

Technical and user guides live **only in Salesforce**, in `Documentation__c.Body__c`. There are no Markdown copies in this repo — read and edit the guides in the org (or via MCP).

Locate each record by its External ID, `Claude_Doc_Id__c` — never hard-code Salesforce IDs:

```
SELECT Id, Name, Body__c, LastModifiedDate FROM Documentation__c WHERE Claude_Doc_Id__c = '<slug>'
```

| `Claude_Doc_Id__c`             | Salesforce Name                          | Record Type |
| ------------------------------ | ---------------------------------------- | ----------- |
| `project-management-technical` | Project Management App — Technical Guide | Technical   |
| `documentation-technical`      | Documentation App — Technical Guide      | Technical   |
| `mcp-setup-technical`          | MCP Setup — Technical Guide              | Technical   |
| `project-management-user`      | Project Management App — User Guide      | User        |
| `documentation-user`           | Documentation App — User Guide           | User        |

Change history for each guide lives in `Change_Log__c` (linked through `Technical_Doc__c`).

When a new guide is created in Salesforce, give it a `Claude_Doc_Id__c` and add a row here.
