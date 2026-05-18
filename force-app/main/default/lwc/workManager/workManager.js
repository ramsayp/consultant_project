import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getWorkItems     from '@salesforce/apex/WorkItemController.getWorkItems';
import getAllSprints     from '@salesforce/apex/WorkItemController.getAllSprints';
import generateSprints  from '@salesforce/apex/WorkItemController.generateSprints';
import closeSprint      from '@salesforce/apex/WorkItemController.closeSprint';

export default class WorkManager extends LightningElement {
    @track view            = 'projects';
    @track selectedProject = null;
    @track showCreate      = false;
    @track isGenerating    = false;

    projects     = [];
    allSprints   = [];
    _wiredProjects;
    _wiredSprints;

    @wire(getWorkItems, { recordTypeName: 'Project', sprintId: null, projectId: null })
    wiredProjects(result) {
        this._wiredProjects = result;
        if (result.data) this.projects = result.data;
    }

    @wire(getAllSprints)
    wiredSprints(result) {
        this._wiredSprints = result;
        if (result.data) this.allSprints = result.data;
    }

    get isProjectsView()   { return this.view === 'projects'; }
    get isSprintsView()    { return this.view === 'sprints'; }
    get isBoardView()      { return this.view === 'board'; }
    get hasProjects()      { return this.projects.length > 0; }
    get hasSprints()       { return this.allSprints.length > 0; }
    get selectedProjectId() { return this.selectedProject?.Id ?? null; }

    get projectsTabClass() {
        return 'wm-nav__tab' + (this.view === 'projects' ? ' wm-nav__tab--active' : '');
    }
    get sprintsTabClass() {
        return 'wm-nav__tab' + (this.view === 'sprints' ? ' wm-nav__tab--active' : '');
    }

    get allSprintsForDisplay() {
        const closable = this.allSprints.find(s => s.Status__c !== 'Completed' && s.Status__c !== 'Backlog');
        return this.allSprints.map(s => ({
            Id:            s.Id,
            Name:          s.Name,
            Status__c:     s.Status__c,
            Start_Date__c: s.Start_Date__c,
            End_Date__c:   s.End_Date__c,
            canClose:      s.Id === closable?.Id,
            barClass:      'sprint-card__bar sprint-card__bar--' + (s.Status__c || 'Planning').toLowerCase()
        }));
    }

    showProjects()  { this.view = 'projects'; }
    showSprints()   { this.view = 'sprints'; }

    handleNewProject()   { this.showCreate = true; }
    handleCreateCancel() { this.showCreate = false; }
    handleProjectSelect(event) {
        const { id, name } = event.currentTarget.dataset;
        this.selectedProject = { Id: id, Name: name };
        this.view = 'board';
    }

    handleBack() {
        this.view = 'projects';
        this.selectedProject = null;
    }

    async handleProjectCreated() {
        this.showCreate = false;
        await refreshApex(this._wiredProjects);
    }

    async handleGenerateSprints() {
        this.isGenerating = true;
        try {
            await generateSprints();
            await refreshApex(this._wiredSprints);
        } catch (err) {
            this.toast('Generation failed', err?.body?.message ?? err?.message, 'error');
        } finally {
            this.isGenerating = false;
        }
    }

    async handleCloseSprint(event) {
        const sprintId = event.target.dataset.id;
        try {
            await closeSprint({ sprintId });
            await refreshApex(this._wiredSprints);
            this.toast('Sprint closed', 'Next sprint created automatically', 'success');
        } catch (err) {
            this.toast('Close failed', err?.body?.message ?? err?.message, 'error');
        }
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
