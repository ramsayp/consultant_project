@isTest
private class ProjectMCPUpdateRecord_Test {
  @TestSetup
  static void makeData() {
    insert new Sprint__c(
      Name = 'Original Name',
      Status__c = 'Active',
      Sequence__c = 1,
      RecordTypeId = Schema.SObjectType.Sprint__c
        .getRecordTypeInfosByDeveloperName()
        .get('Sprint')
        .getRecordTypeId()
    );
  }

  @isTest
  static void execute_validUpdate_updatesRecord() {
    Sprint__c sprint = [SELECT Id FROM Sprint__c LIMIT 1];

    ProjectMCPUpdateRecord.Input inp = new ProjectMCPUpdateRecord.Input();
    inp.recordId = sprint.Id;
    inp.fieldsJson = '{"Name":"Updated Name"}';

    List<ProjectMCPUpdateRecord.Output> results = ProjectMCPUpdateRecord.execute(
      new List<ProjectMCPUpdateRecord.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);

    Sprint__c updated = [SELECT Name FROM Sprint__c WHERE Id = :sprint.Id];
    System.assertEquals('Updated Name', updated.Name);
  }

  @isTest
  static void execute_disallowedObject_returnsError() {
    // Use a User Id — User is not in the allowed set
    ProjectMCPUpdateRecord.Input inp = new ProjectMCPUpdateRecord.Input();
    inp.recordId = UserInfo.getUserId();
    inp.fieldsJson = '{"Title":"Test"}';

    List<ProjectMCPUpdateRecord.Output> results = ProjectMCPUpdateRecord.execute(
      new List<ProjectMCPUpdateRecord.Input>{ inp }
    );

    System.assertEquals(false, results[0].success);
    System.assert(results[0].error.contains('not permitted'));
  }

  @isTest
  static void execute_invalidId_returnsError() {
    ProjectMCPUpdateRecord.Input inp = new ProjectMCPUpdateRecord.Input();
    inp.recordId = 'not-an-id';
    inp.fieldsJson = '{"Name":"Test"}';

    List<ProjectMCPUpdateRecord.Output> results = ProjectMCPUpdateRecord.execute(
      new List<ProjectMCPUpdateRecord.Input>{ inp }
    );

    System.assertEquals(false, results[0].success);
    System.assertNotEquals(null, results[0].error);
  }
}
