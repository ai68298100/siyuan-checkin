/* T-1409 容错连续计数（maxGap）守门：缺省严格断链回归、容错桥接、缺口上限、缺口重置、
   SKIP 独立、at-most/quota 不叠加、归一化钳制、当前连续与历史最长同口径。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-streak-tolerance-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/types.ts", "src/rules.ts", "src/date-keys.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts"].forEach(transpile);
const model = require(path.join(outputRoot, "src/model.js"));

const AS_OF = new Date(2026, 8, 23, 12); /* 2026-09-23 周三，固定参考日。 */
const DAY = (day) => `2026-09-${String(day).padStart(2, "0")}`;
const makeItem = (overrides = {}) => model.normalizeItem({id: "read", name: "阅读", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00Z", createdDate: "2026-09-01", ...overrides});
const makeEvent = (day, overrides = {}) => ({id: `e-${day}`, itemId: "read", occurredAt: `${DAY(day)}T08:00:00Z`, localDate: DAY(day), value: 1, unit: "次", source: "manual", kind: "checkin", ...overrides});
const buildStore = (item, days) => model.normalizeStore({version: 3, items: [item], events: days.map((day) => makeEvent(day))});

/* 回归：无容错（缺省）时漏打排期日立即断链——历史行为不变。 */
const strict = makeItem();
const strictStore = buildStore(strict, [19, 20, 22]);
assert.equal(model.computeEventStreaks(strictStore, AS_OF).get("read"), 1, "without tolerance the missed 09-21 breaks the streak");
assert.equal(model.computeLongestStreaks(strictStore, AS_OF).get("read"), 2, "longest stays the historical 2-day run");

/* 容错 1：09-21 漏打被桥接，当前连续 = 22/20/19 三天（缺口不计数），历史最长同样桥接。 */
const tolerant = makeItem({streakTolerance: 1});
const tolerantStore = buildStore(tolerant, [19, 20, 22]);
assert.equal(model.computeEventStreaks(tolerantStore, AS_OF).get("read"), 3, "a 1-day gap inside tolerance keeps the streak alive without counting the gap");
assert.equal(model.computeLongestStreaks(tolerantStore, AS_OF).get("read"), 3, "longest uses the same tolerance semantics");

/* 缺口上限：容错 1 时连续漏 2 天在缺口 2 处断链。 */
const twoDayGap = buildStore(tolerant, [18, 22, 23]);
assert.equal(model.computeEventStreaks(twoDayGap, AS_OF).get("read"), 2, "two consecutive missed days exceed tolerance 1 and break before them");

/* 缺口重置：真实完成日重置缺口计数——容错 1 可桥接两段互不相邻的 1 天缺口。 */
const resetStore = buildStore(tolerant, [19, 21, 23]);
assert.equal(model.computeEventStreaks(resetStore, AS_OF).get("read"), 3, "each real completion resets the gap counter");

/* SKIP 独立：跳过日中性桥接、不消耗容错。22 真实 → 21 跳过 → 20 漏打（容错桥接）→ 19 真实
   → 18 漏打（容错桥接）→ 17 断链；若 SKIP 消耗容错则 20 处即断、结果为 1。 */
const skipStore = model.normalizeStore({
    version: 3,
    items: [tolerant],
    events: [makeEvent(19), makeEvent(21, {kind: "skip"}), makeEvent(22)],
});
assert.equal(model.computeEventStreaks(skipStore, AS_OF).get("read"), 2, "skip bridges neutrally without consuming tolerance");

/* at-most 不叠加：容错字段对戒除类无意义，沿用无破戒日语径（20 日破戒断链，21~23 无事件不断）。 */
const atMost = makeItem({id: "candy", name: "戒糖", direction: "atMost", streakTolerance: 5});
const atMostStore = model.normalizeStore({version: 3, items: [atMost], events: [{id: "lapse", itemId: "candy", occurredAt: `${DAY(20)}T08:00:00Z`, localDate: DAY(20), value: 1, unit: "次", source: "manual", kind: "checkin"}]});
assert.equal(model.computeEventStreaks(atMostStore, AS_OF).get("candy"), 3, "at-most keeps lapse semantics independent of tolerance");

/* 归一化钳制：仅物化 1~30 整数；0/负数/缺省不物化。 */
assert.equal("streakTolerance" in makeItem(), false, "default items do not materialize tolerance");
assert.equal(makeItem({streakTolerance: 31}).streakTolerance, 30, "clamped to 30");
assert.equal(makeItem({streakTolerance: 2.9}).streakTolerance, 2, "floored to integer");
assert.equal("streakTolerance" in makeItem({streakTolerance: 0}), false, "zero falls back to strict");
assert.equal("streakTolerance" in makeItem({streakTolerance: -3}), false, "negative rejected");

/* 写入路径接线：save-form 装配 + 编辑器字段 + i18n 双语 + quota 排除注记。 */
const saveFormSource = fs.readFileSync(path.join(__dirname, "..", "src/render/save-form.ts"), "utf8");
assert.match(saveFormSource, /streakToleranceDays/, "save path must read the tolerance input");
assert.match(saveFormSource, /streakTolerance >= 1 \? \{streakTolerance\}/, "save path materializes only 1-30");
const editorSource = fs.readFileSync(path.join(__dirname, "..", "src/render/editor.ts"), "utf8");
assert.match(editorSource, /name="streakToleranceDays"/, "editor advanced section must expose the tolerance input");
const modelSource = fs.readFileSync(path.join(__dirname, "..", "src/model.ts"), "utf8");
assert.match(modelSource, /schedule\.type === "quota"\) return 0/, "quota schedules must not stack tolerance");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src/i18n.ts"), "utf8");
for (const key of ["editor.streakToleranceLabel", "editor.streakToleranceOff", "editor.streakToleranceHint"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}

/* 消费方同口径：getStreaks 门面与今日徽章共用单一实现。 */
const apiSource = fs.readFileSync(path.join(__dirname, "..", "src/api.ts"), "utf8");
assert.match(apiSource, /computeEventStreaks\(host\.store, currentCalendarDate\(\)\)/, "API getStreaks rides the single implementation");
const helpersSource = fs.readFileSync(path.join(__dirname, "..", "src/model-helpers.ts"), "utf8");
assert.match(helpersSource, /computeEventStreaks\(store, currentCalendarDate\(\)\)/, "today badge rides the single implementation");

console.log("streak tolerance gates passed: strict default, bridge, cap, reset, skip independence, at-most/quota exclusion, clamping, single-path consumers, i18n parity");
