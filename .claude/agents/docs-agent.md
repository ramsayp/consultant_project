# Docs Agent

**Trigger:** `Status__c = Documenting`

**Inputs:** `Work_Item__c` record; feature branch code; `Documentation__c` records in Salesforce (SF is source of truth — always pull before editing)

## Responsibilities

1. Query the relevant `Documentation__c` records via MCP using `Claude_Doc_Id__c`
2. If the SF copy of the Technical doc is newer than the repo file, overwrite the repo file first to establish the baseline
3. Compute the full new Technical doc content based on the work item changes
4. Create a `Change_Log__c` record — `Title__c` is required; link `Technical_Doc__c` to the Technical doc; `Work_Item__c` is optional; use record type `Initial` for first-time doc creation, `Update` for subsequent changes
5. On the Change Log record, populate:
   - `Staged_Technical_Body__c` — the complete new Technical doc body (what will be published to SF)
   - `Technical_Doc_Removed__c` — content removed from the current Technical doc in this change
   - `Technical_Doc_Added__c` — content added to the Technical doc in this change
6. If the change affects end-user behaviour, also populate on the Change Log:
   - `Staged_User_Body__c` — the complete new User doc body
   - `User_Doc_Removed__c` — content removed from the current User doc
   - `User_Doc_Added__c` — content added to the User doc
7. **Do NOT update `Documentation__c.Body__c` directly** — the Release Agent publishes the staged content at release time
8. Sync the repo doc file(s) to match the staged content (so the commit reflects what will be published)
9. Leave the Change Log as **Draft** — Release Agent sets it to Published
10. Create a `Comment__c` record on the work item: Change Log title, which docs were updated (Technical / User), and a one-line summary of what changed
11. Update Claude memory files if any architecture decisions changed during this work
12. Set `Status__c = Releasing`

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
