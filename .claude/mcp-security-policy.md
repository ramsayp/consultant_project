# MCP Security Policy

**Principle: bare minimal access.** Only activate what is actively needed. Deactivate everything else.

---

## 1. Salesforce Hosted MCP Servers

Managed in **Setup → Integrations → API Catalog → MCP Servers**.

### Approved active servers

| Server        | Tools | Purpose                                          |
| ------------- | ----- | ------------------------------------------------ |
| `sobject-all` | 9     | Full CRUD + SOQL for AI-driven record operations |

### All others — inactive by default

| Server                   | Activate only when…                             |
| ------------------------ | ----------------------------------------------- |
| `salesforce-api-context` | Inspecting metadata types during development    |
| `metadata-experts`       | Metadata guidance tooling is explicitly needed  |
| `sobject-mutations`      | Never — covered by `sobject-all`                |
| `sobject-reads`          | Never — covered by `sobject-all`                |
| `sobject-deletes`        | Never — covered by `sobject-all`                |
| `data-cloud-queries`     | Data Cloud work (not in scope for this project) |
| `engagement-interaction` | Not in scope for this project                   |

### Rules

- Do not activate a server speculatively — confirm the need first
- Deactivate once the task requiring it is complete
- MCP access respects Salesforce FLS and sharing rules — it does not bypass org permissions

---

## 2. Claude Code MCP (`@salesforce/mcp`)

Configured in `.mcp.json` at the project root. Connects Claude Code to the **Salesforce CLI tooling** (LWC dev, code analysis, metadata deploy/retrieve). Separate from the hosted servers above — no OAuth required, runs locally via npx.

Current config: `--toolsets all --allow-non-ga-tools`  
Review and tighten toolsets if the active tool list grows beyond what is regularly used.

---

## 3. OAuth / External Client App

The **Claude MCP** External Client App in this org provides OAuth credentials for connecting Claude Code to the hosted MCP servers. Scopes granted:

- _Access MCP servers_
- _Perform requests at any time (refresh_token)_
- PKCE required: yes

Do not expand the scopes on this app without a documented reason.
