#!/usr/bin/env node
/*
 * docs-check.js — drift detector for repo Markdown vs Salesforce Documentation__c.
 *
 * Each doc lives in two places: a Markdown file in docs/ and a Quill-flavoured
 * HTML body in Documentation__c.Body__c. This script decides whether they are in
 * sync by comparing NORMALISED PLAIN TEXT extracted from both — never raw markup,
 * never a bare character-count delta.
 *
 * Why plain text: drift detection does not need the Markdown→Quill converter, so
 * it is format-agnostic and copes with the technical guide's tables and
 * <pre class="ql-syntax"> blocks, which the converter cannot round-trip. The
 * normalisation deliberately encodes three pitfalls found the hard way (see
 * --selftest): astral-plane emoji entities, underscores in API names, and the
 * mismatch between HTML list items and Markdown ordered-list items.
 *
 * Usage:
 *   node scripts/docs-check.js                 # report drift, exit 1 if any
 *   node scripts/docs-check.js --report        # report drift, always exit 0
 *   node scripts/docs-check.js --assert        # terse, exit 1 if any drift
 *   node scripts/docs-check.js --doc <id>      # limit to one Claude_Doc_Id__c
 *   node scripts/docs-check.js --org <alias>   # target a specific org
 *   node scripts/docs-check.js --selftest      # run normalisation fixtures
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Repo file ↔ Claude_Doc_Id__c (an External ID on Documentation__c). Keep in step
// with the mapping table in .claude/agents/docs-agent.md and memory/docs.md.
const DOC_MAP = [
  [
    "docs/technical/project-management-guide.md",
    "project-management-technical"
  ],
  ["docs/technical/documentation-guide.md", "documentation-technical"],
  ["docs/technical/mcp-setup-guide.md", "mcp-setup-technical"],
  ["docs/user/project-management-guide.md", "project-management-user"],
  ["docs/user/documentation-guide.md", "documentation-user"]
];

const REPO_ROOT = path.resolve(__dirname, "..");

// ── Normalisation ───────────────────────────────────────────────────────────

const NAMED_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…"
};

// Decode HTML entities, INCLUDING astral-plane numeric entities such as
// &#128308; (🔴) that Quill uses for emoji. Unknown named entities are left
// literal rather than blanked — blanking them once hid emoji that were present.
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => safeCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => safeCodePoint(parseInt(n, 16)))
    .replace(/&[a-zA-Z]+;/g, (m) => NAMED_ENTITIES[m] ?? m);
}

function safeCodePoint(cp) {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

// Quill HTML → plain text. Block boundaries (open or close) become spaces so
// adjacent list items and paragraphs never fuse into one run-on token; inline
// tags (code, strong, em, a…) are removed WITHOUT a space, so punctuation stays
// attached to its word — otherwise `<code>Sprint__c</code>,` would tokenise as
// `Sprint__c ,` and read as false drift against the Markdown `Sprint__c,`.
const BLOCK_TAG =
  /<\/?(p|h[1-6]|li|tr|td|th|pre|div|ul|ol|table|blockquote|hr)(\s[^>]*)?\/?>/gi;
function htmlToText(html) {
  const withBreaks = html
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, " ") // drop code/diagram blocks (see note)
    .replace(BLOCK_TAG, " ")
    .replace(/<br\s*\/?>/gi, " ");
  return canonicalise(decodeEntities(withBreaks.replace(/<[^>]+>/g, "")));
}

// Markdown → plain text. Strips block and inline syntax but NEVER a lone
// underscore — that destroys API names like Work_Item__c. Fenced code blocks are
// dropped to mirror htmlToText dropping <pre> (see note below). Inline code span
// CONTENT is protected verbatim while syntax is stripped, so a literal asterisk
// like `ProjectMCP*` survives instead of being eaten as an emphasis mark.
function mdToText(md) {
  const stash = [];
  let s = md
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks (mirror <pre> in HTML)
    .replace(/`([^`]+)`/g, (_, c) => `\x00${stash.push(c) - 1}\x00`); // protect code spans
  s = s
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // ATX headings
    .replace(/^\s*>\s?/gm, "") // blockquote markers
    .replace(/^\s*[-*+]\s+/gm, "") // bullet markers
    .replace(/^\s*\d+\.\s+/gm, "") // ordered-list markers
    .replace(/^\s*\|.*\|\s*$/gm, (m) => m.replace(/\|/g, " ")) // table rows
    .replace(/^\s*[-|: ]{3,}\s*$/gm, " ") // table rules / hr
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:)]|$)/g, "$1$2") // italic _x_ only
    .replace(/\\([!-/:-@[-`{-~])/g, "$1") // CommonMark backslash escapes (\_ \* \.)
    .replace(/[`*]/g, ""); // stray emphasis marks outside code spans
  s = s.replace(/\x00(\d+)\x00/g, (_, i) => stash[Number(i)]); // restore code spans
  return canonicalise(s);
}

// Shared canonicalisation applied to both sides: fold typographic quotes to their
// ASCII form so curly-vs-straight quotes never read as content drift. Note: code
// and diagram blocks (Markdown fences / Quill <pre>) are deliberately excluded
// from the comparison — their whitespace and escaping diverge too much between the
// two formats to diff reliably; this check covers prose, which is where drift hides.
function canonicalise(text) {
  return text.replace(/[‘’‚]/g, "'").replace(/[“”„]/g, '"');
}

function words(text) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

// ── Diff ────────────────────────────────────────────────────────────────────

// Word-level longest-common-subsequence, returned as differing runs. O(n*m) DP
// is comfortable at a few thousand words per doc.
function wordDiff(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push(["sf", a[i++]]);
    } else {
      ops.push(["repo", b[j++]]);
    }
  }
  while (i < n) ops.push(["sf", a[i++]]);
  while (j < m) ops.push(["repo", b[j++]]);

  const runs = [];
  for (const [side, w] of ops) {
    const last = runs[runs.length - 1];
    if (last && last.side === side) last.words.push(w);
    else runs.push({ side, words: [w] });
  }
  return runs;
}

// ── Salesforce access ───────────────────────────────────────────────────────

function fetchSfBody(claudeDocId, org) {
  // A double-quoted query with a single-quoted literal inside is parsed the same
  // way by both cmd.exe and /bin/sh, so one command string works cross-platform.
  // claudeDocId is a kebab-case External ID with no shell-special characters.
  const query = `SELECT Body__c FROM Documentation__c WHERE Claude_Doc_Id__c = '${claudeDocId}'`;
  const cmd =
    `sf data query --query "${query}" --json` +
    (org ? ` --target-org "${org}"` : "");
  let raw;
  try {
    raw = execSync(cmd, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch (e) {
    // sf --json still prints a JSON error payload to stdout on failure
    raw = e.stdout;
    if (!raw)
      throw new Error(
        `sf data query failed for '${claudeDocId}': ${e.message}`
      );
  }
  const parsed = JSON.parse(raw.replace(/^﻿/, ""));
  if (parsed.status !== 0) {
    throw new Error(
      `sf data query error for '${claudeDocId}': ${parsed.message || "unknown"}`
    );
  }
  const records = parsed.result.records;
  if (!records || records.length === 0) return null;
  if (records.length > 1) {
    throw new Error(`Claude_Doc_Id__c '${claudeDocId}' matched >1 record`);
  }
  return records[0].Body__c || "";
}

// ── Comparison ──────────────────────────────────────────────────────────────

function compareDoc(repoPath, claudeDocId, org) {
  const absPath = path.join(REPO_ROOT, repoPath);
  if (!fs.existsSync(absPath)) {
    return { status: "missing-repo", repoPath, claudeDocId };
  }
  const sfBody = fetchSfBody(claudeDocId, org);
  if (sfBody === null) {
    return { status: "missing-sf", repoPath, claudeDocId };
  }
  const repoWords = words(mdToText(fs.readFileSync(absPath, "utf8")));
  const sfWords = words(htmlToText(sfBody));
  const runs = wordDiff(sfWords, repoWords).filter((r) => r.words.length > 0);
  return {
    status: runs.length === 0 ? "in-sync" : "drift",
    repoPath,
    claudeDocId,
    repoWords: repoWords.length,
    sfWords: sfWords.length,
    runs
  };
}

// ── Reporting ───────────────────────────────────────────────────────────────

function printResult(res, terse) {
  const tag = {
    "in-sync": "OK  ",
    drift: "DRIFT",
    "missing-repo": "MISS",
    "missing-sf": "MISS"
  }[res.status];
  if (res.status === "in-sync") {
    if (!terse)
      console.log(`  ${tag} ${res.claudeDocId} (${res.sfWords} words)`);
    return;
  }
  if (res.status === "missing-repo") {
    console.log(
      `  ${tag} ${res.claudeDocId} — repo file not found: ${res.repoPath}`
    );
    return;
  }
  if (res.status === "missing-sf") {
    console.log(`  ${tag} ${res.claudeDocId} — no Documentation__c record`);
    return;
  }
  console.log(
    `  ${tag} ${res.claudeDocId} — ${res.runs.length} differing run(s), SF ${res.sfWords}w vs repo ${res.repoWords}w`
  );
  if (terse) return;
  for (const run of res.runs) {
    const where = run.side === "repo" ? "repo-only" : "SF-only";
    const text = run.words.join(" ");
    console.log(
      `      [${where}] (${run.words.length}w) ${text.length > 200 ? text.slice(0, 200) + "…" : text}`
    );
  }
}

// ── Self-test ───────────────────────────────────────────────────────────────

// Fixtures encode the exact failures from ORG-00008: each pair MUST normalise
// equal (or, for the last, produce exactly one repo-only run).
function runSelfTest() {
  const cases = [
    {
      name: "underscore API names survive normalisation",
      sf: "<p>Key fields: <code>Work_Item__c</code>, <code>Sprint__c</code>.</p>",
      md: "Key fields: `Work_Item__c`, `Sprint__c`.",
      expect: 0
    },
    {
      name: "astral-plane emoji entities decode, not blanked",
      sf: "<p>&#128308; Critical &#128993; High</p>",
      md: "🔴 Critical 🟡 High",
      expect: 0
    },
    {
      name: "HTML list items match Markdown ordered list",
      sf: "<ol><li>To Do</li><li>On Hold</li><li>In Progress</li></ol>",
      md: "1. To Do\n2. On Hold\n3. In Progress",
      expect: 0
    },
    {
      name: "italic markers strip without touching underscores",
      sf: "<li><strong>To Do</strong> <em>(Dev Agent)</em> — ready</li>",
      md: "- **To Do** _(Dev Agent)_ — ready",
      expect: 0
    },
    {
      name: "CommonMark backslash-escaped underscores match bare API names",
      // Prettier escapes a BARE Folder__c in prose to Folder\_\_c; inside a code
      // span backslashes are literal, so the escaped form only appears bare.
      sf: "<p>The Folder__c object.</p>",
      md: "The Folder\\_\\_c object.",
      expect: 0
    },
    {
      name: "code/diagram blocks excluded on both sides",
      sf: '<p>Setup:</p><pre class="ql-syntax">DIAGRAM ALPHA</pre><p>done.</p>',
      md: "Setup:\n\n```\nDIAGRAM BETA\n```\n\ndone.",
      expect: 0
    },
    {
      name: "curly and straight quotes are folded together",
      sf: "<p>Name it “Sprint 4” not ‘temp’.</p>",
      md: "Name it \"Sprint 4\" not 'temp'.",
      expect: 0
    },
    {
      name: "literal asterisk inside an inline code span survives",
      sf: "<p>Deploy the <code>ProjectMCP*</code> classes.</p>",
      md: "Deploy the `ProjectMCP*` classes.",
      expect: 0
    },
    {
      name: "blockquote markers strip cleanly",
      sf: "<p>Note: tokens expire.</p>",
      md: "> Note: tokens expire.",
      expect: 0
    },
    {
      name: "genuine drift surfaces as one repo-only run",
      sf: "<p>The Backlog holds unscheduled work.</p>",
      md: "The Backlog holds unscheduled work. It never sweeps in completed sprints.",
      expect: 1
    }
  ];

  let failures = 0;
  for (const c of cases) {
    const runs = wordDiff(
      words(htmlToText(c.sf)),
      words(mdToText(c.md))
    ).filter((r) => r.words.length > 0);
    const ok = runs.length === c.expect;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${c.name} (expected ${c.expect} run(s), got ${runs.length})`
    );
    if (!ok) {
      failures++;
      for (const r of runs)
        console.log(`         [${r.side}] ${r.words.join(" ")}`);
    }
  }
  console.log(
    failures === 0 ? "\nSelf-test passed." : `\nSelf-test FAILED (${failures}).`
  );
  return failures === 0 ? 0 : 1;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { mode: "default", doc: null, org: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--report") opts.mode = "report";
    else if (a === "--assert") opts.mode = "assert";
    else if (a === "--selftest") opts.mode = "selftest";
    else if (a === "--help" || a === "-h") opts.mode = "help";
    else if (a === "--doc") opts.doc = argv[++i];
    else if (a === "--org") opts.org = argv[++i];
    else {
      console.error(`Unknown argument: ${a}`);
      opts.mode = "help";
    }
  }
  return opts;
}

const HELP = `docs-check — repo Markdown vs Salesforce Documentation__c drift check

  node scripts/docs-check.js [--report|--assert] [--doc <id>] [--org <alias>]
  node scripts/docs-check.js --selftest

  (default)    report drift, exit 1 if any found
  --report     report drift, always exit 0
  --assert     terse output, exit 1 if any drift
  --doc <id>   check only one Claude_Doc_Id__c
  --org <a>    target org alias (defaults to the default org)
  --selftest   run normalisation fixtures (no org access)`;

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.mode === "help") {
    console.log(HELP);
    process.exit(0);
  }
  if (opts.mode === "selftest") {
    process.exit(runSelfTest());
  }

  let docs = DOC_MAP;
  if (opts.doc) {
    docs = DOC_MAP.filter(([, id]) => id === opts.doc);
    if (docs.length === 0) {
      console.error(`No doc with Claude_Doc_Id__c '${opts.doc}'. Known:`);
      for (const [, id] of DOC_MAP) console.error(`  ${id}`);
      process.exit(2);
    }
  }

  const terse = opts.mode === "assert";
  if (!terse)
    console.log(`Checking ${docs.length} document(s) against Salesforce…\n`);

  let drifted = 0;
  let errored = 0;
  for (const [repoPath, claudeDocId] of docs) {
    let res;
    try {
      res = compareDoc(repoPath, claudeDocId, opts.org);
    } catch (e) {
      errored++;
      console.error(`  ERR  ${claudeDocId} — ${e.message}`);
      continue;
    }
    if (res.status === "drift" || res.status.startsWith("missing")) drifted++;
    printResult(res, terse);
  }

  const problems = drifted + errored;
  if (!terse) {
    console.log(
      `\n${problems === 0 ? "All documents in sync." : `${problems} document(s) need attention.`}`
    );
  }
  if (opts.mode === "report") process.exit(0);
  process.exit(problems === 0 ? 0 : 1);
}

if (require.main === module) main();

module.exports = {
  decodeEntities,
  htmlToText,
  mdToText,
  words,
  wordDiff,
  compareDoc
};
