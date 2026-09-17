const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-quota-progress-index-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const makeItem = (index, countMode = "value") => ({id:`item-${index}`,name:`项目 ${index}`,icon:"📖",kind:"count",target:10,unit:"次",schedule:{type:"quota",quota:{period:"month",amount:20,countMode}},createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",createdDate:"2026-09-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:index,timeSlot:"any"});
const makeEvent = (itemId, index, unit = "次") => ({id:`${itemId}-event-${index}`,itemId,occurredAt:`2026-09-${String(index % 25 + 1).padStart(2,"0")}T00:00:00.000Z`,localDate:`2026-09-${String(index % 25 + 1).padStart(2,"0")}`,value:1,unit,source:"manual"});
const date = new Date(2026, 8, 17, 12);

for (let index = 1; index <= 25; index += 1) {
    const target = makeItem(index);
    const other = makeItem(index + 100);
    const targetEvents = [makeEvent(target.id, 1),makeEvent(target.id, 2),makeEvent(target.id, 3)];
    const otherEvents = Array.from({length:20}, (_, eventIndex) => makeEvent(other.id, eventIndex));
    const store = {version:2,items:[target,other],events:[...otherEvents,...targetEvents],eventTombstones:[]};
    assert.deepEqual(model.getEventsForItem(store,target.id),targetEvents,`case ${index}: item projection preserves target order`);
    assert.equal(model.getProgress(store,target,date),3,`case ${index}: other item events do not inflate value quota`);
    assert.equal(model.getProgress(store,{...target,schedule:{type:"quota",quota:{period:"month",amount:20,countMode:"dates"}}},date),3,`case ${index}: date quota counts target dates only`);
    assert.equal(model.getEventsForItem(store,"missing").length,0,`case ${index}: missing item uses shared empty result`);
}

const itemCount = 100;
const eventsPerItem = 1000;
const items = Array.from({length:itemCount}, (_, index) => makeItem(index));
const events = items.flatMap((item) => Array.from({length:eventsPerItem}, (_, index) => makeEvent(item.id,index)));
const largeStore = {version:2,items,events,eventTombstones:[]};
model.getStoreIndex(largeStore);
const startedAt = performance.now();
let total = 0;
for (let index = 0; index < 25; index += 1) total += model.getProgress(largeStore,items[index],date);
const elapsed = performance.now() - startedAt;
assert.equal(total,25 * 1000,"25 quota queries return exact per-item totals");
assert.ok(elapsed < 500,`25 warmed quota queries over 100k mixed events must finish within 500ms, received ${elapsed.toFixed(1)}ms`);

console.log(`Quota progress index checks passed: 25 cases, 100 matrix assertions; 25 queries over 100k events ${elapsed.toFixed(1)}ms.`);
