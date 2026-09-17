import {areNormalizedStoresEqual, detectNormalizedStoreConflict, mergeNormalizedStores, normalizeStore, type StoreConflictReport} from "./model";
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
    return reconcileNormalizedStoreSnapshots(normalizeStore(baseline), localStore, remote);
}

/** Fast path for immutable snapshots already validated by the plugin lifecycle. */
export function reconcileNormalizedStoreSnapshots(
    baseline: CheckinStore,
    local: CheckinStore,
    remote: CheckinStore,
): StoreReconciliation {
    const localMatchesRemote = areNormalizedStoresEqual(local, remote);
    const merged = localMatchesRemote ? local : mergeNormalizedStores(local, remote);
    const conflict = detectNormalizedStoreConflict(baseline, remote);
    return {
        remote,
        merged,
        conflict,
        localChanged: !localMatchesRemote && !areNormalizedStoresEqual(merged, local),
        remoteNeedsWrite: !localMatchesRemote && !areNormalizedStoresEqual(merged, remote),
    };
}

/** Persist, read back, and repair a lost-update race with a small bounded retry. */
export async function persistStoreWithVerification(
    snapshot: unknown,
    load: () => Promise<unknown>,
    save: (store: CheckinStore) => Promise<unknown>,
    maxAttempts = 2,
): Promise<VerifiedStoreWrite> {
    return persistNormalizedStoreWithVerification(normalizeStore(snapshot), load, save, maxAttempts);
}

/** Fast path when the desired snapshot was produced by immutable model operations. */
export async function persistNormalizedStoreWithVerification(
    snapshot: CheckinStore,
    load: () => Promise<unknown>,
    save: (store: CheckinStore) => Promise<unknown>,
    maxAttempts = 2,
): Promise<VerifiedStoreWrite> {
    const attemptsLimit = Math.max(1, Math.min(3, Math.trunc(maxAttempts) || 1));
    let desired = snapshot;
    for (let attempt = 1; attempt <= attemptsLimit; attempt += 1) {
        await save(desired);
        const observed = normalizeStore(await load());
        if (areNormalizedStoresEqual(desired, observed)) {
            return {store: observed, attempts: attempt, repaired: attempt > 1};
        }
        const converged = mergeNormalizedStores(desired, observed);
        if (areNormalizedStoresEqual(converged, observed)) {
            return {store: observed, attempts: attempt, repaired: attempt > 1};
        }
        desired = converged;
    }
    throw new Error("store-write-verification-failed");
}
