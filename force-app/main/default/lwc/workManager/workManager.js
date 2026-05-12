import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getWorkItems  from '@salesforce/apex/WorkItemController.getWorkItems';
import getAllSprints  from '@salesforce/apex/WorkItemController.getAllSprints';

export default class WorkManager extends LightningElement {
    @track view               = 'initiatives';
    @track selectedInitiative = null;
    @track showCreate         = false;
    @track showSprintCreate   = false;

    initiatives  = [];
    allSprints   = [];
    _wiredInitiatives;
    _wiredSprints;

    @wire(getWorkItems, { recordTypeName: 'Initiative', sprintId: null, initiativeId: null })
    wiredInitiatives(result) {
        this._wiredInitiatives = result;
        if (result.data) this.initiatives = result.data;
    }

    @wire(getAllSprints)
    wiredSprints(result) {
        this._wiredSprints = result;
        if (result.data) this.allSprints = result.data;
    }

    get isInitiativesView()    { return this.view === 'initiatives'; }
    get isSprintsView()        { return this.view === 'sprints'; }
    get isBoardView()          { return this.view === 'board'; }
    get hasInitiatives()       { return this.initiatives.length > 0; }
    get hasSprints()           { return this.allSprints.length > 0; }

    get allSprintsForDisplay() {
        return this.allSprints.map(s => ({
            Id:            s.Id,
            Name:          s.Name,
            Status__c:     s.Status__c,
            Start_Date__c: s.Start_Date__c,
            End_Date__c:   s.End_Date__c,
            barClass:      'sprint-card__bar sprint-card__bar--' + (s.Status__c || 'Planning').toLowerCase()
        }));
    }
    get selectedInitiativeId() { return this.selectedInitiative?.Id ?? null; }

    get initiativesTabClass() {
        return 'wm-nav__tab' + (this.view === 'initiatives' ? ' wm-nav__tab--active' : '');
    }
    get sprintsTabClass() {
        return 'wm-nav__tab' + (this.view === 'sprints' ? ' wm-nav__tab--active' : '');
    }

    showInitiatives()  { this.view = 'initiatives'; }
    showSprints()      { this.view = 'sprints'; }

    handleNewInitiative()  { this.showCreate = true; }
    handleCreateCancel()   { this.showCreate = false; }

    handleNewSprint()         { this.showSprintCreate = true; }
    handleSprintCreateCancel(){ this.showSprintCreate = false; }

    handleInitiativeSelect(event) {
        const { id, name } = event.currentTarget.dataset;
        this.selectedInitiative = { Id: id, Name: name };
        this.view = 'board';
    }

    async handleInitiativeCreated() {
        this.showCreate = false;
        await refreshApex(this._wiredInitiatives);
    }

    async handleSprintCreated() {
        this.showSprintCreate = false;
        await refreshApex(this._wiredSprints);
    }

    handleBack() {
        this.view = 'initiatives';
        this.selectedInitiative = null;
    }
}