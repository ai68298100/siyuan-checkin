export type CheckinKind = "binary" | "count" | "duration" | "quantity" | "custom";

export type CheckinPriority = "low" | "medium" | "high";

export type CheckinTimeSlot = "any" | "morning" | "afternoon" | "evening";

export type CheckinItemSortMode = "manual" | "group" | "priority" | "createdAt" | "updatedAt" | "name";

export type ScheduleType = "daily" | "weekly" | "workdays" | "custom" | "interval" | "quota";

export type QuotaPeriod = "week" | "month";
export type QuotaCountMode = "dates" | "value";

export interface CheckinQuota {
    period: QuotaPeriod;
    amount: number;
    countMode: QuotaCountMode;
    weekStartsOn?: 1;
}

export interface CheckinSchedule {
    type: ScheduleType;
    weekdays?: number[];
    /** Number of local calendar days between scheduled occurrences. */
    intervalDays?: number;
    /** Inclusive local date used as the first scheduled occurrence. */
    anchorDate?: string;
    quota?: CheckinQuota;
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
    /** Optional part of day used by the time grouping view. */
    timeSlot?: CheckinTimeSlot;
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
    templates?: UserTemplate[];
}

export interface UserTemplate {
    id: string;
    name: string;
    icon: string;
    kind: CheckinKind;
    target: number;
    unit: string;
    schedule: CheckinSchedule;
    group: string;
    priority: CheckinPriority;
    timeSlot?: CheckinTimeSlot;
    note: string;
    createdAt: string;
    updatedAt: string;
}

export interface CheckinIntegrationEvent {
    type: "item-created" | "item-updated" | "event-recorded" | "event-deleted";
    item?: CheckinItem;
    event?: CheckinEvent;
    deletedEvents?: CheckinEvent[];
}
