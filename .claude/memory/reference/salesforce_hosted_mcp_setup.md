---
name: reference_salesforce_hosted_mcp_setup
description: "Complete working setup for connecting Salesforce Hosted MCP (sobject-all) to Claude Code — what's required, what failed, what worked"
metadata:
  node_type: memory
  type: reference
  originSessionId: 8930ac2c-c768-45b2-9fcc-a7bcfdf57de3
---

# Salesforce Hosted MCP → Claude Code: Complete Setup

Took a full session to get working. This records every step so it can be repeated without pain.

---

## What it gives you

9 CRUD + SOQL tools (`createSobjectRecord`, `updateSobjectRecord`, `soqlQuery`, `find`, `getObjectSchema`, `getRelatedRecords`, `getUserInfo`, `listRecentSobjectRecords`, `updateRelatedRecord`) running against your live Salesforce org, authenticated as your user, respecting FLS and sharing rules.

---

## Part 1 — Salesforce Setup: External Client App

**Use the new ECA metadata type, NOT a legacy Connected App.**

The External Client App lives in Setup → Integrations → External Client Apps (or deploy via metadata).

### Metadata files

`force-app/main/default/externalClientApps/Claude_MCP.eca-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<ExternalClientApplication xmlns="http://soap.sforce.com/2006/04/metadata">
  <label>Claude MCP</label>
  <orgScopedExternalApp>YOUR_ORG_ID:Claude_MCP</orgScopedExternalApp>
</ExternalClientApplication>
```

`force-app/main/default/extlClntAppOauthSettings/Claude_MCP_oauth.ecaOauth-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<ExtlClntAppOauthSettings xmlns="http://soap.sforce.com/2006/04/metadata">
  <commaSeparatedOauthScopes>RefreshToken, MCP</commaSeparatedOauthScopes>
  <externalClientApplication>Claude_MCP</externalClientApplication>
  <isFirstPartyAppEnabled>false</isFirstPartyAppEnabled>
  <label>Claude_MCP_oauth</label>
</ExtlClntAppOauthSettings>
```

### Critical OAuth settings (in Setup UI)

| Setting                               | Value                             | Why                                                                                                                                                                |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Callback URL                          | `http://localhost:38000/callback` | Exact match — Claude Code listens on port 38000                                                                                                                    |
| Require secret for Web Server Flow    | **OFF**                           | Claude Code uses PKCE, no secret                                                                                                                                   |
| Require secret for Refresh Token Flow | **OFF**                           | Same reason                                                                                                                                                        |
| Require PKCE                          | **ON**                            | Claude Code always sends PKCE                                                                                                                                      |
| Issue JWT-based access tokens         | **ON**                            | ⚠️ CRITICAL — `api.salesforce.com` validates tokens locally as JWTs; opaque session tokens (`00D...`) are rejected with `{"errors":[{"message":"Invalid token"}]}` |

---

## Part 2 — Claude Code Setup

### Add the server (run once in PowerShell in VS Code)

```powershell
claude mcp add --transport http salesforce-sobject-all https://api.salesforce.com/platform/mcp/v1/platform/sobject-all
```

This writes to `~/.claude.json` under the current project key. The resulting config:

```json
"salesforce-sobject-all": {
  "type": "http",
  "url": "https://api.salesforce.com/platform/mcp/v1/platform/sobject-all",
  "oauth": {
    "clientId": "YOUR_ECA_CONSUMER_KEY",
    "callbackPort": 38000
  }
}
```

### ⚠️ Windows duplicate key bug

`~/.claude.json` stores project settings under the project path as a key. On Windows, `claude mcp add` may write under `C:/...` (uppercase) while Claude Code reads from `c:/...` (lowercase) — two different keys. Check `~/.claude.json` and copy the `mcpServers` block to both keys.

---

## Part 3 — Authentication

On first use, Claude Code's OAuth handler takes over automatically:

1. Claude Code starts the MCP server connection
2. A browser opens to Salesforce login (standard OAuth)
3. After login + consent, Salesforce redirects to `http://localhost:38000/callback`
4. Claude Code's local server catches it, exchanges the code for a JWT token
5. Browser shows: **"Authentication Successful. You can close this window. Return to Claude Code."**
6. Token is stored in `~/.claude.json` — no action needed

Restart Claude Code after auth completes if the server shows as disconnected.

---

## What failed / dead ends

| Approach                                                           | Problem                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mcp-remote` proxy (`--transport sse`)                             | Two Windows bugs: PKCE race condition (`invalid code verifier`), missing `expires_in` field in Salesforce token response (tokens treated as immediately expired). Patching the npx cache is fragile. |
| Opaque session token (no JWT flag)                                 | `api.salesforce.com` gateway validates tokens locally as JWTs. Opaque Salesforce session tokens fail with `{"errors":[{"message":"Invalid token"}]}`                                                 |
| `mcp__...__authenticate` + `complete_authentication` tools         | The in-server OAuth flow tools lose their state between Claude Code turns — `complete_authentication` fails with "No OAuth flow is in progress". Claude Code's native transport handles auth better. |
| Wrong callback URL (`/oauth/callback`, etc.)                       | Must be exactly `http://localhost:38000/callback`                                                                                                                                                    |
| `commaSeparatedOauthScopes` with lowercase `refresh_token mcp_api` | Salesforce ECA metadata wants the display names: `RefreshToken, MCP`                                                                                                                                 |

---

## Ongoing notes

- Scopes: `RefreshToken + MCP` — do not expand without documented reason ([[feedback_mcp_minimal_access]])
- This server is the **only** hosted MCP server that should be active — see [[reference_salesforce_hosted_mcp_setup]] → [[feedback_mcp_minimal_access]]
- ECA metadata is in `force-app/main/default/externalClientApps/` and `extlClntAppOauthSettings/` — commit these
