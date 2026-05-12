import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getWorkItems from '@salesforce/apex/WorkItemController.getWorkItems';

export default class WorkManager extends LightningElement {
    @track view                = 'initiatives';
    @track selectedInitiative  = null;
    @track showCreate          = false;

    initiatives    = [];
    _wiredResult;

    @wire(getWorkItems, { recordTypeName: 'Initiative', sprintId: null, initiativeId: null })
    wiredInitiatives(result) {
        this._wiredResult = result;
        if (result.data) this.initiatives = result.data;
    }

    get isInitiativesView()   { return this.view === 'initiatives'; }
    get isBoardView()         { return this.view === 'board'; }
    get hasInitiatives()      { return this.initiatives.length > 0; }
    get selectedInitiativeId(){ return this.selectedInitiative?.Id ?? null; }

    handleNewInitiative() { this.showCreate = true; }

    handleInitiativeSelect(event) {
        const { id, name } = event.currentTarget.dataset;
        this.selectedInitiative = { Id: id, Name: name };
        this.view = 'board';
    }

    async handleInitiativeCreated() {
        this.showCreate = false;
        await refreshApex(this._wiredResult);
    }

    handleCreateCancel() { this.showCreate = false; }

    handleBack() {
        this.view = 'initiatives';
        this.selectedInitiative = null;
    }
}
