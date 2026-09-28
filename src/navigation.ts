/* 页面导航（surface 切换）：从 index.ts 外置（T-022）。 */
import {t} from "./i18n";
import {openTab, showMessage} from "siyuan";
import type {CheckinItem, CheckinStore} from "./types";

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
}

export function showTodayFor(host: NavigationHost): void {
    host.summaryRequestId += 1;
    host.summaryRefreshing = false;
    host.currentPage = "today";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showReviewFor(host: NavigationHost): void {
    host.currentPage = "review";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showArchivedFor(host: NavigationHost): void {
    host.summaryRefreshing = false;
    host.currentPage = "archived";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showOccasionsFor(host: NavigationHost): void {
    host.summaryRefreshing = false;
    host.currentPage = "occasions";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showSettingsFor(host: NavigationHost): void {
    host.summaryRefreshing = false;
    host.currentPage = "settings";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showEditorFor(host: NavigationHost, item?: CheckinItem, returnTo?: NavigationHost["editorReturnPage"]): void {
    host.summaryRefreshing = false;
    host.currentPage = "editor";
    host.editingId = item?.id;
    host.editingFingerprint = item ? host.itemFingerprint(item) : undefined;
    /* T-1599：单级返回栈——记录来源页（白名单校验，未知/未传回落 today），编辑器返回时回放。 */
    host.editorReturnPage = returnTo === "review" || returnTo === "insights" ? returnTo : "today";
    host.render();
}

/** T-1599：编辑器返回——回放 editorReturnPage（洞察入口回放同一项目），回放后清除。 */
export function showEditorReturnFor(host: NavigationHost): void {
    const returnPage = host.editorReturnPage ?? "today";
    host.editorReturnPage = undefined;
    if (returnPage === "insights") { showInsightsFor(host); return; }
    if (returnPage === "review") { showReviewFor(host); return; }
    showTodayFor(host);
}

export function showInsightsFor(host: NavigationHost, item?: CheckinItem): void {
    const candidate = item || host.store.items.find((entry) => entry.id === host.insightsItemId && !entry.archived) || host.store.items.find((entry) => !entry.archived);
    if (!candidate) return;
    host.summaryRefreshing = false;
    host.insightsReturnPage = host.currentPage === "review" ? "review" : "today";
    host.currentPage = "insights";
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
