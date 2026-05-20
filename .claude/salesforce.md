# Salesforce — Org and Project Config

## Org

- Alias: `paulsbramsay.c3a6fa618fff@agentforce.com`
- API version: **66.0** (set in `sfdx-project.json`)
- No source tracking — always use `--ignore-conflicts` on deploy

## .forceignore

`**/lwc/**/__tests__/**` excludes LWC Jest test files from deployment.
**Not** `**/__tests__/**` — Apex test classes also live in `__tests__/` subfolders and must deploy.

## Deploying Apex test classes

The Apex test class (`WorkItemController_Test.cls`) lives in:
`force-app/main/default/classes/workitem/__tests__/`

Deploy the whole `workitem/` folder to pick it up:

```bash
sf project deploy start --source-dir force-app/main/default/classes/workitem --ignore-conflicts
```

## VS Code

`.vscode/settings.json` maps `**/__tests__/**/*.test.js` → `javascript` language mode
to prevent the LWC language server (LWC1702) from parsing Jest test files as components.

The `jsconfig.json` in `force-app/main/default/lwc/` excludes `**/__tests__/**` for the same reason.
