/* 今日页三个小绑定器：快捷数字键（8.6）、批量模式（6.0 P1）、拖拽排序（6.0 P0）。
   从 index.ts 外置（T-022 可选收尾）；宿主成员经 TodayBindingsHost 结构化接口声明，
   index.ts 以薄壳委托 `bindQuickKeyboardFor(this as unknown as TodayBindingsHost, root)` 接线。 */
import {t} from "../i18n";
import {getItemRevisionForDate, getEventsForDay, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday, isSkipEvent, dateKey} from "../model";
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
    archiveItems(itemIds: string[]): Promise<boolean>;
    completeItems(itemIds: string[]): Promise<boolean>;
    deleteItemWithRecords(itemId: string): Promise<boolean>;
    deleteItemsWithRecords(itemIds: string[]): Promise<boolean>;
    skipItemToday(itemId: string, note?: string): Promise<boolean>;
    unskipItemToday(itemId: string): Promise<boolean>;
    skipItems(itemIds: string[]): Promise<boolean>;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    recordEvent(item: CheckinItem, value: number, moment: {occurredAt: string; localDate: string}, expectedRevisionFingerprint?: string, note?: string, attachment?: string): Promise<unknown>;
    render(): void;
    showEditor(item?: CheckinItem): void;
}

function runExclusiveAction(button: HTMLElement | null, operation: () => Promise<unknown> | unknown): void {
    if (!button || button.dataset.actionBusy === "true") return;
    const toolbar = button.closest<HTMLElement>("[data-bulk-toolbar]");
    const controls = toolbar ? [...toolbar.querySelectorAll<HTMLButtonElement>("button")] : [button as HTMLButtonElement];
    const previousDisabled = controls.map((control) => control.disabled);
    button.dataset.actionBusy = "true";
    button.setAttribute("aria-busy", "true");
    toolbar?.setAttribute("aria-busy", "true");
    controls.forEach((control) => { control.disabled = true; });
    void Promise.resolve().then(operation).catch(() => undefined).finally(() => {
        if (!button.isConnected) return;
        delete button.dataset.actionBusy;
        button.removeAttribute("aria-busy");
        toolbar?.removeAttribute("aria-busy");
        controls.forEach((control, index) => { if (control.isConnected) control.disabled = previousDisabled[index]; });
    });
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
    const syncBulkSelection = () => {
        root.querySelectorAll<HTMLButtonElement>("[data-bulk-check]").forEach((button) => {
            const selected = host.bulkSelected.has(button.dataset.bulkCheck || "");
            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-pressed", String(selected));
            button.textContent = selected ? "✓" : "";
        });
        const count = host.bulkSelected.size;
        const countLabel = root.querySelector<HTMLElement>("[data-bulk-selected-count]");
        if (countLabel) countLabel.textContent = t("today.bulkSelectedCount", {n: count});
        root.querySelectorAll<HTMLButtonElement>("[data-bulk-selection-action]").forEach((button) => button.disabled = count === 0);
    };
    root.querySelectorAll<HTMLElement>("[data-bulk-check]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.bulkCheck || "";
        if (!id) return;
        if (host.bulkSelected.has(id)) host.bulkSelected.delete(id);
        else host.bulkSelected.add(id);
        syncBulkSelection();
    }));
    root.querySelector<HTMLElement>("[data-action='bulk-all']")?.addEventListener("click", () => {
        const date = currentCalendarDate();
        root.querySelectorAll<HTMLElement>("[data-bulk-check]").forEach((selection) => {
            const item = getActiveItemById(host.store, selection.dataset.bulkCheck || "");
            if (item && !isComplete(host.store, item, date)) host.bulkSelected.add(item.id);
        });
        syncBulkSelection();
    });
    /* 搜索/筛选重渲染后丢弃结果集之外的旧选择，避免批量动作影响不可见项目。 */
    const renderedIds = new Set([...root.querySelectorAll<HTMLElement>("[data-bulk-check]")].map((selection) => selection.dataset.bulkCheck || "").filter(Boolean));
    for (const id of host.bulkSelected) if (!renderedIds.has(id)) host.bulkSelected.delete(id);
    syncBulkSelection();
    root.querySelector<HTMLElement>("[data-action='bulk-complete']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const ids = [...host.bulkSelected];
        if (!ids.length) return;
        runExclusiveAction(button, async () => {
            if (!await host.completeItems(ids)) return;
            host.bulkMode = false;
            host.bulkSelected.clear();
            host.render();
        });
    });
    root.querySelector<HTMLElement>("[data-action='bulk-skip']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const ids = [...host.bulkSelected];
        if (!ids.length) return;
        runExclusiveAction(button, async () => {
            if (!await host.skipItems(ids)) return;
            host.bulkMode = false;
            host.bulkSelected.clear();
            host.render();
        });
    });
    root.querySelector<HTMLElement>("[data-action='bulk-archive']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const ids = [...host.bulkSelected];
        if (!ids.length) return;
        runExclusiveAction(button, async () => {
            if (!await host.archiveItems(ids)) return;
            host.bulkMode = false;
            host.bulkSelected.clear();
            host.render();
        });
    });
    root.querySelector<HTMLElement>("[data-action='bulk-delete']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const ids = [...host.bulkSelected];
        if (!ids.length) return;
        runExclusiveAction(button, async () => {
            if (!await host.deleteItemsWithRecords(ids)) return;
            host.bulkMode = false;
            host.bulkSelected.clear();
            host.render();
        });
    });
}

/** 卡片右键上下文菜单（T-1162）：编辑/归档/删除，零常驻空间。 */
export function bindItemContextMenuFor(host: TodayBindingsHost, root: HTMLElement): void {
    if (root.dataset.itemContextMenuBound === "true") return;
    root.dataset.itemContextMenuBound = "true";
    let menuTrigger: HTMLElement | undefined;
    const closeMenus = (restoreFocus = false) => {
        root.querySelectorAll(".lc-checkin__item-context-menu").forEach((node) => node.remove());
        const trigger = menuTrigger;
        menuTrigger = undefined;
        if (restoreFocus && trigger?.isConnected) trigger.focus();
    };
    let suppressContextMenuUntil = 0;
    let longPressTimer: number | undefined;
    let longPressPointerId: number | undefined;
    let longPressStartX = 0;
    let longPressStartY = 0;
    const cancelLongPress = () => {
        if (longPressTimer !== undefined) window.clearTimeout(longPressTimer);
        longPressTimer = undefined;
        longPressPointerId = undefined;
    };
    const openMenu = (card: HTMLElement, clientX: number, clientY: number) => {
        if (!card) return;
        const item = getActiveItemById(host.store, card.dataset.itemId || "");
        if (!item) return;
        closeMenus();
        menuTrigger = card.querySelector<HTMLElement>("[data-action='record'], [data-action='quick-record'], [data-action='toggle']") || undefined;
        /* T-1222：当日排期且未完成的项可跳过/取消跳过（D-216 一等记录态）。 */
        const actionDate = currentCalendarDate();
        const scheduledToday = isItemAvailableOnDate(item, actionDate) && isScheduledToday(item, actionDate);
        const completeToday = isComplete(host.store, item, actionDate);
        const skippedToday = scheduledToday && !completeToday
            && getEventsForDay(host.store, item.id, actionDate).some((event) => isSkipEvent(event));
        const menuItems = [
            `<button type="button" role="menuitem" data-menu-action="edit">${t("item.editAria", {name: item.name})}</button>`,
            ...(scheduledToday && !completeToday ? [skippedToday
                ? `<button type="button" role="menuitem" data-menu-action="unskip">${t("today.unskipToday")}</button>`
                : `<button type="button" role="menuitem" data-menu-action="skip">${t("today.skipToday")}</button>`] : []),
            `<button type="button" role="menuitem" data-menu-action="archive">${item.archived ? t("editor.restore") : t("today.bulkArchive")}</button>`,
            `<button type="button" role="menuitem" data-menu-action="delete" class="is-danger">${t("editor.deleteItem")}</button>`,
        ];
        const menu = document.createElement("div");
        menu.className = "lc-checkin__item-context-menu";
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", t("today.bulkAria"));
        menu.innerHTML = menuItems.join("");
        menu.style.left = "0px";
        menu.style.top = "0px";
        root.appendChild(menu);
        const margin = 8;
        const rect = menu.getBoundingClientRect();
        const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
        const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
        menu.style.left = `${Math.min(Math.max(margin, clientX), maxX)}px`;
        menu.style.top = `${Math.min(Math.max(margin, clientY), maxY)}px`;
        menu.querySelector<HTMLElement>("[data-menu-action]")?.focus();
        menu.addEventListener("click", (ev) => {
            const actionButton = (ev.target as HTMLElement).closest<HTMLButtonElement>("[data-menu-action]");
            const action = actionButton?.dataset.menuAction;
            if (!actionButton || menu.dataset.actionBusy === "true") return;
            ev.stopPropagation();
            /* 跳过原因可选：取消 prompt 时不进入 busy、不关菜单。 */
            const skipReason = action === "skip" ? window.prompt(t("today.skipPrompt")) : undefined;
            if (action === "skip" && skipReason === null) return;
            const moment = captureActionMoment();
            const fingerprint = host.itemFingerprint(item);
            menu.dataset.actionBusy = "true";
            menu.setAttribute("aria-busy", "true");
            menu.querySelectorAll<HTMLButtonElement>("[data-menu-action]").forEach((button) => button.disabled = true);
            const operation = action === "edit"
                ? () => host.showEditor(item)
                : action === "skip"
                    ? () => host.skipItemToday(item.id, skipReason ?? undefined)
                    : action === "unskip"
                        ? () => host.unskipItemToday(item.id)
                        : action === "archive"
                            ? () => host.enqueueMutation(() => host.setItemArchived(item.id, !item.archived, moment, fingerprint))
                            : () => host.deleteItemWithRecords(item.id);
            void Promise.resolve().then(operation).catch(() => undefined).finally(() => closeMenus(true));
        });
        menu.addEventListener("keydown", (event) => {
            const actions = [...menu.querySelectorAll<HTMLButtonElement>("[data-menu-action]")];
            const current = actions.indexOf(document.activeElement as HTMLButtonElement);
            if (!actions.length) return;
            if (event.key === "Tab") {
                event.preventDefault();
                closeMenus(true);
                return;
            }
            if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                actions[event.key === "Home" ? 0 : actions.length - 1]?.focus();
                return;
            }
            if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
            event.preventDefault();
            const offset = event.key === "ArrowDown" ? 1 : -1;
            actions[(current + offset + actions.length) % actions.length]?.focus();
        });
    };
    root.addEventListener("contextmenu", (event) => {
        if (Date.now() < suppressContextMenuUntil) {
            event.preventDefault();
            return;
        }
        const card = (event.target as HTMLElement).closest<HTMLElement>(".lc-checkin__item");
        if (!card) return;
        event.preventDefault();
        openMenu(card, event.clientX, event.clientY);
    });
    root.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
        const card = (event.target as HTMLElement).closest<HTMLElement>(".lc-checkin__item");
        if (!card || (event.target as HTMLElement).closest("button, input, textarea, select, a")) return;
        cancelLongPress();
        longPressPointerId = event.pointerId;
        longPressStartX = event.clientX;
        longPressStartY = event.clientY;
        longPressTimer = window.setTimeout(() => {
            longPressTimer = undefined;
            suppressContextMenuUntil = Date.now() + 800;
            openMenu(card, event.clientX, event.clientY);
        }, 520);
    });
    root.addEventListener("pointermove", (event) => {
        if (event.pointerId !== longPressPointerId) return;
        if (Math.hypot(event.clientX - longPressStartX, event.clientY - longPressStartY) > 10) cancelLongPress();
    });
    root.addEventListener("pointerup", cancelLongPress);
    root.addEventListener("pointercancel", cancelLongPress);
    root.addEventListener("click", (event) => {
        if (!(event.target as HTMLElement).closest(".lc-checkin__item-context-menu")) closeMenus();
    });
    root.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && root.querySelector(".lc-checkin__item-context-menu")) {
            event.preventDefault();
            closeMenus(true);
        }
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
