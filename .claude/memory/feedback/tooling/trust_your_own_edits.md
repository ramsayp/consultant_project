---
name: trust_your_own_edits
description: 'don''t re-read files you just wrote/edited, don''t build staging files or run diagnostic scripts to "pre-check" things that the operation itself will validate'
metadata:
  node_type: memory
  type: feedback
  originSessionId: 33fa905e-617f-4d98-94bb-b78abc3db522
---

# Trust your own edits — stop re-verifying things that can't have changed

**Rule:** After an `Edit`/`Write` succeeds, don't `Read` the file back "to confirm." After constructing a string for an MCP call, don't write it to a staging file and `wc -c` it to pre-check a length limit. Don't spin up anonymous Apex or write to `/tmp` to answer a question you could get by just attempting the real operation.

**Why:** During the "create the change log and update documentation" task ([[project_sf_source_of_truth]]), a 3-tool-call job (two `updateSobjectRecord` + one `createSobjectRecord`) ballooned because of:

- Re-reading the technical guide markdown and component files I'd just edited, to "verify" content that the Edit tool already guarantees was written correctly
- Writing a full duplicate of the HTML body to a temporary `.sync-body.html` file and running `wc -c` on it just to pre-check it was under the 32,768-char Rich Text Area limit — when Salesforce will reject an oversized payload and tell you by how much, making the pre-check pure overhead
- Attempting to run anonymous Apex via `sf apex run --file /tmp/checklen.apex` (wrong path style for Windows too) to check a field length — user rejected this with "what are you doing here"

The user's exact ask afterward: "is there anything you can do to improve your memory to prevent unnecessary reading of large files... only recheck if you have to... can you prevent the failed detour."

**How to apply:**

- The harness already tells you when Edit/Write succeeds or fails — that _is_ the verification. Don't duplicate it with a Read.
- This extends to commits: a clean `git commit` result with no "modified by hook" notice means the pre-commit Prettier pass left the file alone. Don't go back and `Read` the committed file to "confirm Prettier didn't mangle it" — the commit output already told you. (Caught repeating this exact pattern immediately after writing this memory — re-read 5 files post-commit `40b08b0` to verify something the commit message had already settled.)
- Known platform limits (e.g. Rich Text Area = 32,768 chars, see [[project_sf_source_of_truth]]) are facts to remember, not things to re-derive via scripts each time.
- If you're unsure whether content fits a limit, just attempt the real write — the error message (if any) is more authoritative than any local pre-check, and costs nothing extra since you'd have to do the write anyway.
- Before reaching for anonymous Apex / temp files / shell scripts to answer a simple question, ask: "is there a direct way to just do the thing and let it tell me if it's wrong?"
