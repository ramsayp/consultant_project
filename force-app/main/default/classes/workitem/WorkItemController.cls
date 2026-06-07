public with sharing class WorkItemController {
  // ── getWorkItems ──────────────────────────────────────────────────────────
  // Returns work items filtered by record type plus optional sprint and project scope.
  // When projectId is supplied for Epics, only direct children of that project are returned.
  // For non-Epic/non-Project types with projectId, only grandchildren (items whose parent
  // Epic belongs to the project) are returned.
  @AuraEnabled(cacheable=true)
  public static List<Work_Item__c> getWorkItems(
    String recordTypeName,
    Id sprintId,
    Id projectId
  ) {
    Id rtId = rtId(recordTypeName);
    String q =
      'SELECT Id, Name, Status__c, Priority__c, Estimate__c, Sequence__c, ' +
      'Work_Mode__c, Assignee__c, Assignee__r.Name, Description__c, ' +
      'Sprint__c, Sprint__r.Name, Parent_Work_Item__c, Parent_Work_Item__r.Name, ' +
      'RecordType.Name, RecordTypeId ' +
      'FROM Work_Item__c ' +
      'WHERE RecordTypeId = :rtId';
    if (sprintId != null) {
      q += ' AND Sprint__c = :sprintId';
    }
    if (projectId != null) {
      if (recordTypeName == 'Epic') {
        q += ' AND Parent_Work_Item__c = :projectId'; // direct children of the project
      } else if (recordTypeName != 'Project') {
        q += ' AND Parent_Work_Item__c IN (SELECT Id FROM Work_Item__c WHERE Parent_Work_Item__c = :projectId)'; // grandchildren via Epic
      }
    }
    q += ' ORDER BY Sequence__c NULLS LAST, CreatedDate ASC';
    return Database.query(q);
  }

  // ── getWorkItemMeta ───────────────────────────────────────────────────────
  // Returns the record type name and sprint Id for a given work item.
  // Used by the workItemChildren and workItemParentSelector components to
  // determine which child types to show and to pre-select the sprint on create forms.
  @AuraEnabled(cacheable=true)
  public static Map<String, Object> getWorkItemMeta(Id recordId) {
    Work_Item__c w = [
      SELECT RecordType.Name, Sprint__c
      FROM Work_Item__c
      WHERE Id = :recordId
    ];
    return new Map<String, Object>{
      'typeName' => w.RecordType.Name,
      'sprintId' => w.Sprint__c
    };
  }

  // ── getChildren ───────────────────────────────────────────────────────────
  // Returns all direct child work items of a given parent, ordered by sequence then creation date.
  @AuraEnabled
  public static List<Work_Item__c> getChildren(Id parentId) {
    return [
      SELECT
        Id,
        Name,
        Status__c,
        Priority__c,
        Estimate__c,
        Sequence__c,
        RecordType.Name,
        Assignee__c,
        Assignee__r.Name
      FROM Work_Item__c
      WHERE Parent_Work_Item__c = :parentId
      ORDER BY Sequence__c NULLS LAST, CreatedDate ASC
    ];
  }

  // ── getEpics ──────────────────────────────────────────────────────────────
  // Returns all Epic work items (regardless of project) for the parent-selector dropdown.
  // Called imperatively (not via wire) so newly created epics are always included.
  @AuraEnabled
  public static List<Work_Item__c> getEpics(Id projectId) {
    Id rtId = rtId('Epic');
    return [
      SELECT Id, Name, Parent_Work_Item__c, Parent_Work_Item__r.Name
      FROM Work_Item__c
      WHERE RecordTypeId = :rtId
      ORDER BY Name ASC
    ];
  }

  // ── getActiveSprints ──────────────────────────────────────────────────────
  // Returns all sprints in Planning, Active, or Backlog status for the sprint picker.
  // Ordered by sequence (lowest first) then start date so the current sprint appears first.
  @AuraEnabled(cacheable=true)
  public static List<Sprint__c> getActiveSprints() {
    return [
      SELECT
        Id,
        Name,
        Start_Date__c,
        End_Date__c,
        Status__c,
        Sequence__c,
        RecordType.DeveloperName
      FROM Sprint__c
      WHERE Status__c IN ('Planning', 'Active', 'Backlog')
      ORDER BY Sequence__c NULLS LAST, Start_Date__c ASC
    ];
  }

  // ── ensureBacklogSprint ───────────────────────────────────────────────────
  // Ensures a Backlog-RT sprint exists. On first deploy, migrates any existing
  // Status='Backlog' sprint to the Backlog record type rather than creating a duplicate.
  @AuraEnabled
  public static void ensureBacklogSprint() {
    Id backlogRtId = sprintBacklogRtId();
    Integer count = [
      SELECT COUNT()
      FROM Sprint__c
      WHERE RecordTypeId = :backlogRtId
    ];
    if (count == 0) {
      // Migrate an old-style backlog sprint (no RT yet) if one exists
      Sprint__c[] old = [
        SELECT Id
        FROM Sprint__c
        WHERE Status__c = 'Backlog'
        LIMIT 1
      ];
      if (!old.isEmpty()) {
        update new Sprint__c(Id = old[0].Id, RecordTypeId = backlogRtId);
      } else {
        insert new Sprint__c(
          Name = 'Backlog',
          Status__c = 'Backlog',
          Sequence__c = 9999, // placed last in sequence so it appears at the bottom
          RecordTypeId = backlogRtId
        );
      }
    }
  }

  // ── getAllSprints ─────────────────────────────────────────────────────────
  // Returns all sprints that are either not Completed, or ended within the last 30 days,
  // or have no end date. This window keeps recently closed sprints visible without
  // surfacing stale historical data.
  @AuraEnabled(cacheable=true)
  public static List<Sprint__c> getAllSprints() {
    Date cutoff = Date.today().addDays(-30); // 30-day lookback for completed sprints
    return [
      SELECT
        Id,
        Name,
        Start_Date__c,
        End_Date__c,
        Status__c,
        Sequence__c,
        RecordType.DeveloperName
      FROM Sprint__c
      WHERE
        Status__c != 'Completed'
        OR End_Date__c >= :cutoff
        OR End_Date__c = NULL
      ORDER BY Sequence__c NULLS LAST, Start_Date__c ASC
    ];
  }

  // ── generateSprints ───────────────────────────────────────────────────────
  // Ensures the Backlog sprint exists, then creates 6 future two-week sprints
  // starting from the next Monday if no non-backlog sprints exist yet.
  // Idempotent — exits early if sprints are already present.
  @AuraEnabled
  public static void generateSprints() {
    ensureBacklogSprint();
    Integer existingCount = [
      SELECT COUNT()
      FROM Sprint__c
      WHERE Status__c != 'Backlog'
    ];
    if (existingCount > 0)
      return; // sprints already exist — nothing to generate

    Id sprintRtId = sprintRegularRtId();
    Date startDate = nextSprintStart(Date.today());
    List<Sprint__c> sprints = new List<Sprint__c>();
    for (Integer i = 1; i <= 6; i++) {
      sprints.add(
        new Sprint__c(
          Name = sprintName(startDate, startDate.addDays(13)),
          Start_Date__c = startDate,
          End_Date__c = startDate.addDays(13), // two-week sprint (inclusive end date)
          Status__c = 'Planning',
          Sequence__c = i,
          RecordTypeId = sprintRtId
        )
      );
      startDate = startDate.addDays(14); // advance by 14 days for the next sprint
    }
    insert sprints;
  }

  // ── closeSprint ───────────────────────────────────────────────────────────
  // Marks the sprint Completed, activates the next sprint in sequence,
  // rolls non-terminal work items forward to that next sprint, then creates
  // a new Planning sprint at the end of the chain with a date-range name.
  // Throws AuraHandledException if the Backlog sprint is targeted.
  @AuraEnabled
  public static Sprint__c closeSprint(Id sprintId) {
    Sprint__c closing = [
      SELECT Status__c, Sequence__c, RecordType.DeveloperName
      FROM Sprint__c
      WHERE Id = :sprintId
    ];
    if (closing.RecordType.DeveloperName == 'Backlog')
      throw new AuraHandledException('Cannot close the Backlog sprint.');
    update new Sprint__c(Id = sprintId, Status__c = 'Completed');

    // Activate the next sprint in sequence and roll non-terminal items forward to it
    List<Sprint__c> nextList = [
      SELECT Id
      FROM Sprint__c
      WHERE
        Sequence__c > :closing.Sequence__c
        AND Status__c NOT IN ('Backlog', 'Completed')
      ORDER BY Sequence__c ASC
      LIMIT 1
    ];
    if (!nextList.isEmpty()) {
      Id nextSprintId = nextList[0].Id;
      update new Sprint__c(Id = nextSprintId, Status__c = 'Active');

      // Items already 'Selected' in the newly-activated sprint enter the kanban
      // at its first stage, same as any other freshly-active item
      List<Work_Item__c> queued = [
        SELECT Id
        FROM Work_Item__c
        WHERE Sprint__c = :nextSprintId AND Status__c = 'Selected'
      ];
      for (Work_Item__c wi : queued)
        wi.Status__c = 'To Do';
      if (!queued.isEmpty())
        update queued;

      List<String> terminal = new List<String>{
        'Completed',
        'Cancelled',
        'Done',
        'Fixed',
        'Closed'
      };
      List<Work_Item__c> open = [
        SELECT Id
        FROM Work_Item__c
        WHERE Sprint__c = :sprintId AND Status__c NOT IN :terminal
      ];
      for (Work_Item__c wi : open)
        wi.Sprint__c = nextSprintId;
      if (!open.isEmpty())
        update open;
    }

    // Find the latest end date across non-Backlog sprints to anchor the new sprint start
    Sprint__c lastSprint = [
      SELECT End_Date__c
      FROM Sprint__c
      WHERE End_Date__c != NULL AND Status__c != 'Backlog'
      ORDER BY End_Date__c DESC
      LIMIT 1
    ];

    // Determine the next sequence number, excluding the Backlog sentinel value (9999)
    AggregateResult[] agg = [
      SELECT MAX(Sequence__c) maxSeq
      FROM Sprint__c
      WHERE Status__c != 'Backlog'
    ];
    Integer nextSeq = agg[0].get('maxSeq') != null
      ? Integer.valueOf((Decimal) agg[0].get('maxSeq')) + 1
      : 1;

    Date startDate = lastSprint.End_Date__c.addDays(1);
    Date endDate = startDate.addDays(13);
    Sprint__c next = new Sprint__c(
      Name = sprintName(startDate, endDate),
      Start_Date__c = startDate,
      End_Date__c = endDate,
      Status__c = 'Planning',
      Sequence__c = nextSeq,
      RecordTypeId = sprintRegularRtId()
    );
    insert next;
    return next;
  }

  // ── getBoardItems ─────────────────────────────────────────────────────────
  // Returns all non-Project work items for the Kanban board.
  // When projectId is null, returns every Epic/Story/Task/Bug/Chapter in the org.
  // When projectId is supplied, walks three levels of the hierarchy:
  //   Project → Epics → Stories/Tasks/Bugs/Chapters
  // using two extra queries (SOQL cannot nest subqueries that deep).
  @AuraEnabled
  public static List<Work_Item__c> getBoardItems(Id projectId) {
    List<Id> rtIds = new List<Id>();
    for (
      String rt : new List<String>{ 'Epic', 'Story', 'Task', 'Bug', 'Chapter' }
    ) {
      rtIds.add(rtId(rt));
    }
    String selectClause =
      'SELECT Id, Name, Status__c, Priority__c, Estimate__c, Sequence__c, ' +
      'Work_Mode__c, Assignee__c, Assignee__r.Name, Description__c, ' +
      'Sprint__c, Sprint__r.Name, Sprint__r.Sequence__c, ' +
      'Sprint__r.Start_Date__c, Sprint__r.End_Date__c, ' +
      'Parent_Work_Item__c, Parent_Work_Item__r.Name, ' +
      'Parent_Work_Item__r.Parent_Work_Item__c, Parent_Work_Item__r.Parent_Work_Item__r.Name, ' +
      'RecordType.Name, RecordTypeId ' +
      'FROM Work_Item__c WHERE RecordTypeId IN :rtIds';

    if (projectId == null) {
      // No project filter — return all board items org-wide
      return Database.query(
        selectClause +
        ' ORDER BY Sprint__r.Sequence__c NULLS LAST, Sequence__c NULLS LAST, CreatedDate ASC'
      );
    }

    // Walk three levels: Project → Epic → Story/Task/Bug → Chapter
    // SOQL cannot nest subqueries that deep, so valid parent IDs are collected in two passes.
    Set<Id> validParents = new Set<Id>{ projectId };

    // Level 1: Epics that belong directly to this project
    Set<Id> epicIds = new Set<Id>();
    for (Work_Item__c w : [
      SELECT Id
      FROM Work_Item__c
      WHERE Parent_Work_Item__c = :projectId
    ]) {
      epicIds.add(w.Id);
    }
    validParents.addAll(epicIds);

    // Level 2: Stories/Tasks/Bugs that belong to those Epics
    if (!epicIds.isEmpty()) {
      for (Work_Item__c w : [
        SELECT Id
        FROM Work_Item__c
        WHERE Parent_Work_Item__c IN :epicIds
      ]) {
        validParents.add(w.Id); // these become valid parents for Chapters
      }
    }

    return Database.query(
      selectClause +
        ' AND Parent_Work_Item__c IN :validParents' +
        ' ORDER BY Sprint__r.Sequence__c NULLS LAST, Sequence__c NULLS LAST, CreatedDate ASC'
    );
  }

  // ── updateSprint ──────────────────────────────────────────────────────────
  // Moves a work item to a new sprint. Also moves any Chapter children of the
  // item so they stay in the same sprint as their parent Story.
  // Also corrects Status__c to match the destination sprint via deriveSelectionStatus —
  // landing in Backlog/Planning resets the selection status regardless of where the
  // item came from; landing in the Active sprint leaves Status__c untouched (the
  // kanban column drop sets it via updateStatus).
  @AuraEnabled
  public static void updateSprint(Id workItemId, Id sprintId) {
    Sprint__c dest = [
      SELECT Status__c, RecordType.DeveloperName
      FROM Sprint__c
      WHERE Id = :sprintId
    ];
    String derivedStatus = deriveSelectionStatus(dest);

    Work_Item__c parent = new Work_Item__c(
      Id = workItemId,
      Sprint__c = sprintId
    );
    if (derivedStatus != null)
      parent.Status__c = derivedStatus;
    List<Work_Item__c> toUpdate = new List<Work_Item__c>{ parent };

    Id chapterRtId = rtId('Chapter');
    for (Work_Item__c child : [
      SELECT Id
      FROM Work_Item__c
      WHERE Parent_Work_Item__c = :workItemId AND RecordTypeId = :chapterRtId
    ]) {
      Work_Item__c childUpdate = new Work_Item__c(
        Id = child.Id,
        Sprint__c = sprintId
      ); // cascade sprint to Chapter children
      if (derivedStatus != null)
        childUpdate.Status__c = derivedStatus;
      toUpdate.add(childUpdate);
    }
    update toUpdate;
  }

  // ── updateStatus ──────────────────────────────────────────────────────────
  // Updates the status of a single work item (used on kanban card drop).
  @AuraEnabled
  public static void updateStatus(Id workItemId, String newStatus) {
    update new Work_Item__c(Id = workItemId, Status__c = newStatus);
  }

  // ── updateSequences ───────────────────────────────────────────────────────
  // Writes positional sequence numbers (1-based) to each work item in the supplied
  // ordered list. Called after drag-and-drop to persist the card order within a column.
  @AuraEnabled
  public static void updateSequences(List<Id> workItemIds) {
    List<Work_Item__c> toUpdate = new List<Work_Item__c>();
    for (Integer i = 0; i < workItemIds.size(); i++) {
      toUpdate.add(new Work_Item__c(Id = workItemIds[i], Sequence__c = i + 1)); // 1-based sequence
    }
    update toUpdate;
  }

  // ── getComments ───────────────────────────────────────────────────────────
  // Returns all comments for a work item, newest first.
  @AuraEnabled(cacheable=true)
  public static List<Comment__c> getComments(Id workItemId) {
    return [
      SELECT Id, Body__c, CreatedDate, LastModifiedDate, CreatedBy.Name
      FROM Comment__c
      WHERE Work_Item__c = :workItemId
      ORDER BY CreatedDate DESC
    ];
  }

  // ── addComment ────────────────────────────────────────────────────────────
  // Inserts a new comment on a work item using the Work Item Comments record type.
  @AuraEnabled
  public static void addComment(Id workItemId, String body) {
    Id rtId = Schema.SObjectType.Comment__c
      .getRecordTypeInfosByName()
      .get('Work Item Comments')
      .getRecordTypeId();
    insert new Comment__c(
      Work_Item__c = workItemId,
      Body__c = body,
      RecordTypeId = rtId
    );
  }

  // ── editComment ───────────────────────────────────────────────────────────
  // Updates the body of an existing comment.
  @AuraEnabled
  public static void editComment(Id commentId, String body) {
    update new Comment__c(Id = commentId, Body__c = body);
  }

  // ── deleteComment ─────────────────────────────────────────────────────────
  // Permanently deletes a comment record.
  @AuraEnabled
  public static void deleteComment(Id commentId) {
    delete new Comment__c(Id = commentId);
  }

  // ── Triage pipeline ───────────────────────────────────────────────────────
  // Scaffolding for the BA agent triage workflow: raw Ticket intake → BA agent
  // classifies it as Story/Task/Bug and drafts a user story, acceptance criteria,
  // and plan → human review → approve (lands in the Backlog sprint) or decline
  // (returns to the BA agent with reviewer notes for re-triage).

  // ── createTicket ──────────────────────────────────────────────────────────
  // Creates a raw Ticket for BA agent triage. Used by the utility bar submission
  // panel (any user) and admin creation in the Project Management app.
  @AuraEnabled
  public static Id createTicket(
    String title,
    String description,
    String priority
  ) {
    if (String.isBlank(title)) {
      throw new AuraHandledException('Title is required.');
    }
    Work_Item__c ticket = new Work_Item__c(
      Name = title.trim(),
      RecordTypeId = rtId('Ticket'),
      Triage_Status__c = 'Not Started',
      Priority__c = String.isBlank(priority) ? 'Medium' : priority
    );
    if (String.isNotBlank(description)) {
      ticket.Description__c = description;
    }
    insert ticket;
    return ticket.Id;
  }

  // ── getTriageQueue ────────────────────────────────────────────────────────
  // Returns every ticket not yet approved — the BA agent's working set
  // (Not Started/Reviewing/Reviewed) plus Declined tickets awaiting BA
  // re-triage — for the human reviewer's Triage queue.
  @AuraEnabled(cacheable=true)
  public static List<Work_Item__c> getTriageQueue() {
    return [
      SELECT
        Id,
        Name,
        Description__c,
        Priority__c,
        Triage_Status__c,
        Triage_Notes__c,
        User_Story__c,
        Acceptance_Criteria__c,
        Plan__c,
        RecordType.Name,
        RecordTypeId,
        CreatedDate
      FROM Work_Item__c
      WHERE
        Triage_Status__c IN ('Not Started', 'Reviewing', 'Reviewed', 'Declined')
      ORDER BY CreatedDate ASC
    ];
  }

  // ── approveTicket ─────────────────────────────────────────────────────────
  // Approves a triaged ticket: reclassifies it to its Target_Type__c
  // (Story/Task/Bug), marks it Approved, and lands it in the Backlog sprint.
  @AuraEnabled
  public static void approveTicket(Id ticketId) {
    Work_Item__c ticket = [
      SELECT Target_Type__c
      FROM Work_Item__c
      WHERE Id = :ticketId
    ];
    if (String.isBlank(ticket.Target_Type__c)) {
      throw new AuraHandledException(
        'Set what this ticket will become (Story, Task, or Bug) before approving.'
      );
    }
    ensureBacklogSprint();
    Sprint__c backlog = [
      SELECT Status__c, RecordType.DeveloperName
      FROM Sprint__c
      WHERE RecordTypeId = :sprintBacklogRtId()
      LIMIT 1
    ];
    update new Work_Item__c(
      Id = ticketId,
      RecordTypeId = rtId(ticket.Target_Type__c),
      Triage_Status__c = 'Approved',
      Status__c = deriveSelectionStatus(backlog),
      Sprint__c = backlog.Id
    );
  }

  // ── declineTicket ─────────────────────────────────────────────────────────
  // Declines a triaged ticket, recording the reviewer's notes. The BA agent
  // picks up Declined tickets, revises its classification/user story/AC/plan
  // based on the notes, and resubmits them for review.
  @AuraEnabled
  public static void declineTicket(Id ticketId, String notes) {
    if (String.isBlank(notes)) {
      throw new AuraHandledException(
        'Notes are required when declining a ticket.'
      );
    }
    update new Work_Item__c(
      Id = ticketId,
      Triage_Status__c = 'Declined',
      Triage_Notes__c = notes
    );
  }

  // ── getParentContext ──────────────────────────────────────────────────────
  // Returns the record type name, parent Id, and parent name of a work item.
  // Used by the workItemParentSelector component to display the current parent
  // and determine which parent types are eligible for reassignment.
  @AuraEnabled
  public static Map<String, Object> getParentContext(Id recordId) {
    Work_Item__c w = [
      SELECT RecordType.Name, Parent_Work_Item__c, Parent_Work_Item__r.Name
      FROM Work_Item__c
      WHERE Id = :recordId
    ];
    return new Map<String, Object>{
      'recordTypeName' => w.RecordType.Name,
      'parentId' => w.Parent_Work_Item__c,
      'parentName' => w.Parent_Work_Item__r?.Name
    };
  }

  // ── getTicketReviewContext ────────────────────────────────────────────────
  // Returns the record type, triage status/notes, and target type of a ticket.
  // Used by the ticketReview applet to render its review controls only on
  // Ticket records and to reflect their current triage state.
  @AuraEnabled
  public static Map<String, Object> getTicketReviewContext(Id ticketId) {
    Work_Item__c w = [
      SELECT RecordType.Name, Triage_Status__c, Triage_Notes__c, Target_Type__c
      FROM Work_Item__c
      WHERE Id = :ticketId
    ];
    return new Map<String, Object>{
      'recordTypeName' => w.RecordType.Name,
      'triageStatus' => w.Triage_Status__c,
      'triageNotes' => w.Triage_Notes__c,
      'targetType' => w.Target_Type__c
    };
  }

  // ── getCandidateParents ───────────────────────────────────────────────────
  // Returns eligible parent records for a given child record type.
  // For example, a Story can only be parented to an Epic, so this returns
  // all Epics. Returns an empty list for types that have no parent (e.g. Project).
  @AuraEnabled
  public static List<Work_Item__c> getCandidateParents(String recordTypeName) {
    Map<String, String> parentTypeMap = new Map<String, String>{
      'Epic' => 'Project',
      'Story' => 'Epic',
      'Task' => 'Epic',
      'Bug' => 'Epic',
      'Chapter' => 'Story',
      'Step' => 'Chapter',
      'Ticket' => 'Epic'
    };
    String parentType = parentTypeMap.get(recordTypeName);
    if (parentType == null)
      return new List<Work_Item__c>(); // no parent type defined for this record type
    Id rtId = rtId(parentType);
    return [
      SELECT Id, Name
      FROM Work_Item__c
      WHERE RecordTypeId = :rtId
      ORDER BY Name ASC
      LIMIT 200
    ];
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  // Looks up the RecordTypeId for a Work_Item__c record type by developer name
  private static Id rtId(String name) {
    return Schema.SObjectType.Work_Item__c
      .getRecordTypeInfosByName()
      .get(name)
      .getRecordTypeId();
  }

  private static Id sprintBacklogRtId() {
    return Schema.SObjectType.Sprint__c
      .getRecordTypeInfosByDeveloperName()
      .get('Backlog')
      .getRecordTypeId();
  }

  private static Id sprintRegularRtId() {
    return Schema.SObjectType.Sprint__c
      .getRecordTypeInfosByDeveloperName()
      .get('Sprint')
      .getRecordTypeId();
  }

  // Derives the selection status a work item should carry based on where it lands:
  // Backlog → 'Not Selected'; a Planning (future) sprint → 'Selected';
  // Active sprint (or anything else) → null, meaning "leave Status__c alone"
  // (the kanban column drop owns status once an item is in the Active sprint).
  // Looks only at the destination — it doesn't matter where the item came from.
  private static String deriveSelectionStatus(Sprint__c destSprint) {
    if (destSprint.RecordType.DeveloperName == 'Backlog')
      return 'Not Selected';
    if (destSprint.Status__c == 'Planning')
      return 'Selected';
    return null;
  }

  // Formats a sprint name from its date range: "Sprint - 1 Jun 2026 to 14 Jun 2026"
  private static String sprintName(Date startDate, Date endDate) {
    return 'Sprint - ' +
      formatSprintDate(startDate) +
      ' to ' +
      formatSprintDate(endDate);
  }

  private static String formatSprintDate(Date d) {
    String[] months = new List<String>{
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    };
    return String.valueOf(d.day()) +
      ' ' +
      months[d.month() - 1] +
      ' ' +
      String.valueOf(d.year());
  }

  // Calculates the start date of the next sprint, snapping to the nearest Monday.
  // Uses a known Monday anchor (2025-01-06) to determine the current day of the week.
  private static Date nextSprintStart(Date d) {
    Date knownMonday = Date.newInstance(2025, 1, 6); // Jan 6 2025 was a Monday — used as anchor
    Integer dayOfWeek = Math.mod(knownMonday.daysBetween(d), 7); // 0 = Monday, 6 = Sunday
    Integer daysUntilMonday = (dayOfWeek == 0) ? 0 : (7 - dayOfWeek); // 0 if already Monday
    return d.addDays(daysUntilMonday);
  }
}
