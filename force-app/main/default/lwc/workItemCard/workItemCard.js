import { LightningElement, api } from 'lwc';

const STATUS_TO_STAGE = {
    'Backlog': 'To Do', 'Open': 'To Do', 'Draft': 'To Do', 'Ready': 'To Do', 'To Do': 'To Do',
    'In Progress': 'In Progress', 'In Sprint': 'In Progress', 'Active': 'In Progress', 'Triaged': 'In Progress',
    'In Review': 'Review', 'Blocked': 'Review', 'Fixed': 'Review',
    'Done': 'Done', 'Closed': 'Done', 'Completed': 'Done', 'Cancelled': 'Done',
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
