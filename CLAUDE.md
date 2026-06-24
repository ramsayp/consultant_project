# ConsultantProject — Claude Context

Salesforce-native suite: Project Management + Documentation apps. LWC + Apex, deployed to a scratch/developer org.

## Memory

Memory lives in flat, per-domain files under `.claude/memory/` (today: `meta.md`, `how_i_work.md`, `salesforce.md`, `testing.md`, `docs.md`, `project.md`). Saving a memory normally means **adding or editing a `##` section inside the file whose domain fits** — not creating a file.

> ⚠️ **This OVERRIDES the harness default of "each memory is one file holding one fact."** Here, one file holds a whole _domain_, so **default to editing an existing file.**

Pick the file by topic — every memory fits one of these:

| If the memory is about…                                                            | Put it in       |
| ---------------------------------------------------------------------------------- | --------------- |
| How I should work — communication, narration, git, scope discipline, agent routing | `how_i_work.md` |
| Salesforce platform, metadata/deploy, MCP tooling, Rich Text Area                  | `salesforce.md` |
| LWC Jest tests                                                                     | `testing.md`    |
| Markdown or documentation conventions, docs-as-source-of-truth                     | `docs.md`       |
| This project's architecture, agent pipeline, objects, permission sets              | `project.md`    |
| A rule about the memory system itself                                              | `meta.md`       |

**One file per domain, not per fact.** Add a _new_ file only for a genuinely new domain that none of these cover, and name it after the domain (never after a ticket, task, or session). When unsure, use the closest existing file or ask. **Keep `memory/` flat — no subfolders.** Read [`.claude/memory/meta.md`](.claude/memory/meta.md) before any memory edit.

### Dual-save rule

Every memory change must be written to **both** locations in the same response, with `MEMORY.md` updated in each:

1. `C:\Users\PaulS\.claude\projects\c--Users-PaulS-Projects-Coding-Languages-Salesforce-ConsultantProject\memory\`
2. `.claude/memory/` in this repo

Then commit and push. The repo copy survives a machine reformat.

---

@.claude/structure.md
@.claude/agents.md
@.claude/pipeline.md
@.claude/standards.md
@.claude/salesforce.md
@.claude/apps/project-management/overview.md
@.claude/apps/documentation/overview.md
