---
name: app_docs_structure
description: Convention for splitting app docs — what belongs in overview.md vs salesforce.md
metadata:
  type: feedback
---

Each app under `.claude/apps/*/` must have two files:

- **`overview.md`** — purpose, Lightning App/entry point, component tree, data model diagram (no field tables), Apex controller, tests, key design decisions. Reference salesforce.md for field detail.
- **`salesforce.md`** — objects, full field tables, record types, picklist stages, computed values.

`overview.md` is @-imported in CLAUDE.md and always loaded. `salesforce.md` is a reference doc — not @-imported, pointed to from overview.md.

**Why:** overview.md grew unwieldy when it contained both architecture and schema detail. Splitting keeps each file focused and mirrors how project-management docs are structured.

**How to apply:** When adding a new app or object detail, put field tables in salesforce.md, not overview.md. When adding a new app, copy from `.claude/apps/_template/` (overview.md and salesforce.md), then add only overview.md to CLAUDE.md @-imports.
