public with sharing class ProjectMCPUtils {
  public static final Set<String> ALLOWED_OBJECTS = new Set<String>{
    'Work_Item__c',
    'Sprint__c',
    'Documentation__c',
    'Change_Log__c',
    'Comment__c',
    'Folder__c'
  };

  public static void validateObject(String objectApiName) {
    if (
      String.isBlank(objectApiName) || !ALLOWED_OBJECTS.contains(objectApiName)
    ) {
      String msg =
        'Object not permitted: ' +
        objectApiName +
        '. This MCP server only allows access to project custom objects: ' +
        String.join(new List<String>(ALLOWED_OBJECTS), ', ');
      AuraHandledException ahe = new AuraHandledException(msg);
      ahe.setMessage(msg);
      throw ahe;
    }
  }

  // Returns the main (outermost) FROM object in a SOQL string.
  // Takes the last FROM match so subquery relationship names are skipped.
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
