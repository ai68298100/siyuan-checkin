/* 17.1 T-1231 笔记锚点：打卡状态回写到用户绑定块的自定义属性（思源 custom-* 约定）。
   设计边界（D-218）：
   - 回写是尽力而为的旁路：绝不阻断/回滚打卡主路径；失败有界重试一次后写入审计并挂起；
   - 只写用户明确绑定的块；属性键固定 `custom-lv-checkin`（小写连字符，custom- 前缀）；
   - setBlockAttrs 是合并语义：解绑/卸载清理用空串清除本插件键，不触碰其他属性；
   - 内核调用经 deps.post 注入（fetchSyncPost 的结构化签名），纯逻辑可脱离宿主测试。 */

export const ANCHOR_ATTR_KEY = "custom-lv-checkin";

export interface KernelPostResult {
    code?: number;
    msg?: string;
}

export type KernelPost = (url: string, payload: unknown) => Promise<KernelPostResult>;

export interface AnchorWriteInfo {
    date: string;
    state: "done" | "skip" | "unskip";
    value?: number;
    unit?: string;
    streak?: number;
}

/** 校验用户输入的块 ID（思源块 ID 为 URL 安全短串；文档 ID 同样合法）。 */
export function validateAnchorBlockId(raw: unknown): string | undefined {
    if (typeof raw !== "string") return undefined;
    const blockId = raw.trim();
    return /^[A-Za-z0-9_-]{10,64}$/.test(blockId) ? blockId : undefined;
}

/** 属性值：单行人类可读（属性面板直接可见），date 前缀保证排序与检索。 */
export function buildAnchorAttrValue(date: string, text: string): string {
    return `${date} · ${text}`;
}

async function postKernel(post: KernelPost, url: string, payload: unknown): Promise<KernelPostResult> {
    try {
        return await post(url, payload);
    } catch (error) {
        return {code: -1, msg: error instanceof Error ? error.message : String(error)};
    }
}

const ok = (response: KernelPostResult): boolean => response?.code === 0;

/** 解析锚点块（T-1233 悬挂检测的基础；T-1387/v18.1.x 起同时返回根文档信息：
    rootID 用于打开归属文档，块被移动后重解析即可跟随，不依赖陈旧缓存）。 */
export async function resolveAnchorBlock(post: KernelPost, blockId: string): Promise<{ok: boolean; reason?: string; rootID?: string; notebook?: string}> {
    const response = await postKernel(post, "/api/block/getBlockInfo", {id: blockId});
    if (!ok(response)) return {ok: false, reason: response?.msg || "block-not-found"};
    const data = (response as {data?: {rootID?: unknown; box?: unknown}}).data || {};
    return {
        ok: true,
        ...(data.rootID ? {rootID: String(data.rootID)} : {}),
        ...(data.box ? {notebook: String(data.box)} : {}),
    };
}

/** 写状态属性（合并语义，只动本插件键）。 */
export async function writeAnchorAttr(post: KernelPost, blockId: string, value: string): Promise<{ok: boolean; reason?: string}> {
    const response = await postKernel(post, "/api/attr/setBlockAttrs", {id: blockId, attrs: {[ANCHOR_ATTR_KEY]: value}});
    return ok(response) ? {ok: true} : {ok: false, reason: response?.msg || "set-attrs-failed"};
}

/** 解绑/卸载清理：空串即移除本插件键，不触碰块内其他属性。 */
export async function clearAnchorAttr(post: KernelPost, blockId: string): Promise<{ok: boolean; reason?: string}> {
    const response = await postKernel(post, "/api/attr/setBlockAttrs", {id: blockId, attrs: {[ANCHOR_ATTR_KEY]: ""}});
    return ok(response) ? {ok: true} : {ok: false, reason: response?.msg || "clear-attrs-failed"};
}

/** 附加一条备注块到锚点文档（T-1232）：appendBlock 以 markdown 追加为子块。 */
export async function appendAnchorNote(post: KernelPost, blockId: string, markdown: string): Promise<{ok: boolean; reason?: string}> {
    const response = await postKernel(post, "/api/block/appendBlock", {data: markdown, dataType: "markdown", parentID: blockId});
    return ok(response) ? {ok: true} : {ok: false, reason: response?.msg || "append-block-failed"};
}

/** T-1232：追加进用户文档的备注行（带日期戳；换行折叠为空格防断块）。 */
export function buildAnchorNoteMarkdown(input: {date: string; itemName: string; stateText: string; note: string}): string {
    const note = input.note.replace(/\r?\n/g, " ").trim();
    return `- ${input.date} ${input.stateText} **${input.itemName}**${note ? `：${note}` : ""}`;
}

/** 有界重试包装：最多 attempts 次（含首次），间隔 retryDelayMs。 */
export async function withBoundedRetry<T>(
    operation: () => Promise<{ok: boolean; reason?: string}>,
    options: {attempts?: number; retryDelayMs?: number; onRetryWait?: (ms: number) => Promise<void>} = {},
): Promise<{ok: boolean; reason?: string}> {
    const attempts = Math.max(1, Math.min(3, options?.attempts ?? 2));
    const retryDelayMs = Math.max(0, options?.retryDelayMs ?? 1500);
    let last: {ok: boolean; reason?: string} = {ok: false, reason: "not-attempted"};
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (attempt > 0 && retryDelayMs > 0) {
            if (options?.onRetryWait) await options.onRetryWait(retryDelayMs);
        }
        last = await operation();
        if (last.ok) return last;
    }
    return last;
}
