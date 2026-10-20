/* T-1876 & T-1877 习惯进化建议的「可执行化」与「证据化」纯函数层。
   纪律：
   - 所有函数无时钟依赖（由调用方传入 todayKey / asOf），确定性，不写任何状态；
   - 采纳计划只产出「明日起生效的一条修订」，绝不追溯改写既有历史事实；
   - 证据钻取只读取已存在的 store 事实，样本不足时如实返回 insufficient，不编造结论。 */

import {addDays, daysBetweenHalfOpen} from "../date-keys";
import {getEventsForDay, getItemRevisionForDate, isItemAvailableOnDate, isScheduledToday, isSkipEvent} from "../model";
import type {CheckinItem, CheckinItemRevision, CheckinStore} from "../types";

/* ============================ T-1876 建议采纳 ============================ */

export type SuggestionAdoptionKind = "relax-schedule" | "reduce-target" | "raise-target" | "none";

export interface SuggestionAdoptionInput {
    /** 建议标识（coaching 建议 id 或 agent 建议 id）。 */
    suggestionId: string;
    /** 建议语义类别；none 表示该建议不产生规则改动（例如「保持节奏」）。 */
    kind: SuggestionAdoptionKind;
    /** 建议推导出的目标每周发生次数（relax-schedule 使用）。 */
    weeklyTarget?: number;
    /** 建议推导出的新目标值（reduce-target / raise-target 使用）。 */
    targetValue?: number;
}

export interface SuggestionAdoptionPlan {
    /** 可采纳时给出的拟生效修订（明日起生效）；不可采纳时为 undefined。 */
    revision?: CheckinItemRevision;
    /** 明日起生效的日期键。 */
    effectiveDate: string;
    /** 人类可读的变更摘要键值对（用于 UI 预览与审计）。 */
    summary: {scheduleFrom: string; scheduleTo: string; targetFrom: number; targetTo: number; unit: string};
    /** 拒绝原因；为空表示可采纳。 */
    refusal?: "unsupported-suggestion" | "item-archived" | "already-flexible" | "invalid-target" | "no-change";
}

const MAX_QUOTA_WEEK = 7;
const MAX_TARGET = 1000000;

/** 依据建议构造「明日起生效」的单条修订；不修改入参 item。 */
export function planSuggestionAdoption(
    item: CheckinItem,
    input: SuggestionAdoptionInput,
    todayKey: string,
): SuggestionAdoptionPlan {
    const effectiveDate = addDays(todayKey, 1) ?? todayKey;
    const current = getItemRevisionForDate(item, dateKeyFromKey(todayKey) ?? new Date());
    const base: SuggestionAdoptionPlan = {
        effectiveDate,
        summary: {
            scheduleFrom: describeSchedule(current.schedule),
            scheduleTo: describeSchedule(current.schedule),
            targetFrom: current.target,
            targetTo: current.target,
            unit: current.unit,
        },
    };
    if (input.kind === "none") return {...base, refusal: "unsupported-suggestion"};
    if (item.archived) return {...base, refusal: "item-archived"};
    if (DateOfKey(effectiveDate) === undefined) return {...base, refusal: "invalid-target"};

    let schedule: CheckinItemRevision["schedule"] = current.schedule;
    let target = current.target;

    if (input.kind === "relax-schedule") {
        const weekly = Math.round(Number(input.weeklyTarget));
        if (!Number.isFinite(weekly) || weekly < 1 || weekly > MAX_QUOTA_WEEK) return {...base, refusal: "invalid-target"};
        /* 已是同值弹性周配额时如实拒绝，避免产生无变化的修订噪声。 */
        if (current.schedule.type === "quota" && current.schedule.quota?.period === "week" && current.schedule.quota.amount === weekly) {
            return {...base, refusal: "already-flexible"};
        }
        schedule = {type: "quota", quota: {period: "week", amount: weekly, countMode: current.schedule.quota?.countMode === "value" ? "value" : "dates"}};
    } else {
        const nextTarget = Number(input.targetValue);
        if (!Number.isFinite(nextTarget) || nextTarget <= 0 || nextTarget > MAX_TARGET) return {...base, refusal: "invalid-target"};
        if (current.kind === "binary" && nextTarget !== 1) return {...base, refusal: "invalid-target"};
        if (nextTarget === current.target) return {...base, refusal: "no-change"};
        target = nextTarget;
    }

    const revision: CheckinItemRevision = {
        effectiveDate,
        kind: current.kind,
        target,
        unit: current.unit,
        ...(current.recordStep ? {recordStep: current.recordStep} : {}),
        direction: current.direction === "atMost" ? "atMost" : "atLeast",
        schedule,
    };
    return {
        ...base,
        revision,
        summary: {...base.summary, scheduleTo: describeSchedule(schedule), targetTo: target},
    };
}

/** 把采纳计划合并进项目的修订时间线（返回新数组，不改入参）。 */
export function mergeAdoptedRevision(item: CheckinItem, revision: CheckinItemRevision): CheckinItemRevision[] {
    const revisions: CheckinItemRevision[] = (item.revisions ?? []).map((entry) => ({...entry, schedule: {...entry.schedule}}));
    const index = revisions.findIndex((entry) => entry.effectiveDate === revision.effectiveDate);
    if (index >= 0) revisions[index] = revision;
    else revisions.push(revision);
    revisions.sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate));
    return revisions;
}

/** 建议类别 → 默认采纳参数（由 coaching/agent 建议 id 推导；未知建议返回 none）。 */
export function adoptionInputForSuggestion(suggestionId: string, weeklyTarget?: number, targetValue?: number): SuggestionAdoptionInput {
    const relax = new Set(["reduce-friction", "skip-streak", "strength-decline", "trend-decline", "relax-schedule"]);
    const reduce = new Set(["reduce-target", "lighter-target"]);
    const raise = new Set(["raise-target", "keep-rhythm"]);
    if (relax.has(suggestionId)) return {suggestionId, kind: "relax-schedule", weeklyTarget: weeklyTarget ?? 4};
    if (reduce.has(suggestionId)) return {suggestionId, kind: "reduce-target", targetValue};
    if (raise.has(suggestionId)) return {suggestionId, kind: "raise-target", targetValue};
    return {suggestionId, kind: "none"};
}

function describeSchedule(schedule: CheckinItemRevision["schedule"]): string {
    if (schedule.type === "quota") return `quota:${schedule.quota?.period ?? "week"}:${schedule.quota?.amount ?? 0}`;
    if (schedule.type === "weekly") return `weekly:${(schedule.weekdays ?? []).join(",")}`;
    if (schedule.type === "interval") return `interval:${schedule.intervalDays ?? 1}`;
    return schedule.type;
}

function dateKeyFromKey(value: string): Date | undefined {
    return DateOfKey(value);
}

function DateOfKey(value: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

/* ============================ T-1877 证据钻取 ============================ */

export interface CoachingEvidenceSample {
    date: string;
    scheduled: boolean;
    skipped: boolean;
    completed: boolean;
    progress: number;
    target: number;
    unit: string;
}

export interface CoachingEvidence {
    /** 样本是否足够支撑结论（< 7 个可评估计划日视为不足）。 */
    sufficient: boolean;
    /** 可评估计划日样本数。 */
    eligibleDays: number;
    /** 观测窗口（闭区间）。 */
    startDate: string;
    endDate: string;
    /** 完成 / 跳过 / 未完成计数。 */
    completedDays: number;
    skippedDays: number;
    missedDays: number;
    /** 最近 7 个计划日逐日事实（供展开面板展示）。 */
    recent: CoachingEvidenceSample[];
    /** 最近一次真实事件日期（无事件时缺省）。 */
    lastEventDate?: string;
}

export const COACHING_EVIDENCE_MIN_DAYS = 7;

/** 从 store 事实构建建议证据；纯读，不写任何状态。 */
export function buildCoachingEvidence(
    store: CheckinStore,
    item: CheckinItem,
    asOfKey: string,
    windowDays = 28,
): CoachingEvidence {
    const bounded = Math.min(366, Math.max(1, Math.trunc(windowDays)));
    const asOf = DateOfKey(asOfKey) ?? new Date();
    const startKey = addDays(asOfKey, -(bounded - 1)) ?? asOfKey;
    let eligibleDays = 0;
    let completedDays = 0;
    let skippedDays = 0;
    let missedDays = 0;
    let lastEventDate: string | undefined;
    const samples: CoachingEvidenceSample[] = [];
    for (let offset = 0; offset < bounded; offset += 1) {
        const key = addDays(startKey, offset);
        if (!key) continue;
        const day = DateOfKey(key);
        if (!day) continue;
        if (!isItemAvailableOnDate(item, day) || !isScheduledToday(item, day)) continue;
        const revision = getItemRevisionForDate(item, day);
        const events = getEventsForDay(store, item.id, day);
        if (events.length && (!lastEventDate || key > lastEventDate)) lastEventDate = key;
        const skipped = events.length > 0 && events.every((event) => isSkipEvent(event));
        const progress = events.filter((event) => !isSkipEvent(event)).reduce((sum, event) => sum + event.value, 0);
        const target = revision.target;
        const completed = !skipped && (revision.direction === "atMost" ? progress === 0 : target > 0 ? progress >= target : progress > 0);
        eligibleDays += 1;
        if (skipped) skippedDays += 1;
        else if (completed) completedDays += 1;
        else missedDays += 1;
        samples.push({date: key, scheduled: true, skipped, completed, progress, target, unit: revision.unit});
    }
    const daysBetween = daysBetweenHalfOpen(startKey, addDays(asOfKey, 1) ?? asOfKey) ?? 0;
    return {
        sufficient: eligibleDays >= COACHING_EVIDENCE_MIN_DAYS && daysBetween >= COACHING_EVIDENCE_MIN_DAYS,
        eligibleDays,
        startDate: startKey,
        endDate: asOfKey,
        completedDays,
        skippedDays,
        missedDays,
        recent: samples.slice(-7),
        ...(lastEventDate ? {lastEventDate} : {}),
    };
}