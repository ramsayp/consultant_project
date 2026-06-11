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
7. Set `Change_Log__c.Status__c = Published`
8. Publish any other `Documentation__c` records that are in Draft state and related to this work
9. Update the as-is architecture doc if the change affected app structure
10. Create a `Comment__c` record on the work item: "Released — merged to main, feature branch deleted, staged docs published to SF, Change Log published"
11. Set `Status__c = Done`
12. Report outcome:
    - ✅ All Tests passed
    - ✅ Committed to GitHub
    - ✅ Branch is clean and up to date with `origin/main`
    - ✅ Feature branch deleted (remote + local)
    - ✅ Staged content published to Documentation\_\_c in SF
    - ✅ Change Log published

## Failure

Set `Status__c = On Hold`, create a `Comment__c` record describing the merge or publish failure.
