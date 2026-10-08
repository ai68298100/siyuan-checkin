/* T-1513 单项目未来 30 天排期预演守门：
   与 rules.ts isScheduled 同口径（工作日/指定星期/间隔/配额）、
   闰日与月末窗口、配额不编造固定执行日且展示窗口剩余、
   非法草稿 fail-closed 不回落默认排期、确定性与编辑器接线、双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-schedule-preview-"));
const load = (relative) => {
    const target = path.join(dir, "src", relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
load("date-keys.ts");
const preview = load("features/schedule-preview.ts");

/* —— 1. 工作日：2026-09-21 是周一；周末为非应做日。 —— */
{
    const result = preview.buildSchedulePreview({type: "workdays"}, "2026-09-21");
    assert.equal(result.days.length, 30);
    assert.equal(result.days[0].scheduled, true, "Monday is a workday");
    assert.equal(result.days[5].scheduled, false, "Saturday rests");
    assert.equal(result.days[6].scheduled, false, "Sunday rests");
    assert.equal(result.days[7].scheduled, true, "next Monday again scheduled");
    assert.equal(result.days[0].reasonKey, "editor.scheduleReason.workdays");
    assert.equal(result.invalidReasonKey, undefined);
}

/* —— 2. 指定星期：仅周一/三/五应做；空星期列表非法。 —— */
{
    const result = preview.buildSchedulePreview({type: "custom", weekdays: [1, 3, 5]}, "2026-09-21");
    const scheduled = result.days.filter((day) => day.scheduled).map((day) => day.date);
    assert.deepEqual(scheduled, ["2026-09-21", "2026-09-23", "2026-09-25", "2026-09-28", "2026-09-30", "2026-10-02", "2026-10-05", "2026-10-07", "2026-10-09", "2026-10-12", "2026-10-14", "2026-10-16", "2026-10-19"]);
    assert.equal(preview.buildSchedulePreview({type: "custom", weekdays: []}, "2026-09-21").invalidReasonKey, "editor.schedulePreviewInvalid");
    assert.equal(preview.buildSchedulePreview({type: "custom", weekdays: [9]}, "2026-09-21").invalidReasonKey, "editor.schedulePreviewInvalid");
}

/* —— 3. 间隔：锚点起每 N 天；间隔前与间隙为非应做；跨月对齐。 —— */
{
    const result = preview.buildSchedulePreview({type: "interval", intervalDays: 3, anchorDate: "2026-09-22"}, "2026-09-21");
    const scheduled = result.days.filter((day) => day.scheduled).map((day) => day.date);
    assert.deepEqual(scheduled, ["2026-09-22", "2026-09-25", "2026-09-28", "2026-10-01", "2026-10-04", "2026-10-07", "2026-10-10", "2026-10-13", "2026-10-16", "2026-10-19"]);
    assert.equal(preview.buildSchedulePreview({type: "interval", intervalDays: 0, anchorDate: "2026-09-22"}, "2026-09-21").invalidReasonKey, "editor.schedulePreviewInvalid");
    assert.equal(preview.buildSchedulePreview({type: "interval", intervalDays: 2}, "2026-09-21").invalidReasonKey, "editor.schedulePreviewInvalid");
}

/* —— 4. 配额：不编造固定执行日（全部灵活应做）；窗口跨闰月与月末；剩余次数。 —— */
{
    const result = preview.buildSchedulePreview({type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}}, "2026-09-21", {quotaCurrentCount: 1});
    assert.equal(result.days.filter((day) => day.scheduled).length, 30, "quota days stay flexible, no fabricated fixed days");
    assert.equal(result.quotaWindows.length, 5, "30 days span 5 ISO weeks");
    assert.equal(result.quotaWindows[0].startDate, "2026-09-21", "week window starts Monday");
    assert.equal(result.quotaWindows[0].endDate, "2026-09-27");
    assert.equal(result.quotaWindows[0].remaining, 2, "current window subtracts the used count");
    assert.equal(result.quotaWindows[1].remaining, 3, "future windows have the full amount left");
    const february = preview.buildSchedulePreview({type: "quota", quota: {period: "month", amount: 12, countMode: "value"}}, "2028-01-20");
    assert.equal(february.quotaWindows[0].endDate, "2028-01-31");
    assert.equal(february.quotaWindows[1].startDate, "2028-02-01", "leap-year February window");
    assert.equal(february.quotaWindows[1].endDate, "2028-02-18", "window truncates at the preview horizon");
    const insideFebruary = preview.buildSchedulePreview({type: "quota", quota: {period: "month", amount: 12, countMode: "value"}}, "2028-02-10");
    assert.equal(insideFebruary.quotaWindows[0].endDate, "2028-02-29", "leap month ends on the 29th");
    assert.equal(preview.buildSchedulePreview({type: "quota", quota: {period: "month", amount: 0, countMode: "dates"}}, "2026-09-21").invalidReasonKey, "editor.schedulePreviewInvalid");
}

/* —— 5. 每天 + 确定性 + 有界；非法起始日期 fail-closed。 —— */
{
    const daily = preview.buildSchedulePreview({type: "daily"}, "2026-09-21");
    assert.ok(daily.days.every((day) => day.scheduled));
    assert.deepEqual(daily, preview.buildSchedulePreview({type: "daily"}, "2026-09-21"));
    assert.equal(daily.days[29].date, "2026-10-20");
    assert.equal(preview.buildSchedulePreview({type: "daily"}, "2026/09/21").invalidReasonKey, "editor.schedulePreviewInvalid");
    assert.equal(preview.buildSchedulePreview({type: "daily"}, "2026-02-30").invalidReasonKey, "editor.schedulePreviewInvalid", "impossible dates fail closed instead of rolling into March");
    assert.equal(preview.buildSchedulePreview({type: "interval", intervalDays: 2, anchorDate: "2026-02-31"}, "2026-02-28").invalidReasonKey, "editor.schedulePreviewInvalid", "impossible interval anchors fail closed");
}

/* —— 6. 编辑器接线与双语。 —— */
const editorSource = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
assert.match(editorSource, /data-schedule-preview/, "editor preview card hosts the schedule preview");
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-editor.ts"), "utf8");
assert.match(bindSource, /buildSchedulePreview\(draft, dateKey\(currentCalendarDate\(\)\)\)/, "preview recomputes from the current draft deterministically");
assert.match(bindSource, /input\[name='weekday'\]"\)\.forEach\(\(input\) => input\.addEventListener\("change", updateEditorPreview\)/, "weekday edits recalculate the preview");
assert.match(bindSource, /input\[name='anchorDate'\]/, "anchor edits recalculate the preview");
assert.match(bindSource, /data-schedule-preview/, "preview markup target exists");
const scss = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
assert.match(scss, /\.editor-schedule-days li\.is-on \{/, "scheduled day chips styled on the accent ladder");
assert.match(scss, /\.editor-schedule-invalid \{/, "invalid draft message styled");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["editor.schedulePreviewTitle", "editor.schedulePreviewHint", "editor.schedulePreviewSummary", "editor.scheduleQuotaWindow", "editor.scheduleReason.daily", "editor.scheduleReason.workdays", "editor.scheduleReason.weekday", "editor.scheduleReason.interval", "editor.scheduleReason.quotaFlex", "editor.scheduleReason.rest", "editor.schedulePreviewInvalid"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("schedule preview gates passed: kernel-parity schedule projection, leap month windows, flexible quota without fabricated days, fail-closed invalid drafts, editor wiring and bilingual copy.");
