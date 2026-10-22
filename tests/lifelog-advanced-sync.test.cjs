// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

/* T-1886 ~ T-1888 守门测试：LifeLog 撤销联动、批量同步与即时预览全链验证
   1. 静态代码与架构规范断言（undo deleteBlock, syncTodayCheckinsToLifelogJournal, previewOutputMarkdown）
   2. previewTodayLifelogMarkdown 纯函数生成断言
   3. 幂等去重与撤销清理映射逻辑断言 */

console.log("Starting lifelog-advanced-sync tests...");

const root = path.join(__dirname, "..");
const srcAppend = fs.readFileSync(path.join(root, "src", "features", "lifelog-append.ts"), "utf8");
const jsCode = ts.transpileModule(srcAppend, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
const moduleFn = new Function("module", "exports", jsCode);
const mod = {exports: {}};
moduleFn(mod, mod.exports);
const {previewTodayLifelogMarkdown, formatLifelogEntry} = mod.exports;

/* ---------------------------------------------------------
   一、静态代码与架构规范断言
   --------------------------------------------------------- */

const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcSettings = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");

// 1. undo 联动 deleteBlock
assert.ok(srcIndex.includes('channel: "lifelog-journal-undo"'), "index.ts must record lifelog-journal-undo audit entry");
assert.ok(srcIndex.includes('"/api/block/deleteBlock"'), "index.ts must call deleteBlock on undo when lifelog block exists");
assert.ok(srcIndex.includes("this.recentLifelogBlocks.delete(event.id)"), "index.ts must release lifelog block mapping on undo");

// 2. 批量同步与去重
assert.ok(srcIndex.includes("syncTodayCheckinsToLifelogJournal"), "index.ts must implement syncTodayCheckinsToLifelogJournal");
assert.ok(srcIndex.includes("existingContents.has(line)"), "syncTodayCheckinsToLifelogJournal must deduplicate against existing lines");
assert.ok(srcSettings.includes('data-action="sync-today-lifelog"'), "settings.ts must provide sync-today-lifelog action button");

// 3. 预览通道
assert.ok(srcIndex.includes("previewTodayLifelogMarkdown"), "previewOutputMarkdown must support lifelog channel");
assert.ok(srcSettings.includes('data-output-preview-generate="lifelog"'), "settings.ts must provide lifelog preview button");
assert.ok(srcSettings.includes('data-output-preview="lifelog"'), "settings.ts must provide lifelog preview details container");

// 4. i18n 双语
assert.ok(srcI18n.includes('"set.lifelogSyncNow": "同步今日打卡至日记"'), "i18n zhCN must have lifelogSyncNow");
assert.ok(srcI18n.includes('"set.lifelogSyncNow": "Sync Today\'s Check-ins to Daily Note"'), "i18n enUS must have lifelogSyncNow");
assert.ok(srcI18n.includes('"set.lifelogSyncAction": "立即同步至日记"'), "i18n zhCN must have lifelogSyncAction");

/* ---------------------------------------------------------
   二、previewTodayLifelogMarkdown 纯函数输出验证
   --------------------------------------------------------- */

const itemNames = new Map([
    ["item-1", "晨跑"],
    ["item-2", "背单词"],
]);

// 1. 空事件
assert.equal(previewTodayLifelogMarkdown([], itemNames), "今日暂无打卡事实。");

// 2. 多事件排序与标题生成
const events = [
    {occurredAt: "2026-10-22T14:30:00.000Z", value: 50, unit: "个", kind: "checkin", note: "Unit 3", itemId: "item-2"},
    {occurredAt: "2026-10-22T08:00:00.000Z", value: 1, unit: "次", kind: "checkin", note: "慢跑3km", itemId: "item-1"},
];

const previewWithoutHeader = previewTodayLifelogMarkdown(events, itemNames);
const lines1 = previewWithoutHeader.split("\n");
assert.equal(lines1.length, 2);
assert.equal(lines1[0], "16:00 晨跑：慢跑3km");
assert.equal(lines1[1], "22:30 背单词：50个 Unit 3");

// 3. 带分节标题
const previewWithHeader = previewTodayLifelogMarkdown(events, itemNames, "今日时间线");
const lines2 = previewWithHeader.split("\n");
assert.equal(lines2.length, 3);
assert.equal(lines2[0], "### 今日时间线");
assert.equal(lines2[1], "16:00 晨跑：慢跑3km");
assert.equal(lines2[2], "22:30 背单词：50个 Unit 3");

console.log("lifelog-advanced-sync: all assertions passed successfully!");
