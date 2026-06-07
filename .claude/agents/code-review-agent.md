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

1. Set `Status__c = Testing`
2. Create human Task: "Human Testing — [ticket name]"

**Fail:**

1. Add detailed review notes to `Triage_Notes__c`
2. Set `Status__c = On Hold`
3. Create human Task: "Code review failed — [ticket]: [one-line summary of issues]"
