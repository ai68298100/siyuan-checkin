import type {CheckinItem} from "./types";
import {t} from "./i18n";

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
    return t(`agent.status${status === "pending" ? "Pending" : status === "confirmed" ? "Confirmed" : status === "cancelled" ? "Cancelled" : "Failed"}`);
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
export const AGENT_ANALYSIS_MAX_TEXT_LENGTH = 200_000;
export const AGENT_ANALYSIS_MAX_SNAPSHOTS = 20;

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
    if (!rows.length) return `<p class="lc-agent-compare-empty">${t("agent.diffEmpty")}</p>`;
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
    const valid = value.filter((entry): entry is AgentAnalysisSnapshot => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Partial<AgentAnalysisSnapshot>;
        return typeof candidate.text === "string" && candidate.text.length <= AGENT_ANALYSIS_MAX_TEXT_LENGTH && typeof candidate.asOf === "string" &&
            /^(day|week|month|custom)$/.test(String(candidate.range)) && /^(local|agent)$/.test(String(candidate.source)) &&
            typeof candidate.generatedAt === "string" && !Number.isNaN(Date.parse(candidate.generatedAt));
    });
    const seen = new Set<string>();
    return valid.filter((entry) => {
        const key = `${entry.asOf}|${entry.range}|${entry.source}|${entry.generatedAt}|${entry.text}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(-AGENT_ANALYSIS_MAX_SNAPSHOTS);
}

export async function saveAnalysisSnapshot(saver: (key: string, value: unknown) => Promise<unknown>, key: string, history: readonly AgentAnalysisSnapshot[], snapshot: AgentAnalysisSnapshot): Promise<AgentAnalysisSnapshot[]> {
    const next = normalizeAnalysisSnapshots(appendAnalysisSnapshot(normalizeAnalysisSnapshots(history), snapshot));
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
    return t("agent.impactSummary", {items: items.size, changes: changes.length});
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
    return t("agent.changeSummary", {field: String(change.field), before, after});
}

export function canConfirmSuggestion(envelope: AgentSuggestionEnvelope): boolean {
    return envelope.status === "pending" && envelope.requiresConfirmation === true && envelope.changes.length > 0;
}

export interface SuggestionApplyResult {
    store: import("./types").CheckinStore;
    applied: number;
    skipped: number;
    conflicts: string[];
}

/** Applies only an already-confirmed suggestion and skips stale/conflicting fields. */
export function applyConfirmedSuggestion(store: import("./types").CheckinStore, envelope: AgentSuggestionEnvelope): SuggestionApplyResult {
    if (envelope.status !== "confirmed") return {store, applied: 0, skipped: envelope.changes.length, conflicts: []};
    let applied = 0;
    let skipped = 0;
    const conflicts: string[] = [];
    const items = store.items.map((item) => {
        const changes = envelope.changes.filter((change) => change.itemId === item.id);
        if (!changes.length) return item;
        let next = item;
        for (const change of changes) {
            if (!Object.is(next[change.field], change.before)) {
                skipped += 1;
                conflicts.push(`${change.itemId}:${String(change.field)}`);
                continue;
            }
            next = {...next, [change.field]: change.after} as typeof item;
            applied += 1;
        }
        return next;
    });
    return {store: applied ? {...store, items} : store, applied, skipped, conflicts};
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
