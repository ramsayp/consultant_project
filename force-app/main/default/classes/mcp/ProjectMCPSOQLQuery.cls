global with sharing class ProjectMCPSOQLQuery {
  global class Input {
    @InvocableVariable(
      required=true
      description='SOQL query to execute. Project custom objects and RecordType are permitted: Work_Item__c, Sprint__c, Documentation__c, Change_Log__c, Comment__c, Folder__c, RecordType.'
    )
    public String query;
  }

  global class Output {
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
  global static List<Output> execute(List<Input> inputs) {
    List<Output> results = new List<Output>();
    for (Input inp : inputs) {
      Output out = new Output();
      try {
        ProjectMCPUtils.validateAllFromObjects(inp.query);
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
