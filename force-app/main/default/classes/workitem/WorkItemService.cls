public with sharing class WorkItemService {
  private static final String TRIAGE_PREFIX = 'TRI';

  // ── assignTicketKeys ───────────────────────────────────────────────────────
  // Called from beforeInsert. Assigns Item_Number__c and Ticket_Key__c to:
  //   - Story / Task / Bug: resolves root Project_Code__c, per-project counter
  //   - Ticket (triage intake): hardcoded TRI prefix, global counter
  // Items that don't match any of these types, or that are missing a required
  // parent chain, are skipped silently.
  public static void assignTicketKeys(List<Work_Item__c> newItems) {
    Map<Id, String> rtNameById = new Map<Id, String>();
    for (RecordType rt : [
      SELECT Id, DeveloperName
      FROM RecordType
      WHERE
        SObjectType = 'Work_Item__c'
        AND DeveloperName IN ('Story', 'Task', 'Bug', 'Ticket')
    ]) {
      rtNameById.put(rt.Id, rt.DeveloperName);
    }

    List<Work_Item__c> toNumber = new List<Work_Item__c>();
    Set<Id> epicIds = new Set<Id>();
    List<Work_Item__c> tickets = new List<Work_Item__c>();
    Id ticketRtId = null;

    for (Work_Item__c item : newItems) {
      String rtName = rtNameById.get(item.RecordTypeId);
      if (rtName == null)
        continue;
      if (rtName == 'Ticket') {
        tickets.add(item);
        if (ticketRtId == null)
          ticketRtId = item.RecordTypeId;
      } else if (item.Parent_Work_Item__c != null) {
        toNumber.add(item);
        epicIds.add(item.Parent_Work_Item__c);
      }
    }

    // ── Project-based numbering (Story / Task / Bug) ───────────────────────
    if (!toNumber.isEmpty()) {
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

      if (!projectToCode.isEmpty()) {
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
          maxByProject.put(projectId, next);
          item.Item_Number__c = next;
          item.Ticket_Key__c =
            code +
            '-' +
            String.valueOf(next).leftPad(5, '0');
        }
      }
    }

    // ── Triage numbering (Ticket → TRI-NNNNN) ─────────────────────────────
    if (!tickets.isEmpty()) {
      Integer next = WorkItemSelector.getMaxTicketItemNumber(ticketRtId) + 1;
      for (Work_Item__c t : tickets) {
        t.Item_Number__c = next;
        t.Ticket_Key__c =
          TRIAGE_PREFIX +
          '-' +
          String.valueOf(next).leftPad(5, '0');
        next++;
      }
    }
  }

  // ── cascadeKeysToProjectChildren ──────────────────────────────────────────
  // Called from afterUpdate when Project_Code__c is set or changed. Finds all
  // Stories/Tasks/Bugs under the project that still have a TRI key or no key
  // and assigns proper project-sequence keys via assignTicketKeys.
  public static void cascadeKeysToProjectChildren(Set<Id> projectIds) {
    List<Work_Item__c> toReKey = WorkItemSelector.getItemsNeedingKeysByProject(
      projectIds
    );
    if (toReKey.isEmpty())
      return;
    assignTicketKeys(toReKey);
    List<Work_Item__c> changed = new List<Work_Item__c>();
    for (Work_Item__c item : toReKey) {
      if (
        item.Ticket_Key__c != null && !item.Ticket_Key__c.startsWith('TRI-')
      ) {
        changed.add(item);
      }
    }
    if (!changed.isEmpty()) {
      update changed;
    }
  }
}
