# MCP Setup — Technical Guide

## Overview

The Salesforce Hosted MCP (Model Context Protocol) integration gives Claude Code read/write access to the live Salesforce org, restricted to the 6 project custom objects. Claude can query records, create and update data, and inspect schemas — all within a single agentic session, respecting field-level security and sharing rules.

**Server in use:** `salesforce-project-doc`  
**Endpoint:** `https://api.salesforce.com/platform/mcp/v1/custom/projectdocobjectall`  
**Transport:** HTTP (native Claude Code transport)  
**Type:** Custom Apex-backed server — replaces the deactivated `salesforce-sobject-all` platform server

---

## Object Allowlist

All 7 tools enforce this allowlist. Any operation targeting an object outside it returns an error identifying the disallowed object.

| Object API Name    | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `Work_Item__c`     | Projects, Epics, Stories, Tasks, Bugs, Chapters, Steps, Tickets |
| `Sprint__c`        | Sprint records (incl. Backlog sprint)                           |
| `Documentation__c` | Technical + User docs                                           |
| `Change_Log__c`    | Append-only doc change events                                   |
| `Comment__c`       | Work item comment threads                                       |
| `Folder__c`        | Documentation folders                                           |

`RecordType` is additionally permitted for SOQL queries only — needed for the RecordTypeId pre-query pattern on record creates.

---

## Available Tools

7 tools, each backed by an Apex `@InvocableMethod` class in `force-app/main/default/classes/mcp/`:

| Tool (Claude Code name suffix)   | Apex class                        | Purpose                     | Restriction                                    |
| -------------------------------- | --------------------------------- | --------------------------- | ---------------------------------------------- |
| `...ProjectMCPSOQLQuery`         | `ProjectMCPSOQLQuery.cls`         | Execute SOQL                | All FROM clauses validated; `__r` names exempt |
| `...ProjectMCPCreateRecord`      | `ProjectMCPCreateRecord.cls`      | Insert a record             | `objectApiName` validated                      |
| `...ProjectMCPUpdateRecord`      | `ProjectMCPUpdateRecord.cls`      | Update a record by ID       | Object type derived from record ID             |
| `...ProjectMCPGetObjectSchema`   | `ProjectMCPGetObjectSchema.cls`   | Describe object fields      | Defaults to all 6 objects if blank             |
| `...ProjectMCPGetRelatedRecords` | `ProjectMCPGetRelatedRecords.cls` | Fetch child records         | Both parent and child objects validated        |
| `...ProjectMCPListRecentRecords` | `ProjectMCPListRecentRecords.cls` | Recently modified records   | `objectApiName` validated                      |
| `...ProjectMCPGetUserInfo`       | `ProjectMCPGetUserInfo.cls`       | Authenticated user identity | No restriction (identity-only)                 |

Full tool ID prefix: `mcp__salesforce-project-doc__` — e.g. `mcp__salesforce-project-doc__ProjectMCPSOQLQueryapex_ProjectMCPSOQLQuery`.

All operations run as the authenticated user — FLS and sharing rules apply.

---

## Architecture

```
Claude Code (VS Code)
    │
    │  HTTP + PKCE OAuth
    ▼
api.salesforce.com/platform/mcp/v1/custom/projectdocobjectall
    │
    │  JWT-validated token
    ▼
Apex @InvocableMethod classes (ProjectMCP*)
    │
    │  with sharing + object allowlist
    ▼
Project custom objects only
```

Authentication uses OAuth 2.0 with PKCE. The gateway at `api.salesforce.com` validates tokens locally as JWTs — opaque Salesforce session tokens are rejected.

---

## Part 1 — Salesforce: External Client App

The same **External Client App (ECA)** that powered `sobject-all` continues to handle authentication for the custom server. No changes to the ECA metadata are needed.

### Metadata files

**`force-app/main/default/externalClientApps/Claude_MCP.eca-meta.xml`**

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<ExternalClientApplication xmlns="http://soap.sforce.com/2006/04/metadata">
    <contactEmail>YOUR_EMAIL</contactEmail>
    <distributionState>Local</distributionState>
    <isProtected>false</isProtected>
    <label>Claude MCP</label>
    <orgScopedExternalApp>YOUR_ORG_ID:Claude_MCP</orgScopedExternalApp>
</ExternalClientApplication>
```

**`force-app/main/default/extlClntAppOauthSettings/Claude_MCP_oauth.ecaOauth-meta.xml`**

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<ExtlClntAppOauthSettings xmlns="http://soap.sforce.com/2006/04/metadata">
    <commaSeparatedOauthScopes>RefreshToken, MCP</commaSeparatedOauthScopes>
    <externalClientApplication>Claude_MCP</externalClientApplication>
    <isFirstPartyAppEnabled>false</isFirstPartyAppEnabled>
    <label>Claude_MCP_oauth</label>
    <oauthLink>YOUR_ORG_ID:YOUR_OAUTH_LINK_ID</oauthLink>
</ExtlClntAppOauthSettings>
```

> The `oauthLink` value is generated by Salesforce when OAuth settings are saved via Setup UI. Deploy the ECA first, then configure OAuth in Setup.

### OAuth settings (Setup UI)

**Setup → Integrations → External Client Apps → Claude MCP → OAuth Settings**

| Setting                               | Value                             | Why                                                                                                                                              |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Callback URL                          | `http://localhost:38000/callback` | Claude Code listens on port 38000 — must match exactly                                                                                           |
| Require secret for Web Server Flow    | **OFF**                           | Claude Code uses PKCE; no client secret                                                                                                          |
| Require secret for Refresh Token Flow | **OFF**                           | Same                                                                                                                                             |
| Require PKCE                          | **ON**                            | Claude Code always sends PKCE                                                                                                                    |
| Issue JWT-based access tokens         | **ON**                            | **Critical** — `api.salesforce.com` validates tokens locally as JWTs. Opaque session tokens fail with `{"errors":[{"message":"Invalid token"}]}` |

### OAuth scopes

`commaSeparatedOauthScopes` uses the **display names**, not the API names:

| Display name   | What it grants                                 |
| -------------- | ---------------------------------------------- |
| `RefreshToken` | Allows token refresh without re-authenticating |
| `MCP`          | Access to the MCP platform endpoints           |

Lowercase API names (`refresh_token`, `mcp_api`) are rejected by the ECA metadata deployer.

---

## Part 2 — Salesforce: Deploy Apex Tool Classes

Deploy the 7 tool classes and their tests to the org:

```powershell
sf project deploy start --source-dir force-app/main/default/classes/mcp --ignore-conflicts
```

All classes are `global with sharing`. Test classes live in `__tests__/` and deploy with the same command (`.forceignore` excludes LWC test files but not Apex test classes).

---

## Part 3 — Salesforce: Custom MCP Server Setup

> **Note:** The `McpServer` metadata type is not supported by the CLI (`sf project retrieve start --metadata "McpServer:..."` fails). Custom MCP server configuration — tool assignments and activation — is UI-only in Setup. There is no deployable metadata for it.

1. Go to **Setup → MCP Servers**
2. Open `project-doc-object-all`
3. **Add Tools** → search for each `ProjectMCP*` Apex action and add all 7
4. Click **Activate**

The server appears in Claude Code as `salesforce-project-doc`.

---

## Part 4 — Claude Code: Register the Server

Run once in **PowerShell in VS Code** from the project directory:

```powershell
claude mcp add --transport http salesforce-project-doc https://api.salesforce.com/platform/mcp/v1/custom/projectdocobjectall
```

`claude mcp add` does not write the `oauth` block for custom servers. Add it manually to `~/.claude.json`:

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

### Windows: duplicate key bug

On Windows, `claude mcp add` writes under `C:/...` (uppercase drive letter) while Claude Code reads from `c:/...` (lowercase). Apply the `oauth` block to **both** path key variants in `~/.claude.json`.

### Connection stability

Custom MCP servers close their HTTP connection more aggressively than hosted servers. Without retry enabled, Claude Code silently drops the connection and the tools disappear. Set this once at the global level in `~/.claude.json`:

```json
"tengu_mcp_retry_failed_remote": true
```

---

## Part 5 — First-Time Authentication

Authentication is handled automatically by Claude Code's native OAuth handler:

1. Claude Code starts the MCP server connection
2. A browser window opens to the Salesforce login page
3. Log in and grant consent
4. Salesforce redirects to `http://localhost:38000/callback`
5. Claude Code's local listener exchanges the authorisation code for a JWT access token
6. Browser shows: **"Authentication Successful. You can close this window. Return to Claude Code."**
7. The token is stored in `~/.claude.json` — no further action needed

If the browser does not open automatically, call `mcp__salesforce-project-doc__authenticate` — it returns the OAuth URL to open manually.

---

## Ongoing Usage

The MCP server loads as a **deferred tool** in Claude Code. Call `ToolSearch` with a relevant keyword to activate it. With `tengu_mcp_retry_failed_remote: true`, the connection re-establishes automatically if it drops.

Token refresh is handled automatically. No manual re-authentication is normally needed.

---

## What Doesn't Work

| Approach                                           | Problem                                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `mcp-remote` proxy (`--transport sse`)             | Two Windows bugs: PKCE race condition (`invalid code verifier`) and missing `expires_in` in the token response (tokens treated as expired). |
| No JWT flag (opaque session token)                 | `api.salesforce.com` validates tokens locally as JWTs. Session tokens fail with `{"errors":[{"message":"Invalid token"}]}`                  |
| `complete_authentication` tool                     | Loses OAuth state between Claude Code turns — fails with "No OAuth flow is in progress". Native HTTP transport handles auth correctly.      |
| Wrong callback URL                                 | Must be exactly `http://localhost:38000/callback`. Any variation fails.                                                                     |
| Lowercase scope names (`refresh_token`, `mcp_api`) | ECA metadata requires display names: `RefreshToken, MCP`.                                                                                   |
| Omitting `oauth` block after `claude mcp add`      | `claude mcp add` does not write the `oauth` block for custom servers. Auth prompts never appear without it.                                 |
| `sobject-all` registered alongside custom server   | Shared `clientId` causes OAuth context interference. `sobject-all` is deactivated in Setup and must not be re-registered.                   |
| `tengu_mcp_retry_failed_remote: false` (default)   | Claude Code silently drops the connection on any failure and does not retry. Tools disappear until ToolSearch forces a reconnect.           |

---

## Key Design Decisions

**Custom server over standard `sobject-all`** — The `sobject-all` server has unrestricted access to all org objects. Salesforce provides no metadata type to configure per-object restrictions on standard servers. A custom Apex-backed server was the only viable approach.

**Apex `@InvocableMethod` over REST** — Custom MCP servers on Salesforce only accept Apex `@InvocableMethod` actions as tools. Each tool is a separate `global` class — Salesforce limits one `@InvocableMethod` per class.

**`validateAllFromObjects` for SOQL security** — The SOQL tool validates every FROM clause in the query. Relationship names ending in `__r` are exempt as they are child traversals bounded by the outer object. This blocks WHERE subquery bypass attempts like `SELECT Id FROM Account WHERE Id IN (SELECT Id FROM Work_Item__c)`.

**ECA over legacy Connected App** — The External Client App metadata type is the current Salesforce standard. Legacy Connected Apps do not support the `MCP` OAuth scope.
