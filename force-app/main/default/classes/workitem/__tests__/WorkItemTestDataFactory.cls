@IsTest
public class WorkItemTestDataFactory {
  // ── Record type helpers ────────────────────────────────────────────────────
  public static Id wiRtId(String name) {
    return Schema.SObjectType.Work_Item__c
      .getRecordTypeInfosByName()
      .get(name)
      .getRecordTypeId();
  }

  // ── Record builders ────────────────────────────────────────────────────────
  // Each method inserts the record and returns it.

  // code may be null for projects without a code yet
  public static Work_Item__c insertProject(String name, String code) {
    Work_Item__c p = new Work_Item__c(
      Name = name,
      RecordTypeId = wiRtId('Project'),
      Status__c = 'Active',
      Project_Code__c = code
    );
    insert p;
    return p;
  }

  public static Work_Item__c insertEpic(String name, Id projectId) {
    Work_Item__c e = new Work_Item__c(
      Name = name,
      RecordTypeId = wiRtId('Epic'),
      Status__c = 'To Do',
      Parent_Work_Item__c = projectId
    );
    insert e;
    return e;
  }

  public static Work_Item__c insertStory(String name, Id epicId) {
    Work_Item__c s = new Work_Item__c(
      Name = name,
      RecordTypeId = wiRtId('Story'),
      Parent_Work_Item__c = epicId
    );
    insert s;
    return s;
  }

  public static Work_Item__c insertTask(String name, Id epicId) {
    Work_Item__c t = new Work_Item__c(
      Name = name,
      RecordTypeId = wiRtId('Task'),
      Parent_Work_Item__c = epicId
    );
    insert t;
    return t;
  }

  public static Work_Item__c insertBug(String name, Id epicId) {
    Work_Item__c b = new Work_Item__c(
      Name = name,
      RecordTypeId = wiRtId('Bug'),
      Parent_Work_Item__c = epicId
    );
    insert b;
    return b;
  }

  public static Work_Item__c insertTicket(String name) {
    Work_Item__c t = new Work_Item__c(
      Name = name,
      RecordTypeId = wiRtId('Ticket')
    );
    insert t;
    return t;
  }
}
