/* 快速弹窗生命周期：从 index.ts 外置（T-022）。
   含窗口尺寸偏好、移动端 topbar 按钮与「小驴速切」快捷动作注册。 */
import {t} from "../i18n";
import {getFrontend, showMessage, Dialog} from "siyuan";
import type {DialogSizeMode} from "../view-preferences";

export interface QuickDialogHost {
    disposed: boolean;
    disposing: boolean;
    isMobileFrontend: boolean;
    dialogSizeMode: DialogSizeMode;
    dialogScale: number;
    dialogFixedSize: {width: number; height: number};
    dialogRect?: {width: number; height: number};
    dialogOffset?: {x: number; y: number};
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";
    editingId?: string;
    editingFingerprint?: string;
    quickDialog?: Dialog;
    quickDialogElement?: HTMLElement;
    quickDialogFullscreen: boolean;
    quickDialogViewportCleanup?: () => void;
    quickDialogFrameCleanup?: () => void;
    mobileTopBarButton?: HTMLElement;
    mobileTopBarRetryTimer?: number;
    speedSwitchQuickActionDisposers: Array<() => void>;
    speedSwitchRetryTimer?: number;
    app?: unknown;
    render(): void;
    renderInto(root: HTMLElement): void;
    reconcileStore(): Promise<void>;
    persistViewPreferences(): Promise<void>;
}

/** Content-driven default: a fixed reading width beats scaling blank margins with the window. */
export const AUTO_DIALOG_MIN_WIDTH = 760;
export const AUTO_DIALOG_MAX_WIDTH = 1440;
export const AUTO_DIALOG_WIDTH_RATIO = 0.62;
export const AUTO_DIALOG_HEIGHT_RATIO = 0.88;

export function autoDialogWidth(viewportWidth: number): number {
    return Math.round(Math.min(AUTO_DIALOG_MAX_WIDTH, Math.max(AUTO_DIALOG_MIN_WIDTH, viewportWidth * AUTO_DIALOG_WIDTH_RATIO)));
}

export function quickDialogSizeOf(host: QuickDialogHost): {width: string; height: string} {
    if (host.dialogSizeMode === "fullscreen") return {width: "100vw", height: "100vh"};
    if (host.dialogSizeMode === "fixed") return {width: `${host.dialogFixedSize.width}px`, height: `${host.dialogFixedSize.height}px`};
    if (host.dialogSizeMode === "auto") {
        const width = host.dialogRect?.width ?? autoDialogWidth(window.innerWidth);
        const height = host.dialogRect?.height ?? Math.round(window.innerHeight * AUTO_DIALOG_HEIGHT_RATIO);
        return {width: `${width}px`, height: `${height}px`};
    }
    const scale = Math.min(100, Math.max(50, host.dialogScale)) / 100;
    const width = Math.round(window.innerWidth * scale);
    const height = Math.round(window.innerHeight * scale);
    return {width: `${width}px`, height: `${height}px`};
}

export function toggleQuickDialogFor(host: QuickDialogHost): void {
    if (host.quickDialog) {
        closeQuickDialogFor(host);
        return;
    }
    openQuickDialogFor(host);
}

export function openQuickDialogFor(host: QuickDialogHost): void {
    if (host.disposed || host.disposing) return;
    if (host.quickDialog) {
        host.currentPage = "today";
        host.editingId = undefined;
        host.editingFingerprint = undefined;
        host.render();
        return;
    }

    host.currentPage = "today";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    let dialog: Dialog | undefined;
    const mobile = host.isMobileFrontend;
    const hostClass = mobile ? "lc-checkin-dialog-host lc-checkin-dialog-host--mobile" : "lc-checkin-dialog-host";
    const size = quickDialogSizeOf(host);
    dialog = new Dialog({
        title: "",
        content: `<div class="${hostClass}" role="region" aria-label="小驴打卡快速窗口"></div>`,
        width: mobile ? "100vw" : size.width,
        height: mobile ? "100dvh" : size.height,
        disableAnimation: mobile,
        destroyCallback: () => {
            if (dialog) handleQuickDialogDestroyedFor(host, dialog);
        },
    });
    const root = dialog.element.querySelector<HTMLElement>(".lc-checkin-dialog-host");
    if (!root) {
        dialog.destroy();
        showMessage(t("msg.quickDialogInitFail"));
        return;
    }
    dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("lc-checkin-dialog");
    dialog.element.querySelector<HTMLElement>(".b3-dialog__body")?.classList.add("lc-checkin-dialog__body");
    const dialogBody = dialog.element.querySelector<HTMLElement>(".b3-dialog__body");
    const hostStyle = dialog.element.querySelector<HTMLElement>(".lc-checkin-dialog-host");
    if (dialogBody && hostStyle) {
        dialogBody.style.overflow = "hidden";
        hostStyle.style.height = "100%";
    }
    host.quickDialog = dialog;
    host.quickDialogElement = root;
    host.quickDialogFullscreen = false;
    bindQuickDialogViewportFor(host, dialog);
    bindQuickDialogFrameFor(host, dialog);
    host.renderInto(root);
}

const FRAME_MIN_WIDTH = 520;
const FRAME_MIN_HEIGHT = 400;
const RESIZE_EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type ResizeEdge = typeof RESIZE_EDGES[number];

/* 桌面端把弹窗当窗口对待：标题区拖动、八向手柄缩放、双击标题最大化。
   任意一次拖动/缩放都会切到 "auto" 模式并记住尺寸与位置，符合"调过一次就保持"的桌面直觉。 */
export function bindQuickDialogFrameFor(host: QuickDialogHost, dialog: Dialog): void {
    if (host.isMobileFrontend) return;
    const container = dialog.element.querySelector<HTMLElement>(".b3-dialog__container");
    if (!container) return;
    container.classList.add("lc-checkin-dialog--framed");
    let width = Math.round(container.getBoundingClientRect().width) || autoDialogWidth(window.innerWidth);
    let height = Math.round(container.getBoundingClientRect().height) || Math.round(window.innerHeight * AUTO_DIALOG_HEIGHT_RATIO);
    let offsetX = host.dialogOffset?.x ?? 0;
    let offsetY = host.dialogOffset?.y ?? 0;

    const apply = () => {
        if (host.quickDialog !== dialog) return;
        if (host.quickDialogFullscreen) {
            container.style.width = "";
            container.style.height = "";
            container.style.transform = "";
            return;
        }
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        container.style.transform = offsetX || offsetY ? `translate(${offsetX}px, ${offsetY}px)` : "";
    };
    const persist = () => {
        host.dialogRect = {width: Math.round(width), height: Math.round(height)};
        host.dialogOffset = offsetX || offsetY ? {x: Math.round(offsetX), y: Math.round(offsetY)} : undefined;
        host.dialogSizeMode = "auto";
        void host.persistViewPreferences();
    };
    const maxWidth = () => Math.max(FRAME_MIN_WIDTH, window.innerWidth - 24);
    const maxHeight = () => Math.max(FRAME_MIN_HEIGHT, window.innerHeight - 24);
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    apply();

    let drag: {pointerX: number; pointerY: number; startX: number; startY: number} | undefined;
    const onDragMove = (event: PointerEvent) => {
        if (!drag) return;
        offsetX = Math.round(drag.startX + event.clientX - drag.pointerX);
        offsetY = Math.round(drag.startY + event.clientY - drag.pointerY);
        apply();
    };
    const onDragEnd = () => {
        if (!drag) return;
        drag = undefined;
        window.removeEventListener("pointermove", onDragMove);
        window.removeEventListener("pointerup", onDragEnd);
        window.removeEventListener("pointercancel", onDragEnd);
        persist();
    };
    const header = container.querySelector<HTMLElement>(".lc-checkin__header, .lc-checkin__editor-header, .lc-checkin__settings-header");
    const isInteractive = (target: EventTarget | null) => Boolean((target as HTMLElement | null)?.closest?.("button, input, select, textarea, a, label, [role='button'], [contenteditable='true']"));
    const onHeaderDown = (event: PointerEvent) => {
        if (host.quickDialogFullscreen || event.button !== 0 || isInteractive(event.target)) return;
        drag = {pointerX: event.clientX, pointerY: event.clientY, startX: offsetX, startY: offsetY};
        window.addEventListener("pointermove", onDragMove);
        window.addEventListener("pointerup", onDragEnd);
        window.addEventListener("pointercancel", onDragEnd);
        event.preventDefault();
    };
    const onHeaderDoubleClick = (event: MouseEvent) => {
        if (isInteractive(event.target)) return;
        toggleQuickDialogFullscreenFor(host);
    };
    header?.addEventListener("pointerdown", onHeaderDown);
    header?.addEventListener("dblclick", onHeaderDoubleClick);

    const handles: HTMLElement[] = [];
    const onResizeDown = (edge: ResizeEdge) => (event: PointerEvent) => {
        if (host.quickDialogFullscreen || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const start = {pointerX: event.clientX, pointerY: event.clientY, width, height, offsetX, offsetY};
        const onMove = (move: PointerEvent) => {
            const dx = move.clientX - start.pointerX;
            const dy = move.clientY - start.pointerY;
            if (edge.includes("e")) width = clamp(start.width + dx, FRAME_MIN_WIDTH, maxWidth());
            if (edge.includes("s")) height = clamp(start.height + dy, FRAME_MIN_HEIGHT, maxHeight());
            if (edge.includes("w")) {
                const next = clamp(start.width - dx, FRAME_MIN_WIDTH, maxWidth());
                offsetX = start.offsetX + (start.width - next);
                width = next;
            }
            if (edge.includes("n")) {
                const next = clamp(start.height - dy, FRAME_MIN_HEIGHT, maxHeight());
                offsetY = start.offsetY + (start.height - next);
                height = next;
            }
            apply();
        };
        const onEnd = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onEnd);
            window.removeEventListener("pointercancel", onEnd);
            persist();
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onEnd);
        window.addEventListener("pointercancel", onEnd);
    };
    RESIZE_EDGES.forEach((edge) => {
        const handle = document.createElement("div");
        handle.className = `lc-checkin-dialog__resize-handle is-${edge}`;
        handle.dataset.resizeEdge = edge;
        handle.setAttribute("aria-hidden", "true");
        handle.addEventListener("pointerdown", onResizeDown(edge));
        container.appendChild(handle);
        handles.push(handle);
    });

    /* 全屏切换由其他入口改写 class，这里跟随同步（全屏时交还宿主尺寸控制）。 */
    const observer = new MutationObserver(() => apply());
    observer.observe(container, {attributes: true, attributeFilter: ["class"]});

    host.quickDialogFrameCleanup = () => {
        observer.disconnect();
        header?.removeEventListener("pointerdown", onHeaderDown);
        header?.removeEventListener("dblclick", onHeaderDoubleClick);
        handles.forEach((handle) => handle.remove());
        window.removeEventListener("pointermove", onDragMove);
        window.removeEventListener("pointerup", onDragEnd);
        window.removeEventListener("pointercancel", onDragEnd);
        container.style.transform = "";
    };
}

/** 全屏/还原的唯一实现：按钮与双击标题共用，保证两边尺寸与手柄状态一致。 */
export function toggleQuickDialogFullscreenFor(host: QuickDialogHost, root?: HTMLElement): void {
    const container = host.quickDialog?.element.querySelector<HTMLElement>(".b3-dialog__container");
    if (!container) return;
    host.quickDialogFullscreen = !host.quickDialogFullscreen;
    container.classList.toggle("lc-checkin-dialog--fullscreen", host.quickDialogFullscreen);
    if (root) host.renderInto(root);
}

export function closeQuickDialogFor(host: QuickDialogHost): void {
    const dialog = host.quickDialog;
    if (!dialog) return;
    dialog.destroy();
    // SiYuan currently invokes destroyCallback synchronously; retain a
    // fallback so a future asynchronous implementation cannot leave stale refs.
    handleQuickDialogDestroyedFor(host, dialog);
}

export function handleQuickDialogDestroyedFor(host: QuickDialogHost, dialog: Dialog): void {
    if (host.quickDialog !== dialog) return;
    host.quickDialogViewportCleanup?.();
    host.quickDialogViewportCleanup = undefined;
    host.quickDialogFrameCleanup?.();
    host.quickDialogFrameCleanup = undefined;
    host.quickDialog = undefined;
    host.quickDialogElement = undefined;
    host.quickDialogFullscreen = false;
    if (host.disposed || host.disposing) return;
    host.currentPage = "today";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
    void host.reconcileStore();
}

export function ensureMobileTopBarButtonFor(host: QuickDialogHost): void {
    if (!host.isMobileFrontend || host.disposed || host.disposing) return;
    const topBar = document.getElementById("mobileTopBar") || document.getElementById("toolbar");
    if (!topBar) {
        if (host.mobileTopBarRetryTimer === undefined) {
            host.mobileTopBarRetryTimer = window.setTimeout(() => {
                host.mobileTopBarRetryTimer = undefined;
                ensureMobileTopBarButtonFor(host);
            }, 800);
        }
        return;
    }
    if (host.mobileTopBarButton?.isConnected || topBar.querySelector("#lcCheckinMobileTopBarButton")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "lcCheckinMobileTopBarButton";
    button.className = "toolbar__button";
    button.setAttribute("aria-label", "打开小驴打卡");
    button.setAttribute("title", "打开小驴打卡");
    button.innerHTML = `<svg aria-hidden="true"><use xlink:href="#iconLvCheckin"></use></svg>`;
    button.addEventListener("click", () => toggleQuickDialogFor(host));
    topBar.appendChild(button);
    host.mobileTopBarButton = button;
}

interface SpeedSwitchPluginLike {
    name?: string;
    registerQuickAction: (options: {
        id: string;
        label: string;
        icon?: string;
        value?: string;
        targets?: Array<"desktop" | "sidebar" | "mobile">;
        handler: (value: string) => void | Promise<void>;
    }) => (() => void) | void;
}

/** Register optional launcher actions when 小驴速切 is installed. */
export function ensureSpeedSwitchQuickActionsFor(host: QuickDialogHost): void {
    if (host.disposed || host.disposing || host.speedSwitchQuickActionDisposers.length) return;
    const plugins = (host.app as unknown as {plugins?: unknown} | undefined)?.plugins;
    const candidates = Array.isArray(plugins)
        ? plugins
        : plugins && typeof plugins === "object" ? Object.values(plugins as Record<string, unknown>) : [];
    const speedSwitch = candidates.find((candidate) => {
        if (!candidate || typeof candidate !== "object") return false;
        const plugin = candidate as {name?: unknown; registerQuickAction?: unknown};
        return typeof plugin.registerQuickAction === "function" && (plugin.name === "siyuan-speed-switch" || plugin.name === "小驴速切" || plugin.name === "siyuanSpeedSwitch");
    }) as SpeedSwitchPluginLike | undefined;
    if (!speedSwitch?.registerQuickAction) {
        if (host.speedSwitchRetryTimer === undefined) {
            host.speedSwitchRetryTimer = window.setTimeout(() => {
                host.speedSwitchRetryTimer = undefined;
                ensureSpeedSwitchQuickActionsFor(host);
            }, 1200);
        }
        return;
    }
    const actions: Array<{id: string; label: string; value: string; handler: () => void}> = [
        {id: "xiaolv-checkin-open", label: "打卡", value: "open", handler: () => openQuickDialogFor(host)},
    ];
    actions.forEach((action) => {
        const dispose = speedSwitch.registerQuickAction({
            id: action.id,
            label: action.label,
            icon: "iconLvCheckin",
            value: action.value,
            targets: ["desktop", "sidebar", "mobile"],
            handler: () => action.handler(),
        });
        if (typeof dispose === "function") host.speedSwitchQuickActionDisposers.push(dispose);
    });
}

export function bindQuickDialogViewportFor(host: QuickDialogHost, dialog: Dialog): void {
    if (!host.isMobileFrontend) return;
    const viewport = window.visualViewport;
    const container = dialog.element.querySelector<HTMLElement>(".b3-dialog__container");
    if (!viewport || !container) return;
    let frame = 0;
    const sync = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
            frame = 0;
            if (host.quickDialog !== dialog) return;
            const height = Math.max(280, Math.floor(viewport.height - 16));
            container.style.height = `${height}px`;
            container.style.maxHeight = `${height}px`;
        });
    };
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    sync();
    host.quickDialogViewportCleanup = () => {
        viewport.removeEventListener("resize", sync);
        viewport.removeEventListener("scroll", sync);
        window.removeEventListener("resize", sync);
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
    };
}

export {getFrontend};
