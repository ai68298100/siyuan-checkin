export type CheckinKind = "binary" | "count" | "duration" | "quantity" | "custom";

export type CheckinPriority = "low" | "medium" | "high";

export type CheckinItemSortMode = "manual" | "group" | "priority" | "createdAt" | "updatedAt" | "name";

export type ScheduleType = "daily" | "weekly" | "workdays" | "custom";

export interface CheckinSchedule {
    type: ScheduleType;
    weekdays?: number[];
}

export interface CheckinItemRevision {
    effectiveDate: string;
    kind: CheckinKind;
    target: number;
    unit: string;
    schedule: CheckinSchedule;
}

export interface CheckinArchivePeriod {
    startDate: string;
    endDate?: string;
}

export interface CheckinItem {
    id: string;
    name: string;
    icon: string;
    kind: CheckinKind;
    target: number;
    unit: string;
    schedule: CheckinSchedule;
    createdAt: string;
    updatedAt: string;
    createdDate: string;
    revisions: CheckinItemRevision[];
    archivePeriods: CheckinArchivePeriod[];
    archived?: boolean;
    /** User-defined bucket. Empty string means the default ungrouped bucket. */
    group?: string;
    /** Normalized urgency used by priority sorting. */
    priority?: CheckinPriority;
    /** Stable manual order within a group. Lower values appear first. */
    sortOrder?: number;
}

export interface CheckinEvent {
    id: string;
    itemId: string;
    occurredAt: string;
    localDate: string;
    value: number;
    unit: string;
    source: "manual" | "tomato" | "import" | "api";
    note?: string;
    externalRef?: string;
}

export interface CheckinEventTombstone {
    eventId: string;
    deletedAt: string;
    itemId?: string;
    source?: CheckinEvent["source"];
    externalRef?: string;
}

export interface CheckinStore {
    version: 2;
    items: CheckinItem[];
    events: CheckinEvent[];
    eventTombstones: CheckinEventTombstone[];
}

export interface CheckinIntegrationEvent {
    type: "item-created" | "item-updated" | "event-recorded" | "event-deleted";
    item?: CheckinItem;
    event?: CheckinEvent;
    deletedEvents?: CheckinEvent[];
}
