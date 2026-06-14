global with sharing class ProjectMCPGetUserInfo {
  public class Output {
    @InvocableVariable
    public String userId;
    @InvocableVariable
    public String name;
    @InvocableVariable
    public String email;
    @InvocableVariable
    public String username;
    @InvocableVariable
    public String profileName;
    @InvocableVariable
    public Boolean success;
    @InvocableVariable
    public String error;
  }

  @InvocableMethod(
    label='Get User Info'
    description='Returns identity information for the currently authenticated Salesforce user.'
  )
  public static List<Output> execute(List<String> inputs) {
    Output out = new Output();
    try {
      User u = [
        SELECT Id, Name, Email, Username, Profile.Name
        FROM User
        WHERE Id = :UserInfo.getUserId()
      ];
      out.userId = u.Id;
      out.name = u.Name;
      out.email = u.Email;
      out.username = u.Username;
      out.profileName = u.Profile.Name;
      out.success = true;
    } catch (Exception e) {
      out.success = false;
      out.error = e.getMessage();
    }
    List<Output> results = new List<Output>();
    for (Integer i = 0; i < inputs.size(); i++) {
      results.add(out);
    }
    return results;
  }
}
