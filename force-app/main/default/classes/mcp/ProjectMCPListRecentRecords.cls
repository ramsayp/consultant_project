global with sharing class ProjectMCPListRecentRecords {
  public class Input {
    @InvocableVariable(
      required=true
      description='API name of the object to list recent records for. Must be one of: Work_Item__c, Sprint__c, Documentation__c, Change_Log__c, Comment__c, Folder__c.'
    )
    public String objectApiName;
    @InvocableVariable(
      description='Comma-separated field names to return. Defaults to Id, Name, LastModifiedDate.'
    )
    public String fields;
    @InvocableVariable(description='Maximum records to return. Defaults to 10.')
    public Integer recordLimit;
  }

  public class Output {
    @InvocableVariable
    public String records;
    @InvocableVariable
    public Integer totalSize;
    @InvocableVariable
    public Boolean success;
    @InvocableVariable
    public String error;
  }

  @InvocableMethod(
    label='List Recent Sobject Records'
    description='Returns the most recently modified records for a project custom object, ordered by LastModifiedDate descending.'
  )
  public static List<Output> execute(List<Input> inputs) {
    List<Output> results = new List<Output>();
    for (Input inp : inputs) {
      Output out = new Output();
      try {
        ProjectMCPUtils.validateObject(inp.objectApiName);
        String fieldList = String.isBlank(inp.fields)
          ? 'Id, Name, LastModifiedDate'
          : inp.fields;
        Integer lim = (inp.recordLimit != null &&
          inp.recordLimit > 0)
          ? inp.recordLimit
          : 10;
        String query =
          'SELECT ' +
          fieldList +
          ' FROM ' +
          inp.objectApiName +
          ' ORDER BY LastModifiedDate DESC' +
          ' LIMIT ' +
          lim;
        List<SObject> records = Database.query(query);
        out.records = JSON.serialize(records);
        out.totalSize = records.size();
        out.success = true;
      } catch (Exception e) {
        out.success = false;
        out.error = e.getMessage();
      }
      results.add(out);
    }
    return results;
  }
}
