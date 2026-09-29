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

export interface AiReviewPromptInput {
    startDate: string;
    endDate: string;
    totalEvents: number;
    completedItems: number;
    scheduledItems: number;
    /** 每项目一行的事实摘要（调用方已本地化，如「晨跑 · 5/7 天」）。 */
    itemLines: ReadonlyArray<string>;
    friction: string;
    adjustment: string;
    /** 区块标题复用周复盘向导的既有文案键值，保持两处口径一致。 */
    headings: {facts: string; friction: string; adjustment: string};
}

/** T-1539：AI 复盘自足提示词——本地统计事实与用户草稿直接嵌入文本，粘贴到任意外部 AI
    无需数据访问。与 buildReviewPrompt 的「指令词」定位不同：那个只给读取指引（要求 AI
    端能读本插件数据），本函数自带全部事实。确定性纯函数；零网络、零模型依赖、不写事件；
    仅包含用户显式要求复制的范围内数据（事实摘要+两段草稿），不夹带其他本地数据。 */
export function buildAiReviewPrompt(input: AiReviewPromptInput): string {
    const friction = input.friction.trim();
    const adjustment = input.adjustment.trim();
    return [
        t("review.aiPromptIntro", {start: input.startDate, end: input.endDate}),
        `[${input.headings.facts}]`,
        t("review.aiPromptFacts", {n: input.totalEvents, completed: input.completedItems, scheduled: input.scheduledItems}),
        ...input.itemLines.map((line) => `- ${line}`),
        `[${input.headings.friction}]`,
        friction || t("review.aiPromptEmpty"),
        `[${input.headings.adjustment}]`,
        adjustment || t("review.aiPromptEmpty"),
        t("review.aiPromptRequestBody"),
        t("review.aiPromptResponseFormat"),
        t("review.aiPromptPrivacy"),
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
