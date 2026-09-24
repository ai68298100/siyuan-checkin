const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const achievementSource = fs.readFileSync(path.join(sourceRoot, "features", "achievements.ts"), "utf8");
assert.doesNotMatch(achievementSource, /store\.items\.find/,
    "event classification must not linearly scan items for every record");
assert.doesNotMatch(achievementSource, /store\.events\.filter|store\.events\.map/,
    "event-derived achievement metrics must share one pass");
assert.match(achievementSource, /const itemsById = new Map\(store\.items\.map/,
    "event classification must use one item lookup map");
assert.match(achievementSource, /for \(const event of store\.events\)/,
    "event-derived metrics must use one explicit traversal");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-achievement-pass-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "features/achievements.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const {buildAchievements} = require(path.join(outputRoot, "features", "achievements.js"));
const asOf = new Date(2026, 8, 17, 12);
const day = "2026-09-17";
const makeItem = (id, timeSlot, sortOrder = 0) => ({
    id,
    name: id,
    icon: "✓",
    kind: "count",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: `${day}T00:00:00.000Z`,
    updatedAt: `${day}T00:00:00.000Z`,
    createdDate: day,
    revisions: [],
    archivePeriods: [],
    group: "测试",
    priority: "medium",
    sortOrder,
    timeSlot,
});
const makeEvent = (id, itemId, source, extras = {}) => ({
    id,
    itemId,
    occurredAt: `${day}T08:00:00.000Z`,
    localDate: day,
    value: 1,
    unit: "次",
    source,
    ...extras,
});
const progressOf = (achievements, id) => achievements.find((entry) => entry.id === id)?.progress;

for (let index = 1; index <= 25; index += 1) {
    const morning = makeItem(`morning-${index}`, "morning");
    const evening = makeItem(`evening-${index}`, "evening", 1);
    const events = [
        ...Array.from({length: index}, (_, eventIndex) => makeEvent(`morning-event-${index}-${eventIndex}`, morning.id, "manual", {note: "记录"})),
        ...Array.from({length: index}, (_, eventIndex) => makeEvent(`evening-event-${index}-${eventIndex}`, evening.id, "tomato")),
    ];
    const achievements = buildAchievements({version: 2, items: [morning, evening], events, eventTombstones: []}, asOf);
    assert.equal(progressOf(achievements, "events-200"), index * 2, `case ${index}: total event progress remains exact`);
    assert.equal(progressOf(achievements, "early-bird"), index, `case ${index}: morning classification remains exact`);
    assert.equal(progressOf(achievements, "night-owl"), index, `case ${index}: evening classification remains exact`);
    assert.equal(progressOf(achievements, "tomato-10"), index, `case ${index}: tomato classification remains exact`);
}

const largeItems = Array.from({length: 100}, (_, index) => makeItem(`large-item-${index}`, index % 2 ? "evening" : "morning", index));
const largeEvents = largeItems.flatMap((item, itemIndex) => Array.from({length: 1000}, (_, eventIndex) =>
    makeEvent(`large-event-${itemIndex}-${eventIndex}`, item.id, eventIndex % 5 === 0 ? "tomato" : "manual", eventIndex % 7 === 0 ? {note: "记录"} : {})));
const largeStore = {version: 2, items: largeItems, events: largeEvents, eventTombstones: []};
const startedAt = performance.now();
const largeAchievements = buildAchievements(largeStore, asOf);
const elapsed = performance.now() - startedAt;
assert.equal(progressOf(largeAchievements, "events-200"), 100000, "100k history retains total event progress");
assert.equal(progressOf(largeAchievements, "early-bird"), 50000, "100k history retains morning classification");
assert.equal(progressOf(largeAchievements, "night-owl"), 50000, "100k history retains evening classification");
assert.equal(progressOf(largeAchievements, "tomato-10"), 20000, "100k history retains source classification");
assert.ok(elapsed < 2000, `100k achievement projection must finish within 2s, received ${elapsed.toFixed(1)}ms`);
console.log(`Achievement event pass checks passed: 25 cases, 100 matrix assertions; 100k projection ${elapsed.toFixed(1)}ms.`);
