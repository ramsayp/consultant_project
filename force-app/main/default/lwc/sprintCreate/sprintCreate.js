import { LightningElement, track } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import SPRINT_OBJECT from '@salesforce/schema/Sprint__c';

export default class SprintCreate extends LightningElement {
    @track name      = '';
    @track startDate = null;
    @track endDate   = null;
    @track status    = 'Planning';
    @track goal      = '';
    @track isCreating = false;

    get statusOptions() {
        return [
            { label: 'Planning',  value: 'Planning' },
            { label: 'Active',    value: 'Active' },
            { label: 'Completed', value: 'Completed' }
        ];
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    async handleCreate() {
        if (!this.name?.trim()) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Name is required', variant: 'error' }));
            return;
        }
        this.isCreating = true;
        const fields = {
            Name:      this.name.trim(),
            Status__c: this.status
        };
        if (this.startDate) fields.Start_Date__c = this.startDate;
        if (this.endDate)   fields.End_Date__c   = this.endDate;
        if (this.goal)      fields.Goal__c       = this.goal;

        try {
            const rec = await createRecord({ apiName: SPRINT_OBJECT.objectApiName, fields });
            this.dispatchEvent(new ShowToastEvent({ title: 'Sprint created', message: this.name.trim(), variant: 'success' }));
            this.dispatchEvent(new CustomEvent('created', { detail: { id: rec.id } }));
            this.reset();
        } catch (err) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Creation failed',
                message: err?.body?.message ?? err?.message,
                variant: 'error'
            }));
        } finally {
            this.isCreating = false;
        }
    }

    handleCancel() {
        this.reset();
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    reset() {
        this.name = '';
        this.startDate = null;
        this.endDate = null;
        this.status = 'Planning';
        this.goal = '';
    }
}