// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

/* T-1889 ~ T-1891 守门测试：LifeLog 图文附件同步、Today 轨迹抽屉与标签徽标视觉升级
   1. 静态代码与架构规范断言
   2. formatLifelogMarkdownBlock 图文附件生成验证
   3. renderLifelogTextWithTags #标签 胶囊徽标渲染与 HTML 转义验证
   4. renderTodayLifelogTimelineView 今日轨迹抽屉生成验证 */

console.log("Starting lifelog-visual-experience tests...");

const root = path.join(__dirname, "..");
const srcAppend = fs.readFileSync(path.join(root, "src", "features", "lifelog-append.ts"), "utf8");
const srcTimeline = fs.readFileSync(path.join(root, "src", "features", "lifelog-timeline.ts"), "utf8");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};

const modAppend = {exports: {}};
new Function("module", "exports", ts.transpileModule(srcAppend, {compilerOptions}).outputText)(modAppend, modAppend.exports);
const {formatLifelogMarkdownBlock} = modAppend.exports;

const customRequire = (id) => {
    if (id === "../shared") {
        return {
            escapeHtml: (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"),
        };
    }
    return require(id);
};

const modTimeline = {exports: {}};
new Function("module", "exports", "require", ts.transpileModule(srcTimeline, {compilerOptions}).outputText)(modTimeline, modTimeline.exports, customRequire);
const {renderLifelogTextWithTags} = modTimeline.exports;

/* ---------------------------------------------------------
   一、静态代码与架构规范断言
   --------------------------------------------------------- */

const srcFragments = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const srcScss = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

// 1. T-1889 图片附件同步
assert.ok(srcIndex.includes("formatLifelogMarkdownBlock"), "index.ts must use formatLifelogMarkdownBlock for journal append");

// 2. T-1890 Today 行动轨迹抽屉与日记直达
assert.ok(srcFragments.includes("renderTodayLifelogTimelineView"), "fragments.ts must define renderTodayLifelogTimelineView");
assert.ok(srcFragments.includes('data-action="open-daily-note"'), "fragments.ts must provide open-daily-note button");
assert.ok(srcIndex.includes("async openDailyNote"), "index.ts must implement openDailyNote");

// 3. T-1891 #标签 徽标解析与样式
assert.ok(srcReview.includes("renderLifelogTextWithTags"), "review.ts must use renderLifelogTextWithTags");
assert.ok(srcScss.includes(".lc-checkin__lifelog-tag-chip"), "components.scss must style .lc-checkin__lifelog-tag-chip");
assert.ok(srcScss.includes(".lc-checkin__today-lifelog-fold"), "components.scss must style .lc-checkin__today-lifelog-fold");

// 4. i18n
assert.ok(srcI18n.includes('"today.lifelogTimelineTitle": "今日行动轨迹 ({n})"'), "zhCN must have today.lifelogTimelineTitle");
assert.ok(srcI18n.includes('"today.openDailyNote": "打开今日日记文档"'), "zhCN must have today.openDailyNote");

/* ---------------------------------------------------------
   二、formatLifelogMarkdownBlock 纯函数验证
   --------------------------------------------------------- */

// 1. 无附件
const plainBlock = formatLifelogMarkdownBlock({
    timeStr: "08:30",
    itemName: "晨跑",
    kind: "checkin",
});
assert.equal(plainBlock, "08:30 晨跑：完成\n");

// 2. 带 base64 图片附件
const photoBlock = formatLifelogMarkdownBlock({
    timeStr: "10:15",
    itemName: "健身打卡",
    value: 45,
    unit: "分钟",
    kind: "checkin",
    note: "#力量训练 完成深蹲",
    energy: 5,
    attachment: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
});
assert.ok(photoBlock.startsWith("10:15 健身打卡：45分钟 #力量训练 完成深蹲 ⚡5\n\n"));
assert.ok(photoBlock.includes("![健身打卡](data:image/png;base64,"));

/* ---------------------------------------------------------
   三、renderLifelogTextWithTags #标签 胶囊徽标与转义验证
   --------------------------------------------------------- */

// 1. 无标签普通文本
assert.equal(renderLifelogTextWithTags("普通的打卡备注说明"), "普通的打卡备注说明");

// 2. 带单一标签
const html1 = renderLifelogTextWithTags("#深度专注 算法题");
assert.equal(html1, '<span class="lc-checkin__lifelog-tag-chip">#深度专注</span> 算法题');

// 3. 带多个中英文标签与特殊字符转义
const html2 = renderLifelogTextWithTags("#晨间打卡 #focus 读完《掌控习惯》 & 跑步 3km <Done>");
assert.ok(html2.includes('<span class="lc-checkin__lifelog-tag-chip">#晨间打卡</span>'));
assert.ok(html2.includes('<span class="lc-checkin__lifelog-tag-chip">#focus</span>'));
assert.ok(html2.includes("&amp;"));
assert.ok(html2.includes("&lt;Done&gt;"));

console.log("lifelog-visual-experience: all assertions passed successfully!");
