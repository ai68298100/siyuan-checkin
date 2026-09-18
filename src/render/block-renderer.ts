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

function findCodeBlocks(root: HTMLElement): HTMLElement[] {
    const candidates = new Set<HTMLElement>();
    root.querySelectorAll<HTMLElement>(".code-block[data-subtype='checkin']").forEach((block) => candidates.add(block));
    root.querySelectorAll<HTMLElement>(".language-checkin").forEach((span) => {
        const block = span.closest<HTMLElement>(".code-block");
        if (block) candidates.add(block);
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

export function renderCheckinBlocksIn(protyleElement: HTMLElement, deps: BlockRendererDeps): void {
    for (const block of findCodeBlocks(protyleElement)) {
        const previous = block.nextElementSibling;
        if (previous?.getAttribute(PREVIEW_FLAG) === "true") previous.remove();
        const configText = (block.querySelector("code")?.textContent || "").trim();
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
        block.insertAdjacentElement("afterend", preview);
    }
}
