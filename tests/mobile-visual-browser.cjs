#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const defaultHarness = path.join(repoRoot, "tests", "visual-qa.cjs");

if (process.argv.includes("--help")) {
    console.log("Browser visual entry point: set CHECKIN_BROWSER when the browser is not installed in a standard Windows path.");
    console.log("Set CHECKIN_QA_HARNESS to override the maintained harness path.");
    console.log("The harness mounts the built plugin in a SiYuan-compatible DOM before taking 320/360/390/430px screenshots.");
    process.exit(0);
}

const browserCandidates = [
    process.env.CHECKIN_BROWSER,
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LocalAppData && path.join(process.env.LocalAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.LocalAppData && path.join(process.env.LocalAppData, "Google", "Chrome", "Application", "chrome.exe"),
].filter(Boolean);
const browserPath = browserCandidates.find((candidate) => fs.existsSync(candidate));
if (!browserPath) {
    console.error("BLOCKED: no Chromium/Edge executable was found.");
    console.error("Set CHECKIN_BROWSER explicitly, or install Microsoft Edge/Google Chrome in a standard Windows path.");
    process.exit(2);
}

const distEntry = path.join(repoRoot, "dist", "index.js");
if (!fs.existsSync(distEntry)) {
    console.error("BLOCKED: dist/index.js is missing. Run pnpm run build first.");
    process.exit(2);
}

const harnessPath = path.resolve(process.env.CHECKIN_QA_HARNESS || defaultHarness);
if (!fs.existsSync(harnessPath)) {
    console.error(`BLOCKED: QA harness not found: ${harnessPath}`);
    console.error("Set CHECKIN_QA_HARNESS to the maintained SiYuan-compatible preview harness.");
    process.exit(2);
}

const result = spawnSync(process.execPath, [harnessPath], {
    cwd: repoRoot,
    env: {
        ...process.env,
        CHECKIN_BROWSER: browserPath,
        CHECKIN_QA_PROJECT_ROOT: process.env.CHECKIN_QA_PROJECT_ROOT || repoRoot,
    },
    stdio: "inherit",
});

if (result.error) {
    console.error(`BLOCKED: unable to start QA harness: ${result.error.message}`);
    process.exit(2);
}
process.exit(typeof result.status === "number" ? result.status : 2);
