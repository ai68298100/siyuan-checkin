const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const harnessPath = process.env.CHECKIN_QA_HARNESS || path.join(repoRoot, "tests", "visual-qa.cjs");
assert.ok(fs.existsSync(harnessPath), `QA harness not found: ${harnessPath}`);
const harness = fs.readFileSync(harnessPath, "utf8");
const projectMatch = harness.match(/const projectRoot = ["']([^"']+)["']/);
const currentDist = path.join(repoRoot, "dist", "index.js");
assert.ok(fs.existsSync(currentDist), "build the current worktree before running visual QA");

if (projectMatch && path.resolve(projectMatch[1]) !== path.resolve(repoRoot)) {
    console.error("BLOCKED: external QA harness uses a different projectRoot.");
    console.error(`Harness projectRoot: ${projectMatch[1]}`);
    console.error(`Current worktree: ${repoRoot}`);
    console.error("Minimum integration: parameterize the harness projectRoot/outputRoot, then run it against this worktree dist/.");
    process.exit(2);
}

console.log(`QA harness is configured for ${repoRoot}. Run it with CHECKIN_BROWSER and inspect desktop plus 320/360/390/430px screenshots.`);
