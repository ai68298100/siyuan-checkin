/* T-1489 互补习惯动态推荐守门：排除已有（锚点+显示名）、组互补/时段补位/类型多样性
   计分、确定性排序、空库回退静态精选、全部命中如实为空；外加编辑器接线与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-habit-rec-"));
fs.writeFileSync(path.join(dir, "habit-recommendations.js"), ts.transpileModule(read("src/features/habit-recommendations.ts"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
const rec = require(path.join(dir, "habit-recommendations.js"));

const catalog = [
    {name: "晨跑", group: "运动", timeSlot: "morning", kind: "duration"},
    {name: "步数", group: "运动", timeSlot: "evening", kind: "quantity"},
    {name: "拉伸", group: "健康", timeSlot: "evening", kind: "duration"},
    {name: "睡眠时长", group: "健康", timeSlot: "morning", kind: "duration"},
    {name: "深度工作", group: "工作", timeSlot: "morning", kind: "duration"},
    {name: "记账", group: "生活", timeSlot: "evening", kind: "binary"},
    {name: "冥想", group: "健康", timeSlot: "morning", kind: "duration"},
];

/* —— 空库：回退静态精选（按目录解析，未知名忽略）。 —— */
assert.deepEqual(rec.recommendHabitTemplates({existing: [], catalog, fallback: ["喝水", "不存在", "记账"]}), ["记账"], "fallback resolves to catalog anchors in fallback order");
assert.deepEqual(rec.recommendHabitTemplates({existing: [], catalog, fallback: []}), [], "empty fallback yields empty");

/* —— 排除：锚点或本地化显示名命中活跃项目名即不推荐。 —— */
const onlyStretch = rec.recommendHabitTemplates({existing: [{name: "拉伸", group: "健康", timeSlot: "evening", kind: "duration"}], catalog, fallback: [], localizeName: (name) => `英·${name}`});
assert.ok(!onlyStretch.includes("拉伸"), "exact anchor exclusion");
const localized = rec.recommendHabitTemplates({existing: [{name: "英·记账", group: "生活", timeSlot: "evening", kind: "binary"}], catalog, fallback: [], localizeName: (name) => `英·${name}`});
assert.ok(!localized.includes("记账"), "localized display-name exclusion");
assert.ok(!rec.recommendHabitTemplates({existing: [{name: "拉伸", group: "健康", timeSlot: "evening", kind: "duration"}], catalog, fallback: []}).includes("拉伸"));

/* —— 互补计分：运动 → 健康配对加分；时段补位（只有晚间 → 晨间模板靠前）。 —— */
const sportExisting = [{name: "跑步", group: "运动", timeSlot: "morning", kind: "duration"}];
const sportPicks = rec.recommendHabitTemplates({existing: sportExisting, catalog, fallback: []});
assert.equal(sportPicks[0], "拉伸", "pair boost puts the complementary 健康 recovery template first");
const eveningOnly = [{name: "测试项", group: "创作", timeSlot: "evening", kind: "binary"}];
const eveningPicks = rec.recommendHabitTemplates({existing: eveningOnly, catalog, fallback: [], limit: 3});
assert.equal(eveningPicks[0], "晨跑", "morning slot gap fills first");
/* 配对表单测：已有「生活」→「工作」模板获得 +1，反超同为满分的时段补位候选。 */
const lifeExisting = [{name: "记账", group: "生活", timeSlot: "evening", kind: "binary"}];
assert.equal(rec.recommendHabitTemplates({existing: lifeExisting, catalog, fallback: []})[0], "深度工作", "the 生活→工作 pair boost outranks plain slot filling");

/* —— 类型多样性：已有全是 duration → quantity 类加分（夹具避开双向配对组）。 —— */
const allDuration = [
    {name: "深度工作", group: "工作", timeSlot: "morning", kind: "duration"},
    {name: "记账", group: "生活", timeSlot: "evening", kind: "binary"},
];
const diversePicks = rec.recommendHabitTemplates({existing: allDuration, catalog, fallback: []});
assert.equal(diversePicks[0], "步数", "the absent quantity kind leads a diverse library's recommendations");

/* —— 确定性：同输入两次深度相等；tiebreak 按目录顺序。 —— */
const input = {existing: sportExisting, catalog, fallback: [], localizeName: (name) => name};
assert.deepEqual(rec.recommendHabitTemplates(input), rec.recommendHabitTemplates(input));
const tie = rec.recommendHabitTemplates({existing: [{name: "已有", group: "其他", timeSlot: "any", kind: "custom"}], catalog, fallback: []});
assert.deepEqual(tie, ["晨跑", "步数", "拉伸", "睡眠时长", "深度工作", "记账", "冥想"], "zero-score candidates keep catalog order");

/* —— 全部命中如实为空；容量截断。 —— */
const everything = catalog.map((template) => ({name: template.name, group: template.group, timeSlot: template.timeSlot, kind: template.kind}));
assert.deepEqual(rec.recommendHabitTemplates({existing: everything, catalog, fallback: []}), [], "an exhausted catalog honestly returns empty");
assert.equal(rec.recommendHabitTemplates({existing: everything.slice(0, 1), catalog, fallback: []}).length, catalog.length - 1, "no artificial cap below the limit");
assert.equal(rec.recommendHabitTemplates({existing: everything.slice(0, 1), catalog, fallback: [], limit: 3}).length, 3, "limit truncates");

/* —— 纯度：零运行时依赖、无时钟。 —— */
const moduleSource = read("src/features/habit-recommendations.ts");
assert.equal((moduleSource.match(/^import /gm) || []).length, 0, "module stays dependency-free");
assert.ok(!/Date\.now|new Date\(/.test(moduleSource), "no clock reads");

/* —— 编辑器接线：动态推荐替换静态位，容器/标题标记保留，静态精选降级为空库回退。 —— */
const editorSource = read("src/render/editor.ts");
assert.match(editorSource, /recommendHabitTemplates\(/, "editor recommendations go through the shared pure module");
assert.match(editorSource, /fallback: RECOMMENDED_TEMPLATES/, "static picks remain the empty-store fallback");
assert.match(editorSource, /data-template-recommended/, "recommended row markers stay stable for walkthroughs");
assert.match(editorSource, /localizeName: \(name: string\) => templateName\(\{name\}\)/, "exclusion compares localized display names too");
assert.match(editorSource, /candidate\.archived/, "archived projects do not shape recommendations");
const i18nSource = read("src/i18n.ts");
for (const key of ["editor.recommendedTemplates", "editor.recommendedHint"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}
assert.doesNotMatch(i18nSource, /你落后|归零|前功尽弃/, "recommendation copy stays inside the calm baseline");

console.log("habit recommendation gates passed: exclusion/pairing/slot/kind scoring/determinism/fallback/purity/editor wiring/i18n parity");
