import {t} from "../i18n";
import {escapeHtml} from "../shared";
import {canUndoSuggestion, workflowAuditSummary, workflowSummary, type SuggestionWorkflowState} from "../features/suggestion-workflow";

export function renderSuggestionWorkflowPanel(state: SuggestionWorkflowState): string {
    const summary = workflowSummary(state);
    const audits = workflowAuditSummary(state);
    const statusLabel = t(`agent.status${summary.status === "pending" ? "Pending" : summary.status === "confirmed" ? "Confirmed" : summary.status === "cancelled" ? "Cancelled" : "Failed"}`);
    const changeRows = state.envelope.changes.slice(0, 8).map((change) => `<li><code>${escapeHtml(String(change.field))}</code><span>${escapeHtml(String(change.before ?? t("agent.unset")))} → ${escapeHtml(String(change.after ?? t("agent.unset")))}</span></li>`).join("");
    const actions = summary.status === "pending"
        ? `<button type="button" class="b3-button" data-suggestion-decision="confirm" aria-label="${t("agent.confirmAria")}">${t("agent.confirm")}</button><button type="button" class="b3-button" data-suggestion-decision="cancel" aria-label="${t("agent.cancelAria")}">${t("agent.cancel")}</button>`
        : `<button type="button" class="b3-button" data-suggestion-undo ${canUndoSuggestion(state) ? "" : "disabled"} aria-label="${t("agent.undoAria")}">${t("agent.undo")}</button>`;
    return `<section class="lc-checkin__suggestion-workflow" data-suggestion-workflow="${escapeHtml(state.envelope.id)}" aria-label="${t("agent.workflowAria")}"><header><strong>${escapeHtml(state.envelope.title)}</strong><span class="is-${summary.status}">${escapeHtml(statusLabel)}</span></header><p>${escapeHtml(state.envelope.reason || t("agent.noReason"))}</p><small>${t("agent.workflowAuditMeta", {consumed: summary.consumedTokens, audits: summary.audits, applied: audits.applied, rejected: audits.rejected})}</small>${changeRows ? `<ul class="lc-agent-suggestion-changes">${changeRows}</ul>` : `<p class="lc-agent-suggestion-empty">${t("agent.noChanges")}</p>`}<footer>${actions}</footer></section>`;
}
