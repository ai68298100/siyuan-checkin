import {lunarToSolar, solarToLunar} from "./lunar";
import {t} from "./i18n";

export type OccasionKind = "birthday" | "anniversary" | "scheduled";
export type OccasionRecurrence = "once" | "annual" | "monthly" | "weekly" | "quarterly" | "halfyearly" | "interval";
export type OccasionCalendar = "solar" | "lunar";
export type MonthlySubtype = "byday" | "nthweek" | "lastday";
export type AnnualSubtype = "byday" | "nthweek";
export type IntervalUnit = "day" | "month" | "year";

export interface Occasion {
    id: string;
    name: string;
    kind: OccasionKind;
    /** 锚点日期：once/interval 为实际日期；annual/monthly 取其月-日部分；lunar 年度事项中该日期的月-日为农历月日。 */
    date: string;
    recurrence: OccasionRecurrence;
    /** annual 专用：农历 / 公历（默认公历）。 */
    calendar?: OccasionCalendar;
    /** annual + lunar：锚点的农历月为闰月。 */
    lunarLeap?: boolean;
    /** annual 子型：固定日 / 月内第 N 个星期 X。 */
    annualSubtype?: AnnualSubtype;
    /** annual nthweek 与 monthly nthweek：月 1..12（annual）/ 1..5（第 N 个）。 */
    month?: number;
    nthWeek?: number;
    /** 星期：0=周日 .. 6=周六。 */
    weekday?: number;
    /** monthly 子型：指定日 / 第 N 个星期 X / 月末。 */
    monthlySubtype?: MonthlySubtype;
    /** interval：间隔单位与数量。 */
    intervalUnit?: IntervalUnit;
    intervalCount?: number;
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

export interface OccasionTemplate {
    /** 显示名（zh 兜底）；渲染与套用时优先用 nameKey 查字典。 */
    name: string;
    nameKey: string;
    icon: string;
    kind: OccasionKind;
    recurrence: OccasionRecurrence;
    calendar?: OccasionCalendar;
    lunarLeap?: boolean;
    annualSubtype?: AnnualSubtype;
    month?: number;
    nthWeek?: number;
    weekday?: number;
    monthlySubtype?: MonthlySubtype;
    intervalUnit?: IntervalUnit;
    intervalCount?: number;
    remindBeforeDays: number;
    /** 模板自带的锚点日期（如节日）；其余模板留空由用户选择。 */
    date?: string;
    note?: string;
}

export const OCCASION_TEMPLATES: OccasionTemplate[] = [
    {name: "生日（公历）", nameKey: "occ.tpl.birthdaySolar", icon: "🎂", kind: "birthday", recurrence: "annual", calendar: "solar", remindBeforeDays: 3},
    {name: "生日（农历）", nameKey: "occ.tpl.birthdayLunar", icon: "🥮", kind: "birthday", recurrence: "annual", calendar: "lunar", remindBeforeDays: 3},
    {name: "结婚纪念日", nameKey: "occ.tpl.wedding", icon: "💍", kind: "anniversary", recurrence: "annual", calendar: "solar", remindBeforeDays: 7},
    {name: "房贷还款", nameKey: "occ.tpl.mortgage", icon: "🏠", kind: "scheduled", recurrence: "monthly", monthlySubtype: "byday", remindBeforeDays: 1},
    {name: "车贷还款", nameKey: "occ.tpl.carLoan", icon: "🚗", kind: "scheduled", recurrence: "monthly", monthlySubtype: "byday", remindBeforeDays: 1},
    {name: "房租", nameKey: "occ.tpl.rent", icon: "🔑", kind: "scheduled", recurrence: "monthly", monthlySubtype: "byday", remindBeforeDays: 1},
    {name: "物业费", nameKey: "occ.tpl.propertyFee", icon: "🏢", kind: "scheduled", recurrence: "quarterly", remindBeforeDays: 7},
    {name: "保险费（年缴）", nameKey: "occ.tpl.insuranceYear", icon: "🛡️", kind: "scheduled", recurrence: "annual", calendar: "solar", remindBeforeDays: 14},
    {name: "保险费（季缴）", nameKey: "occ.tpl.insuranceQuarter", icon: "📄", kind: "scheduled", recurrence: "quarterly", remindBeforeDays: 7},
    {name: "信用卡还款", nameKey: "occ.tpl.creditCard", icon: "💳", kind: "scheduled", recurrence: "monthly", monthlySubtype: "byday", remindBeforeDays: 1},
    {name: "车辆年检", nameKey: "occ.tpl.vehicleInspection", icon: "🔧", kind: "scheduled", recurrence: "annual", calendar: "solar", remindBeforeDays: 30},
    {name: "定期体检", nameKey: "occ.tpl.healthCheckup", icon: "🩺", kind: "scheduled", recurrence: "interval", intervalUnit: "month", intervalCount: 12, remindBeforeDays: 14},
    {name: "订阅续费", nameKey: "occ.tpl.subscription", icon: "🔄", kind: "scheduled", recurrence: "monthly", monthlySubtype: "byday", remindBeforeDays: 3},
    {name: "域名续费", nameKey: "occ.tpl.domain", icon: "🌐", kind: "scheduled", recurrence: "annual", calendar: "solar", remindBeforeDays: 30},
    {name: "发工资", nameKey: "occ.tpl.payday", icon: "💰", kind: "scheduled", recurrence: "monthly", monthlySubtype: "byday", remindBeforeDays: 0},
    {name: "情人节", nameKey: "occ.tpl.valentines", icon: "🌹", kind: "scheduled", recurrence: "annual", calendar: "solar", date: "2026-02-14", remindBeforeDays: 7},
    {name: "母亲节", nameKey: "occ.tpl.mothersDay", icon: "🌷", kind: "scheduled", recurrence: "annual", calendar: "solar", annualSubtype: "nthweek", month: 5, nthWeek: 2, weekday: 0, remindBeforeDays: 7},
    {name: "父亲节", nameKey: "occ.tpl.fathersDay", icon: "👔", kind: "scheduled", recurrence: "annual", calendar: "solar", annualSubtype: "nthweek", month: 6, nthWeek: 3, weekday: 0, remindBeforeDays: 7},
    {name: "七夕", nameKey: "occ.tpl.qixi", icon: "🪶", kind: "scheduled", recurrence: "annual", calendar: "lunar", date: "2026-08-19", remindBeforeDays: 7},
    {name: "中秋节", nameKey: "occ.tpl.midAutumn", icon: "🌕", kind: "scheduled", recurrence: "annual", calendar: "lunar", date: "2026-09-25", remindBeforeDays: 7},
    {name: "春节", nameKey: "occ.tpl.springFestival", icon: "🧨", kind: "scheduled", recurrence: "annual", calendar: "lunar", date: "2026-02-17", remindBeforeDays: 14},
];

export function occasionTemplateName(template: OccasionTemplate): string {
    return t(template.nameKey) || template.name;
}

export function weekdayName(index: number): string {
    return t(`occ.wd${clampInteger(index, 0, 6, 0)}`);
}

export function applyOccasionTemplate(template: OccasionTemplate, anchorDate: string): Partial<Occasion> {
    return {
        name: occasionTemplateName(template),
        kind: template.kind,
        recurrence: template.recurrence,
        calendar: template.calendar,
        lunarLeap: template.lunarLeap,
        annualSubtype: template.annualSubtype,
        month: template.month,
        nthWeek: template.nthWeek,
        weekday: template.weekday,
        monthlySubtype: template.monthlySubtype,
        intervalUnit: template.intervalUnit,
        intervalCount: template.intervalCount,
        remindBeforeDays: template.remindBeforeDays,
        date: template.date || anchorDate,
        note: template.note || "",
    };
}

export function createDefaultOccasionStore(): OccasionStore {
    return {version: OCCASIONS_STORE_VERSION, occasions: []};
}

export function normalizeOccasionStore(value: unknown): OccasionStore {
    const source = value && typeof value === "object" ? value as Partial<OccasionStore> : {};
    const raw = Array.isArray(source.occasions) ? source.occasions : [];
    return {version: OCCASIONS_STORE_VERSION, occasions: raw.map(normalizeOccasion).filter((item): item is Occasion => Boolean(item))};
}

const RECURRENCES = new Set<OccasionRecurrence>(["once", "annual", "monthly", "weekly", "quarterly", "halfyearly", "interval"]);

export function normalizeOccasion(value: unknown): Occasion | undefined {
    if (!value || typeof value !== "object") return undefined;
    const source = value as Partial<Occasion>;
    const name = typeof source.name === "string" ? source.name.trim().slice(0, 120) : "";
    const date = typeof source.date === "string" ? source.date.trim() : "";
    const kind = source.kind === "birthday" || source.kind === "anniversary" || source.kind === "scheduled" ? source.kind : "scheduled";
    // 旧数据只含 once/annual/monthly；未知值按锚点日期一次性处理。
    const recurrence = RECURRENCES.has(source.recurrence as OccasionRecurrence) ? source.recurrence as OccasionRecurrence
        : source.recurrence === "once" ? "once" : source.recurrence === "monthly" ? "monthly" : source.recurrence === "annual" ? "annual" : "once";
    if (!name || !isValidOccasionDate(date)) return undefined;
    const now = new Date().toISOString();
    const completedDates = Array.isArray(source.completedDates) ? source.completedDates.filter((item): item is string => typeof item === "string" && isValidLocalDate(item)).slice(-120) : [];
    const calendar = source.calendar === "lunar" ? "lunar" : "solar";
    const monthlySubtype = source.monthlySubtype === "nthweek" || source.monthlySubtype === "lastday" ? source.monthlySubtype : "byday";
    const annualSubtype = source.annualSubtype === "nthweek" ? "nthweek" : "byday";
    const intervalUnit = source.intervalUnit === "day" || source.intervalUnit === "year" ? source.intervalUnit : "month";
    return {
        id: typeof source.id === "string" && source.id.trim() ? source.id : makeOccasionId(),
        name, kind, date, recurrence,
        calendar,
        lunarLeap: source.lunarLeap === true,
        annualSubtype,
        month: clampInteger(source.month, 1, 12, clampInteger(date.slice(5, 7), 1, 12, 1)),
        nthWeek: clampInteger(source.nthWeek, 1, 5, 1),
        weekday: clampInteger(source.weekday, 0, 6, 0),
        monthlySubtype,
        intervalUnit,
        intervalCount: clampInteger(source.intervalCount, 1, 365, 1),
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

/** 事项在 localDate 当天或之后的下一次发生日期。 */
export function getOccurrenceDate(item: Occasion, localDate: string): string | undefined {
    if (!isValidLocalDate(localDate)) return undefined;
    switch (item.recurrence) {
        case "once":
            return isValidLocalDate(item.date) && item.date >= localDate ? item.date : undefined;
        case "annual":
            return item.calendar === "lunar" ? annualLunarOccurrence(item, localDate) : annualSolarOccurrence(item, localDate);
        case "monthly":
            return monthlyOccurrence(item, localDate);
        case "weekly":
            return weeklyOccurrence(item, localDate);
        case "quarterly":
        case "halfyearly":
            return stepMonthlyOccurrence(item, localDate, item.recurrence === "quarterly" ? 3 : 6);
        case "interval":
            return intervalOccurrence(item, localDate);
        default:
            return undefined;
    }
}

function annualSolarOccurrence(item: Occasion, localDate: string): string | undefined {
    if (item.annualSubtype === "nthweek") {
        const month = clampInteger(item.month, 1, 12, 1);
        const nth = clampInteger(item.nthWeek, 1, 5, 1);
        const weekday = clampInteger(item.weekday, 0, 6, 0);
        const year = Number(localDate.slice(0, 4));
        const current = nthWeekdayOfMonth(year, month, nth, weekday);
        if (current && current >= localDate) return current;
        return nthWeekdayOfMonth(year + 1, month, nth, weekday);
    }
    const monthDay = item.date.slice(5);
    const year = Number(localDate.slice(0, 4));
    const candidate = `${year}-${monthDay}`;
    if (isValidLocalDate(candidate) && candidate >= localDate) return candidate;
    const next = `${year + 1}-${monthDay}`;
    return isValidLocalDate(next) ? next : undefined;
}

function annualLunarOccurrence(item: Occasion, localDate: string): string | undefined {
    const lunar = solarToLunar(parseLocalDate(item.date));
    if (!lunar) return undefined;
    const year = Number(localDate.slice(0, 4));
    for (const candidateYear of [year, year + 1]) {
        const solar = lunarToSolar(candidateYear, lunar.month, lunar.day, item.lunarLeap === true);
        if (!solar) continue;
        const key = toLocalDateKey(solar);
        if (key >= localDate) return key;
    }
    return undefined;
}

function monthlyOccurrence(item: Occasion, localDate: string): string | undefined {
    const [year, month] = localDate.split("-").slice(0, 2).map(Number);
    const nextMonth = (y: number, m: number): [number, number] => m === 12 ? [y + 1, 1] : [y, m + 1];
    if (item.monthlySubtype === "lastday") {
        const last = (y: number, m: number): string => toLocalDateKey(new Date(y, m, 0));
        const current = last(year, month);
        if (current >= localDate) return current;
        const [ny, nm] = nextMonth(year, month);
        return last(ny, nm);
    }
    if (item.monthlySubtype === "nthweek") {
        const nth = clampInteger(item.nthWeek, 1, 5, 1);
        const weekday = clampInteger(item.weekday, 0, 6, 0);
        const current = nthWeekdayOfMonth(year, month, nth, weekday);
        if (current && current >= localDate) return current;
        const [ny, nm] = nextMonth(year, month);
        return nthWeekdayOfMonth(ny, nm, nth, weekday);
    }
    const seedDay = Number(item.date.slice(8));
    const current = monthDate(year, month, seedDay);
    if (current >= localDate) return current;
    const [ny, nm] = nextMonth(year, month);
    return monthDate(ny, nm, seedDay);
}

function weeklyOccurrence(item: Occasion, localDate: string): string | undefined {
    const weekday = clampInteger(item.weekday, 0, 6, parseLocalDate(item.date).getDay());
    const base = parseLocalDate(localDate);
    for (let step = 0; step < 7; step += 1) {
        const candidate = toLocalDateKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + step));
        if (parseLocalDate(candidate).getDay() === weekday && candidate >= localDate) return candidate;
    }
    return undefined;
}

function stepMonthlyOccurrence(item: Occasion, localDate: string, step: number): string | undefined {
    const seed = parseLocalDate(item.date);
    const seedMonth = seed.getMonth() + 1;
    const seedDay = seed.getDate();
    let [year, month] = localDate.split("-").slice(0, 2).map(Number);
    // 从当前月起向后找第一个落在周期上的月份（周期按锚点月对齐）。
    for (let guard = 0; guard < 12 * 3; guard += 1) {
        const offset = ((month - seedMonth) % step + step) % step;
        if (offset !== 0) {
            month += step - offset;
            while (month > 12) { month -= 12; year += 1; }
        }
        const candidate = monthDate(year, month, seedDay);
        if (candidate >= localDate) return candidate;
        [year, month] = nextMonthPair(year, month, step);
    }
    return undefined;
}

function nextMonthPair(year: number, month: number, step: number): [number, number] {
    month += step;
    while (month > 12) { month -= 12; year += 1; }
    return [year, month];
}

function intervalOccurrence(item: Occasion, localDate: string): string | undefined {
    if (!isValidLocalDate(item.date) || item.date > localDate) return isValidLocalDate(item.date) && item.date >= localDate ? item.date : undefined;
    const count = clampInteger(item.intervalCount, 1, 365, 1);
    const unit = item.intervalUnit || "month";
    if (unit === "day") {
        const diff = differenceInDays(item.date, localDate);
        const steps = Math.ceil(diff / count);
        return toLocalDateKey(new Date(parseLocalDate(item.date).getFullYear(), parseLocalDate(item.date).getMonth(), parseLocalDate(item.date).getDate() + steps * count));
    }
    const anchor = parseLocalDate(item.date);
    const target = parseLocalDate(localDate);
    const months = (target.getFullYear() - anchor.getFullYear()) * 12 + (target.getMonth() - anchor.getMonth());
    const stepMonths = unit === "year" ? count * 12 : count;
    const candidateAt = (steps: number): string => {
        const total = steps * stepMonths;
        return monthDate(anchor.getFullYear() + Math.floor((anchor.getMonth() + total) / 12), ((anchor.getMonth() + total) % 12) + 1, anchor.getDate());
    };
    let steps = Math.max(0, Math.floor(months / stepMonths));
    let candidate = candidateAt(steps);
    while (candidate < localDate) {
        steps += 1;
        candidate = candidateAt(steps);
    }
    return candidate;
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

export function upsertOccasion(store: OccasionStore, occasion: Occasion): OccasionStore {
    const exists = store.occasions.some((item) => item.id === occasion.id);
    const occasions = exists
        ? store.occasions.map((item) => item.id === occasion.id ? occasion : item)
        : [...store.occasions, occasion];
    return {version: OCCASIONS_STORE_VERSION, occasions};
}

export function deleteOccasion(store: OccasionStore, id: string): OccasionStore {
    return {version: OCCASIONS_STORE_VERSION, occasions: store.occasions.filter((item) => item.id !== id)};
}

export function isValidOccasionDate(value: string): boolean {
    return isValidLocalDate(value);
}

export function describeRecurrence(item: Occasion): string {
    const nth = (n: number): string => t(`occ.nth${clampInteger(n, 1, 5, 1)}`);
    const wd = (index: number): string => weekdayName(index);
    const unit = (u: IntervalUnit): string => u === "day" ? t("occ.unitDay") : u === "year" ? t("occ.unitYear") : t("occ.unitMonth");
    switch (item.recurrence) {
        case "once": return t("occ.once");
        case "annual": {
            if (item.annualSubtype === "nthweek") {
                return t("occ.annualNthweek", {month: item.month ?? 1, week: nth(item.nthWeek ?? 1), weekday: wd(item.weekday ?? 0)});
            }
            return item.calendar === "lunar"
                ? t("occ.annualLunar", {leap: item.lunarLeap === true ? t("occ.lunarLeap") : "", month: item.date.slice(5, 7).replace(/^0/, ""), day: Number(item.date.slice(8))})
                : t("occ.annual");
        }
        case "monthly": {
            if (item.monthlySubtype === "lastday") return t("occ.monthlyLast");
            if (item.monthlySubtype === "nthweek") return t("occ.monthlyNth", {n: item.nthWeek ?? 1, weekday: wd(item.weekday ?? 0)});
            return t("occ.monthly");
        }
        case "weekly": return t("occ.weeklyWd", {weekday: wd(item.weekday ?? 0)});
        case "quarterly": return t("occ.quarterly");
        case "halfyearly": return t("occ.halfyearly");
        case "interval": return t("occ.intervalDesc", {n: item.intervalCount ?? 1, unit: unit(item.intervalUnit || "month")});
        default: return "";
    }
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

function monthDate(year: number, month: number, day: number): string {
    const safeDay = Math.min(day, new Date(year, month, 0).getDate());
    return toLocalDateKey(new Date(year, month - 1, safeDay));
}

function nthWeekdayOfMonth(year: number, month: number, nth: number, weekday: number): string | undefined {
    const first = new Date(year, month - 1, 1);
    const firstWeekday = first.getDay();
    const offset = (weekday - firstWeekday + 7) % 7;
    const day = offset + 1 + (nth - 1) * 7;
    if (day > new Date(year, month, 0).getDate()) return undefined;
    return toLocalDateKey(new Date(year, month - 1, day));
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
