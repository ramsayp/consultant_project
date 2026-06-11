trigger WorkItemTrigger on Work_Item__c(
  before insert,
  after insert,
  before update,
  after update
) {
  if (Trigger.isBefore && Trigger.isInsert) {
    // ── Backlog default ──────────────────────────────────────────────────────
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
    if (anyNeedsBacklog) {
      Id sprintBacklogRtId = Schema.SObjectType.Sprint__c
        .getRecordTypeInfosByDeveloperName()
        .get('Backlog')
        .getRecordTypeId();
      Sprint__c[] backlogs = [
        SELECT Id
        FROM Sprint__c
        WHERE RecordTypeId = :sprintBacklogRtId
        LIMIT 1
      ];
      if (!backlogs.isEmpty()) {
        Id backlogId = backlogs[0].Id;
        for (Work_Item__c item : Trigger.new) {
          if (
            item.Sprint__c == null && sprintRTIds.contains(item.RecordTypeId)
          ) {
            item.Sprint__c = backlogId;
          }
        }
      }
    }

    WorkItemTriggerHandler.beforeInsert(Trigger.new);

    // ── Selection status correction ──────────────────────────────────────────
    // workItemCreate.js always sets Status__c to its DEFAULT_STATUS regardless of
    // which sprint the user picked. Re-derive it from the item's final Sprint__c so
    // Backlog/Planning destinations land on 'Not Selected'/'Selected' rather than
    // 'Not Started'. Active sprint destinations keep their default — that's a real
    // kanban stage.
    Set<Id> sprintIds = new Set<Id>();
    for (Work_Item__c item : Trigger.new) {
      if (sprintRTIds.contains(item.RecordTypeId) && item.Sprint__c != null) {
        sprintIds.add(item.Sprint__c);
      }
    }
    if (!sprintIds.isEmpty()) {
      Map<Id, Sprint__c> sprintMap = new Map<Id, Sprint__c>(
        [
          SELECT Id, Status__c, RecordType.DeveloperName
          FROM Sprint__c
          WHERE Id IN :sprintIds
        ]
      );
      for (Work_Item__c item : Trigger.new) {
        if (!sprintRTIds.contains(item.RecordTypeId))
          continue;
        Sprint__c dest = sprintMap.get(item.Sprint__c);
        if (dest == null)
          continue;
        if (dest.RecordType.DeveloperName == 'Backlog') {
          item.Status__c = 'Not Selected';
        } else if (dest.Status__c == 'Planning') {
          item.Status__c = 'Selected';
        }
      }
    }
  }

  if (Trigger.isAfter && Trigger.isInsert) {
    WorkItemTriggerHandler.afterInsert(Trigger.new);
  }

  if (Trigger.isBefore && Trigger.isUpdate) {
    WorkItemTriggerHandler.beforeUpdate(Trigger.new, Trigger.oldMap);
  }

  if (Trigger.isAfter && Trigger.isUpdate) {
    WorkItemTriggerHandler.afterUpdate(Trigger.new, Trigger.oldMap);
  }
}
