# .claude/ — Knowledge Structure

This file defines where new knowledge belongs. Read it before adding any file to `.claude/`.

> **Before creating or updating any memory file, read [`.claude/memory/meta.md`](memory/meta.md).**

---

## Always-in-context (@-imported from CLAUDE.md)

| File                                  | Purpose                                                |
| ------------------------------------- | ------------------------------------------------------ |
| `agents.md`                           | Work item routing — pre-flight query, agent role table |
| `pipeline.md`                         | Dev workflow commands (test, deploy, commit, push)     |
| `standards.md`                        | Our code conventions and architecture decisions        |
| `salesforce.md`                       | Org alias, API version, deployment settings            |
| `structure.md`                        | This file                                              |
| `apps/project-management/overview.md` | Project Management app architecture                    |
| `apps/documentation/overview.md`      | Documentation app architecture                         |

## On demand (read when needed)

| Folder                 | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `agents/`              | Detail files for each agent role              |
| `apps/*/salesforce.md` | Field-level Salesforce detail for each app    |
| `security/`            | Security policies                             |
| `skills/`              | Step-by-step guides for Claude's coding tasks |
| `memory/`              | Persistent knowledge — see below              |

---

## In Salesforce, not the repo — technical and user guides

The human-facing **technical and user guides** live **only** in Salesforce, in `Documentation__c.Body__c` (change history in `Change_Log__c`). There is no copy in the repo — never create one, and never build a sync between the two.

**The split:**

| Lives in Salesforce                                                             | Lives in the repo (`.claude/`, Markdown)                                                       |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Technical guides and user guides — how the apps work and are set up, for people | Everything Claude works from — agents, memory, skills, standards, app context, security policy |
| `Change_Log__c` history of guide changes                                        | Code and metadata                                                                              |

**Reading a guide** — treat it like an on-demand `.md` file, just fetched over MCP. Query by its External ID (never hard-code Salesforce IDs); `Body__c` comes back as Quill HTML:

```
SELECT Id, Name, Body__c, LastModifiedDate FROM Documentation__c WHERE Claude_Doc_Id__c = '<slug>'
```

| `Claude_Doc_Id__c`             | Guide                                    | Record Type |
| ------------------------------ | ---------------------------------------- | ----------- |
| `project-management-technical` | Project Management App — Technical Guide | Technical   |
| `documentation-technical`      | Documentation App — Technical Guide      | Technical   |
| `mcp-setup-technical`          | MCP Setup — Technical Guide              | Technical   |
| `project-management-user`      | Project Management App — User Guide      | User        |
| `documentation-user`           | Documentation App — User Guide           | User        |

This table is the single index — add a row when a guide is created in Salesforce.

**If MCP is down** (so the guides cannot be read — including the MCP setup guide itself): ask the human to provide the guide's content. Do not reconstruct it from memory or recreate it in the repo.

**Editing a guide** goes through the Docs Agent / Release Agent pipeline — see [agents/docs-agent.md](agents/docs-agent.md) and [memory/docs.md](memory/docs.md).

---

## Standards vs Skills vs Memory vs Salesforce guides

| Category             | Question to ask                                                   | Examples                                                             |
| -------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| **`standards.md`**   | Is this a convention _we_ chose for our code?                     | Layered Apex architecture, `with sharing`, comment style             |
| **`skills/`**        | Is this a step-by-step guide for a coding task Claude performs?   | How to write an Apex test, how to write an LWC Jest test             |
| **`memory/`**        | Is this a platform constraint or lesson learned from experience?  | RTA formula quirk, permission set restrictions, MCP connection rules |
| **Salesforce guide** | Does this explain to people how an app works or how to set it up? | Project Management user guide, MCP setup guide                       |

---

## Memory — flat, one dense file per domain

Memory lives directly under `memory/` — no subfolders. Each file is the single canonical home for its domain; everything else cross-links with `[[name]]`. Read [`memory/meta.md`](memory/meta.md) before creating or editing any memory.

| File            | Holds                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `meta.md`       | Rules about the memory system itself — dual-save, naming, merge-before-create, the 200-line cap                 |
| `how_i_work.md` | Behavioural / communication / workflow feedback — terminal naming, narration, git status, scope discipline      |
| `salesforce.md` | Salesforce platform gotchas, metadata/Prettier/deploy, MCP tooling, the Rich Text Area cap and payload escaping |
| `testing.md`    | LWC Jest mocking and stub patterns                                                                              |
| `docs.md`       | Documentation and Markdown conventions, plus Salesforce-as-source-of-truth for docs                             |
| `project.md`    | ConsultantProject specifics — architecture decisions, agent pipeline, permission-set mapping                    |

**Where new knowledge goes:** default to adding a `##` section in the existing file whose domain fits — see the routing table in `CLAUDE.md`. A platform gotcha or Claude behaviour rule goes in `salesforce.md` / `how_i_work.md`; anything referencing `Work_Item__c`, sprint stages, record types, or this app's architecture goes in `project.md`. Add a new file only for a genuinely new domain (named after the domain, not a task), and keep `memory/` flat — no subfolders.
