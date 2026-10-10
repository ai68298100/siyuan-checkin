/*
 * Task Horizon consumer-side example.
 * It only uses the public siyuanCheckin facade; block discovery and the native
 * checkbox callback remain the responsibility of Task Horizon.
 */
(function (root, factory) {
    const bridge = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = bridge;
    root.createTaskHorizonBridge = bridge.createTaskHorizonBridge;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
    const REFRESH_EVENTS = new Set([
        /* subscribe() passes the CheckinIntegrationEvent, whose type is
           unprefixed; only window CustomEvent names carry "checkin:". */
        "item-created",
        "item-updated",
        "item-deleted",
        "item-archived",
        "event-recorded",
        "event-deleted",
        "analytics-updated",
    ]);

    function canonicalExternalRef(blockId, localDate) {
        if (typeof blockId !== "string" || typeof localDate !== "string") return undefined;
        const id = blockId.trim();
        if (!id || id.length > 128 || /[:\s\u0000-\u001f\u007f]/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return undefined;
        const date = new Date(`${localDate}T00:00:00Z`);
        if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== localDate) return undefined;
        return `taskhorizon:${id}:${localDate}`;
    }

    function createTaskHorizonBridge(options = {}) {
        const checkin = options.checkin || (typeof window !== "undefined" ? window.siyuanCheckin : undefined);
        let unsubscribe;
        /* Keep an explicit binding available for the write queue before the
           first start() call; start() still validates the target against the
           provider before reporting the bridge ready. */
        const hasExplicitBinding = typeof options.itemId === "string";
        let targetItemId = hasExplicitBinding && options.itemId.trim()
            ? options.itemId.trim()
            : undefined;
        let targetUnit = typeof options.unit === "string" && options.unit.trim()
            ? options.unit.trim()
            : "个";
        let stopped = false;
        let started = false;
        let startInFlight;
        const pending = new Map();
        const pendingReasons = new Map();
        const recordInFlight = new Map();
        let retryInFlight;
        const refreshInFlight = new Map();
        let refreshRevision = 0;
        let projectionMode = "summary-fallback";
        let writeEnabled = options.enableWriteBack === false
            ? false
            : options.enableWriteBack === true || hasExplicitBinding;
        const projectionCache = new Map();
        const projectionInFlight = new Map();
        let projectionRevision = 0;

        const reportError = (phase, error) => {
            if (typeof options.onError !== "function") return;
            try { options.onError({phase, error: String(error instanceof Error ? error.message : error)}); } catch { /* diagnostics must not break the bridge */ }
        };

        const completionKey = (itemId, externalRef) => JSON.stringify([itemId, "api", externalRef]);

        const cleanupSubscription = () => {
            if (typeof unsubscribe === "function") {
                try { unsubscribe(); } catch (error) { reportError("unsubscribe", error); }
            }
            unsubscribe = undefined;
        };

        const refresh = (range) => {
            if (stopped || !checkin || typeof checkin.getEventRangeSummary !== "function") return Promise.resolve(undefined);
            const requested = range || options.range;
            if (!requested) return Promise.resolve(undefined);
            let key;
            try { key = JSON.stringify([requested, options.summaryOptions]); } catch { key = String(requested); }
            const existing = refreshInFlight.get(key);
            if (existing) return existing;
            const requestRevision = refreshRevision;
            const run = (async () => {
                const summary = await checkin.getEventRangeSummary(requested, options.summaryOptions);
                if (stopped) return undefined;
                if (requestRevision !== refreshRevision) return {abandoned: true, reason: "stale"};
                if (typeof options.onRefresh === "function") await options.onRefresh(summary);
                return summary;
            })();
            let refreshPromise;
            refreshPromise = run.finally(() => {
                if (refreshInFlight.get(key) === refreshPromise) refreshInFlight.delete(key);
            });
            refreshInFlight.set(key, refreshPromise);
            return refreshPromise;
        };

        const start = () => {
            if (stopped) return Promise.resolve({ready: false, reason: "stopped"});
            if (started) return Promise.resolve({ready: true, itemId: targetItemId, projectionMode, writeEnabled});
            if (startInFlight) return startInFlight;
            const run = (async () => {
                if (!checkin || typeof checkin.whenReady !== "function") return {ready: false, reason: "unavailable"};
                let descriptor;
                if (typeof checkin.describe === "function") {
                    try { descriptor = checkin.describe(); } catch (error) { reportError("describe", error); return {ready: false, reason: "protocol-error"}; }
                    const version = descriptor && Number(descriptor.version);
                    if (!descriptor || descriptor.protocol !== "siyuan-checkin" || !Number.isFinite(version) || version < 4) {
                        return {ready: false, reason: "protocol-mismatch"};
                    }
                }
                let ready;
                try { ready = await checkin.whenReady(); } catch (error) { reportError("ready", error); return {ready: false, reason: "ready-error"}; }
                if (stopped) return {ready: false, reason: "stopped"};
                if (!ready) return {ready: false, reason: "not-ready"};
                /* T-1428（R-40.2）：calendar.read 能力发现——v5 宿主走投影，旧 v4 宿主
                   显式降级 summary-fallback（旧消费者不会因缺少新能力而失效）。 */
                try {
                    projectionMode = typeof checkin.hasCapability === "function"
                        && Number(descriptor?.version) >= 5
                        && checkin.hasCapability("calendar.read")
                        && typeof checkin.getCalendarProjection === "function" ? "calendar.read" : "summary-fallback";
                } catch (error) { reportError("capability", error); projectionMode = "summary-fallback"; }
                const requestedItemId = typeof options.itemId === "string" ? options.itemId.trim() : "";
                writeEnabled = options.enableWriteBack === true || (options.enableWriteBack !== false && hasExplicitBinding);
                let capabilities;
                try {
                    if (typeof checkin.hasCapability !== "function") return {ready: false, reason: "capability-missing"};
                    const readCapability = projectionMode === "calendar.read"
                        ? checkin.hasCapability("calendar.read")
                        : checkin.hasCapability("analytics.read");
                    const writeCapabilities = !writeEnabled || (checkin.hasCapability("items.read") && checkin.hasCapability("events.record"));
                    capabilities = typeof checkin.hasCapability === "function" && readCapability && writeCapabilities;
                } catch (error) {
                    reportError("capability", error);
                    return {ready: false, reason: "capability-error"};
                }
                if (!capabilities) {
                    return {ready: false, reason: "capability-missing"};
                }
                if (writeEnabled && !requestedItemId) return {ready: false, reason: "target-missing"};
                let candidates = [];
                try { candidates = writeEnabled && typeof checkin.getItems === "function" ? checkin.getItems() : []; } catch (error) {
                    reportError("items", error);
                    return {ready: false, reason: "items-error"};
                }
                if (writeEnabled && !Array.isArray(candidates)) {
                    reportError("items", new TypeError("getItems() must return an array"));
                    return {ready: false, reason: "items-invalid"};
                }
                try {
                    let target = writeEnabled ? candidates.find((item) => item && item.id === requestedItemId) : undefined;
                    /* getItems() intentionally excludes archived projects. If
                       the explicit binding is absent, query the public archive
                       surface so the caller can explain the disabled target. */
                    if (writeEnabled && !target && typeof checkin.getArchivedItems === "function") {
                        let archived;
                        try { archived = checkin.getArchivedItems(); } catch (error) { reportError("items", error); return {ready: false, reason: "items-error"}; }
                        if (!Array.isArray(archived)) {
                            reportError("items", new TypeError("getArchivedItems() must return an array"));
                            return {ready: false, reason: "items-invalid"};
                        }
                        target = archived.find((item) => item && item.id === requestedItemId);
                    }
                    if (writeEnabled) {
                        if (!target) return {ready: false, reason: "target-missing"};
                        if (target.archived === true) return {ready: false, reason: "target-archived"};
                        if (target.direction === "atMost") return {ready: false, reason: "target-incompatible"};
                        const requestedUnit = typeof options.unit === "string" && options.unit.trim() ? options.unit.trim() : undefined;
                        if (requestedUnit && target.unit && target.unit !== requestedUnit) return {ready: false, reason: "target-incompatible"};
                        targetUnit = requestedUnit || (typeof target.unit === "string" && target.unit.trim()) || "个";
                        targetItemId = requestedItemId;
                    }
                } catch (error) {
                    reportError("items", error);
                    return {ready: false, reason: "items-error"};
                }
                if (writeEnabled && !targetItemId) return {ready: false, reason: "target-missing"};
                if (typeof checkin.subscribe === "function") {
                    try {
                        unsubscribe = checkin.subscribe((event) => {
                            try {
                                if (event && REFRESH_EVENTS.has(event.type)) {
                                    /* Invalidate in-flight reads as well as
                                       cached projections. A read already in
                                       the provider cannot be cancelled, but a
                                       new event must be allowed to start a
                                       fresh read instead of joining that stale
                                       promise. */
                                    refreshRevision += 1;
                                    projectionRevision += 1;
                                    refreshInFlight.clear();
                                    projectionInFlight.clear();
                                    projectionCache.clear();
                                    const work = projectionMode === "calendar.read"
                                        ? refreshProjection(options.calendarRange || options.range)
                                        : refresh();
                                    void work.catch((error) => reportError("refresh", error));
                                }
                            } catch (error) {
                                reportError("event", error);
                            }
                        });
                    } catch (error) {
                        reportError("subscribe", error);
                        return {ready: false, reason: "subscribe-error"};
                    }
                }
                try {
                    if (projectionMode === "calendar.read") {
                        const projectionResult = await refreshProjection(options.calendarRange || options.range);
                        if (!projectionResult || projectionResult.abandoned) {
                            cleanupSubscription();
                            return {ready: false, reason: "read-failed"};
                        }
                    } else {
                        /* A data event can invalidate the startup read after
                           it has entered the provider. Join the replacement
                           read once so start() cannot report ready from a
                           stale summary while still allowing range-less v4
                           consumers to start normally. */
                        let summaryResult = await refresh();
                        if (summaryResult?.abandoned && !stopped) summaryResult = await refresh();
                        if (summaryResult?.abandoned) {
                            cleanupSubscription();
                            return {ready: false, reason: "read-failed"};
                        }
                    }
                } catch (error) {
                    cleanupSubscription();
                    reportError("refresh", error);
                    return {ready: false, reason: "read-failed", error: String(error instanceof Error ? error.message : error)};
                }
                if (stopped) {
                    cleanupSubscription();
                    return {ready: false, reason: "stopped"};
                }
                started = true;
                return {ready: true, itemId: targetItemId, projectionMode, writeEnabled};
            })();
            let startPromise;
            startInFlight = startPromise = run.finally(() => {
                if (startInFlight === startPromise) startInFlight = undefined;
            });
            return startPromise;
        };

        const recordTaskCompletion = ({blockId, localDate, itemId = targetItemId} = {}) => {
            const externalRef = canonicalExternalRef(blockId, localDate);
            /* Once start() binds a target, a caller cannot retarget an in-flight
               completion to another project. The itemId remains in the queue key. */
            if (!writeEnabled || !externalRef || !itemId || !targetItemId || itemId !== targetItemId || stopped || !checkin || typeof checkin.recordEvent !== "function") return Promise.resolve(undefined);
            const key = completionKey(itemId, externalRef);
            const existing = recordInFlight.get(key);
            if (existing) return existing;
            const payload = {itemId, value: 1, unit: targetUnit, source: "api", externalRef};
            const run = (async () => {
                try {
                    const result = await checkin.recordEvent(payload);
                    // Single-record v4 cannot distinguish rejection causes. Keep the exact
                    // identity for a user-visible validation/retry path instead of dropping it.
                    if (result === undefined) {
                        pending.set(key, payload);
                        pendingReasons.set(key, "rejected");
                    } else {
                        pending.delete(key);
                        pendingReasons.delete(key);
                    }
                    return result;
                } catch (error) {
                    pending.set(key, payload);
                    pendingReasons.set(key, "transport");
                    reportError("record", error);
                    return undefined;
                }
            })();
            let recordPromise;
            recordPromise = run.finally(() => {
                if (recordInFlight.get(key) === recordPromise) recordInFlight.delete(key);
            });
            recordInFlight.set(key, recordPromise);
            return recordPromise;
        };

        const retryPending = () => {
            if (retryInFlight) return retryInFlight;
            if (stopped || !checkin || typeof checkin.recordEvent !== "function") {
                return Promise.resolve({attempted: 0, succeeded: 0, rejected: 0, failed: 0, remaining: pending.size});
            }
            const run = (async () => {
                let attempted = 0;
                let succeeded = 0;
                let rejected = 0;
                let failed = 0;
                for (const [key, payload] of [...pending.entries()]) {
                    if (stopped) break;
                    attempted += 1;
                    try {
                        const result = await checkin.recordEvent(payload);
                        if (result === undefined) {
                            rejected += 1;
                            pending.set(key, payload);
                            pendingReasons.set(key, "rejected");
                        } else {
                            pending.delete(key);
                            pendingReasons.delete(key);
                            succeeded += 1;
                        }
                    } catch (error) {
                        pendingReasons.set(key, "transport");
                        failed += 1;
                        reportError("retry", error);
                    }
                }
                return {attempted, succeeded, rejected, failed, remaining: pending.size};
            })();
            retryInFlight = run.finally(() => {
                if (retryInFlight === retryPromise) retryInFlight = undefined;
            });
            const retryPromise = retryInFlight;
            return retryPromise;
        };

        const getPendingCompletions = () => [...pending.entries()].map(([key, payload]) => ({...payload, pendingReason: pendingReasons.get(key) || "transport"}));

        const discardPendingCompletion = ({blockId, localDate, itemId = targetItemId} = {}) => {
            const externalRef = canonicalExternalRef(blockId, localDate);
            if (!externalRef || !itemId) return false;
            const key = completionKey(itemId, externalRef);
            const removed = pending.delete(key);
            pendingReasons.delete(key);
            return removed;
        };

        /* calendar.read is a synchronous bounded provider method. This wrapper
           coalesces callers and rejects stale cache writes; it cannot interrupt
           a provider call after JavaScript has entered it. */
        const getProjection = (range = {}, callOptions = {}) => {
            if (stopped) return Promise.resolve({abandoned: true, reason: "stopped"});
            if (projectionMode !== "calendar.read" || typeof checkin.getCalendarProjection !== "function") {
                return Promise.resolve({abandoned: true, reason: "capability-missing"});
            }
            if (callOptions.signal && callOptions.signal.aborted) {
                return Promise.resolve({abandoned: true, reason: "aborted"});
            }
            if (typeof range.startDate !== "string" || typeof range.endDateExclusive !== "string") {
                return Promise.resolve({abandoned: true, reason: "invalid-range"});
            }
            const key = JSON.stringify([range.startDate, range.endDateExclusive]);
            const cached = projectionCache.get(key);
            if (cached) return Promise.resolve({data: cached});
            const existing = projectionInFlight.get(key);
            if (existing) return existing;
            const requestRevision = projectionRevision;
            const run = (async () => {
                try {
                    const data = await checkin.getCalendarProjection({startDate: range.startDate, endDateExclusive: range.endDateExclusive});
                    if (callOptions.signal && callOptions.signal.aborted) return {abandoned: true, reason: "aborted"};
                    if (stopped) return undefined;
                    if (requestRevision !== projectionRevision) return {abandoned: true, reason: "stale"};
                    projectionCache.set(key, data);
                    if (projectionCache.size > 16) projectionCache.delete(projectionCache.keys().next().value);
                    return {data};
                } catch (error) {
                    projectionCache.clear();
                    reportError("projection", error);
                    return {abandoned: true, reason: "error", error: String(error instanceof Error ? error.message : error)};
                }
            })();
            let projectionPromise;
            projectionPromise = run.finally(() => {
                if (projectionInFlight.get(key) === projectionPromise) projectionInFlight.delete(key);
            });
            projectionInFlight.set(key, projectionPromise);
            return projectionPromise;
        };

        const refreshProjection = async (range) => {
            if (!range) return {abandoned: true, reason: "range-missing"};
            const result = await getProjection(range);
            if (result && result.data && typeof options.onProjection === "function") {
                try { await options.onProjection(result.data); } catch (error) {
                    reportError("projection-render", error);
                    return {abandoned: true, reason: "render-error"};
                }
            }
            return result;
        };

        const getStatus = () => ({stopped, projectionMode, projectionCacheSize: projectionCache.size, pending: pending.size});

        const stop = () => {
            stopped = true;
            started = false;
            cleanupSubscription();
            projectionCache.clear();
            refreshRevision += 1;
            projectionRevision += 1;
            refreshInFlight.clear();
            projectionInFlight.clear();
        };

        return {start, refresh, getProjection, refreshProjection, getStatus, recordTaskCompletion, retryPending, getPendingCompletions, discardPendingCompletion, stop};
    }

    return {createTaskHorizonBridge};
});
