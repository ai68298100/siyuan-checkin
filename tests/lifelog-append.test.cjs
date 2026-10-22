// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1884 守门测试：打卡/跳过事实实时以 LifeLog 规范追加到当日日记
   1. 纯函数规范化验证（格式、时间、心流、备注、跳过）
   2. 静态代码与架构接线验证（view-preferences, index.ts, settings.ts, i18n） */

console.log("Starting lifelog-append tests...");

const os = require("node:os");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-lifelog-test-"));
fs.mkdirSync(path.join(dir, "src", "features"), {recursive: true});
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    fs.writeFileSync(path.join(dir, relative.replace(/\.ts$/, ".js")), ts.transpileModule(source, {compilerOptions}).outputText);
};
transpile("src/date-keys.ts");
transpile("src/features/lifelog-append.ts");
transpile("src/features/yeguif-adapter.ts");

const {formatLifelogEntry, formatTimeOnly} = require(path.join(dir, "src", "features", "lifelog-append.js"));
const {parseYeguifMarker} = require(path.join(dir, "src", "features", "yeguif-adapter.js"));

/* ---------------------------------------------------------
   一、纯函数格式化逻辑验证
   --------------------------------------------------------- */

// 1. 普通完成（二值）
const res1 = formatLifelogEntry({
    timeStr: "08:30",
    itemName: "晨跑",
    kind: "checkin",
});
assert.equal(res1, "08:30 晨跑：完成");

// 2. 带数值单位与备注
const res2 = formatLifelogEntry({
    timeStr: "10:15",
    itemName: "编程学习",
    value: 45,
    unit: "分钟",
    kind: "checkin",
    note: "#深度专注 算法题",
    energy: 5,
});
assert.equal(res2, "10:15 编程学习：45分钟 #深度专注 算法题 ⚡5");

// 3. 次数单位（次）不冗余输出 (1次)
const res3 = formatLifelogEntry({
    timeStr: "12:00",
    itemName: "喝水",
    value: 1,
    unit: "次",
    kind: "checkin",
    note: "第3杯",
});
assert.equal(res3, "12:00 喝水：第3杯");

// 4. 跳过事件（带备注）
const res4 = formatLifelogEntry({
    timeStr: "21:00",
    itemName: "晚间阅读",
    kind: "skip",
    note: "#主动休息 今天太累早睡",
});
assert.equal(res4, "21:00 晚间阅读：(跳过) #主动休息 今天太累早睡");

// 5. 跳过事件（无备注）
const res5 = formatLifelogEntry({
    timeStr: "22:00",
    itemName: "俯卧撑",
    kind: "skip",
});
assert.equal(res5, "22:00 俯卧撑：(跳过) 主动跳过");

// 6. 叶归 Marker 兼容性双向断言
const parsedMarker2 = parseYeguifMarker("20261022120000-abcdefg1", res2);
assert.ok(parsedMarker2, "LifeLog entry must be parsed successfully by parseYeguifMarker");
assert.equal(parsedMarker2.type, "编程学习");
assert.equal(parsedMarker2.text, "45分钟 #深度专注 算法题 ⚡5");

const parsedMarker4 = parseYeguifMarker("20261022120000-abcdefg2", res4);
assert.ok(parsedMarker4, "LifeLog skip entry must be parsed successfully by parseYeguifMarker");
assert.equal(parsedMarker4.type, "晚间阅读");
assert.equal(parsedMarker4.text, "(跳过) #主动休息 今天太累早睡");

// 6. formatTimeOnly
assert.match(formatTimeOnly(new Date("2026-10-22T08:30:00")), /^\d{2}:\d{2}$/);
assert.equal(formatTimeOnly("invalid"), "00:00");

/* ---------------------------------------------------------
   二、静态代码与架构接线断言
   --------------------------------------------------------- */

const srcViewPref = fs.readFileSync(path.join(root, "src", "view-preferences.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcSettings = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");

// 1. view-preferences 字段与归一化
assert.ok(srcViewPref.includes("lifelogJournal: {enabled: boolean; includeSkip: boolean; sectionHeader: string};"), "CheckinViewPreferences must include lifelogJournal");
assert.ok(srcViewPref.includes("lifelogJournal: {enabled: false, includeSkip: true, sectionHeader: \"\"}"), "DEFAULT_VIEW_PREFERENCES must set default lifelogJournal");
assert.ok(srcViewPref.includes("const lifelogJournal = {"), "normalizeViewPreferences must normalize lifelogJournal");

// 2. index.ts 属性与调用
assert.ok(srcIndex.includes("lifelogJournal = {...DEFAULT_VIEW_PREFERENCES.lifelogJournal};"), "CheckinPlugin must declare lifelogJournal property");
assert.ok(srcIndex.includes("appendLifelogToJournal"), "index.ts must implement appendLifelogToJournal");
assert.ok(srcIndex.includes("this.appendLifelogToJournal(current, event)"), "recordEvent and skipItemToday must call appendLifelogToJournal");
assert.ok(srcIndex.includes("data-setting='lifelog-journal'"), "bindSettings must bind lifelog-journal");

// 3. settings.ts 界面开关
assert.ok(srcSettings.includes('data-setting="lifelog-journal"'), "settings.ts must render lifelog-journal toggle");
assert.ok(srcSettings.includes('data-setting="lifelog-journal-skip"'), "settings.ts must render lifelog-journal-skip toggle");

// 4. i18n 双语
assert.ok(srcI18n.includes('"set.lifelogJournalTitle": "打卡同步至日记 LifeLog"'), "i18n zhCN must contain lifelogJournalTitle");
assert.ok(srcI18n.includes('"set.lifelogJournalTitle": "Append Check-ins to Daily LifeLog"'), "i18n enUS must contain lifelogJournalTitle");

console.log("lifelog-append: all assertions passed successfully!");
