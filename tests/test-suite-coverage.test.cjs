const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const scriptText = Object.values(packageJson.scripts || {}).join(" ");
const retired = new Set([]);
const tests = fs.readdirSync(__dirname)
    .filter((name) => name.endsWith(".test.cjs"))
    .sort();

assert.ok(tests.length >= 50, "the maintained test inventory must contain at least 50 files");
for (const name of tests) {
    assert.ok(scriptText.includes(name) || retired.has(name), `${name} must be executed by a package script or explicitly retired`);
}
for (const name of retired) {
    assert.ok(tests.includes(name), `${name} retirement must refer to an existing test`);
    assert.ok(!scriptText.includes(name), `${name} must not silently re-enter the suite before its assertions are modernized`);
}

console.log(`Test suite coverage checks passed: ${tests.length} files, ${retired.size} explicitly retired.`);
