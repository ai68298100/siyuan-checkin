import {daysBetweenHalfOpen, isValidDateKey} from "../date-keys";
import {normalizeDailyReminderSlots, reminderMinutesOfDay, type DailyReminderPreference} from "./reminder-preferences";

export interface ReminderDelivery {
    localDate: string;
    slot: string;
    context: "workspace";
}

export interface ReminderDeliveryState {
    version: 1;
    delivered: ReminderDelivery[];
    mutedDates: string[];
}

export function emptyReminderDeliveryState(): ReminderDeliveryState {
    return {version: 1, delivered: [], mutedDates: []};
}

export function deserializeReminderDeliveryState(value: unknown, today: string): ReminderDeliveryState | undefined {
    if (!isValidDateKey(today)) return undefined;
    if (value === undefined || value === null || value === "") return emptyReminderDeliveryState();
    let candidate: unknown = value;
    if (typeof candidate === "string") {
        try { candidate = JSON.parse(candidate); } catch { return undefined; }
    }
    if (!candidate || typeof candidate !== "object") return undefined;
    const source = candidate as Partial<ReminderDeliveryState>;
    if (source.version !== 1 || !Array.isArray(source.delivered) || !Array.isArray(source.mutedDates)) return undefined;
    if (source.mutedDates.some((date) => !isValidDateKey(date)) || source.delivered.some((entry) =>
        !entry || !isValidDateKey(entry.localDate) || entry.context !== "workspace"
        || (entry.slot !== "launch" && reminderMinutesOfDay(entry.slot) === undefined))) return undefined;
    const retained = (date: string) => {
        const age = daysBetweenHalfOpen(date, today);
        return age !== undefined && age >= 0 && age < 7;
    };
    const delivered = new Map<string, ReminderDelivery>();
    source.delivered.filter((entry) => retained(entry.localDate)).forEach((entry) => {
        delivered.set(`${entry.localDate}|${entry.context}|${entry.slot}`, {...entry});
    });
    return {
        version: 1,
        delivered: [...delivered.values()].sort((left, right) => left.localDate.localeCompare(right.localDate) || left.slot.localeCompare(right.slot)),
        mutedDates: [...new Set(source.mutedDates.filter(retained))].sort(),
    };
}

export function dueReminderDeliverySlots(state: ReminderDeliveryState, today: string, minutesOfDay: number, preference: DailyReminderPreference): string[] {
    if (!preference.enabled || state.mutedDates.includes(today) || !isValidDateKey(today)
        || !Number.isInteger(minutesOfDay) || minutesOfDay < 0 || minutesOfDay >= 1440) return [];
    const slots = normalizeDailyReminderSlots(preference.slots);
    const scheduled = slots.length ? slots.filter((slot) => minutesOfDay >= (reminderMinutesOfDay(slot) ?? 1441)) : ["launch"];
    return scheduled.filter((slot) => !state.delivered.some((entry) => entry.localDate === today && entry.context === "workspace" && entry.slot === slot));
}

export function markReminderDelivered(state: ReminderDeliveryState, today: string, slots: readonly string[]): ReminderDeliveryState {
    return deserializeReminderDeliveryState({
        ...state,
        delivered: [...state.delivered, ...slots.map((slot): ReminderDelivery => ({localDate: today, slot, context: "workspace"}))],
    }, today) ?? state;
}

export function muteReminderDeliveryToday(state: ReminderDeliveryState, today: string): ReminderDeliveryState {
    return deserializeReminderDeliveryState({...state, mutedDates: [...state.mutedDates, today]}, today) ?? state;
}
