/* T-1242 拆除预算守门：宿主给插件实例的拆除预算有限（onload/onLayoutReady/onDataChanged/onunload/uninstall 共用），
   卸载路径必须①清掉插件自有定时器（思源不代办）、②每个 await 有界、③排队的写在收尾合并成一次补写。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
const focusSource = fs.readFileSync(path.join(sourceRoot, "render", "focus-timer.ts"), "utf8");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-teardown-"));
fs.writeFileSync(path.join(outputRoot, "teardown.js"), ts.transpileModule(fs.readFileSync(path.join(sourceRoot, "teardown.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
const {createTeardownDeadline, waitWithinDeadline, createTeardownWriteGate, TEARDOWN_DRAIN_BUDGET_MS, TEARDOWN_FLUSH_BUDGET_MS} = require(path.join(outputRoot, "teardown.js"));

/* 预算常量必须落在宿主 5 秒拆除预算之内，并给补写与 uninstall 留出余量。 */
assert.ok(TEARDOWN_DRAIN_BUDGET_MS > 0 && TEARDOWN_DRAIN_BUDGET_MS < 5000, "drain budget must stay inside the host teardown budget");
assert.ok(TEARDOWN_FLUSH_BUDGET_MS > 0 && TEARDOWN_FLUSH_BUDGET_MS < TEARDOWN_DRAIN_BUDGET_MS, "flush budget must be smaller than the drain budget");

/* 截止时间：单调推进、剩余量不为负、越界即过期。 */
let clock = 0;
const deadline = createTeardownDeadline(100, () => clock);
assert.equal(deadline.remainingMs(), 100);
clock = 40;
assert.equal(deadline.remainingMs(), 60);
assert.equal(deadline.expired(), false);
clock = 250;
assert.equal(deadline.remainingMs(), 0, "remaining budget must never go negative");
assert.equal(deadline.expired(), true);
assert.equal(createTeardownDeadline(-5, () => 0).remainingMs(), 0, "a negative budget must clamp to zero");

/* 写门禁：未开启时放行，开启后拦截并标记有待补写，resume 一次性交出结果。 */
const gate = createTeardownWriteGate();
assert.equal(gate.shouldIntercept(), false, "writes must pass through before teardown");
gate.deferWrites();
assert.equal(gate.shouldIntercept(), true);
assert.equal(gate.shouldIntercept(), true, "repeated teardown writes must keep the dirty mark");
assert.equal(gate.resume(), true, "resume must report that a final flush is owed");
assert.equal(gate.shouldIntercept(), false, "resume must restore normal writes");
assert.equal(gate.resume(), false, "the owed flush must be reported only once");
const cleanGate = createTeardownWriteGate();
cleanGate.deferWrites();
assert.equal(cleanGate.resume(), false, "a teardown with no queued write owes no flush");

/* 等待结果三分支：done / failed / timeout，且超时后不残留计时器句柄。 */
(async () => {
    assert.equal(await waitWithinDeadline(Promise.resolve(1), createTeardownDeadline(50)), "done");
    assert.equal(await waitWithinDeadline(Promise.reject(new Error("boom")), createTeardownDeadline(50)), "failed", "a rejected wait must be distinguishable from a completed one");
    const slow = new Promise((resolve) => setTimeout(resolve, 400));
    const started = Date.now();
    assert.equal(await waitWithinDeadline(slow, createTeardownDeadline(20)), "timeout");
    assert.ok(Date.now() - started < 200, "the deadline must win immediately instead of waiting for the slow promise");
    assert.equal(await waitWithinDeadline(slow, createTeardownDeadline(0)), "timeout", "a spent budget must not await at all");

    /* onunload 收尾不得留下无界 await：任何等待都必须走预算包装。 */
    const unloadBody = indexSource.slice(indexSource.indexOf("async onunload()"));
    const unloadSlice = unloadBody.slice(0, unloadBody.indexOf("\n    private "));
    assert.ok(unloadSlice.length > 200, "onunload body must be locatable for the teardown contract");
    for (const unbounded of ["await this.mutationQueue", "await this.saveQueue", "await this.focusOperation", "await this.stopAdapterSilently", "await openTabRequest"]) {
        assert.ok(!unloadSlice.includes(unbounded), `onunload must not await ${unbounded} without a deadline`);
    }
    assert.match(unloadSlice, /createTeardownDeadline\(TEARDOWN_DRAIN_BUDGET_MS\)/, "onunload must open a bounded teardown budget");
    assert.match(unloadSlice, /this\.teardownWrites\.deferWrites\(\)/, "onunload must defer queued writes into one flush");
    assert.match(unloadSlice, /const hasDeferredWrites = this\.teardownWrites\.resume\(\)/, "onunload must release the write gate before flushing");
    assert.match(unloadSlice, /this\.teardownFinalFlush\(\)/, "onunload must run a bounded final flush");
    assert.match(unloadSlice, /stopFocusTimerFor\(this as unknown as FocusTimerHost\)/, "onunload must stop the plugin-owned focus timers");
    assert.match(unloadSlice, /if \(this\.focusTimerState\) void finishFocusTimerFor[\s\S]{0,160}?this\.acceptingOperations = false/, "focus accounting must be enqueued before operations are refused");

    /* 拆除期写拦截与补写：主存储一次写入，不得再读/写备份快照。 */
    assert.match(indexSource, /private persist\(store: CheckinStore = this\.store\): Promise<void> \{\s*if \(this\.teardownWrites\.shouldIntercept\(\)\)/, "queued teardown writes must be intercepted at the top of persist");
    const flushBody = indexSource.slice(indexSource.indexOf("private async teardownFinalFlush()"));
    const flushSlice = flushBody.slice(0, flushBody.indexOf("\n    }"));
    assert.match(flushSlice, /this\.saveData\(STORAGE_NAME, snapshot\)/, "the final flush must write the main store");
    assert.ok(!flushSlice.includes("BACKUP_STORAGE_NAME"), "the final flush must skip snapshot history to save IO");
    assert.match(flushSlice, /ifAvailable: true/, "the final flush must not queue behind another window's lock");
    assert.match(flushSlice, /if \(acquired === undefined\) await this\.withStorageLock\(write\)/, "the final flush must fall back to the queued lock when busy");

    /* 专注计时器：心跳与庆祝延时都归宿主登记，回调必须在拆除后停手。 */
    assert.match(focusSource, /focusCelebrationTimer\?: number/, "the celebration timeout must live on the host so unload can cancel it");
    assert.match(focusSource, /export function stopFocusTimerFor\(host: FocusTimerHost\): void/, "focus-timer must export a teardown stop");
    assert.match(focusSource, /function clearFocusTimerTimers\(host: FocusTimerHost\): void \{\s*if \(host\.focusTimerInterval !== undefined\)[\s\S]*?host\.focusCelebrationTimer !== undefined/, "the stop helper must clear both the interval and the celebration timeout");
    assert.match(focusSource, /export function tickFocusTimerFor\(host: FocusTimerHost\): void \{\s*if \(host\.disposed \|\| host\.disposing\) \{ stopFocusTimerFor\(host\); return; \}/, "the 1s tick must refuse to run once the plugin is tearing down");
    assert.match(focusSource, /host\.focusCelebrationTimer = window\.setTimeout\(\(\) => \{[\s\S]*?if \(host\.disposed \|\| host\.disposing\) return;/, "the celebration callback must be disposal-guarded");

    console.log("teardown budget checks passed: deadline math, write gate, bounded awaits and focus-timer cleanup.");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
