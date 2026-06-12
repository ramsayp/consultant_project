# Documentation App — User Guide

## Overview

The Documentation app is where all written knowledge about this Salesforce org lives — technical guides for admins and developers, plain-language guides for everyday users, and a change log that records what was changed and why.

---

## Opening the App

Click **Documentation** from the app launcher. The app has two tabs at the top:

- **Documentation** — all your Technical and User guides
- **Change Logs** — the history of what changed and when

---

## Document Types

When you create a new documentation record, you choose a type:

- **Technical** — for admins, developers, and architects. Covers configuration steps, data model decisions, API references, and implementation detail.
- **User** — for everyday Salesforce users. Plain-language how-to guides, feature descriptions, and FAQs.

Each Technical doc can be linked to a companion User doc (and vice versa) so both audiences can navigate to the other version easily.

---

## Folders

Every document must belong to a folder. Folders keep documentation organised and can be nested inside other folders for deeper structure (e.g. "Project Management" inside "Technical Docs").

### Creating a folder

Click **New** on the Folders tab and give it a name. Set a Parent Folder if it belongs inside an existing folder.

### Deleting a folder

A folder can only be deleted once all documents inside it have been moved elsewhere. Move the documents to a different folder first, then delete the empty folder.

---

## Creating a Document

1. Click **New** on the Documentation tab
2. Select the record type: **Technical** or **User**
3. Fill in the **Title** (required)
4. Set the **Folder** (required)
5. Set **Status** — start with **Draft**
6. Write your content in the **Body** field (rich text editor — supports headings, lists, tables, code blocks)
7. Click **Save**

---

## Document Status

| Status        | Meaning                                               |
| ------------- | ----------------------------------------------------- |
| **Draft**     | Work in progress — not yet ready for its audience     |
| **Published** | Reviewed and approved — ready to read                 |
| **Archived**  | Superseded or no longer relevant — kept for reference |

---

## Linking Companion Docs

A Technical doc and its User-facing equivalent can be linked so readers can navigate between them directly.

On a **Technical** doc: fill in the **Related User Doc** field with the companion User doc.  
On a **User** doc: fill in the **Related Technical Doc** field with the companion Technical doc.

Once linked, both records show the link and you can click through from either direction.

---

## Document History

The **Audit Trail** tab on any documentation record shows a log of every tracked change: when the title, folder, body, or owner changed, what the old value was, and who made the change.

This gives you a lightweight version history without needing to open a Change Log.

---

## Change Logs

A Change Log is an event record — it captures _what changed, when, and why_. It is separate from the document itself and is not edited once created.

### When to create a Change Log

Create a Change Log whenever a meaningful change is made to the documentation — a new feature documented, an existing guide updated, or a correction applied.

### What to fill in

| Field             | What to enter                                                      |
| ----------------- | ------------------------------------------------------------------ |
| **Title**         | One line describing the change (required)                          |
| **Summary**       | Full detail — what changed, why, any caveats or follow-ups         |
| **Technical Doc** | The Technical documentation record that was created or updated     |
| **Work Item**     | The Story, Task, or Bug that prompted this change (optional)       |
| **Version**       | A label like "Sprint 4" or "v1.2" (optional)                       |
| **Environment**   | Where the change was deployed                                      |
| **Status**        | Draft while writing, Reviewed once confirmed, Published when final |
| **Changed By**    | The person responsible (defaults to you)                           |

### The Guides tab

The **Guides** tab on a Change Log shows what documentation changed. It has two sections:

**Staged docs** — visible while the Change Log is in Draft or Reviewed state. Shows the new documentation that is queued to go live when the Change Log is published:

- **Technical New Doc** — the new content for the Technical documentation record
- **User New Doc** — the new content for the companion User guide (if applicable)

Once the Change Log is Published, this section is hidden automatically — the content has been pushed to the live documentation records and the staged copies are cleared.

**Diff summary** — always visible. Shows what was removed and what was added compared to the previous version:

- **Technical Removed** / **Technical Added**
- **User Removed** / **User Added** (if applicable)

---

## Finding Documents

The Documentation tab shows all documentation records. Use the list view selector (top left) to switch between:

- **All** — every document
- **Technical** — filtered to Technical record type
- **User** — filtered to User record type

You can search by title using the search bar, or add filters (e.g. filter by Folder, Status, or Owner) using the filter icon on the right.

---

## Tips

- Always set a **Folder** before saving — every document requires one.
- Use **Draft** status while writing. Switch to **Published** once the content is reviewed.
- Link a Technical doc to its User companion and vice versa — it makes navigation much easier for mixed audiences.
- Change Logs are permanent records. Write a clear **Title** and **Summary** so the history is useful months later.
- The **Audit Trail** tab is great for quick version checks — use it before making edits to confirm you have the latest content.
