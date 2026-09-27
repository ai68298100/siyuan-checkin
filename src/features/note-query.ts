/* T-1500 笔记推导打卡（D-286）：固定只读 SQL 模板 + 严格解析边界。
   设计目标：把「内容即打卡」限制在用户显式选择的文档/笔记本和一个项目内；
   不接受任意 SQL、不写回笔记、不把自然语言或普通文本猜成完成状态。
   查询结果经 notequery:<itemId>:<blockId>:<localDate> 身份送入既有
   recordExternalEvent，重复运行幂等；同日已有手动事件则让手动事实优先。 */

import {validateAnchorBlockId} from "./note-anchor";
import {isValidDateKey} from "../date-keys";
import type {CheckinEvent} from "../types";

export type NoteQueryTemplateId = "frontmatter" | "tag";
export type NoteQueryScope = "document" | "notebook";

export interface NoteQueryPreference {
    enabled: boolean;
    template: NoteQueryTemplateId;
    scope: NoteQueryScope;
    targetId: string;
    itemId: string;
    field: string;
    value: string;
    tag: string;
    /** Internal ascending page cursor; never rendered as user configuration. */
    cursor?: string;
}

export interface NoteQueryRow {
    id?: string;
    root_id?: string;
    content?: string;
    root_ial?: string;
    root_hpath?: string;
}

export interface NoteQueryEntry {
    blockId: string;
    localDate: string;
    value: number;
    externalRef: string;
    note: string;
}

export const NOTE_QUERY_INTERVAL_MS = 300_000;
export const NOTE_QUERY_MAX_ROWS = 200;

const TEMPLATE_IDS: readonly NoteQueryTemplateId[] = ["frontmatter", "tag"];
const SCOPE_IDS: readonly NoteQueryScope[] = ["document", "notebook"];
const ITEM_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;
const BLOCK_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const TOKEN_PATTERN = /^[\p{L}\p{N}_-]{1,40}$/u;
const VALUE_PATTERN = /^[\p{L}\p{N}_ .-]{1,40}$/u;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAILY_NOTE_ATTRIBUTE = /custom-dailynote-(\d{4})(\d{2})(\d{2})/i;
const ISO_PATH_DATE = /(?:^|[/\\ _-])(\d{4})[-/]?(\d{2})[-/]?(\d{2})(?:$|[/\\ _-])/;

export const DEFAULT_NOTE_QUERY_PREFERENCE: NoteQueryPreference = {
    enabled: false,
    template: "frontmatter",
    scope: "notebook",
    targetId: "",
    itemId: "",
    field: "checkin",
    value: "done",
    tag: "checkin",
};

const cleanToken = (value: unknown, fallback: string): {value: string; valid: boolean} => {
    if (value === undefined) return {value: fallback, valid: true};
    const normalized = typeof value === "string" ? value.trim() : "";
    return TOKEN_PATTERN.test(normalized) ? {value: normalized, valid: true} : {value: "", valid: false};
};

const cleanValue = (value: unknown, fallback: string): {value: string; valid: boolean} => {
    if (value === undefined) return {value: fallback, valid: true};
    const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    return VALUE_PATTERN.test(normalized) ? {value: normalized, valid: true} : {value: "", valid: false};
};

/** 归一化显式配置；任何无法安全拼入固定 SQL 的 token 都回落到内置值。 */
export function normalizeNoteQueryPreference(source: unknown): NoteQueryPreference {
    const entry = source && typeof source === "object" ? source as Record<string, unknown> : {};
    const template = TEMPLATE_IDS.includes(entry.template as NoteQueryTemplateId) ? entry.template as NoteQueryTemplateId : DEFAULT_NOTE_QUERY_PREFERENCE.template;
    const scope = SCOPE_IDS.includes(entry.scope as NoteQueryScope) ? entry.scope as NoteQueryScope : DEFAULT_NOTE_QUERY_PREFERENCE.scope;
    const targetId = validateAnchorBlockId(entry.targetId) || "";
    const itemId = typeof entry.itemId === "string" && ITEM_ID_PATTERN.test(entry.itemId.trim()) ? entry.itemId.trim().slice(0, 160) : "";
    const field = cleanToken(entry.field, DEFAULT_NOTE_QUERY_PREFERENCE.field);
    const value = cleanValue(entry.value, DEFAULT_NOTE_QUERY_PREFERENCE.value);
    const tag = cleanToken(entry.tag, DEFAULT_NOTE_QUERY_PREFERENCE.tag);
    const cursor = typeof entry.cursor === "string" && BLOCK_ID_PATTERN.test(entry.cursor.trim()) ? entry.cursor.trim() : "";
    return {
        enabled: entry.enabled === true && Boolean(targetId && itemId && field.valid && value.valid && tag.valid),
        template,
        scope,
        targetId,
        itemId,
        field: field.value,
        value: value.value,
        tag: tag.value,
        ...(cursor ? {cursor} : {}),
    };
}

/** A normalized preference is queryable only when every marker required by its
 * selected template is present. Invalid user input is fail-closed instead of
 * silently changing the marker to a different query. */
export function isNoteQueryPreferenceReady(source: unknown): boolean {
    const preference = normalizeNoteQueryPreference(source);
    return Boolean(preference.targetId && preference.itemId
        && (preference.template === "frontmatter"
            ? preference.field && preference.value
            : preference.tag));
}

const sqlString = (value: string): string => value.replace(/'/g, "''");

/** 构造固定 SELECT；只读、有限制、只查询用户显式绑定的文档/笔记本。 */
export function buildNoteQuerySql(source: unknown, afterBlockId?: string): string {
    const preference = normalizeNoteQueryPreference(source);
    if (!isNoteQueryPreferenceReady(preference)) return "";
    const scope = preference.scope === "document"
        ? `root.id = '${sqlString(preference.targetId)}'`
        : `root.box = '${sqlString(preference.targetId)}'`;
    const needle = preference.template === "frontmatter"
        ? `${preference.field}:`
        : `#${preference.tag}`;
    const cursor = typeof afterBlockId === "string" && BLOCK_ID_PATTERN.test(afterBlockId.trim())
        ? ` AND child.id > '${sqlString(afterBlockId.trim())}'`
        : "";
    return [
        "SELECT child.id, child.root_id, child.content, root.ial AS root_ial, root.hpath AS root_hpath",
        "FROM blocks AS child JOIN blocks AS root ON root.id = child.root_id",
        `WHERE child.type IN ('p', 'h', 'l') AND root.type = 'd' AND ${scope}`,
        `AND child.content LIKE '%${sqlString(needle)}%'${cursor}`,
        `ORDER BY child.id ASC LIMIT ${NOTE_QUERY_MAX_ROWS}`,
    ].join(" ");
}

function dateFromRoot(row: NoteQueryRow): string | undefined {
    const ial = typeof row.root_ial === "string" ? row.root_ial : "";
    const attr = ial.match(DAILY_NOTE_ATTRIBUTE);
    if (attr) {
        const key = `${attr[1]}-${attr[2]}-${attr[3]}`;
        if (isValidDateKey(key)) return key;
    }
    const hpath = typeof row.root_hpath === "string" ? row.root_hpath : "";
    const pathDate = hpath.match(ISO_PATH_DATE);
    if (pathDate) {
        const key = `${pathDate[1]}-${pathDate[2]}-${pathDate[3]}`;
        if (isValidDateKey(key)) return key;
    }
    return undefined;
}

function contentMatches(content: string, preference: NoteQueryPreference): boolean {
    /* SQL rows may expose rendered inline HTML; remove tags before matching the
       explicit marker while retaining the surrounding whitespace boundaries. */
    const normalizedContent = content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ");
    if (preference.template === "tag") {
        const escaped = preference.tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?:^|[\\s#])#${escaped}(?=$|[\\s.,;:!?，。；：！？])`, "iu").test(normalizedContent);
    }
    const field = preference.field.replace(/[.*+?^${}()|[\[\]\\]/g, "\\$&");
    const value = preference.value.replace(/[.*+?^${}()|[\[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[\\n\\r;,，；])\\s*${field}\\s*:\\s*${value}\\s*(?:$|[\\n\\r;,，；])`, "iu").test(normalizedContent);
}

export function buildNoteQueryExternalRef(itemId: string, blockId: string, localDate: string): string {
    const safeItem = typeof itemId === "string" ? itemId.trim().slice(0, 160) : "";
    const safeBlock = typeof blockId === "string" ? blockId.trim().slice(0, 64) : "";
    return ITEM_ID_PATTERN.test(safeItem) && BLOCK_ID_PATTERN.test(safeBlock) && isValidDateKey(localDate)
        ? `notequery:${safeItem}:${safeBlock}:${localDate}`
        : "";
}

/** 将 SQL 行严格投影为完成信号；缺少日记日期或标记不猜测。 */
export function parseNoteQueryRows(rows: readonly NoteQueryRow[], source: unknown): NoteQueryEntry[] {
    const preference = normalizeNoteQueryPreference(source);
    if (!isNoteQueryPreferenceReady(preference) || !Array.isArray(rows)) return [];
    const seen = new Set<string>();
    const result: NoteQueryEntry[] = [];
    for (const row of rows.slice(0, NOTE_QUERY_MAX_ROWS)) {
        const blockId = typeof row?.id === "string" ? row.id.trim() : "";
        if (!BLOCK_ID_PATTERN.test(blockId)) continue;
        const localDate = dateFromRoot(row);
        const content = typeof row?.content === "string" ? row.content : "";
        if (!localDate || !contentMatches(content, preference)) continue;
        const externalRef = buildNoteQueryExternalRef(preference.itemId, blockId, localDate);
        if (!externalRef || seen.has(externalRef)) continue;
        seen.add(externalRef);
        result.push({blockId, localDate, value: 1, externalRef, note: `note:${preference.template}:${blockId}`});
    }
    return result;
}

/** Return the last valid block ID from a bounded, ascending SQL page. The
 * caller uses it as an in-memory cursor so old duplicate rows cannot starve
 * newer rows beyond the 200-row window. */
export function noteQueryCursorFromRows(rows: readonly NoteQueryRow[]): string | undefined {
    if (!Array.isArray(rows)) return undefined;
    for (let index = Math.min(rows.length, NOTE_QUERY_MAX_ROWS) - 1; index >= 0; index -= 1) {
        const id = typeof rows[index]?.id === "string" ? rows[index].id.trim() : "";
        if (BLOCK_ID_PATTERN.test(id)) return id;
    }
    return undefined;
}

export type NoteQueryIngestDecision = "write" | "duplicate" | "manual-conflict" | "tombstoned";

/** 手动事实优先：同项目同日已有任何手动事件时不派生自动事件。 */
export function noteQueryIngestDecision(events: readonly Pick<CheckinEvent, "itemId" | "localDate" | "source" | "externalRef">[], tombstones: ReadonlyArray<{itemId?: string; source?: CheckinEvent["source"]; externalRef?: string}>, entry: NoteQueryEntry, itemId: string): NoteQueryIngestDecision {
    if (events.some((event) => event.itemId === itemId && event.source === "manual" && event.localDate === entry.localDate)) return "manual-conflict";
    if (events.some((event) => event.itemId === itemId && event.source === "api" && event.externalRef === entry.externalRef)) return "duplicate";
    if (tombstones.some((tombstone) => tombstone.itemId === itemId && tombstone.source === "api" && tombstone.externalRef === entry.externalRef)) return "tombstoned";
    return "write";
}
