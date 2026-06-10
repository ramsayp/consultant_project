---
name: lwc-stub-pattern
description: LWC Jest stub components for child component isolation must go in __stubs__/, not __mocks__/
metadata:
  type: feedback
---

Use `__stubs__/` (not `__mocks__/`) for multi-file LWC stub components.

**Why:** jest-haste-map scans every folder named `__mocks__/` and registers module names from filenames. An LWC stub has both `ComponentName.html` and `ComponentName.js` in the same folder — haste-map sees two files with the same module name and logs a "duplicate manual mock" warning. Under `--findRelatedTests` (used by lint-staged), this causes the moduleNameMapper resolution to fail outright with "Could not locate module".

`__stubs__/` is not a special Jest folder name, so haste-map ignores it entirely and the moduleNameMapper resolution works reliably.

**How to apply:** When adding a stub LWC component for testing:

1. Create `__stubs__/<ComponentName>/<ComponentName>.html` and `.js`
2. Add to `jest.config.js` moduleNameMapper: `"^c/<ComponentName>$": "<rootDir>/__stubs__/<ComponentName>/<ComponentName>.js"`
3. Never put multi-file LWC stubs inside `__mocks__/`

Related: [[lwc-jest-module-mocking-patterns]]
