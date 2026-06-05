---
name: feedback_search_variations
description: "When verifying a rename is complete, search for ALL forms of the old name — hyphenated, spaced, title-cased, and camelCased"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1c94bb9e-6fb0-4f18-bc65-65b673749edf
---

When doing a rename (e.g. "work-management" → "project-management"), grep for every surface form the old name could appear in:

- `work-management` — hyphenated (folder path, URL slug)
- `Work Management` — title-cased in headings or prose
- `work management` — lowercase prose
- `workManagement` — camelCase (unlikely in docs but possible in code)

A single grep pattern will miss variants in a different form. Run multiple searches or use a case-insensitive pattern broad enough to catch all of them.

**Why:** The overview.md title was `# Work Management App — Overview` — the heading used spaces, not hyphens. The initial grep searched only for `work-management` and returned no matches, giving a false "all clear". The stale title was spotted by the user.

**How to apply:** After any rename, always grep for the base words (e.g. `[Ww]ork.?[Mm]anagement`) case-insensitively in addition to the exact hyphenated form.
