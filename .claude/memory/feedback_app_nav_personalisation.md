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

Related: [[feedback_sf_metadata_prettier_xml]]
