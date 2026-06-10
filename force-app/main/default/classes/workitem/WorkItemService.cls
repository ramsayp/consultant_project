public with sharing class WorkItemService {
  // ── assignTicketKeys ───────────────────────────────────────────────────────
  // Called from beforeInsert. Assigns Item_Number__c and Ticket_Key__c to each
  // incoming Story, Task, or Bug by resolving its root Project's Project_Code__c
  // and incrementing a per-project counter.
  // Items with no Epic parent, or whose Epic has no project with a code, are skipped.
  public static void assignTicketKeys(List<Work_Item__c> newItems) {
    Set<Id> numberedRtIds = new Set<Id>();
    for (RecordType rt : [
      SELECT Id
      FROM RecordType
      WHERE
        SObjectType = 'Work_Item__c'
        AND DeveloperName IN ('Story', 'Task', 'Bug')
    ]) {
      numberedRtIds.add(rt.Id);
    }

    List<Work_Item__c> toNumber = new List<Work_Item__c>();
    Set<Id> epicIds = new Set<Id>();
    for (Work_Item__c item : newItems) {
      if (
        numberedRtIds.contains(item.RecordTypeId) &&
        item.Parent_Work_Item__c != null
      ) {
        toNumber.add(item);
        epicIds.add(item.Parent_Work_Item__c);
      }
    }
    if (toNumber.isEmpty())
      return;

    // Resolve each Epic to its parent Project and read the Project_Code__c
    Map<Id, Id> epicToProject = new Map<Id, Id>();
    Map<Id, String> projectToCode = new Map<Id, String>();
    for (
      Work_Item__c epic : WorkItemSelector.getEpicsWithProjectCode(epicIds)
    ) {
      if (
        epic.Parent_Work_Item__c != null &&
        epic.Parent_Work_Item__r.Project_Code__c != null
      ) {
        epicToProject.put(epic.Id, epic.Parent_Work_Item__c);
        projectToCode.put(
          epic.Parent_Work_Item__c,
          epic.Parent_Work_Item__r.Project_Code__c
        );
      }
    }
    if (projectToCode.isEmpty())
      return;

    // Get the current highest item number per project so we can increment from it
    Map<Id, Integer> maxByProject = WorkItemSelector.getMaxItemNumberByProject(
      projectToCode.keySet()
    );

    for (Work_Item__c item : toNumber) {
      Id projectId = epicToProject.get(item.Parent_Work_Item__c);
      if (projectId == null)
        continue;
      String code = projectToCode.get(projectId);
      if (code == null)
        continue;
      Integer next =
        (maxByProject.containsKey(projectId)
          ? maxByProject.get(projectId)
          : 0) + 1;
      maxByProject.put(projectId, next); // advance counter for subsequent items in same batch
      item.Item_Number__c = next;
      item.Ticket_Key__c = code + '-' + String.valueOf(next).leftPad(5, '0');
    }
  }
}
