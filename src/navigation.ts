/* 页面导航（surface 切换）：从 index.ts 外置（T-022）。 */
import {t} from "./i18n";
import {sanitizeDiagnosticDetail} from "./features/diagnostics";
import {openTab, showMessage} from "siyuan";
import type {CheckinItem, CheckinStore, PageId, EditorRootContext, InsightsRootContext} from "./types";
import type {CheckinPageId} from "./features/root-page-store";

export interface NavigationHost {
    store: CheckinStore;
    supportsCustomTab: boolean;
    disposed: boolean;
    disposing: boolean;
    tabOpenPromise?: Promise<void>;
    tabInstance?: {close: () => void};
    tabElement?: HTMLElement;
    app?: unknown;
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings" | "more";
    editingId?: string;
    editingFingerprint?: string;
    insightsItemId?: string;
    insightsReturnPage: "today" | "review";
    /** T-1599：编辑器单级返回栈——从洞察「编辑规则」等入口进入时记录来源页。 */
    editorReturnPage?: "today" | "review" | "insights" | "more";
    summaryRequestId: number;
    summaryRefreshing?: boolean;
    cancelReviewSummary?(root?: HTMLElement): void;
    getTabId(): string;
    itemFingerprint(item: CheckinItem): string;
    persistViewPreferences(): Promise<void>;
    openQuickDialog(): void;
    render(root?: HTMLElement): void;
    setPageForRoot?(page: PageId, root?: HTMLElement): void;
    /** 详情页之间跳转时保留发起页，供归档页返回使用。 */
    setReturnPageForRoot?(root: HTMLElement | undefined, page: "today" | "review" | "insights" | "more"): void;
    returnPageForRoot?(root: HTMLElement): "today" | "review" | "insights" | "more" | undefined;
    applyNavigation(root: HTMLElement | undefined, page: CheckinPageId): boolean;
    pageForRoot?(root: HTMLElement): PageId;
    pageOfRoot(root: HTMLElement): CheckinPageId;
    insightsStateForRoot?(root: HTMLElement): InsightsRootContext;
    setInsightsStateForRoot?(root: HTMLElement | undefined, patch: Partial<InsightsRootContext>): void;
    editorStateForRoot?(root: HTMLElement): EditorRootContext;
    setEditorStateForRoot?(root: HTMLElement | undefined, patch: Partial<EditorRootContext>, replace?: boolean): void;
}

function safeNavigationErrorDetail(error: unknown): string {
    const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
    return sanitizeDiagnosticDetail(raw) || t("common.unknownError");
}

function setEditor(host: NavigationHost, root: HTMLElement | undefined, patch: Partial<EditorRootContext>, replace = false): void {
    if (host.setEditorStateForRoot) host.setEditorStateForRoot(root, patch, replace);
    else Object.assign(host, patch);
}

function clearEditor(host: NavigationHost, root?: HTMLElement): void {
    setEditor(host, root, {editingId: undefined, editingFingerprint: undefined, editorReturnPage: undefined, appliedTemplateNote: undefined, pendingProjectDraft: undefined, templateImportSession: undefined, submitting: false, draft: undefined}, true);
}

function setPage(host: NavigationHost, page: PageId, root?: HTMLElement): boolean {
    /* T-1621：主线 per-root 导航含编辑器离开确认；旧宿主回落到 rootContexts 代理。 */
    if (host.applyNavigation) return host.applyNavigation(root, page);
    if (host.setPageForRoot) host.setPageForRoot(page, root);
    else host.currentPage = page;
    return true;
}

function cancelSummary(host: NavigationHost, root?: HTMLElement): void {
    if (host.cancelReviewSummary) host.cancelReviewSummary(root);
    else {
        host.summaryRequestId += 1;
        host.summaryRefreshing = false;
    }
}

export function showTodayFor(host: NavigationHost, root?: HTMLElement): void {
    if (!setPage(host, "today", root)) return;
    cancelSummary(host, root);
    clearEditor(host, root);
    host.render(root);
}

export function showReviewFor(host: NavigationHost, root?: HTMLElement): void {
    if (!setPage(host, "review", root)) return;
    clearEditor(host, root);
    host.render(root);
}

export function showArchivedFor(host: NavigationHost, root?: HTMLElement): void {
    const sourcePage = root && host.pageForRoot ? host.pageForRoot(root) : host.currentPage;
    if (!setPage(host, "archived", root)) return;
    const returnPage = sourcePage === "review" || sourcePage === "insights" || sourcePage === "more" ? sourcePage : "today";
    host.setReturnPageForRoot?.(root, returnPage);
    cancelSummary(host, root);
    clearEditor(host, root);
    host.render(root);
}

export function showOccasionsFor(host: NavigationHost, root?: HTMLElement): void {
    if (!setPage(host, "occasions", root)) return;
    cancelSummary(host, root);
    clearEditor(host, root);
    host.render(root);
}

export function showSettingsFor(host: NavigationHost, root?: HTMLElement): void {
    if (!setPage(host, "settings", root)) return;
    cancelSummary(host, root);
    clearEditor(host, root);
    host.render(root);
}

export function showMoreFor(host: NavigationHost, root?: HTMLElement): void {
    if (!setPage(host, "more", root)) return;
    cancelSummary(host, root);
    clearEditor(host, root);
    host.render(root);
}

export function showEditorFor(host: NavigationHost, item?: CheckinItem, returnTo?: NavigationHost["editorReturnPage"], root?: HTMLElement): void {
    cancelSummary(host, root);
    if (!setPage(host, "editor", root)) return;
    /* T-1599：单级返回栈——记录来源页（白名单校验，未知/未传回落 today），编辑器返回时回放。 */
    setEditor(host, root, {editingId: item?.id, editingFingerprint: item ? host.itemFingerprint(item) : undefined,
        editorReturnPage: returnTo === "review" || returnTo === "insights" || returnTo === "more" ? returnTo : "today", appliedTemplateNote: undefined, pendingProjectDraft: undefined, templateImportSession: undefined, submitting: false}, true);
    host.render(root);
}

/** T-1599：编辑器返回——回放 editorReturnPage（洞察入口回放同一项目），回放后清除。 */
export function showEditorReturnFor(host: NavigationHost, root?: HTMLElement): void {
    const returnPage = (root && host.editorStateForRoot ? host.editorStateForRoot(root).editorReturnPage : host.editorReturnPage) ?? "today";
    if (returnPage === "insights") { showInsightsFor(host, undefined, root); return; }
    if (returnPage === "more") { showMoreFor(host, root); return; }
    if (returnPage === "review") { showReviewFor(host, root); return; }
    showTodayFor(host, root);
}

export function showInsightsFor(host: NavigationHost, item?: CheckinItem, root?: HTMLElement): void {
    const insights = root ? host.insightsStateForRoot?.(root) : undefined;
    const candidate = item || host.store.items.find((entry) => entry.id === (insights ? insights.insightsItemId : host.insightsItemId)) || host.store.items.find((entry) => !entry.archived);
    if (!candidate) return;
    cancelSummary(host, root);
    const currentPage = root && host.pageForRoot ? host.pageForRoot(root) : host.currentPage;
    const returnPage = currentPage === "review" ? "review"
        : currentPage === "editor" || currentPage === "insights" || currentPage === "archived"
            ? insights?.insightsReturnPage ?? host.insightsReturnPage : "today";
    if (!setPage(host, "insights", root)) return;
    if (host.setInsightsStateForRoot) host.setInsightsStateForRoot(root, {insightsReturnPage: returnPage, insightsItemId: candidate.id});
    else {
        host.insightsReturnPage = returnPage;
        host.insightsItemId = candidate.id;
    }
    void host.persistViewPreferences();
    clearEditor(host, root);
    host.render(root);
}

export function openTabPageFor(host: NavigationHost): void {
    if (!host.supportsCustomTab || host.disposed || host.disposing || host.tabOpenPromise) {
        if (!host.supportsCustomTab) host.openQuickDialog();
        return;
    }
    if (host.tabElement) showTodayFor(host, host.tabElement);
    else if (!host.setPageForRoot) {
        host.currentPage = "today";
        host.editingId = undefined;
        host.editingFingerprint = undefined;
    }
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
        if (host.disposed || host.disposing) return;
        showMessage(t("msg.openTabFail", {error: safeNavigationErrorDetail(error)}));
        host.openQuickDialog();
    }).finally(() => {
        host.tabOpenPromise = undefined;
    });
}
