/* 归档页视图（15.0-A 外置，延续 T-022 模式）：纯函数出 HTML，文案走 i18n，不做 IO。 */
import {t} from "../i18n";
import {escapeHtml, renderIconMarkup} from "../shared";
import type {CheckinEvent, CheckinItem} from "../types";

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
        return `<article class="lc-checkin__history-row"><span class="lc-checkin__archived-icon" aria-hidden="true">${renderIconMarkup(item.icon)}</span><div class="lc-checkin__archived-main"><strong>${escapeHtml(item.name)}</strong><small>${archiveMeta}</small></div><button class="lc-checkin__text-button" type="button" data-action="restore-archived" data-restore-id="${escapeHtml(item.id)}" aria-label="${t("archived.restoreAria", {name: item.name})}">${t("archived.restore")}</button><button class="lc-checkin__text-button" type="button" data-action="delete-archived" data-archived-delete="${escapeHtml(item.id)}" aria-label="${t("archived.deleteAria", {name: item.name})}">${t("archived.delete")}</button></article>`;
    }).join("") : query ? `<div class="lc-checkin__empty-description">${t("archived.searchEmpty", {q: ctx.query.trim()})}</div>` : `<div class="lc-checkin__empty-description">${t("archived.empty")}</div>`;
    const resultLabel = query ? t("archived.resultFiltered", {found: items.length, total: archivedItems.length}) : t("archived.resultTotal", {total: archivedItems.length});
    return `<div class="lc-checkin lc-checkin--history lc-checkin--archived" data-appearance="${escapeHtml(ctx.appearance)}"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("archived.backAria")}">‹</button><div><div class="lc-checkin__eyebrow">${t("archived.eyebrow")}</div><h1 class="lc-checkin__title">${t("archived.title")}</h1></div></header><section class="lc-checkin__archived-tools" role="search" aria-label="${t("archived.searchAria")}"><label class="lc-checkin__archived-search"><span aria-hidden="true">⌕</span><input data-archived-search type="search" value="${escapeHtml(ctx.query)}" placeholder="${t("archived.searchPlaceholder")}" aria-label="${t("archived.searchAria")}" enterkeyhint="search" />${ctx.query ? `<button type="button" data-action="clear-archived-query" aria-label="${t("archived.clearSearch")}" title="${t("archived.clearSearchTitle")}">×</button>` : ""}</label><span class="lc-checkin__archived-result" role="status" aria-live="polite">${escapeHtml(resultLabel)}</span></section><main class="lc-checkin__history-list">${rows}</main></div>`;
}
