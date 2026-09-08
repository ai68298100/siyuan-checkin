#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

if (process.argv.includes("--help")) {
    console.log("Browser visual entry point: set CHECKIN_BROWSER to a Chromium/Edge executable and run the repository QA harness.");
    console.log("The harness must mount the built plugin in a SiYuan-compatible DOM before taking 320/360/390/430px screenshots.");
    process.exit(0);
}

const browserPath = process.env.CHECKIN_BROWSER;
if (!browserPath || !fs.existsSync(browserPath)) {
    console.error("BLOCKED: CHECKIN_BROWSER must point to an installed Chromium/Edge executable.");
    console.error("Example PowerShell: $env:CHECKIN_BROWSER='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'");
    process.exit(2);
}

let playwright;
try {
    playwright = require("playwright");
} catch {
    console.error("BLOCKED: Playwright is not installed in the project runtime. Install it or run the external QA harness.");
    process.exit(2);
}

void playwright;
console.error("BLOCKED: a SiYuan-compatible preview mount is required before browser screenshots can be taken.");
console.error("Run the maintained QA harness with CHECKIN_BROWSER and use the 320/360/390/430px viewport matrix.");
process.exit(2);
