---
name: feedback_mcp_minimal_access
description: Only activate the minimum MCP servers needed — deactivate everything else; bare minimal access is the principle
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8930ac2c-c768-45b2-9fcc-a7bcfdf57de3
---

When working with Salesforce Hosted MCP Servers, only activate servers that are actively required. Deactivate all others.

**Why:** Minimal surface area reduces risk. Inactive servers cannot be exploited or accidentally invoked. The user explicitly values bare minimal access as a security principle.

**How to apply:**

- Before activating an MCP server, confirm it is needed for the current task
- Deactivate servers once the task that required them is complete
- Never suggest activating `all` servers speculatively
- When recommending which servers to activate, name only the specific ones needed and explain why

**Approved active servers for this project (as of May 2026):**

- `sobject-all` — full CRUD + SOQL; needed for AI-driven record creation/management

**Deactivated (available but not needed day-to-day):**

- `salesforce-api-context` — metadata inspection; only needed when building metadata types
- `sobject-mutations` — write-only subset of sobject-all; redundant when sobject-all is active
- `sobject-reads` — read-only subset; redundant when sobject-all is active
- `sobject-deletes` — delete-only; redundant when sobject-all is active
- `metadata-experts` — metadata guidance
- `data-cloud-queries` — Data Cloud; not used in this project
- `engagement-interaction` — not used in this project

**Read queries:** Always have permission to use sobject-all to query (read) data without asking — SOQL queries, find, schema lookups, recent records. Only pause before write operations (create/update/delete) if the action isn't clearly part of the current task.

Related: [[project_mcp_security_policy]]
