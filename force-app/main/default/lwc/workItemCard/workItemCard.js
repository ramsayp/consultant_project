import { LightningElement, api } from 'lwc';

const STATUS_TO_STAGE = {
    'Not Started': 'Not Started',
    'To Do':       'To Do',
    'In Progress': 'In Progress',
    'Blocked':     'Blocked',
    'Code Review': 'Code Review',
    'UAT':         'UAT',
    'Pipeline':    'Pipeline',
    'Released':    'Released',
    'Documented':  'Documented',
    'Done':        'Done',
    // Legacy
    'Backlog': 'Not Started', 'Draft': 'Not Started', 'Open': 'Not Started',
    'Ready': 'To Do', 'Triaged': 'To Do',
    'In Sprint': 'In Progress', 'Active': 'In Progress',
    'In Review': 'Code Review', 'Fixed': 'Code Review',
    'Closed': 'Done', 'Completed': 'Done', 'Cancelled': 'Done',
    'Rolled Forward': 'Done', 'Wont Fix': 'Done'
};

export default class WorkItemCard extends LightningElement {
    @api workItem;
    @api statusOptions = [];
    @api sprintOptions = [];

    get cardClass() {
        return `work-card priority-${(this.workItem?.Priority__c || 'medium').toLowerCase()}`;
    }

    get priorityBar() {
        return `priority-bar priority-bar_${(this.workItem?.Priority__c || 'medium').toLowerCase()}`;
    }

    get assigneeName() {
        return this.workItem?.Assignee__r?.Name ?? '';
    }

    get currentStage() {
        return STATUS_TO_STAGE[this.workItem?.Status__c] || 'To Do';
    }

    get currentSprintId() {
        return this.workItem?.Sprint__c ?? '';
    }

    get workItemType() {
        return this.workItem?.RecordType?.Name ?? '';
    }

    get typeBadgeClass() {
        return `meta-badge meta-badge_type meta-badge_type--${this.workItemType.toLowerCase()}`;
    }

    get showSprintPicker() {
        return this.workItemType !== 'Epic' && this.workItemType !== 'Chapter';
    }

    get isStory() {
        return this.workItemType === 'Story';
    }

    handleAddChapter(event) {
        event.stopPropagation();
        this.dispatchEvent(new CustomEvent('addchapter', {
            detail: {
                parentId: this.workItem.Id,
                sprintId: this.workItem.Sprint__c || null
            },
            bubbles: true
        }));
    }

    handleOpen() {
        this.dispatchEvent(new CustomEvent('open', { detail: { id: this.workItem.Id } }));
    }

    handleStatusChange(event) {
        this.dispatchEvent(new CustomEvent('statuschange', {
            detail: { id: this.workItem.Id, status: event.detail.value },
            bubbles: true
        }));
    }

    handleSprintChange(event) {
        this.dispatchEvent(new CustomEvent('sprintchange', {
            detail: { id: this.workItem.Id, sprintId: event.detail.value || null },
            bubbles: true
        }));
    }

    stopProp(event) {
        event.stopPropagation();
    }
}
