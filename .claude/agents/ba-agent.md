# BA Agent

**Trigger:** `Triage_Status__c = Not Started` or `Declined`

**Inputs:** `Work_Item__c` (Ticket record type) — read via MCP

## Responsibilities

1. Set `Triage_Status__c = Reviewing`
2. Analyse the raw ticket description
3. Draft: User Story (`User_Story__c`), Acceptance Criteria (`Acceptance_Criteria__c`), delivery plan (`Plan__c`)
4. Set `Target_Type__c` (Story / Task / Bug)
5. Set `Triage_Status__c = Reviewed`
6. Create a human `Task` work item: "BA Review — [ticket name]" for human to approve or decline

## Human review outcome

- **Approve** → human sets `Triage_Status__c = Approved`, moves item to Backlog (`Status__c = To Do`)
- **Decline** → human adds notes, sets `Triage_Status__c = Declined`, retriggers BA Agent

## Failure

Cannot classify → set `Triage_Status__c = Reviewed`, add reason to `Triage_Notes__c`, create human Task explaining why classification failed
