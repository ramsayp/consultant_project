@isTest
private class ProjectMCPUtils_Test {
  // ── validateObject ────────────────────────────────────────────────────────

  @isTest
  static void validateObject_allowedObject_noException() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateObject('Work_Item__c');
    } catch (Exception e) {
      threw = true;
    }
    System.assertEquals(false, threw, 'Should not throw for an allowed object');
  }

  @isTest
  static void validateObject_allAllowedObjects_pass() {
    for (String obj : ProjectMCPUtils.ALLOWED_OBJECTS) {
      Boolean threw = false;
      try {
        ProjectMCPUtils.validateObject(obj);
      } catch (Exception e) {
        threw = true;
      }
      System.assertEquals(false, threw, obj + ' should be permitted');
    }
  }

  @isTest
  static void validateObject_disallowedObject_throwsException() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateObject('Account');
    } catch (AuraHandledException e) {
      threw = true;
    }
    System.assertEquals(true, threw, 'Should throw for a non-project object');
  }

  @isTest
  static void validateObject_blank_throwsException() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateObject('');
    } catch (AuraHandledException e) {
      threw = true;
    }
    System.assertEquals(true, threw, 'Should throw for blank input');
  }

  @isTest
  static void validateObject_null_throwsException() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateObject(null);
    } catch (AuraHandledException e) {
      threw = true;
    }
    System.assertEquals(true, threw, 'Should throw for null input');
  }

  // ── extractFromObject ─────────────────────────────────────────────────────

  @isTest
  static void extractFromObject_simpleQuery_returnsObject() {
    String result = ProjectMCPUtils.extractFromObject(
      'SELECT Id FROM Work_Item__c'
    );
    System.assertEquals('Work_Item__c', result);
  }

  @isTest
  static void extractFromObject_caseInsensitive_returnsObject() {
    String result = ProjectMCPUtils.extractFromObject(
      'select id from Sprint__c limit 10'
    );
    System.assertEquals('Sprint__c', result);
  }

  @isTest
  static void extractFromObject_queryWithSubquery_returnsOuterObject() {
    String result = ProjectMCPUtils.extractFromObject(
      'SELECT Id, (SELECT Id FROM Comments__r) FROM Work_Item__c'
    );
    System.assertEquals(
      'Work_Item__c',
      result,
      'Should return last FROM match (outer object)'
    );
  }

  @isTest
  static void extractFromObject_blankSoql_returnsNull() {
    String result = ProjectMCPUtils.extractFromObject('');
    System.assertEquals(null, result);
  }

  @isTest
  static void extractFromObject_nullSoql_returnsNull() {
    String result = ProjectMCPUtils.extractFromObject(null);
    System.assertEquals(null, result);
  }
}
