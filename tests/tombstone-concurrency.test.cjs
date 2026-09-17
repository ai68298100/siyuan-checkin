const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-tombstone-concurrency-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const item = {id:"item",name:"阅读",icon:"📖",kind:"count",target:10,unit:"页",schedule:{type:"daily"},createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",createdDate:"2026-09-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:1,timeSlot:"any"};
const makeStore = (events = [], eventTombstones = []) => ({version:2,items:[item],events,eventTombstones});
const makeEvent = (index, overrides = {}) => ({id:`event-${index}`,itemId:item.id,occurredAt:new Date(Date.UTC(2026,8,17,0,0,index)).toISOString(),localDate:"2026-09-17",value:1,unit:"页",source:"manual",...overrides});

for (let index = 1; index <= 25; index += 1) {
    const deletedAt = new Date(Date.UTC(2026, 8, 17, 1, 0, index)).toISOString();
    const event = makeEvent(index);
    const unrelated = makeEvent(index + 100);
    const queuedUndo = model.removeEvents(makeStore([unrelated]), [event.id], deletedAt);
    assert.deepEqual(queuedUndo.events.map((candidate) => candidate.id), [unrelated.id], `case ${index}: unrelated event survives`);
    assert.deepEqual(queuedUndo.eventTombstones, [{eventId:event.id,deletedAt}], `case ${index}: absent ID still creates tombstone`);
    assert.equal(model.appendEvent(queuedUndo, event), queuedUndo, `case ${index}: local stale replay is rejected`);
    const merged = model.mergeStores(queuedUndo, makeStore([event, unrelated]));
    assert.deepEqual(merged.events.map((candidate) => candidate.id), [unrelated.id], `case ${index}: remote stale replay is rejected`);
    assert.deepEqual(model.mergeStores(makeStore([event, unrelated]), queuedUndo), merged, `case ${index}: merge remains commutative`);
}

const externalA = makeEvent(300, {id:"external-a",source:"api",externalRef:"session-300"});
const externalB = {...externalA,id:"external-b",value:2};
const externalDeleted = model.removeEvents(makeStore([externalA]), [externalA], "2026-09-17T02:00:00.000Z");
assert.equal(model.mergeStores(externalDeleted, makeStore([externalB])).events.length, 0, "external identity tombstone rejects a changed event ID");
const normalizedExternalDeleted = model.mergeStores(externalDeleted, externalDeleted);
assert.deepEqual(model.mergeStores(normalizedExternalDeleted, normalizedExternalDeleted), normalizedExternalDeleted, "tombstone merge remains idempotent");
const emptyStore = makeStore();
assert.equal(model.removeEvents(emptyStore, ["   "]), emptyStore, "blank event IDs are ignored");

console.log("Tombstone concurrency checks passed: 25 cases, 125 matrix assertions plus external and input boundaries.");
