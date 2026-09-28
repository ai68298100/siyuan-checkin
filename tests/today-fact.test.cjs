const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1610：今日行动台事实切片必须整口径取当日生效修订——目标、单位、类型、排期
   同日同源，禁止「目标取修订、单位/类型/排期取 item 现值」的混用。
   固定夹具：单位 杯→毫升 的未来日期修订、binary→quantity 类型修订、daily→quota
   排期修订（正反向）、跳过/完成/连击透传。只读投影：不换算既有事件单位。 */

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-today-fact-"));
const previousTimeZone = process.env.TZ;
process.env.TZ = "Asia/Shanghai";

for (const filename of ["date-keys.ts", "model.ts", "record-step.ts", "quota.ts", "rules.ts", "features/today-fact.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const {buildTodayItemFact} = require(path.join(outputRoot, "features", "today-fact.js"));

const TODAY = new Date(2026, 8, 7, 9);

const item = (overrides = {}) => ({
    id: "water",
    name: "喝水",
    icon: "cup",
    kind: "quantity",
    target: 2,
    unit: "杯",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [],
    archivePeriods: [],
    ...overrides,
});

const event = (localDate, value, unit, overrides = {}) => ({
    id: `${localDate}-${value}`,
    itemId: "water",
    occurredAt: `${localDate}T04:00:00.000Z`,
    localDate,
    value,
    unit,
    source: "manual",
    ...overrides,
});

const store = (events = []) => ({version: 2, items: [], events, eventTombstones: []});
const fact = (habit, events, streak) => {
    const data = store(events);
    data.items = [habit];
    return buildTodayItemFact({item: habit, date: TODAY, store: data, streak});
};

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("unit A to B revision: target and unit both come from the same-day revision", () => {
        /* 未来生效的修订把单位改成毫升：今日（09-07）仍生效 09-01 的「杯/2」口径。
           item 级现值已同步为最新修订（毫升/500），投影不得混用。 */
        const habit = item({
            target: 500,
            unit: "毫升",
            revisions: [
                {effectiveDate: "2026-09-01", kind: "quantity", target: 2, unit: "杯", schedule: {type: "daily"}},
                {effectiveDate: "2026-09-10", kind: "quantity", target: 500, unit: "毫升", schedule: {type: "daily"}},
            ],
        });
        const events = [event("2026-09-07", 1, "杯")];
        const result = fact(habit, events, 3);
        assert.equal(result.target, 2, "today target comes from the effective revision");
        assert.equal(result.unit, "杯", "today unit comes from the same revision, not the item value");
        assert.equal(result.progress, 1, "existing events keep their own unit, no conversion");
        assert.equal(result.completed, false);
        assert.equal(result.streak, 3);
        assert.equal(result.quota, undefined);
        assert.equal(result.atMost, undefined);
    });

    check("kind revision drives the atMost breach rule for the day", () => {
        /* item 现值 binary、当日修订 quantity：破戒按「不超过上限」判，1/2 未破戒。 */
        const habit = item({
            kind: "binary",
            direction: "atMost",
            target: 2,
            unit: "杯",
            revisions: [{effectiveDate: "2026-09-01", kind: "quantity", target: 2, unit: "杯", schedule: {type: "daily"}}],
        });
        const withinCap = fact(habit, [event("2026-09-07", 1, "杯")]);
        assert.equal(withinCap.atMost.breached, false, "1 of cap 2 is kept under the revised kind");
        const overCap = fact(habit, [event("2026-09-07", 3, "杯")]);
        assert.equal(overCap.atMost.breached, true, "3 exceeds cap 2");
        assert.equal(overCap.completed, false, "over cap is not complete");
        const silent = fact(habit, []);
        assert.equal(silent.atMost.breached, false);
        assert.equal(silent.completed, true, "binary-like zero-event abstinence day still completes via isComplete");
    });

    check("quota revision surfaces the period quota even when the item schedule is stale", () => {
        const habit = item({
            schedule: {type: "daily"},
            revisions: [{effectiveDate: "2026-09-01", kind: "quantity", target: 1, unit: "次", schedule: {type: "quota", quota: {period: "month", amount: 3, countMode: "dates"}}}],
        });
        const result = fact(habit, [event("2026-09-01", 1, "次"), event("2026-09-02", 1, "次"), event("2026-09-07", 1, "次")]);
        assert.equal(result.quota.amount, 3, "quota amount comes from the effective revision");
        assert.equal(result.quota.contributed, 3);
        assert.equal(result.completed, true, "quota completion is the model's verdict");
    });

    check("a stale item-level quota does not leak into a daily-revision day", () => {
        const habit = item({
            schedule: {type: "quota", quota: {period: "week", amount: 5, countMode: "dates", weekStartsOn: 1}},
            target: 1,
            unit: "次",
            kind: "quantity",
            revisions: [{effectiveDate: "2026-09-01", kind: "quantity", target: 1, unit: "次", schedule: {type: "daily"}}],
        });
        const result = fact(habit, [event("2026-09-07", 1, "次")]);
        assert.equal(result.quota, undefined, "the effective daily revision has no quota facet");
        assert.equal(result.completed, true);
    });

    check("skip today is surfaced without touching progress or completion semantics", () => {
        const habit = item();
        const skipped = fact(habit, [event("2026-09-07", 1, "杯", {kind: "skip"})]);
        assert.equal(skipped.skippedToday, true);
        assert.equal(skipped.progress, 0, "skip events contribute no progress");
        assert.equal(skipped.completed, false);
        const done = fact(habit, [event("2026-09-07", 2, "杯")]);
        assert.equal(done.skippedToday, false);
        assert.equal(done.completed, true);
    });

    console.log(`Today fact revision caliber: ${checks} checks passed.`);
} finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
    fs.rmSync(outputRoot, {recursive: true, force: true});
}
