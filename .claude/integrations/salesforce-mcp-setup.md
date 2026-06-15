# Salesforce Hosted MCP — Setup Guide

Connects Claude Code to a Salesforce Hosted MCP custom server restricted to the 6 project custom objects, running against the live org as your authenticated user.

For access policy and approved servers, see [`.claude/security/mcp.md`](../security/mcp.md).

---

## Active server — `salesforce-project-doc`

Custom Apex-backed MCP server (`project-doc-object-all`) replacing the unrestricted `sobject-all` platform server. `sobject-all` is **deactivated** in Setup → MCP Servers.

**Server URL:** `https://api.salesforce.com/platform/mcp/v1/custom/projectdocobjectall`

**Allowed objects:**

| Object API Name    | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `Work_Item__c`     | Projects, Epics, Stories, Tasks, Bugs, Chapters, Steps, Tickets |
| `Sprint__c`        | Sprint records (incl. Backlog sprint)                           |
| `Documentation__c` | Technical + User docs                                           |
| `Change_Log__c`    | Append-only doc change events                                   |
| `Comment__c`       | Work item comment threads                                       |
| `Folder__c`        | Documentation folders                                           |

**Tool name mapping** (tool IDs as they appear in Claude Code context):

| Tool                                                                                       | Replaces (sobject-all)     | Notes                                   |
| ------------------------------------------------------------------------------------------ | -------------------------- | --------------------------------------- |
| `mcp__salesforce-project-doc__ProjectMCPSOQLQueryapex_ProjectMCPSOQLQuery`                 | `soqlQuery`                | Validates FROM clause against allowlist |
| `mcp__salesforce-project-doc__ProjectMCPCreateRecordapex_ProjectMCPCreateRecord`           | `createSobjectRecord`      | Validates `objectApiName`               |
| `mcp__salesforce-project-doc__ProjectMCPUpdateRecordapex_ProjectMCPUpdateRecord`           | `updateSobjectRecord`      | Derives object type from record ID      |
| `mcp__salesforce-project-doc__ProjectMCPGetObjectSchemaapex_ProjectMCPGetObjectSchema`     | `getObjectSchema`          | Defaults to all 6 objects if blank      |
| `mcp__salesforce-project-doc__ProjectMCPGetRelatedRecordsapex_ProjectMCPGetRelatedRecords` | `getRelatedRecords`        | Validates both parent and child objects |
| `mcp__salesforce-project-doc__ProjectMCPListRecentRecordsapex_ProjectMCPListRecentRecords` | `listRecentSobjectRecords` | Orders by `LastModifiedDate DESC`       |
| `mcp__salesforce-project-doc__ProjectMCPGetUserInfoapex_ProjectMCPGetUserInfo`             | `getUserInfo`              | No object restriction (identity-only)   |

**Apex source:** `force-app/main/default/classes/mcp/`

**Note on McpServer metadata type:** `sf project retrieve start --metadata "McpServer:project-doc-object-all"` fails — the type is not supported by the CLI. Custom MCP server configuration (tool assignments, activation) is UI-only in Setup → MCP Servers. There is no deployable metadata for it.

### Registration in `~/.claude.json`

```json
"salesforce-project-doc": {
  "type": "http",
  "url": "https://api.salesforce.com/platform/mcp/v1/custom/projectdocobjectall",
  "oauth": {
    "clientId": "<ECA consumer key — same as sobject-all>",
    "callbackPort": 38000
  }
}
```

`claude mcp add` may not include the `oauth` block when adding a custom server. If auth fails, add the `oauth` block manually (same `clientId` and `callbackPort` as any other server using the same ECA). Apply the Windows duplicate key fix (both `c:/...` and `C:/...`) as usual.

If the browser auth prompt does not open automatically, call the `mcp__salesforce-project-doc__authenticate` tool — it returns the OAuth URL to open manually.

---

## Part 1 — Salesforce: External Client App

Use the **ECA metadata type** (not a legacy Connected App).

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

### OAuth settings in Setup UI

| Setting                               | Value                             | Why                                                                                                                                                              |
| ------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Callback URL                          | `http://localhost:38000/callback` | Claude Code listens on port 38000 — must match exactly                                                                                                           |
| Require secret for Web Server Flow    | **OFF**                           | Claude Code uses PKCE, no client secret                                                                                                                          |
| Require secret for Refresh Token Flow | **OFF**                           | Same                                                                                                                                                             |
| Require PKCE                          | **ON**                            | Claude Code always sends a code challenge                                                                                                                        |
| Issue JWT-based access tokens         | **ON**                            | ⚠️ Critical — `api.salesforce.com` validates tokens locally as JWTs; opaque session tokens (`00D…`) are rejected with `{"errors":[{"message":"Invalid token"}]}` |

---

## Part 2 — Claude Code: Register the server

Run once in PowerShell in VS Code:

```powershell
claude mcp add --transport http salesforce-sobject-all https://api.salesforce.com/platform/mcp/v1/platform/sobject-all
```

This writes to `~/.claude.json`. The resulting entry:

```json
"salesforce-sobject-all": {
  "type": "http",
  "url": "https://api.salesforce.com/platform/mcp/v1/platform/sobject-all",
  "oauth": {
    "clientId": "<ECA consumer key>",
    "callbackPort": 38000
  }
}
```

### ⚠️ Windows duplicate key bug

On Windows, `claude mcp add` may write under `C:/...` (uppercase) while Claude Code reads from `c:/...` (lowercase). Check `~/.claude.json` and ensure the `mcpServers` block exists under **both** path keys.

---

## Part 3 — Authenticate

On first connection, Claude Code's native OAuth handler runs automatically:

1. A browser window opens to Salesforce login
2. Log in and approve the consent screen
3. Salesforce redirects to `http://localhost:38000/callback`
4. Claude Code's local server exchanges the code for a JWT token
5. Browser shows: **"Authentication Successful. You can close this window. Return to Claude Code."**
6. Token is stored in `~/.claude.json` — nothing else needed

Restart Claude Code after auth completes if the server still shows as disconnected.

---

## MCP connection stability

Set `tengu_mcp_retry_failed_remote: true` in `~/.claude.json`. The default is `false`, which causes Claude Code to silently drop the connection after any failure and never retry. Custom Salesforce MCP servers (`/custom/` endpoint) close the HTTP connection more aggressively than hosted servers. With retry disabled, every drop requires a manual ToolSearch to trigger reconnection, and after a restart the `authenticate` tool may never appear.

This is a global setting — add it once at the top level of `~/.claude.json`, not inside a project key.

---

## Apex tool authoring rules

All `ProjectMCP*` classes must be `global` at every level — outer class, inner `Input`/`Output` classes, and the `execute` method. `public` does not appear in the API Catalog's Add Tools picker.

**`@InvocableVariable` rule — Input class must not be empty.** Salesforce rejects an `@InvocableMethod` whose parameter is an `Input` class with zero `@InvocableVariable` fields. This is a silent deploy failure — the class compiles but the tool is rejected when registered.

Two valid patterns:

```apex
// Pattern A — Input class with at least one field
global class Input {
    @InvocableVariable(required=true)
    global String recordId;
}

@InvocableMethod(label='...' description='...')
global static List<Output> execute(List<Input> inputs) { ... }
```

```apex
// Pattern B — no Input class needed; use List<String> directly
@InvocableMethod(label='...' description='...')
global static List<Output> execute(List<String> inputs) { ... }
```

Use Pattern B when the method requires no input at all (e.g., `ProjectMCPGetUserInfo` — identity lookup, no parameters). `List<String>` is a valid `@InvocableMethod` primitive type and avoids the empty-class rejection.

---

## Troubleshooting / dead ends

| Symptom                                    | Cause                                                            | Fix                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `{"errors":[{"message":"Invalid token"}]}` | JWT flag not enabled on the ECA                                  | Turn on "Issue JWT-based access tokens" in Setup                               |
| `error=redirect_uri_mismatch`              | Callback URL in ECA doesn't match                                | Set callback URL to exactly `http://localhost:38000/callback`                  |
| Server connects but tools fail immediately | Opaque token cached from before JWT was enabled                  | Clear token from `~/.claude.json` and re-authenticate                          |
| Server missing after `claude mcp add`      | Windows duplicate key bug                                        | Copy `mcpServers` block to both `c:/...` and `C:/...` keys in `~/.claude.json` |
| `mcp-remote` proxy approach                | Two Windows bugs: PKCE race condition + missing `expires_in`     | Use `--transport http` (Claude Code's native transport) instead                |
| `complete_authentication` tool fails       | Loses OAuth state between turns — "No OAuth flow is in progress" | Do not use; let Claude Code's native OAuth handler run on first connection     |
| ECA scope deploy fails                     | Lowercase scope names (`refresh_token`, `mcp_api`) rejected      | ECA metadata requires display names: `RefreshToken, MCP`                       |
| Auth prompt opens then fails silently      | Registering `sobject-all` alongside custom server                | Shared `clientId` causes OAuth context interference — remove `sobject-all`     |
