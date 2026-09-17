const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const achievementSource = fs.readFileSync(path.join(sourceRoot, "features", "achievements.ts"), "utf8");
assert.doesNotMatch(achievementSource, /dayStatus|sortedDays/,
    "perfect-day projection must not materialize and sort an already chronological day map");
assert.match(achievementSource, /if \(scheduled === 0\) continue;/,
    "days without scheduled items must remain neutral to the perfect streak");
assert.match(achievementSource, /if \(completed >= scheduled\)/,
    "perfect-day completion must retain the all-scheduled-items threshold");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-perfect-stream-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "features/achievements.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const {buildAchievements} = require(path.join(outputRoot, "features", "achievements.js"));
const dayKey = (day) => `2026-08-${String(day).padStart(2, "0")}`;
const makeItem = (id, schedule, createdDate = dayKey(1), extras = {}) => ({
    id, name: id, icon: "✓", kind: "count", target: 1, unit: "次", schedule,
    createdAt: `${createdDate}T00:00:00.000Z`, updatedAt: `${createdDate}T00:00:00.000Z`, createdDate,
    revisions: [], archivePeriods: [], group: "测试", priority: "medium", sortOrder: 0, timeSlot: "all", ...extras,
});
const makeEvent = (id, itemId, localDate, value = 1) => ({
    id, itemId, occurredAt: `${localDate}T08:00:00.000Z`, localDate, value, unit: "次", source: "manual",
});
const progressOf = (achievements, id) => achievements.find((entry) => entry.id === id)?.progress;

for (let index = 1; index <= 25; index += 1) {
    const endDay = index + 3;
    const daily = makeItem(`daily-${index}`, {type: "daily"});
    const alternating = makeItem(`alternating-${index}`, {type: "interval", intervalDays: 2, anchorDate: dayKey(1)});
    const events = [];
    let expectedPerfect = 0;
    let expectedBest = 0;
    let current = 0;
    for (let day = 1; day <= endDay; day += 1) {
        const key = dayKey(day);
        const intentionallyMissed = day === index;
        if (!intentionallyMissed) events.push(makeEvent(`daily-${index}-${day}`, daily.id, key));
        if (day % 2 === 1) events.push(makeEvent(`alternating-${index}-${day}`, alternating.id, key));
        if (intentionallyMissed) current = 0;
        else {
            expectedPerfect += 1;
            current += 1;
            expectedBest = Math.max(expectedBest, current);
        }
    }
    const store = {version: 2, items: [daily, alternating], events, eventTombstones: []};
    const achievements = buildAchievements(store, new Date(2026, 7, endDay, 12));
    assert.equal(progressOf(achievements, "perfect-1"), expectedPerfect, `case ${index}: perfect days remain exact`);
    assert.equal(progressOf(achievements, "perfect-10"), expectedPerfect, `case ${index}: all perfect badges share progress`);
    assert.equal(progressOf(achievements, "streak-3"), expectedBest, `case ${index}: best streak remains exact`);
    assert.equal(progressOf(achievements, "streak-14"), expectedBest, `case ${index}: all streak badges share progress`);
}

const stressStart = new Date(2025, 8, 18, 12);
const stressEnd = new Date(2026, 8, 17, 12);
const stressItems = Array.from({length: 100}, (_, index) => makeItem(`stress-${index}`, {type: "daily"}, "2025-09-18", {sortOrder: index}));
const stressEvents = [];
let eventOrdinal = 0;
for (let date = new Date(stressStart); date <= stressEnd; date.setDate(date.getDate() + 1)) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    for (const item of stressItems) stressEvents.push(makeEvent(`stress-event-${eventOrdinal++}`, item.id, key));
}
const stressStore = {version: 2, items: stressItems, events: stressEvents, eventTombstones: []};
const startedAt = performance.now();
const stressAchievements = buildAchievements(stressStore, stressEnd);
const elapsed = performance.now() - startedAt;
assert.equal(progressOf(stressAchievements, "perfect-1"), 365, "one year retains every perfect day");
assert.equal(progressOf(stressAchievements, "streak-14"), 365, "one year retains the best perfect streak");
assert.equal(progressOf(stressAchievements, "events-200"), 36500, "stress history retains total events");
assert.ok(elapsed < 3000, `yearly projection must finish within 3s, received ${elapsed.toFixed(1)}ms`);
console.log(`Achievement perfect-day stream checks passed: 25 cases, 100 matrix assertions; yearly projection ${elapsed.toFixed(1)}ms.`);
