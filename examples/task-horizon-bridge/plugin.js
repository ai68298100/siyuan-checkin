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

        const refresh = async (range) => {
            if (stopped || !checkin || typeof checkin.getEventRangeSummary !== "function") return undefined;
            const requested = range || options.range;
            if (!requested) return undefined;
            const summary = checkin.getEventRangeSummary(requested, options.summaryOptions);
            if (typeof options.onRefresh === "function") await options.onRefresh(summary);
            return summary;
        };

        const start = async () => {
            if (!checkin || typeof checkin.whenReady !== "function") return {ready: false, reason: "unavailable"};
            if (!(await checkin.whenReady())) return {ready: false, reason: "not-ready"};
            if (typeof checkin.hasCapability !== "function" || !checkin.hasCapability("analytics.read") || !checkin.hasCapability("events.record")) {
                return {ready: false, reason: "capability-missing"};
            }
            const candidates = typeof checkin.getItems === "function" ? checkin.getItems() : [];
            targetItemId = options.itemId || candidates.find((item) => item && !item.archived && item.name === "任务打卡")?.id;
            if (!targetItemId) return {ready: false, reason: "target-missing"};
            if (typeof checkin.subscribe === "function") {
                unsubscribe = checkin.subscribe((event) => {
                    if (event && REFRESH_EVENTS.has(event.type)) void refresh();
                });
            }
            await refresh();
            return {ready: true, itemId: targetItemId};
        };

        const recordTaskCompletion = async ({blockId, localDate, itemId = targetItemId} = {}) => {
            const externalRef = canonicalExternalRef(blockId, localDate);
            if (!externalRef || !itemId || stopped || !checkin || typeof checkin.recordEvent !== "function") return undefined;
            return checkin.recordEvent({itemId, value: 1, unit: "个", source: "api", externalRef});
        };

        const stop = () => {
            stopped = true;
            if (typeof unsubscribe === "function") unsubscribe();
            unsubscribe = undefined;
        };

        return {start, refresh, recordTaskCompletion, stop};
    }

    return {createTaskHorizonBridge};
});
