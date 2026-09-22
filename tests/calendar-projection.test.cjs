/* T-1390/T-1391 守门：项目级 Task Horizon 日历可见性（仅物化 false）与
   calendar.read 有界只读投影（服务端过滤、状态单一路径、有界截断、无隐私字段）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-calendar-projection-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/types.ts", "src/rules.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts", "src/view-preferences.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/health-inbox.ts", "src/features/calendar-projection.ts"].forEach(transpile);
const model = require(path.join(outputRoot, "src/model.js"));
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));
const {buildCalendarProjection, CALENDAR_PROJECTION_LIMITS} = require(path.join(outputRoot, "src/features/calendar-projection.js"));

const DAY = (date) => new Date(`${date}T12:00:00`);
const makeItem = (overrides = {}) => model.normalizeItem({id: "water", name: "喝水", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00Z", createdDate: "2026-09-01", ...overrides});
const makeEvent = (overrides = {}) => ({id: `e-${Math.random().toString(36).slice(2, 8)}`, itemId: "water", occurredAt: "2026-09-10T08:00:00Z", localDate: "2026-09-10", value: 1, unit: "次", source: "manual", kind: "checkin", ...overrides});

/* T-1390：仅物化显式 false；缺省/true/其他值一律不写字段（旧数据零迁移）。 */
assert.equal("taskHorizonCalendarVisible" in makeItem(), false, "new/legacy items must not materialize the field");
assert.deepEqual(makeItem({taskHorizonCalendarVisible: false}).taskHorizonCalendarVisible, false, "explicit false must survive normalization");
assert.equal("taskHorizonCalendarVisible" in makeItem({taskHorizonCalendarVisible: true}), false, "true must not be materialized");
assert.equal("taskHorizonCalendarVisible" in makeItem({taskHorizonCalendarVisible: "no"}), false, "non-boolean values are ignored");
const hiddenItem = makeItem({id: "secret", name: "私事", taskHorizonCalendarVisible: false});

/* 投影：默认全显示；隐藏/归档在服务端过滤；totalItems 报告截断前可见总数。 */
const store = () => model.normalizeStore({version: 3, items: [makeItem(), hiddenItem, makeItem({id: "gone", name: "归档", archived: true})], events: [makeEvent()]});
const projection = buildCalendarProjection(store(), {startDate: "2026-09-10", endDateExclusive: "2026-09-13"});
assert.equal(projection.items.length, 1, "hidden and archived items must be filtered server-side");
assert.equal(projection.items[0].itemId, "water");
assert.equal(projection.totalItems, 1, "totalItems counts visibility-filtered items (hidden/archived excluded) before truncation");
assert.equal(projection.truncated, false);

/* 状态口径：完成日/未完成日（progress）、跳过中性、非排期日不伪造计划项。 */
const quantity = makeItem({id: "run", name: "跑步", kind: "quantity", target: 2, unit: "公里"});
const quotaItem = makeItem({id: "read", name: "阅读", kind: "duration", target: 30, unit: "分钟", schedule: {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}}});
const atMost = makeItem({id: "candy", name: "戒糖", kind: "binary", direction: "atMost", schedule: {type: "daily"}});
const richStore = model.normalizeStore({
    version: 3,
    items: [quantity, quotaItem, atMost],
    events: [
        makeEvent({id: "q1", itemId: "run", localDate: "2026-09-10", occurredAt: "2026-09-10T08:00:00Z", value: 1, unit: "公里"}),
        makeEvent({id: "q2", itemId: "run", localDate: "2026-09-11", occurredAt: "2026-09-11T08:00:00Z", value: 2, unit: "公里"}),
        makeEvent({id: "q3", itemId: "read", localDate: "2026-09-10", occurredAt: "2026-09-10T09:00:00Z", value: 25, unit: "分钟"}),
        makeEvent({id: "q4", itemId: "candy", localDate: "2026-09-10", occurredAt: "2026-09-10T10:00:00Z", value: 1, unit: "次", kind: "skip"}),
        makeEvent({id: "q5", itemId: "candy", localDate: "2026-09-11", occurredAt: "2026-09-11T10:00:00Z", value: 1, unit: "次"}),
    ],
});
const rich = buildCalendarProjection(richStore, {startDate: "2026-09-10", endDateExclusive: "2026-09-13"});
const byId = Object.fromEntries(rich.items.map((item) => [item.itemId, item]));
const runPoints = Object.fromEntries(byId.run.points.map((point) => [point.date, point]));
assert.equal(runPoints["2026-09-10"].status, "pending", "partial day stays pending");
assert.ok(Math.abs(runPoints["2026-09-10"].progress - 0.5) < 1e-9, "pending point carries 0..1 progress");
assert.equal(runPoints["2026-09-11"].status, "complete", "completed day reports complete");
assert.equal(runPoints["2026-09-11"].progress, undefined, "complete points omit progress");
assert.equal(runPoints["2026-09-12"].status, "pending", "future scheduled day is pending, not fabricated complete");
const readPoints = byId.read.points;
assert.deepEqual(readPoints.map((point) => point.date), ["2026-09-10"], "quota items only project real contribution days");
assert.equal(byId.read.quotaRate > 0 && byId.read.quotaRate <= 1, true, "quota items carry period progress");
const candyPoints = Object.fromEntries(byId.candy.points.map((point) => [point.date, point]));
assert.equal(candyPoints["2026-09-10"].status, "skipped", "explicit skip is a neutral status");
assert.equal(candyPoints["2026-09-11"].status, "at-most-breach", "at-most with events breaches");
assert.equal(candyPoints["2026-09-12"].status, "at-most-safe", "at-most clean day is safe");
assert.ok(!byId.run.points.some((point) => point.status === "logged") || runPoints["2026-09-10"], "sanity");

/* 非排期日的真实记录 → logged；无记录的非排期日不生成点。 */
const weekly = makeItem({id: "weekly", name: "周末", schedule: {type: "weekly", weekdays: [6, 0]}});
const logged = buildCalendarProjection(model.normalizeStore({version: 3, items: [weekly], events: [makeEvent({itemId: "weekly", localDate: "2026-09-10", occurredAt: "2026-09-10T08:00:00Z"})]}), {startDate: "2026-09-10", endDateExclusive: "2026-09-12"});
assert.equal(logged.items[0].points.length, 1);
assert.equal(logged.items[0].points[0].status, "logged", "unplanned-day record projects as logged");
assert.equal(logged.items[0].points[0].date, "2026-09-10", "date attribution uses event localDate, not UTC");

/* 有界：非法输入 TypeError；跨 366 天拒绝；200 项目截断显式标注。 */
assert.throws(() => buildCalendarProjection(store(), {startDate: "2026-09-10", endDateExclusive: "2026-09-10"}), TypeError, "empty range must throw");
assert.throws(() => buildCalendarProjection(store(), {startDate: "2026-09-10", endDateExclusive: "2026-09-01"}), TypeError, "inverted range must throw");
assert.throws(() => buildCalendarProjection(store(), {startDate: "bad", endDateExclusive: "2026-09-13"}), TypeError, "invalid dates must throw");
const manyItems = Array.from({length: CALENDAR_PROJECTION_LIMITS.maxItems + 5}, (_, index) => makeItem({id: `item-${index}`, name: `P${index}`}));
const truncatedProjection = buildCalendarProjection(model.normalizeStore({version: 3, items: manyItems, events: []}), {startDate: "2026-09-10", endDateExclusive: "2026-09-12"});
assert.equal(truncatedProjection.items.length, CALENDAR_PROJECTION_LIMITS.maxItems, "items are bounded");
assert.equal(truncatedProjection.totalItems, manyItems.length, "totalItems reports pre-truncation count");
assert.equal(truncatedProjection.truncated, true, "truncation is explicit");

/* 隐私：投影不含备注/附件/externalRef。 */
const payload = JSON.stringify(projection);
assert.ok(!payload.includes("externalRef") && !payload.includes("note") && !payload.includes("attachment"), "projection must not leak private fields");

/* facade 接线与契约：能力注册 since 5；方法存在于 API 面。 */
const apiSource = fs.readFileSync(path.join(__dirname, "..", "src/api.ts"), "utf8");
assert.ok(apiSource.includes("getCalendarProjection"), "facade must expose the projection method");
const contractSource = fs.readFileSync(path.join(__dirname, "..", "src/api-contract.ts"), "utf8");
assert.match(contractSource, /"calendar\.read": 5/, "calendar.read must negotiate since v5");

/* 编辑器开关与保存装配：默认勾选（不含字段），取消勾选保存 false；i18n 双语。 */
const editorSource = fs.readFileSync(path.join(__dirname, "..", "src/render/editor.ts"), "utf8");
assert.ok(editorSource.includes("data-taskhorizon-visible-field") && editorSource.includes("name=\"taskHorizonVisible\""), "editor advanced section must expose the switch");
const saveFormSource = fs.readFileSync(path.join(__dirname, "..", "src/render/save-form.ts"), "utf8");
assert.ok(saveFormSource.includes("taskHorizonVisible") && saveFormSource.includes("taskHorizonCalendarVisible: false as const"), "save path must materialize only explicit hidden");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src/i18n.ts"), "utf8");
for (const key of ["editor.thVisible", "editor.thVisibleHint"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}

/* 隐藏不影响本地视图与查询：今日视图仍包含隐藏项目（隐藏只作用于外部投影）。 */
const todayVisible = model.queryTodayItems(store(), DAY("2026-09-10"));
assert.ok(todayVisible.some((item) => item.id === "water"), "visible item stays in today view");
assert.ok(todayVisible.some((item) => item.id === "secret"), "hidden item stays in local today view — hiding is projection-only");

console.log("calendar projection gates passed: visibility materialization, server-side filter, status semantics, bounds, privacy, editor wiring, i18n parity");
