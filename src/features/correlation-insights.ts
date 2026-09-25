/* R-17.1（2026-09-26）确定性相关性洞察：项目对完成率的 Pearson 相关只读投影。
   纪律（implementation roadmap R-17.1，来源 hermes-life-os 最小样本纪律 + calm 禁则）：
   - 最小样本：重叠排期日 ≥4 且 |r| ≥0.4 才输出（防小样本误读）；
   - 同日相关为主，另算 A 领先 B 一天的滞后相关（|r_lag| > |r_same| 才以滞后呈现）；
   - 相关不是因果：报告渲染固定附带免责说明（report.correlationNote）；
   - 纯函数、零依赖、无时钟、确定性排序（|r| desc → 样本 desc → 名称平局裁决）。 */

export interface CorrelationItemSeries {
    id: string;
    name: string;
    /** 观察窗内逐日：是否排期 + 完成率（value/target，0..1；无数据=0）。日期需升序且对齐。 */
    days: ReadonlyArray<{date: string; scheduled: boolean; ratio: number}>;
}

export interface CorrelationInsight {
    itemA: string;
    itemB: string;
    /** Pearson r，保留两位小数。 */
    r: number;
    sampleDays: number;
    /** 0=同日相关；1=A 领先 B 一天。 */
    lag: 0 | 1;
    direction: "positive" | "negative";
}

export const CORRELATION_MIN_DAYS = 4;
export const CORRELATION_MIN_ABS_R = 0.4;

function pearson(pairs: ReadonlyArray<{x: number; y: number}>): number | undefined {
    const n = pairs.length;
    if (n < 2) return undefined;
    let sumX = 0;
    let sumY = 0;
    for (const pair of pairs) {
        sumX += pair.x;
        sumY += pair.y;
    }
    const meanX = sumX / n;
    const meanY = sumY / n;
    let covariance = 0;
    let varianceX = 0;
    let varianceY = 0;
    for (const pair of pairs) {
        const dx = pair.x - meanX;
        const dy = pair.y - meanY;
        covariance += dx * dy;
        varianceX += dx * dx;
        varianceY += dy * dy;
    }
    if (varianceX <= 0 || varianceY <= 0) return undefined; /* 常数序列无相关可言 */
    return covariance / Math.sqrt(varianceX * varianceY);
}

function byDateIndex(item: CorrelationItemSeries): Map<string, {scheduled: boolean; ratio: number}> {
    const map = new Map<string, {scheduled: boolean; ratio: number}>();
    for (const day of item.days) map.set(day.date, {scheduled: day.scheduled, ratio: day.ratio});
    return map;
}

/** 主入口：两两配对计算同日与滞后一天相关，按纪律过滤后确定性排序输出。 */
export function buildCorrelationInsights(
    items: readonly CorrelationItemSeries[],
    options?: {minDays?: number; minAbsR?: number; limit?: number},
): CorrelationInsight[] {
    const minDays = Math.max(2, options?.minDays ?? CORRELATION_MIN_DAYS);
    const minAbsR = options?.minAbsR ?? CORRELATION_MIN_ABS_R;
    const limit = Math.max(1, options?.limit ?? 3);
    const insights: CorrelationInsight[] = [];
    for (let a = 0; a < items.length; a += 1) {
        for (let b = a + 1; b < items.length; b += 1) {
            const left = items[a];
            const right = items[b];
            const leftIndex = byDateIndex(left);
            const rightIndex = byDateIndex(right);
            const sameDay: Array<{x: number; y: number}> = [];
            /* 滞后一天：left 的 d 日配 right 的 d+1 日（日期串比较，利用输入升序约定）。 */
            const lagged: Array<{x: number; y: number}> = [];
            for (const day of left.days) {
                if (!day.scheduled) continue;
                const rightDay = rightIndex.get(day.date);
                if (rightDay?.scheduled) sameDay.push({x: day.ratio, y: rightDay.ratio});
                const nextDate = nextDateKey(day.date);
                if (!nextDate) continue;
                const rightNext = rightIndex.get(nextDate);
                if (rightNext?.scheduled) lagged.push({x: day.ratio, y: rightNext.ratio});
            }
            const sameR = pearson(sameDay);
            if (sameDay.length >= minDays && sameR !== undefined && Math.abs(sameR) >= minAbsR) {
                insights.push({itemA: left.name, itemB: right.name, r: round2(sameR), sampleDays: sameDay.length, lag: 0, direction: sameR > 0 ? "positive" : "negative"});
            }
            const lagR = pearson(lagged);
            if (lagged.length >= minDays && lagR !== undefined && Math.abs(lagR) >= minAbsR && (sameR === undefined || Math.abs(lagR) > Math.abs(sameR))) {
                insights.push({itemA: left.name, itemB: right.name, r: round2(lagR), sampleDays: lagged.length, lag: 1, direction: lagR > 0 ? "positive" : "negative"});
            }
        }
    }
    return insights
        .sort((left, right) => Math.abs(right.r) - Math.abs(left.r)
            || right.sampleDays - left.sampleDays
            || left.itemA.localeCompare(right.itemA, "zh")
            || left.itemB.localeCompare(right.itemB, "zh"))
        .slice(0, limit);
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

/** 下一日期键（YYYY-MM-DD → 次日）；非法/月末由调用方的升序窗口保证，此处纯字符串日历推进。 */
function nextDateKey(date: string): string | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
    const [year, month, day] = date.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    const yyyy = next.getUTCFullYear();
    const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(next.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
