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

export function renderReviewCompareSection(comparison: ReviewComparison): string {
    const bothEmpty = comparison.items.length === 0
        && comparison.current.totalEvents === 0
        && comparison.baseline.totalEvents === 0;
    if (bothEmpty) {
        return `<section class="lc-checkin__compare is-empty" aria-label="${escapeHtml(t("review.compareAria"))}"><small>${escapeHtml(t("review.compareEmpty"))}</small></section>`;
    }
    return `<section class="lc-checkin__compare" aria-label="${escapeHtml(t("review.compareAria"))}"><header><strong>${escapeHtml(t("review.compareTitle"))}</strong><span>${escapeHtml(comparison.baseline.startDate)} ~ ${escapeHtml(comparison.baseline.endDate)}</span></header>${compareStats(comparison)}</section>`;
}

export function renderReviewCompareItems(comparison: ReviewComparison): string {
    return sortedCompareItems(comparison.items).map(compareItemRow).join("");
}
