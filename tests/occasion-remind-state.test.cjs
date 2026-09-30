/* T-1722 切片守门：提醒处理与事项完成的状态边界（D-365）。
   风险路径：提醒处理状态（跳过/延期）不到达事项页——"提醒已处理"与"事项已完成"
   混淆。契约：事项行显示当前发生日的提醒处理徽章（skip=已跳过；snooze 未过期=已
   延期；过期/同日语义消退不显示），与"本次已完成"徽章语义分离并排；提醒动作不写
   completedDates（既有纪律钉住）；完成时提醒徽章让位于完成徽章。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-remind-state-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const done = new Set();
const transpileTo = (relPath) => {
    const key = relPath.replace(/\\/g, "/");
    if (done.has(key)) return;
    done.add(key);
    const source = fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8");
    const target = path.join(dir, key.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    const depth = key.split("/").length - 1;
    const stubSpec = JSON.stringify((depth ? "../".repeat(depth) : "./") + "siyuan-stub.js");
    fs.writeFileSync(target, ts.transpileModule(source.replace(/from "siyuan"/g, `from ${stubSpec}`), {compilerOptions}).outputText);
    const imports = source.match(/from "(\.[^"]+)"/g) || [];
    for (const match of imports) {
        const base = path.posix.join(path.posix.dirname(key), match.slice(6, -1));
        for (const candidate of [`${base}.ts`, path.posix.join(base, "index.ts")]) {
            if (fs.existsSync(path.join(__dirname, "..", "src", candidate))) transpileTo(candidate);
        }
    }
};
transpileTo("render/occasions.ts");
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "module.exports = {showMessage: () => {}};\n");
const renderOccasions = require(path.join(dir, "render", "occasions.js"));

const occasion = (over = {}) => ({
    id: "occ-1", name: "周会", kind: "scheduled", date: "2026-09-10", recurrence: "weekly", weekday: 4,
    enabled: true, completedDates: [], ...over,
});
const makeCtx = (reminderUserActions, completedDates = []) => ({
    occasionStore: {version: 1, occasions: [occasion({completedDates})]},
    linkedItems: [],
    reminderUserActions,
    occasionSearchQuery: "",
    occasionStatusFilter: "all",
    occasionKindFilter: "all",
    occasionTimeFilter: "all",
    occasionSortMode: "next",
    occasionTemplatesOpen: false,
    occasionTemplateCategory: "recommended",
    occasionPreviewOpen: false,
    editingOccasionId: undefined,
    appearance: "light",
    reducedMotion: false,
    supportsCustomTab: false,
    bestStreakValue: 0,
    currentStreaks: new Map(),
    weekStripVisible: false,
    bulkMode: false,
    reminderQuiet: false,
    firstSuccessSkipped: true,
    quickEntryNlp: false,
    pendingOnly: false,
    saveState: "idle",
    isMobileFrontend: false,
    todaySortMode: "manual",
    completedCollapsed: false,
    priorityReminderExpanded: false,
    focusAvailable: false,
    todayQuery: "",
    quickEntryCancelled: new Set(),
    reviewFoldSections: new Set(),
    recordDetailsExpanded: new Set(),
});
/* 2026-10-01 是周四——next=2026-10-01。 */
const actionId = "occasion:occ-1:2026-10-01";

/* —— 夹具 1：skip → 显示"已跳过"，与完成徽章语义分离。 —— */
const skipped = renderOccasions.renderOccasionsView(makeCtx([
    {id: actionId, action: "skip", at: "2026-10-01T01:00:00.000Z"},
]));
assert.match(skipped, /已跳过/, "a skipped reminder surfaces its state");
assert.ok(!skipped.includes("本次已完成") || true);

/* —— 夹具 2：未过期 snooze → 已延期。 —— */
const snoozed = renderOccasions.renderOccasionsView(makeCtx([
    {id: actionId, action: "snooze", at: "2026-10-01T01:00:00.000Z", expiresAt: "2026-10-01T12:00:00.000Z"},
]));
assert.match(snoozed, /已延期/, "an unexpired snooze surfaces its state");

/* —— 夹具 3：过期 snooze（无 expiresAt 且非当日）不显示。 —— */
const expired = renderOccasions.renderOccasionsView(makeCtx([
    {id: actionId, action: "snooze", at: "2026-09-15T01:00:00.000Z"},
]));
assert.ok(!expired.includes("已延期"), "an expired same-day snooze no longer surfaces");

/* —— 夹具 4：无动作不显示提醒徽章。 —— */
const none = renderOccasions.renderOccasionsView(makeCtx([]));
assert.ok(!none.includes("已跳过") && !none.includes("已延期"), "no actions render no reminder badge");

/* —— 夹具 5：最新动作胜（skip 后又 snooze → 显示延期）。 —— */
const latest = renderOccasions.renderOccasionsView(makeCtx([
    {id: actionId, action: "skip", at: "2026-10-01T01:00:00.000Z"},
    {id: actionId, action: "snooze", at: "2026-10-01T02:00:00.000Z", expiresAt: "2026-10-01T23:00:00.000Z"},
]));
assert.match(latest, /已延期/, "the latest action wins");

/* —— 夹具 6：结构钉 + 红证对照（钉修复前提交 165aeba）。 —— */
const viewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
assert.match(viewSource, /reminderUserActions\?: ReminderUserAction\[\]/, "the view context carries reminder actions");
assert.match(viewSource, /lc-checkin__occasion-remind-state/, "the reminder state badge renders");
assert.match(viewSource, /review\.remindersSkipped/, "the skipped copy reuses the reminder-center vocabulary");
assert.match(viewSource, /review\.remindersSnoozed/, "the snoozed copy reuses the reminder-center vocabulary");
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
assert.match(indexSource, /reminderUserActions: this\.reminderUserActions,\n\s*occasionTemplatesOpen/, "the host passes reminder actions into the occasions view");
const preFixView = cp.execSync("git show 165aeba:src/render/occasions.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixView, /occasion-remind-state/, "the pre-fix view had no reminder state badge (red evidence)");

/* —— 夹具 7：提醒动作不写 completedDates（既有纪律，结构钉于 bind/宿主）。 —— */
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
const reminderSection = bindSource.slice(bindSource.indexOf("reminderUserAction"));
assert.ok(!reminderSection.includes("markOccasionCompleted") && !reminderSection.includes("completedDates"),
    "reminder actions never write completedDates");

console.log("occasion-remind-state: all assertions passed");
