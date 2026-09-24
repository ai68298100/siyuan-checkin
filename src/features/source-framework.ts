/* T-1383 外部来源统筹框架——冻结契约（D-258，docs/external-source-framework-2026-09.md §七）。
   五段管道中的「登记层（描述符）+ 结算层（片段→当日汇总）+ 治理层（配置）」纯函数面；
   接入层由各来源适配器实现（T-1384 思阅为首个租户），身份层复用既有
   `prefix:identity:date` externalRef 注册表（ecosystem.ts），不立第二套。
   纪律：
   - 全部纯函数、无 IO、无时钟读取——结算结果可离线回放，日期一律 localDate 字符串；
   - 跨日切分是接入层的责任：适配器产出的片段必须已按 localDate 归属，一段一日；
     结算层不做时间窗口拆分（来源语义各异，拆分口径归适配器并各自测试）；
   - 非法输入 fail-closed 计数，不抛异常、不静默丢弃计数为零的批次；
   - 每日一次封顶与阈值只作用于「资格判定与计数」，永不改写历史事件。 */

/** 来源接入渠道（五类，与框架文档 §二一致；T-1402 落地新增 official-pull=出站拉取官方 API）。 */
export type SourceChannel = "plugin-event" | "import-file" | "api-push" | "manual" | "official-pull";

/** 来源生命周期：planned=仅登记；experimental=实验/仅观察（fallback 纪律，D-255）；stable=上游契约+真机验收齐备；disabled=停用。 */
export type SourceStatus = "planned" | "experimental" | "stable" | "disabled";

export interface SourceDescriptor {
    /** 来源键，亦为 externalRef 前缀（如 sireader）。写入事件前必须在 ecosystem 前缀注册表登记。 */
    key: string;
    name: string;
    channel: SourceChannel;
    privacy: "local-only" | "reads-shared-doc";
    status: SourceStatus;
    /** 来源声明的能力面（如 ["reading-lifecycle"]）；消费方按能力协商降级。 */
    capabilities: string[];
}

export interface SourceGovernanceConfig {
    /** 治理默认关：自动写入必须用户显式开启（opt-in 纪律）。 */
    enabled: boolean;
    /** 资格阈值：当日 countedValue ≥ thresholdValue 才算达标（0=任何非零记录即达标）。 */
    thresholdValue: number;
    /** 每日封顶：countedValue 上限（0=不封顶）。封顶不改写片段，只约束计入。 */
    dailyCapValue: number;
    /** 映射的目标项目（1~16 个；写入层仍需用户确认目标）。 */
    itemIds: string[];
}

export interface SourceSegment {
    /** 来源内稳定身份；与已结算身份重复的片段不会二次计入（幂等）。 */
    externalRef: string;
    /** 归属本地日期（YYYY-MM-DD）；跨日由接入层预切分。 */
    localDate: string;
    /** 非负消耗量（来源单位）。 */
    value: number;
}

export interface SettledDay {
    localDate: string;
    /** 原始合计（封顶前）。 */
    rawValue: number;
    /** 封顶后计入值。 */
    countedValue: number;
    /** countedValue ≥ thresholdValue。 */
    qualifies: boolean;
    segmentCount: number;
}

export interface SettlementResult {
    /** 按 localDate 升序。 */
    days: SettledDay[];
    /** 本批实际计入的片段身份（去重后，稳定顺序）。 */
    appliedRefs: string[];
    /** 与 alreadyCountedRefs 或批内重复冲突的身份（幂等跳过）。 */
    duplicateRefs: string[];
    invalidSegmentCount: number;
}

/** 结算批上限：单次调用最多处理的片段数（超出整批拒绝并计数）。 */
export const SOURCE_FRAMEWORK_LIMITS = Object.freeze({
    maxSegments: 5000,
    maxRefLength: 512,
    maxItems: 16,
}) as Readonly<{maxSegments: number; maxItems: number; maxRefLength: number}>;

/** T-1386 治理可观测性：某来源当日已写入的分钟合计（0 = 尚未写入）。
    供设置页「今日累计」预览与外部来源状态展示；纯函数、O(events) 单遍扫描。 */
export function sourceDayMinutes(store: Pick<import("../types").CheckinStore, "events">, source: string, itemId: string, localDate: string): number {
    let total = 0;
    for (const event of store.events) {
        if (event.source === source && event.itemId === itemId && event.localDate === localDate) total += event.value;
    }
    return total;
}

const SOURCE_KEY_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const SOURCE_CHANNELS = new Set<SourceChannel>(["plugin-event", "import-file", "api-push", "manual", "official-pull"]);
const SOURCE_STATUSES = new Set<SourceStatus>(["planned", "experimental", "stable", "disabled"]);

/** 描述符归一：key 即未来 externalRef 前缀，必须通过前缀级校验。非法返回 undefined。 */
export function normalizeSourceDescriptor(value: unknown): SourceDescriptor | undefined {
    if (!value || typeof value !== "object") return undefined;
    const source = value as Record<string, unknown>;
    const key = typeof source.key === "string" && SOURCE_KEY_PATTERN.test(source.key) ? source.key : "";
    const name = typeof source.name === "string" ? source.name.trim().slice(0, 64) : "";
    const channel = typeof source.channel === "string" && SOURCE_CHANNELS.has(source.channel as SourceChannel) ? source.channel as SourceChannel : undefined;
    if (!key || !name || !channel) return undefined;
    const status = typeof source.status === "string" && SOURCE_STATUSES.has(source.status as SourceStatus) ? source.status as SourceStatus : "planned";
    const privacy = source.privacy === "reads-shared-doc" ? "reads-shared-doc" as const : "local-only" as const;
    const capabilities = Array.isArray(source.capabilities)
        ? [...new Set(source.capabilities.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim().slice(0, 64)))].slice(0, 16)
        : [];
    return {key, name, channel, status, privacy, capabilities};
}

/** 治理配置归一：默认关；阈值/封顶非负有限；项目映射去重封顶 16。 */
export function normalizeSourceGovernance(value: unknown): SourceGovernanceConfig {
    const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const nonNegative = (input: unknown) => {
        const parsed = Number(input);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    };
    const itemIds = Array.isArray(source.itemIds)
        ? [...new Set(source.itemIds.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()))].slice(0, SOURCE_FRAMEWORK_LIMITS.maxItems)
        : [];
    return {
        enabled: source.enabled === true,
        thresholdValue: nonNegative(source.thresholdValue),
        dailyCapValue: nonNegative(source.dailyCapValue),
        itemIds,
    };
}

function isValidSegment(value: unknown): value is SourceSegment {
    if (!value || typeof value !== "object") return false;
    const segment = value as Record<string, unknown>;
    return typeof segment.externalRef === "string"
        && segment.externalRef.length > 0
        && segment.externalRef.length <= SOURCE_FRAMEWORK_LIMITS.maxRefLength
        && typeof segment.localDate === "string"
        && DATE_PATTERN.test(segment.localDate)
        && typeof segment.value === "number"
        && Number.isFinite(segment.value)
        && segment.value >= 0;
}

/**
 * 片段 → 当日汇总（结算层单一路径）。
 * 幂等：externalRef 已出现在 alreadyCountedRefs（历史已写入身份）或批内重复时只计一次；
 * 判定：countedValue = min(rawValue, cap)（cap=0 视为不封顶），qualifies = countedValue ≥ threshold；
 * 确定性：days 按 localDate 升序、appliedRefs 按片段首次出现顺序。
 */
export function settleSegmentsToDays(
    segments: readonly unknown[],
    config: SourceGovernanceConfig,
    alreadyCountedRefs: readonly string[] = [],
): SettlementResult {
    if (!Array.isArray(segments) || segments.length > SOURCE_FRAMEWORK_LIMITS.maxSegments) {
        return {days: [], appliedRefs: [], duplicateRefs: [], invalidSegmentCount: Array.isArray(segments) ? segments.length : 0};
    }
    const seen = new Set(alreadyCountedRefs);
    const duplicates: string[] = [];
    const appliedRefs: string[] = [];
    const byDay = new Map<string, {rawValue: number; segmentCount: number}>();
    let invalidSegmentCount = 0;
    for (const candidate of segments) {
        if (!isValidSegment(candidate)) {
            invalidSegmentCount += 1;
            continue;
        }
        if (seen.has(candidate.externalRef)) {
            duplicates.push(candidate.externalRef);
            continue;
        }
        seen.add(candidate.externalRef);
        appliedRefs.push(candidate.externalRef);
        const bucket = byDay.get(candidate.localDate) || {rawValue: 0, segmentCount: 0};
        bucket.rawValue += candidate.value;
        bucket.segmentCount += 1;
        byDay.set(candidate.localDate, bucket);
    }
    const days = [...byDay.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([localDate, bucket]) => {
            const countedValue = config.dailyCapValue > 0 ? Math.min(bucket.rawValue, config.dailyCapValue) : bucket.rawValue;
            return {
                localDate,
                rawValue: bucket.rawValue,
                countedValue,
                qualifies: countedValue >= config.thresholdValue && countedValue > 0,
                segmentCount: bucket.segmentCount,
            };
        });
    return {days, appliedRefs, duplicateRefs: duplicates, invalidSegmentCount};
}
