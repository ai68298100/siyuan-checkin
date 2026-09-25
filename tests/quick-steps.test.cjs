/* T-1462 · R-A14 数值快捷记录预设增量守门：归一化（解析/去重/排序/上限/拒绝）、
   保存与加载两侧同构、今日页 chips 与 today 渲染块 chips 接线、i18n 双语。
   归一化函数独立于 model（record-step.ts 零依赖），源码接线用结构断言。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

/* —— 1. 纯归一化：独立转译 record-step.ts（仅 type-only 依赖）。 —— */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-quick-steps-"));
fs.writeFileSync(path.join(dir, "record-step.js"), ts.transpileModule(read("src/record-step.ts"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
const {normalizeQuickSteps, normalizeRecordStep} = require(path.join(dir, "record-step.js"));

/* binary 恒为空（不物化）；历史行为零变化。 */
assert.deepEqual(normalizeQuickSteps("binary", "1, 2, 3"), [], "binary items never materialize quick steps");
assert.deepEqual(normalizeQuickSteps("binary", [1, 2]), [], "binary rejects arrays too");

/* 字符串解析：逗号（全半角）/空白分隔；非法词元与零负值跳过；升序去重；上限 4。 */
assert.deepEqual(normalizeQuickSteps("count", "250, 500，250 1000 2000 4000"), [250, 500, 1000, 2000], "parses mixed separators, dedupes, sorts, caps at 4");
assert.deepEqual(normalizeQuickSteps("count", ["500", 250, 0, -3, "abc", NaN, Infinity]), [250, 500], "skips invalid tokens");
assert.deepEqual(normalizeQuickSteps("count", "0.5, 1.25, 0.5"), [0.5, 1.25], "keeps 2-decimal precision, dedupes");

/* 超上限拒绝（不静默改值）；2 位小数精度。 */
assert.deepEqual(normalizeQuickSteps("count", "1000000, 2000000"), [1000000], "rejects values above the 1e6 ceiling");
assert.deepEqual(normalizeQuickSteps("duration", "30"), [30], "duration items accept steps");

/* 非法输入形态一律空数组（不物化）。 */
assert.deepEqual(normalizeQuickSteps("count", ""), [], "empty string → none");
assert.deepEqual(normalizeQuickSteps("count", null), [], "null → none");
assert.deepEqual(normalizeQuickSteps("count", 42), [], "bare numbers are not an array or text list → none");

/* 回归：normalizeRecordStep 原口径不变。 */
assert.equal(normalizeRecordStep("count", "12.345"), 12.35, "record step rounding unchanged");
assert.equal(normalizeRecordStep("binary", "5"), undefined, "binary record step unchanged");

/* —— 2. 持久化同构：保存（save-form）与加载（model.normalizeItem）两侧同走一个归一化。 —— */
const modelSource = read("src/model.ts");
assert.match(modelSource, /import \{normalizeQuickSteps, normalizeRecordStep\} from "\.\/record-step"/, "model imports the shared normalizer");
assert.match(modelSource, /const quickSteps = normalizeQuickSteps\(kind, value\.quickSteps\)/, "normalizeItem normalizes quickSteps");
assert.match(modelSource, /\.\.\.\(quickSteps\.length \? \{quickSteps\} : \{\}\)/, "normalizeItem only materializes non-empty sets");

const saveFormSource = read("src/render/save-form.ts");
assert.match(saveFormSource, /normalizeQuickSteps\(kind, data\.get\("quickSteps"\)\)/, "save-form parses the form field through the same normalizer");
assert.match(saveFormSource, /\.\.\.\(quickSteps\.length \? \{quickSteps\} : \{\}\)/, "save-form item shape matches normalizeItem key-by-key (fingerprint parity)");

/* —— 3. 编辑器接线：字段在值区（binary 整组隐藏），双语三键。 —— */
const editorSource = read("src/render/editor.ts");
assert.match(editorSource, /input name="quickSteps" type="text"/, "editor exposes the quickSteps text field");
assert.match(editorSource, /data-quick-steps-field/, "editor wraps the field for conditional visibility");
assert.match(saveFormSource, /data\.get\("quickSteps"\)/, "save reads the field");
for (const key of ["editor.quickStepsLabel", "editor.quickStepsHint", "editor.quickStepsPlaceholder"]) {
    const count = (read("src/i18n.ts").match(new RegExp(`"${key}"`, "g")) || []).length;
    assert.equal(count, 2, `${key} exists in both locales`);
}

/* —— 4. 今日页 chips：chips 复用 quick-record 通道并携带 data-amount；handler 读 amount 回落重算。 —— */
const fragmentsSource = read("src/render/fragments.ts");
assert.match(fragmentsSource, /lc-checkin__chip-button[^]*data-action="quick-record" data-amount=/, "today cards render per-step chips on the quick-record channel");
assert.match(fragmentsSource, /filter\(\(value\) => Math\.abs\(value - recordStep\) > 1e-9\)/, "chips skip the value already shown by the primary step button");

const bindTodaySource = read("src/render/bind-today.ts");
assert.match(bindTodaySource, /dataset\.amount/, "quick-record handler reads the button's data-amount");
assert.match(bindTodaySource, /Number\.isFinite\(amountValue\) && amountValue > 0/, "handler falls back to the default step on missing/invalid amounts");

/* —— 5. today 渲染块 chips：data-block-record-amount 透传到宿主，缺省行为不变。 —— */
const blockSource = read("src/features/checkin-block.ts");
assert.match(blockSource, /data-block-record-amount=/, "block chips carry their amount");
assert.match(blockSource, /quickSteps\?\.length && !complete/, "chips only render for incomplete numeric rows");
assert.match(blockSource, /quickSteps\?: number\[\];\n    unit\?: string;/, "row interface pairs steps with unit");

const rendererSource = read("src/render/block-renderer.ts");
assert.match(rendererSource, /data-block-record-amount/, "renderer reads the chip amount");
assert.match(rendererSource, /onBlockTodayRecord\?\(itemId: string, amount\?: number\): void/, "deps signature accepts the amount");

const indexSource = read("src/index.ts");
assert.match(indexSource, /recordBlockToday\(itemId: string, amount\?: number\)/, "host handler accepts the amount");
assert.match(indexSource, /const step = amount && amount > 0 \? amount : getRecordStep\(/, "host prefers the chip amount and falls back to the default step");

/* —— 6. 样式：chips + 移动触控基线覆盖（含 T-1461 基线对 chips 的抬升）。 —— */
const scss = read("src/ui/components.scss");
assert.match(scss, /\.lc-checkin__chip-button \{/, "chip styles exist");
assert.match(scss, /\.lc-checkin__renderblock-today-steps \{/, "block chip group styles exist");
assert.match(scss, /T-1461 低压力触控基线[^]*\.lc-checkin__chip-button/, "mobile 44px baseline covers chips");

console.log("quick-steps guard tests passed.");
