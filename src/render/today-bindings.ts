/* 今日页三个小绑定器：快捷数字键（8.6）、批量模式（6.0 P1）、拖拽排序（6.0 P0）。
   从 index.ts 外置（T-022 可选收尾）；宿主成员经 TodayBindingsHost 结构化接口声明，
   index.ts 以薄壳委托 `bindQuickKeyboardFor(this as unknown as TodayBindingsHost, root)` 接线。 */
import {evaluateRule} from "../rules";
import {getItemRevisionForDate, isComplete, isItemAvailableOnDate, isScheduledToday, dateKey} from "../model";
import {getQuickTodayItems} from "../plugin-ops";
import {calendarDateFromKey, captureActionMoment, currentCalendarDate, getRecordStep} from "../shared";
import type {ActionMoment} from "../shared";
import type {CheckinItem, CheckinItemSortMode, CheckinStore} from "../types";

export interface TodayBindingsHost {
    currentPage: string;
    store: CheckinStore;
    bulkMode: boolean;
    bulkSelected: Set<string>;
    todaySortMode: CheckinItemSortMode;
    itemFingerprint(item: CheckinItem): string;
    revisionFingerprint(item: CheckinItem, date: Date): string;
    reorderItems(orderedIds: string[]): Promise<boolean>;
    setItemArchived(itemId: string, archived: boolean, moment: ActionMoment, expectedFingerprint?: string): Promise<boolean>;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    recordEvent(item: CheckinItem, value: number, moment: {occurredAt: string; localDate: string}, expectedRevisionFingerprint?: string, note?: string, attachment?: string): Promise<unknown>;
    render(): void;
}

/* Alt+1~9 直达今日页前九项打卡。 */
export function bindQuickKeyboardFor(host: TodayBindingsHost, root: HTMLElement): void {
    if (root.dataset.quickKeyboardBound === "true") return;
    root.dataset.quickKeyboardBound = "true";
    root.addEventListener("keydown", (event) => {
        if (host.currentPage !== "today") return;
        if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const target = event.target as HTMLElement | null;
        if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
        const index = Number(event.key) - 1;
        if (!Number.isInteger(index) || index < 0 || index > 8) return;
        const item = getQuickTodayItems(host.store)[index];
        if (!item) return;
        event.preventDefault();
        const date = calendarDateFromKey(dateKey(currentCalendarDate()));
        const revision = getItemRevisionForDate(item, date);
        void host.enqueueMutation(() => host.recordEvent(item, revision.kind === "binary" ? 1 : getRecordStep(revision.kind, revision.unit), captureActionMoment(), host.revisionFingerprint(item, date)));
    });
}

/* 批量多选后一键完成/归档。 */
export function bindBulkModeFor(host: TodayBindingsHost, root: HTMLElement): void {
    root.querySelector<HTMLElement>("[data-action='toggle-bulk']")?.addEventListener("click", () => {
        host.bulkMode = !host.bulkMode;
        host.bulkSelected.clear();
        host.render();
    });
    root.querySelector<HTMLElement>("[data-action='bulk-exit']")?.addEventListener("click", () => {
        host.bulkMode = false;
        host.bulkSelected.clear();
        host.render();
    });
    root.querySelectorAll<HTMLElement>("[data-bulk-check]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.bulkCheck || "";
        if (!id) return;
        if (host.bulkSelected.has(id)) host.bulkSelected.delete(id);
        else host.bulkSelected.add(id);
        host.render();
    }));
    root.querySelector<HTMLElement>("[data-action='bulk-all']")?.addEventListener("click", () => {
        const date = currentCalendarDate();
        for (const item of host.store.items) {
            if (item.archived || !isItemAvailableOnDate(item, date) || !isScheduledToday(item, date) || isComplete(host.store, item, date)) continue;
            host.bulkSelected.add(item.id);
        }
        host.render();
    });
    root.querySelector<HTMLElement>("[data-action='bulk-complete']")?.addEventListener("click", () => {
        const ids = [...host.bulkSelected];
        if (!ids.length) return;
        const date = currentCalendarDate();
        for (const id of ids) {
            const item = host.store.items.find((candidate) => candidate.id === id && !candidate.archived);
            if (!item || isComplete(host.store, item, date)) continue;
            const moment = captureActionMoment();
            const revision = getItemRevisionForDate(item, date);
            const fingerprint = host.revisionFingerprint(item, date);
            const remaining = evaluateRule(item, host.store.events, date).remaining ?? 0;
            const value = revision.kind === "binary" ? 1 : Math.max(0, remaining);
            if (value <= 0) continue;
            void host.enqueueMutation(() => host.recordEvent(item, value, moment, fingerprint));
        }
        host.bulkMode = false;
        host.bulkSelected.clear();
    });
    root.querySelector<HTMLElement>("[data-action='bulk-archive']")?.addEventListener("click", () => {
        const ids = [...host.bulkSelected];
        if (!ids.length) return;
        for (const id of ids) {
            const item = host.store.items.find((candidate) => candidate.id === id && !candidate.archived);
            if (!item) continue;
            void host.enqueueMutation(() => host.setItemArchived(id, true, captureActionMoment(), host.itemFingerprint(item)));
        }
        host.bulkMode = false;
        host.bulkSelected.clear();
    });
}

/* 手柄拖拽重排 + Alt+↑/↓ 键盘重排；落点持久化组内 sortOrder（仅手动排序模式）。 */
export function bindItemDragFor(host: TodayBindingsHost, root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>("[data-drag-handle]").forEach((handle) => {
        handle.addEventListener("pointerdown", (event) => {
            if (host.todaySortMode !== "manual") return;
            const item = handle.closest<HTMLElement>(".lc-checkin__item");
            const container = item?.parentElement;
            if (!item || !container || item.closest(".lc-checkin__completed-section")) return;
            event.preventDefault();
            try { handle.setPointerCapture(event.pointerId); } catch { /* pointer may be released already */ }
            item.classList.add("is-dragging");
            const onMove = (moveEvent: PointerEvent) => {
                const siblings = [...container.querySelectorAll<HTMLElement>(".lc-checkin__item")].filter((el) => el !== item);
                const target = siblings.find((sibling) => {
                    const box = sibling.getBoundingClientRect();
                    return moveEvent.clientY < box.top + box.height / 2;
                });
                if (target) container.insertBefore(item, target);
                else container.appendChild(item);
            };
            const finish = () => {
                item.classList.remove("is-dragging");
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", finish);
                window.removeEventListener("pointercancel", finish);
                const orderedIds = [...container.querySelectorAll<HTMLElement>(".lc-checkin__item")]
                    .map((el) => el.dataset.itemId || "")
                    .filter(Boolean);
                if (orderedIds.length) void host.enqueueMutation(() => host.reorderItems(orderedIds));
            };
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", finish);
            window.addEventListener("pointercancel", finish);
        });
    });
    root.addEventListener("keydown", (event) => {
        if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
        const target = event.target as HTMLElement | null;
        const item = target?.closest?.(".lc-checkin__item");
        if (!item || item.closest(".lc-checkin__completed-section") || host.todaySortMode !== "manual") return;
        const container = item.parentElement;
        if (!container) return;
        event.preventDefault();
        if (event.key === "ArrowUp" && item.previousElementSibling) container.insertBefore(item, item.previousElementSibling);
        if (event.key === "ArrowDown" && item.nextElementSibling) container.insertBefore(item.nextElementSibling, item);
        const orderedIds = [...container.querySelectorAll<HTMLElement>(".lc-checkin__item")].map((el) => el.dataset.itemId || "").filter(Boolean);
        if (orderedIds.length) void host.enqueueMutation(() => host.reorderItems(orderedIds));
    });
}
