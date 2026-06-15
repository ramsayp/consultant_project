global with sharing class ProjectMCPCreateRecord {
  global class Input {
    @InvocableVariable(
      required=true
      description='API name of the object to create a record for. Must be one of: Work_Item__c, Sprint__c, Documentation__c, Change_Log__c, Comment__c, Folder__c.'
    )
    public String objectApiName;
    @InvocableVariable(
      required=true
      description='JSON string of field name to value pairs, e.g. {"Name":"My Record","Status__c":"Active"}.'
    )
    public String fieldsJson;
  }

  global class Output {
    @InvocableVariable
    public String recordId;
    @InvocableVariable
    public Boolean success;
    @InvocableVariable
    public String error;
  }

  @InvocableMethod(
    label='Create Sobject Record'
    description='Creates a record for a project custom object. Allowed objects: Work_Item__c, Sprint__c, Documentation__c, Change_Log__c, Comment__c, Folder__c.'
  )
  global static List<Output> execute(List<Input> inputs) {
    List<Output> results = new List<Output>();
    for (Input inp : inputs) {
      Output out = new Output();
      try {
        ProjectMCPUtils.validateObject(inp.objectApiName);
        Map<String, Object> fields = (Map<String, Object>) JSON.deserializeUntyped(
          inp.fieldsJson
        );
        Schema.SObjectType sObjType = Schema.getGlobalDescribe()
          .get(inp.objectApiName);
        SObject record = sObjType.newSObject();
        for (String fieldName : fields.keySet()) {
          record.put(fieldName, fields.get(fieldName));
        }
        insert record;
        out.recordId = record.Id;
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
