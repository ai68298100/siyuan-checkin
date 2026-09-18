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
const checkin = {
    whenReady: async () => true,
    hasCapability: (name) => name === "analytics.read" || name === "events.record",
    getItems: () => [{id: "task-item", name: "任务打卡"}],
    getEventRangeSummary: (range) => { calls.push({type: "summary", range}); return {points: []}; },
    subscribe: (callback) => { listener = callback; return () => { listener = undefined; }; },
    recordEvent: async (input) => {
        calls.push({type: "record", input});
        if (failNextRecord) { failNextRecord = false; throw new Error("temporary write failure"); }
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
    listener({type: "checkin:event-recorded"});
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(refreshCount, 2, "allowed refresh events trigger a summary refresh");
    const recorded = await bridge.recordTaskCompletion({blockId: "block-1", localDate: "2026-09-18"});
    assert.equal(recorded.externalRef, "taskhorizon:block-1:2026-09-18");
    failNextRecord = true;
    assert.equal(await bridge.recordTaskCompletion({blockId: "block-2", localDate: "2026-09-18"}), undefined);
    assert.equal(bridge.getPendingCompletions().length, 1, "thrown writes are retained for retry");
    const retry = await bridge.retryPending();
    assert.deepEqual({attempted: retry.attempted, succeeded: retry.succeeded, remaining: retry.remaining}, {attempted: 1, succeeded: 1, remaining: 0});
    assert.equal(await bridge.recordTaskCompletion({blockId: "block:bad", localDate: "2026-09-18"}), undefined);
    bridge.stop();
    assert.equal(listener, undefined);
    assert.equal(calls.filter((entry) => entry.type === "record").length, 3);
    console.log("Task Horizon bridge example checks passed: readiness, refresh, write, retry, validation and cleanup.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
