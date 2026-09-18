const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

process.env.TZ = "Asia/Shanghai";
const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-auto-archive-performance-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const start = new Date(2016, 8, 20, 12);
const dayKey = (offset) => {
    const date = new Date(start);
    date.setDate(date.getDate() + offset);
    return model.dateKey(date);
};
const item = {
    id: "long-history", name: "长期项目", icon: "✓", kind: "binary", target: 1, unit: "次",
    schedule: {type: "daily"}, createdDate: dayKey(0), createdAt: "2016-09-20T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z", revisions: [], archivePeriods: [], archived: false,
    group: "", priority: "medium", sortOrder: 0, timeSlot: "any",
};
const events = Array.from({length: 100000}, (_, index) => {
    const localDate = dayKey(index % 3650);
    return {id: `event-${index}`, itemId: item.id, occurredAt: `${localDate}T04:00:00.000Z`, localDate, value: 1, unit: "次", source: "manual"};
});
const store = {version: 2, items: [item], events, eventTombstones: []};
const today = new Date(start);
today.setDate(today.getDate() + 3649);
const startedAt = performance.now();
const completedDays = model.countCompletedDays(store, item, today);
const elapsed = performance.now() - startedAt;
assert.equal(completedDays, 3650, "every represented daily opportunity is complete exactly once");
/* T-1239 期间实测本机单次投影波动 301-838ms（整机慢速时 review 基线 100k 同步
   劣化约 4 倍，583→2202ms），属环境噪声而非代码回归。门槛与 review-performance
   的 100k 基线（3000ms 级）对齐：仍能捕获 10 倍级灾难性退化（丢失索引的
   逐日重扫约需 30s+），不受机器天气影响。 */
assert.ok(elapsed < 3000, `100k-event auto-archive projection must finish within 3000ms, received ${elapsed.toFixed(1)}ms`);

const batchItemCount = 50;
const batchDays = 365;
const batchItems = Array.from({length:batchItemCount}, (_, index) => ({...item, id:`batch-item-${index}`, name:`批量项目 ${index}`, createdDate:dayKey(0)}));
const batchEvents = Array.from({length:100000}, (_, index) => {
    const itemIndex = index % batchItemCount;
    const localDate = dayKey(Math.floor(index / batchItemCount) % batchDays);
    return {id:`batch-event-${index}`,itemId:`batch-item-${itemIndex}`,occurredAt:`${localDate}T04:00:00.000Z`,localDate,value:1,unit:"次",source:"manual"};
});
const batchStore = {version:2,items:batchItems,events:batchEvents,eventTombstones:[]};
const batchToday = new Date(start);
batchToday.setDate(batchToday.getDate() + batchDays - 1);
const batchStartedAt = performance.now();
const eligible = batchItems.filter((candidate) => model.countCompletedDays(batchStore, candidate, batchToday) >= batchDays);
const batchElapsed = performance.now() - batchStartedAt;
assert.equal(eligible.length, batchItemCount, "all batch candidates meet the same automatic archive threshold");
assert.ok(batchElapsed < 3000, `50-item / 100k-event eligibility projection must finish within 3000ms, received ${batchElapsed.toFixed(1)}ms`);

console.log(`Auto-archive performance checks passed: 100k/3650 single ${elapsed.toFixed(1)}ms; 50-item/100k batch ${batchElapsed.toFixed(1)}ms.`);
