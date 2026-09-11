/* 回顾页碎片渲染：近期事项 / 打卡日志。
   从 index.ts 类方法外置；依赖以显式参数传入，无插件实例状态。 */
import {t, getPluginLocale} from "../i18n";
import {dateKey, getEventDateKey} from "../model";
import {currentCalendarDate, escapeHtml, formatHistoryDate, formatNumber, parseLocalDateKey} from "../shared";
import {getOccurrenceDate} from "../occasions";
import type {CheckinEvent, CheckinItem} from "../types";
import type {OccasionStore} from "../occasions";

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
