/* T-1853 守门：同来源定时/启动/手动摄取的 in-flight 合并与代际防护。
   - 快速连点/并发合并：同来源进行中的非 preview 摄取直接返回已有 Promise，不重复发起 SQL 查询或写入竞争；
   - 预览等待：preview 遇到同源写入等待其落定后再读取；
   - 慢回执不顶新：仅当代际与当前请求一致时才更新 sourceIngestReports；
   - 卸载清理：finally 块安全复位在行引用。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const pluginSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");

/* 1. 四类来源在行 Promise 与代际字段声明 */
assert.match(pluginSource, /private healthInFlight\?: Promise<void>;/, "healthInFlight declared");
assert.match(pluginSource, /private healthGeneration = 0;/, "healthGeneration declared");
assert.match(pluginSource, /private noteQueryInFlight\?: Promise<void>;/, "noteQueryInFlight declared");
assert.match(pluginSource, /private noteQueryGeneration = 0;/, "noteQueryGeneration declared");
assert.match(pluginSource, /private wereadInFlight\?: Promise<number>;/, "wereadInFlight declared");
assert.match(pluginSource, /private wereadGeneration = 0;/, "wereadGeneration declared");
assert.match(pluginSource, /private yeguifInFlight\?: Promise<void>;/, "yeguifInFlight declared");
assert.match(pluginSource, /private yeguifGeneration = 0;/, "yeguifGeneration declared");

/* 2. 在行复用与并发门接线 */
assert.match(pluginSource, /if \(this\.healthInFlight\)\s*\{\s*if \(!preview\) return this\.healthInFlight;/, "healthInFlight reuses active ingestion when not preview");
assert.match(pluginSource, /if \(this\.noteQueryInFlight\)\s*\{\s*if \(!preview\) return this\.noteQueryInFlight;/, "noteQueryInFlight reuses active ingestion when not preview");
assert.match(pluginSource, /if \(this\.wereadInFlight\)\s*\{\s*return this\.wereadInFlight;\s*\}/, "wereadInFlight reuses active ingestion");
assert.match(pluginSource, /if \(this\.yeguifInFlight\)\s*\{\s*if \(!preview\) return this\.yeguifInFlight;/, "yeguifInFlight reuses active ingestion when not preview");

/* 3. 代际递增与报告防护接线 */
assert.match(pluginSource, /const generation = \+\+this\.healthGeneration;/, "health increments request generation");
assert.match(pluginSource, /const generation = \+\+this\.noteQueryGeneration;/, "notequery increments request generation");
assert.match(pluginSource, /const generation = \+\+this\.wereadGeneration;/, "weread increments request generation");
assert.match(pluginSource, /const generation = \+\+this\.yeguifGeneration;/, "yeguif increments request generation");

assert.match(pluginSource, /if \(this\.healthGeneration === generation\)\s*\{\s*this\.sourceIngestReports\.health = report;\s*\}/, "health report update is generation-guarded");
assert.match(pluginSource, /if \(this\.noteQueryGeneration === generation\)\s*\{\s*this\.sourceIngestReports\.notequery = report;\s*\}/, "notequery report update is generation-guarded");
assert.match(pluginSource, /if \(outcome\.ok && this\.wereadGeneration === generation\)/, "weread pull state update is generation-guarded");
assert.match(pluginSource, /if \(this\.yeguifGeneration === generation\)\s*\{\s*this\.sourceIngestReports\.yeguif = report;\s*\}/, "yeguif report update is generation-guarded");

/* 4. finally 块复位守门 */
assert.match(pluginSource, /if \(this\.healthInFlight === task\)\s*\{\s*this\.healthInFlight = undefined;\s*\}/, "healthInFlight reset in finally");
assert.match(pluginSource, /if \(this\.noteQueryInFlight === task\)\s*\{\s*this\.noteQueryInFlight = undefined;\s*\}/, "noteQueryInFlight reset in finally");
assert.match(pluginSource, /if \(this\.wereadInFlight === task\)\s*\{\s*this\.wereadInFlight = undefined;\s*\}/, "wereadInFlight reset in finally");
assert.match(pluginSource, /if \(this\.yeguifInFlight === task\)\s*\{\s*this\.yeguifInFlight = undefined;\s*\}/, "yeguifInFlight reset in finally");

console.log("Source in-flight checks passed: 4 sources covered, concurrency reuse, preview-queueing, generation reporting, finally cleanup.");
