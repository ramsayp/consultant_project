import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getWorkItemMeta from '@salesforce/apex/WorkItemController.getWorkItemMeta';
import getChildren     from '@salesforce/apex/WorkItemController.getChildren';

export default class WorkItemChildren extends NavigationMixin(LightningElement) {
    @api recordId;

    showCreate = false;
    children   = [];
    sprintId   = null;
    typeName   = '';
    _wiredChildren;

    @wire(getWorkItemMeta, { recordId: '$recordId' })
    wiredMeta({ data }) {
        if (data) {
            this.typeName = data.typeName;
            this.sprintId = data.sprintId || null;
        }
    }

    @wire(getChildren, { parentId: '$recordId' })
    wiredChildren(result) {
        this._wiredChildren = result;
        if (result.data) this.children = result.data;
    }

    get showApplet()  { return this.typeName === 'Story' || this.typeName === 'Task'; }
    get childType()   { return this.typeName === 'Story' ? 'Chapter' : 'Step'; }
    get sectionLabel(){ return this.typeName === 'Story' ? 'Chapters' : 'Subtasks'; }
    get isEmpty()     { return this.children.length === 0; }

    handleAdd()    { this.showCreate = true; }
    handleCancel() { this.showCreate = false; }

    async handleCreated() {
        this.showCreate = false;
        await refreshApex(this._wiredChildren);
    }

    handleOpenChild(event) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: event.currentTarget.dataset.id, actionName: 'view' }
        });
    }
}
