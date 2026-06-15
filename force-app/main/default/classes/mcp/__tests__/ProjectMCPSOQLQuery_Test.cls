@isTest
private class ProjectMCPSOQLQuery_Test {
  @TestSetup
  static void makeData() {
    insert new Sprint__c(
      Name = 'Test Sprint',
      Status__c = 'Active',
      Sequence__c = 1,
      RecordTypeId = Schema.SObjectType.Sprint__c
        .getRecordTypeInfosByDeveloperName()
        .get('Sprint')
        .getRecordTypeId()
    );
  }

  @isTest
  static void execute_validQuery_returnsRecords() {
    ProjectMCPSOQLQuery.Input inp = new ProjectMCPSOQLQuery.Input();
    inp.query = 'SELECT Id, Name FROM Sprint__c LIMIT 1';

    List<ProjectMCPSOQLQuery.Output> results = ProjectMCPSOQLQuery.execute(
      new List<ProjectMCPSOQLQuery.Input>{ inp }
    );

    System.assertEquals(1, results.size());
    System.assertEquals(true, results[0].success);
    System.assert(results[0].totalSize >= 0);
    System.assertNotEquals(null, results[0].records);
  }

  @isTest
  static void execute_disallowedObject_returnsError() {
    ProjectMCPSOQLQuery.Input inp = new ProjectMCPSOQLQuery.Input();
    inp.query = 'SELECT Id FROM Account LIMIT 1';

    List<ProjectMCPSOQLQuery.Output> results = ProjectMCPSOQLQuery.execute(
      new List<ProjectMCPSOQLQuery.Input>{ inp }
    );

    System.assertEquals(1, results.size());
    System.assertEquals(false, results[0].success);
    System.assert(
      results[0].error.contains('not permitted'),
      'Error should mention object not permitted'
    );
  }

  @isTest
  static void execute_invalidSoql_returnsError() {
    ProjectMCPSOQLQuery.Input inp = new ProjectMCPSOQLQuery.Input();
    inp.query = 'SELECT FROM Sprint__c';

    List<ProjectMCPSOQLQuery.Output> results = ProjectMCPSOQLQuery.execute(
      new List<ProjectMCPSOQLQuery.Input>{ inp }
    );

    System.assertEquals(false, results[0].success);
    System.assertNotEquals(null, results[0].error);
  }

  @isTest
  static void execute_recordTypeQuery_succeeds() {
    ProjectMCPSOQLQuery.Input inp = new ProjectMCPSOQLQuery.Input();
    inp.query = 'SELECT Id, DeveloperName FROM RecordType WHERE SObjectType = \'Sprint__c\' LIMIT 1';

    List<ProjectMCPSOQLQuery.Output> results = ProjectMCPSOQLQuery.execute(
      new List<ProjectMCPSOQLQuery.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);
    System.assertNotEquals(null, results[0].records);
  }

  @isTest
  static void execute_multipleInputs_returnsOneResultEach() {
    ProjectMCPSOQLQuery.Input inp1 = new ProjectMCPSOQLQuery.Input();
    inp1.query = 'SELECT Id FROM Sprint__c LIMIT 1';
    ProjectMCPSOQLQuery.Input inp2 = new ProjectMCPSOQLQuery.Input();
    inp2.query = 'SELECT Id FROM Work_Item__c LIMIT 1';

    List<ProjectMCPSOQLQuery.Output> results = ProjectMCPSOQLQuery.execute(
      new List<ProjectMCPSOQLQuery.Input>{ inp1, inp2 }
    );

    System.assertEquals(2, results.size());
  }
}
