/* 8.3 周报 Markdown 生成：纯函数，输入已构建的 SummaryContext，输出可粘贴的 Markdown。
   16.1 T-1217：区块可配置（视图偏好持久化）、基线消费 review-comparison 的比较结果、
   数据不足时明确说明而不是给空结论；全部本地生成，不发网络请求。 */

import {t} from "../i18n";
import {weekdayName} from "../occasions";

import type {SummaryContext} from "../analytics";
import type {ReviewComparison} from "./review-comparison";
import {buildReviewDeviationNotes} from "./review-comparison";
import {DEFAULT_REPORT_SECTIONS, type ReportSectionToggles} from "../view-preferences";
import type {ViewScopeDescription} from "./view-scope";
import type {ContextAggregation, ContextWeekdayPattern} from "./context-normalization";
import type {MissedTimeSlotCount, MissedWeekdayCount, StalledItemRank, TargetLoadAdvice} from "./pace-projection";
import type {CorrelationInsight} from "./correlation-insights";

export {DEFAULT_REPORT_SECTIONS};

const REPORT_SOURCES = new Set(["manual", "tomato", "api", "import"]);

function signed(value: number): string {
    if (value > 0) return `+${value}`;
    if (value < 0) return `${value}`;
    return "±0";
}

function highlightLines(summary: SummaryContext): string[] {
    if (summary.totalEvents <= 0 && summary.items.length === 0) {
        return [`> ${t("report.insufficientNote")}`];
    }
    const ranked = [...summary.items].sort((left, right) => right.completionRate - left.completionRate);
    if (ranked.length < 2) {
        return [`> ${t("report.singleItemNote")}`];
    }
    const best = ranked[0];
    const attention = ranked[ranked.length - 1];
    return [
        `- ${t("report.bestLine", {name: best.name, rate: best.completionRate})}`,
        `- ${t("report.attentionLine", {name: attention.name, rate: attention.completionRate})}`,
    ];
}

export function buildWeeklyReportMarkdown(
    summary: SummaryContext,
    title: string,
    sections: ReportSectionToggles = DEFAULT_REPORT_SECTIONS,
    comparison?: ReviewComparison,
    options?: {source?: string; viewScope?: ViewScopeDescription; contextAggregation?: ContextAggregation; contextWeekdayPatterns?: readonly ContextWeekdayPattern[]; stalledItems?: readonly StalledItemRank[]; missedByWeekday?: readonly MissedWeekdayCount[]; missedByTimeSlot?: readonly {label: string; count: number}[]; targetLoad?: readonly TargetLoadAdvice[]; correlationInsights?: readonly CorrelationInsight[]},
): string {
    const lines: string[] = [];
    const rate = summary.scheduledItems ? Math.round((summary.completedItems / summary.scheduledItems) * 100) : 0;
    lines.push(`## ${title}`);
    lines.push("");
    /* T-1433 · R-20.2：跳过原因分布——从既有备注词元聚合，样本不足时显式提示仅供参考。 */
    if (options?.contextAggregation && options.contextAggregation.totalNotes > 0) {
        const aggregation = options.contextAggregation;
        lines.push(`- ${t("report.contextTitle", {n: aggregation.totalNotes})}`);
        for (const entry of aggregation.tokens) {
            lines.push(`  - ${t(`report.contextToken.${entry.token}`, {n: entry.count})}`);
        }
        if (!aggregation.sufficient) lines.push(`  - ${t("report.contextInsufficient")}`);
        /* T-1452 · R-20.2：情境×星期交叉——仅展示过半集中（样本达标）的模式，宁缺毋滥。 */
        if (aggregation.sufficient && options.contextWeekdayPatterns?.length) {
            for (const pattern of options.contextWeekdayPatterns.slice(0, 3)) {
                lines.push(`  - ${t("report.contextWeekday", {token: t(`report.contextToken.${pattern.token}`), count: pattern.count, total: pattern.total, weekday: weekdayName(pattern.weekday)})}`);
            }
        }
    }
    /* T-1343：报告可按事件来源筛选；筛选口径在标题下显式声明。 */
    if (options?.source && REPORT_SOURCES.has(options.source)) {
        lines.push(`- ${t("report.sourceLine", {source: t(`source.${options.source}`)})}`);
    }
    /* T-1425 · R-A8：显式回显统计范围（相对天数/全部、过滤器数、缺失条件、截断标记）
       ——用户能看懂报告覆盖了什么，不静默扩大或缩小范围。 */
    if (options?.viewScope) {
        const scope = options.viewScope;
        const parts = [t("report.scopeLabel"), scope.rangeToken === "relative-days" ? t("report.scopeRelativeDays", {n: scope.days ?? 0}) : t("report.scopeAll")];
        if (scope.filterCount) parts.push(t("report.scopeFilters", {n: scope.filterCount}));
        if (scope.missingCount) parts.push(t("report.scopeMissing", {n: scope.missingCount}));
        if (scope.truncated) parts.push(t("report.scopeTruncated"));
        lines.push(`- ${parts.join(" · ")}`);
    }
    /* T-1436 · R-20.3：失速项目行动卡——只列漏掉 ≥1 次的项目，附证据（漏卡次数/最近漏卡日）。 */
    if (options?.stalledItems?.length) {
        lines.push(`- ${t("report.stalledTitle")}`);
        for (const item of options.stalledItems) {
            lines.push(`  - ${t("report.stalledLine", {name: item.name, missed: item.missedCount, due: item.dueOpportunities, rate: item.backlogRate, last: item.lastMissedDate ?? ""})}`);
        }
        /* T-1461 · R-A13：双日规则——失速卡收尾固定为无罪化口径，断签不渲染惩罚语义。 */
        lines.push(`  - ${t("report.stalledNote")}`);
    }
    /* T-1435 · R-20.3 第二卡：容易漏卡的时间段——按星期与事项时段聚合漏卡分布。 */
    if (options?.missedByWeekday?.length) {
        lines.push(`- ${t("report.missedTimeTitle", {n: options.missedByWeekday.reduce((total, entry) => total + entry.count, 0)})}`);
        for (const entry of options.missedByWeekday) lines.push(`  - ${weekdayName(entry.weekday)}：${entry.count} 次`);
    }
    if (options?.missedByTimeSlot?.length) {
        for (const entry of options.missedByTimeSlot) lines.push(`  - ${entry.label}：${entry.count} 次`);
    }
    /* T-1450 · R-20.3 第三卡：目标负荷解读——「目标是否过高」，样本门槛下的推断与可选建议。 */
    if (options?.targetLoad?.length) {
        lines.push(`- ${t("report.targetLoadTitle")}`);
        for (const entry of options.targetLoad) {
            lines.push(`  - ${t(entry.verdict === "overloaded" ? "report.targetLoadOverloaded" : "report.targetLoadTight", {name: entry.name, missed: entry.missedCount, due: entry.dueOpportunities, rate: entry.backlogRate})}`);
        }
    }
    /* R-17.1 · R-A17：确定性相关性洞察——最小样本纪律（重叠 ≥4 天且 |r|≥0.4），相关不是因果。 */
    if (options?.correlationInsights?.length) {
        lines.push(`- ${t("report.correlationTitle")}`);
        for (const insight of options.correlationInsights.slice(0, 3)) {
            const text = insight.lag === 1
                ? t("report.correlationLag", {a: insight.itemA, b: insight.itemB, r: insight.r.toFixed(2), n: insight.sampleDays})
                : t("report.correlationSame", {a: insight.itemA, b: insight.itemB, r: insight.r.toFixed(2), n: insight.sampleDays});
            lines.push(`  - ${text}`);
        }
        lines.push(`  - ${t("report.correlationNote")}`);
    }
    if (sections.events) lines.push(`- ${t("report.lineEvents", {n: summary.totalEvents})}`);
    if (sections.completion) lines.push(`- ${t("report.lineCompleted", {done: summary.completedItems, scheduled: summary.scheduledItems, rate})}`);
    lines.push(`- ${t("report.lineRange", {start: summary.startDate, end: summary.endDate})}`);
    if (sections.baseline) {
        if (comparison) {
            lines.push(`- ${t("report.baselineLine", {
                start: comparison.baseline.startDate,
                end: comparison.baseline.endDate,
                events: signed(comparison.delta.totalEvents),
                completed: signed(comparison.delta.completedItems),
                scheduled: signed(comparison.delta.scheduledItems),
            })}`);
            /* T-1448 · R-20.3：调整有效性解读——基于完成数变化方向给出简明结论。 */
            const dc = comparison.delta.completedItems;
            const verdict = dc > 0 ? t("report.effectivenessImproving")
                : dc < 0 ? t("report.effectivenessDeclining")
                : t("report.effectivenessStable");
            lines.push(`- ${verdict}`);
        } else {
            lines.push(`- ${t("report.baselineMissingNote")}`);
        }
    }
    if (sections.deviations) {
        lines.push("");
        lines.push(`### ${t("report.devTitle")}`);
        if (!comparison) {
            lines.push(`- ${t("report.devInsufficient")}`);
        } else {
            const notes = buildReviewDeviationNotes(comparison);
            if (notes.length) {
                for (const note of notes) {
                    lines.push(`- ${note.kind === "improve"
                        ? t("report.devImprove", {name: note.name, delta: Math.abs(note.rateDelta)})
                        : t("report.devDecline", {name: note.name, delta: Math.abs(note.rateDelta)})}`);
                }
            } else {
                lines.push(`- ${t("report.devFlat")}`);
            }
        }
    }
    if (sections.items && summary.items.length) {
        lines.push("");
        lines.push(`| ${t("report.colItem")} | ${t("report.colCompleted")} | ${t("report.colRate")} |`);
        lines.push("| --- | --- | --- |");
        for (const item of summary.items) {
            lines.push(`| ${item.name} | ${item.completedDays}/${item.scheduledDays} ${t("report.dayUnit")} | ${item.completionRate}% |`);
        }
    }
    if (sections.highlights) {
        lines.push("");
        lines.push(`### ${t("report.highlightsTitle")}`);
        lines.push(...highlightLines(summary));
    }
    lines.push("");
    lines.push(`> ${t("report.footer")}`);
    return lines.join("\n");
}
