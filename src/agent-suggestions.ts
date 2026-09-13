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

export type AgentAnalysisMeta = {
    asOf: string;
    range: "day" | "week" | "month" | "custom";
    source: "local" | "agent";
    generatedAt: string;
};

export type AgentAnalysisSnapshot = AgentAnalysisMeta & {text: string};
export const AGENT_ANALYSIS_CACHE_KEY = "agent-analysis-history.json";

export function appendAnalysisSnapshot(history: readonly AgentAnalysisSnapshot[], snapshot: AgentAnalysisSnapshot, limit = 5): AgentAnalysisSnapshot[] {
    const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)));
    return [...history, snapshot].slice(-safeLimit);
}

export async function loadAnalysisSnapshots(loader: (key: string) => Promise<unknown>, key: string): Promise<AgentAnalysisSnapshot[]> {
    try {
        const value = await loader(key);
        return Array.isArray(value) ? value.filter((entry): entry is AgentAnalysisSnapshot => Boolean(entry && typeof entry === "object" && typeof (entry as any).text === "string" && typeof (entry as any).asOf === "string")).slice(-20) : [];
    } catch { return []; }
}

export async function saveAnalysisSnapshot(saver: (key: string, value: unknown) => Promise<unknown>, key: string, history: readonly AgentAnalysisSnapshot[], snapshot: AgentAnalysisSnapshot): Promise<AgentAnalysisSnapshot[]> {
    const next = appendAnalysisSnapshot(history, snapshot);
    await saver(key, next);
    return next;
}

export function createAnalysisMeta(range: AgentAnalysisMeta["range"], source: AgentAnalysisMeta["source"], asOf: string, generatedAt = new Date().toISOString()): AgentAnalysisMeta {
    return {range, source, asOf, generatedAt};
}

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

function escapeSuggestionHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char] || char));
}

export function renderSuggestionChanges(changes: readonly AgentSuggestionChange[]): string {
    if (!changes.length) return "<p class=\"lc-agent-suggestion-empty\">暂无可执行变更</p>";
    return `<ul class=\"lc-agent-suggestion-changes\">${changes.map((change) => `<li><code>${escapeSuggestionHtml(String(change.field))}</code><span>${escapeSuggestionHtml(formatSuggestionChange(change))}</span></li>`).join("")}</ul>`;
}

export function summarizeSuggestionChanges(changes: readonly AgentSuggestionChange[]): Array<{itemId: string; field: string; before: string; after: string}> {
    return changes.map((change) => ({itemId: change.itemId, field: String(change.field), before: change.before == null ? "未设置" : String(change.before), after: change.after == null ? "未设置" : String(change.after)}));
}
