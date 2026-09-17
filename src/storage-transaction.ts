import {detectStoreConflict, mergeStores, normalizeStore, type StoreConflictReport} from "./model";
import type {CheckinStore} from "./types";

export interface StoreReconciliation {
    remote: CheckinStore;
    merged: CheckinStore;
    conflict: StoreConflictReport;
    localChanged: boolean;
    remoteNeedsWrite: boolean;
}

/** Build the deterministic pre-mutation snapshot while an exclusive storage lock is held. */
export function reconcileStoreSnapshots(
    baseline: unknown,
    local: unknown,
    stored: unknown,
): StoreReconciliation {
    const localStore = normalizeStore(local);
    const remote = normalizeStore(stored);
    const merged = mergeStores(localStore, remote);
    const conflict = detectStoreConflict(baseline, remote);
    const localJson = JSON.stringify(localStore);
    const remoteJson = JSON.stringify(remote);
    const mergedJson = JSON.stringify(merged);
    return {
        remote,
        merged,
        conflict,
        localChanged: mergedJson !== localJson,
        remoteNeedsWrite: mergedJson !== remoteJson,
    };
}
