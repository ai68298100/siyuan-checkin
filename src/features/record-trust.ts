/* T-1490 自动记录信任层——来源徽标与命中原因的只读投影（零运行时依赖、无时钟、确定性）。
   纪律（D-280 联动自动化三原则·失败可解释是硬验收）：
   - 只读消费现有 source/externalRef/note 字段，零 schema 变更，绝不反推写回；
   - 命中原因只在能从现有字段+当前绑定口径确证时派生（如「32 分钟 ≥ 阈值 30 分钟」），
     派生不了就缺省不显示——宁可少说，不编造解释；
   - 来源徽标复用既有 source.* 双语词汇；手动记录不算自动完成，无徽标无原因。 */

export interface RecordTrustEventInput {
    source: string;
    value: number;
    unit: string;
    externalRef?: string;
    note?: string;
}

/** 当前绑定口径：事件项目仍为对应联动的绑定项目时才提供（阈值取当前偏好）。 */
export interface RecordTrustContext {
    threshold?: {value: number};
}

export interface RecordTrustInfo {
    /** 来源 i18n 键（source.*）。 */
    sourceKey: string;
    /** 自动完成（source !== "manual"）才有徽标。 */
    auto: boolean;
    /** 命中原因 i18n 键；无法确证时缺省。 */
    reasonKey?: string;
    reasonParams?: Record<string, string | number>;
}

const TRUST_SOURCE_KEYS: Record<string, string> = {
    manual: "source.manual",
    tomato: "source.tomato",
    import: "source.import",
    api: "source.api",
    sireader: "source.sireader",
    siplayer: "source.siplayer",
    weread: "source.weread",
    yeguif: "source.yeguif",
};

/** 阈值结算来源：事件值达到当前阈值才解释（低于阈值说明口径已变，不再冒认）。 */
const THRESHOLD_SOURCES = new Set(["sireader", "siplayer", "weread"]);

function reasonFor(event: RecordTrustEventInput, context: RecordTrustContext): {reasonKey: string; reasonParams: Record<string, string | number>} | undefined {
    const ref = typeof event.externalRef === "string" ? event.externalRef : "";
    const value = Number.isFinite(event.value) ? event.value : undefined;
    if (ref.startsWith("weread:") && ref.includes(":finish:")) {
        const title = typeof event.note === "string" && event.note.trim() ? event.note.trim().slice(0, 60) : "";
        return title ? {reasonKey: "trust.reasonFinish", reasonParams: {title}} : undefined;
    }
    if (ref.startsWith("weread:") && ref.includes(":notes:") && value !== undefined) {
        return {reasonKey: "trust.reasonNotes", reasonParams: {value, unit: event.unit}};
    }
    if (ref.startsWith("health:") && value !== undefined) {
        return {reasonKey: "trust.reasonInbox", reasonParams: {value, unit: event.unit}};
    }
    if (event.source === "tomato" && value !== undefined) {
        return {reasonKey: "trust.reasonTomato", reasonParams: {value, unit: event.unit}};
    }
    if (event.source === "yeguif") {
        return {reasonKey: "trust.reasonYeguif", reasonParams: {}};
    }
    if (THRESHOLD_SOURCES.has(event.source) && context.threshold && value !== undefined
        && Number.isFinite(context.threshold.value) && value >= context.threshold.value) {
        return {reasonKey: "trust.reasonThreshold", reasonParams: {value, threshold: context.threshold.value, unit: event.unit}};
    }
    return undefined;
}

/** 从现有字段派生信任信息；手动记录返回 auto=false 且不带原因。 */
export function buildRecordTrust(event: RecordTrustEventInput, context: RecordTrustContext = {}): RecordTrustInfo {
    const sourceKey = TRUST_SOURCE_KEYS[event.source];
    if (!sourceKey) return {sourceKey: "source.api", auto: true};
    const auto = event.source !== "manual";
    const reason = auto ? reasonFor(event, context) : undefined;
    return {sourceKey, auto, ...(reason ? reason : {})};
}
