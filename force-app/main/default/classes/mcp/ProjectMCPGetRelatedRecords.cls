global with sharing class ProjectMCPGetRelatedRecords {
  public class Input {
    @InvocableVariable(required=true description='Parent record Id.')
    public String parentId;
    @InvocableVariable(
      required=true
      description='API name of the child object to query, e.g. Comment__c. Must be one of the six project custom objects.'
    )
    public String childObjectApiName;
    @InvocableVariable(
      required=true
      description='API name of the lookup field on the child object that points to the parent, e.g. Work_Item__c.'
    )
    public String parentLookupField;
    @InvocableVariable(
      description='Comma-separated field names to return. Defaults to Id, Name.'
    )
    public String fields;
    @InvocableVariable(description='Maximum records to return. Defaults to 50.')
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
    label='Get Related Records'
    description='Returns child records for a parent record. Both the parent and child objects must be project custom objects.'
  )
  public static List<Output> execute(List<Input> inputs) {
    List<Output> results = new List<Output>();
    for (Input inp : inputs) {
      Output out = new Output();
      try {
        Id parentRecId = Id.valueOf(inp.parentId);
        String parentObjType = parentRecId.getSObjectType()
          .getDescribe()
          .getName();
        ProjectMCPUtils.validateObject(parentObjType);
        ProjectMCPUtils.validateObject(inp.childObjectApiName);
        String fieldList = String.isBlank(inp.fields) ? 'Id, Name' : inp.fields;
        Integer lim = (inp.recordLimit != null &&
          inp.recordLimit > 0)
          ? inp.recordLimit
          : 50;
        String query =
          'SELECT ' +
          fieldList +
          ' FROM ' +
          inp.childObjectApiName +
          ' WHERE ' +
          inp.parentLookupField +
          ' = :parentRecId' +
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
