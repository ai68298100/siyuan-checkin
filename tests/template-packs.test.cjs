/* T-1454 场景组合包守门：预览投影（引用解析/未知名降级/新旧分类/本地化比对）、
   目录数据完整性（5 个包引用全部可解析）、编辑器接线与结构、i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-template-packs-"));
fs.writeFileSync(path.join(dir, "template-packs.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "template-packs.ts"), "utf8"), {compilerOptions}).outputText);
const packs = require(path.join(dir, "template-packs.js"));

const catalog = [
    {name: "喝水", icon: "💧", kind: "quantity", target: 2000, unit: "毫升"},
    {name: "阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟"},
    {name: "写作", icon: "✒", kind: "duration", target: 30, unit: "分钟"},
];
const localizeName = (name) => (name === "喝水" ? "Drink water" : name);

/* 引用解析 + 新旧分类 + 本地化显示名。 */
const preview = packs.buildTemplatePackPreview(["喝水", "阅读", "写作"], catalog, ["Drink water"], {localizeName});
assert.equal(preview.entries.length, 3);
assert.equal(preview.entries[0].name, "Drink water");
assert.equal(preview.entries[0].status, "duplicate", "本地化名与现有项目比对判重复");
assert.equal(preview.newCount, 2);
assert.equal(preview.duplicateCount, 1);
assert.deepEqual(preview.unknownNames, [], "合法引用无降级");

/* 未 localize 时按原名比对。 */
const raw = packs.buildTemplatePackPreview(["喝水"], catalog, ["喝水"]);
assert.equal(raw.duplicateCount, 1, "无本地化器时原名比对");

/* 未知名 fail-closed 降级（计数暴露，不抛异常）。 */
const withUnknown = packs.buildTemplatePackPreview(["喝水", "不存在的模板"], catalog, [], {localizeName});
assert.equal(withUnknown.entries.length, 1);
assert.deepEqual(withUnknown.unknownNames, ["不存在的模板"]);

/* T-1632：同名项目规则差异可解释，默认仅新条目可创建；计划无副作用且可在提交前重建。 */
const plan = packs.buildTemplatePackApplicationPlan(["喝水", "阅读", "写作"], catalog, [
    {name: "Drink water", icon: "💧", kind: "quantity", target: 2000, unit: "毫升"},
    {name: "阅读", icon: "📖", kind: "duration", target: 45, unit: "分钟"},
], {localizeName});
assert.equal(plan.entries.length, 3);
assert.equal(plan.entries[0].conflict, "same");
assert.equal(plan.entries[0].defaultDisposition, "skip");
assert.equal(plan.entries[1].conflict, "different");
assert.ok(plan.entries[1].differences.some((difference) => difference.field === "target"));
assert.equal(plan.entries[2].status, "new");
assert.equal(plan.entries[2].defaultDisposition, "create");
assert.equal(plan.createCount, 1);
assert.equal(plan.sameCount, 1);
assert.equal(plan.differentCount, 1);

/* 纯度：冻结输入不改写、同输入同输出。 */
const frozenCatalog = Object.freeze([{name: "阅读", icon: "📖"}]);
const frozenPack = Object.freeze({templates: Object.freeze(["阅读", "缺名"])});
const first = packs.buildTemplatePackPreview(frozenPack.templates, frozenCatalog, [], {localizeName});
const second = packs.buildTemplatePackPreview(frozenPack.templates, frozenCatalog, [], {localizeName});
assert.deepEqual(first, second);
assert.equal(Object.isFrozen(frozenCatalog), true);

/* —— 目录数据完整性：每个包的引用都必须能解析到 CHECKIN_TEMPLATES。 —— */
const catalogSource = fs.readFileSync(path.join(root, "src", "catalog.ts"), "utf8");
assert.match(catalogSource, /TEMPLATE_PACKS/, "目录必须导出 TEMPLATE_PACKS");
for (const packId of ["morning", "study", "sport", "winddown", "creative", "awakening"]) {
    assert.ok(catalogSource.includes(`id: "${packId}"`), `组合包 ${packId} 必须登记`);
}
/* 引用完整性在 i18n 与 catalog 同源下以源码级交叉检查：抽取每个包的模板名清单，
   确认这些名字都在 CHECKIN_TEMPLATES 字面量中出现。 */
const packNames = [...catalogSource.matchAll(/\{id: "(?:[a-z]+)", icon: "[^"]*", nameKey: "[^"]+", templates: \[([^\]]+)\]\}/g)].map((match) => match[1]);
assert.ok(packNames.length >= 5, "至少登记 5 个组合包");
for (const group of packNames) {
    for (const name of group.split(",").map((entry) => entry.trim().replace(/^"|"$/g, "").replace(/"/g, "")).filter(Boolean)) {
        assert.ok(catalogSource.includes(`name: "${name}"`), `组合包引用的模板 ${name} 必须存在于目录`);
    }
}

/* —— 编辑器接线与结构。 —— */
const editorSource = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
for (const hook of ["data-pack-heading", "data-pack-chip", "data-pack-preview"]) {
    assert.ok(editorSource.includes(hook), `编辑器必须包含 ${hook}`);
}
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-editor.ts"), "utf8");
assert.match(bindSource, /buildTemplatePackPreview\(/, "绑定层必须经纯函数构建预览");
assert.match(bindSource, /data-template-apply="\$\{index\}"/, "预览条目必须复用既有应用通道");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["editor.packs", "editor.packsHint", "editor.packCount", "editor.packNew", "editor.packDuplicate", "editor.packEmpty", "pack.morning", "pack.study", "pack.sport", "pack.winddown", "pack.creative", "pack.awakening"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

/* —— T-1488 空状态一键装填：批量按钮仅在空库出现，走宿主批量方法，逐条通道保留。 —— */
assert.match(bindSource, /data-pack-apply-all/, "预览面板必须提供一键装填按钮");
assert.match(bindSource, /host\.store\.items\.every\(\(entry\) => entry\.archived\)/, "批量按钮必须以「无活跃项目」为前提（非空库仍逐条确认）");
assert.match(bindSource, /applyTemplatePackBulk/, "批量应用必须经宿主方法");
assert.match(bindSource, /buildTemplatePackApplicationPlan\(/, "组合包面板必须展示同名规则差异计划");
assert.match(bindSource, /data-pack-select/, "组合包面板必须支持逐项勾选");
assert.match(bindSource, /applyTemplatePackSelected/, "部分应用必须经宿主方法并由宿主重核对");
assert.match(bindSource, /data-pack-edit/, "冲突行必须提供进入编辑入口");
assert.match(bindSource, /editor\.packApplied/, "批量创建后必须有结果反馈");
const indexPackSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexPackSource, /private async applyTemplatePackBulk\(packId: string\): Promise<number>/, "宿主实现批量建项方法");
assert.match(indexPackSource, /buildTemplatePackPreview\(pack\.templates/, "批量路径复用同一预览纯函数做 new/duplicate 判定");
assert.match(indexPackSource, /normalizeCheckinItem\(\{/, "批量建项必须过模型归一化边界");
assert.match(indexPackSource, /advanceFirstSuccess\("item-created"\)/, "批量建项推进新手旅程");
assert.match(indexPackSource, /private async applyTemplatePackSelected\(packId: string, templateIndexes: readonly number\[\]\)/, "宿主必须提供组合包部分应用方法");
assert.match(indexPackSource, /selected\.has\(CHECKIN_TEMPLATES\.indexOf\(entry\.template\)\)/, "部分应用必须按最新计划过滤勾选项");
for (const key of ["editor.packApplyAll", "editor.packApplied", "editor.packApplySelected", "editor.packConflictSame", "editor.packConflictDifferent", "editor.packEdit", "editor.packPreviewApply", "editor.saveContinue"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

console.log("template packs gates passed: 引用解析/未知名降级/新旧分类/本地化比对/纯度/目录完整性/编辑器接线/i18n 双语");
