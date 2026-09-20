/* T-1253 智能体接入状态守门：设置页那一行必须区分「宿主不支持 / 还没注册 / 注册中断 / 已注册 N 项」，
   并把注册与存储读取解耦——存储读取失败曾让整段注册被跳过，界面却显示成「未检测到可用的思源智能体入口」，
   把用户引向完全错误的方向。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const projectRoot = path.join(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");

function loadSettings() {
    const output = ts.transpileModule(read("src/render/settings.ts"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
        fileName: "src/render/settings.ts",
    }).outputText;
    const module = {exports: {}};
    vm.runInContext(output, vm.createContext({
        module,
        exports: module.exports,
        require: (specifier) => {
            const stubs = {
                "../i18n": {t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key)},
                "../shared": {escapeHtml: (value) => String(value)},
                "../ui/labels": {SORT_LABELS: {manual: "sort.manual"}},
                "../version": {PLUGIN_VERSION: "test-version"},
                "../features/docktomato-inbox": {},
            };
            if (!Object.prototype.hasOwnProperty.call(stubs, specifier)) throw new Error(`settings.ts 依赖未预期: ${specifier}`);
            return stubs[specifier];
        },
        console,
    }), {filename: "src/render/settings.ts"});
    return module.exports;
}

const baseContext = {
    store: {items: [], events: []},
    auditEntries: [],
    snapshots: [],
    customIconLibrary: [],
    agentCapability: {state: "pending", count: 0},
    appearance: "system",
    reducedMotion: false,
    hapticFeedback: true,
    focusTimerProvider: "builtin",
    focusTimerAdapterCount: 0,
    focusTimerAdapterIds: [],
    focusTimerBusy: false,
    palette: "lavender",
    todayGroupMode: "none",
    todaySortMode: "manual",
    completedCollapsed: false,
    weekStripVisible: true,
    dialogSizeMode: "auto",
    dialogScale: 90,
    dialogFixedSize: {width: 1000, height: 760},
    dialogHasCustomFrame: false,
    resolvedAppearanceValue: "light",
};

const settings = loadSettings();
const agentRow = (state, count, error) => {
    const html = settings.renderSettingsView({...baseContext, agentCapability: {state, count, error}});
    /* T-1345 统一依赖钩子后，data-agent-state 之后可跟 data-dependency* 属性。 */
    const match = html.match(/<div class="lc-checkin__settings-row" data-agent-state="([^"]+)"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(match, `设置页必须渲染 data-agent-state 行（state=${state}）`);
    return {state: match[1], body: match[2]};
};

{
    const row = agentRow("registered", 11);
    assert.equal(row.state, "registered");
    assert.match(row.body, /set\.agentOn:\{"count":11\}/, "已注册必须报出能力数量");
    assert.ok(row.body.includes("set.agentWhere"), "已注册时要给出在思源侧核对的位置");
    assert.ok(!row.body.includes("set.agentOff"), "不得再使用含糊的「未检测到」文案");
}
{
    const row = agentRow("registered", 0);
    assert.match(row.body, /set\.agentOnUnknown/, "宿主未回传能力标识时不能谎报数量");
}
{
    const row = agentRow("unsupported", 0);
    assert.match(row.body, /set\.agentUnsupported/, "旧宿主必须单独说明");
    assert.ok(!row.body.includes("set.agentWhere"), "未注册时不应给出核对位置");
}
{
    const row = agentRow("failed", 3, "boom");
    assert.match(row.body, /set\.agentFailed:\{"error":"boom"\}/, "注册中断要带原因");
    assert.ok(row.body.includes("role=\"status\""), "状态值要有 role=status 供读屏识别");
}
{
    const row = agentRow("pending", 0);
    assert.match(row.body, /set\.agentPending/, "初始化未完成要说成稍后自动注册");
}

const indexSource = read("src/index.ts");
/* 注册时机：必须在存储读取的 try/catch 之后，仍受 disposed 守卫保护。 */
const failBranch = indexSource.indexOf('showMessage(t("msg.dataLoadFail"');
const registerCall = indexSource.indexOf("this.registerSiYuanAgentCapability();", failBranch);
assert.ok(failBranch > 0, "未找到存储读取失败分支");
assert.ok(registerCall > failBranch, "智能体注册不得放在存储成功的分支里（存储失败也要注册入口）");
assert.match(indexSource.slice(failBranch, registerCall), /if \(this\.disposed \|\| this\.disposing\) return;/, "注册前仍要遵守拆除守卫");
assert.match(indexSource, /if \(typeof plugin\.addAgentCapability !== "function"\) \{\s*\/\*[\s\S]{0,120}?\*\/\s*this\.agentCapabilityState = "unsupported";\s*return;/, "宿主不支持时要落到 unsupported 状态");
assert.match(indexSource, /const id = plugin\.addAgentCapability\?\.\(options\);\s*if \(typeof id === "string"\) ids\.push\(id\);/, "必须回收宿主返回的能力 id");
assert.match(indexSource, /this\.agentCapabilityError = String\(error instanceof Error \? error\.message : error\);\s*this\.agentCapabilityState = "failed";/, "抛错要留下原因并置为 failed");
assert.match(indexSource, /if \(this\.agentCapabilityState !== "pending"/, "重复调用不得二次注册");

/* 字典双语齐全，且旧键彻底退役。 */
const i18nSource = read("src/i18n.ts");
const keys = ["set.agentOn", "set.agentOnUnknown", "set.agentUnsupported", "set.agentFailed", "set.agentPending", "set.agentWhere"];
for (const key of keys) {
    assert.equal([...i18nSource.matchAll(new RegExp(`"${key}":`, "g"))].length, 2, `${key} 必须在中英字典各出现一次`);
}
assert.equal(i18nSource.includes('"set.agentOff"'), false, "set.agentOff 必须随旧文案一起移除");
assert.match(i18nSource, /"set\.agentOn": "已向思源智能体注册 \{count\} 项能力"/, "中文文案要带数量占位符");
assert.match(i18nSource, /"set\.agentOn": "Registered \{count\} capabilities/, "英文文案要带同一占位符");

console.log("Agent status checks passed: 4 states rendered distinctly, registration decoupled from storage load, i18n keys parity.");
