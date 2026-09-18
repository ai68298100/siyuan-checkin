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
    listener({type: "checkin:event-recorded"});
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(refreshCount, 2, "allowed refresh events trigger a summary refresh");
    for (const type of ["checkin:analytics-updated", "checkin:item-archived", "checkin:item-updated"]) {
        listener({type});
    }
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(refreshCount, 5, "all manifest refresh events trigger a summary refresh");
    const recorded = await bridge.recordTaskCompletion({blockId: "block-1", localDate: "2026-09-18"});
    assert.equal(recorded.externalRef, "taskhorizon:block-1:2026-09-18");
    failNextRecord = true;
    assert.equal(await bridge.recordTaskCompletion({blockId: "block-2", localDate: "2026-09-18"}), undefined);
    assert.equal(bridge.getPendingCompletions().length, 1, "thrown writes are retained for retry");
    const retry = await bridge.retryPending();
    assert.deepEqual({attempted: retry.attempted, succeeded: retry.succeeded, rejected: retry.rejected, remaining: retry.remaining}, {attempted: 1, succeeded: 1, rejected: 0, remaining: 0});
    failNextRecord = true;
    assert.equal(await bridge.recordTaskCompletion({blockId: "block-3", localDate: "2026-09-18"}), undefined);
    rejectNextRecord = true;
    const rejectedRetry = await bridge.retryPending();
    assert.deepEqual({attempted: rejectedRetry.attempted, succeeded: rejectedRetry.succeeded, rejected: rejectedRetry.rejected, remaining: rejectedRetry.remaining}, {attempted: 1, succeeded: 0, rejected: 1, remaining: 0});
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
    assert.equal(await bridge.recordTaskCompletion({blockId: "block:bad", localDate: "2026-09-18"}), undefined);
    bridge.stop();
    assert.equal(listener, undefined);
    assert.equal(calls.filter((entry) => entry.type === "record").length, 5);
    const protocolMismatch = createTaskHorizonBridge({checkin: {...checkin, describe: () => ({protocol: "other", version: 4})}});
    assert.equal((await protocolMismatch.start()).reason, "protocol-mismatch");
    const invalidVersion = createTaskHorizonBridge({checkin: {...checkin, describe: () => ({protocol: "siyuan-checkin", version: "unknown"})}});
    assert.equal((await invalidVersion.start()).reason, "protocol-mismatch");
    const readyFailure = createTaskHorizonBridge({checkin: {...checkin, whenReady: async () => { throw new Error("facade unavailable"); }}});
    assert.equal((await readyFailure.start()).reason, "ready-error");
    let cleaned = false;
    const readFailure = createTaskHorizonBridge({checkin: {...checkin,
        getEventRangeSummary: () => { throw new Error("summary unavailable"); },
        subscribe: () => () => { cleaned = true; },
    }, range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"}});
    assert.equal((await readFailure.start()).reason, "read-failed");
    assert.equal(cleaned, true, "failed initialization cleans up event subscription");
    console.log("Task Horizon bridge example checks passed: readiness, refresh, write, retry, validation and cleanup.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
