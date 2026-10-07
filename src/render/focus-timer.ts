/* 专注计时面板：从 index.ts 外置（T-022）。
   倒计时状态由宿主持有，本模块负责渲染、秒级刷新与面板内交互绑定。 */
import {t} from "../i18n";
import {captureActionMoment, calendarDateFromKey, escapeHtml, renderIconMarkup} from "../shared";
import {showMessage} from "siyuan";
import type {CheckinEvent, CheckinItem, CheckinStore} from "../types";
import {getActiveItemById, getItemById, getItemRevisionForDate} from "../model";
import {advanceFocusClock, createFocusClock, focusRemainingSec, type FocusClock, type FocusClockSample} from "../focus-clock";

export interface FocusTimerState {
    itemId: string;
    totalSec: number;
    remainingSec: number;
    running: boolean;
    saveStatus?: "saving" | "failed";
    pauseReason?: "inactive" | "clock";
}

export interface FocusTimerHost {
    store: CheckinStore;
    disposed: boolean;
    disposing: boolean;
    focusTimerState?: FocusTimerState;
    focusTimerInterval?: number;
    focusCelebrationTimer?: number;
    focusTimerRoot?: HTMLElement;
    dockElement?: HTMLElement;
    tabElement?: HTMLElement;
    quickDialogElement?: HTMLElement;
    focusTimerMinutes: number;
    celebration?: {message: string; itemName: string};
    render(): void;
    revisionFingerprint(item: CheckinItem, date: Date): string;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    recordEvent(item: CheckinItem, value: number, moment: {occurredAt: string; localDate: string}, expectedRevisionFingerprint?: string, note?: string, attachment?: string): Promise<CheckinEvent | undefined>;
}

interface FocusSettlement {
    item: CheckinItem;
    value: number;
    moment: {occurredAt: string; localDate: string};
    fingerprint: string;
    note: string;
}

interface FocusSession {
    clock: FocusClock;
    settlement?: FocusSettlement;
    completion?: Promise<void>;
    recorded?: CheckinEvent;
}

const sessions = new WeakMap<FocusTimerState, FocusSession>();
const lifecycleCleanups = new WeakMap<FocusTimerHost, () => void>();

function isFocusPageVisible(): boolean {
    return typeof document === "undefined" || (!document.hidden && document.visibilityState !== "hidden");
}

function sampleFocusClock(): FocusClockSample {
    const wallMs = Date.now();
    return {wallMs, monotonicMs: typeof performance === "undefined" ? wallMs : performance.now()};
}

function sessionFor(state: FocusTimerState): FocusSession {
    let session = sessions.get(state);
    if (!session) {
        session = {clock: createFocusClock(sampleFocusClock(), (state.totalSec - state.remainingSec) * 1000)};
        sessions.set(state, session);
    }
    return session;
}

function refreshFocusClock(state: FocusTimerState): FocusSession {
    const session = sessionFor(state);
    if (state.running && !isFocusPageVisible()) {
        state.running = false;
        state.pauseReason = "inactive";
    }
    session.clock = advanceFocusClock(session.clock, sampleFocusClock(), state.running, state.totalSec);
    if (session.clock.interrupted) {
        state.running = false;
        state.pauseReason = "clock";
    }
    state.remainingSec = focusRemainingSec(session.clock, state.totalSec);
    return session;
}

function focusRootsFor(host: FocusTimerHost): HTMLElement[] {
    if (host.focusTimerRoot?.isConnected === false) host.focusTimerRoot = undefined;
    return [...new Set([host.focusTimerRoot, host.dockElement, host.tabElement, host.quickDialogElement])]
        .filter((root): root is HTMLElement => root !== undefined && root.isConnected !== false);
}

function focusStatusText(state: Pick<FocusTimerState, "running" | "saveStatus" | "pauseReason">, compact = false): string {
    if (state.saveStatus === "saving") return t("focus.saving");
    if (state.saveStatus === "failed") return t("focus.saveFailed");
    if (state.pauseReason) {
        if (compact) return t("focus.pausedAuto");
        return t(state.pauseReason === "inactive" ? "focus.pausedInactive" : "focus.pausedClock");
    }
    return state.running ? "" : t("focus.pause");
}

function focusMiniState(state: Pick<FocusTimerState, "running" | "saveStatus" | "pauseReason">): "saving" | "failed" | "paused" | "running" {
    if (state.saveStatus === "saving") return "saving";
    if (state.saveStatus === "failed") return "failed";
    return state.running && !state.pauseReason ? "running" : "paused";
}

function focusTimeText(remainingSec: number): string {
    return `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, "0")}`;
}

function paintFocusRoots(host: FocusTimerHost, state: FocusTimerState): void {
    for (const root of focusRootsFor(host)) {
        root.querySelectorAll?.<HTMLElement>("[data-focus-timer]").forEach((panel) => paintFocusTimer(panel, state));
        root.querySelectorAll?.<HTMLElement>("[data-focus-mini-remaining]").forEach((remaining) => {
            remaining.textContent = focusTimeText(state.remainingSec);
        });
        root.querySelectorAll?.<HTMLElement>("[data-focus-mini-status]").forEach((status) => {
            status.textContent = focusStatusText(state, true);
            status.hidden = !status.textContent;
        });
        root.querySelectorAll?.<HTMLElement>("[data-focus-mini]").forEach((mini) => {
            mini.dataset.focusMiniState = focusMiniState(state);
        });
    }
}

function bindFocusTimerLifecycle(host: FocusTimerHost): void {
    const pause = () => {
        const state = host.focusTimerState;
        if (!state || !state.running || host.disposed || host.disposing) return;
        const session = sessionFor(state);
        session.clock = advanceFocusClock(session.clock, sampleFocusClock(), true, state.totalSec);
        state.remainingSec = focusRemainingSec(session.clock, state.totalSec);
        state.running = false;
        state.pauseReason = session.clock.interrupted ? "clock" : "inactive";
        paintFocusRoots(host, state);
    };
    const show = () => {
        const state = host.focusTimerState;
        if (!state || host.disposed || host.disposing) return;
        refreshFocusClock(state);
        paintFocusRoots(host, state);
    };
    const visibilityChanged = () => {
        if (isFocusPageVisible()) show();
        else pause();
    };
    if (typeof document !== "undefined") document.addEventListener?.("visibilitychange", visibilityChanged);
    window.addEventListener?.("pagehide", pause);
    window.addEventListener?.("blur", pause);
    window.addEventListener?.("pageshow", show);
    window.addEventListener?.("focus", show);
    lifecycleCleanups.set(host, () => {
        if (typeof document !== "undefined") document.removeEventListener?.("visibilitychange", visibilityChanged);
        window.removeEventListener?.("pagehide", pause);
        window.removeEventListener?.("blur", pause);
        window.removeEventListener?.("pageshow", show);
        window.removeEventListener?.("focus", show);
    });
}

export function openFocusTimerFor(host: FocusTimerHost, itemId: string): void {
    if (host.disposed || host.disposing) return;
    const item = getActiveItemById(host.store, itemId);
    if (!item) return;
    if (host.focusTimerState) {
        if (host.focusTimerState.itemId !== itemId) showMessage(t("focus.switchPending"));
        revealFocusTimerFor(host);
        return;
    }
    clearFocusTimerTimers(host);
    host.focusTimerState = {itemId, totalSec: host.focusTimerMinutes * 60, remainingSec: host.focusTimerMinutes * 60, running: isFocusPageVisible(), pauseReason: isFocusPageVisible() ? undefined : "inactive"};
    sessions.set(host.focusTimerState, {clock: createFocusClock(sampleFocusClock())});
    bindFocusTimerLifecycle(host);
    host.focusTimerInterval = window.setInterval(() => tickFocusTimerFor(host), 1000);
    /* T-1596：会话标记（sessionStorage）——重载后据此明确告知「上次会话中断未入账」。 */
    try { window.sessionStorage?.setItem("lc-focus-session", itemId); } catch { /* 隐私模式等场景静默 */ }
    revealFocusTimerFor(host);
}

/** Opening the entry again reveals the existing session; it never resets it. */
function revealFocusTimerFor(host: FocusTimerHost): void {
    host.render();
    host.focusTimerRoot?.querySelector<HTMLElement>("[data-focus-timer]")?.scrollIntoView({block: "nearest"});
}

/** 停掉秒级心跳与庆祝提示的延时器：思源不会代插件清理自有定时器，卸载路径必须显式调用。 */
export function stopFocusTimerFor(host: FocusTimerHost): void {
    const saving = host.focusTimerState?.saveStatus === "saving";
    clearFocusTimerTimers(host);
    host.focusTimerState = undefined;
    host.focusTimerRoot = undefined;
    if (!saving) clearFocusSessionMarker();
}

function clearFocusSessionMarker(): void {
    try { window.sessionStorage?.removeItem("lc-focus-session"); } catch {}
}

function clearFocusTimerTimers(host: FocusTimerHost): void {
    if (host.focusTimerInterval !== undefined) { window.clearInterval(host.focusTimerInterval); host.focusTimerInterval = undefined; }
    if (host.focusCelebrationTimer !== undefined) { window.clearTimeout(host.focusCelebrationTimer); host.focusCelebrationTimer = undefined; }
    lifecycleCleanups.get(host)?.();
    lifecycleCleanups.delete(host);
    host.celebration = undefined;
}

export function tickFocusTimerFor(host: FocusTimerHost): void {
    if (host.disposed || host.disposing) { stopFocusTimerFor(host); return; }
    const state = host.focusTimerState;
    if (!state) return;
    refreshFocusClock(state);
    paintFocusRoots(host, state);
    if (state.running && state.remainingSec <= 0) void finishFocusTimerFor(host, true);
}

export function paintFocusTimer(panel: HTMLElement, state: Pick<FocusTimerState, "remainingSec" | "totalSec" | "running" | "saveStatus" | "pauseReason">): void {
    const time = panel.querySelector<HTMLElement>("[data-focus-remaining]");
    if (time) {
        time.textContent = focusTimeText(state.remainingSec);
    }
    const bar = panel.querySelector<HTMLElement>("[data-focus-progress] span");
    if (bar) bar.style.width = `${Math.round(((state.totalSec - state.remainingSec) / state.totalSec) * 100)}%`;
    const toggle = panel.querySelector<HTMLButtonElement>("[data-action='focus-toggle']");
    if (toggle) {
        toggle.textContent = t(state.running ? "focus.pause" : "focus.resume");
        toggle.disabled = Boolean(state.saveStatus);
    }
    const finish = panel.querySelector<HTMLButtonElement>("[data-action='focus-finish']");
    if (finish) {
        finish.textContent = t(state.saveStatus === "failed" ? "msg.retrySave" : "focus.finish");
        finish.disabled = state.saveStatus === "saving";
    }
    const abandon = panel.querySelector<HTMLButtonElement>("[data-action='focus-abandon']");
    if (abandon) abandon.disabled = state.saveStatus === "saving";
    const status = panel.querySelector<HTMLElement>("[data-focus-save-status]");
    if (status) {
        status.textContent = state.saveStatus || state.pauseReason ? focusStatusText(state) : "";
        status.hidden = !status.textContent;
        status.setAttribute("role", state.saveStatus === "failed" ? "alert" : "status");
    }
    panel.setAttribute("aria-busy", String(state.saveStatus === "saving"));
    panel.querySelectorAll<HTMLButtonElement>("[data-focus-timer-minutes]").forEach((button) => {
        const selected = state.totalSec === Number(button.dataset.focusTimerMinutes) * 60;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
        button.disabled = Boolean(state.saveStatus);
    });
}

/** T-1596：跨页小条——专注进行中时，其他表面显示紧凑剩余时间与「回到专注」入口。 */
export function renderFocusMiniStripFor(host: FocusTimerHost): string {
    const state = host.focusTimerState;
    if (!state) return "";
    refreshFocusClock(state);
    const item = getItemById(host.store, state.itemId);
    const name = item ? item.name : t("focus.defaultItemName");
    return `<div class="lc-checkin__focus-mini" data-focus-mini data-focus-mini-state="${focusMiniState(state)}" role="status" aria-label="${t("focus.miniAria")}"><span class="lc-checkin__focus-mini-icon" aria-hidden="true">⏱</span><strong title="${escapeHtml(name)}">${escapeHtml(name)}</strong><span class="lc-checkin__focus-mini-time" data-focus-mini-remaining>${focusTimeText(state.remainingSec)}</span><small data-focus-mini-status ${focusStatusText(state, true) ? "" : "hidden"}>${escapeHtml(focusStatusText(state, true))}</small><button class="lc-checkin__text-button" type="button" data-focus-mini-back>${t("focus.miniBack")}</button></div>`;
}

export function finishFocusTimerFor(host: FocusTimerHost, complete: boolean): Promise<void> {
    const state = host.focusTimerState;
    if (!state || host.disposed) return Promise.resolve();
    const session = sessionFor(state);
    if (state.saveStatus === "saving") return session.completion ?? Promise.resolve();
    if (!complete) {
        stopFocusTimerFor(host);
        if (!host.disposing) host.render();
        return Promise.resolve();
    }
    refreshFocusClock(state);
    state.running = false;
    if (host.focusTimerInterval !== undefined) {
        window.clearInterval(host.focusTimerInterval);
        host.focusTimerInterval = undefined;
    }
    const elapsedMinutes = Math.floor(session.clock.elapsedMs / 60000);
    if (elapsedMinutes < 1) {
        stopFocusTimerFor(host);
        if (!host.disposing) {
            showMessage(t("msg.focusTooShort"));
            host.render();
        }
        return Promise.resolve();
    }
    if (!session.settlement) {
        const item = getActiveItemById(host.store, state.itemId);
        if (item) {
            const moment = captureActionMoment();
            const date = calendarDateFromKey(moment.localDate);
            const fingerprint = host.revisionFingerprint(item, date);
            const revision = getItemRevisionForDate(item, date);
            session.settlement = {
                item: {...item}, value: revision.unit === "小时" ? elapsedMinutes / 60 : elapsedMinutes,
                moment, fingerprint, note: t("focus.noteMinutes", {n: elapsedMinutes}),
            };
        }
    }
    const settlement = session.settlement;
    if (!settlement) {
        state.saveStatus = "failed";
        if (!host.disposing) {
            showMessage(t("set.itemMissing"));
            host.render();
        }
        return Promise.resolve();
    }
    state.saveStatus = "saving";
    let operation: Promise<CheckinEvent | undefined>;
    try {
        operation = host.enqueueMutation(async () => {
            const recorded = await host.recordEvent(settlement.item, settlement.value, settlement.moment, settlement.fingerprint, settlement.note);
            if (recorded?.id) session.recorded = recorded;
            return recorded;
        });
    } catch (error) {
        operation = Promise.reject(error);
    }
    session.completion = settleFocusTimer(host, state, session, settlement, operation);
    if (!host.disposing) host.render();
    return session.completion;
}

async function settleFocusTimer(host: FocusTimerHost, state: FocusTimerState, session: FocusSession, settlement: FocusSettlement, operation: Promise<CheckinEvent | undefined>): Promise<void> {
    let recorded: CheckinEvent | undefined;
    try { recorded = await operation; } catch { recorded = session.recorded; }
    session.completion = undefined;
    if (!recorded?.id) {
        state.saveStatus = "failed";
        if (host.focusTimerState === state && !host.disposed && !host.disposing) host.render();
        return;
    }
    if (host.focusTimerState !== state) {
        if (!host.focusTimerState) clearFocusSessionMarker();
        return;
    }
    state.saveStatus = undefined;
    stopFocusTimerFor(host);
    if (host.disposed || host.disposing) return;
    host.celebration = {message: settlement.note, itemName: settlement.item.name};
    host.focusCelebrationTimer = window.setTimeout(() => {
        host.focusCelebrationTimer = undefined;
        if (host.disposed || host.disposing) return;
        host.celebration = undefined;
        host.render();
    }, 6000);
    host.render();
}

export function renderFocusTimerPanelFor(host: FocusTimerHost): string {
    const state = host.focusTimerState;
    if (!state) return "";
    refreshFocusClock(state);
    const item = getItemById(host.store, state.itemId);
    const name = item ? item.name : t("focus.defaultItemName");
    const icon = item ? item.icon : "⏱";
    const presets = [15, 25, 45, 60].map((minutes) => `<button type="button" data-focus-timer-minutes="${minutes}" aria-label="${t("focus.presetMinutes", {n: minutes})}" aria-pressed="${state.totalSec === minutes * 60}" class="${state.totalSec === minutes * 60 ? "is-selected" : ""}" ${state.saveStatus ? "disabled" : ""}>${minutes}</button>`).join("");
    return `<div class="lc-checkin__focus-timer" data-focus-timer role="dialog" aria-label="${t("focus.timerAria")}" aria-busy="${state.saveStatus === "saving"}">
            <div class="lc-checkin__focus-head"><span class="lc-checkin__focus-icon" aria-hidden="true">${renderIconMarkup(icon)}</span><strong title="${escapeHtml(name)}">${escapeHtml(name)}</strong></div>
            <div class="lc-checkin__focus-time" data-focus-remaining>${focusTimeText(state.remainingSec)}</div>
            <div class="lc-checkin__focus-progress" data-focus-progress><span style="width: ${Math.round(((state.totalSec - state.remainingSec) / state.totalSec) * 100)}%"></span></div>
            <div class="lc-checkin__focus-presets" role="group" aria-label="${t("focus.presetsAria")}">${presets}</div>
            <div data-focus-save-status role="${state.saveStatus === "failed" ? "alert" : "status"}" style="grid-column: 1 / -1;" ${state.saveStatus || state.pauseReason ? "" : "hidden"}>${state.saveStatus || state.pauseReason ? escapeHtml(focusStatusText(state)) : ""}</div>
            <div class="lc-checkin__focus-actions">
                <button class="lc-checkin__text-button" type="button" data-action="focus-toggle" ${state.saveStatus ? "disabled" : ""}>${t(state.running ? "focus.pause" : "focus.resume")}</button>
                <button class="lc-checkin__text-button" type="button" data-action="focus-finish" ${state.saveStatus === "saving" ? "disabled" : ""}>${t(state.saveStatus === "failed" ? "msg.retrySave" : "focus.finish")}</button>
                <button class="lc-checkin__text-button" type="button" data-action="focus-abandon" ${state.saveStatus === "saving" ? "disabled" : ""}>${t("focus.abandon")}</button>
            </div>
        </div>`;
}

export function bindFocusTimerPanelFor(host: FocusTimerHost, root: HTMLElement): void {
    const panel = root.querySelector<HTMLElement>("[data-focus-timer]");
    if (!panel || panel.dataset.bound === "true") return;
    panel.dataset.bound = "true";
    panel.querySelector<HTMLButtonElement>("[data-action='focus-toggle']")?.addEventListener("click", () => {
        const state = host.focusTimerState;
        if (!state || state.saveStatus) return;
        const wasRunning = state.running;
        const session = refreshFocusClock(state);
        if (state.remainingSec <= 0) { void finishFocusTimerFor(host, true); return; }
        if (wasRunning) state.running = false;
        else if (isFocusPageVisible()) {
            session.clock = createFocusClock(sampleFocusClock(), session.clock.elapsedMs);
            state.pauseReason = undefined;
            state.running = true;
        }
        paintFocusRoots(host, state);
    });
    panel.querySelector<HTMLElement>("[data-action='focus-finish']")?.addEventListener("click", () => void finishFocusTimerFor(host, true));
    panel.querySelector<HTMLElement>("[data-action='focus-abandon']")?.addEventListener("click", () => void finishFocusTimerFor(host, false));
    panel.querySelectorAll<HTMLButtonElement>("[data-focus-timer-minutes]").forEach((button) => button.addEventListener("click", () => {
        const minutes = Number(button.dataset.focusTimerMinutes);
        const state = host.focusTimerState;
        if (!state || state.saveStatus || ![15, 25, 45, 60].includes(minutes) || state.totalSec === minutes * 60) return;
        const session = refreshFocusClock(state);
        if (session.clock.elapsedMs > 0 && !window.confirm(t("focus.presetResetConfirm", {n: minutes, elapsed: Math.floor(session.clock.elapsedMs / 1000)}))) {
            refreshFocusClock(state);
            paintFocusRoots(host, state);
            if (state.running && state.remainingSec <= 0) void finishFocusTimerFor(host, true);
            return;
        }
        if (host.focusTimerState !== state || host.disposed || host.disposing || state.saveStatus) return;
        host.focusTimerMinutes = minutes;
        state.totalSec = minutes * 60;
        state.remainingSec = minutes * 60;
        session.clock = createFocusClock(sampleFocusClock());
        paintFocusRoots(host, state);
    }));
}
