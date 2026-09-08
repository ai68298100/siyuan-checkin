const fs = require("node:fs");
const path = require("node:path");
const {execFileSync, spawnSync} = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const harness = process.env.CHECKIN_QA_HARNESS || "C:/Users/sunku/.codex/visualizations/2026/09/06/01a0746c-a70f-78c0-b369-de9bc71c594e/qa-preview.cjs";
const browser = process.env.CHECKIN_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const evidenceRoot = process.env.CHECKIN_QA_EVIDENCE_ROOT || path.join(repoRoot, "..", "mobile-qa-evidence");
const widths = [320, 360, 390, 430];

if (!fs.existsSync(path.join(repoRoot, "dist", "index.js"))) {
    console.error("Build the current worktree first: pnpm run build");
    process.exit(2);
}
if (!fs.existsSync(harness)) {
    console.error(`QA harness not found: ${harness}`);
    process.exit(2);
}
if (!fs.existsSync(browser)) {
    console.error(`Browser not found: ${browser}`);
    process.exit(2);
}

fs.mkdirSync(evidenceRoot, {recursive: true});
function resolveBrowserVersion() {
    const direct = spawnSync(browser, ["--version"], {encoding: "utf8"});
    const directOutput = `${direct.stdout || ""}\n${direct.stderr || ""}`.replace(/\u0000/g, "").trim();
    if (directOutput && !directOutput.includes("�")) return directOutput;
    if (process.platform === "win32") {
        const escapedPath = browser.replace(/'/g, "''");
        const powershell = spawnSync("powershell.exe", ["-NoProfile", "-Command", `(Get-Item -LiteralPath '${escapedPath}').VersionInfo.ProductVersion`], {encoding: "utf8"});
        const fileVersion = (powershell.stdout || "").trim();
        if (fileVersion) return fileVersion;
    }
    return "version output unavailable";
}

const browserVersion = resolveBrowserVersion();
const records = [];
for (const width of widths) {
    const outputRoot = path.join(evidenceRoot, `${width}px`);
    fs.mkdirSync(outputRoot, {recursive: true});
    const env = {
        ...process.env,
        CHECKIN_QA_PROJECT_ROOT: repoRoot,
        CHECKIN_QA_OUTPUT_ROOT: outputRoot,
        CHECKIN_QA_INITIAL_WIDTH: String(width),
        CHECKIN_QA_NARROW_WIDTH: String(width),
        CHECKIN_BROWSER: browser,
    };
    execFileSync(process.execPath, [harness], {cwd: repoRoot, env, stdio: "inherit"});
    const screenshots = fs.readdirSync(outputRoot).filter((file) => file.endsWith(".png")).sort();
    if (!screenshots.length) throw new Error(`No screenshots generated for ${width}px`);
    records.push({
        width,
        browser: browserVersion,
        outputRoot,
        screenshots,
        scrollAssertions: "all inspected surfaces have scrollWidth === clientWidth",
    });
}

const manifest = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    harness,
    browser,
    widths,
    records,
};
const manifestPath = path.join(evidenceRoot, "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({manifestPath, widths, browser: browserVersion}, null, 2));
