/* 页面导航与回顾/归档控件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindPageNavigationHost 结构化接口声明。 */
import {t} from "../i18n";
import {buildWeeklyReportMarkdown} from "../features/report";
import {buildCustomSummaryContext, buildSummaryContext} from "../analytics";
import {removeEvents, updateEventNote} from "../model";
import {captureActionMoment} from "../shared";
import {showMessage} from "siyuan";

export interface BindPageNavigationHost {
    store: import("../types").CheckinStore;
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";
    insightsItemId?: string;
    insightsReturnPage: "today" | "review";
    historyQuery: string;
    historySource: "all" | "manual" | "tomato" | "import" | "api";
    historyOrder: "newest" | "oldest";
    selectedHistoryDate: string;
    archivedQuery: string;
    summaryRange: "day" | "week" | "month";
    summaryCustomRange?: {startDate: string; endDate: string};
    summaryText?: string;
    summaryRequestId: number;
    editingHistoryNoteId?: string;
    disposed: boolean;
    disposing: boolean;
    bindDialogClose(root: HTMLElement): void;
    bindMobileNav(root: HTMLElement): void;
    showReview(): void;
    showToday(): void;
    showArchived(): void;
    showOccasions(): void;
    showInsights(item?: import("../types").CheckinItem): void;
    render(): void;
    persistViewPreferences(): Promise<void>;
    changeHistoryMonth(offset: number): void;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    persist(): Promise<void>;
    invalidateSummary(): void;
    broadcast(event: unknown): void;
    renderBackgroundUpdate(): void;
    restoreItem(itemId: string): Promise<void>;
    generateSummary(): Promise<void> | void;
    downloadExport(format: "json" | "csv"): void;
    reminderFilter: import("../reminders").ReminderFilter;
}

export function bindPageNavigationHandlers(root: HTMLElement, host: BindPageNavigationHost): void {
    host.bindDialogClose(root);
    host.bindMobileNav(root);
    root.querySelector<HTMLSelectElement>("[data-insight-item]")?.addEventListener("change", (event) => {
        const itemId = (event.currentTarget as HTMLSelectElement).value;
        if (!host.store.items.some((item) => item.id === itemId && !item.archived)) return;
        host.insightsItemId = itemId;
        void host.persistViewPreferences();
        host.render();
    });
    root.querySelector<HTMLSelectElement>("[data-reminder-filter]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "all" || value === "overdue" || value === "today" || value === "upcoming" || value === "completed") {
            host.reminderFilter = value;
            host.render();
        }
    });
    root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => {
        if (host.currentPage === "insights" && host.insightsReturnPage === "review") host.showReview();
        else host.showToday();
    });
    root.querySelector<HTMLElement>("[data-action='archived']")?.addEventListener("click", () => host.showArchived());
    root.querySelector<HTMLElement>("[data-action='occasions']")?.addEventListener("click", () => host.showOccasions());
    root.querySelectorAll<HTMLElement>("[data-review-insights-id]").forEach((button) => button.addEventListener("click", () => {
        const item = host.store.items.find((candidate) => candidate.id === button.dataset.reviewInsightsId && !candidate.archived);
        if (item) host.showInsights(item);
    }));
    root.querySelectorAll<HTMLElement>("[data-history-insights-id]").forEach((button) => button.addEventListener("click", () => {
        const item = host.store.items.find((candidate) => candidate.id === button.dataset.historyInsightsId && !candidate.archived);
        if (item) host.showInsights(item);
    }));
    const historySearch = root.querySelector<HTMLInputElement>("[data-history-search]");
    let historySearchTimer: number | undefined;
    historySearch?.addEventListener("input", () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        const value = historySearch.value;
        historySearchTimer = window.setTimeout(() => {
            if (host.disposed || host.disposing || host.currentPage !== "review") return;
            host.historyQuery = value;
            host.render();
            const nextSearch = root.querySelector<HTMLInputElement>("[data-history-search]");
            nextSearch?.focus();
            nextSearch?.setSelectionRange(value.length, value.length);
        }, 120);
    });
    root.querySelector<HTMLElement>("[data-action='clear-history-query']")?.addEventListener("click", () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        host.historyQuery = "";
        host.render();
        root.querySelector<HTMLInputElement>("[data-history-search]")?.focus();
    });
    root.querySelector<HTMLElement>("[data-action='clear-history-filters']")?.addEventListener("click", () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        host.historyQuery = "";
        host.historySource = "all";
        host.historyOrder = "newest";
        host.render();
        root.querySelector<HTMLInputElement>("[data-history-search]")?.focus();
    });
    root.querySelector<HTMLSelectElement>("[data-history-source]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "all" || value === "manual" || value === "tomato" || value === "import" || value === "api") {
            host.historySource = value;
            host.render();
            root.querySelector<HTMLSelectElement>("[data-history-source]")?.focus();
        }
    });
    root.querySelector<HTMLSelectElement>("[data-history-order]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "newest" || value === "oldest") {
            host.historyOrder = value;
            host.render();
            root.querySelector<HTMLSelectElement>("[data-history-order]")?.focus();
        }
    });
    root.querySelectorAll<HTMLElement>("[data-history-month]").forEach((button) => button.addEventListener("click", () => {
        host.changeHistoryMonth(Number(button.dataset.historyMonth));
    }));
    root.querySelectorAll<HTMLElement>("[data-history-date]").forEach((button) => button.addEventListener("click", () => {
        const value = button.dataset.historyDate;
        if (value) {
            host.selectedHistoryDate = value;
            host.render();
        }
    }));
    root.querySelectorAll<HTMLElement>("[data-history-event-id]").forEach((button) => button.addEventListener("click", () => {
        const eventId = button.dataset.historyEventId;
        const event = host.store.events.find((candidate) => candidate.id === eventId);
        if (!event) return;
        const moment = captureActionMoment();
        void host.enqueueMutation(async () => {
            const previous = host.store;
            const next = removeEvents(host.store, [event], moment.occurredAt);
            if (next === host.store) return;
            host.store = next;
            try { await host.persist(); } catch { host.store = previous; showMessage(t("msg.undoFail")); return; }
            host.invalidateSummary();
            host.broadcast({type: "event-deleted", item: host.store.items.find((item) => item.id === event.itemId), deletedEvents: [event]});
            host.renderBackgroundUpdate();
        });
    }));
    root.querySelectorAll<HTMLElement>("[data-edit-history-event-id]").forEach((button) => button.addEventListener("click", () => {
        const event = host.store.events.find((candidate) => candidate.id === button.dataset.editHistoryEventId);
        if (!event) return;
        host.editingHistoryNoteId = event.id;
        host.render();
    }));
    root.querySelectorAll<HTMLElement>("[data-save-history-note-id]").forEach((button) => button.addEventListener("click", () => {
        const event = host.store.events.find((candidate) => candidate.id === button.dataset.saveHistoryNoteId);
        const input = root.querySelector<HTMLTextAreaElement>(`[data-history-note-input='${button.dataset.saveHistoryNoteId}']`);
        if (!event || !input) return;
        const note = input.value.trim();
        void host.enqueueMutation(async () => {
            const previous = host.store;
            const next = updateEventNote(host.store, event.id, note);
            if (next === host.store) return;
            host.store = next;
            try { await host.persist(); } catch { host.store = previous; showMessage(t("msg.noteSaveFail")); return; }
            host.invalidateSummary();
            host.editingHistoryNoteId = undefined;
            host.renderBackgroundUpdate();
        });
    }));
    const archivedSearch = root.querySelector<HTMLInputElement>("[data-archived-search]");
    let archivedSearchTimer: number | undefined;
    archivedSearch?.addEventListener("input", () => {
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        const value = archivedSearch.value;
        archivedSearchTimer = window.setTimeout(() => {
            if (host.disposed || host.disposing || host.currentPage !== "archived") return;
            host.archivedQuery = value;
            host.render();
            const nextSearch = root.querySelector<HTMLInputElement>("[data-archived-search]");
            nextSearch?.focus();
            nextSearch?.setSelectionRange(value.length, value.length);
        }, 120);
    });
    root.querySelector<HTMLElement>("[data-action='clear-archived-query']")?.addEventListener("click", () => {
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        host.archivedQuery = "";
        host.render();
        root.querySelector<HTMLInputElement>("[data-archived-search]")?.focus();
    });
    root.querySelectorAll<HTMLButtonElement>("[data-restore-id]").forEach((button) => button.addEventListener("click", () => {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        void host.restoreItem(button.dataset.restoreId || "");
    }));
    root.querySelectorAll<HTMLElement>("[data-summary-range]").forEach((button) => button.addEventListener("click", () => {
        const range = button.dataset.summaryRange;
        if (range === "day" || range === "week" || range === "month") {
            host.summaryRange = range;
            host.summaryCustomRange = undefined;
            host.summaryText = undefined;
            host.summaryRequestId += 1;
            host.render();
        }
    }));
    root.querySelector<HTMLElement>("[data-action='generate-summary']")?.addEventListener("click", () => host.generateSummary());
    root.querySelector<HTMLElement>("[data-action='copy-weekly-report']")?.addEventListener("click", async () => {
        const summary = host.summaryCustomRange ? buildCustomSummaryContext(host.store, host.summaryCustomRange) : buildSummaryContext(host.store, host.summaryRange);
        const label = host.summaryRange === "day" ? "今日报告" : host.summaryRange === "month" ? "本月报告" : "本周报告";
        const markdown = buildWeeklyReportMarkdown(summary, `${label}（${summary.startDate} ~ ${summary.endDate}）`);
        try {
            await navigator.clipboard.writeText(markdown);
            showMessage(t("msg.reportCopied"));
        } catch {
            showMessage(t("msg.clipboardFail"));
        }
    });
    root.querySelector<HTMLElement>("[data-action='export-csv']")?.addEventListener("click", () => host.downloadExport("csv"));
    root.querySelector<HTMLElement>("[data-action='export-json']")?.addEventListener("click", () => host.downloadExport("json"));
}
