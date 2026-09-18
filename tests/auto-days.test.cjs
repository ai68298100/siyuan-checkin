const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-auto-days-"));
for (const filename of ["types.ts", "rules.ts"]) {
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(sourceRoot, filename), "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const rules = require(path.join(outputRoot, "rules.js"));

const weekly3 = {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}};
const weeklyValue = {type: "quota", quota: {period: "week", amount: 10, countMode: "value"}};
const monthly2 = {type: "quota", quota: {period: "month", amount: 2, countMode: "dates"}};
const event = (id, day, value = 1, kind) => ({
    id, itemId: "w", occurredAt: `${day}T01:00:00.000Z`, localDate: day, value, unit: "次",
    source: "manual", ...(kind ? {kind} : {}),
});

/* 周一~周三完成后，当期剩余日（周四~周日）推导 AUTO。 */
const auto = rules.deriveQuotaAutoDays(
    weekly3,
    [event("a", "2026-09-14"), event("b", "2026-09-15"), event("c", "2026-09-16")],
    "w", "2026-09-14", "2026-09-20", {asOf: "2026-09-20"},
);
assert.deepEqual([...auto].sort(), ["2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"], "post-completion days of a satisfied week become AUTO");

/* asOf 裁剪：不推导到 asOf 之后。 */
const clipped = rules.deriveQuotaAutoDays(
    weekly3,
    [event("a", "2026-09-14"), event("b", "2026-09-15"), event("c", "2026-09-16")],
    "w", "2026-09-14", "2026-09-20", {asOf: "2026-09-18"},
);
assert.deepEqual([...clipped].sort(), ["2026-09-17", "2026-09-18"], "asOf clips future AUTO days");

/* 配额未达成 → 无 AUTO。 */
const incomplete = rules.deriveQuotaAutoDays(
    weekly3,
    [event("a", "2026-09-14"), event("b", "2026-09-15")],
    "w", "2026-09-14", "2026-09-20", {asOf: "2026-09-20"},
);
assert.equal(incomplete.size, 0, "unsatisfied quota derives nothing");

/* skip 事件不计入配额贡献；有真实事件的日期不产出 AUTO。 */
const mixed = rules.deriveQuotaAutoDays(
    weekly3,
    [
        event("a", "2026-09-14"),
        event("b", "2026-09-15"),
        event("s", "2026-09-16", 1, "skip"),
        event("d", "2026-09-17"),
        event("e", "2026-09-20"),
    ],
    "w", "2026-09-14", "2026-09-20", {asOf: "2026-09-20"},
);
assert.equal(mixed.has("2026-09-16"), false, "skip day is not an AUTO candidate (skip wins)");
assert.equal(mixed.has("2026-09-20"), false, "real completion dates never become AUTO");
assert.ok(mixed.has("2026-09-18") && mixed.has("2026-09-19"), "days after the third real completion derive AUTO");

/* value 模式：累计值达成后推导。 */
const valueMode = rules.deriveQuotaAutoDays(
    weeklyValue,
    [event("a", "2026-09-14", 4), event("b", "2026-09-16", 6)],
    "w", "2026-09-14", "2026-09-20", {asOf: "2026-09-20"},
);
assert.deepEqual([...valueMode].sort(), ["2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"], "value quota met on 09-16 derives the rest of the week");

/* 月度配额跨月窗口。 */
const monthly = rules.deriveQuotaAutoDays(
    monthly2,
    [event("a", "2026-09-01"), event("b", "2026-09-02")],
    "w", "2026-09-01", "2026-09-30", {asOf: "2026-09-30"},
);
assert.equal(monthly.size, 28, "monthly quota met on day 2 leaves 28 AUTO days");
assert.equal(monthly.has("2026-09-30"), true);
assert.equal(monthly.has("2026-08-31"), false);

/* 非 quota 排期与非法窗口安全返回空。 */
assert.equal(rules.deriveQuotaAutoDays({type: "daily"}, [event("a", "2026-09-14")], "w", "2026-09-14", "2026-09-20").size, 0);
assert.equal(rules.deriveQuotaAutoDays(weekly3, [], "w", "bad", "2026-09-20").size, 0);

console.log("Auto derivation checks passed: satisfied-period windows, asOf clipping, skip/real-event precedence, value mode, monthly spans and safe fallbacks.");
