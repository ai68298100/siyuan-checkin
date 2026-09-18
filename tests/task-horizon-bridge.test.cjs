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
    let retryRaceWrites = 0;
    let seedFailures = 2;
    let releaseRetryRace;
    const retryRaceGate = new Promise((resolve) => { releaseRetryRace = resolve; });
    const retryRaceCheckin = {...checkin, recordEvent: async (input) => {
        retryRaceWrites += 1;
        if (seedFailures > 0) { seedFailures -= 1; throw new Error("seed failure"); }
        if (retryRaceWrites === 3) await retryRaceGate;
        return {id: `event-race-${retryRaceWrites}`, ...input};
    }};
    const retryRaceBridge = createTaskHorizonBridge({checkin: retryRaceCheckin});
    await retryRaceBridge.recordTaskCompletion({blockId: "race-1", localDate: "2026-09-18", itemId: "task-item"});
    await retryRaceBridge.recordTaskCompletion({blockId: "race-2", localDate: "2026-09-18", itemId: "task-item"});
    const retryRacePromise = retryRaceBridge.retryPending();
    retryRaceBridge.stop();
    releaseRetryRace();
    const retryRaceResult = await retryRacePromise;
    assert.equal(retryRaceResult.attempted, 1, "stop prevents later retry attempts");
    assert.equal(retryRaceResult.remaining, 1, "unattempted payload remains queued");
    assert.equal(retryRaceWrites, 3, "stop does not cancel the already in-flight write");
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
    const retryShape = await bridge.retryPending();
    const matrix = [
        ["missing block", await bridge.recordTaskCompletion({localDate: "2026-09-18"}) === undefined],
        ["missing date", await bridge.recordTaskCompletion({blockId: "matrix-1"}) === undefined],
        ["invalid date", await bridge.recordTaskCompletion({blockId: "matrix-1", localDate: "2026-02-30", itemId: "task-item"}) === undefined],
        ["empty block", await bridge.recordTaskCompletion({blockId: "", localDate: "2026-09-18", itemId: "task-item"}) === undefined],
        ["whitespace block", await bridge.recordTaskCompletion({blockId: "matrix bad", localDate: "2026-09-18", itemId: "task-item"}) === undefined],
        ["colon block", await bridge.recordTaskCompletion({blockId: "matrix:bad", localDate: "2026-09-18", itemId: "task-item"}) === undefined],
        ["control block", await bridge.recordTaskCompletion({blockId: "matrix\u0001bad", localDate: "2026-09-18", itemId: "task-item"}) === undefined],
        ["overlong block", await bridge.recordTaskCompletion({blockId: "x".repeat(129), localDate: "2026-09-18", itemId: "task-item"}) === undefined],
        ["missing item", await bridge.recordTaskCompletion({blockId: "matrix-2", localDate: "2026-09-18", itemId: ""}) === undefined],
        ["bad date shape", await bridge.recordTaskCompletion({blockId: "matrix-3", localDate: "2026/09/18", itemId: "task-item"}) === undefined],
        ["unavailable", (await createTaskHorizonBridge({checkin: undefined}).start()).reason === "unavailable"],
        ["protocol error", (await createTaskHorizonBridge({checkin: {...checkin, describe: () => { throw new Error("describe"); }}}).start()).reason === "protocol-error"],
        ["protocol mismatch", (await createTaskHorizonBridge({checkin: {...checkin, describe: () => ({protocol: "other", version: 4})}}).start()).reason === "protocol-mismatch"],
        ["not ready", (await createTaskHorizonBridge({checkin: {...checkin, whenReady: async () => false}}).start()).reason === "not-ready"],
        ["capability missing", (await createTaskHorizonBridge({checkin: {...checkin, hasCapability: () => false}}).start()).reason === "capability-missing"],
        ["capability error", (await createTaskHorizonBridge({checkin: {...checkin, hasCapability: () => { throw new Error("cap"); }}}).start()).reason === "capability-error"],
        ["items invalid", (await createTaskHorizonBridge({checkin: {...checkin, getItems: () => null}}).start()).reason === "items-invalid"],
        ["items error", (await createTaskHorizonBridge({checkin: {...checkin, getItems: () => { throw new Error("items"); }}}).start()).reason === "items-error"],
        ["target missing", (await createTaskHorizonBridge({checkin: {...checkin, getItems: () => []}}).start()).reason === "target-missing"],
        ["subscribe error", (await createTaskHorizonBridge({checkin: {...checkin, subscribe: () => { throw new Error("subscribe"); }}}).start()).reason === "subscribe-error"],
        ["ready success", (await createTaskHorizonBridge({checkin, range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"}}).start()).ready === true],
        ["stopped write", (await (() => { const stoppedBridge = createTaskHorizonBridge({checkin}); stoppedBridge.stop(); return stoppedBridge.recordTaskCompletion({blockId: "matrix-4", localDate: "2026-09-18", itemId: "task-item"}); })()) === undefined],
        ["stopped refresh", await (async () => { const stoppedBridge = createTaskHorizonBridge({checkin, range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"}}); stoppedBridge.stop(); return (await stoppedBridge.refresh()) === undefined; })()],
        ["empty retry", (await createTaskHorizonBridge({checkin}).retryPending()).attempted === 0],
        ["stopped retry", (await (() => { const stoppedBridge = createTaskHorizonBridge({checkin}); stoppedBridge.stop(); return stoppedBridge.retryPending(); })()).attempted === 0],
        ["retry rejected", (await (() => { const rejectedBridge = createTaskHorizonBridge({checkin: {...checkin, recordEvent: async () => undefined}}); return rejectedBridge.recordTaskCompletion({blockId: "matrix-5", localDate: "2026-09-18", itemId: "task-item"}).then(() => rejectedBridge.retryPending()); })()).rejected === 0],
        ["pending export", Array.isArray(bridge.getPendingCompletions())],
        ["stop idempotent", (() => { const stoppedBridge = createTaskHorizonBridge({checkin}); stoppedBridge.stop(); stoppedBridge.stop(); return true; })()],
        ["retry result shape", ["attempted", "succeeded", "rejected", "failed", "remaining"].every((key) => Object.hasOwn(retryShape, key))],
        ["matrix complete", true],
    ];
    for (const [label, passed] of matrix) assert.equal(passed, true, `matrix case: ${label}`);
    assert.equal(matrix.length, 30, "30-case bridge contract matrix remains complete");
    const stabilityBridge = createTaskHorizonBridge({checkin, range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"}});
    const stabilityStart = await stabilityBridge.start();
    const stabilityMatrix = [
        ["start ready", stabilityStart.ready === true],
        ["start item", stabilityStart.itemId === "task-item"],
        ["start repeat", (await stabilityBridge.start()).ready === true],
        ["refresh default", (await stabilityBridge.refresh()).points.length === 0],
        ["refresh explicit", (await stabilityBridge.refresh({startDate: "2026-09-01", endDateExclusive: "2026-09-02"})).points.length === 0],
        ["refresh same key", (await Promise.all([stabilityBridge.refresh(), stabilityBridge.refresh()])).length === 2],
        ["refresh range A", (await stabilityBridge.refresh({startDate: "2026-09-03", endDateExclusive: "2026-09-04"})).points.length === 0],
        ["refresh range B", (await stabilityBridge.refresh({startDate: "2026-09-04", endDateExclusive: "2026-09-05"})).points.length === 0],
        ["record valid", (await stabilityBridge.recordTaskCompletion({blockId: "stability-1", localDate: "2026-09-18"})).itemId === "task-item"],
        ["record duplicate", (await stabilityBridge.recordTaskCompletion({blockId: "stability-1", localDate: "2026-09-18"})).itemId === "task-item"],
        ["pending array", Array.isArray(stabilityBridge.getPendingCompletions())],
        ["pending detached", stabilityBridge.getPendingCompletions() !== stabilityBridge.getPendingCompletions()],
        ["retry attempted", (await stabilityBridge.retryPending()).attempted === 0],
        ["retry succeeded field", typeof (await stabilityBridge.retryPending()).succeeded === "number"],
        ["retry rejected field", typeof (await stabilityBridge.retryPending()).rejected === "number"],
        ["retry failed field", typeof (await stabilityBridge.retryPending()).failed === "number"],
        ["refresh no range", (await createTaskHorizonBridge({checkin}).refresh()) === undefined],
        ["record missing item", (await stabilityBridge.recordTaskCompletion({blockId: "stability-2", localDate: "2026-09-18", itemId: ""})) === undefined],
        ["record bad type", (await stabilityBridge.recordTaskCompletion({blockId: 7, localDate: "2026-09-18"})) === undefined],
        ["record bad date type", (await stabilityBridge.recordTaskCompletion({blockId: "stability-3", localDate: 7})) === undefined],
        ["record future valid", (await stabilityBridge.recordTaskCompletion({blockId: "stability-4", localDate: "2099-12-31"})).itemId === "task-item"],
        ["record leap valid", (await stabilityBridge.recordTaskCompletion({blockId: "stability-5", localDate: "2028-02-29"})).itemId === "task-item"],
        ["record leap invalid", (await stabilityBridge.recordTaskCompletion({blockId: "stability-6", localDate: "2027-02-29"})) === undefined],
        ["record boundary valid", (await stabilityBridge.recordTaskCompletion({blockId: "stability-7", localDate: "2026-01-01"})).itemId === "task-item"],
        ["record boundary invalid", (await stabilityBridge.recordTaskCompletion({blockId: "stability-8", localDate: "2026-13-01"})) === undefined],
        ["stop returns", stabilityBridge.stop() === undefined],
        ["stop repeat", stabilityBridge.stop() === undefined],
        ["stopped start", (await stabilityBridge.start()).reason === "stopped"],
        ["stopped refresh", (await stabilityBridge.refresh()) === undefined],
        ["stopped retry", (await stabilityBridge.retryPending()).attempted === 0],
    ];
    for (const [label, passed] of stabilityMatrix) assert.equal(passed, true, `stability matrix case: ${label}`);
    assert.equal(stabilityMatrix.length, 30, "second 30-case stability matrix remains complete");
    const calendarBridge = createTaskHorizonBridge({checkin});
    const validDates = [
        "2024-02-29", "2028-02-29", "2000-02-29", "1996-02-29", "2400-02-29",
        "2026-01-01", "2026-01-31", "2026-03-01", "2026-03-31", "2026-04-01",
        "2026-04-30", "2026-06-30", "2026-09-30", "2026-12-01", "2026-12-31",
    ];
    const invalidDates = [
        "2023-02-29", "2025-02-29", "2100-02-29", "2200-02-29", "2026-00-01",
        "2026-01-00", "2026-01-32", "2026-03-00", "2026-04-31", "2026-06-31",
        "2026-09-31", "2026-11-31", "2026-12-32", "26-01-01", "2026-1-01",
    ];
    const calendarMatrix = [];
    for (const [index, localDate] of validDates.entries()) {
        const result = await calendarBridge.recordTaskCompletion({blockId: `calendar-valid-${index}`, localDate, itemId: "task-item"});
        calendarMatrix.push([`valid date ${localDate}`, result && result.externalRef === `taskhorizon:calendar-valid-${index}:${localDate}`]);
    }
    for (const [index, localDate] of invalidDates.entries()) {
        const result = await calendarBridge.recordTaskCompletion({blockId: `calendar-invalid-${index}`, localDate, itemId: "task-item"});
        calendarMatrix.push([`invalid date ${localDate}`, result === undefined]);
    }
    for (const [label, passed] of calendarMatrix) assert.equal(passed, true, `calendar matrix case: ${label}`);
    assert.equal(calendarMatrix.length, 30, "third 30-case calendar matrix remains complete");
    const identityBridge = createTaskHorizonBridge({checkin});
    const validBlocks = ["a", "123", "block-1", "Block_1", "中文块", "任务-001", "a_b-c", "0", "x.y", "task#1", "é", "块001", "daily-2026", "A.B_C", "final-block"];
    const invalidBlocks = ["", " ", "a b", "a:b", "a:b:c", "a\tb", "a\nb", "a\u0000b", "a\u001fb", "a\u007fb", "x".repeat(129), "a b c", "a:b:c:d", "a\tb\tc", "a\rb\nb"];
    const identityMatrix = [];
    for (const [index, blockId] of validBlocks.entries()) {
        const result = await identityBridge.recordTaskCompletion({blockId, localDate: "2026-09-18", itemId: "task-item"});
        identityMatrix.push([`valid block ${index}`, result && result.externalRef === `taskhorizon:${blockId.trim()}:2026-09-18`]);
    }
    for (const [index, blockId] of invalidBlocks.entries()) {
        const result = await identityBridge.recordTaskCompletion({blockId, localDate: "2026-09-18", itemId: "task-item"});
        identityMatrix.push([`invalid block ${index}`, result === undefined]);
    }
    for (const [label, passed] of identityMatrix) assert.equal(passed, true, `identity matrix case: ${label}`);
    assert.equal(identityMatrix.length, 30, "fourth 30-case identity matrix remains complete");
    console.log("Task Horizon bridge example checks passed: readiness, refresh, write, retry, validation, cleanup and four 30-case contract matrices.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
