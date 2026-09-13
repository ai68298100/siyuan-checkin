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
export function suggestionStatusLabel(status: AgentSuggestionStatus): string {
    return ({pending: "待确认", confirmed: "已确认", cancelled: "已取消", failed: "执行失败"} as Record<AgentSuggestionStatus, string>)[status];
}
export function summarizeSuggestion(envelope: AgentSuggestionEnvelope): string {
    return `${suggestionStatusLabel(envelope.status)} · ${envelope.id} · ${summarizeSuggestionImpact(envelope.changes)} · 创建于 ${envelope.createdAt}`;
}

export type AgentAnalysisMeta = {
    asOf: string;
    range: "day" | "week" | "month" | "custom";
    source: "local" | "agent";
    generatedAt: string;
};

export type AgentAnalysisSnapshot = AgentAnalysisMeta & {text: string};
export const AGENT_ANALYSIS_CACHE_KEY = "agent-analysis-history.json";

/**
 * Produces a deterministic, line-oriented diff for read-only analysis comparison.
 * The function never mutates its inputs and intentionally keeps unchanged lines
 * so the result remains understandable on narrow screens and in exported logs.
 */
export function diffAnalysisText(before: string, after: string): Array<{kind: "same" | "removed" | "added"; text: string}> {
    const left = String(before ?? "").split(/\r?\n/);
    const right = String(after ?? "").split(/\r?\n/);
    const rows: Array<{kind: "same" | "removed" | "added"; text: string}> = [];
    const max = Math.max(left.length, right.length);
    for (let index = 0; index < max; index += 1) {
        const a = left[index];
        const b = right[index];
        if (a !== undefined && b !== undefined && a === b) rows.push({kind: "same", text: a});
        else {
            if (a !== undefined) rows.push({kind: "removed", text: a});
            if (b !== undefined) rows.push({kind: "added", text: b});
        }
    }
    return rows;
}

export function renderAnalysisDiff(before: string, after: string): string {
    const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char] || char));
    const rows = diffAnalysisText(before, after);
    if (!rows.length) return "<p class=\"lc-agent-compare-empty\">暂无差异</p>";
    return `<ul class=\"lc-agent-compare-diff\">${rows.map((row) => `<li class=\"is-${row.kind}\"><span aria-hidden=\"true\">${row.kind === "added" ? "+" : row.kind === "removed" ? "−" : "·"}</span>${escape(row.text || " ")}</li>`).join("")}</ul>`;
}

export function summarizeAnalysisDiff(before: string, after: string): {added: number; removed: number; unchanged: number} {
    return diffAnalysisText(before, after).reduce((summary, row) => {
        summary[row.kind === "same" ? "unchanged" : row.kind] += 1;
        return summary;
    }, {added: 0, removed: 0, unchanged: 0});
}

export function appendAnalysisSnapshot(history: readonly AgentAnalysisSnapshot[], snapshot: AgentAnalysisSnapshot, limit = 5): AgentAnalysisSnapshot[] {
    const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)));
    return [...history, snapshot].slice(-safeLimit);
}

export async function loadAnalysisSnapshots(loader: (key: string) => Promise<unknown>, key: string): Promise<AgentAnalysisSnapshot[]> {
    try {
        const value = await loader(key);
        return normalizeAnalysisSnapshots(value);
    } catch { return []; }
}

export function normalizeAnalysisSnapshots(value: unknown): AgentAnalysisSnapshot[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is AgentAnalysisSnapshot => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Partial<AgentAnalysisSnapshot>;
        return typeof candidate.text === "string" && candidate.text.length <= 200_000 && typeof candidate.asOf === "string" &&
            /^(day|week|month|custom)$/.test(String(candidate.range)) && /^(local|agent)$/.test(String(candidate.source)) &&
            typeof candidate.generatedAt === "string" && !Number.isNaN(Date.parse(candidate.generatedAt));
    }).slice(-20);
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
