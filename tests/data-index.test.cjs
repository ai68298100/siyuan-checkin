const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-index-"));
for (const filename of ["model.ts", "record-step.ts", "quota.ts", "rules.ts", "types.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), output, "utf8");
}

const {getEventById, getEventsForDate, getEventsForDay, getStoreIndex} = require(path.join(outputRoot, "model.js"));
const events = Array.from({length: 25}, (_, index) => ({
    id: `event-${index}`,
    itemId: `item-${index % 5}`,
    occurredAt: `2026-09-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
    localDate: `2026-09-${String(index + 1).padStart(2, "0")}`,
    value: index + 1,
    unit: "次",
    source: "manual",
}));
const store = {version: 2, items: [], events, eventTombstones: []};

for (let index = 0; index < 25; index += 1) {
    const event = events[index];
    assert.equal(getEventById(store, event.id), event, `id index case ${index + 1}`);
    assert.deepEqual(getEventsForDate(store, event.localDate), [event], `date index case ${index + 1}`);
}

assert.equal(getStoreIndex(store), getStoreIndex(store), "one immutable store reuses one index");
assert.equal(getEventById(store, "missing"), undefined);
assert.equal(getEventById(store, undefined), undefined);
assert.deepEqual(getEventsForDate(store, "2099-01-01"), []);
assert.deepEqual(getEventsForDay(store, "item-0", new Date("2026-09-01T12:00:00+08:00")), [events[0]]);

const replacement = {...store, events: [...events, {...events[0], id: "event-new", localDate: "2026-10-01"}]};
assert.notEqual(getStoreIndex(replacement), getStoreIndex(store), "a replacement store receives a fresh index");
assert.equal(getEventById(replacement, "event-new")?.localDate, "2026-10-01");
assert.deepEqual(getEventsForDate(replacement, "2026-10-01").map((event) => event.id), ["event-new"]);

const duplicateIdStore = {...store, events: [events[0], {...events[1], id: events[0].id}]};
assert.equal(getEventById(duplicateIdStore, events[0].id), events[0], "duplicate IDs resolve deterministically to the first event");

console.log("Data index checks passed: 25 ID lookups + 25 date lookups and cache boundaries.");
