/* T-1768 守门：Agent 二值戒除项目首次破戒记录一致性（D-337）。
   风险路径（2026-09-30 审计）：agent-capabilities 对所有二值项用 isComplete 拦截——
   atMost 二值零破戒时模型按"守住"判完成，Agent 首次破戒被"今天已经完成"错误阻断；
   而 index 记录器已按当日真实事件判断首次破戒。修复后契约：
   - Agent 首次破戒可写、重复输入不双计（按当日真实事件拦截）；
   - 普通二值仍按完成阻断；数值型戒除沿用进度上限口径；
   - 成功输出说明"破戒"的真实含义（守住中断，连击重新开始）；
   - 保存失败零事实（recordEvent 失败返回错误，store 不变）；
   - index 记录器同口径由结构断言钉住（getItemDirectionForDate 门）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-agent-lapse-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const done = new Set();
const transpileTo = (relPath) => {
    const key = relPath.replace(/\\/g, "/");
    if (done.has(key)) return;
    done.add(key);
    const source = fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8");
    const target = path.join(dir, key.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions}).outputText);
    const imports = source.match(/from "(\.[^"]+)"/g) || [];
    for (const match of imports) {
        const base = path.posix.join(path.posix.dirname(key), match.slice(6, -1));
        for (const candidate of [`${base}.ts`, path.posix.join(base, "index.ts")]) {
            if (fs.existsSync(path.join(__dirname, "..", "src", candidate))) transpileTo(candidate);
        }
    }
};
transpileTo("agent-capabilities.ts");
const model = require(path.join(dir, "model.js"));
const agentCapabilities = require(path.join(dir, "agent-capabilities.js"));

const today = model.dateKey(new Date());
const moment = {occurredAt: `${today}T09:00:00.000Z`, localDate: today};
const itemBase = (id, name, direction, kind = "binary") => model.normalizeItem({
    id,
    name,
    icon: "🚭",
    kind,
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: `${today}T08:00:00.000Z`,
    updatedAt: `${today}T08:00:00.000Z`,
    createdDate: today,
    ...(direction === "atMost" ? {direction} : {}),
});
const lapseEvent = (itemId) => ({
    id: `e-${itemId}-${Math.random().toString(36).slice(2, 8)}`,
    itemId,
    occurredAt: `${today}T10:00:00.000Z`,
    localDate: today,
    value: 1,
    unit: "次",
    source: "api",
});

/* deps mock：recordEvent 复刻 index 记录器的方向门（同口径），经真实 appendEvents 落库。 */
const makeDeps = () => {
    const state = {store: model.createDefaultStore()};
    const capabilities = new Map();
    const recordGateBlocked = (item, actionDate) => {
        const revision = model.getItemRevisionForDate(item, actionDate);
        if (revision.kind !== "binary") return false;
        if (model.getItemDirectionForDate(item, actionDate) === "atMost") {
            return model.getEventsForDay(state.store, item.id, actionDate).some((event) => !model.isSkipEvent(event));
        }
        return model.isComplete(state.store, item, actionDate);
    };
    const deps = {
        addCapability: (options) => capabilities.set(options.name, options),
        getStore: () => state.store,
        getOccasionStore: () => ({occasions: []}),
        canRecord: () => true,
        cloneItem: (item) => JSON.parse(JSON.stringify(item)),
        revisionFingerprint: (item, date) => JSON.stringify(model.getItemRevisionForDate(item, date)),
        enqueueMutation: (fn) => fn(),
        recordEvent: async (item, value, momentArg, fingerprint, note) => {
            const actionDate = new Date(Number(momentArg.localDate.slice(0, 4)), Number(momentArg.localDate.slice(5, 7)) - 1, Number(momentArg.localDate.slice(8, 10)), 12);
            if (recordGateBlocked(item, actionDate)) return undefined;
            const event = lapseEvent(item.id);
            const next = model.appendEvents(state.store, [event]);
            if (next === state.store) return undefined;
            state.store = next;
            return event;
        },
        setOccasionCompleted: async () => true,
        getSummaryContext: () => ({totalEvents: 0, completedItems: 0, scheduledItems: 0, items: []}),
        getCustomSummaryContext: () => undefined,
        createItem: async () => {},
        createOccasion: async () => {},
    };
    agentCapabilities.registerAgentCapabilities(deps);
    const handler = capabilities.get("checkin-record-event").handler;
    return {deps, state, handler, capabilities};
};

const actionDate = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)), 12);

(async () => {
    /* —— 场景 1：atMost 二值首次破戒可写，输出说明真实含义。 —— */
    const atMost = makeDeps();
    atMost.state.store = {...atMost.state.store, items: [itemBase("quit", "戒烟", "atMost")]};
    const first = await atMost.handler({itemId: "quit"});
    assert.equal(first.error, undefined, "the first lapse is recordable through the agent");
    assert.ok(first.result.includes("破戒"), "the result explains that a lapse was recorded");
    const eventsAfterFirst = model.getEventsForDay(atMost.state.store, "quit", actionDate);
    assert.equal(eventsAfterFirst.length, 1, "exactly one event was written");

    /* —— 场景 2：重复输入不双计。 —— */
    const second = await atMost.handler({itemId: "quit"});
    assert.ok(second.error && second.error.includes("破戒"), "a second lapse attempt is rejected");
    assert.equal(model.getEventsForDay(atMost.state.store, "quit", actionDate).length, 1, "no double counting");

    /* —— 场景 3：普通二值完成后仍阻断；未完成可写。 —— */
    const normal = makeDeps();
    normal.state.store = {...normal.state.store, items: [itemBase("read", "晨读", undefined)]};
    const normalFirst = await normal.handler({itemId: "read"});
    assert.equal(normalFirst.error, undefined, "an incomplete normal binary item is recordable");
    const normalSecond = await normal.handler({itemId: "read"});
    assert.ok(normalSecond.error && normalSecond.error.includes("已经完成"), "a completed normal binary item stays blocked");

    /* —— 场景 4：数值型戒除沿用进度口径（上限内可记、达上限不再由二值门拦截口径改变）。 —— */
    const countAtMost = makeDeps();
    countAtMost.state.store = {...countAtMost.state.store, items: [itemBase("coffee", "咖啡", "atMost", "count")]};
    const countFirst = await countAtMost.handler({itemId: "coffee"});
    assert.equal(countFirst.error, undefined, "count abstinence items keep the progress-based semantics");

    /* —— 场景 5：保存失败零事实。 —— */
    const failing = makeDeps();
    failing.state.store = {...failing.state.store, items: [itemBase("quit2", "戒酒", "atMost")]};
    failing.deps.recordEvent = async () => undefined;
    const failed = await failing.handler({itemId: "quit2"});
    assert.ok(failed.error, "a failed write reports an error");
    assert.equal(model.getEventsForDay(failing.state.store, "quit2", actionDate).length, 0, "no facts are written on failure");

    /* Agent 建项失败也必须返回稳定回执，不能把宿主路径/原始异常泄露给模型。 */
    const createFailure = makeDeps();
    createFailure.deps.createItem = async () => { throw new Error("C:\\secret\\workspace\nwrite denied"); };
    const createFailed = await createFailure.capabilities.get("checkin-create-item").handler({name: "失败建项"});
    assert.equal(createFailed.error, "打卡项保存失败，请稍后重试。", "create failure uses a stable localized error");
    assert.ok(!createFailed.error.includes("secret"), "create failure does not expose host details");

    /* —— 场景 6：index 记录器同口径结构钉住（今日卡/渲染块与 Agent 一致的门）。 —— */
    const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
    assert.match(indexSource, /getItemDirectionForDate\(current, actionDate\) === "atMost"/, "the host recorder uses the same per-day at-most gate");

    console.log("agent-lapse: all assertions passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
