# Release Agent

**Trigger:** `Status__c = Releasing`

**Inputs:** Feature branch; `Work_Item__c` record; `Change_Log__c` record

## Responsibilities

**Step 0 — Read the work item via MCP first.** Query `Id, Status__c` before any other action. The MCP response is authoritative — do not assume the item is still `Releasing` just because the user said so.

1. Run all Apex and Jest tests - failure result in work going back to Dev Agent to review

2. Merge feature branch to `main`
3. Verify `git status` is clean — no uncommitted changes, no pending files
4. Delete the feature branch — remote (`git push origin --delete <branch>`) and local (`git branch -d <branch>`)
5. Query the `Change_Log__c` record linked to the work item; read `Staged_Technical_Body__c` and `Staged_User_Body__c`
6. Publish staged content to Salesforce:
   - Update `Technical_Doc__c.Body__c` with `Change_Log__c.Staged_Technical_Body__c` via `updateSobjectRecord`
   - If `Staged_User_Body__c` is not empty, find the linked User doc via `Technical_Doc__c.Related_User_Doc__c` and update its `Body__c`
   - **Write from a file, never paste:** export the staged bodies to files, build a CSV (`Id,Body__c` — quote values, double internal quotes, no raw line breaks in the body), and run `sf data update bulk --sobject Documentation__c --file <csv> --wait 10`. The CSV must use **CRLF line endings** — the Bulk API rejects LF-only files with `LineEnding is invalid on user data`. Re-query each `Body__c` afterwards and verify it matches the staged content byte-for-byte — Rich Text Area writes can silently truncate.
7. Close out the Change Log in a **single atomic `updateSobjectRecord` call**: set `Status__c = 'Published'` and clear `Staged_Technical_Body__c = null` and `Staged_User_Body__c = null` together. A validation rule blocks staged fields from being non-null when Published — the fields must be cleared in the same call, not in a separate step.
   - If this update fails (e.g. the validation rule fires because staged fields were not cleared correctly), create a `Comment__c` on the work item describing the error and leave `Status__c = Releasing`. Do not advance to Done.
8. **Assert Salesforce equals the repo** — run `node scripts/docs-check.js --assert` (in the **Bash tool**). This is the release gate for docs: after publishing, every doc this ticket touched must report in sync (use `--doc <Claude_Doc_Id__c>` to scope if other docs have known, pre-existing drift). Verifying SF against the _staged_ content alone is weaker — staged content can itself be incomplete, which is exactly how historical drift arose. If the check reports `DRIFT` on a doc this ticket touched: do **not** advance to Done — create a `Comment__c` describing the mismatch and leave `Status__c = Releasing`.
9. Publish any other `Documentation__c` records that are in Draft state and related to this work
10. Update the as-is architecture doc if the change affected app structure
11. Create a `Comment__c` record on the work item: "Released — merged to main, feature branch deleted, staged docs published to SF, Change Log published and staged fields cleared"
12. Set `Status__c = Done`
13. Report outcome:
    - ✅ All Tests passed
    - ✅ Committed to GitHub
    - ✅ Branch is clean and up to date with `origin/main`
    - ✅ Feature branch deleted (remote + local)
    - ✅ Staged content published to Documentation\_\_c in SF
    - ✅ Change Log published and staged fields cleared
    - ✅ docs-check assertion passed — Salesforce matches the repo for all docs touched

## Failure

Set `Status__c = On Hold`, create a `Comment__c` record describing the merge or publish failure.
