/* T-1736 切片守门：推荐草案预览与逐项应用 UI（D-372）。
   契约：renderWereadRecommendations 纯投影——唯一分钟项目绑定建议（含可读项目名）
   与阈值回归通用默认建议各带应用按钮（data-rec-apply 按 target 分发）；needs-choice
   不出应用按钮；已配置（enabled+绑定）不渲染草案；取消零写入（预览只读，唯一写入
   触发是应用点击）。渲染函数为轻量纯投影（deps 注入 t/escapeHtml），夹具直接驱动；
   settings/index 接线以结构钉固化。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-recommendation-ui-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(path.join(dir, "features", "recommendation-render.js"), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "features", "recommendation-render.ts"), "utf8"), {compilerOptions}).outputText);
const mod = require(path.join(dir, "features", "recommendation-render.js"));

const deps = {
    t: (key, params) => {
        const table = {
            "set.recBlockTitle": "推荐草案（未保存，应用后生效）",
            "set.recDurationItem": "阅读时长绑定到",
            "set.recThreshold": "提醒阈值回到通用默认",
            "set.recApply": "应用",
            "set.recNeedsChoice": "有 {n} 个分钟项目可选，请在下方手动选择",
            "set.wereadThresholdValue": "阈值 {n} 分钟",
        };
        let text = table[key] || key;
        if (params) for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
        return text;
    },
    escapeHtml: (value) => String(value).replace(/&/g, "&amp;"),
};

const items = [{id: "min-1", name: "阅读分钟", unit: "分钟", kind: "count", archived: false}];
const durationRec = (value, needsChoice) => ({candidates: [{key: "weread.duration", target: "wereadIntegration.itemId", value, evidence: "unique-minute-unit", reason: "rec.uniqueMinuteItem", ...(needsChoice ? {needsChoice: true, choiceCount: value} : {})}]});
const thresholdRec = (value) => ({candidates: [{key: "weread.threshold", target: "wereadIntegration.thresholdMinutes", value, evidence: "general-default", reason: "rec.generalThreshold"}]});
const weread = (itemId, thresholdMinutes) => ({enabled: false, itemId, thresholdMinutes});

/* —— 夹具 1：唯一分钟项目 + 阈值≠默认 → 两条草案（绑定行含可读名、阈值行）。 —— */
const both = mod.renderWereadRecommendations(items, weread("", 45), durationRec("min-1"), thresholdRec(30), deps);
assert.match(both, /data-rec-apply="wereadIntegration\.itemId"/, "the binding draft has an apply button");
assert.match(both, /阅读分钟/, "the binding draft shows the readable project name");
assert.match(both, /data-rec-apply="wereadIntegration\.thresholdMinutes"/, "the threshold draft has an apply button");
assert.match(both, /阈值 30 分钟/, "the threshold draft renders the general default value");

/* —— 夹具 2：needs-choice → 引导文案、无应用按钮。 —— */
const needsChoice = mod.renderWereadRecommendations(items, weread("", 45), durationRec("", true), thresholdRec(45), deps);
assert.match(needsChoice, /rec\.multipleMinuteItems|个分钟项目可选/, "needs-choice renders guidance");
assert.ok(!/data-rec-apply/.test(needsChoice), "needs-choice renders no apply button");

/* —— 夹具 3：已配置（enabled+绑定）→ 不渲染草案。 —— */
const configured = mod.renderWereadRecommendations(items, weread("min-1", 30), {candidates: []}, {candidates: []}, deps);
assert.ok(!configured.includes("data-rec-apply"), "a configured source renders no draft section");

/* —— 夹具 4：接线结构钉 + 红证对照（钉修复前提交 4e16ceb）。 —— */
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /renderWereadRecommendations\(ctx\.store\.items, weread/, "the settings view renders the draft section");
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
assert.match(indexSource, /\[data-rec-apply\]/, "the settings binder wires the apply buttons");
assert.match(indexSource, /itemId: value, enabled: Boolean\(value\) && getActiveItemById\(this\.store, value\) && this\.hasMinuteTarget\(value\)/, "apply goes through the user preference channel with the minute guard");
const preFixSettings = cp.execSync("git show 4e16ceb:src/render/settings.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixSettings, /renderWereadRecommendations/, "the pre-fix settings had no draft section (red evidence)");
const preFixIndex = cp.execSync("git show 4e16ceb:src/index.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixIndex, /\[data-rec-apply\]/, "the pre-fix index had no apply wiring (red evidence)");

/* —— 夹具 5：i18n 双语键在位。 —— */
const renderSource = fs.readFileSync(path.join(__dirname, "..", "src", "features", "recommendation-render.ts"), "utf8");
assert.match(renderSource, /data-rec-apply=/, "the renderer emits the apply buttons");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["set.recBlockTitle", "set.recDurationItem", "set.recThreshold", "set.recApply", "set.recNeedsChoice"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}

console.log("recommendation-ui: all assertions passed");
