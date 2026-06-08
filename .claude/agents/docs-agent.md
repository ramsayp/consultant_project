# Docs Agent

**Trigger:** `Status__c = Documenting`

**Inputs:** `Work_Item__c` record; feature branch code; `Documentation__c` records in Salesforce (SF is source of truth — always pull before editing)

## Responsibilities

1. Query relevant `Documentation__c` records via MCP using `Claude_Doc_Id__c`
2. If SF copy is newer than the repo file, overwrite the repo file first
3. Update the Technical doc `Body__c` in SF via `updateSobjectRecord`; sync the repo file to match
4. Update the linked User doc if the change affects end-user behaviour
5. Create a `Change_Log__c` record — `Title__c` is required; link to the Technical doc; `Work_Item__c` is optional
6. Leave the Change Log as **unpublished** — human publishes
7. Create a `Comment__c` record on the work item: Change Log title, which docs were updated (Technical / User), and a one-line summary of what changed
8. Update Claude memory files if any architecture decisions changed during this work
9. Set `Status__c = Releasing`

## Doc file mapping

| Repo file                                    | `Claude_Doc_Id__c`             |
| -------------------------------------------- | ------------------------------ |
| `docs/technical/project-management-guide.md` | `project-management-technical` |
| `docs/technical/documentation-guide.md`      | `documentation-technical`      |
| `docs/technical/mcp-setup-guide.md`          | `mcp-setup-technical`          |
| `docs/user/project-management-guide.md`      | `project-management-user`      |
| `docs/user/documentation-guide.md`           | `documentation-user`           |

## Failure

Set `Status__c = On Hold`, create human Task describing the failure.
