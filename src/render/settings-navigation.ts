/* 设置页分类导航：让侧栏/横向分类栏随着右侧滚动内容保持同步。
   绑定只持有当前 root 的引用，并返回清理函数，重渲染时不会留下全局监听器。 */

export interface SettingsNavigationOptions {
    reducedMotion?: boolean;
}

type SettingsNavigationBinding = () => void;

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

    const keepButtonVisible = (button: HTMLElement, behavior: ScrollBehavior = "auto") => {
        const navRect = nav.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const horizontal = isHorizontalRail();
        const inset = 4;
        if (horizontal) {
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
        let candidate = groups[0];
        for (const group of groups) {
            if (group.getBoundingClientRect().top <= threshold + 1) candidate = group;
            else break;
        }
        /* At the very bottom the last card can remain below the threshold when
           it is shorter than the viewport; make the terminal section active. */
        if (scroller.clientHeight > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) candidate = groups[groups.length - 1];
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
        scheduleSync();
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

    return () => {
        if (disposed) return;
        disposed = true;
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
