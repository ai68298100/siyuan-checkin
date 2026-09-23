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
        "checkin:event-recorded",
        "checkin:analytics-updated",
        "checkin:item-archived",
        "checkin:item-updated",
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
        let targetItemId;
        let stopped = false;
        let started = false;
        let startInFlight;
        const pending = new Map();
        const recordInFlight = new Map();
        let retryInFlight;
        const refreshInFlight = new Map();
        let projectionMode = "summary-fallback";
        const projectionCache = new Map();
        const projectionInFlight = new Map();

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
            const run = (async () => {
                const summary = await checkin.getEventRangeSummary(requested, options.summaryOptions);
                if (stopped) return undefined;
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
            if (started) return Promise.resolve({ready: true, itemId: targetItemId, projectionMode});
            if (startInFlight) return startInFlight;
            const run = (async () => {
                if (!checkin || typeof checkin.whenReady !== "function") return {ready: false, reason: "unavailable"};
                if (typeof checkin.describe === "function") {
                    let descriptor;
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
                        && checkin.hasCapability("calendar.read")
                        && typeof checkin.getCalendarProjection === "function" ? "calendar.read" : "summary-fallback";
                } catch (error) { reportError("capability", error); projectionMode = "summary-fallback"; }
                let capabilities;
                try {
                    capabilities = typeof checkin.hasCapability === "function"
                        && checkin.hasCapability("analytics.read")
                        && checkin.hasCapability("events.record");
                } catch (error) {
                    reportError("capability", error);
                    return {ready: false, reason: "capability-error"};
                }
                if (!capabilities) {
                    return {ready: false, reason: "capability-missing"};
                }
                let candidates;
                try { candidates = typeof checkin.getItems === "function" ? checkin.getItems() : []; } catch (error) {
                    reportError("items", error);
                    return {ready: false, reason: "items-error"};
                }
                if (!Array.isArray(candidates)) {
                    reportError("items", new TypeError("getItems() must return an array"));
                    return {ready: false, reason: "items-invalid"};
                }
                try {
                    targetItemId = options.itemId || candidates.find((item) => item && !item.archived && item.name === "任务打卡")?.id;
                } catch (error) {
                    reportError("items", error);
                    return {ready: false, reason: "items-error"};
                }
                if (!targetItemId) return {ready: false, reason: "target-missing"};
                if (typeof checkin.subscribe === "function") {
                    try {
                        unsubscribe = checkin.subscribe((event) => {
                            try {
                                if (event && REFRESH_EVENTS.has(event.type)) void refresh().catch((error) => reportError("refresh", error));
                            projectionCache.clear();
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
                    await refresh();
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
                return {ready: true, itemId: targetItemId, projectionMode};
            })();
            let startPromise;
            startInFlight = startPromise = run.finally(() => {
                if (startInFlight === startPromise) startInFlight = undefined;
            });
            return startPromise;
        };

        const recordTaskCompletion = ({blockId, localDate, itemId = targetItemId} = {}) => {
            const externalRef = canonicalExternalRef(blockId, localDate);
            if (!externalRef || !itemId || stopped || !checkin || typeof checkin.recordEvent !== "function") return Promise.resolve(undefined);
            const key = completionKey(itemId, externalRef);
            const existing = recordInFlight.get(key);
            if (existing) return existing;
            const payload = {itemId, value: 1, unit: "个", source: "api", externalRef};
            const run = (async () => {
                try {
                    const result = await checkin.recordEvent(payload);
                    // A returned event means new or idempotent-existing; undefined means rejected.
                    pending.delete(key);
                    return result;
                } catch (error) {
                    pending.set(key, payload);
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
                        pending.delete(key);
                        if (result === undefined) rejected += 1;
                        else succeeded += 1;
                    } catch (error) {
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

        const getPendingCompletions = () => [...pending.values()].map((payload) => ({...payload}));

        /* T-1428（R-40.2）：calendar.read 投影消费——单飞合流 + 事件失效缓存 +
           超时/Abort 守卫。v4 宿主（能力缺失）显式拒绝并给出 reason，不猜测新字段。 */
        const getProjection = (range = {}, callOptions = {}) => {
            if (stopped) return Promise.resolve({abandoned: true, reason: "stopped"});
            if (projectionMode !== "calendar.read" || typeof checkin.getCalendarProjection !== "function") {
                return Promise.resolve({abandoned: true, reason: "capability-missing"});
            }
            if (callOptions.signal && callOptions.signal.aborted) {
                return Promise.resolve({abandoned: true, reason: "aborted"});
            }
            const exclusiveEnd = (() => {
                if (typeof range.endDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(range.endDate)) return undefined;
                const day = new Date(`${range.endDate}T00:00:00Z`);
                if (Number.isNaN(day.valueOf())) return undefined;
                day.setUTCDate(day.getUTCDate() + 1);
                return day.toISOString().slice(0, 10);
            })();
            const key = JSON.stringify([range.startDate, exclusiveEnd, range.itemIds || null]);
            const cached = projectionCache.get(key);
            if (cached) return Promise.resolve({data: cached});
            const existing = projectionInFlight.get(key);
            if (existing) return existing;
            const timeoutMs = Number.isFinite(options.projectionTimeoutMs) ? options.projectionTimeoutMs : undefined;
            const run = (async () => {
                try {
                    const data = await Promise.race([
                        Promise.resolve(checkin.getCalendarProjection({startDate: range.startDate, endDateExclusive: exclusiveEnd})),
                        ...(timeoutMs !== undefined
                            ? [new Promise((resolve) => { const timer = setTimeout(() => resolve({abandoned: true, reason: "timeout"}), timeoutMs); if (typeof timer.unref === "function") timer.unref(); })]
                            : []),
                        ...(callOptions.signal
                            ? [new Promise((resolve) => { callOptions.signal.addEventListener("abort", () => resolve({abandoned: true, reason: "aborted"}), {once: true}); if (callOptions.signal.aborted) resolve({abandoned: true, reason: "aborted"}); })]
                            : []),
                    ]);
                    if (data && data.abandoned) return data;
                    if (stopped) return undefined;
                    projectionCache.set(key, data);
                    if (projectionCache.size > 16) projectionCache.delete(projectionCache.keys().next().value);
                    return {data};
                } catch (error) {
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

        const getStatus = () => ({stopped, projectionMode, projectionCacheSize: projectionCache.size, pending: pending.size});

        const stop = () => {
            stopped = true;
            started = false;
            cleanupSubscription();
            projectionCache.clear();
            projectionInFlight.clear();
        };

        return {start, refresh, getProjection, getStatus, recordTaskCompletion, retryPending, getPendingCompletions, stop};
    }

    return {createTaskHorizonBridge};
});
