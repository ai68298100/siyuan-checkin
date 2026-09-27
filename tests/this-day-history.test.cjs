/* T-1493「X 年前的今天」守门：同月日往年聚合（打卡计数+去重名称+溢出、事项锚点）、
   年份降序与有界、当前年不计入、非法输入 fail-closed、确定性；外加接线与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-this-day-"));
fs.writeFileSync(path.join(dir, "this-day-history.js"), ts.transpileModule(read("src/features/this-day-history.ts"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
const td = require(path.join(dir, "this-day-history.js"));

const items = [
    {id: "water", name: "喝水"},
    {id: "read", name: "阅读"},
    {id: "run", name: "跑步"},
    {id: "gone", name: "已删项目"},
];
const events = [
    {itemId: "water", localDate: "2024-09-27", value: 1},
    {itemId: "read", localDate: "2024-09-27", value: 30},
    {itemId: "water", localDate: "2025-09-27", value: 1},
    {itemId: "water", localDate: "2025-09-26", value: 1},
    {itemId: "read", localDate: "2025-09-27", value: 0},
    {itemId: "run", localDate: "2026-09-27", value: 1},
];
const occasions = [
    {name: "在一起", date: "2023-09-27", enabled: true},
    {name: "今天开始不算", date: "2026-09-27", enabled: true},
];

const history = td.buildThisDayHistory(events, items, occasions, "2026-09-27");
/* 年份降序、当前年不计入。 */
assert.deepEqual(history.monthDay, "09-27");
assert.deepEqual(history.entries.map((entry) => entry.year), [2025, 2024, 2023], "entries descend by year and skip the current year");
/* 2025：仅完成计数（value>0），同项目去重。 */
const y2025 = history.entries[0];
assert.equal(y2025.kind, "checkin");
assert.equal(y2025.completedCount, 1, "zero-value events are not completions");
assert.deepEqual([...y2025.itemNames], ["喝水"]);
/* 2024：两个项目名 + 计数 2。 */
const y2024 = history.entries[1];
assert.equal(y2024.completedCount, 2);
assert.deepEqual([...y2024.itemNames], ["喝水", "阅读"]);
/* 2023：事项锚点条目。 */
const y2023 = history.entries[2];
assert.equal(y2023.kind, "occasion");
assert.equal(y2023.occasionName, "在一起");

/* 有界：maxYears/maxNames 与溢出计数。 */
const manyEvents = [];
for (let year = 2020; year <= 2025; year += 1) {
    for (const [index, item] of items.entries()) manyEvents.push({itemId: item.id, localDate: `${year}-09-27`, value: 1});
}
const bounded = td.buildThisDayHistory(manyEvents, items, occasions, "2026-09-27", {maxYears: 2});
assert.deepEqual(bounded.entries.map((entry) => entry.year), [2025, 2024], "maxYears caps the window");
const crowded = td.buildThisDayHistory([{itemId: "water", localDate: "2025-09-27", value: 1}, {itemId: "read", localDate: "2025-09-27", value: 1}, {itemId: "run", localDate: "2025-09-27", value: 1}, {itemId: "gone", localDate: "2025-09-27", value: 1}], items, [], "2026-09-27", {maxNames: 2});
assert.deepEqual([...crowded.entries[0].itemNames], ["喝水", "阅读"], "names cap at maxNames in event order");
assert.equal(crowded.entries[0].overflow, 2, "overflow counts the hidden names");
/* 未知项目 id 不产生名称、不误计 overflow 之外的行为。 */
const unknownOnly = td.buildThisDayHistory([{itemId: "ghost", localDate: "2025-09-27", value: 1}], items, [], "2026-09-27");
assert.equal(unknownOnly.entries[0].completedCount, 1);
assert.deepEqual([...unknownOnly.entries[0].itemNames], []);
/* fail-closed 与确定性。 */
assert.deepEqual(td.buildThisDayHistory(events, items, occasions, "bad-date").entries, []);
assert.deepEqual(td.buildThisDayHistory(events, items, occasions, "2026-02-30").entries, []);
assert.deepEqual(td.buildThisDayHistory(events, items, occasions, "2026-09-27"), td.buildThisDayHistory(events, items, occasions, "2026-09-27"));
/* 纯度。 */
const moduleSource = read("src/features/this-day-history.ts");
assert.equal((moduleSource.match(/^import /gm) || []).length, 0, "module stays dependency-free");
assert.ok(!/Date\.now|new Date\(/.test(moduleSource), "no clock reads");

/* —— 接线：今日页卡片、横幅之后、宿主只读日记定位、双语。 —— */
const fragmentsSource = read("src/render/fragments.ts");
assert.match(fragmentsSource, /renderThisDayHistoryView\(ctx\.store, ctx\.occasionStore, now\)/, "today view embeds the this-day card");
assert.match(fragmentsSource, /if \(!history\.entries\.length\) return "";/, "no history renders nothing");
assert.match(fragmentsSource, /data-action="this-day-jump"/, "entries expose the read-only diary jump");
const bindSource = read("src/render/bind-today.ts");
assert.match(bindSource, /data-action='this-day-jump'/, "today bindings route the jump");
assert.match(bindSource, /openPastDiary\?\(pastDate: string\): void/, "host declares the optional past-diary callback");
const indexSource = read("src/index.ts");
assert.match(indexSource, /private async openPastDiary\(pastDate: string\): Promise<void>/, "host resolves past diaries");
assert.match(indexSource, /custom-dailynote-\$\{yyyymmdd\}/, "past diaries locate via the host-owned custom-dailynote ial");
assert.match(indexSource, /msg\.pastDiaryMissing/, "missing diaries degrade to a message (never create documents)");
const scss = read("src/ui/components.scss");
assert.match(scss, /\.lc-checkin__this-day /, "this-day card has styles");
const i18nSource = read("src/i18n.ts");
for (const key of ["today.thisDayTitle", "today.thisDayCheckin", "today.thisDayOverflow", "today.thisDayOccasion", "today.thisDayJump", "today.thisDayJumpAria", "msg.pastDiaryMissing"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}

console.log("this-day history gates passed: aggregation/bounds/fail-closed/determinism/purity/today wiring/diary jump/i18n parity");
