# Standards — Coding Conventions

## Apex

- All classes and methods use `with sharing`
- `@AuraEnabled(cacheable=true)` only on read-only methods (safe for `@wire`)
- DML methods must NOT be cacheable — call them imperatively in JS
- Use `AuraHandledException` for user-facing error messages
- Test class conventions: see `.claude/skills/apex-test.md`

### Layered architecture

All new Apex must follow this layer structure:

```
Trigger → TriggerHandler → Service → Domain → Selector
```

- **Trigger** — one trigger per object; calls handler only; no logic
- **TriggerHandler** — routes to service methods based on context; no business logic
- **Service** — orchestrates operations; calls domain and selector; one responsibility per method
- **Domain** — entity logic and validation; operates on `List<SObject>`; no SOQL
- **Selector** — all SOQL; always enforces `with sharing`; returns typed lists

SOLID rules:

1. Single responsibility per class
2. Interfaces for behaviour contracts where multiple implementations are possible
3. Dependencies injected or abstracted at interface boundaries — mock at the Selector or Service interface in tests
4. All classes unit-testable with mocked data access
5. No business logic in triggers

## LWC JavaScript

### ESLint rules that commonly trip up

| Mistake                              | Fix                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `catch(e) { }` when `e` is unused    | `catch { }` (ES2019 optional catch binding)                                                                                                |
| `setTimeout` inside LWC files        | Chained `.then()` — `setTimeout` is restricted by `@lwc/lwc/no-async-operation`                                                            |
| `querySelector('[variant="brand"]')` | CSS attribute selectors don't match `@api` props — use JS: `[...el.querySelectorAll('lightning-button')].find(b => b.variant === 'brand')` |

### Jest mock patterns

**Imperative Apex** — inline `jest.fn()` in the factory; never use variable capture outside the factory (hoisting creates a different instance):

```javascript
jest.mock("@salesforce/apex/Controller.method", () => ({
  default: jest.fn(),
  __esModule: true
}));
import method from "@salesforce/apex/Controller.method";
```

**Wire Apex adapters** — `createApexTestWireAdapter` inside `require()` inside the factory:

```javascript
jest.mock("@salesforce/apex/Controller.getItems", () => {
  const {
    createApexTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  return { default: createApexTestWireAdapter(jest.fn()), __esModule: true };
});
```

**`lightning/uiRecordApi`** — use `moduleNameMapper` in `jest.config.js`, NOT `jest.mock()`. The custom resolver and Jest's mock registry keys mismatch on Windows:

```javascript
// jest.config.js
moduleNameMapper: { '^lightning/uiRecordApi$': '<rootDir>/__mocks__/lightning/uiRecordApi.js' }
```

**`@salesforce/schema/SObject`** — mock MUST export `.default` (the transformer compiles to `require(...).default`):

```javascript
// __mocks__/@salesforce/schema.js
module.exports = {
  __esModule: true,
  default: { objectApiName: "Work_Item__c" }
};
```

**`flushAllPromises`** — use chained `.then()`, not `setTimeout` (restricted):

```javascript
const flushAllPromises = () =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());
```

**Wire emit** — `createLdsTestWireAdapter.emit(value)` wraps in `{ data, error }` automatically. Do NOT double-wrap.

## Comments

- Block headers: `// ── Section name ─────────────────────`
- Inline end-of-line tags on non-obvious lines only
- No comments on self-explanatory getters, simple assignments, or obvious SOQL

## General

- Start small, think about how it grows — don't add abstractions until the third repetition
- No backwards-compat shims for removed code — delete it cleanly

## Salesforce Metadata

Platform constraints and gotchas live in `.claude/memory/feedback/salesforce/` — see the MEMORY.md index.
