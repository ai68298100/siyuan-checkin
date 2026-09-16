import {DOCK_TOMATO_ADAPTER_ID, type FocusAdapter} from "./integrations";
import type {CheckinItem} from "./types";

const DOCK_TOMATO_API_EVENT = "tomato:focus-api-availability-changed";
const DOCK_TOMATO_COMPLETED_EVENT = "tomato:focus-session-completed";
const DOCK_TOMATO_ENDED_EVENT = "tomato:focus-ended";
const CONSUMER_ID = "siyuan-checkin";

interface DockTomatoFocusStatus {
    ready?: boolean;
    active?: boolean;
    sessionId?: string;
}

interface DockTomatoFocusApi {
    version: number;
    capabilities?: readonly string[];
    getStatus(): DockTomatoFocusStatus;
    start(input: {durationMinutes?: number; confirm?: boolean; context: Record<string, string>}): Promise<DockTomatoFocusStatus>;
    pause(): Promise<DockTomatoFocusStatus>;
}

interface DockTomatoHost extends Window {
    __dockTomato?: {focus?: DockTomatoFocusApi};
}

interface DockTomatoCompletionDetail {
    apiVersion?: number;
    sessionId?: string;
    recordId?: string;
    durationMinutes?: number;
    context?: Record<string, unknown>;
}

interface DockCheckinApi {
    getItems(): CheckinItem[];
    recordEvent(input: {itemId: string; value?: number; unit?: string; source?: "tomato"; note?: string; externalRef?: string}): Promise<unknown>;
    registerFocusAdapter(adapter: FocusAdapter): () => void;
    stopFocus(): Promise<boolean>;
}

function getDockTomatoFocusApi(): DockTomatoFocusApi | undefined {
    const candidate = (window as DockTomatoHost).__dockTomato?.focus;
    if (!candidate || candidate.version !== 1 || typeof candidate.getStatus !== "function" || typeof candidate.start !== "function" || typeof candidate.pause !== "function") return undefined;
    const capabilities = Array.isArray(candidate.capabilities) ? new Set(candidate.capabilities) : undefined;
    if (capabilities && (!["status", "start", "pause", "completion-event"].every((name) => capabilities.has(name)))) return undefined;
    return candidate;
}

function canUseDockTomato(item: CheckinItem): boolean {
    return item.kind !== "binary" && !item.archived;
}

function completedValue(item: CheckinItem, durationMinutes: number): number | undefined {
    if (item.tomatoMode === "sessions") return 1;
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) return undefined;
    return item.unit === "小时" ? durationMinutes / 60 : durationMinutes;
}

/**
 * Optional Dock Tomato bridge. It only consumes Dock Tomato's public v1 focus
 * facade and events; no DOM selectors, storage paths or private functions are
 * coupled across plugins.
 */
export function installDockTomatoBridge(api: DockCheckinApi): () => void {
    let disposeAdapter: (() => void) | undefined;
    let boundFacade: DockTomatoFocusApi | undefined;
    let releaseTimer: number | undefined;

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

    const handleAvailability = () => bind();
    const handleCompleted = (event: Event) => {
        try {
            const detail = (event as CustomEvent<DockTomatoCompletionDetail>).detail;
            const context = detail && typeof detail === "object" && detail.context && typeof detail.context === "object" ? detail.context : undefined;
            if (detail?.apiVersion !== 1 || context?.consumer !== CONSUMER_ID || typeof context.itemId !== "string") return;
            const item = api.getItems().find((candidate) => candidate.id === context.itemId && !candidate.archived);
            if (!item) return;
            const value = completedValue(item, Number(detail.durationMinutes));
            const identity = String(detail.sessionId || detail.recordId || "").trim().slice(0, 240);
            if (value === undefined || !identity) return;
            void api.recordEvent({
                itemId: item.id,
                value,
                unit: item.unit,
                source: "tomato",
                externalRef: `docktomato:${identity}`,
                note: "来自底栏番茄钟",
            }).catch(() => undefined);
            releaseWhenIdle();
        } catch {
            // Ignore forged or accessor-based cross-plugin events.
        }
    };

    const handleEnded = () => releaseWhenIdle();

    window.addEventListener(DOCK_TOMATO_API_EVENT, handleAvailability);
    window.addEventListener(DOCK_TOMATO_COMPLETED_EVENT, handleCompleted);
    window.addEventListener(DOCK_TOMATO_ENDED_EVENT, handleEnded);
    bind();
    return () => {
        window.removeEventListener(DOCK_TOMATO_API_EVENT, handleAvailability);
        window.removeEventListener(DOCK_TOMATO_COMPLETED_EVENT, handleCompleted);
        window.removeEventListener(DOCK_TOMATO_ENDED_EVENT, handleEnded);
        if (releaseTimer !== undefined) window.clearTimeout(releaseTimer);
        unbind();
    };
}
