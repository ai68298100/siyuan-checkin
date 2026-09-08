export type OccasionKind = "birthday" | "anniversary" | "scheduled";
export type OccasionRecurrence = "annual" | "once";

export interface Occasion {
    id: string;
    name: string;
    kind: OccasionKind;
    date: string;
    recurrence: OccasionRecurrence;
    remindBeforeDays: number;
    note: string;
    enabled: boolean;
    completedDates: string[];
    createdAt: string;
    updatedAt: string;
}

export interface OccasionStore {
    version: 1;
    occasions: Occasion[];
}

export type OccasionStatus = "today" | "upcoming";
export interface VisibleOccasion extends Occasion {
    occurrenceDate: string;
    status: OccasionStatus;
    daysUntil: number;
    completionKey: string;
}

export const OCCASIONS_STORAGE_NAME = "checkin-occasions";
export const OCCASIONS_STORE_VERSION = 1;

export function createDefaultOccasionStore(): OccasionStore {
    return {version: OCCASIONS_STORE_VERSION, occasions: []};
}

export function normalizeOccasionStore(value: unknown): OccasionStore {
    const source = value && typeof value === "object" ? value as Partial<OccasionStore> : {};
    const raw = Array.isArray(source.occasions) ? source.occasions : [];
    return {version: OCCASIONS_STORE_VERSION, occasions: raw.map(normalizeOccasion).filter((item): item is Occasion => Boolean(item))};
}

export function normalizeOccasion(value: unknown): Occasion | undefined {
    if (!value || typeof value !== "object") return undefined;
    const source = value as Partial<Occasion>;
    const name = typeof source.name === "string" ? source.name.trim().slice(0, 120) : "";
    const date = typeof source.date === "string" ? source.date.trim() : "";
    const kind = source.kind === "birthday" || source.kind === "anniversary" || source.kind === "scheduled" ? source.kind : "scheduled";
    const recurrence = source.recurrence === "once" ? "once" : "annual";
    if (!name || !isValidOccasionDate(date, recurrence)) return undefined;
    const now = new Date().toISOString();
    const completedDates = Array.isArray(source.completedDates) ? source.completedDates.filter((item): item is string => typeof item === "string" && isValidLocalDate(item)).slice(-120) : [];
    return {
        id: typeof source.id === "string" && source.id.trim() ? source.id : makeOccasionId(),
        name, kind, date, recurrence,
        remindBeforeDays: clampInteger(source.remindBeforeDays, 0, 365, 0),
        note: typeof source.note === "string" ? source.note.trim().slice(0, 500) : "",
        enabled: source.enabled !== false, completedDates,
        createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
    };
}

export function getVisibleOccasions(store: OccasionStore, date: Date): VisibleOccasion[] {
    const localDate = toLocalDateKey(date);
    return store.occasions.filter((item) => item.enabled)
        .map((item) => toVisibleOccasion(item, localDate))
        .filter((item): item is VisibleOccasion => Boolean(item))
        .sort((left, right) => left.daysUntil - right.daysUntil || left.name.localeCompare(right.name, "zh-CN"));
}

export function toVisibleOccasion(item: Occasion, localDate: string): VisibleOccasion | undefined {
    const occurrenceDate = getOccurrenceDate(item, localDate);
    if (!occurrenceDate) return undefined;
    const daysUntil = differenceInDays(localDate, occurrenceDate);
    if (daysUntil < 0 || daysUntil > item.remindBeforeDays) return undefined;
    return {...item, occurrenceDate, status: daysUntil === 0 ? "today" : "upcoming", daysUntil, completionKey: item.id + ":" + occurrenceDate};
}

export function getOccurrenceDate(item: Occasion, localDate: string): string | undefined {
    if (!isValidLocalDate(localDate)) return undefined;
    if (item.recurrence === "once") return isValidLocalDate(item.date) && item.date >= localDate ? item.date : undefined;
    const monthDay = item.date.slice(5);
    const year = Number(localDate.slice(0, 4));
    const candidate = String(year) + "-" + monthDay;
    if (isValidLocalDate(candidate) && candidate >= localDate) return candidate;
    const next = String(year + 1) + "-" + monthDay;
    return isValidLocalDate(next) ? next : undefined;
}

export function isOccasionCompleted(item: Occasion, occurrenceDate: string): boolean {
    return item.completedDates.includes(occurrenceDate);
}

export function markOccasionCompleted(store: OccasionStore, id: string, occurrenceDate: string, completed: boolean): OccasionStore {
    if (!isValidLocalDate(occurrenceDate)) return store;
    let changed = false;
    const occasions = store.occasions.map((item) => {
        if (item.id !== id) return item;
        const dates = new Set(item.completedDates);
        if (completed) dates.add(occurrenceDate); else dates.delete(occurrenceDate);
        const nextDates = [...dates].sort().slice(-120);
        changed = nextDates.join("|") !== item.completedDates.join("|");
        return changed ? {...item, completedDates: nextDates, updatedAt: new Date().toISOString()} : item;
    });
    return changed ? {version: OCCASIONS_STORE_VERSION, occasions} : store;
}

export function isValidOccasionDate(value: string, recurrence: OccasionRecurrence): boolean {
    return recurrence === "annual" ? /^\d{4}-\d{2}-\d{2}$/.test(value) && isValidLocalDate(value) : isValidLocalDate(value);
}

export function toLocalDateKey(date: Date): string {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function differenceInDays(from: string, to: string): number {
    return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86400000);
}

function parseLocalDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function isValidLocalDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    return toLocalDateKey(parseLocalDate(value)) === value;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
    const number = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
    return Math.min(max, Math.max(min, number));
}

function makeOccasionId(): string {
    return "occasion-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
