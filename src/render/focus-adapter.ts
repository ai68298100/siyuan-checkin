/* 专注适配器生命周期：从 index.ts 外置（T-022）。
   开始/停止专注、适配器筛选与静默停止；适配器注册表由宿主持有。 */
import {t} from "../i18n";
import {getItemRevisionForDate, isItemAvailableOnDate} from "../model";
import {currentCalendarDate} from "../shared";
import {showMessage} from "siyuan";
import type {FocusAdapter} from "../integrations";
import type {CheckinItem, CheckinStore} from "../types";

export interface FocusAdapterHost {
    store: CheckinStore;
    acceptingOperations: boolean;
    disposed: boolean;
    disposing: boolean;
    initializationState: "loading" | "ready" | "failed";
    focusBusy: boolean;
    focusAdapters: Map<string, FocusAdapter>;
    activeFocusAdapter?: FocusAdapter;
    focusOperation: Promise<void>;
    revisionFingerprint(item: CheckinItem, date: Date): string;
    cloneItemForDate(item: CheckinItem, date: Date): CheckinItem;
    renderBackgroundUpdate(): void;
}

export function focusStartErrorMessage(error: unknown): string {
    let code = "";
    try {
        if (error && typeof error === "object" && "code" in error) code = String((error as {code?: unknown}).code || "");
    } catch {
        code = "";
    }
    if (code === "DOCK_TOMATO_NOT_READY") return t("msg.focusDockLoading");
    if (code === "DOCK_TOMATO_TIMER_BUSY") return t("msg.focusDockBusy");
    if (code === "DOCK_TOMATO_INVALID_CONTEXT") return t("msg.focusDockContext");
    let detail = "";
    try { detail = error instanceof Error ? error.message : String(error); } catch { detail = t("common.unknownError"); }
    return t("msg.focusStartFail", {error: detail.slice(0, 240)});
}

export function startFocusFor(host: FocusAdapterHost, itemId: string, adapterId?: string): Promise<boolean> {
    if (!host.acceptingOperations || host.disposed || host.initializationState !== "ready" || host.focusBusy || host.activeFocusAdapter) return Promise.resolve(false);
    const startedAt = currentCalendarDate();
    const item = host.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
    if (!item || !isItemAvailableOnDate(item, startedAt) || getItemRevisionForDate(item, startedAt).kind === "binary") {
        return Promise.resolve(false);
    }
    const adapter = findFocusAdapterFor(host, item, startedAt, adapterId);
    if (!adapter) {
        return Promise.resolve(false);
    }
    const expectedRevisionFingerprint = host.revisionFingerprint(item, startedAt);
    host.focusBusy = true;
    const operation = (async () => {
        try {
            await adapter.start(host.cloneItemForDate(item, startedAt));
            const current = host.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
            if (host.disposed || host.disposing || !host.acceptingOperations || host.focusAdapters.get(adapter.id) !== adapter || !current || !isItemAvailableOnDate(current, startedAt) || host.revisionFingerprint(current, startedAt) !== expectedRevisionFingerprint || !canStartWithAdapter(host, adapter, current, startedAt)) {
                await stopAdapterSilently(adapter);
                return false;
            }
            host.activeFocusAdapter = adapter;
            return true;
        } catch (error) {
            if (!host.disposed) showMessage(focusStartErrorMessage(error));
            return false;
        } finally {
            host.focusBusy = false;
            host.renderBackgroundUpdate();
        }
    })();
    host.focusOperation = operation.then(() => undefined, () => undefined);
    return operation;
}

export function findFocusAdapterFor(host: FocusAdapterHost, item: CheckinItem, date = new Date(), adapterId?: string): FocusAdapter | undefined {
    if (adapterId) {
        const adapter = host.focusAdapters.get(adapterId);
        return adapter && canStartWithAdapter(host, adapter, item, date) ? adapter : undefined;
    }
    return [...host.focusAdapters.values()].find((candidate) => canStartWithAdapter(host, candidate, item, date));
}

export function canStartWithAdapter(host: FocusAdapterHost, adapter: FocusAdapter, item: CheckinItem, date: Date): boolean {
    if (getItemRevisionForDate(item, date).kind === "binary") return false;
    try {
        return adapter.canStart(host.cloneItemForDate(item, date));
    } catch {
        return false;
    }
}

export function stopAdapterSilently(adapter: FocusAdapter): Promise<void> {
    return Promise.resolve().then(() => adapter.stop()).catch(() => undefined);
}

export function stopFocusFor(host: FocusAdapterHost): Promise<boolean> {
    if (!host.acceptingOperations || host.disposed || host.focusBusy || !host.activeFocusAdapter) return Promise.resolve(false);
    const adapter = host.activeFocusAdapter;
    host.focusBusy = true;
    const operation = (async () => {
        try {
            await adapter.stop();
            if (host.activeFocusAdapter === adapter) host.activeFocusAdapter = undefined;
            return true;
        } catch (error) {
            if (!host.disposed) showMessage(t("msg.focusStopFail", {error: String(error)}));
            return false;
        } finally {
            host.focusBusy = false;
            host.renderBackgroundUpdate();
        }
    })();
    host.focusOperation = operation.then(() => undefined, () => undefined);
    return operation;
}
