---
name: rta-field-formula-check
description: ISBLANK and ISNULL do not work on Rich Text Area fields in Salesforce formulas — use LEN() > 0 instead
metadata:
  type: feedback
---

Use `LEN(fieldName) > 0` (not `ISBLANK` or `ISNULL`) to check whether a Rich Text Area field has content in Salesforce validation rules and formula fields.

**Why:** `ISBLANK()` always returns `false` for RTA fields (Salesforce explicitly does not support it). `ISNULL()` also fails to detect cleared RTA fields reliably. `LEN() > 0` correctly handles all states — null, empty string, and cleared-via-API values.

**How to apply:** Any time a validation rule, formula field, or workflow condition needs to check whether a Rich Text Area / HTML field is blank, always use `LEN(fieldName) > 0` rather than `NOT(ISBLANK(...))` or `NOT(ISNULL(...))`.
