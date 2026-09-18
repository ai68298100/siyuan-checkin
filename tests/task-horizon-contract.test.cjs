const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

// This is the checkin-side half of the Task Horizon P1 contract. It deliberately
// does not simulate Task Horizon's native-checkbox callback; that trigger remains
// an external-host responsibility. The fixture locks the shared identity and
// replay semantics before the two plugins are installed together.
const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-task-horizon-contract-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}

const model = require(path.join(outputRoot, "model.js"));
const item = {
    id: "task-checkin",
    name: "任务打卡",
    icon: "✅",
    kind: "count",
    target: 3,
    unit: "个",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [],
    archivePeriods: [],
    group: "生态",
    priority: "medium",
    sortOrder: 1,
    timeSlot: "any",
};
const store = (events = [], eventTombstones = []) => model.normalizeStore({version: 2, items: [item], events, eventTombstones});
const externalRef = (blockId, localDate) => `taskhorizon:${blockId}:${localDate}`;
const event = (id, blockId, localDate) => ({
    id,
    itemId: item.id,
    occurredAt: `${localDate}T09:00:00.000Z`,
    localDate,
    value: 1,
    unit: "个",
    source: "api",
    externalRef: externalRef(blockId, localDate),
});

assert.match(externalRef("p1-block", "2026-09-18"), /^taskhorizon:[^:]+:\d{4}-\d{2}-\d{2}$/);
const first = event("task-1", "p1-block", "2026-09-18");
const replay = {...first, id: "task-replay", value: 99};
const nextDay = event("task-2", "p1-block", "2026-09-19");

const appended = model.appendEvents(store(), [first, replay, nextDay]);
assert.deepEqual(appended.events.map((entry) => entry.id), ["task-1", "task-2"], "same block/date replay is accepted only once");
assert.equal(appended.events[0].value, 1, "replay cannot overwrite the original value");

const normalized = store([first, replay]);
assert.equal(normalized.events.length, 1, "persisted duplicate external identity is normalized away");
assert.equal(normalized.events[0].externalRef, externalRef("p1-block", "2026-09-18"));

const tombstone = {eventId: first.id, deletedAt: "2026-09-18T10:00:00.000Z", itemId: item.id, source: "api", externalRef: first.externalRef};
const replayAfterDelete = model.appendEvent(store([], [tombstone]), {...first, id: "task-after-delete"});
assert.equal(replayAfterDelete.events.length, 0, "a deleted task completion cannot be resurrected by replay");

const docs = fs.readFileSync(path.join(__dirname, "..", "docs", "checkin-taskhorizon-cooperation.md"), "utf8");
assert.match(docs, /taskhorizon:<blockId>:<localDate>/, "cooperation doc keeps the canonical identity format");
assert.match(docs, /仅用户真实点击/, "cooperation doc keeps the native-checkbox trigger boundary");

fs.rmSync(outputRoot, {recursive: true, force: true});
console.log("Task Horizon contract checks passed: canonical externalRef, replay, tombstone and trigger-boundary guards.");
