# Skill — Writing LWC Jest Tests

## File location

`force-app/main/default/lwc/<component>/__tests__/<component>.test.js`

Run: `npx jest --no-coverage`

## Mock patterns

All `jest.mock()` calls must be at the top of the file (Jest hoists them).

### Imperative Apex (addComment, createRecord, etc.)

```javascript
jest.mock("@salesforce/apex/WorkItemController.addComment", () => ({
  default: jest.fn(),
  __esModule: true
}));
import addComment from "@salesforce/apex/WorkItemController.addComment";
// In test: addComment.mockResolvedValue(result);
```

### Wire Apex adapters (getComments, getActiveSprints)

```javascript
jest.mock("@salesforce/apex/WorkItemController.getComments", () => {
  const {
    createApexTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  return { default: createApexTestWireAdapter(jest.fn()), __esModule: true };
});
import getComments from "@salesforce/apex/WorkItemController.getComments";
// In test: getComments.emit(data);   ← wraps in { data, error } automatically
```

### `lightning/uiRecordApi` (createRecord, updateRecord)

Use `moduleNameMapper` in `jest.config.js` — do NOT use `jest.mock()`:

```javascript
// jest.config.js already configured — just import directly:
import { createRecord } from "lightning/uiRecordApi";
// In test: createRecord.mockResolvedValue({ id: 'new001' });
```

### `@salesforce/schema/SObject`

Already mapped in `jest.config.js`. The mock at `__mocks__/@salesforce/schema.js` exports:

```javascript
{ __esModule: true, default: { objectApiName: 'Work_Item__c' } }
```

### `lightning/uiObjectInfoApi`

Already handled by `@salesforce/sfdx-lwc-jest`. Use `getObjectInfo.emit(data)`.

## Flushing async operations

```javascript
const flushAllPromises = () =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());

// In test:
await flushAllPromises();
```

Use `await flushAllPromises()` after triggering async operations (button clicks that call Apex).
Use a single `await Promise.resolve()` for simple render cycles.

## @api prop selectors

CSS attribute selectors do NOT work for `@api` properties. Use JS:

```javascript
// WRONG:
el.shadowRoot.querySelector('lightning-button[variant="brand"]');

// RIGHT:
[...el.shadowRoot.querySelectorAll("lightning-button")].find(
  (b) => b.variant === "brand"
);
[...el.shadowRoot.querySelectorAll("lightning-button")].find(
  (b) => b.label === "Cancel"
);
```

## Standard test structure

```javascript
import { createElement } from "lwc";
import MyComponent from "c/myComponent";

// jest.mock() calls here (hoisted)

afterEach(() => {
  while (document.body.firstChild)
    document.body.removeChild(document.body.firstChild);
  jest.clearAllMocks();
});

function create(props = {}) {
  const el = createElement("c-my-component", { is: MyComponent });
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

describe("feature", () => {
  it("does something", async () => {
    const el = create();
    // emit wire data
    // interact
    await Promise.resolve(); // one render cycle
    // assert
  });
});
```
