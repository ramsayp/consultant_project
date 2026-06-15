@isTest
private class ProjectMCPListRecentRecords_Test {
  @TestSetup
  static void makeData() {
    insert new Sprint__c(
      Name = 'Recent Sprint',
      Status__c = 'Active',
      Sequence__c = 1,
      RecordTypeId = Schema.SObjectType.Sprint__c
        .getRecordTypeInfosByDeveloperName()
        .get('Sprint')
        .getRecordTypeId()
    );
  }

  @isTest
  static void execute_validObject_returnsRecords() {
    ProjectMCPListRecentRecords.Input inp = new ProjectMCPListRecentRecords.Input();
    inp.objectApiName = 'Sprint__c';

    List<ProjectMCPListRecentRecords.Output> results = ProjectMCPListRecentRecords.execute(
      new List<ProjectMCPListRecentRecords.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);
    System.assert(results[0].totalSize >= 1);
    System.assertNotEquals(null, results[0].records);
  }

  @isTest
  static void execute_customFieldsAndLimit_honoured() {
    ProjectMCPListRecentRecords.Input inp = new ProjectMCPListRecentRecords.Input();
    inp.objectApiName = 'Sprint__c';
    inp.fields = 'Id, Name, Status__c';
    inp.recordLimit = 1;

    List<ProjectMCPListRecentRecords.Output> results = ProjectMCPListRecentRecords.execute(
      new List<ProjectMCPListRecentRecords.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);
    System.assert(results[0].totalSize <= 1);
  }

  @isTest
  static void execute_disallowedObject_returnsError() {
    ProjectMCPListRecentRecords.Input inp = new ProjectMCPListRecentRecords.Input();
    inp.objectApiName = 'Opportunity';

    List<ProjectMCPListRecentRecords.Output> results = ProjectMCPListRecentRecords.execute(
      new List<ProjectMCPListRecentRecords.Input>{ inp }
    );

    System.assertEquals(false, results[0].success);
    System.assert(results[0].error.contains('not permitted'));
  }

  @isTest
  static void execute_zeroLimit_defaultsToTen() {
    ProjectMCPListRecentRecords.Input inp = new ProjectMCPListRecentRecords.Input();
    inp.objectApiName = 'Sprint__c';
    inp.recordLimit = 0;

    List<ProjectMCPListRecentRecords.Output> results = ProjectMCPListRecentRecords.execute(
      new List<ProjectMCPListRecentRecords.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);
  }
}
