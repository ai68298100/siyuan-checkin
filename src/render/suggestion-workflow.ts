import {t} from "../i18n";
import {escapeHtml} from "../shared";
import {latestWorkflowAudit, workflowActions, workflowAuditSummary, workflowSummary, type SuggestionWorkflowState} from "../features/suggestion-workflow";

export function renderSuggestionWorkflowPanel(state: SuggestionWorkflowState): string {
    const summary = workflowSummary(state);
    const actionsState = workflowActions(state);
    const audits = workflowAuditSummary(state);
    const statusLabel = t(`agent.status${summary.status === "pending" ? "Pending" : summary.status === "confirmed" ? "Confirmed" : summary.status === "cancelled" ? "Cancelled" : "Failed"}`);
    const latestAudit = latestWorkflowAudit(state);
    const updatedAt = latestAudit?.at || state.envelope.createdAt;
    const visibleChanges = state.envelope.changes.slice(0, 8);
    const changeRows = visibleChanges.map((change) => `<li><code>${escapeHtml(String(change.field))}</code><span>${escapeHtml(String(change.before ?? t("agent.unset")))} → ${escapeHtml(String(change.after ?? t("agent.unset")))}</span></li>`).join("");
    const hiddenCount = Math.max(0, state.envelope.changes.length - visibleChanges.length);
    const actions = actionsState.canCancel
        ? `<button type="button" class="b3-button" data-suggestion-decision="confirm" ${actionsState.canConfirm ? "" : "disabled"} aria-label="${t("agent.confirmAria")}">${t("agent.confirm")}</button><button type="button" class="b3-button" data-suggestion-decision="cancel" aria-label="${t("agent.cancelAria")}">${t("agent.cancel")}</button>`
        : `<button type="button" class="b3-button" data-suggestion-undo ${actionsState.canUndo ? "" : "disabled"} aria-label="${t("agent.undoAria")}">${t("agent.undo")}</button>`;
    const hiddenNote = hiddenCount ? `<li class="lc-agent-suggestion-more" aria-label="${t("agent.moreChanges", {n: hiddenCount})}">${t("agent.moreChanges", {n: hiddenCount})}</li>` : "";
    return `<section class="lc-checkin__suggestion-workflow" data-suggestion-workflow="${escapeHtml(state.envelope.id)}" aria-label="${t("agent.workflowAria")}"><header><strong>${escapeHtml(state.envelope.title)}</strong><span class="is-${summary.status}" role="status" aria-live="polite" aria-label="${t("agent.workflowStatusAria", {status: statusLabel})}">${escapeHtml(statusLabel)}</span></header><p>${escapeHtml(state.envelope.reason || t("agent.noReason"))}</p><small>${t("agent.workflowAuditMeta", {consumed: summary.consumedTokens, audits: summary.audits, applied: audits.applied, rejected: audits.rejected})}</small><small class="lc-agent-suggestion-updated">${t("agent.workflowUpdatedAt", {date: escapeHtml(updatedAt)})}</small>${changeRows ? `<ul class="lc-agent-suggestion-changes">${changeRows}${hiddenNote}</ul>` : `<p class="lc-agent-suggestion-empty">${t("agent.noChanges")}</p>`}<footer aria-label="${t("agent.workflowActionsAria")}">${actions}</footer></section>`;
}
