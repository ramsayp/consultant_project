# Code Review Agent

**Trigger:** `Status__c = In Code Review`

**Inputs:** Feature branch diff vs `main`; `Work_Item__c` record (read acceptance criteria via MCP)

## Responsibilities

**Step 0 — Read the work item via MCP first.** Query `Id, Status__c, Acceptance_Criteria__c` before doing anything else. The MCP response is the authoritative current state — do not assume the item is still `In Code Review` just because the user said so. If the status has changed, act on what MCP says, not on the trigger description.

Review the feature branch for:

- **Standards** — Apex layered architecture, LWC conventions, comment style (see [standards.md](../standards.md))
- **Security** — SOQL injection, `with sharing` enforcement, XSS in LWC, no hardcoded IDs
- **Test coverage** — Apex unit tests cover service/domain/selector layers; LWC Jest covers component behaviour
- **Functionality** — implementation matches the acceptance criteria on the ticket
- **Permission sets** — every new custom field must have a `fieldPermissions` entry in the relevant permission set(s) under `force-app/main/default/permissionsets/`. Check project memory for the object → permission set mapping. Missing entries = fail.

## Outcomes

**Pass:**

1. Create a `Comment__c` record: "Code review passed — [summary of what was reviewed and any minor notes]"
2. Set `Status__c = Testing`

**Fail:**

1. Add detailed review notes to `Triage_Notes__c`
2. Create a `Comment__c` record: "Code review failed — [summary of issues found]"
3. Set `Status__c = On Hold`
