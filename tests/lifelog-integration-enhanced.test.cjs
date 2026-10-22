// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1885 守门测试：LifeLog 深度联动优化全链验证
   1. 静态代码与架构规范断言（sectionHeader, appendLifelogToJournal, review 融合, settings, i18n）
   2. 纯函数双向兼容与多源融合时间轴投影断言
   3. 联动筛选下钻计算验证 */

console.log("Starting lifelog-integration-enhanced tests...");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-lifelog-enhanced-"));
fs.mkdirSync(path.join(dir, "src", "features"), {recursive: true});
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    fs.writeFileSync(path.join(dir, relative.replace(/\.ts$/, ".js")), ts.transpileModule(source, {compilerOptions}).outputText);
};

fs.writeFileSync(path.join(dir, "src", "shared.js"), "module.exports = { escapeHtml: s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;') };");
transpile("src/date-keys.ts");
transpile("src/features/lifelog-append.ts");
transpile("src/features/lifelog-timeline.ts");
transpile("src/features/yeguif-adapter.ts");

const {formatLifelogEntry, formatTimeOnly} = require(path.join(dir, "src", "features", "lifelog-append.js"));
const {buildLifelogTimeline, lifelogTypeColorIndex} = require(path.join(dir, "src", "features", "lifelog-timeline.js"));
const {parseYeguifMarker} = require(path.join(dir, "src", "features", "yeguif-adapter.js"));

/* ---------------------------------------------------------
   一、静态代码与架构规范断言
   --------------------------------------------------------- */

const srcViewPref = fs.readFileSync(path.join(root, "src", "view-preferences.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcSettings = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");

// 1. view-preferences 字段与归一化
assert.ok(srcViewPref.includes("sectionHeader: string"), "view-preferences must define sectionHeader for lifelogJournal");
assert.ok(srcViewPref.includes('sectionHeader: ""'), "DEFAULT_VIEW_PREFERENCES must set default sectionHeader to empty string");

// 2. index.ts 分节追加逻辑
assert.ok(srcIndex.includes("this.lifelogJournal.sectionHeader?.trim()"), "appendLifelogToJournal must check sectionHeader");
assert.ok(srcIndex.includes("data-setting='lifelog-journal-header'"), "index.ts must bind lifelog-journal-header input");
assert.ok(srcIndex.includes("SELECT id FROM blocks WHERE root_id"), "appendLifelogToJournal must query heading block when header is configured");

// 3. settings.ts 控件
assert.ok(srcSettings.includes('data-setting="lifelog-journal-header"'), "settings.ts must render lifelog-journal-header input");

// 4. review.ts 联动与来源标签
assert.ok(srcReview.includes("renderLifelog"), "review.ts must define renderLifelog");
assert.ok(srcReview.includes("entry.durationLabel"), "renderLifelog must consume durationLabel");

// 5. i18n
assert.ok(srcI18n.includes('"set.lifelogJournalHeader": "日记分节标题（可选）"'), "zhCN must have lifelogJournalHeader");
assert.ok(srcI18n.includes('"set.lifelogJournalHeader": "Daily Note Section Heading (Optional)"'), "enUS must have lifelogJournalHeader");

/* ---------------------------------------------------------
   二、多源事实时间轴融合投影验证
   --------------------------------------------------------- */

const itemNames = new Map([
    ["item-run", "晨跑锻炼"],
    ["item-study", "编程学习"],
    ["item-read", "电子书阅读"],
    ["item-media", "公开课视频"],
]);

const mixedEvents = [
    // 1. 叶归来源
    {occurredAt: "2026-10-22T08:00:00.000Z", value: 30, note: "运动：晨间热身", itemId: "item-run", source: "yeguif"},
    // 2. 手动打卡（带单位与备注）
    {occurredAt: "2026-10-22T09:30:00.000Z", value: 45, unit: "分钟", kind: "checkin", note: "#深度专注 动态规划", itemId: "item-study", source: "manual"},
    // 3. 思阅自动来源（带书名）
    {occurredAt: "2026-10-22T14:00:00.000Z", value: 25, unit: "分钟", kind: "checkin", note: "#思阅阅读 《掌控习惯》", itemId: "item-read", source: "sireader"},
    // 4. 思播自动来源（带媒体标题）
    {occurredAt: "2026-10-22T16:00:00.000Z", value: 60, unit: "分钟", kind: "checkin", note: "#思播播放 《CSAPP公开课》", itemId: "item-media", source: "siplayer"},
    // 5. 跳过事件
    {occurredAt: "2026-10-22T21:00:00.000Z", value: 0, kind: "skip", note: "#主动休息 恢复身体", itemId: "item-run", source: "manual"},
];

const timelineEntries = buildLifelogTimeline(mixedEvents, itemNames);
assert.equal(timelineEntries.length, 5, "all 5 events must be mapped into timeline");

// 按时间升序排序
assert.ok(timelineEntries[0].occurredAt < timelineEntries[1].occurredAt);
assert.ok(timelineEntries[1].occurredAt < timelineEntries[2].occurredAt);
assert.ok(timelineEntries[2].occurredAt < timelineEntries[3].occurredAt);
assert.ok(timelineEntries[3].occurredAt < timelineEntries[4].occurredAt);

// 检查各来源事件属性与呈现标签
// 1. yeguif
assert.equal(timelineEntries[0].type, "运动");
assert.equal(timelineEntries[0].text, "晨间热身");
assert.equal(timelineEntries[0].durationLabel, "30 分钟");

// 2. manual
assert.equal(timelineEntries[1].type, "#深度专注 动态规划");
assert.equal(timelineEntries[1].itemName, "编程学习");
assert.equal(timelineEntries[1].durationLabel, "45 分钟");

// 3. sireader
assert.equal(timelineEntries[2].itemName, "电子书阅读");
assert.equal(timelineEntries[2].durationLabel, "25 分钟");
assert.equal(timelineEntries[2].source, "sireader");

// 4. siplayer
assert.equal(timelineEntries[3].itemName, "公开课视频");
assert.equal(timelineEntries[3].durationLabel, "60 分钟");
assert.equal(timelineEntries[3].source, "siplayer");

// 5. skip
assert.equal(timelineEntries[4].durationLabel, "跳过");

/* ---------------------------------------------------------
   三、格式化段落与叶归 Marker 双向互操作验证
   --------------------------------------------------------- */

const formatted1 = formatLifelogEntry({
    timeStr: "09:30",
    itemName: "编程学习",
    value: 45,
    unit: "分钟",
    note: "#深度专注 动态规划",
    energy: 5,
});
// 格式必须为 "09:30 编程学习：45分钟 #深度专注 动态规划 ⚡5"
assert.equal(formatted1, "09:30 编程学习：45分钟 #深度专注 动态规划 ⚡5");

const marker = parseYeguifMarker("20261022120000-block123", formatted1);
assert.ok(marker, "parseYeguifMarker must recognize the generated string");
assert.equal(marker.type, "编程学习", "type must be clean item name for exact mapping");
assert.equal(marker.text, "45分钟 #深度专注 动态规划 ⚡5", "text must contain details and energy");

console.log("lifelog-integration-enhanced: all assertions passed successfully!");
