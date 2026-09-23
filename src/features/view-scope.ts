/* T-1425 · R-A8 可保存视图——版本化 ViewScope 归一化与解析（纯函数面）。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-A8/战略方向 23）：
   - 视图只保存查询偏好（范围/项目/分组/来源/状态），不复制事件、不改变项目模型；
   - 日期一律相对（最近 N 天 / 全部），相对天数防失效——保存的视图不会因时间
     流逝指向错误的绝对区间；解析时显式传入 today（localDate），不读取时钟；
   - 非法或过大的范围安全回落/截断并置 truncated；失效项目或来源解析为
     「缺失条件」显式回显，可恢复、不静默丢弃、不静默扩大范围；
   - 版本化：version !== 1 整体回落默认范围（fail-closed），为未来演进留位；
   - 日期运算复用 src/date-keys.ts（R-A7 单一实现），本模块不自行算日差。 */

import {addDays} from "../date-keys";

export const VIEW_SCOPE_VERSION = 1;

export const VIEW_SCOPE_LIMITS = {
    /** 相对天数窗口上限（对齐 API v5 区间 ≤366 的有界纪律，留 730 供年度回看）。 */
    maxRelativeDays: 730,
    maxItemIds: 200,
    maxGroups: 50,
    maxSources: 8,
} as const;

export type ViewScopeRangeKind = "relative-days" | "all";
export type ViewScopeStatus = "all" | "completed" | "pending";

export interface ViewScopeV1 {
    version: 1;
    range: {kind: "relative-days"; days: number} | {kind: "all"};
    itemIds: string[];
    groups: string[];
    sources: string[];
    status: ViewScopeStatus;
}

export interface ViewScopeNormalization {
    scope: ViewScopeV1;
    /** 任一过滤器超出上限被截断时为 true（保留前缀，不静默丢弃语义）。 */
    truncated: boolean;
}

export const DEFAULT_VIEW_SCOPE: ViewScopeV1 = {
    version: 1,
    range: {kind: "all"},
    itemIds: [],
    groups: [],
    sources: [],
    status: "all",
};

const STATUS_VALUES = new Set<ViewScopeStatus>(["all", "completed", "pending"]);

function sanitizeTokenList(value: unknown, max: number, maxLength: number): {values: string[]; truncated: boolean} {
    if (!Array.isArray(value)) return {values: [], truncated: false};
    const seen = new Set<string>();
    const values: string[] = [];
    let truncated = false;
    for (const entry of value) {
        if (typeof entry !== "string") continue;
        const token = entry.trim().slice(0, maxLength);
        if (!token || seen.has(token)) continue;
        seen.add(token);
        if (values.length >= max) {
            truncated = true;
            break;
        }
        values.push(token);
    }
    return {values, truncated};
}

/** 归一化 ViewScope：非法字段安全回落默认，过滤器上限截断并报告 truncated。
    version !== 1 整体回落默认范围（fail-closed，不猜未来字段语义）。 */
export function normalizeViewScope(value: unknown): ViewScopeNormalization {
    if (!value || typeof value !== "object") return {scope: {...DEFAULT_VIEW_SCOPE}, truncated: false};
    const source = value as Record<string, unknown>;
    if (source.version !== VIEW_SCOPE_VERSION) return {scope: {...DEFAULT_VIEW_SCOPE}, truncated: false};

    let truncated = false;
    const rawRange = (source.range && typeof source.range === "object" ? source.range : {}) as Record<string, unknown>;
    let range: ViewScopeV1["range"] = {kind: "all"};
    if (rawRange.kind === "relative-days") {
        const days = typeof rawRange.days === "number" && Number.isFinite(rawRange.days) ? Math.floor(rawRange.days) : Number.NaN;
        if (Number.isInteger(days) && days >= 1 && days <= VIEW_SCOPE_LIMITS.maxRelativeDays) {
            range = {kind: "relative-days", days};
        } else {
            range = {kind: "relative-days", days: VIEW_SCOPE_LIMITS.maxRelativeDays};
            truncated = true;
        }
    }

    const items = sanitizeTokenList(source.itemIds, VIEW_SCOPE_LIMITS.maxItemIds, 200);
    const groups = sanitizeTokenList(source.groups, VIEW_SCOPE_LIMITS.maxGroups, 120);
    const sources = sanitizeTokenList(source.sources, VIEW_SCOPE_LIMITS.maxSources, 32);
    truncated = truncated || items.truncated || groups.truncated || sources.truncated;

    const status = STATUS_VALUES.has(source.status as ViewScopeStatus) ? (source.status as ViewScopeStatus) : "all";

    return {
        scope: {version: 1, range, itemIds: items.values, groups: groups.values, sources: sources.values, status},
        truncated,
    };
}

/** 解析上下文：调用方从当前 store/偏好取得的已知集合与显式 today。 */
export interface ViewScopeResolutionContext {
    today: string;
    knownItemIds: readonly string[];
    knownGroups: readonly string[];
    knownSources: readonly string[];
}

export interface ViewScopeResolution {
    /** 闭区间 [startDate, endDate]；range=all 时 startDate 为 undefined（不设下界）。 */
    startDate?: string;
    endDate: string;
    /** 引用了当前不存在的条件——显式回显为可恢复缺失，不静默丢弃、不扩大范围。 */
    missingItemIds: readonly string[];
    missingGroups: readonly string[];
    missingSources: readonly string[];
    truncated: boolean;
}

/** 解析 ViewScope 为具体日期区间与缺失条件。 */
export function resolveViewScope(scope: ViewScopeV1, context: ViewScopeResolutionContext): ViewScopeResolution {
    const endDate = context.today;
    let startDate: string | undefined;
    if (scope.range.kind === "relative-days") {
        const resolved = addDays(context.today, -(scope.range.days - 1));
        if (resolved === undefined) return {endDate, missingItemIds: [], missingGroups: [], missingSources: [], truncated: true};
        startDate = resolved;
    }
    const knownItems = new Set(context.knownItemIds);
    const knownGroups = new Set(context.knownGroups);
    const knownSources = new Set(context.knownSources);
    return {
        ...(startDate ? {startDate} : {}),
        endDate,
        missingItemIds: scope.itemIds.filter((id) => !knownItems.has(id)),
        missingGroups: scope.groups.filter((group) => !knownGroups.has(group)),
        missingSources: scope.sources.filter((source) => !knownSources.has(source)),
        truncated: false,
    };
}

/** 展示词元（i18n 由渲染层完成）：报告/导出头部的范围声明所需的最小事实。 */
export interface ViewScopeDescription {
    rangeToken: "all" | "relative-days";
    days?: number;
    status: ViewScopeStatus;
    filterCount: number;
    missingCount: number;
    truncated: boolean;
}

export function describeViewScope(scope: ViewScopeV1, resolution: ViewScopeResolution): ViewScopeDescription {
    return {
        rangeToken: scope.range.kind,
        ...(scope.range.kind === "relative-days" ? {days: scope.range.days} : {}),
        status: scope.status,
        filterCount: scope.itemIds.length + scope.groups.length + scope.sources.length,
        missingCount: resolution.missingItemIds.length + resolution.missingGroups.length + resolution.missingSources.length,
        truncated: resolution.truncated,
    };
}
