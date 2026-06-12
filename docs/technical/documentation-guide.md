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
Two Record Types: **Initial** (first-time doc creation) and **Update** (subsequent changes).

| Field                      | Type                        | Label                   | Notes                                                                                                                                    |
| -------------------------- | --------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Name`                     | AutoNumber                  | Change Log Number       | Format: `CL-{0000}`                                                                                                                      |
| `Title__c`                 | Text(255)                   | Title                   | **Required.** One-line description of the change                                                                                         |
| `Summary__c`               | Html (32,768)               | Summary                 | Full detail: what changed, why, caveats, follow-ups                                                                                      |
| `Technical_Doc__c`         | Lookup → Documentation\_\_c | Technical Doc           | Which Technical doc was created/updated. `deleteConstraint: SetNull`                                                                     |
| `Work_Item__c`             | Lookup → Work_Item\_\_c     | Work Item               | What triggered this change. `deleteConstraint: SetNull`                                                                                  |
| `Changed_By__c`            | Lookup → User               | Changed By              | Human responsible. Separate from record owner. `deleteConstraint: SetNull`                                                               |
| `Change_Date__c`           | DateTime                    | Change Date             | When applied. Can be backdated                                                                                                           |
| `Environment__c`           | Picklist                    | Environment             | Scratch Org (default) / Sandbox / Production                                                                                             |
| `Status__c`                | Picklist                    | Status                  | Draft (default) / Reviewed / Published. Release Agent sets to Published                                                                  |
| `Version__c`               | Text(20)                    | Version                 | e.g. "v1.2", "Sprint 4", "2026-05-21"                                                                                                    |
| `Staged_Technical_Body__c` | Html (32,768)               | Staged Technical Body   | Complete new Technical doc body written by Docs Agent. Release Agent publishes this to `Technical_Doc__c.Body__c` then clears this field |
| `Staged_User_Body__c`      | Html (32,768)               | Staged User Body        | Complete new User doc body written by Docs Agent. Release Agent publishes this to the linked User doc `Body__c` then clears this field   |
| `Technical_Doc_Removed__c` | Html (32,768)               | Technical Doc (Removed) | Content removed from the Technical doc in this change. Populated by Docs Agent                                                           |
| `Technical_Doc_Added__c`   | Html (32,768)               | Technical Doc (Added)   | Content added to the Technical doc in this change. Populated by Docs Agent                                                               |
| `User_Doc_Removed__c`      | Html (32,768)               | User Doc (Removed)      | Content removed from the User doc in this change. Populated by Docs Agent                                                                |
| `User_Doc_Added__c`        | Html (32,768)               | User Doc (Added)        | Content added to the User doc in this change. Populated by Docs Agent                                                                    |

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

### `Change_Log__c`

| RT        | Label   | Purpose                                             |
| --------- | ------- | --------------------------------------------------- |
| `Initial` | Initial | First-time creation of a documentation page         |
| `Update`  | Update  | Subsequent change to an existing documentation page |

### `Folder__c`

| RT              | Label         | Purpose                                                                                |
| --------------- | ------------- | -------------------------------------------------------------------------------------- |
| `Documentation` | Documentation | Scope folders to the Documentation domain. Other RTs can be added for future use cases |

---

## Triggers

### `ChangeLogTrigger` — before insert on `Change_Log__c`

`force-app/main/default/triggers/ChangeLogTrigger.trigger`

No-op trigger. The before-snapshot logic (auto-populating `_Before__c` fields) was removed as part of the Change Log staging overhaul. Diff fields (`Technical_Doc_Removed__c`, `Technical_Doc_Added__c`, `User_Doc_Removed__c`, `User_Doc_Added__c`) are now populated explicitly by the Docs Agent, not auto-captured at insert time.

---

## Validation Rules

### `Change_Log__c`

| Rule                                 | Active | Error condition                                                                                                         | Error message                                                               |
| ------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `Staged_Docs_Cleared_When_Published` | Yes    | `AND(ISPICKVAL(Status__c, "Published"), OR(NOT(ISBLANK(Staged_Technical_Body__c)), NOT(ISBLANK(Staged_User_Body__c))))` | Staged documentation fields must be blank when the Change Log is Published. |

Enforces that the Release Agent clears staged fields in the same call that sets `Status__c = Published`. Prevents stale staged content persisting after a release.

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

| Tab              | Contents                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Detail (default) | Details section (Title, Change Date, CL Number, Version); Summary section (Summary\_\_c); sidebar: Related (Technical Doc, Work Item)                                                                        |
| Guides           | Two accordions: (1) **Staged docs** (hidden when `Status__c = Published`) — sections: Technical New Doc, User New Doc; (2) **Diff** — sections: Technical Removed, Technical Added, User Removed, User Added |
| Settings         | Ownership (Changed By, Last Modified By, Created By, Owner)                                                                                                                                                  |

Header actions: Edit, Delete, Clone, Change Owner.

---

## Permission Set — Documentation

Full CRUD on `Documentation__c`, `Change_Log__c`, and `Folder__c`. Field-level access to all custom fields on all three objects. Record Type visibility: Technical, User (`Documentation__c`); Initial, Update (`Change_Log__c`); Documentation (`Folder__c`). Tab visibility: Documentation, Change Log, Folder. App visibility: Documentation.

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
| `docs/technical/documentation-guide.md`      | `a05g5000007li9dAAA` | Documentation App — Technical Guide      |
| `docs/user/documentation-guide.md`           | _(companion record)_ | Documentation App — User Guide           |

---

## Key Design Decisions

**No direct Work Item link on Documentation\_\_c** — `Change_Log__c` is the bridge. One Work Item can produce multiple Change Log entries, each linked to a Technical doc. Documentation records have no `Work_Item__c` field.

**Folder required with Restrict deletion** — every doc must belong to a folder. To delete a folder, first reparent all its docs. This prevents orphaned records.

**Bidirectional lookups between Technical and User** — `Related_User_Doc__c` on Technical and `Related_Technical_Doc__c` on User. Navigate directly between companion docs without going via a related list.

**Change Log is immutable** — it's an append-only event record, not a document. Field history is intentionally off.

**Change Log as staging area** — the Docs Agent writes the complete new doc content to `Staged_Technical_Body__c` and `Staged_User_Body__c` on the Change Log. The Release Agent publishes these staged fields to `Documentation__c.Body__c` at release time. This ensures documentation is only visible to users after the release is approved.

**Staged docs cleared on publish** — when the Release Agent publishes a Change Log, it clears `Staged_Technical_Body__c` and `Staged_User_Body__c` atomically in the same call that sets `Status__c = Published`. A validation rule (`Staged_Docs_Cleared_When_Published`) enforces that staged fields cannot be non-null on a Published Change Log. The Lightning Record Page hides the staged-docs accordion once Published, so no empty sections are visible to users.

**Diff fields are explicit, not automatic** — `Technical_Doc_Removed__c` / `Technical_Doc_Added__c` / `User_Doc_Removed__c` / `User_Doc_Added__c` are populated by the Docs Agent to describe what changed. There is no trigger-based snapshot mechanism.

---

## Agent Integration

Two-phase agentic workflow:

**Docs Agent (Documenting phase):**

1. Reads `Work_Item__c` and current `Documentation__c` records via MCP
2. Creates a `Change_Log__c` (record type `Initial` or `Update`) — links to `Technical_Doc__c` and `Work_Item__c`
3. Writes staged content to the Change Log:
   - `Staged_Technical_Body__c` — full new Technical doc body
   - `Staged_User_Body__c` — full new User doc body (if applicable)
4. Writes diff fields to the Change Log:
   - `Technical_Doc_Removed__c` / `Technical_Doc_Added__c`
   - `User_Doc_Removed__c` / `User_Doc_Added__c` (if applicable)
5. Syncs repo doc files to match staged content
6. Does **not** update `Documentation__c.Body__c` directly
7. Updates `Work_Item__c.Status__c = Releasing`

**Release Agent (Releasing phase):**

1. Merges feature branch and deploys
2. Reads `Staged_Technical_Body__c` from the Change Log
3. Updates `Technical_Doc__c.Body__c` with the staged content via MCP
4. If `Staged_User_Body__c` is set, updates the linked User doc's `Body__c`
5. Sets `Change_Log__c.Status__c = Published` and clears `Staged_Technical_Body__c` and `Staged_User_Body__c` in a **single atomic `updateSobjectRecord` call** — a validation rule (`Staged_Docs_Cleared_When_Published`) blocks staged fields from being non-null when Published, so they must be cleared in the same call. If this update fails, a `Comment__c` is created on the Work Item and the item remains in `Releasing`.
6. Updates `Work_Item__c.Status__c = Done`
