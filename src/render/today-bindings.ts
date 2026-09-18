/* 今日页三个小绑定器：快捷数字键（8.6）、批量模式（6.0 P1）、拖拽排序（6.0 P0）。
   从 index.ts 外置（T-022 可选收尾）；宿主成员经 TodayBindingsHost 结构化接口声明，
   index.ts 以薄壳委托 `bindQuickKeyboardFor(this as unknown as TodayBindingsHost, root)` 接线。 */
import {t} from "../i18n";
import {showMessage} from "siyuan";
import {deleteItemCascade, evaluateItemRule, getItemRevisionForDate, isComplete, isItemAvailableOnDate, isScheduledToday, dateKey} from "../model";
import {getQuickTodayItems} from "../plugin-ops";
import {calendarDateFromKey, captureActionMoment, currentCalendarDate, getRecordStep} from "../shared";
import type {ActionMoment} from "../shared";
import type {CheckinItem, CheckinItemSortMode, CheckinStore} from "../types";
import {getActiveItemById, getItemById} from "../model";

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
    deleteItemWithRecords(itemId: string): Promise<boolean>;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    persist(): Promise<void>;
    recordEvent(item: CheckinItem, value: number, moment: {occurredAt: string; localDate: string}, expectedRevisionFingerprint?: string, note?: string, attachment?: string): Promise<unknown>;
    render(): void;
    showEditor(item?: CheckinItem): void;
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
        void host.enqueueMutation(() => host.recordEvent(item, revision.kind === "binary" ? 1 : getRecordStep(revision.kind, revision.unit, revision.recordStep), captureActionMoment(), host.revisionFingerprint(item, date)));
    });
}

/* 桌面键盘流（T-107）：j/k 或方向键在可见卡片间移动焦点（聚焦各卡主操作按钮，
   空格/回车原生触发打卡），e 进编辑。仅在今日页且未在输入框时生效。 */
export function bindPageKeyboardFor(host: TodayBindingsHost, root: HTMLElement): void {
    if (root.dataset.pageKeyboardBound === "true") return;
    root.dataset.pageKeyboardBound = "true";
    root.addEventListener("keydown", (event) => {
        if (host.currentPage !== "today") return;
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target as HTMLElement | null;
        if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
        const key = event.key === "ArrowDown" ? "j" : event.key === "ArrowUp" ? "k" : event.key.toLowerCase();
        if (key !== "j" && key !== "k" && key !== "e") return;
        const cards = [...root.querySelectorAll<HTMLElement>(".lc-checkin__item[data-item-id]")].filter((card) => card.offsetParent !== null);
        if (!cards.length) return;
        const activeCard = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(".lc-checkin__item[data-item-id]");
        if (key === "e") {
            const item = getItemById(host.store, activeCard?.dataset.itemId);
            if (!item) return;
            event.preventDefault();
            host.showEditor(item);
            return;
        }
        const index = activeCard ? cards.indexOf(activeCard) : -1;
        const next = index < 0 ? (key === "j" ? 0 : cards.length - 1) : (index + (key === "j" ? 1 : -1) + cards.length) % cards.length;
        event.preventDefault();
        (cards[next].querySelector<HTMLElement>("[data-action='record'], [data-action='quick-record'], [data-action='toggle']") ?? cards[next]).focus();
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
            const item = getActiveItemById(host.store, id);
            if (!item || isComplete(host.store, item, date)) continue;
            const moment = captureActionMoment();
            const revision = getItemRevisionForDate(item, date);
            const fingerprint = host.revisionFingerprint(item, date);
            const remaining = evaluateItemRule(host.store, item, date).remaining ?? 0;
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
            const item = getActiveItemById(host.store, id);
            if (!item) continue;
            void host.enqueueMutation(() => host.setItemArchived(id, true, captureActionMoment(), host.itemFingerprint(item)));
        }
        host.bulkMode = false;
        host.bulkSelected.clear();
    });
    root.querySelector<HTMLElement>("[data-action='bulk-delete']")?.addEventListener("click", () => {
        const ids = [...host.bulkSelected];
        if (!ids.length) return;
        const recordCount = ids.reduce((sum, id) => sum + host.store.events.filter((event) => event.itemId === id).length, 0);
        if (!window.confirm(t("today.bulkDeleteConfirm", {n: ids.length, records: recordCount}))) return;
        const moment = captureActionMoment();
        for (const id of ids) {
            host.store = deleteItemCascade(host.store, id, moment.occurredAt);
        }
        host.bulkMode = false;
        host.bulkSelected.clear();
        void host.enqueueMutation(async () => { await host.persist(); });
        showMessage(t("msg.itemsDeleted", {n: ids.length}));
    });
}

/** 卡片右键上下文菜单（T-1162）：编辑/归档/删除，零常驻空间。 */
export function bindItemContextMenuFor(host: TodayBindingsHost, root: HTMLElement): void {
    if (root.dataset.itemContextMenuBound === "true") return;
    root.dataset.itemContextMenuBound = "true";
    const closeMenus = () => root.querySelectorAll(".lc-checkin__item-context-menu").forEach((node) => node.remove());
    root.addEventListener("contextmenu", (event) => {
        const card = (event.target as HTMLElement).closest<HTMLElement>(".lc-checkin__item");
        if (!card) return;
        const item = getActiveItemById(host.store, card.dataset.itemId || "");
        if (!item) return;
        event.preventDefault();
        closeMenus();
        const menu = document.createElement("div");
        menu.className = "lc-checkin__item-context-menu";
        menu.innerHTML = [
            `<button type="button" data-menu-action="edit">${t("item.editAria", {name: item.name})}</button>`,
            `<button type="button" data-menu-action="archive">${item.archived ? t("editor.restore") : t("today.bulkArchive")}</button>`,
            `<button type="button" data-menu-action="delete" class="is-danger">${t("editor.deleteItem")}</button>`,
        ].join("");
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        root.appendChild(menu);
        menu.addEventListener("click", (ev) => {
            const action = (ev.target as HTMLElement).dataset?.menuAction;
            ev.stopPropagation();
            closeMenus();
            const moment = captureActionMoment();
            const fingerprint = host.itemFingerprint(item);
            if (action === "edit") host.showEditor(item);
            else if (action === "archive") void host.enqueueMutation(() => host.setItemArchived(item.id, !item.archived, moment, fingerprint));
            else if (action === "delete") void host.deleteItemWithRecords(item.id);
        });
    });
    root.addEventListener("click", closeMenus);
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
