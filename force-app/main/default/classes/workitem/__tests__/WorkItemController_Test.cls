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

  static Id sprintBacklogRtId() {
    return Schema.SObjectType.Sprint__c
      .getRecordTypeInfosByDeveloperName()
      .get('Backlog')
      .getRecordTypeId();
  }

  static Id sprintRegularRtId() {
    return Schema.SObjectType.Sprint__c
      .getRecordTypeInfosByDeveloperName()
      .get('Sprint')
      .getRecordTypeId();
  }

  // ── Test setup ────────────────────────────────────────────────────────────

  @TestSetup
  static void makeData() {
    Sprint__c backlog = new Sprint__c(
      Name = 'Backlog',
      Status__c = 'Backlog',
      Sequence__c = 9999,
      RecordTypeId = sprintBacklogRtId()
    );
    Sprint__c sprint1 = new Sprint__c(
      Name = 'Sprint 1',
      Status__c = 'Active',
      Start_Date__c = Date.today(),
      End_Date__c = Date.today().addDays(13),
      Sequence__c = 1,
      RecordTypeId = sprintRegularRtId()
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
      Status__c = 'To Do',
      Parent_Work_Item__c = project.Id
    );
    insert epic;

    Work_Item__c story = new Work_Item__c(
      Name = 'Test Story',
      RecordTypeId = wiRtId('Story'),
      Status__c = 'To Do',
      Parent_Work_Item__c = epic.Id,
      Sprint__c = sprint1.Id,
      Priority__c = 'High'
    );
    Work_Item__c task = new Work_Item__c(
      Name = 'Test Task',
      RecordTypeId = wiRtId('Task'),
      Status__c = 'To Do',
      Parent_Work_Item__c = epic.Id,
      Sprint__c = sprint1.Id,
      Priority__c = 'Medium'
    );
    Work_Item__c bug = new Work_Item__c(
      Name = 'Test Bug',
      RecordTypeId = wiRtId('Bug'),
      Status__c = 'To Do',
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
      SELECT Id, Sprint__c
      FROM Work_Item__c
      WHERE Name = 'Test Story'
      LIMIT 1
    ];
    Test.startTest();
    Map<String, Object> meta = WorkItemController.getWorkItemMeta(story.Id);
    Test.stopTest();
    System.assertEquals('Story', meta.get('typeName'));
    System.assertEquals(story.Sprint__c, meta.get('sprintId'));
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
    System.assertEquals(2, sprints.size());
    System.assertEquals('Sprint 1', sprints[0].Name);
  }

  @isTest
  static void testGetAllSprints() {
    Test.startTest();
    List<Sprint__c> sprints = WorkItemController.getAllSprints();
    Test.stopTest();
    System.assertEquals(2, sprints.size());
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
    System.assertEquals(4, items.size());
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
    System.assertEquals(4, items.size());
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
    Work_Item__c epic = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];
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
    System.assertEquals(epic.Id, ctx.get('parentId'));
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
    System.assertEquals(2, next.Sequence__c.intValue()); // not 10000 — Backlog excluded from MAX
    System.assert(
      next.Name.startsWith('Sprint - '),
      'Expected date-range name, got: ' + next.Name
    );
  }

  @isTest
  static void testCloseSprint_rolloverAndActivatesNext() {
    Sprint__c sprint1 = [
      SELECT Id, Sequence__c
      FROM Sprint__c
      WHERE Status__c = 'Active'
      LIMIT 1
    ];
    Sprint__c sprint2 = new Sprint__c(
      Name = 'Sprint 2',
      Status__c = 'Planning',
      Start_Date__c = Date.today().addDays(14),
      End_Date__c = Date.today().addDays(27),
      Sequence__c = 2,
      RecordTypeId = sprintRegularRtId()
    );
    insert sprint2;

    // Mark one item terminal so it stays on the closed sprint
    Work_Item__c story = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Story'
      LIMIT 1
    ];
    update new Work_Item__c(Id = story.Id, Status__c = 'Done');

    Test.startTest();
    WorkItemController.closeSprint(sprint1.Id);
    Test.stopTest();

    // Sprint 2 should now be Active
    System.assertEquals(
      'Active',
      [SELECT Status__c FROM Sprint__c WHERE Id = :sprint2.Id].Status__c
    );
    // Non-terminal items (Task, Bug) rolled over to Sprint 2
    for (Work_Item__c wi : [
      SELECT Sprint__c
      FROM Work_Item__c
      WHERE Name IN ('Test Task', 'Test Bug')
    ]) {
      System.assertEquals(
        sprint2.Id,
        wi.Sprint__c,
        wi.Id + ' should have moved to sprint2'
      );
    }
    // Terminal item (Story — Done) stays on Sprint 1
    System.assertEquals(
      sprint1.Id,
      [SELECT Sprint__c FROM Work_Item__c WHERE Id = :story.Id].Sprint__c
    );
  }

  // ── Triage pipeline ───────────────────────────────────────────────────────

  @isTest
  static void testCreateTicket() {
    Test.startTest();
    Id ticketId = WorkItemController.createTicket(
      'New idea',
      'Some description',
      'High'
    );
    Test.stopTest();

    Work_Item__c ticket = [
      SELECT
        Name,
        Description__c,
        Priority__c,
        Triage_Status__c,
        RecordType.Name
      FROM Work_Item__c
      WHERE Id = :ticketId
    ];
    System.assertEquals('New idea', ticket.Name);
    System.assertEquals('Some description', ticket.Description__c);
    System.assertEquals('High', ticket.Priority__c);
    System.assertEquals('Not Started', ticket.Triage_Status__c);
    System.assertEquals('Ticket', ticket.RecordType.Name);
  }

  @isTest
  static void testCreateTicket_requiresTitle() {
    Test.startTest();
    try {
      WorkItemController.createTicket('', 'desc', 'Medium');
      System.assert(false, 'Expected AuraHandledException');
    } catch (AuraHandledException e) {
      System.assertNotEquals(null, e.getMessage());
    }
    Test.stopTest();
  }

  @isTest
  static void testGetTriageQueue() {
    Id ticketId = WorkItemController.createTicket('Triage me', null, 'Medium');

    Test.startTest();
    List<Work_Item__c> queue = WorkItemController.getTriageQueue();
    Test.stopTest();

    Set<Id> ids = new Set<Id>();
    for (Work_Item__c w : queue) {
      ids.add(w.Id);
    }
    System.assert(
      ids.contains(ticketId),
      'New ticket should appear in the triage queue'
    );
  }

  @isTest
  static void testGetTriageQueue_excludesApproved() {
    Id ticketId = WorkItemController.createTicket(
      'Already approved',
      null,
      'Medium'
    );
    update new Work_Item__c(Id = ticketId, Triage_Status__c = 'Approved');

    Test.startTest();
    List<Work_Item__c> queue = WorkItemController.getTriageQueue();
    Test.stopTest();

    for (Work_Item__c w : queue) {
      System.assertNotEquals(
        ticketId,
        w.Id,
        'Approved tickets should not appear in the queue'
      );
    }
  }

  @isTest
  static void testApproveTicket() {
    Id ticketId = WorkItemController.createTicket('Approve me', null, 'Medium');
    update new Work_Item__c(
      Id = ticketId,
      Triage_Status__c = 'Reviewed',
      Target_Type__c = 'Story'
    );

    Test.startTest();
    WorkItemController.approveTicket(ticketId);
    Test.stopTest();

    Work_Item__c ticket = [
      SELECT
        Triage_Status__c,
        Status__c,
        RecordType.DeveloperName,
        Sprint__r.RecordType.DeveloperName
      FROM Work_Item__c
      WHERE Id = :ticketId
    ];
    System.assertEquals('Approved', ticket.Triage_Status__c);
    System.assertEquals('Not Selected', ticket.Status__c);
    System.assertEquals('Story', ticket.RecordType.DeveloperName);
    System.assertEquals('Backlog', ticket.Sprint__r.RecordType.DeveloperName);
  }

  @isTest
  static void testApproveTicket_requiresTargetType() {
    Id ticketId = WorkItemController.createTicket(
      'Approve me too',
      null,
      'Medium'
    );
    update new Work_Item__c(Id = ticketId, Triage_Status__c = 'Reviewed');

    Test.startTest();
    try {
      WorkItemController.approveTicket(ticketId);
      System.assert(false, 'Expected AuraHandledException');
    } catch (AuraHandledException e) {
      System.assertNotEquals(null, e.getMessage());
    }
    Test.stopTest();
  }

  @isTest
  static void testDeclineTicket() {
    Id ticketId = WorkItemController.createTicket('Decline me', null, 'Medium');
    update new Work_Item__c(Id = ticketId, Triage_Status__c = 'Reviewed');

    Test.startTest();
    WorkItemController.declineTicket(ticketId, 'Needs more detail on the AC');
    Test.stopTest();

    Work_Item__c ticket = [
      SELECT Triage_Status__c, Triage_Notes__c
      FROM Work_Item__c
      WHERE Id = :ticketId
    ];
    System.assertEquals('Declined', ticket.Triage_Status__c);
    System.assertEquals('Needs more detail on the AC', ticket.Triage_Notes__c);
  }

  @isTest
  static void testDeclineTicket_requiresNotes() {
    Id ticketId = WorkItemController.createTicket(
      'Decline me too',
      null,
      'Medium'
    );

    Test.startTest();
    try {
      WorkItemController.declineTicket(ticketId, '');
      System.assert(false, 'Expected AuraHandledException');
    } catch (AuraHandledException e) {
      System.assertNotEquals(null, e.getMessage());
    }
    Test.stopTest();
  }

  @isTest
  static void testGetTicketReviewContext() {
    Id ticketId = WorkItemController.createTicket(
      'Review me',
      'Raw ticket description',
      'High'
    );
    update new Work_Item__c(
      Id = ticketId,
      Triage_Status__c = 'Declined',
      Triage_Notes__c = 'Needs more detail',
      Target_Type__c = 'Bug'
    );

    Test.startTest();
    Map<String, Object> ctx = WorkItemController.getTicketReviewContext(
      ticketId
    );
    Test.stopTest();

    System.assertEquals('Ticket', ctx.get('recordTypeName'));
    System.assertEquals('Declined', ctx.get('triageStatus'));
    System.assertEquals('Needs more detail', ctx.get('triageNotes'));
    System.assertEquals('Bug', ctx.get('targetType'));
  }
}
