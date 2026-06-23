---
name: large_rta_payload_escaping
description: "how to reliably write large Rich Text Area content (10K+ chars) via salesforce-project-doc MCP create/update tools without manual JSON-escaping errors"
metadata:
  type: feedback
---

**Rule:** Never hand-type a large (1K+ char) HTML/RTA string directly into a `fieldsJson` tool-call parameter. Generate it programmatically and verify the escaping round-trips before sending.

**Why:** `fieldsJson` is a string parameter whose _content_ is itself parsed as JSON by the underlying tool (double JSON encoding: the tool-call arguments are JSON, and `fieldsJson`'s value is JSON text). To get a literal `"` into the final field value, the tool-call source needs `\\\"` (4 chars). To get a literal newline, it needs `\\n` (3 chars) — a bare `\n` or `\"` gets consumed by the outer parse and produces either a raw control character (illegal in JSON) or a premature string terminator. Manually tracking this escaping depth across a 19K-character payload caused 4+ failed attempts in one session, each with a cryptic parser error (`Illegal unquoted character`, `Unexpected character... was expecting comma`) that didn't point at the real cause.

**How to apply:**

1. Write the target HTML/content to a local scratch file with the `Write` tool (preserves literal characters exactly, no shell-escaping risk).
2. Avoid raw newlines inside the content if possible — replace them with the HTML entity `&#10;` before JSON-encoding; this sidesteps the newline-escaping problem entirely (no functional difference when rendered).
3. Build the payload via a small Node script: `JSON.stringify({ Field__c: html })` (= STRING_B), sanity-check with `JSON.parse(STRING_B)`, then `JSON.stringify(STRING_B).slice(1, -1)` to get the exact text to paste as the `fieldsJson` value.
4. Read that generated file with `Read` and paste its _exact_ content into the tool call — do not retype, "clean up," or substitute any character (especially em-dashes, quotes) by hand. Retyping from memory is what caused repeated failures even after the correct escaping pattern was known.
5. If unsure whether the escaping theory is right, validate with a tiny isolated test first (e.g. update a scratch field with a 20-char string containing a quote) before risking the full payload.
6. Delete scratch files after use — don't leave `.tmp-*` files in the repo.

See also [[project_mcp_server_name]] for which MCP server owns this DML, and [[markdown_double_underscore_api_names]] for a related bare-field-name corruption gotcha in the _source_ Markdown before it ever reaches this escaping step.
