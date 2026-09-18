/* 16.3 T-1224 习惯强度分数：uhabits 半衰期模型（Score.kt）的本地实现。
   score_next = score * m + done * (1 - m) * 100，m = 0.5^(sqrt(freq)/13)；
   freq = 计划频率（次/天）。频率越高 → m 越小 → 漏做日掉分越快：
   每周 3 次的习惯荒废一周比每周 1 次的习惯荒废一周更伤（开方压平曲线，
   13 为可调常数）。
   计算层口径（D-216/T-1221 一致）：
   - 跳过日冻结：不加成、不衰减（跳过 ≠ 失败也不中断习惯强度）；
   - 非计划日冻结：每周 1 次的习惯不因未安排日抖动（等效 uhabits 对
     非固定星期习惯倍增平滑的意图）；
   - 数值型按当日 target 归一（min(1, 进度/目标)），部分完成按比例计分。
   纯函数核心 buildHabitScoreSeries 不依赖 store 与当前时间；
   collectHabitScoreDays 是有界窗口的 store 投影器，供 UI 复用同一入口
   （计分单一代码路径，T-1226/T-1227 消费同一实现）。 */

import {dateKey, getItemRevisionForDate, getProgress, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";
import type {CheckinItem, CheckinSchedule, CheckinStore} from "../types";

export interface HabitScoreFrequency {
    numerator: number;
    denominator: number;
}

export interface HabitScoreDayInput {
    date: string;
    /** 当日是否为计划机会日（可用且已排期）。 */
    scheduled: boolean;
    /** 当日被用户显式跳过（冻结：不加成、不衰减）。 */
    skipped: boolean;
    /** 归一化完成度 [0,1]（数值型按当日目标折算）。 */
    completion: number;
}

export interface HabitScorePoint {
    date: string;
    /** 0~100，保留一位小数。 */
    score: number;
}

export interface HabitScoreOptions {
    /** 起始分（0~100，默认 0）；续算时可传前一段最后一天的分值。 */
    initial?: number;
}

/** 频率（次/天）：从排期推导 num/den；用于半衰期乘数。 */
export function scheduleFrequency(schedule: CheckinSchedule): HabitScoreFrequency {
    if (schedule.type === "quota" && schedule.quota) {
        return schedule.quota.period === "week"
            ? {numerator: Math.max(1, schedule.quota.amount), denominator: 7}
            : {numerator: Math.max(1, schedule.quota.amount), denominator: 30};
    }
    if (schedule.type === "interval" && schedule.intervalDays) {
        return {numerator: 1, denominator: Math.max(1, schedule.intervalDays)};
    }
    if (schedule.type === "weekly" && Array.isArray(schedule.weekdays) && schedule.weekdays.length) {
        return {numerator: schedule.weekdays.length, denominator: 7};
    }
    if (schedule.type === "workdays") return {numerator: 5, denominator: 7};
    return {numerator: 1, denominator: 1};
}

const HALF_LIFE_DIVISOR = 13;

/** 单日半衰期乘数：m = 0.5^(sqrt(freq)/13)。频率越高 m 越小（漏做日掉分越快）。 */
export function scoreMultiplier(frequency: HabitScoreFrequency): number {
    const num = Math.max(0, frequency.numerator);
    const den = Math.max(1, frequency.denominator);
    const freq = num / den;
    return Math.pow(0.5, Math.sqrt(freq) / HALF_LIFE_DIVISOR);
}

const clampCompletion = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/**
 * 逐日滚动强度序列（0~100）。输入必须按日期升序；
 * 跳过日与非计划日冻结（不加成、不衰减）。
 */
export function buildHabitScoreSeries(
    days: readonly HabitScoreDayInput[],
    frequency: HabitScoreFrequency,
    options: HabitScoreOptions = {},
): HabitScorePoint[] {
    const m = scoreMultiplier(frequency);
    let score = Math.min(100, Math.max(0, options?.initial ?? 0));
    const points: HabitScorePoint[] = [];
    for (const day of days) {
        if (day.scheduled && !day.skipped) {
            const done = clampCompletion(day.completion);
            score = score * m + done * (1 - m) * 100;
            score = Math.min(100, Math.max(0, score));
        }
        points.push({date: day.date, score: Math.round(score * 10) / 10});
    }
    return points;
}

/**
 * 有界窗口的 store 投影器：把某项目在 [startDate, endDateExclusive) 的每日状态
 * 折算为 HabitScoreDayInput（计划/跳过/归一化完成度），供纯函数核心消费。
 */
export function collectHabitScoreDays(store: CheckinStore, item: CheckinItem, startDate: string, endDateExclusive: string): HabitScoreDayInput[] {
    const days: HabitScoreDayInput[] = [];
    const skipDates = getSkipDatesForItem(store, item.id);
    const start = dateFromKey(startDate);
    const end = dateFromKey(endDateExclusive);
    if (!start || !end || start >= end) return days;
    for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
        const key = dateKey(cursor);
        const available = isItemAvailableOnDate(item, cursor);
        if (!available) {
            days.push({date: key, scheduled: false, skipped: false, completion: 0});
            continue;
        }
        const scheduled = isScheduledToday(item, cursor);
        const revision = getItemRevisionForDate(item, cursor);
        const target = revision.schedule.type === "quota" ? revision.schedule.quota?.amount || revision.target : revision.target;
        const complete = isComplete(store, item, cursor);
        const progress = getProgress(store, item, cursor);
        /* D-219：at-most 完成日 1 分、破戒日 0 分（无部分完成概念）。 */
        const completion = complete
            ? 1
            : item.direction === "atMost" || target <= 0
                ? 0
                : Math.min(1, Math.max(0, progress / target));
        days.push({
            date: key,
            scheduled,
            skipped: skipDates.has(key) && !complete,
            completion,
        });
    }
    return days;
}

function dateFromKey(value: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}
