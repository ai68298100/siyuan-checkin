import {getVisibleOccasions, isOccasionCompleted, type OccasionStore} from "./occasions";
import {dateKey, isComplete, isItemAvailableOnDate, isScheduledToday} from "./model";
import type {CheckinStore} from "./types";

export type ReminderSource = "occasion" | "checkin";
export type ReminderStatus = "today" | "upcoming" | "completed";
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

const STATUS_RANK: Record<ReminderStatus, number> = {today: 0, upcoming: 1, completed: 2};

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

export function projectReminderCenter(store: CheckinStore, occasions: OccasionStore, date: Date): ReminderEntry[] {
    return sortReminderEntries([...projectCheckinReminders(store, date), ...projectOccasionReminders(occasions, date)]);
}
