/* 回顾页碎片渲染：近期事项 / 打卡日志。
   从 index.ts 类方法外置；依赖以显式参数传入，无插件实例状态。 */
import {t, getPluginLocale} from "../i18n";
import {dateKey, getEventDateKey, getItemRevisionForDate, getProgress, isComplete, isItemAvailableOnDate, isScheduledToday, sortCheckinItems} from "../model";
import {evaluateRule} from "../rules";
import {currentCalendarDate, escapeHtml, formatHistoryDate, formatNumber, parseLocalDateKey, renderIconMarkup, getRecordStep, getEditorStep, formatScheduleLabel} from "../shared";
import {getOccurrenceDate, getVisibleOccasions, isOccasionCompleted} from "../occasions";
import {uiIcon} from "../ui/icons";
import {KIND_LABELS, PRIORITY_LABELS, SORT_LABELS, TIME_SLOT_LABELS} from "../ui/labels";
import type {TodayGroupMode} from "../view-preferences";
import type {CheckinEvent, CheckinItem, CheckinItemSortMode, CheckinPriority, CheckinStore, CheckinTimeSlot} from "../types";
import type {OccasionStore} from "../occasions";

export interface TodayItemContext {
    store: CheckinStore;
    currentStreaks: Map<string, number>;
    bulkMode: boolean;
    bulkSelected: Set<string>;
    todaySortMode: CheckinItemSortMode;
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
}

export type SaveState = "idle" | "saving" | "error";

export function renderOccasionBannerView(occasionStore: OccasionStore, date: Date): string {
    const items = getVisibleOccasions(occasionStore, date).slice(0, 3);
    const chips = items.map((item) => {
        const icon = item.kind === "birthday" ? "🎂" : item.kind === "anniversary" ? "💍" : "◷";
        const timing = item.status === "today" ? t("review.today") : t("review.daysLater", {n: item.daysUntil});
        const completed = isOccasionCompleted(item, item.occurrenceDate);
        return `<button type="button" class="lc-checkin__occasion-chip ${completed ? "is-complete" : ""}" data-action="occasions" title="${escapeHtml(item.name)} · ${timing}"><span aria-hidden="true">${icon}</span><strong>${escapeHtml(item.name)}</strong><small>${timing}</small></button>`;
    }).join("");
    return `<section class="lc-checkin__occasion-banner" aria-label="${t("today.occasionTitle")}">
            <span class="lc-checkin__occasion-banner-icon" aria-hidden="true">${uiIcon("calendar")}</span>
            <div class="lc-checkin__occasion-banner-body">
                <strong>${t("today.occasionTitle")}</strong>
                ${items.length ? `<div class="lc-checkin__occasion-chips">${chips}</div>` : `<small>${t("today.occasionEmpty")}</small>`}
            </div>
            <button class="lc-checkin__text-button" type="button" data-action="occasions">${t("common.manage")}</button>
        </section>`;
}

export function renderSaveStatusView(state: SaveState): string {
    return state === "saving"
        ? `<div class="lc-checkin__save-status is-saving" role="status" aria-live="polite">${t("msg.saving")}</div>`
        : state === "error"
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
    const canFocus = revision.kind === "duration";
    const recordStep = getRecordStep(revision.kind, revision.unit);
    const rule = evaluateRule(item, ctx.store.events, date);
    const inputStep = getEditorStep(revision.kind, revision.unit);
    const scheduleMeta = revision.schedule.type === "interval" || revision.schedule.type === "quota" ? ` · ${formatScheduleLabel(revision.schedule)}` : "";
    const meta = (isBinary ? t(KIND_LABELS[revision.kind]) : `${t(KIND_LABELS[revision.kind])} · ${formatNumber(progress)} / ${formatNumber(displayTarget)} ${revision.schedule.type === "quota" && revision.schedule.quota?.countMode === "dates" ? "天" : revision.unit || "次"}${rule.remaining ? ` · 还需 ${formatNumber(rule.remaining)}${revision.schedule.type === "quota" && revision.schedule.quota?.countMode === "dates" ? "天" : revision.unit || "次"}` : ""}`) + scheduleMeta;
    const priority = item.priority || "medium";
    const timeSlot = item.timeSlot || "any";
    const completionSource = item.completionSource || "manual";
    const unit = revision.unit || "次";
    const icon = isBinary
        ? `<button class="lc-checkin__item-icon" type="button" data-action="toggle" aria-label="${complete ? t("item.undoAria", {name: item.name}) : t("item.completeAria", {name: item.name})}">${renderIconMarkup(item.icon)}</button>`
        : `<span class="lc-checkin__item-icon" aria-hidden="true">${renderIconMarkup(item.icon)}</span>`;
    return `<article class="lc-checkin__item ${complete ? "is-complete" : ""}" data-item-id="${escapeHtml(item.id)}" style="--item-progress: ${percent}%">
            ${icon}
            <div class="lc-checkin__item-body">
                <div class="lc-checkin__item-topline">
                    <span class="lc-checkin__item-name">${escapeHtml(item.name)}</span>
                    ${(ctx.currentStreaks.get(item.id) || 0) > 1 ? `<button class="lc-checkin__streak-badge" type="button" data-streak-insights="${item.id}" title="${t("item.insightsTitle")}">🔥 ${ctx.currentStreaks.get(item.id)}</button>` : ""}
                    ${priority === "high" ? `<span class="lc-checkin__item-tag is-high">${t("priority.high")}</span>` : ""}
                    ${timeSlot !== "any" ? `<span class="lc-checkin__item-tag">${t(TIME_SLOT_LABELS[timeSlot])}</span>` : ""}
                    ${completionSource === "tomato" ? `<span class="lc-checkin__item-tag is-tomato">${item.tomatoMode === "sessions" ? t("item.tomatoSessions") : t("item.tomatoMinutes")}</span>` : ""}
                    <button class="lc-checkin__small-button" type="button" data-action="insights" aria-label="${t("item.insightsAria", {name: item.name})}" title="${t("item.insightsTitle")}">${uiIcon("insight")}</button>
                    <button class="lc-checkin__small-button" type="button" data-action="edit" aria-label="${t("item.editAria", {name: item.name})}" title="${t("item.editAria", {name: item.name})}">${uiIcon("edit")}</button>
                </div>
                <div class="lc-checkin__item-meta">${escapeHtml(meta)}</div>
                ${isBinary ? "" : `<div class="lc-checkin__item-progress"><span style="width: ${percent}%"></span></div>`}
            </div>
            <div class="lc-checkin__item-action">
                ${ctx.bulkMode ? `<button class="lc-checkin__bulk-check${ctx.bulkSelected.has(item.id) ? " is-selected" : ""}" type="button" data-bulk-check="${escapeHtml(item.id)}" aria-pressed="${ctx.bulkSelected.has(item.id)}" aria-label="${t("item.select", {name: item.name})}">${ctx.bulkSelected.has(item.id) ? "✓" : ""}</button>` : ""}
                ${canFocus ? `<button class="lc-checkin__focus-button" type="button" data-action="focus" aria-label="${t("item.focus")}" title="${t("item.focus")}">${uiIcon("timer")}</button>` : ""}
                ${isBinary
                    ? `<button class="lc-checkin__record-button" type="button" data-action="record">${complete ? t("item.cancel") : t("item.checkin")}</button>`
                    : `<button class="lc-checkin__quick-button" type="button" data-action="quick-record" data-amount="${formatNumber(recordStep)}" aria-label="${t("item.recordStep", {value: formatNumber(recordStep), unit})}">+${formatNumber(recordStep)} <span>${escapeHtml(unit)}</span></button>`}
                ${isBinary && complete ? "" : `<button class="lc-checkin__more-button" type="button" data-action="toggle-exact" aria-label="${t("item.exact")}" title="${t("item.exact")}" aria-expanded="false">${uiIcon("more")}</button>`}
                ${ctx.todaySortMode === "manual" && !complete ? `<button class="lc-checkin__drag-handle" type="button" data-drag-handle aria-label="${t("item.dragSort", {name: item.name})}" title="${t("item.dragSort", {name: item.name})}">${uiIcon("more")}</button>` : ""}
            </div>
            ${isBinary && complete ? "" : `<div class="lc-checkin__exact-entry" data-exact-entry hidden>
                ${isBinary ? "" : `<label><span>本次记录</span><input class="lc-checkin__amount" type="number" inputmode="decimal" min="${inputStep}" step="${inputStep}" value="${formatNumber(recordStep)}" aria-label="${t("item.exactThis", {unit})}" /></label>
                <span>${escapeHtml(unit)}</span>`}
                <input class="lc-checkin__record-note" type="text" maxlength="2000" placeholder="${t("item.notePlaceholder")}" aria-label="${t("item.noteAria")}" />
                <label class="lc-checkin__attach-button" data-attach-button title="${t("item.photo")}"><input type="file" data-attach-file accept="image/png,image/jpeg,image/webp,image/gif" />📷</label>
                <button class="lc-checkin__record-button" type="button" data-action="record">${isBinary ? t("item.checkin") : t("item.record")}</button>
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
    const daySections = days.map((day) => {
        const dayEvents = (byDay.get(day) || []).slice().sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
        const rows = dayEvents.map((event) => {
            const item = itemNames.get(event.itemId);
            const icon = item?.icon || "✓";
            const name = itemNames.get(event.itemId)?.name || t("review.deletedItem");
            const time = new Date(event.occurredAt).toLocaleTimeString(getPluginLocale(), {hour: "2-digit", minute: "2-digit"});
            const thumb = event.attachment ? `<img class="lc-checkin__log-thumb" src="${event.attachment}" alt="${t("review.logPhotoAlt")}" loading="lazy" />` : "";
            return `<div class="lc-checkin__log-row${event.attachment ? " has-thumb" : ""}">${thumb}<span class="lc-checkin__log-icon" aria-hidden="true">${escapeHtml(icon)}</span><div class="lc-checkin__log-main"><strong>${escapeHtml(name)}</strong><small>${time}${event.note ? " · " + escapeHtml(event.note) : ""}</small></div><span class="lc-checkin__log-value">${escapeHtml(formatNumber(event.value))}${escapeHtml(event.unit)}</span></div>`;
        }).join("");
        return `<div class="lc-checkin__log-day"><h3>${escapeHtml(formatHistoryDate(day))}</h3>${rows}</div>`;
    }).join("");
    return daySections;
}

function todayGroupKeyOf(groupMode: TodayGroupMode, item: CheckinItem): string {
    if (groupMode === "priority") return item.priority || "medium";
    if (groupMode === "time") return item.timeSlot || "any";
    return item.group?.trim() || t("review.ungrouped");
}

function todayGroupLabelOf(groupMode: TodayGroupMode, key: string): string {
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
                    <span>${escapeHtml(todayGroupLabelOf(ctx.todayGroupMode, key))}</span><em>${groupItems.length}</em><i>${collapsed ? "⌄" : "⌃"}</i>
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
            ${completedItems.length ? `<section class="lc-checkin__completed-section">
                <button class="lc-checkin__section-toggle" type="button" data-action="toggle-completed" aria-expanded="${!ctx.completedCollapsed}">
                    <span class="lc-checkin__section-title"><i>✓</i> ${t("today.completed")}</span>
                    <span class="lc-checkin__section-count">${completedItems.length}</span>
                    <span class="lc-checkin__chevron">${ctx.completedCollapsed ? "⌄" : "⌃"}</span>
                </button>
                <div class="lc-checkin__group-items" ${ctx.completedCollapsed ? "hidden" : ""}>${completedItems.map((item) => renderItemView(item, now, ctx)).join("")}</div>
            </section>` : ""}`;
    const recentRecord = ctx.recentRecord ? `<div class="lc-checkin__recent-record" role="status" aria-live="polite">
            <span><i>✓</i><strong>${escapeHtml(ctx.recentRecord.message)}</strong><small>当前 ${escapeHtml(formatNumber(ctx.recentRecord.progress))}/${escapeHtml(formatNumber(ctx.recentRecord.target))} ${escapeHtml(ctx.recentRecord.unit)}</small></span>
            <button type="button" data-action="undo-record">撤销</button>
        </div>` : "";
    const saveStatus = renderSaveStatusView(ctx.saveState);
    const occasionBanner = renderOccasionBannerView(ctx.occasionStore, now);
    return `<div class="lc-checkin lc-checkin--today" data-appearance="${ctx.appearance}" data-reduced-motion="${ctx.reducedMotion}">
            <header class="lc-checkin__header">
                <div class="lc-checkin__header-titles">
                    <h1 class="lc-checkin__title">${t("today.title")}</h1>
                    <span class="lc-checkin__header-date">${escapeHtml(date)}</span>
                </div>
                <div class="lc-checkin__header-actions">
                    ${ctx.bestStreakValue > 1 && ctx.bestStreakItem ? `<span class="lc-checkin__header-streak" title="当前最佳连续">🔥 ${escapeHtml(ctx.bestStreakItem.name)} ${ctx.bestStreakValue} 天</span>` : ""}
                    <span class="lc-checkin__count" role="status" aria-label="今日完成进度">${completed}<span>/</span>${scheduledItems.length}</span>
                    ${ctx.supportsCustomTab ? `<button class="lc-checkin__small-button" type="button" data-action="open-tab" aria-label="在页签打开" title="在页签打开">${uiIcon("external")}</button>` : ""}
                    <button class="lc-checkin__icon-button" type="button" data-action="add" aria-label="新建打卡项" title="新建打卡项">${uiIcon("add")}</button>
                </div>
            </header>
            <div class="lc-checkin__progress"><span style="width: ${completionRate}%"></span></div>
            ${ctx.weekStripVisible ? `<section class="lc-checkin__week-strip" aria-label="最近七天打卡状态">${weekStrip}</section>` : ""}
            ${recentRecord}
            ${saveStatus}
            ${scheduledItems.length ? `<div class="lc-checkin__organize">
                <label class="lc-checkin__today-search"><span aria-hidden="true">⌕</span><input data-today-search type="search" value="${escapeHtml(ctx.todayQuery)}" placeholder="${t("today.filterPlaceholder")}" aria-label="筛选打卡项" />${ctx.todayQuery ? `<button type="button" data-action="clear-search" aria-label="清除筛选" title="清除筛选">×</button>` : ""}</label>
                <details class="lc-checkin__today-filters" data-today-filters ${ctx.pendingOnly ? "open" : ""}><summary>${ctx.pendingOnly ? t("today.filterActive") : t("today.filter")}</summary><div class="lc-checkin__today-filter-fields"><label><span>${t("today.group")}</span><select data-group-mode aria-label="${t("today.groupMode")}">
                    <option value="group" ${ctx.todayGroupMode === "group" ? "selected" : ""}>自定义分组</option>
                    <option value="time" ${ctx.todayGroupMode === "time" ? "selected" : ""}>时间段</option>
                    <option value="priority" ${ctx.todayGroupMode === "priority" ? "selected" : ""}>重要性</option>
                </select></label><label><span>排序</span><select data-sort-mode aria-label="排序方式">${Object.entries(SORT_LABELS).map(([value, label]) => `<option value="${value}" ${ctx.todaySortMode === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label><button class="lc-checkin__filter-toggle ${ctx.pendingOnly ? "is-active" : ""}" type="button" data-action="toggle-pending-only" aria-pressed="${ctx.pendingOnly}">${t("today.pendingOnly")}</button></div></details>
                <button class="lc-checkin__filter-toggle ${ctx.bulkMode ? "is-active" : ""}" type="button" data-action="toggle-bulk" aria-pressed="${ctx.bulkMode}">${t("today.bulk")}</button>
            </div>` : ""}
            ${ctx.bulkMode ? `<div class="lc-checkin__bulk-bar" role="toolbar" aria-label="批量操作">
                <strong>已选 ${ctx.bulkSelected.size}</strong>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-all">全选待办</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-complete">全部完成</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-archive">归档</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-exit">退出多选</button>
            </div>` : ""}
            ${ctx.celebration ? `<div class="lc-checkin__celebration" role="status"><span class="lc-checkin__celebration-icon" aria-hidden="true">🎉</span><span>专注 <strong>${ctx.celebration.message}</strong> 已完成 · ${ctx.celebration.itemName}</span></div>` : ""}
            <main class="lc-checkin__list">${list}${occasionBanner}</main>
        </div>`;
}
