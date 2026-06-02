trigger WorkItemTrigger on Work_Item__c(before insert) {
  // ── Backlog default ────────────────────────────────────────────────────────
  // Story, Task, and Bug records created without a sprint are automatically
  // assigned to the Backlog sprint so they appear on the board immediately.
  Set<Id> sprintRTIds = new Set<Id>();
  for (RecordType rt : [
    SELECT Id
    FROM RecordType
    WHERE
      SobjectType = 'Work_Item__c'
      AND DeveloperName IN ('Story', 'Task', 'Bug')
  ]) {
    sprintRTIds.add(rt.Id);
  }

  Boolean anyNeedsBacklog = false;
  for (Work_Item__c item : Trigger.new) {
    if (item.Sprint__c == null && sprintRTIds.contains(item.RecordTypeId)) {
      anyNeedsBacklog = true;
      break;
    }
  }
  if (!anyNeedsBacklog)
    return;

  Sprint__c[] backlogs = [
    SELECT Id
    FROM Sprint__c
    WHERE Status__c = 'Backlog'
    LIMIT 1
  ];
  if (backlogs.isEmpty())
    return;

  Id backlogId = backlogs[0].Id;
  for (Work_Item__c item : Trigger.new) {
    if (item.Sprint__c == null && sprintRTIds.contains(item.RecordTypeId)) {
      item.Sprint__c = backlogId;
    }
  }
}
