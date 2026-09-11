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

/** 近 N 周的完成率（%）：按周一为一周起点，统计"项目-日"粒度的完成占比。 */
export function buildWeeklyCompletionTrend(store: CheckinStore, weeks = 12, asOf = new Date()): TrendSeries {
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
    const points: TrendPoint[] = [];
    const activeDays = new Set(store.events.map((event) => event.localDate));
    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - index);
        const key = dateKey(date);
        points.push({label: `${date.getMonth() + 1}/${date.getDate()}`, value: activeDays.has(key) ? 1 : 0});
    }
    return {title: `近${days}天活跃`, unit: "天", points};
}

/** 折线图 SVG：紫罗兰线条 + 数据点，宽度自适应（viewBox）。 */
export function renderLineChart(series: TrendSeries, options: {width?: number; height?: number} = {}): string {
    const width = options.width ?? 320;
    const height = options.height ?? 120;
    const pad = 8;
    const values = series.points.map((point) => point.value);
    const max = Math.max(100, ...values);
    if (!series.points.length) return "";
    const stepX = series.points.length > 1 ? (width - pad * 2) / (series.points.length - 1) : 0;
    const scaleY = (value: number): number => height - pad - (value / max) * (height - pad * 2);
    const coords = series.points.map((point, index) => `${(pad + index * stepX).toFixed(1)},${scaleY(point.value).toFixed(1)}`);
    const dots = series.points.map((point, index) => `<circle cx="${(pad + index * stepX).toFixed(1)}" cy="${scaleY(point.value).toFixed(1)}" r="2.5" fill="currentColor"/>`).join("");
    const labels = series.points.filter((_, index) => index === 0 || index === series.points.length - 1)
        .map((point, index) => `<text x="${index === 0 ? pad : width - pad}" y="${height - 1}" text-anchor="${index === 0 ? "start" : "end"}" class="lc-chart-label">${point.label}</text>`).join("");
    return `<svg class="lc-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${series.title}" preserveAspectRatio="none">` +
        `<polyline points="${coords.join(" ")}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
        `${dots}${labels}</svg>`;
}

/** 柱状图 SVG。 */
export function renderBarChart(series: TrendSeries, options: {width?: number; height?: number} = {}): string {
    const width = options.width ?? 320;
    const height = options.height ?? 120;
    const pad = 8;
    const max = Math.max(1, ...series.points.map((point) => point.value));
    if (!series.points.length) return "";
    const slot = (width - pad * 2) / series.points.length;
    const barWidth = Math.min(28, slot * 0.6);
    const bars = series.points.map((point, index) => {
        const barHeight = Math.max(point.value > 0 ? 2 : 0, (point.value / max) * (height - pad * 2 - 10));
        const x = pad + index * slot + (slot - barWidth) / 2;
        const y = height - pad - 10 - barHeight;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="3" fill="currentColor" opacity="0.85"/>` +
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
    const width = weeks.length * (cell + gap) + gap;
    const height = 7 * (cell + gap) + gap;
    const levelClass = (level: number): string => level <= 0 ? "is-empty" : `is-level-${level}`;
    const cells = weeks.map((week, weekIndex) => week.map((day, dayIndex) => {
        if (day.count < 0) return "";
        const x = gap + weekIndex * (cell + gap);
        const y = gap + dayIndex * (cell + gap);
        return `<rect class="${levelClass(day.level)}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5"><title>${day.date}：${day.count} 条记录</title></rect>`;
    }).join("")).join("");
    return `<svg class="lc-yearheatmap" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}" role="img" aria-label="${heatmap.year} 年活跃热力图，共 ${heatmap.total} 条记录">${cells}</svg>`;
}
