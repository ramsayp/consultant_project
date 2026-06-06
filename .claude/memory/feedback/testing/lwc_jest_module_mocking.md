---
name: feedback_lwc_jest_module_mocking
description: "LWC Jest testing patterns for mocking modules — what works and what doesn't on Windows with the sfdx-lwc-jest stack"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1c94bb9e-6fb0-4f18-bc65-65b673749edf
---

## Key patterns for mocking LWC imports in Jest

### 1. Imperative Apex functions (addComment, editComment, etc.)

Use `jest.mock` with inline `jest.fn()` in the factory, then import directly:

```javascript
jest.mock("@salesforce/apex/WorkItemController.addComment", () => ({
  default: jest.fn(),
  __esModule: true
}));
import addComment from "@salesforce/apex/WorkItemController.addComment";
```

**Why:** Variable-capture pattern (`const mockFn = jest.fn(); jest.mock(..., () => ({ default: mockFn }))`) results in a different jest.fn() instance in the component vs the test due to hoisting.

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

`jest.mock('lightning/uiRecordApi', factory)` does NOT reliably intercept the component's require on Windows with custom resolver. Use `moduleNameMapper` in jest.config.js instead:

```javascript
'^lightning/uiRecordApi$': '<rootDir>/__mocks__/lightning/uiRecordApi.js'
```

And the mock file:

```javascript
module.exports = { createRecord: jest.fn(), __esModule: true };
```

**Why:** The custom resolver (`@salesforce/sfdx-lwc-jest/src/resolver.js`) and Jest's mock registry key mismatch on Windows, so jest.mock() factory doesn't intercept the component's require. moduleNameMapper has higher priority and always works.

### 4. `@salesforce/schema/SObject` imports (WORK_ITEM_OBJECT)

The `schemaScopedImport` transformer compiles to `require("@salesforce/schema/SObject").default`. The mock file MUST export `.default`:

```javascript
// __mocks__/@salesforce/schema.js
const schema = { objectApiName: "Work_Item__c" };
module.exports = { __esModule: true, default: schema };
```

**Why:** Without `.default`, `WORK_ITEM_OBJECT` is `undefined`, causing silent errors in component methods (no throw until accessed, but then TypeError in try-catch that shows as "Creation failed" toast, with `createRecord.mock.calls.length === 0`).

### 5. `@api variant` on lightning-button stubs

CSS attribute selectors don't work: `querySelector('lightning-button[variant="brand"]')` returns null.
Use JS property matching:

```javascript
function getBrandBtn(root) {
  return [...root.querySelectorAll("lightning-button")].find(
    (b) => b.variant === "brand"
  );
}
```

### 6. `createLdsTestWireAdapter.emit(value)`

Wraps value in `{ data: value, error: undefined }` — do NOT double-wrap:

```javascript
getObjectInfo.emit(MOCK_OBJ_INFO); // correct
getObjectInfo.emit({ data: MOCK_OBJ_INFO, error: undefined }); // WRONG — double-wraps
```

**How to apply:** When writing LWC Jest tests in this project, use these patterns. The schema .default issue will silently cause "Creation failed" toast in tests with createRecord, making it look like a mock-sharing problem when it's actually a missing .default.
