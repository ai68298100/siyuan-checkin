/* 17.2 T-1234/T-1235 渲染块 DOM 胶水：在思源 protyle 中定位 ```checkin``` 代码块，
   解析配置并紧邻其后插入只读预览（源码块保持原样可编辑）。
   安全边界（T-1236）：预览 HTML 全部由 features/checkin-block 纯函数构造；
   配置错误显示固定文案，不回显用户原文；点击跳转经 deps 回调（块→插件单向）。 */
import {escapeHtml} from "../shared";
import {
    buildHeatmapViewHtml,
    buildMonthViewHtml,
    buildSummaryViewHtml,
    parseCheckinBlockConfig,
    type CheckinBlockConfig,
} from "../features/checkin-block";
import type {CheckinStore} from "../types";

export interface BlockRendererDeps {
    getStore(): CheckinStore;
    getNow(): Date;
    onJumpDate?(date: string): void;
}

const PREVIEW_FLAG = "data-checkin-preview";
const BLOCK_LANGUAGE = "checkin";

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

function buildPreviewHtml(config: CheckinBlockConfig, deps: BlockRendererDeps): string {
    const asOf = deps.getNow();
    const store = deps.getStore();
    if (config.view === "month") return buildMonthViewHtml(store, config, asOf);
    if (config.view === "heatmap") return buildHeatmapViewHtml(store, config, asOf);
    return buildSummaryViewHtml(store, config, asOf);
}

/* 记录每个代码块上次渲染的配置文本：观察回调里仅在配置变化时重渲染，
   避免预览自身 DOM 改动触发观察风暴。 */
const lastRenderedConfig = new WeakMap<HTMLElement, string>();

export function renderCheckinBlocksIn(protyleElement: HTMLElement, deps: BlockRendererDeps, options: {force?: boolean} = {}): void {
    const blocks = findCodeBlocks(protyleElement);
    for (const block of blocks) {
        const configText = readBlockConfigText(block).trim();
        const previous = block.nextElementSibling;
        const existing = previous?.getAttribute(PREVIEW_FLAG) === "true";
        if (existing && !options?.force && lastRenderedConfig.get(block) === configText) continue;
        previous?.remove();
        const parsed = parseCheckinBlockConfig(configText);
        const preview = document.createElement("div");
        preview.setAttribute(PREVIEW_FLAG, "true");
        preview.className = "lc-checkin__renderblock-host";
        if (!parsed.ok) {
            preview.innerHTML = `<div class="lc-checkin__renderblock-error" role="alert">${escapeHtml(parsed.error)}</div>`;
        } else {
            preview.innerHTML = buildPreviewHtml(parsed.config, deps);
        }
        preview.addEventListener("click", (event) => {
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
