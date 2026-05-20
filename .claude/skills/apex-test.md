# Skill — Writing Apex Test Classes

## File location

Place in `force-app/main/default/classes/<module>/__tests__/`.
Name: `<ClassName>_Test.cls` with matching `-meta.xml`.

Deploy with: `sf project deploy start --source-dir force-app/main/default/classes/<module> --ignore-conflicts`

## Structure

```apex
@isTest
private class MyClass_Test {
  // ── Helpers ───────────────────────────────────────────────────────────────
  // RecordTypeId lookups, shared utility methods

  // ── Test setup ────────────────────────────────────────────────────────────
  @TestSetup
  static void makeData() {
    // Insert all records needed across all tests in one transaction
  }

  // ── Method group ──────────────────────────────────────────────────────────
  @isTest
  static void testMethodName_scenario() {
    // Query setup data by name (not by Id — Ids differ per run)
    Work_Item__c story = [
      SELECT Id, Sprint__c
      FROM Work_Item__c
      WHERE Name = 'Test Story'
      LIMIT 1
    ];

    Test.startTest();
    // call the method
    Test.stopTest();

    // Assert exact values, not just non-null / non-empty
    System.assertEquals(expectedValue, actual);
  }
}
```

## Assertion rules

| Avoid                                     | Use instead                                                     |
| ----------------------------------------- | --------------------------------------------------------------- |
| `System.assert(!list.isEmpty())`          | `System.assertEquals(3, list.size())`                           |
| `System.assertNotEquals(null, record.Id)` | `System.assertEquals(expectedId, record.Id)`                    |
| `System.assert(map.containsKey('x'))`     | Also assert the value: `System.assertEquals('y', map.get('x'))` |

Always assert **exact counts and exact values**. Weak assertions let bugs through.

## Query for related IDs

When asserting an ID from a result, query the related record first:

```apex
Work_Item__c epic = [SELECT Id FROM Work_Item__c WHERE Name = 'Test Epic' LIMIT 1];
// ... call method ...
System.assertEquals(epic.Id, ctx.get('parentId'));
```

Do NOT select just `Id` when you also need relationship fields — add them to the SELECT:

```apex
Work_Item__c story = [SELECT Id, Sprint__c FROM Work_Item__c WHERE Name = 'Test Story' LIMIT 1];
```

## @TestSetup data for project-management

The standard `@TestSetup` creates:

- 2 sprints: `Backlog` (Status=Backlog, Seq=9999), `Sprint 1` (Status=Active, Seq=1)
- 1 project: `Test Project`
- 1 epic: `Test Epic` (parent = project)
- 3 children: `Test Story` (Story, sprint=Sprint 1), `Test Task` (Task), `Test Bug` (Bug)
- 1 comment on Test Story: `Initial comment`
