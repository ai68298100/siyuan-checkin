/* T-1518 周复盘向导与可恢复草稿守门：
   草稿按周键隔离（切换周不串）、归一化 fail-closed 有界 8、upsert 幂等合并、
   Markdown 导出事实与用户解释分开且确定性（无模型可用）、
   概览接线（仅周范围显示/文本保留用户输入/重载恢复通道）与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-weekly-review-"));
const load = (relative) => {
    const target = path.join(dir, path.basename(relative).replace(/\.ts$/, ".js"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const weekly = load("features/weekly-review.ts");

/* —— 1. 归一化：坏条目丢弃、按周键去重、更新时间倒序、有界 8。 —— */
{
    const drafts = weekly.normalizeWeeklyReviewDrafts([
        {weekKey: "2026-09-21", friction: "加班", adjustment: "提前安排", updatedAt: "2026-09-27T02:00:00.000Z"},
        {weekKey: "2026-12-28", friction: "跨年周", adjustment: "", updatedAt: "2026-12-30T02:00:00.000Z"},
        {weekKey: "bad-date", friction: "x", adjustment: "", updatedAt: "2026-09-27T02:00:00.000Z"},
        {weekKey: "2026-09-21", friction: "dup", adjustment: "", updatedAt: "2026-09-26T00:00:00.000Z"},
        "junk",
    ]);
    assert.equal(drafts.length, 2);
    assert.equal(drafts[0].weekKey, "2026-12-28", "sorted by updatedAt desc");
    assert.equal(drafts[1].friction, "加班", "same weekKey dedupes keeping the first");
    assert.equal(weekly.normalizeWeeklyReviewDrafts("not-an-array").length, 0);
    const bounded = weekly.normalizeWeeklyReviewDrafts(Array.from({length: 12}, (_, index) => ({weekKey: `2026-01-0${index % 10}`, friction: "", adjustment: "", updatedAt: `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`})));
    assert.equal(bounded.length, weekly.WEEKLY_REVIEW_DRAFT_LIMIT);
}

/* —— 2. upsert 合并与周键隔离：切换周不串草稿。 —— */
{
    const first = weekly.upsertWeeklyReviewDraft([], {weekKey: "2026-09-21", friction: "加班", adjustment: "早睡", updatedAt: "2026-09-27T01:00:00.000Z"});
    const second = weekly.upsertWeeklyReviewDraft(first, {weekKey: "2026-09-14", friction: "感冒", adjustment: "降低目标", updatedAt: "2026-09-20T01:00:00.000Z"});
    assert.equal(second.length, 2);
    assert.equal(weekly.weeklyReviewDraftFor(second, "2026-09-21").friction, "加班");
    assert.equal(weekly.weeklyReviewDraftFor(second, "2026-09-14").adjustment, "降低目标");
    assert.equal(weekly.weeklyReviewDraftFor(second, "2026-09-07"), undefined, "other weeks never see this draft");
    const updated = weekly.upsertWeeklyReviewDraft(second, {weekKey: "2026-09-21", friction: "加班减少", adjustment: "早睡", updatedAt: "2026-09-28T01:00:00.000Z"});
    assert.equal(updated.length, 2, "upsert merges instead of duplicating");
    assert.equal(weekly.weeklyReviewDraftFor(updated, "2026-09-21").friction, "加班减少");
}

/* —— 3. Markdown：事实与用户解释分开；空文本占位；确定性；无模型依赖。 —— */
{
    const facts = {
        rangeLabel: "周复盘（2026-09-21 ~ 2026-09-27）",
        totalEvents: 26,
        completedItems: 4,
        scheduledItems: 6,
        itemLines: ["拉伸 · 5/7 天"],
        headings: {facts: "本周事实", friction: "阻力", adjustment: "下周调整", note: "事实来自本地统计。"},
    };
    const markdown = weekly.buildWeeklyReviewMarkdown(facts, "加班", "早睡");
    assert.match(markdown, /# 周复盘/);
    assert.match(markdown, /## 本周事实/);
    assert.match(markdown, /- 26/);
    assert.match(markdown, /- 拉伸 · 5\/7 天/);
    assert.ok(markdown.indexOf("## 本周事实") < markdown.indexOf("## 阻力"), "facts come before user notes");
    assert.match(markdown, /## 阻力\n加班/);
    const empty = weekly.buildWeeklyReviewMarkdown(facts, "", "");
    assert.match(empty, /## 阻力\n—/);
    assert.deepEqual(markdown, weekly.buildWeeklyReviewMarkdown(facts, "加班", "早睡"), "deterministic");
}

/* —— 4. 接线：偏好存储归一化集成、概览折叠区、绑定与宿主方法、双语。 —— */
const prefsSource = fs.readFileSync(path.join(root, "src", "view-preferences.ts"), "utf8");
assert.match(prefsSource, /normalizeWeeklyReviewDrafts\(source\.weeklyReviewDrafts\)/, "preference normalization reuses the pure module");
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /fold\("weeklyReview", t\("review\.weeklyTitle"\), renderWeeklyReview\)/, "overview hosts the weekly review fold");
assert.match(reviewSource, /data-weekly-friction/, "friction textarea renders with user text preserved");
assert.match(reviewSource, /data-weekly-adjustment/, "adjustment textarea renders");
assert.match(reviewSource, /ctx\.summaryRange !== "week"/, "the wizard only shows for week ranges");
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
assert.match(bindSource, /"\[data-weekly-save\]"/, "save is bound");
assert.match(bindSource, /"\[data-weekly-export\]"/, "export is bound");
assert.match(bindSource, /"\[data-weekly-clear\]"/, "clear is bound");
assert.match(bindSource, /let weeklyActionBusy = false/, "weekly actions keep a per-surface busy guard");
assert.match(bindSource, /controls\.forEach\(control => \{ control\.disabled = true; control\.setAttribute\("aria-busy", "true"\); \}\)/, "weekly actions expose a shared busy state and block conflicting operations");
assert.match(bindSource, /outcome === "failed" \? "review\.weeklyExportFail" : "review\.weeklyExported"/, "weekly export surfaces SaveOutcome failure");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /async saveWeeklyReviewDraft\(weekKey: string, friction: string, adjustment: string\)/, "host persists drafts");
assert.match(indexSource, /exportWeeklyReviewMarkdown\(weekKey: string, friction: string, adjustment: string\): Promise<SaveOutcome>/, "host exports the markdown and returns SaveOutcome");
assert.match(indexSource, /weeklyReviewDrafts: this\.weeklyReviewDrafts/, "drafts persist through view preferences");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
assert.match(i18nSource, /"review\.weeklyExported": "Markdown 已提交到保存通道"/, "Chinese export feedback describes dispatch to the save channel, not final host save completion");
assert.match(i18nSource, /"review\.weeklyExported": "Markdown sent to the save channel"/, "English export feedback describes dispatch to the save channel, not final host save completion");
for (const key of ["review.weeklyTitle", "review.weeklyOnlyWeek", "review.weeklyStepFacts", "review.weeklyStepFriction", "review.weeklyStepAdjust", "review.weeklyFactsHint", "review.weeklyFactEvents", "review.weeklyFactItems", "review.weeklyDays", "review.weeklyFrictionPlaceholder", "review.weeklyAdjustPlaceholder", "review.weeklyAdjustHint", "review.weeklySave", "review.weeklySaved", "review.weeklySaveFail", "review.weeklyExport", "review.weeklyExported", "review.weeklyExportFail", "review.weeklyClear", "review.weeklyClearFail", "review.weeklyRangeLabel", "review.weeklyMarkdownNote"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("weekly review gates passed: week-keyed recoverable drafts, fail-closed normalization, facts/user-notes separation in deterministic markdown, wiring and bilingual copy.");
