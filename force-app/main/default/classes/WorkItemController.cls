public with sharing class WorkItemController {

    static final Map<String, List<String>> STATUS_COLUMNS = new Map<String, List<String>>{
        'Initiative' => new List<String>{'Draft', 'Active', 'Completed', 'Cancelled'},
        'Epic'       => new List<String>{'Draft', 'Active', 'In Progress', 'Completed', 'Cancelled'},
        'Story'      => new List<String>{'Backlog', 'Ready', 'In Progress', 'In Review', 'Done'},
        'Task'       => new List<String>{'Backlog', 'In Progress', 'Blocked', 'Done'},
        'Bug'        => new List<String>{'Open', 'Triaged', 'In Progress', 'Fixed', 'Closed'},
        'Chapter'    => new List<String>{'To Do', 'In Progress', 'Done'},
        'Step'       => new List<String>{'To Do', 'In Progress', 'Done'}
    };

    @AuraEnabled(cacheable=true)
    public static List<Work_Item__c> getWorkItems(String recordTypeName, Id sprintId, Id initiativeId) {
        Id rtId = rtId(recordTypeName);
        String q = 'SELECT Id, Name, Status__c, Priority__c, Estimate__c, '
                 + 'Work_Mode__c, Assignee__c, Assignee__r.Name, Description__c, '
                 + 'Sprint__c, Sprint__r.Name, Parent_Work_Item__c, Parent_Work_Item__r.Name, '
                 + 'RecordType.Name, RecordTypeId '
                 + 'FROM Work_Item__c '
                 + 'WHERE RecordTypeId = :rtId';
        if (sprintId != null) {
            q += ' AND Sprint__c = :sprintId';
        }
        if (initiativeId != null) {
            if (recordTypeName == 'Epic') {
                q += ' AND Parent_Work_Item__c = :initiativeId';
            } else if (recordTypeName != 'Initiative') {
                q += ' AND Parent_Work_Item__c IN (SELECT Id FROM Work_Item__c WHERE Parent_Work_Item__c = :initiativeId)';
            }
        }
        q += ' ORDER BY CreatedDate ASC';
        return Database.query(q);
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getWorkItemMeta(Id recordId) {
        Work_Item__c w = [SELECT RecordType.Name, Sprint__c FROM Work_Item__c WHERE Id = :recordId];
        return new Map<String, Object>{ 'typeName' => w.RecordType.Name, 'sprintId' => w.Sprint__c };
    }

    @AuraEnabled(cacheable=true)
    public static List<Work_Item__c> getChildren(Id parentId) {
        return [
            SELECT Id, Name, Status__c, Priority__c, Estimate__c,
                   RecordType.Name, Assignee__c, Assignee__r.Name
            FROM Work_Item__c
            WHERE Parent_Work_Item__c = :parentId
            ORDER BY CreatedDate ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Work_Item__c> getEpics(Id initiativeId) {
        Id rtId = rtId('Epic');
        return [
            SELECT Id, Name, Parent_Work_Item__c, Parent_Work_Item__r.Name
            FROM Work_Item__c
            WHERE RecordTypeId = :rtId
            ORDER BY Name ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Sprint__c> getActiveSprints() {
        return [
            SELECT Id, Name, Start_Date__c, End_Date__c, Status__c, Sequence__c
            FROM Sprint__c
            WHERE Status__c IN ('Planning', 'Active', 'Backlog')
            ORDER BY Sequence__c NULLS LAST, Start_Date__c ASC
        ];
    }

    @AuraEnabled
    public static void ensureBacklogSprint() {
        Integer count = [SELECT COUNT() FROM Sprint__c WHERE Status__c = 'Backlog'];
        if (count == 0) {
            insert new Sprint__c(
                Name       = 'Backlog',
                Status__c  = 'Backlog',
                Sequence__c = 9999
            );
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Sprint__c> getAllSprints() {
        Date cutoff = Date.today().addDays(-30);
        return [
            SELECT Id, Name, Start_Date__c, End_Date__c, Status__c, Sequence__c
            FROM Sprint__c
            WHERE Status__c != 'Completed'
               OR End_Date__c >= :cutoff
               OR End_Date__c = null
            ORDER BY Sequence__c NULLS LAST, Start_Date__c ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getStatusColumns() {
        return STATUS_COLUMNS;
    }

    @AuraEnabled
    public static void generateSprints() {
        ensureBacklogSprint();
        Integer existingCount = [SELECT COUNT() FROM Sprint__c WHERE Status__c != 'Backlog'];
        if (existingCount > 0) return;

        Date startDate = nextSprintStart(Date.today());
        List<Sprint__c> sprints = new List<Sprint__c>();
        for (Integer i = 1; i <= 6; i++) {
            sprints.add(new Sprint__c(
                Name          = 'Sprint ' + i,
                Start_Date__c = startDate,
                End_Date__c   = startDate.addDays(13),
                Status__c     = 'Planning',
                Sequence__c   = i
            ));
            startDate = startDate.addDays(14);
        }
        insert sprints;
    }

    @AuraEnabled
    public static Sprint__c closeSprint(Id sprintId) {
        Sprint__c check = [SELECT Status__c FROM Sprint__c WHERE Id = :sprintId];
        if (check.Status__c == 'Backlog') throw new AuraHandledException('Cannot close the Backlog sprint.');
        update new Sprint__c(Id = sprintId, Status__c = 'Completed');

        Sprint__c lastSprint = [
            SELECT End_Date__c FROM Sprint__c
            WHERE End_Date__c != null
            ORDER BY End_Date__c DESC LIMIT 1
        ];

        AggregateResult[] agg = [SELECT MAX(Sequence__c) maxSeq FROM Sprint__c];
        Integer nextSeq = agg[0].get('maxSeq') != null
            ? Integer.valueOf((Decimal)agg[0].get('maxSeq')) + 1
            : 1;

        Sprint__c next = new Sprint__c(
            Name          = 'Sprint ' + nextSeq,
            Start_Date__c = lastSprint.End_Date__c.addDays(1),
            End_Date__c   = lastSprint.End_Date__c.addDays(14),
            Status__c     = 'Planning',
            Sequence__c   = nextSeq
        );
        insert next;
        return next;
    }

    private static Date nextSprintStart(Date d) {
        // 0 = Monday relative to Jan 6 2025 (known Monday)
        Date knownMonday = Date.newInstance(2025, 1, 6);
        Integer dayOfWeek = Math.mod(knownMonday.daysBetween(d), 7);
        Integer daysUntilMonday = (dayOfWeek == 0) ? 0 : (7 - dayOfWeek);
        return d.addDays(daysUntilMonday);
    }

    @AuraEnabled(cacheable=true)
    public static List<Work_Item__c> getBoardItems(Id initiativeId) {
        List<Id> rtIds = new List<Id>();
        for (String rt : new List<String>{'Epic','Story','Task','Bug','Chapter'}) {
            rtIds.add(rtId(rt));
        }
        String selectClause = 'SELECT Id, Name, Status__c, Priority__c, Estimate__c, '
            + 'Work_Mode__c, Assignee__c, Assignee__r.Name, Description__c, '
            + 'Sprint__c, Sprint__r.Name, Sprint__r.Sequence__c, '
            + 'Sprint__r.Start_Date__c, Sprint__r.End_Date__c, '
            + 'Parent_Work_Item__c, Parent_Work_Item__r.Name, '
            + 'Parent_Work_Item__r.Parent_Work_Item__c, Parent_Work_Item__r.Parent_Work_Item__r.Name, '
            + 'RecordType.Name, RecordTypeId '
            + 'FROM Work_Item__c WHERE RecordTypeId IN :rtIds';

        if (initiativeId == null) {
            return Database.query(selectClause + ' ORDER BY Sprint__r.Sequence__c NULLS LAST, CreatedDate ASC');
        }

        // Walk three levels: Initiative → Epic → Story/Task/Bug → Chapter
        // SOQL can't nest subqueries that deep, so collect valid parent IDs in two passes.
        Set<Id> validParents = new Set<Id>{ initiativeId };

        // Level 1: Epics that belong to this initiative
        Set<Id> epicIds = new Set<Id>();
        for (Work_Item__c w : [SELECT Id FROM Work_Item__c WHERE Parent_Work_Item__c = :initiativeId]) {
            epicIds.add(w.Id);
        }
        validParents.addAll(epicIds);

        // Level 2: Stories/Tasks/Bugs that belong to those epics
        if (!epicIds.isEmpty()) {
            for (Work_Item__c w : [SELECT Id FROM Work_Item__c WHERE Parent_Work_Item__c IN :epicIds]) {
                validParents.add(w.Id);
            }
        }

        return Database.query(
            selectClause
            + ' AND Parent_Work_Item__c IN :validParents'
            + ' ORDER BY Sprint__r.Sequence__c NULLS LAST, CreatedDate ASC'
        );
    }

    @AuraEnabled
    public static void updateSprint(Id workItemId, Id sprintId) {
        List<Work_Item__c> toUpdate = new List<Work_Item__c>{
            new Work_Item__c(Id = workItemId, Sprint__c = sprintId)
        };
        Id chapterRtId = rtId('Chapter');
        for (Work_Item__c child : [
            SELECT Id FROM Work_Item__c
            WHERE Parent_Work_Item__c = :workItemId AND RecordTypeId = :chapterRtId
        ]) {
            toUpdate.add(new Work_Item__c(Id = child.Id, Sprint__c = sprintId));
        }
        update toUpdate;
    }

    @AuraEnabled
    public static void updateStatus(Id workItemId, String newStatus) {
        update new Work_Item__c(Id = workItemId, Status__c = newStatus);
    }

    @AuraEnabled(cacheable=true)
    public static List<Comment__c> getComments(Id workItemId) {
        return [
            SELECT Id, Body__c, CreatedDate, CreatedBy.Name
            FROM Comment__c
            WHERE Work_Item__c = :workItemId
            ORDER BY CreatedDate DESC
        ];
    }

    @AuraEnabled
    public static void addComment(Id workItemId, String body) {
        Id rtId = Schema.SObjectType.Comment__c
            .getRecordTypeInfosByName().get('Work Item Comments').getRecordTypeId();
        insert new Comment__c(
            Work_Item__c = workItemId,
            Body__c      = body,
            RecordTypeId = rtId
        );
    }

    private static Id rtId(String name) {
        return Schema.SObjectType.Work_Item__c
            .getRecordTypeInfosByName()
            .get(name)
            .getRecordTypeId();
    }
}