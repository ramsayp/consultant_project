---
name: ba-agent-triage-design
description: Future BA agent ticket-triage workflow design — captured for when agent-building begins
metadata:
  node_type: memory
  type: project
  originSessionId: 4d854ece-a881-4e42-a306-a60be07e8006
---

The user is preparing to build AI agents for the Project Management app. The first
planned agent is a **BA (Business Analyst) agent** that triages incoming tickets
(ideas/bugs/tasks) before they reach the team backlog. Not being built yet — design
captured 2026-06-06 for later. Full reference plan written to
`C:\Users\PaulS\.claude\plans\adaptive-tinkering-hammock.md`.

**Workflow**: Ticket enters via utility bar (any user) or directly in the Project
Management app (admins) → BA agent classifies as Story/Task/Bug, writes a user story
(Stories only — matches current `Work_Item__c.User_Story__c` behavior, user
explicitly decided NOT to extend it to Task/Bug), writes acceptance criteria
(`Acceptance_Criteria__c`), and drafts a plan (heavier for Stories, lighter for
Bugs) → human reviews → **Approve** moves it to the Backlog `Sprint__c`
(`Status__c = 'Backlog'`, see `ensureBacklogSprint()`); **Decline** sends it back to
the BA agent with reviewer notes for re-triage, looping until approved.

**Stated build preferences** (for when scaffolding work starts):

- New **"Ticket"** record type on `Work_Item__c` for raw unclassified intake (not a
  reused record type with a flag, not a separate object)
- New **"Triage" view inside `workManager`** (Project Management app), alongside
  Projects/Sprints/Board — a queue showing BA suggestions with approve/decline
- **Custom Apex + LWC** for approval, not native Salesforce Approval Processes —
  matches existing `WorkItemController` pattern and the decline→notes→re-review
  loop doesn't map well onto declarative approval processes

**Why**: The BA agent needs the triage scaffolding (data model, intake UI, Triage
view, approve/decline flow) in place to plug into — it must be built _before_ the
BA agent itself, not after.

**How to apply**: This scaffolding is active work, not deferred. Build it from the
checklist in the plan file above. The BA agent's actual classification/AC/plan
generation logic remains a separate, later effort that plugs into this scaffolding
once it exists.
