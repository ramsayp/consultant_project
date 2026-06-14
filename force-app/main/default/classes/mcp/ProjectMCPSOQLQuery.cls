public with sharing class ProjectMCPSOQLQuery {
  public class Input {
    @InvocableVariable(
      required=true
      description='SOQL query to execute. Only the project custom objects are permitted: Work_Item__c, Sprint__c, Documentation__c, Change_Log__c, Comment__c, Folder__c.'
    )
    public String query;
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
    label='Execute SOQL Query'
    description='Executes a SOQL query restricted to the six project custom objects. Returns results as a JSON string.'
  )
  public static List<Output> execute(List<Input> inputs) {
    List<Output> results = new List<Output>();
    for (Input inp : inputs) {
      Output out = new Output();
      try {
        String fromObj = ProjectMCPUtils.extractFromObject(inp.query);
        ProjectMCPUtils.validateObject(fromObj);
        List<SObject> records = Database.query(inp.query);
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
