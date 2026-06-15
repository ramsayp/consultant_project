# Memory Index

## feedback/

### Tooling & efficiency

- [Trust your own edits](feedback/tooling/trust_your_own_edits.md) — don't re-read files you just wrote, don't stage files to pre-check length limits, don't run anonymous Apex/temp scripts to answer simple questions — just attempt the operation
- [MCP usage rules](feedback/tooling/mcp_usage.md) — reads fire without asking, writes need narration; always prefer MCP over Apex scripts or REST workarounds; Record Type pre-query pattern; Rich Text Area two-step create pattern
- [Search all name variants on rename](feedback/tooling/search_variations.md) — grep hyphenated, spaced, title-cased, and camelCased forms; one pattern misses others

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

### Agent routing

- [Route from record state, not user message](feedback/agents/routing_from_record_state.md) — pre-flight is a hard gate; if Record Type = Ticket route on Triage_Status**c, otherwise route on Status**c; never from user message content

### Memory system

- [Memory system rules](feedback/meta/memory_system.md) — dual-save both locations every time; no abbreviations; merge before create; one file per domain; 200-line MEMORY.md cap; what never belongs in memory

## project/

- [Agent pipeline architecture](project/agent_pipeline.md) — formalised multi-agent SDLC pipeline; BA→Dev→Code Review→Human Test→Docs→Release; routing rules, spike handling, Apex layer standards
- [Salesforce is source of truth for docs](project/sf_source_of_truth.md) — pull from SF before editing docs/; update repo+SF+Change_Log after; only `Title__c` required on `Change_Log__c`, don't hunt for a `Work_Item__c` to link; Rich Text Area cap is a fixed 32,768 (don't pre-check)
- [BA agent triage design](project/ba_agent_triage_design.md) — superseded by agent_pipeline.md for architecture; still has component-level scaffolding detail (Ticket record type, Triage view, Apex+LWC approval)
- [Permission set mapping](project/permission_set_mapping.md) — which permission set file to update per object; editable vs readable rules; required field restriction; alphabetical ordering requirement

## reference/

- [Salesforce Custom MCP setup](reference/salesforce_hosted_mcp_setup.md) — custom salesforce-project-doc server (replaces deactivated sobject-all): 6-object allowlist, 7 Apex tools, manual oauth block, tengu_mcp_retry_failed_remote, Windows key bug, all dead ends
