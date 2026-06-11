---
name: permission-set-mapping
description: Which permission set to update when adding fields to each object in this org
metadata:
  type: project
---

Field access in this org is controlled via permission sets (not profiles). Every new custom field must be added to the relevant permission set before the feature is done.

**Object → permission set mapping:**

| Object             | Permission Set File                        |
| ------------------ | ------------------------------------------ |
| `Work_Item__c`     | `ProjectManagement.permissionset-meta.xml` |
| `Sprint__c`        | `ProjectManagement.permissionset-meta.xml` |
| `Comment__c`       | `ProjectManagement.permissionset-meta.xml` |
| `Documentation__c` | `Documentation.permissionset-meta.xml`     |
| `Change_Log__c`    | `Documentation.permissionset-meta.xml`     |
| `Folder__c`        | `Documentation.permissionset-meta.xml`     |

**Why:** Salesforce defaults new custom fields to no access on custom permission sets. Users get a blank record page and can't see or edit new fields until `fieldPermissions` entries are deployed.

**How to apply:**

- `editable: true` for user-editable fields
- `editable: false` for system-assigned read-only fields (e.g. auto-generated keys, item numbers)
- Required fields (`<required>true</required>`) must NOT appear in permission sets — Salesforce rejects the deploy with "You cannot deploy to a required field"
- Deploy the permission set in the same deploy run as the fields, or immediately after
- Permission set files are at `force-app/main/default/permissionsets/`
- Entries must be in alphabetical order by field API name within each object grouping

**Related:** [[memory_dual_save]], [[sf_metadata_prettier_xml]]
