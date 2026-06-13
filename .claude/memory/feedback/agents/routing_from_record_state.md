---
name: feedback_routing_from_record_state
description: Agent role must be derived from the Work_Item__c record state after the pre-flight query — never from the user's message content; Triage_Status__c only applies when RecordType = Ticket
metadata:
  type: feedback
---

Route from the SF record state, not the user's message.

**Why:** In a session where the user provided a detailed technical problem (screenshots, tool descriptions, implementation context), the BA Agent role was missed because the message content pattern-matched to a Dev Agent task. The record showed `Triage_Status__c = Not Started` on a Ticket, which unambiguously required BA Agent. Fix: pre-flight query is a hard gate — role is derived from the returned record state only.

**How to apply:**

- Pre-flight query must include `RecordType.DeveloperName`
- If `RecordType.DeveloperName = 'Ticket'` → route on `Triage_Status__c`
- All other record types → route on `Status__c`
- State the role explicitly after the query ("Record Type = Ticket, Triage_Status = Not Started → BA Agent") before proceeding
- The user's message is input for the agent's work, not the routing signal
