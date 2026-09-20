/* 专注计时面板：从 index.ts 外置（T-022）。
   倒计时状态由宿主持有，本模块负责渲染、秒级刷新与面板内交互绑定。 */
import {t} from "../i18n";
import {captureActionMoment, calendarDateFromKey, escapeHtml} from "../shared";
import {showMessage} from "siyuan";
import type {CheckinItem, CheckinStore} from "../types";
import {getActiveItemById, getItemById} from "../model";

export interface FocusTimerState {
    itemId: string;
    totalSec: number;
    remainingSec: number;
    running: boolean;
}

export interface FocusTimerHost {
    store: CheckinStore;
    disposed: boolean;
    disposing: boolean;
    focusTimerState?: FocusTimerState;
    focusTimerInterval?: number;
    focusCelebrationTimer?: number;
    focusTimerRoot?: HTMLElement;
    focusTimerMinutes: number;
    celebration?: {message: string; itemName: string};
    render(): void;
    revisionFingerprint(item: CheckinItem, date: Date): string;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    recordEvent(item: CheckinItem, value: number, moment: {occurredAt: string; localDate: string}, expectedRevisionFingerprint?: string, note?: string, attachment?: string): Promise<unknown>;
}

export function openFocusTimerFor(host: FocusTimerHost, itemId: string): void {
    const item = getActiveItemById(host.store, itemId);
    if (!item) return;
    clearFocusTimerTimers(host);
    host.focusTimerState = {itemId, totalSec: host.focusTimerMinutes * 60, remainingSec: host.focusTimerMinutes * 60, running: true};
    host.focusTimerInterval = window.setInterval(() => tickFocusTimerFor(host), 1000);
    host.render();
}

/** 停掉秒级心跳与庆祝提示的延时器：思源不会代插件清理自有定时器，卸载路径必须显式调用。 */
export function stopFocusTimerFor(host: FocusTimerHost): void {
    clearFocusTimerTimers(host);
    host.focusTimerState = undefined;
    host.focusTimerRoot = undefined;
}

function clearFocusTimerTimers(host: FocusTimerHost): void {
    if (host.focusTimerInterval !== undefined) { window.clearInterval(host.focusTimerInterval); host.focusTimerInterval = undefined; }
    if (host.focusCelebrationTimer !== undefined) { window.clearTimeout(host.focusCelebrationTimer); host.focusCelebrationTimer = undefined; }
}

export function tickFocusTimerFor(host: FocusTimerHost): void {
    if (host.disposed || host.disposing) { stopFocusTimerFor(host); return; }
    const state = host.focusTimerState;
    if (!state || !state.running) return;
    state.remainingSec = Math.max(0, state.remainingSec - 1);
    const panel = document.querySelector("[data-focus-timer]");
    if (panel) paintFocusTimer(panel as HTMLElement, state);
    if (state.remainingSec <= 0) void finishFocusTimerFor(host, true);
}

export function paintFocusTimer(panel: HTMLElement, state: {remainingSec: number; totalSec: number; running: boolean}): void {
    const time = panel.querySelector<HTMLElement>("[data-focus-remaining]");
    if (time) {
        const minutes = Math.floor(state.remainingSec / 60);
        const seconds = state.remainingSec % 60;
        time.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
    }
    const bar = panel.querySelector<HTMLElement>("[data-focus-progress] span");
    if (bar) bar.style.width = `${Math.round(((state.totalSec - state.remainingSec) / state.totalSec) * 100)}%`;
    const toggle = panel.querySelector<HTMLButtonElement>("[data-action='focus-toggle']");
    if (toggle) toggle.textContent = t(state.running ? "focus.pause" : "focus.resume");
}

export async function finishFocusTimerFor(host: FocusTimerHost, complete: boolean): Promise<void> {
    const state = host.focusTimerState;
    if (!state) return;
    stopFocusTimerFor(host);
    const elapsedMinutes = Math.floor((state.totalSec - state.remainingSec) / 60);
    if (complete && elapsedMinutes >= 1) {
        const item = getActiveItemById(host.store, state.itemId);
        if (item) {
            const moment = captureActionMoment();
            const date = calendarDateFromKey(moment.localDate);
            const fingerprint = host.revisionFingerprint(item, date);
            let unit = item.unit || "分钟";
            let value = elapsedMinutes;
            if (unit === "小时") { value = Math.round(elapsedMinutes / 6) / 10; unit = "小时"; }
            void host.enqueueMutation(() => host.recordEvent(item, value, moment, fingerprint, `专注 ${elapsedMinutes} 分钟`));
            host.celebration = {message: `专注 ${elapsedMinutes} 分钟`, itemName: item.name};
            if (host.focusCelebrationTimer !== undefined) window.clearTimeout(host.focusCelebrationTimer);
            host.focusCelebrationTimer = window.setTimeout(() => {
                host.focusCelebrationTimer = undefined;
                if (host.disposed || host.disposing) return;
                host.celebration = undefined;
                host.render();
            }, 6000);
        }
    } else if (complete) {
        showMessage(t("msg.focusTooShort"));
    }
    host.render();
}

export function renderFocusTimerPanelFor(host: FocusTimerHost): string {
    const state = host.focusTimerState;
    if (!state) return "";
    const item = getItemById(host.store, state.itemId);
    const name = item ? item.name : "专注";
    const icon = item ? item.icon : "⏱";
    const presets = [15, 25, 45, 60].map((minutes) => `<button type="button" data-focus-timer-minutes="${minutes}" aria-label="${t("focus.presetMinutes", {n: minutes})}" aria-pressed="${state.totalSec === minutes * 60}" class="${state.totalSec === minutes * 60 ? "is-selected" : ""}">${minutes}</button>`).join("");
    const minutes = Math.floor(state.remainingSec / 60);
    const seconds = state.remainingSec % 60;
    return `<div class="lc-checkin__focus-timer" data-focus-timer role="dialog" aria-label="${t("focus.timerAria")}">
            <div class="lc-checkin__focus-head"><span class="lc-checkin__focus-icon" aria-hidden="true">${escapeHtml(icon)}</span><strong title="${escapeHtml(name)}">${escapeHtml(name)}</strong></div>
            <div class="lc-checkin__focus-time" data-focus-remaining>${minutes}:${String(seconds).padStart(2, "0")}</div>
            <div class="lc-checkin__focus-progress" data-focus-progress><span style="width: ${Math.round(((state.totalSec - state.remainingSec) / state.totalSec) * 100)}%"></span></div>
            <div class="lc-checkin__focus-presets" role="group" aria-label="${t("focus.presetsAria")}">${presets}</div>
            <div class="lc-checkin__focus-actions">
                <button class="lc-checkin__text-button" type="button" data-action="focus-toggle">${t(state.running ? "focus.pause" : "focus.resume")}</button>
                <button class="lc-checkin__text-button" type="button" data-action="focus-finish">${t("focus.finish")}</button>
                <button class="lc-checkin__text-button" type="button" data-action="focus-abandon">${t("focus.abandon")}</button>
            </div>
        </div>`;
}

export function bindFocusTimerPanelFor(host: FocusTimerHost, root: HTMLElement): void {
    const panel = root.querySelector<HTMLElement>("[data-focus-timer]");
    if (!panel || panel.dataset.bound === "true") return;
    panel.dataset.bound = "true";
    panel.querySelector<HTMLButtonElement>("[data-action='focus-toggle']")?.addEventListener("click", () => {
        if (!host.focusTimerState) return;
        host.focusTimerState.running = !host.focusTimerState.running;
        paintFocusTimer(panel, host.focusTimerState);
    });
    panel.querySelector<HTMLElement>("[data-action='focus-finish']")?.addEventListener("click", () => void finishFocusTimerFor(host, true));
    panel.querySelector<HTMLElement>("[data-action='focus-abandon']")?.addEventListener("click", () => void finishFocusTimerFor(host, false));
    panel.querySelectorAll<HTMLButtonElement>("[data-focus-timer-minutes]").forEach((button) => button.addEventListener("click", () => {
        const minutes = Number(button.dataset.focusTimerMinutes);
        if (!host.focusTimerState || !Number.isFinite(minutes)) return;
        host.focusTimerMinutes = minutes;
        host.focusTimerState.totalSec = minutes * 60;
        host.focusTimerState.remainingSec = minutes * 60;
        host.focusTimerState.running = true;
        panel.querySelectorAll("[data-focus-timer-minutes]").forEach((entry) => {
            entry.classList.toggle("is-selected", entry === button);
            entry.setAttribute("aria-pressed", String(entry === button));
        });
        paintFocusTimer(panel, host.focusTimerState);
    }));
}
