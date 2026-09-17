const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const sourceRoot = path.join(__dirname, "..", "src");
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-storage-transaction-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "storage-transaction.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
}
const {persistStoreWithVerification,reconcileStoreSnapshots} = require(path.join(outputRoot, "storage-transaction.js"));
const baseItem = {id:"item",name:"阅读",icon:"📖",kind:"count",target:10,unit:"页",schedule:{type:"daily"},createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",createdDate:"2026-09-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:1,timeSlot:"any"};
const makeStore = (events = [], item = baseItem) => ({version:2,items:[item],events,eventTombstones:[]});
const makeEvent = (index, source = "manual", externalRef) => ({id:`event-${index}`,itemId:"item",occurredAt:new Date(Date.UTC(2026,8,17,0,0,index)).toISOString(),localDate:"2026-09-17",value:1,unit:"页",source,...(externalRef?{externalRef}:{})});
for (let index = 1; index <= 25; index += 1) {
    const result = reconcileStoreSnapshots(makeStore(), makeStore([makeEvent(index)]), makeStore([makeEvent(index + 25)]));
    assert.equal(result.merged.events.length, 2, `case ${index}: concurrent events must both survive`);
    assert.equal(result.localChanged, true, `case ${index}: local projection must absorb the remote event`);
    assert.equal(result.remoteNeedsWrite, true, `case ${index}: remote store must receive the local event`);
    assert.equal(result.conflict.conflicted, true, `case ${index}: changed remote baseline must be reported`);
}
const externalLocal = makeEvent(80,"api","shared-session");
const externalRemote = {...makeEvent(81,"api","shared-session"),value:2};
const deduped = reconcileStoreSnapshots(makeStore(),makeStore([externalLocal]),makeStore([externalRemote]));
assert.equal(deduped.merged.events.length,1,"same external identity must remain idempotent across windows");
assert.equal(deduped.localChanged,true,"local projection must converge to the canonical external event");
assert.equal(deduped.remoteNeedsWrite,false,"already-canonical remote identity needs no redundant rewrite");
const unchanged = reconcileStoreSnapshots(makeStore(),makeStore(),makeStore());
assert.equal(unchanged.conflict.conflicted,false); assert.equal(unchanged.localChanged,false); assert.equal(unchanged.remoteNeedsWrite,false);
const newerItem = {...baseItem,name:"阅读新名称",updatedAt:"2026-09-18T00:00:00.000Z"};
const itemMerge = reconcileStoreSnapshots(makeStore(),makeStore([],baseItem),makeStore([],newerItem));
assert.equal(itemMerge.merged.items[0].name,"阅读新名称"); assert.equal(itemMerge.localChanged,true); assert.equal(itemMerge.remoteNeedsWrite,false);
assert.match(indexSource, /withStorageLock\(async \(\) => \{[\s\S]*?loadData\(STORAGE_NAME\)[\s\S]*?reconcileNormalizedStoreSnapshots\(this\.lastPersistedStore, this\.store, normalizeStore\(stored\)\)/, "remote input must be normalized once and trusted snapshots reconciled inside the exclusive lock");
assert.match(indexSource, /if \(reconciliation\.remoteNeedsWrite\) \{[\s\S]*?await this\.persist\(\)/, "a merged local projection must converge back to storage before the user mutation");
assert.match(indexSource, /this\.lastPersistedStore = this\.cloneStore\(persistedSnapshot\);[\s\S]*?if \(this\.saveState === "saving"\)/, "every successful verified store write must advance the conflict baseline independently of UI save state");
assert.match(indexSource, /persistNormalizedStoreWithVerification\([\s\S]*?snapshot,[\s\S]*?loadData\(STORAGE_NAME\)/, "trusted mutation snapshots must use the normalized verification fast path");
(async () => {
    for (let index = 1; index <= 25; index += 1) {
        const expected = makeStore([makeEvent(index)]);
        const concurrent = makeStore([makeEvent(index + 25)]);
        let stored = makeStore();
        let saves = 0;
        const result = await persistStoreWithVerification(expected, async () => stored, async (candidate) => {
            saves += 1;
            stored = saves === 1 ? concurrent : candidate;
        });
        assert.equal(result.attempts,2,`repair ${index}: a lost first write needs exactly one retry`);
        assert.equal(result.repaired,true,`repair ${index}: repaired flag must be observable`);
        assert.equal(result.store.events.length,2,`repair ${index}: both concurrent events must survive`);
        assert.equal(saves,2,`repair ${index}: retries must stay bounded`);
    }
    let superset = makeStore();
    const expected = makeStore([makeEvent(90)]);
    const concurrent = makeStore([makeEvent(91)]);
    const accepted = await persistStoreWithVerification(expected,async()=>superset,async(candidate)=>{superset=reconcileStoreSnapshots(makeStore(),candidate,concurrent).merged;});
    assert.equal(accepted.attempts,1,"a stored superset must be accepted without redundant rewriting");
    assert.equal(accepted.repaired,false);
    assert.equal(accepted.store.events.length,2);
    await assert.rejects(() => persistStoreWithVerification(expected,async()=>makeStore(),async()=>undefined,2),/store-write-verification-failed/);
    console.log("Storage transaction checks passed: 200 concurrent assertions plus idempotency, verification and convergence boundaries.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
