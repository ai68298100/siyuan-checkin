import {t} from "../i18n";
import type {CheckinItem} from "../types";

export interface MoreNavigationHost {
    showToday(root?: HTMLElement): void;
    showArchived(root?: HTMLElement): void;
    showSettings(root?: HTMLElement): void;
    showEditor(item?: CheckinItem, returnTo?: "today" | "review" | "insights" | "more", root?: HTMLElement): void;
    pageForRoot?(root: HTMLElement): string;
}

const MORE_DESTINATIONS = [
    ["search", "more.searchTitle", "more.searchHint"],
    ["new-project", "more.newProjectTitle", "more.newProjectHint"],
    ["appearance", "more.appearanceTitle", "more.appearanceHint"],
    ["data", "more.dataTitle", "more.dataHint"],
    ["external", "more.externalTitle", "more.externalHint"],
    ["archived", "more.archivedTitle", "more.archivedHint"],
    ["about", "more.aboutTitle", "more.aboutHint"],
] as const;

export function renderMoreView(): string {
    const destinations = MORE_DESTINATIONS.map(([action, title, hint]) =>
        `<button class="lc-checkin__more-destination" type="button" data-more-action="${action}"><span><strong>${t(title)}</strong><small>${t(hint)}</small></span><span class="lc-checkin__more-arrow" aria-hidden="true">›</span></button>`).join("");
    return `<div class="lc-checkin lc-checkin--history lc-checkin--more"><header class="lc-checkin__editor-header"><div><div class="lc-checkin__eyebrow">${t("more.eyebrow")}</div><h1 class="lc-checkin__title">${t("nav.more")}</h1></div></header><main class="lc-checkin__more-destinations" aria-label="${t("more.destinationsAria")}">${destinations}</main></div>`;
}

export function bindMoreNavigationFor(host: MoreNavigationHost, root: HTMLElement): void {
    root.querySelectorAll<HTMLButtonElement>("[data-more-action]").forEach((button) => button.addEventListener("click", () => {
        const action = button.dataset.moreAction;
        if (action === "search") {
            host.showToday(root);
            if (host.pageForRoot?.(root) === "today" || !host.pageForRoot) root.querySelector<HTMLInputElement>("[data-today-search]")?.focus();
            return;
        }
        if (action === "new-project") {
            host.showEditor(undefined, "more", root);
            return;
        }
        if (action === "archived") {
            host.showArchived(root);
            return;
        }
        const group = action === "appearance" || action === "data" || action === "external" || action === "about" ? action : undefined;
        if (!group) return;
        host.showSettings(root);
        if (host.pageForRoot?.(root) === "settings") root.querySelector<HTMLButtonElement>(`[data-settings-nav="${group}"]`)?.click();
    }));
}
