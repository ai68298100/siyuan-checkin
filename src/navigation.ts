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
    summaryRequestId: number;
    getTabId(): string;
    itemFingerprint(item: CheckinItem): string;
    persistViewPreferences(): Promise<void>;
    openQuickDialog(): void;
    render(): void;
}

export function showTodayFor(host: NavigationHost): void {
    host.summaryRequestId += 1;
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
    host.currentPage = "archived";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showOccasionsFor(host: NavigationHost): void {
    host.currentPage = "occasions";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showSettingsFor(host: NavigationHost): void {
    host.currentPage = "settings";
    host.editingId = undefined;
    host.editingFingerprint = undefined;
    host.render();
}

export function showEditorFor(host: NavigationHost, item?: CheckinItem): void {
    host.currentPage = "editor";
    host.editingId = item?.id;
    host.editingFingerprint = item ? host.itemFingerprint(item) : undefined;
    host.render();
}

export function showInsightsFor(host: NavigationHost, item?: CheckinItem): void {
    const candidate = item || host.store.items.find((entry) => entry.id === host.insightsItemId && !entry.archived) || host.store.items.find((entry) => !entry.archived);
    if (!candidate) return;
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
