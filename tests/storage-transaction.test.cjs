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
const {reconcileStoreSnapshots} = require(path.join(outputRoot, "storage-transaction.js"));
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
assert.match(indexSource, /withStorageLock\(async \(\) => \{[\s\S]*?loadData\(STORAGE_NAME\)[\s\S]*?reconcileStoreSnapshots/, "remote refresh and reconciliation must run inside the exclusive lock");
assert.match(indexSource, /if \(reconciliation\.remoteNeedsWrite\) \{[\s\S]*?await this\.persist\(\)/, "a merged local projection must converge back to storage before the user mutation");
assert.match(indexSource, /this\.lastPersistedStore = this\.cloneStore\(snapshot\);[\s\S]*?if \(this\.saveState === "saving"\)/, "every successful store write must advance the conflict baseline independently of UI save state");
console.log("Storage transaction checks passed: 100 concurrent assertions plus idempotency and convergence boundaries.");
