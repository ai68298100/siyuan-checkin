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

export const AGENT_SUGGESTION_MAX_ID_LENGTH = 120;
export const AGENT_SUGGESTION_MAX_TITLE_LENGTH = 200;
export const AGENT_SUGGESTION_MAX_REASON_LENGTH = 1_000;
export const AGENT_SUGGESTION_AUDIT_VERSION = 1;
export const AGENT_SUGGESTION_AUDIT_LIMIT = 50;
export const AGENT_SUGGESTION_DECISION_VERSION = "s1";
export const AGENT_SUGGESTION_DECISION_TTL_MS = 10 * 60 * 1000;
export const AGENT_SUGGESTION_MAX_NONCE_LENGTH = 64;

export type AgentSuggestionDecision = "confirm" | "cancel";

export interface ParsedSuggestionDecision {
    version: string;
    suggestionId: string;
    decision: AgentSuggestionDecision;
    at: string;
    nonce: string;
}

export function createSuggestionDecisionToken(envelope: AgentSuggestionEnvelope, decision: AgentSuggestionDecision, now = new Date().toISOString(), nonce = "local"): string {
    if (!envelope.id || !/^(confirm|cancel)$/.test(decision) || Number.isNaN(Date.parse(now))) return "";
    const safeNonce = String(nonce).slice(0, AGENT_SUGGESTION_MAX_NONCE_LENGTH);
    return [AGENT_SUGGESTION_DECISION_VERSION, envelope.id, decision, now, safeNonce].join("|");
}

export function parseSuggestionDecisionToken(token: string): ParsedSuggestionDecision | undefined {
    const parts = String(token || "").split("|");
    if (parts.length !== 5 || parts[0] !== AGENT_SUGGESTION_DECISION_VERSION) return undefined;
    const [version, suggestionId, decision, at, nonce] = parts;
    if (!suggestionId || suggestionId.length > AGENT_SUGGESTION_MAX_ID_LENGTH || !/^(confirm|cancel)$/.test(decision) || Number.isNaN(Date.parse(at)) || !nonce || nonce.length > AGENT_SUGGESTION_MAX_NONCE_LENGTH) return undefined;
    return {version, suggestionId, decision: decision as AgentSuggestionDecision, at, nonce};
}

export function isSuggestionDecisionValid(envelope: AgentSuggestionEnvelope, token: string, now = new Date()): boolean {
    const parsed = parseSuggestionDecisionToken(token);
    if (!parsed || parsed.suggestionId !== envelope.id || envelope.status !== "pending") return false;
    const age = now.getTime() - Date.parse(parsed.at);
    return age >= 0 && age <= AGENT_SUGGESTION_DECISION_TTL_MS;
}

export interface ConsumeSuggestionDecisionResult {
    accepted: boolean;
    consumed: string[];
    reason: "accepted" | "invalid" | "replayed" | "wrong-decision";
}

export function consumeSuggestionDecision(consumed: readonly string[], envelope: AgentSuggestionEnvelope, token: string, expected: AgentSuggestionDecision, now = new Date()): ConsumeSuggestionDecisionResult {
    const current = [...consumed].filter((entry) => typeof entry === "string").slice(-99);
    if (current.includes(token)) return {accepted: false, consumed: current, reason: "replayed"};
    const parsed = parseSuggestionDecisionToken(token);
    if (!parsed || !isSuggestionDecisionValid(envelope, token, now)) return {accepted: false, consumed: current, reason: "invalid"};
    if (parsed.decision !== expected) return {accepted: false, consumed: current, reason: "wrong-decision"};
    return {accepted: true, consumed: [...current, token].slice(-100), reason: "accepted"};
}

export function confirmSuggestionWithToken(envelope: AgentSuggestionEnvelope, token: string, now = new Date()): AgentSuggestionEnvelope | undefined {
    return isSuggestionDecisionValid(envelope, token, now) && parseSuggestionDecisionToken(token)?.decision === "confirm"
        ? transitionSuggestionStatus(envelope, "confirmed", now.toISOString()) : undefined;
}

export function cancelSuggestionWithToken(envelope: AgentSuggestionEnvelope, token: string, now = new Date()): AgentSuggestionEnvelope | undefined {
    return isSuggestionDecisionValid(envelope, token, now) && parseSuggestionDecisionToken(token)?.decision === "cancel"
        ? transitionSuggestionStatus(envelope, "cancelled", now.toISOString()) : undefined;
}

export type AgentSuggestionAuditAction = "created" | "confirmed" | "cancelled" | "applied" | "rejected";
export interface AgentSuggestionAudit {
    suggestionId: string;
    action: AgentSuggestionAuditAction;
    at: string;
    applied?: number;
    skipped?: number;
    conflicts?: string[];
    reason?: string;
}

export function normalizeSuggestionAudits(value: unknown, limit = AGENT_SUGGESTION_AUDIT_LIMIT): AgentSuggestionAudit[] {
    if (!Array.isArray(value)) return [];
    const safeLimit = Math.max(1, Math.min(AGENT_SUGGESTION_AUDIT_LIMIT, Math.floor(limit)));
    return value.filter((entry): entry is AgentSuggestionAudit => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Partial<AgentSuggestionAudit>;
        if (typeof candidate.suggestionId !== "string" || !candidate.suggestionId.trim() || candidate.suggestionId.length > AGENT_SUGGESTION_MAX_ID_LENGTH) return false;
        if (!/^(created|confirmed|cancelled|applied|rejected)$/.test(String(candidate.action))) return false;
        if (typeof candidate.at !== "string" || Number.isNaN(Date.parse(candidate.at))) return false;
        if (candidate.applied !== undefined && (!Number.isInteger(candidate.applied) || candidate.applied < 0)) return false;
        if (candidate.skipped !== undefined && (!Number.isInteger(candidate.skipped) || candidate.skipped < 0)) return false;
        if (candidate.conflicts !== undefined && (!Array.isArray(candidate.conflicts) || candidate.conflicts.some((item) => typeof item !== "string" || item.length > 180))) return false;
        if (candidate.reason !== undefined && (typeof candidate.reason !== "string" || candidate.reason.length > 240)) return false;
        return true;
    }).map((entry) => ({
        suggestionId: entry.suggestionId.trim(), action: entry.action, at: entry.at,
        ...(entry.applied !== undefined ? {applied: entry.applied} : {}),
        ...(entry.skipped !== undefined ? {skipped: entry.skipped} : {}),
        ...(entry.conflicts?.length ? {conflicts: entry.conflicts.slice(0, 20)} : {}),
        ...(entry.reason ? {reason: entry.reason.slice(0, 240)} : {}),
    })).slice(-safeLimit);
}

export function serializeSuggestionAudits(audits: readonly AgentSuggestionAudit[]): string {
    return JSON.stringify({version: AGENT_SUGGESTION_AUDIT_VERSION, audits: normalizeSuggestionAudits(audits)});
}

export function deserializeSuggestionAudits(value: string): AgentSuggestionAudit[] {
    try {
        const parsed = JSON.parse(value);
        return parsed?.version === AGENT_SUGGESTION_AUDIT_VERSION ? normalizeSuggestionAudits(parsed.audits) : [];
    } catch { return []; }
}

export function appendSuggestionAudit(audits: readonly AgentSuggestionAudit[], entry: AgentSuggestionAudit): AgentSuggestionAudit[] {
    return normalizeSuggestionAudits([...audits, entry]);
}

export function summarizeSuggestionAudits(audits: readonly AgentSuggestionAudit[]): Record<AgentSuggestionAuditAction, number> {
    const summary: Record<AgentSuggestionAuditAction, number> = {created: 0, confirmed: 0, cancelled: 0, applied: 0, rejected: 0};
    for (const entry of normalizeSuggestionAudits(audits)) summary[entry.action] += 1;
    return summary;
}

export function normalizeSuggestionEnvelope(value: unknown, items: readonly CheckinItem[]): AgentSuggestionEnvelope | undefined {
    if (!value || typeof value !== "object") return undefined;
    const candidate = value as Partial<AgentSuggestionEnvelope>;
    if (typeof candidate.id !== "string" || !candidate.id.trim() || candidate.id.length > AGENT_SUGGESTION_MAX_ID_LENGTH) return undefined;
    if (typeof candidate.title !== "string" || candidate.title.length > AGENT_SUGGESTION_MAX_TITLE_LENGTH) return undefined;
    if (typeof candidate.reason !== "string" || candidate.reason.length > AGENT_SUGGESTION_MAX_REASON_LENGTH) return undefined;
    if (candidate.requiresConfirmation !== true || !/^(pending|confirmed|cancelled|failed)$/.test(String(candidate.status))) return undefined;
    if (typeof candidate.createdAt !== "string" || Number.isNaN(Date.parse(candidate.createdAt))) return undefined;
    const changes = normalizeSuggestionChanges(candidate.changes, items);
    return {
        id: candidate.id.trim(), title: candidate.title.trim(), reason: candidate.reason.trim(),
        changes, requiresConfirmation: true, status: candidate.status as AgentSuggestionStatus,
        createdAt: candidate.createdAt,
        ...(typeof candidate.confirmedAt === "string" && !Number.isNaN(Date.parse(candidate.confirmedAt)) ? {confirmedAt: candidate.confirmedAt} : {}),
        ...(typeof candidate.error === "string" && candidate.error ? {error: candidate.error.slice(0, 160)} : {}),
    };
}

export function serializeSuggestionEnvelope(envelope: AgentSuggestionEnvelope): string {
    return JSON.stringify(envelope);
}

export function deserializeSuggestionEnvelope(value: string, items: readonly CheckinItem[]): AgentSuggestionEnvelope | undefined {
    try { return normalizeSuggestionEnvelope(JSON.parse(value), items); } catch { return undefined; }
}

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

export interface SuggestionRevertResult {
    store: import("./types").CheckinStore;
    reverted: number;
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
            if (!ALLOWED_CHANGE_FIELDS.has(change.field)) {
                skipped += 1;
                conflicts.push(`${change.itemId}:${String(change.field)}`);
                continue;
            }
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

/** Reverts only fields that still contain the applied value; later user edits win. */
export function revertSuggestionApplication(store: import("./types").CheckinStore, envelope: AgentSuggestionEnvelope): SuggestionRevertResult {
    if (envelope.status !== "confirmed") return {store, reverted: 0, skipped: envelope.changes.length, conflicts: []};
    let reverted = 0;
    let skipped = 0;
    const conflicts: string[] = [];
    const items = store.items.map((item) => {
        const changes = envelope.changes.filter((change) => change.itemId === item.id);
        if (!changes.length) return item;
        let next = item;
        for (const change of changes) {
            if (!ALLOWED_CHANGE_FIELDS.has(change.field) || !Object.is(next[change.field], change.after)) {
                skipped += 1;
                conflicts.push(`${change.itemId}:${String(change.field)}`);
                continue;
            }
            next = {...next, [change.field]: change.before} as typeof item;
            reverted += 1;
        }
        return next;
    });
    return {store: reverted ? {...store, items} : store, reverted, skipped, conflicts};
}

export function suggestionApplyAudit(envelope: AgentSuggestionEnvelope, result: SuggestionApplyResult, at = new Date().toISOString()): AgentSuggestionAudit {
    return {suggestionId: envelope.id, action: result.applied ? "applied" : "rejected", at, applied: result.applied, skipped: result.skipped, ...(result.conflicts.length ? {conflicts: result.conflicts} : {})};
}

export function suggestionRevertAudit(envelope: AgentSuggestionEnvelope, result: SuggestionRevertResult, at = new Date().toISOString()): AgentSuggestionAudit {
    return {suggestionId: envelope.id, action: result.reverted ? "applied" : "rejected", at, applied: result.reverted, skipped: result.skipped, ...(result.conflicts.length ? {conflicts: result.conflicts} : {}), reason: "revert"};
}

export function suggestionDecisionAudit(envelope: AgentSuggestionEnvelope, decision: AgentSuggestionDecision, at = new Date().toISOString()): AgentSuggestionAudit {
    return {suggestionId: envelope.id, action: decision === "confirm" ? "confirmed" : "cancelled", at};
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
