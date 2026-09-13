import {t} from "../i18n";
import {renderAnalysisDiff, summarizeAnalysisDiff} from "../agent-suggestions";

export function renderAnalysisDiffPanel(before: string, after: string): string {
    const summary = summarizeAnalysisDiff(before, after);
    const label = `新增 ${summary.added} · 删除 ${summary.removed} · 保留 ${summary.unchanged}`;
    return `<section class="lc-agent-compare-panel" aria-label="${t("agent.compareAria")}"><p class="lc-agent-compare-summary">${label}</p>${renderAnalysisDiff(before, after)}</section>`;
}
