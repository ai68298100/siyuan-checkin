const fs = require("fs");
let c = fs.readFileSync("tests/api-v5.test.cjs", "utf8");
const q = String.fromCharCode(39);
const a = "    console.log(" + q + "API v5 read-only and batch-plan checks passed." + q + ");";
const b = [
    "    /* longest 全历史扫描:createdDate 起逐日状态遍历,有 36500 步护栏。 */",
    "    const longestStart = process.hrtime.bigint();",
    "    const longestMap = model.computeLongestStreaks(perfStore);",
    "    const longestMs = Number(process.hrtime.bigint() - longestStart) / 1e6;",
    "    assert.ok(typeof longestMap.get(" + q + "read" + q + ") === " + q + "number" + q + ", \"longest projection must be numeric\");",
    "    assert.ok(longestMs < 2000, `computeLongestStreaks over a 26-year window must stay under 2000ms (took ${Math.round(longestMs)}ms)`);",
    "",
    a,
].join("\n");
if (c.split(a).length !== 2) { console.error("anchor"); process.exit(1); }
c = c.replace(a, b);
fs.writeFileSync("tests/api-v5.test.cjs", c);
console.log("longest perf gate added");
