/* Obsidian Habit Tracker 21 迁入通道（T-1279,调研续作吸收项）：
   一习惯一 .md 文件,frontmatter {title, color, maxGap, entries: ["YYYY-MM-DD"...]}。
   纯解析层：不依赖 model/i18n;颜色与 maxGap 容忍不迁移（降级在导入确认文案中如实说明），
   entries 完成日 → 每日二值项目的 source=import 打卡,externalRef 走 obsidian21 前缀注册处。 */

export interface ObsidianHabitFile {
    /** 文件名（含扩展名）——作为 externalRef 身份与名称回退来源。 */
    filename: string;
    title?: string;
    color?: string;
    maxGap?: number;
    /** 去重排序后的完成日（YYYY-MM-DD）。 */
    dates: string[];
}

export interface ObsidianImportPlan {
    habits: ObsidianHabitFile[];
    totalDates: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateKey(value: string): boolean {
    if (!DATE_PATTERN.test(value)) return false;
    const parsed = new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
    return !Number.isNaN(parsed.getTime()) && dateKeyOf(parsed) === value;
}

function dateKeyOf(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function stripQuotes(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

function parseInlineDateList(value: string): string[] {
    const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
    if (!inner) return [];
    return inner.split(",").map((entry) => stripQuotes(entry)).filter((entry) => isValidDateKey(entry));
}

function sanitizeIdentity(filename: string): string {
    return filename.replace(/\.md$/i, "").replace(/:/g, "_").slice(0, 160);
}

/** 解析单个 Habit Tracker 21 习惯文件：无 frontmatter → not-habit-file（用户可能误选普通笔记）。 */
export function parseObsidianHabitFile(text: string, filename: string): {ok: true; habit: ObsidianHabitFile} | {ok: false; reason: "not-habit-file" | "invalid-entries"} {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
    let cursor = 0;
    while (cursor < lines.length && !lines[cursor].trim()) cursor += 1;
    if ((lines[cursor] || "").trim() !== "---") return {ok: false, reason: "not-habit-file"};
    cursor += 1;
    const fields = new Map<string, string | string[]>();
    let closed = false;
    while (cursor < lines.length) {
        const line = lines[cursor];
        const trimmed = line.trim();
        if (trimmed === "---") {
            closed = true;
            break;
        }
        if (!trimmed) {
            cursor += 1;
            continue;
        }
        const listMatch = trimmed.match(/^- (.+)$/);
        if (listMatch) {
            const lastKey = [...fields.keys()].pop();
            if (lastKey === "entries" && Array.isArray(fields.get("entries"))) {
                const dates = fields.get("entries") as string[];
                const candidate = stripQuotes(listMatch[1]);
                if (isValidDateKey(candidate)) dates.push(candidate);
            }
            cursor += 1;
            continue;
        }
        const colon = trimmed.indexOf(":");
        if (colon <= 0) {
            cursor += 1;
            continue;
        }
        const key = trimmed.slice(0, colon).trim();
        const value = trimmed.slice(colon + 1).trim();
        if (key === "entries") {
            fields.set(key, value === "" ? [] : parseInlineDateList(value));
        } else if (value !== "") {
            fields.set(key, stripQuotes(value));
        }
        cursor += 1;
    }
    if (!closed) return {ok: false, reason: "not-habit-file"};
    const rawEntries = fields.get("entries");
    if (rawEntries !== undefined && !Array.isArray(rawEntries)) return {ok: false, reason: "invalid-entries"};
    const dates = [...new Set((Array.isArray(rawEntries) ? rawEntries : []).filter((entry) => isValidDateKey(entry)))].sort();
    const maxGapRaw = fields.get("maxGap");
    const maxGapParsed = typeof maxGapRaw === "string" && maxGapRaw !== "" && Number.isFinite(Number(maxGapRaw)) ? Number(maxGapRaw) : undefined;
    const titleRaw = fields.get("title");
    const colorRaw = fields.get("color");
    return {
        ok: true,
        habit: {
            filename,
            title: typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim().slice(0, 80) : undefined,
            color: typeof colorRaw === "string" && colorRaw.trim() ? colorRaw.trim().slice(0, 40) : undefined,
            maxGap: maxGapParsed !== undefined && maxGapParsed >= 0 ? maxGapParsed : undefined,
            dates,
        },
    };
}

/** 规划：过滤非习惯文件,聚合条目数;身份 = 去扩展名/去冒号的文件名（externalRef 稳定,重复导入幂等）。 */
export function buildObsidianImportPlan(habits: ObsidianHabitFile[]): ObsidianImportPlan {
    const totalDates = habits.reduce((total, habit) => total + habit.dates.length, 0);
    return {habits, totalDates};
}

export function obsidianHabitIdentity(habit: ObsidianHabitFile): string {
    return sanitizeIdentity(habit.filename);
}

export function obsidianExternalRef(habit: ObsidianHabitFile, date: string): string {
    return `obsidian21:${sanitizeIdentity(habit.filename)}:${date}`;
}

export function obsidianHabitName(habit: ObsidianHabitFile): string {
    return habit.title || sanitizeIdentity(habit.filename);
}

/* ===== 迁出（T-1283）：活跃项目 → Habit Tracker 21 习惯 .md 文件 =====
   完成日 = 有真实（非跳过）事件的日期；无完成日的项目不导出；
   跳过记录 H21 无对应语义，不导出。 */

import type {CheckinStore} from "../types";

export interface ObsidianExportFile {
    filename: string;
    content: string;
    entryCount: number;
}

export interface ObsidianExportPlan {
    files: ObsidianExportFile[];
    /** 无完成日或超出上限而未导出的活跃项目数。 */
    skippedItems: number;
}

const EXPORT_MAX_FILES = 30;

function sanitizeFilename(name: string): string {
    const cleaned = name.replace(/[\/:*?"<>|#^\[\]{}]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned.slice(0, 60).trim();
}

export function buildObsidianExportFiles(store: CheckinStore, options: {maxFiles?: number} = {}): ObsidianExportPlan {
    const maxFiles = options.maxFiles ?? EXPORT_MAX_FILES;
    const byItem = new Map<string, {name: string; dates: Set<string>}>();
    for (const item of store.items) {
        if (item.archived) continue;
        byItem.set(item.id, {name: item.name, dates: new Set()});
    }
    for (const event of store.events) {
        if (event.kind === "skip") continue;
        const target = byItem.get(event.itemId);
        if (!target) continue;
        if (event.localDate && DATE_PATTERN.test(event.localDate)) target.dates.add(event.localDate);
    }
    const files: ObsidianExportFile[] = [];
    let skippedItems = 0;
    const usedFilenames = new Set<string>();
    for (const target of byItem.values()) {
        if (!target.dates.size || files.length >= maxFiles) {
            skippedItems += 1;
            continue;
        }
        const base = sanitizeFilename(target.name) || "habit";
        let filename = `${base}.md`;
        let suffix = 2;
        while (usedFilenames.has(filename.toLowerCase())) {
            filename = `${base}-${suffix}.md`;
            suffix += 1;
        }
        usedFilenames.add(filename.toLowerCase());
        const dates = [...target.dates].sort();
        const safeTitle = target.name.replace(/\\/g, "\\\\").replace(/"/g, "\"");
        const content = `---\ntitle: "${safeTitle}"\nentries:\n${dates.map((date) => `  - ${date}`).join("\n")}\n---\n`;
        files.push({filename, content, entryCount: dates.length});
    }
    return {files, skippedItems};
}
