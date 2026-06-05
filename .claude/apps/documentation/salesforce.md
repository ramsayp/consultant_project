# Documentation App — Salesforce Context

## Objects

### `Documentation__c`

Two Record Types: **Technical** and **User**

| Field                      | Type                                   | Notes                                                          |
| -------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `Name` (Title)             | Text                                   | Document title — the standard name field                       |
| `Body__c`                  | Rich Text (32,768)                     | Full document content with formatting                          |
| `Folder__c`                | Lookup → Folder\_\_c (required)        | Organises docs into folders; deletion restricted               |
| `Related_User_Doc__c`      | Lookup → Documentation\_\_c            | On Technical RT: link to companion User doc                    |
| `Related_Technical_Doc__c` | Lookup → Documentation\_\_c            | On User RT: link to companion Technical doc                    |
| `Status__c`                | Picklist: Draft / Published / Archived | Publication state                                              |
| `Claude_Doc_Id__c`         | Text (External ID)                     | Slug used to locate records without hard-coding Salesforce IDs |

### `Change_Log__c`

Separate object — an **immutable event record**, not a document type.
Auto-number name format: `CL-{0000}`

| Field              | Type                                         | Notes                                    |
| ------------------ | -------------------------------------------- | ---------------------------------------- |
| `Title__c`         | Text(255)                                    | One-line description of the change       |
| `Summary__c`       | Rich Text (32,768)                           | Full detail of what changed and why      |
| `Work_Item__c`     | Lookup → Work_Item\_\_c                      | What triggered this change               |
| `Technical_Doc__c` | Lookup → Documentation\_\_c                  | Which Technical doc was produced/updated |
| `Version__c`       | Text(20)                                     | e.g. "v1.2" or "Sprint 4"                |
| `Changed_By__c`    | Lookup → User                                | Human responsible for the change         |
| `Change_Date__c`   | DateTime                                     | When the change was applied              |
| `Environment__c`   | Picklist: Scratch Org / Sandbox / Production |                                          |
| `Status__c`        | Picklist: Draft / Reviewed / Published       | Review state                             |

## Record Types (`Documentation__c`)

| Type      | Purpose                                  |
| --------- | ---------------------------------------- |
| Technical | For admins/devs — architecture and setup |
| User      | Plain-language guides for end users      |
