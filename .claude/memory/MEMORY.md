# Memory Index

Memory is flat — one dense file per domain, directly under `memory/`. Read [meta.md](meta.md) before creating or editing any memory.

- [meta.md](meta.md) — how to write and manage memory: dual-save both locations, no abbreviations, merge-before-create (one canonical home per fact), filename == `name:` slug, 200-line cap, what never belongs in memory

- [how_i_work.md](how_i_work.md) — behavioural rules: name the terminal; narrate before permission prompts; git status after every commit; memory-status line in agent summaries; trust your own edits (don't re-read/pre-check); search all name variants on rename; route from record state not the user's message; don't expand scope beyond the requested stage

- [salesforce.md](salesforce.md) — platform gotchas (`LEN()>0` for Rich Text Area, `cacheable` cache, LMS `APPLICATION_SCOPE`); metadata/Prettier/XML config and deploy; MCP tooling (which server owns DML, prefer-MCP, confirmation, record-creation patterns); the canonical Rich Text Area 32,768 cap and `fieldsJson` payload escaping

- [testing.md](testing.md) — LWC Jest on Windows: module mocking (imperative Apex, wire adapters, `uiRecordApi` via moduleNameMapper, schema `.default`, variant matching, wire emit) and why stubs go in `__stubs__/` not `__mocks__/`

- [docs.md](docs.md) — documentation conventions: `overview.md` vs `salesforce.md` split; backtick `__c`/`__r`/`__mdt` API names in Markdown; Salesforce is source of truth for docs (pull before edit, `Change_Log__c` only needs `Title__c`, doc inventory)

- [project.md](project.md) — ConsultantProject specifics: architecture decisions (Backlog-as-sprint, cacheable wire split, two-query hierarchy, Chapter cascade, compact cards); multi-agent SDLC pipeline (routing lives in `agents.md`); object→permission-set mapping; historical BA-agent triage design
