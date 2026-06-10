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
}
