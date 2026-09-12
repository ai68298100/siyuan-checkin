import {getOccurrenceDate, getVisibleOccasions, isOccasionCompleted, type OccasionStore} from "./occasions";
import {dateKey, isComplete, isItemAvailableOnDate, isScheduledToday} from "./model";
import type {CheckinStore} from "./types";

export type ReminderSource = "occasion" | "checkin";
export type ReminderStatus = "overdue" | "today" | "upcoming" | "completed";
export type ReminderFilter = "all" | ReminderStatus;

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

const STATUS_RANK: Record<ReminderStatus, number> = {overdue: 0, today: 1, upcoming: 2, completed: 3};

function sortReminderEntries(entries: ReminderEntry[]): ReminderEntry[] {
    return entries.sort((left, right) => STATUS_RANK[left.status] - STATUS_RANK[right.status]
        || left.daysUntil - right.daysUntil
        || left.title.localeCompare(right.title, "zh-CN")
        || left.id.localeCompare(right.id));
}

export function filterReminderEntries(entries: readonly ReminderEntry[], filter: ReminderFilter = "all"): ReminderEntry[] {
    return sortReminderEntries(entries.filter((entry) => filter === "all" || entry.status === filter).map((entry) => ({...entry})));
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
            daysUntil: Math.round((new Date(`${dueDate}T00:00:00`).getTime() - new Date(`${occasion.date}T00:00:00`).getTime()) / 86400000) * -1,
            status: "overdue",
            note: occasion.note,
        }));
    return sortReminderEntries(reminders);
}

export function projectCheckinReminders(store: CheckinStore, date: Date): ReminderEntry[] {
    const dueDate = dateKey(date);
    const reminders = store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, date) && isScheduledToday(item, date))
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
    注意：本模块被 tests/occasions.test.cjs 以固定模块集转译加载，尽量不引入新依赖。 */
function localDateFromKey(key: string): Date {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
}

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
                const overdueDays = Math.round((localDateFromKey(today).getTime() - localDateFromKey(cursor).getTime()) / 86400000);
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
            const nextDay = localDateFromKey(cursor);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDate = getOccurrenceDate(occasion, dateKey(nextDay));
            if (!nextDate || nextDate <= cursor) break;
            cursor = nextDate;
        }
    }
    return entries.sort((left, right) => right.occurrenceDate.localeCompare(left.occurrenceDate)
        || left.name.localeCompare(right.name, "zh-CN")
        || left.id.localeCompare(right.id));
}

export function projectReminderCenter(store: CheckinStore, occasions: OccasionStore, date: Date): ReminderEntry[] {
    return sortReminderEntries([...projectOverdueOccasionReminders(occasions, date), ...projectCheckinReminders(store, date), ...projectOccasionReminders(occasions, date)]);
}
