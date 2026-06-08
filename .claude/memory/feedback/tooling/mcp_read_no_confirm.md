---
name: mcp-read-no-confirm
description: MCP read operations (soqlQuery, getObjectSchema, getRelatedRecords, getUserInfo, listRecentSobjectRecords, find) never require confirmation — always proceed without asking
metadata:
  type: feedback
---

Always use MCP read tools without asking for permission first.

**Why:** User explicitly stated this is always allowed. Asking adds unnecessary friction.

**How to apply:** `soqlQuery`, `getObjectSchema`, `getRelatedRecords`, `getUserInfo`, `listRecentSobjectRecords`, `find` — fire them directly. Only write/mutate operations (`createSobjectRecord`, `updateSobjectRecord`, `updateRelatedRecord`) warrant narration before firing, per [[mcp_minimal_access]] and [[narrate_before_permission_prompts]].
