public with sharing class WorkItemTriggerHandler {
  // ── Bypass flag ────────────────────────────────────────────────────────────
  // Set true before a system-initiated cascade DML so the beforeUpdate block
  // skips the General Epic status restriction during that nested execution.
  private static Boolean systemCascade = false;

  private static final Set<String> TERMINAL = new Set<String>{
    'Cancelled',
    'Done',
    'Completed'
  };

  // ── beforeInsert ───────────────────────────────────────────────────────────
  // Assigns Ticket_Key__c and Item_Number__c to incoming Story/Task/Bug records.
  public static void beforeInsert(List<Work_Item__c> newItems) {
    WorkItemService.assignTicketKeys(newItems);
  }

  // ── afterInsert ────────────────────────────────────────────────────────────
  // Creates a General Epic for every newly inserted Project.
  public static void afterInsert(List<Work_Item__c> newItems) {
    Id projectRtId = rtId('Project');
    Id epicRtId = rtId('Epic');
    List<Work_Item__c> toInsert = new List<Work_Item__c>();
    for (Work_Item__c item : newItems) {
      if (item.RecordTypeId == projectRtId) {
        toInsert.add(
          new Work_Item__c(
            Name = 'General',
            RecordTypeId = epicRtId,
            Parent_Work_Item__c = item.Id,
            Status__c = item.Status__c,
            Is_General__c = true
          )
        );
      }
    }
    if (!toInsert.isEmpty()) {
      insert toInsert;
    }
  }

  // ── beforeUpdate ───────────────────────────────────────────────────────────
  // Blocks users from manually setting a General Epic to a terminal status.
  // Skipped when systemCascade is true (system-driven Project status sync).
  public static void beforeUpdate(
    List<Work_Item__c> newItems,
    Map<Id, Work_Item__c> oldMap
  ) {
    if (systemCascade)
      return;
    Id epicRtId = rtId('Epic');
    for (Work_Item__c item : newItems) {
      if (item.RecordTypeId != epicRtId || !item.Is_General__c)
        continue;
      Work_Item__c old = oldMap.get(item.Id);
      if (
        old.Status__c != item.Status__c && TERMINAL.contains(item.Status__c)
      ) {
        item.Status__c.addError(
          'The General Epic status is controlled by its parent Project and cannot be set manually to Cancelled, Done, or Completed.'
        );
      }
    }
  }

  // ── afterUpdate ────────────────────────────────────────────────────────────
  // Cascades a Project status change to its linked General Epic.
  // Sets systemCascade = true so the beforeUpdate block is bypassed on the
  // nested General Epic update.
  public static void afterUpdate(
    List<Work_Item__c> newItems,
    Map<Id, Work_Item__c> oldMap
  ) {
    Id projectRtId = rtId('Project');
    Id epicRtId = rtId('Epic');
    Map<Id, String> projectStatusMap = new Map<Id, String>();
    for (Work_Item__c item : newItems) {
      if (item.RecordTypeId != projectRtId)
        continue;
      if (oldMap.get(item.Id).Status__c != item.Status__c) {
        projectStatusMap.put(item.Id, item.Status__c);
      }
    }
    if (projectStatusMap.isEmpty())
      return;
    List<Work_Item__c> generalEpics = [
      SELECT Id, Parent_Work_Item__c
      FROM Work_Item__c
      WHERE
        RecordTypeId = :epicRtId
        AND Is_General__c = TRUE
        AND Parent_Work_Item__c IN :projectStatusMap.keySet()
    ];
    if (generalEpics.isEmpty())
      return;
    List<Work_Item__c> toUpdate = new List<Work_Item__c>();
    for (Work_Item__c epic : generalEpics) {
      toUpdate.add(
        new Work_Item__c(
          Id = epic.Id,
          Status__c = projectStatusMap.get(epic.Parent_Work_Item__c)
        )
      );
    }
    systemCascade = true;
    try {
      update toUpdate;
    } finally {
      systemCascade = false;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private static Id rtId(String name) {
    return Schema.SObjectType.Work_Item__c
      .getRecordTypeInfosByName()
      .get(name)
      .getRecordTypeId();
  }
}
