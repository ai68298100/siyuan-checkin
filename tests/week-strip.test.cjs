/* T-1775 守门：今日七日条到历史事实的可达钻取（D-346）。
   风险路径（2026-09-30 审计）：七日条只输出不可交互的 span 与 tooltip——有内容的
   日格无法进入对应记录与日级分母解释。契约：有内容日格为 button 日期入口（键盘/
   触屏可达，focus-visible 焦点环），复用回顾日历同一套按日钻取状态
   （selectedHistoryDate/historyScope/historyPage）同 root 跳回顾记录区，返回保留
   今日筛选与滚动；空日格保持不可交互；文字状态明确：无排期/待记录/部分达成/
   全部完成 + 戒除破戒后缀。不新建历史计算。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

/* —— 渲染结构钉：fragments 的七日条生成 button 入口与文字状态。 —— */
const fragmentsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /data-week-strip-date="\$\{escapeHtml\(dateKey\(day\)\)\}"/, "content days render as date-entry buttons");
assert.match(fragmentsSource, /aria-label="\$\{chipTitle\}"/, "chips expose an accessible name with the day status");
assert.match(fragmentsSource, /today\.chipStatus\.\$\{status\}/, "the status text is i18n-driven per day state");
assert.match(fragmentsSource, /today\.chipLapse/, "abstinence lapses get an explicit suffix");
assert.match(fragmentsSource, /if \(!dayItems\.length\) \{\s*\r?\n?\s*return `<span class="lc-checkin__day-chip/, "empty days stay non-interactive spans");

/* —— 接线结构钉：复用回顾按日钻取状态并同 root 跳转。 —— */
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-today.ts"), "utf8");
assert.match(bindSource, /\[data-week-strip-date\]/, "the today bindings wire the strip entries");
assert.match(bindSource, /host\.selectedHistoryDate = value;/, "the drill sets the selected history date");
assert.match(bindSource, /host\.historyScope = "day";/, "the drill scopes the review history to the day");
assert.match(bindSource, /host\.historyPage = 0;/, "the drill resets pagination");
assert.match(bindSource, /host\.showReview\(root\);/, "the drill navigates to review on the originating root");
const interfaceMatch = bindSource.match(/showEditor\(item\?: CheckinItem[\s\S]{0,900}editingHistoryNoteId\?: string;/);
assert.ok(interfaceMatch, "the host declares the drill state and showReview members");

/* —— 样式钉：button 变体的键盘焦点环。 —— */
const cssSource = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
assert.match(cssSource, /week-strip button\.lc-checkin__day-chip:focus-visible/, "keyboard focus ring for strip buttons");

/* —— i18n 双语键在位。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["today.chipStatus.empty", "today.chipStatus.pending", "today.chipStatus.partial", "today.chipStatus.complete", "today.chipLapse"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}

/* —— 红证对照：修复前（4cd489a）七日条为纯 span，无任何入口属性。 —— */
const preFixFragments = cp.execSync("git show 4cd489a:src/render/fragments.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixFragments, /data-week-strip-date/, "the pre-fix strip had no drill entries (red evidence)");
assert.match(preFixFragments, /<span class="lc-checkin__day-chip/, "the pre-fix strip rendered only spans (red evidence)");

/* —— 转译冒烟：bind-today 闭包可加载（宿主新成员为纯状态，无隐藏依赖）。 —— */
const os = require("node:os");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-week-strip-"));
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
transpileTo("render/bind-today.ts");
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "module.exports = {showMessage: () => {}};\n");
const bindToday = require(path.join(dir, "render", "bind-today.js"));
assert.equal(typeof bindToday.bindTodayHandlers, "function", "bind-today still loads with the new wiring");

console.log("week-strip: all assertions passed");
