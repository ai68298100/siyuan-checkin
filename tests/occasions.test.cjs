const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync("src/occasions.ts", "utf8");
const indexSource = fs.readFileSync("src/index.ts", "utf8");
const viewSource = fs.readFileSync("src/render/occasions.ts", "utf8");
const bindSource = fs.readFileSync("src/render/bind-occasions.ts", "utf8");

assert.match(source, /getVisibleOccasions/);
assert.match(source, /remindBeforeDays/);
assert.match(source, /recurrence === "once"/);
assert.match(source, /markOccasionCompleted/);
assert.match(source, /completedDates/);
assert.match(viewSource, /data-occasion-filter="\$\{key\}"/, "occasion manager exposes category/status/time filters");
assert.match(viewSource, /data-occasion-clear-filters/, "occasion manager can return to the full list");
assert.match(viewSource, /occ\.remindSummary/, "occasion rows show reminder lead time");
assert.match(viewSource, /data-occasion-toitem/, "occasion rows retain the explicit check-in conversion action");
assert.match(viewSource, /lc-checkin__action-icon[\s\S]*lc-checkin__action-label/, "occasion actions keep icon and label nodes separate");
assert.doesNotMatch(viewSource, /lc-checkin__item(?:\s|\")/, "occasion manager does not masquerade as a Today check-in card");
/* —— T-1580/T-1592/T-1593：agenda 分组、表单抽屉、转打卡确认 —— */
assert.match(viewSource, /data-occasion-form-drawer \$\{isFormOpen \? "open" : ""\}/, "表单收进抽屉（按 root 会话展开）");
for (const section of ["today", "missed", "upcoming", "ended", "disabled"]) {
    assert.match(viewSource, new RegExp(`data-agenda-section="\\$\\{id\\}"`), "agenda 分组头模板在位") ;
    break;
}
for (const key of ["occ.agendaToday", "occ.agendaMissed", "occ.agendaUpcoming", "occ.agendaEnded", "occ.agendaDisabled"]) {
    assert.match(viewSource, new RegExp(`agendaGroup\\("[a-z]+", t\\("${key}"`), `agenda 分组 ${key} 在位`);
}
assert.match(bindSource, /\[data-occasion-form-drawer\]/, "revealOccasionForm 必须展开抽屉");
assert.match(indexSource, /msg\.occasionToItemConfirm/, "转打卡必须先经预览确认弹窗");
assert.match(indexSource, /msg\.alreadyGenerated/, "重复转换拦截前置");
const i18nSourceT1578 = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["occ.agendaToday", "occ.agendaMissed", "occ.agendaUpcoming", "occ.agendaEnded", "occ.agendaDisabled", "msg.occasionToItemConfirm"]) {
    const count = i18nSourceT1578.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} 必须中英双语齐备（当前 ${count}）`);
}
assert.match(bindSource, /writeState\(\{occasionTemplatesOpen:/, "template disclosure writes the owning root");
assert.match(bindSource, /occasionStatusFilter/);
assert.match(bindSource, /occasionKindFilter/);
assert.match(bindSource, /occasionTimeFilter/);
const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasions-")), "occasions.js");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
fs.writeFileSync(output, ts.transpileModule(source, {compilerOptions}).outputText);
fs.writeFileSync(path.join(path.dirname(output), "lunar.js"), ts.transpileModule(fs.readFileSync("src/lunar.ts", "utf8"), {compilerOptions}).outputText);
fs.writeFileSync(path.join(path.dirname(output), "i18n.js"), ts.transpileModule(fs.readFileSync("src/i18n.ts", "utf8"), {compilerOptions}).outputText);
for (const filename of ["date-keys.ts", "model.ts", "record-step.ts", "quota.ts", "rules.ts", "types.ts"]) {
    fs.writeFileSync(
        path.join(path.dirname(output), filename.replace(/\.ts$/, ".js")),
        ts.transpileModule(fs.readFileSync(`src/${filename}`, "utf8"), {compilerOptions}).outputText
    );
}
fs.writeFileSync(path.join(path.dirname(output), "reminders.js"), ts.transpileModule(fs.readFileSync("src/reminders.ts", "utf8"), {compilerOptions}).outputText);
const occasions = require(output);
const reminders = require(path.join(path.dirname(output), "reminders.js"));
// Exercise the actual form binding: monthly ordinal must be reachable, and
// switching recurrence hides irrelevant blocks without dropping its value.
{
    const module = {exports: {}};
    new Function("require", "module", "exports", ts.transpileModule(bindSource, {compilerOptions}).outputText)((id) => {
        if (id === "../occasions") return occasions;
        if (id === "./occasion-session") return {
            readOccasionsRootContext: () => ({occasionSearchQuery: "", occasionStatusFilter: "all", occasionKindFilter: "all", occasionTimeFilter: "all", occasionTemplatesOpen: false, occasionTemplateCategory: "recommended", helpOpen: false, actionsHelpOpen: false, noteExpandedIds: new Set(), occurrenceMoves: {}, formSession: 0, submitting: false, deletingOccasionIds: new Set()}),
            writeOccasionsRootContext() {}, captureOccasionDraftFor() {}, nextOccasionFormSession: state => ++state.formSession, isCurrentOccasionFormSession: () => true,
        };
        if (["../i18n", "../model", "../shared", "../lunar", "siyuan"].includes(id)) return {};
        throw new Error(`Unexpected occasion binding dependency ${id}`);
    }, module, module.exports);
    const fields = Object.fromEntries(Object.entries({recurrence: "monthly", monthlySubtype: "nthweek", annualSubtype: "byday", annualNth: "3"}).map(([name, value]) => [name, {value, listeners: {}, addEventListener(event, handler) { this.listeners[event] = handler; }}]));
    const blocks = ["annual-calendar", "annual-nthweek", "monthly-sub", "monthly-nthweek", "nthweek-ordinal", "weekly", "interval"].map(key => ({dataset: {occasionBlock: key}, hidden: false}));
    const form = {
        querySelector(selector) { return selector === "[data-occasion-monthly-subtype]" ? fields.monthlySubtype : fields[selector.match(/name='([^']+)'/)?.[1]] || null; },
        querySelectorAll() { return blocks; }, addEventListener() {},
    };
    const root = {
        querySelector(selector) { return selector === "[data-occasion-form]" ? form : selector === "[data-occasion-recurrence]" ? fields.recurrence : selector === "[data-occasion-monthly-subtype]" ? fields.monthlySubtype : null; },
        querySelectorAll() { return []; },
    };
    module.exports.bindOccasionsHandlers(root, {bindDialogClose() {}, bindMobileNav() {}, syncOccasionLunarHint() {}});
    const visible = key => !blocks.find(block => block.dataset.occasionBlock === key).hidden;
    assert.equal(visible("nthweek-ordinal"), true, "monthly Nth weekday exposes the ordinal selector");
    fields.monthlySubtype.value = "lastday"; fields.monthlySubtype.listeners.change();
    assert.equal(visible("nthweek-ordinal"), false, "month-end rules do not show an irrelevant ordinal");
    fields.recurrence.value = "annual"; fields.annualSubtype.value = "nthweek"; fields.recurrence.listeners.change();
    assert.equal(visible("nthweek-ordinal"), true, "annual Nth weekday shares the same ordinal selector");
    assert.equal(fields.annualNth.value, "3", "switching recurrence retains the selected ordinal");
    fields.recurrence.value = "weekly"; fields.recurrence.listeners.change();
    assert.equal(visible("nthweek-ordinal"), false, "weekly rules hide the ordinal selector");
    assert.match(viewSource, /data-occasion-block="nthweek-ordinal"[\s\S]*?occ\.nthOccurrence[\s\S]*?name="annualNth"/, "visible ordinal keeps the established form-save field name");
    assert.equal((viewSource.match(/name="annualNth"/g) || []).length, 1, "annual and monthly must not submit duplicate ordinal controls");
    const monthlyThirdMonday = occasions.normalizeOccasion({id: "nth-monthly", name: "月度复盘", kind: "scheduled", date: "2026-01-01", recurrence: "monthly", monthlySubtype: "nthweek", nthWeek: 3, weekday: 1, enabled: true});
    assert.equal(occasions.getOccurrenceDate(monthlyThirdMonday, "2026-09-01"), "2026-09-21", "the selected monthly third Monday maps to its actual date");
}
const annual = occasions.normalizeOccasion({id: "birthday", name: "妈妈生日", kind: "birthday", date: "2026-09-12", recurrence: "annual", remindBeforeDays: 3, enabled: true});
assert.equal(annual.date, "2026-09-12");
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [annual]}, new Date(2026, 8, 9, 12))[0].daysUntil, 3);
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [annual]}, new Date(2026, 8, 12, 12))[0].status, "today");
const completed = occasions.markOccasionCompleted({version: 1, occasions: [annual]}, "birthday", "2026-09-12", true);
assert.equal(occasions.isOccasionCompleted(completed.occasions[0], "2026-09-12"), true);
const reminderProjection = reminders.projectOccasionReminders({version: 1, occasions: [annual]}, new Date(2026, 8, 12, 12));
assert.deepEqual(reminderProjection[0], {id: "occasion:birthday:2026-09-12", source: "occasion", sourceId: "birthday", title: annual.name, dueDate: "2026-09-12", daysUntil: 0, status: "today", note: ""});
const completedProjection = reminders.projectOccasionReminders(completed, new Date(2026, 8, 12, 12));
assert.equal(completedProjection[0].status, "completed");
const overdue = reminders.projectOverdueOccasionReminders({version: 1, occasions: [annual]}, new Date(2026, 8, 15, 12));
assert.equal(overdue.length, 0, "recurring occasions stay out of conservative overdue projection");
const onceOverdue = reminders.projectOverdueOccasionReminders({version: 1, occasions: [{...annual, id: "once-overdue", recurrence: "once", date: "2026-09-10", completedDates: []}]}, new Date(2026, 8, 15, 12));
assert.equal(onceOverdue[0].status, "overdue");
assert.equal(onceOverdue[0].daysUntil, -5);
const once = occasions.normalizeOccasion({id: "loan", name: "还房贷", kind: "scheduled", date: "2026-09-15", recurrence: "once", remindBeforeDays: 2, enabled: true});
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [once]}, new Date(2026, 8, 13, 12))[0].daysUntil, 2);
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [once]}, new Date(2026, 8, 16, 12)).length, 0);
const monthly = occasions.normalizeOccasion({id: "card", name: "信用卡还款", kind: "scheduled", date: "2026-01-15", recurrence: "monthly", remindBeforeDays: 2, enabled: true});
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [monthly]}, new Date(2026, 8, 13, 12))[0].daysUntil, 2);
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [monthly]}, new Date(2026, 1, 27, 12)).length, 0);
const monthEnd = occasions.normalizeOccasion({id: "month-end", name: "月末扣费", kind: "scheduled", date: "2026-01-31", recurrence: "monthly", remindBeforeDays: 2, enabled: true});
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [monthEnd]}, new Date(2026, 1, 27, 12))[0].occurrenceDate, "2026-02-28");
const leapBirthday = occasions.normalizeOccasion({id:"leap", name:"闰年生日", kind:"birthday", date:"2028-02-29", recurrence:"annual", remindBeforeDays:3});
assert.equal(occasions.getVisibleOccasions({version:1, occasions:[leapBirthday]}, new Date(2027, 1, 27, 12)).length, 0);
assert.equal(occasions.getVisibleOccasions({version:1, occasions:[leapBirthday]}, new Date(2028, 1, 26, 12))[0].occurrenceDate, "2028-02-29");
const capped = occasions.normalizeOccasion({id:"capped", name:"限制", date:"2026-09-20", recurrence:"once", remindBeforeDays:999, completedDates:["2026-09-20","bad","2026-09-19"]});
assert.equal(capped.remindBeforeDays, 365); assert.deepEqual(capped.completedDates, ["2026-09-20","2026-09-19"]);
const unchanged = {version:1, occasions:[once]}; assert.equal(occasions.markOccasionCompleted(unchanged, "missing", "2026-09-15", true), unchanged);
const marked = occasions.markOccasionCompleted(unchanged, "loan", "2026-09-15", true); assert.notEqual(marked, unchanged); assert.equal(occasions.isOccasionCompleted(marked.occasions[0], "2026-09-15"), true); const unmarked = occasions.markOccasionCompleted(marked, "loan", "2026-09-15", false); assert.equal(occasions.isOccasionCompleted(unmarked.occasions[0], "2026-09-15"), false);
// v5 recurrence engine: lunar annual, weekly, quarterly, interval, month-end/nth-week variants.
const lunarBirthday = occasions.normalizeOccasion({id: "lunar-bday", name: "农历生日", kind: "birthday", date: "2026-02-17", recurrence: "annual", calendar: "lunar", remindBeforeDays: 3, enabled: true});
assert.ok(lunarBirthday, "lunar birthday normalizes");
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [lunarBirthday]}, new Date(2027, 1, 4, 12))[0].occurrenceDate, "2027-02-06",
    "lunar annual must land on 正月初一 2027 (2027-02-06)");
const weekly = occasions.normalizeOccasion({id: "weekly", name: "周会", kind: "scheduled", date: "2026-09-10", recurrence: "weekly", weekday: 4, remindBeforeDays: 1, enabled: true});
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [weekly]}, new Date(2026, 8, 10, 12))[0].status, "today");
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [weekly]}, new Date(2026, 8, 16, 12))[0].occurrenceDate, "2026-09-17");
const quarterly = occasions.normalizeOccasion({id: "q", name: "物业费", kind: "scheduled", date: "2026-03-10", recurrence: "quarterly", remindBeforeDays: 5, enabled: true});
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [quarterly]}, new Date(2026, 8, 8, 12))[0].occurrenceDate, "2026-09-10");
const interval = occasions.normalizeOccasion({id: "iv", name: "体检", kind: "scheduled", date: "2026-03-15", recurrence: "interval", intervalUnit: "month", intervalCount: 6, remindBeforeDays: 7, enabled: true});
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [interval]}, new Date(2026, 8, 12, 12))[0].occurrenceDate, "2026-09-15");
const nthWeek = occasions.normalizeOccasion({id: "moms-day", name: "母亲节", kind: "scheduled", date: "2026-05-10", recurrence: "annual", annualSubtype: "nthweek", month: 5, nthWeek: 2, weekday: 0, remindBeforeDays: 7, enabled: true});
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [nthWeek]}, new Date(2026, 4, 8, 12))[0].occurrenceDate, "2026-05-10",
    "mother's day 2026 is the 2nd sunday of may");
const lastDay = occasions.normalizeOccasion({id: "last", name: "月末", kind: "scheduled", date: "2026-01-31", recurrence: "monthly", monthlySubtype: "lastday", remindBeforeDays: 2, enabled: true});
assert.equal(occasions.getVisibleOccasions({version: 1, occasions: [lastDay]}, new Date(2026, 3, 28, 12))[0].occurrenceDate, "2026-04-30");
assert.ok(occasions.OCCASION_TEMPLATES.length >= 30, "occasion template library covers detailed everyday scenarios");
assert.deepEqual([...new Set(occasions.OCCASION_TEMPLATES.map((template) => template.category))].sort(), ["anniversary", "birthday", "expense", "festival", "health", "renewal"], "template library exposes all six categories");

/* T-100 逾期历史：过去发生、从未补记的次数按发生日倒序返回；补记过的不算；今天不计入。 */
const historyToday = new Date(2026, 8, 20, 12);
const missed = occasions.normalizeOccasion({id: "card", name: "信用卡还款", kind: "scheduled", date: "2026-07-15", recurrence: "monthly", monthlySubtype: "byday", remindBeforeDays: 2, enabled: true});
const missedHistory = reminders.projectOverdueOccurrenceHistory({version: 1, occasions: [missed]}, historyToday);
assert.equal(missedHistory.length, 3, "july/august/september occurrences are all missed before the 20th");
assert.deepEqual(missedHistory.map((entry) => entry.occurrenceDate), ["2026-09-15", "2026-08-15", "2026-07-15"], "history is sorted newest first");
assert.equal(missedHistory[0].overdueDays, 5, "overdue days count from the occurrence date");
assert.equal(missedHistory[0].occasionId, "card");
const missedCompleted = occasions.markOccasionCompleted({version: 1, occasions: [missed]}, "card", "2026-08-15", true);
const missedCompletedHistory = reminders.projectOverdueOccurrenceHistory(missedCompleted, historyToday);
assert.equal(missedCompletedHistory.length, 2, "completed occurrences leave the overdue history");
assert.ok(!missedCompletedHistory.some((entry) => entry.occurrenceDate === "2026-08-15"), "the completed date must not appear in history");
const onceMissed = occasions.normalizeOccasion({id: "once-missed", name: "一次性缴款", kind: "scheduled", date: "2026-09-01", recurrence: "once", remindBeforeDays: 2, enabled: true});
assert.equal(reminders.projectOverdueOccurrenceHistory({version: 1, occasions: [onceMissed]}, historyToday).length, 1, "a missed one-off occasion is part of history");
assert.equal(reminders.projectOverdueOccurrenceHistory({version: 1, occasions: [{...onceMissed, date: "2026-09-25"}]}, historyToday).length, 0, "future one-off occasions have no history");
assert.equal(reminders.projectOverdueOccurrenceHistory({version: 1, occasions: [occasions.markOccasionCompleted({version: 1, occasions: [onceMissed]}, "once-missed", "2026-09-01", true)]}, historyToday).length, 0, "a completed one-off occasion has no history");
const disabledMissed = occasions.normalizeOccasion({...missed, id: "disabled", enabled: false});
assert.equal(reminders.projectOverdueOccurrenceHistory({version: 1, occasions: [disabledMissed]}, historyToday).length, 0, "disabled occasions are out of the history");
const todayAnchored = occasions.normalizeOccasion({id: "today-anchor", name: "今天到期", kind: "scheduled", date: "2026-09-20", recurrence: "monthly", remindBeforeDays: 0, enabled: true});
assert.equal(reminders.projectOverdueOccurrenceHistory({version: 1, occasions: [todayAnchored]}, historyToday).length, 0, "today's own occurrence is not history");
const weeklyMissed = occasions.normalizeOccasion({id: "weekly", name: "周报", kind: "scheduled", date: "2026-09-06", recurrence: "weekly", weekday: 0, remindBeforeDays: 0, enabled: true});
const weeklyHistory = reminders.projectOverdueOccurrenceHistory({version: 1, occasions: [weeklyMissed]}, new Date(2026, 8, 21, 12));
assert.deepEqual(weeklyHistory.map((entry) => entry.occurrenceDate), ["2026-09-20", "2026-09-13", "2026-09-06"], "weekly history walks every missed week");
console.log("Overdue occurrence history checks passed.");
console.log("Occasion model structure checks passed.");

// Hidden weekday selects still participate in FormData; execute the real host
// save method so changing the visible monthly/weekly field cannot regress.
(async () => {
    const sourceFile = ts.createSourceFile("index.ts", indexSource, ts.ScriptTarget.Latest, true);
    const pluginClass = sourceFile.statements.find(node => ts.isClassDeclaration(node));
    const method = pluginClass.members.find(node => node.name?.getText(sourceFile) === "saveOccasionForm").getText(sourceFile);
    const compiled = ts.transpileModule(`class OccasionHost { ${method} }`, {compilerOptions}).outputText;
    const environment = {...occasions, solarToLunar: () => undefined, t: key => key, showMessage: message => { throw new Error(message); }};
    const Host = new Function(...Object.keys(environment), `${compiled}\nreturn OccasionHost;`)(...Object.values(environment));
    const host = new Host();
    host.occasionStore = {version: 1, occasions: []};
    let writes = 0;
    host.persistOccasions = async () => { writes++; };
    host.render = () => {};
    const dataFor = (name, recurrence, overrides = {}) => new Map(Object.entries({
        name, date: "2026-09-01", kind: "scheduled", recurrence, remindBeforeDays: "3",
        annualNth: "3", annualWeekday: "0", weeklyWeekday: "4", monthlyWeekday: "1", monthlySubtype: "nthweek",
        ...overrides,
    }));
    await host.saveOccasionForm(dataFor("月度第三周一", "monthly"));
    const monthly = host.occasionStore.occasions.find(item => item.name === "月度第三周一");
    assert.equal(monthly.weekday, 1, "visible monthly Monday wins over the hidden annual Sunday");
    assert.equal(monthly.nthWeek, 3, "shared ordinal is saved for monthly rules");
    assert.equal(occasions.getOccurrenceDate(monthly, "2026-09-01"), "2026-09-21");
    await host.saveOccasionForm(dataFor("每周四复盘", "weekly"));
    const weekly = host.occasionStore.occasions.find(item => item.name === "每周四复盘");
    assert.equal(weekly.weekday, 4, "visible weekly Thursday wins over hidden annual/monthly fields");
    assert.equal(occasions.getOccurrenceDate(weekly, "2026-09-01"), "2026-09-03");
    await host.saveOccasionForm(dataFor("母亲节", "annual", {annualMonth: "5", annualNth: "2", annualSubtype: "nthweek"}));
    const annual = host.occasionStore.occasions.find(item => item.name === "母亲节");
    assert.equal(annual.weekday, 0, "annual Sunday remains valid despite conflicting hidden fields");
    assert.equal(annual.nthWeek, 2);
    assert.equal(writes, 3, "each form selection is persisted once");
    console.log("Occasion form save checks passed: monthly/weekly/annual use their visible weekday and shared ordinal.");
})();

/* —— T-1491 纪念日里程碑投影：满-N 约定、阶梯/月/年派生、农历降级、确定性、文案。 —— */
{
    const anniversary = occasions.normalizeOccasion({id: "m1", name: "在一起", kind: "anniversary", date: "2024-06-01", recurrence: "annual", remindBeforeDays: 3, note: "", enabled: true, completedDates: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"});
    assert.ok(anniversary, "fixture normalizes");
    /* 满-N：锚点+365 → 2025-06-01，daysBetween = 365。 */
    const milestones = occasions.nextOccasionMilestones(anniversary, "2024-09-01", 5);
    assert.ok(milestones.length >= 3, "a fresh anniversary projects day/month/year milestones");
    const days365 = milestones.find((entry) => entry.kind === "days" && entry.count === 365);
    assert.equal(days365.date, "2025-06-01", "满-N day milestones land on anchor + N days");
    assert.ok(milestones.every((entry) => entry.date >= "2024-09-01"), "past milestones are not projected");
    const sorted = [...milestones].map((entry) => entry.date);
    assert.deepEqual(sorted, [...sorted].sort(), "milestones are date-ascending");
    /* 100 天里程碑恰在今天 → daysUntil 0 且文案走「今天…」。 */
    const at100 = occasions.nextOccasionMilestones(anniversary, "2024-09-09", 5);
    const today100 = at100.find((entry) => entry.kind === "days" && entry.count === 100);
    assert.equal(today100.daysUntil, 0, "the milestone day itself projects with daysUntil 0");
    const todayText = occasions.describeOccasionMilestone(anniversary, today100);
    assert.match(todayText, /今天/, "today's milestone copy is prefixed as such");
    const upcoming = occasions.describeOccasionMilestone(anniversary, milestones.find((entry) => entry.daysUntil > 0));
    assert.match(upcoming, /还有/, "upcoming milestones carry a days-away suffix");
    /* 越过阶梯末端后不再派生天数里程碑，但月/年仍继续。 */
    const farFuture = occasions.nextOccasionMilestones(anniversary, "2056-06-02", 5);
    assert.ok(farFuture.every((entry) => entry.kind !== "days" || entry.count <= 10000), "day milestones stay inside the ladder");
    assert.ok(farFuture.some((entry) => entry.kind === "yearly"), "yearly milestones continue beyond the ladder");
    /* 月钳制：锚点 31 日 → 2 月里程碑落在 2/29（闰年）而非 3/3。 */
    const monthEnd = occasions.normalizeOccasion({...anniversary, id: "m2", date: "2024-01-31"});
    const febMark = occasions.nextOccasionMilestones(monthEnd, "2024-02-01", 5).find((entry) => entry.kind === "monthly");
    assert.equal(febMark.date, "2024-02-29", "month milestones clamp to the month end");
    assert.equal(febMark.count, 1, "monthly count counts elapsed months");
    /* 农历年度事项：只派生满 N 天（不伪造月/年里程碑）。 */
    const lunarItem = occasions.normalizeOccasion({...anniversary, id: "m3", calendar: "lunar"});
    const lunarMilestones = occasions.nextOccasionMilestones(lunarItem, "2024-09-01", 5);
    assert.ok(lunarMilestones.length >= 1 && lunarMilestones.every((entry) => entry.kind === "days"), "lunar anniversaries project day milestones only");
    /* scheduled 一次性事项不派生。 */
    const once = occasions.normalizeOccasion({...anniversary, id: "m4", kind: "scheduled", recurrence: "once"});
    assert.deepEqual(occasions.nextOccasionMilestones(once, "2024-09-01", 5), [], "scheduled occasions carry no since-anchor milestones");
    /* 非法锚点 fail-closed；确定性。 */
    assert.deepEqual(occasions.nextOccasionMilestones({...anniversary, date: "2024-13-01"}, "2024-09-01", 5), []);
    assert.deepEqual(occasions.nextOccasionMilestones(anniversary, "2024-09-01", 5), occasions.nextOccasionMilestones(anniversary, "2024-09-01", 5));
    /* 生日年里程碑文案读作「N 岁」（limit 放宽以免前面的天阶梯挤占窗口）。 */
    const birthday = occasions.normalizeOccasion({...anniversary, id: "m5", kind: "birthday"});
    const ageMark = occasions.nextOccasionMilestones(birthday, "2024-09-01", 9).find((entry) => entry.kind === "yearly");
    const ageText = occasions.describeOccasionMilestone(birthday, ageMark);
    assert.match(ageText, /岁/, "birthday yearly milestones read as age");
}

/* —— T-1494 实例覆盖与错过处理：改期包装、错过后投影、覆盖写入往返。 —— */
{
    const monthly = occasions.normalizeOccasion({id: "o1", name: "月度检查", kind: "scheduled", date: "2026-01-15", recurrence: "monthly", remindBeforeDays: 3, note: "", enabled: true, completedDates: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"});
    /* 未覆盖时下一次为 2026-09-15（锚点 15 日）。 */
    assert.equal(occasions.getOccurrenceDate(monthly, "2026-09-01"), "2026-09-15");
    /* 单次改期到未来：新日期呈现，之后回周期轨道。 */
    const moved = occasions.setOccasionOverride({version: 1, occasions: [monthly]}, "o1", "2026-09-15", "2026-09-20");
    const movedItem = moved.occasions[0];
    assert.equal(movedItem.overrides["2026-09-15"].date, "2026-09-20");
    assert.equal(occasions.getOccurrenceDate(movedItem, "2026-09-01"), "2026-09-20", "the rescheduled instance surfaces on its new date");
    assert.equal(occasions.getOccurrenceDate(movedItem, "2026-09-20"), "2026-09-20");
    assert.equal(occasions.getOccurrenceDate(movedItem, "2026-09-21"), "2026-10-15", "after a consumed move the engine returns to the cycle track");
    /* 改期日已过（迟到的覆盖记录）不阻断后续发生点。 */
    const stale = occasions.setOccasionOverride({version: 1, occasions: [monthly]}, "o1", "2026-09-15", "2026-09-02");
    assert.equal(occasions.getOccurrenceDate(stale.occasions[0], "2026-09-21"), "2026-10-15");
    /* 移除覆盖（newDate undefined）恢复原轨道；覆盖条目随之整体移除。 */
    const restored = occasions.setOccasionOverride(moved, "o1", "2026-09-15", undefined);
    assert.ok(!restored.occasions[0].overrides, "an emptied override map is not materialized");
    assert.equal(occasions.getOccurrenceDate(restored.occasions[0], "2026-09-01"), "2026-09-15");
    /* 归一化 fail-closed：非法键/相同日期/非对象值丢弃；有界 60。 */
    const dirty = occasions.normalizeOccasion({...monthly, overrides: {"2026-13-01": {date: "2026-12-01"}, "2026-09-15": {date: "2026-09-15"}, "2026-10-15": "not-an-object", "2026-11-15": {date: "2026-12-15"}}});
    assert.deepEqual(dirty.overrides, {"2026-11-15": {date: "2026-12-15"}});
    const flood = occasions.normalizeOccasion({...monthly, overrides: Object.fromEntries(Array.from({length: 80}, (_, index) => {
        const day = new Date(2026, 0, 1 + index);
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
        return [key, {date: "2027-01-01"}];
    }))});
    assert.equal(Object.keys(flood.overrides || {}).length, 60, "override entries cap at 60");
    /* 错过后投影：上一周期未标记 → 提示；补标记后消失。 */
    const withHistory = occasions.normalizeOccasion({...monthly, completedDates: ["2026-09-15"]});
    assert.equal(occasions.getMissedOccurrence(monthly, "2026-09-20"), "2026-09-15", "an unmarked previous cycle is surfaced");
    assert.equal(occasions.getMissedOccurrence(withHistory, "2026-09-20"), undefined, "a marked previous cycle is not flagged");
    assert.equal(occasions.getMissedOccurrence({...monthly, enabled: false}, "2026-09-20"), undefined);
    assert.equal(occasions.getMissedOccurrence({...monthly, recurrence: "once"}, "2026-09-20"), undefined, "once items have no missed-cycle semantics");
    /* 未匹配 id 原样返回 store（宿主身份回滚依赖）。 */
    const monthlyStore = {version: 1, occasions: [monthly]};
    assert.equal(occasions.setOccasionOverride(monthlyStore, "nope", "2026-09-15", "2026-09-20"), monthlyStore);
    /* 确定性。 */
    assert.deepEqual(occasions.nextOccasionMilestones(monthly, "2026-09-01", 3), occasions.nextOccasionMilestones(monthly, "2026-09-01", 3));
}

/* —— T-1492 时间表达：自然历跨度 + 长周期周期进度。 —— */
{
    /* 三段跨度：2024-06-01 → 2026-09-27 = 2 年 3 个月 26 天。 */
    const span = occasions.elapsedSpanSince("2024-06-01", "2026-09-27");
    assert.deepEqual(span, {years: 2, months: 3, days: 26}, "elapsed span splits calendar years/months/days");
    /* 月满钳制：锚点 31 日 → 2/29 即满 1 个月；2/28 尚未满月（28 天）。 */
    assert.deepEqual(occasions.elapsedSpanSince("2024-01-31", "2024-02-29"), {years: 0, months: 1, days: 0});
    assert.deepEqual(occasions.elapsedSpanSince("2024-01-31", "2024-02-28"), {years: 0, months: 0, days: 28});
    /* 零跨度与非法输入。 */
    assert.deepEqual(occasions.elapsedSpanSince("2024-06-01", "2024-06-01"), {years: 0, months: 0, days: 0});
    assert.equal(occasions.elapsedSpanSince("2024-06-01", "2024-05-31"), undefined, "before-anchor spans are undefined");
    assert.equal(occasions.elapsedSpanSince("2024-02-30", "2024-03-30"), undefined);
    /* 组合文案：零单位跳过（2 年 0 个月 14 天 → 「2 年 14 天」）。 */
    const zhSpan = occasions.describeElapsedSpan({years: 2, months: 0, days: 14});
    assert.ok(zhSpan.includes("2") && zhSpan.includes("14") && !zhSpan.split(" ").includes("0"), "zero middle units are skipped");
    /* 周期进度：quarterly 锚点 2026-07-01 周期内 2026-09-27 → 前周期起点 07-01、终点 10-01。 */
    const quarterly = occasions.normalizeOccasion({id: "c1", name: "季度节点", kind: "scheduled", date: "2026-07-01", recurrence: "quarterly", remindBeforeDays: 3, note: "", enabled: true, completedDates: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"});
    const cycle = occasions.occasionCycleProgress(quarterly, "2026-09-27");
    assert.ok(cycle && cycle.percent >= 90 && cycle.percent <= 100, `quarterly cycle progress near the cycle end (got ${cycle && cycle.percent})`);
    /* 季度是模周期（锚点前后皆按月日网格取发生点）：任意发生日读作满周期，前一日接近满。 */
    const atNode = occasions.occasionCycleProgress(quarterly, "2026-01-01");
    assert.ok(atNode && atNode.percent === 100, "any occurrence day reads as a completed cycle");
    assert.equal(occasions.occasionCycleProgress(quarterly, "2026-04-01").percent, 100);
    const atEnd = occasions.occasionCycleProgress(quarterly, "2026-10-01");
    assert.ok(atEnd && atEnd.percent === 100, "the occurrence day itself reads as a completed cycle");
    /* 周期 <14 天不派生（weekly 太短）。 */
    const weekly = occasions.normalizeOccasion({...quarterly, id: "c2", recurrence: "weekly", weekday: 6, date: "2026-09-26"});
    assert.equal(occasions.occasionCycleProgress(weekly, "2026-09-27"), undefined, "short cycles stay bar-free");
    /* nthweek / 农历 / once 不派生。 */
    assert.equal(occasions.occasionCycleProgress({...quarterly, recurrence: "annual", annualSubtype: "nthweek", month: 5, nthWeek: 2, weekday: 0}, "2026-09-27"), undefined);
    assert.equal(occasions.occasionCycleProgress({...quarterly, recurrence: "annual", calendar: "lunar"}, "2026-09-27"), undefined);
    assert.equal(occasions.occasionCycleProgress({...quarterly, recurrence: "once"}, "2026-09-27"), undefined);
    assert.deepEqual(occasions.elapsedSpanSince("2024-06-01", "2026-09-27"), occasions.elapsedSpanSince("2024-06-01", "2026-09-27"));
}

/* —— T-1491 接线：事项列表行 + 今日横幅 + i18n 双语。 —— */
assert.match(viewSource, /nextOccasionMilestones\(item, todayKey, 1\)/, "occasion rows project the nearest milestone");
assert.match(viewSource, /lc-checkin__occasion-milestone/, "occasion rows render the milestone badge");
assert.match(viewSource, /elapsedSpanSince\(item\.date, todayKey\)/, "anniversary rows show the natural-calendar span");
assert.match(viewSource, /occasionCycleProgress\(item, todayKey\)/, "long cycles render a per-cycle progress bar");
assert.match(viewSource, /occ\.cycleProgress/, "cycle bars label themselves as cycle progress (not completion rate)");
assert.match(viewSource, /getMissedOccurrence\(item, todayKey\)/, "occasion rows surface the unmarked previous cycle");
assert.match(viewSource, /data-occasion-late-complete/, "late occurrences expose a mark-complete action");
assert.match(viewSource, /data-occasion-move-toggle/, "recurring occasions expose a single-instance reschedule action");
assert.match(viewSource, /const moveState = ctx\.occurrenceMoves\[item\.id\]/, "reschedule rows read the owning root session");
assert.match(viewSource, /value="\$\{escapeHtml\(moveDate\)\}"/, "reschedule date draft survives a root redraw");
assert.match(bindSource, /data-occasion-late-complete/, "late marks route through the shared completion channel");
assert.match(bindSource, /saveOccasionOverride/, "reschedules go through the host override channel");
assert.match(bindSource, /writeState\(\{occurrenceMoves:/, "reschedule open/date changes write the owning root session");
assert.match(bindSource, /renderRoot\(\);[\s\S]*data-occasion-move-date/, "reschedule toggle redraws only the owning root and restores focus");
const indexSource2 = fs.readFileSync("src/index.ts", "utf8");
assert.match(indexSource2, /private saveOccasionOverride\(id: string, originalDate: string, newDate: string, root\?: HTMLElement\): void/, "host implements the override persistence wrapper");
assert.match(indexSource2, /setOccasionOverride\(previous, id, originalDate, newDate\)/, "host delegates to the pure override writer");
for (const key of ["occ.lateHint", "occ.lateComplete", "occ.moveOccurrence", "occ.moveConfirm", "occ.moveDone", "occ.moveInvalid"]) {
    assert.equal(fs.readFileSync("src/i18n.ts", "utf8").split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}
for (const key of ["occ.spanYear", "occ.spanMonth", "occ.spanDay", "occ.cycleProgress"]) {
    assert.equal(fs.readFileSync("src/i18n.ts", "utf8").split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}
const fragmentsSource = fs.readFileSync("src/render/fragments.ts", "utf8");
assert.match(fragmentsSource, /is-milestone/, "today banner marks milestone-day chips");
assert.match(fragmentsSource, /describeOccasionMilestone\(item, milestone\)/, "banner copy goes through the shared formatter");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");
for (const key of ["occ.milestoneDays", "occ.milestoneMonthly", "occ.milestoneYearly", "occ.milestoneAge", "occ.milestoneToday", "occ.milestoneUpcoming"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}
console.log("occasion milestone gates passed: 满-N convention, ladder/month/year projection, lunar fallback, clamping, wiring, i18n parity");
