/* 7.0 趋势图表：纯函数聚合 + 零依赖 SVG 渲染。
   所有统计可从事件与项目配置推导，不引入第三方图表库。 */

import {isComplete, isItemAvailableOnDate, isScheduledToday, isSkipEvent, getSkipDatesForItem, dateKey} from "./model";
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

const escapeChartText = (value: string): string => value.replace(/[&<>"']/g, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[character]!);

const clampRange = (value: number, fallback: number, max: number): number => Number.isFinite(value) ? Math.min(max, Math.max(1, Math.floor(value))) : fallback;
const ANALYTICS_SERIES_LIMITS = {weekly: 52, monthly: 24, daily: 366, yearly: 10} as const;
const ANALYTICS_PAYLOAD_LIMIT = 512 * 1024;
const ANALYTICS_VALUE_LIMIT = 1_000_000_000;
const isAnalyticsDate = (value: unknown): value is string => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    if (year < 1970 || year > 9999) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

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
        if (typeof raw !== "string" || raw.length > ANALYTICS_PAYLOAD_LIMIT) return undefined;
        const value = JSON.parse(raw) as Partial<AnalyticsSnapshot>;
        if (value.version !== 1 || !isAnalyticsDate(value.asOf) || !value.weekly || !value.monthly || !value.daily || !value.yearly) return undefined;
        for (const [name, series] of [["weekly", value.weekly], ["monthly", value.monthly], ["daily", value.daily], ["yearly", value.yearly]] as const) {
            if (typeof series.title !== "string" || typeof series.unit !== "string" || series.title.length > 64 || series.unit.length > 16 || /[\u0000-\u001f\u007f]/.test(series.title) || /[\u0000-\u001f\u007f]/.test(series.unit) || !Array.isArray(series.points)) return undefined;
            if (series.points.length > ANALYTICS_SERIES_LIMITS[name]) return undefined;
            if (series.points.some((point) => !point || typeof point.label !== "string" || point.label.length > 64 || /[\u0000-\u001f\u007f]/.test(point.label) || typeof point.value !== "number" || !Number.isSafeInteger(point.value) || point.value < 0 || point.value > ANALYTICS_VALUE_LIMIT)) return undefined;
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
        if (typeof raw !== "string" || raw.length > ANALYTICS_PAYLOAD_LIMIT) return undefined;
        const value = JSON.parse(raw) as Partial<AnalyticsSnapshotSummary>;
        if (!isAnalyticsDate(value.asOf)) return undefined;
        for (const key of ["weeklyCurrent", "monthlyCurrent", "activeDays", "yearlyCurrent"] as const) {
            if (typeof value[key] !== "number" || !Number.isSafeInteger(value[key]) || value[key] < 0 || value[key] > ANALYTICS_VALUE_LIMIT) return undefined;
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
        if (typeof raw !== "string" || raw.length > ANALYTICS_PAYLOAD_LIMIT) return undefined;
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
    const skipsByItem = new Map(store.items.map(item => [item.id, getSkipDatesForItem(store, item.id)]));
    for (let index = weeks - 1; index >= 0; index -= 1) {
        const monday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - index * 7);
        let scheduled = 0;
        let completed = 0;
        for (let day = 0; day < 7; day += 1) {
            const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day);
            if (dateKey(date) > dateKey(today)) break;
            for (const item of store.items) {
                if (item.archived || !isItemAvailableOnDate(item, date) || !isScheduledToday(item, date)) continue;
                const complete = isComplete(store, item, date);
                // Match summary completion rates: skip is neutral, while a
                // genuine completion on the same day still takes precedence.
                if (!complete && skipsByItem.get(item.id)?.has(dateKey(date))) continue;
                scheduled += 1;
                if (complete) completed += 1;
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

export interface ChartOptions {
    width?: number;
    height?: number;
    labelStride?: number;
    /** Runtime redraws reuse the original data attribute. */
    responsive?: boolean;
}

const chartTextWidth = (text: string): number => Array.from(text).reduce((width, character) => width + (/[^\x00-\x7f]/.test(character) ? 12 : 7), 0);

/** Keep the first/last dates, then add labels only if their actual slots fit. */
function chartLabelIndices(series: TrendSeries, positions: number[], width: number, stride = 1): Set<number> {
    const last = series.points.length - 1;
    const indices = new Set([0, last]);
    const bounds = (index: number): [number, number] => {
        const textWidth = chartTextWidth(series.points[index].label);
        const left = Math.max(0, Math.min(width - textWidth, positions[index] - textWidth / 2));
        return [left, left + textWidth];
    };
    const lastLeft = bounds(last)[0];
    let previousRight = bounds(0)[1];
    for (let index = Math.max(1, stride); index < last; index += Math.max(1, stride)) {
        const [left, right] = bounds(index);
        if (left < previousRight + 12 || right + 12 > lastLeft) continue;
        indices.add(index);
        previousRight = right;
    }
    return indices;
}

function chartData(kind: "line" | "bar", series: TrendSeries, options: ChartOptions): string {
    return options.responsive === false ? "" : ` data-responsive-chart="${escapeChartText(JSON.stringify({kind, series, labelStride: options.labelStride}))}"`;
}

/** Coordinates are recalculated in CSS pixels on resize; text never scales. */
export function renderLineChart(series: TrendSeries, options: ChartOptions = {}): string {
    const width = options.width ?? 320;
    const height = options.height ?? 190;
    const padTop = 14;
    const padBottom = 28;
    const values = series.points.map((point) => point.value);
    const percentage = series.unit === "%";
    const max = Math.max(percentage ? 100 : 1, ...values);
    if (!series.points.length) return "";
    const tickStep = Math.max(1, Math.ceil(max / 4));
    const ticks = percentage ? [0, 25, 50, 75, 100] : [...new Set([0, tickStep, tickStep * 2, tickStep * 3, max].filter((value) => value <= max))].sort((a, b) => a - b);
    const padX = Math.min(width * .4, Math.max(...ticks.map(value => chartTextWidth(`${value}${series.unit}`))) + 10);
    const plotRight = width - 12;
    const plotBottom = height - padBottom;
    const stepX = series.points.length > 1 ? (plotRight - padX) / (series.points.length - 1) : 0;
    const scaleY = (value: number): number => plotBottom - (value / max) * (plotBottom - padTop);
    const coords = series.points.map((point, index) => `${(padX + index * stepX).toFixed(1)},${scaleY(point.value).toFixed(1)}`);
    /* Activity is measured in days, not percentages. Preserve the percentage
       scale for rates; ordinary quantities use their actual unit and range. */
    const grid = ticks.map((value) => { const y = scaleY(value); return `<line class="lc-chart-grid" x1="${padX}" x2="${plotRight}" y1="${y}" y2="${y}"/><text class="lc-chart-axis" x="${padX - 5}" y="${y + 4}" text-anchor="end">${value}${escapeChartText(series.unit)}</text>`; }).join("");
    const area = `${padX},${plotBottom} ${coords.join(" ")} ${plotRight},${plotBottom}`;
    const dots = series.points.map((point, index) => `<circle cx="${(padX + index * stepX).toFixed(1)}" cy="${scaleY(point.value).toFixed(1)}" r="3" fill="currentColor"><title>${escapeChartText(point.label)}：${point.value}${escapeChartText(series.unit)}</title></circle>`).join("");
    /* labelStride：长序列（如 30 天强度曲线）按步长稀疏标注，避免文字重叠。 */
    const stride = Math.max(1, options.labelStride ?? 2);
    const last = series.points.length - 1;
    const labelIndices = chartLabelIndices(series, series.points.map((point, index) => padX + index * stepX + (index === 0 ? chartTextWidth(point.label) / 2 : index === last ? -chartTextWidth(point.label) / 2 : 0)), width, stride);
    const labels = series.points.map((point, index) => labelIndices.has(index) ? `<text x="${(padX + index * stepX).toFixed(1)}" y="${height - 7}" text-anchor="${index === 0 ? "start" : index === last ? "end" : "middle"}" class="lc-chart-label">${escapeChartText(point.label)}</text>` : "").join("");
    return `<svg class="lc-chart"${chartData("line", series, options)} viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeChartText(series.title)}" preserveAspectRatio="xMidYMid meet">` +
        `${grid}<polygon class="lc-chart-area" points="${area}"/><polyline points="${coords.join(" ")}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
        `${dots}${labels}</svg>`;
}

/** 柱状图 SVG。 */
export function renderBarChart(series: TrendSeries, options: ChartOptions = {}): string {
    const width = options.width ?? 320;
    const height = options.height ?? 190;
    const pad = 12;
    const max = Math.max(1, ...series.points.map((point) => point.value));
    if (!series.points.length) return "";
    const slot = (width - pad * 2) / series.points.length;
    const barWidth = Math.min(28, slot * 0.6);
    const labelIndices = chartLabelIndices(series, series.points.map((_, index) => pad + (index + .5) * slot), width);
    const bars = series.points.map((point, index) => {
        const barHeight = Math.max(point.value > 0 ? 2 : 0, (point.value / max) * (height - 50));
        const x = pad + index * slot + (slot - barWidth) / 2;
        const y = height - 28 - barHeight;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="4" fill="currentColor" opacity="0.85"><title>${escapeChartText(point.label)}：${point.value}${escapeChartText(series.unit)}</title></rect>` + (labelIndices.has(index) ? `<text x="${(x + barWidth / 2).toFixed(1)}" y="${Math.max(13, y - 5).toFixed(1)}" text-anchor="middle" class="lc-chart-value">${point.value}</text>` +
            `<text x="${(x + barWidth / 2).toFixed(1)}" y="${height - 7}" text-anchor="middle" class="lc-chart-label">${escapeChartText(point.label)}</text>` : "");
    }).join("");
    return `<svg class="lc-chart"${chartData("bar", series, options)} viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeChartText(series.title)}" preserveAspectRatio="xMidYMid meet">${bars}</svg>`;
}

/* ============================================================
   8.2 年度活跃热力图：按"当日记录条数"分级，O(E) 聚合。
   ============================================================ */

export interface YearHeatmapDay {
    date: string;
    count: number;
    level: number;
    /** T-1221：当日只有跳过记录（无真实完成）时为 true，渲染为中性色。 */
    skip?: boolean;
}

export interface YearHeatmap {
    year: number;
    days: YearHeatmapDay[];
    max: number;
    total: number;
    /** T-1410：四级色阶的 adaptive 阈值（正数日条数的 25/50/75 百分位，level = count > threshold）。 */
    thresholds: [number, number, number];
}

export function buildYearHeatmap(store: CheckinStore, year: number): YearHeatmap {
    const prefix = `${year}-`;
    const counts = new Map<string, number>();
    const skips = new Set<string>();
    let total = 0;
    let max = 0;
    for (const event of store.events) {
        if (!event.localDate.startsWith(prefix)) continue;
        total += 1;
        /* T-1221：跳过记录不参与热度层级；仅跳过的日子标记为中性 skip 格。 */
        if (isSkipEvent(event)) {
            skips.add(event.localDate);
            continue;
        }
        const count = (counts.get(event.localDate) || 0) + 1;
        counts.set(event.localDate, count);
        max = Math.max(max, count);
    }
    /* T-1410：四级色阶按「有记录日」的条数分布自适应分级（nearest-rank 百分位 25/50/75），
       替代固定绝对阈值——低频用户同样能看到完整的四级层次，高频日随分布自然进入高档。 */
    const positive = [...counts.values()].sort((left, right) => left - right);
    const percentile = (p: number): number => positive.length ? positive[Math.min(positive.length - 1, Math.ceil(p * positive.length) - 1)] : 0;
    const thresholds: [number, number, number] = [percentile(0.25), percentile(0.5), percentile(0.75)];
    const days: YearHeatmapDay[] = [];
    const cursor = new Date(year, 0, 1);
    while (cursor.getFullYear() === year) {
        const key = dateKey(cursor);
        const count = counts.get(key) || 0;
        let level = 0;
        if (count > 0) level = count > thresholds[2] ? 4 : count > thresholds[1] ? 3 : count > thresholds[0] ? 2 : 1;
        days.push({date: key, count, level, ...(level === 0 && skips.has(key) ? {skip: true} : {})});
        cursor.setDate(cursor.getDate() + 1);
    }
    return {year, days, max, total, thresholds};
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
    const levelClass = (level: number, skip?: boolean): string => skip ? "is-skip" : level <= 0 ? "is-empty" : `is-level-${level}`;
    const cells = weeks.map((week, weekIndex) => week.map((day, dayIndex) => {
        if (day.count < 0) return "";
        const x = labelLeft + gap + weekIndex * (cell + gap);
        const y = labelTop + gap + dayIndex * (cell + gap);
        const title = day.skip ? `${day.date}：跳过` : `${day.date}：${day.count} 条记录`;
        return `<rect class="${levelClass(day.level, day.skip)}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5"><title>${title}</title></rect>`;
    }).join("")).join("");
    const monthLabels = Array.from({length: 12}, (_, month) => {
        const first = new Date(heatmap.year, month, 1);
        const week = Math.floor((((first.getTime() - firstDay.getTime()) / 86400000) + leading) / 7);
        return `<text class="lc-yearheatmap__label" x="${labelLeft + gap + week * (cell + gap)}" y="11">${month + 1}月</text>`;
    }).join("");
    const weekdayLabels = [[0, "一"], [2, "三"], [4, "五"], [6, "日"]].map(([index, label]) => `<text class="lc-yearheatmap__label" x="2" y="${labelTop + gap + Number(index) * (cell + gap) + cell - 1}">${label}</text>`).join("");
    return `<svg class="lc-yearheatmap" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}" role="img" aria-label="${heatmap.year} 年每日打卡分布：每格一天，颜色越深表示记录越多，共 ${heatmap.total} 条记录">${monthLabels}${weekdayLabels}${cells}</svg>`;
}
