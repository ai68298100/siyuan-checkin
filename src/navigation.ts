/* 页面导航（surface 切换）：从 index.ts 外置（T-022）。 */
import {t} from "./i18n";
import {openTab, showMessage} from "siyuan";
import type {CheckinItem, CheckinStore} from "./types";
import type {CheckinPageId} from "./features/root-page-store";

export interface NavigationHost {
    store: CheckinStore;
    supportsCustomTab: boolean;
    disposed: boolean;
    disposing: boolean;
    tabOpenPromise?: Promise<void>;
    tabInstance?: {close: () => void};
    app?: unknown;
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";
    editingId?: string;
    editingFingerprint?: string;
    insightsItemId?: string;
    insightsReturnPage: "today" | "review";
    /** T-1599：编辑器单级返回栈——从洞察「编辑规则」等入口进入时记录来源页。 */
    editorReturnPage?: "today" | "review" | "insights";
    summaryRequestId: number;
    summaryRefreshing?: boolean;
    getTabId(): string;
    itemFingerprint(item: CheckinItem): string;
    persistViewPreferences(): Promise<void>;
    openQuickDialog(): void;
    render(): void;
    /* T-1621 步骤一：导航落点与 per-root 读页（root-page-store 代理层）。 */
    applyNavigation(root: HTMLElement | undefined, page: CheckinPageId): void;
    pageOfRoot(root: HTMLElement): CheckinPageId;
}

export function showTodayFor(host: NavigationHost, root?: HTMLElement): void {
    host.summaryRequestId += 1;
    host.summaryRefreshing = false;
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.applyNavigation(root, "today");
    host.render();
}

export function showReviewFor(host: NavigationHost, root?: HTMLElement): void {
    host.applyNavigation(root, "review");
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showArchivedFor(host: NavigationHost, root?: HTMLElement): void {
    host.summaryRefreshing = false;
    host.applyNavigation(root, "archived");
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showOccasionsFor(host: NavigationHost, root?: HTMLElement): void {
    host.summaryRefreshing = false;
    host.applyNavigation(root, "occasions");
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showSettingsFor(host: NavigationHost, root?: HTMLElement): void {
    host.summaryRefreshing = false;
    host.applyNavigation(root, "settings");
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showEditorFor(host: NavigationHost, item?: CheckinItem, returnTo?: NavigationHost["editorReturnPage"], root?: HTMLElement): void {
    host.summaryRefreshing = false;
    host.applyNavigation(root, "editor");
    host.editingId = item?.id;
    host.editingFingerprint = item ? host.itemFingerprint(item) : undefined;
    /* T-1599：单级返回栈——记录来源页（白名单校验，未知/未传回落 today），编辑器返回时回放。 */
    host.editorReturnPage = returnTo === "review" || returnTo === "insights" ? returnTo : "today";
    host.render();
}

/** T-1599：编辑器返回——回放 editorReturnPage（洞察入口回放同一项目），回放后清除。 */
export function showEditorReturnFor(host: NavigationHost, root?: HTMLElement): void {
    const returnPage = host.editorReturnPage ?? "today";
    host.editorReturnPage = undefined;
    if (returnPage === "insights") { showInsightsFor(host, undefined, root); return; }
    if (returnPage === "review") { showReviewFor(host, root); return; }
    showTodayFor(host, root);
}

export function showInsightsFor(host: NavigationHost, item?: CheckinItem, root?: HTMLElement): void {
    const candidate = item || host.store.items.find((entry) => entry.id === host.insightsItemId && !entry.archived) || host.store.items.find((entry) => !entry.archived);
    if (!candidate) return;
    host.summaryRefreshing = false;
    /* T-1621：返回页按发起表面的当前页判定——显式 root 读该 root，全局导航读代理页。 */
    host.insightsReturnPage = (root ? host.pageOfRoot(root) : host.currentPage) === "review" ? "review" : "today";
    host.applyNavigation(root, "insights");
    host.insightsItemId = candidate.id;
    void host.persistViewPreferences();
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function openTabPageFor(host: NavigationHost): void {
    if (!host.supportsCustomTab || host.disposed || host.disposing || host.tabOpenPromise) {
        if (!host.supportsCustomTab) host.openQuickDialog();
        return;
    }
    host.currentPage = "today";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.tabOpenPromise = openTab({
        app: host.app as never,
        custom: {
            id: host.getTabId(),
            icon: "iconLvCheckin",
            title: "小驴打卡",
            data: {page: "today"},
        },
    }).then((tab) => {
        if (host.disposed || host.disposing) {
            tab.close();
        } else {
            host.tabInstance = tab;
        }
    }).catch((error) => {
        showMessage(t("msg.openTabFail", {error: String(error)}));
        host.openQuickDialog();
    }).finally(() => {
        host.tabOpenPromise = undefined;
    });
}
