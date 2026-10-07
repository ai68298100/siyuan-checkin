const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "scripts/t1650-browser-benchmark.cjs"), "utf8");
assert.match(script, /T1650_EVENT_COUNT/);
assert.match(script, /250_000/);
assert.match(script, /bundleBytes/);
assert.match(script, /pageErrors/);
assert.match(script, /metrics/);
assert.match(script, /methodology/);

const reportPath = process.env.T1650_REPORT
    ? path.resolve(process.env.T1650_REPORT)
    : path.join(root, ".artifacts", "t1650-browser-benchmark.json");
if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    assert.equal(report.task, "T-1650");
    assert.ok(Number.isInteger(report.fixture?.events) && report.fixture.events > 0, "report must record a positive event count");
    assert.ok(Number.isInteger(report.fixture?.insightsDays) && report.fixture.insightsDays === 366, "report must retain the 366-day fixture");
    assert.ok(Number.isInteger(report.bundleBytes?.js) && report.bundleBytes.js > 0, "report must record JS bytes");
    assert.ok(Number.isInteger(report.bundleBytes?.css) && report.bundleBytes.css > 0, "report must record CSS bytes");
    assert.ok(Array.isArray(report.pageErrors) && report.pageErrors.length === 0, "report must expose page errors without hiding them");
    for (const key of ["insights", "review", "dualRoot"]) {
        assert.ok(report.metrics?.[key], `report must include ${key} metrics`);
        assert.ok(Array.isArray(report.metrics[key].samples) && report.metrics[key].samples.length === 5, `${key} must retain five samples`);
    }
    if (report.reportSchema === 1) {
        assert.equal(report.metrics.review.label, `review-${report.fixture.events}`, "versioned report review label must match the fixture scale");
    }
}
console.log(`T-1650 report contract checks passed: optional event scale, bundle fields, metrics and page-error schema${fs.existsSync(reportPath) ? " (report validated)" : " (no opt-in report present)"}.`);
