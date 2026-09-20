/* 回顾页「较上一周期」区块（T-1216）：消费 features/review-comparison 的纯比较模型，
   只负责把 delta 转成可读 HTML；不读 store、不取当前时间，当前/基线上下文由回顾页统一
   以共享 asOf 推导（review-asof 守门）。
   双导出：renderReviewCompareSection 是紧跟 hero 的统计条带（含空态），
   renderReviewCompareItems 是逐项目差值行（进折叠区，随 fold 空体隐藏）。 */
import {t} from "../i18n";
import {escapeHtml, formatNumber} from "../shared";
import type {ReviewComparison, ReviewComparisonItem} from "../features/review-comparison";

function signedValue(value: number): string {
    if (value > 0) return `+${formatNumber(value)}`;
    if (value < 0) return formatNumber(value);
    return "±0";
}

function rateDeltaText(delta: number): string {
    return delta === 0 ? "±0" : t("review.comparePoints", {n: signedValue(delta)});
}

function toneClass(delta: number): string {
    return delta > 0 ? "is-up" : delta < 0 ? "is-down" : "is-flat";
}

function compareStats(comparison: ReviewComparison): string {
    const stats = [
        {label: t("review.statEvents"), current: comparison.current.totalEvents, baseline: comparison.baseline.totalEvents, delta: comparison.delta.totalEvents, neutral: false},
        {label: t("review.statCompleted"), current: comparison.current.completedItems, baseline: comparison.baseline.completedItems, delta: comparison.delta.completedItems, neutral: false},
        {label: t("review.statScheduled"), current: comparison.current.scheduledItems, baseline: comparison.baseline.scheduledItems, delta: comparison.delta.scheduledItems, neutral: true},
    ];
    return `<div class="lc-checkin__compare-stats">${stats.map((stat) => {
        /* 计划项目数反映排期变化而非表现好坏，delta 恒用中性色。 */
        const tone = stat.neutral ? "is-flat" : toneClass(stat.delta);
        const aria = t("review.compareStatAria", {label: stat.label, current: formatNumber(stat.current), baseline: formatNumber(stat.baseline), delta: signedValue(stat.delta)});
        return `<div class="lc-checkin__compare-stat ${tone}" title="${escapeHtml(aria)}"><small>${escapeHtml(stat.label)}</small><b>${escapeHtml(formatNumber(stat.current))}</b><em>${escapeHtml(signedValue(stat.delta))}</em><span>${escapeHtml(t("review.compareBaselineLabel"))} ${escapeHtml(formatNumber(stat.baseline))}</span></div>`;
    }).join("")}</div>`;
}

function compareSummaryChart(comparison: ReviewComparison): string {
    const stats = [
        {label: t("review.statEvents"), current: comparison.current.totalEvents, baseline: comparison.baseline.totalEvents},
        {label: t("review.statCompleted"), current: comparison.current.completedItems, baseline: comparison.baseline.completedItems},
        {label: t("review.statScheduled"), current: comparison.current.scheduledItems, baseline: comparison.baseline.scheduledItems},
    ];
    const rows = stats.map((stat) => {
        const maximum = Math.max(1, stat.current, stat.baseline);
        const currentWidth = Math.round(stat.current / maximum * 1000) / 10;
        const baselineWidth = Math.round(stat.baseline / maximum * 1000) / 10;
        return `<div class="lc-checkin__compare-chart-row"><strong>${escapeHtml(stat.label)}</strong><div class="lc-checkin__compare-chart-bars"><i class="is-current" style="width:${currentWidth}%" title="${escapeHtml(`${t("review.compareCurrentLabel")} ${formatNumber(stat.current)}`)}"></i><i class="is-baseline" style="width:${baselineWidth}%" title="${escapeHtml(`${t("review.compareBaselineLabel")} ${formatNumber(stat.baseline)}`)}"></i></div><span>${escapeHtml(formatNumber(stat.current))} / ${escapeHtml(formatNumber(stat.baseline))}</span></div>`;
    }).join("");
    return `<div class="lc-checkin__compare-chart" role="img" aria-label="${escapeHtml(t("review.compareChartAria"))}"><div class="lc-checkin__compare-chart-legend"><span><i class="is-current"></i>${escapeHtml(t("review.compareCurrentLabel"))}</span><span><i class="is-baseline"></i>${escapeHtml(t("review.compareBaselineLabel"))}</span></div>${rows}</div>`;
}

function sortedCompareItems(items: ReviewComparisonItem[]): ReviewComparisonItem[] {
    return [...items].sort((left, right) => {
        const rateDiff = Math.abs(right.delta.completionRate) - Math.abs(left.delta.completionRate);
        if (rateDiff !== 0) return rateDiff;
        const eventDiff = Math.abs(right.delta.eventCount) - Math.abs(left.delta.eventCount);
        if (eventDiff !== 0) return eventDiff;
        return left.name.localeCompare(right.name);
    });
}

function compareItemRow(entry: ReviewComparisonItem): string {
    const rateTone = toneClass(entry.delta.completionRate);
    const aria = t("review.compareItemAria", {name: entry.name, current: formatNumber(entry.current.completionRate), baseline: formatNumber(entry.baseline.completionRate), delta: rateDeltaText(entry.delta.completionRate)});
    const eventDelta = entry.delta.eventCount !== 0 ? `<small>${escapeHtml(`${signedValue(entry.delta.eventCount)} ${t("review.statEvents")}`)}</small>` : "";
    return `<div class="lc-checkin__compare-item ${rateTone}" title="${escapeHtml(aria)}"><strong>${escapeHtml(entry.name)}</strong><span class="lc-checkin__compare-item-rate">${escapeHtml(formatNumber(entry.current.completionRate))}%</span><em>${escapeHtml(rateDeltaText(entry.delta.completionRate))}</em>${eventDelta}<i class="lc-checkin__compare-item-bar" aria-hidden="true"><span class="is-base" style="width:${Math.min(100, Math.max(0, entry.baseline.completionRate))}%"></span><span style="width:${Math.min(100, Math.max(0, entry.current.completionRate))}%"></span></i></div>`;
}

export function renderReviewCompareSection(comparison: ReviewComparison, embedded = false): string {
    const bothEmpty = comparison.items.length === 0
        && comparison.current.totalEvents === 0
        && comparison.baseline.totalEvents === 0;
    if (bothEmpty) {
        return `<section class="lc-checkin__compare is-empty" aria-label="${escapeHtml(t("review.compareAria"))}"><small>${escapeHtml(t("review.compareEmpty"))}</small></section>`;
    }
    if (embedded) return `<section class="lc-checkin__compare"><p class="review-scope-note">${escapeHtml(comparison.baseline.startDate)} ~ ${escapeHtml(comparison.baseline.endDate)}</p><div class="lc-checkin__compare-body">${compareSummaryChart(comparison)}${compareStats(comparison)}</div></section>`;
    return `<details class="lc-checkin__compare" aria-label="${escapeHtml(t("review.compareAria"))}"><summary><strong>${escapeHtml(t("review.compareTitle"))}</strong><span>${escapeHtml(comparison.baseline.startDate)} ~ ${escapeHtml(comparison.baseline.endDate)}</span><i aria-hidden="true">⌄</i></summary><div class="lc-checkin__compare-body">${compareSummaryChart(comparison)}${compareStats(comparison)}</div></details>`;
}

export function renderReviewCompareItems(comparison: ReviewComparison): string {
    const items = sortedCompareItems(comparison.items);
    const batchSize = 8;
    const first = items.slice(0, batchSize).map(compareItemRow).join("");
    const batches: string[] = [];
    for (let start = batchSize; start < items.length; start += batchSize) {
        const batch = items.slice(start, start + batchSize);
        const remaining = items.length - start;
        batches.push(`<details class="lc-checkin__compare-item-batch"><summary>${escapeHtml(t("review.compareMoreItems", {n: batch.length, remaining}))}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><div>${batch.map(compareItemRow).join("")}</div></details>`);
    }
    return first + batches.join("");
}
