import type {HabitInsights} from "./insights";

export type CoachingTone = "positive" | "attention" | "neutral";

export interface CoachingSuggestion {
    id: string;
    tone: CoachingTone;
    title: string;
    detail: string;
    evidence: string;
}

/** Builds local, deterministic suggestions. It never invokes AI or sends data. */
export function buildCoachingSuggestions(report: HabitInsights): CoachingSuggestion[] {
    if (!report.item) return [];
    const suggestions: CoachingSuggestion[] = [];
    const rate = report.aggregates.completionRate;
    const eligibleDays = report.aggregates.eligibleScheduledDays;
    const today = report.days[report.days.length - 1];

    if (!eligibleDays || rate === null) {
        suggestions.push({
            id: "build-baseline",
            tone: "neutral",
            title: "先积累可比较的数据",
            detail: "继续按当前安排记录几次，形成完成率和趋势基线后再判断是否需要调整目标。",
            evidence: `当前窗口有 ${eligibleDays} 个可评估计划日`,
        });
    } else if (rate >= 85 && report.currentStreak >= 3) {
        suggestions.push({
            id: "keep-rhythm",
            tone: "positive",
            title: "保持现在的节奏",
            detail: "当前安排与目标基本可持续，先维持频率，避免在连续记录期间突然提高目标。",
            evidence: `完成率 ${rate}%，当前连续 ${report.currentStreak} 天`,
        });
    } else if (rate < 50) {
        suggestions.push({
            id: "reduce-friction",
            tone: "attention",
            title: "降低下一次行动门槛",
            detail: "近期完成机会较少，可以先缩小单次目标或减少安排频率，稳定后再逐步增加。",
            evidence: `完成率 ${rate}%，完成 ${report.aggregates.completedDays}/${eligibleDays} 个计划日`,
        });
    } else {
        suggestions.push({
            id: "stabilize-rhythm",
            tone: "neutral",
            title: "优先稳定计划节奏",
            detail: "当前已有一定基础，先减少连续中断，再考虑增加目标量。",
            evidence: `完成率 ${rate}%，当前连续 ${report.currentStreak} 天`,
        });
    }

    const trend = comparableWeeklyTrend(report);
    if (trend && trend.latestRate <= trend.previousRate - 20) {
        suggestions.push({
            id: "trend-decline",
            tone: "attention",
            title: "留意最近一周的下降",
            detail: "先回看日程、精力或目标是否发生变化，再决定调整频率还是目标值。",
            evidence: `最近可比周 ${trend.latestRate}%，此前一周 ${trend.previousRate}%`,
        });
    } else if (trend && trend.latestRate >= trend.previousRate + 20) {
        suggestions.push({
            id: "trend-improving",
            tone: "positive",
            title: "近期节奏正在改善",
            detail: "最近一周比此前更稳定，可以记录有效做法，继续观察一周后再调整目标。",
            evidence: `最近可比周 ${trend.latestRate}%，此前一周 ${trend.previousRate}%`,
        });
    }

    if (today?.status === "partial") {
        const remaining = Math.max(0, today.target - today.progress);
        suggestions.push({
            id: "finish-today",
            tone: "neutral",
            title: "今天已经开始",
            detail: `距离今日目标还差 ${formatNumber(remaining)}${today.unit}，可以安排一个短时段完成。`,
            evidence: `今日进度 ${formatNumber(today.progress)}/${formatNumber(today.target)}${today.unit}`,
        });
    } else if (today?.status === "pending") {
        suggestions.push({
            id: "start-today",
            tone: "neutral",
            title: "从最小一步开始今天的计划",
            detail: "先完成一次可记录的最小行动，减少开始成本，再根据状态决定是否继续。",
            evidence: `今日目标 ${formatNumber(today.target)}${today.unit}`,
        });
    }

    return suggestions.slice(0, 3);
}

function comparableWeeklyTrend(report: HabitInsights): {latestRate: number; previousRate: number} | undefined {
    const comparable = report.weeklyTrend
        .filter((week) => week.eligibleScheduledDays > 0)
        .map((week) => ({
            rate: week.completionRate,
            isClosed: week.observationEndDate < report.endDate,
        }))
        .filter((week) => week.isClosed || week.rate !== null);
    if (comparable.length < 2) return undefined;
    const [previous, latest] = comparable.slice(-2);
    if (previous.rate === null || latest.rate === null) return undefined;
    return {previousRate: previous.rate, latestRate: latest.rate};
}

function formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}
