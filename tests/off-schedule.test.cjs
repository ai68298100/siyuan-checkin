/* T-1772 守门：今日页"其他活跃项目"管理入口（D-343）。
   风险路径：今日列表只呈现当日排期项——未来才开始、归档暂停期或非今日排期的
   活跃项目保存后从今日列表"消失"，用户没有可发现的管理入口（编辑/归档不可达）。
   契约：collectOffScheduleItems 按今日同款谓词取补集并给出原因（未到开始日/
   暂停中/今日不排期）与下次排期（有界 366 天扫描；开归档期无下次）；归档/已排期
   项目不入列；今日列表、进度分母与筛选语义零变化（fragments 只追加只读分节）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-off-schedule-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(path.join(dir, "features", "off-schedule.js"), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "features", "off-schedule.ts"), "utf8"), {compilerOptions}).outputText);
const model = require(path.join(dir, "model.js"));
const offSchedule = require(path.join(dir, "features", "off-schedule.js"));

const asOf = new Date(2026, 9, 1, 12); // 2026-10-01（周四）
const dayKey = (offset) => {
    const date = new Date(2026, 9, 1 + offset, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const buildItem = (overrides = {}) => model.normalizeItem({
    id: "x",
    name: "项目",
    icon: "✓",
    kind: "binary",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: `${dayKey(-30)}T08:00:00.000Z`,
    updatedAt: `${dayKey(-30)}T08:00:00.000Z`,
    createdDate: dayKey(-30),
    ...overrides,
});
const entryById = (entries, id) => entries.find((entry) => entry.item.id === id);

/* —— 夹具 1：三类原因 + 下次排期。 —— */
const store = model.normalizeStore({
    version: 3,
    items: [
        buildItem({id: "future", name: "未来项", createdDate: dayKey(3)}),
        buildItem({id: "weekly", name: "周项", schedule: {type: "weekly", weekdays: [1]}}),        // 周一，今天周四
        buildItem({id: "interval", name: "隔日项", schedule: {type: "interval", intervalDays: 2, anchorDate: dayKey(0)}}), // 今天排期 → 不入列
        buildItem({id: "interval-off", name: "隔日错峰", schedule: {type: "interval", intervalDays: 2, anchorDate: dayKey(-1)}}), // 今天不排期
        buildItem({id: "paused", name: "暂停项", archivePeriods: [{startDate: dayKey(-2), endDate: dayKey(4)}]}),
        buildItem({id: "open-paused", name: "长暂停", archivePeriods: [{startDate: dayKey(-2)}]}),
        buildItem({id: "today", name: "今日项"}),
    ],
    events: [],
    eventTombstones: [],
    itemTombstones: [],
});
const entries = offSchedule.collectOffScheduleItems(store, asOf);
const ids = entries.map((entry) => entry.item.id);
assert.deepEqual([...ids].sort(), ["future", "interval-off", "open-paused", "paused", "weekly"], "the projection is the exact complement of today's schedule");
assert.equal(entryById(entries, "future").reason, "not-started");
assert.equal(entryById(entries, "future").nextDate, dayKey(3), "a future daily item starts on its created date");
assert.equal(entryById(entries, "weekly").reason, "off-schedule");
assert.equal(entryById(entries, "weekly").nextDate, dayKey(4), "the next Monday after Thursday");
assert.equal(entryById(entries, "interval-off").reason, "off-schedule");
assert.equal(entryById(entries, "interval-off").nextDate, dayKey(1), "interval anchored yesterday fires tomorrow");
assert.equal(entryById(entries, "paused").reason, "paused");
assert.equal(entryById(entries, "paused").nextDate, dayKey(4), "availability resumes on the inclusive archive end date");
assert.equal(entryById(entries, "open-paused").reason, "paused");
assert.equal(entryById(entries, "open-paused").nextDate, undefined, "an open archive period has no foreseeable next date");

/* —— 夹具 2：归档项目不入列；今日项不入列；空补集返回空数组。 —— */
const archivedStore = model.normalizeStore({
    version: 3,
    items: [buildItem({id: "gone", archived: true}), buildItem({id: "today", name: "今日"})],
    events: [],
    eventTombstones: [],
    itemTombstones: [],
});
assert.deepEqual(offSchedule.collectOffScheduleItems(archivedStore, asOf).map((entry) => entry.item.id), [], "archived and scheduled items stay out");

/* —— 夹具 3：配额未来项也按未到开始日给出下次排期。 —— */
const quotaFuture = model.normalizeStore({
    version: 3,
    items: [buildItem({id: "quota", name: "限量", createdDate: dayKey(2), schedule: {type: "quota", quota: {period: "month", amount: 4, countMode: "dates"}}})],
    events: [],
    eventTombstones: [],
    itemTombstones: [],
});
const quotaEntries = offSchedule.collectOffScheduleItems(quotaFuture, asOf);
assert.equal(quotaEntries.length, 1);
assert.equal(quotaEntries[0].reason, "not-started");
assert.equal(quotaEntries[0].nextDate, dayKey(2));

/* —— 夹具 4：渲染与接线结构钉。 —— */
const fragmentsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /collectOffScheduleItems\(ctx\.store, now\)/, "the today view projects the off-schedule complement");
assert.match(fragmentsSource, /renderOffScheduleSection/, "the manage section renders");
assert.match(fragmentsSource, /data-manage-edit/, "rows expose edit actions");
assert.match(fragmentsSource, /data-manage-archive/, "rows expose archive actions");
assert.match(fragmentsSource, /data-manage-item/, "rows carry the item id");
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-today.ts"), "utf8");
assert.match(bindSource, /\[data-manage-edit\].*?host\.showEditor\(item, root\)/s, "edit opens the editor on the originating root");
assert.match(bindSource, /\[data-manage-archive\].*?host\.archiveItems\(\[id\]\)/s, "archive reuses the batch archive pipeline");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["today.manageTitle", "today.manageReasonNotStarted", "today.manageReasonPaused", "today.manageReasonOffSchedule", "today.manageNext", "today.manageEdit", "today.manageArchive"]) {
    const occurrences = (i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length;
    assert.equal(occurrences, 2, `${key} exists in both zh-CN and en-US dictionaries`);
}

console.log("off-schedule: all assertions passed");
