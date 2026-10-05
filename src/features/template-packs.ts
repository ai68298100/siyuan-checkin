/* T-1454 · 方向 11 场景组合包（habit stacks v1）——预览投影纯函数面。
   纪律（docs/roadmap-product-strategy-2026-09.md 方向 11）：
   - 组合包是纯内容资产：本模块只做「解析引用 → 分类新旧 → 计数」的只读投影，
     不创建项目、不触碰 Store v3；应用仍逐条走既有模板表单确认通道；
   - 重复判定优先使用稳定模板锚点，旧数据可由调用方注入受限的本地化别名；
     localizeName/resolveAliases 均由调用方注入，保持本模块零依赖、无时钟、确定性；
   - 引用了不存在模板名的组合包安全降级（计入 unknownNames，不抛异常）。 */

export interface TemplatePackPreviewEntry<T> {
    template: T;
    /** 本地化后的显示名（供渲染层直接使用）。 */
    name: string;
    status: "new" | "duplicate";
}

export interface TemplatePackPreview<T> {
    entries: readonly TemplatePackPreviewEntry<T>[];
    newCount: number;
    duplicateCount: number;
    /** 组合包引用了但目录中不存在的模板名（fail-closed 降级，不进 entries）。 */
    unknownNames: readonly string[];
}

/** A single rule difference between a pack template and an existing item. */
export interface TemplatePackRuleDifference {
    field: string;
    existing: unknown;
    incoming: unknown;
}

export type TemplatePackApplyDisposition = "create" | "skip" | "edit";

export interface TemplatePackApplicationEntry<T, E> extends TemplatePackPreviewEntry<T> {
    /** Existing active item with the same stable anchor or compatibility alias, when present. */
    existing?: E;
    /** Stable existing item identity for edit actions. */
    existingId?: string;
    /** `same` means the existing item has the same rule surface; `different` exposes diffs. */
    conflict: "none" | "same" | "different";
    differences: readonly TemplatePackRuleDifference[];
    /** Safe default: create new entries, skip duplicates (including conflicting ones). */
    defaultDisposition: TemplatePackApplyDisposition;
}

export interface TemplatePackApplicationPlan<T, E> {
    entries: readonly TemplatePackApplicationEntry<T, E>[];
    createCount: number;
    sameCount: number;
    differentCount: number;
    unknownNames: readonly string[];
}

type RuleLike = {
    name: string;
    templateAnchor?: string;
    icon?: string;
    kind?: unknown;
    target?: unknown;
    unit?: unknown;
    recordStep?: unknown;
    schedule?: unknown;
    group?: unknown;
    priority?: unknown;
    timeSlot?: unknown;
    completionSource?: unknown;
    tomatoMode?: unknown;
    direction?: unknown;
};

/* Keep this comparison local and deterministic. JSON.stringify is sufficient after
   recursively sorting object keys; arrays (notably weekdays) retain their declared order. */
function stableRuleValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stableRuleValue);
    if (value && typeof value === "object") {
        return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
            const child = (value as Record<string, unknown>)[key];
            if (child !== undefined) result[key] = stableRuleValue(child);
            return result;
        }, {});
    }
    return value;
}

function ruleDifferences<T extends RuleLike, E extends RuleLike>(template: T, existing: E): TemplatePackRuleDifference[] {
    const fields: Array<keyof RuleLike> = ["icon", "kind", "target", "unit", "recordStep", "schedule", "group", "priority", "timeSlot", "completionSource", "tomatoMode", "direction"];
    return fields.reduce<TemplatePackRuleDifference[]>((result, field) => {
        const incoming = stableRuleValue(template[field]);
        const current = stableRuleValue(existing[field]);
        if (JSON.stringify(incoming) !== JSON.stringify(current)) result.push({field: String(field), existing: current, incoming});
        return result;
    }, []);
}

/**
 * Build the editable application plan used by the pack preview.
 *
 * The function is deliberately read-only and has no storage or clock dependency:
 * callers can render it, let the user change dispositions, then rebuild it immediately
 * before saving. Archived items are expected to be filtered by the caller so that an
 * archived name never blocks a new active project.
 */
export function buildTemplatePackApplicationPlan<T extends RuleLike, E extends RuleLike>(
    packTemplates: readonly string[],
    catalog: readonly T[],
    existingItems: readonly E[],
    options: {localizeName?: (name: string) => string; resolveAliases?: (template: T) => readonly string[]} = {},
): TemplatePackApplicationPlan<T, E> {
    const localizeName = options.localizeName ?? ((name: string) => name);
    const existingByName = new Map(existingItems.map((item) => [item.name, item]));
    const existingByAnchor = new Map(existingItems.flatMap((item) => item.templateAnchor ? [[item.templateAnchor, item] as const] : []));
    const entries: TemplatePackApplicationEntry<T, E>[] = [];
    const unknownNames: string[] = [];
    let createCount = 0;
    let sameCount = 0;
    let differentCount = 0;
    for (const name of packTemplates) {
        const template = catalog.find((candidate) => candidate.name === name);
        if (!template) {
            unknownNames.push(name);
            continue;
        }
        const displayName = localizeName(template.name);
        const aliases = options.resolveAliases?.(template) ?? [displayName];
        const existing = existingByAnchor.get(template.name) || aliases.map((alias) => existingByName.get(alias)).find((candidate): candidate is E => Boolean(candidate));
        if (!existing) {
            createCount += 1;
            entries.push({template, name: displayName, status: "new", conflict: "none", differences: [], defaultDisposition: "create"});
            continue;
        }
        const differences = ruleDifferences(template, existing);
        const conflict = differences.length ? "different" : "same";
        if (conflict === "same") sameCount += 1;
        else differentCount += 1;
        const existingId = typeof (existing as E & {id?: unknown}).id === "string" ? (existing as E & {id: string}).id : undefined;
        entries.push({template, name: displayName, status: "duplicate", existing, ...(existingId ? {existingId} : {}), conflict, differences, defaultDisposition: "skip"});
    }
    return {entries, createCount, sameCount, differentCount, unknownNames};
}

/** 组合包预览：按目录顺序解析引用的模板，比对现有项目名（经 localizeName 本地化）
    标记 new / duplicate。同一组合包同输入两次构建得到深度相等结果。 */
export function buildTemplatePackPreview<T extends {name: string}>(
    packTemplates: readonly string[],
    catalog: readonly T[],
    existingNames: readonly string[],
    options: {localizeName?: (name: string) => string} = {},
): TemplatePackPreview<T> {
    const localizeName = options.localizeName ?? ((name: string) => name);
    const existing = new Set(existingNames);
    const entries: TemplatePackPreviewEntry<T>[] = [];
    const unknownNames: string[] = [];
    let newCount = 0;
    let duplicateCount = 0;
    for (const name of packTemplates) {
        const template = catalog.find((candidate) => candidate.name === name);
        if (!template) {
            unknownNames.push(name);
            continue;
        }
        const displayName = localizeName(template.name);
        const status = existing.has(displayName) ? "duplicate" : "new";
        if (status === "new") newCount += 1;
        else duplicateCount += 1;
        entries.push({template, name: displayName, status});
    }
    return {entries, newCount, duplicateCount, unknownNames};
}
