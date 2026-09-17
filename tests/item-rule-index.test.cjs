const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-item-rule-index-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const makeItem = (index) => ({id:`item-${index}`,name:`项目 ${index}`,icon:"📖",kind:"count",target:20,unit:"次",schedule:{type:"quota",quota:{period:"month",amount:20,countMode:"value"}},createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",createdDate:"2026-09-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:index,timeSlot:"any"});
const makeEvent = (itemId, index) => ({id:`${itemId}-event-${index}`,itemId,occurredAt:`2026-09-${String(index % 25 + 1).padStart(2,"0")}T00:00:00.000Z`,localDate:`2026-09-${String(index % 25 + 1).padStart(2,"0")}`,value:1,unit:"次",source:"manual"});
const date = new Date(2026,8,17,12);

for (let index = 1; index <= 25; index += 1) {
    const target = makeItem(index);
    const other = makeItem(index + 100);
    const targetEvents = Array.from({length:index}, (_, eventIndex) => makeEvent(target.id,eventIndex));
    const otherEvents = Array.from({length:30}, (_, eventIndex) => makeEvent(other.id,eventIndex));
    const store = {version:2,items:[target,other],events:[...otherEvents,...targetEvents],eventTombstones:[]};
    const rule = model.evaluateItemRule(store,target,date);
    assert.equal(rule.progress,index,`case ${index}: rule progress uses target history only`);
    assert.equal(rule.target,20,`case ${index}: configured quota remains the target`);
    assert.equal(rule.remaining,Math.max(0,20-index),`case ${index}: remaining value stays exact`);
    assert.equal(rule.complete,index >= 20,`case ${index}: completion threshold stays exact`);
}

const itemCount = 100;
const eventsPerItem = 1000;
const items = Array.from({length:itemCount}, (_, index) => makeItem(index));
const events = items.flatMap((item) => Array.from({length:eventsPerItem}, (_, index) => makeEvent(item.id,index)));
const store = {version:2,items,events,eventTombstones:[]};
model.getStoreIndex(store);
const startedAt = performance.now();
let complete = 0;
for (let index = 0; index < 50; index += 1) if (model.evaluateItemRule(store,items[index],date).complete) complete += 1;
const elapsed = performance.now() - startedAt;
assert.equal(complete,50,"all sampled quota items are complete");
assert.ok(elapsed < 1000,`50 warmed rules over 100k mixed events must finish within 1s, received ${elapsed.toFixed(1)}ms`);

console.log(`Item rule index checks passed: 25 cases, 100 matrix assertions; 50 rules over 100k events ${elapsed.toFixed(1)}ms.`);
