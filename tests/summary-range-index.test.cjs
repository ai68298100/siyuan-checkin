const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-summary-range-index-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "analytics.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const analytics = require(path.join(outputRoot, "analytics.js"));
const makeItem = (index) => ({id:`item-${index}`,name:`项目 ${index}`,icon:"📖",kind:"count",target:1,unit:"次",schedule:{type:"daily"},createdAt:"2026-01-01T00:00:00.000Z",updatedAt:"2026-01-01T00:00:00.000Z",createdDate:"2026-01-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:index,timeSlot:"any"});
const makeEvent = (itemId, id, localDate, value = 1) => ({id,itemId,occurredAt:`${localDate}T08:00:00.000Z`,localDate,value,unit:"次",source:"manual"});

for (let index = 1; index <= 25; index += 1) {
    const item = makeItem(index);
    const startDate = `2026-08-${String(index).padStart(2,"0")}`;
    const endDate = `2026-08-${String(index + 1).padStart(2,"0")}`;
    const inRange = makeEvent(item.id,`in-${index}`,startDate,index);
    const endRange = makeEvent(item.id,`end-${index}`,endDate,index + 1);
    const today = makeEvent(item.id,`today-${index}`,"2026-09-17",100);
    const store = {version:2,items:[item],events:[today,inRange,endRange],eventTombstones:[]};
    const summary = analytics.buildCustomSummaryContext(store,{startDate,endDate},new Date(2026,8,17,12));
    assert.equal(summary.totalEvents,2,`case ${index}: historical custom bounds select their own events`);
    assert.equal(summary.items[0].eventCount,2,`case ${index}: item count uses the bounded bucket`);
    assert.equal(summary.items[0].totalsByUnit[0].totalValue,index * 2 + 1,`case ${index}: totals exclude as-of-day events`);
    assert.deepEqual([summary.startDate,summary.endDate],[startDate,endDate],`case ${index}: requested labels remain exact`);
}

const itemCount = 100;
const eventsPerItem = 1000;
const items = Array.from({length:itemCount},(_,index) => makeItem(index));
const events = items.flatMap((item) => Array.from({length:eventsPerItem},(_,index) => makeEvent(item.id,`${item.id}-${index}`,`2026-08-${String(index % 25 + 1).padStart(2,"0")}`)));
const largeStore = {version:2,items,events,eventTombstones:[]};
const startedAt = performance.now();
const summary = analytics.buildCustomSummaryContext(largeStore,{startDate:"2026-08-01",endDate:"2026-08-25"},new Date(2026,8,17,12));
const elapsed = performance.now() - startedAt;
assert.equal(summary.totalEvents,100000,"historical custom summary includes all bounded events");
assert.equal(summary.items.length,itemCount,"every populated project receives one summary row");
assert.equal(summary.items.every((entry) => entry.eventCount === eventsPerItem),true,"per-item buckets stay exact");
assert.ok(elapsed < 5000,`100k custom summary must finish within 5s, received ${elapsed.toFixed(1)}ms`);

console.log(`Summary range index checks passed: 25 cases, 100 matrix assertions; 100k custom summary ${elapsed.toFixed(1)}ms.`);
