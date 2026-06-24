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

| Folder                 | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `agents/`              | Detail files for each agent role               |
| `apps/*/salesforce.md` | Field-level Salesforce detail for each app     |
| `integrations/`        | Setup guides for external services (MCP, etc.) |
| `security/`            | Security policies                              |
| `skills/`              | Step-by-step task guides                       |
| `memory/`              | Persistent knowledge — see below               |

---

## Standards vs Skills vs Memory

| Category           | Question to ask                                                  | Examples                                                             |
| ------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| **`standards.md`** | Is this a convention _we_ chose for our code?                    | Layered Apex architecture, `with sharing`, comment style             |
| **`skills/`**      | Is this a step-by-step guide for a specific task?                | How to write an Apex test, how to set up MCP                         |
| **`memory/`**      | Is this a platform constraint or lesson learned from experience? | RTA formula quirk, permission set restrictions, MCP connection rules |

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
