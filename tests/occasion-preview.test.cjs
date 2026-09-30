/* T-1716 守门：创建/编辑的规则预览与内联校验（D-358）。
   风险路径（表单增量）：七种周期/公历农历/第 N 周可选，但保存前看不到未来发生日
   与提醒出现时间。契约：buildOccurrencePreview 纯投影（getOccurrenceDate 单一实现
   迭代 count 次、提醒出现日=发生日-提前量、once 已过/无未来给 reason 键）；
   bind-occasions 从表单值实时构造 normalize 输入（与 saveOccasionForm 同字段集合）
   填充预览；只读零写入；折叠态跨重绘保留。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-preview-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const done = new Set();
const transpileTo = (relPath) => {
    const key = relPath.replace(/\\/g, "/");
    if (done.has(key)) return;
    done.add(key);
    const source = fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8");
    const target = path.join(dir, key.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    const depth = key.split("/").length - 1;
    const stubSpec = JSON.stringify((depth ? "../".repeat(depth) : "./") + "siyuan-stub.js");
    fs.writeFileSync(target, ts.transpileModule(source.replace(/from "siyuan"/g, `from ${stubSpec}`), {compilerOptions}).outputText);
    const imports = source.match(/from "(\.[^"]+)"/g) || [];
    for (const match of imports) {
        const base = path.posix.join(path.posix.dirname(key), match.slice(6, -1));
        for (const candidate of [`${base}.ts`, path.posix.join(base, "index.ts")]) {
            if (fs.existsSync(path.join(__dirname, "..", "src", candidate))) transpileTo(candidate);
        }
    }
};
transpileTo("features/occasion-preview.ts");
const model = require(path.join(dir, "model.js"));
const preview = require(path.join(dir, "features", "occasion-preview.js"));

const fromDate = new Date(2026, 8, 1, 12); // 2026-09-01（周二）
const occasions = (() => {
    const d2 = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-preview-occ-"));
    for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "occasions.ts"]) {
        fs.writeFileSync(path.join(d2, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
    }
    return require(path.join(d2, "occasions.js"));
})();

/* —— 夹具 1：周项连出 5 次、间隔 7 天、提醒提前 2 天。 —— */
const weekly = occasions.normalizeOccasion({id: "w", name: "周会", kind: "scheduled", date: "2026-09-01", recurrence: "weekly", weekday: 2, remindBeforeDays: 2, enabled: true});
const weeklyPreview = preview.buildOccurrencePreview(weekly, fromDate, 5);
assert.equal(weeklyPreview.entries.length, 5, "five upcoming occurrences are previewed");
const first = weeklyPreview.entries[0];
assert.equal(first.occurrenceDate, "2026-09-01", "the anchor Tuesday is the first occurrence");
assert.equal(first.remindDate, "2026-08-30", "the reminder leads by the configured days");
assert.equal(weeklyPreview.entries[1].occurrenceDate, "2026-09-08", "subsequent occurrences step weekly");

/* —— 夹具 2：月度 31 号在 2 月 clamp（与引擎同纪律）。 —— */
const monthlyEnd = occasions.normalizeOccasion({id: "m", name: "月末", kind: "scheduled", date: "2026-01-31", recurrence: "monthly", remindBeforeDays: 0, enabled: true});
const monthlyPreview = preview.buildOccurrencePreview(monthlyEnd, fromDate, 3);
assert.equal(monthlyPreview.entries[0].occurrenceDate, "2026-09-30", "a monthly 31st clamps to the month end");
assert.equal(monthlyPreview.entries[0].remindDate, monthlyPreview.entries[0].occurrenceDate, "zero lead keeps the reminder on the occurrence day");

/* —— 夹具 3：once 已过 → reason 键。 —— */
const oncePast = occasions.normalizeOccasion({id: "o", name: "旧事", kind: "scheduled", date: "2026-08-01", recurrence: "once", enabled: true});
const oncePreview = preview.buildOccurrencePreview(oncePast, fromDate, 5);
assert.equal(oncePreview.entries.length, 0);
assert.equal(oncePreview.reasonKey, "occ.previewOncePast", "a past one-shot surfaces the dedicated reason");

/* —— 夹具 4：count 截断——只要 2 次就只算 2 次。 —— */
const capped = preview.buildOccurrencePreview(weekly, fromDate, 2);
assert.equal(capped.entries.length, 2, "the count caps the projection");

/* —— 夹具 5：接线结构钉 + 红证对照（钉修复前提交 6dc6596）。 —— */
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
assert.match(bindSource, /buildOccurrencePreview/, "the binder fills the preview via the shared projection");
assert.match(bindSource, /normalizeOccasion\(draftInput\)/, "form values normalize before previewing (inline validation)");
assert.match(bindSource, /occ\.previewNone/, "invalid drafts surface the no-occurrence copy");
assert.match(bindSource, /updateOccurrencePreview\(\);\s*\r?\n?\s*occasionDraftForm\.addEventListener\(\"input\", updateOccurrencePreview\)/, "the preview updates on input");
assert.match(bindSource, /host\.occasionPreviewOpen = \(event\.currentTarget as HTMLDetailsElement\)\.open/, "the fold state survives re-renders");
const viewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
assert.match(viewSource, /data-occasion-preview/, "the form renders the preview container");
assert.match(viewSource, /renderOccurrencePreviewView\(editing/, "editing an item previews its current rules");
const preFixView = cp.execSync("git show 6dc6596:src/render/occasions.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixView, /data-occasion-preview/, "the pre-fix form had no preview (red evidence)");

/* —— 夹具 6：i18n 双语键在位。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["occ.previewTitle", "occ.previewRemind", "occ.previewNone", "occ.previewOncePast"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}

console.log("occasion-preview: all assertions passed");
