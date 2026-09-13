import {t} from "../i18n";
import {renderAnalysisDiff, summarizeAnalysisDiff} from "../agent-suggestions";

/* 新增 / 删除 / 保留数量通过 agent.diffSummary 双语文案渲染。 */
export function renderAnalysisDiffPanel(before: string, after: string): string {
    const summary = summarizeAnalysisDiff(before, after);
    const label = t("agent.diffSummary", summary);
    return `<section class="lc-agent-compare-panel" aria-label="${t("agent.compareAria")}"><p class="lc-agent-compare-summary">${label}</p>${renderAnalysisDiff(before, after)}</section>`;
}
