// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, wire, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { refreshApex } from "@salesforce/apex";
import getWorkItems from "@salesforce/apex/WorkItemController.getWorkItems";
import getAllSprints from "@salesforce/apex/WorkItemController.getAllSprints";
import generateSprints from "@salesforce/apex/WorkItemController.generateSprints";
import closeSprint from "@salesforce/apex/WorkItemController.closeSprint";

// Root component — manages navigation between the Projects list, Sprints list,
// and the Kanban board view for a selected project.
export default class WorkManager extends LightningElement {
  // ── State ─────────────────────────────────────────────────────────────────
  @track view = "projects"; // active panel: 'projects' | 'sprints' | 'board'
  @track selectedProject = null; // { Id, Name } of the project currently open on the board
  @track showCreate = false; // controls the new-project creation form
  @track isGenerating = false; // true while the generate-sprints call is in flight

  projects = []; // list of Project work items from the wire
  allSprints = []; // all non-completed sprints for the sprint panel
  _wiredProjects; // raw wire result — held so refreshApex can target it
  _wiredSprints; // raw wire result — held so refreshApex can target it

  // ── Wire adapters ─────────────────────────────────────────────────────────
  // Fetches all Project-type work items for the projects list panel
  @wire(getWorkItems, {
    recordTypeName: "Project",
    sprintId: null,
    projectId: null
  })
  wiredProjects(result) {
    this._wiredProjects = result;
    if (result.data) this.projects = result.data;
  }

  // Fetches all sprints (excluding completed) for the sprint management panel
  @wire(getAllSprints)
  wiredSprints(result) {
    this._wiredSprints = result;
    if (result.data) this.allSprints = result.data;
  }

  // ── View flags ────────────────────────────────────────────────────────────
  get isProjectsView() {
    return this.view === "projects";
  }
  get isSprintsView() {
    return this.view === "sprints";
  }
  get isBoardView() {
    return this.view === "board";
  }
  get hasProjects() {
    return this.projects.length > 0;
  }
  get hasSprints() {
    return this.allSprints.length > 0;
  }
  get selectedProjectId() {
    return this.selectedProject?.Id ?? null;
  }

  // ── Tab CSS helpers ───────────────────────────────────────────────────────
  get projectsTabClass() {
    return (
      "wm-nav__tab" + (this.view === "projects" ? " wm-nav__tab--active" : "")
    );
  }
  get sprintsTabClass() {
    return (
      "wm-nav__tab" + (this.view === "sprints" ? " wm-nav__tab--active" : "")
    );
  }

  // ── Sprint display data ───────────────────────────────────────────────────
  // Enriches each sprint with display-only properties for the sprint panel.
  // Only one sprint at a time is eligible to be closed (the first non-completed,
  // non-backlog sprint found), so canClose is set only on that record.
  get allSprintsForDisplay() {
    const closable = this.allSprints.find(
      // first sprint that can be closed
      (s) => s.Status__c !== "Completed" && s.Status__c !== "Backlog"
    );
    return this.allSprints.map((s) => ({
      Id: s.Id,
      Name: s.Name,
      Status__c: s.Status__c,
      Start_Date__c: s.Start_Date__c,
      End_Date__c: s.End_Date__c,
      canClose: s.Id === closable?.Id, // only the active sprint shows the Close button
      barClass:
        "sprint-card__bar sprint-card__bar--" +
        (s.Status__c || "Planning").toLowerCase()
    }));
  }

  // ── Navigation handlers ───────────────────────────────────────────────────
  showProjects() {
    this.view = "projects";
  }
  showSprints() {
    this.view = "sprints";
  }

  handleNewProject() {
    this.showCreate = true;
  }
  handleCreateCancel() {
    this.showCreate = false;
  }

  // Reads project Id and Name from data attributes on the clicked row element
  handleProjectSelect(event) {
    const { id, name } = event.currentTarget.dataset;
    this.selectedProject = { Id: id, Name: name };
    this.view = "board";
  }

  // Returns to the projects list and clears the selected project
  handleBack() {
    this.view = "projects";
    this.selectedProject = null;
  }

  // After a project is created, hides the form and refreshes the projects wire
  async handleProjectCreated() {
    this.showCreate = false;
    await refreshApex(this._wiredProjects);
  }

  // ── Sprint actions ────────────────────────────────────────────────────────
  // Calls the Apex method to auto-generate a set of future sprints, then refreshes
  async handleGenerateSprints() {
    this.isGenerating = true;
    try {
      await generateSprints();
      await refreshApex(this._wiredSprints);
    } catch (err) {
      this.toast(
        "Generation failed",
        err?.body?.message ?? err?.message,
        "error"
      );
    } finally {
      this.isGenerating = false;
    }
  }

  // Closes the clicked sprint (creating the next sprint automatically in Apex),
  // then refreshes the sprint list
  async handleCloseSprint(event) {
    const sprintId = event.target.dataset.id;
    try {
      await closeSprint({ sprintId });
      await refreshApex(this._wiredSprints);
      this.toast(
        "Sprint closed",
        "Next sprint created automatically",
        "success"
      );
    } catch (err) {
      this.toast("Close failed", err?.body?.message ?? err?.message, "error");
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
