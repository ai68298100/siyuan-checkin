const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-coaching-"));
process.env.TZ = "Asia/Shanghai";
for (const filename of ["model.ts", "quota.ts", "rules.ts", "features/insights.ts", "features/coaching.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const {buildHabitInsights} = require(path.join(outputRoot, "features", "insights.js"));
const {buildCoachingSuggestions} = require(path.join(outputRoot, "features", "coaching.js"));
const item = {id: "reading", name: "阅读", icon: "📖", kind: "duration", target: 20, unit: "分钟", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", revisions: [], archivePeriods: []};
const event = (date, value = 20) => ({id: date, itemId: "reading", occurredAt: `${date}T01:00:00.000Z`, localDate: date, value, unit: "分钟", source: "manual"});
const store = (events) => ({version: 2, items: [item], events, eventTombstones: []});
const report = (events) => buildHabitInsights(store(events), "reading", {days: 14, asOf: new Date(2026, 8, 7, 12)});

const low = buildCoachingSuggestions(report([event("2026-09-01")]));
assert.equal(low.some((suggestion) => suggestion.id === "reduce-friction"), true);
assert.equal(low.every((suggestion) => suggestion.evidence.length > 0), true);

const partial = buildCoachingSuggestions(report([event("2026-09-07", 5)]));
assert.equal(partial.some((suggestion) => suggestion.id === "finish-today"), true);

const freshItem = {...item, createdDate: "2026-09-07"};
const baseline = buildCoachingSuggestions(buildHabitInsights({version: 2, items: [freshItem], events: [], eventTombstones: []}, "reading", {days: 14, asOf: new Date(2026, 8, 7, 12)}));
assert.deepEqual(baseline.map((suggestion) => suggestion.id), ["build-baseline", "start-today"]);

console.log("Local coaching suggestions: 3 checks passed.");
fs.rmSync(outputRoot, {recursive: true, force: true});
