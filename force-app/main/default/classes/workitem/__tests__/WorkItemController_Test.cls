@isTest
private class WorkItemController_Test {
  // ── Helpers ──────────────────────────────────────────────────────────────

  static Id wiRtId(String name) {
    return Schema.SObjectType.Work_Item__c
      .getRecordTypeInfosByName()
      .get(name)
      .getRecordTypeId();
  }

  static Id commentRtId() {
    return Schema.SObjectType.Comment__c
      .getRecordTypeInfosByName()
      .get('Work Item Comments')
      .getRecordTypeId();
  }

  // ── Test setup ────────────────────────────────────────────────────────────

  @TestSetup
  static void makeData() {
    Sprint__c backlog = new Sprint__c(
      Name = 'Backlog',
      Status__c = 'Backlog',
      Sequence__c = 9999
    );
    Sprint__c sprint1 = new Sprint__c(
      Name = 'Sprint 1',
      Status__c = 'Active',
      Start_Date__c = Date.today(),
      End_Date__c = Date.today().addDays(13),
      Sequence__c = 1
    );
    insert new List<Sprint__c>{ backlog, sprint1 };

    Work_Item__c project = new Work_Item__c(
      Name = 'Test Project',
      RecordTypeId = wiRtId('Project'),
      Status__c = 'Active'
    );
    insert project;

    Work_Item__c epic = new Work_Item__c(
      Name = 'Test Epic',
      RecordTypeId = wiRtId('Epic'),
      Status__c = 'Not Started',
      Parent_Work_Item__c = project.Id
    );
    insert epic;

    Work_Item__c story = new Work_Item__c(
      Name = 'Test Story',
      RecordTypeId = wiRtId('Story'),
      Status__c = 'Not Started',
      Parent_Work_Item__c = epic.Id,
      Sprint__c = sprint1.Id,
      Priority__c = 'High'
    );
    Work_Item__c task = new Work_Item__c(
      Name = 'Test Task',
      RecordTypeId = wiRtId('Task'),
      Status__c = 'Not Started',
      Parent_Work_Item__c = epic.Id,
      Sprint__c = sprint1.Id,
      Priority__c = 'Medium'
    );
    Work_Item__c bug = new Work_Item__c(
      Name = 'Test Bug',
      RecordTypeId = wiRtId('Bug'),
      Status__c = 'Not Started',
      Parent_Work_Item__c = epic.Id,
      Sprint__c = sprint1.Id,
      Priority__c = 'Critical'
    );
    insert new List<Work_Item__c>{ story, task, bug };

    insert new Comment__c(
      Work_Item__c = story.Id,
      Body__c = 'Initial comment',
      RecordTypeId = commentRtId()
    );
  }

  // ── getWorkItems ──────────────────────────────────────────────────────────

  @isTest
  static void testGetWorkItems_byType() {
    Test.startTest();
    List<Work_Item__c> result = WorkItemController.getWorkItems(
      'Project',
      null,
      null
    );
    Test.stopTest();
    System.assertEquals(1, result.size());
    System.assertEquals('Test Project', result[0].Name);
  }

  @isTest
  static void testGetWorkItems_bySprint() {
    Sprint__c sprint = [
      SELECT Id
      FROM Sprint__c
      WHERE Name = 'Sprint 1'
      LIMIT 1
    ];
    Test.startTest();
    List<Work_Item__c> result = WorkItemController.getWorkItems(
      'Story',
      sprint.Id,
      null
    );
    Test.stopTest();
    System.assertEquals(1, result.size());
    System.assertEquals('Test Story', result[0].Name);
  }

  @isTest
  static void testGetWorkItems_byProject_returnsEpics() {
    Work_Item__c project = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Project'
      LIMIT 1
    ];
    Test.startTest();
    List<Work_Item__c> result = WorkItemController.getWorkItems(
      'Epic',
      null,
      project.Id
    );
    Test.stopTest();
    System.assertEquals(1, result.size());
    System.assertEquals('Test Epic', result[0].Name);
  }

  // ── getWorkItemMeta ───────────────────────────────────────────────────────

  @isTest
  static void testGetWorkItemMeta() {
    Work_Item__c story = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Story'
      LIMIT 1
    ];
    Test.startTest();
    Map<String, Object> meta = WorkItemController.getWorkItemMeta(story.Id);
    Test.stopTest();
    System.assertEquals('Story', meta.get('typeName'));
    System.assertNotEquals(null, meta.get('sprintId'));
  }

  // ── getChildren ───────────────────────────────────────────────────────────

  @isTest
  static void testGetChildren() {
    Work_Item__c epic = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];
    Test.startTest();
    List<Work_Item__c> children = WorkItemController.getChildren(epic.Id);
    Test.stopTest();
    System.assertEquals(3, children.size());
  }

  // ── getEpics ──────────────────────────────────────────────────────────────

  @isTest
  static void testGetEpics() {
    Test.startTest();
    List<Work_Item__c> epics = WorkItemController.getEpics(null);
    Test.stopTest();
    System.assertEquals(1, epics.size());
    System.assertEquals('Test Epic', epics[0].Name);
  }

  // ── getSprints ────────────────────────────────────────────────────────────

  @isTest
  static void testGetActiveSprints() {
    Test.startTest();
    List<Sprint__c> sprints = WorkItemController.getActiveSprints();
    Test.stopTest();
    System.assert(!sprints.isEmpty());
  }

  @isTest
  static void testGetAllSprints() {
    Test.startTest();
    List<Sprint__c> sprints = WorkItemController.getAllSprints();
    Test.stopTest();
    System.assert(!sprints.isEmpty());
  }

  // ── ensureBacklogSprint ───────────────────────────────────────────────────

  @isTest
  static void testEnsureBacklogSprint_doesNotDuplicate() {
    Integer before = [
      SELECT COUNT()
      FROM Sprint__c
      WHERE Status__c = 'Backlog'
    ];
    Test.startTest();
    WorkItemController.ensureBacklogSprint();
    Test.stopTest();
    Integer after = [SELECT COUNT() FROM Sprint__c WHERE Status__c = 'Backlog'];
    System.assertEquals(before, after);
  }

  @isTest
  static void testEnsureBacklogSprint_creates() {
    delete [SELECT Id FROM Sprint__c WHERE Status__c = 'Backlog'];
    Test.startTest();
    WorkItemController.ensureBacklogSprint();
    Test.stopTest();
    System.assertEquals(
      1,
      [SELECT COUNT() FROM Sprint__c WHERE Status__c = 'Backlog']
    );
  }

  // ── getStatusColumns ──────────────────────────────────────────────────────

  @isTest
  static void testGetStatusColumns() {
    Test.startTest();
    Map<String, List<String>> cols = WorkItemController.getStatusColumns();
    Test.stopTest();
    System.assert(cols.containsKey('Project'));
    System.assert(cols.containsKey('Story'));
    System.assert(cols.get('Project').contains('Active'));
    System.assert(cols.get('Story').contains('In Progress'));
  }

  // ── getBoardItems ─────────────────────────────────────────────────────────

  @isTest
  static void testGetBoardItems_forProject() {
    Work_Item__c project = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Project'
      LIMIT 1
    ];
    Test.startTest();
    List<Work_Item__c> items = WorkItemController.getBoardItems(project.Id);
    Test.stopTest();
    System.assert(!items.isEmpty());
    for (Work_Item__c w : items) {
      System.assertNotEquals(
        'Project',
        w.RecordType.Name,
        'Project itself should not appear in board items'
      );
    }
  }

  @isTest
  static void testGetBoardItems_nullProject() {
    Test.startTest();
    List<Work_Item__c> items = WorkItemController.getBoardItems(null);
    Test.stopTest();
    System.assert(!items.isEmpty());
  }

  // ── updateStatus ──────────────────────────────────────────────────────────

  @isTest
  static void testUpdateStatus() {
    Work_Item__c story = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Story'
      LIMIT 1
    ];
    Test.startTest();
    WorkItemController.updateStatus(story.Id, 'In Progress');
    Test.stopTest();
    System.assertEquals(
      'In Progress',
      [SELECT Status__c FROM Work_Item__c WHERE Id = :story.Id].Status__c
    );
  }

  // ── updateSprint ──────────────────────────────────────────────────────────

  @isTest
  static void testUpdateSprint() {
    Work_Item__c story = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Story'
      LIMIT 1
    ];
    Sprint__c backlog = [
      SELECT Id
      FROM Sprint__c
      WHERE Status__c = 'Backlog'
      LIMIT 1
    ];
    Test.startTest();
    WorkItemController.updateSprint(story.Id, backlog.Id);
    Test.stopTest();
    System.assertEquals(
      backlog.Id,
      [SELECT Sprint__c FROM Work_Item__c WHERE Id = :story.Id].Sprint__c
    );
  }

  // ── updateSequences ───────────────────────────────────────────────────────

  @isTest
  static void testUpdateSequences() {
    List<Work_Item__c> items = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name IN ('Test Story', 'Test Task', 'Test Bug')
      ORDER BY Name ASC
    ];
    List<Id> ids = new List<Id>();
    for (Work_Item__c w : items)
      ids.add(w.Id);
    Test.startTest();
    WorkItemController.updateSequences(ids);
    Test.stopTest();
    List<Work_Item__c> updated = [
      SELECT Sequence__c
      FROM Work_Item__c
      WHERE Id IN :ids
      ORDER BY Sequence__c ASC
    ];
    System.assertEquals(1, updated[0].Sequence__c.intValue());
    System.assertEquals(2, updated[1].Sequence__c.intValue());
    System.assertEquals(3, updated[2].Sequence__c.intValue());
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  @isTest
  static void testGetComments() {
    Work_Item__c story = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Story'
      LIMIT 1
    ];
    Test.startTest();
    List<Comment__c> comments = WorkItemController.getComments(story.Id);
    Test.stopTest();
    System.assertEquals(1, comments.size());
    System.assertEquals('Initial comment', comments[0].Body__c);
  }

  @isTest
  static void testAddComment() {
    Work_Item__c story = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Story'
      LIMIT 1
    ];
    Test.startTest();
    WorkItemController.addComment(story.Id, 'New comment');
    Test.stopTest();
    System.assertEquals(
      2,
      [SELECT COUNT() FROM Comment__c WHERE Work_Item__c = :story.Id]
    );
  }

  @isTest
  static void testEditComment() {
    Comment__c c = [SELECT Id FROM Comment__c LIMIT 1];
    Test.startTest();
    WorkItemController.editComment(c.Id, 'Updated body');
    Test.stopTest();
    System.assertEquals(
      'Updated body',
      [SELECT Body__c FROM Comment__c WHERE Id = :c.Id].Body__c
    );
  }

  @isTest
  static void testDeleteComment() {
    Comment__c c = [SELECT Id FROM Comment__c LIMIT 1];
    Test.startTest();
    WorkItemController.deleteComment(c.Id);
    Test.stopTest();
    System.assertEquals(0, [SELECT COUNT() FROM Comment__c WHERE Id = :c.Id]);
  }

  // ── getParentContext ──────────────────────────────────────────────────────

  @isTest
  static void testGetParentContext() {
    Work_Item__c story = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Story'
      LIMIT 1
    ];
    Test.startTest();
    Map<String, Object> ctx = WorkItemController.getParentContext(story.Id);
    Test.stopTest();
    System.assertEquals('Story', ctx.get('recordTypeName'));
    System.assertNotEquals(null, ctx.get('parentId'));
    System.assertEquals('Test Epic', ctx.get('parentName'));
  }

  // ── getCandidateParents ───────────────────────────────────────────────────

  @isTest
  static void testGetCandidateParents_story() {
    Test.startTest();
    List<Work_Item__c> parents = WorkItemController.getCandidateParents(
      'Story'
    );
    Test.stopTest();
    System.assertEquals(1, parents.size());
    System.assertEquals('Test Epic', parents[0].Name);
  }

  @isTest
  static void testGetCandidateParents_epic() {
    Test.startTest();
    List<Work_Item__c> parents = WorkItemController.getCandidateParents('Epic');
    Test.stopTest();
    System.assertEquals(1, parents.size());
    System.assertEquals('Test Project', parents[0].Name);
  }

  @isTest
  static void testGetCandidateParents_project() {
    Test.startTest();
    List<Work_Item__c> parents = WorkItemController.getCandidateParents(
      'Project'
    );
    Test.stopTest();
    System.assertEquals(0, parents.size());
  }

  // ── closeSprint ───────────────────────────────────────────────────────────

  @isTest
  static void testCloseSprint_throwsOnBacklog() {
    Sprint__c backlog = [
      SELECT Id
      FROM Sprint__c
      WHERE Status__c = 'Backlog'
      LIMIT 1
    ];
    Test.startTest();
    try {
      WorkItemController.closeSprint(backlog.Id);
      System.assert(false, 'Expected AuraHandledException');
    } catch (AuraHandledException e) {
      System.assertNotEquals(null, e.getMessage());
    }
    Test.stopTest();
  }

  @isTest
  static void testCloseSprint_completesAndCreatesNext() {
    Sprint__c sprint = [
      SELECT Id
      FROM Sprint__c
      WHERE Status__c = 'Active'
      LIMIT 1
    ];
    Integer countBefore = [SELECT COUNT() FROM Sprint__c];
    Test.startTest();
    Sprint__c next = WorkItemController.closeSprint(sprint.Id);
    Test.stopTest();
    System.assertNotEquals(null, next.Id);
    System.assertEquals(countBefore + 1, [SELECT COUNT() FROM Sprint__c]);
    System.assertEquals(
      'Completed',
      [SELECT Status__c FROM Sprint__c WHERE Id = :sprint.Id].Status__c
    );
    System.assertEquals('Planning', next.Status__c);
  }
}
