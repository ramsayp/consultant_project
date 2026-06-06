---
name: narrate_before_permission_prompts
description: "always state what a Bash/SOQL/MCP call is for in one sentence immediately before making it — permission prompts show only mechanics (raw command/query), not intent, and the user can't approve/deny what they can't understand"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 33fa905e-617f-4d98-94bb-b78abc3db522
---

# Narrate intent immediately before any tool call that triggers a permission prompt

**Rule:** Right before calling Bash, or an MCP tool like `soqlQuery`/`updateSobjectRecord`/`createSobjectRecord` — anything that surfaces a raw command/query in a Yes/No permission dialog — say in one short sentence what it does and why. Not after, not in a batched summary: _immediately before_, so the sentence is the context the user has when the prompt appears.

**Why:** User feedback, verbatim: "i'm noticing alot of these messages are unclear. As a human i need more context... whether a bash or SF soql query via mcp I need to know what you are doing." The permission dialog shows only the mechanical payload — e.g. `SELECT QualifiedApiName, DataType, Length, Label FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = 'Documentation__c' AND DataType LIKE '%Text%'` — with zero indication of _why_ it's running. The user has to reverse-engineer intent from a query string to decide whether to click Yes. That's backwards: intent should precede mechanism.

**How to apply:**

- Before _every_ Bash call and every MCP data-operation call (`soqlQuery`, `find`, `getRelatedRecords`, `createSobjectRecord`, `updateSobjectRecord`, `deploy_metadata`, `run_apex_test`, etc.), write one plain sentence: what this does, why it's needed right now.
- This is _in addition to_ — not instead of — the existing system requirement to narrate before tool calls generally. The gap this closes is specifically: prompts that show raw command/query text need the explanation to land in the same breath, not three tool-calls later in a batched recap.
- If a query like the `FieldDefinition` one above is about to fire and it's re-deriving a fact already in memory (e.g. the `32768` Rich Text Area limit, see [[project_sf_source_of_truth]]), that's the moment to catch it — stop, don't run it, use the memorized fact instead. See [[trust_your_own_edits]].

See also [[trust_your_own_edits]] and [[prefer_mcp_over_anon_apex]] — same throughline: be deliberate and transparent about _why_ a tool call is happening, not just what it mechanically does.
