---
name: feedback_memory_system
description: All rules for writing and managing memory — dual-save, no abbreviations, merge-before-create, one file per domain, 200-line limit, and what never belongs in memory
metadata:
  type: feedback
---

## Dual-save rule

Every memory file must be written to both locations in the same response — treat it as one atomic operation:

1. Machine path: `C:\Users\PaulS\.claude\projects\c--Users-PaulS-Projects-Coding-Languages-Salesforce-ConsultantProject\memory\`
2. Repo path: `.claude/memory/` in the project repo (tracked in git)

Never edit one without the other. `MEMORY.md` must be kept in sync between both locations. After both edits, commit and push before the response ends.

On a new machine after a reformat: copy all files from `.claude/memory/` into the machine path to restore context. If the two copies ever diverge, the repo copy is authoritative — it has commit history.

Do not reference the repo `.claude/memory/` path as a context source during normal sessions — the harness loads the machine copy automatically; loading both would duplicate all memory content in context.

**Why:** A memory update was once applied to the machine path but not synced to the repo in the same session. The backup was stale — defeating the entire purpose of dual-save.

## No abbreviations

Never use abbreviations in memory files. Memory is read cold in future sessions without the context that made an abbreviation obvious. Write the full term every time — Record Type, Acceptance Criteria, Salesforce, User Story, etc. This applies to the body of memory files and to the one-line hooks in MEMORY.md.

**Why:** The user explicitly called this out as a hard rule after "RT" appeared in a memory entry.

## Merge before create

Before writing a new memory file, check MEMORY.md for an existing file covering the same domain. If one exists, update it instead of creating a new file. A new file is only justified when the topic is genuinely distinct from everything already indexed.

**Why:** After 10 sessions, 30% of memory entries tend to be redundant. Proliferation happened in this project with MCP rules (four separate files merged into one) and the three meta files that were later merged into this one.

## One file per domain, not one file per incident

Name files after topics — never after the task, ticket, or session that created the memory. An incident is the trigger; the domain is the home.

## MEMORY.md is hard-capped at 200 lines

The system truncates MEMORY.md at 200 lines — entries beyond that are invisible. If adding a new pointer would push past 200 lines, consolidate existing entries first. Keep each index line under 150 characters.

## Recency wins for contradictions

When a new fact contradicts an existing memory, update the existing file — do not create a parallel entry. Newer information supersedes older; the history lives in git.

## What never belongs in memory

- Code patterns, conventions, file paths, or architecture — read the code
- Git history, recent changes, who changed what — use git log or git blame
- Debugging solutions or fix recipes — the fix is in the code; the commit message has the context
- In-progress work, current sprint state, temporary task notes — these are session-scoped, not durable
- Anything already documented in CLAUDE.md or the .claude/ project files
