/* T-1486 联动预接线模板：模板 → 联动建议的纯函数面（benchmark 二十一·B/C 路，D-280）。
   纪律：
   - 建议不等于启用：卡片只产生「保存后生效」的显式计划（linkagePlan），确认前不写任何联动配置，
     保存失败/放弃均零副作用；真正写入走既有偏好通道（health-inbox / sireaderIntegration）。
   - 健康收件箱为按项目映射（多项目可同挂一指标，各自独立幂等身份）；思阅为全局单项目映射，
     改绑必须显式呈现现有绑定（conflictNames 非空时渲染警示文案）。
   - 问卷日记建议只聚焦既有绑定控件（不自动挑选预设），无可选预设时降级提示。
   本模块零依赖、无时钟、确定性输出；i18n 键由渲染层按 kind 拼装。 */

export type TemplateLinkageKind = "health-steps" | "health-weight" | "sireader" | "journal";

/** zh 模板名锚点（与 catalog TEMPLATE_NAME_KEYS 同源）：模板应用时按名解析联动亲和。 */
const TEMPLATE_LINKAGE_AFFINITY: Readonly<Record<string, TemplateLinkageKind>> = {
    "步数": "health-steps",
    "体重": "health-weight",
    "阅读": "sireader",
    "问卷日记": "journal",
};

export function templateLinkageForName(name: unknown): TemplateLinkageKind | undefined {
    if (typeof name !== "string") return undefined;
    return TEMPLATE_LINKAGE_AFFINITY[name.trim()];
}

/** 编辑器渲染建议卡片所需的当前绑定状态（宿主从偏好投影为显示名；缺省字段按空处理）。 */
export interface LinkageBindingState {
    /** 健康收件箱 steps 指标已绑定的项目显示名（按项目映射，可多个）。 */
    healthStepItemNames: readonly string[];
    /** 健康收件箱 weight 指标已绑定的项目显示名。 */
    healthWeightItemNames: readonly string[];
    /** 思阅当前绑定的项目显示名（单项目映射；空=未绑定）。 */
    sireaderItemName: string;
    /** 可选问卷预设数量（0 = 无预设，问卷建议降级提示）。 */
    journalPresetCount: number;
}

export const EMPTY_LINKAGE_BINDING_STATE: LinkageBindingState = {
    healthStepItemNames: [],
    healthWeightItemNames: [],
    sireaderItemName: "",
    journalPresetCount: 0,
};

export interface TemplateLinkageCard {
    kind: TemplateLinkageKind;
    /** actionable=true：确认后产生保存后生效的绑定计划；false：仅聚焦既有控件（问卷日记）。 */
    actionable: boolean;
    /** 改绑警示：现有绑定显示名（思阅单项目映射改绑时非空）。 */
    conflictNames: readonly string[];
    /** 展示性关联项目：健康指标已挂载的项目名（说明多映射语义，不阻断）。 */
    relatedNames: readonly string[];
    /** 不可行动原因：问卷无预设时 "empty"；其余 undefined。 */
    unavailableReason: "empty" | undefined;
}

export function buildTemplateLinkageCard(kind: TemplateLinkageKind, state: LinkageBindingState): TemplateLinkageCard {
    if (kind === "health-steps" || kind === "health-weight") {
        const relatedNames = kind === "health-steps" ? state.healthStepItemNames : state.healthWeightItemNames;
        return {kind, actionable: true, conflictNames: [], relatedNames, unavailableReason: undefined};
    }
    if (kind === "sireader") {
        return {kind, actionable: true, conflictNames: state.sireaderItemName ? [state.sireaderItemName] : [], relatedNames: [], unavailableReason: undefined};
    }
    return {kind: "journal", actionable: false, conflictNames: [], relatedNames: [], unavailableReason: state.journalPresetCount > 0 ? undefined : "empty"};
}

/** 渲染层 i18n 键拼装（键名稳定，供守门断言双语成对）。 */
export function templateLinkageI18nKey(kind: TemplateLinkageKind, part: "title" | "hint" | "action" | "planned" | "conflict"): string {
    const kindKey = kind === "health-steps" ? "healthSteps" : kind === "health-weight" ? "healthWeight" : kind;
    return `linkage.${kindKey}.${part}`;
}

/** 计划值白名单：表单隐藏字段按此校验（fail-closed，未知值忽略）；问卷日记仅聚焦控件，永不入计划。 */
export type TemplateLinkagePlan = "health-steps" | "health-weight" | "sireader";
export function isTemplateLinkagePlan(value: unknown): value is TemplateLinkagePlan {
    return value === "health-steps" || value === "health-weight" || value === "sireader";
}
