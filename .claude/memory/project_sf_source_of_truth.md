---
name: project_sf_source_of_truth
description: "Salesforce is the source of truth for tech guides, user guides, and change logs — always pull from SF before editing the repo copy"
metadata:
  node_type: memory
  type: project
  originSessionId: 8930ac2c-c768-45b2-9fcc-a7bcfdf57de3
---

# Salesforce is the source of truth for documentation

Technical guides, user guides, and change log entries live in Salesforce (`Documentation__c` and `Change_Log__c`). Users may edit them directly in the org. The repo also keeps a copy, but it may be stale.

**Why:** Users can edit docs in Salesforce directly. The repo copy may lag behind. Editing the repo copy without pulling from SF first risks overwriting user changes.

**How to apply:** Before editing any file in `docs/technical/` or `docs/user/`:

1. Query the corresponding `Documentation__c` record via MCP using `Claude_Doc_Id__c`:
   `SELECT Id, Name, Body__c FROM Documentation__c WHERE Claude_Doc_Id__c = 'slug-here'`
2. Compare with the repo file — if SF is newer or different, overwrite the repo file first
3. Make your edits
4. Update both: the repo file AND the Salesforce record (`updateSobjectRecord`)

## Folder structure

| Repo path         | SF object          | SF Record Type |
| ----------------- | ------------------ | -------------- |
| `docs/technical/` | `Documentation__c` | Technical      |
| `docs/user/`      | `Documentation__c` | User           |

## Current docs

`Claude_Doc_Id__c` is an External ID field on `Documentation__c` — use it to locate records without hard-coding Salesforce IDs.

| Repo file                                    | Claude_Doc_Id\_\_c             | SF Name                                  |
| -------------------------------------------- | ------------------------------ | ---------------------------------------- |
| `docs/technical/project-management-guide.md` | `project-management-technical` | Project Management App — Technical Guide |
| `docs/technical/documentation-guide.md`      | `documentation-technical`      | Documentation App — Technical Guide      |
| `docs/technical/mcp-setup-guide.md`          | `mcp-setup-technical`          | MCP Setup — Technical Guide              |
| `docs/user/documentation-guide.md`           | `documentation-user`           | Documentation App — User Guide           |
| `docs/user/project-management-guide.md`      | `project-management-user`      | Project Management App — User Guide      |
