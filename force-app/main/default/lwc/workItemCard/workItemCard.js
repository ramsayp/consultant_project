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

    get parentName() {
        const type = this.workItemType;
        // Chapter/Step: parent is Story → grandparent is Epic
        if (type === 'Chapter' || type === 'Step') {
            return this.workItem?.Parent_Work_Item__r?.Parent_Work_Item__r?.Name ?? '';
        }
        // Story/Task/Bug: parent is Epic directly
        if (type === 'Story' || type === 'Task' || type === 'Bug') {
            return this.workItem?.Parent_Work_Item__r?.Name ?? '';
        }
        return '';
    }

    get workItemType() {
        return this.workItem?.RecordType?.Name ?? '';
    }

    get typeBadgeClass() {
        return `meta-badge meta-badge_type meta-badge_type--${this.workItemType.toLowerCase()}`;
    }

    handleDragStart(event) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify({
            itemId: this.workItem.Id,
            sprintId: this.workItem.Sprint__c || null
        }));
    }

    handleOpen() {
        this.dispatchEvent(new CustomEvent('open', { detail: { id: this.workItem.Id } }));
    }
}
