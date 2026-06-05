---
name: feedback_git_status_after_commit
description: Always run git status after every commit and flag if branch is out of sync with remote; offer to commit after any approved file change
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8930ac2c-c768-45b2-9fcc-a7bcfdf57de3
---

After every `git commit`, immediately run `git status` and report the sync state to the user. This is MANDATORY — do not wait to be asked.

**Why:** The user explicitly asked why this wasn't shown automatically after a commit where it was documented as required. They want to see this every time without having to prompt for it.

**How to apply:**

- Run `git status && git log --oneline -3` immediately after every commit
- Always output the report in this exact format at the end of the response:
  - ✅ Committed to GitHub — `<short hash> <message>`
  - ✅ Branch is up to date with `origin/main` (or flag if ahead/behind)
  - ✅ Pushed to Salesforce — when SF deploy was part of the same task
- If ahead of origin: flag it and ask whether to push
- If behind origin: flag it — unexpected, investigate before pushing
- Never omit this report because "the user can see the terminal" — they want the explicit confirmation in chat

**Also:** When any change is made to a tracked file (even documentation or config), offer to commit immediately after — do not wait for the user to ask. Making an approved file change and not committing it is leaving work incomplete.
