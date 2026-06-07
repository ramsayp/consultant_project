# Project Management App — User Guide

The Project Management app is your central place to plan, track, and deliver work. Everything is organised into projects, and within each project you have a visual board showing what's in progress, what's coming up, and what's done.

---

## Opening the App

Click **Project Management** from the app launcher (the grid icon at the top left). You'll land on the **Projects** view, which lists all active projects.

---

## How Work is Organised

Work is structured in a hierarchy — each level breaks things down into smaller, more manageable pieces:

- **Project** — the top level. Represents a complete area of work (e.g. a product, a client engagement, a system).
- **Epic** — a major feature or theme within a project. Epics group related stories and tasks together.
- **Story** — a piece of functionality written from a user's perspective. Assigned to a sprint and delivered iteratively.
- **Task** — a concrete piece of work that needs doing. More operational than a Story — configuration, documentation, meetings.
- **Bug** — something that's broken and needs fixing. Has its own workflow from Open through to Closed.
- **Chapter** — a sub-section of a Story, for breaking large stories into checkable steps.
- **Step** — a single action within a Chapter.

Most teams work with Projects, Epics, and Stories/Tasks/Bugs day to day. Chapters and Steps are optional.

---

## The Board

Click any project name to open its board. The board shows all work items organised into **sprint sections**.

Only the **Active** sprint — the one currently being worked — shows the full set of progress columns described below. It sorts to the top of the board with a green accent and an "Active" badge so it stands out. Every other sprint section, including upcoming **Planning** sprints and the **Backlog**, shows its items as a simple list — there's nothing to track stage-by-stage until the work is actually underway.

### Board Columns (Active Sprint)

Work moves left to right through 8 columns. Each column sits under a group header showing which role owns that stage:

1. **To Do** _(Dev Agent)_ — ready to be picked up
2. **On Hold** _(Dev Agent)_ — paused, waiting on something
3. **In Progress** _(Dev Agent)_ — actively being worked on
4. **In Code Review** _(Code Review Agent)_ — code complete, awaiting review
5. **Testing** _(Human Tester)_ — in user acceptance testing
6. **Documenting** _(Doc Agent)_ — release notes and documentation being written
7. **Releasing** _(Release Agent)_ — in the deployment pipeline
8. **Done** _(End Bucket)_ — fully complete

### Moving Cards

In the Active sprint, drag a card from one column to another to update its status. You can also drag cards **up and down within a column** (or within a list, for non-Active sections) to change their order — drop above or below another card to position it precisely.

### Moving Between Sprints

Drag a card from one sprint section to another to reassign it to a different sprint. If a Story is moved, its Chapters move with it automatically.

Moving a card also keeps its status in step with where it lands:

- Dropped into the **Backlog** → status becomes **Not Selected**
- Dropped into a **Planning** sprint → status becomes **Selected**
- Dropped into the **Active** sprint → status follows whichever column you drop it in

This happens automatically — pulling a card back out of the Active sprint resets it to Not Selected/Selected even if it was mid-progress, since it's no longer being actively worked.

### Priority Indicators

Each card shows a coloured left border and an emoji:

- 🔴 **Critical** — red
- 🟠 **Higher** — orange
- 🟡 **High** — yellow
- 🟢 **Medium** — green
- 🔵 **Low** — blue
- ⚪ **Lowest** — grey

### The Epics Tab

Switch to the **Epics** tab on the board to see all epics grouped by status (Active, Completed, Cancelled) — a high-level view of which themes are in flight.

---

## The Backlog

At the bottom of the board is the **Backlog** — the default home for new Stories, Tasks, and Bugs. Any item created without an explicit sprint is automatically placed here. Backlog items appear as compact rows so you can see many at once. Drag any item up into a sprint column when you're ready to schedule it.

---

## Creating Work Items

### From the Board

Click **+ New** at the top of any column to create a work item directly in that sprint and status. The form adapts to the type — Stories show User Story and Acceptance Criteria fields; Tasks and Bugs show simpler forms.

If you don't select a sprint, the new item automatically lands in the **Backlog**. You can schedule it into a sprint later by dragging it from the Backlog section into any sprint column.

### New Project

Click **+ New Project** on the Projects view to create a new project.

### From a Record Page

Open any work item and use the **Child Work Items** panel on the right to add children directly. From an Epic you can add Stories, Tasks, or Bugs. From a Story you can add Chapters. Items added this way also land in the Backlog by default.

---

## Work Item Records

Click any card to open the full record. Two tabs are available:

- **Request** — name, description, user story, acceptance criteria, status, assignee, sprint, and the comment thread.
- **Settings** — sequence order, work mode, and audit fields.

The **Child Work Items** panel on the right shows all children and lets you add new ones inline.

---

## Comments

The comment thread is at the bottom of the **Request** tab on any work item.

- Click **+ Add Comment** to write and save a new comment.
- Click the **edit icon** on a comment to update it inline. Edited comments show an _Edited_ badge.
- Click the **delete icon** to permanently remove a comment — you'll be asked to confirm.

---

## Sprints

Sprints are fixed time-boxes — typically two weeks — that give the team a focused window of work. Click the **Sprints** tab in the top navigation to see all sprints and their status.

### Sprint Statuses

- **Planning** — being set up, not yet active
- **Active** — the current working sprint
- **Completed** — closed and finished
- **Backlog** — the permanent holding area for unscheduled work

### Generating Sprints

If no sprints exist yet, click **Generate Sprints** on the Sprints tab. This creates six two-week planning sprints starting from the next Monday, plus the permanent Backlog.

### Closing a Sprint

When a sprint is complete, click the **Close** button next to it. This marks it Completed, activates the next sprint in the sequence, and automatically creates a new one at the end of the chain. Only one sprint can be closed at a time.

Anything already queued (Selected) in the newly-activated sprint switches to **To Do** so it appears at the first column of its kanban — ready to be picked up alongside any work rolled forward from the closed sprint.

---

## Tips

- Use **Epics** to group related work so you can track themes across sprints.
- Set **Priority** on every item — the colour-coded cards make it easy to spot what needs attention.
- Use **Estimate** (story points) to give the team a shared sense of effort before committing to a sprint.
- New items always land in the Backlog first — this is intentional. Review the Backlog regularly and drag items into upcoming sprints as capacity allows.
- Use **Chapters** inside a large Story to break it into checkable sub-steps without cluttering the board.
