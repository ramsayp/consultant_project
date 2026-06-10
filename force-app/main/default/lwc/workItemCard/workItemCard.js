// ── Imports ───────────────────────────────────────────────────────────────────
import { LightningElement, api } from "lwc";

// Maps priority values to coloured circle emojis shown on the card
const PRIORITY_EMOJI = {
  Critical: "🔴",
  Higher: "🟠",
  High: "🟡",
  Medium: "🟢",
  Low: "🔵",
  Lowest: "⚪"
};

// Presentational card component — receives a work item record and renders it
// in either compact (row) or full (card) mode depending on the compact @api prop.
export default class WorkItemCard extends LightningElement {
  // ── Public API ────────────────────────────────────────────────────────────
  @api workItem; // the Work_Item__c record object to display
  @api compact = false; // when true, renders the condensed row layout

  // ── CSS class helpers ─────────────────────────────────────────────────────
  get cardClass() {
    return `work-card priority-${(this.workItem?.Priority__c || "medium").toLowerCase()}`;
  }

  get rowClass() {
    return `work-row priority-${(this.workItem?.Priority__c || "medium").toLowerCase()}`;
  }

  // Coloured left-border bar that reflects priority
  get priorityBar() {
    return `priority-bar priority-bar_${(this.workItem?.Priority__c || "medium").toLowerCase()}`;
  }

  // ── Derived display values ────────────────────────────────────────────────
  get assigneeName() {
    return this.workItem?.Assignee__r?.Name ?? "";
  }

  // Resolves the parent epic name for the card sub-header.
  // The depth varies by type: Chapter/Step sit two levels below an Epic,
  // while Story/Task/Bug are direct children of an Epic.
  get parentName() {
    const type = this.workItemType;
    if (type === "Chapter" || type === "Step") {
      return (
        this.workItem?.Parent_Work_Item__r?.Parent_Work_Item__r?.Name ?? ""
      ); // grandparent = Epic
    }
    if (type === "Story" || type === "Task" || type === "Bug") {
      return this.workItem?.Parent_Work_Item__r?.Name ?? ""; // parent = Epic
    }
    return "";
  }

  get workItemType() {
    return this.workItem?.RecordType?.Name ?? "";
  }

  get priorityEmoji() {
    return PRIORITY_EMOJI[this.workItem?.Priority__c] ?? "";
  }

  get ticketKey() {
    return this.workItem?.Ticket_Key__c ?? "";
  }

  // CSS class for the type badge pill (colour-coded by record type)
  get typeBadgeClass() {
    return `meta-badge meta-badge_type meta-badge_type--${this.workItemType.toLowerCase()}`;
  }

  // ── Drag handler ──────────────────────────────────────────────────────────
  // Packs the item Id and current sprint into the drag payload so the board
  // knows where the card came from when it is dropped
  handleDragStart(event) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        itemId: this.workItem.Id,
        sprintId: this.workItem.Sprint__c || null
      })
    );
  }

  // ── Open handler ──────────────────────────────────────────────────────────
  // Fires an 'open' event so the parent board can navigate to the record page
  handleOpen() {
    this.dispatchEvent(
      new CustomEvent("open", { detail: { id: this.workItem.Id } })
    );
  }
}
