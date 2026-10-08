/* T-1736（D-372）：推荐草案预览渲染——纯投影（t/escapeHtml 经参数注入，
   避免拉 i18n 渲染链；调用方传 i18n 域的 t 与 shared.escapeHtml）。 */
import type {CheckinItem} from "../types";

export interface WereadDraftShape {
    enabled: boolean;
    itemId: string;
    thresholdMinutes: number;
}

export interface RecommendationDraftCandidate {
    key: string;
    target: string;
    value: string | number;
    evidence: string;
    reason: string;
    needsChoice?: boolean;
    choiceCount?: number;
}

export interface RecommendationDraftRec {
    candidates: RecommendationDraftCandidate[];
}

export interface RecommendationRenderDeps {
    t: (key: string, params?: Record<string, string | number>) => string;
    escapeHtml: (value: string) => string;
}

export function renderWereadRecommendations(
    items: readonly CheckinItem[],
    weread: WereadDraftShape,
    durationRec: RecommendationDraftRec,
    thresholdRec: RecommendationDraftRec,
    deps: RecommendationRenderDeps,
): string {
    const {t, escapeHtml} = deps;
    const rows: string[] = [];
    const durationCandidate = durationRec.candidates.find((candidate) => candidate.key === "weread.duration" && !candidate.needsChoice);
    const needsChoiceCandidate = durationRec.candidates.find((candidate) => candidate.needsChoice === true);
    if (needsChoiceCandidate) {
        rows.push(`<div class="lc-checkin__rec-row"><span class="lc-checkin__rec-label">${t("set.recDurationItem")}</span><span class="lc-checkin__rec-value">${escapeHtml(t("set.recNeedsChoice", {n: needsChoiceCandidate.choiceCount || 0}))}</span></div>`);
    } else if (durationCandidate) {
        const recommended = items.find((item) => item.id === durationCandidate.value);
        rows.push(`<div class="lc-checkin__rec-row"><span class="lc-checkin__rec-label">${t("set.recDurationItem")}</span><span class="lc-checkin__rec-value">${escapeHtml(recommended?.name || String(durationCandidate.value))}<button class="lc-checkin__small-button" type="button" data-rec-apply="wereadIntegration.itemId" data-rec-value="${escapeHtml(String(durationCandidate.value))}">${t("set.recApply")}</button></span></div>`);
    }
    const thresholdCandidate = thresholdRec.candidates.find((candidate) => candidate.key === "weread.threshold");
    if (thresholdCandidate && weread.thresholdMinutes !== thresholdCandidate.value) {
        rows.push(`<div class="lc-checkin__rec-row"><span class="lc-checkin__rec-label">${t("set.recThreshold")}</span><span class="lc-checkin__rec-value">${escapeHtml(t("set.wereadThresholdValue", {n: Number(thresholdCandidate.value)}))}</span><button class="lc-checkin__small-button" type="button" data-rec-apply="wereadIntegration.thresholdMinutes" data-rec-value="${escapeHtml(String(thresholdCandidate.value))}">${t("set.recApply")}</button></div>`);
    }
    if (!rows.length) return "";
    return `<div class="lc-checkin__rec-block" data-recommendations><div class="lc-checkin__rec-head">${t("set.recBlockTitle")}</div>${rows.join("")}</div>`;
}
