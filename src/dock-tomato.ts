import {DOCK_TOMATO_ADAPTER_ID, type FocusAdapter} from "./integrations";
import type {CheckinEvent, CheckinItem} from "./types";

const DOCK_TOMATO_API_EVENT = "tomato:focus-api-availability-changed";
const DOCK_TOMATO_COMPLETED_EVENT = "tomato:focus-session-completed";
const DOCK_TOMATO_ENDED_EVENT = "tomato:focus-ended";
const CONSUMER_ID = "siyuan-checkin";

interface DockTomatoFocusStatus {
    ready?: boolean;
    active?: boolean;
    running?: boolean;
    paused?: boolean;
    sessionId?: string;
}

interface DockTomatoFocusApi {
    version: number;
    capabilities?: readonly string[];
    getStatus(): DockTomatoFocusStatus;
    start(input: {durationMinutes?: number; confirm?: boolean; context: Record<string, string>}): Promise<DockTomatoFocusStatus>;
    pause(): Promise<DockTomatoFocusStatus>;
}

export type DockTomatoProviderState = "missing" | "incompatible-version" | "incomplete-api" | "missing-capabilities" | "not-ready" | "ready" | "running" | "paused" | "error";

export interface DockTomatoProviderDiagnostics {
    state: DockTomatoProviderState;
    available: boolean;
    ready: boolean;
    active: boolean;
    apiVersion?: number;
    capabilities: readonly string[];
}

interface DockTomatoHost extends Window {
    __dockTomato?: {focus?: DockTomatoFocusApi};
}

const REQUIRED_CAPABILITIES = ["status", "start", "pause", "completion-event"] as const;

export function inspectDockTomatoProvider(host: DockTomatoHost = window as DockTomatoHost): DockTomatoProviderDiagnostics {
    const candidate = host.__dockTomato?.focus;
    if (!candidate) return {state: "missing", available: false, ready: false, active: false, capabilities: []};
    const parsedVersion = Number(candidate.version);
    const apiVersion = Number.isFinite(parsedVersion) ? parsedVersion : undefined;
    const capabilities = Array.isArray(candidate.capabilities)
        ? candidate.capabilities.filter((value): value is string => typeof value === "string").slice(0, 32)
        : [];
    if (apiVersion !== 1) return {state: "incompatible-version", available: true, ready: false, active: false, apiVersion, capabilities};
    if (typeof candidate.getStatus !== "function" || typeof candidate.start !== "function" || typeof candidate.pause !== "function") {
        return {state: "incomplete-api", available: true, ready: false, active: false, apiVersion, capabilities};
    }
    if (capabilities.length && !REQUIRED_CAPABILITIES.every((name) => capabilities.includes(name))) {
        return {state: "missing-capabilities", available: true, ready: false, active: false, apiVersion, capabilities};
    }
    try {
        const status = candidate.getStatus();
        const active = status?.active === true;
        if (status?.paused === true) return {state: "paused", available: true, ready: status.ready !== false, active, apiVersion, capabilities};
        if (status?.running === true || active) return {state: "running", available: true, ready: status.ready !== false, active, apiVersion, capabilities};
        if (status?.ready === false) return {state: "not-ready", available: true, ready: false, active: false, apiVersion, capabilities};
        return {state: "ready", available: true, ready: true, active: false, apiVersion, capabilities};
    } catch {
        return {state: "error", available: true, ready: false, active: false, apiVersion, capabilities};
    }
}

interface DockTomatoCompletionDetail {
    apiVersion?: number;
    sessionId?: string;
    recordId?: string;
    durationMinutes?: number;
    context?: Record<string, unknown>;
}

export type DockTomatoCompletionIssueReason = "invalid-event" | "unsupported-version" | "invalid-context" | "missing-item" | "archived-item" | "mapping-changed" | "invalid-duration" | "missing-identity" | "duplicate" | "write-failed";

export interface DockTomatoCompletionIssue {
    reason: DockTomatoCompletionIssueReason;
    at: string;
    itemId?: string;
    identity?: string;
}

interface DockTomatoCompletionDecision {
    accepted: boolean;
    ignored?: boolean;
    reason?: DockTomatoCompletionIssueReason;
    item?: CheckinItem;
    value?: number;
    identity?: string;
}

const completionIssues: DockTomatoCompletionIssue[] = [];
const COMPLETION_ISSUE_LIMIT = 20;

function ownDataValue(object: unknown, key: string): unknown {
    if (!object || typeof object !== "object") return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function boundedText(value: unknown, maxLength: number): string {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function customEventDetail(event: Event): unknown {
    try { return (event as CustomEvent<unknown>).detail; } catch { return undefined; }
}

export function getDockTomatoCompletionIssues(): readonly DockTomatoCompletionIssue[] {
    return Object.freeze(completionIssues.map((issue) => Object.freeze({...issue})));
}

export function clearDockTomatoCompletionIssues(): void {
    completionIssues.splice(0, completionIssues.length);
}

function appendCompletionIssue(reason: DockTomatoCompletionIssueReason, itemId?: string, identity?: string): void {
    completionIssues.push({reason, at: new Date().toISOString(), itemId: boundedText(itemId, 160) || undefined, identity: boundedText(identity, 240) || undefined});
    if (completionIssues.length > COMPLETION_ISSUE_LIMIT) completionIssues.splice(0, completionIssues.length - COMPLETION_ISSUE_LIMIT);
}

export function evaluateDockTomatoCompletion(detail: unknown, items: readonly CheckinItem[], duplicateIdentities: ReadonlySet<string> = new Set()): DockTomatoCompletionDecision {
    if (!detail || typeof detail !== "object") return {accepted: false, reason: "invalid-event"};
    if (ownDataValue(detail, "apiVersion") !== 1) return {accepted: false, reason: "unsupported-version"};
    const context = ownDataValue(detail, "context");
    if (!context || typeof context !== "object") return {accepted: false, reason: "invalid-context"};
    if (ownDataValue(context, "consumer") !== CONSUMER_ID) return {accepted: false, ignored: true};
    const itemId = boundedText(ownDataValue(context, "itemId"), 160);
    const startUnit = boundedText(ownDataValue(context, "itemUnit"), 80);
    const startMode = boundedText(ownDataValue(context, "tomatoMode"), 24);
    if (!itemId || !startUnit || (startMode !== "sessions" && startMode !== "minutes")) return {accepted: false, reason: "invalid-context"};
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return {accepted: false, reason: "missing-item"};
    if (item.archived) return {accepted: false, reason: "archived-item", item};
    const currentMode = item.tomatoMode === "sessions" ? "sessions" : "minutes";
    if (item.unit !== startUnit || currentMode !== startMode) return {accepted: false, reason: "mapping-changed", item};
    const durationMinutes = Number(ownDataValue(detail, "durationMinutes"));
    const value = completedValue(item, durationMinutes);
    if (value === undefined) return {accepted: false, reason: "invalid-duration", item};
    const identity = boundedText(ownDataValue(detail, "sessionId"), 240) || boundedText(ownDataValue(detail, "recordId"), 240);
    if (!identity) return {accepted: false, reason: "missing-identity", item};
    if (duplicateIdentities.has(identity)) return {accepted: false, reason: "duplicate", item, identity};
    return {accepted: true, item, value, identity};
}

interface DockCheckinApi {
    getItems(): CheckinItem[];
    getEvents(): CheckinEvent[];
    recordEvent(input: {itemId: string; value?: number; unit?: string; source?: "tomato"; note?: string; externalRef?: string}): Promise<unknown>;
    registerFocusAdapter(adapter: FocusAdapter): () => void;
    stopFocus(): Promise<boolean>;
}

function getDockTomatoFocusApi(): DockTomatoFocusApi | undefined {
    const candidate = (window as DockTomatoHost).__dockTomato?.focus;
    const diagnostics = inspectDockTomatoProvider();
    if (!candidate || !["ready", "running", "paused"].includes(diagnostics.state)) return undefined;
    return candidate;
}

function canUseDockTomato(item: CheckinItem): boolean {
    return item.kind !== "binary" && !item.archived;
}

function completedValue(item: CheckinItem, durationMinutes: number): number | undefined {
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) return undefined;
    if (item.tomatoMode === "sessions") return 1;
    return item.unit === "小时" ? durationMinutes / 60 : durationMinutes;
}

/**
 * Optional Dock Tomato bridge. It only consumes Dock Tomato's public v1 focus
 * facade and events; no DOM selectors, storage paths or private functions are
 * coupled across plugins.
 */
export function installDockTomatoBridge(api: DockCheckinApi, onProviderStateChanged: () => void = () => undefined): () => void {
    let disposeAdapter: (() => void) | undefined;
    let boundFacade: DockTomatoFocusApi | undefined;
    let releaseTimer: number | undefined;
    let providerRefreshQueued = false;
    let bridgeDisposed = false;
    const completedIdentities = new Set<string>();
    const completionIdentityOrder: string[] = [];
    const inFlightIdentities = new Set<string>();

    const scheduleProviderRefresh = () => {
        if (providerRefreshQueued || bridgeDisposed) return;
        providerRefreshQueued = true;
        void Promise.resolve().then(() => {
            providerRefreshQueued = false;
            if (!bridgeDisposed) onProviderStateChanged();
        });
    };

    const releaseWhenIdle = (remaining = 20) => {
        if (releaseTimer !== undefined) window.clearTimeout(releaseTimer);
        const facade = getDockTomatoFocusApi();
        if (!facade || !facade.getStatus().active) {
            void api.stopFocus().catch(() => false);
            releaseTimer = undefined;
            return;
        }
        if (remaining <= 0) return;
        releaseTimer = window.setTimeout(() => releaseWhenIdle(remaining - 1), 250);
    };

    const unbind = () => {
        disposeAdapter?.();
        disposeAdapter = undefined;
        boundFacade = undefined;
    };

    const bind = () => {
        const facade = getDockTomatoFocusApi();
        if (!facade) {
            unbind();
            return;
        }
        if (boundFacade === facade && disposeAdapter) return;
        unbind();
        const adapter: FocusAdapter = {
            id: DOCK_TOMATO_ADAPTER_ID,
            name: "底栏番茄钟",
            canStart: (item) => canUseDockTomato(item) && facade.getStatus().ready !== false && !facade.getStatus().active,
            start: async (item) => {
                await facade.start({
                    confirm: true,
                    context: {
                        consumer: CONSUMER_ID,
                        itemId: item.id,
                        itemUnit: item.unit,
                        tomatoMode: item.tomatoMode === "sessions" ? "sessions" : "minutes",
                    },
                });
            },
            stop: async () => { await facade.pause(); },
        };
        boundFacade = facade;
        disposeAdapter = api.registerFocusAdapter(adapter);
    };

    const handleAvailability = () => {
        bind();
        scheduleProviderRefresh();
    };
    const handleProviderState = () => scheduleProviderRefresh();
    const handleCompleted = (event: Event) => {
        void (async () => {
        try {
            const detail = customEventDetail(event);
            const storedIdentities = api.getEvents()
                .map((entry) => boundedText(entry.externalRef, 260))
                .filter((reference) => reference.startsWith("docktomato:"))
                .map((reference) => reference.slice("docktomato:".length));
            const decision = evaluateDockTomatoCompletion(detail, api.getItems(), new Set([...storedIdentities, ...completedIdentities, ...inFlightIdentities]));
            if (!decision.accepted || !decision.item || decision.value === undefined || !decision.identity) {
                if (decision.reason && decision.reason !== "duplicate") {
                    const context = ownDataValue(detail, "context");
                    appendCompletionIssue(decision.reason, boundedText(ownDataValue(context, "itemId"), 160), boundedText(ownDataValue(detail, "sessionId"), 240));
                    scheduleProviderRefresh();
                }
                return;
            }
            const {item, value, identity} = decision;
            inFlightIdentities.add(identity);
            const recorded = await api.recordEvent({
                itemId: item.id,
                value,
                unit: item.unit,
                source: "tomato",
                externalRef: `docktomato:${identity}`,
                note: "来自底栏番茄钟",
            });
            if (!recorded) throw new Error("DOCK_TOMATO_CHECKIN_WRITE_REJECTED");
            completedIdentities.add(identity);
            completionIdentityOrder.push(identity);
            if (completionIdentityOrder.length > 500) {
                const expired = completionIdentityOrder.shift();
                if (expired) completedIdentities.delete(expired);
            }
            releaseWhenIdle();
        } catch {
            appendCompletionIssue("write-failed");
            scheduleProviderRefresh();
        } finally {
            const detail = customEventDetail(event);
            const identity = boundedText(ownDataValue(detail, "sessionId"), 240) || boundedText(ownDataValue(detail, "recordId"), 240);
            if (identity) inFlightIdentities.delete(identity);
        }
        })();
    };

    const handleEnded = () => releaseWhenIdle();

    window.addEventListener(DOCK_TOMATO_API_EVENT, handleAvailability);
    window.addEventListener("tomato:focus-session-started", handleProviderState);
    window.addEventListener("tomato:focus-session-paused", handleProviderState);
    window.addEventListener(DOCK_TOMATO_COMPLETED_EVENT, handleCompleted);
    window.addEventListener(DOCK_TOMATO_ENDED_EVENT, handleEnded);
    bind();
    return () => {
        bridgeDisposed = true;
        window.removeEventListener(DOCK_TOMATO_API_EVENT, handleAvailability);
        window.removeEventListener("tomato:focus-session-started", handleProviderState);
        window.removeEventListener("tomato:focus-session-paused", handleProviderState);
        window.removeEventListener(DOCK_TOMATO_COMPLETED_EVENT, handleCompleted);
        window.removeEventListener(DOCK_TOMATO_ENDED_EVENT, handleEnded);
        if (releaseTimer !== undefined) window.clearTimeout(releaseTimer);
        inFlightIdentities.clear();
        completedIdentities.clear();
        completionIdentityOrder.splice(0, completionIdentityOrder.length);
        unbind();
    };
}
