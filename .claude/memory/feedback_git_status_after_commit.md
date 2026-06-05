---
name: feedback_git_status_after_commit
description: Always run git status after every commit and flag if branch is out of sync with remote; offer to commit after any approved file change
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8930ac2c-c768-45b2-9fcc-a7bcfdf57de3
---

After every `git commit`, immediately run `git status` and report the sync state to the user.

**Why:** Easy to lose track of whether changes have been pushed, especially across multiple commits in a session. A quick status check catches "ahead of origin" before it becomes a problem.

**How to apply:**

- Always report the outcome explicitly in this format:
  - ✅ Committed to GitHub
  - ✅ Branch is up to date with `origin/main`
  - ✅ Pushed to Salesforce (when SF MCP operations were also performed in the same task)
- If ahead of origin: flag it and ask whether to push
- If behind origin: flag it — unexpected, investigate before pushing
- Combine with the commit command using `;` so it always runs even if commit succeeds silently
- Don't just say "clean, up to date" — spell out what happened so the user has a complete picture without reading the terminal output

**Also:** When any change is made to a tracked file (even documentation or config), offer to commit immediately after — do not wait for the user to ask. Making an approved file change and not committing it is leaving work incomplete.
