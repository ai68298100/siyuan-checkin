const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "features", "note-anchor-picker.ts"), "utf8");
const output = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-anchor-picker-"));
fs.writeFileSync(path.join(temp, "picker.js"), output);
const picker = require(path.join(temp, "picker.js"));

const choices = picker.collectAnchorChoices([
    {name: "阅读", noteAnchor: {blockId: "20260919000000-abc1234"}},
    {name: "复盘", noteAnchor: {blockId: "20260919000000-abc1234"}},
    {name: "运动", noteAnchor: {blockId: "20260919000001-def5678"}},
]);
assert.equal(choices.length, 2, "same block must be merged into one choice");
assert.deepEqual(choices[0].labels, ["复盘", "阅读"], "labels must be stable and sorted");
assert.equal(picker.filterAnchorChoices(choices, "运动").length, 1);
assert.equal(picker.filterAnchorChoices(choices, "DEF5678").length, 1, "ID search is case insensitive");
assert.equal(picker.normalizeAnchorDocumentTitle(" 日记/打卡  "), "日记／打卡");
assert.equal(picker.buildAnchorDocumentPath("日记/打卡"), "/日记／打卡");
assert.equal(picker.buildAnchorDocumentPath("  "), undefined);

const editor = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
const binding = fs.readFileSync(path.join(root, "src", "render", "bind-editor.ts"), "utf8");
assert.match(editor, /data-action="anchor-open-picker"/);
assert.match(editor, /data-action="anchor-create-confirm"/);
assert.match(binding, /\/api\/notebook\/lsNotebooks/);
assert.match(binding, /\/api\/filetree\/createDocWithMd/);
console.log("Note anchor picker checks passed: local selection/search, safe document path and create wiring.");
