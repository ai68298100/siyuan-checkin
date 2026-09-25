/* 今日页事件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindTodayHost 结构化接口声明；index.ts 通过
   `bindTodayHandlers(root, this as unknown as BindTodayHost)` 接线。 */
import {t} from "../i18n";
import {getActiveItemById, getItemById, getItemRevisionForDate, getEventsForDay, isSkipEvent} from "../model";
import type {CheckinEvent} from "../types";
import {currentCalendarDate, captureActionMoment, calendarDateFromKey, getRecordStep} from "../shared";
import {isOccasionCompleted} from "../occasions";
import {showMessage} from "siyuan";
import {DOCK_TOMATO_ADAPTER_ID} from "../integrations";
import {inspectDockTomatoProvider, type DockTomatoProviderState} from "../dock-tomato";
import type {CheckinItem, CheckinItemSortMode, CheckinStore} from "../types";
import type {OccasionStore} from "../occasions";
import type {FocusTimerProvider, TodayGroupMode} from "../view-preferences";

export interface BindTodayHost {
    disposed?: boolean;
    disposing?: boolean;
    currentPage?: string;
    store: CheckinStore;
    occasionStore: OccasionStore;
    insightsReturnPage: "today" | "review";
    todayQuery: string;
    pendingOnly: boolean;
    todayGroupMode: TodayGroupMode;
    todaySortMode: CheckinItemSortMode;
    completedCollapsed: boolean;
    priorityReminderExpanded: boolean;
    focusTimerProvider: FocusTimerProvider;
    heatmapYearOffset: number;
    collapsedTodayGroups: Set<string>;
    /** T-1455：展开中的精确录入面板（itemId 列表；会话态，重渲染保持）。 */
    expandedExactEntries: string[];
    reviewFoldSections: Set<string>;
    reviewFoldTouched: boolean;
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
    /** T-1424 用户跳过新手引导（粘性，偏好持久化）。 */
    firstSuccessSkipGuidance(): void;
    /** 手机端打卡成功的短振动（桌面/关闭时为空操作）。 */
    pulseHaptic(): void;
    /** 打卡后焦点归位（T-114）：记录刚操作的打卡项，重渲染后焦点还原到该卡主按钮。 */
    pendingFocusItemId?: string;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    recordEvent(item: CheckinItem, value: number, moment: {occurredAt: string; localDate: string}, expectedRevisionFingerprint?: string, note?: string, attachment?: string): Promise<unknown>;
    toggleItem(itemId: string, moment: {occurredAt: string; localDate: string}, desiredComplete: boolean, expectedRevisionFingerprint?: string, eventsToUndo?: CheckinEvent[]): Promise<unknown>;
    findFocusAdapter(item: CheckinItem, date?: Date, adapterId?: string): unknown;
    startFocus(itemId: string, adapterId?: string): Promise<boolean>;
    openFocusTimer(itemId: string): void;
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean): Promise<boolean>;
}

const DOCK_TOMATO_MESSAGE_KEYS: Record<DockTomatoProviderState, string> = {
    missing: "msg.focusDockMissing",
    "incompatible-version": "msg.focusDockVersion",
    "incomplete-api": "msg.focusDockApi",
    "missing-capabilities": "msg.focusDockCapabilities",
    "not-ready": "msg.focusDockLoading",
    ready: "msg.focusPluginUnavailable",
    running: "msg.focusDockBusy",
    paused: "msg.focusDockPaused",
    error: "msg.focusDockError",
};

export function bindTodayHandlers(root: HTMLElement, host: BindTodayHost): void {
    root.querySelectorAll<HTMLElement>("[data-overview-focus]").forEach((button) => {
        button.addEventListener("click", () => {
            const card = [...root.querySelectorAll<HTMLElement>(".lc-checkin__item[data-item-id]")]
                .find((element) => element.dataset.itemId === button.dataset.overviewFocus);
            card?.querySelector<HTMLButtonElement>("[data-action='focus']")?.click();
        });
    });
    host.bindDialogClose(root);
    host.bindItemDrag(root);
    host.bindQuickKeyboard(root);
    host.bindBulkMode(root);
    host.bindFocusTimerPanel(root);
    root.querySelectorAll<HTMLElement>("[data-streak-insights]").forEach((button) => button.addEventListener("click", () => {
        const item = getActiveItemById(host.store, button.dataset.streakInsights);
        if (item) { host.insightsReturnPage = "today"; host.showInsights(item); }
    }));
    root.querySelectorAll<HTMLElement>("[data-priority-reminder-action]").forEach((button) => button.addEventListener("click", (event) => {
        const reminder = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-priority-reminder]");
        if (!reminder) return;
        const action = event.currentTarget as HTMLElement;
        if (action.dataset.prioritySource === "occasion") {
            host.showOccasions();
            return;
        }
        const item = root.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(action.dataset.priorityId || "")}"]`);
        if (!item) return;
        item.scrollIntoView({behavior: "smooth", block: "center"});
        const primaryAction = item.querySelector<HTMLElement>("[data-action='record'], [data-action='quick-record'], [data-action='toggle']");
        primaryAction?.focus();
    }));
    root.querySelector<HTMLDetailsElement>(".lc-checkin__priority-reminder-more")?.addEventListener("toggle", (event) => {
        host.priorityReminderExpanded = (event.currentTarget as HTMLDetailsElement).open;
    });
    host.bindMobileNav(root);
    const search = root.querySelector<HTMLInputElement>("[data-today-search]");
    let searchTimer: number | undefined;
    let composing = false;
    const cancelSearch = () => {
        if (searchTimer !== undefined) window.clearTimeout(searchTimer);
        searchTimer = undefined;
    };
    const applySearch = () => {
        if (!search) return;
        cancelSearch();
        const value = search.value;
        searchTimer = window.setTimeout(() => {
            searchTimer = undefined;
            if (composing || host.disposed || host.disposing || (host.currentPage && host.currentPage !== "today")
                || !search.isConnected || root.querySelector("[data-today-search]") !== search) return;
            host.todayQuery = value;
            host.render();
            host.focusTodaySearch(value.length);
        }, 120);
    };
    search?.addEventListener("compositionstart", () => { composing = true; cancelSearch(); });
    search?.addEventListener("compositionend", () => { composing = false; applySearch(); });
    search?.addEventListener("input", (event) => {
        if (composing || (event as InputEvent).isComposing) cancelSearch();
        else applySearch();
    });
    root.querySelectorAll<HTMLElement>("[data-action='clear-search']").forEach((button) => button.addEventListener("click", () => {
        cancelSearch();
        host.todayQuery = "";
        host.render();
        host.focusTodaySearch();
    }));
    root.querySelector<HTMLElement>("[data-action='undo-record']")?.addEventListener("click", () => host.undoRecentRecord());
    root.querySelector<HTMLElement>("[data-action='retry-save']")?.addEventListener("click", () => {
        void host.retrySave();
    });
    root.querySelectorAll<HTMLElement>("[data-quick-recent]").forEach((button) => button.addEventListener("click", () => {
        const item = getActiveItemById(host.store, button.dataset.quickRecent);
        if (!item) return;
        const date = currentCalendarDate();
        const revision = getItemRevisionForDate(item, date);
        host.pendingFocusItemId = item.id;
        host.pulseHaptic();
        host.enqueueMutation(() => host.recordEvent(item, revision.kind === "binary" ? 1 : getRecordStep(revision.kind, revision.unit, revision.recordStep), captureActionMoment(), host.revisionFingerprint(item, date)));
    }));
    root.querySelector<HTMLElement>("[data-action='toggle-pending-only']")?.addEventListener("click", () => {
        host.pendingOnly = !host.pendingOnly;
        void host.persistViewPreferences();
        host.render();
    });
    root.querySelector<HTMLElement>("[data-action='history']")?.addEventListener("click", () => host.showHistory());
    root.querySelector<HTMLElement>("[data-action='skip-onboard']")?.addEventListener("click", () => host.firstSuccessSkipGuidance());
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
        host.reviewFoldTouched = true;
        void host.persistViewPreferences();
    }));
    root.querySelector<HTMLElement>("[data-action='summary']")?.addEventListener("click", () => host.showSummary());
    root.querySelector<HTMLElement>("[data-action='insights']")?.addEventListener("click", () => host.showInsights());
    root.querySelectorAll<HTMLElement>("[data-action='occasions']").forEach((button) => button.addEventListener("click", () => host.showOccasions()));

    root.querySelectorAll<HTMLElement>("[data-action='settings']").forEach((button) => button.addEventListener("click", () => host.showSettings()));
    root.querySelector<HTMLElement>("[data-action='open-tab']")?.addEventListener("click", () => host.openTabPage());
    root.querySelector<HTMLSelectElement>("[data-group-mode]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "none" || value === "group" || value === "time" || value === "priority") {
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
    root.querySelector<HTMLElement>("[data-action='toggle-completed']")?.addEventListener("click", (event) => {
        host.completedCollapsed = !host.completedCollapsed;
        const toggle = event.currentTarget as HTMLElement;
        const section = toggle.closest<HTMLElement>(".lc-checkin__completed-section");
        const items = section?.querySelector<HTMLElement>(":scope > .lc-checkin__group-items");
        toggle.setAttribute("aria-expanded", String(!host.completedCollapsed));
        section?.setAttribute("aria-expanded", String(!host.completedCollapsed));
        items?.toggleAttribute("hidden", host.completedCollapsed);
        const chevron = toggle.querySelector<HTMLElement>(".lc-checkin__chevron");
        if (chevron) chevron.textContent = host.completedCollapsed ? "⌄" : "⌃";
        void host.persistViewPreferences();
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
        element.querySelectorAll<HTMLElement>("[data-action='edit'], [data-edit-name]").forEach((button) => button.addEventListener("click", () => {
            const item = getItemById(host.store, itemId);
            if (item) {
                host.showEditor(item);
            }
        }));
        element.querySelector<HTMLElement>("[data-action='insights']")?.addEventListener("click", () => {
            const item = getItemById(host.store, itemId);
            if (item) host.showInsights(item);
        });
        element.querySelector<HTMLElement>("[data-action='toggle']")?.addEventListener("click", () => {
            const moment = captureActionMoment();
            const desiredComplete = !element.classList.contains("is-complete");
            const item = getItemById(host.store, itemId);
            const actionDate = calendarDateFromKey(moment.localDate);
            if (item?.direction === "atMost" && getItemRevisionForDate(item, actionDate).kind === "binary") {
                // The icon and labelled lapse control share note/attachment,
                // snapshot undo and duplicate-submit behavior.
                element.querySelector<HTMLElement>(".lc-checkin__item-action > [data-action='record']")?.click();
                return;
            }
            const expectedRevisionFingerprint = item ? host.revisionFingerprint(item, actionDate) : undefined;
            const eventsToUndo = desiredComplete ? [] : getEventsForDay(host.store, itemId, actionDate).map((event) => ({...event}));
            host.enqueueMutation(() => host.toggleItem(itemId, moment, desiredComplete, expectedRevisionFingerprint, eventsToUndo));
        });
        element.querySelector<HTMLElement>("[data-action='focus']")?.addEventListener("click", () => {
            const focusItem = getActiveItemById(host.store, itemId);
            if (!focusItem) return;
            /* 戒除类（atMost）不参与专注自动打卡：专注计时完成即记账，会把专注转换成破戒记录。
               记录真实破戒请使用「记破戒」按钮（PR #5 评审第五节）。 */
            if (focusItem.direction === "atMost") {
                showMessage(t("msg.focusAtMostUnsupported"));
                return;
            }
            if (host.focusTimerProvider === "docktomato" || focusItem.completionSource === "tomato") {
                if (!host.findFocusAdapter(focusItem, currentCalendarDate(), DOCK_TOMATO_ADAPTER_ID)) {
                    showMessage(t(DOCK_TOMATO_MESSAGE_KEYS[inspectDockTomatoProvider().state]));
                    return;
                }
                void host.startFocus(itemId, DOCK_TOMATO_ADAPTER_ID);
                return;
            }
            host.focusTimerRoot = element.closest(".lc-checkin")?.parentElement ?? undefined;
            host.openFocusTimer(itemId);
        });
        element.querySelector<HTMLElement>("[data-action='quick-record']")?.addEventListener("click", (event) => {
            const item = getItemById(host.store, itemId);
            if (!item) return;
            const moment = captureActionMoment();
            const date = calendarDateFromKey(moment.localDate);
            const revision = getItemRevisionForDate(item, date);
            const expectedRevisionFingerprint = host.revisionFingerprint(item, date);
            host.pendingFocusItemId = item.id;
            host.pulseHaptic();
            /* T-1462：chips 各自携带 data-amount；主步长按钮的 data-amount 与重算值等价，缺失/非法时回落重算。 */
            const amountValue = Number((event.currentTarget as HTMLElement).dataset.amount);
            const amount = Number.isFinite(amountValue) && amountValue > 0
                ? amountValue
                : getRecordStep(revision.kind, revision.unit, revision.recordStep);
            host.enqueueMutation(() => host.recordEvent(item, amount, moment, expectedRevisionFingerprint));
        });
        element.querySelector<HTMLElement>("[data-action='toggle-exact']")?.addEventListener("click", (event) => {
            const button = event.currentTarget as HTMLElement;
            const entry = element.querySelector<HTMLElement>("[data-exact-entry]");
            if (!entry) return;
            const expanded = !entry.hidden;
            entry.hidden = expanded;
            button.setAttribute("aria-expanded", String(!expanded));
            /* T-1455：展开状态同步进会话态——后台/完整重渲染按同一状态重建，不再收起。 */
            const idSet = new Set(host.expandedExactEntries);
            if (expanded) idSet.delete(element.dataset.itemId || "");
            else if (element.dataset.itemId) idSet.add(element.dataset.itemId);
            host.expandedExactEntries = [...idSet];
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
        element.querySelectorAll<HTMLElement>("[data-action='record']").forEach((button) => button.addEventListener("click", () => {
            const item = getItemById(host.store, itemId);
            const input = element.querySelector<HTMLInputElement>(".lc-checkin__amount");
            const amount = input ? input.valueAsNumber : 1;
            if (item) {
                const moment = captureActionMoment();
                const revision = getItemRevisionForDate(item, calendarDateFromKey(moment.localDate));
                const expectedRevisionFingerprint = host.revisionFingerprint(item, calendarDateFromKey(moment.localDate));
                const recordWithDetails = (value: number): void => {
                    const note = element.querySelector<HTMLInputElement>(".lc-checkin__record-note")?.value;
                    const attachment = host.pendingAttachments.get(itemId);
                    host.pendingAttachments.delete(itemId);
                    host.pendingFocusItemId = item.id;
                    host.pulseHaptic();
                    host.enqueueMutation(() => host.recordEvent(item, value, moment, expectedRevisionFingerprint, note, attachment));
                    const attachButton = element.querySelector<HTMLElement>("[data-attach-button]");
                    if (attachButton) { attachButton.classList.remove("has-photo"); attachButton.dataset.photo = ""; }
                    /* T-1455：录完即收起面板并交还焦点——否则输入挂起策略会吞掉打卡后
                       的界面刷新（Enter 保存场景），条目看起来没变。 */
                    host.expandedExactEntries = host.expandedExactEntries.filter((id) => id !== item.id);
                    const exactEntry = element.querySelector<HTMLElement>("[data-exact-entry]");
                    if (exactEntry) exactEntry.hidden = true;
                    const trigger = element.querySelector<HTMLElement>("[data-action='toggle-exact']");
                    if (trigger) trigger.setAttribute("aria-expanded", "false");
                    const active = (element.ownerDocument?.activeElement ?? null) as HTMLElement | null;
                    active?.blur?.();
                };
                if (revision.kind === "binary") {
                    /* T-1239（D-219）：at-most 反转——无破戒时点击记录破戒；已破戒时点击撤销。 */
                    if (item.direction === "atMost") {
                        const lapseEvents = getEventsForDay(host.store, item.id, calendarDateFromKey(moment.localDate))
                            .filter((event) => !isSkipEvent(event))
                            .map((event) => ({...event}));
                        if (button.closest("[data-exact-entry]") || lapseEvents.length === 0) {
                            recordWithDetails(1);
                            return;
                        }
                        host.pendingFocusItemId = item.id;
                        host.pulseHaptic();
                        host.enqueueMutation(() => host.toggleItem(item.id, moment, false, expectedRevisionFingerprint, lapseEvents));
                        return;
                    }
                    /* The expanded submit action always records; it must not
                       become Undo after a queued completion updates this card.
                       recordEvent keeps the existing binary duplicate guard. */
                    const desiredComplete = Boolean(button.closest("[data-exact-entry]")) || !element.classList.contains("is-complete");
                    if (desiredComplete && revision.schedule.type !== "quota") {
                        recordWithDetails(1);
                        return;
                    }
                    const eventsToUndo = desiredComplete ? [] : getEventsForDay(host.store, item.id, calendarDateFromKey(moment.localDate)).map((event) => ({...event}));
                    host.pendingFocusItemId = item.id;
                    host.pulseHaptic();
                    host.enqueueMutation(() => host.toggleItem(item.id, moment, desiredComplete, expectedRevisionFingerprint, eventsToUndo));
                    return;
                }
                if (!Number.isFinite(amount) || amount <= 0) {
                    showMessage(t("msg.valuePositive"));
                    input?.focus();
                    return;
                }
                recordWithDetails(amount);
            }
        }));
    });
    root.querySelectorAll<HTMLElement>("[data-action='toggle-occasion']").forEach((button) => button.addEventListener("click", () => {
        const row = button.closest<HTMLElement>("[data-occasion-id]") || button;
        const id = row?.dataset.occasionId || "";
        const occurrenceDate = row?.dataset.occasionDate || "";
        const item = host.occasionStore.occasions.find((candidate) => candidate.id === id);
        if (item) void host.enqueueMutation(() => host.setOccasionCompleted(id, occurrenceDate, !isOccasionCompleted(item, occurrenceDate)));
    }));
}
