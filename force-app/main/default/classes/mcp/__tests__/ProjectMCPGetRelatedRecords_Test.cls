@isTest
private class ProjectMCPGetRelatedRecords_Test {
  @TestSetup
  static void makeData() {
    Id wiProjectRtId = Schema.SObjectType.Work_Item__c
      .getRecordTypeInfosByName()
      .get('Project')
      .getRecordTypeId();

    Work_Item__c project = new Work_Item__c(
      Name = 'Test Project',
      RecordTypeId = wiProjectRtId,
      Status__c = 'Active'
    );
    insert project;

    Id commentRtId = Schema.SObjectType.Comment__c
      .getRecordTypeInfosByName()
      .get('Work Item Comments')
      .getRecordTypeId();

    insert new Comment__c(
      Work_Item__c = project.Id,
      Body__c = 'Test comment',
      RecordTypeId = commentRtId
    );
  }

  @isTest
  static void execute_validRelationship_returnsChildren() {
    Work_Item__c project = [SELECT Id FROM Work_Item__c LIMIT 1];

    ProjectMCPGetRelatedRecords.Input inp = new ProjectMCPGetRelatedRecords.Input();
    inp.parentId = project.Id;
    inp.childObjectApiName = 'Comment__c';
    inp.parentLookupField = 'Work_Item__c';
    inp.fields = 'Id, Body__c';

    List<ProjectMCPGetRelatedRecords.Output> results = ProjectMCPGetRelatedRecords.execute(
      new List<ProjectMCPGetRelatedRecords.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);
    System.assertEquals(1, results[0].totalSize);
  }

  @isTest
  static void execute_disallowedParent_returnsError() {
    ProjectMCPGetRelatedRecords.Input inp = new ProjectMCPGetRelatedRecords.Input();
    inp.parentId = UserInfo.getUserId();
    inp.childObjectApiName = 'Comment__c';
    inp.parentLookupField = 'Work_Item__c';

    List<ProjectMCPGetRelatedRecords.Output> results = ProjectMCPGetRelatedRecords.execute(
      new List<ProjectMCPGetRelatedRecords.Input>{ inp }
    );

    System.assertEquals(false, results[0].success);
    System.assert(results[0].error.contains('not permitted'));
  }

  @isTest
  static void execute_disallowedChild_returnsError() {
    Work_Item__c project = [SELECT Id FROM Work_Item__c LIMIT 1];

    ProjectMCPGetRelatedRecords.Input inp = new ProjectMCPGetRelatedRecords.Input();
    inp.parentId = project.Id;
    inp.childObjectApiName = 'Task';
    inp.parentLookupField = 'WhatId';

    List<ProjectMCPGetRelatedRecords.Output> results = ProjectMCPGetRelatedRecords.execute(
      new List<ProjectMCPGetRelatedRecords.Input>{ inp }
    );

    System.assertEquals(false, results[0].success);
    System.assert(results[0].error.contains('not permitted'));
  }

  @isTest
  static void execute_defaultFieldsAndLimit_work() {
    Work_Item__c project = [SELECT Id FROM Work_Item__c LIMIT 1];

    ProjectMCPGetRelatedRecords.Input inp = new ProjectMCPGetRelatedRecords.Input();
    inp.parentId = project.Id;
    inp.childObjectApiName = 'Comment__c';
    inp.parentLookupField = 'Work_Item__c';
    // fields and recordLimit intentionally omitted

    List<ProjectMCPGetRelatedRecords.Output> results = ProjectMCPGetRelatedRecords.execute(
      new List<ProjectMCPGetRelatedRecords.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);
  }
}
