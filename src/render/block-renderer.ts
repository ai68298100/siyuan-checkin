/* 17.2 T-1234/T-1235 渲染块 DOM 胶水：在思源 protyle 中定位 ```checkin``` 代码块，
   解析配置并紧邻其后插入只读预览（源码块保持原样可编辑）。
   安全边界（T-1236）：预览 HTML 全部由 features/checkin-block 纯函数构造；
   配置错误显示固定文案，不回显用户原文；点击跳转经 deps 回调（块→插件单向）。 */
import {escapeHtml} from "../shared";
import {t} from "../i18n";
import {
    buildGroupsViewHtml,
    buildHeatmapViewHtml,
    buildMonthViewHtml,
    buildSummaryViewHtml,
    buildTodayViewHtml,
    parseCheckinBlockConfig,
    type AnchorDocIndex,
    type CheckinBlockConfig,
} from "../features/checkin-block";
import type {CheckinStore} from "../types";

export interface BlockRendererDeps {
    getStore(): CheckinStore;
    getNow(): Date;
    onJumpDate?(date: string): void;
    /** T-1351：汇总行点击 → 回顾页该项目洞察。 */
    onJumpItem?(itemId: string): void;
    /** T-1351：锚点行点击 → 打开锚点所在文档（宿主经缓存索引定位）。 */
    onJumpItemAnchor?(blockId: string): void;
    /** T-1292：锚点→文档归属索引的同步缓存读；未命中条目不在返回值中。 */
    getAnchorIndex?(): AnchorDocIndex;
    /** T-1412：today 视图打卡按钮 → 宿主经既有 recordEvent 通道写入（幂等/审计不变）。 */
    onBlockTodayRecord?(itemId: string): void;
    /** T-1292：索引未命中的锚点异步解析（内核 /api/block/getBlockInfo，宿主缓存）；
        完成后由本函数的实现方触发一次强制重渲染。 */
    resolveAnchorDocs?(blockIds: string[]): Promise<void>;
}

const PREVIEW_FLAG = "data-checkin-preview";
const BLOCK_LANGUAGE = "checkin";
const PREVIEW_OWNER_FLAG = "data-checkin-preview-for";
let previewBlockSeq = 0;

/** 思源 3.8.4 实测 DOM：语言名在 `.protyle-action__language` 文本里，
    代码块容器无 data-subtype；同时兼容旧版 `.language-checkin` 类。 */
function isCheckinCodeBlock(block: HTMLElement): boolean {
    const subtype = block.dataset.subtype || "";
    if (subtype === BLOCK_LANGUAGE) return true;
    if (block.querySelector(".language-checkin")) return true;
    const lang = block.querySelector<HTMLElement>(".protyle-action__language");
    return (lang?.textContent || "").trim().toLowerCase() === BLOCK_LANGUAGE;
}

function readBlockConfigText(block: HTMLElement): string {
    /* 版本兼容链：思源 3.8.4 的代码内容在 .hljs 下的 contenteditable div（行号是同级空 div，
       不能先匹配到）；再退到 .hljs / pre / code，取第一个非空文本，避免宿主 DOM 漂移时静默不渲染。 */
    const candidates = [
        block.querySelector<HTMLElement>(".hljs [contenteditable='true']"),
        block.querySelector<HTMLElement>(".hljs"),
        block.querySelector<HTMLElement>("pre"),
        block.querySelector<HTMLElement>("code"),
    ];
    let raw = "";
    for (const node of candidates) {
        raw = node?.textContent || "";
        if (raw.trim()) break;
    }
    return raw.replace(/\u200B/g, "").trim();
}

function findCodeBlocks(root: HTMLElement): HTMLElement[] {
    const candidates = new Set<HTMLElement>();
    root.querySelectorAll<HTMLElement>(".code-block").forEach((block) => {
        if (isCheckinCodeBlock(block)) candidates.add(block);
    });
    return [...candidates];
}

function buildPreviewHtml(config: CheckinBlockConfig, deps: BlockRendererDeps, anchorIndex?: AnchorDocIndex): string {
    const asOf = deps.getNow();
    const store = deps.getStore();
    if (config.view === "month") return buildMonthViewHtml(store, config, asOf, anchorIndex);
    if (config.view === "heatmap") return buildHeatmapViewHtml(store, config, asOf, anchorIndex);
    if (config.view === "groups") return buildGroupsViewHtml(store, config, asOf, anchorIndex);
    if (config.view === "today") return buildTodayViewHtml(store, config, asOf);
    return buildSummaryViewHtml(store, config, asOf, anchorIndex);
}

/* 记录每个代码块上次渲染的配置文本：观察回调里仅在配置变化时重渲染，
   避免预览自身 DOM 改动触发观察风暴。 */
/* T-1292:已发起过解析的锚点登记——不可解析锚点(如块被删除)不得反复触发解析+重渲染循环。 */
const anchorResolveRequested = new Set<string>();
const lastRenderedConfig = new WeakMap<HTMLElement, string>();

export function renderCheckinBlocksIn(protyleElement: HTMLElement, deps: BlockRendererDeps, options: {force?: boolean} = {}): void {
    const blocks = findCodeBlocks(protyleElement);
    for (const block of blocks) {
        const configText = readBlockConfigText(block).trim();
        /* T-1293:预览按源块归属(唯一标记),相邻渲染块互不干扰——
           否则相邻两个渲染块的预览/加载占位会被互相当成旧预览删掉。 */
        if (!block.dataset.checkinBlockId) {
            previewBlockSeq += 1;
            block.dataset.checkinBlockId = `cb-${previewBlockSeq}`;
        }
        const ownerMarker = block.dataset.checkinBlockId;
        const previous = block.nextElementSibling;
        const previousIsOurs = previous?.getAttribute(PREVIEW_OWNER_FLAG) === ownerMarker;
        const previousIsAnyPreview = previous?.getAttribute(PREVIEW_FLAG) === "true";
        if (previousIsOurs && !options?.force && lastRenderedConfig.get(block) === configText) continue;
        if (previousIsOurs) previous?.remove();
        const parsed = parseCheckinBlockConfig(configText);
        const preview = document.createElement("div");
        preview.setAttribute(PREVIEW_FLAG, "true");
        preview.setAttribute(PREVIEW_OWNER_FLAG, ownerMarker);
        preview.className = "lc-checkin__renderblock-host";
        if (!parsed.ok) {
            preview.innerHTML = `<div class="lc-checkin__renderblock-error" role="alert">${escapeHtml(parsed.error)}</div>`;
        } else {
            const needsAnchorIndex = Boolean(parsed.config.docId || parsed.config.notebook);
            const anchorIndex = needsAnchorIndex ? deps.getAnchorIndex?.() : undefined;
            if (needsAnchorIndex && deps.resolveAnchorDocs) {
                const store = deps.getStore();
                const pending = new Set<string>();
                for (const item of store.items) {
                    const blockId = item.noteAnchor?.blockId;
                    if (item.archived || !blockId) continue;
                    if ((!anchorIndex || !anchorIndex.has(blockId)) && !anchorResolveRequested.has(blockId)) pending.add(blockId);
                }
                if (pending.size) {
                    pending.forEach((blockId) => anchorResolveRequested.add(blockId));
                    /* 首次渲染时锚点归属未解析完:先出加载占位,解析完成后强制重渲染一次。 */
                    preview.setAttribute(PREVIEW_OWNER_FLAG, ownerMarker);
                    preview.innerHTML = `<div class="lc-checkin__renderblock-empty">${escapeHtml(t("block.scopeLoading"))}</div>`;
                    lastRenderedConfig.set(block, configText);
                    block.insertAdjacentElement("afterend", preview);
                    void deps.resolveAnchorDocs([...pending]).then(() => {
                        renderCheckinBlocksIn(protyleElement, deps, {force: true});
                    });
                    continue;
                }
            }
            preview.innerHTML = buildPreviewHtml(parsed.config, deps, anchorIndex);
        }
        preview.addEventListener("click", (event) => {
            /* T-1412：today 视图打卡按钮——节流防连点（写入后由宿主广播触发整块重渲染解除）。 */
            const recordTarget = (event.target as HTMLElement).closest("[data-block-record]");
            if (recordTarget) {
                if (recordTarget.getAttribute("data-record-pending")) return;
                recordTarget.setAttribute("data-record-pending", "true");
                deps.onBlockTodayRecord?.(recordTarget.getAttribute("data-block-record") || "");
                return;
            }
            /* T-1351：锚点行优先打开所在文档（依赖已解析的缓存索引），否则回落项目洞察。 */
            const anchorTarget = (event.target as HTMLElement).closest("[data-jump-anchor-block]");
            if (anchorTarget) {
                deps.onJumpItemAnchor?.(anchorTarget.getAttribute("data-jump-anchor-block") || "");
                return;
            }
            const itemTarget = (event.target as HTMLElement).closest("[data-jump-item]");
            if (itemTarget) deps.onJumpItem?.(itemTarget.getAttribute("data-jump-item") || "");
            const target = (event.target as HTMLElement).closest("[data-jump-date]");
            if (target) deps.onJumpDate?.(target.getAttribute("data-jump-date") || "");
        });
        lastRenderedConfig.set(block, configText);
        block.insertAdjacentElement("afterend", preview);
    }
}

/* loaded-protyle-static 触发时语法高亮/编辑器可能尚未就绪——用 MutationObserver
   兜底观察 protyle 子树，代码块出现后补渲染。幂等：已有预览的块跳过，
   观察回调 200ms 防抖，避免渲染自身改动 DOM 造成风暴。返回断开函数。 */
export function observeCheckinBlocks(protyleElement: HTMLElement, deps: BlockRendererDeps): () => void {
    renderCheckinBlocksIn(protyleElement, deps);
    let timer: number | undefined;
    let disposed = false;
    const observer = new MutationObserver(() => {
        if (disposed) return;
        if (timer !== undefined) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
            timer = undefined;
            if (!disposed) renderCheckinBlocksIn(protyleElement, deps);
        }, 200);
    });
    observer.observe(protyleElement, {childList: true, subtree: true});
    return () => {
        disposed = true;
        if (timer !== undefined) window.clearTimeout(timer);
        observer.disconnect();
    };
}
