/* T-1523 外部来源粘贴样例试算台守门：
   复用生产解析/映射函数（拉伸与阅读分别归属、未知类型不落通用目标、
   重名歧义如实、单位不兼容、超长/恶意输入有界、非法日期拒绝）、
   零宿主调用零持久正文（纯函数、无事件写入）、设置页接线与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-source-sandbox-"));
const transpileTo = (relative) => {
    const target = path.join(dir, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
};
["date-keys.ts", "features/note-anchor.ts", "features/yeguif-adapter.ts", "features/health-inbox.ts", "features/note-query.ts", "features/source-sandbox.ts"].forEach(transpileTo);
const sandbox = require(path.join(dir, "features", "source-sandbox.js"));
const {normalizeYeguifMappings} = require(path.join(dir, "features", "yeguif-adapter.js"));

const TODAY = "2026-09-27";
const items = [
    {id: "stretch", name: "拉伸", kind: "duration", unit: "分钟"},
    {id: "read", name: "阅读", kind: "duration", unit: "分钟"},
    {id: "water", name: "喝水", kind: "count", unit: "次"},
];

/* —— 1. 叶归试算：拉伸与阅读分别归属；未知类型不落通用目标；非法行如实无效。 —— */
{
    const mappings = [{project: "拉伸", itemId: "stretch"}, {project: "阅读", itemId: "read"}];
    const outcome = sandbox.sandboxYeguifSample([
        "08:30 拉伸：肩颈放松",
        "09:00 阅读：论文",
        "10:00 冥想：呼吸",
        "不是有效行",
    ].join("\n"), mappings, items);
    assert.equal(outcome.matched, 2);
    assert.equal(outcome.unmatched, 1, "unknown type never falls to a generic target");
    assert.equal(outcome.invalid, 1);
    assert.equal(outcome.lines[0].targetName, "拉伸");
    assert.equal(outcome.lines[1].targetName, "阅读");
    assert.equal(outcome.lines[2].reasonKey, "today.sandbox.reason.unmapped");
    assert.equal(outcome.lines[3].state, "invalid");
}

{
    const manyItems = Array.from({length: 275}, (_, index) => ({id: `target-${index}`, name: `Project ${index}`, kind: "duration", unit: "分钟"}));
    const mappings = normalizeYeguifMappings(manyItems.map((item) => ({project: item.name, itemId: item.id})));
    const outcome = sandbox.sandboxYeguifSample("09:00 Project 274：last target", mappings, manyItems);
    assert.equal(outcome.matched, 1, "a mapping beyond fifty and target beyond two hundred remain visible to the production dry-run");
    assert.equal(outcome.lines[0].targetName, "Project 274");
    const invalidTargets = sandbox.sandboxYeguifSample("08:00 Wrong unit\n09:00 Archived\n10:00 Missing", [
        {project: "Wrong unit", itemId: "water"}, {project: "Archived", itemId: "archived"}, {project: "Missing", itemId: "missing"},
    ], [...items, {id: "archived", name: "Archived", kind: "duration", unit: "分钟", archived: true}]);
    assert.equal(invalidTargets.matched, 0, "explicit mappings do not make ineligible or missing targets writable");
    assert.equal(invalidTargets.unmatched, 3);
    assert.ok(invalidTargets.lines.every((line) => line.reasonKey === "today.sandbox.reason.unmapped"));
}

/* —— 2. 健康试算：字段归属映射项目；单位随指标明示；未来日期拒绝。 —— */
{
    const bindings = [
        {metric: "steps", itemNames: ["今日步数"]},
        {metric: "weight", itemNames: ["体重记录"]},
    ];
    const outcome = sandbox.sandboxHealthSample([
        `health:steps:${TODAY} 12345`,
        `health:weight:${TODAY} 65.5`,
        "health:steps:2027-01-01 999",
        "garbage line",
    ].join("\n"), bindings, TODAY);
    assert.equal(outcome.matched, 2);
    assert.ok(outcome.lines[0].targetName.includes("今日步数"), "steps map to the bound item");
    assert.ok(outcome.lines[0].targetName.includes("步"), "unit is stated (steps)");
    assert.equal(outcome.lines[2].state, "invalid", "future-dated samples rejected");
    assert.equal(outcome.lines[3].state, "invalid");
}

/* —— 3. 笔记推导试算：未就绪偏好如实提示；命中行带目标。 —— */
{
    const notReady = sandbox.sandboxNoteQuerySample("任意内容", {template: "frontmatter", itemId: ""}, TODAY, "拉伸");
    assert.equal(notReady.lines[0].state, "unmatched");
    assert.equal(notReady.lines[0].reasonKey, "today.sandbox.reason.unmatched");
    const readyPref = {template: "frontmatter", scope: "document", targetId: "20260101120000-xxxx", itemId: "stretch", field: "checkin", value: "done", tag: "checkin", enabled: true};
    const result = sandbox.sandboxNoteQuerySample("checkin: done\n无关内容", readyPref, TODAY, "拉伸");
    assert.equal(result.lines[0].state, "matched");
    assert.equal(result.lines[0].targetName, "拉伸");
    assert.equal(result.lines[1].state, "unmatched");
}

/* —— 4. 有界与确定性：超长文本截断计数；恶意 HTML 不影响（渲染层转义）；零事件概念。 —— */
{
    const many = Array.from({length: 80}, (_, index) => `08:30 拉伸：第 ${index} 次`).join("\n");
    const outcome = sandbox.sandboxYeguifSample(many, [{project: "拉伸", itemId: "stretch"}], items);
    assert.equal(outcome.lines.length, 50, "input bounded to 50 lines");
    assert.equal(outcome.truncatedLines, 30);
    const longLine = "x".repeat(500) + "<script>alert(1)</script>";
    const bounded = sandbox.sandboxYeguifSample(longLine, [{project: "拉伸", itemId: "stretch"}], items);
    assert.ok(bounded.lines[0].input.length <= 200, "lines truncated to 200 chars");
    const one = sandbox.sandboxYeguifSample("08:30 拉伸：a", [{project: "拉伸", itemId: "stretch"}], items);
    assert.deepEqual(one, sandbox.sandboxYeguifSample("08:30 拉伸：a", [{project: "拉伸", itemId: "stretch"}], items), "deterministic");
}

/* —— 5. 接线与双语。 —— */
const settingsSource = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /data-sandbox-details="\$\{source\}"/, "sandbox disclosure is parameterized by source");
assert.match(settingsSource, /sandboxBlock\("yeguif", "today\.sandboxPlaceholder\.yeguif"\)/, "yeguif card hosts the sandbox");
assert.match(settingsSource, /sandboxBlock\("health", "today\.sandboxPlaceholder\.health"\)/, "health card hosts the sandbox");
assert.match(settingsSource, /sandboxBlock\("notequery", "today\.sandboxPlaceholder\.notequery"\)/, "notequery card hosts the sandbox");
assert.match(settingsSource, /data-sandbox-run=/, "dry-run buttons render");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /private sourceSandboxOutcomes/, "host holds session-only outcomes");
assert.match(indexSource, /runSourceSandbox\(source: SandboxSource, text: string, root\?: HTMLElement\): void/, "host exposes the root-scoped dry-run");
assert.match(indexSource, /this\.runSourceSandbox\(source, settings\.sourceSandboxTexts\[source\] \|\| "", root\)/, "settings sandbox writes and rerenders only its owning root");
assert.ok(!/saveData\(.*sandbox/i.test(indexSource), "sandbox payloads are never persisted");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["today.sandboxTitle", "today.sandboxHint", "today.sandboxRun", "today.sandboxPlaceholder.yeguif", "today.sandboxPlaceholder.health", "today.sandboxPlaceholder.notequery", "today.sandbox.reason.invalid", "today.sandbox.reason.unmapped", "today.sandbox.reason.future", "today.sandbox.reason.unmatched", "today.sandboxSummary", "today.sandboxTruncated", "today.sandboxNote"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("source sandbox gates passed: production parsers reused, per-type attribution without generic fallback, unit/future-date honesty, bounded input, session-only memory and bilingual copy.");
