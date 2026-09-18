const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "examples", "task-horizon-bridge", "plugin.js"), "utf8");
const context = {console, module: {exports: {}}, exports: {}, globalThis: {}};
vm.runInNewContext(source, context, {filename: "task-horizon-bridge/plugin.js"});
const {createTaskHorizonBridge} = context.module.exports;
assert.equal(typeof createTaskHorizonBridge, "function");

const calls = [];
let listener;
let refreshCount = 0;
let failNextRecord = false;
let rejectNextRecord = false;
const checkin = {
    whenReady: async () => true,
    describe: () => ({protocol: "siyuan-checkin", version: 4}),
    hasCapability: (name) => name === "analytics.read" || name === "events.record",
    getItems: () => [{id: "task-item", name: "任务打卡"}],
    getEventRangeSummary: (range) => { calls.push({type: "summary", range}); return {points: []}; },
    subscribe: (callback) => { listener = callback; return () => { listener = undefined; }; },
    recordEvent: async (input) => {
        calls.push({type: "record", input});
        if (failNextRecord) { failNextRecord = false; throw new Error("temporary write failure"); }
        if (rejectNextRecord) { rejectNextRecord = false; return undefined; }
        return {id: "event-1", ...input};
    },
};

(async () => {
    const bridge = createTaskHorizonBridge({
        checkin,
        range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"},
        onRefresh: async () => { refreshCount += 1; },
    });
    const status = await bridge.start();
    assert.equal(status.ready, true);
    assert.equal(status.itemId, "task-item");
    assert.equal(refreshCount, 1);
    let raceSubscribeCount = 0;
    const raceCheckin = {...checkin,
        whenReady: async () => { await new Promise((resolve) => setTimeout(resolve, 10)); return true; },
        subscribe: (callback) => { raceSubscribeCount += 1; return () => { void callback; }; },
    };
    const raceBridge = createTaskHorizonBridge({checkin: raceCheckin, range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"}});
    const [raceA, raceB] = await Promise.all([raceBridge.start(), raceBridge.start()]);
    assert.deepEqual(raceA, raceB, "overlapping starts share one result");
    assert.equal(raceSubscribeCount, 1, "overlapping starts register one subscription");
    const repeatStart = await raceBridge.start();
    assert.deepEqual(repeatStart, raceA, "completed start is idempotent");
    raceBridge.stop();
    let releaseSlowReady;
    const slowReady = new Promise((resolve) => { releaseSlowReady = resolve; });
    const stoppedDuringStart = createTaskHorizonBridge({checkin: {...checkin, whenReady: async () => { await slowReady; return true; }}, range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"}});
    const stoppedStartPromise = stoppedDuringStart.start();
    stoppedDuringStart.stop();
    releaseSlowReady();
    assert.equal((await stoppedStartPromise).reason, "stopped", "stop during readiness prevents late initialization");
    let releaseSlowSummary;
    const slowSummary = new Promise((resolve) => { releaseSlowSummary = resolve; });
    let lateRefreshes = 0;
    const refreshStopBridge = createTaskHorizonBridge({
        checkin: {...checkin, getEventRangeSummary: async () => slowSummary},
        range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"},
        onRefresh: () => { lateRefreshes += 1; },
    });
    const lateRefreshPromise = refreshStopBridge.refresh();
    refreshStopBridge.stop();
    releaseSlowSummary({points: []});
    assert.equal(await lateRefreshPromise, undefined, "stopped refresh does not publish a late result");
    assert.equal(lateRefreshes, 0, "stopped refresh skips consumer callback");
    listener({type: "checkin:event-recorded"});
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(refreshCount, 2, "allowed refresh events trigger a summary refresh");
    for (const type of ["checkin:analytics-updated", "checkin:item-archived", "checkin:item-updated"]) {
        listener({type});
    }
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(refreshCount, 3, "refresh bursts coalesce across manifest events");
    const [refreshA, refreshB] = await Promise.all([bridge.refresh(), bridge.refresh()]);
    assert.deepEqual(refreshA, refreshB, "overlapping refresh calls share one read");
    const summaryReadsBeforeSplit = calls.filter((entry) => entry.type === "summary").length;
    await Promise.all([
        bridge.refresh({startDate: "2026-09-01", endDateExclusive: "2026-09-10"}),
        bridge.refresh({startDate: "2026-09-10", endDateExclusive: "2026-09-20"}),
    ]);
    assert.equal(calls.filter((entry) => entry.type === "summary").length, summaryReadsBeforeSplit + 2, "different ranges do not share a refresh result");
    const recorded = await bridge.recordTaskCompletion({blockId: "block-1", localDate: "2026-09-18"});
    assert.equal(recorded.externalRef, "taskhorizon:block-1:2026-09-18");
    failNextRecord = true;
    assert.equal(await bridge.recordTaskCompletion({blockId: "block-2", localDate: "2026-09-18"}), undefined);
    assert.equal(bridge.getPendingCompletions().length, 1, "thrown writes are retained for retry");
    const retry = await bridge.retryPending();
    assert.deepEqual({attempted: retry.attempted, succeeded: retry.succeeded, rejected: retry.rejected, failed: retry.failed, remaining: retry.remaining}, {attempted: 1, succeeded: 1, rejected: 0, failed: 0, remaining: 0});
    failNextRecord = true;
    assert.equal(await bridge.recordTaskCompletion({blockId: "block-3", localDate: "2026-09-18"}), undefined);
    rejectNextRecord = true;
    const rejectedRetry = await bridge.retryPending();
    assert.deepEqual({attempted: rejectedRetry.attempted, succeeded: rejectedRetry.succeeded, rejected: rejectedRetry.rejected, failed: rejectedRetry.failed, remaining: rejectedRetry.remaining}, {attempted: 1, succeeded: 0, rejected: 1, failed: 0, remaining: 0});
    failNextRecord = true;
    assert.equal(await bridge.recordTaskCompletion({blockId: "block-4", localDate: "2026-09-18"}), undefined);
    failNextRecord = true;
    const failedRetry = await bridge.retryPending();
    assert.deepEqual({attempted: failedRetry.attempted, succeeded: failedRetry.succeeded, rejected: failedRetry.rejected, failed: failedRetry.failed, remaining: failedRetry.remaining}, {attempted: 1, succeeded: 0, rejected: 0, failed: 1, remaining: 1});
    let concurrentWrites = 0;
    let failConcurrent = true;
    const concurrentCheckin = {...checkin, recordEvent: async (input) => {
        concurrentWrites += 1;
        if (failConcurrent) { failConcurrent = false; throw new Error("seed failure"); }
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {id: "event-concurrent", ...input};
    }};
    const concurrentBridge = createTaskHorizonBridge({checkin: concurrentCheckin});
    await concurrentBridge.recordTaskCompletion({blockId: "block-concurrent", localDate: "2026-09-18", itemId: "task-item"});
    const [retryA, retryB] = await Promise.all([concurrentBridge.retryPending(), concurrentBridge.retryPending()]);
    assert.deepEqual(retryA, retryB, "overlapping retries share one result");
    assert.equal(concurrentWrites, 2, "single-flight retry performs one transport attempt");
    let directWrites = 0;
    const directCheckin = {...checkin, recordEvent: async (input) => {
        directWrites += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return {id: "event-direct", ...input};
    }};
    const directBridge = createTaskHorizonBridge({checkin: directCheckin});
    const [directA, directB] = await Promise.all([
        directBridge.recordTaskCompletion({blockId: "same-block", localDate: "2026-09-18", itemId: "task-item"}),
        directBridge.recordTaskCompletion({blockId: "same-block", localDate: "2026-09-18", itemId: "task-item"}),
    ]);
    assert.deepEqual(directA, directB, "overlapping writes share one result");
    assert.equal(directWrites, 1, "same externalRef performs one transport write");
    assert.equal(await bridge.recordTaskCompletion({blockId: "block:bad", localDate: "2026-09-18"}), undefined);
    bridge.stop();
    assert.equal(listener, undefined);
    assert.equal(calls.filter((entry) => entry.type === "record").length, 7);
    const protocolMismatch = createTaskHorizonBridge({checkin: {...checkin, describe: () => ({protocol: "other", version: 4})}});
    assert.equal((await protocolMismatch.start()).reason, "protocol-mismatch");
    const invalidVersion = createTaskHorizonBridge({checkin: {...checkin, describe: () => ({protocol: "siyuan-checkin", version: "unknown"})}});
    assert.equal((await invalidVersion.start()).reason, "protocol-mismatch");
    const readyFailure = createTaskHorizonBridge({checkin: {...checkin, whenReady: async () => { throw new Error("facade unavailable"); }}});
    assert.equal((await readyFailure.start()).reason, "ready-error");
    const capabilityFailure = createTaskHorizonBridge({checkin: {...checkin, hasCapability: () => { throw new Error("capability getter failed"); }}});
    assert.equal((await capabilityFailure.start()).reason, "capability-error");
    const itemsFailure = createTaskHorizonBridge({checkin: {...checkin, getItems: () => { throw new Error("items getter failed"); }}});
    assert.equal((await itemsFailure.start()).reason, "items-error");
    const invalidItems = createTaskHorizonBridge({checkin: {...checkin, getItems: () => ({})}});
    assert.equal((await invalidItems.start()).reason, "items-invalid");
    const maliciousItem = createTaskHorizonBridge({checkin: {...checkin, getItems: () => [{get name() { throw new Error("item getter failed"); }}]}});
    assert.equal((await maliciousItem.start()).reason, "items-error");
    const subscribeFailure = createTaskHorizonBridge({checkin: {...checkin, subscribe: () => { throw new Error("subscribe failed"); }}});
    assert.equal((await subscribeFailure.start()).reason, "subscribe-error");
    let eventError;
    let eventListener;
    const eventFailure = createTaskHorizonBridge({checkin: {...checkin,
        subscribe: (callback) => { eventListener = callback; return () => {}; },
    }, onError: ({phase}) => { eventError = phase; }});
    assert.equal((await eventFailure.start()).ready, true);
    eventListener({get type() { throw new Error("event getter failed"); }});
    assert.equal(eventError, "event", "malformed events stay within diagnostics");
    let cleaned = false;
    const readFailure = createTaskHorizonBridge({checkin: {...checkin,
        getEventRangeSummary: () => { throw new Error("summary unavailable"); },
        subscribe: () => () => { cleaned = true; },
    }, range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"}});
    assert.equal((await readFailure.start()).reason, "read-failed");
    assert.equal(cleaned, true, "failed initialization cleans up event subscription");
    console.log("Task Horizon bridge example checks passed: readiness, refresh, write, retry, validation and cleanup.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
