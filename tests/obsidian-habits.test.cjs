/* Obsidian Habit Tracker 21 迁入通道守门（T-1279）：
   frontmatter 解析变体、日期消毒、导入计划与 obsidian21 前缀注册/幂等身份。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-obsidian-"));
for (const filename of ["types.ts", "i18n.ts", "shared.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "model-helpers.ts", "features/record-notes.ts", "ui/labels.ts", "api-contract.ts", "features/obsidian-habits.ts", "ecosystem.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const habits = require(path.join(outputRoot, "features", "obsidian-habits.js"));
const ecosystem = require(path.join(outputRoot, "ecosystem.js"));

(async () => {
    /* 标准文件：引号 title + block list entries。 */
    const standard = habits.parseObsidianHabitFile([
        "---",
        'title: "Morning Workout 💪"',
        'color: "#4CAF50"',
        "maxGap: 1",
        "entries:",
        "  - 2026-09-14",
        "  - 2026-09-15",
        "  - 2026-09-14",
        "---",
        "",
        "body text",
    ].join("\n"), "Exercise.md");
    assert.equal(standard.ok, true);
    if (standard.ok) {
        assert.equal(standard.habit.title, "Morning Workout 💪");
        assert.equal(standard.habit.color, "#4CAF50");
        assert.equal(standard.habit.maxGap, 1);
        assert.deepEqual(standard.habit.dates, ["2026-09-14", "2026-09-15"], "dates dedupe and sort");
    }

    /* inline entries + 无 title（文件名回退）。 */
    const inline = habits.parseObsidianHabitFile([
        "---",
        "entries: [2026-09-01, 2026-09-02]",
        "---",
    ].join("\n"), "Reading.md");
    assert.equal(inline.ok, true);
    if (inline.ok) {
        assert.equal(inline.habit.title, undefined, "missing title falls back to filename at naming time");
        assert.deepEqual(inline.habit.dates, ["2026-09-01", "2026-09-02"]);
    }
    assert.equal(habits.obsidianHabitName(inline.ok ? inline.habit : {filename: "Reading.md", dates: []}), "Reading");
    assert.equal(habits.obsidianHabitIdentity({filename: "Weird: Name.md", dates: []}), "Weird_ Name", "identity strips colons for the ref format");

    /* 非习惯文件：无 frontmatter → 拒收;frontmatter 未闭合 → 拒收。 */
    assert.equal(habits.parseObsidianHabitFile("# 普通笔记\n正文", "Note.md").ok, false);
    assert.equal(habits.parseObsidianHabitFile("---\ntitle: 未闭合", "Broken.md").ok, false);

    /* 非法日期消毒：保留合法,丢弃坏值;空 entries 合法（新建无记录习惯）。 */
    const dirty = habits.parseObsidianHabitFile("---\nentries: [2026-02-30, 2026-09-01, nope]\n---", "Gym.md");
    assert.equal(dirty.ok, true);
    if (dirty.ok) assert.deepEqual(dirty.habit.dates, ["2026-09-01"], "impossible and malformed dates are dropped");
    const empty = habits.parseObsidianHabitFile("---\nentries: []\n---", "Fresh.md");
    assert.equal(empty.ok, true);
    if (empty.ok) assert.deepEqual(empty.habit.dates, []);

    /* 幂等身份：obsidian21 前缀注册处可解析。 */
    const habitFile = {filename: "Exercise.md", title: "晨练", dates: ["2026-09-14", "2026-09-15"]};
    const ref = habits.obsidianExternalRef(habitFile, "2026-09-14");
    assert.equal(ref, "obsidian21:Exercise:2026-09-14");
    const parsedRef = ecosystem.parseExternalRef(ref);
    assert.deepEqual(parsedRef, {prefix: "obsidian21", identity: "Exercise", date: "2026-09-14"}, "registry parseExternalRef must round-trip the import identity");
    assert.ok(ecosystem.EXTERNAL_REF_PREFIX_REGISTRY.some((entry) => entry.prefix === "obsidian21"), "obsidian21 prefix must be registered");

    /* 导入计划：聚合条目数。 */
    const plan = habits.buildObsidianImportPlan([habits.parseObsidianHabitFile("---\nentries: [2026-09-01, 2026-09-02]\n---", "A.md").habit, habits.parseObsidianHabitFile("---\nentries: []\n---", "B.md").habit]);
    assert.equal(plan.habits.length, 2);
    assert.equal(plan.totalDates, 2);

    console.log("Obsidian habit import checks passed.");
})().catch((error) => { console.error(error); process.exit(1); });
