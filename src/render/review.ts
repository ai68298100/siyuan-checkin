/* 回顾页视图：从 index.ts 外置；依赖以 ReviewViewContext 显式传入。 */
import {t, getPluginLocale} from "../i18n";
import {dateKey, getEventDateKey, getEventsInDateRange, getEventsForDate, getItemRevisionForDate, isSkipEvent, getItemById, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";
import {calendarDateFromKey, escapeHtml, formatHistoryDate, formatNumber, renderRecordNote, renderIconMarkup} from "../shared";
import {filterHistoryRecords, type HistorySortOrder, type HistorySourceFilter} from "../features/history-filter";
import {buildCustomSummaryContext, buildSummaryContext, type SummaryRange, type ItemSummary, type SummaryContext} from "../analytics";
import {buildReviewComparison, getPreviousReviewRange} from "../features/review-comparison";
import {renderReviewCompareSection, renderReviewCompareItems} from "./review-compare";
import {buildYearHeatmap, renderBarChart, renderLineChart, renderYearHeatmap, summarizeAnalyticsSnapshot, summarizeTrend, type AnalyticsSnapshot} from "../charts";
import {buildAchievements} from "../features/achievements";
import {renderUpcomingOccasionsView} from "./fragments";
import type {CheckinEvent, CheckinStore} from "../types";
import type {OccasionStore} from "../occasions";
import {filterReminderEntries, projectOverdueOccurrenceHistory, projectReminderCenter, type ReminderFilter, type ReminderUserAction} from "../reminders";
import {buildLocalSummaryText} from "../features/local-summary";
import {buildHabitScoreSeries, collectHabitScoreDays, scheduleFrequency} from "../features/habit-score";
import {renderSuggestionWorkflowPanel} from "./suggestion-workflow";
import {buildReviewRhythm, projectPresentation} from "../features/review-presentation";
import {buildReviewPrompt} from "../features/review-assistant";

const calendarWeekdays = (): string[] => [1, 2, 3, 4, 5, 6, 0].map((index) => t(`date.wd${index}`));

export interface ReviewViewContext {
    reviewWorkspace?: "overview" | "records" | "analysis";
    historyScope?: "day" | "period";
    historyItemId?: string;
    historyPage?: number;
    reviewProjectPage?: number;
    reviewProjectOrder?: "attention" | "name";
    reviewTrend?: "weekly" | "monthly" | "daily" | "yearly";
    reviewStrengthItemId?: string;
    reviewAssistantGoal?: "summary" | "patterns" | "plan";
    agentCapability?: {state: "pending" | "registered" | "unsupported" | "failed"; count: number; error?: string};
    summaryProviderNames?: string[];
    summaryError?: string;
    summaryCacheState?: "current" | "stale" | "none";
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
    reviewFoldTouched: boolean;
    summaryRange: SummaryRange;
    summaryContext?: SummaryContext;
    summaryCustomRange?: {startDate: string; endDate: string};
    summaryText?: string;
    reportSections: import("../view-preferences").ReportSectionToggles;
    reportSource: string;
    suggestionWorkflow?: import("../features/suggestion-workflow").SuggestionWorkflowState;
    summaryRefreshing: boolean;
    summaryProvidersCount: number;
    analysisLastGeneratedAt?: string;
    analysisHistoryCount?: number;
    editingHistoryNoteId?: string;
    reminderFilter: ReminderFilter;
    reminderUserActions: ReminderUserAction[];
    analyticsSnapshot: AnalyticsSnapshot;
}

export function renderReviewView(ctx: ReviewViewContext): string {
    const analyticsSummary = summarizeAnalyticsSnapshot(ctx.analyticsSnapshot);
    const asOf = calendarDateFromKey(ctx.analyticsSnapshot.asOf);
    const itemNames = new Map(ctx.store.items.map(item => [item.id, item.name]));
    const workspace = ctx.reviewWorkspace || "overview";
    const isOpen = (id: string) => ctx.reviewFoldSections.has(id) || (!ctx.reviewFoldTouched && (id === "projects" || id === "trend"));
    // Closed sections contain no generated charts or record DOM. Opening them
    // re-renders through the normal binding path and retains focus/scroll.
    const fold = (id: string, title: string, body: () => string): string => {
        const open = isOpen(id);
        return `<details class="lc-checkin__review-fold" data-review-fold="${id}"${open ? " open" : ' data-review-lazy="true"'}><summary><span>${title}</span><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><div class="lc-checkin__review-fold-body">${open ? body() : ""}</div></details>`;
    };
    const pagination = (page: number, total: number, size: number, attr: string): string => {
        if (total <= size) return "";
        const pages = Math.ceil(total / size);
        return `<div class="review-pagination" role="group" aria-label="${t("review.pagination")}"><button type="button" ${attr}="${page - 1}" ${page === 0 ? "disabled" : ""}>${t("review.pagePrev")}</button><span role="status">${t("review.pageStatus", {page: page + 1, pages, total})}</span><button type="button" ${attr}="${page + 1}" ${page + 1 >= pages ? "disabled" : ""}>${t("review.pageNext")}</button></div>`;
    };
    const summary = ctx.summaryContext || (ctx.summaryCustomRange ? buildCustomSummaryContext(ctx.store, ctx.summaryCustomRange, asOf) : buildSummaryContext(ctx.store, ctx.summaryRange, asOf));
    const iconsById = new Map(ctx.store.items.map((item) => [item.id, item.icon]));
    const projectMetrics = new Map(summary.items.map(item => [item.itemId, projectPresentation(item)]));
    const coverage = (context: SummaryContext): SummaryContext => ({...context,
        completedItems: context.items.filter(item => item.completedDays > 0 || Boolean(item.quota?.completedPeriods) || item.quota?.current?.complete).length,
        scheduledItems: context.items.filter(item => item.scheduledDays > 0 || Boolean(item.quota?.elapsedPeriods) || Boolean(item.quota?.current)).length,
    });
    const viewSummary = coverage(summary);
    const completedItemCount = viewSummary.completedItems;
    const scheduledItemCount = viewSummary.scheduledItems;
    // Local priority suggestions compare daily opportunities, never a weekly
    // quota's progress against daily completion or a missing opportunity.
    const rankedSummaryItems = summary.items.filter(item => !item.quota && item.scheduledDays > 0).sort((a, b) => b.completionRate - a.completionRate);
    const attentionSummaryItem = rankedSummaryItems.length > 1
        ? [...rankedSummaryItems].reverse().find((entry) => getItemById(ctx.store, entry.itemId)?.priority !== "high")
        : undefined;
    const hasPeriodRecords = summary.totalEvents > 0 || completedItemCount > 0;
    /* Keep each sentence as a real text value and escape it once at the HTML
       boundary.  The previous inline interpolation escaped project names
       before composing the sentence, which made it difficult for the UI to
       expose the complete advice in a tooltip or a wrapped mobile layout. */
    const summaryAdvice = hasPeriodRecords
        ? (attentionSummaryItem ? t("review.heroAdviceFocus", {name: attentionSummaryItem.name}) : t("review.heroAdviceKeep"))
        : "";
    const summaryAttention = hasPeriodRecords && attentionSummaryItem
        ? t("review.heroAttention", {name: attentionSummaryItem.name, rate: attentionSummaryItem.completionRate})
        : "";
    const summaryGuidance = summaryAttention || summaryAdvice
        ? `<div class="lc-checkin__review-guidance">${summaryAttention ? `<small class="lc-checkin__review-attention" title="${escapeHtml(summaryAttention)}">${escapeHtml(summaryAttention)}</small>` : ""}${summaryAdvice ? `<small class="lc-checkin__review-advice" title="${escapeHtml(t("review.heroAdviceLabel", {advice: summaryAdvice}))}">${escapeHtml(t("review.heroAdviceLabel", {advice: summaryAdvice}))}</small>` : ""}</div>`
        : "";
    const renderRhythm = (): string => {
        const rhythm = buildReviewRhythm(ctx.store, summary, asOf);
        const days = rhythm.hasDailyItems ? rhythm.points.map(point => {
            const rate = point.scheduled ? point.completed / point.scheduled * 100 : 0;
            const state = point.scheduled ? (rate >= 100 ? "complete" : rate > 0 ? "partial" : "empty") : point.skipped ? "skipped" : "rest";
            const value = point.scheduled ? `${point.completed}/${point.scheduled}` : t(point.skipped ? "review.rhythmSkipped" : "review.rhythmRest");
            const label = t("review.rhythmAria", {date: point.date, done: point.completed, total: point.scheduled, skipped: point.skipped});
            return `<button type="button" class="is-${state}" data-review-rhythm-date="${point.date}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><time datetime="${point.date}">${point.date.slice(5).replace("-", "/")}</time><i aria-hidden="true"><b style="height:${rate}%"></b></i><small>${escapeHtml(value)}</small></button>`;
        }).join("") : "";
        return `<section class="lc-checkin__review-hero review-rhythm" aria-label="${t("review.rhythmTitle")}"><div class="review-rhythm-heading"><h2>${t("review.rhythmTitle")}</h2><span>${escapeHtml(t("review.rhythmRange", {start: rhythm.startDate, end: rhythm.endDate}))}</span></div>${days ? `<div class="review-rhythm-days" role="group" aria-label="${t("review.rhythmTitle")}">${days}</div><small class="review-rhythm-help">${t("review.rhythmHelp")}</small>` : `<p class="review-rhythm-help">${t("review.rhythmEmpty")}</p>`}</section>`;
    };
    const assistantEntry = `<button type="button" class="lc-checkin__text-button review-assistant-entry" data-action="review-assistant">${t("review.assistantEntry")} <span aria-hidden="true">↗</span></button>`;

    const renderRecords = (): string => {
    const year = ctx.historyMonth.getFullYear();
    const month = ctx.historyMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
    const activeItems = ctx.store.items;
    const today = ctx.analyticsSnapshot.asOf;
    const calendarCells = ctx.historyScope === "day" ? [
        ...Array.from({length: leadingDays}, () => `<span class="lc-checkin__calendar-empty"></span>`),
        ...Array.from({length: daysInMonth}, (_, index) => {
            const date = new Date(year, month, index + 1);
            const key = dateKey(date);
            const scheduled = activeItems.filter((item) => isItemAvailableOnDate(item, date) && isScheduledToday(item, date));
            const completed = scheduled.filter((item) => isComplete(ctx.store, item, date)).length;
            const dayEvents = getEventsForDate(ctx.store, key);
            const skipCount = dayEvents.filter((event) => isSkipEvent(event)).length;
            const eventCount = dayEvents.length - skipCount;
            /* T-1221：仅跳过（无任何真实完成）的日子用中性色，不算热度也不算空白。 */
            const skipOnly = skipCount > 0 && completed === 0 && eventCount === 0;
            const rate = scheduled.length ? completed / scheduled.length : 0;
            const level = rate >= 1 ? 4 : rate >= .66 ? 3 : rate > 0 ? 2 : eventCount ? 1 : 0;
            const future = key > today;
            const classes = [
                "lc-checkin__calendar-day",
                skipOnly ? "is-skip" : `is-level-${level}`,
                ctx.selectedHistoryDate === key ? "is-selected" : "",
                key === today ? "is-today" : "",
            ].filter(Boolean).join(" ");
            const label = t("review.calendarDayAria", {date: formatHistoryDate(key), done: completed, total: scheduled.length, events: eventCount}) + (skipCount ? ` · ${t("review.calendarSkipAria", {n: skipCount})}` : "");
            return `<button class="${classes}" type="button" data-history-date="${key}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${future ? "disabled" : ""}><span>${index + 1}</span>${skipCount && !eventCount ? `<b class="is-skip-mark">✕</b>` : eventCount ? `<b>${eventCount > 999 ? "999+" : eventCount}</b>` : ""}</button>`;
        }),
    ].join("") : "";
    const rangeEnd = calendarDateFromKey(summary.endDate);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    const selectedEvents = ctx.historyScope === "day"
        ? getEventsForDate(ctx.store, ctx.selectedHistoryDate)
        : getEventsInDateRange(ctx.store, summary.startDate, dateKey(rangeEnd));
    const selectedRecords = selectedEvents.map((event) => ({
        event,
        itemName: itemNames.get(event.itemId) || t("review.deletedItem"),
    }));
    const filteredRecords = filterHistoryRecords(selectedRecords.filter(record => !ctx.historyItemId || record.event.itemId === ctx.historyItemId), {
        query: ctx.historyQuery,
        source: ctx.historySource,
        order: ctx.historyOrder,
    });
    const filteredEvents = filteredRecords.map((record) => record.event);
    const totals = new Map<string, {name: string; unit: string; value: number}>();
    if (ctx.historyScope === "day") filteredEvents.forEach((event) => {
        if (isSkipEvent(event)) return;
        const key = `${event.itemId}\u0000${event.unit}`;
        const current = totals.get(key);
        totals.set(key, {
            name: itemNames.get(event.itemId) || t("review.deletedItem"),
            unit: event.unit,
            value: (current?.value || 0) + event.value,
        });
    });
    const aggregateDetails = totals.size ? `<div class="lc-checkin__history-aggregate" aria-label="${t("review.historyAggregate")}">${[...totals.values()].map((entry) => `<div class="lc-checkin__history-row"><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(formatNumber(entry.value))}${escapeHtml(entry.unit)}</span></div>`).join("")}</div>` : "";
    const hasHistoryFilter = Boolean(ctx.historyQuery.trim()) || ctx.historySource !== "all" || Boolean(ctx.historyItemId) || ctx.historyOrder !== "newest";
    const renderEvent = ({event, itemName}: {event: CheckinEvent; itemName: string}) => {
        const clock = new Date(event.occurredAt).toLocaleTimeString(getPluginLocale(), {hour: "2-digit", minute: "2-digit"});
        // The recorded calendar day is durable across device timezone changes;
        // use the same day for the displayed date and date-range filtering.
        const recordedDate = calendarDateFromKey(getEventDateKey(event)).toLocaleDateString(getPluginLocale(), {year: "numeric", month: "2-digit", day: "2-digit"});
        const time = ctx.historyScope === "day" ? clock : `${recordedDate} ${clock}`;
        const note = event.note ? `<small class="lc-checkin__history-event-note">${renderRecordNote(event.note)}</small>` : "";
        const noteEditor = ctx.editingHistoryNoteId === event.id ? `<textarea class="lc-checkin__history-note-editor" data-history-note-input="${escapeHtml(event.id)}" rows="2">${escapeHtml(event.note || "")}</textarea><button class="lc-checkin__text-button" type="button" data-save-history-note-id="${escapeHtml(event.id)}">${t("review.saveNote")}</button>` : "";
        const photoThumb = event.attachment ? `<img class="lc-checkin__history-thumb" src="${escapeHtml(event.attachment)}" alt="${t("review.logPhotoAlt")}" loading="lazy" />` : "";
        const sourceLabel = t(`source.${event.source}`) || event.source;
        /* T-1221：跳过行显示中性徽章而非数值列。 */
        const skipBadge = isSkipEvent(event) ? `<span class="lc-checkin__history-skip-badge">${escapeHtml(t("review.skipBadge"))}</span>` : "";
        const valueLabel = isSkipEvent(event) ? "" : `<span class="lc-checkin__history-event-value">${escapeHtml(formatNumber(event.value))}${escapeHtml(event.unit)}</span>`;
        return `<div class="lc-checkin__history-event${isSkipEvent(event) ? " is-skip" : ""}">${photoThumb}<div class="lc-checkin__history-event-main"><strong>${escapeHtml(itemName)}</strong><span><time datetime="${escapeHtml(event.occurredAt)}" title="${escapeHtml(time)}">${escapeHtml(clock)}</time> · ${escapeHtml(sourceLabel)}${skipBadge}</span>${note}${noteEditor}</div>${valueLabel}<div class="lc-checkin__history-event-actions">${ctx.store.items.some((item) => item.id === event.itemId && !item.archived) ? `<button class="lc-checkin__text-button" type="button" data-history-insights-id="${escapeHtml(event.itemId)}" aria-label="${escapeHtml(t("review.insightsActionAria", {name: itemName}))}">${t("review.insightsAction")}</button>` : ""}<button class="lc-checkin__text-button" type="button" data-edit-history-event-id="${escapeHtml(event.id)}" aria-label="${escapeHtml(t("review.noteActionAria", {name: itemName, time}))}">${t("review.noteAction")}</button><button class="lc-checkin__text-button" type="button" data-history-event-id="${escapeHtml(event.id)}" aria-label="${escapeHtml(t("review.undoActionAria", {name: itemName, time}))}">${t("review.undoAction")}</button></div></div>`;
    };
    const page = Math.min(Math.max(0, ctx.historyPage || 0), Math.max(0, Math.ceil(filteredRecords.length / 30) - 1));
    const pageRecords = filteredRecords.slice(page * 30, (page + 1) * 30);
    const eventRows = pageRecords.map((record, index) => {
        const day = getEventDateKey(record.event);
        const startsDay = ctx.historyScope !== "day" && (!index || getEventDateKey(pageRecords[index - 1].event) !== day);
        // Preserve timestamp ordering, including imported dates from other
        // timezones. Counts describe this visible run, never an entire day.
        let count = 0;
        if (startsDay) for (let cursor = index; cursor < pageRecords.length && getEventDateKey(pageRecords[cursor].event) === day; cursor++) count++;
        const heading = startsDay ? `<h3 class="review-record-day"><time datetime="${escapeHtml(day)}">${escapeHtml(formatHistoryDate(day))}</time><small>${t("review.recordDayCount", {n: count})}</small></h3>` : "";
        return heading + renderEvent(record);
    });
    const eventDetails = filteredRecords.length
        ? `<div class="lc-checkin__history-events">${eventRows.join("")}</div>${pagination(page, filteredRecords.length, 30, "data-history-page")}`
        : `<div class="lc-checkin__history-empty">${selectedEvents.length ? t("review.historyFilterEmpty") : t("review.historyDayEmpty")}</div>`;
    const currentMonth = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
    const nextDisabled = ctx.historyMonth >= currentMonth;
    const historySourceOptions = (["all", "manual", "tomato", "import", "api"] as HistorySourceFilter[]).map((value) => `<option value="${value}" ${ctx.historySource === value ? "selected" : ""}>${escapeHtml(t(`source.${value}`))}</option>`).join("");
    const historyOrderOptions = [["newest", "review.orderNewest"], ["oldest", "review.orderOldest"]] as const;
    const resultLabel = hasHistoryFilter ? t("review.historyResultFiltered", {shown: filteredEvents.length, total: selectedEvents.length}) : t("review.historyResultAll", {total: selectedEvents.length});
    const itemOptions = ctx.store.items.map(item => `<option value="${escapeHtml(item.id)}" ${ctx.historyItemId === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
    const hasAdvancedHistoryFilter = Boolean(ctx.historyItemId) || ctx.historySource !== "all" || ctx.historyOrder !== "newest";
    const historyTools = `<section class="review-record-tools" role="search" aria-label="${t("review.searchAria")}"><label class="lc-checkin__history-search lc-checkin__search-field"><span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span><input data-history-search type="search" value="${escapeHtml(ctx.historyQuery)}" placeholder="${t("review.searchAria")}" aria-label="${t("review.searchAria")}" enterkeyhint="search" />${ctx.historyQuery ? `<button type="button" data-action="clear-history-query" aria-label="${t("review.clearSearch")}" title="${t("review.clearSearchTitle")}">×</button>` : ""}</label><details class="lc-checkin__history-filter-disclosure review-more-filters"${hasAdvancedHistoryFilter ? " open" : ""}><summary>${hasAdvancedHistoryFilter ? t("review.moreFiltersOn") : t("review.moreFilters")}</summary><div class="lc-checkin__history-filter-row"><label><span>${t("review.recordItem")}</span><select data-history-item aria-label="${t("review.recordItem")}"><option value="">${t("review.allItems")}</option>${itemOptions}</select></label><label><span>${t("review.sourceLabel")}</span><select data-history-source aria-label="${t("review.sourceAria")}">${historySourceOptions}</select></label><label><span>${t("review.orderLabel")}</span><select data-history-order aria-label="${t("review.orderAria")}">${historyOrderOptions.map(([value, label]) => `<option value="${value}" ${ctx.historyOrder === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label></div></details></section>`;


    return `<div class="review-record-scopes" role="group" aria-label="${t("review.recordScope")}">
        <button type="button" data-history-scope="period" aria-pressed="${ctx.historyScope !== "day"}">${t("review.scopePeriod")}</button>
        <button type="button" data-history-scope="day" aria-pressed="${ctx.historyScope === "day"}">${t("review.scopeDay")}</button>
    </div><p class="review-scope-note">${escapeHtml(ctx.historyScope === "day" ? t("review.dayScopeHint", {date: ctx.selectedHistoryDate}) : t("review.periodScopeHint", {start: summary.startDate, end: summary.endDate}))}</p>
    <div class="lc-checkin__review-layout ${ctx.historyScope === "day" ? "" : "is-period"}">
        ${ctx.historyScope === "day" ? `<div class="lc-checkin__review-calendar">
            <div class="lc-checkin__month-nav"><button type="button" data-history-month="-1" aria-label="${t("review.prevMonth")}">‹</button><strong>${t("date.monthYear", {year, month: month + 1})}</strong><button type="button" data-history-month="1" aria-label="${t("review.nextMonth")}" ${nextDisabled ? "disabled" : ""}>›</button></div>
            <div class="lc-checkin__calendar-weekdays">${calendarWeekdays().map(day => `<span>${day}</span>`).join("")}</div><div class="lc-checkin__calendar">${calendarCells}</div></div>` : ""}
        <div class="lc-checkin__review-detail">
            ${historyTools}${hasHistoryFilter ? `<div class="lc-checkin__history-result" role="status" aria-live="polite"><span>${resultLabel}</span><button class="lc-checkin__text-button" type="button" data-action="clear-history-filters">${t("review.clearFilters")}</button></div>` : ""}
            ${ctx.historyScope === "day" && aggregateDetails ? `<details class="review-day-totals"><summary>${t("review.historyAggregate")}</summary>${aggregateDetails}</details>` : ""}
            <section class="lc-checkin__history-selected"><div class="lc-checkin__history-date"><strong>${ctx.historyScope === "day" ? escapeHtml(formatHistoryDate(ctx.selectedHistoryDate)) : t("review.scopePeriod")}</strong><span>${t("review.recordsCount", {n: filteredEvents.length})}</span></div>${eventDetails}</section>
        </div></div>`;

    };
    const renderProjectRow = (item: ItemSummary): string => {
        const metric = projectMetrics.get(item.itemId) || projectPresentation(item);
        const stored = getItemById(ctx.store, item.itemId);
        const revision = stored ? getItemRevisionForDate(stored, calendarDateFromKey(summary.endDate)) : undefined;
        const unit = metric.mode === "closedQuota" ? t("review.projectPeriods")
            : metric.mode === "currentQuota" && revision?.schedule.quota?.countMode === "value" ? revision.unit : t("common.days");
        const label = t(({daily: "review.projectDaily", currentQuota: "review.projectCurrentQuota", closedQuota: "review.projectClosedQuota", noSchedule: "review.projectNoSchedule"} as const)[metric.mode]);
        const progress = metric.rate === null ? "" : t("review.projectProgress", {done: formatNumber(metric.completed), total: formatNumber(metric.total), unit});
        const quotaRange = item.quota?.current ? t("review.projectQuotaRange", {start: item.quota.current.startDate, end: item.quota.current.endDate}) : "";
        const history = item.quota?.elapsedPeriods && metric.mode === "currentQuota"
            ? t("review.projectQuotaHistory", {done: item.quota.completedPeriods, total: item.quota.elapsedPeriods}) : "";
        return `<button type="button" class="lc-checkin__review-item${metric.rate === null ? " is-unplanned" : ""}" data-review-insights-id="${escapeHtml(item.itemId)}" data-review-project-mode="${metric.mode}"><span class="lc-checkin__review-item-icon" aria-hidden="true">${renderIconMarkup(iconsById.get(item.itemId) || "✓")}</span><strong>${escapeHtml(item.name)}</strong><span class="lc-checkin__review-item-meta">${metric.rate !== null ? `<b class="review-project-rate">${metric.rate}%</b> ${escapeHtml(progress)}` : ""}<small class="review-project-kind">${escapeHtml(label)}${quotaRange ? ` · ${escapeHtml(quotaRange)}` : ""}${history ? ` · ${escapeHtml(history)}` : ""}</small></span>${metric.rate !== null ? `<i class="lc-checkin__review-item-bar" aria-hidden="true"><span style="width: ${metric.rate}%"></span></i>` : ""}</button>`;
    };
    const renderProjects = (): string => {
    const sortedProjects = [...summary.items].sort((a, b) => ctx.reviewProjectOrder === "name"
        ? a.name.localeCompare(b.name, getPluginLocale())
        : (projectMetrics.get(a.itemId)?.rate ?? 101) - (projectMetrics.get(b.itemId)?.rate ?? 101) || a.name.localeCompare(b.name, getPluginLocale()));
    const projectPage = Math.min(Math.max(0, ctx.reviewProjectPage || 0), Math.max(0, Math.ceil(sortedProjects.length / 8) - 1));
    const projectRows = sortedProjects.length ? sortedProjects.slice(projectPage * 8, (projectPage + 1) * 8).map(renderProjectRow).join("") : `<div class="lc-checkin__empty-description">${t("review.emptyProjects")}</div>`;

        return `<div class="review-project-tools"><label>${t("review.projectSort")} <select data-review-project-order><option value="attention" ${ctx.reviewProjectOrder !== "name" ? "selected" : ""}>${t("review.sortAttention")}</option><option value="name" ${ctx.reviewProjectOrder === "name" ? "selected" : ""}>${t("review.sortName")}</option></select></label><small>${t("review.projectScope")}</small></div><section class="lc-checkin__review-projects"><div class="lc-checkin__review-project-list">${projectRows}</div></section>${pagination(projectPage, sortedProjects.length, 8, "data-review-project-page")}`;
    };
    const renderComparison = (): string => {
        const previousRange = getPreviousReviewRange({startDate: summary.startDate, endDate: summary.endDate});
        const previous = previousRange ? buildCustomSummaryContext(ctx.store, previousRange, asOf) : undefined;
        // Quota progress and daily opportunities have different denominators;
        // keep record comparisons, without presenting a meaningless rate delta.
        const nonComparableRateIds = new Set([...summary.items, ...(previous?.items || [])].filter(item => item.quota).map(item => item.itemId));
        const comparison = previous ? buildReviewComparison(viewSummary, coverage(previous)) : undefined;
        return comparison ? `${renderReviewCompareSection(comparison, true)}<div class="lc-checkin__compare-item-list">${renderReviewCompareItems(comparison, {nonComparableRateIds})}</div>` : t("review.compareEmpty");
    };
    const renderStrength = (): string => {
    /* T-1227 强度曲线：近 30 天每项目强度（0~100），与建议引擎共用 habit-score 实现。 */
    const strengthEndExclusive = dateKey(new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() + 1));
    const strengthStart = dateKey(new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - 29));
    // Strength has its own 30-day scope, including its candidate list. Changing
    // the overview period must not change the mean or invalidate a selection.
    const strengthItems = buildCustomSummaryContext(ctx.store, {startDate: strengthStart, endDate: ctx.analyticsSnapshot.asOf}, asOf).items;
    let strengthCount = 0;
    let strengthSum = 0;
    const strengthSumPoints = new Map<string, {sum: number; count: number}>();
    const selectedStrength = strengthItems.some(item => item.itemId === ctx.reviewStrengthItemId)
        ? getItemById(ctx.store, ctx.reviewStrengthItemId)
        : undefined;
    let selectedChart = "";
    strengthItems.filter(entry => !selectedStrength || entry.itemId === selectedStrength.id).forEach((entry) => {
        const storeItem = getItemById(ctx.store, entry.itemId);
        if (!storeItem) return "";
        const series = buildHabitScoreSeries(
            collectHabitScoreDays(ctx.store, storeItem, strengthStart, strengthEndExclusive),
            scheduleFrequency(getItemRevisionForDate(storeItem, asOf).schedule),
        );
        if (!series.length) return "";
        strengthCount += 1;
        const current = series[series.length - 1].score;
        strengthSum += current;
        for (const point of series) {
            const bucket = strengthSumPoints.get(point.date) || {sum: 0, count: 0};
            bucket.sum += point.score;
            bucket.count += 1;
            strengthSumPoints.set(point.date, bucket);
        }
        /* Individual selection generates just this project's chart. */
        if (selectedStrength) selectedChart = renderLineChart({title: storeItem.name, unit: "%", points: series.map(point => ({label: point.date.slice(5), value: point.score}))}, {width: 320, height: 150, labelStride: 7});
    });
    /* The average and individual selectors each display a single chart. */
    const averagedStrengthSeries = [...strengthSumPoints.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, bucket]) => ({label: date.slice(5), value: Math.round((bucket.sum / bucket.count) * 10) / 10}));
    const strengthOverview = !selectedStrength && averagedStrengthSeries.length
        ? renderLineChart({title: t("review.foldStrength"), unit: "%", points: averagedStrengthSeries}, {width: 320, height: 150, labelStride: 7})
        : "";
    const strengthAverage = strengthCount ? Math.round((strengthSum / strengthCount) * 10) / 10 : 0;


        const options = strengthItems.map(item => `<option value="${escapeHtml(item.itemId)}" ${selectedStrength?.id === item.itemId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
        return `<label class="review-project-tools">${t("review.strengthView")}<select data-review-strength-item><option value="" ${selectedStrength ? "" : "selected"}>${t("review.strengthAverage")}</option>${options}</select></label><p class="review-scope-note">${t("review.strengthScope", {start: strengthStart, end: ctx.analyticsSnapshot.asOf})}</p><div class="lc-checkin__strength-overview"><header><strong>${escapeHtml(selectedStrength?.name || t("review.strengthAverage"))}</strong><em>${t("review.strengthPoints", {n: strengthAverage})}</em></header>${selectedStrength ? selectedChart : strengthOverview}</div>`;
    };
    const renderBalance = (): string => {
    const groupMap = new Map<string, {name: string; completed: number; scheduled: number}>();
    for (const item of summary.items) {
        if (item.quota) continue;
        const storeItem = getItemById(ctx.store, item.itemId);
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

        const quotaItems = summary.items.filter(item => item.quota);
        const visibleQuota = quotaItems.slice(0, 8).map(renderProjectRow).join("");
        const remainingQuota = quotaItems.slice(8);
        return `<h3 class="review-section-heading">${t("review.balanceDaily")}</h3><section class="lc-checkin__balance">${groupBars || t("review.emptyProjects")}</section>${quotaItems.length ? `<h3 class="review-section-heading">${t("review.balanceQuota")}</h3><div class="lc-checkin__review-project-list">${visibleQuota}</div>${remainingQuota.length ? `<details class="review-quota-more"><summary>${t("review.expandAll", {n: quotaItems.length})}</summary><div class="lc-checkin__review-project-list">${remainingQuota.map(renderProjectRow).join("")}</div></details>` : ""}` : ""}`;
    };
    const renderHeatmap = (): string => {
        const heatmapYear = Number(ctx.analyticsSnapshot.asOf.slice(0, 4)) + ctx.heatmapYearOffset;
        const heatmap = buildYearHeatmap(ctx.store, heatmapYear);
        return `<section class="lc-checkin__year-heatmap"><div class="lc-checkin__heatmap-nav" role="group"><button type="button" data-heatmap-year="-1" aria-label="${t("review.prevYear")}">‹</button><strong>${heatmapYear}</strong><button type="button" data-heatmap-year="1" aria-label="${t("review.nextYear")}"${ctx.heatmapYearOffset >= 0 ? " disabled" : ""}>›</button></div><div class="lc-checkin__yearheatmap-scroll">${renderYearHeatmap(heatmap)}</div><div class="lc-checkin__yearheatmap-meta"><small>${t("review.heatmapHint")}</small><span class="lc-checkin__yearheatmap-legend" aria-label="${t("review.heatmapLegend")}"><em>${t("review.heatmapLess")}</em>${[0,1,2,3,4].map(level => `<i class="is-level-${level}" aria-hidden="true"></i>`).join("")}<em>${t("review.heatmapMore")}</em><i class="is-skip" aria-hidden="true"></i><em>${t("review.heatmapSkip")}</em></span><small>${t("review.heatmapTotal", {year: heatmapYear, n: heatmap.total})}</small></div></section>`;
    };
    const renderTrends = (): string => {
    const weeklyTrend = ctx.analyticsSnapshot.weekly;
    const monthlyTrend = ctx.analyticsSnapshot.monthly;
    const dailyTrend = ctx.analyticsSnapshot.daily;
    const yearlyTrend = ctx.analyticsSnapshot.yearly;
    const trendCard = (series: typeof weeklyTrend, chart: string, helper = t("review.trendCompared")) => {
        const stats = summarizeTrend(series);
        const direction = stats.delta > 0 ? "↑" : stats.delta < 0 ? "↓" : "→";
        return `<div class="lc-checkin__trend-card"><header><div><h3>${escapeHtml(series.title)}</h3><small>${escapeHtml(helper)}</small></div><strong>${stats.current}${escapeHtml(series.unit)}</strong></header><div class="lc-checkin__trend-stats"><span><small>${t("review.trendAverage")}</small><b>${stats.average}${escapeHtml(series.unit)}</b></span><span><small>${t("review.trendBest")}</small><b>${stats.best}${escapeHtml(series.unit)}</b></span><span class="is-${stats.delta > 0 ? "up" : stats.delta < 0 ? "down" : "flat"}"><small>${t("review.trendChange")}</small><b>${direction} ${Math.abs(stats.delta)}${escapeHtml(series.unit)}</b></span></div>${chart}</div>`;
    };

        const key = ctx.reviewTrend || "weekly";
        const series = {weekly: weeklyTrend, monthly: monthlyTrend, daily: dailyTrend, yearly: yearlyTrend}[key];
        const chart = key === "weekly" || key === "daily" ? renderLineChart(series, {labelStride: key === "daily" ? 7 : 3}) : renderBarChart(series);
        const dataTable = `<details class="review-chart-data"><summary>${t("review.chartData")}</summary><div class="review-chart-table"><table><caption>${escapeHtml(series.title)}</caption><thead><tr><th scope="col">${t("review.chartDate")}</th><th scope="col">${t("review.chartValue")} (${escapeHtml(series.unit)})</th></tr></thead><tbody>${series.points.map(point => `<tr><th scope="row">${escapeHtml(point.label)}</th><td>${escapeHtml(formatNumber(point.value))}</td></tr>`).join("")}</tbody></table></div></details>`;
        return `<label class="review-analysis-trend">${t("review.trendMetric")}<select data-review-trend>${(["weekly", "monthly", "daily", "yearly"] as const).map(name => `<option value="${name}" ${key === name ? "selected" : ""}>${escapeHtml(ctx.analyticsSnapshot[name].title)}</option>`).join("")}</select></label><p class="review-scope-note">${t("review.trendScope")}</p><div class="lc-checkin__trend-grid">${trendCard(series, chart, key === "daily" ? t("review.trendDailyHint") : t("review.trendCompared"))}</div>${dataTable}`;
    };
    const renderReminders = (): string => {
    const rawReminders = filterReminderEntries(projectReminderCenter(ctx.store, ctx.occasionStore, asOf, ctx.reminderUserActions), ctx.reminderFilter);
    /* 同一打卡只保留最新实例，累计次数以内联摘要展示，避免提醒列表纵向膨胀。 */
    const reminderByTitle = new Map<string, (typeof rawReminders)[number] & {occurrenceCount?: number}>();
    rawReminders.forEach((entry) => {
        const key = `${entry.source}:${entry.sourceId}`;
        const previous = reminderByTitle.get(key);
        if (!previous || entry.dueDate >= previous.dueDate) reminderByTitle.set(key, {...entry, occurrenceCount: (previous?.occurrenceCount ?? 0) + 1});
        else previous.occurrenceCount = (previous.occurrenceCount ?? 1) + 1;
    });
    const reminders = [...reminderByTitle.values()];
    /* 11.0-C 延期/跳过：未完成条目给入口，已延期/已跳过条目只留恢复，已完成是终态不给动作。 */
    const reminderActionButtons = (entry: (typeof reminders)[number]): string => {
        const id = escapeHtml(entry.id);
        const name = escapeHtml(entry.title);
        if (entry.status === "snoozed" || entry.status === "skipped") {
            return `<span class="lc-checkin__reminder-actions" role="group" aria-label="${escapeHtml(t("review.reminderActionsAria"))}"><button class="lc-checkin__reminder-action" type="button" data-reminder-action="restore" data-reminder-id="${id}" aria-label="${escapeHtml(t("review.reminderRestoreAria", {name: entry.title}))}">${t("review.reminderRestore")}</button></span>`;
        }
        if (entry.status === "completed") return "";
        return `<span class="lc-checkin__reminder-actions" role="group" aria-label="${escapeHtml(t("review.reminderActionsAria"))}"><button class="lc-checkin__reminder-action" type="button" data-reminder-action="snooze" data-reminder-id="${id}" aria-label="${escapeHtml(t("review.reminderSnoozeAria", {name: entry.title}))}">${t("review.reminderSnooze")}</button><button class="lc-checkin__reminder-action" type="button" data-reminder-action="skip" data-reminder-id="${id}" aria-label="${escapeHtml(t("review.reminderSkipAria", {name: entry.title}))}">${t("review.reminderSkip")}</button></span>`;
    };
    const reminderRows = reminders.length ? reminders.map((entry) => {
        /* 延期/跳过是"对该次实例"的动作，补上原日期才说得清指的是哪天。 */
        const dueLabel = formatHistoryDate(entry.dueDate);
        const timing = entry.status === "completed" ? t("review.remindersCompleted")
            : entry.status === "overdue" ? t("review.remindersOverdue")
            : entry.status === "snoozed" ? `${t("review.remindersSnoozed")} · ${dueLabel}`
            : entry.status === "skipped" ? `${t("review.remindersSkipped")} · ${dueLabel}`
            : entry.daysUntil === 0 ? t("review.remindersToday") : t("review.remindersUpcoming", {n: entry.daysUntil});
        const source = entry.source === "checkin" ? t("review.remindersCheckin") : t("review.remindersOccasion");
        const count = (entry.occurrenceCount ?? 1) > 1 ? ` · ${(entry.occurrenceCount ?? 1)} 次` : "";
        return `<article class="lc-checkin__reminder-row is-${entry.status}" data-reminder-id="${escapeHtml(entry.id)}"><span class="lc-checkin__reminder-source">${escapeHtml(source)}</span><strong>${escapeHtml(entry.title)}</strong><span class="lc-checkin__reminder-timing">${escapeHtml(timing)}${count}</span>${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ""}${reminderActionButtons(entry)}</article>`;
    }).join("") : `<div class="lc-checkin__empty-description">${t("review.remindersEmpty")}</div>`;
    /* 逾期历史：过去发生、从未补记的日期（T-100 投影），可一键补记。 */
    const overdueHistory = (ctx.reminderFilter === "all" || ctx.reminderFilter === "overdue" ? projectOverdueOccurrenceHistory(ctx.occasionStore, asOf) : []).slice(0, 12);
    /* 逾期历史折叠（T-117）：默认只展示前 4 条，其余折叠进「展开全部」。 */
    const OVERDUE_VISIBLE = 4;
    const overdueRow = (entry: {occasionId: string; occurrenceDate: string; name: string; overdueDays: number}) => `<article class="lc-checkin__reminder-row is-overdue" data-overdue-occasion="${escapeHtml(entry.occasionId)}" data-overdue-date="${escapeHtml(entry.occurrenceDate)}"><span class="lc-checkin__reminder-source">${escapeHtml(t("review.remindersOccasion"))}</span><strong>${escapeHtml(entry.name)}</strong><span class="lc-checkin__reminder-timing">${escapeHtml(entry.occurrenceDate)} · ${t("review.overdueDays", {n: entry.overdueDays})}</span><button class="lc-checkin__small-button" type="button" data-occasion-complete data-occasion-id="${escapeHtml(entry.occasionId)}" data-occasion-date="${escapeHtml(entry.occurrenceDate)}" aria-label="${t("review.catchUpAria", {name: entry.name, date: entry.occurrenceDate})}">${t("review.catchUp")}</button></article>`;
    const overdueVisibleRows = overdueHistory.slice(0, OVERDUE_VISIBLE).map(overdueRow).join("");
    const overdueMoreRows = overdueHistory.slice(OVERDUE_VISIBLE).map(overdueRow).join("");
    const overdueHistorySection = overdueHistory.length ? `<div class="lc-checkin__overdue-history"><h3>${t("review.overdueHistory")} · ${overdueHistory.length}</h3>${overdueVisibleRows}${overdueMoreRows ? `<div data-overdue-more hidden>${overdueMoreRows}</div><button class="lc-checkin__text-button" type="button" data-overdue-expand>${t("review.expandAll", {n: overdueHistory.length})}</button>` : ""}</div>` : "";

        return `<section class="lc-checkin__reminder-center" aria-labelledby="lc-reminder-center-title"><div class="lc-checkin__reminder-heading"><h2 id="lc-reminder-center-title">${t("review.remindersTitle")}</h2><select data-reminder-filter aria-label="${t("review.remindersTitle")}"><option value="all" ${ctx.reminderFilter === "all" ? "selected" : ""}>${t("review.remindersTitle")}</option><option value="overdue" ${ctx.reminderFilter === "overdue" ? "selected" : ""}>${t("review.remindersOverdue")}</option><option value="today" ${ctx.reminderFilter === "today" ? "selected" : ""}>${t("review.remindersToday")}</option><option value="upcoming" ${ctx.reminderFilter === "upcoming" ? "selected" : ""}>${t("review.remindersUpcoming", {n: 1})}</option><option value="completed" ${ctx.reminderFilter === "completed" ? "selected" : ""}>${t("review.remindersCompleted")}</option></select></div><div class="lc-checkin__reminder-list">${reminderRows}</div>${overdueHistorySection}</section>`;
    };
    const renderAwards = (): string => {
        const achievements = buildAchievements(ctx.store, asOf);
    const earnedCount = achievements.filter((entry) => entry.achieved).length;
    const achievementCategories = (["milestone", "consistency", "quality", "reflection", "rhythm"] as const).map((category) => {
        const entries = achievements.filter((entry) => entry.category === category);
        const earned = entries.filter((entry) => entry.achieved).length;
        const cards = entries.map((entry) => `<div class="lc-checkin__achievement ${entry.achieved ? "is-achieved" : ""}" title="${escapeHtml(entry.description)}"><span class="lc-checkin__achievement-icon" aria-hidden="true">${entry.icon}</span><strong>${escapeHtml(entry.name)}</strong><small>${entry.achieved ? t("review.achieved") : `${Math.min(entry.progress, entry.target)}/${entry.target}`}</small></div>`).join("");
        return `<details class="lc-checkin__achievement-category"${category === "milestone" ? " open" : ""}><summary><span>${t(`review.achievementCategory.${category}`)}</span><em>${earned}/${entries.length}</em><i aria-hidden="true">⌄</i></summary><div class="lc-checkin__achievement-grid">${cards}</div></details>`;
    }).join("");

        return `<p class="review-scope-note">${t("review.lifetimeScope")} · ${earnedCount}/${achievements.length}</p><div class="lc-checkin__achievement-categories">${achievementCategories}</div>`;
    };
    const renderReport = (): string => {
        const capability = ctx.agentCapability;
        const agentStatus = capability?.state === "registered" ? t("review.assistantRegistered", {n: capability.count})
            : t(capability?.state === "failed" ? "review.assistantFailed" : capability?.state === "pending" ? "review.assistantPending" : "review.assistantUnsupported");
        const providerStatus = ctx.summaryProvidersCount ? (ctx.summaryProviderNames?.join("、") || t("review.assistantProviderConnected", {n: ctx.summaryProvidersCount})) : t("review.assistantNoProvider");
        const goal = ctx.reviewAssistantGoal || "summary";
        const prompt = buildReviewPrompt(summary, goal);
        const providerButton = ctx.summaryProvidersCount ? `<button class="lc-checkin__text-button" type="button" data-action="generate-summary" ${ctx.summaryRefreshing ? "disabled aria-busy=\"true\"" : ""}>${ctx.summaryRefreshing ? t("review.agentRefreshing") : t("review.assistantGenerate")}</button>` : "";
        const assistant = `<section class="review-assistant" aria-label="${t("review.assistantTitle")}" data-summary-refresh-state="${ctx.summaryRefreshing ? "loading" : ctx.summaryError ? "error" : "idle"}">
            <header><h3>${t("review.assistantTitle")}</h3><span>${escapeHtml(t("review.assistantScope", {start: summary.startDate, end: summary.endDate}))}</span></header>
            <div class="review-assistant-status"><div><strong>${t("review.assistantSiYuan")}</strong><span>${escapeHtml(agentStatus)}</span></div><div><strong>${t("review.assistantProvider")}</strong><span>${escapeHtml(providerStatus)}</span>${providerButton}</div></div>
            <label>${t("review.assistantGoal")}<select data-review-assistant-goal>${(["summary", "patterns", "plan"] as const).map(value => `<option value="${value}" ${goal === value ? "selected" : ""}>${t(`review.assistantGoal.${value}`)}</option>`).join("")}</select></label>
            <div class="review-assistant-actions"><button class="lc-checkin__small-button" type="button" data-action="copy-review-prompt">${t("review.assistantCopy")}</button>${ctx.analysisHistoryCount ? `<button class="lc-checkin__text-button" type="button" data-action="view-analysis-history">${t("agent.historyTitle")}</button>` : ""}</div>
            <p class="review-scope-note">${t("review.assistantHow")}</p>
            <details class="review-assistant-prompt"><summary>${t("review.assistantPromptPreview")}</summary><textarea readonly rows="7" data-review-assistant-prompt aria-label="${t("review.assistantPromptLabel")}">${escapeHtml(prompt)}</textarea></details>
            ${ctx.summaryCacheState === "stale" ? `<p class="review-scope-note" data-summary-cache-state="stale">${t("review.assistantStale")}</p>` : ""}
            ${ctx.summaryError ? `<p class="is-error" role="alert">${escapeHtml(ctx.summaryError)}</p>` : ""}
        </section>`;
        const hasGenerated = Boolean(ctx.summaryText) && ctx.summaryCacheState !== "stale";
        const generatedDate = ctx.analysisLastGeneratedAt ? new Date(ctx.analysisLastGeneratedAt) : undefined;
        const generatedAt = generatedDate && Number.isFinite(generatedDate.getTime())
            ? generatedDate.toLocaleString(getPluginLocale(), {year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"}) : summary.endDate;
        const localSummaryText = hasGenerated ? "" : buildLocalSummaryText({...viewSummary, items: rankedSummaryItems});
        const generated = hasGenerated
            ? `<div class="lc-checkin__summary-text" data-summary-source="agent"><small>${escapeHtml(t("review.assistantGenerated", {date: generatedAt}))}</small><div>${escapeHtml(ctx.summaryText || "")}</div></div>`
            : `<div class="lc-checkin__summary-text is-local" data-summary-source="local"><small>${t("review.assistantLocal")}</small><div>${escapeHtml(localSummaryText)}</div><small>${t("review.coverageHint")}</small></div>`;
        const suggestionPanel = ctx.suggestionWorkflow ? renderSuggestionWorkflowPanel(ctx.suggestionWorkflow) : "";
        return `${assistant}${generated}<div class="lc-checkin__review-guidance-disclosure">${summaryGuidance}${attentionSummaryItem && hasPeriodRecords ? `<div class="lc-checkin__review-hero-actions"><button class="lc-checkin__text-button" type="button" data-action="preview-agent-suggestion" data-suggestion-item-id="${escapeHtml(attentionSummaryItem.itemId)}" data-suggestion-item="${escapeHtml(attentionSummaryItem.name)}" data-suggestion-rate="${attentionSummaryItem.completionRate}">${t("review.heroPreview")}</button><button class="lc-checkin__text-button" type="button" data-action="preview-agent-schedule-suggestion" data-suggestion-item-id="${escapeHtml(attentionSummaryItem.itemId)}" data-suggestion-item="${escapeHtml(attentionSummaryItem.name)}" data-suggestion-rate="${attentionSummaryItem.completionRate}">${t("review.heroSchedulePreview")}</button></div>` : ""}</div>${suggestionPanel}`;
    };
    const tabs = (["day", "week", "month"] as SummaryRange[]).map((range) => `<button type="button" data-summary-range="${range}" aria-pressed="${!ctx.summaryCustomRange && ctx.summaryRange === range}" class="${!ctx.summaryCustomRange && ctx.summaryRange === range ? "is-selected" : ""}">${range === "day" ? t("review.tabDay") : range === "month" ? t("review.tabMonth") : t("review.tabWeek")}</button>`).join("");
    const custom = `<details class="lc-checkin__custom-range-disclosure"><summary>${ctx.summaryCustomRange ? t("review.customOn") : t("review.custom")}</summary><form class="lc-checkin__custom-range" data-custom-range><label><span>${t("review.customStart")}</span><input type="date" name="customStartDate" max="${escapeHtml(ctx.analyticsSnapshot.asOf)}" value="${escapeHtml(ctx.summaryCustomRange?.startDate || summary.startDate)}" required /></label><span class="lc-checkin__custom-range-separator">${t("review.customSeparator")}</span><label><span>${t("review.customEnd")}</span><input type="date" name="customEndDate" max="${escapeHtml(ctx.analyticsSnapshot.asOf)}" value="${escapeHtml(ctx.summaryCustomRange?.endDate || summary.endDate)}" required /></label><button type="submit" class="lc-checkin__text-button">${t("review.customApply")}</button></form></details>`;
    const reportSectionOptions = (["events", "completion", "items", "baseline", "deviations", "highlights"] as const).map((key) => {
        const labels = {events: "report.optEvents", completion: "report.optCompletion", items: "report.optItems", baseline: "report.optBaseline", deviations: "report.optDeviations", highlights: "report.optHighlights"} as const;
        return `<label class="lc-checkin__report-option"><input type="checkbox" data-report-option="${key}" ${ctx.reportSections[key] ? "checked" : ""} /> ${escapeHtml(t(labels[key]))}</label>`;
    }).join("");
    const reportSourceOptions = [["", "report.sourceAll"], ["manual", "source.manual"], ["tomato", "source.tomato"], ["api", "source.api"], ["import", "source.import"]] as const;
    const reportSourceSelect = `<label class="lc-checkin__report-option"><span>${t("report.sourceLabel")}</span><select data-report-source aria-label="${t("report.sourceLabel")}">${reportSourceOptions.map(([value, key]) => `<option value="${value}"${ctx.reportSource === value ? " selected" : ""}>${escapeHtml(t(key))}</option>`).join("")}</select></label>`;
    const reviewTools = `<details class="review-export-disclosure"><summary>${t("review.reportActions")}</summary><div class="lc-checkin__review-tools" role="toolbar" aria-label="${t("review.toolsAria")}"><div class="lc-checkin__review-tool-group" role="group" aria-label="${t("review.reportToolsAria")}">${assistantEntry}<button class="lc-checkin__text-button lc-checkin__review-tool-button" type="button" data-action="copy-weekly-report" aria-label="${t("review.copyReportAria")}" title="${t("review.copyReportAria")}">${t("review.copyReport")}</button><button class="lc-checkin__text-button lc-checkin__review-tool-button" type="button" data-action="export-report" aria-label="${t("review.exportReportAria")}" title="${t("review.exportReportAria")}">${t("review.exportReport")}</button><details class="lc-checkin__review-more lc-checkin__report-settings"><summary aria-label="${t("review.reportSettingsAria")}" title="${t("review.reportSettingsAria")}">${t("review.reportSettings")}<span aria-hidden="true">⌄</span></summary><div class="lc-checkin__review-more-menu lc-checkin__report-settings-menu" role="group" aria-label="${t("review.reportSettingsAria")}">${reportSectionOptions}${reportSourceSelect}</div></details></div><details class="lc-checkin__review-more"><summary aria-label="${t("review.moreToolsAria")}" title="${t("review.moreToolsAria")}">${t("review.moreTools")}<span aria-hidden="true">⌄</span></summary><div class="lc-checkin__review-more-menu" role="group" aria-label="${t("review.moreToolsAria")}"><button class="lc-checkin__text-button" type="button" data-action="archived" aria-label="${t("review.archivedAria")}">${t("review.archived")}</button><button class="lc-checkin__text-button" type="button" data-action="export-all" aria-label="${t("review.exportAllAria")}">${t("review.exportAll")}</button><button class="lc-checkin__text-button" type="button" data-action="export-json" aria-label="${t("review.exportJson")}">${t("review.exportJson")}</button><button class="lc-checkin__text-button" type="button" data-action="export-csv" aria-label="${t("review.exportCsv")}">${t("review.exportCsv")}</button></div></details></div></details>`;

    const content = workspace === "records" ? renderRecords() : workspace === "analysis"
        ? `<p class="review-scope-note">${t("review.analysisScope")}</p><div class="lc-checkin__review-sections">
            ${fold("trend", t("review.foldTrend"), renderTrends)}
            ${assistantEntry}
            ${fold("heatmap", t("review.heatmapTitle"), renderHeatmap)}
            ${fold("strength", t("review.foldStrength"), renderStrength)}
            ${fold("balance", t("review.balanceTitle"), renderBalance)}
            ${fold("achievements", t("review.foldAchievements"), renderAwards)}
            <h2 class="review-section-heading">${t("review.supportingContent")}</h2>
            ${fold("reminders", t("review.foldReminders"), renderReminders)}
            ${fold("upcoming", t("review.foldUpcoming"), () => renderUpcomingOccasionsView(ctx.occasionStore))}
          </div>`
        : `<section class="lc-checkin__summary-stats" aria-label="${t("review.summaryStatsAria")}" title="${escapeHtml(t("review.coverageHint"))}"><div><strong>${summary.totalEvents}</strong><span>${t("review.statEvents")}</span></div><div><strong>${completedItemCount}</strong><span>${t("review.completedCoverage")}</span></div><div><strong>${scheduledItemCount}</strong><span>${t("review.statScheduled")}</span></div>${analyticsSummary ? `<span class="lc-checkin__analytics-badge" data-analytics-as-of="${escapeHtml(analyticsSummary.asOf)}" aria-label="${escapeHtml(t("review.analyticsBadgeAria", {weekly: analyticsSummary.weeklyCurrent, monthly: analyticsSummary.monthlyCurrent, yearly: analyticsSummary.yearlyCurrent, days: analyticsSummary.activeDays}))}">${analyticsSummary.weeklyCurrent}% · ${analyticsSummary.monthlyCurrent} · ${analyticsSummary.yearlyCurrent} · ${analyticsSummary.activeDays}</span>` : ""}</section>
            ${renderRhythm()}<div class="lc-checkin__review-sections">
            ${fold("projects", `${t("review.foldProjects")} · ${summary.items.length}`, renderProjects)}
            ${assistantEntry}
            ${fold("compare", t("review.compareTitle"), renderComparison)}
            ${fold("report", t("review.fullReport"), renderReport)}
          </div>`;
    return `<div class="lc-checkin lc-checkin--review" data-appearance="${ctx.appearance}">
        <header class="lc-checkin__editor-header"><div><div class="lc-checkin__eyebrow">${t("review.eyebrow")}</div><h1 class="lc-checkin__title">${t("review.title")}</h1></div><div class="lc-checkin__header-actions"><div class="lc-checkin__range-tabs" role="group" aria-label="${t("review.rangeAria")}">${tabs}${custom}</div>${reviewTools}</div></header>
        <nav class="lc-checkin__review-subnav review-workspace-nav" aria-label="${t("review.subnavAria")}">${(["overview", "records", "analysis"] as const).map(name => `<button type="button" data-review-workspace="${name}" aria-pressed="${workspace === name}">${t(`review.workspace.${name}`)}</button>`).join("")}</nav>
        <p class="review-scope-note">${escapeHtml(t("review.selectedPeriod", {start: summary.startDate, end: summary.endDate}))}</p>
        <div data-review-workspace-panel="${workspace}">${content}</div>
    </div>`;
}
