import type {HabitInsights} from "./insights";

export type CoachingTone = "positive" | "attention" | "neutral";

export interface CoachingSuggestion {
    id: string;
    tone: CoachingTone;
    title: string;
    detail: string;
    evidence: string;
}

export type CoachingTranslate = (key: string, params?: Record<string, string | number>) => string;

function text(translate: CoachingTranslate | undefined, key: string, fallback: string, params?: Record<string, string | number>): string {
    return translate ? translate(key, params) : fallback;
}

/** Builds local, deterministic suggestions. It never invokes AI or sends data. */
export function buildCoachingSuggestions(report: HabitInsights, translate?: CoachingTranslate): CoachingSuggestion[] {
    if (!report.item) return [];
    const suggestions: CoachingSuggestion[] = [];
    const rate = report.aggregates.completionRate;
    const eligibleDays = report.aggregates.eligibleScheduledDays;
    const today = report.days[report.days.length - 1];

    if (!eligibleDays || rate === null) {
        suggestions.push({
            id: "build-baseline",
            tone: "neutral",
            title: text(translate, "insights.coach.buildBaselineTitle", "先积累可比较的数据"),
            detail: text(translate, "insights.coach.buildBaselineDetail", "继续按当前安排记录几次，形成完成率和趋势基线后再判断是否需要调整目标。"),
            evidence: text(translate, "insights.coach.buildBaselineEvidence", `当前窗口有 ${eligibleDays} 个可评估计划日`, {n: eligibleDays}),
        });
    } else if (rate >= 85 && report.currentStreak >= 3) {
        suggestions.push({
            id: "keep-rhythm",
            tone: "positive",
            title: text(translate, "insights.coach.keepRhythmTitle", "保持现在的节奏"),
            detail: text(translate, "insights.coach.keepRhythmDetail", "当前安排与目标基本可持续，先维持频率，避免在连续记录期间突然提高目标。"),
            evidence: text(translate, "insights.coach.keepRhythmEvidence", `完成率 ${rate}%，当前连续 ${report.currentStreak} 天`, {rate, n: report.currentStreak}),
        });
    } else if (rate < 50) {
        suggestions.push({
            id: "reduce-friction",
            tone: "attention",
            title: text(translate, "insights.coach.reduceFrictionTitle", "降低下一次行动门槛"),
            detail: text(translate, "insights.coach.reduceFrictionDetail", "近期完成机会较少，可以先缩小单次目标或减少安排频率，稳定后再逐步增加。"),
            evidence: text(translate, "insights.coach.reduceFrictionEvidence", `完成率 ${rate}%，完成 ${report.aggregates.completedDays}/${eligibleDays} 个计划日`, {rate, done: report.aggregates.completedDays, total: eligibleDays}),
        });
    } else {
        suggestions.push({
            id: "stabilize-rhythm",
            tone: "neutral",
            title: text(translate, "insights.coach.stabilizeRhythmTitle", "优先稳定计划节奏"),
            detail: text(translate, "insights.coach.stabilizeRhythmDetail", "当前已有一定基础，先减少连续中断，再考虑增加目标量。"),
            evidence: text(translate, "insights.coach.stabilizeRhythmEvidence", `完成率 ${rate}%，当前连续 ${report.currentStreak} 天`, {rate, n: report.currentStreak}),
        });
    }

    const trend = comparableWeeklyTrend(report);
    /* T-1223：连续跳过是最直接的「频率偏高」信号——只建议下调，不自动修改排期。
       跳过日不断链、不入完成率分母（T-1221），因此该建议只在真实连续跳过时出现。 */
    if (report.recentSkipDays >= 2) {
        suggestions.push({
            id: "skip-streak",
            tone: "attention",
            title: text(translate, "insights.coach.skipStreakTitle", `连续跳过了 ${report.recentSkipDays} 天`, {n: report.recentSkipDays}),
            detail: text(translate, "insights.coach.skipStreakDetail", "连续跳过通常意味着频率偏高：可以把排期改为弹性目标（例如每周 N 次）或调低单次目标。跳过不会断开连续记录，也不计入完成率。"),
            evidence: text(translate, "insights.coach.skipStreakEvidence", `最近连续跳过 ${report.recentSkipDays} 个计划日`, {n: report.recentSkipDays}),
        });
    }
    /* T-1227：强度分数下滑——恢复最小可完成节奏，强度随完成重新积累。 */
    if (report.strengthScore !== null && report.strengthDelta !== null && report.strengthDelta <= -15 && report.strengthScore < 60) {
        suggestions.push({
            id: "strength-decline",
            tone: "attention",
            title: text(translate, "insights.coach.strengthDeclineTitle", "习惯强度正在下滑"),
            detail: text(translate, "insights.coach.strengthDeclineDetail", "强度分数反映近期完成节奏：先恢复最小可完成的一步，强度会随完成重新积累，不必追求立刻回到峰值。"),
            evidence: text(translate, "insights.coach.strengthDeclineEvidence", `30 天强度 ${report.strengthScore} 分，较两周前下降 ${Math.abs(report.strengthDelta)} 分`, {score: report.strengthScore, delta: Math.abs(report.strengthDelta)}),
        });
    }
    if (trend && trend.latestRate <= trend.previousRate - 20) {
        suggestions.push({
            id: "trend-decline",
            tone: "attention",
            title: text(translate, "insights.coach.trendDeclineTitle", "留意最近一周的下降"),
            detail: text(translate, "insights.coach.trendDeclineDetail", "先回看日程、精力或目标是否发生变化，再决定调整频率还是目标值。"),
            evidence: text(translate, "insights.coach.trendDeclineEvidence", `最近可比周 ${trend.latestRate}%，此前一周 ${trend.previousRate}%`, {latest: trend.latestRate, previous: trend.previousRate}),
        });
    } else if (trend && trend.latestRate >= trend.previousRate + 20) {
        suggestions.push({
            id: "trend-improving",
            tone: "positive",
            title: text(translate, "insights.coach.trendImprovingTitle", "近期节奏正在改善"),
            detail: text(translate, "insights.coach.trendImprovingDetail", "最近一周比此前更稳定，可以记录有效做法，继续观察一周后再调整目标。"),
            evidence: text(translate, "insights.coach.trendImprovingEvidence", `最近可比周 ${trend.latestRate}%，此前一周 ${trend.previousRate}%`, {latest: trend.latestRate, previous: trend.previousRate}),
        });
    }

    if (today?.status === "partial") {
        const remaining = Math.max(0, today.target - today.progress);
        suggestions.push({
            id: "finish-today",
            tone: "neutral",
            title: text(translate, "insights.coach.finishTodayTitle", "今天已经开始"),
            detail: text(translate, "insights.coach.finishTodayDetail", `距离今日目标还差 ${formatNumber(remaining)}${today.unit}，可以安排一个短时段完成。`, {remaining: formatNumber(remaining), unit: today.unit}),
            evidence: text(translate, "insights.coach.finishTodayEvidence", `今日进度 ${formatNumber(today.progress)}/${formatNumber(today.target)}${today.unit}`, {progress: formatNumber(today.progress), target: formatNumber(today.target), unit: today.unit}),
        });
    } else if (today?.status === "pending" && report.item.direction !== "atMost") {
        /* T-1609：戒除类没有「还差多少」——今日 pending 只出现在跳过日，
            「开始记录」对戒除目标意味着破戒，不给该建议。 */
        suggestions.push({
            id: "start-today",
            tone: "neutral",
            title: text(translate, "insights.coach.startTodayTitle", "从最小一步开始今天的计划"),
            detail: text(translate, "insights.coach.startTodayDetail", "先完成一次可记录的最小行动，减少开始成本，再根据状态决定是否继续。"),
            evidence: text(translate, "insights.coach.startTodayEvidence", `今日目标 ${formatNumber(today.target)}${today.unit}`, {target: formatNumber(today.target), unit: today.unit}),
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
