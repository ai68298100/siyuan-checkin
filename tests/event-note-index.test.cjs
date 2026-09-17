const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-event-note-index-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const item = {id:"item",name:"阅读",icon:"📖",kind:"count",target:10,unit:"页",schedule:{type:"daily"},createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",createdDate:"2026-09-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:1,timeSlot:"any"};
const makeEvent = (index, note) => ({id:`event-${index}`,itemId:item.id,occurredAt:"2026-09-17T00:00:00.000Z",localDate:"2026-09-17",value:1,unit:"页",source:"manual",...(note?{note}:{})});

for (let index = 1; index <= 25; index += 1) {
    const before = makeEvent(index, "旧备注");
    const after = makeEvent(index + 100);
    const store = {version:2,items:[item],events:[before,after],eventTombstones:[]};
    model.getStoreIndex(store);
    const updated = model.updateEventNote(store, before.id, `  新备注 ${index}  `);
    assert.equal(updated.events[0].note, `新备注 ${index}`, `case ${index}: target note is normalized`);
    assert.equal(updated.events[1], after, `case ${index}: unrelated event object is preserved`);
    assert.equal(store.events[0], before, `case ${index}: source store remains immutable`);
    assert.equal(model.updateEventNote(updated, before.id, `新备注 ${index}`), updated, `case ${index}: unchanged note is a no-op`);
}

const duplicateFirst = makeEvent(900, "first");
const duplicateSecond = {...makeEvent(901, "second"),id:duplicateFirst.id};
const duplicateStore = {version:2,items:[item],events:[duplicateFirst,duplicateSecond],eventTombstones:[]};
const duplicateUpdated = model.updateEventNote(duplicateStore, duplicateFirst.id, "updated");
assert.equal(duplicateUpdated.events[0].note, "updated", "duplicate IDs update the same first event exposed by getEventById");
assert.equal(duplicateUpdated.events[1], duplicateSecond, "later duplicate remains untouched");
assert.equal(model.updateEventNote(duplicateStore, "missing", "x"), duplicateStore, "missing ID is a no-op");

const eventCount = 100000;
const events = Array.from({length:eventCount}, (_, index) => makeEvent(index + 1000));
const largeStore = {version:2,items:[item],events,eventTombstones:[]};
model.getStoreIndex(largeStore);
const target = events[eventCount - 1];
const startedAt = performance.now();
const largeUpdated = model.updateEventNote(largeStore, target.id, "尾部备注");
const elapsed = performance.now() - startedAt;
assert.equal(largeUpdated.events[eventCount - 1].note, "尾部备注", "last event in a long history is updated");
assert.equal(largeUpdated.events.length, eventCount, "note editing never changes history length");
assert.ok(elapsed < 250, `warmed 100k note update must finish within 250ms, received ${elapsed.toFixed(1)}ms`);

console.log(`Event note index checks passed: 25 cases, 100 matrix assertions; warmed 100k tail update ${elapsed.toFixed(1)}ms.`);
