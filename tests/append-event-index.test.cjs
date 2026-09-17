const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-append-event-index-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const item = {id:"item",name:"阅读",icon:"📖",kind:"count",target:10,unit:"页",schedule:{type:"daily"},createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",createdDate:"2026-09-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:1,timeSlot:"any"};
const makeEvent = (index, externalRef) => ({id:`event-${index}`,itemId:item.id,occurredAt:"2026-09-17T00:00:00.000Z",localDate:"2026-09-17",value:1,unit:"页",source:externalRef?"api":"manual",...(externalRef?{externalRef}:{})});

for (let index = 1; index <= 25; index += 1) {
    const existing = makeEvent(index, `session-${index}`);
    const store = {version:2,items:[item],events:[existing],eventTombstones:[
        {eventId:`deleted-${index}`,deletedAt:"2026-09-17T01:00:00.000Z"},
        {eventId:`external-deleted-${index}`,deletedAt:"2026-09-17T01:00:00.000Z",itemId:item.id,source:"api",externalRef:`deleted-session-${index}`},
    ]};
    model.getStoreIndex(store);
    assert.equal(model.appendEvent(store, {...makeEvent(index + 100),id:existing.id}), store, `case ${index}: duplicate ID is rejected`);
    assert.equal(model.appendEvent(store, {...makeEvent(index + 200, existing.externalRef)}), store, `case ${index}: duplicate external identity is rejected`);
    assert.equal(model.appendEvent(store, {...makeEvent(index + 300),id:`deleted-${index}`}), store, `case ${index}: ID tombstone is rejected`);
    assert.equal(model.appendEvent(store, makeEvent(index + 400, `deleted-session-${index}`)), store, `case ${index}: external tombstone is rejected`);
}

const eventCount = 100000;
const events = Array.from({length:eventCount}, (_, index) => makeEvent(index + 1000, `large-session-${index}`));
const largeStore = {version:2,items:[item],events,eventTombstones:[]};
model.getStoreIndex(largeStore);
const candidate = makeEvent(eventCount + 2000, "new-session");
const startedAt = performance.now();
const appended = model.appendEvent(largeStore, candidate);
const elapsed = performance.now() - startedAt;
assert.equal(appended.events.length, eventCount + 1, "new event is appended to a long history");
assert.equal(appended.events[eventCount], candidate, "append preserves the candidate object");
assert.ok(elapsed < 250, `warmed 100k append must finish within 250ms, received ${elapsed.toFixed(1)}ms`);

console.log(`Append event index checks passed: 25 cases, 100 matrix assertions; warmed 100k append ${elapsed.toFixed(1)}ms.`);
