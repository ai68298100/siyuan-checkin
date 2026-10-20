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
assert.match(
    indexSource,
    /if \(revision\.kind === "binary"\) \{[\s\S]*?if \(direction === "atMost"\) \{[\s\S]*?const hasLapsed = getEventsForDay\(this\.store, item\.id, actionDate\)\.some\(\(e\) => !isSkipEvent\(e\)\);[\s\S]*?return fail\("already-complete"\);[\s\S]*?\} else if \(isComplete\(this\.store, item, actionDate\)\) \{[\s\S]*?return fail\("already-complete"\);/,
    "T-1786: index recordExternalEvent aligns binary complete and atMost lapse gate",
);

/* 断言 4：幂等回显与外部写入均对齐 recentRecord 回执与撤销对象 */
assert.match(
    indexSource,
    /if \(existing\) \{[\s\S]*?this\.setRecentRecord\(\{[\s\S]*?eventId: existing\.id,[\s\S]*?itemId: current\.id,/,
    "T-1786: recordEvent aligns recentRecord when returning existing event",
);
assert.match(
    indexSource,
    /if \(existing\) \{[\s\S]*?this\.setRecentRecord\(\{[\s\S]*?eventId: existing\.id,[\s\S]*?itemId: item\.id,/,
    "T-1786: recordExternalEvent aligns recentRecord when returning existing event",
);
assert.match(
    indexSource,
    /private async recordExternalEvent[\s\S]*?this\.setRecentRecord\(\{[\s\S]*?eventId: event\.id,[\s\S]*?itemId: item\.id,/,
    "T-1786: recordExternalEvent updates recentRecord on successful write",
);

/* ---------------------------------------------------------
   动态行为与跨入口一致性模拟验证
   --------------------------------------------------------- */
const ts = require("typescript");
const os = require("node:os");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-write-idempotency-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};

for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model-helpers.ts", "model.ts"]) {
    fs.writeFileSync(
        path.join(dir, filename.replace(/\.ts$/, ".js")),
        ts.transpileModule(fs.readFileSync(path.join(sourceRoot, filename), "utf8"), {compilerOptions}).outputText
    );
}

const model = require(path.join(dir, "model.js"));

const parseDateKey = (key) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)), 12);
const today = model.dateKey(new Date());
const moment = {occurredAt: `${today}T08:00:00.000Z`, localDate: today};
const actionDate = parseDateKey(today);

const testItemBinaryNormal = model.normalizeItem({
    id: "item-normal",
    name: "晨跑",
    kind: "binary",
    target: 1,
    unit: "次",
    direction: "atLeast",
    schedule: {type: "daily"},
    createdAt: `${today}T00:00:00.000Z`,
    updatedAt: `${today}T00:00:00.000Z`,
    createdDate: today,
});

const testItemBinaryAtMost = model.normalizeItem({
    id: "item-atmost",
    name: "戒糖",
    kind: "binary",
    target: 1,
    unit: "次",
    direction: "atMost",
    schedule: {type: "daily"},
    createdAt: `${today}T00:00:00.000Z`,
    updatedAt: `${today}T00:00:00.000Z`,
    createdDate: today,
});

// 提取并模拟 recordExternalEvent 的核心判定函数
function simulateRecordExternalGate(store, item, value, actionMoment) {
    const actionDateObj = parseDateKey(actionMoment.localDate);
    const revision = model.getItemRevisionForDate(item, actionDateObj);
    const direction = model.getItemDirectionForDate(item, actionDateObj);
    if (revision.kind === "binary") {
        if (direction === "atMost") {
            const hasLapsed = model.getEventsForDay(store, item.id, actionDateObj).some((e) => !model.isSkipEvent(e));
            if (hasLapsed) return {ok: false, reason: "already-complete"};
        } else if (model.isComplete(store, item, actionDateObj)) {
            return {ok: false, reason: "already-complete"};
        }
    }
    return {ok: true};
}

let mockStore = model.createDefaultStore();
mockStore.items = [testItemBinaryNormal, testItemBinaryAtMost];

// 1. 普通二值项目：未完成时可写，完成后阻断
assert.equal(simulateRecordExternalGate(mockStore, testItemBinaryNormal, 1, moment).ok, true);
mockStore = model.appendEvents(mockStore, [{
    id: "e-normal-1",
    itemId: testItemBinaryNormal.id,
    value: 1,
    unit: "次",
    source: "api",
    occurredAt: moment.occurredAt,
    localDate: moment.localDate,
}]);
const blockedNormal = simulateRecordExternalGate(mockStore, testItemBinaryNormal, 1, moment);
assert.equal(blockedNormal.ok, false);
assert.equal(blockedNormal.reason, "already-complete");

// 2. 戒除二值项目：零事件（守住中）时首次破戒可写
assert.equal(simulateRecordExternalGate(mockStore, testItemBinaryAtMost, 1, moment).ok, true);

// 写入首次破戒事实
mockStore = model.appendEvents(mockStore, [{
    id: "e-atmost-1",
    itemId: testItemBinaryAtMost.id,
    value: 1,
    unit: "次",
    source: "api",
    externalRef: "agent:req-123",
    occurredAt: moment.occurredAt,
    localDate: moment.localDate,
}]);

// 再次尝试破戒：必须被阻断
const blockedAtMost = simulateRecordExternalGate(mockStore, testItemBinaryAtMost, 1, moment);
assert.equal(blockedAtMost.ok, false);
assert.equal(blockedAtMost.reason, "already-complete");

// 3. 携带相同 externalRef 再次查询：命中幂等去重返回已有事件
const found = mockStore.events.find((e) => e.itemId === testItemBinaryAtMost.id && e.externalRef === "agent:req-123");
assert.ok(found);
assert.equal(found.id, "e-atmost-1");

console.log("write-idempotency-unified: all assertions passed");
