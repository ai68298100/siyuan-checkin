import {t} from "../i18n";
import type {SummaryContext} from "../analytics";
import type {AgentAnalysisSnapshot} from "../agent-suggestions";
import type {CheckinStore} from "../types";
import {dateKey, getEventsInDateRange} from "../model";
import {calendarDateFromKey} from "../shared";

export type ReviewAssistantGoal = "summary" | "patterns" | "plan";

/** A user-controlled handoff to the host's agent. No data is sent by this helper. */
export function buildReviewPrompt(context: Pick<SummaryContext, "startDate" | "endDate">, goal: ReviewAssistantGoal = "summary"): string {
    const request = {range: "custom", startDate: context.startDate, endDate: context.endDate};
    return [
        t(`review.assistantPrompt.${goal}`),
        t("review.assistantPromptRange", {start: context.startDate, end: context.endDate}),
        t("review.assistantPromptRead"),
        `checkin-summary-context(${JSON.stringify(request)})`,
        t("review.assistantPromptEvidence"),
        t("review.assistantPromptConfirm"),
    ].join("\n\n");
}

const analysisKeys = new WeakMap<CheckinStore, Map<string, string>>();

/** Cache identity includes the precise period and the inputs visible to a
 * summary provider. Notes only contribute to a local digest, never the prompt
 * or the persisted analysis metadata. Store snapshots are immutable. */
export function buildReviewAnalysisKey(store: CheckinStore, context: SummaryContext): string {
    const scope = `${context.range}/${context.startDate}/${context.endDate}`;
    const cached = analysisKeys.get(store)?.get(scope);
    if (cached) return cached;
    const end = calendarDateFromKey(context.endDate);
    end.setDate(end.getDate() + 1);
    const ids = new Set(context.items.map(item => item.itemId));
    const input = JSON.stringify({
        context,
        items: store.items.filter(item => ids.has(item.id)),
        events: getEventsInDateRange(store, context.startDate, dateKey(end)).filter(event => ids.has(event.itemId)),
    });
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < input.length; index += 1) {
        const code = input.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ code, 0x85ebca6b);
    }
    const key = `v1:${(first >>> 0).toString(16)}:${(second >>> 0).toString(16)}:${input.length}`;
    const scopes = analysisKeys.get(store) || new Map<string, string>();
    if (scopes.size >= 12) scopes.delete(scopes.keys().next().value!);
    scopes.set(scope, key);
    analysisKeys.set(store, scopes);
    return key;
}

/** Legacy snapshots remain available in history, but cannot be presented as a
 * current analysis without both exact boundaries and a matching input digest. */
export function selectReviewAnalysis(history: readonly AgentAnalysisSnapshot[], context: SummaryContext, contextKey: string): {
    snapshot?: AgentAnalysisSnapshot;
    state: "current" | "stale" | "none";
} {
    const snapshot = [...history].reverse().find(entry => entry.source === "agent" && entry.startDate === context.startDate
        && entry.endDate === context.endDate && entry.contextKey === contextKey);
    return {snapshot, state: snapshot ? "current" : history.length ? "stale" : "none"};
}
