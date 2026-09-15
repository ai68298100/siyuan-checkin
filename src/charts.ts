/* 7.0 趋势图表：纯函数聚合 + 零依赖 SVG 渲染。
   所有统计可从事件与项目配置推导，不引入第三方图表库。 */

import {isComplete, isItemAvailableOnDate, isScheduledToday, dateKey} from "./model";
import type {CheckinStore} from "./types";

export interface TrendPoint {
    label: string;
    value: number;
}

export interface TrendSeries {
    title: string;
    unit: string;
    points: TrendPoint[];
}

const clampRange = (value: number, fallback: number, max: number): number => Number.isFinite(value) ? Math.min(max, Math.max(1, Math.floor(value))) : fallback;
const ANALYTICS_SERIES_LIMITS = {weekly: 52, monthly: 24, daily: 366, yearly: 10} as const;
const isAnalyticsDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export interface AnalyticsSnapshot {
    version: 1;
    asOf: string;
    weekly: TrendSeries;
    monthly: TrendSeries;
    daily: TrendSeries;
    yearly: TrendSeries;
}

export function buildAnalyticsSnapshot(store: CheckinStore, asOf = new Date()): AnalyticsSnapshot {
    return {
        version: 1,
        asOf: dateKey(asOf),
        weekly: buildWeeklyCompletionTrend(store, 12, asOf),
        monthly: buildMonthlyEventTrend(store, 6, asOf),
        daily: buildDailyActivityTrend(store, 30, asOf),
        yearly: buildYearlyEventTrend(store, 5, asOf),
    };
}

export function cloneAnalyticsSnapshot(snapshot: AnalyticsSnapshot): AnalyticsSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as AnalyticsSnapshot;
}

export function serializeAnalyticsSnapshot(snapshot: AnalyticsSnapshot): string {
    return JSON.stringify(cloneAnalyticsSnapshot(snapshot));
}

export function parseAnalyticsSnapshot(raw: string): AnalyticsSnapshot | undefined {
    try {
        const value = JSON.parse(raw) as Partial<AnalyticsSnapshot>;
        if (value.version !== 1 || !isAnalyticsDate(value.asOf) || !value.weekly || !value.monthly || !value.daily || !value.yearly) return undefined;
        for (const [name, series] of [["weekly", value.weekly], ["monthly", value.monthly], ["daily", value.daily], ["yearly", value.yearly]] as const) {
            if (typeof series.title !== "string" || typeof series.unit !== "string" || !Array.isArray(series.points)) return undefined;
            if (series.points.length > ANALYTICS_SERIES_LIMITS[name]) return undefined;
            if (series.points.some((point) => !point || typeof point.label !== "string" || point.label.length > 64 || typeof point.value !== "number" || !Number.isFinite(point.value) || point.value < 0)) return undefined;
        }
        return cloneAnalyticsSnapshot(value as AnalyticsSnapshot);
    } catch {
        return undefined;
    }
}

export interface AnalyticsSnapshotSummary {
    asOf: string;
    weeklyCurrent: number;
    monthlyCurrent: number;
    activeDays: number;
    yearlyCurrent: number;
}

export function summarizeAnalyticsSnapshot(snapshot: AnalyticsSnapshot): AnalyticsSnapshotSummary {
    return {
        asOf: snapshot.asOf,
        weeklyCurrent: summarizeTrend(snapshot.weekly).current,
        monthlyCurrent: summarizeTrend(snapshot.monthly).current,
        activeDays: snapshot.daily.points.reduce((sum, point) => sum + (point.value > 0 ? 1 : 0), 0),
        yearlyCurrent: summarizeTrend(snapshot.yearly).current,
    };
}

export function compareAnalyticsSnapshots(left: AnalyticsSnapshot, right: AnalyticsSnapshot): "older" | "same" | "newer" {
    if (left.asOf === right.asOf) return "same";
    return left.asOf < right.asOf ? "older" : "newer";
}

export function serializeAnalyticsSummary(snapshot: AnalyticsSnapshot): string {
    return JSON.stringify(summarizeAnalyticsSnapshot(snapshot));
}

export function parseAnalyticsSummary(raw: string): AnalyticsSnapshotSummary | undefined {
    try {
        const value = JSON.parse(raw) as Partial<AnalyticsSnapshotSummary>;
        if (!isAnalyticsDate(value.asOf)) return undefined;
        for (const key of ["weeklyCurrent", "monthlyCurrent", "activeDays", "yearlyCurrent"] as const) {
            if (typeof value[key] !== "number" || !Number.isFinite(value[key]) || value[key] < 0) return undefined;
        }
        return {asOf: value.asOf, weeklyCurrent: value.weeklyCurrent!, monthlyCurrent: value.monthlyCurrent!, activeDays: value.activeDays!, yearlyCurrent: value.yearlyCurrent!};
    } catch {
        return undefined;
    }
}

export function mergeAnalyticsSummaries(current: AnalyticsSnapshotSummary | undefined, incoming: AnalyticsSnapshotSummary): AnalyticsSnapshotSummary {
    if (!current || incoming.asOf > current.asOf) return {...incoming};
    return {...current};
}

export interface AnalyticsSnapshotEnvelope {
    version: 1;
    snapshot: AnalyticsSnapshot;
}

export function serializeAnalyticsEnvelope(snapshot: AnalyticsSnapshot): string {
    return JSON.stringify({version: 1, snapshot: cloneAnalyticsSnapshot(snapshot)} satisfies AnalyticsSnapshotEnvelope);
}

export function parseAnalyticsEnvelope(raw: string): AnalyticsSnapshot | undefined {
    try {
        const value = JSON.parse(raw) as Partial<AnalyticsSnapshotEnvelope>;
        if (value.version !== 1 || !value.snapshot) return undefined;
        return parseAnalyticsSnapshot(JSON.stringify(value.snapshot));
    } catch {
        return undefined;
    }
}

export function migrateAnalyticsEnvelope(raw: string): {snapshot: AnalyticsSnapshot; migrated: boolean} | undefined {
    const snapshot = parseAnalyticsEnvelope(raw) ?? parseAnalyticsSnapshot(raw);
    if (!snapshot) return undefined;
    return {snapshot: cloneAnalyticsSnapshot(snapshot), migrated: !raw.includes('"version":1') || raw.includes('"snapshot"') === false};
}

export function mergeAnalyticsSnapshots(current: AnalyticsSnapshot | undefined, incoming: AnalyticsSnapshot): AnalyticsSnapshot {
    if (!current) return cloneAnalyticsSnapshot(incoming);
    return compareAnalyticsSnapshots(current, incoming) === "newer" ? cloneAnalyticsSnapshot(current) : cloneAnalyticsSnapshot(incoming);
}

export function summarizeTrend(series: TrendSeries): {current: number; average: number; best: number; delta: number} {
    const values = series.points.map((point) => point.value);
    const current = values[values.length - 1] || 0;
    const previous = values[values.length - 2] || 0;
    return {current, average: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0, best: Math.max(0, ...values), delta: current - previous};
}

/** 近 N 周的完成率（%）：按周一为一周起点，统计"项目-日"粒度的完成占比。 */
export function buildWeeklyCompletionTrend(store: CheckinStore, weeks = 12, asOf = new Date()): TrendSeries {
    weeks = clampRange(weeks, 12, 52);
    const points: TrendPoint[] = [];
    const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
    const currentMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    for (let index = weeks - 1; index >= 0; index -= 1) {
        const monday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - index * 7);
        let scheduled = 0;
        let completed = 0;
        for (let day = 0; day < 7; day += 1) {
            const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day);
            if (dateKey(date) > dateKey(today)) break;
            for (const item of store.items) {
                if (item.archived || !isItemAvailableOnDate(item, date) || !isScheduledToday(item, date)) continue;
                scheduled += 1;
                if (isComplete(store, item, date)) completed += 1;
            }
        }
        const label = `${monday.getMonth() + 1}/${monday.getDate()}`;
        points.push({label, value: scheduled ? Math.round((completed / scheduled) * 100) : 0});
    }
    return {title: "近12周完成率", unit: "%", points};
}

/** 近 N 个月的记录条数。 */
export function buildMonthlyEventTrend(store: CheckinStore, months = 6, asOf = new Date()): TrendSeries {
    months = clampRange(months, 6, 24);
    const points: TrendPoint[] = [];
    for (let index = months - 1; index >= 0; index -= 1) {
        const start = new Date(asOf.getFullYear(), asOf.getMonth() - index, 1);
        const end = new Date(asOf.getFullYear(), asOf.getMonth() - index + 1, 1);
        const count = store.events.filter((event) => {
            const time = new Date(event.occurredAt).getTime();
            return time >= start.getTime() && time < end.getTime();
        }).length;
        points.push({label: `${start.getMonth() + 1}月`, value: count});
    }
    return {title: "近6个月记录数", unit: "条", points};
}

/** 近 N 天的活跃天数分布（每天是否有记录）。 */
export function buildDailyActivityTrend(store: CheckinStore, days = 30, asOf = new Date()): TrendSeries {
    days = clampRange(days, 30, 366);
    const points: TrendPoint[] = [];
    const activeDays = new Set(store.events.map((event) => event.localDate));
    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - index);
        const key = dateKey(date);
        points.push({label: `${date.getMonth() + 1}/${date.getDate()}`, value: activeDays.has(key) ? 1 : 0});
    }
    return {title: `近${days}天活跃`, unit: "天", points};
}

export function buildYearlyEventTrend(store: CheckinStore, years = 5, asOf = new Date()): TrendSeries {
    years = clampRange(years, 5, 10);
    const points: TrendPoint[] = [];
    for (let index = years - 1; index >= 0; index -= 1) {
        const year = asOf.getFullYear() - index;
        const count = store.events.filter((event) => new Date(event.occurredAt).getFullYear() === year).length;
        points.push({label: String(year), value: count});
    }
    return {title: "年度记录数", unit: "条", points};
}

/** 折线图 SVG：紫罗兰线条 + 数据点，宽度自适应（viewBox）。 */
export function renderLineChart(series: TrendSeries, options: {width?: number; height?: number} = {}): string {
    const width = options.width ?? 320;
    const height = options.height ?? 120;
    const padX = 30;
    const padTop = 12;
    const padBottom = 22;
    const values = series.points.map((point) => point.value);
    const max = Math.max(100, ...values);
    if (!series.points.length) return "";
    const plotBottom = height - padBottom;
    const stepX = series.points.length > 1 ? (width - padX * 2) / (series.points.length - 1) : 0;
    const scaleY = (value: number): number => plotBottom - (value / max) * (plotBottom - padTop);
    const coords = series.points.map((point, index) => `${(padX + index * stepX).toFixed(1)},${scaleY(point.value).toFixed(1)}`);
    const grid = [0, 25, 50, 75, 100].map((value) => { const y = scaleY(value); return `<line class="lc-chart-grid" x1="${padX}" x2="${width - padX}" y1="${y}" y2="${y}"/><text class="lc-chart-axis" x="${padX - 5}" y="${y + 3}" text-anchor="end">${value}%</text>`; }).join("");
    const area = `${padX},${plotBottom} ${coords.join(" ")} ${width - padX},${plotBottom}`;
    const dots = series.points.map((point, index) => `<circle cx="${(padX + index * stepX).toFixed(1)}" cy="${scaleY(point.value).toFixed(1)}" r="3" fill="currentColor"><title>${point.label}：${point.value}${series.unit}</title></circle>`).join("");
    const labels = series.points.map((point, index) => index % 2 === 0 || index === series.points.length - 1 ? `<text x="${(padX + index * stepX).toFixed(1)}" y="${height - 5}" text-anchor="middle" class="lc-chart-label">${point.label}</text>` : "").join("");
    return `<svg class="lc-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${series.title}" preserveAspectRatio="none">` +
        `${grid}<polygon class="lc-chart-area" points="${area}"/><polyline points="${coords.join(" ")}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
        `${dots}${labels}</svg>`;
}

/** 柱状图 SVG。 */
export function renderBarChart(series: TrendSeries, options: {width?: number; height?: number} = {}): string {
    const width = options.width ?? 320;
    const height = options.height ?? 120;
    const pad = 22;
    const max = Math.max(1, ...series.points.map((point) => point.value));
    if (!series.points.length) return "";
    const slot = (width - pad * 2) / series.points.length;
    const barWidth = Math.min(28, slot * 0.6);
    const bars = series.points.map((point, index) => {
        const barHeight = Math.max(point.value > 0 ? 2 : 0, (point.value / max) * (height - pad * 2 - 10));
        const x = pad + index * slot + (slot - barWidth) / 2;
        const y = height - pad - 10 - barHeight;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="4" fill="currentColor" opacity="0.85"><title>${point.label}：${point.value}${series.unit}</title></rect><text x="${(x + barWidth / 2).toFixed(1)}" y="${Math.max(9, y - 4).toFixed(1)}" text-anchor="middle" class="lc-chart-value">${point.value}</text>` +
            `<text x="${(x + barWidth / 2).toFixed(1)}" y="${height - 2}" text-anchor="middle" class="lc-chart-label">${point.label}</text>`;
    }).join("");
    return `<svg class="lc-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${series.title}" preserveAspectRatio="none">${bars}</svg>`;
}

/* ============================================================
   8.2 年度活跃热力图：按"当日记录条数"分级，O(E) 聚合。
   ============================================================ */

export interface YearHeatmapDay {
    date: string;
    count: number;
    level: number;
}

export interface YearHeatmap {
    year: number;
    days: YearHeatmapDay[];
    max: number;
    total: number;
}

export function buildYearHeatmap(store: CheckinStore, year: number): YearHeatmap {
    const prefix = `${year}-`;
    const counts = new Map<string, number>();
    let total = 0;
    let max = 0;
    for (const event of store.events) {
        if (!event.localDate.startsWith(prefix)) continue;
        const count = (counts.get(event.localDate) || 0) + 1;
        counts.set(event.localDate, count);
        max = Math.max(max, count);
        total += 1;
    }
    const days: YearHeatmapDay[] = [];
    const cursor = new Date(year, 0, 1);
    while (cursor.getFullYear() === year) {
        const key = dateKey(cursor);
        const count = counts.get(key) || 0;
        let level = 0;
        if (count > 0) level = count >= Math.max(6, Math.ceil(max * 0.75)) ? 4 : count >= Math.max(3, Math.ceil(max * 0.5)) ? 3 : count >= 2 ? 2 : 1;
        days.push({date: key, count, level});
        cursor.setDate(cursor.getDate() + 1);
    }
    return {year, days, max, total};
}

/** 年度热力图 SVG：列为周、行为星期（周一在上）。 */
export function renderYearHeatmap(heatmap: YearHeatmap, options: {cell?: number; gap?: number} = {}): string {
    const cell = options.cell ?? 11;
    const gap = options.gap ?? 3;
    const weeks: YearHeatmapDay[][] = [];
    let currentWeek: YearHeatmapDay[] = [];
    // 第一天之前的空位（周一起始）
    const firstDay = new Date(Number(heatmap.days[0].date.slice(0, 4)), 0, 1);
    const leading = (firstDay.getDay() + 6) % 7;
    for (let index = 0; index < leading; index += 1) currentWeek.push({date: "", count: -1, level: -1});
    for (const day of heatmap.days) {
        currentWeek.push(day);
        if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    }
    if (currentWeek.length) weeks.push(currentWeek);
    const labelLeft = 22;
    const labelTop = 18;
    const width = labelLeft + weeks.length * (cell + gap) + gap;
    const height = labelTop + 7 * (cell + gap) + gap;
    const levelClass = (level: number): string => level <= 0 ? "is-empty" : `is-level-${level}`;
    const cells = weeks.map((week, weekIndex) => week.map((day, dayIndex) => {
        if (day.count < 0) return "";
        const x = labelLeft + gap + weekIndex * (cell + gap);
        const y = labelTop + gap + dayIndex * (cell + gap);
        return `<rect class="${levelClass(day.level)}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5"><title>${day.date}：${day.count} 条记录</title></rect>`;
    }).join("")).join("");
    const monthLabels = Array.from({length: 12}, (_, month) => {
        const first = new Date(heatmap.year, month, 1);
        const week = Math.floor((((first.getTime() - firstDay.getTime()) / 86400000) + leading) / 7);
        return `<text class="lc-yearheatmap__label" x="${labelLeft + gap + week * (cell + gap)}" y="11">${month + 1}月</text>`;
    }).join("");
    const weekdayLabels = [[0, "一"], [2, "三"], [4, "五"], [6, "日"]].map(([index, label]) => `<text class="lc-yearheatmap__label" x="2" y="${labelTop + gap + Number(index) * (cell + gap) + cell - 1}">${label}</text>`).join("");
    return `<svg class="lc-yearheatmap" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}" role="img" aria-label="${heatmap.year} 年每日打卡分布：每格一天，颜色越深表示记录越多，共 ${heatmap.total} 条记录">${monthLabels}${weekdayLabels}${cells}</svg>`;
}
