# Memory Index

## feedback/

- [App docs structure convention](feedback/app_docs_structure.md) — overview.md = architecture + diagram; salesforce.md = field tables + record types; overview.md @-imported, salesforce.md is reference only
- [LWC Jest module mocking patterns](feedback/lwc_jest_module_mocking.md) — what works on Windows with sfdx-lwc-jest (imperative vs wire, moduleNameMapper, schema .default)
- [Search all name variants on rename](feedback/search_variations.md) — grep hyphenated, spaced, title-cased, and camelCased forms; one pattern misses others
- [Prettier + VS Code XML config for Salesforce](feedback/sf_metadata_prettier_xml.md) — exclude xml from Prettier; noGrammar+downloadExternalResources+validation.filters fix; systemId:'' anti-pattern; targetNamespace cascade bug; required field permission set error
- [Lock app nav personalisation + Lightning Record Pages](feedback/app_nav_personalisation.md) — always set isNavPersonalizationDisabled:true on every Lightning App; always create a FlexiPage for every new custom object; human must set org default in Lightning App Builder after deploy
- [MCP minimal access principle](feedback/mcp_minimal_access.md) — only activate MCP servers actively needed; deactivate everything else; bare minimal access
- [Always name the terminal](feedback/be_specific_about_terminal.md) — never say "run in the terminal"; always specify PowerShell in VS Code, Bash tool, or Claude Code chat
- [git status after every commit](feedback/git_status_after_commit.md) — run git status after every commit; flag if ahead of origin (push needed) or behind (investigate); offer to commit after any approved file change
- [Memory dual-save rule](feedback/memory_dual_save.md) — always write memory files to both machine path and .claude/memory/ in repo; repo copy survives machine reformat; restore by copying back on new machine

## project/

- [Salesforce is source of truth for docs](project/sf_source_of_truth.md) — always pull from SF before editing docs/technical/ or docs/user/; update both repo and SF record after changes; current doc IDs listed here

## reference/

- [Salesforce Hosted MCP setup](reference/salesforce_hosted_mcp_setup.md) — complete working setup for sobject-all → Claude Code: ECA metadata, OAuth settings (JWT required, no secrets, PKCE on, callback port 38000), claude mcp add command, Windows duplicate key bug, and all dead ends
