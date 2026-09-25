const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");
const opsSource = read("plugin-ops.ts");
const settingsSource = read("render", "settings.ts");
const indexSource = read("index.ts");

/* 结构守门：导入/导出入口与执行边界齐全。 */
assert.match(settingsSource, /data-import-loop[^>]*multiple/, "settings exposes multi-select Loop import");
assert.match(settingsSource, /data-action="export-loop"/, "settings exposes the Loop export action");
assert.match(opsSource, /export function importLoopPlanInto/, "plugin-ops owns the Loop import executor");
assert.match(opsSource, /source: "import"/, "Loop events are recorded with import source");
assert.match(opsSource, /export function downloadLoopExportFor/, "plugin-ops owns the two-file Loop export");
assert.match(indexSource, /buildLoopImportPlan\(habitsCsv, checkmarksCsv/, "index builds the plan from selected files");
assert.match(indexSource, /importLoopPlanInto\(this\.store, plan\)/, "index delegates persistence through the shared executor");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-loop-csv-"));
for (const filename of ["features/loop-csv.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(...filename.split("/")), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const loop = require(path.join(outputRoot, "features", "loop-csv.js"));

const cell = (value) => /[",\n]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
const habitsCsv = [
    "Position,Name,Type,Question,Description,FrequencyNumerator,FrequencyDenominator,Color,Unit,Target Type,Target Value,Archived?",
    ["001", "晨读", "YES_NO_HABIT", "", "", "1", "1", "", "", "", "", "false"].map(cell).join(","),
    ["002", "健身", "YES_NO_HABIT", "", "", "3", "7", "", "", "", "", "false"].map(cell).join(","),
    ["003", "喝水", "MEASURABLE", "", "", "8", "1", "", "杯", "AT_LEAST", "8", "false"].map(cell).join(","),
    ["004", "换床单", "YES_NO_HABIT", "", "", "1", "14", "", "", "", "", "false"].map(cell).join(","),
    ["005", "拉伸", "YES_NO_HABIT", "", "", "2", "14", "", "", "", "", "true"].map(cell).join(","),
    ["006", "带,逗号\"引号\"的名字", "YES_NO_HABIT", "", "", "1", "1", "", "", "", "", "false"].map(cell).join(","),
].join("\n");
const quotedName = "带,逗号\"引号\"的名字";
const checkmarksCsv = [
    `Date,晨读,健身,喝水,换床单,拉伸,${cell(quotedName)},`,
    "2026-09-18,YES_MANUAL,YES_AUTO,YES_MANUAL,SKIP,NO,UNKNOWN,",
    "2026-09-17,NO,NO,YES_MANUAL,NO,SKIP,NO,",
    "2026-09-16,SKIP,YES_MANUAL,YES_MANUAL,YES_MANUAL,YES_MANUAL,NO,",
].join("\n");

const parsedHabits = loop.parseLoopHabitsCsv(habitsCsv);
assert.equal(parsedHabits.invalidRows, 0);
assert.equal(parsedHabits.habits.length, 6);
assert.equal(parsedHabits.habits[5].name, quotedName, "quoted names round-trip");
assert.equal(parsedHabits.habits[2].targetValue, 8);
/* T-1463 · R-A15：清单外的列名如实上报（不静默忽略）。 */
assert.deepEqual(parsedHabits.unknownHeaders, ["Color"], "unknown headers are surfaced verbatim");

const parsedMarks = loop.parseLoopCheckmarksCsv(checkmarksCsv);
assert.deepEqual(parsedMarks.marks.names, ["晨读", "健身", "喝水", "换床单", "拉伸", quotedName]);
assert.equal(parsedMarks.marks.points[0].date, "2026-09-18");
assert.equal(parsedMarks.marks.points[0].values[0], "YES_MANUAL");
assert.equal(parsedMarks.marks.points[0].values[4], "NO");
assert.equal(loop.parseLoopCheckmarksCsv("wrong,header\n").marks.names.length, 0, "foreign headers are rejected");

/* 频率映射：1/1 daily、3/7 每周配额、1/14 interval、2/14 不可映射降级、N>=D daily。 */
assert.deepEqual(loop.mapLoopSchedule(1, 1).schedule, {type: "daily"});
assert.deepEqual(loop.mapLoopSchedule(3, 7).schedule, {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}});
assert.deepEqual(loop.mapLoopSchedule(5, 30).schedule, {type: "quota", quota: {period: "month", amount: 5, countMode: "dates"}});
assert.deepEqual(loop.mapLoopSchedule(1, 14).schedule, {type: "interval", intervalDays: 14});
assert.equal(loop.mapLoopSchedule(2, 14), undefined);
assert.equal(loop.mapLoopSchedule(8, 1).degraded, true);

const plan = loop.buildLoopImportPlan(habitsCsv, checkmarksCsv);
assert.equal(plan.habits.length, 6);
assert.deepEqual(plan.measurableNames, ["喝水"], "measurable habits are only catalogued");
assert.deepEqual(plan.unmappableFrequency, ["拉伸"], "unmappable frequencies are reported");
assert.deepEqual(plan.unknownColumns, ["Color"], "plan carries unknown columns into the preview stage");
const byName = new Map(plan.habits.map((habit) => [habit.name, habit]));
assert.deepEqual(byName.get("健身").schedule, {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}});
assert.deepEqual(byName.get("换床单").schedule, {type: "interval", intervalDays: 14});
assert.equal(byName.get("喝水").target, 8);
assert.equal(byName.get("喝水").unit, "杯");
assert.equal(byName.get("拉伸").archived, true);
assert.equal(byName.get("拉伸").scheduleDegraded, true);
/* 完成行只含 YES_MANUAL/YES_AUTO；SKIP 计数不迁移；UNKNOWN 忽略。 */
assert.equal(plan.rows.length, 5, `expected 5 completion rows, got ${plan.rows.length}`);
assert.ok(plan.rows.every((row) => row.value === 1 && row.binary === true));
assert.equal(plan.rows.filter((row) => row.name === "健身").length, 2, "YES_AUTO imports alongside YES_MANUAL");
assert.equal(plan.skipDays, 3, "skip days are counted but not migrated");
assert.equal(plan.unknownCells, 1);

/* 同构导出：12 列 Habits.csv + 组合 Checkmarks.csv（新→旧、尾随分隔符、YES_MANUAL/NO）。 */
const store = {
    version: 2,
    items: [
        {id: "i1", name: "阅读", icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "", updatedAt: "", createdDate: "2026-09-01", revisions: [], archivePeriods: []},
        {id: "i2", name: "喝水", icon: "💧", kind: "quantity", target: 8, unit: "杯", schedule: {type: "quota", quota: {period: "week", amount: 8, countMode: "dates"}}, createdAt: "", updatedAt: "", createdDate: "2026-09-01", revisions: [], archivePeriods: []},
    ],
    events: [
        {id: "e1", itemId: "i1", occurredAt: "", localDate: "2026-09-17", value: 1, unit: "次", source: "manual"},
        {id: "e2", itemId: "i2", occurredAt: "", localDate: "2026-09-17", value: 9, unit: "杯", source: "manual"},
    ],
    eventTombstones: [],
};
const exportedHabits = loop.serializeLoopHabitsCsv(store);
assert.ok(exportedHabits.startsWith("Position,Name,Type,Question,Description,FrequencyNumerator,FrequencyDenominator,Color,Unit,Target Type,Target Value,Archived?"));
assert.ok(exportedHabits.includes("001,阅读,YES_NO_HABIT,,,1,1,,,,,false"), "binary habit exports as YES_NO with 1/1");
assert.ok(exportedHabits.includes(",杯,AT_LEAST,8,"), "quantity habit exports unit and target");
assert.ok(exportedHabits.includes(",7,7,"), "weekly quota above 7 clamps to daily-equivalent 7/7");
const exportedMarks = loop.serializeLoopCheckmarksCsv(store, new Date(2026, 8, 18));
assert.ok(exportedMarks.startsWith(`Date,阅读,喝水,`), "aggregate header keeps habit columns and trailing delimiter");
const markLines = exportedMarks.split("\n");
assert.equal(markLines[1], "2026-09-18,NO,NO,", "today row pads with NO");
assert.equal(markLines[2], "2026-09-17,YES_MANUAL,YES_MANUAL,", "recorded days export YES_MANUAL");
assert.equal(markLines.length, 3, "only recorded days and today are written; long empty ranges are not padded");
/* 回环：导出的两份文件再次解析得到一致的习惯与记录。 */
const roundTrip = loop.buildLoopImportPlan(exportedHabits, exportedMarks);
assert.deepEqual(roundTrip.habits.map((habit) => habit.name), ["阅读", "喝水"]);
assert.equal(roundTrip.rows.filter((row) => row.name === "阅读").length, 1);
assert.equal(roundTrip.measurableNames.length, 1, "exported quantity habits re-import as measurable catalogue");

console.log("Loop CSV checks passed: parsing, frequency mapping, degraded migration boundaries, isomorphic export and round-trip.");
