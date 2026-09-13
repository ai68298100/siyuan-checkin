import {renderSuggestionChanges, summarizeSuggestionImpact, type AgentSuggestionChange} from "../agent-suggestions";
import {escapeHtml} from "../shared";

export function renderAgentPreviewContent(itemName = "", rate = "", changes: readonly AgentSuggestionChange[] = []): string {
    const focus = itemName ? `<p>关注项目：<b>${escapeHtml(itemName)}</b> · 当前完成率 ${escapeHtml(rate)}%</p>` : "<p>当前没有明显薄弱项目。</p>";
    return `<div class="lc-checkin__agent-preview"><strong>当前建议仅供参考</strong>${focus}<p class="lc-agent-suggestion-impact">${summarizeSuggestionImpact(changes)}</p>${renderSuggestionChanges(changes)}<p>建议不会自动修改项目或打卡记录。任何变更都需要你确认后执行。</p></div>`;
}
