@isTest
private class ProjectMCPCreateRecord_Test {
  @isTest
  static void execute_validRecord_createsAndReturnsId() {
    Id sprintRtId = Schema.SObjectType.Sprint__c
      .getRecordTypeInfosByDeveloperName()
      .get('Sprint')
      .getRecordTypeId();

    ProjectMCPCreateRecord.Input inp = new ProjectMCPCreateRecord.Input();
    inp.objectApiName = 'Sprint__c';
    inp.fieldsJson =
      '{"Name":"MCP Created Sprint","Status__c":"Active","Sequence__c":5,"RecordTypeId":"' +
      sprintRtId +
      '"}';

    List<ProjectMCPCreateRecord.Output> results = ProjectMCPCreateRecord.execute(
      new List<ProjectMCPCreateRecord.Input>{ inp }
    );

    System.assertEquals(1, results.size());
    System.assertEquals(true, results[0].success);
    System.assertNotEquals(null, results[0].recordId);

    Sprint__c created = [
      SELECT Name
      FROM Sprint__c
      WHERE Id = :results[0].recordId
    ];
    System.assertEquals('MCP Created Sprint', created.Name);
  }

  @isTest
  static void execute_disallowedObject_returnsError() {
    ProjectMCPCreateRecord.Input inp = new ProjectMCPCreateRecord.Input();
    inp.objectApiName = 'Contact';
    inp.fieldsJson = '{"LastName":"Test"}';

    List<ProjectMCPCreateRecord.Output> results = ProjectMCPCreateRecord.execute(
      new List<ProjectMCPCreateRecord.Input>{ inp }
    );

    System.assertEquals(false, results[0].success);
    System.assert(results[0].error.contains('not permitted'));
  }

  @isTest
  static void execute_invalidJson_returnsError() {
    ProjectMCPCreateRecord.Input inp = new ProjectMCPCreateRecord.Input();
    inp.objectApiName = 'Sprint__c';
    inp.fieldsJson = 'not-json';

    List<ProjectMCPCreateRecord.Output> results = ProjectMCPCreateRecord.execute(
      new List<ProjectMCPCreateRecord.Input>{ inp }
    );

    System.assertEquals(false, results[0].success);
    System.assertNotEquals(null, results[0].error);
  }
}
