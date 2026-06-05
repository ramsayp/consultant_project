---
name: project_guide_migration
description: PROJECT_MANAGEMENT_GUIDE.md is a temporary home — it should eventually be migrated to a Salesforce document record once the SF doc app is built
metadata:
  node_type: memory
  type: project
  originSessionId: 1c94bb9e-6fb0-4f18-bc65-65b673749edf
---

`PROJECT_MANAGEMENT_GUIDE.md` (formerly `TECHNICAL.md`) is currently tracked in git as a fallback.

**Intended final state:** stored as a Salesforce document record (ContentVersion / ContentDocument, or a record in the planned custom Doc app) — NOT in git or on the local filesystem.

**When the SF doc app is ready:**

1. Upload content to Salesforce (ContentVersion or custom Doc object record)
2. `git rm PROJECT_MANAGEMENT_GUIDE.md`
3. Commit the removal
4. Optionally add to `.gitignore` if a local working copy is still needed

**Related future work:** [[salesforce_doc_app]] — Admin/Dev doc and User doc sections planned as separate record types or page variants.
