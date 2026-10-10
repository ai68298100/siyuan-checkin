/* 今日页三个小绑定器：快捷数字键（8.6）、批量模式（6.0 P1）、拖拽排序（6.0 P0）。
   从 index.ts 外置（T-022 可选收尾）；宿主成员经 TodayBindingsHost 结构化接口声明，
   index.ts 以薄壳委托 `bindQuickKeyboardFor(this as unknown as TodayBindingsHost, root)` 接线。 */
import {t} from "../i18n";
import {getItemRevisionForDate, getEventsForDay, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday, isSkipEvent, dateKey} from "../model";
import {getQuickTodayItems} from "../plugin-ops";
import {calendarDateFromKey, captureActionMoment, currentCalendarDate, escapeHtml, getRecordStep} from "../shared";
import type {ActionMoment} from "../shared";
import type {CheckinItem, CheckinItemSortMode, CheckinStore, TodayRootContext} from "../types";
import {getActiveItemById, getItemById} from "../model";
import {runExclusiveAction} from "./action-busy";
import {showMessage} from "siyuan";

/* Alt+数字仍然可在筛选后触发隐藏项目；没有 DOM 卡片可借用时，按项目 ID
   做跨表面单飞，避免连续快捷键把同一写入排队多次。 */
const quickKeyboardBusyItems = new Set<string>();

export interface TodayBindingsHost {
    currentPage: string;
    pageForRoot?(root: HTMLElement): string;
    store: CheckinStore;
    bulkMode: boolean;
    bulkSelected: Set<string>;
    todayStateForRoot?(root: HTMLElement): TodayRootContext;
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
    render(root?: HTMLElement): void;
    showEditor(item?: CheckinItem, returnTo?: "today" | "review" | "insights" | "more", root?: HTMLElement): void;
    showInsights(item?: CheckinItem, root?: HTMLElement): void;
}

/** Keep keyboard navigation and menu return focus on the visible card action.
 * Exact-entry submit buttons belong to a disclosure and may be hidden. */
function visiblePrimaryAction(card: HTMLElement, bulkMode = false): HTMLElement | undefined {
    const selector = bulkMode ? "[data-bulk-check]" : ".lc-checkin__item-action > .lc-checkin__focus-primary[data-action='focus'], .lc-checkin__item-action > [data-action='record'], .lc-checkin__item-action > [data-action='quick-record']";
    return [...card.querySelectorAll<HTMLElement>(selector)].find((button) => button.offsetParent !== null && !button.matches(":disabled"));
}

function todayBulkStateFor(host: TodayBindingsHost, root: HTMLElement) {
    const state = host.todayStateForRoot?.(root);
    return {
        get bulkMode(): boolean { return state?.bulkMode ?? host.bulkMode; },
        set bulkMode(value: boolean) { if (state) state.bulkMode = value; else host.bulkMode = value; },
        bulkSelected: state?.bulkSelected ?? host.bulkSelected,
    };
}

/* Alt+1~9 follows the primary action: duration starts focus, other kinds record. */
export function bindQuickKeyboardFor(host: TodayBindingsHost, root: HTMLElement): void {
    if (root.dataset.quickKeyboardBound === "true") return;
    root.dataset.quickKeyboardBound = "true";
    const today = todayBulkStateFor(host, root);
    const pageForRoot = () => host.pageForRoot ? host.pageForRoot(root) : host.currentPage;
    root.addEventListener("keydown", (event) => {
        if (pageForRoot() !== "today" || today.bulkMode) return;
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
        if ((revision.kind === "duration" || (item.completionSource === "tomato" && revision.kind !== "binary")) && item.direction !== "atMost") {
            const card = [...root.querySelectorAll<HTMLElement>(".lc-checkin__item[data-item-id]")].find((entry) => entry.dataset.itemId === item.id);
            const action = card && visiblePrimaryAction(card);
            if (action?.dataset.action === "focus") action.click();
            // A filtered, collapsed or busy duration item must not silently
            // turn a focus shortcut into an unearned manual duration record.
            return;
        }
        const card = [...root.querySelectorAll<HTMLElement>(".lc-checkin__item[data-item-id]")].find((entry) => entry.dataset.itemId === item.id);
        const action = card?.querySelector<HTMLElement>("[data-action='record'], [data-action='quick-record'], [data-action='toggle']");
        const record = () => host.enqueueMutation(() => host.recordEvent(item, revision.kind === "binary" ? 1 : getRecordStep(revision.kind, revision.unit, revision.recordStep), captureActionMoment(), host.revisionFingerprint(item, date)));
        const recordOnce = async () => {
            if (quickKeyboardBusyItems.has(item.id)) return;
            quickKeyboardBusyItems.add(item.id);
            try {
                await record();
            } finally {
                quickKeyboardBusyItems.delete(item.id);
            }
        };
        if (card && action) runExclusiveAction(action, recordOnce, card, "button[data-action='record'], button[data-action='quick-record'], button[data-action='toggle']");
        else void recordOnce().catch(() => showMessage(t("msg.saveFailedShort")));
    });
}

/* 桌面键盘流（T-107）：j/k 或方向键在可见卡片间移动焦点（聚焦各卡主操作按钮，
   空格/回车原生触发打卡），e 进编辑。仅在今日页且未在输入框时生效。 */
export function bindPageKeyboardFor(host: TodayBindingsHost, root: HTMLElement): void {
    if (root.dataset.pageKeyboardBound === "true") return;
    root.dataset.pageKeyboardBound = "true";
    const today = todayBulkStateFor(host, root);
    const pageForRoot = () => host.pageForRoot ? host.pageForRoot(root) : host.currentPage;
    root.addEventListener("keydown", (event) => {
        if (pageForRoot() !== "today") return;
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target as HTMLElement | null;
        if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
        const key = event.key === "ArrowDown" ? "j" : event.key === "ArrowUp" ? "k" : event.key.toLowerCase();
        if (key !== "j" && key !== "k" && key !== "e") return;
        const cards = [...root.querySelectorAll<HTMLElement>(".lc-checkin__item[data-item-id]")].filter((card) => card.offsetParent !== null);
        if (!cards.length) return;
        const activeCard = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(".lc-checkin__item[data-item-id]");
        if (key === "e") {
            if (today.bulkMode) return;
            const item = getItemById(host.store, activeCard?.dataset.itemId);
            if (!item) return;
            event.preventDefault();
            host.showEditor(item, undefined, root);
            return;
        }
        const index = activeCard ? cards.indexOf(activeCard) : -1;
        const next = index < 0 ? (key === "j" ? 0 : cards.length - 1) : (index + (key === "j" ? 1 : -1) + cards.length) % cards.length;
        event.preventDefault();
        (visiblePrimaryAction(cards[next], today.bulkMode) ?? cards[next]).focus();
    });
}

/* 批量多选后一键完成/归档。 */
export function bindBulkModeFor(host: TodayBindingsHost, root: HTMLElement): void {
    const today = todayBulkStateFor(host, root);
    root.querySelector<HTMLElement>("[data-action='toggle-bulk']")?.addEventListener("click", () => {
        today.bulkMode = !today.bulkMode;
        today.bulkSelected.clear();
        host.render(root);
    });
    root.querySelector<HTMLElement>("[data-action='bulk-exit']")?.addEventListener("click", () => {
        today.bulkMode = false;
        today.bulkSelected.clear();
        host.render(root);
    });
    const syncBulkSelection = () => {
        root.querySelectorAll<HTMLButtonElement>("[data-bulk-check]").forEach((button) => {
            const selected = today.bulkSelected.has(button.dataset.bulkCheck || "");
            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-pressed", String(selected));
            button.textContent = selected ? "✓" : "";
            button.closest(".lc-checkin__item")?.classList.toggle("is-selected", selected);
        });
        const count = today.bulkSelected.size;
        const countLabel = root.querySelector<HTMLElement>("[data-bulk-selected-count]");
        if (countLabel) countLabel.textContent = t("today.bulkSelectedCount", {n: count});
        root.querySelectorAll<HTMLButtonElement>("[data-bulk-selection-action]").forEach((button) => button.disabled = count === 0);
    };
    root.querySelectorAll<HTMLElement>("[data-bulk-check]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.bulkCheck || "";
        if (!id) return;
        if (today.bulkSelected.has(id)) today.bulkSelected.delete(id);
        else today.bulkSelected.add(id);
        syncBulkSelection();
    }));
    root.querySelector<HTMLElement>("[data-action='bulk-all']")?.addEventListener("click", () => {
        const date = currentCalendarDate();
        root.querySelectorAll<HTMLElement>("[data-bulk-check]").forEach((selection) => {
            const item = getActiveItemById(host.store, selection.dataset.bulkCheck || "");
            if (item && !isComplete(host.store, item, date)) today.bulkSelected.add(item.id);
        });
        syncBulkSelection();
    });
    /* 搜索/筛选重渲染后丢弃结果集之外的旧选择，避免批量动作影响不可见项目。 */
    const renderedIds = new Set([...root.querySelectorAll<HTMLElement>("[data-bulk-check]")].map((selection) => selection.dataset.bulkCheck || "").filter(Boolean));
    for (const id of today.bulkSelected) if (!renderedIds.has(id)) today.bulkSelected.delete(id);
    syncBulkSelection();
    root.querySelector<HTMLElement>("[data-action='bulk-complete']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const ids = [...today.bulkSelected];
        if (!ids.length) return;
        const actionKey = `bulk:${ids.sort().join(",")}`;
        runExclusiveAction(button, async () => {
            if (!await host.completeItems(ids)) return;
            today.bulkMode = false;
            today.bulkSelected.clear();
            host.render(root);
        }, undefined, "button", actionKey);
    });
    root.querySelector<HTMLElement>("[data-action='bulk-skip']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const ids = [...today.bulkSelected];
        if (!ids.length) return;
        const actionKey = `bulk:${ids.sort().join(",")}`;
        runExclusiveAction(button, async () => {
            if (!await host.skipItems(ids)) return;
            today.bulkMode = false;
            today.bulkSelected.clear();
            host.render(root);
        }, undefined, "button", actionKey);
    });
    root.querySelector<HTMLElement>("[data-action='bulk-archive']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const ids = [...today.bulkSelected];
        if (!ids.length) return;
        const actionKey = `bulk:${ids.sort().join(",")}`;
        runExclusiveAction(button, async () => {
            if (!await host.archiveItems(ids)) return;
            today.bulkMode = false;
            today.bulkSelected.clear();
            host.render(root);
        }, undefined, "button", actionKey);
    });
    root.querySelector<HTMLElement>("[data-action='bulk-delete']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const ids = [...today.bulkSelected];
        if (!ids.length) return;
        const actionKey = `bulk:${ids.sort().join(",")}`;
        runExclusiveAction(button, async () => {
            if (!await host.deleteItemsWithRecords(ids)) return;
            today.bulkMode = false;
            today.bulkSelected.clear();
            host.render(root);
        }, undefined, "button", actionKey);
    });
}

/** 卡片右键上下文菜单（T-1162）：编辑/归档/删除，零常驻空间。 */
export function bindItemContextMenuFor(host: TodayBindingsHost, root: HTMLElement): void {
    if (root.dataset.itemContextMenuBound === "true") return;
    root.dataset.itemContextMenuBound = "true";
    const today = todayBulkStateFor(host, root);
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
        if (!card || today.bulkMode) return;
        const item = getActiveItemById(host.store, card.dataset.itemId || "");
        if (!item) return;
        closeMenus();
        menuTrigger = visiblePrimaryAction(card);
        /* T-1222：当日排期且未完成的项可跳过/取消跳过（D-216 一等记录态）。 */
        const actionDate = currentCalendarDate();
        const scheduledToday = isItemAvailableOnDate(item, actionDate) && isScheduledToday(item, actionDate);
        const completeToday = isComplete(host.store, item, actionDate);
        const skippedToday = scheduledToday && !completeToday
            && getEventsForDay(host.store, item.id, actionDate).some((event) => isSkipEvent(event));
        const menuItems = [
            /* T-1625：item.name 是用户内容，经 t() 拼进 HTML 前必须转义（t() 只做纯文本替换）。 */
            `<button type="button" role="menuitem" data-menu-action="edit">${escapeHtml(t("item.editAria", {name: item.name}))}</button>`,
            `<button type="button" role="menuitem" data-menu-action="insights">${escapeHtml(t("item.insightsTitle"))}</button>`,
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
        /* The menu is mounted in the owning root.  A transformed dock/tab (or a
           pinch-zoomed visual viewport) can make `position:fixed` resolve against
           a local containing block rather than the layout viewport.  Measure the
           zero-positioned menu to discover that block's client origin, then clamp
           against both the visual viewport and the owning root's visible bounds.
           This keeps the menu inside a narrow dock and prevents keyboard/zoom
           insets from placing its last actions outside the visible surface. */
        const visualViewport = window.visualViewport;
        const viewportLeft = visualViewport?.offsetLeft ?? 0;
        const viewportTop = visualViewport?.offsetTop ?? 0;
        const viewportRight = viewportLeft + (visualViewport?.width ?? window.innerWidth);
        const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight);
        const rootRect = root.getBoundingClientRect();
        const hasRootBounds = Number.isFinite(rootRect.left) && Number.isFinite(rootRect.top)
            && Number.isFinite(rootRect.right) && Number.isFinite(rootRect.bottom)
            && rootRect.width > 0 && rootRect.height > 0;
        const boundLeft = hasRootBounds ? Math.max(viewportLeft, rootRect.left) : viewportLeft;
        const boundTop = hasRootBounds ? Math.max(viewportTop, rootRect.top) : viewportTop;
        const boundRight = hasRootBounds ? Math.min(viewportRight, rootRect.right) : viewportRight;
        const boundBottom = hasRootBounds ? Math.min(viewportBottom, rootRect.bottom) : viewportBottom;
        menu.style.maxWidth = `${Math.max(1, boundRight - boundLeft - margin * 2)}px`;
        menu.style.maxHeight = `${Math.max(1, boundBottom - boundTop - margin * 2)}px`;
        menu.style.overflowY = "auto";
        menu.style.boxSizing = "border-box";
        const measuredRect = menu.getBoundingClientRect();
        const originLeft = rect.left;
        const originTop = rect.top;
        const minX = Math.max(margin, boundLeft - originLeft + margin);
        const minY = Math.max(margin, boundTop - originTop + margin);
        const maxX = Math.max(minX, boundRight - originLeft - measuredRect.width - margin);
        const maxY = Math.max(minY, boundBottom - originTop - measuredRect.height - margin);
        menu.style.left = `${Math.min(Math.max(minX, clientX - originLeft), maxX)}px`;
        menu.style.top = `${Math.min(Math.max(minY, clientY - originTop), maxY)}px`;
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
                ? () => host.showEditor(item, undefined, root)
                : action === "insights"
                    ? () => host.showInsights(item, root)
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
        const target = event.target as HTMLElement;
        if (target.closest(".lc-checkin__item-context-menu")) return;
        /* A click on another control already establishes the user's next focus
           target. Restore the opener only when the dismissal click itself had
           no focusable destination. */
        closeMenus(!target.closest("button, a, input, select, textarea, [tabindex]"));
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
    /* The Today root survives redraws while card markup is replaced. Keep the
       delegated keyboard reorder listener one-per-root; binding it on every
       render makes one Alt+Arrow action enqueue the mutation repeatedly. */
    if (root.dataset.itemDragKeyboardBound === "true") return;
    root.dataset.itemDragKeyboardBound = "true";
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
