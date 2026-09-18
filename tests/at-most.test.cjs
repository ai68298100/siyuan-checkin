const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

/* 结构守门：模型反转、编辑器开关、模板方向、卡片按钮与切换分支。 */
const catalogSource = read("catalog.ts");
assert.match(read("types.ts"), /direction\?: "atMost"/, "CheckinItem carries the at-most direction");
assert.match(read("model.ts"), /item\.direction === "atMost"/, "model branches on at-most direction");
assert.match(read("render", "bind-today.ts"), /item\.direction === "atMost"/, "record toggle inverts for at-most");
assert.match(read("render", "fragments.ts"), /item\.recordLapse/, "card button uses lapse labels");
assert.match(read("render", "save-form.ts"), /scheduleType === "daily"/, "save form restricts at-most to daily schedules");
assert.match(read("render", "editor.ts"), /name="directionAtMost"/, "editor exposes the at-most switch");
assert.match(catalogSource, /direction: "atMost"/, "catalog ships avoidance templates");
assert.ok((catalogSource.match(/direction: "atMost"/g) || []).length >= 5, "at least five avoidance templates");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-at-most-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));

const asOf = new Date(2026, 8, 19, 12);
const key = (day) => `2026-09-${String(day).padStart(2, "0")}`;
const item = (overrides = {}) => ({
    id: "quit", name: "戒烟", icon: "🚭", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-10",
    revisions: [], archivePeriods: [], direction: "atMost", ...overrides,
});
const event = (id, day, kind) => ({
    id, itemId: "quit", occurredAt: `${key(day)}T01:00:00.000Z`, localDate: key(day), value: 1, unit: "次",
    source: "manual", ...(kind ? {kind} : {}),
});
const storeWith = (events, overrides = {}) => {
    const store = model.createDefaultStore();
    store.items = [item(overrides)];
    store.events = events;
    return store;
};

/* 判定反转：无事件=完成；破戒=未完成；跳过日两者皆非。 */
const clean = storeWith([]);
assert.equal(model.isComplete(clean, clean.items[0], asOf), true, "an untouched at-most day is a success");
const lapse = storeWith([event("l", 19)]);
assert.equal(model.isComplete(lapse, lapse.items[0], asOf), false, "a recorded lapse breaks the day");
const skipped = storeWith([event("s", 19, "skip")]);
assert.equal(model.isComplete(skipped, skipped.items[0], asOf), false, "a skipped day is neither success nor lapse");

/* normalize：daily 保留 atMost；weekly 丢弃（回落 at-least）。 */
const kept = model.normalizeItem(item({direction: "atMost"}));
assert.equal(kept.direction, "atMost");
const dropped = model.normalizeItem(item({direction: "atMost", schedule: {type: "weekly", weekdays: [1]}}));
assert.equal(dropped.direction, undefined, "non-daily schedules drop the direction");

/* 连击：连续无破戒日；破戒断链；跳过桥接；回溯止于创建日。 */
const cleanStreak = model.computeEventStreaks(clean, asOf).get("quit");
assert.equal(cleanStreak, 10, `created 09-10 with no lapses = 10 clean days (got ${cleanStreak})`);
const lapseStreak = model.computeEventStreaks(storeWith([event("l", 15)]), asOf).get("quit");
assert.equal(lapseStreak, 4, "streak counts 16-19 after the 09-15 lapse");
const bridged = storeWith([event("l", 15), event("s", 17, "skip")]);
const bridgedStreak = model.computeEventStreaks(bridged, asOf).get("quit");
assert.equal(bridgedStreak, 3, "16/18/19 count, 17 bridges, the 09-15 lapse breaks");
const lapsedToday = model.computeEventStreaks(storeWith([event("t", 19)]), asOf).get("quit");
assert.equal(lapsedToday, 0, "lapsing today resets the streak");

/* 强度：完成日 1 分、破戒日 0 分。 */
const scoreStore = storeWith([event("l", 19)]);
assert.equal(model.getProgress(scoreStore, scoreStore.items[0], asOf), 1);
assert.equal(model.isComplete(scoreStore, scoreStore.items[0], asOf), false);

console.log("At-most checks passed: inverted completion, skip neutrality, direction normalization, lapse streaks with createdDate bound and score neutrality.");
