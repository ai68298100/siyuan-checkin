const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-tombstone-index-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const item = {id:"item",name:"阅读",icon:"📖",kind:"count",target:10,unit:"页",schedule:{type:"daily"},createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",createdDate:"2026-09-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:1,timeSlot:"any"};
const makeEvent = (index, external = false) => ({id:`event-${index}`,itemId:item.id,occurredAt:new Date(Date.UTC(2026,8,17,0,0,index % 60)).toISOString(),localDate:"2026-09-17",value:1,unit:"页",source:external?"api":"manual",...(external?{externalRef:`session-${index}`}:{})});
const deletedAt = "2026-09-17T03:00:00.000Z";

for (let index = 1; index <= 25; index += 1) {
    const removedById = makeEvent(index);
    const removedByIdentity = makeEvent(index + 100, true);
    const replayWithNewId = {...removedByIdentity,id:`replacement-${index}`};
    const survivor = makeEvent(index + 200);
    const source = {version:2,items:[item],events:[removedById,replayWithNewId,survivor],eventTombstones:[
        {eventId:removedById.id,deletedAt},
        {eventId:removedByIdentity.id,deletedAt,itemId:item.id,source:"api",externalRef:removedByIdentity.externalRef},
    ]};
    const normalized = model.normalizeStore(source);
    assert.deepEqual(normalized.events.map((event) => event.id), [survivor.id], `case ${index}: both tombstone keys filter correctly`);
    assert.equal(normalized.eventTombstones.length, 2, `case ${index}: tombstones remain persisted`);
    assert.equal(normalized.events.some((event) => event.id === removedById.id), false, `case ${index}: ID replay is absent`);
    assert.equal(normalized.events.some((event) => event.externalRef === removedByIdentity.externalRef), false, `case ${index}: identity replay is absent`);
}

const eventCount = 50000;
const events = Array.from({length:eventCount}, (_, index) => makeEvent(index + 1000));
const eventTombstones = events.filter((_, index) => index % 2 === 0).map((event) => ({eventId:event.id,deletedAt}));
const startedAt = performance.now();
const normalizedLarge = model.normalizeStore({version:2,items:[item],events,eventTombstones});
const elapsed = performance.now() - startedAt;
assert.equal(normalizedLarge.events.length, eventCount / 2, "large normalization must retain exactly the non-deleted half");
assert.equal(normalizedLarge.eventTombstones.length, eventCount / 2, "large normalization must preserve every tombstone");
assert.ok(elapsed < 5000, `50k events and 25k tombstones must normalize within 5s, received ${elapsed.toFixed(1)}ms`);

console.log(`Tombstone index checks passed: 25 cases, 100 matrix assertions; 50k/25k normalization ${elapsed.toFixed(1)}ms.`);
