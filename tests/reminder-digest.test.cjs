/* T-1495 事项提醒降噪聚合测试。
   摘要：同日多事件聚合为单条摘要（计数+代表名+溢出）、逾期跨日合并、
   fail-closed 与确定性；横幅覆盖判定；提前提醒「仅一次」窗口首日语义与
   projectReminderCenter 接线；宿主推送摘要与今日页去重接线守门；双语与纯度。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-reminder-digest-"));
for (const filename of ["features/reminder-digest.ts", "features/reminder-preferences.ts", "features/priority-reminder.ts", "date-keys.ts", "occasions.ts", "model.ts", "record-step.ts", "quota.ts", "rules.ts", "types.ts", "lunar.ts", "i18n.ts", "reminders.ts"]) {
    const target = path.join(dir, filename.replace(/\.ts$/, ".js").replace(/^features\//, ""));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText);
}
const digest = require(path.join(dir, "reminder-digest.js"));
const reminders = require(path.join(dir, "reminders.js"));
const occasions = require(path.join(dir, "occasions.js"));

const entry = (overrides) => ({id: "checkin:x:2026-06-10", source: "checkin", sourceId: "x", title: "项目", dueDate: "2026-06-10", daysUntil: 0, status: "today", note: "", ...overrides});

/* —— 1. buildReminderDigest：同日聚合为单条摘要 —— */
assert.deepEqual(digest.buildReminderDigest([], {today: "2026-06-10"}), {total: 0}, "空输入返回空摘要");
assert.deepEqual(digest.buildReminderDigest([entry({})], {today: "bad-date"}), {total: 0}, "非法 today fail-closed");
assert.deepEqual(digest.buildReminderDigest([entry({})], {today: "2026-6-10"}), {total: 0}, "非零填充日期 fail-closed");
const sameDay = [
    entry({id: "a", sourceId: "a", title: "晨间跑步"}),
    entry({id: "b", sourceId: "b", title: "深度阅读"}),
    entry({id: "c", sourceId: "c", title: "写日记"}),
];
const todayDigest = digest.buildReminderDigest(sameDay, {today: "2026-06-10"});
assert.equal(todayDigest.total, 3);
assert.deepEqual(todayDigest.today, {count: 3, names: ["晨间跑步", "深度阅读", "写日记"], overflow: 0}, "同日多事件聚合为一段");
assert.equal(todayDigest.overdue, undefined, "无逾期不出逾期段");
/* 非行动条目不进入摘要。 */
const filtered = digest.buildReminderDigest([
    entry({id: "u", sourceId: "u", title: "未到窗口", status: "upcoming", daysUntil: 5}),
    entry({id: "d", sourceId: "d", title: "已完成", status: "completed"}),
    entry({id: "s", sourceId: "s", title: "已跳过", status: "skipped"}),
    entry({id: "z", sourceId: "z", title: "已延期", status: "snoozed"}),
], {today: "2026-06-10"});
assert.equal(filtered.total, 0, "upcoming/completed/skipped/snoozed 不进摘要");
/* 逾期跨日合并一段，代表名按发生日降序。 */
const overdueDigest = digest.buildReminderDigest([
    entry({id: "o1", sourceId: "o1", title: "三天前的周报", dueDate: "2026-06-07", daysUntil: -3, status: "overdue"}),
    entry({id: "o2", sourceId: "o2", title: "昨天的缴费", dueDate: "2026-06-09", daysUntil: -1, status: "overdue"}),
    ...sameDay,
], {today: "2026-06-10"});
assert.equal(overdueDigest.total, 5);
assert.deepEqual(overdueDigest.overdue, {count: 2, names: ["昨天的缴费", "三天前的周报"], overflow: 0}, "逾期合并并按发生日降序取代表名");
assert.ok(overdueDigest.today);
/* 截断与溢出计数；maxNames 钳制。 */
const truncated = digest.buildReminderDigest([...sameDay, entry({id: "d2", sourceId: "d2", title: "第四项"})], {today: "2026-06-10", maxNames: 3});
assert.deepEqual(truncated.today, {count: 4, names: ["晨间跑步", "深度阅读", "写日记"], overflow: 1});
assert.equal(digest.buildReminderDigest(sameDay, {today: "2026-06-10", maxNames: 0}).today.names.length, 1, "maxNames 下钳 1");
assert.equal(digest.buildReminderDigest(sameDay, {today: "2026-06-10", maxNames: 99}).today.names.length, 3, "maxNames 上钳 8 且不超条目数");
assert.deepEqual(digest.buildReminderDigest(sameDay, {today: "2026-06-10"}), todayDigest, "同一输入两次构建确定性一致");

/* —— 2. isBannerCoveredReminder：横幅已聚合的当日事项 —— */
assert.equal(digest.isBannerCoveredReminder(entry({source: "occasion", sourceId: "o"}), "2026-06-10"), true, "当日事项被横幅覆盖");
assert.equal(digest.isBannerCoveredReminder(entry({source: "occasion", sourceId: "o", status: "overdue", dueDate: "2026-06-07", daysUntil: -3}), "2026-06-10"), false, "逾期事项不在横幅");
assert.equal(digest.isBannerCoveredReminder(entry({source: "occasion", sourceId: "o", dueDate: "2026-06-11", status: "upcoming", daysUntil: 1}), "2026-06-10"), false, "未来事项不在横幅");
assert.equal(digest.isBannerCoveredReminder(entry({}), "2026-06-10"), false, "打卡提醒不由横幅承载");

/* —— 3. advanceReminderVisible：提前提醒「仅一次」= 窗口首日 —— */
assert.equal(reminders.advanceReminderVisible(5, 7, false), true, "关闭时保持原行为");
assert.equal(reminders.advanceReminderVisible(0, 7, true), true, "当天提醒不受仅一次影响");
assert.equal(reminders.advanceReminderVisible(7, 7, true), true, "窗口首日出现一次");
assert.equal(reminders.advanceReminderVisible(6, 7, true), false, "窗口中段不再逐日重复");
assert.equal(reminders.advanceReminderVisible(1, 7, true), false, "前一天不重复");
assert.equal(reminders.advanceReminderVisible(Number.NaN, 7, true), true, "非法输入 fail-closed 可见");
assert.equal(reminders.advanceReminderVisible(5, Number.NaN, true), true, "非法提前天数 fail-closed 可见");

/* —— 4. projectReminderCenter advanceOnce 接线： —— */
const occasionStore = occasions.normalizeOccasionStore({occasions: [
    {id: "occ-first", name: "窗口首日的事项", kind: "anniversary", recurrence: "annual", calendar: "solar", date: "2000-06-17", remindBeforeDays: 7, note: ""},
    {id: "occ-mid", name: "窗口中段的事项", kind: "anniversary", recurrence: "annual", calendar: "solar", date: "2000-06-15", remindBeforeDays: 7, note: ""},
    {id: "occ-today", name: "当天的事项", kind: "anniversary", recurrence: "annual", calendar: "solar", date: "2000-06-10", remindBeforeDays: 7, note: ""},
]});
const now = new Date(2026, 5, 10, 9, 0, 0);
const checkinStore = {items: [], events: []};
const plain = reminders.projectReminderCenter(checkinStore, occasionStore, now);
assert.ok(plain.some((e) => e.sourceId === "occ-first" && e.status === "upcoming"), "默认行为：窗口首日可见");
assert.ok(plain.some((e) => e.sourceId === "occ-mid" && e.status === "upcoming"), "默认行为：窗口中段可见（原逐日提醒）");
const once = reminders.projectReminderCenter(checkinStore, occasionStore, now, [], {advanceOnce: true});
assert.ok(once.some((e) => e.sourceId === "occ-first" && e.status === "upcoming"), "仅一次：窗口首日仍提醒");
assert.ok(!once.some((e) => e.sourceId === "occ-mid"), "仅一次：窗口中段不再提醒");
assert.ok(once.some((e) => e.sourceId === "occ-today" && e.status === "today"), "仅一次：当天提醒不受影响");
/* 用户动作与选项叠加：snooze 优先卡路径不受影响。 */
const withActions = reminders.projectReminderCenter(checkinStore, occasionStore, now, [{id: "occasion:occ-today:2026-06-10", action: "snooze", at: "2026-06-10T01:00:00.000Z"}], {advanceOnce: true});
assert.equal(withActions.find((e) => e.sourceId === "occ-today").status, "snoozed", "仅一次模式下用户动作照常生效");

/* —— 5. 接线守门： —— */
const fragmentsSource = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /isBannerCoveredReminder/, "今日页必须消费横幅覆盖判定");
assert.match(fragmentsSource, /selectTodayPriorityEntries/, "优先卡与行动台必须共用同一去重选择器");
assert.match(fragmentsSource, /attention: selectTodayPriorityEntries/, "行动台计数与优先卡同源去重");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /buildReminderDigest\(actionable, \{today\}\)/, "推送必须经摘要纯函数聚合");
assert.match(indexSource, /entry\.status === "today" && !isBannerCoveredReminder\(entry, today\)/, "推送必须排除横幅已聚合的当日事项");
assert.match(indexSource, /projectReminderCenter\(this\.store, this\.occasionStore, now, this\.reminderUserActions, \{advanceOnce: this\.occasionRemindOnce\}\)/, "推送投影必须透传仅一次偏好");
assert.equal((indexSource.match(/\/api\/notification\/pushMsg/g) || []).length, 1, "每日提醒仍是一条思源原生通知（calm 禁则：不新增推送通道）");
assert.match(indexSource, /data-setting-occasion-once/, "宿主必须绑定仅一次开关");
assert.match(indexSource, /this\.occasionRemindOnce = preferences\.occasionRemindOnce/, "偏好恢复必须读仅一次字段");
assert.match(indexSource, /occasionRemindOnce: this\.occasionRemindOnce/, "偏好持久化与设置上下文必须写出仅一次字段");
assert.match(indexSource, /reminderAdvanceOnce: this\.occasionRemindOnce/, "回顾上下文必须透传仅一次偏好");
const settingsSource = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /data-setting-occasion-once/, "设置页必须有仅一次开关行");
assert.match(settingsSource, /set\.reminderAdvanceOnce/, "设置行必须使用双语键");
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /advanceOnce: ctx\.reminderAdvanceOnce === true/, "提醒中心投影必须消费仅一次选项");
const viewPrefSource = fs.readFileSync(path.join(root, "src", "view-preferences.ts"), "utf8");
assert.match(viewPrefSource, /occasionRemindOnce: boolean/, "偏好接口必须有仅一次字段");
assert.match(viewPrefSource, /occasionRemindOnce: false/, "默认关闭（原逐日提醒行为不变）");
assert.match(viewPrefSource, /occasionRemindOnce: source\.occasionRemindOnce === true/, "归一化必须只认布尔 true");

/* —— 6. 双语键齐备 —— */
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["msg.dailyReminder", "msg.reminderDigestToday", "msg.reminderDigestOverdue", "msg.reminderDigestJoin", "msg.reminderDigestNames", "msg.reminderDigestNameJoin", "msg.reminderDigestOverflow", "set.reminderAdvanceOnce", "set.reminderAdvanceOnceHint"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

/* —— 7. 纯度：reminder-digest 仅类型导入 + 无时钟 —— */
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "reminder-digest.ts"), "utf8");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(/, "禁止隐式时钟");
const bareImports = moduleSource.split("\n").filter((line) => /^import /.test(line) && !/^import type /.test(line));
assert.deepEqual(bareImports, [], "仅允许 import type（零运行时依赖）");

console.log("reminder-digest tests passed: 同日聚合摘要/逾期合并与代表名/fail-closed/确定性 + 横幅覆盖判定 + 提前提醒仅一次窗口首日语义 + projectReminderCenter 接线 + 推送与今日页去重守门 + 双语与纯度 全部通过");
