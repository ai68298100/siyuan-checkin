import {renderSuggestionChanges, summarizeSuggestionImpact, type AgentSuggestionChange} from "../agent-suggestions";
import {escapeHtml} from "../shared";
import {t} from "../i18n";

export function renderAgentPreviewContent(itemName = "", rate = "", changes: readonly AgentSuggestionChange[] = []): string {
    const focus = itemName ? "<p>" + t("agent.previewFocus", {name: escapeHtml(itemName), rate: escapeHtml(rate)}) + "</p>" : "<p>" + t("agent.previewNoFocus") + "</p>";
    return "<div class=\"lc-checkin__agent-preview\"><strong>" + t("agent.previewReference") + "</strong>" + focus + "<p class=\"lc-agent-suggestion-impact\">" + summarizeSuggestionImpact(changes) + "</p>" + renderSuggestionChanges(changes) + "<p>" + t("agent.previewNoAutoApply") + "</p></div>";
}
