/* R-A17（2026-09-26）第 3 批守门：
   R-17.1 相关性洞察——Pearson 计算、最小样本纪律（≥4 天且 |r|≥0.4）、滞后一天检测、
   确定性排序、报告接线与 calm 免责文案；
   R-17.2 超额日——month 块 overage 判定与正向表达（描边不改色阶）；
   R-17.3 时段分组——today 块 ≥2 条记录按早/午/晚计数，单条不产出。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-ra17-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/types.ts", "src/rules.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts", "src/date-keys.ts", "src/ui/labels.ts", "src/features/reminder-preferences.ts", "src/features/first-success.ts", "src/features/view-scope.ts", "src/view-preferences.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/source-framework.ts", "src/features/record-notes.ts", "src/features/pace-projection.ts", "src/features/checkin-block.ts", "src/features/correlation-insights.ts"].forEach(transpile);
const ci = require(path.join(outputRoot, "src/features/correlation-insights.js"));
const block = require(path.join(outputRoot, "src/features/checkin-block.js"));

const day = (n) => `2026-09-${String(n).padStart(2, "0")}`;
/* X：完全规律的 0/1 交替；Y：与 X 完全同向 → r=1；Z：与 X 无关常数 → 方差 0 剔除。 */
const xSeries = {id: "x", name: "晨跑", days: [1, 2, 3, 4, 5, 6].map((n) => ({date: day(n), scheduled: true, ratio: n % 2}))};
const ySeries = {id: "y", name: "冥想", days: [1, 2, 3, 4, 5, 6].map((n) => ({date: day(n), scheduled: true, ratio: n % 2}))};
const zSeries = {id: "z", name: "喝水", days: [1, 2, 3, 4, 5, 6].map((n) => ({date: day(n), scheduled: true, ratio: 1}))};

/* —— 1. 同向完全相关被收录；常数序列（方差 0）不产出。 —— */
{
    const insights = ci.buildCorrelationInsights([xSeries, ySeries, zSeries]);
    assert.equal(insights.length, 1, `only the real pair qualifies, got ${JSON.stringify(insights)}`);
    assert.equal(insights[0].itemA, "晨跑");
    assert.equal(insights[0].itemB, "冥想");
    assert.equal(insights[0].r, 1);
    assert.equal(insights[0].lag, 0);
    assert.equal(insights[0].direction, "positive");
}

/* —— 2. 最小样本纪律：重叠 3 天（<4）一律不收录；|r|<0.4 不收录。 —— */
{
    const shortA = {id: "a", name: "A", days: [1, 2, 3].map((n) => ({date: day(n), scheduled: true, ratio: n % 2}))};
    const shortB = {id: "b", name: "B", days: [1, 2, 3].map((n) => ({date: day(n), scheduled: true, ratio: n % 2}))};
    assert.deepEqual(ci.buildCorrelationInsights([shortA, shortB]), [], "below the 4-day floor nothing is reported");
    const weak = {id: "w", name: "W", days: [1, 2, 3, 4, 5, 6].map((n) => ({date: day(n), scheduled: true, ratio: [0.5, 0.4, 0.6, 0.5, 0.4, 0.6][n - 1]}))};
    const insights = ci.buildCorrelationInsights([xSeries, weak]);
    assert.equal(insights.length, 0, "uncorrelated series stays under the |r|>=0.4 bar");
}

/* —— 3. 滞后一天：B 的次日跟随 A 的当日（r=1），且 |r_lag|>|r_same| 时以滞后呈现。 —— */
/* —— 3. 滞后一天：follow(d)=lead(d-1)、重叠同日仅 3 天（低于门槛）→ 唯一达标的是滞后关系。 —— */
/* —— 3. 滞后一天：follow(d)≈lead(d-1)（d2 加噪打破对称）→ 滞后相关严格强于同日，以滞后呈现。 —— */
{
    const lead = {id: "lead", name: "早睡", days: [1, 2, 3, 4, 5, 6].map((n) => ({date: day(n), scheduled: true, ratio: n % 2}))};
    const follow = {id: "follow", name: "晨跑", days: [2, 3, 4, 5, 6, 7].map((n) => ({date: day(n), scheduled: true, ratio: n === 2 ? 0.8 : (n - 1) % 2}))};
    const insights = ci.buildCorrelationInsights([lead, follow]);
    assert.equal(insights.length, 2, "same-day and lag both pass the discipline bars");
    assert.equal(insights[0].lag, 1, "the strictly stronger lag relation ranks first");
    assert.equal(insights[0].itemA, "早睡");
    assert.equal(insights[0].direction, "positive");
    assert.equal(insights[1].lag, 0, "same-day relation also reported");
}

/* —— 4. 排序确定性：|r| 降序、样本降序、名称平局。 —— */
{
    const strong = ci.buildCorrelationInsights([xSeries, ySeries, {id: "p", name: "P", days: [1, 2, 3, 4, 5, 6].map((n) => ({date: day(n), scheduled: true, ratio: n % 2 ? 1 : 0.2}))}]);
    assert.ok(Math.abs(strong[0].r) >= Math.abs(strong[1].r), "sorted by |r| desc");
    assert.deepEqual(ci.buildCorrelationInsights([xSeries, ySeries]), ci.buildCorrelationInsights([xSeries, ySeries]), "deterministic output");
}

/* —— 5. 报告接线：三键双语 + report.ts 渲染（同向/滞后 + 免责说明）。 —— */
const i18nSource = read("src/i18n.ts");
for (const key of ["report.correlationTitle", "report.correlationSame", "report.correlationLag", "report.correlationNote", "block.overageTag", "block.slotMorning", "block.slotAfternoon", "block.slotEvening", "block.todaySlotsAria"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.equal(count, 2, `${key} must exist in both locales (${count})`);
}
const reportSource = read("src/features/report.ts");
assert.match(reportSource, /correlationInsights\?\.length/, "report renders the correlation section");
assert.match(reportSource, /report\.correlationNote/, "report always appends the correlation-is-not-causation note");
assert.match(reportSource, /slice\(0, 3\)/, "report caps the correlation list at three");
const indexSource = read("src/index.ts");
assert.match(indexSource, /buildCorrelationInsightsForReport/, "index builds the correlation facts");
assert.match(indexSource, /const correlationInsights = this\.buildCorrelationInsightsForReport\(\);/, "facts computed via the pure module");
assert.match(indexSource, /targetLoad, correlationInsights\}/, "report options carry the insights");

/* —— 6. R-17.2/R-17.3：month 超额日 + today 时段分组（真实模型装配）。 —— */
const AS_OF = new Date(2026, 8, 26, 12);
const makeItem = (overrides = {}) => block === undefined ? null : ({id: "water", name: "喝水", icon: "💧", kind: "count", target: 8, unit: "杯", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", createdDate: "2026-09-01", revisions: [], archivePeriods: [], ...overrides});
const model = require(path.join(outputRoot, "src/model.js"));
const water = model.normalizeItem(makeItem());
const mkEvent = (id, hour, value) => ({id, itemId: "water", occurredAt: `2026-09-25T${String(hour).padStart(2, "0")}:30:00`, localDate: "2026-09-25", value, unit: "杯", source: "manual", kind: "checkin"});
const store = model.normalizeStore({version: 3, items: [water], events: [mkEvent("e1", 8, 3), mkEvent("e2", 14, 3), mkEvent("e3", 20, 4)]});

/* 超额日：9/25 总量 10 > 目标 8 → overage；未排期/未来日无超额。 */
const cells = block.buildMonthCells(store, [water], 2026, 8, AS_OF);
const overday = cells.find((cell) => cell.date === "2026-09-25");
assert.equal(overday.overage, true, "day total 10 over target 8 is an overage day");
const otherDay = cells.find((cell) => cell.date === "2026-09-24");
assert.equal(otherDay.overage, false, "days without overage stay plain");

/* 时段分组：3 条记录 → 早 1 / 午 1 / 晚 1；单条记录不产出。 */
const slots = block.buildTodaySlotCounts(store, "water", new Date(2026, 8, 25, 21));
assert.deepEqual(slots, {morning: 1, afternoon: 1, evening: 1});
assert.equal(block.buildTodaySlotCounts(store, "water", new Date(2026, 8, 24, 21)), undefined, "a single record produces no slot grouping");

/* today 行携带 slots；HTML 渲染时段分组与超额描边类。 */
const rows = block.buildTodayRows(store, [water], new Date(2026, 8, 25, 21));
assert.deepEqual(rows[0].slots, {morning: 1, afternoon: 1, evening: 1});
const todayHtml = block.buildTodayViewHtml(store, {view: "today", itemIds: ["water"]}, new Date(2026, 8, 25, 21));
assert.match(todayHtml, /lc-checkin__renderblock-today-slots/, "today block renders the slot grouping");

const scss = read("src/ui/components.scss");
assert.match(scss, /\.lc-checkin__renderblock-cell\.is-overage \{ box-shadow: inset 0 0 0 1\.5px var\(--lc-checkin-accent-text\); \}/, "overage uses an accent inset ring (positive, ladder untouched)");
assert.match(scss, /\.lc-checkin__renderblock-today-slots \{/, "slot grouping styles exist");

console.log("R-A17 guard tests passed.");
