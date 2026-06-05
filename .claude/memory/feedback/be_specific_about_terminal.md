---
name: feedback_be_specific_about_terminal
description: 'Always name the exact terminal when giving a command — never just say "run this in the terminal"'
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8930ac2c-c768-45b2-9fcc-a7bcfdf57de3
---

When instructing the user to run a command, always specify exactly where:

- **PowerShell terminal in VS Code** — for sf CLI, git, npm, Windows commands
- **Bash tool** — when I'm running it myself via the Bash tool
- **Claude Code chat** — for slash commands like `/mcp`, `/help`

Never say "run this in the terminal" without qualifying which one. The user has multiple terminal contexts open and the ambiguity causes confusion.

**Why:** The user was told to run a PowerShell command and didn't know whether to type it in the Claude chat, Bash, or the VS Code terminal. Being vague wastes time.

**How to apply:** Before every command instruction, lead with the context: "In the **PowerShell terminal in VS Code**, run:" or "Type this in the **Claude Code chat**:".
