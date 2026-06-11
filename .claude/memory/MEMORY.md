# Memory Index

## feedback/

### Tooling & efficiency

- [Trust your own edits](feedback/tooling/trust_your_own_edits.md) — don't re-read files you just wrote, don't stage files to pre-check length limits, don't run anonymous Apex/temp scripts to answer simple questions — just attempt the operation
- [Prefer MCP for all SF data ops](feedback/tooling/prefer_mcp_over_anon_apex.md) — MCP is the first and only choice for any SF read/write; not just over Apex scripts but also over PowerShell REST API and sf CLI data commands; createSobjectRecord handles large string payloads fine
- [MCP minimal access principle](feedback/tooling/mcp_minimal_access.md) — only activate MCP servers actively needed; deactivate everything else; bare minimal access
- [Search all name variants on rename](feedback/tooling/search_variations.md) — grep hyphenated, spaced, title-cased, and camelCased forms; one pattern misses others
- [MCP read tools need no confirmation](feedback/tooling/mcp_read_no_confirm.md) — soqlQuery, getObjectSchema, getRelatedRecords etc. always fire without asking; only write/mutate ops need narration
- [MCP createSobjectRecord patterns](feedback/tooling/mcp_sobject_create_patterns.md) — RecordType: always pre-query for Id (relationship notation rejected); Rich Text Area fields: create with metadata only, then updateSobjectRecord separately (SF silently drops large RTA content on create)

### Communication & transparency

- [Always name the terminal](feedback/communication/be_specific_about_terminal.md) — never say "run in the terminal"; always specify PowerShell in VS Code, Bash tool, or Claude Code chat
- [Narrate before permission prompts](feedback/communication/narrate_before_permission_prompts.md) — say what a Bash/SOQL/MCP call does and why, immediately before it fires — the Yes/No dialog shows raw mechanics only, user can't judge intent from a query string
- [git status after every commit](feedback/communication/git_status_after_commit.md) — run git status after every commit; flag if ahead of origin (push needed) or behind (investigate); offer to commit after any approved file change
- [Memory update confirmation in summaries](feedback/communication/memory_update_confirmation.md) — every agent task summary must end with a memory line: either what was saved, or explicit confirmation that no update was needed and why

### Salesforce metadata & deploy conventions

- [Prettier + VS Code XML config for Salesforce](feedback/salesforce/sf_metadata_prettier_xml.md) — exclude xml from Prettier; noGrammar+downloadExternalResources+validation.filters fix; systemId:'' anti-pattern; targetNamespace cascade bug; required field permission set error
- [Lock app nav personalisation + Lightning Record Pages](feedback/salesforce/app_nav_personalisation.md) — always set isNavPersonalizationDisabled:true on every Lightning App; always create a FlexiPage for every new custom object; human must set org default in Lightning App Builder after deploy

### Documentation & Markdown conventions

- [App docs structure convention](feedback/docs/app_docs_structure.md) — overview.md = architecture + diagram; salesforce.md = field tables + record types; overview.md @-imported, salesforce.md is reference only
- [Backtick `__c`/`__r`/`__mdt` API names in Markdown](feedback/docs/markdown_double_underscore_api_names.md) — CommonMark parses double-underscore as bold; bare `Field__c` mentions get mangled by Prettier/GitHub — always wrap in backticks (not a Prettier bug, spec behavior)

### LWC testing

- [LWC Jest module mocking patterns](feedback/testing/lwc_jest_module_mocking.md) — what works on Windows with sfdx-lwc-jest (imperative vs wire, moduleNameMapper, schema .default)
- [LWC stub components go in **stubs**/](feedback/testing/lwc_stub_pattern.md) — multi-file LWC stubs (.html+.js) must live in **stubs**/, not **mocks**/; haste-map duplicate-mock bug breaks lint-staged --findRelatedTests

### Memory system

- [Memory dual-save rule](feedback/meta/memory_dual_save.md) — always write memory files to both machine path and .claude/memory/ in repo; repo copy survives machine reformat; restore by copying back on new machine

## project/

- [Agent pipeline architecture](project/agent_pipeline.md) — formalised multi-agent SDLC pipeline; BA→Dev→Code Review→Human Test→Docs→Release; routing rules, spike handling, Apex layer standards
- [Salesforce is source of truth for docs](project/sf_source_of_truth.md) — pull from SF before editing docs/; update repo+SF+Change_Log after; only `Title__c` required on `Change_Log__c`, don't hunt for a `Work_Item__c` to link; Rich Text Area cap is a fixed 32,768 (don't pre-check)
- [BA agent triage design](project/ba_agent_triage_design.md) — superseded by agent_pipeline.md for architecture; still has component-level scaffolding detail (Ticket record type, Triage view, Apex+LWC approval)
- [Permission set mapping](project/permission_set_mapping.md) — which permission set file to update per object; editable vs readable rules; required field restriction; alphabetical ordering requirement

## reference/

- [Salesforce Hosted MCP setup](reference/salesforce_hosted_mcp_setup.md) — complete working setup for sobject-all → Claude Code: ECA metadata, OAuth settings (JWT required, no secrets, PKCE on, callback port 38000), claude mcp add command, Windows duplicate key bug, and all dead ends
