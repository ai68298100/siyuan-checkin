/* T-1354 CSS 卫生门禁：维护态硬约束——
   1) dist/index.css 不允许出现源码无字面引用的死类（动态 is-/has-/数字后缀单独归类待人工核对）；
   2) 重复规则体积受护栏约束（esbuild 已合并大部分，超出即回归）。
   预算数字（D-242）：硬阻断 640KB；620KB 以上打警告。 */
const assert = require("node:assert/strict");
const {cssAudit} = require("../scripts/css-audit.cjs");

const result = cssAudit();
assert.equal(result.dead.length, 0, `CSS 出现源码无引用的死类，先人工核对再清理：\n${result.dead.join("\n")}`);
assert.ok(result.duplicateRuleBytes < 10000, `duplicate rule volume regressed (~${result.duplicateRuleBytes} bytes)`);
assert.ok(result.bytes <= 640 * 1024, `CSS ${result.bytes} bytes exceeds the D-242 hard budget of ${640 * 1024} bytes`);
if (result.bytes > 620 * 1024) {
    console.log(`warning: CSS ${result.bytes} bytes is above the 620KB soft line — clean up before adding more styles`);
}
console.log(`CSS hygiene checks passed: ${result.total} class tokens, 0 dead, duplicates ~${result.duplicateRuleBytes} bytes, size ${result.bytes} bytes (budget 620KB warn / 640KB hard)`);
