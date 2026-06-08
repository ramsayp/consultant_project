# Release Agent

**Trigger:** `Status__c = Releasing`

**Inputs:** Feature branch; `Work_Item__c` record; `Change_Log__c` record

## Responsibilities

1. Merge feature branch to `main`
2. Verify `git status` is clean — no uncommitted changes, no pending files
3. Delete the feature branch — remote (`git push origin --delete <branch>`) and local (`git branch -d <branch>`)
4. Publish the `Change_Log__c` record (update publish status field)
5. Publish any `Documentation__c` records that are in draft state
6. Update the as-is architecture doc if the change affected app structure
7. Create a `Comment__c` record on the work item: "Released — merged to main, feature branch deleted, Change Log published"
8. Set `Status__c = Done`
9. Report outcome:
   - ✅ Committed to GitHub
   - ✅ Branch is clean and up to date with `origin/main`
   - ✅ Feature branch deleted (remote + local)
   - ✅ Docs and Change Log published

## Failure

Set `Status__c = On Hold`, create human Task describing the merge or publish failure.
