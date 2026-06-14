global with sharing class ProjectMCPGetObjectSchema {
  public class Input {
    @InvocableVariable(
      description='Comma-separated object API names. If omitted, returns schema for all six project custom objects.'
    )
    public String objects;
  }

  public class Output {
    @InvocableVariable
    public String schema;
    @InvocableVariable
    public Boolean success;
    @InvocableVariable
    public String error;
  }

  @InvocableMethod(
    label='Get Object Schema'
    description='Returns field-level schema for project custom objects. Call with no parameters to get all six objects, or pass a comma-separated list of names.'
  )
  public static List<Output> execute(List<Input> inputs) {
    List<Output> results = new List<Output>();
    for (Input inp : inputs) {
      Output out = new Output();
      try {
        List<String> objectNames;
        if (String.isBlank(inp.objects)) {
          objectNames = new List<String>(ProjectMCPUtils.ALLOWED_OBJECTS);
        } else {
          objectNames = new List<String>();
          for (String name : inp.objects.split(',')) {
            String trimmed = name.trim();
            ProjectMCPUtils.validateObject(trimmed);
            objectNames.add(trimmed);
          }
        }
        Map<String, Object> schemaMap = new Map<String, Object>();
        for (String objName : objectNames) {
          Schema.SObjectType sObjType = Schema.getGlobalDescribe().get(objName);
          if (sObjType == null)
            continue;
          Schema.DescribeSObjectResult describe = sObjType.getDescribe();
          List<Map<String, Object>> fieldList = new List<Map<String, Object>>();
          for (Schema.SObjectField field : describe.fields.getMap().values()) {
            Schema.DescribeFieldResult fd = field.getDescribe();
            fieldList.add(
              new Map<String, Object>{
                'name' => fd.getName(),
                'label' => fd.getLabel(),
                'type' => String.valueOf(fd.getType()),
                'required' => !fd.isNillable() && fd.isCreateable(),
                'updateable' => fd.isUpdateable()
              }
            );
          }
          schemaMap.put(
            objName,
            new Map<String, Object>{
              'label' => describe.getLabel(),
              'fields' => fieldList
            }
          );
        }
        out.schema = JSON.serialize(schemaMap);
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
