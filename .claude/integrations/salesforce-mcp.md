# Salesforce Hosted MCP — Setup Guide

Connects Claude Code to the Salesforce Hosted MCP `sobject-all` server, giving 9 CRUD + SOQL tools running against the live org as your authenticated user.

For access policy and approved servers, see [`.claude/security/mcp.md`](../security/mcp.md).

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

## Usage patterns

### Record Type — always pre-query for Id

Relationship notation (`"RecordType": {"DeveloperName": "Update"}`) is rejected by the Salesforce API:

> "DeveloperName is not an External ID or indexed field for RecordType"

Always pre-query first:

```soql
SELECT Id FROM RecordType WHERE SobjectType = 'Change_Log__c' AND DeveloperName = 'Update'
```

Then pass the explicit `RecordTypeId` in the create payload.

### Large Rich Text Area fields — two-step create then update

The Salesforce API silently drops Rich Text Area field content on `createSobjectRecord` when the payload is large — the create returns `201 Created` with no error, but querying the record shows the field as null.

Fix: create the record with metadata fields only, then call `updateSobjectRecord` on the new record Id to set the Rich Text Area fields. Long Text Area fields are not affected by this.

---

## Troubleshooting / dead ends

| Symptom                                    | Cause                                                        | Fix                                                                            |
| ------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `{"errors":[{"message":"Invalid token"}]}` | JWT flag not enabled on the ECA                              | Turn on "Issue JWT-based access tokens" in Setup                               |
| `error=redirect_uri_mismatch`              | Callback URL in ECA doesn't match                            | Set callback URL to exactly `http://localhost:38000/callback`                  |
| Server connects but tools fail immediately | Opaque token cached from before JWT was enabled              | Clear token from `~/.claude.json` and re-authenticate                          |
| Server missing after `claude mcp add`      | Windows duplicate key bug                                    | Copy `mcpServers` block to both `c:/...` and `C:/...` keys in `~/.claude.json` |
| `mcp-remote` proxy approach                | Two Windows bugs: PKCE race condition + missing `expires_in` | Use `--transport http` (Claude Code's native transport) instead                |
