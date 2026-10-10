/* T-1428 · R-A5/R-40.2 Task Horizon mock consumer 测试——以消费者参考实现
   （examples/task-horizon-bridge/plugin.js）为被测对象，验证消费侧健壮性契约：
   能力缺失降级（v4 宿主 summary-fallback）、calendar.read 发现（v5 投影路径）、
   单飞合流、事件失效缓存、同步 provider 方法边界。全部用桩宿主，不触真实宿主。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "examples", "task-horizon-bridge", "plugin.js"), "utf8");
const context = {console, module: {exports: {}}, exports: {}, globalThis: {}, setTimeout, clearTimeout};
vm.runInNewContext(source, context, {filename: "task-horizon-bridge/plugin.js"});
const {createTaskHorizonBridge: createRawTaskHorizonBridge} = context.module.exports;
const createTaskHorizonBridge = (options = {}) => createRawTaskHorizonBridge({itemId: "task-item", ...options});

const HOST_V5 = (overrides = {}) => ({
    whenReady: async () => true,
    describe: () => ({protocol: "siyuan-checkin", version: 5}),
    hasCapability: (name) => name === "items.read" || name === "analytics.read" || name === "events.record" || name === "calendar.read",
    getItems: () => [{id: "task-item", name: "任务打卡"}],
    getEventRangeSummary: () => ({points: []}),
    getCalendarProjection: () => ({items: [], truncated: false, totalItems: 0}),
    subscribe: () => () => undefined,
    recordEvent: async () => ({id: "event-1"}),
    ...overrides,
});
const HOST_V4 = (overrides = {}) => HOST_V5({describe: () => ({protocol: "siyuan-checkin", version: 4}), hasCapability: (name) => name === "items.read" || name === "analytics.read" || name === "events.record", getCalendarProjection: undefined, ...overrides});

(async () => {

/* —— 1. v5 宿主：calendar.read 发现 + 投影消费 —— */
{
    let projectionCalls = 0;
    const bridge = createTaskHorizonBridge({checkin: HOST_V5({getCalendarProjection: () => { projectionCalls += 1; return {items: [{itemId: "task-item", points: [{date: "2026-09-24", status: "complete"}]}], truncated: false, totalItems: 2}; }}), range: {startDate: "2026-09-18", endDateExclusive: "2026-09-25"}});
    const started = await bridge.start();
    assert.equal(started.ready, true);
    assert.equal(started.projectionMode, "calendar.read", "v5 宿主必须发现 calendar.read");
    const result = await bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"});
    assert.equal(result.data.items.length, 1);
    bridge.stop();
}

/* —— 2. 单飞合流：三个并发投影调用只打一次提供方；缓存命中后零调用 —— */
{
    let projectionCalls = 0;
    const bridge = createTaskHorizonBridge({checkin: HOST_V5({getCalendarProjection: () => { projectionCalls += 1; return {items: [], truncated: false, totalItems: 0}; }}), range: {startDate: "2026-09-18", endDateExclusive: "2026-09-25"}});
    await bridge.start();
    const [a, b, c] = await Promise.all([
        bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"}),
        bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"}),
        bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"}),
    ]);
    assert.equal(projectionCalls, 1, "并发调用单飞合流");
    assert.deepEqual(a, b);
    assert.deepEqual(a, c);
    await bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"});
    assert.equal(projectionCalls, 1, "缓存命中不再调用提供方");
    bridge.stop();
}

/* —— 3. 刷新事件失效缓存：事件后再次消费必须重新调用提供方 —— */
{
    let projectionCalls = 0;
    let listener;
    const bridge = createTaskHorizonBridge({checkin: HOST_V5({
        getCalendarProjection: () => { projectionCalls += 1; return {items: [], truncated: false, totalItems: 0}; },
        subscribe: (callback) => { listener = callback; return () => { listener = undefined; }; },
    }), range: {startDate: "2026-09-18", endDateExclusive: "2026-09-25"}});
    await bridge.start();
    await bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"});
    assert.equal(projectionCalls, 1);
    listener({type: "event-recorded"});
    await bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"});
    assert.equal(projectionCalls, 2, "刷新事件后缓存失效");
    bridge.stop();
}

/* —— 4. 同步读取边界：调用时传入公开 API 的准确半开日期范围 —— */
{
    let received;
    const bridge = createTaskHorizonBridge({checkin: HOST_V5({getCalendarProjection: (range) => { received = range; return {items: [], truncated: false, totalItems: 0}; }}), range: {startDate: "2026-09-18", endDateExclusive: "2026-09-25"}, projectionTimeoutMs: 20});
    await bridge.start();
    const result = await bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"});
    assert.equal(JSON.stringify(received), JSON.stringify({startDate: "2026-09-18", endDateExclusive: "2026-09-25"}), "consumer must preserve the provider half-open range");
    assert.equal(result.data.truncated, false);
    bridge.stop();
}

/* —— 5. Abort 守卫：已中止的 signal 直接放弃且不打提供方 —— */
{
    let projectionCalls = 0;
    const controller = new AbortController();
    const bridge = createTaskHorizonBridge({checkin: HOST_V5({getCalendarProjection: () => { projectionCalls += 1; return {items: [], truncated: false, totalItems: 0}; }}), range: {startDate: "2026-09-18", endDateExclusive: "2026-09-25"}});
    await bridge.start();
    controller.abort();
    const result = await bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"}, {signal: controller.signal});
    assert.deepEqual({abandoned: result.abandoned, reason: result.reason}, {abandoned: true, reason: "aborted"});
    assert.equal(projectionCalls, 1, "预先中止调用不应再次打提供方");
    bridge.stop();
}

/* —— 6. 旧消费者降级：v4 宿主（无 calendar.read）summary-fallback 仍完整可用 —— */
{
    let summaryCalls = 0;
    const bridge = createTaskHorizonBridge({checkin: HOST_V4({getEventRangeSummary: () => { summaryCalls += 1; return {points: []}; }}), range: {startDate: "2026-09-18", endDate: "2026-09-24"}});
    const started = await bridge.start();
    assert.equal(started.ready, true, "v4 宿主照常就绪");
    assert.equal(started.projectionMode, "summary-fallback", "显式降级为 summary-fallback");
    const result = await bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"});
    assert.deepEqual({abandoned: result.abandoned, reason: result.reason}, {abandoned: true, reason: "capability-missing"}, "投影路径显式拒绝，不猜 v5 字段");
    await bridge.refresh();
    assert.equal(summaryCalls, 2, "降级路径经 getEventRangeSummary 照常刷新");
    bridge.stop();
}

/* —— 7. stop 后投影拒绝 —— */
{
    const bridge = createTaskHorizonBridge({checkin: HOST_V5(), range: {startDate: "2026-09-18", endDateExclusive: "2026-09-25"}});
    await bridge.start();
    bridge.stop();
    const result = await bridge.getProjection({startDate: "2026-09-18", endDateExclusive: "2026-09-25"});
    assert.equal(result.reason, "stopped");
}

/* —— 8. 日历读取与写回目标独立：无 itemId 仍可只读启动 —— */
{
    let projectionCalls = 0;
    const bridge = createRawTaskHorizonBridge({
        checkin: HOST_V5({getCalendarProjection: () => { projectionCalls += 1; return {items: [], truncated: false, totalItems: 0}; }}),
        range: {startDate: "2026-09-18", endDateExclusive: "2026-09-25"},
        enableWriteBack: false,
    });
    const started = await bridge.start();
    assert.equal(started.ready, true, "只读图层不应要求写回目标项目");
    assert.equal(started.writeEnabled, false);
    assert.equal(projectionCalls, 1);
    assert.equal(await bridge.recordTaskCompletion({blockId: "read-only", localDate: "2026-09-18"}), undefined);
    bridge.stop();
}

console.log("task-horizon mock-consumer tests passed: 能力发现/v5 同步投影/单飞合流/事件失效缓存/半开日期范围/预先 Abort/v4 降级/stop 语义/读写独立 全部通过");
})().catch((error) => { console.error(error); process.exit(1); });
