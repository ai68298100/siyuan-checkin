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

/**
 * Keep only the local projection that differs from the last committed
 * baseline before merging it into a newer remote snapshot.  A plain union of
 * the whole local store would treat every unchanged pre-restore entity as a
 * concurrent write and resurrect it after an exact snapshot restore.
 */
export function projectLocalStoreChanges(baseline: CheckinStore, local: CheckinStore, remote?: CheckinStore): CheckinStore {
    const changed = <T extends {id?: string; eventId?: string; itemId?: string}>(
        before: readonly T[],
        after: readonly T[],
        key: (value: T) => string,
    ): T[] => {
        const beforeByKey = new Map(before.map((value) => [key(value), JSON.stringify(value)]));
        return after.filter((value) => beforeByKey.get(key(value)) !== JSON.stringify(value));
    };
    const changedEventTombstones = changed(baseline.eventTombstones, local.eventTombstones, (tombstone) => tombstone.eventId);
    /* An unchanged external identity tombstone is still needed when the
       remote side contains a replay of that identity. Generic event-id
       tombstones intentionally stay out of this projection so an explicit
       restore can bring the selected event back exactly. */
    const baselineEventTombstones = new Map(baseline.eventTombstones.map((tombstone) => [tombstone.eventId, JSON.stringify(tombstone)]));
    const replayBarriers = remote
        ? local.eventTombstones.filter((tombstone) => baselineEventTombstones.get(tombstone.eventId) === JSON.stringify(tombstone)
            && Boolean(tombstone.source && tombstone.externalRef)
            && remote.events.some((event) => event.source === tombstone.source && event.externalRef === tombstone.externalRef))
        : [];
    const eventTombstones = [...new Map([...changedEventTombstones, ...replayBarriers].map((tombstone) => [tombstone.eventId, tombstone])).values()];
    return {
        ...local,
        items: changed(baseline.items, local.items, (item) => item.id),
        events: changed(baseline.events, local.events, (event) => event.id),
        /* Carry changed tombstones like other local mutations. Unchanged
           external-identity barriers are added above only when the remote
           snapshot contains their matching replay; ordinary ID tombstones
           stay out so an explicit restore remains an exact replacement. */
        eventTombstones,
        itemTombstones: changed(baseline.itemTombstones || [], local.itemTombstones || [], (tombstone) => tombstone.itemId),
    };
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
    const localChanges = projectLocalStoreChanges(baseline, local, remote);
    const merged = localMatchesRemote ? local : mergeNormalizedStores(remote, localChanges);
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

/** Re-read and merge before the first write; callers must hold the storage lock. */
export async function persistStoreWithReconciliation(
    snapshot: unknown,
    load: () => Promise<unknown>,
    save: (store: CheckinStore) => Promise<unknown>,
    maxAttempts = 2,
): Promise<VerifiedStoreWrite> {
    const local = normalizeStore(snapshot);
    const remote = normalizeStore(await load());
    return persistNormalizedStoreWithVerification(mergeNormalizedStores(local, remote), load, save, maxAttempts);
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
