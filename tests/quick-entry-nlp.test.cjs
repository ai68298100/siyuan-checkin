const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

function load(filename) {
    const module = {exports: {}};
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    vm.runInNewContext(source, {module, exports: module.exports}, {filename});
    return module.exports;
}

const parser = load(path.join(__dirname, "..", "src", "features", "quick-entry-nlp.ts"));
const today = parser.parseQuickEntryText("明天 30分钟 每周一三五", "2026-09-27");
assert.equal(today.date, "2026-09-28");
assert.equal(today.value, 30);
assert.equal(today.unit, "分钟");
assert.deepEqual(Array.from(today.recurrence.weekdays), [1, 3, 5]);
assert.equal(today.tokens.length, 3);
assert.match(today.remainder, /^$/);

const hours = parser.parseQuickEntryText("1.5小时", "2026-09-27");
assert.equal(hours.value, 90, "hours normalize to minutes for duration records");
assert.equal(hours.unit, "分钟");
assert.equal(parser.parseQuickEntryText("跑步，30mins", "2026-09-27").remainder, "跑步", "separators do not become part of the project name");
assert.equal(parser.parseQuickEntryText("跑步 1hr", "2026-09-27").value, 60, "longer unit abbreviations must win before their prefixes");

const target = [{id: "run", name: "跑步", kind: "duration", unit: "分钟"}];
const named = parser.parseQuickEntryText("跑步 30分钟", "2026-09-27");
assert.equal(parser.resolveQuickEntryRecordTarget(named, "2026-09-27", target), "run", "one named compatible target is actionable");
assert.equal(parser.resolveQuickEntryRecordTarget(parser.parseQuickEntryText("30分钟", "2026-09-27"), "2026-09-27", target), undefined, "a bare value never chooses a project");
assert.equal(parser.resolveQuickEntryRecordTarget(named, "2026-09-27", [...target, {...target[0], id: "other"}]), undefined, "duplicate names are ambiguous");
assert.equal(parser.resolveQuickEntryRecordTarget(named, "2026-09-27", [{...target[0], unit: "次"}]), undefined, "unit mismatch cannot write");
assert.equal(parser.resolveQuickEntryRecordTarget(named, "2026-09-27", [{...target[0], kind: "binary"}]), undefined, "numeric text cannot write a binary project");
assert.equal(parser.resolveQuickEntryRecordTarget(named, "2026-09-27", [{...target[0], direction: "atMost"}]), undefined, "numeric text cannot silently record an abstinence lapse");
assert.equal(parser.resolveQuickEntryRecordTarget(parser.parseQuickEntryText("明天 跑步 30分钟", "2026-09-27"), "2026-09-27", target), undefined, "future dates stay preview-only");
assert.equal(parser.resolveQuickEntryRecordTarget(parser.parseQuickEntryText("跑步 30分钟 每周一三五", "2026-09-27"), "2026-09-27", target), undefined, "recurrence is not a record action");

const cancelled = parser.applyQuickEntryCancellations(today, [today.tokens[0].id]);
assert.equal(cancelled.date, undefined);
assert.equal(cancelled.value, 30);
assert.match(cancelled.remainder, /明天/);

for (const input of ["", "跑步", "0分钟", "999999999分钟", "明天".repeat(80)]) {
    const result = parser.parseQuickEntryText(input, "2026-09-27");
    assert.ok(result.tokens.length <= 4, "parser output stays bounded");
}
assert.equal(parser.parseQuickEntryText("每周一三五", "bad-date").tokens.length, 0);
assert.equal(parser.parseQuickEntryText("2026-02-31", "2026-09-27").tokens.length, 0, "invalid calendar dates fail closed");
const todayView = fs.readFileSync(path.join(__dirname, "..", "src", "render", "fragments.ts"), "utf8");
const todayBinding = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-today.ts"), "utf8");
assert.match(todayView, /quickEntry\.remainder : ctx\.todayQuery/, "recognized tokens leave project text for filtering");
assert.match(todayView, /renderQuickEntryPreview\(quickEntry, quickEntryTarget\)/, "record action requires a resolved target");
assert.match(todayBinding, /targetId !== \(event\.currentTarget as HTMLElement\)\.dataset\.itemId/, "click rechecks the rendered target identity");
assert.doesNotMatch(todayBinding, /parsed\.remainder \|\| undefined/, "project name is not silently saved as a record note");
console.log("Quick entry NLP parser passed: deterministic detection, unique target and unit guards, cancellation and fail-closed bounds.");
