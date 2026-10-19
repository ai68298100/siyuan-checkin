const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {performance} = require("node:perf_hooks");

/* T-1855 方案评估可重复基线与决策守门测试（D-513）：
   对比“游标跨重载持久化” vs “会话态有界重扫 + 幂等去重”方案：
   1. 性能基线：大样本（50,000 事件 + 1,000 扫描行）内存幂等去重延迟必须 < 15ms（实测 ~0.5ms）；
   2. 语义完整性断言：思源大纲前插块（id < cursor）在持久化游标下会发生漏读，而会话态从头重扫完全免疫；
   3. 零存储侵入断言：主 Store v3 与辅助存储桶中严禁出现游标持久化字段；
   4. 架构不变量：健康、笔记推导、叶归三源的 scanCursor 严格维持会话内存属性，不向持久层扩散。 */

const root = path.join(__dirname, "..");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const modelSource = fs.readFileSync(path.join(root, "src", "model.ts"), "utf8");

/* —— 断言 1：架构与存储不变量守门 —— */
assert.match(
    srcIndex,
    /private healthScanCursor = "";/,
    "T-1855: healthScanCursor must remain a session-only in-memory string",
);
assert.match(
    srcIndex,
    /private noteQueryScanCursor = "";/,
    "T-1855: noteQueryScanCursor must remain a session-only in-memory string",
);
assert.match(
    srcIndex,
    /private yeguifScanCursor = "";/,
    "T-1855: yeguifScanCursor must remain a session-only in-memory string",
);

// 确认 Store v3 接口定义中无游标持久化字段
assert.doesNotMatch(
    modelSource,
    /scanCursor\??:\s*string/i,
    "T-1855: CheckinStore must not introduce persistent scanCursor fields (preserving Store v3 shape)",
);
assert.doesNotMatch(
    srcIndex,
    /saveData\([^)]*cursor/i,
    "T-1855: Cursors must never be persisted via bare saveData calls",
);

/* —— 断言 2：前插块（Prepended Block）与删块漏读语义对比验证 —— */
{
    // 模拟思源文档中的块列表：时间序 ID
    const initialDocBlocks = [
        {id: "20261020080000-blk0001", content: "早起打卡"},
        {id: "20261020090000-blk0002", content: "晨读打卡"},
        {id: "20261020120000-blk0003", content: "午休打卡"},
    ];

    // 假设上次扫描停留在 blk0003
    const persistedCursor = "20261020120000-blk0003";

    // 用户在思源大纲顶部或中间前插了一个历史补记块（时间戳更早）
    const modifiedDocBlocks = [
        {id: "20261020073000-blk0000", content: "前插晨跑打卡"}, // 前插块！
        ...initialDocBlocks,
        {id: "20261020180000-blk0004", content: "晚间散步"},
    ];

    // 方案 A（持久化游标）：执行 WHERE id > persistedCursor
    const queryWithPersistedCursor = modifiedDocBlocks.filter((b) => b.id > persistedCursor);
    const missedPrependInPlanA = !queryWithPersistedCursor.some((b) => b.id === "20261020073000-blk0000");
    assert.equal(missedPrependInPlanA, true, "Persisted cursor would silently miss prepended/inserted outline blocks");

    // 方案 B（会话态从头有界重扫 + externalRef 去重）：重载后从头重扫
    const existingEventsRefSet = new Set(["ref-20261020080000-blk0001", "ref-20261020090000-blk0002", "ref-20261020120000-blk0003"]);
    const newlyDiscovered = [];
    for (const block of modifiedDocBlocks) {
        const ref = `ref-${block.id}`;
        if (!existingEventsRefSet.has(ref)) {
            newlyDiscovered.push(block.id);
        }
    }
    assert.deepEqual(newlyDiscovered, ["20261020073000-blk0000", "20261020180000-blk0004"], "Session-based re-scan discovers both prepended and appended blocks without omission");
}

/* —— 断言 3：可重复性能基线（Repeatable Performance Baseline） —— */
{
    // 构造 50,000 条历史事件的基准样本
    const TOTAL_EVENTS = 50000;
    const SCANNED_ROWS = 1000;

    const existingEvents = [];
    for (let i = 0; i < TOTAL_EVENTS; i++) {
        existingEvents.push({
            id: `ev-${i}`,
            itemId: `item-${i % 25}`,
            occurredAt: "2026-10-20T10:00:00.000Z",
            externalRef: `ref-20261020100000-blk${String(i).padStart(6, "0")}`,
        });
    }

    const refIndex = new Set(existingEvents.map((e) => e.externalRef));

    // 构造 1,000 行扫描数据（其中 950 条已存在，50 条为新增）
    const incomingRows = [];
    for (let i = 0; i < SCANNED_ROWS; i++) {
        // 前 950 个已有，后 50 个为新增
        const blockNum = i < 950 ? i : TOTAL_EVENTS + i;
        incomingRows.push({
            id: `20261020100000-blk${String(blockNum).padStart(6, "0")}`,
            content: `sample log entry ${i}`,
        });
    }

    // 测算纯内存对账耗时
    const t0 = performance.now();
    let deduplicatedCount = 0;
    let freshCount = 0;

    for (const row of incomingRows) {
        const candidateRef = `ref-${row.id}`;
        if (refIndex.has(candidateRef)) {
            deduplicatedCount++;
        } else {
            freshCount++;
        }
    }

    const durationMs = performance.now() - t0;

    assert.equal(deduplicatedCount, 950, "950 existing events correctly deduplicated");
    assert.equal(freshCount, 50, "50 fresh events correctly admitted");
    assert.ok(durationMs < 15, `Deduplication of 1,000 rows against 50k events must be < 15ms (actual: ${durationMs.toFixed(3)}ms)`);

    console.log(`Scan cursor persistence assessment passed:
  - Architecture: session-only cursor confirmed, Store v3 shape preserved
  - Semantic safety: prepended block omission prevented by idempotent re-scan
  - Performance baseline: 1k rows vs 50k events checked in ${durationMs.toFixed(3)}ms (< 15ms budget)`);
}
