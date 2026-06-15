global with sharing class ProjectMCPUpdateRecord {
  global class Input {
    @InvocableVariable(
      required=true
      description='Salesforce record Id to update.'
    )
    public String recordId;
    @InvocableVariable(
      required=true
      description='JSON string of field name to value pairs to update, e.g. {"Status__c":"Done"}.'
    )
    public String fieldsJson;
  }

  global class Output {
    @InvocableVariable
    public Boolean success;
    @InvocableVariable
    public String error;
  }

  @InvocableMethod(
    label='Update Sobject Record'
    description='Updates an existing record. The record must belong to one of the project custom objects: Work_Item__c, Sprint__c, Documentation__c, Change_Log__c, Comment__c, Folder__c.'
  )
  global static List<Output> execute(List<Input> inputs) {
    List<Output> results = new List<Output>();
    for (Input inp : inputs) {
      Output out = new Output();
      try {
        Id recId = Id.valueOf(inp.recordId);
        String objectType = recId.getSObjectType().getDescribe().getName();
        ProjectMCPUtils.validateObject(objectType);
        Map<String, Object> fields = (Map<String, Object>) JSON.deserializeUntyped(
          inp.fieldsJson
        );
        SObject record = recId.getSObjectType().newSObject(recId);
        for (String fieldName : fields.keySet()) {
          record.put(fieldName, fields.get(fieldName));
        }
        update record;
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
