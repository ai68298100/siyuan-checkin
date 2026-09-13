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
