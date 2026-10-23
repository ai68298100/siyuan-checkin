// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* 守门测试：ECOSYSTEM-INTEGRATION-DIRECTIVE.md 全指令合规验证
   1. 跨插件联邦 Epoch 6 标准（四别名、雷切小组件、全生态前缀）
   2. 32x32 单色矢量 iconLvCheckin 结构与 icon.png 完整性
   3. 经典长春花紫+暖橙 Bento 美学 Token 与按压动效
   4. plugin.json 设置大窗、关键字，CHANGELOG.md 与 release.yml */

console.log("Starting ecosystem-integration-directive tests...");

const root = path.join(__dirname, "..");

// 1. 任务一：跨插件联邦与 SDK 接入
const srcIntegrations = fs.readFileSync(path.join(root, "src", "integrations.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcEcosystem = fs.readFileSync(path.join(root, "src", "ecosystem.ts"), "utf8");
const docMerge = fs.readFileSync(path.join(root, "docs", "identity-and-merge.md"), "utf8");

assert.ok(srcIntegrations.includes('CHECKIN_API_ALIASES = ["siyuanCheckin", "LvCheckin", "lvCheckin", "xiaolvCheckin"]'), "integrations.ts must define CHECKIN_API_ALIASES");
assert.ok(srcIndex.includes("this.mountedAliases"), "index.ts must track mountedAliases");
assert.ok(srcIndex.includes("for (const alias of CHECKIN_API_ALIASES)"), "index.ts must mount aliases with first-instance-wins");
assert.ok(srcIndex.includes("if (w[alias] === this.api) delete w[alias]"), "index.ts must safely unmount aliases verifying ownership");
assert.ok(srcIndex.includes("registerRaikiriModuleSafely"), "index.ts must call registerRaikiriModuleSafely");
assert.ok(srcIndex.includes("checkin-daily-streaks"), "index.ts must register checkin-daily-streaks module to Raikiri");

for (const prefix of ["exam", "cards", "glean", "contacts", "home"]) {
    assert.ok(srcEcosystem.includes(`prefix: "${prefix}"`), `ecosystem.ts must include prefix ${prefix}`);
    assert.ok(docMerge.includes(`${prefix}:`), `identity-and-merge.md must document prefix ${prefix}`);
}

// 2. 任务二：32x32 单色矢量图标与 icon.png
assert.ok(srcIndex.includes('id="iconLvCheckin" viewBox="0 0 32 32"'), "iconLvCheckin must be 32x32");
assert.ok(srcIndex.includes('d="M13 5h8c2.2 0 4 1.8 4 4v9"'), "iconLvCheckin must match official vector path");
assert.ok(srcIndex.includes('d="m9.5 18 3.5 3.5 7-7"'), "iconLvCheckin must have checkmark path");
assert.ok(fs.existsSync(path.join(root, "icon.png")), "icon.png must exist");
const iconStat = fs.statSync(path.join(root, "icon.png"));
assert.ok(iconStat.size > 10000, "icon.png must remain the updated high-res asset");

// 3. 任务三：经典长春花紫+暖橙 Bento 美学
const srcTokens = fs.readFileSync(path.join(root, "src", "ui", "tokens.scss"), "utf8");
const srcComponents = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

assert.ok(srcTokens.includes("--lv-brand: #6366F1;"), "tokens.scss must define --lv-brand");
assert.ok(srcTokens.includes("--lv-accent-orange: #FB8C00;"), "tokens.scss must define --lv-accent-orange");
assert.ok(srcTokens.includes("--lv-r-pill: 9999px;"), "tokens.scss must define --lv-r-pill");
assert.ok(srcComponents.includes("transform: translateY(1.5px) scale(0.985);"), "components.scss must have button active micro-interaction");
assert.ok(srcComponents.includes(".lv-dialog-title-icon"), "components.scss must style .lv-dialog-title-icon");
assert.ok(srcComponents.includes(".lv-dialog-version-badge"), "components.scss must style .lv-dialog-version-badge");
assert.ok(srcComponents.includes("radial-gradient(circle,"), "components.scss must include streak card water ripple gradient");

// 4. 任务四：工程规范、plugin.json、CHANGELOG 与 release.yml
const pluginJson = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
assert.equal(pluginJson.settingsWindow, true, "plugin.json must set settingsWindow to true");
assert.equal(pluginJson.minAppVersion, "3.8.4", "plugin.json must keep minAppVersion at 3.8.4");
assert.ok(pluginJson.keywords.includes("小驴"), "plugin.json keywords must include 小驴");
assert.ok(pluginJson.keywords.includes("小驴打卡"), "plugin.json keywords must include 小驴打卡");
assert.ok(pluginJson.keywords.includes("xiaolv"), "plugin.json keywords must include xiaolv");
assert.ok(pluginJson.keywords.includes("lv"), "plugin.json keywords must include lv");
assert.equal(pluginJson.displayName["zh-CN"] || pluginJson.displayName["zh_CN"], "小驴打卡", "displayName must be 小驴打卡");
assert.equal(pluginJson.displayName["default"], "Lv Check-in", "displayName default must be Lv Check-in");

assert.ok(fs.existsSync(path.join(root, "CHANGELOG.md")), "CHANGELOG.md must exist in root");
assert.ok(fs.existsSync(path.join(root, ".github", "workflows", "release.yml")), ".github/workflows/release.yml must exist");

console.log("ecosystem-integration-directive: all assertions passed successfully!");
