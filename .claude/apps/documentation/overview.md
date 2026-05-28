# Documentation App — Overview

## What it does

A Salesforce-native documentation hub, separate from the Project Management App. Stores technical docs for admins/devs, plain-language docs for end users, and an immutable change log that acts as the bridge to `Work_Item__c`. Documentation records have no direct link to Work Items — that connection runs exclusively through Change Log.

## Lightning App

`Documentation` — separate Lightning App with two tabs:

- **Documentation** — `Documentation__c` list view (Technical + User docs)
- **Change Log** — `Change_Log__c` list view

## Data model

```
Work_Item__c ──── Change_Log__c ──── Documentation__c (Technical)
                                              ↕ (bidirectional lookup)
                                     Documentation__c (User)
```

### `Documentation__c`

Two Record Types: **Technical** and **User**

| Field                      | Type                                   | Notes                                            |
| -------------------------- | -------------------------------------- | ------------------------------------------------ |
| `Name` (Title)             | Text                                   | Document title — the standard name field         |
| `Body__c`                  | Rich Text (32,768)                     | Full document content with formatting            |
| `Folder__c`                | Lookup → Folder\_\_c (required)        | Organises docs into folders; deletion restricted |
| `Related_User_Doc__c`      | Lookup → Documentation\_\_c            | On Technical RT: link to companion User doc      |
| `Related_Technical_Doc__c` | Lookup → Documentation\_\_c            | On User RT: link to companion Technical doc      |
| `Status__c`                | Picklist: Draft / Published / Archived | Publication state                                |

No direct link to `Work_Item__c` — the connection runs through `Change_Log__c`.

### `Change_Log__c`

Separate object — an **immutable event record**, not a document type.  
Auto-number name format: `CL-{0000}`

| Field              | Type                                         | Notes                                    |
| ------------------ | -------------------------------------------- | ---------------------------------------- |
| `Title__c`         | Text(255)                                    | One-line description of the change       |
| `Summary__c`       | Rich Text (32,768)                           | Full detail of what changed and why      |
| `Work_Item__c`     | Lookup → Work_Item\_\_c                      | What triggered this change               |
| `Technical_Doc__c` | Lookup → Documentation\_\_c                  | Which Technical doc was produced/updated |
| `Version__c`       | Text(20)                                     | e.g. "v1.2" or "Sprint 4"                |
| `Changed_By__c`    | Lookup → User                                | Human responsible for the change         |
| `Change_Date__c`   | DateTime                                     | When the change was applied              |
| `Environment__c`   | Picklist: Scratch Org / Sandbox / Production |                                          |
| `Status__c`        | Picklist: Draft / Reviewed / Published       | Review state                             |

## Key design decisions

**Change Log is a separate object** — Technical and User docs are living documents (get updated in place). A Change Log entry is an append-only event record. Different fields, different relationships, different write patterns. A Record Type on Documentation\_\_c would require messy self-referential lookups.

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
