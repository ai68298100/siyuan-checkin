/* T-1510 单条记录事实详情——只读投影（零运行时依赖、无时钟、确定性）。
   纪律（承接 D-280/D-284：宁可少说，不编造解释）：
   - 详情只回答「这条记录是什么」：记录日期/时间、实际数值单位、来源计量方式、
     生效修订与归属项目；敏感外部身份（externalRef）一律不进入投影；
   - 计量方式只在能从登记前缀/来源确证时派生，证据不足如实标未知；
   - 生效修订取事件记录日期的修订历史；项目已删除或修订缺失标未知，
     绝不用当前配置反推历史；
   - 纯展示零写入：展开/收起不触碰事件存储。 */

export interface RecordDetailsEventInput {
    id: string;
    itemId: string;
    occurredAt: string;
    localDate: string;
    value: number;
    unit: string;
    kind?: "checkin" | "skip";
    source: string;
    externalRef?: string;
}

export interface RecordDetailsRevisionInput {
    effectiveDate: string;
    kind: string;
    target: number;
    unit: string;
}

export interface RecordDetailsContext {
    /** 事件记录日期生效的修订；项目已删除或历史缺失时缺省 → 未知。 */
    revision?: RecordDetailsRevisionInput;
    /** 归属项目存在时提供名称；已删除/不存在时缺省 → 未知。 */
    itemName?: string;
}

export interface RecordDetailRow {
    /** i18n 键（review.detailsRow.*）。 */
    labelKey: string;
    /** i18n 键（review.detailsValue.*）或普通文本；文本需转义后渲染。 */
    text: string;
    /** 文本是 i18n 键（需要 t() 插值渲染）；缺省为已定文本。 */
    isKey?: boolean;
    params?: Record<string, string | number>;
    /** 缺证据如实未知（渲染为弱化态，不冒充事实）。 */
    unknown?: boolean;
}

export interface RecordDetailsProjection {
    rows: RecordDetailRow[];
}

/** 登记前缀/来源 → 计量方式 i18n 键。只列可确证的组合；api 未知前缀不猜。 */
const METERING_RULES: ReadonlyArray<{matches: (event: RecordDetailsEventInput) => boolean; meteringKey: string}> = [
    {matches: (e) => e.source === "weread" && Boolean(e.externalRef?.includes(":finish:")), meteringKey: "review.detailsMetering.wereadFinish"},
    {matches: (e) => e.source === "weread" && Boolean(e.externalRef?.includes(":notes:")), meteringKey: "review.detailsMetering.wereadNotes"},
    {matches: (e) => e.source === "weread", meteringKey: "review.detailsMetering.wereadDaily"},
    {matches: (e) => Boolean(e.externalRef?.startsWith("health:") && e.externalRef.includes(":steps:")), meteringKey: "review.detailsMetering.healthSteps"},
    {matches: (e) => Boolean(e.externalRef?.startsWith("health:") && e.externalRef.includes(":weight:")), meteringKey: "review.detailsMetering.healthWeight"},
    {matches: (e) => Boolean(e.externalRef?.startsWith("notequery:")), meteringKey: "review.detailsMetering.noteQuery"},
    {matches: (e) => Boolean(e.externalRef?.startsWith("taskhorizon:")), meteringKey: "review.detailsMetering.taskHorizon"},
    {matches: (e) => e.source === "sireader", meteringKey: "review.detailsMetering.focusSegment"},
    {matches: (e) => e.source === "siplayer", meteringKey: "review.detailsMetering.playbackSegment"},
    {matches: (e) => e.source === "yeguif", meteringKey: "review.detailsMetering.lifeLog"},
    {matches: (e) => e.source === "tomato", meteringKey: "review.detailsMetering.focusSession"},
    {matches: (e) => e.source === "import", meteringKey: "review.detailsMetering.import"},
    {matches: (e) => e.source === "manual", meteringKey: "review.detailsMetering.manual"},
];

const UNKNOWN_TEXT_KEY = "review.detailsValue.unknown";

function meteringKeyFor(event: RecordDetailsEventInput): string {
    for (const rule of METERING_RULES) {
        if (rule.matches(event)) return rule.meteringKey;
    }
    /* api 且无登记前缀：写入管道可证（接口写入），具体计量方式证据不足 → 未知。 */
    return UNKNOWN_TEXT_KEY;
}

function validIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 单条记录事实详情投影：行序固定（日期→时间→数值→计量→修订→归属），确定性输出。 */
export function buildRecordDetails(event: RecordDetailsEventInput, context: RecordDetailsContext = {}): RecordDetailsProjection {
    const rows: RecordDetailRow[] = [];
    rows.push({labelKey: "review.detailsRow.date", text: validIsoDate(event.localDate) ? event.localDate : UNKNOWN_TEXT_KEY, isKey: !validIsoDate(event.localDate), unknown: !validIsoDate(event.localDate)});
    const occurred = typeof event.occurredAt === "string" && event.occurredAt && Number.isFinite(Date.parse(event.occurredAt)) ? new Date(event.occurredAt).toISOString() : undefined;
    rows.push({labelKey: "review.detailsRow.time", text: occurred || UNKNOWN_TEXT_KEY, isKey: !occurred, unknown: !occurred});
    if (event.kind === "skip") {
        rows.push({labelKey: "review.detailsRow.value", text: "review.detailsValue.skip", isKey: true});
    } else {
        const value = Number.isFinite(event.value) && event.value >= 0 ? event.value : undefined;
        const unit = typeof event.unit === "string" && event.unit ? event.unit : "";
        rows.push(value !== undefined && unit
            ? {labelKey: "review.detailsRow.value", text: `${value} ${unit}`}
            : {labelKey: "review.detailsRow.value", text: UNKNOWN_TEXT_KEY, isKey: true, unknown: true});
    }
    const meteringKey = meteringKeyFor(event);
    rows.push(meteringKey === UNKNOWN_TEXT_KEY
        ? {labelKey: "review.detailsRow.metering", text: UNKNOWN_TEXT_KEY, isKey: true, unknown: true}
        : {labelKey: "review.detailsRow.metering", text: meteringKey, isKey: true});
    const revision = context.revision;
    const revisionValid = revision && validIsoDate(revision.effectiveDate) && Number.isFinite(revision.target) && typeof revision.unit === "string" && Boolean(revision.unit);
    rows.push(revisionValid
        ? {labelKey: "review.detailsRow.revision", text: "review.detailsValue.revision", isKey: true, params: {target: revision!.target, unit: revision!.unit, since: revision!.effectiveDate}}
        : {labelKey: "review.detailsRow.revision", text: UNKNOWN_TEXT_KEY, isKey: true, unknown: true});
    rows.push(context.itemName
        ? {labelKey: "review.detailsRow.attribution", text: context.itemName}
        : {labelKey: "review.detailsRow.attribution", text: "review.detailsValue.itemGone", isKey: true, unknown: true});
    return {rows};
}
