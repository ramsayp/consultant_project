# Docs Agent

**Trigger:** `Status__c = Documenting`

**Inputs:** `Work_Item__c` record; feature branch code; `Documentation__c` records in Salesforce (SF is source of truth — always pull before editing)

## Responsibilities

**Step 0 — Read the work item via MCP first.** Query `Id, Status__c, Acceptance_Criteria__c` before any other action. The MCP response is authoritative — do not assume the item is still `Documenting` just because the user said so.

**Step 0b — Establish what changed.** Before touching any docs, re-read `Acceptance_Criteria__c` from the work item and run `git log main..HEAD --oneline` plus `git diff main...HEAD` to see exactly what was built. This is the authoritative input for what needs documenting. The SF vs repo comparison in steps 1–2 is a currency check only — it does not determine what needs to change.

1. Query the relevant `Documentation__c` records via MCP using `Claude_Doc_Id__c`. Also query for any existing Draft `Change_Log__c` records linked to the same Technical doc: `SELECT Id, Name, Status__c, Title__c FROM Change_Log__c WHERE Technical_Doc__c = '<id>' AND Status__c != 'Published'`. If a Draft Change Log already exists, **stop and flag this to the human** — there may be unpublished staged content from a previous agent run that has not been released yet. Do not create a second Change Log until the human has reviewed the situation.
2. Compare the SF `Body__c` with the repo file content:
   - If SF is newer than the repo → overwrite the repo file first to establish the baseline, then proceed
   - If the repo is newer than SF, or they do not match in a way that is not explained by this work item → **flag the mismatch to the human** before proceeding; a previous doc or release agent run may not have completed correctly
   - If they match → proceed
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
