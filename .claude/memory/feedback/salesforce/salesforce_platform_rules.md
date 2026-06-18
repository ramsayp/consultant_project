---
name: salesforce_platform_rules
description: Salesforce platform gotchas — field type quirks, formula limitations, and API constraints that apply to any SF project
metadata:
  type: feedback
---

Use `LEN(fieldName) > 0` (not `ISBLANK` or `ISNULL`) to check whether a Rich Text Area field has content in Salesforce validation rules and formula fields.

**Why:** `ISBLANK()` always returns `false` for RTA fields (Salesforce explicitly does not support it). `ISNULL()` also fails to detect cleared RTA fields reliably. `LEN() > 0` correctly handles all states — null, empty string, and cleared-via-API values.

**How to apply:** Any time a validation rule, formula field, or workflow condition needs to check whether a Rich Text Area / HTML field is blank, always use `LEN(fieldName) > 0` rather than `NOT(ISBLANK(...))` or `NOT(ISNULL(...))`.

---

**Correction (superseded by live-org evidence below):** `cacheable=true` Apex methods can be served from the platform's storable-action cache even when called **imperatively** — it is NOT true that imperative calls always bypass it. The fix that actually works is to drop `cacheable=true` entirely from a method that's never consumed via `@wire`. The "imperative bypasses the cache" claim below was a reasonable-sounding but wrong theory that cost two failed fix attempts before live debugging (console logging through the actual create/delete flow in the org) proved the Apex call itself kept returning a stale row count no matter how it was triggered.

A `cacheable=true` Apex method called via LWC `@wire` is served from the platform's client-side cache across component instances, even after the component fully unmounts and remounts (e.g. navigating away and back via an `if:true` template toggle).

**Why:** Diagnosed on a "list doesn't refresh after create/delete, only a hard browser refresh fixes it" bug. The component was correctly recreated on every navigation (new wire call fired each time), but still served stale data — the cache lives at the platform level, keyed by method + params, not per component instance. `refreshApex` is the other way to invalidate it, but it requires a wire result reference already populated in the _same_ instance, which is racy to set up reliably from `connectedCallback`.

**How to apply:** For any LWC list/queue that must reflect writes made from a different part of the app and needs to always be fresh on view: if the method is never consumed via `@wire` anywhere, remove `cacheable=true` from it entirely — that's the only verified-working fix. Don't assume imperative invocation alone is enough; confirm with live testing (or temporary `console.log` around the call and its result) before trusting it. Pair with Lightning Message Service if the writer and the list live in different component trees and the list might be open at write-time, and/or `CurrentPageReference` if returning from a different page should also trigger a reload.

---

Lightning Message Service `subscribe()` calls need `{ scope: APPLICATION_SCOPE }` (imported from `lightning/messageService`) as the 4th argument whenever the publisher and subscriber live in different regions of a Lightning page — e.g. a Utility Bar component publishing to a component on the App Page body. The default scope only delivers within the same DOM/component region.

**Why:** Caught in code review — a fix used LMS to notify an App Page component of a utility bar action, but `subscribe()` was called without the scope option. Jest's `lightning/messageService` stub (`subscribe`/`publish` are plain `jest.fn()`s) can't catch this — it has no real scoping behaviour, so unit tests pass even when the cross-region message would never actually arrive at runtime. Only code review (or manual testing in the org) catches it.

**How to apply:** Any time LMS bridges a Utility Bar item and an App Page (or any two components that aren't in the same component subtree / page region), pass `{ scope: APPLICATION_SCOPE }` to `subscribe()`. Default scope is fine only when publisher and subscriber are both inside the same flexipage region/component tree.
