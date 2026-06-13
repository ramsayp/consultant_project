---
name: feedback_memory_hygiene
description: Rules for keeping memory lean — merge-before-create, one file per domain, 200-line MEMORY.md limit, and what never belongs in memory
metadata:
  type: feedback
---

Rules sourced from agent memory consolidation research (vectorize.io, zenvanriel.com, 2026).

## Before creating a new file — merge check

Search MEMORY.md for an existing file covering the same domain. If one exists, update it instead of creating a new file. A new file is only justified when the topic is genuinely distinct from everything already indexed.

**Why:** After 10 sessions, 30% of memory entries tend to be redundant. Proliferation happened in this project with MCP rules (four separate files that were later merged into one). The fix must be proactive at write time, not reactive cleanup.

## One file per domain, not one file per incident

Name files after topics (mcp_usage, routing_from_record_state) — never after the task, ticket, or session that created the memory. An incident is the trigger; the domain is the home.

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
