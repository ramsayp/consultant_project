---
name: how_i_work
description: Behavioural rules for how Claude should work in this project — naming the terminal, narrating before permission prompts, git-status after commit, memory-status in summaries, trusting own edits, searching all name variants, routing from record state, and scope discipline
metadata:
  type: feedback
---

## Always name the terminal

When instructing the user to run a command, always specify exactly where:

- **PowerShell terminal in VS Code** — for sf CLI, git, npm, Windows commands
- **Bash tool** — when I'm running it myself via the Bash tool
- **Claude Code chat** — for slash commands like `/mcp`, `/help`

Never say "run this in the terminal" without qualifying which one.

**Why:** The user has multiple terminal contexts open and the ambiguity wastes time — they were once told to run a PowerShell command and didn't know whether to type it in the Claude chat, Bash, or the VS Code terminal.

**How to apply:** Lead every command instruction with the context: "In the **PowerShell terminal in VS Code**, run:" or "Type this in the **Claude Code chat**:".

## Narrate intent immediately before any permission-prompting tool call

Right before calling Bash, or an MCP tool like `soqlQuery`/`updateSobjectRecord`/`createSobjectRecord` — anything that surfaces a raw command/query in a Yes/No permission dialog — say in one short sentence what it does and why. Not after, not in a batched summary: _immediately before_, so the sentence is the context the user has when the prompt appears.

**Why:** User feedback, verbatim: "i'm noticing alot of these messages are unclear. As a human i need more context... whether a bash or SF soql query via mcp I need to know what you are doing." The permission dialog shows only the mechanical payload (a bare query string or URL) with zero indication of why it's running. Intent must precede mechanism. Confirmed again 2026-06-06: a `WebFetch` on a raw GitHub URL was rejected with "there is no context on what I am approving here," then approved once given a one-sentence framing.

**How to apply:**

- Before _every_ Bash call and every MCP data-operation call (`soqlQuery`, `find`, `getRelatedRecords`, `createSobjectRecord`, `updateSobjectRecord`, `deploy_metadata`, `run_apex_test`, etc.), and every `WebFetch`/`WebSearch`, write one plain sentence: what this does, why it's needed now.
- This is _in addition to_ the general system requirement to narrate before tool calls. The gap it closes: prompts showing raw command/query text need the explanation in the same breath, not three tool calls later.
- If a query is about to re-derive a fact already in memory (e.g. the 32,768 Rich Text Area limit, see [[salesforce]]), that's the moment to catch it — stop and use the memorized fact. See "Trust your own edits" below.

## Run git status after every commit

After every `git commit`, immediately run `git status` and report the sync state to the user. This is MANDATORY — do not wait to be asked.

**Why:** The user explicitly asked why this wasn't shown automatically after a commit where it was documented as required. They want to see it every time without prompting.

**How to apply:**

- Run `git status && git log --oneline -3` immediately after every commit.
- Output the report at the end of the response:
  - ✅ Committed to GitHub — `<short hash> <message>`
  - ✅ Branch is up to date with `origin/main` (or flag if ahead/behind)
  - ✅ Pushed to Salesforce — when a SF deploy was part of the same task
- If ahead of origin: flag it and ask whether to push. If behind: flag it — unexpected, investigate before pushing.
- Never omit this because "the user can see the terminal" — they want the explicit confirmation in chat.
- When any change is made to a tracked file (even docs or config), offer to commit immediately after — don't wait to be asked. An approved change left uncommitted is incomplete work.

## Close agent task summaries with a memory status line

Every agent task completion summary must end with one of:

- `✅ Memory updated — [what changed and why it's non-obvious]`
- `✅ Memory not updated — [reason: e.g. fully derivable from code / no new patterns / no architectural decisions]`

**Why:** After the Docs Agent completed the Triage nav task, the summary omitted any mention of memory and the user had to ask. The answer was "no update needed," but that confirmation should have been there unprompted.

**How to apply:** Add the line at the end of every agent completion summary (Dev, Docs, Release, Code Review, BA), even when the task was trivial. If an update was made, name the file/section. If not, give the one-line reason.

## Trust your own edits — stop re-verifying things that can't have changed

After an `Edit`/`Write` succeeds, don't `Read` the file back "to confirm." After constructing a string for an MCP call, don't write it to a staging file and `wc -c` it to pre-check a length limit. Don't spin up anonymous Apex or write to a temp file to answer a question you could get by just attempting the real operation.

**Why:** A 3-tool-call job (two `updateSobjectRecord` + one `createSobjectRecord`) ballooned from re-reading files just edited, writing a duplicate HTML body to a temp file and running `wc -c` to pre-check the 32,768 Rich Text Area limit, and attempting anonymous Apex via `sf apex run` to check a field length (rejected by the user with "what are you doing here"). The user's ask afterward: "is there anything you can do to improve your memory to prevent unnecessary reading of large files... only recheck if you have to... can you prevent the failed detour."

**How to apply:**

- The harness tells you when Edit/Write succeeds or fails — that _is_ the verification. Don't duplicate it with a Read.
- This extends to commits: a clean `git commit` with no "modified by hook" notice means Prettier left the file alone. Don't re-read committed files to confirm.
- Known platform limits (Rich Text Area = 32,768 chars, see [[salesforce]]) are facts to remember, not things to re-derive via scripts.
- If unsure whether content fits a limit, just attempt the real write — the error message is more authoritative than any local pre-check and costs nothing extra.
- Before reaching for anonymous Apex / temp files / shell scripts to answer a simple question, ask: "is there a direct way to just do the thing and let it tell me if it's wrong?"

## Search all name variants on a rename

When verifying a rename is complete, grep for every surface form the old name could take:

- `work-management` — hyphenated (folder path, URL slug)
- `Work Management` — title-cased in headings or prose
- `work management` — lowercase prose
- `workManagement` — camelCase (code)

A single pattern misses variants in other forms.

**Why:** During "work-management" → "project-management", an `overview.md` heading read `# Work Management App — Overview` (spaces). The initial grep searched only `work-management`, returned no matches, and gave a false "all clear." The user spotted the stale title.

**How to apply:** After any rename, grep the base words case-insensitively (e.g. `[Ww]ork.?[Mm]anagement`) in addition to the exact hyphenated form.

## Route from the record state, not the user's message

Agent role is derived from the `Work_Item__c` record returned by the pre-flight query — never from the content of the user's message. The pre-flight query is a hard gate.

**Why:** In a session where the user supplied a detailed technical problem (screenshots, tool descriptions, implementation context), the BA Agent role was missed because the message pattern-matched to a Dev Agent task. The record showed `Triage_Status__c = Not Started` on a Ticket, which unambiguously required BA Agent.

**How to apply:**

- The pre-flight query must include `RecordType.DeveloperName`.
- If `RecordType.DeveloperName = 'Ticket'` → route on `Triage_Status__c`. All other record types → route on `Status__c`.
- State the role explicitly after the query ("Record Type = Ticket, Triage_Status = Not Started → BA Agent") before proceeding.
- The user's message is input for the agent's work, not the routing signal. Full routing tables live in `agents.md`.

## Don't expand scope beyond the requested pipeline stage

A request like "go straight to code review" or "doc agent go" means: do that one pipeline stage. If a real inconsistency turns up mid-stage (e.g. a SF doc out of sync with the repo), investigate and report it with options — but don't unilaterally decide to do a full reconciliation or backfill. Ask first.

**Why:** Same discipline as record-state routing, applied to scope _within_ a role. A Docs Agent session spent significant time on an unrequested full-document backfill that also blew the Rich Text Area cap.

**How to apply:** When any pipeline stage surfaces a side issue (doc drift, stale data, missing dependency), stop and flag it with options rather than silently expanding the task. Reserve full backfills for when the user explicitly asks. For the Rich Text Area size check that goes with full-document rewrites, see [[salesforce]] and [[docs]].
