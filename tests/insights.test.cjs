const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-insights-"));
const previousTimeZone = process.env.TZ;
process.env.TZ = "Asia/Shanghai";

for (const filename of ["model.ts", "quota.ts", "features/insights.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const {buildHabitInsights} = require(path.join(outputRoot, "features", "insights.js"));

function item(overrides = {}) {
    return {
        id: "reading",
        name: "Reading",
        icon: "book",
        kind: "duration",
        target: 20,
        unit: "minutes",
        schedule: {type: "daily"},
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
        createdDate: "2026-09-01",
        revisions: [],
        archivePeriods: [],
        ...overrides,
    };
}

function event(localDate, value = 20, overrides = {}) {
    return {
        id: `${localDate}-${value}`,
        itemId: "reading",
        occurredAt: `${localDate}T04:00:00.000Z`,
        localDate,
        value,
        unit: "minutes",
        source: "manual",
        ...overrides,
    };
}

function store(habit = item(), events = [], tombstones = []) {
    return {version: 2, items: [habit], events, eventTombstones: tombstones};
}

function report(data, date = new Date(2026, 8, 7, 9), days = 7) {
    return buildHabitInsights(data, "reading", {asOf: date, days});
}

function statuses(result) {
    return result.days.map((day) => day.status);
}

function deepFreeze(value) {
    if (value && typeof value === "object") {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
    }
    return value;
}

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("consecutive scheduled opportunities skip weekends and pending today", () => {
        const habit = item({schedule: {type: "workdays"}});
        const events = [1, 2, 3, 4].map((day) => event(`2026-09-0${day}`));
        const result = report(store(habit, events));
        assert.deepEqual(statuses(result), ["complete", "complete", "complete", "complete", "off", "off", "pending"]);
        assert.equal(result.currentStreak, 4);
        assert.equal(result.longestStreak, 4);
        assert.equal(result.streakScope, "window");
        assert.deepEqual(result.aggregates, {
            completedDays: 4, scheduledDays: 5,
            closedCompletedDays: 4, closedScheduledDays: 4,
            eligibleScheduledDays: 4, completionRate: 100,
        });
        assert.equal(result.days[6].closed, false);
        assert.equal(result.weeklyTrend.length, 2);
        assert.equal(result.weeklyTrend[0].startDate, "2026-08-31");
        assert.equal(result.weeklyTrend[0].endDate, "2026-09-06");
        assert.equal(result.weeklyTrend[0].observationStartDate, "2026-09-01");
        assert.equal(result.weeklyTrend[1].startDate, "2026-09-07");
        assert.equal(result.weeklyTrend[1].completionRate, null);
    });

    check("today partial preserves streak and only today complete enters rate denominator", () => {
        const habit = item({schedule: {type: "workdays"}});
        const events = [1, 2, 3, 4].map((day) => event(`2026-09-0${day}`));
        const partial = report(store(habit, [...events, event("2026-09-07", 10)]));
        assert.equal(partial.days[6].status, "partial");
        assert.equal(partial.currentStreak, 4);
        assert.equal(partial.aggregates.completionRate, 100);
        assert.equal(partial.aggregates.eligibleScheduledDays, 4);
        const complete = report(store(habit, [...events, event("2026-09-07")]));
        assert.equal(complete.currentStreak, 5);
        assert.equal(complete.aggregates.completedDays, 5);
        assert.equal(complete.aggregates.eligibleScheduledDays, 5);
        assert.equal(complete.aggregates.closedCompletedDays, 4);
    });

    check("past partial and missed opportunities break consecutive records", () => {
        const habit = item({schedule: {type: "workdays"}});
        const result = report(store(habit, [event("2026-09-01"), event("2026-09-02"), event("2026-09-03", 5), event("2026-09-04")]));
        assert.equal(result.currentStreak, 1);
        assert.equal(result.longestStreak, 2);
        assert.equal(result.aggregates.completionRate, 75);
        const missed = report(store(habit, [event("2026-09-01"), event("2026-09-02")]));
        assert.equal(missed.days[3].status, "missed");
        assert.equal(missed.currentStreak, 0);
        assert.equal(missed.longestStreak, 2);
    });

    check("history uses each revision target, unit and schedule with exclusive archive end", () => {
        const habit = item({
            kind: "quantity", target: 2, unit: "km", schedule: {type: "workdays"},
            revisions: [
                {effectiveDate: "2026-09-04", kind: "quantity", target: 2, unit: "km", schedule: {type: "workdays"}},
                {effectiveDate: "2026-09-01", kind: "duration", target: 20, unit: "minutes", schedule: {type: "daily"}},
            ],
            archivePeriods: [{startDate: "2026-09-02", endDate: "2026-09-03"}],
        });
        const result = report(store(habit, [
            event("2026-09-01"), event("2026-09-02"), event("2026-09-03"),
            event("2026-09-04", 2, {unit: "km"}),
            event("2026-09-07", 0.5, {unit: "km"}),
            event("2026-09-07", 100, {id: "old-unit", unit: "minutes", note: "<script>note</script>"}),
        ]));
        assert.deepEqual(statuses(result), ["complete", "unavailable", "complete", "complete", "off", "off", "partial"]);
        assert.equal(result.days[1].unavailableReason, "paused");
        assert.equal(result.days[2].target, 20);
        assert.equal(result.days[2].unit, "minutes");
        assert.equal(result.days[3].target, 2);
        assert.equal(result.days[3].unit, "km");
        assert.equal(result.days[6].progress, 0.5);
        assert.equal(result.currentStreak, 3);
        assert.equal(result.aggregates.closedScheduledDays, 3);
        assert.equal(result.aggregates.completionRate, 100);
        assert.deepEqual(result.totalsByUnit, [
            {unit: "minutes", value: 160, recordCount: 4},
            {unit: "km", value: 2.5, recordCount: 2},
        ]);
        assert.equal(result.records.at(-1).note, "<script>note</script>");
        assert.deepEqual(result.weeklyTrend[1].totalsByUnit, [
            {unit: "km", value: 0.5, recordCount: 1},
            {unit: "minutes", value: 100, recordCount: 1},
        ]);
    });

    check("alternating weekday schedules skip unplanned records for completion counts", () => {
        const habit = item({schedule: {type: "weekly", weekdays: [1, 3, 5]}});
        const result = report(store(habit, [event("2026-09-01"), event("2026-09-02"), event("2026-09-04"), event("2026-09-07")]));
        assert.deepEqual(statuses(result), ["off", "complete", "off", "complete", "off", "off", "complete"]);
        assert.equal(result.currentStreak, 3);
        assert.equal(result.aggregates.scheduledDays, 3);
        assert.equal(result.records.length, 4);
        assert.equal(result.totalsByUnit[0].value, 80);
    });

    check("not yet started and ongoing archives remain distinct without missed days", () => {
        const habit = item({createdDate: "2026-09-03", archivePeriods: [{startDate: "2026-09-05"}], archived: true});
        const result = report(store(habit, [event("2026-09-03"), event("2026-09-04")]));
        assert.equal(result.days[0].unavailableReason, "not-started");
        assert.equal(result.days[1].unavailableReason, "not-started");
        assert.equal(result.days[4].unavailableReason, "paused");
        assert.equal(result.days[6].unavailableReason, "paused");
        assert.equal(result.currentStreak, 2);
        assert.equal(result.aggregates.closedScheduledDays, 2);
    });

    check("fractional sums match targets without turning a zero record into completion", () => {
        const habit = item({kind: "quantity", target: 0.3});
        const result = report(store(habit, [event("2026-09-07", 0.1), event("2026-09-07", 0.2)]));
        assert.equal(result.days[6].progress, 0.3);
        assert.equal(result.days[6].status, "complete");
        assert.equal(result.totalsByUnit[0].value, 0.3);
        const zero = report(store(item({target: 1e-18}), [event("2026-09-06", 0), event("2026-09-07", 0)]));
        assert.equal(zero.days[5].status, "missed");
        assert.equal(zero.days[6].status, "pending");
        assert.equal(zero.currentStreak, 0);
        const tiny = report(store(item({target: 1e-18}), [event("2026-09-07", 1e-20)]));
        assert.equal(tiny.days[6].status, "partial");
    });

    check("stored local date wins over UTC timestamp and later travel timezone", () => {
        const record = event("2026-09-06", 20, {occurredAt: "2026-09-05T16:30:00.000Z"});
        for (const timezone of ["Asia/Shanghai", "UTC", "America/New_York"]) {
            process.env.TZ = timezone;
            const result = report(store(item(), [record]), new Date(2026, 8, 6, 0, 30));
            assert.equal(result.endDate, "2026-09-06");
            assert.equal(result.days[6].date, "2026-09-06");
            assert.equal(result.days[6].status, "complete");
            assert.equal(result.days[5].progress, 0);
        }
        process.env.TZ = "Asia/Shanghai";
    });

    check("calendar stepping stays consecutive through both DST changes", () => {
        process.env.TZ = "America/New_York";
        const habit = item({createdDate: "2026-01-01"});
        const spring = report(store(habit), new Date(2026, 2, 10, 0, 10));
        assert.deepEqual(spring.days.map((day) => day.date), ["2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"]);
        const autumn = report(store(habit), new Date(2026, 10, 3, 23, 50));
        assert.deepEqual(autumn.days.map((day) => day.date), ["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]);
        assert.equal(spring.weeklyTrend[1].startDate, "2026-03-09");
        assert.equal(autumn.weeklyTrend[1].startDate, "2026-11-02");
        process.env.TZ = "Asia/Shanghai";
    });

    check("window boundaries clamp size and streak is strictly within selected observations", () => {
        const habit = item({createdDate: "2026-01-01"});
        const data = store(habit, [event("2026-08-31"), ...[1, 2, 3, 4, 5, 6, 7, 8].map((day) => event(`2026-09-0${day}`))]);
        const result = report(data);
        assert.equal(result.startDate, "2026-09-01");
        assert.equal(result.endDate, "2026-09-07");
        assert.equal(result.currentStreak, 7);
        assert.equal(result.longestStreak, 7);
        assert.equal(result.records.length, 7);
        assert.equal(report(data, new Date(2026, 8, 7), 1).days.length, 7);
        assert.equal(report(data, new Date(2026, 8, 7), 1000).days.length, 366);
        assert.equal(report(data, new Date(2026, 8, 7), 7.9).days.length, 7);
        assert.equal(report(data, new Date(2026, 8, 7), NaN).days.length, 84);
        assert.equal(buildHabitInsights(data, "reading", {asOf: new Date(2026, 8, 7)}).days.length, 84);
        assert.throws(() => report(data, new Date("invalid")), RangeError);
    });

    check("empty data and a just-created item report no rate until an opportunity closes", () => {
        const missing = report({version: 2, items: [], events: [], eventTombstones: []});
        assert.equal(missing.item, null);
        assert.equal(missing.days.length, 7);
        assert.equal(missing.days.every((day) => day.status === "unavailable"), true);
        assert.equal(missing.aggregates.completionRate, null);
        assert.equal(missing.currentStreak, 0);
        assert.deepEqual(missing.records, []);
        assert.deepEqual(missing.totalsByUnit, []);
        const fresh = report(store(item({createdDate: "2026-09-07"})));
        assert.equal(fresh.days[6].status, "pending");
        assert.equal(fresh.aggregates.scheduledDays, 1);
        assert.equal(fresh.aggregates.eligibleScheduledDays, 0);
        assert.equal(fresh.aggregates.completionRate, null);
    });

    check("event tombstones and external identities stay removed from insights", () => {
        const events = [
            event("2026-09-07", 20, {id: "removed"}),
            event("2026-09-07", 20, {id: "replayed", source: "api", externalRef: "same-session"}),
            event("2026-09-07", 5, {id: "retained"}),
            event("2026-09-07", 20, {id: "other-item", itemId: "other"}),
        ];
        const tombstones = [
            {eventId: "removed", deletedAt: "2026-09-07T05:00:00.000Z"},
            {eventId: "original", deletedAt: "2026-09-07T05:00:00.000Z", itemId: "reading", source: "api", externalRef: "same-session"},
        ];
        const result = report(store(item(), events, tombstones));
        assert.equal(result.days[6].progress, 5);
        assert.deepEqual(result.records.map((record) => record.id), ["retained"]);
    });

    check("report and nested results are detached from the original store", () => {
        const habit = item({
            schedule: {type: "weekly", weekdays: [1]},
            revisions: [{effectiveDate: "2026-09-01", kind: "duration", unit: "minutes", target: 20, schedule: {type: "weekly", weekdays: [1]}}],
            archivePeriods: [{startDate: "2026-09-02", endDate: "2026-09-03"}],
        });
        const data = deepFreeze(store(habit, [event("2026-09-07", 20, {note: "original"})]));
        const before = JSON.stringify(data);
        const result = report(data);
        result.item.name = "changed";
        result.item.schedule.weekdays.push(4);
        result.item.revisions[0].schedule.weekdays.push(2);
        result.item.archivePeriods[0].endDate = "2026-09-06";
        result.records[0].note = "changed";
        result.days[6].events[0].value = 100;
        assert.equal(JSON.stringify(data), before);
    });

    console.log(`Habit insights: ${checks} checks passed.`);
} finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
    fs.rmSync(outputRoot, {recursive: true, force: true});
}
