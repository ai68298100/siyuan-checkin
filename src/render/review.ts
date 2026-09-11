/* 回顾页视图：从 index.ts 外置；依赖以 ReviewViewContext 显式传入。 */
import {t, getPluginLocale} from "../i18n";
import {dateKey, getEventDateKey, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";
import {escapeHtml, formatHistoryDate, formatNumber, renderRecordNote} from "../shared";
import {filterHistoryRecords, type HistorySortOrder, type HistorySourceFilter} from "../features/history-filter";
import {buildCustomSummaryContext, buildSummaryContext, type SummaryRange} from "../analytics";
import {buildYearHeatmap, buildWeeklyCompletionTrend, buildMonthlyEventTrend, renderBarChart, renderLineChart, renderYearHeatmap} from "../charts";
import {buildAchievements} from "../features/achievements";
import {renderUpcomingOccasionsView, renderCheckinLogView} from "./fragments";
import {uiIcon} from "../ui/icons";
import type {CheckinEvent, CheckinStore} from "../types";
import type {OccasionStore} from "../occasions";

const calendarWeekdays = (): string[] => [1, 2, 3, 4, 5, 6, 0].map((index) => t(`date.wd${index}`));

export interface ReviewViewContext {
    store: CheckinStore;
    occasionStore: OccasionStore;
    appearance: "light" | "dark";
    historyMonth: Date;
    selectedHistoryDate: string;
    historyQuery: string;
    historySource: HistorySourceFilter;
    historyOrder: HistorySortOrder;
    heatmapYearOffset: number;
    reviewFoldSections: Set<string>;
    summaryRange: SummaryRange;
    summaryCustomRange?: {startDate: string; endDate: string};
    summaryText?: string;
    summaryProvidersCount: number;
    editingHistoryNoteId?: string;
}

export function renderReviewView(ctx: ReviewViewContext): string {
    const eventsByDay = new Map<string, CheckinEvent[]>();
    ctx.store.events.forEach((event) => {
        const key = getEventDateKey(event);
        const dayEvents = eventsByDay.get(key);
        if (dayEvents) {
            dayEvents.push(event);
        } else {
            eventsByDay.set(key, [event]);
        }
    });
    const itemNames = new Map(ctx.store.items.map((item) => [item.id, item.name]));
    const year = ctx.historyMonth.getFullYear();
    const month = ctx.historyMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
    const activeItems = ctx.store.items;
    const today = dateKey(new Date());
    const calendarCells = [
        ...Array.from({length: leadingDays}, () => `<span class="lc-checkin__calendar-empty"></span>`),
        ...Array.from({length: daysInMonth}, (_, index) => {
            const date = new Date(year, month, index + 1);
            const key = dateKey(date);
            const scheduled = activeItems.filter((item) => isItemAvailableOnDate(item, date) && isScheduledToday(item, date));
            const completed = scheduled.filter((item) => isComplete(ctx.store, item, date)).length;
            const eventCount = eventsByDay.get(key)?.length || 0;
            const rate = scheduled.length ? completed / scheduled.length : 0;
            const level = rate >= 1 ? 4 : rate >= .66 ? 3 : rate > 0 ? 2 : eventCount ? 1 : 0;
            const future = key > today;
            const classes = [
                "lc-checkin__calendar-day",
                `is-level-${level}`,
                ctx.selectedHistoryDate === key ? "is-selected" : "",
                key === today ? "is-today" : "",
            ].filter(Boolean).join(" ");
            const label = `${formatHistoryDate(key)}，${completed}/${scheduled.length} 项完成，${eventCount} 条记录`;
            return `<button class="${classes}" type="button" data-history-date="${key}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${future ? "disabled" : ""}><span>${index + 1}</span>${eventCount ? `<b>${eventCount > 999 ? "999+" : eventCount}</b>` : ""}</button>`;
        }),
    ].join("");
    const selectedEvents = eventsByDay.get(ctx.selectedHistoryDate) || [];
    const selectedRecords = selectedEvents.map((event) => ({
        event,
        itemName: itemNames.get(event.itemId) || t("review.deletedItem"),
    }));
    const filteredRecords = filterHistoryRecords(selectedRecords, {
        query: ctx.historyQuery,
        source: ctx.historySource,
        order: ctx.historyOrder,
    });
    const filteredEvents = filteredRecords.map((record) => record.event);
    const totals = new Map<string, {name: string; unit: string; value: number}>();
    filteredEvents.forEach((event) => {
        const key = `${event.itemId}\u0000${event.unit}`;
        const current = totals.get(key);
        totals.set(key, {
            name: itemNames.get(event.itemId) || t("review.deletedItem"),
            unit: event.unit,
            value: (current?.value || 0) + event.value,
        });
    });
    const aggregateDetails = totals.size ? [...totals.values()].map((entry) => `<div class="lc-checkin__history-row"><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(formatNumber(entry.value))}${escapeHtml(entry.unit)}</span></div>`).join("") : "";
    const hasHistoryFilter = Boolean(ctx.historyQuery.trim()) || ctx.historySource !== "all";
    const eventDetails = filteredRecords.length ? `<div class="lc-checkin__history-events">${filteredRecords.map(({event, itemName}) => {
        const time = new Date(event.occurredAt).toLocaleTimeString(getPluginLocale(), {hour: "2-digit", minute: "2-digit"});
        const note = event.note ? `<small class="lc-checkin__history-event-note">${renderRecordNote(event.note)}</small>` : "";
        const noteEditor = ctx.editingHistoryNoteId === event.id ? `<textarea class="lc-checkin__history-note-editor" data-history-note-input="${escapeHtml(event.id)}" rows="2">${escapeHtml(event.note || "")}</textarea><button class="lc-checkin__text-button" type="button" data-save-history-note-id="${escapeHtml(event.id)}">保存备注</button>` : "";
        const photoThumb = event.attachment ? `<img class="lc-checkin__history-thumb" src="${event.attachment}" alt="打卡照片" loading="lazy" />` : "";
        const sourceLabel = t(`source.${event.source}`) || event.source;
        return `<div class="lc-checkin__history-event">${photoThumb}<div class="lc-checkin__history-event-main"><strong>${escapeHtml(itemName)}</strong><span>${escapeHtml(time)} · ${escapeHtml(sourceLabel)}</span>${note}${noteEditor}</div><span class="lc-checkin__history-event-value">${escapeHtml(formatNumber(event.value))}${escapeHtml(event.unit)}</span><div class="lc-checkin__history-event-actions">${ctx.store.items.some((item) => item.id === event.itemId && !item.archived) ? `<button class="lc-checkin__text-button" type="button" data-history-insights-id="${escapeHtml(event.itemId)}" aria-label="查看${escapeHtml(itemName)}复盘">复盘</button>` : ""}<button class="lc-checkin__text-button" type="button" data-edit-history-event-id="${escapeHtml(event.id)}" aria-label="编辑${escapeHtml(itemName)} ${escapeHtml(time)} 的备注">备注</button><button class="lc-checkin__text-button" type="button" data-history-event-id="${escapeHtml(event.id)}" aria-label="撤销${escapeHtml(itemName)} ${escapeHtml(time)} 的记录">撤销</button></div></div>`;
    }).join("")}</div>` : `<div class="lc-checkin__history-empty">${selectedEvents.length ? "没有符合当前筛选条件的记录" : "当天没有记录"}</div>`;
    const details = aggregateDetails + eventDetails;
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const nextDisabled = ctx.historyMonth >= currentMonth;
    const historySourceOptions = (["all", "manual", "tomato", "import", "api"] as HistorySourceFilter[]).map((value) => `<option value="${value}" ${ctx.historySource === value ? "selected" : ""}>${escapeHtml(t(`source.${value}`))}</option>`).join("");
    const historyOrderOptions = [["newest", "最新在前"], ["oldest", "最早在前"]] as const;
    const resultLabel = hasHistoryFilter ? `显示 ${filteredEvents.length} / ${selectedEvents.length} 条记录` : `${selectedEvents.length} 条记录`;
    const historyTools = `<details class="lc-checkin__history-filter-disclosure" ${hasHistoryFilter ? "open" : ""}><summary>${hasHistoryFilter ? t("review.searchOn") : t("review.searchTitle")}</summary><section class="lc-checkin__history-tools" role="search" aria-label="${t("review.searchAria")}"><label class="lc-checkin__history-search lc-checkin__search-field"><span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span><input data-history-search type="search" value="${escapeHtml(ctx.historyQuery)}" placeholder="${t("review.searchAria")}" aria-label="${t("review.searchAria")}" enterkeyhint="search" />${ctx.historyQuery ? `<button type="button" data-action="clear-history-query" aria-label="${t("review.clearSearch")}" title="${t("review.clearSearchTitle")}">×</button>` : ""}</label><div class="lc-checkin__history-filter-row"><label><span>${t("review.sourceLabel")}</span><select data-history-source aria-label="${t("review.sourceAria")}">${historySourceOptions}</select></label><label><span>${t("review.orderLabel")}</span><select data-history-order aria-label="${t("review.orderAria")}">${historyOrderOptions.map(([value, label]) => `<option value="${value}" ${ctx.historyOrder === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label></div></section></details>`;

    const summary = ctx.summaryCustomRange ? buildCustomSummaryContext(ctx.store, ctx.summaryCustomRange) : buildSummaryContext(ctx.store, ctx.summaryRange);
    const iconsById = new Map(ctx.store.items.map((item) => [item.id, item.icon]));
    const projectRows = summary.items.length ? summary.items.map((item) => {
        const quotaMeta = item.quota
            ? t("review.quotaPeriods", {done: item.quota.completedPeriods, elapsed: item.quota.elapsedPeriods, current: item.quota.current ? `${formatNumber(item.quota.current.progress)}/${formatNumber(item.quota.current.quota)}` : t("review.quotaNone")})
            : t("review.daysRatio", {done: item.completedDays, scheduled: item.scheduledDays, rate: item.completionRate});
        return `<button type="button" class="lc-checkin__review-item" data-review-insights-id="${escapeHtml(item.itemId)}"><span class="lc-checkin__review-item-icon" aria-hidden="true">${escapeHtml(iconsById.get(item.itemId) || "✓")}</span><strong>${escapeHtml(item.name)}</strong><span class="lc-checkin__review-item-meta">${escapeHtml(quotaMeta)}</span><i class="lc-checkin__review-item-bar" aria-hidden="true"><span style="width: ${Math.min(100, Math.max(0, item.completionRate))}%"></span></i></button>`;
    }).join("") : `<div class="lc-checkin__empty-description">${t("review.emptyProjects")}</div>`;
    const groupMap = new Map<string, {name: string; completed: number; scheduled: number}>();
    for (const item of summary.items) {
        const storeItem = ctx.store.items.find((candidate) => candidate.id === item.itemId);
        const group = storeItem?.group || t("review.ungrouped");
        const entry = groupMap.get(group) || {name: group, completed: 0, scheduled: 0};
        entry.completed += item.completedDays;
        entry.scheduled += item.scheduledDays;
        groupMap.set(group, entry);
    }
    const groupBars = [...groupMap.values()]
        .filter((entry) => entry.scheduled > 0)
        .sort((left, right) => right.completed / right.scheduled - left.completed / left.scheduled)
        .map((entry) => {
            const rate = Math.round((entry.completed / entry.scheduled) * 100);
            return `<div class="lc-checkin__balance-row"><strong>${escapeHtml(entry.name)}</strong><span>${entry.completed}/${entry.scheduled}</span><i class="lc-checkin__balance-bar"><span style="width:${Math.min(100, Math.round((entry.completed / Math.max(1, entry.scheduled)) * 100))}%"></span></i><em>${rate}%</em></div>`;
        }).join("");
    const heatmapYear = new Date().getFullYear() + ctx.heatmapYearOffset;
    const heatmap = buildYearHeatmap(ctx.store, heatmapYear);
    const weeklyTrend = buildWeeklyCompletionTrend(ctx.store, 12);
    const monthlyTrend = buildMonthlyEventTrend(ctx.store, 6);
    const achievements = buildAchievements(ctx.store);
    const earnedCount = achievements.filter((entry) => entry.achieved).length;
    const providerButton = ctx.summaryProvidersCount
        ? `<div class="lc-checkin__summary-agent"><span>${t("review.agentConnected")}</span><button class="lc-checkin__text-button" type="button" data-action="generate-summary">${t("review.agentGenerate")}</button></div>`
        : `<div class="lc-checkin__summary-agent is-unavailable" role="note"><span>${t("review.agentUnavailable")}</span></div>`;
    const generated = ctx.summaryText ? `<div class="lc-checkin__summary-text">${escapeHtml(ctx.summaryText)}</div>` : "";
    const tabs = (["day", "week", "month"] as SummaryRange[]).map((range) => `<button type="button" data-summary-range="${range}" class="${!ctx.summaryCustomRange && ctx.summaryRange === range ? "is-selected" : ""}">${range === "day" ? t("review.tabDay") : range === "month" ? t("review.tabMonth") : t("review.tabWeek")}</button>`).join("");
    const custom = `<details class="lc-checkin__custom-range-disclosure" ${ctx.summaryCustomRange ? "open" : ""}><summary>${ctx.summaryCustomRange ? t("review.customOn") : t("review.custom")}</summary><form class="lc-checkin__custom-range" data-custom-range><label><span>开始</span><input type="date" name="customStartDate" value="${escapeHtml(ctx.summaryCustomRange?.startDate || summary.startDate)}" required /></label><span class="lc-checkin__custom-range-separator">至</span><label><span>结束</span><input type="date" name="customEndDate" value="${escapeHtml(ctx.summaryCustomRange?.endDate || summary.endDate)}" required /></label><button type="submit" class="lc-checkin__text-button">应用</button></form></details>`;
    const fold = (id: string, title: string, body: string): string => {
        if (!body.trim()) return "";
        const open = ctx.reviewFoldSections.has(id);
        return `<details class="lc-checkin__review-fold" data-review-fold="${id}"${open ? " open" : ""}><summary><span>${title}</span><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><div class="lc-checkin__review-fold-body">${body}</div></details>`;
    };
    return `<div class="lc-checkin lc-checkin--review" data-appearance="${ctx.appearance}">
            <header class="lc-checkin__editor-header">
                <div><div class="lc-checkin__eyebrow">${t("review.eyebrow")}</div><h1 class="lc-checkin__title">${t("review.title")}</h1></div>
                <div class="lc-checkin__header-actions">
                    <div class="lc-checkin__range-tabs" role="tablist" aria-label="${t("review.rangeAria")}">${tabs}${custom}</div>
                    <button class="lc-checkin__text-button" type="button" data-action="copy-weekly-report">${t("review.copyReport")}</button>
                    <button class="lc-checkin__text-button" type="button" data-action="archived">${t("review.archived")}</button>
                    <button class="lc-checkin__small-button" type="button" data-action="export-json" aria-label="${t("review.exportJson")}" title="${t("review.exportJson")}">${uiIcon("summary")}</button>
                    <button class="lc-checkin__small-button" type="button" data-action="export-csv" aria-label="${t("review.exportCsv")}" title="${t("review.exportCsv")}">${uiIcon("history")}</button>
                </div>
            </header>
            <section class="lc-checkin__summary-stats" aria-label="范围统计"><div><strong>${summary.totalEvents}</strong><span>${t("review.statEvents")}</span></div><div><strong>${summary.completedItems}</strong><span>${t("review.statCompleted")}</span></div><div><strong>${summary.scheduledItems}</strong><span>${t("review.statScheduled")}</span></div></section>
            <div class="lc-checkin__review-layout">
                <div class="lc-checkin__review-calendar">
                    <div class="lc-checkin__month-nav"><button type="button" data-history-month="-1" aria-label="${t("review.prevMonth")}" title="${t("review.prevMonth")}">‹</button><strong>${t("date.monthYear", {year, month: month + 1})}</strong><button type="button" data-history-month="1" aria-label="${t("review.nextMonth")}" title="${t("review.nextMonth")}" ${nextDisabled ? "disabled" : ""}>›</button></div>
                    <div class="lc-checkin__calendar-weekdays">${calendarWeekdays().map((day) => `<span>${day}</span>`).join("")}</div>
                    <div class="lc-checkin__calendar">${calendarCells}</div>
                </div>
                <div class="lc-checkin__review-detail">
                    ${historyTools}
                    <div class="lc-checkin__history-result" role="status" aria-live="polite"><span>${resultLabel}</span>${hasHistoryFilter ? `<button class="lc-checkin__text-button" type="button" data-action="clear-history-filters">${t("review.clearFilters")}</button>` : ""}</div>
                    <section class="lc-checkin__history-selected"><div class="lc-checkin__history-date"><strong>${escapeHtml(formatHistoryDate(ctx.selectedHistoryDate))}</strong><span>${t("review.recordsCount", {n: filteredEvents.length})}</span></div>${details}</section>
                </div>
            </div>
            <details class="lc-checkin__year-heatmap" aria-label="${t("review.heatmapTitle")}">
                <summary><span class="lc-checkin__heatmap-nav" role="group"><button type="button" data-heatmap-year="-1" aria-label="${t("review.prevYear")}">‹</button><strong>${heatmapYear}</strong><button type="button" data-heatmap-year="1" aria-label="${t("review.nextYear")}"${ctx.heatmapYearOffset >= 0 ? " disabled" : ""}>›</button></span>${t("review.heatmapTitle")}</summary>
                <div class="lc-checkin__yearheatmap-scroll">${renderYearHeatmap(heatmap)}</div>
                <small class="lc-checkin__yearheatmap-total">${t("review.heatmapTotal", {year: heatmapYear, n: heatmap.total})}</small>
            </details>
            ${fold("trend", t("review.foldTrend"), `<div class="lc-checkin__trend-grid"><div class="lc-checkin__trend-card"><h3>${weeklyTrend.title}</h3>${renderLineChart(weeklyTrend)}</div><div class="lc-checkin__trend-card"><h3>${monthlyTrend.title}</h3>${renderBarChart(monthlyTrend)}</div></div>`)}
            <section class="lc-checkin__review-projects"><h2>${t("review.foldProjects")}</h2><div class="lc-checkin__review-project-list">${projectRows}</div></section>
            ${fold("log", t("review.foldLog"), renderCheckinLogView(ctx.store.events, ctx.store.items))}
            ${groupBars ? `<section class="lc-checkin__balance" aria-label="${t("review.balanceTitle")}"><h2>${t("review.balanceTitle")}</h2>${groupBars}</section>` : ""}
            ${fold("achievements", `成就 · ${earnedCount}/${achievements.length}`, `<div class="lc-checkin__achievement-grid">${achievements.map((entry) => `<div class="lc-checkin__achievement ${entry.achieved ? "is-achieved" : ""}" title="${escapeHtml(entry.description)}"><span class="lc-checkin__achievement-icon" aria-hidden="true">${entry.icon}</span><strong>${escapeHtml(entry.name)}</strong><small>${entry.achieved ? t("review.achieved") : `${entry.progress}/${entry.target}`}</small></div>`).join("")}</div>`)}
            ${fold("upcoming", t("review.foldUpcoming"), renderUpcomingOccasionsView(ctx.occasionStore))}
            ${generated}
            ${providerButton}
        </div>`;
}
