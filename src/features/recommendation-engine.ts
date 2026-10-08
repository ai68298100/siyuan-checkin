/* T-1735 首切片（D-371）：本地确定性推荐规则引擎——纯函数核心。
   纪律（沿 template-linkage「建议不等于启用」）：
   - 建议是纯投影，零写入、不启动监听、不改任何既有配置；
   - 每条建议携带推荐值、理由、证据来源与前置条件；证据不足或多项候选时如实
     needs-choice / no-candidate，不猜 Key、文档、来源映射或私人作息；
   - 已启用/已配置的来源不重复推荐（无建议也是结论）；
   - RECOMMENDATION_VERSION 版本化：规则调整时输出可追溯。
   首批规则限定阅读时长映射（写入侧已按分钟校验，D-366 候选同纪律）；
   健康映射/视图偏好等后续切片沿用同一建议形状扩展。 */
import {wereadCandidates, type WereadMetric} from "./weread-candidates";
import type {CheckinItem} from "../types";

export const RECOMMENDATION_VERSION = 1;

export type RecommendationEvidence = "unique-minute-unit" | "general-default" | "existing-config";

export interface RecommendationCandidate {
    /** 稳定建议键（来源+目标字段），版本升级时可追溯。 */
    key: string;
    /** 建议写入的偏好字段路径。 */
    target: string;
    value: string | number;
    /** 证据来源（人类可读的判定依据由渲染层按 evidence 键 i18n）。 */
    evidence: RecommendationEvidence;
    reason: string;
    /** 前置条件未满足时给出 no-candidate 说明而非推荐。 */
    preconditionMet: boolean;
    preconditionHint?: string;
    /** 多候选冲突：需用户选择，引擎不猜。 */
    needsChoice?: true;
    choiceCount?: number;
}

export interface RecommendationBatch {
    version: number;
    candidates: RecommendationCandidate[];
    /** 明确"无建议"的结论（已配置/证据不足），非静默空。 */
    noRecommendation?: {target: string; reasonKey: string};
}

export interface WereadRecommendationInput {
    wereadIntegration: {enabled: boolean; itemId: string; thresholdMinutes: number; apiKey: string};
    items: readonly CheckinItem[];
}

const MINUTE_UNIT = "分钟";
const GENERAL_DEFAULT_THRESHOLD = 30;

/** 阅读时长映射推荐：唯一分钟单位活跃项目 → 推荐绑定；多项 → 需人工选择；
    无 → 无建议；已启用 → 不重复推荐。阈值建议恒为通用默认 30（如实标注非个性化）。 */
export function recommendWereadDuration(input: WereadRecommendationInput): RecommendationBatch {
    const {wereadIntegration, items} = input;
    if (wereadIntegration.enabled && wereadIntegration.itemId) {
        return {version: RECOMMENDATION_VERSION, candidates: [], noRecommendation: {target: "weread.duration", reasonKey: "rec.alreadyConfigured"}};
    }
    const {items: minuteItems} = wereadCandidates(items, wereadIntegration.itemId, MINUTE_UNIT as WereadMetric);
    if (!minuteItems.length) {
        return {version: RECOMMENDATION_VERSION, candidates: [], noRecommendation: {target: "weread.duration", reasonKey: "rec.noMinuteItem"}};
    }
    if (minuteItems.length > 1) {
        return {
            version: RECOMMENDATION_VERSION,
            candidates: [{
                key: "weread.duration",
                target: "wereadIntegration.itemId",
                value: "",
                evidence: "existing-config",
                reason: "rec.multipleMinuteItems",
                preconditionMet: true,
                needsChoice: true,
                choiceCount: minuteItems.length,
            }],
        };
    }
    const only = minuteItems[0];
    return {
        version: RECOMMENDATION_VERSION,
        candidates: [{
            key: "weread.duration",
            target: "wereadIntegration.itemId",
            value: only.id,
            evidence: "unique-minute-unit",
            reason: "rec.uniqueMinuteItem",
            preconditionMet: true,
        }],
    };
}

/** 阈值推荐：恒为通用默认 30 分钟，evidence 如实标注 general-default（非个性化）。 */
export function recommendWereadThreshold(): RecommendationBatch {
    return {
        version: RECOMMENDATION_VERSION,
        candidates: [{
            key: "weread.threshold",
            target: "wereadIntegration.thresholdMinutes",
            value: GENERAL_DEFAULT_THRESHOLD,
            evidence: "general-default",
            reason: "rec.generalThreshold",
            preconditionMet: true,
        }],
    };
}
