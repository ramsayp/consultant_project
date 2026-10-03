# Agents — Pipeline Protocol

## Agent Routing — Session Start Rule

**Step 1 — Pre-flight query. Do this before reading any further.**

```
SELECT Id, Name, Status__c, Triage_Status__c, Sprint__c, Acceptance_Criteria__c, Triage_Notes__c,
       RecordType.DeveloperName
FROM Work_Item__c WHERE Id = '<id>'
```

**Step 2 — Determine your role from the record state, not the user's message.**

> ⚠️ The user's message is context for your work — it is not the routing trigger. A user describing implementation details, sharing screenshots, or explaining a technical problem does not mean Dev Agent applies. Only the SF record state decides.

**If `RecordType.DeveloperName = 'Ticket'` — route on `Triage_Status__c`:**

| `Triage_Status__c`          | Agent role                                            | Detail file                              |
| --------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| `Not Started` or `Declined` | **BA Agent**                                          | [agents/ba-agent.md](agents/ba-agent.md) |
| `Reviewing` or `Reviewed`   | BA Agent in progress — check Comment\_\_c for context |                                          |
| `Approved`                  | Human moves item to Backlog — not Claude's action     |                                          |

**All other record types — route on `Status__c`:**

| `Status__c`      | Agent role                                | Detail file                                                |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `To Do`          | **Dev Agent**                             | [agents/dev-agent.md](agents/dev-agent.md)                 |
| `In Code Review` | **Code Review Agent**                     | [agents/code-review-agent.md](agents/code-review-agent.md) |
| `Testing`        | Acknowledge and wait — not Claude's stage |                                                            |
| `Documenting`    | **Docs Agent**                            | [agents/docs-agent.md](agents/docs-agent.md)               |
| `Releasing`      | **Release Agent**                         | [agents/release-agent.md](agents/release-agent.md)         |

**Step 3 — Read the agent detail file for the matched role, then proceed.**

---

## Pipeline Overview

```
Ticket (Idea / Bug)
  ↓
[BA Pipeline]
  Triage → BA Agent → BA Review (human) → Backlog
  Human bypass: human creates a fully-formed ticket and places it directly in Backlog

[Main Pipeline]
  To Do → Dev Agent → Code Review Agent → Human Tester → Docs Agent → Release Agent → Done
```

All pipeline failures: agent sets status + creates a `Comment__c` record describing the failure. Work stays in the current sprint — does not return to Backlog.

---

## Writing records — applies to every agent

**Tool:** record writes (`Comment__c`, `Status__c`, `Triage_Notes__c`, …) go through the `salesforce-project-doc` MCP server (`ProjectMCPCreateRecord` / `ProjectMCPUpdateRecord`). If it is unavailable or needs re-auth, **stop and ask the user** — never fall back to `sf apex run`, `sf data`, or REST. See [memory/salesforce.md](memory/salesforce.md) → _MCP tooling_.

**`Comment__c.Body__c` is plain text — no HTML, no Markdown.** `workItemComments` renders the raw string with `white-space: pre-wrap`, so `<p>`, `<b>`, `**bold**` all appear literally. Structure with line breaks only:

```
Dev Agent — build complete
Branch: feature/<slug> (commit abc1234)

Root cause: <one or two sentences>

Files changed:
- <file> — <what changed>
- <file> — <what changed>

Tests: 113/113 Apex, 100/100 Jest. Deployed to org.
```

Short labelled lines, a blank line between groups, `-` for list items.
