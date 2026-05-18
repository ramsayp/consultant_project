import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getWorkItemMeta from '@salesforce/apex/WorkItemController.getWorkItemMeta';
import getChildren     from '@salesforce/apex/WorkItemController.getChildren';

const CHILD_TYPE = {
    'Project': 'Epic',
    'Epic':       'Story',
    'Story':      'Chapter',
    'Task':       'Step'
};

const SECTION_LABEL = {
    'Project': 'Epics',
    'Epic':       'Work Items',
    'Story':      'Chapters',
    'Task':       'Steps'
};

const EPIC_GROUPS = [
    { label: 'Stories', type: 'Story' },
    { label: 'Tasks',   type: 'Task' },
    { label: 'Bugs',    type: 'Bug' }
];

export default class WorkItemChildren extends NavigationMixin(LightningElement) {
    @api recordId;

    @track showCreate  = false;
    @track createType  = 'Story';
    @track children    = [];
    @track typeName    = '';

    sprintId = null;

    @wire(getWorkItemMeta, { recordId: '$recordId' })
    async wiredMeta({ data }) {
        if (data) {
            this.typeName  = data.typeName;
            this.sprintId  = data.sprintId || null;
            this.createType = CHILD_TYPE[this.typeName] || 'Story';
            await this.loadChildren();
        }
    }

    async loadChildren() {
        try {
            this.children = await getChildren({ parentId: this.recordId });
        } catch(e) { /* silent */ }
    }

    get showApplet()      { return !!CHILD_TYPE[this.typeName]; }
    get childType()       { return this.createType; }
    get sectionLabel()    { return SECTION_LABEL[this.typeName] || 'Children'; }
    get isEmpty()         { return this.children.length === 0; }
    get isEpic()          { return this.typeName === 'Epic'; }

    get epicChildGroups() {
        return EPIC_GROUPS.map(g => ({
            ...g,
            items:   this.children.filter(c => c.RecordType.Name === g.type),
            isEmpty: this.children.filter(c => c.RecordType.Name === g.type).length === 0
        }));
    }

    handleAdd()    { this.showCreate = true; }
    handleAddType(event) {
        this.createType = event.currentTarget.dataset.type;
        this.showCreate = true;
    }
    handleCancel() { this.showCreate = false; }

    async handleCreated() {
        this.showCreate = false;
        await this.loadChildren();
    }

    handleOpenChild(event) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: event.currentTarget.dataset.id, actionName: 'view' }
        });
    }
}
