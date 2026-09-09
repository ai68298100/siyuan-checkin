#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

if (process.argv.includes("--help")) {
    console.log("Browser visual entry point: set CHECKIN_BROWSER when the browser is not installed in a standard Windows path.");
    console.log("The harness must mount the built plugin in a SiYuan-compatible DOM before taking 320/360/390/430px screenshots.");
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

let playwright;
try {
    playwright = require("playwright");
} catch {
    try {
        playwright = require("C:/Users/sunku/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
    } catch {
        console.error("BLOCKED: Playwright is not installed in the project runtime. Install it or run the external QA harness.");
        process.exit(2);
    }
}

void playwright;
console.error("BLOCKED: a SiYuan-compatible preview mount is required before browser screenshots can be taken.");
console.error("Run the maintained QA harness with CHECKIN_BROWSER and use the 320/360/390/430px viewport matrix.");
process.exit(2);
