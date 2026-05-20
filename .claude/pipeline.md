# Pipeline — Commands and Workflow

## Test

```bash
npx jest --no-coverage          # run all LWC Jest tests (39 tests across 3 suites)
npx jest --no-coverage <path>   # run a single test file
```

## Deploy

```bash
# Apex classes only (faster)
sf project deploy start --source-dir force-app/main/default/classes/workitem --ignore-conflicts

# All metadata
sf project deploy start --source-dir force-app --ignore-conflicts
```

> `--ignore-conflicts` is needed because the org does not have source tracking enabled.

## Commit

The pre-commit hook (lint-staged) runs automatically on every commit:

1. **Prettier** — formats all staged files
2. **ESLint** — lints LWC JS files
3. **Jest** — runs tests related to staged files

Never use `--no-verify`. If the hook fails, fix the underlying issue.

## Push

`git commit` and `git push` are separate steps. Always push after committing.

## Org

- Alias: `paulsbramsay.c3a6fa618fff@agentforce.com`
- `sf org open` to open in browser
