---
name: meta
description: All rules for writing and managing memory — dual-save, no abbreviations, merge-before-create, one canonical home per fact, flat structure, 200-line MEMORY.md cap, and what never belongs in memory
metadata:
  type: feedback
---

## Structure

Memory is **flat** — every file lives directly under `memory/`, no subfolders. There is one dense file per domain:

| File            | Holds                                                          |
| --------------- | -------------------------------------------------------------- |
| `meta.md`       | These rules — how to write and manage memory                   |
| `how_i_work.md` | Behavioural / communication / workflow feedback                |
| `salesforce.md` | Platform gotchas, metadata/deploy, MCP tooling, Rich Text Area |
| `testing.md`    | LWC Jest mocking and stub patterns                             |
| `docs.md`       | Documentation conventions and the source-of-truth workflow     |
| `project.md`    | ConsultantProject architecture and the agent pipeline          |

A new file is only justified when a topic genuinely fits none of these. Prefer adding a `##` section to an existing file.

## Dual-save rule

Every memory change must be written to both locations in the same response — treat it as one atomic operation:

1. Machine path: `C:\Users\PaulS\.claude\projects\c--Users-PaulS-Projects-Coding-Languages-Salesforce-ConsultantProject\memory\`
2. Repo path: `.claude/memory/` in the project repo (tracked in git)

Never edit one without the other. `MEMORY.md` must be kept in sync between both locations. After both edits, commit and push before the response ends.

On a new machine after a reformat: copy all files from `.claude/memory/` into the machine path to restore context. If the two copies ever diverge, the repo copy is authoritative — it has commit history.

Do not reference the repo `.claude/memory/` path as a context source during normal sessions — the harness loads the machine copy automatically; loading both would duplicate all memory content in context.

**Why:** A memory update was once applied to the machine path but not synced to the repo in the same session. The backup was stale — defeating the entire purpose of dual-save.

## No abbreviations

Never use abbreviations in memory files. Memory is read cold in future sessions without the context that made an abbreviation obvious. Write the full term every time — Record Type, Acceptance Criteria, Salesforce, User Story, etc. This applies to the body of memory files and to the one-line hooks in `MEMORY.md`.

**Why:** The user explicitly called this out as a hard rule after "RT" appeared in a memory entry.

## Merge before create — one canonical home per fact

Before writing anything new, find the file and section that already owns the domain and update it. A fact lives in exactly one place; everywhere else references it with a `[[link]]`. Do not restate the same fact in multiple files.

**Why:** After 10 sessions, roughly 30% of memory entries tend to be redundant. This project has already had to merge MCP rules (four files → one) and three meta files into one, and the Rich Text Area 32,768 cap had drifted into five separate files before consolidation.

## Naming convention

- **Filename equals the `name:` slug** — lowercase, underscores, no category prefix (e.g. file `salesforce.md` has `name: salesforce`).
- Frontmatter keeps only `name`, `description`, and `metadata.type`. Do not add `node_type` or `originSessionId`.
- Inside a file, use a `##` section per topic and keep the **Rule / Why / How to apply** structure.

## MEMORY.md is hard-capped at 200 lines

The system truncates `MEMORY.md` at 200 lines — entries beyond that are invisible. Keep it to one grouped line per file with short sub-bullets. Keep each line under 150 characters.

## Recency wins for contradictions

When a new fact contradicts an existing memory, update the existing section — do not create a parallel entry. Newer information supersedes older; the history lives in git.

## Wrap Salesforce API names in backticks

Any API name containing a double underscore (`Field__c`, `Object__r`, `Type__mdt`) must be wrapped in backticks in every Markdown file, memory included — see [[docs]]. CommonMark parses `__` as emphasis and Prettier will mangle bare names on commit.

## What never belongs in memory

- Code patterns, conventions, file paths, or architecture — read the code
- Git history, recent changes, who changed what — use git log or git blame
- Debugging solutions or fix recipes — the fix is in the code; the commit message has the context
- In-progress work, current sprint state, temporary task notes — these are session-scoped, not durable
- Anything already documented in `CLAUDE.md` or the `.claude/` project files
