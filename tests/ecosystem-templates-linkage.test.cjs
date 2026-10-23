// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1907 守门测试：生态联动内置模板组与上游思播/思阅事件驱动加固
   1. CHECKIN_TEMPLATES 中生态联动模板定义
   2. TEMPLATE_PACKS 中 ecosystem 场景组合包
   3. 双语 i18n 完整覆盖
   4. 思播 v1 官方播放事件监听 */

console.log("Starting ecosystem-templates-linkage tests...");

const root = path.join(__dirname, "..");
const srcCatalog = fs.readFileSync(path.join(root, "src", "catalog.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcIntegrations = fs.readFileSync(path.join(root, "src", "integrations.ts"), "utf8");

// 1. 模板定义与组合包
const expectedTemplates = ["思阅精读", "思播精听", "闪卡复习", "考证刷题", "拾遗精读", "人脉关怀", "管家事务"];
for (const name of expectedTemplates) {
    assert.ok(srcCatalog.includes(`{name: "${name}"`), `CHECKIN_TEMPLATES must include ${name}`);
}

assert.ok(srcCatalog.includes('id: "ecosystem"'), "TEMPLATE_PACKS must include ecosystem pack");
assert.ok(srcCatalog.includes('nameKey: "pack.ecosystem"'), "ecosystem pack must use pack.ecosystem key");

// 2. 双语字典
assert.ok(srcI18n.includes('"pack.ecosystem": "小驴生态联动"'), "zhCN must define pack.ecosystem");
assert.ok(srcI18n.includes('"pack.ecosystem": "Lv Ecosystem Linkage"'), "enUS must define pack.ecosystem");

for (const key of ["sireaderDeep", "siplayerListen", "cardsReview", "examPractice", "gleanArticle", "contactsCare", "homeTask"]) {
    assert.ok(srcI18n.includes(`"tpl.${key}":`), `i18n must define tpl.${key}`);
    assert.ok(srcI18n.includes(`"tplNote.${key}":`), `i18n must define tplNote.${key}`);
}

// 3. 思播 v1 官方事件驱动监听
assert.ok(srcIndex.includes('"siplayer:play"'), "index.ts must listen to siplayer:play");
assert.ok(srcIndex.includes('"siplayer:pause"'), "index.ts must listen to siplayer:pause");
assert.ok(srcIndex.includes('"siplayer:ended"'), "index.ts must listen to siplayer:ended");

// 4. 事件信封增强
assert.ok(srcIntegrations.includes("v: 1 as const"), "emitIntegrationEvent must output envelope version 1");
assert.ok(srcIntegrations.includes('source: "siyuan-checkin"'), "emitIntegrationEvent must set source to siyuan-checkin");
assert.ok(srcIntegrations.includes("payload: safe"), "emitIntegrationEvent must wrap safe payload");

// 5. 设置页一键快速创建并绑定
const srcSettings = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
assert.ok(srcSettings.includes('data-action="quick-create-sireader"'), "settings.ts must provide quick-create-sireader button");
assert.ok(srcSettings.includes('data-action="quick-create-siplayer"'), "settings.ts must provide quick-create-siplayer button");
assert.ok(srcIndex.includes('data-action=\'quick-create-sireader\''), "index.ts must bind quick-create-sireader action");
assert.ok(srcIndex.includes('data-action=\'quick-create-siplayer\''), "index.ts must bind quick-create-siplayer action");
assert.ok(srcIndex.includes("quickCreateAndBindIntegrationItem"), "index.ts must implement quickCreateAndBindIntegrationItem");

console.log("ecosystem-templates-linkage: all assertions passed successfully!");
