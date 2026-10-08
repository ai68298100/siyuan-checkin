/* T-1719 守门：完成历史与 120 日截断的用户语义（D-362）。
   风险路径（数据透明）：normalizeOccasion 对完成日期仅留末 120 条，页面未展示
   历史或截断说明——有限记录暗示完整历史。
   契约：完成记录≥120 条（窗口已满）的事项行如实提示"仅保留最近 120 条"（title
   给出完整口径：更早记录随窗口滚动、统计不受影响），并显示保留窗口内的完成计数；
   未满窗口只显示计数不显示截断提示；计数与 completedDates.length 同源。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-history-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "occasions.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const occasions = require(path.join(dir, "occasions.js"));

const datesFrom = (startYear, startMonth, startDay, count) => Array.from({length: count}, (_, index) => {
    const date = new Date(startYear, startMonth - 1, startDay + index, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
});

/* —— 夹具 1：130 条输入 → 归一保留最新 120 条（升序）。 —— */
const capped = occasions.normalizeOccasion({
    id: "cap", name: "长期周事项", kind: "scheduled", date: "2026-01-05", recurrence: "weekly",
    enabled: true, completedDates: datesFrom(2026, 3, 2, 130),
});
assert.equal(capped.completedDates.length, 120, "the retention window holds 120 entries");
assert.equal(capped.completedDates[0], "2026-03-12", "the oldest retained entry is the 11th input (ascending, latest 120)");

/* —— 夹具 2：窗口未满（<120）不触发截断提示的判定素材。 —— */
const under = occasions.normalizeOccasion({
    id: "under", name: "新事项", kind: "scheduled", date: "2026-01-05", recurrence: "weekly",
    enabled: true, completedDates: datesFrom(2026, 3, 2, 119),
});
assert.equal(under.completedDates.length, 119, "119 entries stay under the window");

/* —— 夹具 3：渲染结构钉——capped 徽章/计数/悬停口径 + 红证对照（钉 7565de5）。 —— */
const viewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
assert.match(viewSource, /occ\.doneCount/, "the row surfaces the completion count");
assert.match(viewSource, /occ\.historyCapped/, "a full window surfaces the truncation badge");
assert.match(viewSource, /occ\.historyCappedHint/, "the badge title carries the full policy copy");
assert.match(viewSource, /keptCompletions >= 120/, "the cap triggers exactly at the retention window");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["occ.doneCount", "occ.historyCapped", "occ.historyCappedHint"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}
const preFixView = cp.execSync("git show 7565de5:src/render/occasions.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixView, /occ\.historyCapped/, "the pre-fix view had no truncation transparency (red evidence)");

console.log("occasion-history: all assertions passed");
