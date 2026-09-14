import {
    appendSuggestionAudit,
    applyConfirmedSuggestion,
    cancelSuggestionWithToken,
    confirmSuggestionWithToken,
    consumeSuggestionDecision,
    revertSuggestionApplication,
    suggestionApplyAudit,
    suggestionDecisionAudit,
    suggestionRevertAudit,
    normalizeSuggestionAudits,
    normalizeSuggestionEnvelope,
    type AgentSuggestionAudit,
    type AgentSuggestionDecision,
    type AgentSuggestionEnvelope,
    type SuggestionApplyResult,
    type SuggestionRevertResult,
} from "../agent-suggestions";
import type {CheckinStore} from "../types";

export interface SuggestionWorkflowState {
    envelope: AgentSuggestionEnvelope;
    consumedTokens: string[];
    audits: AgentSuggestionAudit[];
}

export const SUGGESTION_WORKFLOW_VERSION = 1;
export const SUGGESTION_WORKFLOW_TOKEN_LIMIT = 100;
export const SUGGESTION_WORKFLOW_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SuggestionWorkflowSummary {
    status: AgentSuggestionEnvelope["status"];
    canApply: boolean;
    canUndo: boolean;
    consumedTokens: number;
    audits: number;
}

export interface SuggestionDecisionOutcome {
    state: SuggestionWorkflowState;
    accepted: boolean;
    reason: "accepted" | "invalid" | "replayed" | "wrong-decision";
}

export function createSuggestionWorkflow(envelope: AgentSuggestionEnvelope): SuggestionWorkflowState {
    return {envelope: {...envelope, changes: envelope.changes.map((change) => ({...change}))}, consumedTokens: [], audits: []};
}

export function normalizeSuggestionWorkflow(value: unknown, items: readonly import("../types").CheckinItem[]): SuggestionWorkflowState | undefined {
    if (!value || typeof value !== "object") return undefined;
    const candidate = value as Partial<SuggestionWorkflowState>;
    const envelope = normalizeSuggestionEnvelope(candidate.envelope, items);
    if (!envelope) return undefined;
    const consumedTokens = Array.isArray(candidate.consumedTokens) ? candidate.consumedTokens.filter((token): token is string => typeof token === "string" && token.length > 0).slice(-SUGGESTION_WORKFLOW_TOKEN_LIMIT) : [];
    const audits = normalizeSuggestionAudits(candidate.audits);
    return {envelope, consumedTokens, audits};
}

export function serializeSuggestionWorkflow(state: SuggestionWorkflowState): string {
    return JSON.stringify({version: SUGGESTION_WORKFLOW_VERSION, envelope: state.envelope, consumedTokens: state.consumedTokens.slice(-SUGGESTION_WORKFLOW_TOKEN_LIMIT), audits: normalizeSuggestionAudits(state.audits)});
}

export function deserializeSuggestionWorkflow(value: string, items: readonly import("../types").CheckinItem[]): SuggestionWorkflowState | undefined {
    try {
        const parsed = JSON.parse(value);
        return parsed?.version === SUGGESTION_WORKFLOW_VERSION ? normalizeSuggestionWorkflow(parsed, items) : undefined;
    } catch { return undefined; }
}

/** Pending suggestions are short-lived UI work; confirmed history remains available for undo. */
export function shouldRestoreSuggestionWorkflow(state: SuggestionWorkflowState, now = new Date()): boolean {
    if (state.envelope.status !== "pending") return true;
    const created = Date.parse(state.envelope.createdAt);
    if (!Number.isFinite(created)) return false;
    const age = now.getTime() - created;
    return age >= 0 && age <= SUGGESTION_WORKFLOW_PENDING_MAX_AGE_MS;
}

export function decideSuggestion(state: SuggestionWorkflowState, token: string, decision: AgentSuggestionDecision, now = new Date()): SuggestionDecisionOutcome {
    const consumed = consumeSuggestionDecision(state.consumedTokens, state.envelope, token, decision, now);
    if (!consumed.accepted) return {state, accepted: false, reason: consumed.reason};
    const nextEnvelope = decision === "confirm" ? confirmSuggestionWithToken(state.envelope, token, now) : cancelSuggestionWithToken(state.envelope, token, now);
    if (!nextEnvelope) return {state, accepted: false, reason: "invalid"};
    return {
        state: {envelope: nextEnvelope, consumedTokens: consumed.consumed, audits: appendSuggestionAudit(state.audits, suggestionDecisionAudit(nextEnvelope, decision, now.toISOString()))},
        accepted: true,
        reason: "accepted",
    };
}

export function applySuggestion(state: SuggestionWorkflowState, store: CheckinStore, now = new Date()): {state: SuggestionWorkflowState; result: SuggestionApplyResult} {
    const result = applyConfirmedSuggestion(store, state.envelope);
    return {result, state: {...state, audits: appendSuggestionAudit(state.audits, suggestionApplyAudit(state.envelope, result, now.toISOString()))}};
}

export function undoSuggestion(state: SuggestionWorkflowState, store: CheckinStore, now = new Date()): {state: SuggestionWorkflowState; result: SuggestionRevertResult} {
    const result = revertSuggestionApplication(store, state.envelope);
    return {result, state: {...state, audits: appendSuggestionAudit(state.audits, suggestionRevertAudit(state.envelope, result, now.toISOString()))}};
}

export function workflowAuditSummary(state: SuggestionWorkflowState): Record<AgentSuggestionAudit["action"], number> {
    const counts: Record<AgentSuggestionAudit["action"], number> = {created: 0, confirmed: 0, cancelled: 0, applied: 0, rejected: 0};
    for (const audit of state.audits) counts[audit.action] += 1;
    return counts;
}

export function latestWorkflowAudit(state: SuggestionWorkflowState): AgentSuggestionAudit | undefined {
    const audit = state.audits[state.audits.length - 1];
    return audit ? {...audit, conflicts: audit.conflicts ? [...audit.conflicts] : undefined} : undefined;
}

export function canUndoSuggestion(state: SuggestionWorkflowState): boolean {
    const latestApplied = [...state.audits].reverse().find((audit) => audit.action === "applied");
    return state.envelope.status === "confirmed" && Boolean(latestApplied && (latestApplied.applied || 0) > 0 && latestApplied.reason !== "revert");
}

export function workflowSummary(state: SuggestionWorkflowState): SuggestionWorkflowSummary {
    return {status: state.envelope.status, canApply: state.envelope.status === "confirmed", canUndo: canUndoSuggestion(state), consumedTokens: state.consumedTokens.length, audits: state.audits.length};
}
