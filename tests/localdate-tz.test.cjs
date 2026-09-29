const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const ts = require("typescript");

/* T-1619 守门：记录日口径 = 合法 localDate 键直接字符串比较，仅非法日期才从
   occurredAt 经统一本地日期函数回退。旧的 `new Date(event.localDate)` 隐式把
   `YYYY-MM-DD` 按 UTC 午夜解析，在 America/New_York 等负时区会漂移到前一日；
   回顾月/年趋势又按 occurredAt 时刻切月切年，与日活跃口径分叉。
   本守门用固定 TZ 子进程矩阵证明：同一批持久事件在不同设备时区仍按记录日结算，
   且时区矩阵真实生效（子进程自证偏移），禁止在 TZ 不生效的环境里静默通过。 */

const root = path.join(__dirname, "..");
const src = path.join(root, "src");

const ZONES = [
    {tz: "UTC", januaryOffset: 0, julyOffset: 0},
    {tz: "Asia/Shanghai", januaryOffset: -480, julyOffset: -480},
    {tz: "America/New_York", januaryOffset: 300, julyOffset: 240},
];
const SCENARIOS = ["progress-by-localdate", "dst-boundaries", "fallback-invalid-localdate", "trend-alignment", "revision-units", "quota-skip-atmost"];

/* ---- 源码级防回归（精确签名断言） ---- */
const rulesSource = fs.readFileSync(path.join(src, "rules.ts"), "utf8");
assert.doesNotMatch(rulesSource, /new Date\(event\.localDate/, "rules.ts must never Date-parse localDate keys implicitly");
assert.match(rulesSource, /eventDateKey\(event\) === localDateKey\(date\)/, "daily progress must compare persisted localDate keys directly (same contract as quota path)");
const chartsSource = fs.readFileSync(path.join(src, "charts.ts"), "utf8");
assert.doesNotMatch(chartsSource, /event\.occurredAt/, "chart trends must not aggregate by occurredAt instants");
assert.equal((chartsSource.match(/getEventDateKey\(event\)/g) || []).length, 3, "monthly/daily/yearly trends must share one event-day derivation");

/* ---- 转译被测模块（CommonJS 落盘，保持相对 require，与既有守门同法） ---- */
const out = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-localdate-tz-"));
for (const file of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "charts.ts"]) {
    const destination = path.join(out, file.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, ts.transpileModule(fs.readFileSync(path.join(src, file), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText, "utf8");
}

const RUNNER = [
    'const path = require("path");',
    'const rules = require(path.join(__dirname, "rules.js"));',
    'const model = require(path.join(__dirname, "model.js"));',
    'const charts = require(path.join(__dirname, "charts.js"));',
    'const dateKeys = require(path.join(__dirname, "date-keys.js"));',
    'const scenario = process.argv[2];',
    'const offset = new Date(2026, 0, 1, 12).getTimezoneOffset();',
    'const julyOffset = new Date(2026, 6, 1, 12).getTimezoneOffset();',
    'const dateOnlyParseDay = new Date("2026-03-08").getDate();',
    'const failures = [];',
    'function ok(label, condition) { if (!condition) failures.push(label); }',
    'function day(key) { const parts = key.split("-").map(Number); return new Date(parts[0], parts[1] - 1, parts[2], 12); }',
    'function dayOf(y, m, d) { return new Date(y, m - 1, d, 12); }',
    'function storeOf(item, events) { return {version: 1, items: [item], events: events, eventTombstones: []}; }',
    'const baseItem = {id: "read", name: "阅读", icon: "📖", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", revisions: [], archivePeriods: []};',
    'function ev(partial) { return Object.assign({id: "e", itemId: "read", kind: "checkin", value: 1, unit: "次", source: "manual", occurredAt: "2026-09-29T12:00:00.000Z", localDate: "2026-09-29"}, partial); }',
    'if (scenario === "progress-by-localdate") {',
    '  const events = [ev({id: "e1", localDate: "2026-09-29", occurredAt: "2026-09-28T23:30:00.000Z"})];',
    '  const store = storeOf(baseItem, events);',
    '  ok("raw progress counts record day", rules.evaluateRule(baseItem, events, dayOf(2026, 9, 29)).progress === 1);',
    '  ok("raw complete on record day", rules.evaluateRule(baseItem, events, dayOf(2026, 9, 29)).complete === true);',
    '  ok("model evaluateItemRule agrees", model.evaluateItemRule(store, baseItem, dayOf(2026, 9, 29)).progress === 1);',
    '  ok("isComplete on record day", model.isComplete(store, baseItem, dayOf(2026, 9, 29)) === true);',
    '  ok("previous day stays empty", model.evaluateItemRule(store, baseItem, dayOf(2026, 9, 28)).progress === 0);',
    '  ok("isComplete false on previous day", model.isComplete(store, baseItem, dayOf(2026, 9, 28)) === false);',
    '}',
    'if (scenario === "dst-boundaries") {',
    '  const earlyItem = Object.assign({}, baseItem, {createdAt: "2026-01-01T00:00:00.000Z", createdDate: "2026-01-01"});',
    '  const spring = [ev({id: "s1", localDate: "2026-03-08", occurredAt: "2026-03-08T05:00:00.000Z"})];',
    '  const fall = [ev({id: "f1", localDate: "2026-11-01", occurredAt: "2026-11-01T05:00:00.000Z"})];',
    '  ok("spring-forward day settles by key", rules.evaluateRule(earlyItem, spring, dayOf(2026, 3, 8)).progress === 1);',
    '  ok("fall-back day settles by key", rules.evaluateRule(earlyItem, fall, dayOf(2026, 11, 1)).progress === 1);',
    '  ok("spring eve stays empty", rules.evaluateRule(earlyItem, spring, dayOf(2026, 3, 7)).progress === 0);',
    '  ok("fall eve stays empty", rules.evaluateRule(earlyItem, fall, dayOf(2026, 10, 31)).progress === 0);',
    '}',
    'if (scenario === "fallback-invalid-localdate") {',
    '  const earlyItem = Object.assign({}, baseItem, {createdAt: "2026-01-01T00:00:00.000Z", createdDate: "2026-01-01"});',
    '  const iso = "2026-09-29T02:00:00.000Z";',
    '  const fallbackDay = model.dateKey(new Date(iso));',
    '  const events = [ev({id: "e1", localDate: "", occurredAt: iso})];',
    '  ok("empty localDate falls back to occurredAt day", rules.evaluateRule(earlyItem, events, day(fallbackDay)).progress === 1);',
    '  const before = dateKeys.addDays(fallbackDay, -1);',
    '  const after = dateKeys.addDays(fallbackDay, 1);',
    '  ok("day before fallback stays empty", rules.evaluateRule(earlyItem, events, day(before)).progress === 0);',
    '  ok("day after fallback stays empty", rules.evaluateRule(earlyItem, events, day(after)).progress === 0);',
    '  const weird = [ev({id: "e2", localDate: "2026-02-30", occurredAt: "2026-03-01T12:00:00.000Z"})];',
    '  const weirdDay = model.dateKey(new Date("2026-03-01T12:00:00.000Z"));',
    '  ok("non-calendar localDate falls back", rules.evaluateRule(earlyItem, weird, day(weirdDay)).progress === 1);',
    '  ok("non-calendar localDate never leaks as key", rules.evaluateRule(earlyItem, weird, dayOf(2026, 3, 2)).progress === 0);',
    '}',
    'if (scenario === "trend-alignment") {',
    '  const boundary = storeOf(baseItem, [',
    '    ev({id: "m1", localDate: "2026-08-31", occurredAt: "2026-09-01T02:00:00.000Z"}),',
    '    ev({id: "m2", localDate: "2026-09-01", occurredAt: "2026-08-31T23:00:00.000Z"}),',
    '    ev({id: "y1", localDate: "2025-12-31", occurredAt: "2026-01-01T05:00:00.000Z"}),',
    '    ev({id: "y2", localDate: "2026-01-01", occurredAt: "2025-12-31T23:00:00.000Z"}),',
    '  ]);',
    '  const asOf = dayOf(2026, 9, 15);',
    '  const monthly = charts.buildMonthlyEventTrend(boundary, 6, asOf);',
    '  const august = monthly.points.find(function (point) { return point.label === "8月"; });',
    '  const september = monthly.points.find(function (point) { return point.label === "9月"; });',
    '  ok("august counts its own record", august && august.value === 1);',
    '  ok("september counts its own record", september && september.value === 1);',
    '  const yearly = charts.buildYearlyEventTrend(boundary, 5, asOf);',
    '  const y2025 = yearly.points.find(function (point) { return point.label === "2025"; });',
    '  const y2026 = yearly.points.find(function (point) { return point.label === "2026"; });',
    '  ok("2025 keeps the year-end record", y2025 && y2025.value === 1);',
    '  ok("2026 keeps its three records", y2026 && y2026.value === 3);',
    '  const activityStore = storeOf(baseItem, boundary.events.concat([ev({id: "d1", localDate: "", occurredAt: "2026-09-10T02:00:00.000Z"})]));',
    '  const daily = charts.buildDailyActivityTrend(activityStore, 30, asOf);',
    '  ok("daily activity shares the fallback contract", daily.points.reduce(function (sum, point) { return sum + point.value; }, 0) === 3);',
    '}',
    'if (scenario === "revision-units") {',
    '  const item = Object.assign({}, baseItem, {kind: "count", target: 2, unit: "杯", revisions: [{effectiveDate: "2026-09-29", kind: "count", target: 500, unit: "毫升", schedule: {type: "daily"}}]});',
    '  const events = [ev({id: "r1", localDate: "2026-09-29", occurredAt: "2026-09-29T01:00:00.000Z", unit: "毫升", value: 300}), ev({id: "r2", localDate: "2026-09-28", occurredAt: "2026-09-28T01:00:00.000Z", unit: "杯", value: 1})];',
    '  const on29 = rules.evaluateRule(item, events, dayOf(2026, 9, 29));',
    '  ok("revision unit applies on effective day", on29.unit === "毫升");',
    '  ok("revision target applies on effective day", on29.target === 500);',
    '  ok("revision day counts matching unit only", on29.progress === 300);',
    '  ok("revision day incomplete below target", on29.complete === false);',
    '  const on28 = rules.evaluateRule(item, events, dayOf(2026, 9, 28));',
    '  ok("older day keeps the older unit", on28.unit === "杯");',
    '  ok("older day keeps the older target", on28.target === 2);',
    '  ok("older day counts its own unit", on28.progress === 1);',
    '}',
    'if (scenario === "quota-skip-atmost") {',
    '  const quotaItem = Object.assign({}, baseItem, {kind: "count", target: 2, unit: "次", schedule: {type: "quota", quota: {period: "week", amount: 2, countMode: "dates", weekStartsOn: 1}}});',
    '  const quotaEvents = [ev({id: "q1", localDate: "2026-09-08", occurredAt: "2026-09-08T08:00:00.000Z"}), ev({id: "q2", localDate: "2026-09-10", occurredAt: "2026-09-10T08:00:00.000Z"})];',
    '  const quota = rules.evaluateQuotaSchedule(quotaItem.schedule, quotaEvents, "read", dayOf(2026, 9, 10), "次");',
    '  ok("quota progress stable across zones", quota.progress === 2 && quota.complete === true);',
    '  ok("quota contributing dates are record keys", quota.contributingDates.join(",") === "2026-09-08,2026-09-10");',
    '  const skipStore = storeOf(baseItem, [ev({id: "s1", kind: "skip", localDate: "2026-09-29", occurredAt: "2026-09-29T01:00:00.000Z"})]);',
    '  ok("skip does not contribute progress", model.evaluateItemRule(skipStore, baseItem, dayOf(2026, 9, 29)).progress === 0);',
    '  ok("skip day is not complete", model.isComplete(skipStore, baseItem, dayOf(2026, 9, 29)) === false);',
    '  const atMostItem = Object.assign({}, baseItem, {direction: "atMost", kind: "binary", target: 1});',
    '  const breachStore = storeOf(atMostItem, [ev({id: "a1", localDate: "2026-09-29", occurredAt: "2026-09-29T01:00:00.000Z"})]);',
    '  const cleanStore = storeOf(atMostItem, []);',
    '  ok("atMost breach day not complete", model.isComplete(breachStore, atMostItem, dayOf(2026, 9, 29)) === false);',
    '  ok("atMost zero-event day kept", model.isComplete(cleanStore, atMostItem, dayOf(2026, 9, 29)) === true);',
    '  ok("atMost breach only on record day", model.isComplete(breachStore, atMostItem, dayOf(2026, 9, 28)) === true);',
    '}',
    'process.stdout.write("RESULT:" + JSON.stringify({scenario: scenario, offset: offset, julyOffset: julyOffset, dateOnlyParseDay: dateOnlyParseDay, failed: failures}));',
    'if (failures.length) process.exit(1);',
].join("\n");
fs.writeFileSync(path.join(out, "runner.cjs"), RUNNER, "utf8");

let scenarioRuns = 0;
let zoneChecks = 0;
for (const zone of ZONES) {
    for (const scenario of SCENARIOS) {
        const result = spawnSync(process.execPath, [path.join(out, "runner.cjs"), scenario], {env: {...process.env, TZ: zone.tz}, encoding: "utf8"});
        assert.equal(result.status, 0, `${scenario} under TZ=${zone.tz} must pass; failed: ${result.stderr || result.stdout}`);
        const payload = JSON.parse(result.stdout.slice(result.stdout.indexOf("RESULT:") + "RESULT:".length));
        assert.equal(payload.offset, zone.januaryOffset, `TZ=${zone.tz} must really apply: January offset probe mismatch`);
        assert.equal(payload.julyOffset, zone.julyOffset, `TZ=${zone.tz} must really apply: July (DST) offset probe mismatch`);
        zoneChecks += SCENARIOS.length;
        scenarioRuns += 1;
    }
}

/* 负时区缺陷机理自证：NY 下对 date-only 字符串的隐式解析确实退一天——
   若该探针不再成立（Node/ICU 行为变化），回归断言仍按字符串口径守住，
   但需重新核实缺陷机理描述。 */
const newYork = spawnSync(process.execPath, [path.join(out, "runner.cjs"), "progress-by-localdate"], {env: {...process.env, TZ: "America/New_York"}, encoding: "utf8"});
const newYorkPayload = JSON.parse(newYork.stdout.slice(newYork.stdout.indexOf("RESULT:") + "RESULT:".length));
assert.equal(newYorkPayload.dateOnlyParseDay, 7, "America/New_York must still demonstrate the date-only implicit-parse hazard this fix removes");

fs.rmSync(out, {recursive: true, force: true});
console.log(`localdate-tz checks passed: ${scenarioRuns} zone-scenarios (${ZONES.length} zones x ${SCENARIOS.length} scenarios), ${zoneChecks} scenario sets, source guards 4.`);
