/* T-1345 外部依赖状态可观察性守门：番茄钟 / Task Horizon / 智能体三类外部依赖
   在设置页使用统一的 data-dependency 钩子、状态分桶与恢复提示；新增 keys 双语对等。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");

const settings = fs.readFileSync("src/render/settings.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");

/* 三类依赖全部使用统一钩子，且各自保留旧专属钩子兼容既有测试与用户脚本。 */
assert.match(settings, /data-focus-provider-state="\$\{diagnosticState\}" data-dependency="docktomato" data-dependency-state="\$\{tomatoDependencyState\}"/, "tomato row must carry the unified hook and keep its legacy hook");
assert.match(settings, /data-agent-state="\$\{ctx\.agentCapability\.state\}" data-dependency="agent" data-dependency-state="\$\{agentDependencyState\}"/, "agent row must carry the unified hook and keep its legacy hook");
assert.match(settings, /data-dependency="taskhorizon" data-dependency-state="healthy"/, "taskhorizon row must expose provider readiness");

/* 状态分桶：healthy / degraded / error 三态，映射表显式。 */
assert.match(settings, /const dependencyBucket = /, "state bucketing must go through one helper");
assert.match(settings, /dependencyBucket\(\["ready", "running", "paused"\], \["incompatible-version", "incomplete-api", "missing-capabilities", "error"\]/, "tomato states must map explicitly");
assert.match(settings, /dependencyBucket\(\["registered"\], \["failed"\]/, "agent states must map explicitly");
assert.match(settings, /lc-checkin__dependency-recovery/, "recovery hints must share one class");

/* 状态值可被读屏感知。 */
const statusCells = settings.match(/data-dependency=[\s\S]*?role="status"/g) || [];
assert.ok(statusCells.length >= 3, "each dependency row must expose role=\"status\"");

/* 恢复/重试提示与 Task Horizon 行的双语文案齐备。 */
const zhDict = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enDict = i18nSource.slice(i18nSource.indexOf("const enUS"));
for (const key of ["set.tomatoRecovery", "set.agentRecovery", "set.thTitle", "set.thHint", "set.thStatus", "set.thRecovery"]) {
    assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
}

/* Task Horizon 行不得冒充运行时握手状态：必须是「我方提供方就绪」口径。 */
assert.match(settings, /\$\{t\("set\.thStatus"\)\}/, "taskhorizon status must come from the static provider-ready key");
assert.ok(!settings.includes("thConnected"), "must not claim a runtime consumer connection that does not exist");

console.log("dependency status gates passed: 3 deps unified, buckets explicit, recovery hints bilingual");
