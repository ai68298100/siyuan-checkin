/* 归档页视图（15.0-A 外置，延续 T-022 模式）：纯函数出 HTML，文案走 i18n，不做 IO。 */
import {t} from "../i18n";
import {dateKey, isScheduledToday} from "../model";
import {escapeHtml, formatScheduleLabel, renderIconMarkup} from "../shared";
import type {CheckinEvent, CheckinItem} from "../types";
import {renderPageShellHead} from "./page-shell";

/* T-1594：归档详情投影（纯函数）——原规则/关联/外部记录/恢复预览，只读聚合。 */
export interface ArchivedItemDetail {
    ruleLabel: string;
    targetLabel: string;
    linkedOccasionName?: string;
    anchorBlockId?: string;
    externalRefCount: number;
    willResumeToday: boolean;
}

export function buildArchivedItemDetails(
    items: readonly CheckinItem[],
    occasionNames: ReadonlyMap<string, string>,
    events: readonly CheckinEvent[],
    today: Date,
): ReadonlyMap<string, ArchivedItemDetail> {
    const refCounts = new Map<string, number>();
    for (const event of events) {
        if (!event.externalRef) continue;
        refCounts.set(event.itemId, (refCounts.get(event.itemId) || 0) + 1);
    }
    const details = new Map<string, ArchivedItemDetail>();
    for (const item of items) {
        if (!item.archived) continue;
        details.set(item.id, {
            ruleLabel: formatScheduleLabel(item.schedule),
            targetLabel: `${item.target} ${item.unit}`,
            ...(item.linkedOccasionId && occasionNames.get(item.linkedOccasionId) ? {linkedOccasionName: occasionNames.get(item.linkedOccasionId)!} : {}),
            ...(item.noteAnchor?.blockId ? {anchorBlockId: item.noteAnchor.blockId} : {}),
            externalRefCount: refCounts.get(item.id) || 0,
            willResumeToday: isScheduledToday(item, today),
        });
    }
    return details;
}

export interface ArchivedItemSummary {
    completedDays: number;
    /** ISO timestamp of the most recent record, when one exists. */
    lastRecordAt?: string;
}

/**
 * Build the archive event projection once. Archive rows must not scan the
 * complete event collection independently; this also keeps rendering pure.
 */
export function buildArchivedItemSummaries(
    items: readonly CheckinItem[],
    events: readonly CheckinEvent[],
    completedDaysForItem?: (item: CheckinItem) => number,
): ReadonlyMap<string, ArchivedItemSummary> {
    const eventsByItem = new Map<string, CheckinEvent[]>();
    for (const event of events) {
        const bucket = eventsByItem.get(event.itemId);
        if (bucket) bucket.push(event);
        else eventsByItem.set(event.itemId, [event]);
    }
    const summaries = new Map<string, ArchivedItemSummary>();
    for (const item of items) {
        if (!item.archived) continue;
        const bucket = eventsByItem.get(item.id) || [];
        let lastRecordAt: string | undefined;
        const completedDates = new Set<string>();
        for (const event of bucket) {
            if (event.localDate) completedDates.add(event.localDate);
            if (!lastRecordAt || event.occurredAt > lastRecordAt) lastRecordAt = event.occurredAt;
        }
        summaries.set(item.id, {
            completedDays: completedDaysForItem ? Math.max(0, completedDaysForItem(item)) : completedDates.size,
            ...(lastRecordAt ? {lastRecordAt} : {}),
        });
    }
    return summaries;
}

export interface ArchivedViewContext {
    items: CheckinItem[];
    summaries?: ReadonlyMap<string, ArchivedItemSummary>;
    /** T-1594 归档详情投影（原规则/关联/外部记录/恢复预览；可选：旧桩不渲染折叠）。 */
    details?: ReadonlyMap<string, ArchivedItemDetail>;
    query: string;
    appearance: string;
}

export function renderArchivedView(ctx: ArchivedViewContext): string {
    const archivedItems = ctx.items.filter((item) => item.archived);
    const query = ctx.query.trim().toLocaleLowerCase();
    const items = query ? archivedItems.filter((item) => [item.name, item.group, item.unit, item.icon].some((value) => value?.toLocaleLowerCase().includes(query))) : archivedItems;
    /* 归档时间倒序：最近归档的排在最前，便于回溯。 */
    items.sort((left, right) => {
        const leftStart = left.archivePeriods.find((period) => !period.endDate)?.startDate || "";
        const rightStart = right.archivePeriods.find((period) => !period.endDate)?.startDate || "";
        return rightStart.localeCompare(leftStart);
    });
    const rows = items.length ? items.map((item) => {
        const openPeriod = item.archivePeriods.find((period) => !period.endDate);
        const pausedLabel = openPeriod ? t("archived.pausedSince", {date: openPeriod.startDate}) : t("archived.paused");
        const archivedDays = openPeriod?.startDate ? Math.max(0, Math.round((Date.now() - new Date(openPeriod.startDate + "T00:00:00").getTime()) / 864e5)) : undefined;
        const groupLabel = item.group || t("review.ungrouped");
        const summary = ctx.summaries?.get(item.id);
        const completedLabel = summary ? t("archived.completedDays", {n: summary.completedDays}) : "";
        const lastRecordLabel = summary?.lastRecordAt ? t("archived.lastRecord", {date: new Date(summary.lastRecordAt).toLocaleString()}) : "";
        const archiveMeta = `${escapeHtml(groupLabel)} · ${escapeHtml(pausedLabel)}${archivedDays !== undefined ? ` · ${escapeHtml(t("archived.pausedDays", {n: archivedDays}))}` : ""}${completedLabel ? ` · ${escapeHtml(completedLabel)}` : ""}${lastRecordLabel ? ` · ${escapeHtml(lastRecordLabel)}` : ""}`;
        /* T-1594：行内详情折叠——原规则/关联/外部记录/恢复预览（恢复后是否重进今日排期）。 */
        const detail = ctx.details?.get(item.id);
        const detailList = detail ? `<ul class="lc-checkin__archived-detail-list" role="list"><li>${escapeHtml(t("archived.ruleLabel"))}：${escapeHtml(detail.ruleLabel)} · ${escapeHtml(detail.targetLabel)}</li>${detail.linkedOccasionName ? `<li>${escapeHtml(t("archived.linkedOccasion"))}：${escapeHtml(detail.linkedOccasionName)}</li>` : ""}${detail.anchorBlockId ? `<li>${escapeHtml(t("archived.anchorLabel"))}：<code>${escapeHtml(detail.anchorBlockId)}</code></li>` : ""}<li>${escapeHtml(t("archived.externalRecords", {n: detail.externalRefCount}))}</li><li>${escapeHtml(detail.willResumeToday ? t("archived.resumeToday") : t("archived.resumeOff"))}</li></ul>` : "";
        const detailsFold = detail ? `<details class="lc-checkin__archived-details" data-archived-details><summary>${t("archived.detailsSummary")}</summary>${detailList}</details>` : "";
        return `<article class="lc-checkin__history-row"><label class="lc-checkin__archived-select"><input type="checkbox" data-archived-select="${escapeHtml(item.id)}" aria-label="${escapeHtml(t("archived.selectAria", {name: item.name}))}" /></label><span class="lc-checkin__archived-icon" aria-hidden="true">${renderIconMarkup(item.icon)}</span><div class="lc-checkin__archived-main"><strong>${escapeHtml(item.name)}</strong><small>${archiveMeta}</small>${detailsFold}</div><button class="lc-checkin__text-button" type="button" data-action="restore-archived" data-restore-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(t("archived.restoreAria", {name: item.name}))}">${t("archived.restore")}</button><button class="lc-checkin__text-button" type="button" data-action="delete-archived" data-archived-delete="${escapeHtml(item.id)}" aria-label="${escapeHtml(t("archived.deleteAria", {name: item.name}))}">${t("archived.delete")}</button></article>`;
    }).join("") : query ? `<div class="lc-checkin__empty-description">${escapeHtml(t("archived.searchEmpty", {q: ctx.query.trim()}))}</div>` : `<div class="lc-checkin__empty-description">${t("archived.empty")}</div>`;
    const resultLabel = query ? t("archived.resultFiltered", {found: items.length, total: archivedItems.length}) : t("archived.resultTotal", {total: archivedItems.length});
    const bulkControls = items.length ? `<label class="lc-checkin__archived-select-all"><input type="checkbox" data-archived-select-all aria-label="${t("archived.selectAllAria")}" />${t("archived.selectAll")}</label><div class="lc-checkin__archived-bulk" data-archived-bulk-toolbar role="toolbar" aria-label="${t("archived.bulkToolbarAria")}" hidden><span data-archived-selected-count>0</span><button class="lc-checkin__text-button" type="button" data-action="bulk-restore-archived">${t("archived.bulkRestore")}</button></div><div class="lc-checkin__archived-danger" data-archived-danger hidden><span class="lc-checkin__source-category">${t("archived.dangerZone")}</span><small>${t("archived.dangerHint")}</small><button class="lc-checkin__text-button" type="button" data-action="bulk-delete-archived">${t("archived.bulkDelete")}</button></div>` : "";
    return `<div class="lc-checkin lc-checkin--history lc-checkin--archived" data-appearance="${escapeHtml(ctx.appearance)}">${renderPageShellHead({backAria: t("archived.backAria"), eyebrow: t("archived.eyebrow"), title: t("archived.title")})}<section class="lc-checkin__archived-tools" aria-label="${t("archived.searchAria")}"><div class="lc-checkin__archived-search" role="search"><span aria-hidden="true">⌕</span><input data-archived-search type="search" value="${escapeHtml(ctx.query)}" placeholder="${t("archived.searchPlaceholder")}" aria-label="${t("archived.searchAria")}" enterkeyhint="search" />${ctx.query ? `<button type="button" data-action="clear-archived-query" aria-label="${t("archived.clearSearch")}" title="${t("archived.clearSearchTitle")}">×</button>` : ""}</div><span class="lc-checkin__archived-result" role="status" aria-live="polite">${escapeHtml(resultLabel)}</span>${bulkControls}</section><main class="lc-checkin__history-list">${rows}</main></div>`;
}
