import {getOccurrenceDate, getVisibleOccasions, isOccasionCompleted, type OccasionStore} from "./occasions";
import {dateKey, getEventsForDay, isComplete, isItemAvailableOnDate, isScheduledToday, isSkipEvent} from "./model";
import {daysBetweenHalfOpen, nextLocalDay} from "./date-keys";
import type {CheckinStore} from "./types";

export type ReminderSource = "occasion" | "checkin";
export type ReminderStatus = "overdue" | "today" | "upcoming" | "completed" | "snoozed" | "skipped";
export type ReminderFilter = "all" | "overdue" | "today" | "upcoming" | "completed";

export interface ReminderEntry {
    id: string;
    source: ReminderSource;
    sourceId: string;
    title: string;
    dueDate: string;
    daysUntil: number;
    status: ReminderStatus;
    note: string;
}

export interface OverdueOccurrenceEntry {
    id: string;
    occasionId: string;
    name: string;
    kind: string;
    recurrence: string;
    occurrenceDate: string;
    overdueDays: number;
    note: string;
}

const STATUS_RANK: Record<ReminderStatus, number> = {overdue: 0, today: 1, upcoming: 2, snoozed: 3, skipped: 4, completed: 5};

function sortReminderEntries(entries: ReminderEntry[]): ReminderEntry[] {
    return entries.sort((left, right) => STATUS_RANK[left.status] - STATUS_RANK[right.status]
        || left.daysUntil - right.daysUntil
        || left.title.localeCompare(right.title, "zh-CN")
        || left.id.localeCompare(right.id));
}

export function filterReminderEntries(entries: readonly ReminderEntry[], filter: ReminderFilter = "all"): ReminderEntry[] {
    /* T-1219 宽容提醒：「全部」是待办视图——已完成是终态、没有可执行动作，
       不再作为提醒列出（uhabits #1573 的教训：已录入后继续提示只会制造内疚）。
       「已完成」过滤仍可查看；snoozed/skipped 保留恢复入口。 */
    const visible = filter === "all"
        ? entries.filter((entry) => entry.status !== "completed")
        : entries.filter((entry) => entry.status === filter);
    return sortReminderEntries(visible.map((entry) => ({...entry})));
}

export function projectOccasionReminders(store: OccasionStore, date: Date): ReminderEntry[] {
    const reminders = getVisibleOccasions(store, date).map((occasion): ReminderEntry => {
        const completed = isOccasionCompleted(occasion, occasion.occurrenceDate);
        return {
            id: `occasion:${occasion.completionKey}`,
            source: "occasion",
            sourceId: occasion.id,
            title: occasion.name,
            dueDate: occasion.occurrenceDate,
            daysUntil: occasion.daysUntil,
            status: completed ? "completed" : occasion.status,
            note: occasion.note,
        };
    });
    return sortReminderEntries(reminders);
}

/** Project only uncompleted, unambiguous one-off occasions that have already passed. */
export function projectOverdueOccasionReminders(store: OccasionStore, date: Date): ReminderEntry[] {
    const dueDate = dateKey(date);
    const reminders = store.occasions.filter((occasion) => occasion.enabled !== false && occasion.recurrence === "once" && occasion.date < dueDate && !isOccasionCompleted(occasion, occasion.date))
        .map((occasion): ReminderEntry => ({
            id: `occasion:${occasion.id}:${occasion.date}`,
            source: "occasion",
            sourceId: occasion.id,
            title: occasion.name,
            dueDate: occasion.date,
            daysUntil: (daysBetweenHalfOpen(occasion.date, dueDate) ?? 0) * -1,
            status: "overdue",
            note: occasion.note,
        }));
    return sortReminderEntries(reminders);
}

export function projectCheckinReminders(store: CheckinStore, date: Date): ReminderEntry[] {
    const dueDate = dateKey(date);
    /* T-1223：跳过日不再提醒——用户显式跳过（且未完成）的当日机会不进入提醒中心。 */
    const reminders = store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, date) && isScheduledToday(item, date))
        .filter((item) => isComplete(store, item, date)
            || !getEventsForDay(store, item.id, date).some((event) => isSkipEvent(event)))
        .map((item): ReminderEntry => ({
            id: `checkin:${item.id}:${dueDate}`,
            source: "checkin",
            sourceId: item.id,
            title: item.name,
            dueDate,
            daysUntil: 0,
            status: isComplete(store, item, date) ? "completed" : "today",
            note: "",
        }));
    return sortReminderEntries(reminders);
}

/** T-100 逾期历史：枚举每个启用事项在过去发生、且从未补记的发生日（纯投影，只读）。
    补记走 markOccasionCompleted；跳过今天与未来，按发生日倒序返回。
    注意：本模块被 tests/occasions.test.cjs、tests/reminder-actions.test.cjs 以固定模块集
    转译加载；date-keys.ts 属于该固定集，新增共享依赖须同步两处加载清单。 */
export function projectOverdueOccurrenceHistory(store: OccasionStore, date: Date): OverdueOccurrenceEntry[] {
    const today = dateKey(date);
    const entries: OverdueOccurrenceEntry[] = [];
    for (const occasion of store.occasions) {
        if (occasion.enabled === false) continue;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(occasion.date) || occasion.date >= today) continue;
        const kind = occasion.kind === "birthday" ? "birthday" : occasion.kind === "anniversary" ? "anniversary" : "scheduled";
        let cursor = occasion.date;
        let guard = 0;
        while (cursor < today && guard < 1000) {
            guard += 1;
            if (!isOccasionCompleted(occasion, cursor)) {
                const overdueDays = daysBetweenHalfOpen(cursor, today) ?? 0;
                entries.push({
                    id: `overdue:${occasion.id}:${cursor}`,
                    occasionId: occasion.id,
                    name: occasion.name,
                    kind,
                    recurrence: occasion.recurrence,
                    occurrenceDate: cursor,
                    overdueDays,
                    note: occasion.note,
                });
            }
            const nextDayKey = nextLocalDay(cursor);
            if (!nextDayKey) break;
            const nextDate = getOccurrenceDate(occasion, nextDayKey);
            if (!nextDate || nextDate <= cursor) break;
            cursor = nextDate;
        }
    }
    return entries.sort((left, right) => right.occurrenceDate.localeCompare(left.occurrenceDate)
        || left.name.localeCompare(right.name, "zh-CN")
        || left.id.localeCompare(right.id));
}

export function projectReminderCenter(store: CheckinStore, occasions: OccasionStore, date: Date, userActions: readonly ReminderUserAction[] = []): ReminderEntry[] {
    /*
     * Keep the reminder-center hot path linear over occasions.  The previous
     * implementation projected overdue occasions, visible occasions, and
     * check-ins independently, sorting the occasion arrays twice and then
     * sorting their concatenation a third time.  That was harmless for a
     * handful of entries, but made the 2,000-item reminder benchmark highly
     * sensitive to host load.  One pass can classify a one-off past date as
     * overdue and all other dates through the normal visible-occurrence
     * resolver, followed by one stable sort.
     */
    const today = dateKey(date);
    const occasionEntries: ReminderEntry[] = [];
    for (const occasion of occasions.occasions) {
        if (occasion.enabled === false) continue;
        if (occasion.recurrence === "once" && occasion.date < today) {
            if (!isOccasionCompleted(occasion, occasion.date)) {
                const overdueDays = daysBetweenHalfOpen(occasion.date, today) ?? 0;
                occasionEntries.push({
                    id: `occasion:${occasion.id}:${occasion.date}`,
                    source: "occasion",
                    sourceId: occasion.id,
                    title: occasion.name,
                    dueDate: occasion.date,
                    daysUntil: -overdueDays,
                    status: "overdue",
                    note: occasion.note,
                });
            }
            continue;
        }
        const occurrenceDate = getOccurrenceDate(occasion, today);
        if (!occurrenceDate) continue;
        const daysUntil = differenceInLocalDays(today, occurrenceDate);
        if (daysUntil < 0 || daysUntil > occasion.remindBeforeDays) continue;
        const completed = isOccasionCompleted(occasion, occurrenceDate);
        occasionEntries.push({
            id: `occasion:${occasion.id}:${occurrenceDate}`,
            source: "occasion",
            sourceId: occasion.id,
            title: occasion.name,
            dueDate: occurrenceDate,
            daysUntil,
            status: completed ? "completed" : daysUntil === 0 ? "today" : "upcoming",
            note: occasion.note,
        });
    }
    const entries = [...occasionEntries, ...projectCheckinReminders(store, date)];
    return applyReminderActions(sortReminderEntries(entries), userActions, today, date.toISOString());
}

function differenceInLocalDays(from: string, to: string): number {
    return daysBetweenHalfOpen(from, to) ?? 0;
}

/* 11.0-C 延期与跳过：用户动作按稳定实例 ID 记录在独立存储里，投影只读地应用，
   绝不改动打卡或事项数据。snooze 仅在记录当日的本地日期内生效，跨日自动过期
   回到计算状态；skip 对该次实例持续生效；已完成是终态，任何动作都不能改写。
   T-1421 防抖：snooze 可选携带 expiresAt（ISO 时间）——在到期前该实例只呈现
   为已延期（重复通知防抖），到期后自动回到计算状态；不带 expiresAt 的历史
   snooze 沿用当日语义，旧存储零迁移。 */
export type ReminderUserActionType = "snooze" | "skip";
export interface ReminderUserAction { id: string; action: ReminderUserActionType; at: string; /** 可选防抖到期时间（ISO）；缺省沿用当日语义。 */ expiresAt?: string; }

export function normalizeReminderUserActions(value: unknown, limit = 200, now: Date = new Date()): ReminderUserAction[] {
    if (!Array.isArray(value)) return [];
    const max = Math.max(1, Math.min(500, Math.floor(limit)));
    /* T-1219：snooze 只在记录当日的本地日期内生效（applyReminderActions），
       超过 7 天的 snooze 已不可能再被投影到，物理清理防止历史堆积；
       skip 对该次实例持续生效，不受时效清理。
       T-1421：expiresAt 必须不早于 at 且不超过 at+7 天，否则丢弃该字段（回落当日语义）。 */
    const snoozeCutoff = now.getTime() - 7 * 86400000;
    return value.filter((entry): entry is ReminderUserAction => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Partial<ReminderUserAction>;
        return typeof candidate.id === "string" && candidate.id.length > 0 && candidate.id.length <= 200
            && (candidate.action === "snooze" || candidate.action === "skip")
            && typeof candidate.at === "string" && !Number.isNaN(Date.parse(candidate.at));
    }).filter((entry) => entry.action === "skip" || Date.parse(entry.at) >= snoozeCutoff)
        .slice(-max).map((entry) => {
            if (entry.action !== "snooze" || typeof (entry as Partial<ReminderUserAction>).expiresAt !== "string") return {id: entry.id, action: entry.action, at: entry.at};
            const expiresAt = (entry as Partial<ReminderUserAction>).expiresAt as string;
            const issuedAt = Date.parse(entry.at);
            const expiry = Date.parse(expiresAt);
            if (Number.isNaN(expiry) || expiry < issuedAt || expiry - issuedAt > 7 * 86400000) return {id: entry.id, action: entry.action, at: entry.at};
            return {id: entry.id, action: entry.action, at: entry.at, expiresAt};
        });
}

export function serializeReminderUserActions(actions: readonly ReminderUserAction[]): string {
    return JSON.stringify({version: 1, actions: normalizeReminderUserActions(actions)});
}

export function deserializeReminderUserActions(value: string): ReminderUserAction[] {
    try {
        const parsed = JSON.parse(value);
        return parsed?.version === 1 ? normalizeReminderUserActions(parsed.actions) : [];
    } catch { return []; }
}

/** 恢复 = 清除该实例的全部用户动作，条目回到计算状态。 */
export function clearReminderUserActions(actions: readonly ReminderUserAction[], id: string): ReminderUserAction[] {
    return actions.filter((entry) => entry.id !== id);
}

/** 应用用户动作。now 为显式 ISO 时间（由调用方从投影日期取得），用于防抖到期判定；
    缺省空串时仅当日语义生效（与旧调用兼容）。 */
export function applyReminderActions(entries: readonly ReminderEntry[], actions: readonly ReminderUserAction[], today: string, now = ""): ReminderEntry[] {
    const latest = new Map<string, ReminderUserAction>();
    for (const action of actions) latest.set(action.id, action);
    return entries.map((entry) => {
        const action = latest.get(entry.id);
        if (!action || entry.status === "completed") return entry;
        if (action.action === "skip") return {...entry, status: "skipped"};
        /* T-1421 防抖：带 expiresAt 的 snooze 以到期时间为准（窗口内已延期、到期回到
           计算状态，同日内亦可到期）；不带 expiresAt 的历史 snooze 沿用当日语义。 */
        if (typeof action.expiresAt === "string") {
            const expiry = Date.parse(action.expiresAt);
            const currentTime = now === "" ? Number.NaN : Date.parse(now);
            return Number.isFinite(expiry) && Number.isFinite(currentTime) && currentTime <= expiry ? {...entry, status: "snoozed"} : entry;
        }
        return action.at.slice(0, 10) === today ? {...entry, status: "snoozed"} : entry;
    });
}
