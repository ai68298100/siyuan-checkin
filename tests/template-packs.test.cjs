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
    {name: "喝水", icon: "💧", target: 2000, unit: "毫升"},
    {name: "阅读", icon: "📖", target: 30, unit: "分钟"},
    {name: "写作", icon: "✒", target: 30, unit: "分钟"},
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

console.log("template packs gates passed: 引用解析/未知名降级/新旧分类/本地化比对/纯度/目录完整性/编辑器接线/i18n 双语");
