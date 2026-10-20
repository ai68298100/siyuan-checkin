const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1875 守门测试：历史排期日历轻量点选补卡与矩阵批量回填（对标 Loop Habit Tracker）
   1. 纯函数三态循环：empty → done → skip → empty；
   2. 日历矩阵投影：正确标注过去/未来、排期适用性、原始状态与草稿覆盖、当日有效修订单位与步长；
   3. 批量变更规划：planMatrixBatchCommit 正确产出新增打卡、跳过与待删除事件，未来日与未变更日不进入；
   4. 原子提交：index.ts recordMatrixBackfill 失败整批回滚且不残留脏事实；
   5. UI 静态：review.ts 渲染 matrix-backfill 面板与 data-matrix-date，i18n 双语齐全。 */

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-matrix-backfill-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};

for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    fs.writeFileSync(
        path.join(dir, filename.replace(/\.ts$/, ".js")),
        ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText
    );
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(
    path.join(dir, "features", "batch-backfill.js"),
    ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "batch-backfill.ts"), "utf8"), {compilerOptions}).outputText
);

const model = require(path.join(dir, "model.js"));
const matrix = require(path.join(dir, "features", "batch-backfill.js"));

/* ---------------------------------------------------------
   一、三态循环纯函数
   --------------------------------------------------------- */

assert.equal(matrix.nextMatrixTriState("empty"), "done");
assert.equal(matrix.nextMatrixTriState("done"), "skip");
assert.equal(matrix.nextMatrixTriState("skip"), "empty");

/* ---------------------------------------------------------
   二、日历矩阵投影 buildMatrixMonthCalendar
   --------------------------------------------------------- */

const item = model.normalizeItem({
    id: "item-1",
    name: "早起",
    kind: "count",
    target: 2,
    unit: "次",
    recordStep: 2,
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    createdDate: "2026-09-01",
});

let store = model.createDefaultStore();
store.items = [item];
store.events = [
    {id: "e1", itemId: "item-1", value: 2, unit: "次", source: "manual", localDate: "2026-10-02"},
];

// 2026-10 月，asOf = 2026-10-20
const days = matrix.buildMatrixMonthCalendar(store, item, 2026, 9, new Map(), "2026-10-20");
assert.equal(days.length, 31, "10 月应有 31 天");
assert.equal(days[0].date, "2026-10-01");
assert.equal(days[0].weekday, 3, "2026-10-01 是星期四（0=周一）");

// 原始状态：10-02 完成；10-03 未打卡
const day2 = days.find((d) => d.date === "2026-10-02");
assert.equal(day2.originalState, "done");
assert.equal(day2.currentState, "done");
assert.equal(day2.unit, "次");
assert.equal(day2.step, 2);

const day3 = days.find((d) => d.date === "2026-10-03");
assert.equal(day3.originalState, "empty");
assert.equal(day3.scheduled, true);
assert.equal(day3.isFuture, false);

// 未来日
const day25 = days.find((d) => d.date === "2026-10-25");
assert.equal(day25.isFuture, true);

// 草稿覆盖
const drafts = new Map([["2026-10-03", "done"], ["2026-10-02", "skip"]]);
const drafted = matrix.buildMatrixMonthCalendar(store, item, 2026, 9, drafts, "2026-10-20");
assert.equal(drafted.find((d) => d.date === "2026-10-03").currentState, "done");
assert.equal(drafted.find((d) => d.date === "2026-10-02").currentState, "skip");
assert.equal(drafted.find((d) => d.date === "2026-10-02").originalState, "done");

/* ---------------------------------------------------------
   三、批量变更规划 planMatrixBatchCommit
   --------------------------------------------------------- */

const plan = matrix.planMatrixBatchCommit(store, item, drafted);
assert.equal(plan.changedCount, 2, "两个日期发生变更");
// 10-02: done → skip：删除旧事件 + 新增 skip
assert.ok(plan.toDeleteEventIds.includes("e1"), "切换为跳过必须删除原打卡事件");
assert.equal(plan.toAddSkips.length, 1);
assert.equal(plan.toAddSkips[0].localDate, "2026-10-02");
// 10-03: empty → done：新增打卡，值取当日修订步长
assert.equal(plan.toAddCheckins.length, 1);
assert.equal(plan.toAddCheckins[0].localDate, "2026-10-03");
assert.equal(plan.toAddCheckins[0].value, 2);
assert.equal(plan.toAddCheckins[0].unit, "次");

// 未来日不进入规划
const futureDrafts = new Map([["2026-10-25", "done"]]);
const futureDays = matrix.buildMatrixMonthCalendar(store, item, 2026, 9, futureDrafts, "2026-10-20");
const futurePlan = matrix.planMatrixBatchCommit(store, item, futureDays);
assert.equal(futurePlan.changedCount, 0, "未来日期不得写入");

// 未变更不进入规划
const noopPlan = matrix.planMatrixBatchCommit(store, item, days);
assert.equal(noopPlan.changedCount, 0);
assert.equal(noopPlan.toAddCheckins.length, 0);
assert.equal(noopPlan.toAddSkips.length, 0);
assert.equal(noopPlan.toDeleteEventIds.length, 0);

/* ---------------------------------------------------------
   四、原子提交与失败回滚（index.ts 行为夹具）
   --------------------------------------------------------- */

const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcBind = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const srcComponents = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

// 原子提交：失败写回 previous 并抛错，用户草稿保留
assert.match(srcIndex, /async recordMatrixBackfill\(itemId: string, drafts: ReadonlyMap<string, import\("\.\/features\/batch-backfill"\)\.MatrixTriState>/, "index.ts 必须暴露 recordMatrixBackfill");
assert.match(srcIndex, /catch \{ this\.store = previous; showMessage\(t\("msg\.saveFail"\)\); throw new Error\("matrix-persist-failed"\); \}/, "持久化失败必须整批回滚并抛错以保留草稿");
assert.match(srcIndex, /if \(!isValidLocalDateInput\(localDate\) \|\| localDate > todayKey\) continue;/, "未来或非法日期必须在提交时拒绝");

// 渲染与绑定
assert.match(srcReview, /data-matrix-backfill/, "review.ts 必须渲染矩阵补卡折叠面板");
assert.match(srcReview, /data-matrix-date="\$\{escapeHtml\(day\.date\)\}"/, "每个日期格必须携带 data-matrix-date");
assert.match(srcReview, /data-matrix-original="\$\{day\.originalState\}"/, "日期格必须声明原始状态以支持回退到无变更");
assert.match(srcReview, /disabled aria-disabled="true"/, "未来与未排期日必须禁用");
assert.match(srcBind, /root\.querySelectorAll<HTMLElement>\("\[data-matrix-date\]"\)/, "必须绑定矩阵日期格点击");
assert.match(srcBind, /host\.recordMatrixBackfill\?\.\(/, "必须通过宿主 recordMatrixBackfill 提交");
assert.match(srcBind, /\[data-matrix-cancel\]/, "必须支持放弃变更");

// 样式与 i18n
assert.match(srcComponents, /\.lc-checkin__matrix-cell/, "components.scss 必须包含矩阵日期格样式");
assert.match(srcComponents, /&:focus-visible \{ outline: 2px solid var\(--lc-checkin-accent\); outline-offset: 1px; \}/, "矩阵日期格必须有键盘焦点环");
assert.match(srcI18n, /"review\.matrixTitle":\s*"日历快速补卡"/);
assert.match(srcI18n, /"review\.matrixTitle":\s*"Calendar Quick Backfill"/);
assert.match(srcI18n, /"review\.matrixState\.skip":\s*"跳过"/);
assert.match(srcI18n, /"review\.matrixState\.skip":\s*"Skipped"/);

console.log("matrix-batch-checkin: all assertions passed successfully.");
