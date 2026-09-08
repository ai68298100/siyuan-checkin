const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {execFileSync} = require("node:child_process");

const root = path.join(__dirname, "..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-editor-validation-"));
execFileSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "src/editor-validation.ts", "--target", "ES2020", "--module", "commonjs", "--skipLibCheck", "--outDir", outDir], {cwd: root, stdio: "ignore"});
const {validateEditorInput} = require(path.join(outDir, "editor-validation.js"));

assert.equal(validateEditorInput({name: "阅读", kind: "duration", target: 30, unit: "分钟", schedule: "daily", weekdays: []}).valid, true);
assert.equal(validateEditorInput({name: "", kind: "binary", target: 1, unit: "次", schedule: "daily", weekdays: []}).errors.name, "请输入名称");
assert.equal(validateEditorInput({name: "阅读", kind: "duration", target: 0, unit: "分钟", schedule: "daily", weekdays: []}).errors.target, "目标必须是大于 0 的数字");
assert.equal(validateEditorInput({name: "阅读", kind: "duration", target: 30, unit: "", schedule: "daily", weekdays: []}).errors.unit, "请输入单位");
assert.equal(validateEditorInput({name: "运动", kind: "binary", target: 1, unit: "次", schedule: "weekly", weekdays: []}).errors.schedule, "请选择至少一天");
assert.equal(validateEditorInput({name: "运动", kind: "count", target: 1, unit: "次", schedule: "quota", weekdays: [], quotaAmount: 0}).valid, false);
console.log("Editor validation checks passed.");
