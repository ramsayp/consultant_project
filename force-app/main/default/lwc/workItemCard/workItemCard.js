import { LightningElement, api } from 'lwc';

const PRIORITY_COLOUR = {
    Critical: 'var(--priority-critical)',
    High:     'var(--priority-high)',
    Medium:   'var(--priority-medium)',
    Low:      'var(--priority-low)'
};

export default class WorkItemCard extends LightningElement {
    @api workItem;
    @api statusOptions = [];

    get cardClass() {
        return `work-card priority-${(this.workItem?.Priority__c || 'medium').toLowerCase()}`;
    }

    get priorityBar() {
        return `priority-bar priority-bar_${(this.workItem?.Priority__c || 'medium').toLowerCase()}`;
    }

    get assigneeName() {
        return this.workItem?.Assignee__r?.Name ?? '';
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

    stopProp(event) {
        event.stopPropagation();
    }
}