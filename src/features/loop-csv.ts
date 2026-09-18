/* 16.1 T-1218 Loop Habit Tracker CSV 迁移：解析官方 HabitsCSVExporter 的
   Habits.csv（Position,Name,Type,Question,Description,FrequencyNumerator,
   FrequencyDenominator,Color,Unit,Target Type,Target Value,Archived?）与组合版
   Checkmarks.csv（Date,<习惯名...>，值 YES_MANUAL/YES_AUTO/NO/SKIP/UNKNOWN），
   并按同构结构导出。迁移边界（明确降级）：
   - YES_NO 习惯的 YES_MANUAL/YES_AUTO 迁入为 source=import 的完成事件（同日去重）；
   - SKIP 日不迁移（跳过态在 v16.2 落地后可回补），只计入统计；
   - MEASURABLE 习惯保留项目/单位/目标但历史数值在逐习惯文件里，本期不导入；
   - 频率 N/D 按 1/1=daily、D=7=每周配额、D=30/31=每月配额、num=1=interval 映射，
     其余不可映射时降级为 daily 并返回降级标记。 */

import type {CheckinItem, CheckinSchedule, CheckinStore} from "../types";

export type LoopEntryValue = "YES_MANUAL" | "YES_AUTO" | "NO" | "SKIP" | "UNKNOWN";

export interface LoopHabitMeta {
    position: string;
    name: string;
    type: string;
    question: string;
    description: string;
    numerator: number;
    denominator: number;
    unit: string;
    targetType: string;
    targetValue: number;
    archived: boolean;
}

export interface LoopCheckmarks {
    names: string[];
    points: Array<{date: string; values: Array<LoopEntryValue | "">}>;
}

const HABITS_HEADER = ["Position", "Name", "Type", "Question", "Description", "FrequencyNumerator", "FrequencyDenominator", "Color", "Unit", "Target Type", "Target Value", "Archived?"];

/** 拆分单行 CSV：支持双引号包裹与 "" 转义；空行返回空数组。 */
export function splitCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (quoted) {
            if (char === "\"") {
                if (line[index + 1] === "\"") { current += "\""; index += 1; }
                else quoted = false;
            } else current += char;
        } else if (char === "\"") quoted = true;
        else if (char === ",") { cells.push(current); current = ""; }
        else current += char;
    }
    cells.push(current);
    return cells;
}

function parseEntryValue(cell: string): LoopEntryValue | "" {
    const value = cell.trim().toUpperCase();
    if (value === "YES_MANUAL" || value === "YES_AUTO" || value === "NO" || value === "SKIP" || value === "UNKNOWN") return value;
    return "";
}

function stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseLines(text: string): string[] {
    return stripBom(text).split(/\r?\n/).filter((line) => line.trim().length > 0);
}

export function parseLoopHabitsCsv(text: string): {habits: LoopHabitMeta[]; invalidRows: number} {
    const lines = parseLines(text);
    if (!lines.length) return {habits: [], invalidRows: 0};
    const header = splitCsvLine(lines[0]).map((cell) => cell.trim());
    const indexOf = (name: string) => header.indexOf(name);
    if (indexOf("Name") < 0 || indexOf("Type") < 0) return {habits: [], invalidRows: lines.length - 1};
    const habits: LoopHabitMeta[] = [];
    let invalidRows = 0;
    for (const line of lines.slice(1)) {
        const cells = splitCsvLine(line);
        const name = (cells[indexOf("Name")] || "").trim();
        if (!name) { invalidRows += 1; continue; }
        const numerator = Number.parseInt((cells[indexOf("FrequencyNumerator")] || "1").trim(), 10);
        const denominator = Number.parseInt((cells[indexOf("FrequencyDenominator")] || "1").trim(), 10);
        const targetValue = Number.parseFloat((cells[indexOf("Target Value")] || "0").trim());
        habits.push({
            position: (cells[indexOf("Position")] || "").trim(),
            name,
            type: (cells[indexOf("Type")] || "YES_NO_HABIT").trim().toUpperCase(),
            question: (cells[indexOf("Question")] || "").trim(),
            description: (cells[indexOf("Description")] || "").trim(),
            numerator: Number.isFinite(numerator) && numerator > 0 ? numerator : 1,
            denominator: Number.isFinite(denominator) && denominator > 0 ? denominator : 1,
            unit: (cells[indexOf("Unit")] || "").trim(),
            targetType: (cells[indexOf("Target Type")] || "").trim().toUpperCase(),
            targetValue: Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 1,
            archived: (cells[indexOf("Archived?")] || "").trim().toLowerCase() === "true",
        });
    }
    return {habits, invalidRows};
}

export function parseLoopCheckmarksCsv(text: string): {marks: LoopCheckmarks; invalidRows: number} {
    const lines = parseLines(text);
    if (!lines.length) return {marks: {names: [], points: []}, invalidRows: 0};
    const header = splitCsvLine(lines[0]);
    if ((header[0] || "").trim().toUpperCase() !== "DATE") return {marks: {names: [], points: []}, invalidRows: lines.length - 1};
    const names = header.slice(1).map((cell) => cell.trim()).filter((name) => name.length > 0);
    const points: LoopCheckmarks["points"] = [];
    let invalidRows = 0;
    for (const line of lines.slice(1)) {
        const cells = splitCsvLine(line);
        const date = (cells[0] || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { invalidRows += 1; continue; }
        points.push({date, values: names.map((_, index) => parseEntryValue(cells[index + 1] || ""))});
    }
    return {marks: {names, points}, invalidRows};
}

/** Loop 频率 N/D → 本插件排期；不可映射返回 undefined（调用方降级并说明）。 */
export function mapLoopSchedule(numerator: number, denominator: number): {schedule: CheckinSchedule; degraded: boolean} | undefined {
    if (numerator <= 0 || denominator <= 0) return undefined;
    if (numerator === 1 && denominator === 1) return {schedule: {type: "daily"}, degraded: false};
    if (numerator >= denominator) return {schedule: {type: "daily"}, degraded: numerator !== denominator};
    if (denominator === 7) return {schedule: {type: "quota", quota: {period: "week", amount: numerator, countMode: "dates"}}, degraded: false};
    if (denominator === 30 || denominator === 31) return {schedule: {type: "quota", quota: {period: "month", amount: numerator, countMode: "dates"}}, degraded: false};
    if (numerator === 1) return {schedule: {type: "interval", intervalDays: denominator}, degraded: false};
    return undefined;
}

export interface LoopImportPlanHabit {
    name: string;
    unit: string;
    measurable: boolean;
    target: number;
    archived: boolean;
    schedule?: CheckinSchedule;
    scheduleDegraded: boolean;
}

export interface LoopImportPlan {
    habits: LoopImportPlanHabit[];
    rows: Array<{name: string; date: string; value: number; unit: string; binary: boolean}>;
    measurableNames: string[];
    skipDays: number;
    unknownCells: number;
    unmappableFrequency: string[];
}

/** 组合 Loop 两份 CSV 为导入计划；checkmarksCsv 必填（含习惯名列表），habitsCsv 可选（元数据）。 */
export function buildLoopImportPlan(habitsCsv: string | undefined, checkmarksCsv: string): LoopImportPlan {
    const {habits: metaRows} = habitsCsv ? parseLoopHabitsCsv(habitsCsv) : {habits: [] as LoopHabitMeta[]};
    const metaByName = new Map(metaRows.map((meta) => [meta.name, meta]));
    const {marks} = parseLoopCheckmarksCsv(checkmarksCsv);
    const plan: LoopImportPlan = {habits: [], rows: [], measurableNames: [], skipDays: 0, unknownCells: 0, unmappableFrequency: []};
    for (const name of marks.names) {
        const meta = metaByName.get(name);
        const measurable = meta ? meta.type === "MEASURABLE" : false;
        const mapped = meta ? mapLoopSchedule(meta.numerator, meta.denominator) : {schedule: {type: "daily" as const}, degraded: false};
        if (meta && !mapped) {
            plan.unmappableFrequency.push(name);
        }
        const schedule = mapped?.schedule || {type: "daily" as const};
        const unit = meta?.unit || "次";
        const target = measurable && meta ? meta.targetValue : 1;
        plan.habits.push({name, unit, measurable, target, archived: meta?.archived || false, schedule, scheduleDegraded: mapped ? mapped.degraded : true});
        if (measurable) {
            plan.measurableNames.push(name);
            continue;
        }
        for (const point of marks.points) {
            const value = point.values[marks.names.indexOf(name)];
            if (value === "YES_MANUAL" || value === "YES_AUTO") {
                plan.rows.push({name, date: point.date, value: 1, unit, binary: true});
            } else if (value === "SKIP") {
                plan.skipDays += 1;
            } else if (value === "" || value === "UNKNOWN") {
                plan.unknownCells += 1;
            }
        }
    }
    return plan;
}

function csvCell(value: string): string {
    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}

function frequencyForSchedule(item: CheckinItem): {numerator: number; denominator: number} {
    const schedule = item.schedule;
    if (schedule.type === "quota" && schedule.quota) {
        return schedule.quota.period === "week"
            ? {numerator: Math.max(1, Math.min(7, schedule.quota.amount)), denominator: 7}
            : {numerator: Math.max(1, Math.min(31, schedule.quota.amount)), denominator: 30};
    }
    if (schedule.type === "interval" && schedule.intervalDays) return {numerator: 1, denominator: Math.max(1, schedule.intervalDays)};
    if (schedule.type === "weekly" && Array.isArray(schedule.weekdays)) return {numerator: Math.max(1, schedule.weekdays.length), denominator: 7};
    if (schedule.type === "workdays") return {numerator: 5, denominator: 7};
    return {numerator: 1, denominator: 1};
}

/** 同构导出：Habits.csv（12 列，与 Loop HabitsCSVExporter 一致）。 */
export function serializeLoopHabitsCsv(store: CheckinStore): string {
    const lines = [HABITS_HEADER.join(",")];
    store.items.forEach((item, index) => {
        const frequency = frequencyForSchedule(item);
        const measurable = item.kind !== "binary";
        const cells = [
            String(index + 1).padStart(3, "0"),
            item.name,
            measurable ? "MEASURABLE" : "YES_NO_HABIT",
            "",
            item.group || "",
            String(frequency.numerator),
            String(frequency.denominator),
            "",
            measurable ? item.unit : "",
            measurable ? "AT_LEAST" : "",
            measurable ? String(item.target) : "",
            item.archived ? "true" : "false",
        ];
        lines.push(cells.map(csvCell).join(","));
    });
    return lines.join("\n");
}

/** 同构导出：组合版 Checkmarks.csv（Date,<名称...>，新→旧；有记录 YES_MANUAL，无记录 NO）。 */
export function serializeLoopCheckmarksCsv(store: CheckinStore, today = new Date()): string {
    const items = store.items;
    const byItemDay = new Map<string, Set<string>>();
    const days = new Set<string>();
    for (const event of store.events) {
        if (!items.some((item) => item.id === event.itemId)) continue;
        const bucket = byItemDay.get(event.itemId) || new Set<string>();
        bucket.add(event.localDate);
        byItemDay.set(event.itemId, bucket);
        days.add(event.localDate);
    }
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    days.add(todayKey);
    const ordered = [...days].sort().reverse().slice(0, 3660);
    const lines = [`Date,${items.map((item) => csvCell(item.name)).join(",")}${items.length ? "," : ""}`];
    for (const date of ordered) {
        const cells = items.map((item) => byItemDay.get(item.id)?.has(date) ? "YES_MANUAL" : "NO");
        lines.push(`${date},${cells.join(",")}${items.length ? "," : ""}`);
    }
    return lines.join("\n");
}
