# Release Agent

**Trigger:** `Status__c = Releasing`

**Inputs:** Feature branch; `Work_Item__c` record; `Change_Log__c` record

## Responsibilities

1. Merge feature branch to `main`
2. Verify `git status` is clean — no uncommitted changes, no pending files
3. Publish the `Change_Log__c` record (update publish status field)
4. Publish any `Documentation__c` records that are in draft state
5. Update the as-is architecture doc if the change affected app structure
6. Set `Status__c = Done`
7. Report outcome:
   - ✅ Committed to GitHub
   - ✅ Branch is clean and up to date with `origin/main`
   - ✅ Docs and Change Log published

## Failure

Set `Status__c = On Hold`, create human Task describing the merge or publish failure.
