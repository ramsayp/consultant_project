@isTest
private class ProjectMCPGetUserInfo_Test {
  @isTest
  static void execute_returnsCurrentUser() {
    List<ProjectMCPGetUserInfo.Output> results = ProjectMCPGetUserInfo.execute(
      new List<String>{ '' }
    );

    System.assertEquals(1, results.size());
    System.assertEquals(true, results[0].success);
    System.assertEquals(UserInfo.getUserId(), results[0].userId);
    System.assertNotEquals(null, results[0].name);
    System.assertNotEquals(null, results[0].email);
    System.assertNotEquals(null, results[0].username);
    System.assertNotEquals(null, results[0].profileName);
  }

  @isTest
  static void execute_multipleInputs_returnsSameUserForEach() {
    List<ProjectMCPGetUserInfo.Output> results = ProjectMCPGetUserInfo.execute(
      new List<String>{ '', '' }
    );

    System.assertEquals(2, results.size());
    System.assertEquals(results[0].userId, results[1].userId);
  }
}
