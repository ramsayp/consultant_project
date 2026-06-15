# .claude/ — Knowledge Structure

This file defines where new knowledge belongs. Read it before adding any file to `.claude/`.

> **Before creating or updating any memory file, read [`.claude/memory/meta/memory_system.md`](memory/meta/memory_system.md).**

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

| Category               | Question to ask                                                  | Examples                                                             |
| ---------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| **`standards.md`**     | Is this a convention _we_ chose for our code?                    | Layered Apex architecture, `with sharing`, comment style             |
| **`skills/`**          | Is this a step-by-step guide for a specific task?                | How to write an Apex test, how to set up MCP                         |
| **`memory/feedback/`** | Is this a platform constraint or lesson learned from experience? | RTA formula quirk, permission set restrictions, MCP connection rules |

---

## Memory — Generic vs Project-specific

**Generic** (`memory/feedback/`) — applies to any Salesforce project or Claude Code session.

**Project-specific** (`memory/project/feedback/`) — tied to ConsultantProject's data model, agents, or workflows.

**When in doubt:** if the rule references `Work_Item__c`, sprint stages, specific record types, or ConsultantProject's app architecture — it's project-specific. If it's a Salesforce platform gotcha or Claude Code behaviour rule — it's generic.

### Generic (`memory/feedback/`)

| Subfolder        | Contents                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `salesforce/`    | Salesforce platform gotchas — field type quirks, metadata constraints, formula limitations |
| `tooling/`       | MCP and Claude Code usage and authoring rules                                              |
| `testing/`       | LWC Jest and Apex test patterns                                                            |
| `communication/` | How to communicate with the user (tone, narration, specificity)                            |
| `docs/`          | Documentation and Markdown conventions                                                     |
| `agents/`        | Generic agent routing principles                                                           |
| `meta/`          | Rules about the memory system itself                                                       |

### Project-specific (`memory/project/`)

| File / Folder               | Contents                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `feedback/`                 | Corrections specific to ConsultantProject (agent routing for `Work_Item__c`, project workflows) |
| `agent_pipeline.md`         | Multi-agent SDLC pipeline design                                                                |
| `kanban_stage_design.md`    | Kanban stage layout and agent ownership                                                         |
| `permission_set_mapping.md` | Which permission set to update per object                                                       |
| `ba_agent_triage_design.md` | BA agent and triage pipeline scaffolding                                                        |
| `sf_source_of_truth.md`     | Salesforce as source of truth for documentation                                                 |

### Reference (`memory/reference/`)

Pointers to where information lives in external systems (MCP server details, doc IDs, etc.).
