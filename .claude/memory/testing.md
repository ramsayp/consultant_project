---
name: testing
description: LWC Jest testing patterns that work on Windows with the sfdx-lwc-jest stack — module mocking (imperative Apex, wire adapters, uiRecordApi, schema, variant matching, wire emit) and where stub components must live
metadata:
  type: feedback
---

## Module mocking patterns

### 1. Imperative Apex functions (addComment, editComment, etc.)

Use `jest.mock` with an inline `jest.fn()` in the factory, then import directly:

```javascript
jest.mock("@salesforce/apex/WorkItemController.addComment", () => ({
  default: jest.fn(),
  __esModule: true
}));
import addComment from "@salesforce/apex/WorkItemController.addComment";
```

**Why:** The variable-capture pattern (`const mockFn = jest.fn(); jest.mock(..., () => ({ default: mockFn }))`) results in a different `jest.fn()` instance in the component vs the test, due to hoisting.

### 2. Wire Apex adapters (getComments, getActiveSprints)

Use `createApexTestWireAdapter` inside `require()` inside the factory:

```javascript
jest.mock("@salesforce/apex/WorkItemController.getComments", () => {
  const {
    createApexTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  const adapter = createApexTestWireAdapter(jest.fn());
  return { default: adapter, __esModule: true };
});
import getComments from "@salesforce/apex/WorkItemController.getComments";
```

### 3. `lightning/uiRecordApi` (createRecord, etc.)

`jest.mock('lightning/uiRecordApi', factory)` does NOT reliably intercept the component's require on Windows with the custom resolver. Use `moduleNameMapper` in `jest.config.js` instead:

```javascript
'^lightning/uiRecordApi$': '<rootDir>/__mocks__/lightning/uiRecordApi.js'
```

```javascript
// __mocks__/lightning/uiRecordApi.js
module.exports = { createRecord: jest.fn(), __esModule: true };
```

**Why:** The custom resolver (`@salesforce/sfdx-lwc-jest/src/resolver.js`) and Jest's mock registry key mismatch on Windows, so the `jest.mock()` factory doesn't intercept the component's require. `moduleNameMapper` has higher priority and always works.

### 4. `@salesforce/schema/SObject` imports (WORK_ITEM_OBJECT)

The `schemaScopedImport` transformer compiles to `require("@salesforce/schema/SObject").default`. The mock file MUST export `.default`:

```javascript
// __mocks__/@salesforce/schema.js
const schema = { objectApiName: "Work_Item__c" };
module.exports = { __esModule: true, default: schema };
```

**Why:** Without `.default`, the imported symbol is `undefined`, causing silent errors in component methods (no throw until accessed, then a TypeError in try-catch that surfaces as a "Creation failed" toast with `createRecord.mock.calls.length === 0`). It looks like a mock-sharing problem but it's a missing `.default`.

### 5. `@api variant` on lightning-button stubs

CSS attribute selectors don't work: `querySelector('lightning-button[variant="brand"]')` returns null. Use JS property matching:

```javascript
function getBrandBtn(root) {
  return [...root.querySelectorAll("lightning-button")].find(
    (b) => b.variant === "brand"
  );
}
```

### 6. `createLdsTestWireAdapter.emit(value)`

Wraps the value in `{ data: value, error: undefined }` — do NOT double-wrap:

```javascript
getObjectInfo.emit(MOCK_OBJ_INFO); // correct
getObjectInfo.emit({ data: MOCK_OBJ_INFO, error: undefined }); // WRONG
```

### 7. A new Apex import needs a physical stub file before `jest.mock` will work

`jest.mock("@salesforce/apex/Controller.newMethod", factory)` fails with `Configuration error: Could not locate module ... mapped as __mocks__/@salesforce/apex/$1.js` unless that file exists.

**Why:** `jest.config.js` maps `^@salesforce/apex/(.+)$` to `<rootDir>/__mocks__/@salesforce/apex/$1.js`. `moduleNameMapper` resolves _before_ the `jest.mock` factory is consulted, so a missing file is a hard resolution failure, not a fallback to the factory. Pattern 1 above is necessary but not sufficient on its own.

**How to apply:** whenever an LWC under test gains a new `@salesforce/apex/...` import, create the matching one-line stub in the same commit:

```javascript
// __mocks__/@salesforce/apex/WorkItemController.getCandidateParents.js
module.exports = { default: jest.fn(), __esModule: true };
```

### 8. `jest.clearAllMocks()` keeps implementations — reset defaults in `beforeEach`

`clearAllMocks` resets recorded calls, instances and results. It does **not** remove an implementation set by `mockResolvedValue` / `mockRejectedValue`, so a rejection configured in one test leaks into every test that runs afterwards.

**Why:** A `notifyRecordUpdateAvailable.mockRejectedValue(...)` in a `describe("approve")` test silently applied to every later `describe("decline")` test. Nothing went red — the component swallowed the rejection by design — so it would have quietly weakened the rest of the suite indefinitely.

**How to apply:** for any mock whose rejection path is exercised, restore the happy-path default explicitly in `beforeEach`. A green suite is not evidence that mock state is clean; leaked implementations fail silently by definition.

### 9. Asserting on toasts

The `sfdx-lwc-jest` stub dispatches a bubbling, composed `CustomEvent` named `lightning__showtoast` whose `detail` is the toast object:

```javascript
function captureToasts(el) {
  const toasts = [];
  el.addEventListener("lightning__showtoast", (e) => toasts.push(e.detail));
  return toasts;
}
```

Assert `toHaveLength(1)` alongside the title — that pins that no _second_, contradicting toast fired, which is usually the actual defect.

## Stub components go in `__stubs__/`, not `__mocks__/`

Use `__stubs__/` (not `__mocks__/`) for multi-file LWC stub components used to isolate a child component.

**Why:** jest-haste-map scans every folder named `__mocks__/` and registers module names from filenames. An LWC stub has both `ComponentName.html` and `ComponentName.js` in the same folder — haste-map sees two files with the same module name and logs a "duplicate manual mock" warning. Under `--findRelatedTests` (used by lint-staged), this causes `moduleNameMapper` resolution to fail outright with "Could not locate module." `__stubs__/` is not a special Jest folder name, so haste-map ignores it and resolution works reliably.

**How to apply:**

1. Create `__stubs__/<ComponentName>/<ComponentName>.html` and `.js`.
2. Add to `jest.config.js` `moduleNameMapper`: `"^c/<ComponentName>$": "<rootDir>/__stubs__/<ComponentName>/<ComponentName>.js"`.
3. Never put multi-file LWC stubs inside `__mocks__/`.
