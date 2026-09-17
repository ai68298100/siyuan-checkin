import {detectStoreConflict, mergeStores, normalizeStore, type StoreConflictReport} from "./model";
import type {CheckinStore} from "./types";

export interface StoreReconciliation {
    remote: CheckinStore;
    merged: CheckinStore;
    conflict: StoreConflictReport;
    localChanged: boolean;
    remoteNeedsWrite: boolean;
}

export interface VerifiedStoreWrite {
    store: CheckinStore;
    attempts: number;
    repaired: boolean;
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

/** Persist, read back, and repair a lost-update race with a small bounded retry. */
export async function persistStoreWithVerification(
    snapshot: unknown,
    load: () => Promise<unknown>,
    save: (store: CheckinStore) => Promise<unknown>,
    maxAttempts = 2,
): Promise<VerifiedStoreWrite> {
    const attemptsLimit = Math.max(1, Math.min(3, Math.trunc(maxAttempts) || 1));
    let desired = normalizeStore(snapshot);
    for (let attempt = 1; attempt <= attemptsLimit; attempt += 1) {
        await save(desired);
        const observed = normalizeStore(await load());
        const converged = mergeStores(desired, observed);
        if (JSON.stringify(converged) === JSON.stringify(observed)) {
            return {store: observed, attempts: attempt, repaired: attempt > 1};
        }
        desired = converged;
    }
    throw new Error("store-write-verification-failed");
}
