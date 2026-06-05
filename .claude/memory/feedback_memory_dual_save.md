---
name: feedback_memory_dual_save
description: Always save memory files to both the machine path and .claude/memory/ in the repo — repo copy survives machine reformats
metadata:
  node_type: memory
  type: feedback
---

When saving or updating a memory file, always write it to TWO locations:

1. **Machine path:** `C:\Users\PaulS\.claude\projects\c--Users-PaulS-Projects-Coding-Languages-Salesforce-ConsultantProject\memory\`
2. **Repo path:** `.claude/memory/` in the project repo (tracked in git)

Update `MEMORY.md` in both locations to match, then commit the repo copy.

**Why:** The machine path is where the harness loads memories automatically each session. The repo path is a backup — if the machine is reformatted, restore by copying `.claude/memory/` files back to the machine path. Without the repo copy, all accumulated context is permanently lost.

**How to apply:**

- Every Write or Edit to a memory file must happen twice — once to each path
- `MEMORY.md` must be kept in sync between both locations
- On a new machine after a reformat: copy all files from `.claude/memory/` into the machine path to restore context
- If the two copies ever diverge, the repo copy is authoritative (it has commit history); merge any machine-only changes back in
- Do NOT reference the repo `.claude/memory/` path as a context source during normal sessions — the harness loads the machine copy automatically; loading both would duplicate all memory content in context
