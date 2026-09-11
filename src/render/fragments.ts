/* 回顾页碎片渲染：近期事项 / 打卡日志。
   从 index.ts 类方法外置；依赖以显式参数传入，无插件实例状态。 */
import {t, getPluginLocale} from "../i18n";
import {dateKey, getEventDateKey, getItemRevisionForDate, getProgress, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";
import {evaluateRule} from "../rules";
import {currentCalendarDate, escapeHtml, formatHistoryDate, formatNumber, parseLocalDateKey, renderIconMarkup, getRecordStep, getEditorStep, formatScheduleLabel} from "../shared";
import {getOccurrenceDate, getVisibleOccasions, isOccasionCompleted} from "../occasions";
import {uiIcon} from "../ui/icons";
import {KIND_LABELS, PRIORITY_LABELS, TIME_SLOT_LABELS} from "../ui/labels";
import type {CheckinEvent, CheckinItem, CheckinItemSortMode, CheckinStore} from "../types";
import type {OccasionStore} from "../occasions";

export interface TodayItemContext {
    store: CheckinStore;
    currentStreaks: Map<string, number>;
    bulkMode: boolean;
    bulkSelected: Set<string>;
    todaySortMode: CheckinItemSortMode;
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
                    : `<button class="lc-checkin__quick-button" type="button" data-action="quick-record" data-amount="${formatNumber(recordStep)}" aria-label="${t("item.recordStep", {value: formatNumber(recordStep), unit})}">+${formatNumber(recordStep)} <span>${escapeHtml(unit)}</span></button>
                    <button class="lc-checkin__more-button" type="button" data-action="toggle-exact" aria-label="${t("item.exact")}" title="${t("item.exact")}" aria-expanded="false">${uiIcon("more")}</button>`}
                ${ctx.todaySortMode === "manual" && !complete ? `<button class="lc-checkin__drag-handle" type="button" data-drag-handle aria-label="${t("item.dragSort", {name: item.name})}" title="${t("item.dragSort", {name: item.name})}">${uiIcon("more")}</button>` : ""}
            </div>
            ${isBinary ? "" : `<div class="lc-checkin__exact-entry" data-exact-entry hidden>
                <label><span>本次记录</span><input class="lc-checkin__amount" type="number" inputmode="decimal" min="${inputStep}" step="${inputStep}" value="${formatNumber(recordStep)}" aria-label="${t("item.exactThis", {unit})}" /></label>
                <span>${escapeHtml(unit)}</span>
                <input class="lc-checkin__record-note" type="text" maxlength="2000" placeholder="${t("item.notePlaceholder")}" aria-label="${t("item.noteAria")}" />
                <label class="lc-checkin__attach-button" data-attach-button title="${t("item.photo")}"><input type="file" data-attach-file accept="image/png,image/jpeg,image/webp,image/gif" />📷</label>
                <button class="lc-checkin__record-button" type="button" data-action="record">${t("item.record")}</button>
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
