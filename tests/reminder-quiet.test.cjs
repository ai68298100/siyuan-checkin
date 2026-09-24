/* T-1421 · R-A2 提醒安静时段 + 通知防抖测试。
   安静时段：归一化回落、HH:MM 解析、跨午夜窗口（22:00–07:00 全天逐半小时回放）、
   空窗口与禁用；防抖：snooze expiresAt 到期前/后、历史无 expiresAt 兼容、
   normalize 对非法 expiresAt 的丢弃。外加接线与 i18n 结构守门。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-reminder-quiet-"));
for (const filename of ["features/reminder-preferences.ts", "date-keys.ts", "occasions.ts", "model.ts", "record-step.ts", "quota.ts", "rules.ts", "types.ts", "lunar.ts", "i18n.ts", "reminders.ts"]) {
    const target = path.join(dir, filename.replace(/\.ts$/, ".js").replace(/^features\//, ""));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText);
}
const rp = require(path.join(dir, "reminder-preferences.js"));
const reminders = require(path.join(dir, "reminders.js"));

/* —— 1. reminderMinutesOfDay 严格解析 —— */
assert.equal(rp.reminderMinutesOfDay("00:00"), 0);
assert.equal(rp.reminderMinutesOfDay("22:00"), 1320);
assert.equal(rp.reminderMinutesOfDay("07:05"), 425);
assert.equal(rp.reminderMinutesOfDay("24:00"), undefined, "24:00 非法");
assert.equal(rp.reminderMinutesOfDay("7:00"), undefined, "一位小时非法");
assert.equal(rp.reminderMinutesOfDay("07:60"), undefined);
assert.equal(rp.reminderMinutesOfDay(""), undefined);
assert.equal(rp.reminderMinutesOfDay("0700"), undefined);

/* —— 2. 归一化：缺省关；非法字段逐项回落 —— */
assert.deepEqual(rp.normalizeReminderQuietHours(undefined), {enabled: false, start: "22:00", end: "07:00"});
assert.deepEqual(rp.normalizeReminderQuietHours(null), {enabled: false, start: "22:00", end: "07:00"});
assert.deepEqual(rp.normalizeReminderQuietHours({enabled: true}), {enabled: true, start: "22:00", end: "07:00"}, "缺时间回落默认窗口");
assert.deepEqual(rp.normalizeReminderQuietHours({enabled: true, start: "25:00", end: "abc"}), {enabled: true, start: "22:00", end: "07:00"}, "非法时间回落");
assert.deepEqual(rp.normalizeReminderQuietHours({enabled: true, start: "23:30", end: "06:30"}), {enabled: true, start: "23:30", end: "06:30"}, "合法配置原样保留");
assert.equal(rp.normalizeReminderQuietHours({enabled: "yes", start: "23:30", end: "06:30"}).enabled, false, "enabled 只认布尔 true");

/* —— 3. 跨午夜窗口回放：22:00–07:00 在全天每 30 分钟采样的预期 —— */
const window = {enabled: true, start: "22:00", end: "07:00"};
const quietExpectation = (minutes) => (minutes >= 1320 || minutes < 420);
for (let minutes = 0; minutes < 1440; minutes += 30) {
    assert.equal(rp.isWithinQuietHours(minutes, window), quietExpectation(minutes), `跨午夜回放 @${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`);
}
/* 边界：起点含、终点不含（半开区间）。 */
assert.equal(rp.isWithinQuietHours(1320, window), true, "22:00 整点进入安静");
assert.equal(rp.isWithinQuietHours(1319, window), false, "21:59 仍未安静");
assert.equal(rp.isWithinQuietHours(419, window), true, "06:59 仍安静");
assert.equal(rp.isWithinQuietHours(420, window), false, "07:00 整点退出安静");
/* 同日窗口 12:00–14:00。 */
const midday = {enabled: true, start: "12:00", end: "14:00"};
assert.equal(rp.isWithinQuietHours(720, midday), true);
assert.equal(rp.isWithinQuietHours(839, midday), true);
assert.equal(rp.isWithinQuietHours(840, midday), false);
assert.equal(rp.isWithinQuietHours(600, midday), false);
/* 空窗口与禁用。 */
assert.equal(rp.isWithinQuietHours(720, {enabled: true, start: "12:00", end: "12:00"}), false, "start===end 视为空窗口");
assert.equal(rp.isWithinQuietHours(720, {enabled: false, start: "22:00", end: "07:00"}), false, "禁用即不安静");
assert.equal(rp.isWithinQuietHours(-1, window), false, "分钟越界 fail-closed");
assert.equal(rp.isWithinQuietHours(1440, window), false);

/* —— 4. 防抖：defer（带 expiresAt 的 snooze）到期前隐藏、到期后回到计算状态 —— */
const entry = {id: "checkin:item-1:2026-09-24", source: "checkin", sourceId: "item-1", title: "晨间阅读", dueDate: "2026-09-24", daysUntil: 0, status: "today", note: ""};
const issuedAt = "2026-09-24T08:00:00.000Z";
const expiresAt = "2026-09-24T10:00:00.000Z";
const withDefer = [{id: entry.id, action: "snooze", at: issuedAt, expiresAt}];
const before = reminders.applyReminderActions([entry], withDefer, "2026-09-24", "2026-09-24T09:59:59.000Z");
assert.equal(before[0].status, "snoozed", "防抖窗口内呈现为已延期");
const after = reminders.applyReminderActions([entry], withDefer, "2026-09-24", "2026-09-24T10:00:01.000Z");
assert.equal(after[0].status, "today", "防抖到期后回到计算状态");
/* 历史兼容：不带 expiresAt 的 snooze 沿用当日语义（now 缺省亦然）。 */
const legacy = reminders.applyReminderActions([entry], [{id: entry.id, action: "snooze", at: issuedAt}], "2026-09-24");
assert.equal(legacy[0].status, "snoozed");
/* skip 不受 expiresAt 影响。 */
const skipped = reminders.applyReminderActions([entry], [{id: entry.id, action: "skip", at: issuedAt, expiresAt}], "2026-09-24", "2026-09-25T00:00:00.000Z");
assert.equal(skipped[0].status, "skipped");

/* —— 5. normalize：合法 expiresAt 保留，非法回落当日语义 —— */
const normalized = reminders.normalizeReminderUserActions([
    {id: "a", action: "snooze", at: issuedAt, expiresAt},
    {id: "b", action: "snooze", at: issuedAt, expiresAt: "2026-09-24T07:00:00.000Z"},
    {id: "c", action: "snooze", at: issuedAt, expiresAt: "2026-10-05T08:00:00.000Z"},
]);
assert.equal(normalized.find((entry) => entry.id === "a").expiresAt, expiresAt, "合法 expiresAt 保留");
assert.equal(normalized.find((entry) => entry.id === "b").expiresAt, undefined, "早于 at 的 expiresAt 丢弃");
assert.equal(normalized.find((entry) => entry.id === "c").expiresAt, undefined, "超过 7 天的 expiresAt 丢弃");

/* —— 6. 接线守门：偏好字段/设置页/今日视图安静变体/defer 按钮 —— */
const viewPrefSource = fs.readFileSync(path.join(root, "src", "view-preferences.ts"), "utf8");
assert.match(viewPrefSource, /reminderQuietHours: ReminderQuietHours;/, "偏好接口必须有安静时段字段");
assert.match(viewPrefSource, /normalizeReminderQuietHours\(source\.reminderQuietHours\)/, "偏好归一化必须走提醒偏好模块");
const settingsSource = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /data-setting-quiet/, "设置页必须有安静时段开关");
assert.match(settingsSource, /data-setting-quiet-start/, "设置页必须有开始时间输入");
assert.match(settingsSource, /data-setting-quiet-end/, "设置页必须有结束时间输入");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /isReminderQuietNow\(\)/, "宿主必须提供安静判定");
assert.match(indexSource, /expiresAt: new Date\(nowMs \+ 2 \* 3600000\)\.toISOString\(\)/, "defer 必须写 2 小时防抖窗口");
const fragmentsSource = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /is-quiet/, "优先提醒条必须有安静变体");
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /data-reminder-action="defer"/, "提醒中心必须有延后按钮");
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
assert.match(bindSource, /action !== "defer"/, "绑定层必须放行 defer 动作");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["today.reminderQuiet", "review.reminderDefer", "review.reminderDeferAria", "set.reminderQuiet", "set.reminderQuietHint", "set.reminderQuietWindow", "set.reminderQuietUntil"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

/* —— 7. 纯度：reminder-preferences 零依赖 + 无时钟 —— */
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "reminder-preferences.ts"), "utf8");
assert.doesNotMatch(moduleSource, /^import /m, "偏好模块保持零依赖");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

/* —— 8. T-1451 每日提醒调度：槽位归一 + 宿主接线守门 —— */
{
    const {normalizeDailyReminderSlots, normalizeDailyReminderPreference, DAILY_REMINDER_MAX_SLOTS} = rp;
    /* 严格校验：非法时刻丢弃、去重、升序。 */
    assert.deepEqual(normalizeDailyReminderSlots(["21:00", "09:00", "9:00", "25:00", "bad", "09:00"]), ["09:00", "21:00"], "去重升序，非法丢弃");
    assert.deepEqual(normalizeDailyReminderSlots([]), [], "空数组合法（=启动一条原行为）");
    assert.deepEqual(normalizeDailyReminderSlots("09:00"), [], "非数组 fail-closed");
    const capped = normalizeDailyReminderSlots(["23:00", "07:00", "12:00", "18:00", "21:30"]);
    assert.equal(capped.length, DAILY_REMINDER_MAX_SLOTS, "封顶 4 个时刻");
    /* 偏好归一：缺失回落「启用 + 启动一条」（保留既有推送行为）；显式关闭被尊重。 */
    assert.deepEqual(normalizeDailyReminderPreference(undefined), {enabled: true, slots: []});
    assert.deepEqual(normalizeDailyReminderPreference({enabled: false, slots: ["08:00", "20:00"]}), {enabled: false, slots: ["08:00", "20:00"]});
    /* 宿主接线：minute 级槽位轮询 + 每槽 localDate 台账 + 启动补发合并至多一条。 */
    const indexSource3 = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
    assert.match(indexSource3, /maybeSendDailyReminder\("slot"\), 60_000/, "槽位检查必须是分钟级有界轮询");
    assert.match(indexSource3, /reminderFireLog\[`slot:\$\{slot\}`\] !== today/, "每槽按 localDate 幂等");
    assert.match(indexSource3, /trigger === "launch" && this\.reminderFireLog\.launch !== today/, "无槽位时保留启动一条的原行为");
    assert.match(indexSource3, /reminderSlotTimer/, "槽位计时器必须登记并随卸载清理");
    /* 设置结构与双语。 */
    const settingsSource3 = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
    for (const hook of ["data-setting-reminder-toggle", "data-setting-reminder-slots", "save-reminder-slots"]) {
        assert.ok(settingsSource3.includes(hook), `设置页必须包含 ${hook}`);
    }
    for (const key of ["set.reminderSchedule", "set.reminderScheduleHint", "set.reminderScheduleSlots", "set.reminderScheduleSlotsHint", "set.reminderScheduleSave", "msg.reminderSlotsSaved"]) {
        const occurrences = i18nSource.split(`"${key}"`).length - 1;
        assert.equal(occurrences, 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
    }
}

console.log("reminder-quiet tests passed: 安静时段解析/归一化/跨午夜逐半小时回放/半开边界 + 防抖到期与历史兼容 + 提醒调度归一与接线守门 全部通过");
