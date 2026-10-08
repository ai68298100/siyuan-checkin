/* 设置页分类导航：让侧栏/横向分类栏随着右侧滚动内容保持同步。
   绑定只持有当前 root 的引用，并返回清理函数，重渲染时不会留下全局监听器。
   T-1563 字段级搜索导航：在既有行过滤之上增加匹配行集合的 ↑/↓ 选择、
   组名+字段名播报、Enter 聚焦当前项、Esc 清空、IME 组合态不打断，
   并按 root 记忆查询与焦点（重绘后恢复）。
   T-1654：目标卡片以独立语义标记参与搜索，不依赖布局用 settings-row。 */

import {t} from "../i18n";

export interface SettingsNavigationOptions {
    reducedMotion?: boolean;
    /** T-1621：搜索会话由所属 SettingsRootContext 持有。 */
    searchSession?: SettingsSearchSession;
}

type SettingsNavigationBinding = () => void;

export interface SettingsSearchSession {
    query: string;
    activeIndex: number;
    hadFocus: boolean;
}

const asElement = (target: EventTarget | null): Element | undefined =>
    typeof Element !== "undefined" && target instanceof Element ? target : undefined;

/**
 * Bind the settings category rail to its scrollable page surface.
 *
 * The page itself is the `.lc-checkin` scroller.  A scroll listener is kept as
 * the deterministic source of truth (IntersectionObserver callbacks can be
 * delayed while a smooth scroll is running); observers only request a cheap
 * recalculation after layout/visibility changes.  This also works in older
 * WebViews that do not expose either observer.
 */
export function bindSettingsNavigationFor(root: HTMLElement, options: SettingsNavigationOptions = {}): SettingsNavigationBinding {
    const scroller = root.querySelector<HTMLElement>(".lc-checkin--settings");
    const nav = root.querySelector<HTMLElement>(".lc-checkin--settings .lc-checkin__settings-nav");
    if (!scroller || !nav) return () => undefined;

    const buttons = [...nav.querySelectorAll<HTMLButtonElement>("[data-settings-nav]")];
    const groups = [...scroller.querySelectorAll<HTMLElement>("[data-settings-group]")];
    if (!buttons.length || !groups.length) return () => undefined;

    const groupById = new Map<string, HTMLElement>();
    groups.forEach((group) => {
        const id = group.dataset.settingsGroup;
        if (id) groupById.set(id, group);
    });
    const search = root.querySelector<HTMLInputElement>("[data-settings-search]");
    const searchStatus = root.querySelector<HTMLElement>("[data-settings-search-status]");
    const panelStates = new Map<HTMLDetailsElement, boolean>();
    const rowStates = new Map<HTMLElement, boolean>();
    /* T-1563：匹配行集合与当前选择（onSearch 重建；↑/↓ 移动；Enter 聚焦当前项）。 */
    /* RootContext 负责生命周期与隔离；旧测试/外部桩未传入时使用一次性会话，
       不再在模块级 WeakMap 中保留已销毁 surface 的状态。 */
    const searchSession = options.searchSession || {query: "", activeIndex: 0, hadFocus: false};
    let composing = false;
    let matchedRows: HTMLElement[] = [];
    let activeIndex = searchSession.activeIndex;
    let lastMatchCount = 0;

    /* 输入值只来自渲染器显式批准的目标字段；搜索候选与 Key 不进入索引。
       读取实时 value，确保尚未保存的目标 ID 也能被找到。 */
    const searchableControls = (row: HTMLElement): Array<HTMLInputElement | HTMLSelectElement> =>
        [...row.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[data-settings-search-value], select[data-settings-search-value]")]
            .filter(control => !(control instanceof HTMLInputElement && control.type === "password"));
    const searchText = (row: HTMLElement): string => {
        let text = row.textContent || "";
        if (row.dataset.settingsSearchItem !== undefined) {
            const copy = row.cloneNode(true) as HTMLElement;
            copy.querySelectorAll("[data-settings-search-exclude]").forEach(element => element.remove());
            text = copy.textContent || "";
        }
        return [text, row.dataset.settingsSearchText || "", ...searchableControls(row).map(control => control.value)]
            .join(" ").toLocaleLowerCase();
    };
    const rowLabel = (row: HTMLElement): string => {
        const label = row.querySelector<HTMLElement>(".lc-checkin__settings-label span") || row.querySelector<HTMLElement>(".lc-checkin__settings-label");
        const text = (row.dataset.settingsSearchLabel || label?.textContent || row.textContent || "").trim().replace(/\s+/g, " ");
        return text.length > 40 ? `${text.slice(0, 40)}…` : text;
    };
    const groupLabel = (row: HTMLElement): string => {
        const id = row.closest<HTMLElement>("[data-settings-group]")?.dataset.settingsGroup || "";
        return buttons.find(button => button.dataset.settingsNav === id)?.textContent?.trim() || id;
    };
    const highlightActive = () => {
        matchedRows.forEach((row, index) => row.classList.toggle("is-search-active", index === activeIndex));
    };
    const announceActive = () => {
        if (!searchStatus) return;
        if (!lastMatchCount) {
            searchStatus.textContent = search?.value.trim() ? `${matchesLabel()}` : "";
            return;
        }
        const current = matchedRows[activeIndex];
        searchStatus.textContent = current
            ? `${matchesLabel()} · ${t("set.searchActive", {index: activeIndex + 1, total: matchedRows.length, group: groupLabel(current), label: rowLabel(current)})}`
            : matchesLabel();
    };
    const matchesLabel = (): string => `${lastMatchCount} / ${groups.length}`;
    const scrollRowIntoView = (row: HTMLElement) => {
        row.scrollIntoView?.({block: "center", behavior: options.reducedMotion ? "auto" : "smooth"});
    };
    const focusActiveRow = () => {
        const row = matchedRows[activeIndex];
        if (!row) return;
        scrollRowIntoView(row);
        const query = (search?.value || "").trim().toLocaleLowerCase();
        const valueMatch = searchableControls(row).find(control => control.value.toLocaleLowerCase().includes(query) && !control.disabled && !control.closest("[hidden]"));
        const focusable = valueMatch || row.querySelector<HTMLElement>("[data-settings-search-focus]") || row.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]");
        focusable?.focus({preventScroll: true});
    };
    const onSearch = () => {
        const query = (search?.value || "").trim().toLocaleLowerCase();
        searchSession.query = query;
        searchSession.activeIndex = activeIndex;
        let matches = 0;
        matchedRows.forEach(row => row.classList.toggle("is-search-active", false));
        matchedRows = [];
        groups.forEach(group => {
            const rows = [...group.querySelectorAll<HTMLElement>(".lc-checkin__settings-row, [data-settings-search-item]")]
                .filter(row => {
                    const card = row.closest<HTMLElement>("[data-settings-search-item]");
                    return !card || card === row;
                });
            rows.forEach(row => {
                if (!query) {
                    if (rowStates.has(row)) row.hidden = rowStates.get(row)!;
                    return;
                }
                if (!rowStates.has(row)) rowStates.set(row, row.hidden);
                row.hidden = !searchText(row).includes(query);
                if (!row.hidden) matchedRows.push(row);
            });
            const match = !query || rows.some(row => !row.hidden) || (!rows.length && (group.textContent || "").toLocaleLowerCase().includes(query));
            group.hidden = !match;
            if (match) matches++;
            group.querySelectorAll<HTMLDetailsElement>("details").forEach(panel => {
                if (query) {
                    if (!panelStates.has(panel)) panelStates.set(panel, panel.open);
                    if (rows.some(row => !row.hidden && panel.contains(row)) || (panel.textContent || "").toLocaleLowerCase().includes(query)) panel.open = true;
                } else if (panelStates.has(panel)) panel.open = panelStates.get(panel)!;
            });
        });
        buttons.forEach(button => { button.hidden = Boolean(groupById.get(button.dataset.settingsNav || "")?.hidden); });
        if (!query) {
            panelStates.clear();
            rowStates.clear();
        }
        lastMatchCount = matches;
        if (activeIndex >= matchedRows.length) activeIndex = 0;
        searchSession.activeIndex = activeIndex;
        highlightActive();
        if (searchStatus) {
            searchStatus.textContent = query
                ? (matchedRows.length
                    ? `${matchesLabel()} · ${t("set.searchActive", {index: activeIndex + 1, total: matchedRows.length, group: groupLabel(matchedRows[activeIndex]), label: rowLabel(matchedRows[activeIndex])})}`
                    : matchesLabel())
                : "";
        }
        scheduleSync();
    };
    const onSearchKeyDown = (event: KeyboardEvent) => {
        if (composing) return;
        if (event.key === "Escape" && search?.value) {
            search.value = "";
            activeIndex = 0;
            searchSession.activeIndex = 0;
            onSearch();
            return;
        }
        const isDown = event.key === "ArrowDown";
        const isUp = event.key === "ArrowUp";
        if ((isDown || isUp) && matchedRows.length) {
            event.preventDefault();
            activeIndex = isDown ? (activeIndex + 1) % matchedRows.length : (activeIndex - 1 + matchedRows.length) % matchedRows.length;
            searchSession.activeIndex = activeIndex;
            highlightActive();
            announceActive();
            scrollRowIntoView(matchedRows[activeIndex]);
            return;
        }
        if (event.key !== "Enter" || !search?.value.trim()) return;
        event.preventDefault();
        focusActiveRow();
    };
    const onCompositionStart = () => { composing = true; };
    const onCompositionEnd = () => {
        composing = false;
        onSearch();
    };
    const onSearchInput = () => {
        if (!composing) onSearch();
    };
    search?.addEventListener("input", onSearchInput);
    search?.addEventListener("keydown", onSearchKeyDown);
    search?.addEventListener("compositionstart", onCompositionStart);
    search?.addEventListener("compositionend", onCompositionEnd);

    let disposed = false;
    let frame = 0;
    let activeId = "";
    let intersectionObserver: IntersectionObserver | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const scrollElement = (element: HTMLElement, left: number, top: number, behavior: ScrollBehavior) => {
        if (typeof element.scrollTo === "function") {
            try {
                element.scrollTo({left, top, behavior});
                return;
            } catch {
                /* A few embedded WebViews expose scrollTo but only accept the
                   legacy numeric overload.  Fall through to direct offsets. */
            }
        }
        /* Keep navigation usable in older WebViews with no options overload. */
        if (Number.isFinite(left)) element.scrollLeft = left;
        if (Number.isFinite(top)) element.scrollTop = top;
    };

    const isHorizontalRail = (): boolean => {
        const style = typeof window !== "undefined" && typeof window.getComputedStyle === "function"
            ? window.getComputedStyle(nav)
            : undefined;
        return style ? style.flexDirection === "row" : nav.scrollWidth > nav.clientWidth + 1;
    };

    const isWrappedRail = (): boolean => {
        const style = typeof window !== "undefined" && typeof window.getComputedStyle === "function"
            ? window.getComputedStyle(nav)
            : undefined;
        return style?.flexWrap === "wrap";
    };

    const keepButtonVisible = (button: HTMLElement, behavior: ScrollBehavior = "auto") => {
        const navRect = nav.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const horizontal = isHorizontalRail();
        const wrapped = isWrappedRail();
        const inset = 4;
        if (horizontal && !wrapped) {
            if (buttonRect.left < navRect.left + inset) {
                scrollElement(nav, Math.max(0, nav.scrollLeft + buttonRect.left - navRect.left - inset), nav.scrollTop, behavior);
            } else if (buttonRect.right > navRect.right - inset) {
                scrollElement(nav, nav.scrollLeft + buttonRect.right - navRect.right + inset, nav.scrollTop, behavior);
            }
            return;
        }
        if (buttonRect.top < navRect.top + inset) {
            scrollElement(nav, nav.scrollLeft, Math.max(0, nav.scrollTop + buttonRect.top - navRect.top - inset), behavior);
        } else if (buttonRect.bottom > navRect.bottom - inset) {
            scrollElement(nav, nav.scrollLeft, nav.scrollTop + buttonRect.bottom - navRect.bottom + inset, behavior);
        }
    };

    const setActive = (id: string, reveal = false, behavior: ScrollBehavior = "auto") => {
        const next = groupById.has(id) ? id : groups[0]?.dataset.settingsGroup || "";
        if (!next) return;
        const changed = activeId !== next;
        activeId = next;
        buttons.forEach((button) => {
            const selected = button.dataset.settingsNav === next;
            if (button.classList.contains("is-active") !== selected) button.classList.toggle("is-active", selected);
            if (button.getAttribute("aria-current") !== (selected ? "true" : "false")) button.setAttribute("aria-current", selected ? "true" : "false");
            if (selected && (reveal || changed)) keepButtonVisible(button, behavior);
        });
    };

    const syncFromScroll = () => {
        if (disposed) return;
        const scrollerRect = scroller.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        /* Horizontal mobile rail occupies the top of the viewport; the desktop
           vertical rail does not cover the cards, so only a small top inset is
           needed there. */
        const horizontal = isHorizontalRail();
        const threshold = scrollerRect.top + (horizontal ? navRect.height + 8 : 12);
        const visibleGroups = groups.filter(group => !group.hidden);
        let candidate = visibleGroups[0];
        for (const group of visibleGroups) {
            if (group.getBoundingClientRect().top <= threshold + 1) candidate = group;
            else break;
        }
        /* At the very bottom the last card can remain below the threshold when
           it is shorter than the viewport; make the terminal section active. */
        if (scroller.clientHeight > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) candidate = visibleGroups[visibleGroups.length - 1];
        setActive(candidate?.dataset.settingsGroup || "");
    };

    const scheduleSync = () => {
        if (disposed || frame) return;
        const request = typeof globalThis.requestAnimationFrame === "function"
            ? globalThis.requestAnimationFrame.bind(globalThis)
            : (callback: FrameRequestCallback) => globalThis.setTimeout(() => callback(Date.now()), 0);
        frame = request(() => {
            frame = 0;
            syncFromScroll();
        }) as number;
    };

    const onScroll = () => scheduleSync();
    const onResize = () => scheduleSync();
    const onNavClick = (event: Event) => {
        const target = asElement(event.target)?.closest<HTMLButtonElement>("[data-settings-nav]");
        if (!target || !nav.contains(target)) return;
        const id = target.dataset.settingsNav || "";
        const group = groupById.get(id);
        if (!group) return;
        setActive(id, true, options.reducedMotion ? "auto" : "smooth");
        const scrollRect = scroller.getBoundingClientRect();
        const groupRect = group.getBoundingClientRect();
        const offset = isHorizontalRail() ? nav.getBoundingClientRect().height + 8 : 12;
        const nextTop = scroller.scrollTop + groupRect.top - scrollRect.top - offset;
        const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        scrollElement(scroller, scroller.scrollLeft, Math.max(0, Math.min(maxTop, nextTop)), options.reducedMotion ? "auto" : "smooth");
        /* Do not synchronise immediately after starting a smooth scroll.  At
           narrow widths the old section is still above the threshold during
           the first animation frame; an eager sync would overwrite the
           clicked aria-current state before the target section is reached.
           The scroller's scroll event and observers perform the authoritative
           follow-up sync once geometry has actually changed. */
    };

    scroller.addEventListener("scroll", onScroll, {passive: true});
    nav.addEventListener("click", onNavClick);
    if (typeof IntersectionObserver !== "undefined") {
        intersectionObserver = new IntersectionObserver(() => scheduleSync(), {root: scroller, threshold: [0, 0.5, 1]});
        groups.forEach((group) => intersectionObserver?.observe(group));
    }
    if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(scroller);
        resizeObserver.observe(nav);
        groups.forEach((group) => resizeObserver?.observe(group));
    }
    /* The scroll position is restored after page binding, so defer the first
       pass to the next frame and read the final geometry. */
    scheduleSync();

    /* T-1563：重绘恢复——root 复用时回放查询与过滤；此前焦点在搜索框则物归原主。
       必须在 scheduleSync 定义之后（onSearch 内部会调度同步）。 */
    if (search && searchSession.query) {
        search.value = searchSession.query;
        onSearch();
        if (searchSession.hadFocus) search.focus({preventScroll: true});
    }

    return () => {
        if (disposed) return;
        disposed = true;
        /* T-1563：离开前保存查询与焦点位置（root 复用时恢复）。 */
        searchSession.query = search?.value || "";
        searchSession.activeIndex = activeIndex;
        searchSession.hadFocus = Boolean(search && typeof document !== "undefined" && document.activeElement === search);
        search?.removeEventListener("input", onSearchInput);
        search?.removeEventListener("keydown", onSearchKeyDown);
        search?.removeEventListener("compositionstart", onCompositionStart);
        search?.removeEventListener("compositionend", onCompositionEnd);
        scroller.removeEventListener("scroll", onScroll);
        nav.removeEventListener("click", onNavClick);
        if (frame) {
            if (typeof globalThis.cancelAnimationFrame === "function") globalThis.cancelAnimationFrame(frame);
            else globalThis.clearTimeout(frame);
            frame = 0;
        }
        intersectionObserver?.disconnect();
        resizeObserver?.disconnect();
    };
}
