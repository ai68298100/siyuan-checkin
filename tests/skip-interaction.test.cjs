const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");
const bindingsSource = read("render", "today-bindings.ts");
const fragmentsSource = read("render", "fragments.ts");
const indexSource = read("index.ts");

/* 结构守门：菜单项、原因输入、批量按钮与宿主边界齐全。 */
assert.match(bindingsSource, /data-menu-action="skip"/, "card menu offers skip for scheduled unfinished items");
assert.match(bindingsSource, /data-menu-action="unskip"/, "card menu offers undo skip for skipped items");
assert.match(bindingsSource, /window\.prompt\(t\("today\.skipPrompt"\)\)/, "skip asks for an optional reason");
assert.match(bindingsSource, /if \(action === "skip" && skipReason === null\) return;/, "cancelling the reason prompt aborts without side effects");
assert.match(bindingsSource, /data-action='bulk-skip'/, "bulk toolbar exposes skip");
assert.match(bindingsSource, /host\.skipItems\(ids\)/, "bulk skip goes through the host boundary");
assert.match(fragmentsSource, /data-action="bulk-skip"/, "bulk toolbar renders the skip button");
assert.match(bindingsSource, /scheduledToday && !completeToday/, "skip only applies to scheduled unfinished items");
assert.match(fragmentsSource, /lc-checkin__item-tag is-skip-tag/, "skipped cards render a neutral badge");
assert.match(fragmentsSource, /getSkipDatesForItem\(ctx\.store, item\.id\)/, "card skip state comes from the store index");
assert.match(indexSource, /private async skipItemToday\(/, "index implements single-item skip");
assert.match(indexSource, /private async unskipItemToday\(/, "index implements undo skip");
assert.match(indexSource, /private async skipItems\(/, "index implements batch skip");
assert.match(indexSource, /\{\.\.\.this\.makeEvent\(current, 0, "manual", revision\.unit, note\?\.trim\(\) \|\| undefined, undefined, moment\), kind: "skip"\}/, "skip events carry kind and zero value");
assert.match(indexSource, /removeEvents\(this\.store, skipEvents, moment\.occurredAt\)/, "undo skip tombstones through the shared removal path");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-skip-interaction-"));
for (const filename of ["i18n.ts"]) {
    fs.writeFileSync(path.join(outputRoot, `${filename.replace(/\.ts$/, ".js")}`), ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const {t, setPluginLanguage} = require(path.join(outputRoot, "i18n.js"));

/* 键齐全：中英字典都提供跳过交互文案。 */
for (const key of ["today.skipToday", "today.unskipToday", "today.skipBadge", "today.skipPrompt", "today.bulkSkip", "msg.skipDone", "msg.unskipDone", "msg.skipBatchDone"]) {
    const zh = (() => { setPluginLanguage("zh-CN"); return t(key); })();
    const en = (() => { setPluginLanguage("en-US"); return t(key); })();
    setPluginLanguage("zh-CN");
    assert.ok(zh && zh !== key, `zh dictionary covers ${key}`);
    assert.ok(en && en !== key && en !== zh, `en dictionary covers ${key} with a real translation`);
}

console.log("Skip interaction checks passed: menu items, optional reason, batch boundary, card badge and i18n coverage.");
