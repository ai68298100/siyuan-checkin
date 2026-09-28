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

/* T-1551/T-1549 host 组职责拆分：我的专注工具（可操作）与给其他工具使用（只读状态）
   两节各自归位；Tomato 诊断双行合一、Task Horizon 双行合一（契约等待+提供方就绪同行共存）。 */
const zhDictT1551 = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enDictT1551 = i18nSource.slice(i18nSource.indexOf("const enUS"));
for (const key of ["set.hostMine", "set.hostForOthers"]) {
    assert.ok(zhDictT1551.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDictT1551.includes(`"${key}"`), `en dict missing ${key}`);
}
assert.match(settings, /data-host-section="mine"/, "我的专注工具分节在位（提供方选择/回退/待处理）");
assert.match(settings, /data-host-section="others"/, "给其他工具使用分节在位（API/Task Horizon/Agent 只读状态）");
assert.equal((settings.match(/data-contract-center="docktomato"/g) || []).length, 1, "Tomato 诊断与运行状态必须同行呈现（T-1549 去重）");
assert.equal((settings.match(/data-contract-center="taskhorizon"/g) || []).length, 1, "Task Horizon 契约与依赖必须同行呈现（T-1549 去重）");
assert.match(settings, /data-contract-center="taskhorizon" data-contract-state="waiting" data-dependency="taskhorizon" data-dependency-state="healthy"/, "同一行同时表达「消费端等待接入」与「我方提供方契约就绪」");
assert.ok(!settings.includes('data-source-category="external-contract"'), "旧 host 单一类别标签退役");
const hostSectionMine = settings.indexOf('data-host-section="mine"');
const hostSectionOthers = settings.indexOf('data-host-section="others"');
const providerSelectIndex = settings.indexOf("data-setting-focus-timer");
const apiRowIndex = settings.indexOf('data-contract-center="api"');
assert.ok(providerSelectIndex > hostSectionMine && providerSelectIndex < hostSectionOthers, "专注提供方选择必须归入「我的专注工具」");
assert.ok(apiRowIndex > hostSectionOthers, "公开 API 契约必须归入「给其他工具使用」");

console.log("dependency status gates passed: 3 deps unified, buckets explicit, recovery hints bilingual");
