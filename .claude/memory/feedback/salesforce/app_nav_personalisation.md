---
name: feedback_app_nav_personalisation
description: All Lightning Apps must lock navigation so users cannot personalise tabs — always set isNavPersonalizationDisabled true
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8930ac2c-c768-45b2-9fcc-a7bcfdf57de3
---

When creating a `CustomApplication` (Lightning App), always set:

```xml
<isNavPersonalizationDisabled>true</isNavPersonalizationDisabled>
```

**Why:** Users should see exactly the tabs the app defines. Leaving this `false` (the Salesforce default) lets users add, remove, and reorder nav tabs for themselves — their personal customisation then hides tabs that are supposed to be there, which is confusing to troubleshoot and defeats the purpose of a controlled app experience.

**How to apply:** Set this in every `.app-meta.xml` file at creation time. It is not the Salesforce default, so it must be explicit. If an existing app has `false`, update the source and deploy.

## Lightning Record Pages for new custom objects

Salesforce defaults to the classic page layout for any new custom object — even if a Lightning Record Page exists in source. The org-default activation cannot be set via the Metadata API or Tooling API; it must be done manually.

**Rule:** Every time a new custom object is created, also create a Lightning Record Page (`*.flexipage-meta.xml`, type `RecordPage`) for it and deploy it.

**Human action required after deploy:** Open the org, navigate to a record of the new object, click the gear icon → Edit Page, then Activation → Assign as Org Default → Save. This is a one-time step per org and cannot be automated.

**Why:** Salesforce still defaults new objects to the classic UI. The org-default assignment is stored internally and is not exposed in any retrievable/deployable metadata type — it is not written back to the FlexiPage XML after activation.

Related: [[feedback_sf_metadata_prettier_xml]]
