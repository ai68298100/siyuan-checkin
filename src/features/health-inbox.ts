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

/** 偏好归一：docId 走块 ID 校验；enabled 无合法 docId 不物化；项目映射可选。 */
export function normalizeHealthInboxPreference(source: unknown): {enabled: boolean; docId: string; stepsItemId: string; weightItemId: string} {
    const entry = source && typeof source === "object" ? (source as Record<string, unknown>) : {};
    const docId = validateAnchorBlockId(entry.docId) || "";
    const itemId = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 160) : "";
    const stepsItemId = itemId(entry.stepsItemId);
    const weightItemId = itemId(entry.weightItemId);
    return {
        enabled: entry.enabled === true && Boolean(docId) && Boolean(stepsItemId || weightItemId),
        docId,
        stepsItemId,
        weightItemId,
    };
}
