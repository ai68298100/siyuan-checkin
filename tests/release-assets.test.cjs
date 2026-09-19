const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const readText = (filename) => fs.readFileSync(path.join(root, filename), "utf8");
for (const filename of ["package.json", "plugin.json", path.join("dist", "plugin.json")]) {
    const bytes = fs.readFileSync(path.join(root, filename));
    assert.ok(!bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), `${filename} must not contain a UTF-8 BOM`);
}
const plugin = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const RELEASE_VERSION = packageManifest.version;
assert.match(RELEASE_VERSION, /^\d+\.\d+\.\d+$/, "package.json must declare a semantic release version");
const escapedReleaseVersion = RELEASE_VERSION.replaceAll(".", "\\.");
const distPlugin = JSON.parse(fs.readFileSync(path.join(root, "dist", "plugin.json"), "utf8"));
const versionSource = readText(path.join("src", "version.ts"));
const versionMatch = versionSource.match(/export\s+const\s+PLUGIN_VERSION\s*=\s*["']([^"']+)["']\s*;/);
assert.ok(versionMatch, "src/version.ts must export PLUGIN_VERSION as a string literal");
const sourceVersion = versionMatch[1];
assert.equal(sourceVersion, RELEASE_VERSION, `source version must be ${RELEASE_VERSION}`);
assert.equal(packageManifest.version, RELEASE_VERSION, `package.json version must be ${RELEASE_VERSION}`);
assert.equal(plugin.version, RELEASE_VERSION, `plugin.json version must be ${RELEASE_VERSION}`);
assert.equal(distPlugin.version, RELEASE_VERSION, `dist/plugin.json version must be ${RELEASE_VERSION}`);
assert.equal(sourceVersion, packageManifest.version, "src/version.ts and package.json versions must match");
assert.equal(plugin.version, packageManifest.version, "source manifest versions must match");
assert.equal(distPlugin.version, plugin.version, "built manifest must match source version");
assert.ok(fs.existsSync(path.join(root, "README.md")), "README.md is required for a release");
const readme = readText("README.md");
assert.match(readme, new RegExp(`(?:当前版本|Current version)[^\\n]*${escapedReleaseVersion}`), "README must declare the current release version");
const changeLogFilename = path.join("docs", `v${RELEASE_VERSION}-change-log.md`);
assert.ok(fs.existsSync(path.join(root, changeLogFilename)), `release changelog missing: ${changeLogFilename}`);
assert.match(readText(changeLogFilename), new RegExp(`(?:^|\\n)#.*${escapedReleaseVersion}`), "release changelog heading must include the current version");
const releaseNotesFilename = path.join("docs", "releases", `release-notes-${RELEASE_VERSION}.md`);
assert.ok(fs.existsSync(path.join(root, releaseNotesFilename)), `release notes missing: ${releaseNotesFilename}`);
const rootReleaseNotes = fs.readdirSync(root)
    .filter((filename) => /^release-notes-\d+\.\d+\.\d+\.md$/.test(filename));
assert.deepEqual(rootReleaseNotes, [], "release notes must stay under docs/releases/");
const releaseNotes = readText(releaseNotesFilename);
assert.match(releaseNotes, new RegExp(`\\bv${escapedReleaseVersion}\\b`), "release notes must identify the current version");
const releaseHash = releaseNotes.match(/SHA-256(?:\*\*)?\s*[:：]\s*`([a-f0-9]{64})`/i)?.[1];
assert.ok(releaseHash, "release notes must include a 64-character SHA-256 digest");
assert.notEqual(releaseHash, "0".repeat(64), "release notes must not retain the zero digest placeholder");
const packageHash = require("node:crypto").createHash("sha256")
    .update(fs.readFileSync(path.join(root, "package.zip")))
    .digest("hex");
assert.equal(releaseHash, packageHash, "release notes SHA-256 must match the current package.zip");
assert.match(packageManifest.scripts["test:quality"], /test:legacy-style/, "quality chain must include legacy style audit");
assert.equal(packageManifest.description, "SiYuan plugin: 小飞驴打卡", "package metadata must use readable UTF-8 Chinese");
assert.ok(!/灏忛|鎵撳崱/.test(packageManifest.description), "package metadata must not contain mojibake");
assert.ok(fs.statSync(path.join(root, "package.zip")).size > 10_000, "package.zip must be a non-empty release archive");
for (const filename of ["index.js", "index.css", "plugin.json", "README.md", "LICENSE.txt", plugin.icon, plugin.preview]) {
    assert.ok(filename && fs.existsSync(path.join(root, "dist", filename)), `dist asset missing: ${filename}`);
}
for (const filename of ["zh_CN.json", "en_US.json"]) {
    const i18nPath = path.join(root, "dist", "i18n", filename);
    assert.ok(fs.existsSync(i18nPath), `dist i18n asset missing: ${filename}`);
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(i18nPath, "utf8"))).sort(), ["dock.title", "entry.topBar", "openCheckin", "openCheckinTab"].sort(), `dist i18n keys must stay complete: ${filename}`);
}
const builtCss = fs.readFileSync(path.join(root, "dist", "index.css"), "utf8");
for (const surface of ["today", "history", "summary", "settings", "occasions", "insights", "archived"]) {
    assert.match(builtCss, new RegExp(`\\.lc-checkin--${surface}`), `built CSS missing 4.0 ${surface} surface`);
}
/* CSS 体积分级门禁：318KB 保留为历史基线，420KB 进入告警区，
   450KB 才阻断发布。此前的 380KB 是迁移阶段临时硬线；当前 UI
   组件迁移已带来受控增长，经用户明确授权后放宽，但仍保留最终护栏。 */
const builtCssBytes = fs.statSync(path.join(root, "dist", "index.css")).size;
const CSS_SOFT_LIMIT = 318_000;
const CSS_WARN_LIMIT = 420_000;
const CSS_HARD_LIMIT = 450_000;
assert.ok(CSS_SOFT_LIMIT < CSS_WARN_LIMIT && CSS_WARN_LIMIT < CSS_HARD_LIMIT, "CSS budget thresholds must be strictly increasing");
assert.ok(builtCssBytes <= CSS_HARD_LIMIT, `built CSS exceeds the hard 450000-byte budget: ${builtCssBytes} bytes`);
const classifyCssBudget = (bytes) => bytes <= CSS_SOFT_LIMIT
    ? "within-budget"
    : bytes <= CSS_WARN_LIMIT
        ? "warning"
        : bytes <= CSS_HARD_LIMIT ? "near-hard-limit" : "over-hard-limit";
assert.deepEqual([
    classifyCssBudget(CSS_SOFT_LIMIT),
    classifyCssBudget(CSS_SOFT_LIMIT + 1),
    classifyCssBudget(CSS_WARN_LIMIT),
    classifyCssBudget(CSS_WARN_LIMIT + 1),
    classifyCssBudget(CSS_HARD_LIMIT),
    classifyCssBudget(CSS_HARD_LIMIT + 1),
], ["within-budget", "warning", "warning", "near-hard-limit", "near-hard-limit", "over-hard-limit"],
"CSS budget boundaries must remain explicit");
const budgetState = classifyCssBudget(builtCssBytes);
if (budgetState !== "within-budget") {
    console.warn(`CSS budget notice: ${builtCssBytes} bytes (${budgetState}; warn ${CSS_WARN_LIMIT}, hard ${CSS_HARD_LIMIT}).`);
}
console.log(`Release assets: v${plugin.version} checks passed (css ${builtCssBytes} bytes, ${budgetState}).`);
