@IsTest
private class WorkItemService_Test {
  // ── Record type helpers ────────────────────────────────────────────────────
  private static Id rtId(String name) {
    return Schema.SObjectType.Work_Item__c
      .getRecordTypeInfosByName()
      .get(name)
      .getRecordTypeId();
  }

  // ── Test data setup ────────────────────────────────────────────────────────
  @TestSetup
  static void setup() {
    Work_Item__c project = new Work_Item__c(
      Name = 'Test Project',
      RecordTypeId = rtId('Project'),
      Project_Code__c = 'TST',
      Status__c = 'Active'
    );
    insert project;

    Work_Item__c epic = new Work_Item__c(
      Name = 'Test Epic',
      RecordTypeId = rtId('Epic'),
      Parent_Work_Item__c = project.Id,
      Status__c = 'To Do'
    );
    insert epic;
  }

  // ── Tests ──────────────────────────────────────────────────────────────────

  @IsTest
  static void storyGetsTicketKey() {
    Work_Item__c epic = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];

    Work_Item__c story = new Work_Item__c(
      Name = 'Story A',
      RecordTypeId = rtId('Story'),
      Parent_Work_Item__c = epic.Id
    );
    insert story;

    Work_Item__c result = [
      SELECT Ticket_Key__c, Item_Number__c
      FROM Work_Item__c
      WHERE Id = :story.Id
    ];
    System.assertEquals(
      'TST-00001',
      result.Ticket_Key__c,
      'First story should get key TST-00001'
    );
    System.assertEquals(
      1,
      result.Item_Number__c.intValue(),
      'Item number should be 1'
    );
  }

  @IsTest
  static void sequentialNumbering() {
    Work_Item__c epic = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];

    insert new Work_Item__c(
      Name = 'Story 1',
      RecordTypeId = rtId('Story'),
      Parent_Work_Item__c = epic.Id
    );

    Work_Item__c story2 = new Work_Item__c(
      Name = 'Story 2',
      RecordTypeId = rtId('Story'),
      Parent_Work_Item__c = epic.Id
    );
    insert story2;

    Work_Item__c result = [
      SELECT Ticket_Key__c, Item_Number__c
      FROM Work_Item__c
      WHERE Id = :story2.Id
    ];
    System.assertEquals(
      'TST-00002',
      result.Ticket_Key__c,
      'Second story should get key TST-00002'
    );
  }

  @IsTest
  static void bulkInsertSequencing() {
    Work_Item__c epic = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];

    List<Work_Item__c> stories = new List<Work_Item__c>();
    for (Integer i = 0; i < 5; i++) {
      stories.add(
        new Work_Item__c(
          Name = 'Bulk Story ' + i,
          RecordTypeId = rtId('Story'),
          Parent_Work_Item__c = epic.Id
        )
      );
    }
    insert stories;

    List<Work_Item__c> results = [
      SELECT Ticket_Key__c, Item_Number__c
      FROM Work_Item__c
      WHERE Id IN :stories
      ORDER BY Item_Number__c ASC
    ];
    Set<String> keys = new Set<String>();
    for (Work_Item__c r : results) {
      keys.add(r.Ticket_Key__c);
    }
    System.assertEquals(
      5,
      keys.size(),
      'All 5 stories should have unique keys'
    );
    System.assert(keys.contains('TST-00001'), 'Should contain TST-00001');
    System.assert(keys.contains('TST-00005'), 'Should contain TST-00005');
  }

  @IsTest
  static void twoProjectsHaveIndependentSequences() {
    Work_Item__c project2 = new Work_Item__c(
      Name = 'Project Two',
      RecordTypeId = rtId('Project'),
      Project_Code__c = 'TWO',
      Status__c = 'Active'
    );
    insert project2;
    Work_Item__c epic2 = new Work_Item__c(
      Name = 'Epic Two',
      RecordTypeId = rtId('Epic'),
      Parent_Work_Item__c = project2.Id,
      Status__c = 'To Do'
    );
    insert epic2;

    Work_Item__c epic1 = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];

    Work_Item__c storyA = new Work_Item__c(
      Name = 'Story A',
      RecordTypeId = rtId('Story'),
      Parent_Work_Item__c = epic1.Id
    );
    Work_Item__c storyB = new Work_Item__c(
      Name = 'Story B',
      RecordTypeId = rtId('Story'),
      Parent_Work_Item__c = epic2.Id
    );
    insert new List<Work_Item__c>{ storyA, storyB };

    Map<Id, Work_Item__c> results = new Map<Id, Work_Item__c>(
      [
        SELECT Id, Ticket_Key__c
        FROM Work_Item__c
        WHERE Id IN :new List<Id>{ storyA.Id, storyB.Id }
      ]
    );
    System.assertEquals(
      'TST-00001',
      results.get(storyA.Id).Ticket_Key__c,
      'Project 1 story should get TST-00001'
    );
    System.assertEquals(
      'TWO-00001',
      results.get(storyB.Id).Ticket_Key__c,
      'Project 2 story should get TWO-00001'
    );
  }

  @IsTest
  static void taskAndBugGetKeys() {
    Work_Item__c epic = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];

    Work_Item__c task = new Work_Item__c(
      Name = 'Task A',
      RecordTypeId = rtId('Task'),
      Parent_Work_Item__c = epic.Id
    );
    Work_Item__c bug = new Work_Item__c(
      Name = 'Bug A',
      RecordTypeId = rtId('Bug'),
      Parent_Work_Item__c = epic.Id
    );
    insert new List<Work_Item__c>{ task, bug };

    List<Work_Item__c> results = [
      SELECT Ticket_Key__c
      FROM Work_Item__c
      WHERE Id IN :new List<Id>{ task.Id, bug.Id }
    ];
    for (Work_Item__c r : results) {
      System.assertNotEquals(
        null,
        r.Ticket_Key__c,
        'Task and Bug should get ticket keys'
      );
    }
  }

  @IsTest
  static void epicIsNotNumbered() {
    Work_Item__c project = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Project'
      LIMIT 1
    ];

    Work_Item__c newEpic = new Work_Item__c(
      Name = 'Extra Epic',
      RecordTypeId = rtId('Epic'),
      Parent_Work_Item__c = project.Id,
      Status__c = 'To Do'
    );
    insert newEpic;

    Work_Item__c result = [
      SELECT Ticket_Key__c
      FROM Work_Item__c
      WHERE Id = :newEpic.Id
    ];
    System.assertEquals(
      null,
      result.Ticket_Key__c,
      'Epics should not receive a ticket key'
    );
  }

  @IsTest
  static void orphanStorySkipped() {
    Work_Item__c story = new Work_Item__c(
      Name = 'Orphan',
      RecordTypeId = rtId('Story')
    );
    insert story;

    Work_Item__c result = [
      SELECT Ticket_Key__c
      FROM Work_Item__c
      WHERE Id = :story.Id
    ];
    System.assertEquals(
      null,
      result.Ticket_Key__c,
      'Story without parent should not get a ticket key'
    );
  }

  @IsTest
  static void ticketGetsTriageKey() {
    Work_Item__c ticket = new Work_Item__c(
      Name = 'Login is broken',
      RecordTypeId = rtId('Ticket')
    );
    insert ticket;

    Work_Item__c result = [
      SELECT Ticket_Key__c, Item_Number__c
      FROM Work_Item__c
      WHERE Id = :ticket.Id
    ];
    System.assertEquals(
      'TRI-00001',
      result.Ticket_Key__c,
      'First ticket should get key TRI-00001'
    );
    System.assertEquals(
      1,
      result.Item_Number__c.intValue(),
      'Item number should be 1'
    );
  }

  @IsTest
  static void ticketsNumberSequentially() {
    insert new Work_Item__c(
      Name = 'First Ticket',
      RecordTypeId = rtId('Ticket')
    );
    Work_Item__c ticket2 = new Work_Item__c(
      Name = 'Second Ticket',
      RecordTypeId = rtId('Ticket')
    );
    insert ticket2;

    Work_Item__c result = [
      SELECT Ticket_Key__c
      FROM Work_Item__c
      WHERE Id = :ticket2.Id
    ];
    System.assertEquals(
      'TRI-00002',
      result.Ticket_Key__c,
      'Second ticket should get key TRI-00002'
    );
  }

  @IsTest
  static void ticketApprovedToEpicGetsProjectKey() {
    Work_Item__c epic = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];

    Work_Item__c ticket = new Work_Item__c(
      Name = 'Login broken',
      RecordTypeId = rtId('Ticket')
    );
    insert ticket;
    System.assertEquals(
      'TRI-00001',
      [SELECT Ticket_Key__c FROM Work_Item__c WHERE Id = :ticket.Id]
      .Ticket_Key__c,
      'Should have TRI key before approval'
    );

    ticket.RecordTypeId = rtId('Story');
    ticket.Parent_Work_Item__c = epic.Id;
    update ticket;

    Work_Item__c result = [
      SELECT Ticket_Key__c, Item_Number__c
      FROM Work_Item__c
      WHERE Id = :ticket.Id
    ];
    System.assertEquals(
      'TST-00001',
      result.Ticket_Key__c,
      'Approved ticket should get project key replacing TRI key'
    );
    System.assertEquals(
      1,
      result.Item_Number__c.intValue(),
      'Item number should be 1 in the project sequence'
    );
  }

  @IsTest
  static void reparentedStoryGetsNewProjectKey() {
    Work_Item__c project2 = new Work_Item__c(
      Name = 'Project Two',
      RecordTypeId = rtId('Project'),
      Project_Code__c = 'TWO',
      Status__c = 'Active'
    );
    insert project2;
    Work_Item__c epic2 = new Work_Item__c(
      Name = 'Epic Two',
      RecordTypeId = rtId('Epic'),
      Parent_Work_Item__c = project2.Id,
      Status__c = 'To Do'
    );
    insert epic2;

    Work_Item__c epic1 = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];

    Work_Item__c story = new Work_Item__c(
      Name = 'Story A',
      RecordTypeId = rtId('Story'),
      Parent_Work_Item__c = epic1.Id
    );
    insert story;
    System.assertEquals(
      'TST-00001',
      [SELECT Ticket_Key__c FROM Work_Item__c WHERE Id = :story.Id]
      .Ticket_Key__c,
      'Should have TST key before reparent'
    );

    story.Parent_Work_Item__c = epic2.Id;
    update story;

    Work_Item__c result = [
      SELECT Ticket_Key__c
      FROM Work_Item__c
      WHERE Id = :story.Id
    ];
    System.assertEquals(
      'TWO-00001',
      result.Ticket_Key__c,
      'Reparented story should get new project key'
    );
  }

  @IsTest
  static void reparentWithNoProjectCodeSkipped() {
    Work_Item__c projectNoCode = new Work_Item__c(
      Name = 'No Code Project',
      RecordTypeId = rtId('Project'),
      Status__c = 'Active'
    );
    insert projectNoCode;
    Work_Item__c epicNoCode = new Work_Item__c(
      Name = 'No Code Epic',
      RecordTypeId = rtId('Epic'),
      Parent_Work_Item__c = projectNoCode.Id,
      Status__c = 'To Do'
    );
    insert epicNoCode;

    Work_Item__c story = new Work_Item__c(
      Name = 'Orphan Story',
      RecordTypeId = rtId('Story')
    );
    insert story;

    story.Parent_Work_Item__c = epicNoCode.Id;
    update story;

    Work_Item__c result = [
      SELECT Ticket_Key__c
      FROM Work_Item__c
      WHERE Id = :story.Id
    ];
    System.assertEquals(
      null,
      result.Ticket_Key__c,
      'No key when project has no code'
    );
  }

  @IsTest
  static void bulkReparentIsSafe() {
    Work_Item__c epic = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];

    List<Work_Item__c> stories = new List<Work_Item__c>();
    for (Integer i = 0; i < 3; i++) {
      stories.add(
        new Work_Item__c(Name = 'Orphan ' + i, RecordTypeId = rtId('Story'))
      );
    }
    insert stories;

    for (Work_Item__c s : stories) {
      s.Parent_Work_Item__c = epic.Id;
    }
    update stories;

    List<Work_Item__c> results = [
      SELECT Ticket_Key__c, Item_Number__c
      FROM Work_Item__c
      WHERE Id IN :stories
      ORDER BY Item_Number__c ASC
    ];
    Set<String> keys = new Set<String>();
    for (Work_Item__c r : results) {
      keys.add(r.Ticket_Key__c);
    }
    System.assertEquals(3, keys.size(), 'All 3 should have unique keys');
    System.assert(keys.contains('TST-00001'), 'Should contain TST-00001');
    System.assert(keys.contains('TST-00003'), 'Should contain TST-00003');
  }

  @IsTest
  static void projectCodeSetCascadesKeysToUnkeyedChildren() {
    // Project has no code at insert time — story gets no key.
    // Setting the code should cascade and assign a proper project key.
    Work_Item__c projectNoCode = new Work_Item__c(
      Name = 'No Code Project',
      RecordTypeId = rtId('Project'),
      Status__c = 'Active'
    );
    insert projectNoCode;
    Work_Item__c epicNoCode = new Work_Item__c(
      Name = 'No Code Epic',
      RecordTypeId = rtId('Epic'),
      Parent_Work_Item__c = projectNoCode.Id,
      Status__c = 'To Do'
    );
    insert epicNoCode;
    Work_Item__c story = new Work_Item__c(
      Name = 'Story Without Key',
      RecordTypeId = rtId('Story'),
      Parent_Work_Item__c = epicNoCode.Id
    );
    insert story;
    System.assertEquals(
      null,
      [SELECT Ticket_Key__c FROM Work_Item__c WHERE Id = :story.Id]
      .Ticket_Key__c,
      'Story should have no key when project has no code'
    );

    projectNoCode.Project_Code__c = 'NEW';
    update projectNoCode;

    System.assertEquals(
      'NEW-00001',
      [SELECT Ticket_Key__c FROM Work_Item__c WHERE Id = :story.Id]
      .Ticket_Key__c,
      'Setting project code should cascade key to unkeyed story'
    );
  }

  @IsTest
  static void projectCodeSetReplacesTRIKeyOnChildren() {
    // Ticket approved to Story under a codeless project — key stays TRI.
    // Setting the project code should replace the TRI key with a project key.
    Work_Item__c projectNoCode = new Work_Item__c(
      Name = 'No Code Project 2',
      RecordTypeId = rtId('Project'),
      Status__c = 'Active'
    );
    insert projectNoCode;
    Work_Item__c epicNoCode = new Work_Item__c(
      Name = 'No Code Epic 2',
      RecordTypeId = rtId('Epic'),
      Parent_Work_Item__c = projectNoCode.Id,
      Status__c = 'To Do'
    );
    insert epicNoCode;
    Work_Item__c ticket = new Work_Item__c(
      Name = 'Login broken',
      RecordTypeId = rtId('Ticket')
    );
    insert ticket;
    System.assert(
      [SELECT Ticket_Key__c FROM Work_Item__c WHERE Id = :ticket.Id]
        .Ticket_Key__c
        .startsWith('TRI-'),
      'Ticket should have TRI key'
    );

    // Approve: reclassify to Story and parent to epic (no project code yet)
    ticket.RecordTypeId = rtId('Story');
    ticket.Parent_Work_Item__c = epicNoCode.Id;
    update ticket;
    System.assert(
      [SELECT Ticket_Key__c FROM Work_Item__c WHERE Id = :ticket.Id]
        .Ticket_Key__c
        .startsWith('TRI-'),
      'Story should still have TRI key — project has no code'
    );

    projectNoCode.Project_Code__c = 'FIX';
    update projectNoCode;

    System.assertEquals(
      'FIX-00001',
      [SELECT Ticket_Key__c FROM Work_Item__c WHERE Id = :ticket.Id]
      .Ticket_Key__c,
      'Setting project code should replace TRI key with project key'
    );
  }

  @IsTest
  static void ticketSequenceIndependentFromProjectSequence() {
    Work_Item__c epic = [
      SELECT Id
      FROM Work_Item__c
      WHERE Name = 'Test Epic'
      LIMIT 1
    ];

    Work_Item__c story = new Work_Item__c(
      Name = 'Story A',
      RecordTypeId = rtId('Story'),
      Parent_Work_Item__c = epic.Id
    );
    Work_Item__c ticket = new Work_Item__c(
      Name = 'Support request',
      RecordTypeId = rtId('Ticket')
    );
    insert new List<Work_Item__c>{ story, ticket };

    Map<Id, Work_Item__c> results = new Map<Id, Work_Item__c>(
      [
        SELECT Id, Ticket_Key__c
        FROM Work_Item__c
        WHERE Id IN :new List<Id>{ story.Id, ticket.Id }
      ]
    );
    System.assertEquals(
      'TST-00001',
      results.get(story.Id).Ticket_Key__c,
      'Story should get project-based key'
    );
    System.assertEquals(
      'TRI-00001',
      results.get(ticket.Id).Ticket_Key__c,
      'Ticket should get independent triage key'
    );
  }
}
