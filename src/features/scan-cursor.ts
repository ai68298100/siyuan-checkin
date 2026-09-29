/* T-1629 · 有界分页扫描器：健康文档 / 笔记推导 / 叶归 LifeLog 三类文档来源共用（D-319）。
   纪律：
   - 单次摄取最多 maxPages 页（每页 windowSize 行），积压再大也不放大单轮请求量；
   - 整页（= windowSize）视为可能还有后续：游标推进到本页最后一条的稳定块 ID，下一页从
     `id > cursor` 续读；短页（< windowSize）视为读完，游标复位空串——下一轮从头幂等重扫
     （externalRef / 墓碑 / 手动优先负责去重，绝不因游标丢事件）；
   - 游标只接受块 ID 形态（^[A-Za-z0-9_-]{8,64}$，与 note-query 内部校验同形），
     不合法一律按无游标处理，绝不拼入 SQL；
   - fetchPage 由调用方注入（kernelPost 包装，失败时抛错），本模块无宿主依赖、可离线回放；
   - 多页行累积后一次交给调用方解析：跨页的同文档相邻段不因分页丢前置（LifeLog 时长归属
     依赖文档内序列完整）。 */

export const SOURCE_SCAN_MAX_PAGES = 4;
export const BLOCK_ID_CURSOR_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** 游标 SQL 子句：仅块 ID 形态的游标被拼接（值本身由白名单字符构成），其余返回空串。 */
export function blockIdCursorClause(cursor: string): string {
    const value = typeof cursor === "string" ? cursor.trim() : "";
    return value && BLOCK_ID_CURSOR_PATTERN.test(value) ? ` AND id > '${value}'` : "";
}

export interface ScanResult<Row> {
    /** 全部已读页的行累积（跨页保序）——调用方在扫描完成后一次性解析。 */
    rows: Row[];
    pages: number;
    /** 最终游标：advanced=true 时为本页最后块 ID（会话态保存，下轮续读）；
        false 时空串（下轮从头幂等重扫）。 */
    cursor: string;
    /** true=因页数上限停止且仍读满整页（可能还有后续，windowFull 语义）。 */
    advanced: boolean;
}

/** 有界分页扫描：fetchPage(cursor) 返回一页行（失败抛错由调用方归口 read-failed）；
    rowId 提取行游标。fail-fast：任一页抛错即整体失败（本轮不部分入账）。 */
export async function scanBoundedPages<Row>(options: {
    cursor: string;
    windowSize: number;
    maxPages?: number;
    fetchPage: (cursor: string) => Promise<Row[]>;
    rowId: (row: Row) => string | undefined;
}): Promise<ScanResult<Row>> {
    const maxPages = Math.max(1, Math.floor(options.maxPages ?? SOURCE_SCAN_MAX_PAGES));
    const windowSize = Math.max(1, Math.floor(options.windowSize));
    const rows: Row[] = [];
    let cursor = typeof options.cursor === "string" ? options.cursor.trim() : "";
    let pages = 0;
    while (pages < maxPages) {
        const page = await options.fetchPage(cursor);
        if (!Array.isArray(page)) return {rows, pages, cursor: "", advanced: false};
        rows.push(...page);
        pages += 1;
        if (page.length < windowSize) return {rows, pages, cursor: "", advanced: false};
        const lastId = options.rowId(page[page.length - 1]);
        if (typeof lastId !== "string" || !BLOCK_ID_CURSOR_PATTERN.test(lastId.trim())) {
            return {rows, pages, cursor: "", advanced: false};
        }
        cursor = lastId.trim();
    }
    return {rows, pages, cursor, advanced: true};
}
