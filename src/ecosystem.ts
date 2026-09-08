import type {CheckinEvent} from "./types";

export interface ExternalCheckinRecord {
    itemId: string;
    value: number;
    unit?: string;
    source: string;
    externalRef: string;
    occurredAt?: string;
    localDate?: string;
    note?: string;
}

export interface NormalizedExternalRecord extends ExternalCheckinRecord {
    source: string;
    externalRef: string;
    occurredAt?: string;
    localDate?: string;
}

export interface IntegrationAdapter {
    id: string;
    name: string;
    capabilities: readonly ("record" | "focus" | "calendar")[];
    normalize(input: unknown): NormalizedExternalRecord | undefined;
}

export function normalizeExternalRecord(input: unknown, fallbackSource = "external"): NormalizedExternalRecord | undefined {
    if (!input || typeof input !== "object") return undefined;
    const value = input as Partial<ExternalCheckinRecord>;
    const itemId = typeof value.itemId === "string" ? value.itemId.trim() : "";
    const externalRef = typeof value.externalRef === "string" ? value.externalRef.trim().slice(0, 240) : "";
    const source = typeof value.source === "string" && value.source.trim() ? value.source.trim().slice(0, 80) : fallbackSource;
    if (!itemId || !externalRef || !Number.isFinite(value.value) || (value.value as number) < 0) return undefined;
    return {
        itemId, value: value.value as number, source, externalRef,
        unit: typeof value.unit === "string" ? value.unit.trim().slice(0, 32) : undefined,
        occurredAt: typeof value.occurredAt === "string" ? value.occurredAt : undefined,
        localDate: typeof value.localDate === "string" ? value.localDate : undefined,
        note: typeof value.note === "string" ? value.note.slice(0, 500) : undefined,
    };
}

export function hasExternalRecord(events: readonly Pick<CheckinEvent, "source" | "externalRef">[], record: Pick<ExternalCheckinRecord, "source" | "externalRef">): boolean {
    return events.some((event) => event.source === record.source && event.externalRef === record.externalRef);
}

export function toCalendarSyncRecord(event: CheckinEvent): {id: string; itemId: string; start: string; value: number; unit: string; source: string; externalRef?: string} {
    return {id: event.id, itemId: event.itemId, start: event.occurredAt, value: event.value, unit: event.unit, source: event.source, externalRef: event.externalRef};
}
