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

export interface SuggestionDecisionOutcome {
    state: SuggestionWorkflowState;
    accepted: boolean;
    reason: "accepted" | "invalid" | "replayed" | "wrong-decision";
}

export function createSuggestionWorkflow(envelope: AgentSuggestionEnvelope): SuggestionWorkflowState {
    return {envelope: {...envelope, changes: envelope.changes.map((change) => ({...change}))}, consumedTokens: [], audits: []};
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
