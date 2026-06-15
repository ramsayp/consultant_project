@isTest
private class ProjectMCPGetObjectSchema_Test {
  @isTest
  static void execute_noObjects_returnsAllSixObjects() {
    ProjectMCPGetObjectSchema.Input inp = new ProjectMCPGetObjectSchema.Input();
    // objects field left null — should return all 6

    List<ProjectMCPGetObjectSchema.Output> results = ProjectMCPGetObjectSchema.execute(
      new List<ProjectMCPGetObjectSchema.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);
    Map<String, Object> schema = (Map<String, Object>) JSON.deserializeUntyped(
      results[0].schema
    );
    System.assertEquals(
      6,
      schema.keySet().size(),
      'Should return schema for all 6 objects'
    );
  }

  @isTest
  static void execute_specificObject_returnsOnlyThatObject() {
    ProjectMCPGetObjectSchema.Input inp = new ProjectMCPGetObjectSchema.Input();
    inp.objects = 'Sprint__c';

    List<ProjectMCPGetObjectSchema.Output> results = ProjectMCPGetObjectSchema.execute(
      new List<ProjectMCPGetObjectSchema.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);
    Map<String, Object> schema = (Map<String, Object>) JSON.deserializeUntyped(
      results[0].schema
    );
    System.assertEquals(1, schema.keySet().size());
    System.assert(schema.containsKey('Sprint__c'));
  }

  @isTest
  static void execute_multipleObjects_returnsMultiple() {
    ProjectMCPGetObjectSchema.Input inp = new ProjectMCPGetObjectSchema.Input();
    inp.objects = 'Sprint__c, Work_Item__c';

    List<ProjectMCPGetObjectSchema.Output> results = ProjectMCPGetObjectSchema.execute(
      new List<ProjectMCPGetObjectSchema.Input>{ inp }
    );

    System.assertEquals(true, results[0].success);
    Map<String, Object> schema = (Map<String, Object>) JSON.deserializeUntyped(
      results[0].schema
    );
    System.assertEquals(2, schema.keySet().size());
  }

  @isTest
  static void execute_disallowedObject_returnsError() {
    ProjectMCPGetObjectSchema.Input inp = new ProjectMCPGetObjectSchema.Input();
    inp.objects = 'Account';

    List<ProjectMCPGetObjectSchema.Output> results = ProjectMCPGetObjectSchema.execute(
      new List<ProjectMCPGetObjectSchema.Input>{ inp }
    );

    System.assertEquals(false, results[0].success);
    System.assert(results[0].error.contains('not permitted'));
  }

  @isTest
  static void execute_schemaContainsFieldDetails() {
    ProjectMCPGetObjectSchema.Input inp = new ProjectMCPGetObjectSchema.Input();
    inp.objects = 'Sprint__c';

    List<ProjectMCPGetObjectSchema.Output> results = ProjectMCPGetObjectSchema.execute(
      new List<ProjectMCPGetObjectSchema.Input>{ inp }
    );

    Map<String, Object> schema = (Map<String, Object>) JSON.deserializeUntyped(
      results[0].schema
    );
    Map<String, Object> sprintSchema = (Map<String, Object>) schema.get(
      'Sprint__c'
    );
    System.assertNotEquals(null, sprintSchema.get('label'));
    List<Object> fields = (List<Object>) sprintSchema.get('fields');
    System.assert(fields.size() > 0, 'Should return at least one field');
  }
}
