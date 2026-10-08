/* T-1766 守门：戒除方向纳入逐日规则修订（revision.direction 全物化）。
   风险路径（2026-09-30 审计）：修订只含 kind/target/unit/schedule，direction 只写项目
   顶层；历史日取当日修订却按当前顶层方向判完成——普通↔戒除切换追溯改写旧日完成、
   连击与投影。修复后契约：
   - 完成判定/连击/洞察日格/日历投影按"当日修订的方向"取值；
   - 方向纪元切换重置连击（不用另一纪元的规则解读对方历史）；
   - 旧数据缺 direction 由 normalize 按顶层方向回填（语义零迁移）；
   - 同质项目（全 atLeast / 全 atMost）行为与 T-1766 之前逐字节一致。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-direction-revision-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
for (const filename of ["habit-score.ts", "insights.ts", "calendar-projection.ts"]) {
    fs.writeFileSync(path.join(dir, "features", filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "features", filename), "utf8"), {compilerOptions}).outputText);
}
const model = require(path.join(dir, "model.js"));
const insights = require(path.join(dir, "features", "insights.js"));
const calendarProjection = require(path.join(dir, "features", "calendar-projection.js"));

const date = (key) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)), 12);
const revision = (effectiveDate, direction, extra = {}) => ({
    effectiveDate,
    kind: "binary",
    target: 1,
    unit: "次",
    direction,
    schedule: {type: "daily"},
    ...extra,
});
const item = (overrides = {}) => ({
    id: "p1",
    name: "糖",
    icon: "✓",
    kind: "binary",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [],
    archivePeriods: [],
    archived: false,
    ...overrides,
});
const event = (itemId, localDate, kind) => ({
    id: `e-${itemId}-${localDate}${kind || ""}`,
    itemId,
    occurredAt: `${localDate}T08:00:00.000Z`,
    localDate,
    value: kind === "skip" ? 0 : 1,
    unit: "次",
    source: "manual",
    ...(kind === "skip" ? {kind: "skip"} : {}),
});

/* —— 夹具 1：普通→戒除切换（09-06 起 atMost）。旧日 09-02 零事件在 atLeast 纪元
   不是完成；修复前按当前顶层 atMost 判定会追溯变成"守住"。 —— */
const normalToAtMost = model.normalizeStore({
    version: 3,
    items: [item({
        direction: "atMost",
        revisions: [revision("2026-09-01", "atLeast"), revision("2026-09-06", "atMost")],
    })],
    events: [event("p1", "2026-09-03"), event("p1", "2026-09-08")],
    eventTombstones: [],
});
assert.equal(model.isComplete(normalToAtMost, normalToAtMost.items[0], date("2026-09-02")), false,
    "atLeast-era empty day stays incomplete after a later switch to abstinence");
assert.equal(model.isComplete(normalToAtMost, normalToAtMost.items[0], date("2026-09-03")), true,
    "atLeast-era completed day stays complete");
assert.equal(model.isComplete(normalToAtMost, normalToAtMost.items[0], date("2026-09-07")), true,
    "atMost-era empty day is a kept day");
assert.equal(model.isComplete(normalToAtMost, normalToAtMost.items[0], date("2026-09-08")), false,
    "atMost-era lapse day is not complete");

/* —— 夹具 2：戒除→普通切换（09-06 起 atLeast）。旧纪元零事件日与跳过日的戒除语义保留。 —— */
const atMostToNormal = model.normalizeStore({
    version: 3,
    items: [item({
        revisions: [revision("2026-09-01", "atMost"), revision("2026-09-06", "atLeast")],
    })],
    events: [event("p1", "2026-09-02", "skip")],
    eventTombstones: [],
});
assert.equal(model.isComplete(atMostToNormal, atMostToNormal.items[0], date("2026-09-03")), true,
    "atMost-era empty day keeps abstinence completion after switch to normal");
assert.equal(model.isComplete(atMostToNormal, atMostToNormal.items[0], date("2026-09-02")), false,
    "atMost-era skip day keeps not-success semantics");

/* —— 夹具 3：方向纪元重置连击。普通（09-01~09-04 有完成，09-05 漏）→戒除（09-06 起），
   截至 09-10 无破戒：戒除纪元连击 = 5（09-06~09-10），不把普通纪元的 09-05 空日
   当作"守住"并入（修复前按顶层 atMost 回溯会计成 6）。 —— */
const eraResetStore = model.normalizeStore({
    version: 3,
    items: [item({
        direction: "atMost",
        revisions: [revision("2026-09-01", "atLeast"), revision("2026-09-06", "atMost")],
    })],
    events: ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"].map((key) => event("p1", key)),
    eventTombstones: [],
});
const asOf = date("2026-09-10");
assert.equal(model.computeEventStreaks(eraResetStore, asOf).get("p1"), 5,
    "abstinence streak counts only the abstinence era (empty at-least era day is not absorbed)");

/* —— 夹具 4：旧数据零迁移——修订缺 direction 按顶层方向回填，语义与迁移前一致。 —— */
const legacyAtMost = model.normalizeStore({
    version: 3,
    items: [item({direction: "atMost", revisions: [revision("2026-09-01", undefined)]})],
    events: [],
    eventTombstones: [],
});
assert.equal(legacyAtMost.items[0].revisions[0].direction, "atMost", "legacy revision is backfilled from the item direction");
assert.equal(model.isComplete(legacyAtMost, legacyAtMost.items[0], date("2026-09-05")), true,
    "legacy abstinence history keeps zero-event-is-success semantics");
const legacyNormal = model.normalizeStore({
    version: 3,
    items: [item({revisions: [revision("2026-09-01", undefined)]})],
    events: [event("p1", "2026-09-02")],
    eventTombstones: [],
});
assert.equal(legacyNormal.items[0].revisions[0].direction, "atLeast", "legacy normal revisions materialize atLeast");
assert.equal(model.isComplete(legacyNormal, legacyNormal.items[0], date("2026-09-02")), true);
assert.equal(model.isComplete(legacyNormal, legacyNormal.items[0], date("2026-09-04")), false,
    "legacy normal empty day stays incomplete");

/* —— 夹具 5：洞察日格按当日方向投影。 —— */
const insightReport = insights.buildHabitInsights(normalToAtMost, "p1", {asOf: date("2026-09-08"), days: 7});
const dayByKey = new Map(insightReport.days.map((day) => [day.date, day]));
assert.equal(dayByKey.get("2026-09-02").status, "missed", "atLeast-era empty day is missed, not retroactively kept");
assert.equal(dayByKey.get("2026-09-03").status, "complete", "atLeast-era completed day stays complete");
assert.equal(dayByKey.get("2026-09-07").status, "complete", "atMost-era kept day is complete");
assert.equal(dayByKey.get("2026-09-07").direction, "atMost", "atMost era days expose direction");
assert.equal(dayByKey.get("2026-09-03").direction, undefined, "atLeast era days do not expose direction");

/* —— 夹具 6：日历投影按当日方向取点。 —— */
const projection = calendarProjection.buildCalendarProjection(normalToAtMost, {
    startDate: "2026-09-02",
    endDateExclusive: "2026-09-09",
});
const pointsByDate = new Map(projection.items[0].points.map((point) => [point.date, point]));
assert.equal(pointsByDate.get("2026-09-03").status, "complete", "atLeast-era event projects as a completion");
assert.equal(pointsByDate.get("2026-09-08").status, "at-most-breach", "atMost-era lapse projects as breach");
assert.equal(pointsByDate.get("2026-09-07").status, "at-most-safe", "atMost-era kept day projects as safe");
assert.equal(pointsByDate.get("2026-09-02").status, "pending", "atLeast-era empty scheduled day projects as pending");

/* —— 夹具 7：同质 atMost 项目与旧行为一致（零事件连击含跳过桥接）。 —— */
const pureAtMost = model.normalizeStore({
    version: 3,
    items: [item({direction: "atMost", revisions: [revision("2026-09-01", "atMost")]})],
    events: [event("p1", "2026-09-04", "skip")],
    eventTombstones: [],
});
assert.equal(model.computeEventStreaks(pureAtMost, date("2026-09-06")).get("p1"), 5,
    "pure abstinence streak: 09-02,03,05,06 kept + 09-04 skip bridged");
assert.equal(model.computeLongestStreaks(pureAtMost, date("2026-09-06")).get("p1"), 5,
    "longest streak uses the same per-day direction semantics");

console.log("direction-revision: all assertions passed");
