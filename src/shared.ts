/* 插件内共享的纯工具函数：HTML/图标/格式化/日期/表单归一化/存储比较。
   均不依赖插件实例状态；i18n 相关的取词在调用时进行。 */
import {t, getPluginLocale} from "./i18n";
import {dateKey} from "./model";
import {extractSiyuanBlockLinkSpans} from "./features/record-notes";
import {SCHEDULE_LABELS} from "./ui/labels";
import type {CheckinKind, CheckinPriority, CheckinSchedule, CheckinTimeSlot, CheckinStore} from "./types";
import type {SummaryRange} from "./analytics";

export const MAX_CUSTOM_ICON_BYTES = 240_000;
export const MAX_CUSTOM_LIBRARY_ITEMS = 128;

export interface ActionMoment {
    occurredAt: string;
    localDate: string;
}

export function parseLocalDateKey(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => {
        switch (character) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "'": return "&#39;";
            case "\"": return "&quot;";
            default: return character;
        }
    });
}

export function normalizeCustomIcon(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i.test(trimmed)) {
        const compact = trimmed.replace(/\s+/g, "");
        return /^[\x00-\x7F]*$/.test(compact) && compact.length <= MAX_CUSTOM_ICON_BYTES ? compact : undefined;
    }
    if (!/^https:\/\//i.test(trimmed)) return trimmed.slice(0, 24);
    try {
        const url = new URL(trimmed);
        if (url.protocol !== "https:" || url.username || url.password || url.hostname.length < 2) return undefined;
        return url.toString().slice(0, 500);
    } catch {
        return undefined;
    }
}

export function normalizeCustomIconLibrary(value: unknown): string[] {
    const entries = Array.isArray(value) ? value : [];
    const result: string[] = [];
    for (const entry of entries) {
        const icon = typeof entry === "string" ? normalizeCustomIcon(entry) : undefined;
        if (icon && !result.includes(icon)) result.push(icon);
        if (result.length >= MAX_CUSTOM_LIBRARY_ITEMS) break;
    }
    return result;
}

export function parseCustomIconLibrary(text: string): string[] {
    let entries: unknown = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    try {
        const parsed = JSON.parse(text) as unknown;
        entries = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as {icons?: unknown}).icons) ? (parsed as {icons: unknown[]}).icons : entries;
    } catch { /* newline-separated format */ }
    return normalizeCustomIconLibrary(entries);
}

export function renderIconMarkup(value: string): string {
    if (/^(?:https:\/\/|data:image\/)/i.test(value)) {
        return `<img src="${escapeHtml(value)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
    }
    return escapeHtml(value);
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
        promise.then((value) => {
            window.clearTimeout(timer);
            resolve(value);
        }, (error) => {
            window.clearTimeout(timer);
            reject(error);
        });
    });
}

export function renderRecordNote(note: string): string {
    const spans = extractSiyuanBlockLinkSpans(note);
    if (!spans.length) return escapeHtml(note);
    let cursor = 0;
    return spans.map((span) => {
        const prefix = escapeHtml(note.slice(cursor, span.start));
        const link = `<a href="${escapeHtml(span.url)}" title="打开思源块" target="_blank" rel="noreferrer">${escapeHtml(span.label)}</a>`;
        cursor = span.end;
        return prefix + link;
    }).join("") + escapeHtml(note.slice(cursor));
}

export function matchesSearch(value: string, query: string): boolean {
    const searchable = value.normalize("NFKC").toLocaleLowerCase("zh-CN");
    return query.normalize("NFKC").toLocaleLowerCase("zh-CN").trim().split(/\s+/).every((term) => searchable.includes(term));
}

export function formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function formatScheduleLabel(schedule: CheckinSchedule): string {
    if (schedule.type === "interval") return `每隔 ${schedule.intervalDays || 1} 天`;
    if (schedule.type === "quota" && schedule.quota) return `${schedule.quota.period === "week" ? "每周" : "每月"} ${schedule.quota.amount}${schedule.quota.countMode === "dates" ? "天" : "单位"}`;
    return t(SCHEDULE_LABELS[schedule.type]);
}

export function getTargetLabel(kind: CheckinKind): string {
    return kind === "duration" ? t("editor.targetDuration") : kind === "quantity" ? t("editor.targetQuantity") : kind === "count" ? t("editor.targetCount") : t("editor.targetDefault");
}

export function getRecordStep(kind: CheckinKind, unit: string): number {
    if (kind === "duration") return unit === "小时" ? 0.5 : 5;
    if (kind === "quantity" && unit === "毫升") return 250;
    if (kind === "quantity" && unit === "克") return 50;
    return kind === "custom" ? 0.1 : 1;
}

export function getEditorStep(kind: CheckinKind, unit: string): number {
    if (kind === "duration") return unit === "小时" ? 0.25 : 1;
    if (kind === "quantity" && ["升", "千克", "公里"].includes(unit)) return 0.1;
    return kind === "custom" ? 0.1 : 1;
}

export function normalizePriorityInput(value: FormDataEntryValue | null): CheckinPriority {
    return value === "high" || value === "low" ? value : "medium";
}

export function normalizeTimeSlotInput(value: FormDataEntryValue | null): CheckinTimeSlot {
    return value === "morning" || value === "afternoon" || value === "evening" ? value : "any";
}

export function captureActionMoment(): ActionMoment {
    const now = new Date();
    return {occurredAt: now.toISOString(), localDate: dateKey(now)};
}

export function nextItemUpdatedAt(current: string | undefined, captured: string): string {
    const capturedTime = new Date(captured).getTime();
    const currentTime = current ? new Date(current).getTime() : Number.NaN;
    const nextTime = Number.isFinite(currentTime) ? Math.max(capturedTime, currentTime + 1) : capturedTime;
    return new Date(nextTime).toISOString();
}

export function currentCalendarDate(): Date {
    return calendarDateFromKey(dateKey(new Date()));
}

export function calendarDateFromKey(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
}

export function isValidLocalDateInput(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    return dateKey(calendarDateFromKey(value)) === value;
}

export function formatHistoryDate(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (!year || !month || !day || Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString(getPluginLocale(), {month: "long", day: "numeric", weekday: "short"});
}

export function isSummaryRange(value: unknown): value is SummaryRange {
    return value === "day" || value === "week" || value === "month";
}

export function storeNeedsMigration(value: unknown, normalized: CheckinStore): boolean {
    if (!value || typeof value !== "object") return false;
    try {
        return JSON.stringify(value) !== JSON.stringify(normalized);
    } catch {
        return true;
    }
}
