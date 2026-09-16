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

export interface DockTomatoRuntimeStatus {
    readable: boolean;
    ready: boolean;
    active: boolean;
    running: boolean;
    paused: boolean;
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

export function readDockTomatoRuntimeStatus(candidate: unknown): DockTomatoRuntimeStatus {
    if (!candidate || typeof candidate !== "object") return {readable: false, ready: false, active: false, running: false, paused: false};
    const getStatus = ownDataValue(candidate, "getStatus");
    if (typeof getStatus !== "function") return {readable: false, ready: false, active: false, running: false, paused: false};
    try {
        const status = getStatus.call(candidate);
        if (!status || typeof status !== "object") return {readable: false, ready: false, active: false, running: false, paused: false};
        const active = ownDataValue(status, "active") === true;
        const running = ownDataValue(status, "running") === true;
        const paused = ownDataValue(status, "paused") === true;
        return {
            readable: true,
            ready: ownDataValue(status, "ready") !== false,
            active,
            running,
            paused,
            sessionId: boundedText(ownDataValue(status, "sessionId"), 240) || undefined,
        };
    } catch {
        return {readable: false, ready: false, active: false, running: false, paused: false};
    }
}

export function inspectDockTomatoProvider(host: DockTomatoHost = window as DockTomatoHost): DockTomatoProviderDiagnostics {
    const candidate = host.__dockTomato?.focus;
    if (!candidate) return {state: "missing", available: false, ready: false, active: false, capabilities: []};
    const parsedVersion = Number(ownDataValue(candidate, "version"));
    const apiVersion = Number.isFinite(parsedVersion) ? parsedVersion : undefined;
    const rawCapabilities = ownDataValue(candidate, "capabilities");
    const capabilities = Array.isArray(rawCapabilities)
        ? rawCapabilities.filter((value): value is string => typeof value === "string").slice(0, 32)
        : [];
    if (apiVersion !== 1) return {state: "incompatible-version", available: true, ready: false, active: false, apiVersion, capabilities};
    if (typeof ownDataValue(candidate, "getStatus") !== "function" || typeof ownDataValue(candidate, "start") !== "function" || typeof ownDataValue(candidate, "pause") !== "function") {
        return {state: "incomplete-api", available: true, ready: false, active: false, apiVersion, capabilities};
    }
    if (capabilities.length && !REQUIRED_CAPABILITIES.every((name) => capabilities.includes(name))) {
        return {state: "missing-capabilities", available: true, ready: false, active: false, apiVersion, capabilities};
    }
    const status = readDockTomatoRuntimeStatus(candidate);
    if (!status.readable) return {state: "error", available: true, ready: false, active: false, apiVersion, capabilities};
    if (status.paused) return {state: "paused", available: true, ready: status.ready, active: status.active, apiVersion, capabilities};
    if (status.running || status.active) return {state: "running", available: true, ready: status.ready, active: status.active, apiVersion, capabilities};
    if (!status.ready) return {state: "not-ready", available: true, ready: false, active: false, apiVersion, capabilities};
    return {state: "ready", available: true, ready: true, active: false, apiVersion, capabilities};
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

export interface DockTomatoDiagnosticsArchive {
    schemaVersion: 1;
    exportedAt: string;
    provider: DockTomatoProviderDiagnostics;
    issues: readonly DockTomatoCompletionIssue[];
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

function normalizeCompletionIssue(value: unknown): DockTomatoCompletionIssue | undefined {
    if (!value || typeof value !== "object") return undefined;
    const reason = boundedText(ownDataValue(value, "reason"), 40) as DockTomatoCompletionIssueReason;
    const validReasons: readonly DockTomatoCompletionIssueReason[] = ["invalid-event", "unsupported-version", "invalid-context", "missing-item", "archived-item", "mapping-changed", "invalid-duration", "missing-identity", "duplicate", "write-failed"];
    if (!validReasons.includes(reason)) return undefined;
    const at = boundedText(ownDataValue(value, "at"), 40);
    if (!at || !Number.isFinite(Date.parse(at))) return undefined;
    const itemId = boundedText(ownDataValue(value, "itemId"), 160) || undefined;
    const identity = boundedText(ownDataValue(value, "identity"), 240) || undefined;
    return {reason, at: new Date(at).toISOString(), itemId, identity};
}

export function restoreDockTomatoCompletionIssues(value: unknown): readonly DockTomatoCompletionIssue[] {
    const source = typeof value === "string" ? (() => { try { return JSON.parse(value) as unknown; } catch { return undefined; } })() : value;
    const entries = Array.isArray(source)
        ? source
        : ownDataValue(source, "schemaVersion") === 1 && Array.isArray(ownDataValue(source, "issues"))
            ? ownDataValue(source, "issues") as unknown[]
            : [];
    const normalized = entries.map(normalizeCompletionIssue).filter((issue): issue is DockTomatoCompletionIssue => Boolean(issue)).slice(-COMPLETION_ISSUE_LIMIT);
    completionIssues.splice(0, completionIssues.length, ...normalized);
    return getDockTomatoCompletionIssues();
}

export function serializeDockTomatoCompletionIssues(): string {
    return JSON.stringify({schemaVersion: 1, issues: getDockTomatoCompletionIssues()});
}

export function serializeDockTomatoDiagnostics(provider: DockTomatoProviderDiagnostics, exportedAt = new Date().toISOString()): string {
    const safeProvider: DockTomatoProviderDiagnostics = {
        state: provider.state,
        available: provider.available === true,
        ready: provider.ready === true,
        active: provider.active === true,
        apiVersion: Number.isFinite(provider.apiVersion) ? provider.apiVersion : undefined,
        capabilities: Array.isArray(provider.capabilities) ? provider.capabilities.filter((value): value is string => typeof value === "string").map((value) => value.slice(0, 80)).slice(0, 32) : [],
    };
    const archive: DockTomatoDiagnosticsArchive = {schemaVersion: 1, exportedAt: new Date(exportedAt).toISOString(), provider: safeProvider, issues: getDockTomatoCompletionIssues()};
    return JSON.stringify(archive, null, 2);
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
        if (bridgeDisposed) return;
        if (releaseTimer !== undefined) window.clearTimeout(releaseTimer);
        const facade = getDockTomatoFocusApi();
        const status = readDockTomatoRuntimeStatus(facade);
        if (!facade || (status.readable && !status.active)) {
            void api.stopFocus().catch(() => false);
            releaseTimer = undefined;
            scheduleProviderRefresh();
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
            canStart: (item) => {
                const status = readDockTomatoRuntimeStatus(facade);
                return canUseDockTomato(item) && status.readable && status.ready && !status.active;
            },
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
        let failureItemId: string | undefined;
        let failureIdentity: string | undefined;
        let claimedIdentity: string | undefined;
        try {
            const detail = customEventDetail(event);
            const storedIdentities = api.getEvents()
                .map((entry) => boundedText(ownDataValue(entry, "externalRef"), 260))
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
            failureItemId = item.id;
            failureIdentity = identity;
            inFlightIdentities.add(identity);
            claimedIdentity = identity;
            const recorded = await api.recordEvent({
                itemId: item.id,
                value,
                unit: item.unit,
                source: "tomato",
                externalRef: `docktomato:${identity}`,
                note: "来自底栏番茄钟",
            });
            if (!recorded) throw new Error("DOCK_TOMATO_CHECKIN_WRITE_REJECTED");
            if (bridgeDisposed) return;
            completedIdentities.add(identity);
            completionIdentityOrder.push(identity);
            if (completionIdentityOrder.length > 500) {
                const expired = completionIdentityOrder.shift();
                if (expired) completedIdentities.delete(expired);
            }
            releaseWhenIdle();
            scheduleProviderRefresh();
        } catch {
            if (!bridgeDisposed) {
                appendCompletionIssue("write-failed", failureItemId, failureIdentity);
                scheduleProviderRefresh();
            }
        } finally {
            if (claimedIdentity) inFlightIdentities.delete(claimedIdentity);
        }
        })();
    };

    const handleEnded = () => {
        releaseWhenIdle();
        scheduleProviderRefresh();
    };

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
