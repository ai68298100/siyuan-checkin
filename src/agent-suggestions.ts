import type {CheckinItem} from "./types";

export type AgentSuggestionChange = {
    itemId: string;
    field: keyof CheckinItem;
    before: unknown;
    after: unknown;
};

export type AgentSuggestion = {
    id: string;
    title: string;
    reason: string;
    changes: AgentSuggestionChange[];
    requiresConfirmation: true;
};

export type AgentSuggestionStatus = "pending" | "confirmed" | "cancelled" | "failed";

export type AgentSuggestionEnvelope = AgentSuggestion & {
    status: AgentSuggestionStatus;
    createdAt: string;
    confirmedAt?: string;
    error?: string;
};

export function createSuggestionEnvelope(suggestion: AgentSuggestion, now = new Date().toISOString()): AgentSuggestionEnvelope {
    return {...suggestion, status: "pending", createdAt: now};
}

export function transitionSuggestionStatus(envelope: AgentSuggestionEnvelope, status: Exclude<AgentSuggestionStatus, "pending">, now = new Date().toISOString(), error?: string): AgentSuggestionEnvelope {
    if (envelope.status !== "pending") return envelope;
    return {...envelope, status, ...(status === "confirmed" ? {confirmedAt: now} : {}), ...(error ? {error: error.slice(0, 160)} : {})};
}

export function buildSuggestionChange(item: CheckinItem, field: keyof CheckinItem, after: unknown): AgentSuggestionChange | undefined {
    if (!item || !field || Object.is(item[field], after)) return undefined;
    return {itemId: item.id, field, before: item[field], after};
}

export function summarizeSuggestionImpact(changes: readonly AgentSuggestionChange[]): string {
    const items = new Set(changes.map((change) => change.itemId));
    return `将影响 ${items.size} 个项目，变更 ${changes.length} 项设置；需要用户确认后执行。`;
}

const ALLOWED_CHANGE_FIELDS: ReadonlySet<keyof CheckinItem> = new Set(["name", "target", "unit", "group", "priority", "timeSlot", "tomatoMode"]);

export function normalizeSuggestionChanges(value: unknown, items: readonly CheckinItem[]): AgentSuggestionChange[] {
    if (!Array.isArray(value)) return [];
    const validIds = new Set(items.map((item) => item.id));
    return value.filter((entry): entry is AgentSuggestionChange => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as AgentSuggestionChange;
        return validIds.has(candidate.itemId) && ALLOWED_CHANGE_FIELDS.has(candidate.field) && !Object.is(candidate.before, candidate.after);
    }).slice(0, 50);
}

export function formatSuggestionChange(change: AgentSuggestionChange): string {
    const before = change.before === undefined || change.before === null ? "未设置" : String(change.before);
    const after = change.after === undefined || change.after === null ? "未设置" : String(change.after);
    return `${change.field}: ${before} → ${after}`;
}
