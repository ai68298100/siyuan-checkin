/* T-1416 · R-A4 渲染块一键插入预设测试：往返一致（每个预设围栏经真实
   parseCheckinBlockConfig 无错解析且 view 保持）、围栏格式、id/langKey 唯一、
   纯度审计；外加 index 插入通道与 dist i18n 契约守门。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-block-presets-"));
for (const filename of ["types.ts", "i18n.ts", "shared.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "model-helpers.ts", "features/record-notes.ts", "ui/labels.ts", "features/pace-projection.ts", "features/checkin-block.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read("src", filename), {compilerOptions}).outputText);
}
fs.writeFileSync(path.join(outputRoot, "features", "block-presets.js"), ts.transpileModule(read("src", "features", "block-presets.ts"), {compilerOptions}).outputText);
const bp = require(path.join(outputRoot, "features", "block-presets.js"));
const {parseCheckinBlockConfig} = require(path.join(outputRoot, "features", "checkin-block.js"));

/* —— 1. 描述符契约：4 个预设、id/langKey 唯一、langKey 与 dist i18n 契约对齐 —— */
assert.equal(bp.BLOCK_PRESETS.length, 4);
assert.deepEqual(bp.BLOCK_PRESETS.map((p) => p.id), ["summary", "month", "heatmap", "groups"]);
const ids = new Set(bp.BLOCK_PRESETS.map((p) => p.id));
assert.equal(ids.size, 4, "预设 id 唯一");
const langKeys = new Set(bp.BLOCK_PRESETS.map((p) => p.langKey));
assert.equal(langKeys.size, 4, "langKey 唯一");
const distContract = JSON.parse(fs.readFileSync(path.join(root, "i18n", "zh_CN.json"), "utf8"));
for (const key of langKeys) {
    assert.ok(key in distContract, `langKey ${key} 必须登记进 i18n/zh_CN.json（dist 契约）`);
}
/* toast 提示键走 src/i18n 全量字典（非 dist 契约），必须双语齐备。 */
const i18nSource = read("src", "i18n.ts");
for (const key of ["blockPresetInserted", "blockPresetNoEditor"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

/* —— 2. 往返一致：每个预设围栏经真实解析器无错解析且 view 不变 —— */
for (const preset of bp.BLOCK_PRESETS) {
    assert.equal(bp.validateBlockPresetRoundtrip(preset, parseCheckinBlockConfig), true, `预设 ${preset.id} 往返一致`);
    const markdown = bp.blockPresetMarkdown(preset);
    assert.ok(markdown.startsWith("```checkin\n"), "围栏开头格式");
    assert.ok(markdown.endsWith("\n```"), "围栏闭合");
    assert.ok(markdown.includes('"view"'), "配置含 view 字段");
    const result = parseCheckinBlockConfig(markdown.slice("```checkin\n".length, -"\n```".length));
    assert.equal(result.ok, true);
    assert.equal(result.config.view, preset.config.view);
}
/* 往返验证函数对坏预设必须拒绝（fail-closed：验证失败宁可拒绝插入）。 */
assert.equal(bp.validateBlockPresetRoundtrip({id: "summary", langKey: "x", config: {view: "summary"}}, (text) => text.includes("bogus") ? {ok: false} : {ok: true, config: {view: "summary"}}), true);
assert.equal(bp.validateBlockPresetRoundtrip({id: "summary", langKey: "x", config: {view: "today"}}, (text) => ({ok: true, config: {view: "month"}})), false, "view 被解析器篡改即拒绝");
assert.equal(bp.validateBlockPresetRoundtrip({id: "summary", langKey: "x", config: {view: "summary"}}, () => ({ok: false})), false, "解析失败即拒绝");

/* —— 3. getBlockPreset：命中与未命中 —— */
assert.equal(bp.getBlockPreset("month").id, "month");
assert.equal(bp.getBlockPreset("nope"), undefined);

/* —— 4. 纯度：零依赖 + 无时钟 —— */
const moduleSource = read("src", "features", "block-presets.ts");
assert.doesNotMatch(moduleSource, /^import /m, "预设模块保持零依赖（解析器经注入）");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

/* —— 5. 接线守门：index 命令注册 + 内核插入通道 + dist i18n 契约守门同步 —— */
const indexSource = read("src", "index.ts");
assert.match(indexSource, /for \(const preset of BLOCK_PRESETS\)/, "index 必须为每个预设注册命令");
assert.match(indexSource, /insertCheckinBlockPreset/, "宿主必须实现预设插入方法");
assert.match(indexSource, /\/api\/block\/insertBlock/, "插入必须走内核公开 insertBlock 通道");
assert.match(indexSource, /blockPreset\.noEditor/, "拿不到当前文档必须降级提示");
const releaseAssets = read("tests", "release-assets.test.cjs");
assert.match(releaseAssets, /blockPresetSummary/, "dist i18n 契约守门必须包含预设 langKey");

console.log("block-presets tests passed: 描述符契约/往返一致/围栏格式/纯度/接线守门 全部通过");
