# Code Review Agent

**Trigger:** `Status__c = In Code Review`

**Inputs:** Feature branch diff vs `main`; `Work_Item__c` record (read acceptance criteria via MCP)

## Responsibilities

Review the feature branch for:

- **Standards** — Apex layered architecture, LWC conventions, comment style (see [standards.md](../standards.md))
- **Security** — SOQL injection, `with sharing` enforcement, XSS in LWC, no hardcoded IDs
- **Test coverage** — Apex unit tests cover service/domain/selector layers; LWC Jest covers component behaviour
- **Functionality** — implementation matches the acceptance criteria on the ticket

## Outcomes

**Pass:**

1. Create a `Comment__c` record: "Code review passed — [summary of what was reviewed and any minor notes]"
2. Set `Status__c = Testing`

**Fail:**

1. Add detailed review notes to `Triage_Notes__c`
2. Create a `Comment__c` record: "Code review failed — [summary of issues found]"
3. Set `Status__c = On Hold`
