const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1800 守门测试：渲染块日期格键盘可达激活与无障碍语义（D-377）。
   1. checkin-block.ts 输出原生 button[type="button"][data-jump-date]，替换历史 span 模拟；
   2. block-renderer.ts 增加 keydown 委托，Enter/Space 阻止滚动并触发跳转；
   3. SCSS 样式包含 button 属性重置与 focus-visible 焦点环。 */

const sourceRoot = path.join(__dirname, "..", "src");

/* 断言 1：源码静态守门 */
const blockSource = fs.readFileSync(path.join(sourceRoot, "features", "checkin-block.ts"), "utf8");
const rendererSource = fs.readFileSync(path.join(sourceRoot, "render", "block-renderer.ts"), "utf8");
const scssSource = fs.readFileSync(path.join(sourceRoot, "ui", "components.scss"), "utf8");

assert.match(
    blockSource,
    /<button type="button" class="\$\{classes\}" data-jump-date="\$\{cell\.date\}"/,
    "T-1800: month view cells render as native button[type=button]",
);
assert.match(
    blockSource,
    /<button type="button" class="\$\{classes\}" data-jump-date="\$\{day\.date\}"/,
    "T-1800: heatmap view cells render as native button[type=button]",
);
assert.doesNotMatch(
    blockSource,
    /<span class="\$\{classes\}" role="button"/,
    "T-1800: legacy span role=button simulation is eliminated",
);

assert.match(rendererSource, /preview\.addEventListener\("keydown",/, "T-1800: block-renderer binds keydown for accessibility");
assert.match(rendererSource, /event\.key !== "Enter" && event\.key !== " " && event\.key !== "Spacebar"/, "T-1800: handles Enter and Space keys");
assert.match(rendererSource, /event\.preventDefault\(\)/, "T-1800: prevents default page scroll on Space key");

assert.match(scssSource, /\.lc-checkin__renderblock-cell\s*\{[\s\S]*?&:focus-visible\s*\{/, "T-1800: CSS defines focus-visible for renderblock cells");

/* 断言 2：转译与 DOM 结构验证 */
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-block-a11y-"));

for (const filename of [
    "types.ts",
    "i18n.ts",
    "shared.ts",
    "record-step.ts",
    "quota.ts",
    "rules.ts",
    "date-keys.ts",
    "model.ts",
    "model-helpers.ts",
    "features/record-notes.ts",
    "ui/labels.ts",
    "features/pace-projection.ts",
    "features/checkin-block.ts",
]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source.replace(/from "siyuan"/g, 'from "./siyuan-stub.js"'), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}
fs.writeFileSync(path.join(outputRoot, "features", "siyuan-stub.js"), "module.exports = {};\n");
fs.writeFileSync(path.join(outputRoot, "siyuan-stub.js"), "module.exports = {};\n");

const {buildMonthViewHtml, buildHeatmapViewHtml} = require(path.join(outputRoot, "features", "checkin-block.js"));

const activeItem = {
    id: "item-1",
    name: "阅读",
    icon: "📖",
    kind: "binary",
    target: 1,
    unit: "次",
    direction: "atLeast",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [{
        effectiveDate: "2026-09-01",
        kind: "binary",
        target: 1,
        unit: "次",
        direction: "atLeast",
        schedule: {type: "daily"},
    }],
    archivePeriods: [],
};

const dummyStore = {
    version: 3,
    profile: {name: "Test", avatar: "", bio: ""},
    items: [activeItem],
    events: [],
    eventTombstones: [],
};

const monthHtml = buildMonthViewHtml(dummyStore, {view: "month", month: "2026-10"}, new Date(2026, 9, 15));
assert.ok(monthHtml.includes('<button type="button" class="lc-checkin__renderblock-cell'), "month html contains button cells");
assert.ok(monthHtml.includes('data-jump-date="2026-10-15"'), "month html contains data-jump-date");

const heatmapHtml = buildHeatmapViewHtml(dummyStore, {view: "heatmap", year: 2026}, new Date(2026, 9, 15));
assert.ok(heatmapHtml.includes('<button type="button" class="lc-checkin__renderblock-cell'), "heatmap html contains button cells");
assert.ok(heatmapHtml.includes('data-jump-date="2026-10-15"'), "heatmap html contains data-jump-date");

console.log("checkin-block-a11y: all assertions passed");
