import type {CheckinEvent} from "./types";
import {CHECKIN_API_PROTOCOL, CHECKIN_API_VERSION, CHECKIN_EVENT_RANGE_LIMITS} from "./api-contract";

export const TASK_HORIZON_EXTERNAL_REF_PREFIX = "taskhorizon" as const;
export const TASK_HORIZON_REFRESH_EVENTS = [
    "checkin:event-recorded",
    "checkin:analytics-updated",
    "checkin:item-archived",
    "checkin:item-updated",
] as const;
export const TASK_HORIZON_CONTRACT = Object.freeze({
    version: 1,
    apiProtocol: CHECKIN_API_PROTOCOL,
    minApiVersion: CHECKIN_API_VERSION,
    readCapability: "analytics.read",
    writeCapability: "events.record",
    readMethod: "getEventRangeSummary",
    writeMethod: "recordEvent",
    source: "api",
    unit: "个",
    externalRefPrefix: `${TASK_HORIZON_EXTERNAL_REF_PREFIX}:`,
    refreshEvents: Object.freeze([...TASK_HORIZON_REFRESH_EVENTS]),
    summaryLimits: Object.freeze({...CHECKIN_EVENT_RANGE_LIMITS}),
});

export type TaskHorizonRefreshEvent = typeof TASK_HORIZON_REFRESH_EVENTS[number];

export function isTaskHorizonRefreshEvent(value: unknown): value is TaskHorizonRefreshEvent {
    return typeof value === "string" && (TASK_HORIZON_REFRESH_EVENTS as readonly string[]).includes(value);
}

const TASK_HORIZON_BLOCK_ID_MAX_LENGTH = 128;
const TASK_HORIZON_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface TaskHorizonExternalRef {
    blockId: string;
    localDate: string;
}

function isTaskHorizonLocalDate(value: string): boolean {
    const match = TASK_HORIZON_DATE_PATTERN.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const utc = new Date(Date.UTC(year, month - 1, day));
    return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

/** Build the canonical Task Horizon idempotency key without accepting ambiguous input. */
export function createTaskHorizonExternalRef(blockId: unknown, localDate: unknown): string | undefined {
    if (typeof blockId !== "string" || typeof localDate !== "string") return undefined;
    const normalizedBlockId = blockId.trim();
    if (!normalizedBlockId || normalizedBlockId.length > TASK_HORIZON_BLOCK_ID_MAX_LENGTH || /[:\s\u0000-\u001f\u007f]/.test(normalizedBlockId)) return undefined;
    if (!isTaskHorizonLocalDate(localDate)) return undefined;
    return `${TASK_HORIZON_EXTERNAL_REF_PREFIX}:${normalizedBlockId}:${localDate}`;
}

/** Parse only the canonical Task Horizon shape; malformed prefixed values are rejected. */
export function parseTaskHorizonExternalRef(value: unknown): TaskHorizonExternalRef | undefined {
    if (typeof value !== "string" || value.length > 240) return undefined;
    const prefix = `${TASK_HORIZON_EXTERNAL_REF_PREFIX}:`;
    if (!value.startsWith(prefix)) return undefined;
    const body = value.slice(prefix.length);
    const separator = body.lastIndexOf(":");
    if (separator <= 0) return undefined;
    const blockId = body.slice(0, separator);
    const localDate = body.slice(separator + 1);
    return createTaskHorizonExternalRef(blockId, localDate) === value ? {blockId, localDate} : undefined;
}

export function isTaskHorizonExternalRef(value: unknown): value is string {
    return Boolean(parseTaskHorizonExternalRef(value));
}

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

export interface AgentCapabilityHost {
    addAgentCapability?: (options: unknown) => unknown;
}

export interface AgentCapabilityProbe {
    supported: boolean;
    register: (options: unknown) => {registered: boolean; error?: string};
}

export function probeAgentCapabilityHost(host: AgentCapabilityHost | undefined): AgentCapabilityProbe {
    const add = host && typeof host.addAgentCapability === "function" ? host.addAgentCapability.bind(host) : undefined;
    return {
        supported: Boolean(add),
        register: (options) => {
            if (!add) return {registered: false, error: "宿主不支持智能体能力注册，将使用离线模式。"};
            try { add(options); return {registered: true}; }
            catch (error) { return {registered: false, error: String(error instanceof Error ? error.message : error)}; }
        },
    };
}

export function registerAgentCapabilities(probe: AgentCapabilityProbe, capabilities: readonly {name: string; effects?: {localRead?: boolean; localWrite?: boolean}}[]): {registered: string[]; skipped: string[]; errors: string[]} {
    const registered: string[] = [], skipped: string[] = [], errors: string[] = [];
    for (const capability of capabilities) {
        if (!capability || !capability.name || (capability.effects?.localWrite && capability.effects.localRead === false)) { skipped.push(capability?.name || "unknown"); continue; }
        const result = probe.register(capability);
        if (result.registered) registered.push(capability.name); else if (result.error) errors.push(`${capability.name}: ${result.error}`); else skipped.push(capability.name);
    }
    return {registered, skipped, errors};
}

export async function safeAgentCall<T>(call: () => Promise<T> | T, timeoutMs = 12000): Promise<{ok: true; value: T} | {ok: false; error: string; offline: true}> {
    try {
        const value = await Promise.race([Promise.resolve().then(call), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("智能体调用超时")), timeoutMs))]);
        return {ok: true, value};
    } catch (error) {
        return {ok: false, error: String(error instanceof Error ? error.message : error), offline: true};
    }
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
    if (externalRef.startsWith(`${TASK_HORIZON_EXTERNAL_REF_PREFIX}:`) && (source !== "api" || !isTaskHorizonExternalRef(externalRef))) return undefined;
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
