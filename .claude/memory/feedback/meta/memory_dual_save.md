---
name: feedback_memory_dual_save
description: Always save memory files to both the machine path and .claude/memory/ in the repo — repo copy survives machine reformats
metadata:
  node_type: memory
  type: feedback
---

When saving or updating a memory file, always write it to TWO locations in the SAME response — treat it as one atomic operation, never do one without the other:

1. **Machine path:** `C:\Users\PaulS\.claude\projects\c--Users-PaulS-Projects-Coding-Languages-Salesforce-ConsultantProject\memory\`
2. **Repo path:** `.claude/memory/` in the project repo (tracked in git)

Then commit and push the repo copy immediately.

**Why:** The user explicitly called out that a memory update was applied to the machine path but not synced to the repo copy in the same session. If only the machine copy is updated, the repo diverges and the backup is stale — defeating the entire purpose of dual-save.

**How to apply:**

- NEVER edit a memory file at the machine path without immediately making the identical edit at the repo path in the same response — do both tool calls in the same message turn
- NEVER edit a memory file at the repo path without doing the same at the machine path
- After both edits, commit and push the repo change before the response ends
- `MEMORY.md` must be kept in sync between both locations
- On a new machine after a reformat: copy all files from `.claude/memory/` into the machine path to restore context
- If the two copies ever diverge, the repo copy is authoritative (it has commit history); merge any machine-only changes back in
- Do NOT reference the repo `.claude/memory/` path as a context source during normal sessions — the harness loads the machine copy automatically; loading both would duplicate all memory content in context
