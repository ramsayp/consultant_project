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
5. Create a `Change_Log__c` record. **`Title__c` is the only required field** (confirmed via `FieldDefinition` — everything else, including `Summary__c`, `Version__c`, `Changed_By__c`, `Change_Date__c`, `Environment__c`, `Status__c`, `Work_Item__c`, and the four Before/After snapshot fields, is nillable). The existing CL-0000 through CL-0004 entries all use just `Title__c` + `Technical_Doc__c` and leave `Work_Item__c` null — match that minimal pattern. **Do not search for a `Work_Item__c` to link** — only set it if the user names one explicitly at the start of the task.

## Rich Text Area field limit — fixed at 32,768, do not check

`Body__c` (on `Documentation__c`) and all five rich-text fields on `Change_Log__c` (`Summary__c`, `Technical_Doc_Before__c`, `Technical_Doc_After__c`, `User_Doc_Before__c`, `User_Doc_After__c`) are `Rich Text Area(32768)` — **32,768 chars is Salesforce's hard platform ceiling for this field type, it cannot be raised**. Don't pre-check length before pushing (no staging files, no `wc -c`, no anonymous Apex/`/tmp` scripts) — just attempt the `updateSobjectRecord`; if content is ever too long Salesforce rejects it and reports by how much. In practice a full technical-guide-sized doc (~33KB markdown → ~30KB HTML) fits comfortably under the limit.

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
