public with sharing class ProjectMCPUtils {
  public static final Set<String> ALLOWED_OBJECTS = new Set<String>{
    'Work_Item__c',
    'Sprint__c',
    'Documentation__c',
    'Change_Log__c',
    'Comment__c',
    'Folder__c'
  };

  // RecordType is read-only permitted for SOQL queries (pre-query pattern for RecordTypeId)
  private static final Set<String> QUERY_ALLOWED_OBJECTS;
  static {
    QUERY_ALLOWED_OBJECTS = new Set<String>(ALLOWED_OBJECTS);
    QUERY_ALLOWED_OBJECTS.add('RecordType');
  }

  public static void validateObject(String objectApiName) {
    if (
      String.isBlank(objectApiName) || !ALLOWED_OBJECTS.contains(objectApiName)
    ) {
      throw new IllegalArgumentException(
        'Object not permitted: ' +
          objectApiName +
          '. This MCP server only allows access to project custom objects: ' +
          String.join(new List<String>(ALLOWED_OBJECTS), ', ')
      );
    }
  }

  public static void validateQueryObject(String objectApiName) {
    if (
      String.isBlank(objectApiName) ||
      !QUERY_ALLOWED_OBJECTS.contains(objectApiName)
    ) {
      throw new IllegalArgumentException(
        'Object not permitted: ' +
          objectApiName +
          '. SOQL queries are restricted to project custom objects and RecordType.'
      );
    }
  }

  // Validates every FROM clause in a SOQL string against QUERY_ALLOWED_OBJECTS.
  // Relationship names (ending in __r) are skipped — they are child traversals
  // bounded by the outer object and cannot reference arbitrary non-project data.
  // This blocks WHERE subquery bypasses like:
  //   SELECT Id FROM Account WHERE Id IN (SELECT Id FROM Work_Item__c)
  // where the outer FROM (Account) would previously be missed by extractFromObject.
  public static void validateAllFromObjects(String soql) {
    if (String.isBlank(soql))
      return;
    Pattern p = Pattern.compile('(?i)\\bFROM\\s+(\\w+)');
    Matcher m = p.matcher(soql);
    while (m.find()) {
      String obj = m.group(1);
      if (!obj.endsWith('__r')) {
        validateQueryObject(obj);
      }
    }
  }

  // Returns the first non-relationship FROM object in a SOQL string.
  // Used for error reporting; validation should use validateAllFromObjects.
  public static String extractFromObject(String soql) {
    if (String.isBlank(soql))
      return null;
    Pattern p = Pattern.compile('(?i)\\bFROM\\s+(\\w+)');
    Matcher m = p.matcher(soql);
    String last = null;
    while (m.find()) {
      last = m.group(1);
    }
    return last;
  }
}
