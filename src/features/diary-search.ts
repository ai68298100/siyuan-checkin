/* 文档目标搜索的纯投影层（T-1616）：响应形态归一 + 候选行投影。
   异步边界（防抖/过期代际/IME 组合态）由宿主设置接线的请求代际模式负责，
   本模块保持纯函数：同一输入永远得到同一投影。 */

export interface DiarySearchBlock {
    id?: string;
    content?: string;
    hPath?: string;
}

export interface DiarySearchResponse {
    code?: number;
    data?: DiarySearchBlock[] | {blocks?: DiarySearchBlock[]};
}

/** 响应形态归一：数组直返；旧版 {blocks:[…]} 包裹形态解包；其余按空处理。 */
export function normalizeDocumentSearchResponse(data: DiarySearchResponse["data"] | undefined): DiarySearchBlock[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray((data as {blocks?: unknown}).blocks)) {
        return (data as {blocks: DiarySearchBlock[]}).blocks;
    }
    return [];
}

export interface DocumentChoiceRow {
    id: string;
    name: string;
    path: string;
}

/** 候选行投影：块 ID 去重、名称缺省回落块 ID、路径裁剪、上限 50（与 searchDocs 有界一致）。 */
export function toDocumentChoiceRows(blocks: ReadonlyArray<DiarySearchBlock>): DocumentChoiceRow[] {
    const rows: DocumentChoiceRow[] = [];
    const seen = new Set<string>();
    for (const block of blocks) {
        const id = typeof block?.id === "string" ? block.id.trim() : "";
        if (!id || seen.has(id)) continue;
        seen.add(id);
        rows.push({
            id,
            name: (typeof block.content === "string" && block.content.trim()) || id,
            path: typeof block.hPath === "string" ? block.hPath.trim() : "",
        });
        if (rows.length >= 50) break;
    }
    return rows;
}
