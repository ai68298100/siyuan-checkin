const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const docs = read("docs/toolchain-compatibility.md");
const environment = read("scripts/environment-check.cjs");
const ci = read(".github/workflows/ci.yml");

assert.equal(pkg.packageManager, "pnpm@12.5.1", "package manager must stay pinned");
assert.equal(pkg.engines.node, ">=20.19.0", "Node floor must cover the current direct dependency engines");
assert.match(docs, /Node\.js \| \*\*20\.19\.0 或更高\*\*/);
assert.match(docs, /Playwright 1\.63 要求 Node ≥20/);
assert.match(environment, /dependencyNodeEngines/);
assert.match(environment, /requiredNodeFloor/);
assert.match(environment, /process\.exitCode = 1/);
assert.match(ci, /node-version: 22/);

const probe = spawnSync(process.execPath, [path.join(root, "scripts", "environment-check.cjs")], {
    cwd: root,
    encoding: "utf8",
});
assert.equal(probe.status, 0, `environment probe failed:\n${probe.stdout}\n${probe.stderr}`);
const report = JSON.parse(probe.stdout);
assert.equal(report.toolchain.packageManager, "pnpm@12.5.1");
assert.equal(report.toolchain.packageManagerSatisfied, true);
assert.equal(report.toolchain.requiredNodeFloor, "20.19.0");
assert.equal(report.toolchain.nodeSatisfied, true);
assert.equal(report.toolchain.dependencyScanComplete, true);
assert.ok(report.toolchain.dependencyNodeEngines.some((entry) => entry.name === "sass" && entry.lowerBound === "20.19.0"));

console.log("Toolchain contract checks passed: Node/pnpm/dependency engines, CI baseline, docs and runtime probe.");
