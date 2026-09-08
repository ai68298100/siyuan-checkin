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

const INTEGRATION_CAPABILITIES = new Set(["record", "focus", "calendar"] as const);

export function isIntegrationAdapter(value: unknown): value is IntegrationAdapter {
    if (!value || typeof value !== "object") return false;
    const adapter = value as Partial<IntegrationAdapter>;
    return typeof adapter.id === "string" && Boolean(adapter.id.trim())
        && typeof adapter.name === "string" && Boolean(adapter.name.trim())
        && Array.isArray(adapter.capabilities) && adapter.capabilities.length > 0
        && adapter.capabilities.every((capability) => INTEGRATION_CAPABILITIES.has(capability as "record" | "focus" | "calendar"))
        && typeof adapter.normalize === "function";
}

export interface ExternalCompletion {
    id: string;
    source: string;
    itemId: string;
    completedAt: string;
    value?: number;
    unit?: string;
    title?: string;
}

export function completionToRecord(input: unknown): NormalizedExternalRecord | undefined {
    if (!input || typeof input !== "object") return undefined;
    const completion = input as Partial<ExternalCompletion>;
    const source = typeof completion.source === "string" ? completion.source.trim() : "";
    const id = typeof completion.id === "string" ? completion.id.trim() : "";
    const completedAt = typeof completion.completedAt === "string" ? completion.completedAt : "";
    if (!source || !id || !completedAt || !Number.isFinite(Date.parse(completedAt))) return undefined;
    return normalizeExternalRecord({
        itemId: completion.itemId,
        value: completion.value === undefined ? 1 : completion.value,
        unit: completion.unit,
        source,
        externalRef: `${source}:${id}`,
        occurredAt: completedAt,
        note: completion.title ? `来自${source}：${completion.title}` : `来自${source}的完成记录`,
    }, source);
}

export function integrationKey(record: Pick<ExternalCheckinRecord, "source" | "externalRef">): string {
    return `${record.source.trim()}::${record.externalRef.trim()}`;
}

export function createIntegrationRegistry() {
    const adapters = new Map<string, IntegrationAdapter>();
    return {
        register(adapter: IntegrationAdapter): () => void {
            if (!isIntegrationAdapter(adapter)) return () => undefined;
            adapters.set(adapter.id, adapter);
            return () => { if (adapters.get(adapter.id) === adapter) adapters.delete(adapter.id); };
        },
        get(id: string): IntegrationAdapter | undefined { return adapters.get(id); },
        list(): IntegrationAdapter[] { return [...adapters.values()]; },
        normalize(id: string, input: unknown): NormalizedExternalRecord | undefined { return adapters.get(id)?.normalize(input); },
    };
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
    const key = integrationKey(record);
    return events.some((event) => Boolean(event.externalRef) && integrationKey({source: event.source, externalRef: event.externalRef || ""}) === key);
}

export function toCalendarSyncRecord(event: CheckinEvent): {id: string; itemId: string; start: string; value: number; unit: string; source: string; externalRef?: string} {
    return {id: event.id, itemId: event.itemId, start: event.occurredAt, value: event.value, unit: event.unit, source: event.source, externalRef: event.externalRef};
}
