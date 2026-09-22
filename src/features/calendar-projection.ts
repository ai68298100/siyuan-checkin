/* T-1391 Task Horizon 日历只读投影（D-259）：项目×日期的有界只读摘要。
   设计边界（docs/roadmap-task-horizon-calendar-visibility-2026-09.md）：
   - 只投影 `taskHorizonCalendarVisible !== false` 且未归档的项目，服务端过滤，
     不让消费方读全量后自行过滤；
   - 状态口径由小驴单一路径计算（排期/配额/SKIP/atMost/修订生效日/localDate），
     消费方只呈现，不自算完成率；
   - SKIP 中性；atMost 用守住/破戒专用状态，不套至少型百分比；
   - 配额以周期进度+当日贡献表达，不拆成伪任务；
   - 非排期日不伪造计划项，仅当日有真实记录时给出 logged 点；
   - 有界：天数≤366、项目数≤200，超限截断并显式标注；不含备注/附件/externalRef。 */

import {getItemRevisionForDate, getEventsForDay, isComplete, isItemAvailableOnDate, isScheduledToday, isSkipEvent} from "../model";
import {evaluateQuotaSchedule} from "../rules";
import type {CheckinStore} from "../types";

/** 单日状态：complete/pending=普通与至少型；skipped=显式跳过（中性）；
    at-most-safe/at-most-breach=负向习惯专用；logged=非排期日的真实记录。 */
export type CalendarProjectionDayStatus = "complete" | "pending" | "skipped" | "at-most-safe" | "at-most-breach" | "logged";

export interface CalendarProjectionPoint {
    /** localDate（YYYY-MM-DD），日期归属只用本地日期，不从 UTC 反推。 */
    date: string;
    status: CalendarProjectionDayStatus;
    /** 当日非跳过记录值合计（跳过日为 0）。 */
    value: number;
    /** 该日生效修订的目标值与单位（quota 项目目标随周期，此处仍给当日修订值）。 */
    target: number;
    unit: string;
    /** 普通项目：0..1 完成比；atMost/quota 省略。 */
    progress?: number;
}

export interface CalendarProjectionItem {
    itemId: string;
    name: string;
    icon: string;
    kind: string;
    direction?: "atMost";
    unit: string;
    scheduleType: string;
    points: CalendarProjectionPoint[];
    /** quota 项目专用：投影区间末日所在周期的完成比（0..1）。 */
    quotaRate?: number;
}

export interface CalendarProjection {
    startDate: string;
    /** 半开区间上界（不含）。 */
    endDateExclusive: string;
    items: CalendarProjectionItem[];
    /** 截断前的可见项目总数（>items.length 即发生项目截断）。 */
    totalItems: number;
    truncated: boolean;
}

/** 投影硬上限（与 events.range.read 的 366/366/200 纪律同源）。 */
export const CALENDAR_PROJECTION_LIMITS = Object.freeze({
    maxDays: 366,
    maxItems: 200,
}) as Readonly<{maxDays: number; maxItems: number}>;

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function nextDayKey(key: string): string {
    const [year, month, day] = key.split("-").map(Number);
    return `${new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)}`;
}

function eachDayKey(startDate: string, endDateExclusive: string): string[] {
    const keys: string[] = [];
    for (let cursor = startDate; cursor < endDateExclusive && keys.length < CALENDAR_PROJECTION_LIMITS.maxDays; cursor = nextDayKey(cursor)) {
        keys.push(cursor);
    }
    return keys;
}

export interface CalendarProjectionInput {
    startDate: string;
    endDateExclusive: string;
}

/** 有界项目×日期投影。输入不合法抛 TypeError（与 v5 只读方法同一错误纪律）。 */
export function buildCalendarProjection(
    store: CheckinStore,
    range: CalendarProjectionInput,
): CalendarProjection {
    if (!range || !DATE_PATTERN.test(range.startDate || "") || !DATE_PATTERN.test(range.endDateExclusive || "")) {
        throw new TypeError("range 必须提供合法的 startDate 与 endDateExclusive（YYYY-MM-DD）");
    }
    if (range.startDate >= range.endDateExclusive) {
        throw new TypeError("range.startDate 必须早于 endDateExclusive（半开区间）");
    }
    const dayKeys = eachDayKey(range.startDate, range.endDateExclusive);
    if (!dayKeys.length) throw new TypeError("投影范围不得超过 366 天");
    const days = dayKeys.map((date) => {
        const [year, month, day] = date.split("-").map(Number);
        return {date, at: new Date(year, month - 1, day)};
    });
    const visible = store.items.filter((item) => !item.archived && item.taskHorizonCalendarVisible !== false);
    const projected = visible.slice(0, CALENDAR_PROJECTION_LIMITS.maxItems).map((item) => {
        const base = getItemRevisionForDate(item, days[days.length - 1].at);
        const points: CalendarProjectionPoint[] = [];
        for (const {date, at} of days) {
            const revision = getItemRevisionForDate(item, at);
            const available = isItemAvailableOnDate(item, at);
            const dayEvents = getEventsForDay(store, item.id, at);
            const skipDay = dayEvents.some((event) => isSkipEvent(event));
            const value = dayEvents.filter((event) => !isSkipEvent(event)).reduce((total, event) => total + event.value, 0);
            const target = revision.target;
            if (skipDay) {
                points.push({date, status: "skipped", value: 0, target, unit: revision.unit});
                continue;
            }
            if (revision.schedule.type === "quota") {
                /* 配额：只有真实贡献日生成点；周期进度放 item 级 quotaRate，不拆伪任务。 */
                if (value > 0 && available) points.push({date, status: "complete", value, target, unit: revision.unit});
                continue;
            }
            if (item.direction === "atMost" && revision.schedule.type === "daily") {
                if (available) points.push({date, status: value > 0 ? "at-most-breach" : "at-most-safe", value, target, unit: revision.unit});
                continue;
            }
            const scheduled = available && isScheduledToday(item, at);
            if (scheduled) {
                const complete = isComplete(store, item, at);
                points.push({
                    date,
                    status: complete ? "complete" : "pending",
                    value,
                    target,
                    unit: revision.unit,
                    ...(complete ? {} : {progress: target > 0 ? Math.min(1, value / target) : 0}),
                });
                continue;
            }
            if (value > 0) points.push({date, status: "logged", value, target, unit: revision.unit});
        }
        /* 配额周期进度：以投影区间末日所在周期为准（单一路径复用 rules 的评估器）。 */
        let quotaRate: number | undefined;
        if (base.schedule.type === "quota" && base.schedule.quota) {
            quotaRate = evaluateQuotaSchedule(
                base.schedule,
                store.events.filter((event) => event.itemId === item.id && !isSkipEvent(event)),
                item.id,
                days[days.length - 1].at,
                base.schedule.quota.countMode === "value" ? base.unit : undefined,
            )?.progress;
        }
        return {
            itemId: item.id,
            name: item.name,
            icon: item.icon,
            kind: item.kind,
            ...(item.direction === "atMost" ? {direction: "atMost" as const} : {}),
            unit: base.unit,
            scheduleType: base.schedule.type,
            points,
            ...(quotaRate !== undefined ? {quotaRate} : {}),
        };
    });
    return {
        startDate: range.startDate,
        endDateExclusive: range.endDateExclusive,
        items: projected,
        totalItems: visible.length,
        truncated: visible.length > projected.length || dayKeys.length < eachDayCount(range.startDate, range.endDateExclusive),
    };
}

function eachDayCount(startDate: string, endDateExclusive: string): number {
    let count = 0;
    for (let cursor = startDate; cursor < endDateExclusive; cursor = nextDayKey(cursor)) count += 1;
    return count;
}
