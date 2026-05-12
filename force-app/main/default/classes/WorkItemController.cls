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
        String q = 'SELECT Id, Name, Status__c, Priority__c, Estimate__c, Sequence__c, '
                 + 'Work_Mode__c, Assignee__c, Assignee__r.Name, Description__c, '
                 + 'Sprint__c, Sprint__r.Name, Parent_Work_Item__c, Epic__c, Epic__r.Name, '
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
                q += ' AND Epic__r.Parent_Work_Item__c = :initiativeId';
            }
        }
        q += ' ORDER BY Sequence__c NULLS LAST, CreatedDate ASC';
        return Database.query(q);
    }

    @AuraEnabled(cacheable=true)
    public static List<Work_Item__c> getChildren(Id parentId) {
        return [
            SELECT Id, Name, Status__c, Priority__c, Estimate__c, Sequence__c,
                   RecordType.Name, Assignee__c, Assignee__r.Name
            FROM Work_Item__c
            WHERE Parent_Work_Item__c = :parentId
            ORDER BY Sequence__c NULLS LAST, CreatedDate ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Work_Item__c> getEpics(Id initiativeId) {
        Id rtId = rtId('Epic');
        String q = 'SELECT Id, Name, Status__c, Priority__c, Sequence__c, Description__c, '
                 + '(SELECT Id, Name, Status__c, Priority__c, RecordType.Name, Sequence__c '
                 + ' FROM Child_Work_Items__r ORDER BY Sequence__c NULLS LAST) '
                 + 'FROM Work_Item__c WHERE RecordTypeId = :rtId';
        if (initiativeId != null) {
            q += ' AND Parent_Work_Item__c = :initiativeId';
        }
        q += ' ORDER BY Sequence__c NULLS LAST, Name ASC';
        return Database.query(q);
    }

    @AuraEnabled(cacheable=true)
    public static List<Sprint__c> getActiveSprints() {
        return [
            SELECT Id, Name, Start_Date__c, End_Date__c, Status__c, Sequence__c
            FROM Sprint__c
            WHERE Status__c IN ('Planning', 'Active')
            ORDER BY Sequence__c NULLS LAST, Start_Date__c ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Sprint__c> getAllSprints() {
        return [
            SELECT Id, Name, Start_Date__c, End_Date__c, Status__c, Sequence__c
            FROM Sprint__c
            ORDER BY Sequence__c NULLS LAST, Start_Date__c ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getStatusColumns() {
        return STATUS_COLUMNS;
    }

    @AuraEnabled
    public static void generateSprints() {
        Integer existingCount = [SELECT COUNT() FROM Sprint__c];
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

    @AuraEnabled
    public static void updateStatus(Id workItemId, String newStatus) {
        update new Work_Item__c(Id = workItemId, Status__c = newStatus);
    }

    @AuraEnabled
    public static Work_Item__c rollForwardStory(Id storyId, Id newSprintId) {
        Work_Item__c orig = [
            SELECT Id, Name, Description__c, Priority__c, Estimate__c, Epic__c, Parent_Work_Item__c
            FROM Work_Item__c
            WHERE Id = :storyId
        ];
        update new Work_Item__c(Id = storyId, Status__c = 'Rolled Forward');

        Work_Item__c next = new Work_Item__c(
            Name                 = orig.Name,
            Description__c       = orig.Description__c,
            Priority__c          = orig.Priority__c,
            Estimate__c          = orig.Estimate__c,
            Epic__c              = orig.Epic__c,
            Parent_Work_Item__c  = orig.Parent_Work_Item__c,
            Sprint__c            = newSprintId,
            Lineage_Parent__c    = storyId,
            Status__c            = 'Backlog',
            Work_Mode__c         = 'Iterative',
            RecordTypeId         = rtId('Story')
        );
        insert next;
        return next;
    }

    private static Id rtId(String name) {
        return Schema.SObjectType.Work_Item__c
            .getRecordTypeInfosByName()
            .get(name)
            .getRecordTypeId();
    }
}