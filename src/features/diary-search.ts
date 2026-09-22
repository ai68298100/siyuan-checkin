/* 日记目标文档搜索的异步边界：响应失败、过期响应和结果投影都在同一处收口。 */

export interface DiarySearchBlock {
    id?: string;
    content?: string;
    hPath?: string;
}

export interface DiarySearchResponse {
    code?: number;
    data?: DiarySearchBlock[] | {blocks?: DiarySearchBlock[]};
}

export interface DiarySearchSelect {
    isConnected: boolean;
}

export type DiarySearchResult = "empty" | "stale" | "rendered" | "failed";

/**
 * 执行一次设置页搜索请求。
 *
 * `isCurrent` 和 `getSelect` 由调用方绑定当前设置页实例，因此网络返回后
 * 才能判断它是否仍可写入；失败也只向仍然活跃的请求显示一次错误提示。
 */
export async function runDiarySearchRequest<T extends DiarySearchSelect>(options: {
    query: string;
    request: number;
    isCurrent: (request: number) => boolean;
    getSelect: () => T | null;
    post: (url: string, payload: {k: string; flashcard: false; excludeIDs: never[]}) => Promise<DiarySearchResponse>;
    render: (select: T, blocks: DiarySearchBlock[]) => void;
    onFailure: () => void;
}): Promise<DiarySearchResult> {
    if (!options.query) return "empty";
    try {
        const response = await options.post("/api/filetree/searchDocs", {k: options.query, flashcard: false, excludeIDs: []});
        const select = options.getSelect();
        if (!select?.isConnected || !options.isCurrent(options.request)) return "stale";
        if (response.code !== 0) throw new Error("diary-search-failed");
        const blocks = Array.isArray(response.data) ? response.data : response.data?.blocks || [];
        options.render(select, blocks.slice(0, 50));
        return "rendered";
    } catch {
        const select = options.getSelect();
        if (!select?.isConnected || !options.isCurrent(options.request)) return "stale";
        options.onFailure();
        return "failed";
    }
}
