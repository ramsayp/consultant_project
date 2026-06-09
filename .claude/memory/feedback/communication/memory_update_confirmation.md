---
name: memory_update_confirmation
description: every agent task completion summary must include a memory update line — either what was saved, or explicit confirmation that no update was needed and why
metadata:
  type: feedback
---

# Always close agent task summaries with a memory status line

**Rule:** Every agent task completion summary must end with a memory line — one of:

- `✅ Memory updated — [what changed and why it's non-obvious]`
- `✅ Memory not updated — [reason: e.g. change is fully derivable from code / no new patterns / no architectural decisions]`

**Why:** After the Docs Agent completed the Triage nav task, the summary omitted any mention of memory. The user had to ask explicitly whether memory needed updating. The answer was "no" (the 2-line LWC change was trivial and self-documenting), but that confirmation should have been in the summary without prompting.

**How to apply:**

- At the end of every agent completion summary (Dev Agent, Docs Agent, Release Agent, Code Review Agent, BA Agent), add the memory line.
- If no update was needed, state it clearly and give the one-line reason (e.g. "fully derivable from code", "no new patterns", "no architectural decisions changed").
- If an update was made, name the file/rule that was written or updated.
- This applies even when the task was trivial — the user needs the confirmation either way.
