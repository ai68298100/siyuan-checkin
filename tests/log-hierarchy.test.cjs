const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

process.env.TZ = "Asia/Shanghai";
const root = path.join(__dirname, "..");
const featureSource = fs.readFileSync(path.join(root, "src", "features", "checkin-log-hierarchy.ts"), "utf8");
const output = ts.transpileModule(featureSource, {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-log-"));
const modulePath = path.join(tempDir, "checkin-log-hierarchy.js");
fs.writeFileSync(modulePath, output, "utf8");
const {buildCheckinLogHierarchy} = require(modulePath);

const day = (date, count) => ({date, events: Array.from({length: count}, (_, index) => ({id: `${date}-${index}`}))});
const hierarchy = buildCheckinLogHierarchy([
    day("2026-09-08", 1),
    day("2026-08-31", 2),
    day("2026-09-19", 3),
    day("2026-09-01", 1),
    day("2026-09-13", 4),
    day("2026-09-15", 2),
    day("2026-09-18", 1),
]);

assert.deepEqual(hierarchy.map((month) => month.key), ["2026-09", "2026-08"], "months stay newest-first");
assert.deepEqual(hierarchy[0].weeks.map((week) => week.startDate), ["2026-09-14", "2026-09-07", "2026-08-31"], "weeks use Monday boundaries and stay newest-first");
assert.deepEqual(hierarchy[0].weeks[0].days.map((entry) => entry.date), ["2026-09-19", "2026-09-18", "2026-09-15"], "days stay newest-first inside a week");
assert.equal(hierarchy[0].dayCount, 6, "month exposes its exact visible-day count");
assert.equal(hierarchy[0].eventCount, 12, "month exposes its exact event count");
assert.equal(hierarchy[0].weeks[1].eventCount, 5, "week exposes its exact event count");
assert.equal(hierarchy[1].weeks[0].startDate, "2026-08-31", "a cross-month week is represented inside each owning month");
assert.equal(hierarchy[1].weeks[0].endDate, "2026-09-06");

const fragmentSource = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentSource, /const rowBatchSize = 6/);
assert.match(fragmentSource, /const dayBatchSize = 4/);
assert.match(fragmentSource, /class="lc-checkin__log-month"/);
assert.match(fragmentSource, /class="lc-checkin__log-week"/);
assert.match(fragmentSource, /monthIndex === 0 \? " open"/);
assert.match(fragmentSource, /weekIndex === 0 \? " open"/);
assert.match(fragmentSource, /offset \+ index === 0/);
assert.match(fragmentSource, /review\.logMoreItems/);
assert.match(fragmentSource, /review\.logMoreDays/);
assert.match(fragmentSource, /review\.logMoreEntries/);

const styles = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
assert.match(styles, /\.lc-checkin__log-month-body/);
assert.match(styles, /\.lc-checkin__log-week-body/);
assert.match(styles, /\.lc-checkin__log-more-body/);

console.log("Check-in log month/week/day hierarchy and bounded disclosure checks passed.");
