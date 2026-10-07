/* T-1487 新建打卡智能默认守门：名称→模板命中（zh 锚点+显示名）、关键词字段推断
   （类型/单位/数值/时段/排期）、fail-closed 边界、确定性；外加编辑器/宿主接线与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-name-inference-"));
fs.writeFileSync(path.join(dir, "name-inference.js"), ts.transpileModule(read("src/features/name-inference.ts"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
const inference = require(path.join(dir, "name-inference.js"));

const catalog = [
    {anchor: "喝水", display: "Water"},
    {anchor: "阅读", display: "Reading"},
    {anchor: "晨间补水", display: "Morning water"},
];

/* —— 模板命中：zh 锚点与显示名（大小写无关）都能命中。 —— */
assert.equal(inference.buildNameInference("喝水", catalog).templateAnchor, "喝水");
assert.equal(inference.buildNameInference("  阅读  ", catalog).templateAnchor, "阅读", "trim before matching");
assert.equal(inference.buildNameInference("water", catalog).templateAnchor, "喝水", "display-name match is case-insensitive");
assert.equal(inference.buildNameInference("Water", catalog).templateAnchor, "喝水");
assert.equal(inference.buildNameInference("晨间补水", catalog).templateAnchor, "晨间补水", "catalog hit wins over keyword signals");

/* —— 关键词推断：数值+单位、时段、排期独立检出。 —— */
assert.deepEqual(inference.buildNameInference("每天读书30分钟", catalog).fields, {kind: "duration", unit: "分钟", target: 30, schedule: {type: "daily"}});
assert.deepEqual(inference.buildNameInference("晚上喝2000毫升水", catalog).fields, {kind: "quantity", unit: "毫升", target: 2000, timeSlot: "evening"});
assert.deepEqual(inference.buildNameInference("每周一三五跑步", catalog).fields, {schedule: {type: "weekly", weekdays: [1, 3, 5]}}, "weekday lists collect, dedupe and sort");
assert.deepEqual(inference.buildNameInference("工作日冥想15分钟", catalog).fields, {kind: "duration", unit: "分钟", target: 15, schedule: {type: "workdays"}});
assert.deepEqual(inference.buildNameInference("周末整理", catalog).fields, {schedule: {type: "weekly", weekdays: [0, 6]}});
assert.deepEqual(inference.buildNameInference("背50个单词", catalog).fields, {kind: "count", unit: "个", target: 50});
assert.deepEqual(inference.buildNameInference("体重70公斤", catalog).fields, {kind: "quantity", unit: "千克", target: 70}, "公斤 normalizes to the catalog unit 千克");
assert.deepEqual(inference.buildNameInference("晨跑5公里", catalog).fields, {kind: "quantity", unit: "公里", target: 5, timeSlot: "morning"});
assert.deepEqual(inference.buildNameInference("记步", catalog).fields, {kind: "quantity", unit: "步"}, "unit without a number still infers kind+unit");

/* —— fail-closed：无信号不猜；非法输入拒绝。 —— */
assert.equal(inference.buildNameInference("随便写写", catalog), undefined, "no signal → no suggestion");
assert.equal(inference.buildNameInference("", catalog), undefined);
assert.equal(inference.buildNameInference(null, catalog), undefined);
assert.equal(inference.buildNameInference("每天".repeat(31), catalog), undefined, "over-long input is rejected");
assert.equal(inference.inferFieldsFromName("喝0毫升水"), undefined, "a zero target is not a usable inference");
assert.equal(inference.inferFieldsFromName("喝0.001毫升水"), undefined, "sub-cent precision rounds to a useless target and drops");

/* —— 确定性：同输入两次构建深度相等。 —— */
assert.deepEqual(inference.buildNameInference("每周二、周四冥想20分钟", catalog), inference.buildNameInference("每周二、周四冥想20分钟", catalog));
assert.deepEqual(inference.buildNameInference("每周二、周四冥想20分钟", catalog).fields, {kind: "duration", unit: "分钟", target: 20, schedule: {type: "weekly", weekdays: [2, 4]}});

/* —— 纯度：模块零运行时依赖、无时钟。 —— */
const moduleSource = read("src/features/name-inference.ts");
assert.match(moduleSource, /^import type \{[^}]*\} from "\.\.\/types";/m, "types import is type-only (erased at runtime)");
assert.ok(!/Date\.now|new Date\(/.test(moduleSource), "no clock reads");

/* —— 接线：编辑器容器、bind-editor 解析与应用、宿主目录投影、样式。 —— */
const editorSource = read("src/render/editor.ts");
assert.match(editorSource, /data-name-inference/, "editor renders the name inference row container");
const bindEditorSource = read("src/render/bind-editor.ts");
assert.match(bindEditorSource, /buildNameInference\(/, "bind-editor resolves suggestions through the shared pure module");
assert.match(bindEditorSource, /inferFieldsFromName\(nameInput\.value\)/, "field application re-resolves from the live input (no stale suggestion)");
assert.match(bindEditorSource, /data-name-inference-template/, "template suggestion reuses the catalog apply path");
assert.match(bindEditorSource, /data-name-inference-dismiss/, "dismissal keeps the row hidden for the same name");
assert.match(bindEditorSource, /setTimeout\(\(\) => \{[\s\S]*?isCurrentSession\(\)\) renderNameInference\(\);[\s\S]*?\}, 250\)/, "inference is debounced while typing and respects the editor session");
assert.match(bindEditorSource, /applyTemplateFields\(template\)/, "template apply path is shared with the chip flow");
const indexSource = read("src/index.ts");
assert.match(indexSource, /nameInferenceCatalog\(\): ReadonlyArray<\{anchor: string; display: string\}>/, "host projects catalog anchors with localized display names");
const scss = read("src/ui/components.scss");
assert.match(scss, /\.lc-checkin__name-inference\[hidden\]/, "inference row has a hidden-state style");

/* —— i18n 双语。 —— */
const i18nSource = read("src/i18n.ts");
for (const key of ["editor.nameSuggestTemplate", "editor.nameSuggestFields", "editor.nameSuggestApply", "editor.nameSuggestDismiss"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}

console.log("name inference gates passed: anchor/display matching, keyword fields, fail-closed, determinism, purity, editor wiring, i18n parity");
