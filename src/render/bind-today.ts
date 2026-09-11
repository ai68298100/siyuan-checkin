/* 今日页事件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindTodayHost 结构化接口声明；index.ts 通过
   `bindTodayHandlers(root, this as unknown as BindTodayHost)` 接线。 */
import {t} from "../i18n";
import {getItemRevisionForDate, getEventsForDay} from "../model";
import type {CheckinEvent} from "../types";
import {currentCalendarDate, captureActionMoment, calendarDateFromKey, getRecordStep} from "../shared";
import {isOccasionCompleted} from "../occasions";
import {showMessage} from "siyuan";
import type {FocusAdapter} from "../integrations";
import type {CheckinItem, CheckinItemSortMode, CheckinStore} from "../types";
import type {OccasionStore} from "../occasions";
import type {TodayGroupMode} from "../view-preferences";

export interface BindTodayHost {
    store: CheckinStore;
    occasionStore: OccasionStore;
    insightsReturnPage: "today" | "review";
    todayQuery: string;
    pendingOnly: boolean;
    todayGroupMode: TodayGroupMode;
    todaySortMode: CheckinItemSortMode;
    completedCollapsed: boolean;
    heatmapYearOffset: number;
    collapsedTodayGroups: Set<string>;
    reviewFoldSections: Set<string>;
    focusTimerRoot?: HTMLElement;
    pendingAttachments: Map<string, string>;
    bindDialogClose(root: HTMLElement): void;
    bindItemDrag(root: HTMLElement): void;
    bindQuickKeyboard(root: HTMLElement): void;
    bindBulkMode(root: HTMLElement): void;
    bindFocusTimerPanel(root: HTMLElement): void;
    bindMobileNav(root: HTMLElement): void;
    render(): void;
    persistViewPreferences(): Promise<void>;
    focusTodaySearch(cursor?: number): void;
    undoRecentRecord(): void;
    retrySave(): Promise<void> | void;
    showHistory(): void;
    showArchived(): void;
    showSummary(): void;
    showInsights(item?: CheckinItem): void;
    showOccasions(): void;
    showSettings(): void;
    openTabPage(): void;
    showEditor(item?: CheckinItem): void;
    revisionFingerprint(item: CheckinItem, date: Date): string;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    recordEvent(item: CheckinItem, value: number, moment: {occurredAt: string; localDate: string}, expectedRevisionFingerprint?: string, note?: string, attachment?: string): Promise<unknown>;
    toggleItem(itemId: string, moment: {occurredAt: string; localDate: string}, desiredComplete: boolean, expectedRevisionFingerprint?: string, eventsToUndo?: CheckinEvent[]): Promise<unknown>;
    findFocusAdapter(item: CheckinItem, date?: Date): unknown;
    startFocus(itemId: string): Promise<boolean>;
    openFocusTimer(itemId: string): void;
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean): Promise<boolean>;
}

export function bindTodayHandlers(root: HTMLElement, host: BindTodayHost): void {
    host.bindDialogClose(root);
    host.bindItemDrag(root);
    host.bindQuickKeyboard(root);
    host.bindBulkMode(root);
    host.bindFocusTimerPanel(root);
    root.querySelectorAll<HTMLElement>("[data-streak-insights]").forEach((button) => button.addEventListener("click", () => {
        const item = host.store.items.find((candidate) => candidate.id === button.dataset.streakInsights && !candidate.archived);
        if (item) { host.insightsReturnPage = "today"; host.showInsights(item); }
    }));
    host.bindMobileNav(root);
    const search = root.querySelector<HTMLInputElement>("[data-today-search]");
    let searchTimer: number | undefined;
    search?.addEventListener("input", () => {
        if (searchTimer !== undefined) window.clearTimeout(searchTimer);
        const value = search.value;
        searchTimer = window.setTimeout(() => {
            host.todayQuery = value;
            host.render();
            host.focusTodaySearch(value.length);
        }, 120);
    });
    root.querySelectorAll<HTMLElement>("[data-action='clear-search']").forEach((button) => button.addEventListener("click", () => {
        host.todayQuery = "";
        host.render();
        host.focusTodaySearch();
    }));
    root.querySelector<HTMLElement>("[data-action='undo-record']")?.addEventListener("click", () => host.undoRecentRecord());
    root.querySelector<HTMLElement>("[data-action='retry-save']")?.addEventListener("click", () => {
        void host.retrySave();
    });
    root.querySelectorAll<HTMLElement>("[data-quick-recent]").forEach((button) => button.addEventListener("click", () => {
        const item = host.store.items.find((candidate) => candidate.id === button.dataset.quickRecent && !candidate.archived);
        if (!item) return;
        const date = currentCalendarDate();
        const revision = getItemRevisionForDate(item, date);
        host.enqueueMutation(() => host.recordEvent(item, revision.kind === "binary" ? 1 : getRecordStep(revision.kind, revision.unit), captureActionMoment(), host.revisionFingerprint(item, date)));
    }));
    root.querySelector<HTMLElement>("[data-action='toggle-pending-only']")?.addEventListener("click", () => {
        host.pendingOnly = !host.pendingOnly;
        void host.persistViewPreferences();
        host.render();
    });
    root.querySelector<HTMLElement>("[data-action='history']")?.addEventListener("click", () => host.showHistory());
    root.querySelector<HTMLElement>("[data-action='archived']")?.addEventListener("click", () => host.showArchived());
    root.querySelectorAll<HTMLElement>("[data-heatmap-year]").forEach((button) => button.addEventListener("click", (event) => {
        event.stopPropagation();
        const offset = Number(button.dataset.heatmapYear);
        if (offset === -1) host.heatmapYearOffset -= 1;
        else if (host.heatmapYearOffset < 0) host.heatmapYearOffset += 1;
        host.render();
    }));
    root.querySelectorAll<HTMLDetailsElement>("details[data-review-fold]").forEach((details) => details.addEventListener("toggle", () => {
        const id = details.dataset.reviewFold || "";
        if (details.open) host.reviewFoldSections.add(id);
        else host.reviewFoldSections.delete(id);
        void host.persistViewPreferences();
    }));
    root.querySelector<HTMLElement>("[data-action='summary']")?.addEventListener("click", () => host.showSummary());
    root.querySelector<HTMLElement>("[data-action='insights']")?.addEventListener("click", () => host.showInsights());
    root.querySelectorAll<HTMLElement>("[data-action='occasions']").forEach((button) => button.addEventListener("click", () => host.showOccasions()));

    root.querySelectorAll<HTMLElement>("[data-action='settings']").forEach((button) => button.addEventListener("click", () => host.showSettings()));
    root.querySelector<HTMLElement>("[data-action='open-tab']")?.addEventListener("click", () => host.openTabPage());
    root.querySelector<HTMLSelectElement>("[data-group-mode]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "group" || value === "time" || value === "priority") {
            host.todayGroupMode = value;
            void host.persistViewPreferences();
            host.render();
        }
    });
    root.querySelector<HTMLSelectElement>("[data-sort-mode]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "manual" || value === "priority" || value === "name" || value === "createdAt" || value === "updatedAt") {
            host.todaySortMode = value;
            void host.persistViewPreferences();
            host.render();
        }
    });
    root.querySelector<HTMLElement>("[data-action='toggle-completed']")?.addEventListener("click", () => {
        host.completedCollapsed = !host.completedCollapsed;
        void host.persistViewPreferences();
        host.render();
    });
    root.querySelectorAll<HTMLElement>("[data-group-toggle]").forEach((button) => button.addEventListener("click", () => {
        const key = button.dataset.groupToggle;
        if (!key) return;
        if (host.collapsedTodayGroups.has(key)) host.collapsedTodayGroups.delete(key);
        else host.collapsedTodayGroups.add(key);
        void host.persistViewPreferences();
        host.render();
    }));
    root.querySelectorAll<HTMLElement>("[data-action='add']").forEach((element) => element.addEventListener("click", () => host.showEditor()));
    root.querySelectorAll<HTMLElement>("[data-item-id]").forEach((element) => {
        const itemId = element.dataset.itemId;
        if (!itemId) {
            return;
        }
        element.querySelector<HTMLElement>("[data-action='edit']")?.addEventListener("click", () => {
            const item = host.store.items.find((candidate) => candidate.id === itemId);
            if (item) {
                host.showEditor(item);
            }
        });
        element.querySelector<HTMLElement>("[data-action='insights']")?.addEventListener("click", () => {
            const item = host.store.items.find((candidate) => candidate.id === itemId);
            if (item) host.showInsights(item);
        });
        element.querySelector<HTMLElement>("[data-action='toggle']")?.addEventListener("click", () => {
            const moment = captureActionMoment();
            const desiredComplete = !element.classList.contains("is-complete");
            const item = host.store.items.find((candidate) => candidate.id === itemId);
            const actionDate = calendarDateFromKey(moment.localDate);
            const expectedRevisionFingerprint = item ? host.revisionFingerprint(item, actionDate) : undefined;
            const eventsToUndo = desiredComplete ? [] : getEventsForDay(host.store, itemId, actionDate).map((event) => ({...event}));
            host.enqueueMutation(() => host.toggleItem(itemId, moment, desiredComplete, expectedRevisionFingerprint, eventsToUndo));
        });
        element.querySelector<HTMLElement>("[data-action='focus']")?.addEventListener("click", () => {
            const focusItem = host.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
            if (focusItem && host.findFocusAdapter(focusItem, currentCalendarDate())) void host.startFocus(itemId);
            else {
                host.focusTimerRoot = element.closest(".lc-checkin")?.parentElement ?? undefined;
                host.openFocusTimer(itemId);
            }
        });
        element.querySelector<HTMLElement>("[data-action='quick-record']")?.addEventListener("click", () => {
            const item = host.store.items.find((candidate) => candidate.id === itemId);
            if (!item) return;
            const moment = captureActionMoment();
            const date = calendarDateFromKey(moment.localDate);
            const revision = getItemRevisionForDate(item, date);
            const expectedRevisionFingerprint = host.revisionFingerprint(item, date);
            host.enqueueMutation(() => host.recordEvent(item, getRecordStep(revision.kind, revision.unit), moment, expectedRevisionFingerprint));
        });
        element.querySelector<HTMLElement>("[data-action='toggle-exact']")?.addEventListener("click", (event) => {
            const button = event.currentTarget as HTMLElement;
            const entry = element.querySelector<HTMLElement>("[data-exact-entry]");
            if (!entry) return;
            const expanded = !entry.hidden;
            entry.hidden = expanded;
            button.setAttribute("aria-expanded", String(!expanded));
            if (!expanded) entry.querySelector<HTMLInputElement>("input")?.focus();
        });
        element.querySelector<HTMLInputElement>(".lc-checkin__amount")?.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            element.querySelector<HTMLButtonElement>("[data-action='record']")?.click();
        });
        element.querySelector<HTMLInputElement>("[data-attach-file]")?.addEventListener("change", (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            if (file.size > 500 * 1024) { showMessage(t("msg.photoTooLarge")); input.value = ""; return; }
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result !== "string") return;
                host.pendingAttachments.set(itemId, reader.result);
                const button = element.querySelector<HTMLElement>("[data-attach-button]");
                if (button) { button.classList.add("has-photo"); button.dataset.photo = "1"; }
                showMessage(t("msg.photoAttached"));
            };
            reader.readAsDataURL(file);
        });
        element.querySelector<HTMLElement>("[data-action='record']")?.addEventListener("click", () => {
            const item = host.store.items.find((candidate) => candidate.id === itemId);
            const input = element.querySelector<HTMLInputElement>(".lc-checkin__amount");
            const amount = input ? input.valueAsNumber : 1;
            if (item) {
                const moment = captureActionMoment();
                const revision = getItemRevisionForDate(item, calendarDateFromKey(moment.localDate));
                const expectedRevisionFingerprint = host.revisionFingerprint(item, calendarDateFromKey(moment.localDate));
                if (revision.kind === "binary") {
                    const desiredComplete = !element.classList.contains("is-complete");
                    const eventsToUndo = desiredComplete ? [] : getEventsForDay(host.store, item.id, calendarDateFromKey(moment.localDate)).map((event) => ({...event}));
                    host.enqueueMutation(() => host.toggleItem(item.id, moment, desiredComplete, expectedRevisionFingerprint, eventsToUndo));
                    return;
                }
                if (!Number.isFinite(amount) || amount <= 0) {
                    showMessage(t("msg.valuePositive"));
                    input?.focus();
                    return;
                }
                const note = element.querySelector<HTMLInputElement>(".lc-checkin__record-note")?.value;
                const attachment = host.pendingAttachments.get(itemId);
                host.pendingAttachments.delete(itemId);
                host.enqueueMutation(() => host.recordEvent(item, amount, moment, expectedRevisionFingerprint, note, attachment));
                const attachButton = element.querySelector<HTMLElement>("[data-attach-button]");
                if (attachButton) { attachButton.classList.remove("has-photo"); attachButton.dataset.photo = ""; }
            }
        });
    });
    root.querySelectorAll<HTMLElement>("[data-action='toggle-occasion']").forEach((button) => button.addEventListener("click", () => {
        const row = button.closest<HTMLElement>("[data-occasion-id]");
        const id = row?.dataset.occasionId || "";
        const occurrenceDate = row?.dataset.occasionDate || "";
        const item = host.occasionStore.occasions.find((candidate) => candidate.id === id);
        if (item) void host.enqueueMutation(() => host.setOccasionCompleted(id, occurrenceDate, !isOccasionCompleted(item, occurrenceDate)));
    }));
}
