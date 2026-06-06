# Memory Index

## feedback/

### Tooling & efficiency

- [Trust your own edits](feedback/tooling/trust_your_own_edits.md) — don't re-read files you just wrote, don't stage files to pre-check length limits, don't run anonymous Apex/temp scripts to answer simple questions — just attempt the operation
- [Prefer MCP over anonymous Apex](feedback/tooling/prefer_mcp_over_anon_apex.md) — one-time data migrations: use soqlQuery+updateSobjectRecord, not .apex script files via sf apex run; avoids temp files in the repo entirely
- [MCP minimal access principle](feedback/tooling/mcp_minimal_access.md) — only activate MCP servers actively needed; deactivate everything else; bare minimal access
- [Search all name variants on rename](feedback/tooling/search_variations.md) — grep hyphenated, spaced, title-cased, and camelCased forms; one pattern misses others

### Communication & transparency

- [Always name the terminal](feedback/communication/be_specific_about_terminal.md) — never say "run in the terminal"; always specify PowerShell in VS Code, Bash tool, or Claude Code chat
- [Narrate before permission prompts](feedback/communication/narrate_before_permission_prompts.md) — say what a Bash/SOQL/MCP call does and why, immediately before it fires — the Yes/No dialog shows raw mechanics only, user can't judge intent from a query string
- [git status after every commit](feedback/communication/git_status_after_commit.md) — run git status after every commit; flag if ahead of origin (push needed) or behind (investigate); offer to commit after any approved file change

### Salesforce metadata & deploy conventions

- [Prettier + VS Code XML config for Salesforce](feedback/salesforce/sf_metadata_prettier_xml.md) — exclude xml from Prettier; noGrammar+downloadExternalResources+validation.filters fix; systemId:'' anti-pattern; targetNamespace cascade bug; required field permission set error
- [Lock app nav personalisation + Lightning Record Pages](feedback/salesforce/app_nav_personalisation.md) — always set isNavPersonalizationDisabled:true on every Lightning App; always create a FlexiPage for every new custom object; human must set org default in Lightning App Builder after deploy

### Documentation & Markdown conventions

- [App docs structure convention](feedback/docs/app_docs_structure.md) — overview.md = architecture + diagram; salesforce.md = field tables + record types; overview.md @-imported, salesforce.md is reference only
- [Backtick `__c`/`__r`/`__mdt` API names in Markdown](feedback/docs/markdown_double_underscore_api_names.md) — CommonMark parses double-underscore as bold; bare `Field__c` mentions get mangled by Prettier/GitHub — always wrap in backticks (not a Prettier bug, spec behavior)

### LWC testing

- [LWC Jest module mocking patterns](feedback/testing/lwc_jest_module_mocking.md) — what works on Windows with sfdx-lwc-jest (imperative vs wire, moduleNameMapper, schema .default)

### Memory system

- [Memory dual-save rule](feedback/meta/memory_dual_save.md) — always write memory files to both machine path and .claude/memory/ in repo; repo copy survives machine reformat; restore by copying back on new machine

## project/

- [Salesforce is source of truth for docs](project/sf_source_of_truth.md) — pull from SF before editing docs/; update repo+SF+Change_Log after; only `Title__c` required on `Change_Log__c`, don't hunt for a `Work_Item__c` to link; Rich Text Area cap is a fixed 32,768 (don't pre-check)

## reference/

- [Salesforce Hosted MCP setup](reference/salesforce_hosted_mcp_setup.md) — complete working setup for sobject-all → Claude Code: ECA metadata, OAuth settings (JWT required, no secrets, PKCE on, callback port 38000), claude mcp add command, Windows duplicate key bug, and all dead ends
