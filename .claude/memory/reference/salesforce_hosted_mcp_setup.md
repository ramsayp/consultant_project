---
name: reference_salesforce_hosted_mcp_setup
description: "Complete working setup for connecting the custom salesforce-project-doc MCP server to Claude Code — object allowlist, Apex tools, what's required, what failed"
metadata:
  node_type: memory
  type: reference
  originSessionId: 8930ac2c-c768-45b2-9fcc-a7bcfdf57de3
---

# Salesforce Custom MCP Server → Claude Code: Complete Setup

The `salesforce-sobject-all` platform server is **deactivated** — it had unrestricted access to all org objects and no metadata type to restrict it. The replacement is a custom Apex-backed server (`salesforce-project-doc`) that enforces a 6-object allowlist.

Full setup guide: `docs/technical/mcp-setup-guide.md` (`Claude_Doc_Id__c`: `mcp-setup-technical`).

---

## What it gives you

7 tools backed by Apex `@InvocableMethod` classes, restricted to: `Work_Item__c`, `Sprint__c`, `Documentation__c`, `Change_Log__c`, `Comment__c`, `Folder__c`. `RecordType` is additionally permitted for SOQL queries only.

Server name in Claude Code: `salesforce-project-doc`  
Endpoint: `https://api.salesforce.com/platform/mcp/v1/custom/projectdocobjectall`

---

## Part 1 — Salesforce: External Client App

Same ECA as before — no changes needed. OAuth settings must still have:

| Setting                                          | Value                                                          |
| ------------------------------------------------ | -------------------------------------------------------------- |
| Callback URL                                     | `http://localhost:38000/callback`                              |
| Require secret for Web Server/Refresh Token Flow | **OFF**                                                        |
| Require PKCE                                     | **ON**                                                         |
| Issue JWT-based access tokens                    | **ON** (CRITICAL — `api.salesforce.com` rejects opaque tokens) |

---

## Part 2 — Salesforce: Deploy Apex Tool Classes + Server Setup

```powershell
sf project deploy start --source-dir force-app/main/default/classes/mcp --ignore-conflicts
```

Then in Setup → MCP Servers → `project-doc-object-all`: Add all 7 `ProjectMCP*` Apex actions → Activate.  
The `McpServer` metadata type is not CLI-deployable — this step is always UI-only.

---

## Part 3 — Claude Code: Register the Server

```powershell
claude mcp add --transport http salesforce-project-doc https://api.salesforce.com/platform/mcp/v1/custom/projectdocobjectall
```

`claude mcp add` does **not** write the `oauth` block for custom servers — add it manually to `~/.claude.json`:

```json
"salesforce-project-doc": {
  "type": "http",
  "url": "https://api.salesforce.com/platform/mcp/v1/custom/projectdocobjectall",
  "oauth": {
    "clientId": "<Consumer Key from Setup → Claude MCP → OAuth Settings>",
    "callbackPort": 38000
  }
}
```

Also set this once at the **global** level in `~/.claude.json` (not inside a project key):

```json
"tengu_mcp_retry_failed_remote": true
```

Without it, Claude Code silently drops the connection on any failure and does not retry.

### Windows duplicate key bug

`claude mcp add` writes under `C:/...` (uppercase) while Claude Code reads from `c:/...` (lowercase). Apply the `oauth` block to **both** path variants in `~/.claude.json`.

---

## Part 4 — Authentication

Same as before — Claude Code's native OAuth handler opens a browser on first use.  
`http://localhost:38000/callback` → JWT token stored in `~/.claude.json`. No restart needed.

---

## What failed / dead ends

| Approach                                           | Problem                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `salesforce-sobject-all` platform server           | Deactivated — unrestricted org access, no per-object restriction metadata                   |
| `mcp-remote` proxy (`--transport sse`)             | Windows: PKCE race condition + missing `expires_in` in token response                       |
| Opaque session token (JWT flag OFF)                | `api.salesforce.com` rejects non-JWT tokens with `{"errors":[{"message":"Invalid token"}]}` |
| `complete_authentication` tool                     | Loses OAuth state between turns — fails with "No OAuth flow is in progress"                 |
| Wrong callback URL                                 | Must be exactly `http://localhost:38000/callback`                                           |
| Lowercase scope names (`refresh_token`, `mcp_api`) | ECA metadata requires display names: `RefreshToken, MCP`                                    |
| Omitting `oauth` block after `claude mcp add`      | Auth prompts never appear — custom server adds no `oauth` block automatically               |
| Registering `sobject-all` alongside custom server  | Shared `clientId` causes OAuth context interference                                         |
| `tengu_mcp_retry_failed_remote: false` (default)   | Connection drops silently; tools disappear until ToolSearch forces reconnect                |
