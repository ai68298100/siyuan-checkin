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

export function stopReminderDeliveryFor(host: object): void {
    closeReminderNotice(host);
    runtimeFor(host).announcer?.remove();
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
                document.body.appendChild(notice);
                runtime.notice = notice;
                runtime.state = next;
                runtime.failures = 0;
                runtime.retryAt = 0;
            } catch (error) {
                await host.saveData(REMINDER_DELIVERY_STORAGE_NAME, JSON.stringify(state));
                runtime.state = state;
                throw error;
            }
        });
        syncPriorityReminderAnnouncementFor(host, undefined, now);
    } catch { recordDeliveryFailure(host, now); }
}
