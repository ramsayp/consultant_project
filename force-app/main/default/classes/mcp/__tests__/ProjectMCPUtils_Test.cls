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
    } catch (IllegalArgumentException e) {
      threw = true;
    }
    System.assertEquals(true, threw, 'Should throw for a non-project object');
  }

  @isTest
  static void validateObject_blank_throwsException() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateObject('');
    } catch (IllegalArgumentException e) {
      threw = true;
    }
    System.assertEquals(true, threw, 'Should throw for blank input');
  }

  @isTest
  static void validateObject_null_throwsException() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateObject(null);
    } catch (IllegalArgumentException e) {
      threw = true;
    }
    System.assertEquals(true, threw, 'Should throw for null input');
  }

  // ── validateQueryObject ───────────────────────────────────────────────────

  @isTest
  static void validateQueryObject_recordType_noException() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateQueryObject('RecordType');
    } catch (Exception e) {
      threw = true;
    }
    System.assertEquals(
      false,
      threw,
      'RecordType should be permitted for queries'
    );
  }

  @isTest
  static void validateQueryObject_disallowedObject_throwsException() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateQueryObject('Account');
    } catch (IllegalArgumentException e) {
      threw = true;
    }
    System.assertEquals(true, threw);
  }

  // ── validateAllFromObjects ────────────────────────────────────────────────

  @isTest
  static void validateAllFromObjects_simpleQuery_passes() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateAllFromObjects('SELECT Id FROM Work_Item__c');
    } catch (Exception e) {
      threw = true;
    }
    System.assertEquals(false, threw, 'Simple allowed query should pass');
  }

  @isTest
  static void validateAllFromObjects_recordTypeQuery_passes() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateAllFromObjects(
        'SELECT Id FROM RecordType WHERE SObjectType = \'Sprint__c\''
      );
    } catch (Exception e) {
      threw = true;
    }
    System.assertEquals(false, threw, 'RecordType should be permitted');
  }

  @isTest
  static void validateAllFromObjects_relationshipSubquery_passes() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateAllFromObjects(
        'SELECT Id, (SELECT Id FROM Work_Item_Comments__r) FROM Work_Item__c'
      );
    } catch (Exception e) {
      threw = true;
    }
    System.assertEquals(
      false,
      threw,
      'Relationship names ending in __r should be skipped'
    );
  }

  @isTest
  static void validateAllFromObjects_whereSubqueryDisallowedOuter_throws() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateAllFromObjects(
        'SELECT Id FROM Account WHERE Id IN (SELECT Id FROM Work_Item__c)'
      );
    } catch (IllegalArgumentException e) {
      threw = true;
    }
    System.assertEquals(
      true,
      threw,
      'Non-project outer FROM should be blocked even with allowed inner subquery'
    );
  }

  @isTest
  static void validateAllFromObjects_whereSubqueryDisallowedInner_throws() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateAllFromObjects(
        'SELECT Id FROM Work_Item__c WHERE OwnerId IN (SELECT Id FROM User)'
      );
    } catch (IllegalArgumentException e) {
      threw = true;
    }
    System.assertEquals(
      true,
      threw,
      'Non-project inner FROM in WHERE subquery should be blocked'
    );
  }

  @isTest
  static void validateAllFromObjects_blankSoql_noException() {
    Boolean threw = false;
    try {
      ProjectMCPUtils.validateAllFromObjects('');
    } catch (Exception e) {
      threw = true;
    }
    System.assertEquals(false, threw, 'Blank input should not throw');
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
