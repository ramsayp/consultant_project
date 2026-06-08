# Documentation App — Overview

## What it does

A Salesforce-native documentation hub, separate from the Project Management App. Stores technical docs for admins/devs, plain-language docs for end users, and an immutable change log that acts as the bridge to `Work_Item__c`. Documentation records have no direct link to Work Items — that connection runs exclusively through Change Log.

## Lightning App

`Documentation` — separate Lightning App with two tabs:

- **Documentation** — `Documentation__c` list view (Technical + User docs)
- **Change Log** — `Change_Log__c` list view

## Data model summary

See `.claude/apps/documentation/salesforce.md` for field-level detail.

```
Work_Item__c ──── Change_Log__c ──── Documentation__c (Technical)
                                              ↕ (bidirectional lookup)
                                     Documentation__c (User)
```

`Documentation__c` has two Record Types: **Technical** and **User**. No direct link to `Work_Item__c` — the connection runs through `Change_Log__c`.

## Key design decisions

**Change Log is a separate object** — Technical and User docs are living documents (get updated in place). A Change Log entry is an append-only event record. Different fields, different relationships, different write patterns. A Record Type on `Documentation__c` would require messy self-referential lookups.

**Bidirectional lookups between Tech and User docs** — `Related_User_Doc__c` on the Technical record and `Related_Technical_Doc__c` on the User record. Navigate directly from either record to its companion without going via a related list.

**Documentation connects to Work Items only through Change Log** — `Change_Log__c` is the bridge. One Work Item can produce multiple Change Log entries, each linked to a Technical doc. Documentation records have no direct `Work_Item__c` field.

## Agent integration

The schema supports a two-phase agent-driven documentation workflow:

**Docs Agent (Documenting phase):**

1. Reads `Work_Item__c` and current `Documentation__c` records via MCP
2. Creates a `Change_Log__c` (record type `Initial` or `Update`) linked to `Technical_Doc__c` and `Work_Item__c`
3. Writes staged content to the Change Log — `Staged_Technical_Body__c` (full new tech doc body), `Staged_User_Body__c` (full new user doc body if applicable)
4. Writes diff fields — `Technical_Doc_Removed__c` / `Technical_Doc_Added__c` / `User_Doc_Removed__c` / `User_Doc_Added__c`
5. Does **not** update `Documentation__c.Body__c` directly — that happens at release
6. Sets `Work_Item__c.Status__c = Releasing`

**Release Agent (Releasing phase):**

1. Merges feature branch and deploys
2. Reads staged content from the Change Log
3. Publishes `Staged_Technical_Body__c` → `Technical_Doc__c.Body__c` via MCP
4. Publishes `Staged_User_Body__c` → linked User doc's `Body__c` via MCP (if present)
5. Sets `Change_Log__c.Status__c = Published`
6. Sets `Work_Item__c.Status__c = Done`

No awkward joins or self-referential lookups — each object has one job in this flow. Documentation is only visible to users after the Release Agent has published it.
