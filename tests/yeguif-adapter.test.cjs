/* T-1457 叶归 LifeLog 适配器守门：Marker 解析（行首时间/全半角冒号/类型备注拆分/
   非法时间 fail-closed）、结算（相邻起始差/末条开放不记/同分钟跳过/确定性）、
   身份与注册表兼容、偏好归一（内联）、宿主全触点（轮询 SQL/幂等/墓碑/省电门/
   焦点补拉/防伪造/来源枚举）、设置结构、i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-yeguif-"));
fs.mkdirSync(path.join(dir, "src", "features"), {recursive: true});
const transpile = (relative, target) => {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    fs.writeFileSync(path.join(dir, target || relative.replace(/\.ts$/, ".js")), ts.transpileModule(source, {compilerOptions}).outputText);
};
transpile("src/types.ts");
transpile("src/api-contract.ts");
transpile("src/ecosystem.ts");
transpile("src/features/yeguif-adapter.ts");
const adapter = require(path.join(dir, "src/features/yeguif-adapter.js"));
const ecosystem = require(path.join(dir, "src/ecosystem.js"));

/* Marker 解析：三种官方形态 + 类型/备注拆分。 */
assert.deepEqual(adapter.parseYeguifMarker("20260925120000-abc", "12:00 工作"), {blockId: "20260925120000-abc", startMinutes: 720, type: "工作", text: ""}, "无备注形态");
assert.deepEqual(adapter.parseYeguifMarker("b0000002", "12:00 工作：写日报").text, "写日报", "全角冒号拆备注");
assert.deepEqual(adapter.parseYeguifMarker("b0000003", "12:00:00 工作：写日报").startMinutes, 720, "秒级时间兼容");
assert.equal(adapter.parseYeguifMarker("b0000004", "  9:05 阅读").startMinutes, 545, "单数字小时");
assert.equal(adapter.parseYeguifMarker("b0000005", "没有时间开头"), undefined, "非 Marker 段落拒绝");
assert.equal(adapter.parseYeguifMarker("b0000006", "25:00 工作"), undefined, "非法小时 fail-closed");
assert.equal(adapter.parseYeguifMarker("b0000007", "12:00   "), undefined, "空类型拒绝");
assert.equal(adapter.parseYeguifMarker("bad id", "12:00 工作"), undefined, "非法块 ID 拒绝");
assert.equal(adapter.parseYeguifMarker("b0000008", "12:60 工作"), undefined, "非法分钟拒绝");

/* 结算：相邻起始差 + 末条开放不记 + 同分钟跳过 + 确定性。 */
const mk = (id, minutes, type, text) => ({blockId: id, startMinutes: minutes, type, text: text || ""});
const settled = adapter.settleYeguifEntries([mk("m1", 540, "工作", "a"), mk("m2", 600, "阅读", "b"), mk("m3", 600, "冥想"), mk("m4", 630, "跑步")], "2026-09-25");
assert.deepEqual(settled, [
    {blockId: "m1", localDate: "2026-09-25", minutes: 60, type: "工作", text: "a"},
    {blockId: "m3", localDate: "2026-09-25", minutes: 30, type: "冥想", text: ""},
], "60 分钟 + 同分钟零差跳过 + 末条开放不记（时长归属先开始的一条）");
assert.deepEqual(adapter.settleYeguifEntries([mk("m1", 540, "工作")], "2026-09-25"), [], "单条开放记录不记");
assert.deepEqual(adapter.settleYeguifEntries([mk("m1", 540, "工作")], "bad-date"), [], "非法日期 fail-closed");
const frozen = Object.freeze([Object.freeze(mk("f1", 0, "早")), Object.freeze(mk("f2", 30, "读"))]);
assert.equal(adapter.settleYeguifEntries(frozen, "2026-09-25").length, 1, "冻结输入安全");

/* 身份与注册表兼容 + 事件备注。 */
assert.equal(adapter.buildYeguifExternalRef("20260925120000-abc", "2026-09-25"), "yeguif:20260925120000-abc:2026-09-25");
assert.deepEqual(ecosystem.parseExternalRef(adapter.buildYeguifExternalRef("20260925120000-abc", "2026-09-25")), {prefix: "yeguif", identity: "20260925120000-abc", date: "2026-09-25"}, "ref 可被注册表解析");
assert.equal(ecosystem.isRegisteredExternalRefPrefix("yeguif"), true, "yeguif 前缀已登记");
assert.equal(adapter.buildYeguifExternalRef("", "2026-09-25"), "");
assert.equal(adapter.buildYeguifEventNote("工作", "写日报"), "工作：写日报");
assert.equal(adapter.buildYeguifEventNote("工作", ""), "工作");

/* 偏好归一（内联于 view-preferences）：Key 缺失/笔记本缺失不物化。 */
const vpCode = ts.transpileModule(fs.readFileSync(path.join(root, "src", "view-preferences.ts"), "utf8"), {compilerOptions}).outputText;
assert.match(vpCode, /yeguifIntegration = \{\s*enabled: yeguifSource\.enabled === true && Boolean\(yeguifItemId\) && Boolean\(yeguifNotebookId\)/, "enabled 需项目+笔记本齐备");
assert.match(vpCode, /yeguifIntegration: \{\s*enabled: false,\s*itemId: "",\s*notebookId: ""\s*\}/, "默认关闭");

/* 宿主全触点。 */
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /source: "yeguif", externalRef/, "写路径打 yeguif 来源");
assert.match(indexSource, /event\.source === "yeguif" && event\.externalRef === externalRef/, "块身份幂等守卫");
assert.match(indexSource, /tombstone\.source === "yeguif" && tombstone\.externalRef === externalRef/, "墓碑永不重写");
assert.ok((indexSource.match(/typeof document !== "undefined" && document\.hidden\) return/g) || []).length >= 3, "三大后台摄取均有不可见省电门");
assert.match(indexSource, /YEGUIF_INGEST_INTERVAL_MS/, "5 分钟有界轮询");
assert.match(indexSource, /content GLOB '\[0-9\]:\[0-9\]\[0-9\]\*' OR content GLOB '\[0-9\]\[0-9\]:\[0-9\]\[0-9\]\*'/, "SQL 以一位或两位小时的行首时间过滤");
assert.match(indexSource, /created >= '\$\{createdFloor\}'/, "只摄取当日新建块");
assert.match(indexSource, /void this\.ingestYeguif\(\);/, "回前台焦点补拉");
assert.match(indexSource, /box = '\$\{governance\.notebookId\}'/, "绑定笔记本范围");
const apiSource = fs.readFileSync(path.join(root, "src", "api.ts"), "utf8");
assert.match(apiSource, /input\.source === "yeguif" \? \{source: "api"/, "公开 API 防伪造");
const typesSource = fs.readFileSync(path.join(root, "src", "types.ts"), "utf8");
assert.match(typesSource, /"weread" \| "yeguif"/, "事件来源联合含 yeguif");
const frameworkSource = fs.readFileSync(path.join(root, "src", "features", "source-framework.ts"), "utf8");
const modelSource = fs.readFileSync(path.join(root, "src", "model.ts"), "utf8");
assert.ok((modelSource.match(/"yeguif"/g) || []).length >= 2, "model 归一与撤销白名单均含 yeguif");
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /\["yeguif", "source\.yeguif"\]/, "回顾来源过滤含 yeguif");
const privacySource = fs.readFileSync(path.join(root, "src", "features", "privacy-scope.ts"), "utf8");
assert.match(privacySource, /external\("yeguif", source\.yeguifIntegration\)/, "隐私控制面已接线");

/* 设置结构与双语。 */
const settingsSource = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
for (const hook of ["data-yeguif-integration", "data-yeguif-toggle", "data-yeguif-item", "data-yeguif-notebook", "load-yeguif-notebooks"]) {
    assert.ok(settingsSource.includes(hook), `设置面板必须包含 ${hook}`);
}
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["source.yeguif", "set.yeguifIntegration", "set.yeguifTitle", "set.yeguifHint", "set.yeguifToggle", "set.yeguifItem", "set.yeguifItemHint", "set.yeguifItemChoose", "set.yeguifNotebook", "set.yeguifNotebookHint", "set.yeguifNotebookChoose", "set.yeguifNotebookLoad", "set.yeguifNotebookLoading", "set.yeguifNotebookFailed", "set.yeguifNotebookPending", "set.stepsYeguif1", "set.stepsYeguif2", "set.stepsYeguif3", "set.stepsYeguif4", "msg.yeguifNeedConfig"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}
const msgSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
assert.match(msgSource, /msg\.yeguifNeedConfig/, "缺配置提示键在位");

console.log("yeguif adapter gates passed: marker parsing, settlement, identity/registry, inline normalize, host touchpoints (poll/idempotency/tombstone/visibility gate/anti-spoof), settings structure, i18n parity");
