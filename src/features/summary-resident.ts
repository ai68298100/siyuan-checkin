/* T-1353 每日摘要驻留：把当天汇总以单行纯文本追加进用户绑定的思源文档，
   让外部工具经内核公开读接口在不加载插件前端的情况下读到打卡概览。
   设计边界（D-257，docs/summary-resident-design.md）：
   - 单一目标文档 + 显式 opt-in（enabled 与合法 docId 双条件，同 D-241 纪律）；
   - 内容字段白名单：仅日期 + 汇总数字 + 固定来源枚举计数，无备注/明细/externalRef；
   - 只追加不修改；写入是尽力而为的旁路，失败有界重试一次后只进审计；
   - 幂等：行尾带 ASCII 标记，写入前按 文档+日期 查询既有标记行，命中即跳过；
   - 外部读取零新增面：不新增公开 API 能力、不注册新事件。 */

import {validateAnchorBlockId} from "./note-anchor";

/** 行尾幂等标记：纯 ASCII，供 SQL LIKE 检索；对用户可见以保留写入溯源。 */
export const SUMMARY_RESIDENT_MARKER = "lv-checkin-summary";

export interface SummaryResidentPreference {
    enabled: boolean;
    docId: string;
}

/** 偏好归一：docId 走块 ID 校验；enabled 在没有合法 docId 时不物化。 */
export function normalizeSummaryResidentPreference(source: unknown): SummaryResidentPreference {
    const entry = source && typeof source === "object" ? (source as Record<string, unknown>) : {};
    const docId = validateAnchorBlockId(entry.docId) || "";
    return {enabled: entry.enabled === true && Boolean(docId), docId};
}

export interface SummaryResidentLineInput {
    /** localDate（YYYY-MM-DD），行首日期戳。 */
    date: string;
    completed: number;
    scheduled: number;
    /** 预本地化的记录数文案，如「记录 9 次」/ "9 records"。 */
    recordsText: string;
    /** 非零来源计数（已按固定顺序排序），label 为预本地化来源名。 */
    sources: Array<{label: string; count: number}>;
}

/** 白名单行：`- 2026-09-21 · 5/7 · 记录 9 次 · 手动 5 (lv-checkin-summary)`。 */
export function buildDailySummaryLine(input: SummaryResidentLineInput): string {
    const sources = input.sources
        .filter((entry) => Number.isFinite(entry.count) && entry.count > 0)
        .map((entry) => ` · ${entry.label} ${Math.round(entry.count)}`)
        .join("");
    return `- ${input.date} · ${Math.round(input.completed)}/${Math.round(input.scheduled)} · ${input.recordsText}${sources} (${SUMMARY_RESIDENT_MARKER})`;
}

/** 幂等查询：同一文档内同日已有本插件标记行则视为已写入。docId 已过块 ID 校验。 */
export function buildSummaryDuplicateQuery(docId: string, date: string): string {
    const safeDoc = validateAnchorBlockId(docId) || "";
    const safeDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) ? date : "";
    if (!safeDoc || !safeDate) return "";
    return `SELECT id FROM blocks WHERE root_id = '${safeDoc}' AND content LIKE '%${safeDate}%' AND content LIKE '%${SUMMARY_RESIDENT_MARKER}%' LIMIT 1`;
}

/** 从 SQL 响应中取行数（数组或 {rows} 包裹两种形态都收口）。 */
export function extractSummaryRows(response: unknown): unknown[] {
    const data = (response as {data?: unknown} | null | undefined)?.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray((data as {rows?: unknown}).rows)) return (data as {rows: unknown[]}).rows;
    return [];
}
