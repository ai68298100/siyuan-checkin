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
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";
    editingId?: string;
    editingFingerprint?: string;
    quickDialog?: Dialog;
    quickDialogElement?: HTMLElement;
    quickDialogFullscreen: boolean;
    quickDialogViewportCleanup?: () => void;
    mobileTopBarButton?: HTMLElement;
    mobileTopBarRetryTimer?: number;
    speedSwitchQuickActionDisposers: Array<() => void>;
    speedSwitchRetryTimer?: number;
    app?: unknown;
    render(): void;
    renderInto(root: HTMLElement): void;
    reconcileStore(): Promise<void>;
}

export function quickDialogSizeOf(host: QuickDialogHost): {width: string; height: string} {
    if (host.dialogSizeMode === "fullscreen") return {width: "100vw", height: "100vh"};
    if (host.dialogSizeMode === "fixed") return {width: `${host.dialogFixedSize.width}px`, height: `${host.dialogFixedSize.height}px`};
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
    host.renderInto(root);
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
