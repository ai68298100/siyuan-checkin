const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1786 守门测试：API/Agent/快速入口写入幂等、失败回执与首次破戒统一（D-390）。
   1. Agent checkin-record-item 能力支持 requestId 字段，入队时映射为 agent:<requestId> 幂等键；
   2. index.ts 的 recordEvent 支持 externalRef 幂等去重——已存在同身份事件直接回显事实，杜绝重复写入；
   3. 戒除类（atMost）首次破戒允许写入，多次破戒拦截重复；普通二值项目已完成直接拦截。 */

const sourceRoot = path.join(__dirname, "..", "src");

/* 断言 1：Agent 能力 schema 与映射钉 */
const agentSource = fs.readFileSync(path.join(sourceRoot, "agent-capabilities.ts"), "utf8");
assert.match(
    agentSource,
    /requestId: \{type: "string", maxLength: 128, description: "可选幂等请求 ID，防止网络重试导致重复记账"\}/,
    "T-1786: agent schema exposes requestId property",
);
assert.match(
    agentSource,
    /`agent:\$\{args\.requestId\.trim\(\)\.slice\(0, 128\)\}`/,
    "T-1786: agent handler formats externalRef with agent: prefix",
);

/* 断言 2：index.ts recordEvent 幂等性与身份支持 */
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
assert.match(
    indexSource,
    /private async recordEvent\(item: CheckinItem, value: number, moment: ActionMoment, expectedRevisionFingerprint\?: string, note\?: string, attachment\?: string, externalRef\?: string\): Promise<CheckinEvent \| undefined>/,
    "T-1786: recordEvent accepts externalRef parameter",
);
assert.match(
    indexSource,
    /if \(externalRef\) \{[\s\S]*?const existing = this\.store\.events\.find\(\(event\) => event\.itemId === current\.id && event\.externalRef === externalRef\);[\s\S]*?if \(existing\) \{[\s\S]*?return \{\.\.\.existing\};/,
    "T-1786: recordEvent returns existing event when externalRef matches (idempotency)",
);
assert.match(
    indexSource,
    /const source: CheckinEvent\["source"\] = externalRef\?\.startsWith\("agent:"\) \? "api" : "manual";/,
    "T-1786: event source is attributed appropriately for agent requests",
);

/* 断言 3：破戒与完成统一口径在 Agent 与 index 的一致性 */
assert.match(
    agentSource,
    /if \(revision\.kind === "binary" && dayAtMost[\s\S]*?getEventsForDay\(deps\.getStore\(\), item\.id, actionDate\)\.some\(\(event\) => !isSkipEvent\(event\)\)\)/,
    "T-1786: agent checks real lapse event before blocking atMost binary items",
);
assert.match(
    indexSource,
    /if \(revision\.kind === "binary" && \(getItemDirectionForDate\(current, actionDate\) === "atMost"[\s\S]*?\? getEventsForDay\(this\.store, current\.id, actionDate\)\.some\(\(event\) => !isSkipEvent\(event\)\)/,
    "T-1786: index recordEvent checks real lapse event before blocking atMost binary items",
);

console.log("write-idempotency-unified: all assertions passed");
