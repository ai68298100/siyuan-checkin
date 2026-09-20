/* 回顾页碎片渲染：近期事项 / 打卡日志。
   从 index.ts 类方法外置；依赖以显式参数传入，无插件实例状态。 */
import {t, getPluginLocale} from "../i18n";
import {dateKey, evaluateItemRule, getEventDateKey, getEventsForDay, getItemRevisionForDate, getProgress, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday, isSkipEvent, sortCheckinItems} from "../model";
import {currentCalendarDate, escapeHtml, formatHistoryDate, formatNumber, parseLocalDateKey, renderIconMarkup, getRecordStep, formatScheduleLabel} from "../shared";
import {getOccurrenceDate, getVisibleOccasions, isOccasionCompleted} from "../occasions";
import {uiIcon} from "../ui/icons";
import {getRecordStepInputStep} from "../record-step";
import {KIND_LABELS, PRIORITY_LABELS, SORT_LABELS, TIME_SLOT_LABELS} from "../ui/labels";
import {selectPriorityReminders} from "../features/priority-reminder";
import {buildCheckinLogHierarchy, type CheckinLogDay} from "../features/checkin-log-hierarchy";
import {projectReminderCenter, type ReminderUserAction} from "../reminders";
import type {TodayGroupMode} from "../view-preferences";
import type {CheckinEvent, CheckinItem, CheckinItemSortMode, CheckinPriority, CheckinStore, CheckinTimeSlot} from "../types";
import type {OccasionStore} from "../occasions";

export interface TodayItemContext {
    store: CheckinStore;
    currentStreaks: Map<string, number>;
    bulkMode: boolean;
    bulkSelected: Set<string>;
    todaySortMode: CheckinItemSortMode;
    focusTimerItemId?: string;
}

export interface TodayViewContext extends TodayItemContext {
    occasionStore: OccasionStore;
    todayGroupMode: TodayGroupMode;
    collapsedTodayGroups: Set<string>;
    completedCollapsed: boolean;
    pendingOnly: boolean;
    todayQuery: string;
    weekStripVisible: boolean;
    lastExportAt?: string;
    saveState: SaveState;
    recentRecord?: {message: string; progress: number; target: number; unit: string};
    celebration?: {message: string; itemName: string};
    supportsCustomTab: boolean;
    appearance: "light" | "dark";
    reducedMotion: boolean;
    bestStreakItem?: CheckinItem;
    bestStreakValue: number;
    reminderUserActions?: ReminderUserAction[];
    priorityReminderExpanded?: boolean;
}

export type SaveState = "idle" | "saving" | "error";

export interface RecentRecordView {
    message: string;
    progress: number;
    target: number;
    unit: string;
}

export function renderRecentRecordView(record: RecentRecordView | undefined, reducedMotion: boolean): string {
    if (!record) return "";
    return `<div class="lc-checkin__recent-record" data-reduced-motion="${reducedMotion}" role="status" aria-live="polite">
            <span><i>✓</i><strong>${escapeHtml(record.message)}</strong><small>${t("today.progressNow", {value: escapeHtml(formatNumber(record.progress)), target: escapeHtml(formatNumber(record.target)), unit: escapeHtml(record.unit)})}</small></span>
            <button type="button" data-action="undo-record">${t("today.undoRecord")}</button>
        </div>`;
}

export function renderOccasionBannerView(occasionStore: OccasionStore, date: Date): string {
    const items = getVisibleOccasions(occasionStore, date).slice(0, 3);
    const stateClass = items.length ? "" : " is-empty";
    const chips = items.map((item) => {
        const icon = item.kind === "birthday" ? "🎂" : item.kind === "anniversary" ? "💍" : "◷";
        const timing = item.status === "today" ? t("review.today") : t("review.daysLater", {n: item.daysUntil});
        const completed = isOccasionCompleted(item, item.occurrenceDate);
        const action = item.status === "today" ? (completed ? t("today.occasionUndo") : t("today.occasionComplete")) : timing;
        return `<button type="button" class="lc-checkin__occasion-chip ${completed ? "is-complete" : ""}" data-action="${item.status === "today" ? "toggle-occasion" : "occasions"}" data-occasion-id="${escapeHtml(item.id)}" data-occasion-date="${escapeHtml(item.occurrenceDate)}" aria-pressed="${completed}" title="${escapeHtml(item.name)} · ${action}"><span aria-hidden="true">${icon}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(action)}</small></button>`;
    }).join("");
    return `<section class="lc-checkin__occasion-banner${stateClass}" aria-label="${t("today.occasionTitle")}">
            <span class="lc-checkin__occasion-banner-icon" aria-hidden="true">${uiIcon("calendar")}</span>
            <div class="lc-checkin__occasion-banner-body">
                <strong>${t("today.occasionTitle")}</strong>
                ${items.length ? `<div class="lc-checkin__occasion-chips">${chips}</div>` : `<small>${t("today.occasionEmpty")}</small>`}
            </div>
            <button class="lc-checkin__text-button" type="button" data-action="occasions">${t("common.manage")}</button>
        </section>`;
}

export function renderPriorityReminderView(store: CheckinStore, occasionStore: OccasionStore, date: Date, userActions: readonly ReminderUserAction[] = [], expanded = false): string {
    const entries = selectPriorityReminders(projectReminderCenter(store, occasionStore, date, userActions));
    const entry = entries[0];
    if (!entry) return "";
    const overdue = entry.status === "overdue";
    const row = (item: typeof entry, primary = false) => {
        const itemOverdue = item.status === "overdue";
        const itemSource = item.source === "checkin" ? t("review.remindersCheckin") : t("review.remindersOccasion");
        const itemTiming = itemOverdue ? t("today.priorityOverdue") : t("today.priorityToday");
        const itemAction = item.source === "checkin" ? t("today.priorityOpen") : t("today.priorityOccasion");
        const ariaLabel = primary ? t("today.priorityActionAria", {name: item.title}) : t("today.priorityItemAria", {name: item.title});
        return `<div class="lc-checkin__priority-reminder-row${primary ? " is-primary" : ""}"><span class="lc-checkin__priority-reminder-row-mark" aria-hidden="true">${itemOverdue ? "!" : "→"}</span><span class="lc-checkin__priority-reminder-row-text"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(itemSource)} · ${escapeHtml(itemTiming)}</small></span><button type="button" class="lc-checkin__text-button" data-priority-reminder-action data-priority-source="${item.source}" data-priority-id="${escapeHtml(item.sourceId)}" aria-label="${escapeHtml(ariaLabel)}">${escapeHtml(itemAction)}</button></div>`;
    };
    const remaining = entries.slice(1, 6);
    const more = remaining.length ? `<details class="lc-checkin__priority-reminder-more"${expanded ? " open" : ""}><summary aria-label="${escapeHtml(t("today.priorityMoreAria", {n: remaining.length}))}"><span class="lc-checkin__reminder-more-label">${t("today.priorityMore", {n: remaining.length})}</span><span class="lc-checkin__reminder-more-count" aria-hidden="true">+${remaining.length}</span></summary><div>${remaining.map((item) => row(item)).join("")}</div></details>` : "";
    return `<section class="lc-checkin__priority-reminder is-${entry.status}" data-priority-reminder data-priority-count="${entries.length}" role="status" aria-live="polite" aria-label="${escapeHtml(t("today.priorityTitle"))}">${row(entry, true)}${more}</section>`;
}

export function renderSaveStatusView(state: SaveState): string {
    return state === "error"
            ? `<div class="lc-checkin__save-status is-error" role="alert"><span>${t("msg.saveFailedShort")}</span><button type="button" data-action="retry-save">${t("msg.retrySave")}</button></div>`
            : "";
}

export function renderItemView(item: CheckinItem, date: Date, ctx: TodayItemContext): string {
    const revision = getItemRevisionForDate(item, date);
    const progress = getProgress(ctx.store, item, date);
    const complete = isComplete(ctx.store, item, date);
    const displayTarget = revision.schedule.type === "quota" ? revision.schedule.quota?.amount || revision.target : revision.target;
    const percent = Math.min(100, Math.round((progress / displayTarget) * 100));
    const isBinary = revision.kind === "binary" && revision.schedule.type !== "quota";
    const canFocus = (revision.kind === "duration" || item.completionSource === "tomato" && revision.kind !== "binary") && item.direction !== "atMost";
    const recordStep = getRecordStep(revision.kind, revision.unit, revision.recordStep);
    const rule = evaluateItemRule(ctx.store, item, date);
    const inputStep = Math.min(getRecordStepInputStep(revision.kind, revision.unit), Number.isInteger(recordStep) ? 1 : 0.01);
    const scheduleMeta = revision.schedule.type === "interval" || revision.schedule.type === "quota" ? ` · ${formatScheduleLabel(revision.schedule)}` : "";
    const meta = [item.group, t(KIND_LABELS[revision.kind])].filter(Boolean).join(" · ") + scheduleMeta;
    const progressUnit = revision.schedule.type === "quota" && revision.schedule.quota?.countMode === "dates" ? t("common.days") : revision.unit || t("today.unitDefault");
    const priority = item.priority || "medium";
    const timeSlot = item.timeSlot || "any";
    const completionSource = item.completionSource || "manual";
    const unit = revision.unit || t("today.unitDefault");
    /* T-1222：当日已跳过（未完成）的卡片显示中性徽章；仍可打卡，完成优先于跳过。 */
    const skipToday = getSkipDatesForItem(ctx.store, item.id).has(dateKey(date)) && !complete;
    /* T-1239：at-most 戒除卡——破戒状态决定按钮语义；无破戒即完成（进已完成区）。 */
    const atMost = item.direction === "atMost";
    const lapseExists = atMost ? getEventsForDay(ctx.store, item.id, date).some((ev) => !isSkipEvent(ev)) : false;
    const canRecordDetails = !isBinary || (atMost ? !lapseExists : !complete);
    const recordLabel = atMost
        ? (lapseExists ? t("item.cancelLapse") : t("item.recordLapse"))
        : complete ? t("item.cancel") : t("item.checkin");
    const hasTimer = ctx.focusTimerItemId === item.id && completionSource !== "tomato";
    const focusLabel = t(hasTimer ? "item.focusView" : "item.focus");
    const focusShortLabel = t(hasTimer ? "item.focusViewShort" : "item.focusShort");
    const manualLabelKey = revision.kind === "duration" ? "item.manualDuration" : "item.manualEntry";
    const exactLabel = t(canFocus ? manualLabelKey : isBinary ? "item.noteEntry" : "item.exact");
    const stepText = formatNumber(recordStep);
    const longStep = stepText.length > 4 || [...unit].length > 4;
    const icon = isBinary && !ctx.bulkMode
        ? `<button class="lc-checkin__item-icon" type="button" data-action="toggle" aria-label="${atMost ? escapeHtml(recordLabel + " · " + item.name) : complete ? t("item.undoAria", {name: item.name}) : t("item.completeAria", {name: item.name})}">${renderIconMarkup(item.icon)}</button>`
        : `<span class="lc-checkin__item-icon" aria-hidden="true">${renderIconMarkup(item.icon)}</span>`;
    return `<article class="lc-checkin__item ${complete ? "is-complete" : ""}${skipToday ? " is-skip" : ""}" data-item-id="${escapeHtml(item.id)}" data-kind="${revision.kind}" data-direction="${atMost ? "atMost" : "atLeast"}" style="--item-progress: ${percent}%">
            ${icon}
            <div class="lc-checkin__item-body">
                <div class="lc-checkin__item-topline">
                    ${ctx.bulkMode ? `<span class="lc-checkin__item-name">${escapeHtml(item.name)}</span>` : `<button class="lc-checkin__item-name" type="button" data-edit-name aria-label="${escapeHtml(t("item.editAria", {name: item.name}))}" title="${escapeHtml(t("item.editAria", {name: item.name}))}">${escapeHtml(item.name)}</button>`}
                    ${(ctx.currentStreaks.get(item.id) || 0) > 1 ? ctx.bulkMode
                        ? `<span class="lc-checkin__streak-badge">🔥 ${ctx.currentStreaks.get(item.id)}</span>`
                        : `<button class="lc-checkin__streak-badge" type="button" data-streak-insights="${item.id}" title="${t("item.insightsTitle")}">🔥 ${ctx.currentStreaks.get(item.id)}</button>` : ""}
                    ${skipToday ? `<span class="lc-checkin__item-tag is-skip-tag">${t("today.skipBadge")}</span>` : ""}
                    ${atMost && !lapseExists ? `<span class="lc-checkin__item-tag is-avoided">${t("today.avoided")}</span>` : ""}
                    ${priority === "high" ? `<span class="lc-checkin__item-tag is-high">${t("priority.high")}</span>` : ""}
                    ${timeSlot !== "any" ? `<span class="lc-checkin__item-tag">${t(TIME_SLOT_LABELS[timeSlot])}</span>` : ""}
                    ${completionSource === "tomato" ? `<span class="lc-checkin__item-tag is-tomato">${item.tomatoMode === "sessions" ? t("item.tomatoSessions") : t("item.tomatoMinutes")}</span>` : ""}
                </div>
                <div class="lc-checkin__item-meta"${scheduleMeta ? " data-has-schedule" : ""}>${escapeHtml(meta)}</div>
                ${isBinary ? "" : `<div class="lc-checkin__item-value"><strong>${escapeHtml(formatNumber(progress))}</strong><span>${atMost ? escapeHtml(t("item.limitValue", {value: formatNumber(displayTarget), unit: progressUnit})) : `/ ${escapeHtml(formatNumber(displayTarget))} ${escapeHtml(progressUnit)}`}</span>${!atMost && rule.remaining ? `<small>${escapeHtml(t("today.remainingValue", {value: formatNumber(rule.remaining), unit: progressUnit}))}</small>` : ""}</div>`}
                ${!isBinary && !canFocus && (longStep || revision.schedule.type === "quota" && revision.schedule.quota?.countMode === "dates") ? `<div class="lc-checkin__item-step">${escapeHtml(t("item.quickCustom", {value: stepText, unit}))}</div>` : ""}
                ${isBinary ? "" : `<div class="lc-checkin__item-progress"><span style="width: ${percent}%"></span></div>`}
            </div>
            <div class="lc-checkin__item-action">
                ${ctx.bulkMode ? `<button class="lc-checkin__bulk-check${ctx.bulkSelected.has(item.id) ? " is-selected" : ""}" type="button" data-bulk-check="${escapeHtml(item.id)}" aria-pressed="${ctx.bulkSelected.has(item.id)}" aria-label="${t("item.select", {name: item.name})}">${ctx.bulkSelected.has(item.id) ? "✓" : ""}</button>` : `
                <button class="lc-checkin__small-button lc-checkin__item-secondary-action" type="button" data-action="insights" aria-label="${t("item.insightsAria", {name: item.name})}" title="${t("item.insightsTitle")}">${uiIcon("insight")}</button>
                <button class="lc-checkin__small-button lc-checkin__item-secondary-action" type="button" data-action="edit" aria-label="${t("item.editAria", {name: item.name})}" title="${t("item.editAria", {name: item.name})}">${uiIcon("edit")}</button>
                ${canFocus
                    ? `<button class="lc-checkin__focus-button lc-checkin__focus-primary" type="button" data-action="focus" aria-label="${escapeHtml(focusLabel + " · " + item.name)}" title="${escapeHtml(focusLabel + " · " + item.name)}">${uiIcon("timer")}<span class="lc-checkin__focus-label">${focusLabel}</span><span class="lc-checkin__focus-label-short" aria-hidden="true">${focusShortLabel}</span></button>`
                    : isBinary
                    ? `<button class="lc-checkin__record-button" type="button" data-action="record">${atMost ? recordLabel : complete ? t("item.cancel") : t("item.checkin")}</button>`
                    : `<button class="lc-checkin__quick-button" type="button" data-action="quick-record" data-amount="${stepText}" aria-label="${t("item.recordStep", {value: stepText, unit})}" title="${escapeHtml(t("item.recordStep", {value: stepText, unit}))}">${longStep ? t("item.record") : `+${stepText} <span>${escapeHtml(unit)}</span>`}</button>`}
                ${canRecordDetails ? `<button class="lc-checkin__more-button lc-checkin__entry-trigger" type="button" data-action="toggle-exact" aria-label="${exactLabel}" title="${exactLabel}" aria-expanded="false">${t(canFocus ? "item.manualShort" : isBinary ? "item.noteShort" : "item.exactShort")}</button>` : ""}
                ${ctx.todaySortMode === "manual" && !complete ? `<button class="lc-checkin__drag-handle" type="button" data-drag-handle aria-label="${t("item.dragSort", {name: item.name})}" title="${t("item.dragSort", {name: item.name})}">${uiIcon("more")}</button>` : ""}
                `}
            </div>
            ${ctx.bulkMode || !canRecordDetails ? "" : `<div class="lc-checkin__exact-entry" data-exact-entry hidden>
                ${isBinary ? "" : `<label><span>${t(canFocus ? manualLabelKey : "item.thisRecord")}</span><input class="lc-checkin__amount" type="number" inputmode="decimal" min="${inputStep}" step="${inputStep}" value="${formatNumber(recordStep)}" aria-label="${t("item.exactThis", {unit})}" /></label>
                <span>${escapeHtml(unit)}</span>`}
                <input class="lc-checkin__record-note" type="text" maxlength="2000" placeholder="${t("item.notePlaceholder")}" aria-label="${t("item.noteAria")}" />
                <label class="lc-checkin__attach-button" data-attach-button title="${t("item.photo")}"><input type="file" data-attach-file aria-label="${t("item.photo")}" accept="image/png,image/jpeg,image/webp,image/gif" />${uiIcon("camera")}</label>
                <button class="lc-checkin__record-button" type="button" data-action="record">${isBinary ? t(atMost ? "item.recordLapse" : "item.checkin") : t("item.record")}</button>
            </div>`}
        </article>`;
}

export function renderSyncNoticeView(active: boolean): string {
    return active
        ? `<div class="lc-checkin__sync-notice" role="status" aria-live="polite">${t("msg.syncedElsewhere")}</div>`
        : "";
}

export function renderUpcomingOccasionsView(occasionStore: OccasionStore): string {
    const today = dateKey(currentCalendarDate());
    const horizonDate = new Date(currentCalendarDate().getFullYear(), currentCalendarDate().getMonth(), currentCalendarDate().getDate() + 60);
    const horizon = dateKey(horizonDate);
    const items = occasionStore.occasions.filter((item) => item.enabled)
        .map((item) => ({item, next: getOccurrenceDate(item, today)}))
        .filter((entry): entry is {item: OccasionStore["occasions"][number]; next: string} => typeof entry.next === "string" && entry.next <= horizon)
        .sort((left, right) => left.next.localeCompare(right.next))
        .slice(0, 6);
    if (!items.length) return "";
    const rows = items.map(({item, next}) => {
        const icon = item.kind === "birthday" ? "🎂" : item.kind === "anniversary" ? "💍" : "◷";
        const days = Math.max(0, Math.round((parseLocalDateKey(next).getTime() - parseLocalDateKey(today).getTime()) / 86400000));
        return `<div class="lc-checkin__upcoming-row"><span aria-hidden="true">${icon}</span><strong>${escapeHtml(item.name)}</strong><span>${next}</span><em>${days === 0 ? t("review.today") : t("review.daysLater", {n: days})}</em></div>`;
    }).join("");
    return rows;
}

export function renderCheckinLogView(events: readonly CheckinEvent[], items: readonly CheckinItem[]): string {
    const rowBatchSize = 6;
    const dayBatchSize = 4;
    const itemNames = new Map(items.map((item) => [item.id, item]));
    const byDay = new Map<string, CheckinEvent[]>();
    for (const event of events) {
        const day = getEventDateKey(event);
        const list = byDay.get(day);
        if (list) list.push(event);
        else byDay.set(day, [event]);
    }
    const days = [...byDay.keys()].filter((day) => day <= dateKey(currentCalendarDate())).sort((left, right) => right.localeCompare(left)).slice(0, 14);
    if (!days.length) return "";
    const hierarchy = buildCheckinLogHierarchy<CheckinEvent>(days.map((day): CheckinLogDay<CheckinEvent> => ({date: day, events: byDay.get(day) || []})));

    const renderRowBatches = (rows: string[], labelKey: string, offset = 0): string => {
        const end = Math.min(offset + rowBatchSize, rows.length);
        const visible = rows.slice(offset, end).join("");
        if (end >= rows.length) return visible;
        const remaining = rows.length - end;
        const nextCount = Math.min(rowBatchSize, remaining);
        return `${visible}<details class="lc-checkin__log-more"><summary><span>${t(labelKey, {n: nextCount, remaining})}</span><i aria-hidden="true">⌄</i></summary><div class="lc-checkin__log-more-body">${renderRowBatches(rows, labelKey, end)}</div></details>`;
    };

    const renderDay = (day: string, dayEvents: readonly CheckinEvent[], open: boolean): string => {
        const eventsForDay = dayEvents.slice().sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
        const grouped = new Map<string, CheckinEvent[]>();
        for (const event of eventsForDay) {
            const key = `${event.itemId}\u0000${event.unit}`;
            const events = grouped.get(key);
            if (events) events.push(event); else grouped.set(key, [event]);
        }
        const rows = [...grouped.values()].map((events) => {
            const first = events[0];
            const item = itemNames.get(first.itemId);
            const icon = item?.icon || "✓";
            const name = item?.name || t("review.deletedItem");
            const total = events.reduce((sum, event) => sum + event.value, 0);
            const time = (event: CheckinEvent) => new Date(event.occurredAt).toLocaleTimeString(getPluginLocale(), {hour: "2-digit", minute: "2-digit"});
            if (events.length === 1) {
                const event = first;
                const thumb = event.attachment ? `<img class="lc-checkin__log-thumb" src="${event.attachment}" alt="${t("review.logPhotoAlt")}" loading="lazy" />` : "";
                return `<div class="lc-checkin__log-row${event.attachment ? " has-thumb" : ""}">${thumb}<span class="lc-checkin__log-icon" aria-hidden="true">${escapeHtml(icon)}</span><div class="lc-checkin__log-main"><strong>${escapeHtml(name)}</strong><small>${time(event)}${event.note ? " · " + escapeHtml(event.note) : ""}</small></div><span class="lc-checkin__log-value">${escapeHtml(formatNumber(total))}${escapeHtml(first.unit)}</span></div>`;
            }
            const eventRows = events.map((event) => `<div class="lc-checkin__log-subrow${event.attachment ? " has-thumb" : ""}">${event.attachment ? `<img class="lc-checkin__log-thumb" src="${event.attachment}" alt="${t("review.logPhotoAlt")}" loading="lazy" />` : ""}<time>${time(event)}</time><span>${event.note ? escapeHtml(event.note) : t("review.logNoNote")}</span><strong>${escapeHtml(formatNumber(event.value))}${escapeHtml(event.unit)}</strong></div>`);
            return `<details class="lc-checkin__log-group"><summary><span class="lc-checkin__log-icon" aria-hidden="true">${escapeHtml(icon)}</span><span class="lc-checkin__log-main"><strong>${escapeHtml(name)}</strong><small>${t("review.logEntries", {n: events.length})} · ${time(events[0])}–${time(events[events.length - 1])}</small></span><span class="lc-checkin__log-value">${escapeHtml(formatNumber(total))}${escapeHtml(first.unit)}</span><i aria-hidden="true">⌄</i></summary><div class="lc-checkin__log-group-events">${renderRowBatches(eventRows, "review.logMoreEntries")}</div></details>`;
        });
        return `<details class="lc-checkin__log-day is-folded"${open ? " open" : ""}><summary><h3>${escapeHtml(formatHistoryDate(day))}<span class="lc-checkin__log-day-count">${t("review.logDayCount", {n: eventsForDay.length})}</span></h3><i class="lc-checkin__fold-chevron" aria-hidden="true">⌄</i></summary><div class="lc-checkin__log-day-body">${renderRowBatches(rows, "review.logMoreItems")}</div></details>`;
    };

    const renderDayBatches = (weekDays: CheckinLogDay<CheckinEvent>[], offset = 0): string => {
        const end = Math.min(offset + dayBatchSize, weekDays.length);
        const visible = weekDays.slice(offset, end).map((day, index) => renderDay(day.date, day.events, offset + index === 0)).join("");
        if (end >= weekDays.length) return visible;
        const remaining = weekDays.length - end;
        const nextCount = Math.min(dayBatchSize, remaining);
        return `${visible}<details class="lc-checkin__log-more is-days"><summary><span>${t("review.logMoreDays", {n: nextCount, remaining})}</span><i aria-hidden="true">⌄</i></summary><div class="lc-checkin__log-more-body">${renderDayBatches(weekDays, end)}</div></details>`;
    };

    const compactDate = (value: string) => parseLocalDateKey(value).toLocaleDateString(getPluginLocale(), {month: "numeric", day: "numeric"});
    return `<div class="lc-checkin__log-tree">${hierarchy.map((month, monthIndex) => `<details class="lc-checkin__log-month"${monthIndex === 0 ? " open" : ""}>
        <summary><strong>${t("date.monthYear", {year: month.year, month: month.month})}</strong><span>${t("review.logPeriodCount", {days: month.dayCount, events: month.eventCount})}</span><i class="lc-checkin__fold-chevron" aria-hidden="true">⌄</i></summary>
        <div class="lc-checkin__log-month-body">${month.weeks.map((week, weekIndex) => `<details class="lc-checkin__log-week"${weekIndex === 0 ? " open" : ""}>
            <summary><strong>${t("review.logWeekTitle")} · ${escapeHtml(compactDate(week.startDate))}—${escapeHtml(compactDate(week.endDate))}</strong><span>${t("review.logPeriodCount", {days: week.days.length, events: week.eventCount})}</span><i class="lc-checkin__fold-chevron" aria-hidden="true">⌄</i></summary>
            <div class="lc-checkin__log-week-body">${renderDayBatches(week.days)}</div>
        </details>`).join("")}</div>
    </details>`).join("")}</div>`;
}

function todayGroupKeyOf(groupMode: TodayGroupMode, item: CheckinItem): string {
    if (groupMode === "none") return "__all__";
    if (groupMode === "priority") return item.priority || "medium";
    if (groupMode === "time") return item.timeSlot || "any";
    return item.group?.trim() || t("review.ungrouped");
}

function todayGroupLabelOf(groupMode: TodayGroupMode, key: string): string {
    if (groupMode === "none") return t("today.pendingItems");
    if (groupMode === "priority") return t(PRIORITY_LABELS[key as CheckinPriority] || PRIORITY_LABELS.medium);
    if (groupMode === "time") return t(TIME_SLOT_LABELS[key as CheckinTimeSlot] || TIME_SLOT_LABELS.any);
    return key;
}

export function renderTodayGroupsView(items: CheckinItem[], date: Date, ctx: TodayViewContext): string {
    const groups = new Map<string, CheckinItem[]>();
    items.forEach((item) => {
        const key = todayGroupKeyOf(ctx.todayGroupMode, item);
        const group = groups.get(key);
        if (group) group.push(item);
        else groups.set(key, [item]);
    });
    const order = ctx.todayGroupMode === "priority"
        ? ["high", "medium", "low"]
        : ctx.todayGroupMode === "time" ? ["morning", "afternoon", "evening", "any"] : [];
    const entries = [...groups.entries()].sort(([left], [right]) => {
        if (order.length) return order.indexOf(left) - order.indexOf(right);
        if (left === t("review.ungrouped")) return 1;
        if (right === t("review.ungrouped")) return -1;
        return left.localeCompare(right, "zh-CN");
    });
    return entries.map(([key, groupItems]) => {
        const stateKey = `${ctx.todayGroupMode}:${key}`;
        const collapsed = ctx.collapsedTodayGroups.has(stateKey);
        return `<section class="lc-checkin__group">
                <button class="lc-checkin__group-header" type="button" data-group-toggle="${escapeHtml(stateKey)}" aria-expanded="${!collapsed}">
                    <span>${escapeHtml(todayGroupLabelOf(ctx.todayGroupMode, key))}</span><em>${groupItems.length}</em><i aria-hidden="true">${uiIcon("forward")}</i>
                </button>
                <div class="lc-checkin__group-items" ${collapsed ? "hidden" : ""}>${groupItems.map((item) => renderItemView(item, date, ctx)).join("")}</div>
            </section>`;
    }).join("");
}

export function renderTodayView(ctx: TodayViewContext): string {
    const now = currentCalendarDate();
    const activeItems = ctx.store.items.filter((item) => !item.archived);
    const scheduledItems = ctx.store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, now) && isScheduledToday(item, now));
    const query = ctx.todayQuery.trim().toLocaleLowerCase();
    const visibleItems = query
        ? scheduledItems.filter((item) => `${item.name} ${item.group || ""}`.toLocaleLowerCase().includes(query))
        : scheduledItems;
    const filteredItems = ctx.pendingOnly ? visibleItems.filter((item) => !isComplete(ctx.store, item, now)) : visibleItems;
    const pendingItems = sortCheckinItems(filteredItems.filter((item) => !isComplete(ctx.store, item, now)), ctx.todaySortMode);
    const completedItems = sortCheckinItems(filteredItems.filter((item) => isComplete(ctx.store, item, now)), ctx.todaySortMode);
    const completed = scheduledItems.filter((item) => isComplete(ctx.store, item, now)).length;
    const completionRate = scheduledItems.length ? Math.round((completed / scheduledItems.length) * 100) : 0;
    const weekStrip = Array.from({length: 7}, (_, index) => {
        const day = new Date(now);
        day.setDate(now.getDate() - (6 - index));
        const dayItems = ctx.store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, day) && isScheduledToday(item, day));
        const done = dayItems.filter((item) => isComplete(ctx.store, item, day)).length;
        const status = !dayItems.length ? "empty" : done === dayItems.length ? "complete" : done ? "partial" : "pending";
        const isToday = dateKey(day) === dateKey(now);
        return `<span class="lc-checkin__day-chip is-${status} ${isToday ? "is-today" : ""}" title="${escapeHtml(t("date.chipTitle", {date: day.toLocaleDateString(getPluginLocale(), {month: "long", day: "numeric"}), done, total: dayItems.length}))}"><small>${day.toLocaleDateString(getPluginLocale(), {weekday: "short"})}</small><strong>${day.getDate()}</strong><i aria-hidden="true"></i></span>`;
    }).join("");
    const emptyProgressTitle = ctx.pendingOnly
        ? t("today.pendingEmpty")
        : query ? t("today.queryCompleted") : t("today.allDone");
    const date = now.toLocaleDateString(getPluginLocale(), {month: "long", day: "numeric", weekday: "long"});
    const list = !activeItems.length && ctx.store.items.length ? `
            <div class="lc-checkin__empty">
                <div class="lc-checkin__empty-mark">▱</div>
                <div class="lc-checkin__empty-title">${t("today.emptyActiveTitle")}</div>
                <div class="lc-checkin__empty-description">${t("today.emptyActiveDesc")}</div>
                <div class="lc-checkin__empty-actions"><button class="lc-checkin__text-button" type="button" data-action="archived">${t("today.viewArchived")}</button><button class="lc-checkin__text-button" type="button" data-action="add">${t("nav.add")}</button></div>
            </div>` : !activeItems.length ? `
            <div class="lc-checkin__empty lc-checkin__empty--onboard">
                <div class="lc-checkin__empty-mark">✦</div>
                <div class="lc-checkin__empty-title">${t("today.emptyOnboardTitle")}</div>
                <div class="lc-checkin__empty-description">${t("today.emptyOnboardDesc")}</div>
                <ol class="lc-checkin__onboard-steps">
                    <li><span class="lc-checkin__onboard-num" aria-hidden="true">1</span><div><strong>${t("today.step1Title")}</strong><small>${t("today.step1Desc")}</small></div></li>
                    <li><span class="lc-checkin__onboard-num" aria-hidden="true">2</span><div><strong>${t("today.step2Title")}</strong><small>${t("today.step2Desc")}</small></div></li>
                    <li><span class="lc-checkin__onboard-num" aria-hidden="true">3</span><div><strong>${t("today.step3Title")}</strong><small>${t("today.step3Desc")}</small></div></li>
                </ol>
                <button class="lc-checkin__text-button" type="button" data-action="add">${t("today.addFirst")}</button>
            </div>` : !scheduledItems.length ? `
            <div class="lc-checkin__empty">
                <div class="lc-checkin__empty-mark">◷</div>
                <div class="lc-checkin__empty-title">${t("today.emptyScheduledTitle")}</div>
                <div class="lc-checkin__empty-description">${t("today.emptyScheduledDesc")}</div>
                <div class="lc-checkin__empty-actions"><button class="lc-checkin__text-button" type="button" data-action="history">${t("today.viewHistory")}</button><button class="lc-checkin__text-button" type="button" data-action="add">${t("nav.add")}</button></div>
            </div>` : !visibleItems.length ? `
            <div class="lc-checkin__today-search-empty">
                <span>⌕</span><strong>${t("today.searchEmpty")}</strong><small>${t("today.searchEmptyHint")}</small>
                <button class="lc-checkin__text-button" type="button" data-action="clear-search">${t("common.clearFilter")}</button>
            </div>` : `${pendingItems.length
            ? renderTodayGroupsView(pendingItems, now, ctx)
            : `<div class="lc-checkin__all-done"><span>✓</span><strong>${emptyProgressTitle}</strong></div>`}
            ${completedItems.length ? `<section class="lc-checkin__completed-section" aria-expanded="${!ctx.completedCollapsed}">
                <button class="lc-checkin__section-toggle" type="button" data-action="toggle-completed" aria-expanded="${!ctx.completedCollapsed}">
                    <span class="lc-checkin__section-title"><i>✓</i> ${t("today.completed")}</span>
                    <span class="lc-checkin__section-count">${completedItems.length}</span>
                    <span class="lc-checkin__chevron">${ctx.completedCollapsed ? "⌄" : "⌃"}</span>
                </button>
                <div class="lc-checkin__group-items" ${ctx.completedCollapsed ? "hidden" : ""}>${completedItems.map((item) => renderItemView(item, now, ctx)).join("")}</div>
            </section>` : ""}`;
    const recentRecord = renderRecentRecordView(ctx.recentRecord, ctx.reducedMotion);
    const saveStatus = renderSaveStatusView(ctx.saveState);
    const occasionBanner = renderOccasionBannerView(ctx.occasionStore, now);
    const priorityReminder = renderPriorityReminderView(ctx.store, ctx.occasionStore, now, ctx.reminderUserActions || [], ctx.priorityReminderExpanded === true);
    const occasionIsToday = getVisibleOccasions(ctx.occasionStore, now).some((item) => item.status === "today");
    const focusCandidate = pendingItems.find((item) => {
        const kind = getItemRevisionForDate(item, now).kind;
        return item.direction !== "atMost" && (kind === "duration" || item.completionSource === "tomato" && kind !== "binary");
    });
    return `<div class="lc-checkin lc-checkin--today" data-density="${scheduledItems.length > 12 ? "compact" : "comfortable"}" data-bulk="${ctx.bulkMode}" data-appearance="${ctx.appearance}" data-reduced-motion="${ctx.reducedMotion}">
            <header class="lc-checkin__header">
                <div class="lc-checkin__header-titles">
                    <h1 class="lc-checkin__title">${t("today.title")}</h1>
                    <span class="lc-checkin__header-date">${escapeHtml(date)}</span>
                </div>
                <div class="lc-checkin__header-actions">
                    ${ctx.supportsCustomTab ? `<button class="lc-checkin__small-button" type="button" data-action="open-tab" aria-label="${t("today.openTab")}" title="${t("today.openTab")}">${uiIcon("external")}</button>` : ""}
                    <button class="lc-checkin__icon-button" type="button" data-action="add" aria-label="${t("editor.create")}" title="${t("editor.create")}">${uiIcon("add")}<span>${t("editor.create")}</span></button>
                </div>
            </header>
            <section class="lc-checkin__overview" aria-label="${t("today.progressAria")}">
                <div class="lc-checkin__overview-progress"><div><span class="lc-checkin__overview-label">${t("today.progressAria")}</span><span class="lc-checkin__count" role="status" aria-label="${t("today.progressAria")}">${completed}<span>/</span>${scheduledItems.length}</span><span class="lc-checkin__overview-caption">${t("today.atYourPace")}</span></div><span class="lc-checkin__overview-ring" aria-hidden="true" style="--overview-progress: ${completionRate}%">${completionRate}%</span><div class="lc-checkin__progress" aria-hidden="true"><span style="width: ${completionRate}%"></span></div></div>
                ${ctx.bestStreakValue > 1 && ctx.bestStreakItem ? `<div class="lc-checkin__overview-streak"><span class="lc-checkin__overview-label">${t("today.bestStreakTitle")}</span><strong>${ctx.bestStreakValue}<small>${t("common.days")}</small></strong><span class="lc-checkin__overview-streak-name" title="${escapeHtml(ctx.bestStreakItem.name)}">${escapeHtml(ctx.bestStreakItem.name)}</span></div>` : ""}
                ${focusCandidate ? `<div class="lc-checkin__overview-focus"><span class="lc-checkin__overview-label">${t("today.focusMoment")}</span><strong>${escapeHtml(focusCandidate.name)}</strong><button type="button" class="lc-checkin__text-button" data-overview-focus="${escapeHtml(focusCandidate.id)}">${uiIcon("timer")}${t("item.focus")}</button></div>` : ""}
            </section>
            ${ctx.weekStripVisible ? `<section class="lc-checkin__week-strip" aria-label="${t("today.weekStripAria")}">${weekStrip}</section>` : ""}
            ${saveStatus}
            ${priorityReminder}
            ${occasionIsToday ? occasionBanner : ""}
            ${scheduledItems.length ? `<div class="lc-checkin__organize">
                <label class="lc-checkin__today-search"><span aria-hidden="true">⌕</span><input data-today-search type="search" value="${escapeHtml(ctx.todayQuery)}" placeholder="${t("today.filterPlaceholder")}" aria-label="${t("today.filterPlaceholder")}" />${ctx.todayQuery ? `<button type="button" data-action="clear-search" aria-label="${t("today.clearFilter")}" title="${t("today.clearFilter")}">×</button>` : ""}</label>
                <details class="lc-checkin__today-filters" data-today-filters ${ctx.pendingOnly ? "open" : ""}><summary>${ctx.pendingOnly ? t("today.filterActive") : t("today.filter")}</summary><div class="lc-checkin__today-filter-fields"><label><span>${t("today.group")}</span><select data-group-mode aria-label="${t("today.groupMode")}">
                    <option value="none" ${ctx.todayGroupMode === "none" ? "selected" : ""}>${t("set.groupNone")}</option>
                    <option value="group" ${ctx.todayGroupMode === "group" ? "selected" : ""}>${t("today.groupCustom")}</option>
                    <option value="time" ${ctx.todayGroupMode === "time" ? "selected" : ""}>${t("today.groupTime")}</option>
                    <option value="priority" ${ctx.todayGroupMode === "priority" ? "selected" : ""}>${t("today.groupPriority")}</option>
                </select></label><label><span>${t("today.sortLabel")}</span><select data-sort-mode aria-label="${t("today.sortAria")}">${Object.entries(SORT_LABELS).map(([value, label]) => `<option value="${value}" ${ctx.todaySortMode === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label><button class="lc-checkin__filter-toggle ${ctx.pendingOnly ? "is-active" : ""}" type="button" data-action="toggle-pending-only" aria-pressed="${ctx.pendingOnly}">${t("today.pendingOnly")}</button></div></details>
                <button class="lc-checkin__filter-toggle ${ctx.bulkMode ? "is-active" : ""}" type="button" data-action="toggle-bulk" aria-pressed="${ctx.bulkMode}">${t("today.bulk")}</button>
            </div>` : ""}
            ${ctx.bulkMode ? `<div class="lc-checkin__bulk-bar" data-bulk-toolbar role="toolbar" aria-label="${t("today.bulkAria")}">
                <strong data-bulk-selected-count role="status" aria-live="polite">${t("today.bulkSelectedCount", {n: ctx.bulkSelected.size})}</strong>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-all">${t("today.bulkAll")}</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-complete" data-bulk-selection-action ${ctx.bulkSelected.size ? "" : "disabled"}>${t("today.bulkComplete")}</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-skip" data-bulk-selection-action ${ctx.bulkSelected.size ? "" : "disabled"}>${t("today.bulkSkip")}</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-archive" data-bulk-selection-action ${ctx.bulkSelected.size ? "" : "disabled"}>${t("today.bulkArchive")}</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-delete" data-bulk-selection-action ${ctx.bulkSelected.size ? "" : "disabled"}>${t("today.bulkDelete")}</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-exit">${t("today.bulkExit")}</button>
            </div>` : ""}
            ${ctx.celebration ? `<div class="lc-checkin__celebration" role="status"><span class="lc-checkin__celebration-icon" aria-hidden="true">🎉</span><span>专注 <strong>${ctx.celebration.message}</strong> 已完成 · ${ctx.celebration.itemName}</span></div>` : ""}
            <main class="lc-checkin__list">${list}${occasionIsToday ? "" : occasionBanner}</main>
            ${recentRecord}
        </div>`;
}
