/* 插件零散操作：从 index.ts 外置（T-022）。
   含后台渲染、今日快捷项、导航绑定、月份切换、项目恢复、导出、搜索聚焦、同步提示与就绪结算。 */
import {t} from "./i18n";
import {dateKey, getEventDateKey, isItemAvailableOnDate, isScheduledToday, normalizeItem as normalizeCheckinItem, makeId, sortCheckinItems} from "./model";
import {serializeCsv, serializeJson} from "./export";
import {currentCalendarDate, captureActionMoment} from "./shared";
import {showMessage} from "siyuan";
import type {CheckinEvent, CheckinItem, CheckinStore} from "./types";

export interface PluginOpsHost {
    store: CheckinStore;
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";
    disposed: boolean;
    disposing: boolean;
    dockElement?: HTMLElement;
    tabElement?: HTMLElement;
    quickDialogElement?: HTMLElement;
    quickDialog?: {element: HTMLElement} | undefined;
    quickDialogFullscreen: boolean;
    historyMonth: Date;
    selectedHistoryDate: string;
    syncNoticeTimer?: number;
    lastExportAt?: string;
    summaryRequestId: number;
    summaryText?: string;
    readyResolver?: (ready: boolean) => void;
    render(): void;
    renderInto(root: HTMLElement): void;
    renderBackgroundUpdate(): void;
    closeQuickDialog(): void;
    showToday(): void;
    showReview(): void;
    showInsights(item?: CheckinItem): void;
    showArchived(): void;
    showOccasions(): void;
    showSettings(): void;
    showEditor(item?: CheckinItem): void;
    persistViewPreferences(): Promise<void>;
    cloneStore(store?: CheckinStore): CheckinStore;
    itemFingerprint(item: CheckinItem): string;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    setItemArchived(itemId: string, archived: boolean, moment: {occurredAt: string; localDate: string}, expectedFingerprint?: string): Promise<boolean>;
}

export function renderBackgroundUpdateFor(host: PluginOpsHost): void {
    if (host.currentPage !== "editor") {
        host.render();
    }
}

export function getQuickTodayItems(store: CheckinStore): CheckinItem[] {
    const date = currentCalendarDate();
    return sortCheckinItems(store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, date) && isScheduledToday(item, date)), "priority");
}

export function bindDialogCloseFor(host: PluginOpsHost, root: HTMLElement): void {
    root.querySelector<HTMLElement>("[data-action='close-dialog']")?.addEventListener("click", () => host.closeQuickDialog());
    root.querySelector<HTMLElement>("[data-action='toggle-fullscreen']")?.addEventListener("click", () => {
        const container = host.quickDialog?.element.querySelector<HTMLElement>(".b3-dialog__container");
        if (!container) return;
        host.quickDialogFullscreen = !host.quickDialogFullscreen;
        container.classList.toggle("lc-checkin-dialog--fullscreen", host.quickDialogFullscreen);
        host.renderInto(root);
    });
}

export function bindMobileNavFor(host: PluginOpsHost, root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>("[data-mobile-nav]").forEach((button) => button.addEventListener("click", () => {
        const page = button.dataset.mobileNav;
        if (page === "today") host.showToday();
        else if (page === "review" || page === "history" || page === "summary") host.showReview();
        else if (page === "insights") host.showInsights();
        else if (page === "archived") host.showArchived();
        else if (page === "occasions") host.showOccasions();
        else if (page === "settings") host.showSettings();
        else if (page === "add") host.showEditor();
    }));
}

export function changeHistoryMonthFor(host: PluginOpsHost, offset: number): void {
    if (!Number.isInteger(offset) || !offset) {
        return;
    }
    const candidate = new Date(host.historyMonth.getFullYear(), host.historyMonth.getMonth() + offset, 1);
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (candidate > currentMonth) {
        return;
    }
    host.historyMonth = candidate;
    const prefix = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, "0")}-`;
    const latestRecordedDay = host.store.events.map(getEventDateKey).filter((key) => key.startsWith(prefix)).sort().reverse()[0];
    host.selectedHistoryDate = candidate.getTime() === currentMonth.getTime() ? dateKey(new Date()) : latestRecordedDay || dateKey(candidate);
    host.render();
}

export async function restoreItemFor(host: PluginOpsHost, itemId: string): Promise<void> {
    const moment = captureActionMoment();
    const expectedItem = host.store.items.find((item) => item.id === itemId);
    const expectedFingerprint = expectedItem ? host.itemFingerprint(expectedItem) : undefined;
    let restored = false;
    await host.enqueueMutation(async () => { restored = await host.setItemArchived(itemId, false, moment, expectedFingerprint); });
    if (restored && expectedItem) showMessage(t("msg.restoredNamed", {name: expectedItem.name}));
}

export function downloadExportFor(host: PluginOpsHost, format: "json" | "csv"): void {
    host.lastExportAt = new Date().toISOString();
    void host.persistViewPreferences();
    const content = format === "json" ? serializeJson(host.cloneStore()) : serializeCsv(host.cloneStore());
    const blob = new Blob([content], {type: format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `siyuan-checkin-${dateKey(new Date())}.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function focusTodaySearchFor(host: PluginOpsHost, selection?: number): void {
    window.setTimeout(() => {
        const roots = [host.dockElement, host.tabElement, host.quickDialogElement].filter((element): element is HTMLElement => Boolean(element));
        const input = roots.map((element) => element.querySelector<HTMLInputElement>("[data-today-search]")).find((candidate): candidate is HTMLInputElement => Boolean(candidate));
        input?.focus();
        if (selection !== undefined) input?.setSelectionRange(selection, selection);
    }, 0);
}

export function showSyncNoticeFor(host: PluginOpsHost): void {
    if (host.disposed || host.disposing) return;
    if (host.syncNoticeTimer !== undefined) window.clearTimeout(host.syncNoticeTimer);
    host.syncNoticeTimer = window.setTimeout(() => {
        host.syncNoticeTimer = undefined;
        if (!host.disposed && !host.disposing) host.renderBackgroundUpdate();
    }, 4200);
}

export function settleReadyFor(host: PluginOpsHost, ready: boolean): void {
    host.readyResolver?.(ready);
    host.readyResolver = undefined;
}

export function invalidateSummaryFor(host: PluginOpsHost): void {
    host.summaryRequestId += 1;
    host.summaryText = undefined;
}

/** CSV 行导入：返回新 store 与统计，不直接改动宿主引用。 */
export function importCsvRowsInto(store: CheckinStore, rows: Array<{name: string; date: string; value: number; unit: string; binary: boolean}>): {store: CheckinStore; itemsCreated: number; eventsCreated: number; duplicates: number} {
    const byName = new Map<string, CheckinItem>();
    let itemsCreated = 0;
    const now = new Date().toISOString();
    const today = dateKey(new Date());
    const resolveItem = (name: string, unit: string, binary: boolean): CheckinItem => {
        const existing = byName.get(name) || store.items.find((candidate) => !candidate.archived && candidate.name === name);
        if (existing) return existing;
        const created = normalizeCheckinItem({
            id: makeId("item"),
            name,
            icon: "✓",
            kind: binary ? "binary" : "count",
            target: 1,
            unit: binary ? "次" : unit,
            schedule: {type: "daily"},
            createdDate: today,
            createdAt: now,
            updatedAt: now,
        })!;
        byName.set(name, created);
        itemsCreated += 1;
        return created;
    };
    const resolved: CheckinItem[] = [];
    const events: CheckinEvent[] = [];
    let eventsCreated = 0;
    let duplicates = 0;
    for (const row of rows) {
        const item = resolveItem(row.name, row.unit, row.binary);
        resolved.push(item);
        const date = row.date;
        const duplicate = store.events.some((event) => event.itemId === item.id && event.localDate === date && event.value === row.value && event.unit === row.unit)
            || events.some((event) => event.itemId === item.id && event.localDate === date && event.value === row.value && event.unit === row.unit);
        if (duplicate) { duplicates += 1; continue; }
        events.push({
            id: makeId("event"),
            itemId: item.id,
            occurredAt: new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12, 0).toISOString(),
            localDate: date,
            value: row.value,
            unit: row.unit || item.unit,
            source: "import",
        });
        eventsCreated += 1;
    }
    const items = [...store.items, ...resolved.filter((item) => !store.items.some((existing) => existing.id === item.id))];
    return {
        store: {...store, items, events: [...store.events, ...events]},
        itemsCreated,
        eventsCreated,
        duplicates,
    };
}
