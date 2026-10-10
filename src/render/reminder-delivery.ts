import {t} from "../i18n";
import {escapeHtml} from "../shared";
import {dateKey} from "../model";
import {projectReminderCenter, type ReminderUserAction} from "../reminders";
import type {CheckinStore} from "../types";
import type {OccasionStore} from "../occasions";
import {buildReminderDigest, isBannerCoveredReminder} from "../features/reminder-digest";
import {isWithinQuietHours, type DailyReminderPreference, type ReminderQuietHours} from "../features/reminder-preferences";
import {deserializeReminderDeliveryState, dueReminderDeliverySlots, markReminderDelivered, muteReminderDeliveryToday, type ReminderDeliveryState} from "../features/reminder-delivery";
import {showMessage} from "siyuan";

export const REMINDER_DELIVERY_STORAGE_NAME = "checkin-reminder-delivery";

export interface ReminderDeliveryHost {
    disposed: boolean;
    disposing: boolean;
    storageReady: boolean;
    store: CheckinStore;
    occasionStore: OccasionStore;
    reminderUserActions: ReminderUserAction[];
    occasionRemindOnce: boolean;
    dailyReminder: DailyReminderPreference;
    reminderQuietHours: ReminderQuietHours;
    palette: string;
    reducedMotion: boolean;
    dockElement?: HTMLElement;
    tabElement?: HTMLElement;
    quickDialogElement?: HTMLElement;
    /** 当前交互表面；仅用于在移动端选择提醒的挂载位置。 */
    activeRoot?: HTMLElement;
    withStorageLock<T>(operation: () => Promise<T>): Promise<T>;
    loadData(name: string): Promise<unknown>;
    saveData(name: string, value: unknown): Promise<unknown>;
    resolvedAppearance(): "light" | "dark";
    openQuickDialog(): void;
    showSummary(root?: HTMLElement): void;
    showReminderCenter?(root: HTMLElement): void;
    render(): void;
}

interface ReminderRuntime {
    state?: ReminderDeliveryState;
    notice?: HTMLElement;
    restoreFocus?: HTMLElement;
    placementObserver?: ResizeObserver;
    retryAt: number;
    failureDate?: string;
    failures: number;
    announcer?: HTMLElement;
    priorityDigest?: string;
}

const runtimes = new WeakMap<object, ReminderRuntime>();
let reminderNoticeSequence = 0;

function runtimeFor(host: object): ReminderRuntime {
    let runtime = runtimes.get(host);
    if (!runtime) {
        runtime = {retryAt: 0, failures: 0};
        runtimes.set(host, runtime);
    }
    return runtime;
}

function closeReminderNotice(host: object): void {
    const runtime = runtimeFor(host);
    const focused = runtime.notice?.contains(document.activeElement);
    runtime.notice?.remove();
    runtime.notice = undefined;
    if (focused && runtime.restoreFocus?.isConnected) runtime.restoreFocus.focus({preventScroll: true});
    runtime.restoreFocus = undefined;
}

function surfaceIsVisible(surface: HTMLElement | undefined): boolean {
    if (!surface?.isConnected) return false;
    try {
        const rects = typeof surface.getClientRects === "function" ? surface.getClientRects() : undefined;
        if (rects && rects.length === 0) return false;
        return typeof getComputedStyle !== "function" || getComputedStyle(surface).display !== "none";
    } catch {
        return true;
    }
}

function isCompactDock(surface: HTMLElement | undefined): boolean {
    if (!surface?.classList?.contains("lc-checkin-dock-host")) return false;
    try {
        const {width, height} = surface.getBoundingClientRect();
        /* A wide dock can still be a short landscape surface. Keep the
           transient notice in the dock flow there as well; a fixed toast
           would cover the task actions in a 350px-tall workbench. */
        return width > 0 && (width <= 719 || (height > 0 && height <= 480));
    } catch {
        return false;
    }
}

function isCompactSurface(surface: HTMLElement | undefined): boolean {
    if (!surface?.classList) return false;
    if (isCompactDock(surface)) return true;
    if (!surface.classList.contains("lc-checkin-tab-host")
        && !surface.classList.contains("lc-checkin-dialog-host")) return false;
    try {
        const width = surface.getBoundingClientRect().width;
        return width > 0 && width <= 719;
    } catch {
        return false;
    }
}

function mobileReminderMountFor(host: ReminderDeliveryHost, root?: HTMLElement): {host: HTMLElement; surface: HTMLElement} | undefined {
    const focusedSurface = typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? (document.activeElement.closest?.<HTMLElement>(".lc-checkin-host--mobile, .lc-checkin-dialog-host--mobile, .lc-checkin-tab-host, .lc-checkin-dialog-host") ?? undefined)
        : undefined;
    const candidates = [root, focusedSurface, host.activeRoot, host.quickDialogElement, host.tabElement, host.dockElement];
    const surface = candidates.find((candidate) => {
        if (!surfaceIsVisible(candidate)) return false;
        return Boolean(candidate?.classList?.contains("lc-checkin-host--mobile")
            || candidate?.classList?.contains("lc-checkin-dialog-host--mobile")
            || candidate?.classList?.contains("lc-checkin-dock-host")
            || candidate?.classList?.contains("lc-checkin-tab-host")
            || candidate?.classList?.contains("lc-checkin-dialog-host")
            || isCompactSurface(candidate)
            || candidate?.querySelector?.(".lc-checkin-host--mobile, .lc-checkin-dialog-host--mobile, .lc-checkin__mobile-topbar")
            || candidate?.querySelector?.(".lc-checkin-tab-host, .lc-checkin-dialog-host"));
    });
    if (!surface) return undefined;
    const page = surface.querySelector<HTMLElement>(".lc-checkin");
    if (!page || typeof surface.insertBefore !== "function") return undefined;
    return {host: surface, surface: page};
}

function watchReminderPlacement(host: ReminderDeliveryHost): void {
    const runtime = runtimeFor(host);
    if (runtime.placementObserver || typeof ResizeObserver === "undefined") return;
    const surfaces = [host.activeRoot, host.dockElement, host.tabElement, host.quickDialogElement]
        .filter((surface, index, all): surface is HTMLElement => Boolean(surface) && all.indexOf(surface) === index);
    if (!surfaces.length) return;
    const observer = new ResizeObserver(() => ensureReminderNoticePlacementFor(host));
    surfaces.forEach((surface) => observer.observe(surface));
    runtime.placementObserver = observer;
}

/** Keep an existing mobile notice in the host flow after a page redraw. */
export function ensureReminderNoticePlacementFor(host: ReminderDeliveryHost, root?: HTMLElement): void {
    watchReminderPlacement(host);
    const notice = runtimeFor(host).notice;
    if (!notice) return;
    const mount = mobileReminderMountFor(host, root);
    if (mount) {
        notice.classList?.add("lc-checkin__daily-reminder-notice--inline");
        const layout = mount.surface.querySelector<HTMLElement>(".lc-checkin__layout");
        if (layout) {
            if (notice.parentElement !== mount.surface || notice.nextElementSibling !== layout) mount.surface.insertBefore(notice, layout);
        } else if (notice.parentElement !== mount.host || notice.nextElementSibling !== mount.surface) {
            mount.host.insertBefore(notice, mount.surface);
        }
        return;
    }
    notice.classList?.remove("lc-checkin__daily-reminder-notice--inline");
    if (!notice.isConnected || !surfaceIsVisible(notice.parentElement ?? undefined)) document.body.appendChild(notice);
}

export function stopReminderDeliveryFor(host: object): void {
    closeReminderNotice(host);
    const runtime = runtimeFor(host);
    runtime.placementObserver?.disconnect();
    runtime.placementObserver = undefined;
    runtime.announcer?.remove();
    runtimes.delete(host);
}

export function syncPriorityReminderAnnouncementFor(host: ReminderDeliveryHost, root?: HTMLElement, now = new Date()): void {
    if (host.disposed || host.disposing) return;
    const runtime = runtimeFor(host);
    if (!runtime.announcer) {
        runtime.announcer = document.createElement("div");
        runtime.announcer.className = "lc-checkin__reminder-announcer";
        runtime.announcer.setAttribute("role", "status");
        runtime.announcer.setAttribute("aria-live", "polite");
        runtime.announcer.setAttribute("aria-atomic", "true");
        document.body.appendChild(runtime.announcer);
    }
    if (!host.dailyReminder.enabled || runtime.state?.mutedDates.includes(dateKey(now))
        || isWithinQuietHours(now.getHours() * 60 + now.getMinutes(), host.reminderQuietHours)) closeReminderNotice(host);
    const surfaces = root ? [root] : [host.dockElement, host.tabElement, host.quickDialogElement];
    const card = surfaces.filter((surface) => surface?.isConnected).map((surface) => surface?.querySelector<HTMLElement>("[data-priority-reminder]")).find(Boolean);
    if (!runtime.state || !card) return;
    const digest = card.dataset.priorityDigest;
    if (!digest || runtime.priorityDigest === digest) return;
    runtime.priorityDigest = digest;
    if (runtime.notice?.isConnected || !shouldAnnouncePriorityRemindersFor(host, now)) return;
    runtime.announcer.textContent = card.dataset.priorityAnnouncement ?? "";
}

export function shouldAnnouncePriorityRemindersFor(host: Pick<ReminderDeliveryHost, "dailyReminder" | "reminderQuietHours">, now = new Date()): boolean {
    const runtime = runtimeFor(host);
    return Boolean(runtime.state && host.dailyReminder.enabled && !runtime.state.mutedDates.includes(dateKey(now))
        && !isWithinQuietHours(now.getHours() * 60 + now.getMinutes(), host.reminderQuietHours));
}

async function readReminderDeliveryState(host: ReminderDeliveryHost, now: Date): Promise<ReminderDeliveryState> {
    const state = deserializeReminderDeliveryState(await host.loadData(REMINDER_DELIVERY_STORAGE_NAME), dateKey(now));
    if (!state) throw new Error("Invalid reminder delivery state");
    runtimeFor(host).state = state;
    return state;
}

export async function refreshReminderDeliveryStateFor(host: ReminderDeliveryHost, now = new Date()): Promise<void> {
    if (host.disposed || host.disposing || !host.storageReady) return;
    try {
        const previous = shouldAnnouncePriorityRemindersFor(host, now);
        const state = await readReminderDeliveryState(host, now);
        /* 读取可能跨过切页/卸载；迟到状态不能复活 runtime、关闭新提示或触发 detached render。 */
        if (host.disposed || host.disposing || !host.storageReady) return;
        if (state.mutedDates.includes(dateKey(now)) || !host.dailyReminder.enabled) closeReminderNotice(host);
        if (previous !== shouldAnnouncePriorityRemindersFor(host, now) && !host.disposed && !host.disposing) host.render();
        syncPriorityReminderAnnouncementFor(host, undefined, now);
    } catch {
        runtimeFor(host).state = undefined;
    }
}

function recordDeliveryFailure(host: ReminderDeliveryHost, now: Date): void {
    const runtime = runtimeFor(host);
    const today = dateKey(now);
    if (runtime.failureDate !== today) runtime.failures = 0;
    runtime.failureDate = today;
    runtime.failures += 1;
    runtime.retryAt = now.getTime() + [60000, 300000, 900000][Math.min(runtime.failures - 1, 2)];
    if (runtime.failures === 1 && !host.disposed && !host.disposing) showMessage(t("reminder.deliveryFailed"));
}

export function openReminderCenterFor(host: Pick<ReminderDeliveryHost, "openQuickDialog" | "showSummary" | "showReminderCenter" | "dockElement" | "tabElement" | "quickDialogElement">, root?: HTMLElement): void {
    /* A reminder action can outlive the surface that rendered it (for example,
       a quick dialog is closed while the notice remains mounted).  Do not send
       navigation into that detached tree; prefer a currently connected surface
       so the center is visible after the action completes. */
    let target = (root?.isConnected ? root : undefined)
        ?? [host.quickDialogElement, host.tabElement, host.dockElement].find((surface) => surface?.isConnected);
    if (!target) {
        host.openQuickDialog();
        target = host.quickDialogElement;
    }
    if (target && host.showReminderCenter) host.showReminderCenter(target);
    else host.showSummary(target);
    const center = target?.querySelector<HTMLElement>(".lc-checkin__reminder-center");
    const title = center?.querySelector<HTMLElement>("h2");
    center?.scrollIntoView({block: "start"});
    title?.setAttribute("tabindex", "-1");
    title?.focus({preventScroll: true});
}

function prepareReminderNotice(host: ReminderDeliveryHost, message: string, now: Date): HTMLElement {
    const notice = document.createElement("aside");
    const hintId = `lc-daily-reminder-hint-${++reminderNoticeSequence}`;
    notice.className = "lc-checkin__daily-reminder-notice";
    notice.dataset.appearance = host.resolvedAppearance();
    notice.dataset.palette = host.palette;
    notice.dataset.reducedMotion = String(host.reducedMotion);
    notice.dataset.dailyReminderNotice = dateKey(now);
    notice.setAttribute("role", "region");
    notice.setAttribute("aria-label", t("today.priorityTitle"));
    notice.setAttribute("aria-describedby", hintId);
    notice.innerHTML = `<div class="lc-checkin__daily-reminder-message" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(message)}</div><p id="${hintId}">${escapeHtml(t("reminder.noticeHint"))}</p><div class="lc-checkin__daily-reminder-actions"><button class="lc-checkin__text-button" type="button" data-daily-reminder-center>${escapeHtml(t("today.priorityViewAll"))}</button><button class="lc-checkin__text-button" type="button" data-daily-reminder-mute>${escapeHtml(t("reminder.muteToday"))}</button><button class="lc-checkin__text-button" type="button" data-daily-reminder-close>${escapeHtml(t("common.close"))}</button></div><small data-daily-reminder-error role="alert" hidden></small>`;
    notice.querySelector("[data-daily-reminder-close]")?.addEventListener("click", () => closeReminderNotice(host));
    notice.querySelector("[data-daily-reminder-center]")?.addEventListener("click", () => {
        closeReminderNotice(host);
        openReminderCenterFor(host);
    });
    notice.querySelector<HTMLButtonElement>("[data-daily-reminder-mute]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        button.disabled = true;
        notice.setAttribute("aria-busy", "true");
        const saved = await muteDailyReminderTodayFor(host);
        if (!saved && notice.isConnected) {
            const error = notice.querySelector<HTMLElement>("[data-daily-reminder-error]");
            if (error) { error.hidden = false; error.textContent = t("reminder.muteFailed"); }
            button.disabled = false;
            notice.setAttribute("aria-busy", "false");
        }
    });
    notice.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        closeReminderNotice(host);
    });
    return notice;
}

export async function muteDailyReminderTodayFor(host: ReminderDeliveryHost, now = new Date()): Promise<boolean> {
    if (host.disposed || host.disposing || !host.storageReady) return false;
    try {
        await host.withStorageLock(async () => {
            if (host.disposed || host.disposing) throw new Error("Reminder host closed");
            const state = await readReminderDeliveryState(host, now);
            const next = muteReminderDeliveryToday(state, dateKey(now));
            await host.saveData(REMINDER_DELIVERY_STORAGE_NAME, JSON.stringify(next));
            runtimeFor(host).state = next;
        });
        closeReminderNotice(host);
        if (!host.disposed && !host.disposing) {
            host.render();
            showMessage(t("reminder.mutedToday"));
        }
        return true;
    } catch { return false; }
}

export async function maybeSendDailyReminderFor(host: ReminderDeliveryHost, trigger: "launch" | "slot" = "launch", now = new Date()): Promise<void> {
    if (host.disposed || host.disposing || !host.storageReady) return;
    if (!host.dailyReminder.enabled || isWithinQuietHours(now.getHours() * 60 + now.getMinutes(), host.reminderQuietHours)) {
        closeReminderNotice(host);
        return;
    }
    const runtime = runtimeFor(host);
    if (runtime.failureDate !== dateKey(now)) runtime.retryAt = 0;
    if (runtime.notice && runtime.notice.dataset.dailyReminderNotice !== dateKey(now)) closeReminderNotice(host);
    if (now.getTime() < runtime.retryAt) return;
    try {
        await host.withStorageLock(async () => {
            if (host.disposed || host.disposing || !host.dailyReminder.enabled) return;
            const state = await readReminderDeliveryState(host, now);
            if (host.disposed || host.disposing || !host.storageReady) return;
            if (state.mutedDates.includes(dateKey(now))) { closeReminderNotice(host); return; }
            const today = dateKey(now);
            const slots = dueReminderDeliverySlots(state, today, now.getHours() * 60 + now.getMinutes(), host.dailyReminder);
            if (!slots.length) return;
            const entries = projectReminderCenter(host.store, host.occasionStore, now, host.reminderUserActions, {advanceOnce: host.occasionRemindOnce});
            const actionable = entries.filter((entry) => entry.status === "overdue" || (entry.status === "today" && !isBannerCoveredReminder(entry, today)));
            const digest = buildReminderDigest(actionable, {today});
            if (!digest.total) return;
            const formatNames = (segment: {names: string[]; overflow: number}) => {
                const names = segment.names.join(t("msg.reminderDigestNameJoin"));
                return t("msg.reminderDigestNames", {names: segment.overflow ? `${names}${t("msg.reminderDigestOverflow", {n: segment.overflow})}` : names});
            };
            const body = [
                digest.today ? t("msg.reminderDigestToday", {count: digest.today.count, names: formatNames(digest.today)}) : "",
                digest.overdue ? t("msg.reminderDigestOverdue", {count: digest.overdue.count, names: formatNames(digest.overdue)}) : "",
            ].filter(Boolean).join(t("msg.reminderDigestJoin"));
            const notice = prepareReminderNotice(host, t("msg.dailyReminder", {body}), now);
            const next = markReminderDelivered(state, today, slots);
            await host.saveData(REMINDER_DELIVERY_STORAGE_NAME, JSON.stringify(next));
            try {
                if (host.disposed || host.disposing) throw new Error("Reminder host closed");
                closeReminderNotice(host);
                runtime.restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
                runtime.notice = notice;
                /* Use the same placement path as redraws.  This keeps the
                   first mount before the scrollable layout inside the
                   visible page instead of briefly mounting as a host sibling
                   and then moving after the next resize/render. */
                ensureReminderNoticePlacementFor(host);
                runtime.state = next;
                runtime.failures = 0;
                runtime.retryAt = 0;
            } catch (error) {
                /* 身份已先写入；挂载失败时必须回滚，否则下一次启动会误以为提醒已经展示。即使宿主刚卸载，也保留这次持久化修复。 */
                if (!host.storageReady) return;
                await host.saveData(REMINDER_DELIVERY_STORAGE_NAME, JSON.stringify(state));
                runtime.state = state;
                throw error;
            }
        });
        syncPriorityReminderAnnouncementFor(host, undefined, now);
    } catch { recordDeliveryFailure(host, now); }
}
