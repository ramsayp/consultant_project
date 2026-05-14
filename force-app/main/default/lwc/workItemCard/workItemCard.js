import { LightningElement, api } from 'lwc';

export default class WorkItemCard extends LightningElement {
    @api workItem;

    get cardClass() {
        return `work-card priority-${(this.workItem?.Priority__c || 'medium').toLowerCase()}`;
    }

    get priorityBar() {
        return `priority-bar priority-bar_${(this.workItem?.Priority__c || 'medium').toLowerCase()}`;
    }

    get assigneeName() {
        return this.workItem?.Assignee__r?.Name ?? '';
    }

    get workItemType() {
        return this.workItem?.RecordType?.Name ?? '';
    }

    get typeBadgeClass() {
        return `meta-badge meta-badge_type meta-badge_type--${this.workItemType.toLowerCase()}`;
    }

    get isStory() {
        return this.workItemType === 'Story';
    }

    handleDragStart(event) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify({
            itemId: this.workItem.Id,
            sprintId: this.workItem.Sprint__c || null
        }));
    }

    handleAddChapter(event) {
        event.stopPropagation();
        this.dispatchEvent(new CustomEvent('addchapter', {
            detail: { parentId: this.workItem.Id, sprintId: this.workItem.Sprint__c || null },
            bubbles: true
        }));
    }

    handleOpen() {
        this.dispatchEvent(new CustomEvent('open', { detail: { id: this.workItem.Id } }));
    }
}
