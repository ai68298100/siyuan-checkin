// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1892 ~ T-1894 守门测试：LifeLog 抽屉会话保持、Toast 可观测徽章与日期分组全链验证
   1. 静态代码与架构规范断言
   2. renderRecentRecordView 渲染已同步日记徽标与详情面板断言
   3. Review 时间轴按日期分组卡片化与数据属性断言 */

console.log("Starting lifelog-observability-experience tests...");

const root = path.join(__dirname, "..");
const srcTypes = fs.readFileSync(path.join(root, "src", "types.ts"), "utf8");
const srcFragments = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
const srcBindToday = fs.readFileSync(path.join(root, "src", "render", "bind-today.ts"), "utf8");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const srcScss = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

/* ---------------------------------------------------------
   一、静态代码与架构规范断言
   --------------------------------------------------------- */

// 1. T-1892 Today 抽屉状态与会话保持
assert.ok(srcTypes.includes("todayLifelogFoldOpen?: boolean;"), "TodayRootContext must include todayLifelogFoldOpen");
assert.ok(srcBindToday.includes('[data-today-lifelog-fold]'), "bind-today.ts must query [data-today-lifelog-fold]");
assert.ok(srcBindToday.includes("todayState.todayLifelogFoldOpen = isOpen"), "bind-today.ts must persist toggle state to todayState");
assert.ok(srcFragments.includes("renderTodayLifelogTimelineView(ctx.store, now, ctx.todayLifelogFoldOpen)"), "fragments.ts must pass todayLifelogFoldOpen to renderTodayLifelogTimelineView");

// 2. T-1893 Toast 可观测状态徽章
assert.ok(srcFragments.includes("lifelogSynced?: boolean;"), "RecentRecordView must include lifelogSynced");
assert.ok(srcFragments.includes('t("today.lifelogSyncedBadge")'), "renderRecentRecordView must render lifelogSyncedBadge");
assert.ok(srcFragments.includes('t("today.lifelogSyncStatusLabel")'), "renderRecentRecordView must render lifelogSyncStatusLabel in details");
assert.ok(srcIndex.includes("lifelogSynced: this.lifelogJournal.enabled"), "index.ts must set lifelogSynced in setRecentRecord when enabled");

// 3. T-1894 Review 时间轴按日期分组
assert.ok(srcReview.includes("lc-checkin__lifelog-day-group"), "review.ts must render lc-checkin__lifelog-day-group");
assert.ok(srcReview.includes("data-lifelog-date="), "review.ts must render data-lifelog-date for timeline linking");
assert.ok(srcReview.includes("lc-checkin__lifelog-timeline-container"), "review.ts must wrap in lc-checkin__lifelog-timeline-container");
assert.ok(srcScss.includes(".lc-checkin__lifelog-day-group"), "components.scss must style .lc-checkin__lifelog-day-group");

// 4. i18n
assert.ok(srcI18n.includes('"today.lifelogSyncedBadge": "已同步日记"'), "zhCN must have today.lifelogSyncedBadge");
assert.ok(srcI18n.includes('"today.lifelogSyncedBadge": "Synced to Daily Note"'), "enUS must have today.lifelogSyncedBadge");
assert.ok(srcI18n.includes('"review.lifelogDayRecords": "{n} 项行动"'), "zhCN must have review.lifelogDayRecords");
assert.ok(srcI18n.includes('"review.lifelogDayRecords": "{n} actions"'), "enUS must have review.lifelogDayRecords");

console.log("lifelog-observability-experience: all assertions passed successfully!");
