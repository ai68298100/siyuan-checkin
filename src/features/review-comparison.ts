import type {ItemSummary, SummaryContext} from "../analytics";

export interface ReviewComparisonItem {
    itemId: string;
    name: string;
    current: {
        eventCount: number;
        scheduledDays: number;
        completedDays: number;
        completionRate: number;
    };
    baseline: {
        eventCount: number;
        scheduledDays: number;
        completedDays: number;
        completionRate: number;
    };
    delta: {
        eventCount: number;
        scheduledDays: number;
        completedDays: number;
        completionRate: number;
    };
}

export interface ReviewComparison {
    current: {
        range: SummaryContext["range"];
        startDate: string;
        endDate: string;
        totalEvents: number;
        completedItems: number;
        scheduledItems: number;
    };
    baseline: {
        range: SummaryContext["range"];
        startDate: string;
        endDate: string;
        totalEvents: number;
        completedItems: number;
        scheduledItems: number;
    };
    delta: {
        totalEvents: number;
        completedItems: number;
        scheduledItems: number;
    };
    items: ReviewComparisonItem[];
}

export interface ReviewComparisonRange {
    startDate: string;
    endDate: string;
}

function itemMetrics(item: ItemSummary | undefined) {
    return {
        eventCount: item?.eventCount || 0,
        scheduledDays: item?.scheduledDays || 0,
        completedDays: item?.completedDays || 0,
        completionRate: item?.completionRate || 0,
    };
}

function snapshotContext(context: SummaryContext) {
    return {
        range: context.range,
        startDate: context.startDate,
        endDate: context.endDate,
        totalEvents: context.totalEvents,
        completedItems: context.completedItems,
        scheduledItems: context.scheduledItems,
    };
}

function parseDateKey(value: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

function formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Return the immediately preceding inclusive range with the same local-day span. */
export function getPreviousReviewRange(range: ReviewComparisonRange): ReviewComparisonRange | undefined {
    const start = parseDateKey(range.startDate);
    const end = parseDateKey(range.endDate);
    if (!start || !end || start > end) return undefined;
    const daySpan = Math.round((new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getTime() - start.getTime()) / 86400000);
    const previousEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
    const previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate() - daySpan + 1);
    return {startDate: formatDateKey(previousStart), endDate: formatDateKey(previousEnd)};
}

/** Compare two already-projected ranges without reading or mutating the store. */
export function buildReviewComparison(current: SummaryContext, baseline: SummaryContext): ReviewComparison {
    const currentById = new Map(current.items.map((item) => [item.itemId, item]));
    const baselineById = new Map(baseline.items.map((item) => [item.itemId, item]));
    const seen = new Set<string>();
    const items: ReviewComparisonItem[] = [];
    for (const item of [...current.items, ...baseline.items]) {
        if (seen.has(item.itemId)) continue;
        seen.add(item.itemId);
        const currentItem = currentById.get(item.itemId);
        const currentMetrics = itemMetrics(currentItem);
        const baselineMetrics = itemMetrics(baselineById.get(item.itemId));
        items.push({
            itemId: item.itemId,
            name: currentItem?.name || item.name,
            current: currentMetrics,
            baseline: baselineMetrics,
            delta: {
                eventCount: currentMetrics.eventCount - baselineMetrics.eventCount,
                scheduledDays: currentMetrics.scheduledDays - baselineMetrics.scheduledDays,
                completedDays: currentMetrics.completedDays - baselineMetrics.completedDays,
                completionRate: currentMetrics.completionRate - baselineMetrics.completionRate,
            },
        });
    }
    return {
        current: snapshotContext(current),
        baseline: snapshotContext(baseline),
        delta: {
            totalEvents: current.totalEvents - baseline.totalEvents,
            completedItems: current.completedItems - baseline.completedItems,
            scheduledItems: current.scheduledItems - baseline.scheduledItems,
        },
        items,
    };
}

/** T-1343：目标偏差解释——从比较结果确定性推导「差在哪」，纯函数不改数据。 */
export interface ReviewDeviationNote {
    itemId: string;
    name: string;
    kind: "improve" | "decline";
    rateDelta: number;
    completedDelta: number;
}

/** 默认只报告完成率变化 ≥ 5 个百分点的项目；幅度相同按名称、ID 稳定排序。 */
export function buildReviewDeviationNotes(comparison: ReviewComparison, options?: {minRateDelta?: number; limit?: number}): ReviewDeviationNote[] {
    const minRateDelta = options?.minRateDelta ?? 5;
    const limit = options?.limit ?? 3;
    if (!Number.isFinite(minRateDelta) || minRateDelta < 0 || !Number.isFinite(limit) || limit <= 0) return [];
    const items = Array.isArray(comparison.items) ? comparison.items : [];
    return items
        .filter((item) => Math.abs(item.delta.completionRate) >= minRateDelta)
        .sort((left, right) => Math.abs(right.delta.completionRate) - Math.abs(left.delta.completionRate) || left.name.localeCompare(right.name) || left.itemId.localeCompare(right.itemId))
        .slice(0, limit)
        .map((item) => ({
            itemId: item.itemId,
            name: item.name,
            kind: item.delta.completionRate > 0 ? "improve" as const : "decline" as const,
            rateDelta: item.delta.completionRate,
            completedDelta: item.delta.completedDays,
        }));
}
