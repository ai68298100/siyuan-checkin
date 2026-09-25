/* T-1463 · R-A15 跨午夜双日归账边界守门（证据补强，streak v2.0 参照场景）：
   时长来源在午夜边界的切段与「双日都计数」、恰好零点结束、yeguif 开放末条不记、
   身份含 localDate 使双日计数天然幂等。纯函数回放，不触宿主。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-midnight-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/types.ts", "src/rules.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts", "src/features/reminder-preferences.ts", "src/features/first-success.ts", "src/date-keys.ts", "src/features/view-scope.ts", "src/view-preferences.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/source-framework.ts", "src/features/sireader-adapter.ts", "src/features/health-inbox.ts", "src/features/weread-adapter.ts", "src/features/siplayer-adapter.ts", "src/features/yeguif-adapter.ts"].forEach(transpile);
const adapter = require(path.join(outputRoot, "src/features/siplayer-adapter.js"));
const yeguif = require(path.join(outputRoot, "src/features/yeguif-adapter.js"));
const {settleSegmentsToDays, normalizeSourceGovernance} = require(path.join(outputRoot, "src/features/source-framework.js"));

const MIN = 60_000;
const DAY1 = Date.UTC(2026, 8, 24); /* 2026-09-24 */
const DAY2 = DAY1 + 24 * 60 * MIN;
const toLocalDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const nextMidnight = (ms) => {
    const at = new Date(ms);
    return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + 1);
};
const makeTracker = () => new adapter.SiplayerPlaybackTracker({toLocalDate, nextMidnight, sampleIntervalMs: 15 * MIN});

/* —— 1. 恰好零点结束：整段归入第一日，第二日从零点起另计（双日都计数，互不吞并）。 —— */
const boundary = makeTracker();
boundary.sample(true, DAY1 + 23 * 60 * MIN + 45 * MIN);
const atMidnight = boundary.sample(true, DAY2);
assert.deepEqual(atMidnight, [{localDate: "2026-09-24", minutes: 15}], "span ending exactly at midnight settles to the first day");
const afterMidnight = boundary.sample(false, DAY2 + 15 * MIN);
assert.deepEqual(afterMidnight, [{localDate: "2026-09-25", minutes: 15}], "the post-midnight slice settles to the second day");
assert.deepEqual([boundary.dayTotal("2026-09-24"), boundary.dayTotal("2026-09-25")], [15, 15], "both days keep their own accumulated total");

/* —— 2. 双日归账 × 幂等身份：同日重复结算是 no-op，两日身份不同（双日计数不重复记账）。 —— */
const ref1 = adapter.buildSiplayerExternalRef("drama", "2026-09-24");
const ref2 = adapter.buildSiplayerExternalRef("drama", "2026-09-25");
assert.notEqual(ref1, ref2, "daily identities differ across the midnight boundary");
const governance = normalizeSourceGovernance({enabled: true, thresholdValue: 10, itemIds: ["drama"]});
const settlement = settleSegmentsToDays(
    ["2026-09-24", "2026-09-25"].map((localDate) => ({externalRef: adapter.buildSiplayerExternalRef("drama", localDate), localDate, value: localDate === "2026-09-24" ? boundary.dayTotal("2026-09-24") : boundary.dayTotal("2026-09-25")})),
    governance,
    [ref1],
);
const writable = settlement.days.filter((day) => day.qualifies);
assert.deepEqual(writable.map((day) => day.localDate), ["2026-09-25"], "already-written day is idempotent-skipped; the other day still settles");
assert.equal(settlement.invalidSegmentCount, 0, "no segment is rejected at the midnight boundary");

/* —— 3. yeguif：末条开放不记——23:00 后的时长属于次日文档，当日不预支。 —— */
const day1Entries = yeguif.settleYeguifEntries([
    {blockId: "20260924220000", startMinutes: 22 * 60, type: "阅读", text: ""},
    {blockId: "20260924230000", startMinutes: 23 * 60, type: "工作", text: "写日报"},
], "2026-09-24");
assert.deepEqual(day1Entries, [{blockId: "20260924220000", localDate: "2026-09-24", minutes: 60, type: "阅读", text: ""}], "only the marker with a successor settles; the open last marker is not credited");
assert.equal(yeguif.settleYeguifEntries([{blockId: "20260924230000", startMinutes: 23 * 60, type: "工作", text: ""}], "2026-09-24").length, 0, "a lone open marker records nothing (宁少记)");
assert.notEqual(yeguif.buildYeguifExternalRef("20260924230000", "2026-09-24"), yeguif.buildYeguifExternalRef("20260924230000", "2026-09-25"), "block identity is date-scoped: the same marker time on two days stays distinct");

console.log("midnight boundary guard tests passed.");
