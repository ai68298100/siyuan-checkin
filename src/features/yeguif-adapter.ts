/* T-1457 叶归 LifeLog 适配器（本地读取用户文档，health-inbox 同型）——接入层纯核心。
   数据面（2026-09-25 e2e 实装叶归 v1.12.6 静态探测判定）：
   - LifeLog 段落 = 日记（DailyNote）文档中行首为时间的段落：`12:00 工作` /
     `12:00 工作：写日报` / `12:00:00 工作：写日报`（行首时间带样式则不标记）；
   - 时长 = 同文档内「上条记录 → 当前记录」起始时间差，时长归当前记录的项目与事项；
   - 落点 = 用户可见的普通段落块 + 渲染期 data-en_lifelog_* DOM 标注（红线内）。
   摄取纪律：只读用户自己的文档（local-only）；只摄取当日新建块（宁少记不回补）；
   当天第一条没有前置时间时长未知 → 不记；BlockId 天然幂等身份
   （yeguif:<blockId>:<localDate>），用户改写记录内容不产生重复记账。
   零依赖、无时钟（日期由调用方注入）、fail-closed。 */

export const YEGUIF_INGEST_INTERVAL_MS = 300_000;
/** 单轮摄取的块上限（有界 SQL）。 */
export const YEGUIF_MAX_BLOCKS = 200;
/** 单条记录文本上限。 */
const MARKER_TEXT_LIMIT = 300;
const MARKER_TYPE_LIMIT = 60;
const MARKER_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+)$/;
const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const BLOCK_ID_PATTERN = /^[0-9A-Za-z-]{8,64}$/;

export interface YeguifMarker {
    blockId: string;
    /** 当日内起始分钟数（0~1439）。 */
    startMinutes: number;
    /** 类型 = 时间后的首段（全角/半角冒号前）。 */
    type: string;
    /** 冒号后的备注（可空）。 */
    text: string;
}

/** 解析一条 LifeLog Marker 段落；非时间开头/时间非法/类型为空 → undefined（fail-closed）。 */
export function parseYeguifMarker(blockId: string, content: string): YeguifMarker | undefined {
    if (typeof blockId !== "string" || !BLOCK_ID_PATTERN.test(blockId.trim())) return undefined;
    if (typeof content !== "string") return undefined;
    const match = content.trim().match(MARKER_PATTERN);
    if (!match) return undefined;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return undefined;
    const rest = match[4].trim();
    if (!rest) return undefined;
    const colon = rest.search(/[：:]/);
    const type = (colon >= 0 ? rest.slice(0, colon) : rest).trim().slice(0, MARKER_TYPE_LIMIT);
    if (!type) return undefined;
    const text = (colon >= 0 ? rest.slice(colon + 1) : "").trim().slice(0, MARKER_TEXT_LIMIT);
    return {blockId: blockId.trim().slice(0, 120), startMinutes: hours * 60 + minutes, type, text};
}

export interface YeguifEntry {
    blockId: string;
    localDate: string;
    minutes: number;
    type: string;
    text: string;
}

export interface YeguifProjectMapping {
    /** LifeLog 时间后的项目名（例如“工作”）。 */
    project: string;
    /** 小驴打卡项目 ID。 */
    itemId: string;
}

/** Explicit mapping wins; otherwise only one exact-name target may receive the entry. */
export function resolveYeguifItemId(project: string, mappings: readonly YeguifProjectMapping[], candidates: readonly {id: string; name: string}[] = []): string {
    const normalized = typeof project === "string" ? project.trim().toLocaleLowerCase() : "";
    if (!normalized) return "";
    const match = mappings.find((entry) => typeof entry?.project === "string" && typeof entry?.itemId === "string"
        && entry.project.trim().toLocaleLowerCase() === normalized && entry.itemId.trim());
    if (match) return match.itemId.trim();
    if (mappings.length) return "";
    const matching = candidates.filter((item) => item.name.trim().toLocaleLowerCase() === normalized);
    return matching.length === 1 ? matching[0].id : "";
}

/** 归一化设置输入；重复项目保留第一条，避免一条 LifeLog 同时写入多个项目。 */
export function normalizeYeguifMappings(value: unknown, max = 50): YeguifProjectMapping[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const result: YeguifProjectMapping[] = [];
    for (const raw of value) {
        if (!raw || typeof raw !== "object") continue;
        const source = raw as Record<string, unknown>;
        const project = typeof source.project === "string" ? source.project.trim().slice(0, MARKER_TYPE_LIMIT) : "";
        const itemId = typeof source.itemId === "string" ? source.itemId.trim().slice(0, 160) : "";
        const key = project.toLocaleLowerCase();
        if (!project || !itemId || seen.has(key)) continue;
        seen.add(key);
        result.push({project, itemId});
        if (result.length >= max) break;
    }
    return result;
}

/** 结算：同文档内按起始时间升序，时长 = 当前记录起始 − 上一记录起始（分钟），
    并归属当前记录；首条没有前置记录不产出（宁少记）；零时长/负时长（同分钟）跳过。
    输入应为同一 root 文档的全部 Marker；确定性输出（时间升序、blockId 稳定平局）。 */
export function settleYeguifEntries(markers: readonly YeguifMarker[], localDate: string): YeguifEntry[] {
    if (!DATE_PATTERN.test(localDate)) return [];
    const sorted = [...markers].sort((left, right) => left.startMinutes - right.startMinutes || left.blockId.localeCompare(right.blockId));
    const entries: YeguifEntry[] = [];
    for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        const minutes = current.startMinutes - previous.startMinutes;
        if (minutes <= 0) continue;
        entries.push({blockId: current.blockId, localDate, minutes, type: current.type, text: current.text});
    }
    return entries;
}

/** 写入身份：`yeguif:<blockId>:<localDate>`（与注册表格式一致；块 ID 天然防重）。 */
export function buildYeguifExternalRef(blockId: string, localDate: string): string {
    const safe = typeof blockId === "string" ? blockId.trim().slice(0, 120) : "";
    return safe && DATE_PATTERN.test(localDate) ? `yeguif:${safe}:${localDate}` : "";
}

/** 事件备注：`类型：备注`（无备注时仅类型）。 */
export function buildYeguifEventNote(type: string, text: string): string {
    const safeType = typeof type === "string" ? type.trim().slice(0, MARKER_TYPE_LIMIT) : "";
    const safeText = typeof text === "string" ? text.trim().slice(0, MARKER_TEXT_LIMIT) : "";
    return safeText ? `${safeType}：${safeText}` : safeType;
}
