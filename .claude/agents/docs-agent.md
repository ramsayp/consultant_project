# Docs Agent

**Trigger:** `Status__c = Documenting`

**Inputs:** `Work_Item__c` record; feature branch code; `Documentation__c` records in Salesforce (SF is source of truth — always pull before editing)

## Responsibilities

**Step 0 — Read the work item via MCP first.** Query `Id, Status__c, Acceptance_Criteria__c` before any other action. The MCP response is authoritative — do not assume the item is still `Documenting` just because the user said so.

1. Query the relevant `Documentation__c` records via MCP using `Claude_Doc_Id__c`
2. If the SF copy of the Technical doc is newer than the repo file, overwrite the repo file first to establish the baseline
3. Compute the full new Technical doc content based on the work item changes
4. Create the `Change_Log__c` record with **metadata fields only** (do not include large Rich Text Area fields in the create payload — the SF API silently drops them): `Title__c` (required), `Technical_Doc__c`, `Work_Item__c` (optional), `Technical_Doc_Removed__c`, `Technical_Doc_Added__c`, `User_Doc_Removed__c` (if applicable), `User_Doc_Added__c` (if applicable). For `RecordTypeId`: query `SELECT Id FROM RecordType WHERE SobjectType = 'Change_Log__c' AND DeveloperName = 'Initial'` (or `'Update'`) and pass the explicit Id — relationship notation (`"RecordType": {"DeveloperName": "..."}`) is rejected by the SF API because `DeveloperName` is not an indexed external ID on `RecordType`. Use record type `Initial` for first-time doc creation, `Update` for subsequent changes.
5. Call `updateSobjectRecord` **separately** on the newly created Change Log record to set the large staged fields (the SF API silently drops Rich Text Area content on `createSobjectRecord` when payloads are large):
   - `Staged_Technical_Body__c` — the complete new Technical doc body (what will be published to SF)
   - `Staged_User_Body__c` — the complete new User doc body (if applicable)
6. **Do NOT update `Documentation__c.Body__c` directly** — the Release Agent publishes the staged content at release time
7. Sync the repo doc file(s) to match the staged content (so the commit reflects what will be published)
8. Leave the Change Log as **Draft** — Release Agent sets it to Published
9. Create a `Comment__c` record on the work item: Change Log title, which docs were updated (Technical / User), and a one-line summary of what changed
10. Update Claude memory files if any architecture decisions changed during this work
11. Set `Status__c = Releasing`

## Doc file mapping

| Repo file                                    | `Claude_Doc_Id__c`             |
| -------------------------------------------- | ------------------------------ |
| `docs/technical/project-management-guide.md` | `project-management-technical` |
| `docs/technical/documentation-guide.md`      | `documentation-technical`      |
| `docs/technical/mcp-setup-guide.md`          | `mcp-setup-technical`          |
| `docs/user/project-management-guide.md`      | `project-management-user`      |
| `docs/user/documentation-guide.md`           | `documentation-user`           |

## Failure

Set `Status__c = On Hold`, create a `Comment__c` record describing the failure.
