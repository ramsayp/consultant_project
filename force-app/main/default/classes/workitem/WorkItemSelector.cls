public with sharing class WorkItemSelector {
  // ── getEpicsWithProjectCode ────────────────────────────────────────────────
  // Returns the supplied Epic records with their parent Project's Project_Code__c.
  public static List<Work_Item__c> getEpicsWithProjectCode(Set<Id> epicIds) {
    return [
      SELECT Id, Parent_Work_Item__c, Parent_Work_Item__r.Project_Code__c
      FROM Work_Item__c
      WHERE Id IN :epicIds
    ];
  }

  // ── getMaxItemNumberByProject ──────────────────────────────────────────────
  // Returns the highest Item_Number__c currently assigned within each project,
  // keyed by project Id. Projects with no numbered items are absent from the map.
  // Scopes to items whose Epic parent belongs to one of the supplied project Ids.
  // TRI-keyed items are excluded — their Item_Number__c belongs to the triage
  // sequence, not the project sequence, and would otherwise inflate the counter.
  public static Map<Id, Integer> getMaxItemNumberByProject(Set<Id> projectIds) {
    Map<Id, Integer> result = new Map<Id, Integer>();
    for (AggregateResult ar : [
      SELECT
        Parent_Work_Item__r.Parent_Work_Item__c projectId,
        MAX(Item_Number__c) maxNum
      FROM Work_Item__c
      WHERE
        Parent_Work_Item__r.Parent_Work_Item__c IN :projectIds
        AND Item_Number__c != NULL
        AND (Ticket_Key__c < 'TRI-'
        OR Ticket_Key__c > 'TRI-99999')
      GROUP BY Parent_Work_Item__r.Parent_Work_Item__c
    ]) {
      Id pid = (Id) ar.get('projectId');
      Decimal maxD = (Decimal) ar.get('maxNum');
      if (pid != null && maxD != null) {
        result.put(pid, maxD.intValue());
      }
    }
    return result;
  }

  // ── getItemsNeedingKeysByProject ───────────────────────────────────────────
  // Returns Stories, Tasks, and Bugs under the given projects that have no key
  // or a TRI key. Used by the cascade triggered when Project_Code__c is set.
  public static List<Work_Item__c> getItemsNeedingKeysByProject(
    Set<Id> projectIds
  ) {
    return [
      SELECT
        Id,
        RecordTypeId,
        Parent_Work_Item__c,
        Item_Number__c,
        Ticket_Key__c
      FROM Work_Item__c
      WHERE
        Parent_Work_Item__r.Parent_Work_Item__c IN :projectIds
        AND RecordType.DeveloperName IN ('Story', 'Task', 'Bug')
        AND (Ticket_Key__c = NULL
        OR Ticket_Key__c LIKE 'TRI-%')
    ];
  }

  // ── getMaxTicketItemNumber ─────────────────────────────────────────────────
  // Returns the highest Item_Number__c currently assigned to any Ticket record.
  // Returns 0 when no Ticket records have been numbered yet.
  public static Integer getMaxTicketItemNumber(Id ticketRtId) {
    AggregateResult ar = [
      SELECT MAX(Item_Number__c) maxNum
      FROM Work_Item__c
      WHERE RecordTypeId = :ticketRtId
    ][0];
    Decimal maxD = (Decimal) ar.get('maxNum');
    return maxD != null ? maxD.intValue() : 0;
  }
}
