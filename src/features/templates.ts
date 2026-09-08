import type {CheckinTemplate} from "../catalog";
import type {CheckinKind, CheckinPriority, CheckinSchedule, CheckinTimeSlot} from "../types";

export const TEMPLATE_STORE_VERSION = 1 as const;
export interface StoredTemplate extends CheckinTemplate {
    id: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}
export interface TemplateStore {version: 1; templates: StoredTemplate[];}

type RawTemplate = Partial<StoredTemplate> & {id?: unknown};

export function createTemplateStore(): TemplateStore { return {version: TEMPLATE_STORE_VERSION, templates: []}; }

/** Normalize persisted templates, migrating the original id-less shape and removing duplicate definitions. */
export function normalizeTemplateStore(value: unknown, now = new Date()): TemplateStore {
    const raw = value && typeof value === "object" ? value as {templates?: unknown; version?: unknown} : {};
    const input = Array.isArray(raw.templates) ? raw.templates : [];
    const normalized: StoredTemplate[] = [];
    const seen = new Set<string>();
    input.forEach((entry, index) => {
        const candidate = normalizeTemplate(entry, index, now);
        if (!candidate) return;
        const key = templateFingerprint(candidate);
        const previous = normalized.find((item) => templateFingerprint(item) === key);
        if (previous) {
            if (candidate.updatedAt > previous.updatedAt) Object.assign(previous, candidate);
            return;
        }
        let id = candidate.id;
        while (seen.has(id)) id = `${candidate.id}-${seen.size}`;
        candidate.id = id;
        seen.add(id);
        normalized.push(candidate);
    });
    return {version: TEMPLATE_STORE_VERSION, templates: normalized.sort(compareTemplates)};
}

export function upsertTemplate(store: unknown, input: Partial<StoredTemplate>, now = new Date()): TemplateStore {
    const result = normalizeTemplateStore(store, now);
    const candidate = normalizeTemplate(input, result.templates.length, now);
    if (!candidate) return result;
    const existing = result.templates.find((item) => item.id === candidate.id || templateFingerprint(item) === templateFingerprint(candidate));
    if (existing) {
        Object.assign(existing, candidate, {id: existing.id, createdAt: existing.createdAt, updatedAt: now.toISOString(), deletedAt: undefined});
    } else {
        candidate.updatedAt = now.toISOString();
        result.templates.push(candidate);
    }
    result.templates.sort(compareTemplates);
    return result;
}

/** Deletion is a tombstone so an older synced copy cannot resurrect the template. */
export function deleteTemplate(store: unknown, id: string, now = new Date()): TemplateStore {
    const result = normalizeTemplateStore(store, now);
    const item = result.templates.find((template) => template.id === id);
    if (item) { item.deletedAt = now.toISOString(); item.updatedAt = item.deletedAt; }
    return result;
}

export function listActiveTemplates(store: unknown): StoredTemplate[] {
    return normalizeTemplateStore(store).templates.filter((template) => !template.deletedAt).map((template) => ({...template}));
}

export function templateFingerprint(template: Pick<CheckinTemplate, "name" | "icon" | "kind" | "target" | "unit" | "schedule" | "group" | "priority" | "timeSlot">): string {
    return JSON.stringify({name: template.name.trim().toLocaleLowerCase(), icon: template.icon, kind: template.kind, target: template.target, unit: template.unit.trim(), schedule: template.schedule, group: template.group.trim(), priority: template.priority, timeSlot: template.timeSlot || "any"});
}

function normalizeTemplate(value: unknown, index: number, now: Date): StoredTemplate | undefined {
    if (!value || typeof value !== "object") return undefined;
    const raw = value as RawTemplate;
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 64) : "";
    if (!name) return undefined;
    const kind = normalizeKind(raw.kind);
    const target = typeof raw.target === "number" && Number.isFinite(raw.target) && raw.target > 0 ? raw.target : 1;
    const unit = typeof raw.unit === "string" && raw.unit.trim() ? raw.unit.trim().slice(0, 16) : "次";
    const createdAt = validIso(raw.createdAt) ? raw.createdAt as string : now.toISOString();
    const updatedAt = validIso(raw.updatedAt) ? raw.updatedAt as string : createdAt;
    return {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 80) : `template-${hash(`${name}:${index}`)}`,
        name, icon: typeof raw.icon === "string" && raw.icon ? raw.icon.slice(0, 8) : "✓", kind, target, unit,
        schedule: normalizeSchedule(raw.schedule), group: typeof raw.group === "string" ? raw.group.trim().slice(0, 32) : "",
        priority: normalizePriority(raw.priority), timeSlot: normalizeTimeSlot(raw.timeSlot), note: typeof raw.note === "string" ? raw.note.slice(0, 240) : "",
        createdAt, updatedAt, ...(validIso(raw.deletedAt) ? {deletedAt: raw.deletedAt as string} : {}),
    };
}

function normalizeKind(value: unknown): CheckinKind { return ["binary", "count", "duration", "quantity", "custom"].includes(String(value)) ? value as CheckinKind : "binary"; }
function normalizePriority(value: unknown): CheckinPriority { return value === "high" || value === "low" ? value : "medium"; }
function normalizeTimeSlot(value: unknown): CheckinTimeSlot { return ["any", "morning", "afternoon", "evening"].includes(String(value)) ? value as CheckinTimeSlot : "any"; }
function normalizeSchedule(value: unknown): CheckinSchedule { const raw = value && typeof value === "object" ? value as Partial<CheckinSchedule> : {}; const type = ["daily", "weekly", "workdays", "custom", "interval"].includes(String(raw.type)) ? raw.type as CheckinSchedule["type"] : "daily"; const intervalDays = raw.intervalDays; return {type, ...(Array.isArray(raw.weekdays) ? {weekdays: raw.weekdays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)} : {}), ...(typeof intervalDays === "number" && Number.isInteger(intervalDays) && intervalDays > 0 ? {intervalDays} : {}), ...(typeof raw.anchorDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.anchorDate) ? {anchorDate: raw.anchorDate} : {})}; }
function validIso(value: unknown): value is string { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }
function hash(value: string): string { let result = 2166136261; for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619); return (result >>> 0).toString(36); }
function compareTemplates(left: StoredTemplate, right: StoredTemplate): number { return Number(Boolean(left.deletedAt)) - Number(Boolean(right.deletedAt)) || left.name.localeCompare(right.name, "zh-CN") || left.id.localeCompare(right.id); }
