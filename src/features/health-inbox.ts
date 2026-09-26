/* T-1403 健康数据收件箱（D-262）——C 类外部 push 的中转管道纯核心。
   架构事实：快捷指令只能 HTTP 到思源内核，无法触达插件渲染进程的 recordEvent；
   因此交付形态是「收件箱文档中转」：快捷指令经内核公开 appendBlock 把一行
   「health:指标:日期 数值」追加到用户绑定的收件箱文档，
   插件按有界周期轮询该文档、解析行、按 externalRef 幂等入库（source "api"）。
   纪律：
   - 只解析严格匹配的行，坏行忽略不报错（fail-closed）；
   - 幂等：同 metric+日期 已存在（source api + externalRef）即跳过，同日重复 push
     或多窗口轮询都收敛为一条；首次入库后同日修正值不再覆盖（更正走历史删除）；
   - 行保留在收件箱文档中，插件不改写用户文档；解析无状态、确定性，可回放。 */

import {validateAnchorBlockId} from "./note-anchor";
import {isValidDateKey} from "../date-keys";

export type HealthInboxMetric = "steps" | "weight";

export const HEALTH_INBOX_METRICS: readonly HealthInboxMetric[] = ["steps", "weight"];

/** 轮询周期（毫秒）：收件箱按有界间隔轮询，保存设置后立即摄取一次。 */
export const HEALTH_INGEST_INTERVAL_MS = 300_000;
/** 单次摄取最多解析的行数（有界）。 */
export const HEALTH_INBOX_MAX_ROWS = 500;

export interface HealthInboxEntry {
    metric: HealthInboxMetric;
    localDate: string;
    value: number;
    externalRef: string;
}

/** 写入身份四段式：health / 项目 / 指标 / 日期（身份含 itemId，同日换绑项目不互相顶账）。 */
export function buildHealthExternalRef(itemId: string, metric: HealthInboxMetric, localDate: string): string {
    const safeItem = typeof itemId === "string" ? itemId.trim().slice(0, 160) : "";
    return safeItem && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(localDate) ? `health:${safeItem}:${metric}:${localDate}` : "";
}

/** 严格行格式：health:steps:YYYY-MM-DD 数值 或 health:weight:YYYY-MM-DD 数值。 */
const LINE_PATTERN = /^health:(steps|weight):([0-9]{4}-[0-9]{2}-[0-9]{2})[ \t]+([0-9]+(?:\.[0-9]+)?)$/;

/** 解析一行收件箱内容；非严格匹配返回 undefined。 */
export function parseHealthInboxLine(content: unknown): Omit<HealthInboxEntry, "externalRef"> | undefined {
    if (typeof content !== "string") return undefined;
    const match = content.trim().match(LINE_PATTERN);
    if (!match) return undefined;
    const metric = match[1] as HealthInboxMetric;
    const localDate = match[2];
    const value = Number(match[3]);
    if (!isValidDateKey(localDate) || !Number.isFinite(value) || value < 0) return undefined;
    return {metric, localDate, value};
}

export interface HealthInboxRow {
    content?: string;
}

/** 从内核 SQL 行中解析全部合法条目（按 metric+日期 去重取首条）。 */
export function parseHealthInboxRows(rows: readonly HealthInboxRow[]): Array<Omit<HealthInboxEntry, "externalRef">> {
    if (!Array.isArray(rows)) return [];
    const seen = new Set<string>();
    const entries: Array<Omit<HealthInboxEntry, "externalRef">> = [];
    for (const row of rows.slice(0, HEALTH_INBOX_MAX_ROWS)) {
        const entry = parseHealthInboxLine(row?.content);
        if (!entry || seen.has(`${entry.metric}:${entry.localDate}`)) continue;
        seen.add(`${entry.metric}:${entry.localDate}`);
        entries.push(entry);
    }
    return entries;
}

export interface HealthMetricBinding {
    metric: HealthInboxMetric;
    itemId: string;
}

export interface HealthInboxPreference {
    enabled: boolean;
    docId: string;
    /** T-1486 按项目映射：同一指标可投递多个项目（每个项目独立 externalRef 身份，非双重累计——用户显式挂载）。 */
    metricBindings: Array<HealthMetricBinding>;
    /** 旧字段镜像（每指标首条映射的只读投影）：降级到旧版本时仍可读到主映射；新代码一律消费 metricBindings。 */
    stepsItemId: string;
    weightItemId: string;
}

/** 映射容量上限（跨指标合计，有界）。 */
export const HEALTH_MAX_METRIC_BINDINGS = 16;

const METRIC_VALUES: readonly HealthInboxMetric[] = ["steps", "weight"];
const normalizeMetric = (value: unknown): HealthInboxMetric | undefined => METRIC_VALUES.find((metric) => metric === value);
const normalizeBindingItemId = (value: unknown): string => typeof value === "string" ? value.trim().slice(0, 160) : "";

/** 偏好归一：docId 走块 ID 校验；enabled 无合法 docId 或无映射不物化；
    旧数据 stepsItemId/weightItemId 作为每指标首条映射并入（迁移兼容），镜像字段回写首条。 */
export function normalizeHealthInboxPreference(source: unknown): HealthInboxPreference {
    const entry = source && typeof source === "object" ? (source as Record<string, unknown>) : {};
    const docId = validateAnchorBlockId(entry.docId) || "";
    const bindings: Array<HealthMetricBinding> = [];
    const seen = new Set<string>();
    const push = (metric: unknown, rawItemId: unknown): void => {
        const knownMetric = normalizeMetric(metric);
        const itemId = normalizeBindingItemId(rawItemId);
        if (!knownMetric || !itemId) return;
        const identity = `${knownMetric}:${itemId}`;
        if (seen.has(identity) || bindings.length >= HEALTH_MAX_METRIC_BINDINGS) return;
        seen.add(identity);
        bindings.push({metric: knownMetric, itemId});
    };
    if (Array.isArray(entry.metricBindings)) {
        for (const candidate of entry.metricBindings.slice(0, HEALTH_MAX_METRIC_BINDINGS)) {
            const record = candidate && typeof candidate === "object" && !Array.isArray(candidate) ? (candidate as Record<string, unknown>) : {};
            push(record.metric, record.itemId);
        }
    }
    push("steps", entry.stepsItemId);
    push("weight", entry.weightItemId);
    return {
        enabled: entry.enabled === true && Boolean(docId) && bindings.length > 0,
        docId,
        metricBindings: bindings,
        stepsItemId: bindings.find((binding) => binding.metric === "steps")?.itemId || "",
        weightItemId: bindings.find((binding) => binding.metric === "weight")?.itemId || "",
    };
}

/** 为项目新增指标映射（模板预接线与设置页共用）：重复/超容量/非法输入返回 undefined（无变化）。 */
export function addHealthMetricBinding(source: unknown, metric: HealthInboxMetric, itemId: string): HealthInboxPreference | undefined {
    const knownMetric = normalizeMetric(metric);
    const normalizedId = normalizeBindingItemId(itemId);
    if (!knownMetric || !normalizedId) return undefined;
    const normalized = normalizeHealthInboxPreference(source);
    if (normalized.metricBindings.some((binding) => binding.metric === knownMetric && binding.itemId === normalizedId)) return undefined;
    if (normalized.metricBindings.length >= HEALTH_MAX_METRIC_BINDINGS) return undefined;
    return normalizeHealthInboxPreference({...normalized, metricBindings: [...normalized.metricBindings, {metric: knownMetric, itemId: normalizedId}]});
}
