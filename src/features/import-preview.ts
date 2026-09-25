/* T-1427 · R-A4/R-30.4 导入预览统一模型——Loop CSV 与 Obsidian Habits 21 的
   应用前预览（纯函数面）。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-30.4）：
   - 预览在写入前生成：逐项列出可迁移记录数、无法等价表达的语义（lossy 词表）
     与现有项目重名的合并预期；冲突显示为报告，不静默覆盖；
   - 身份口径随格式如实声明：Obsidian 走 obsidian21:<file>:<date> externalRef
     幂等；Loop 无 externalRef，身份为「项目+日期+值+单位」内容匹配；
   - lossy 词表冻结（消费方按词元本地化）：schedule-degraded / unmappable-
     frequency / unknown-cells / archived-flag / color / max-gap；T-1463 追加
     unknown-columns（源文件中未识别的列名，进预览与审计，不静默丢弃）；
   - 零依赖、无时钟、确定性（同名去重、升序不承诺——输入顺序即呈现顺序）。 */

import type {LoopImportPlan} from "./loop-csv";
import type {ObsidianImportPlan} from "./obsidian-habits";

export type ImportFormat = "loop-csv" | "obsidian-habits";
/** 语义损耗词表（v1 冻结 + T-1463 增量；消费方按词元本地化）。 */
export type ImportLossyNote =
    | "schedule-degraded"
    | "unmappable-frequency"
    | "unknown-cells"
    | "archived-flag"
    | "color"
    | "max-gap"
    | "unknown-columns";

export interface ImportPreviewItem {
    name: string;
    /** 可迁移的记录日数。 */
    dateCount: number;
    lossy: readonly ImportLossyNote[];
}

export interface ImportPreviewConflict {
    /** 与现有项目重名——应用时合并写入既有项目（不新建、不覆盖历史）。 */
    kind: "existing-item";
    name: string;
}

export interface ImportPreview {
    format: ImportFormat;
    items: readonly ImportPreviewItem[];
    totalDates: number;
    /** 被跳过/无法解析的输入条目数（Loop: skip 日 + 未知单元格）。 */
    skippedEntries: number;
    /** 格式级损耗注记（去重后）。 */
    lossy: readonly ImportLossyNote[];
    conflicts: readonly ImportPreviewConflict[];
    /** 身份口径声明：幂等语义随格式不同，如实呈现。 */
    identityNote: "content-item-date" | "externalRef-obsidian21";
}

/** 与 obsidian-habits.ts 的 obsidianHabitName 同口径：title 优先，否则文件名去扩展名/冒号。 */
function previewName(habit: {filename: string; title?: string}): string {
    if (habit.title && habit.title.trim()) return habit.title.trim();
    return habit.filename.replace(/.[^.]+$/, "").replace(/:/g, "").trim();
}

function itemPreview(name: string, dateCount: number, lossy: readonly ImportLossyNote[]): ImportPreviewItem {
    return {name, dateCount, lossy: [...new Set(lossy)]};
}

export function buildLoopImportPreview(plan: LoopImportPlan, existingItemNames: readonly string[]): ImportPreview {
    const existing = new Set(existingItemNames);
    const unmappable = new Set(plan.unmappableFrequency);
    const items = plan.habits.map((habit) => {
        const lossy: ImportLossyNote[] = [];
        if (habit.scheduleDegraded || unmappable.has(habit.name)) lossy.push("schedule-degraded");
        if (unmappable.has(habit.name)) lossy.push("unmappable-frequency");
        if (habit.archived) lossy.push("archived-flag");
        return itemPreview(habit.name, plan.rows.filter((row) => row.name === habit.name).length, lossy);
    });
    const conflicts = [...existing].filter((name) => plan.habits.some((habit) => habit.name === name))
        .map((name) => ({kind: "existing-item" as const, name}));
    return {
        format: "loop-csv",
        items,
        totalDates: plan.rows.length,
        skippedEntries: plan.skipDays + plan.unknownCells,
        lossy: [
            ...(plan.unmappableFrequency.length ? (["unmappable-frequency", "schedule-degraded"] as const) : []),
            ...(plan.unknownCells ? (["unknown-cells"] as const) : []),
            /* T-1463：未识别列名如实声明（向前兼容承诺，见 docs/export-formats.md）；
               防御读取——旧形状的 plan 无此字段时视为没有未知列。 */
            ...(plan.unknownColumns?.length ? (["unknown-columns"] as const) : []),
        ],
        conflicts,
        identityNote: "content-item-date",
    };
}

export function buildObsidianImportPreview(plan: ObsidianImportPlan, existingItemNames: readonly string[]): ImportPreview {
    const existing = new Set(existingItemNames);
    const items = plan.habits.map((habit) => {
        const lossy: ImportLossyNote[] = [];
        if (habit.color) lossy.push("color");
        if (typeof habit.maxGap === "number" && habit.maxGap > 0) lossy.push("max-gap");
        return itemPreview(previewName(habit), habit.dates.length, lossy);
    });
    const conflicts = [...existing].filter((name) => plan.habits.some((habit) => previewName(habit) === name))
        .map((name) => ({kind: "existing-item" as const, name}));
    return {
        format: "obsidian-habits",
        items,
        totalDates: plan.totalDates,
        skippedEntries: 0,
        lossy: plan.habits.some((habit) => habit.color) ? (["color"] as const) : [],
        conflicts,
        identityNote: "externalRef-obsidian21",
    };
}

export function summarizeImportPreview(preview: ImportPreview): {items: number; totalDates: number; conflictCount: number; lossyCount: number} {
    return {
        items: preview.items.length,
        totalDates: preview.totalDates,
        conflictCount: preview.conflicts.length,
        lossyCount: new Set(preview.items.flatMap((item) => item.lossy)).size,
    };
}
