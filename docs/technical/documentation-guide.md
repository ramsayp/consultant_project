# Documentation App — Technical Guide

## Overview

A Salesforce-native documentation hub with two Lightning tabs: **Documentation** (Technical and User records) and **Change Log** (immutable event records). Documentation records have no direct link to Work Items — that connection runs exclusively through Change Log, which acts as the bridge.

---

## Data Model

### `Documentation__c`

Two Record Types: **Technical** and **User**. Field history tracking enabled.

| Field                      | Type                        | Label                 | Notes                                                                                                             |
| -------------------------- | --------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Name`                     | Text                        | Title                 | Standard name field                                                                                               |
| `Body__c`                  | Html (32,768)               | Body                  | Rich text content. `trackHistory: true`                                                                           |
| `Status__c`                | Picklist                    | Status                | Draft (default) / Published / Archived                                                                            |
| `Folder__c`                | Lookup → Folder\_\_c        | Folder                | **Required.** `deleteConstraint: Restrict` — folder cannot be deleted while docs are linked. `trackHistory: true` |
| `Related_User_Doc__c`      | Lookup → Documentation\_\_c | Related User Doc      | Technical RT: link to companion User doc. `deleteConstraint: SetNull`                                             |
| `Related_Technical_Doc__c` | Lookup → Documentation\_\_c | Related Technical Doc | User RT: link back to companion Technical doc. `deleteConstraint: SetNull`                                        |

Tracked fields (field history): Folder, Body, Title (Name), Owner.

---

### `Change_Log__c`

Immutable event record. Auto-number name: `CL-{0000}`. No field history tracking.

| Field                     | Type                        | Label                  | Notes                                                                      |
| ------------------------- | --------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `Name`                    | AutoNumber                  | Change Log Number      | Format: `CL-{0000}`                                                        |
| `Title__c`                | Text(255)                   | Title                  | **Required.** One-line description of the change                           |
| `Summary__c`              | Html (32,768)               | Summary                | Full detail: what changed, why, caveats, follow-ups                        |
| `Technical_Doc__c`        | Lookup → Documentation\_\_c | Technical Doc          | Which Technical doc was created/updated. `deleteConstraint: SetNull`       |
| `Work_Item__c`            | Lookup → Work_Item\_\_c     | Work Item              | What triggered this change. `deleteConstraint: SetNull`                    |
| `Changed_By__c`           | Lookup → User               | Changed By             | Human responsible. Separate from record owner. `deleteConstraint: SetNull` |
| `Change_Date__c`          | DateTime                    | Change Date            | When applied. Can be backdated                                             |
| `Environment__c`          | Picklist                    | Environment            | Scratch Org (default) / Sandbox / Production                               |
| `Status__c`               | Picklist                    | Status                 | Draft (default) / Reviewed / Published                                     |
| `Version__c`              | Text(20)                    | Version                | e.g. "v1.2", "Sprint 4", "2026-05-21"                                      |
| `Technical_Doc_Before__c` | Html (32,768)               | Technical Doc (Before) | **Auto-populated by trigger** at creation                                  |
| `Technical_Doc_After__c`  | Html (32,768)               | Technical Doc (After)  | Populated by agent/user after edits                                        |
| `User_Doc_Before__c`      | Html (32,768)               | User Doc (Before)      | **Auto-populated by trigger** at creation                                  |
| `User_Doc_After__c`       | Html (32,768)               | User Doc (After)       | Populated by agent/user after edits                                        |

---

### `Folder__c`

Generic container object. `Documentation` record type scopes it to the doc domain.

| Field              | Type                 | Label         | Notes                                                                    |
| ------------------ | -------------------- | ------------- | ------------------------------------------------------------------------ |
| `Name`             | Text                 | Folder Name   | Standard name field                                                      |
| `Parent_Folder__c` | Lookup → Folder\_\_c | Parent Folder | Self-referential. `deleteConstraint: SetNull`. Enables unlimited nesting |
| `Description__c`   | Long Text (32,768)   | Description   | Optional context                                                         |

---

## Record Types

### `Documentation__c`

| RT          | Label     | Audience                                                                      |
| ----------- | --------- | ----------------------------------------------------------------------------- |
| `Technical` | Technical | Admins, developers, architects — API refs, config steps, data model decisions |
| `User`      | User      | End users — plain-language guides, how-tos, FAQs                              |

Both share the same Status picklist: Draft (default) / Published / Archived.

### `Folder__c`

| RT              | Label         | Purpose                                                                                |
| --------------- | ------------- | -------------------------------------------------------------------------------------- |
| `Documentation` | Documentation | Scope folders to the Documentation domain. Other RTs can be added for future use cases |

---

## Triggers

### `ChangeLogTrigger` — before insert on `Change_Log__c`

`force-app/main/default/triggers/ChangeLogTrigger.trigger`

When a Change Log is inserted with `Technical_Doc__c` set:

1. Collects all `Technical_Doc__c` IDs from the batch
2. Queries `Body__c` and `Related_User_Doc__r.Body__c` in a single SOQL call
3. Stamps `Technical_Doc_Before__c` and `User_Doc_Before__c` on the new records

Exits early if no records have a `Technical_Doc__c` value. Bulkified — safe for data load and API creation. `_After` fields are left blank at creation and populated once doc edits are complete.

---

## Lightning Pages

### `Documentation_Record_Page`

| Tab              | Contents                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Detail (default) | Details section (Title, Status, Folder); Article section (Body); sidebar: Change Logs related list (Technical RT only) |
| Audit Trail      | Documentation History related list                                                                                     |
| Settings         | Ownership (Created By, Last Modified By, Owner)                                                                        |

Header actions: Edit, Delete, Clone, Change Owner, Change Record Type.

Related User Doc / Related Technical Doc shown in Detail via visibility rules (System Administrator only; per-RT).

### `Change_Log_Record_Page`

| Tab              | Contents                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Detail (default) | Details section (Title, Change Date, CL Number, Version); Summary section (Summary\_\_c); sidebar: Related (Technical Doc, Work Item) |
| Guides           | Accordion: Before Technical / After Technical / Before User / After User                                                              |
| Settings         | Ownership (Changed By, Last Modified By, Created By, Owner)                                                                           |

Header actions: Edit, Delete, Clone, Change Owner.

---

## Permission Set — Documentation

Full CRUD on `Documentation__c`, `Change_Log__c`, and `Folder__c`. Field-level access to all custom fields on all three objects. Record Type visibility: Technical, User (Documentation**c); Documentation (Folder**c). Tab visibility: Documentation, Change Log, Folder. App visibility: Documentation.

Assign this permission set to any user who needs to create or manage documentation records.

---

## Source Control

Repo copies live in:

```
docs/technical/   ← Technical Documentation__c records
docs/user/        ← User Documentation__c records
```

**Salesforce is the source of truth.** Users may edit `Body__c` directly in the org. Before editing a repo file, always query the current `Body__c` from Salesforce first. After editing, update both the repo file and the `Body__c` field on the Salesforce record.

Current tracked docs:

| Repo file                                    | SF Record ID         | Name                                     |
| -------------------------------------------- | -------------------- | ---------------------------------------- |
| `docs/technical/project-management-guide.md` | `a05g5000007RVGbAAO` | Project Management App — Technical Guide |
| `docs/technical/documentation-guide.md`      | _(this record)_      | Documentation App — Technical Guide      |
| `docs/user/documentation-guide.md`           | _(companion record)_ | Documentation App — User Guide           |

---

## Key Design Decisions

**No direct Work Item link on Documentation\_\_c** — `Change_Log__c` is the bridge. One Work Item can produce multiple Change Log entries, each linked to a Technical doc. Documentation records have no `Work_Item__c` field.

**Folder required with Restrict deletion** — every doc must belong to a folder. To delete a folder, first reparent all its docs. This prevents orphaned records.

**Bidirectional lookups between Technical and User** — `Related_User_Doc__c` on Technical and `Related_Technical_Doc__c` on User. Navigate directly between companion docs without going via a related list.

**Change Log is immutable** — it's an append-only event record, not a document. Field history is intentionally off; the Before/After snapshot fields provide the audit trail instead.

**Before snapshots are automatic, After snapshots are manual** — the `ChangeLogTrigger` captures the doc state at the moment a Change Log is created. After fields are populated once edits are applied (by an agent or manually).

---

## Agent Integration

Intended agentic workflow:

1. Agent reads `Work_Item__c` via MCP
2. Agent does the work (deploy, configure, etc.)
3. Agent CREATEs `Change_Log__c` — links to `Work_Item__c` and `Technical_Doc__c`
   - `ChangeLogTrigger` auto-populates Before snapshots
4. Agent UPDATEs `Documentation__c` (Technical) — updates `Body__c`
5. Agent sets `Technical_Doc_After__c` on the Change Log
6. Agent optionally UPDATEs `Documentation__c` (User) and sets `User_Doc_After__c`
7. Agent UPDATEs `Work_Item__c` status (e.g. → "Documented")
