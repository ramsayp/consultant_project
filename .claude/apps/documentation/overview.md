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

## Agent integration (future)

The schema is built to support an agent-driven documentation workflow:

1. Agent reads `Work_Item__c` via MCP
2. Agent does the work (deploy, configure, etc.)
3. Agent CREATEs a `Change_Log__c` — links to `Work_Item__c` and `Technical_Doc__c`
4. Agent UPDATEs `Documentation__c` (Technical) — updates `Body__c`
5. Agent updates `Work_Item__c` status (e.g. → "Documented")
6. Agent optionally updates `Documentation__c` (User)

No awkward joins or self-referential lookups — each object has one job in this flow.
