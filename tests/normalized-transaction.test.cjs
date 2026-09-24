const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname,"..","src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(),"siyuan-normalized-transaction-"));
for (const filename of ["types.ts","record-step.ts","quota.ts","rules.ts","date-keys.ts", "model.ts","storage-transaction.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot,filename),"utf8");
    fs.writeFileSync(path.join(outputRoot,filename.replace(/\.ts$/,".js")),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText);
}
const model = require(path.join(outputRoot,"model.js"));
const transaction = require(path.join(outputRoot,"storage-transaction.js"));
const item = {id:"item",name:"阅读",icon:"📖",kind:"count",target:10,unit:"页",schedule:{type:"daily"},createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",createdDate:"2026-09-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:1,timeSlot:"any"};
const event = (index,overrides={}) => ({id:`event-${index}`,itemId:item.id,occurredAt:new Date(Date.UTC(2026,8,17,0,0,index % 60)).toISOString(),localDate:"2026-09-17",value:1,unit:"页",source:"manual",...overrides});
const store = (events=[],eventTombstones=[]) => model.normalizeStore({version:2,items:[item],events,eventTombstones});

for (let index=1;index<=25;index+=1) {
    const baseline=store([event(index)]);
    const local=store([event(index),event(index+100)]);
    const remote=store([event(index),event(index+200)]);
    const fast=transaction.reconcileNormalizedStoreSnapshots(baseline,local,remote);
    const guarded=transaction.reconcileStoreSnapshots(baseline,local,remote);
    assert.deepEqual(fast.merged,guarded.merged,`case ${index}: normalized merge matches guarded boundary`);
    assert.deepEqual(fast.conflict,guarded.conflict,`case ${index}: conflict report remains identical`);
    assert.equal(fast.localChanged,true,`case ${index}: local absorbs remote event`);
    assert.equal(fast.remoteNeedsWrite,true,`case ${index}: remote absorbs local event`);
}

const deleted=event(500,{source:"api",externalRef:"session-500"});
const tombstone={eventId:deleted.id,deletedAt:"2026-09-17T02:00:00.000Z",itemId:item.id,source:"api",externalRef:"session-500"};
const replay={...deleted,id:"event-501"};
const protectedMerge=transaction.reconcileNormalizedStoreSnapshots(store([], [tombstone]),store([], [tombstone]),store([replay]));
assert.equal(protectedMerge.merged.events.length,0,"external identity tombstone survives normalized reconciliation");

const count=100000;
const events=Array.from({length:count},(_,index)=>event(index+1000));
const large=store(events);
const serializedLarge=JSON.stringify(large);
const equivalentRemote=model.normalizeStore(JSON.parse(serializedLarge));
const startedAt=performance.now();
const unchanged=transaction.reconcileNormalizedStoreSnapshots(large,large,equivalentRemote);
const elapsed=performance.now()-startedAt;
assert.notEqual(large,equivalentRemote,"equivalent remote snapshot must use an independent object identity");
assert.equal(unchanged.conflict.conflicted,false,"equivalent normalized snapshots have no conflict");
assert.equal(unchanged.localChanged,false,"equivalent normalized snapshots do not refresh local state");
assert.equal(unchanged.remoteNeedsWrite,false,"equivalent normalized snapshots do not rewrite remote state");
assert.ok(elapsed<3000,`100k normalized reconciliation must finish within 3s, received ${elapsed.toFixed(1)}ms`);
(async()=>{
    const writeStartedAt=performance.now();
    const verified=await transaction.persistNormalizedStoreWithVerification(large,async()=>JSON.parse(serializedLarge),async()=>undefined);
    const writeElapsed=performance.now()-writeStartedAt;
    assert.equal(verified.attempts,1,"unchanged readback is accepted after one write");
    assert.equal(verified.repaired,false,"unchanged readback needs no repair");
    assert.equal(verified.store.events.length,count,"verified write retains the complete history");
    assert.ok(writeElapsed<3000,`100k normalized verified write must finish within 3s, received ${writeElapsed.toFixed(1)}ms`);
    console.log(`Normalized transaction checks passed: 25 cases, 100 matrix assertions; 100k reconcile ${elapsed.toFixed(1)}ms, verified write ${writeElapsed.toFixed(1)}ms.`);
})().catch((error)=>{console.error(error);process.exitCode=1;});
