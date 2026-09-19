/* 回顾页视图：从 index.ts 外置；依赖以 ReviewViewContext 显式传入。 */
import {t, getPluginLocale} from "../i18n";
import {dateKey, getEventsForDate, getItemRevisionForDate, isSkipEvent, getItemById, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";
import {calendarDateFromKey, escapeHtml, formatHistoryDate, formatNumber, renderRecordNote} from "../shared";
import {filterHistoryRecords, type HistorySortOrder, type HistorySourceFilter} from "../features/history-filter";
import {buildCustomSummaryContext, buildSummaryContext, type SummaryRange} from "../analytics";
import {buildReviewComparison, getPreviousReviewRange} from "../features/review-comparison";
import {renderReviewCompareSection, renderReviewCompareItems} from "./review-compare";
import {buildYearHeatmap, renderBarChart, renderLineChart, renderYearHeatmap, summarizeAnalyticsSnapshot, summarizeTrend, type AnalyticsSnapshot} from "../charts";
import {buildAchievements} from "../features/achievements";
import {renderUpcomingOccasionsView, renderCheckinLogView} from "./fragments";
import type {CheckinEvent, CheckinStore} from "../types";
import type {OccasionStore} from "../occasions";
import {filterReminderEntries, projectOverdueOccurrenceHistory, projectReminderCenter, type ReminderFilter, type ReminderUserAction} from "../reminders";
import {buildLocalSummaryText} from "../features/local-summary";
import {buildHabitScoreSeries, collectHabitScoreDays, scheduleFrequency} from "../features/habit-score";
import {renderSuggestionWorkflowPanel} from "./suggestion-workflow";

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
    reviewFoldTouched: boolean;
    summaryRange: SummaryRange;
    summaryCustomRange?: {startDate: string; endDate: string};
    summaryText?: string;
    reportSections: import("../view-preferences").ReportSectionToggles;
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
    const itemNames = new Map(ctx.store.items.map((item) => [item.id, item.name]));
    const year = ctx.historyMonth.getFullYear();
    const month = ctx.historyMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
    const activeItems = ctx.store.items;
    const today = ctx.analyticsSnapshot.asOf;
    const calendarCells = [
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
    ].join("");
    const selectedEvents = getEventsForDate(ctx.store, ctx.selectedHistoryDate);
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
    const hasHistoryFilter = Boolean(ctx.historyQuery.trim()) || ctx.historySource !== "all";
    const renderEvent = ({event, itemName}: {event: any; itemName: string}) => {
        const time = new Date(event.occurredAt).toLocaleTimeString(getPluginLocale(), {hour: "2-digit", minute: "2-digit"});
        const note = event.note ? `<small class="lc-checkin__history-event-note">${renderRecordNote(event.note)}</small>` : "";
        const noteEditor = ctx.editingHistoryNoteId === event.id ? `<textarea class="lc-checkin__history-note-editor" data-history-note-input="${escapeHtml(event.id)}" rows="2">${escapeHtml(event.note || "")}</textarea><button class="lc-checkin__text-button" type="button" data-save-history-note-id="${escapeHtml(event.id)}">${t("review.saveNote")}</button>` : "";
        const photoThumb = event.attachment ? `<img class="lc-checkin__history-thumb" src="${event.attachment}" alt="${t("review.logPhotoAlt")}" loading="lazy" />` : "";
        const sourceLabel = t(`source.${event.source}`) || event.source;
        /* T-1221：跳过行显示中性徽章而非数值列。 */
        const skipBadge = isSkipEvent(event) ? `<span class="lc-checkin__history-skip-badge">${escapeHtml(t("review.skipBadge"))}</span>` : "";
        const valueLabel = isSkipEvent(event) ? "" : `<span class="lc-checkin__history-event-value">${escapeHtml(formatNumber(event.value))}${escapeHtml(event.unit)}</span>`;
        return `<div class="lc-checkin__history-event${isSkipEvent(event) ? " is-skip" : ""}">${photoThumb}<div class="lc-checkin__history-event-main"><strong>${escapeHtml(itemName)}</strong><span>${escapeHtml(time)} · ${escapeHtml(sourceLabel)}${skipBadge}</span>${note}${noteEditor}</div>${valueLabel}<div class="lc-checkin__history-event-actions">${ctx.store.items.some((item) => item.id === event.itemId && !item.archived) ? `<button class="lc-checkin__text-button" type="button" data-history-insights-id="${escapeHtml(event.itemId)}" aria-label="${escapeHtml(t("review.insightsActionAria", {name: itemName}))}">${t("review.insightsAction")}</button>` : ""}<button class="lc-checkin__text-button" type="button" data-edit-history-event-id="${escapeHtml(event.id)}" aria-label="${escapeHtml(t("review.noteActionAria", {name: itemName, time}))}">${t("review.noteAction")}</button><button class="lc-checkin__text-button" type="button" data-history-event-id="${escapeHtml(event.id)}" aria-label="${escapeHtml(t("review.undoActionAria", {name: itemName, time}))}">${t("review.undoAction")}</button></div></div>`;
    };
    const eventRows = filteredRecords.map(renderEvent);
    const eventDetails = filteredRecords.length ? `<details class="lc-checkin__history-details"><summary><span>${t("review.historyDetails")}</span><em>${t("review.recordsCount", {n: filteredRecords.length})}</em><i aria-hidden="true">⌄</i></summary><div class="lc-checkin__history-events">${eventRows.slice(0, 5).join("")}${eventRows.length > 5 ? `<div data-history-extra hidden>${eventRows.slice(5).join("")}</div><button class="lc-checkin__text-button lc-checkin__history-expand" type="button" data-history-expand>${t("review.historyExpand", {n: eventRows.length - 5})}</button>` : ""}</div></details>` : `<div class="lc-checkin__history-empty">${selectedEvents.length ? t("review.historyFilterEmpty") : t("review.historyDayEmpty")}</div>`;
    const details = aggregateDetails + eventDetails;
    const analyticsBadge = analyticsSummary ? `<span class="lc-checkin__analytics-badge" data-analytics-as-of="${escapeHtml(analyticsSummary.asOf)}" aria-label="${escapeHtml(t("review.analyticsBadgeAria", {weekly: analyticsSummary.weeklyCurrent, monthly: analyticsSummary.monthlyCurrent, yearly: analyticsSummary.yearlyCurrent, days: analyticsSummary.activeDays}))}" title="${escapeHtml(t("review.analyticsBadgeAria", {weekly: analyticsSummary.weeklyCurrent, monthly: analyticsSummary.monthlyCurrent, yearly: analyticsSummary.yearlyCurrent, days: analyticsSummary.activeDays}))}">${analyticsSummary.weeklyCurrent}% · ${analyticsSummary.monthlyCurrent} · ${analyticsSummary.yearlyCurrent} · ${analyticsSummary.activeDays}</span>` : "";
    const currentMonth = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
    const nextDisabled = ctx.historyMonth >= currentMonth;
    const historySourceOptions = (["all", "manual", "tomato", "import", "api"] as HistorySourceFilter[]).map((value) => `<option value="${value}" ${ctx.historySource === value ? "selected" : ""}>${escapeHtml(t(`source.${value}`))}</option>`).join("");
    const historyOrderOptions = [["newest", "review.orderNewest"], ["oldest", "review.orderOldest"]] as const;
    const resultLabel = hasHistoryFilter ? t("review.historyResultFiltered", {shown: filteredEvents.length, total: selectedEvents.length}) : t("review.historyResultAll", {total: selectedEvents.length});
    const historyTools = `<details class="lc-checkin__history-filter-disclosure" ${hasHistoryFilter ? "open" : ""}><summary>${hasHistoryFilter ? t("review.searchOn") : t("review.searchTitle")}</summary><section class="lc-checkin__history-tools" role="search" aria-label="${t("review.searchAria")}"><label class="lc-checkin__history-search lc-checkin__search-field"><span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span><input data-history-search type="search" value="${escapeHtml(ctx.historyQuery)}" placeholder="${t("review.searchAria")}" aria-label="${t("review.searchAria")}" enterkeyhint="search" />${ctx.historyQuery ? `<button type="button" data-action="clear-history-query" aria-label="${t("review.clearSearch")}" title="${t("review.clearSearchTitle")}">×</button>` : ""}</label><div class="lc-checkin__history-filter-row"><label><span>${t("review.sourceLabel")}</span><select data-history-source aria-label="${t("review.sourceAria")}">${historySourceOptions}</select></label><label><span>${t("review.orderLabel")}</span><select data-history-order aria-label="${t("review.orderAria")}">${historyOrderOptions.map(([value, label]) => `<option value="${value}" ${ctx.historyOrder === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label></div></section></details>`;

    const summary = ctx.summaryCustomRange ? buildCustomSummaryContext(ctx.store, ctx.summaryCustomRange, asOf) : buildSummaryContext(ctx.store, ctx.summaryRange, asOf);
    const iconsById = new Map(ctx.store.items.map((item) => [item.id, item.icon]));
    const summaryRate = summary.scheduledItems ? Math.round(summary.completedItems / summary.scheduledItems * 100) : 0;
    const rankedSummaryItems = [...summary.items].sort((a, b) => b.completionRate - a.completionRate);
    const topSummaryItem = rankedSummaryItems[0];
    const attentionSummaryItem = rankedSummaryItems.length > 1 ? rankedSummaryItems[rankedSummaryItems.length - 1] : undefined;
    const hasPeriodRecords = summary.totalEvents > 0;
    /* Keep each sentence as a real text value and escape it once at the HTML
       boundary.  The previous inline interpolation escaped project names
       before composing the sentence, which made it difficult for the UI to
       expose the complete advice in a tooltip or a wrapped mobile layout. */
    const summaryAdvice = hasPeriodRecords
        ? (attentionSummaryItem ? t("review.heroAdviceLower", {name: attentionSummaryItem.name}) : t("review.heroAdviceKeep"))
        : "";
    const summaryAttention = hasPeriodRecords && attentionSummaryItem
        ? t("review.heroAttention", {name: attentionSummaryItem.name, rate: attentionSummaryItem.completionRate})
        : "";
    const summaryHeadline = summaryRate >= 80 ? t("review.heroHigh") : summaryRate >= 50 ? t("review.heroMid") : t("review.heroLow");
    const summaryBody = t("review.heroBody", {done: summary.completedItems, scheduled: summary.scheduledItems || 0, events: summary.totalEvents});
    const summaryBest = topSummaryItem && hasPeriodRecords ? t("review.heroBest", {name: topSummaryItem.name}) : "";
    const summaryGuidance = summaryAttention || summaryAdvice
        ? `<div class="lc-checkin__review-guidance">${summaryAttention ? `<small class="lc-checkin__review-attention" title="${escapeHtml(summaryAttention)}">${escapeHtml(summaryAttention)}</small>` : ""}${summaryAdvice ? `<small class="lc-checkin__review-advice" title="${escapeHtml(t("review.heroAdviceLabel", {advice: summaryAdvice}))}">${escapeHtml(t("review.heroAdviceLabel", {advice: summaryAdvice}))}</small>` : ""}</div>`
        : "";
    const summaryHero = `<section class="lc-checkin__review-hero" aria-label="${t("review.heroAria")}"><div class="lc-checkin__review-hero-copy"><small class="lc-checkin__review-hero-cutoff">${escapeHtml(t("review.heroUntil", {date: summary.endDate}))}</small><h2>${escapeHtml(summaryHeadline)}</h2><p>${escapeHtml(summaryBody)}${summaryBest ? ` · ${escapeHtml(summaryBest)}` : ""}</p>${summaryGuidance}<div class="lc-checkin__review-hero-actions"><button class="lc-checkin__text-button" type="button" data-action="preview-agent-suggestion" data-suggestion-item="${escapeHtml(attentionSummaryItem?.name || "")}" data-suggestion-rate="${attentionSummaryItem?.completionRate ?? ""}">${t("review.heroPreview")}</button></div></div><span class="lc-checkin__review-hero-rate">${summaryRate}%</span></section>`;
    /* T-1216 较上一周期：基线上下文与当前共享同一 asOf，比较只消费已投影的 SummaryContext。 */
    const previousRange = getPreviousReviewRange({startDate: summary.startDate, endDate: summary.endDate});
    const comparison = previousRange ? buildReviewComparison(summary, buildCustomSummaryContext(ctx.store, previousRange, asOf)) : undefined;
    const compareSection = comparison ? renderReviewCompareSection(comparison) : "";
    const compareHasItems = Boolean(comparison?.items.length);
    const compareFoldBody = comparison && compareHasItems ? `<div class="lc-checkin__compare-item-list">${renderReviewCompareItems(comparison)}</div>` : "";
    /* T-1227 强度曲线：近 30 天每项目强度（0~100），与建议引擎共用 habit-score 实现。 */
    const strengthEndExclusive = dateKey(new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() + 1));
    const strengthStart = dateKey(new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - 29));
    let strengthCount = 0;
    let strengthSum = 0;
    const strengthSumPoints = new Map<string, {sum: number; count: number}>();
    const strengthRows = summary.items.map((entry) => {
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
        /* 二级明细：每项目一行（名称+当前分），点击 details 展开后才加载折线。 */
        return `<details class="lc-checkin__strength-detail"><summary><strong>${escapeHtml(storeItem.name)}</strong><em>${t("review.strengthPoints", {n: current})}</em><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><div class="lc-checkin__strength-detail-body">${renderLineChart({title: storeItem.name, unit: "%", points: series.map((point) => ({label: point.date.slice(5), value: point.score}))}, {width: 720, height: 150, labelStride: 5})}</div></details>`;
    }).join("");
    /* T-1243：汇总图优先——平均强度曲线一张图承载全貌，逐项目折线收进二级 details。 */
    const averagedStrengthSeries = [...strengthSumPoints.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, bucket]) => ({label: date.slice(5), value: Math.round((bucket.sum / bucket.count) * 10) / 10}));
    const strengthOverview = averagedStrengthSeries.length
        ? renderLineChart({title: t("review.foldStrength"), unit: "%", points: averagedStrengthSeries}, {width: 720, height: 170, labelStride: 5})
        : "";
    const strengthAverage = strengthCount ? Math.round((strengthSum / strengthCount) * 10) / 10 : 0;
    const strengthHasItems = strengthCount > 0;
    const projectRows = summary.items.length ? summary.items.map((item) => {
        const quotaMeta = item.quota
            ? t("review.quotaPeriods", {done: item.quota.completedPeriods, elapsed: item.quota.elapsedPeriods, current: item.quota.current ? `${formatNumber(item.quota.current.progress)}/${formatNumber(item.quota.current.quota)}` : t("review.quotaNone")})
            : t("review.daysRatio", {done: item.completedDays, scheduled: item.scheduledDays, rate: item.completionRate});
        return `<button type="button" class="lc-checkin__review-item" data-review-insights-id="${escapeHtml(item.itemId)}"><span class="lc-checkin__review-item-icon" aria-hidden="true">${escapeHtml(iconsById.get(item.itemId) || "✓")}</span><strong>${escapeHtml(item.name)}</strong><span class="lc-checkin__review-item-meta">${escapeHtml(quotaMeta)}</span><i class="lc-checkin__review-item-bar" aria-hidden="true"><span style="width: ${Math.min(100, Math.max(0, item.completionRate))}%"></span></i></button>`;
    }).join("") : `<div class="lc-checkin__empty-description">${t("review.emptyProjects")}</div>`;
    const groupMap = new Map<string, {name: string; completed: number; scheduled: number}>();
    for (const item of summary.items) {
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
    const heatmapYear = Number(ctx.analyticsSnapshot.asOf.slice(0, 4)) + ctx.heatmapYearOffset;
    const heatmap = buildYearHeatmap(ctx.store, heatmapYear);
    const weeklyTrend = ctx.analyticsSnapshot.weekly;
    const monthlyTrend = ctx.analyticsSnapshot.monthly;
    const dailyTrend = ctx.analyticsSnapshot.daily;
    const yearlyTrend = ctx.analyticsSnapshot.yearly;
    const trendCard = (series: typeof weeklyTrend, chart: string) => {
        const stats = summarizeTrend(series);
        const direction = stats.delta > 0 ? "↑" : stats.delta < 0 ? "↓" : "→";
        return `<div class="lc-checkin__trend-card"><header><div><h3>${escapeHtml(series.title)}</h3><small>${t("review.trendCompared")}</small></div><strong>${stats.current}${escapeHtml(series.unit)}</strong></header><div class="lc-checkin__trend-stats"><span><small>${t("review.trendAverage")}</small><b>${stats.average}${escapeHtml(series.unit)}</b></span><span><small>${t("review.trendBest")}</small><b>${stats.best}${escapeHtml(series.unit)}</b></span><span class="is-${stats.delta > 0 ? "up" : stats.delta < 0 ? "down" : "flat"}"><small>${t("review.trendChange")}</small><b>${direction} ${Math.abs(stats.delta)}${escapeHtml(series.unit)}</b></span></div>${chart}</div>`;
    };
    const achievements = buildAchievements(ctx.store, asOf);
    const rawReminders = filterReminderEntries(projectReminderCenter(ctx.store, ctx.occasionStore, asOf, ctx.reminderUserActions), ctx.reminderFilter);
    /* 同一打卡只保留最新实例，累计次数以内联摘要展示，避免提醒列表纵向膨胀。 */
    const reminderByTitle = new Map<string, (typeof rawReminders)[number] & {occurrenceCount?: number}>();
    rawReminders.forEach((entry) => {
        const key = `${entry.source}:${entry.title}`;
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
    const overdueHistory = projectOverdueOccurrenceHistory(ctx.occasionStore, asOf).slice(0, 12);
    /* 逾期历史折叠（T-117）：默认只展示前 4 条，其余折叠进「展开全部」。 */
    const OVERDUE_VISIBLE = 4;
    const overdueRow = (entry: {occasionId: string; occurrenceDate: string; name: string; overdueDays: number}) => `<article class="lc-checkin__reminder-row is-overdue" data-overdue-occasion="${escapeHtml(entry.occasionId)}" data-overdue-date="${escapeHtml(entry.occurrenceDate)}"><span class="lc-checkin__reminder-source">${escapeHtml(t("review.remindersOccasion"))}</span><strong>${escapeHtml(entry.name)}</strong><span class="lc-checkin__reminder-timing">${escapeHtml(entry.occurrenceDate)} · ${t("review.overdueDays", {n: entry.overdueDays})}</span><button class="lc-checkin__small-button" type="button" data-occasion-complete data-occasion-id="${escapeHtml(entry.occasionId)}" data-occasion-date="${escapeHtml(entry.occurrenceDate)}" aria-label="${t("review.catchUpAria", {name: entry.name, date: entry.occurrenceDate})}">${t("review.catchUp")}</button></article>`;
    const overdueVisibleRows = overdueHistory.slice(0, OVERDUE_VISIBLE).map(overdueRow).join("");
    const overdueMoreRows = overdueHistory.slice(OVERDUE_VISIBLE).map(overdueRow).join("");
    const overdueHistorySection = overdueHistory.length ? `<div class="lc-checkin__overdue-history"><h3>${t("review.overdueHistory")} · ${overdueHistory.length}</h3>${overdueVisibleRows}${overdueMoreRows ? `<div data-overdue-more hidden>${overdueMoreRows}</div><button class="lc-checkin__text-button" type="button" data-overdue-expand>${t("review.expandAll", {n: overdueHistory.length})}</button>` : ""}</div>` : "";
    const earnedCount = achievements.filter((entry) => entry.achieved).length;
    const achievementCategories = (["milestone", "consistency", "quality", "reflection", "rhythm"] as const).map((category) => {
        const entries = achievements.filter((entry) => entry.category === category);
        const earned = entries.filter((entry) => entry.achieved).length;
        const cards = entries.map((entry) => `<div class="lc-checkin__achievement ${entry.achieved ? "is-achieved" : ""}" title="${escapeHtml(entry.description)}"><span class="lc-checkin__achievement-icon" aria-hidden="true">${entry.icon}</span><strong>${escapeHtml(entry.name)}</strong><small>${entry.achieved ? t("review.achieved") : `${Math.min(entry.progress, entry.target)}/${entry.target}`}</small></div>`).join("");
        return `<details class="lc-checkin__achievement-category"${category === "milestone" ? " open" : ""}><summary><span>${t(`review.achievementCategory.${category}`)}</span><em>${earned}/${entries.length}</em><i aria-hidden="true">⌄</i></summary><div class="lc-checkin__achievement-grid">${cards}</div></details>`;
    }).join("");
    const providerButton = ctx.summaryProvidersCount
        ? `<div class="lc-checkin__summary-agent" data-summary-refresh-state="${ctx.summaryRefreshing ? "loading" : "idle"}"><span>${t("review.agentConnected")} · ${t("review.summaryCutoff", {date: escapeHtml(summary.endDate)})}${ctx.analysisLastGeneratedAt ? ` · ${t("review.summaryUpdatedAt", {date: escapeHtml(ctx.analysisLastGeneratedAt)})}` : ""}${ctx.analysisHistoryCount ? ` · ${t("review.summaryHistoryCount", {n: ctx.analysisHistoryCount})}` : ""}</span><span><button class="lc-checkin__text-button" type="button" data-action="generate-summary" aria-label="${t("review.agentRefreshAria")}" ${ctx.summaryRefreshing ? "disabled aria-busy=\"true\"" : ""}>${ctx.summaryRefreshing ? t("review.agentRefreshing") : t("review.agentGenerate")}</button>${ctx.analysisHistoryCount && ctx.analysisHistoryCount > 1 ? `<button class="lc-checkin__text-button" type="button" data-action="view-analysis-history">${t("agent.historyTitle")}</button>` : ""}</span></div>`
        : `<div class="lc-checkin__summary-agent is-unavailable" role="note"><span>${t("review.agentUnavailable")}</span></div>`;
    const localSummaryText = ctx.summaryText ? "" : buildLocalSummaryText(summary);
    const generated = ctx.summaryText
        ? `<div class="lc-checkin__summary-text" data-summary-source="agent"><small>${t("review.agentMeta", {date: escapeHtml(summary.endDate)})}</small><div>${escapeHtml(ctx.summaryText)}</div></div>`
        : `<div class="lc-checkin__summary-text is-local" data-summary-source="local"><small>${t("review.localMeta")}</small><div>${escapeHtml(localSummaryText)}</div></div>`;
    const suggestionPanel = ctx.suggestionWorkflow ? renderSuggestionWorkflowPanel(ctx.suggestionWorkflow) : "";
    const tabs = (["day", "week", "month"] as SummaryRange[]).map((range) => `<button type="button" data-summary-range="${range}" class="${!ctx.summaryCustomRange && ctx.summaryRange === range ? "is-selected" : ""}">${range === "day" ? t("review.tabDay") : range === "month" ? t("review.tabMonth") : t("review.tabWeek")}</button>`).join("");
    const custom = `<details class="lc-checkin__custom-range-disclosure" ${ctx.summaryCustomRange ? "open" : ""}><summary>${ctx.summaryCustomRange ? t("review.customOn") : t("review.custom")}</summary><form class="lc-checkin__custom-range" data-custom-range><label><span>${t("review.customStart")}</span><input type="date" name="customStartDate" value="${escapeHtml(ctx.summaryCustomRange?.startDate || summary.startDate)}" required /></label><span class="lc-checkin__custom-range-separator">${t("review.customSeparator")}</span><label><span>${t("review.customEnd")}</span><input type="date" name="customEndDate" value="${escapeHtml(ctx.summaryCustomRange?.endDate || summary.endDate)}" required /></label><button type="submit" class="lc-checkin__text-button">${t("review.customApply")}</button></form></details>`;
    /* 宽窗口首屏给出信息：趋势/日志/项目/提醒默认展开；用户一旦手动折叠过就完全尊重其选择（T-011 的
       手机端"默认全折叠"在窄窗下保持不变，见 scss 里 review-sections 的单列规则）。 */
    const wideDefaultOpen = typeof window !== "undefined" && window.innerWidth >= 1200 && !ctx.reviewFoldTouched;
    const countBadge = (n: number) => `<i class="lc-checkin__fold-count">${n}</i>`;
    const fold = (id: string, title: string, body: string): string => {
        if (!body.trim()) return "";
        const open = ctx.reviewFoldSections.has(id) || (wideDefaultOpen && (id === "trend" || id === "log" || id === "projects" || id === "reminders"));
        return `<details class="lc-checkin__review-fold" data-review-fold="${id}"${open ? " open" : ""}><summary><span>${title}</span><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><div class="lc-checkin__review-fold-body">${body}</div></details>`;
    };
    const reportSectionOptions = (["events", "completion", "items", "baseline", "highlights"] as const).map((key) => {
        const labels = {events: "report.optEvents", completion: "report.optCompletion", items: "report.optItems", baseline: "report.optBaseline", highlights: "report.optHighlights"} as const;
        return `<label class="lc-checkin__report-option"><input type="checkbox" data-report-option="${key}" ${ctx.reportSections[key] ? "checked" : ""} /> ${escapeHtml(t(labels[key]))}</label>`;
    }).join("");
    const reviewTools = `<div class="lc-checkin__review-tools" role="toolbar" aria-label="${t("review.toolsAria")}"><div class="lc-checkin__review-tool-group" role="group" aria-label="${t("review.reportToolsAria")}"><button class="lc-checkin__text-button lc-checkin__review-tool-button" type="button" data-action="copy-weekly-report" aria-label="${t("review.copyReportAria")}" title="${t("review.copyReportAria")}">${t("review.copyReport")}</button><button class="lc-checkin__text-button lc-checkin__review-tool-button" type="button" data-action="export-report" aria-label="${t("review.exportReportAria")}" title="${t("review.exportReportAria")}">${t("review.exportReport")}</button><details class="lc-checkin__review-more lc-checkin__report-settings"><summary aria-label="${t("review.reportSettingsAria")}" title="${t("review.reportSettingsAria")}">${t("review.reportSettings")}<span aria-hidden="true">⌄</span></summary><div class="lc-checkin__review-more-menu lc-checkin__report-settings-menu" role="group" aria-label="${t("review.reportSettingsAria")}">${reportSectionOptions}</div></details></div><details class="lc-checkin__review-more"><summary aria-label="${t("review.moreToolsAria")}" title="${t("review.moreToolsAria")}">${t("review.moreTools")}<span aria-hidden="true">⌄</span></summary><div class="lc-checkin__review-more-menu" role="group" aria-label="${t("review.moreToolsAria")}"><button class="lc-checkin__text-button" type="button" data-action="archived" aria-label="${t("review.archivedAria")}">${t("review.archived")}</button><button class="lc-checkin__text-button" type="button" data-action="export-json" aria-label="${t("review.exportJson")}">${t("review.exportJson")}</button><button class="lc-checkin__text-button" type="button" data-action="export-csv" aria-label="${t("review.exportCsv")}">${t("review.exportCsv")}</button></div></details></div>`;
    return `<div class="lc-checkin lc-checkin--review" data-appearance="${ctx.appearance}">
            <header class="lc-checkin__editor-header">
                <div><div class="lc-checkin__eyebrow">${t("review.eyebrow")}</div><h1 class="lc-checkin__title">${t("review.title")}</h1></div>
                <div class="lc-checkin__header-actions">
                    <div class="lc-checkin__range-tabs" role="tablist" aria-label="${t("review.rangeAria")}">${tabs}${custom}</div>
                    ${reviewTools}
                </div>
            </header>
            <section class="lc-checkin__summary-stats" aria-label="范围统计"><div><strong>${summary.totalEvents}</strong><span>${t("review.statEvents")}</span></div><div><strong>${summary.completedItems}</strong><span>${t("review.statCompleted")}</span></div><div><strong>${summary.scheduledItems}</strong><span>${t("review.statScheduled")}</span></div>${analyticsBadge}</section>
            ${summaryHero}
            ${compareSection}
            <nav class="lc-checkin__review-subnav" aria-label="${t("review.subnavAria")}"><button type="button" data-review-jump="reminders">${t("review.subnavReminders")}</button><button type="button" data-review-jump="trend">${t("review.subnavTrend")}</button>${compareHasItems ? `<button type="button" data-review-jump="compare">${t("review.subnavCompare")}</button>` : ""}${strengthHasItems ? `<button type="button" data-review-jump="strength">${t("review.subnavStrength")}</button>` : ""}<button type="button" data-review-jump="projects">${t("review.subnavProjects")}</button><button type="button" data-review-jump="log">${t("review.subnavLog")}</button><button type="button" data-review-jump="balance">${t("review.subnavBalance")}</button><button type="button" data-review-jump="achievements">${t("review.subnavAchievements")}</button><button type="button" data-review-jump="upcoming">${t("review.subnavPlans")}</button></nav>
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
            <div class="lc-checkin__review-sections">
            ${fold("reminders", `${t("review.foldReminders")} ${countBadge(reminders.length + overdueHistory.length)}`, `<section class="lc-checkin__reminder-center" aria-labelledby="lc-reminder-center-title"><div class="lc-checkin__reminder-heading"><h2 id="lc-reminder-center-title">${t("review.remindersTitle")}</h2><select data-reminder-filter aria-label="${t("review.remindersTitle")}"><option value="all" ${ctx.reminderFilter === "all" ? "selected" : ""}>${t("review.remindersTitle")}</option><option value="overdue" ${ctx.reminderFilter === "overdue" ? "selected" : ""}>${t("review.remindersOverdue")}</option><option value="today" ${ctx.reminderFilter === "today" ? "selected" : ""}>${t("review.remindersToday")}</option><option value="upcoming" ${ctx.reminderFilter === "upcoming" ? "selected" : ""}>${t("review.remindersUpcoming", {n: 1})}</option><option value="completed" ${ctx.reminderFilter === "completed" ? "selected" : ""}>${t("review.remindersCompleted")}</option></select></div><div class="lc-checkin__reminder-list">${reminderRows}</div>${overdueHistorySection}</section>`)}
            <details class="lc-checkin__year-heatmap" aria-label="${t("review.heatmapTitle")}">
                <summary><span class="lc-checkin__heatmap-nav" role="group"><button type="button" data-heatmap-year="-1" aria-label="${t("review.prevYear")}">‹</button><strong>${heatmapYear}</strong><button type="button" data-heatmap-year="1" aria-label="${t("review.nextYear")}"${ctx.heatmapYearOffset >= 0 ? " disabled" : ""}>›</button></span>${t("review.heatmapTitle")}</summary>
                <div class="lc-checkin__yearheatmap-scroll">${renderYearHeatmap(heatmap)}</div>
                <div class="lc-checkin__yearheatmap-meta"><small>${t("review.heatmapHint")}</small><span class="lc-checkin__yearheatmap-legend" aria-label="${t("review.heatmapLegend")}"><em>${t("review.heatmapLess")}</em>${[0,1,2,3,4].map((level) => `<i class="is-level-${level}" aria-hidden="true"></i>`).join("")}<em>${t("review.heatmapMore")}</em><i class="is-skip" aria-hidden="true"></i><em>${t("review.heatmapSkip")}</em></span><small>${t("review.heatmapTotal", {year: heatmapYear, n: heatmap.total})}</small></div>
            </details>
            ${fold("trend", t("review.foldTrend"), `<div class="lc-checkin__trend-grid">${trendCard(weeklyTrend, renderLineChart(weeklyTrend))}${trendCard(monthlyTrend, renderBarChart(monthlyTrend))}${trendCard(dailyTrend, renderLineChart(dailyTrend))}${trendCard(yearlyTrend, renderBarChart(yearlyTrend))}</div>`)}
            ${compareHasItems ? fold("compare", `${t("review.compareTitle")} ${countBadge(comparison!.items.length)}`, compareFoldBody) : ""}
            ${strengthHasItems ? fold("strength", `${t("review.foldStrength")} ${countBadge(strengthCount)}`, `<div class="lc-checkin__strength-overview"><header><strong>${t("review.strengthAverage")}</strong><em>${t("review.strengthPoints", {n: strengthAverage})}</em></header>${strengthOverview}</div><details class="lc-checkin__strength-details-fold"><summary><span>${t("review.strengthPerItem", {n: strengthCount})}</span><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><div class="lc-checkin__strength-list">${strengthRows}</div></details>`) : ""}
            ${fold("projects", `${t("review.foldProjects")} ${countBadge(summary.items.length)}`, `<section class="lc-checkin__review-projects"><div class="lc-checkin__review-project-list">${projectRows}</div></section>`)}
            ${fold("log", `${t("review.foldLog")} · ${ctx.store.events.length} 条`, renderCheckinLogView(ctx.store.events, ctx.store.items))}
            ${groupBars ? fold("balance", `${t("review.balanceTitle")} ${countBadge(groupBars.match(/lc-checkin__balance-row/g)?.length || 0)}`, `<section class="lc-checkin__balance" aria-label="${t("review.balanceTitle")}">${groupBars}</section>`) : ""}
            ${fold("achievements", `${t("review.foldAchievements")} · ${earnedCount}/${achievements.length}`, `<div class="lc-checkin__achievement-categories">${achievementCategories}</div>`)}
            ${fold("upcoming", t("review.foldUpcoming"), renderUpcomingOccasionsView(ctx.occasionStore))}
            ${generated}
            ${suggestionPanel}
            ${providerButton}
            </div>
        </div>`;
}
