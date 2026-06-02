trigger ChangeLogTrigger on Change_Log__c(before insert) {
  // ── Before snapshot ───────────────────────────────────────────────────────
  // When a Change Log is created linked to a Technical doc, capture the
  // current body of that doc (and its companion User doc) as before-snapshots.
  Set<Id> techDocIds = new Set<Id>();
  for (Change_Log__c cl : Trigger.new) {
    if (cl.Technical_Doc__c != null) {
      techDocIds.add(cl.Technical_Doc__c);
    }
  }
  if (techDocIds.isEmpty())
    return;

  Map<Id, Documentation__c> docsById = new Map<Id, Documentation__c>(
    [
      SELECT Id, Body__c, Related_User_Doc__r.Body__c
      FROM Documentation__c
      WHERE Id IN :techDocIds
    ]
  );

  for (Change_Log__c cl : Trigger.new) {
    if (cl.Technical_Doc__c == null)
      continue;
    Documentation__c doc = docsById.get(cl.Technical_Doc__c);
    if (doc == null)
      continue;
    cl.Technical_Doc_Before__c = doc.Body__c;
    if (doc.Related_User_Doc__r != null) {
      cl.User_Doc_Before__c = doc.Related_User_Doc__r.Body__c;
    }
  }
}
