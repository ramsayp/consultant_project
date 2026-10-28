# Docs Agent

**Trigger:** `Status__c = Documenting`

**Inputs:** `Work_Item__c` record; feature branch code; `Documentation__c` records in Salesforce — the **only** copy of the guides. There are no Markdown copies in the repo; [structure.md](../structure.md) indexes each guide's `Claude_Doc_Id__c`.

## Responsibilities

**Step 0 — Read the work item via MCP first.** Query `Id, Status__c, Acceptance_Criteria__c` before any other action. The MCP response is authoritative — do not assume the item is still `Documenting` just because the user said so.

**Step 0b — Establish what changed.** Before touching any docs, re-read `Acceptance_Criteria__c` from the work item and run `git log main..HEAD --oneline` plus `git diff main...HEAD` to see exactly what was built. This is the authoritative input for what needs documenting.

1. Query the relevant `Documentation__c` records (including `Body__c`) via MCP using `Claude_Doc_Id__c` — see [structure.md](../structure.md). The current `Body__c` is the baseline you edit. Also query for any existing Draft `Change_Log__c` records linked to the same Technical doc: `SELECT Id, Name, Status__c, Title__c FROM Change_Log__c WHERE Technical_Doc__c = '<id>' AND Status__c != 'Published'`. If a Draft Change Log already exists, **stop and flag this to the human** — there may be unpublished staged content from a previous agent run that has not been released yet. Do not create a second Change Log until the human has reviewed the situation.
2. Compute the full new Technical doc content by **surgically patching the existing `Body__c` HTML** — never regenerate it from Markdown. Assert that each find-and-replace matched **exactly once**, and match Quill's serialisation (see `memory/docs.md`).
3. Create the `Change_Log__c` record with **metadata fields only** (do not include large Rich Text Area fields in the create payload — the SF API silently drops them): `Title__c` (required), `Technical_Doc__c`, `Work_Item__c` (optional), `Technical_Doc_Removed__c`, `Technical_Doc_Added__c`, `User_Doc_Removed__c` (if applicable), `User_Doc_Added__c` (if applicable). For `RecordTypeId`: query `SELECT Id FROM RecordType WHERE SobjectType = 'Change_Log__c' AND DeveloperName = 'Initial'` (or `'Update'`) and pass the explicit Id — relationship notation (`"RecordType": {"DeveloperName": "..."}`) is rejected by the SF API because `DeveloperName` is not an indexed external ID on `RecordType`. Use record type `Initial` for first-time doc creation, `Update` for subsequent changes.
4. Set the large staged fields **separately** from the create (the SF API silently drops Rich Text Area content on `createSobjectRecord` when payloads are large):
   - `Staged_Technical_Body__c` — the complete new Technical doc body (what will be published to SF)
   - `Staged_User_Body__c` — the complete new User doc body (if applicable)
   - **Write from a file, never paste:** build the body in a scratch file, wrap it in a CSV (`Id,Staged_Technical_Body__c,…` — quote each value, double any internal quotes, confirm the body has no raw line breaks), and run `sf data update bulk --sobject Change_Log__c --file <csv> --wait 10`. The CSV must use **CRLF line endings** — the Bulk API rejects LF-only files with `LineEnding is invalid on user data`. Afterwards **re-query the fields and verify they match the file byte-for-byte** — Rich Text Area writes can silently truncate. (For small metadata-only updates the MCP `updateSobjectRecord` remains the right tool; see `memory/docs.md`.)
5. **Do NOT update `Documentation__c.Body__c` directly** — the Release Agent publishes the staged content at release time
6. Leave the Change Log as **Draft** — Release Agent sets it to Published
7. Create a `Comment__c` record on the work item: Change Log title, which docs were updated (Technical / User), and a one-line summary of what changed
8. Update Claude memory files if any architecture decisions changed during this work
9. Set `Status__c = Releasing`

The guide list (`Claude_Doc_Id__c` → guide) lives in [structure.md](../structure.md) — the single index; add a row when a guide is created.

## Failure

Set `Status__c = On Hold`, create a `Comment__c` record describing the failure.
