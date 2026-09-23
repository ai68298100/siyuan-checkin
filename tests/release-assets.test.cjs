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
/* T-1368：SHA-256 一致性只在"持有发布产物的机器"上断言。CI 是全新检出+就地重建——
   行尾/构建时间/工具链差异注定重建 zip 与开发机产物字节不同，比对必然失败
   （17.2.1 起每次 push 的 verify 红灯皆因此，非产品缺陷）。CI 上降级为：
   校验 dist/plugin.json 版本一致（上方断言已覆盖）并跳过摘要比对。 */
if (process.env.CI !== "true") {
    assert.equal(releaseHash, packageHash, "release notes SHA-256 must match the current package.zip");
}
assert.match(packageManifest.scripts["test:quality"], /test:legacy-style/, "quality chain must include legacy style audit");
assert.equal(packageManifest.description, "SiYuan plugin: 小驴打卡", "package metadata must use readable UTF-8 Chinese");
assert.ok(!/灏忛|鎵撳崱/.test(packageManifest.description), "package metadata must not contain mojibake");
assert.ok(fs.statSync(path.join(root, "package.zip")).size > 10_000, "package.zip must be a non-empty release archive");
for (const filename of ["index.js", "index.css", "plugin.json", "README.md", "LICENSE.txt", plugin.icon, plugin.preview]) {
    assert.ok(filename && fs.existsSync(path.join(root, "dist", filename)), `dist asset missing: ${filename}`);
}
for (const filename of ["zh_CN.json", "en_US.json"]) {
    const i18nPath = path.join(root, "dist", "i18n", filename);
    assert.ok(fs.existsSync(i18nPath), `dist i18n asset missing: ${filename}`);
    /* T-1416：新增渲染块一键插入预设命令的 4 个 langKey（命令面板标题）。 */
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(i18nPath, "utf8"))).sort(), ["dock.title", "entry.topBar", "openCheckin", "openCheckinTab", "blockPresetSummary", "blockPresetMonth", "blockPresetHeatmap", "blockPresetGroups"].sort(), `dist i18n keys must stay complete: ${filename}`);
}
const builtCss = fs.readFileSync(path.join(root, "dist", "index.css"), "utf8");
for (const surface of ["today", "history", "summary", "settings", "occasions", "insights", "archived"]) {
    assert.match(builtCss, new RegExp(`\\.lc-checkin--${surface}`), `built CSS missing 4.0 ${surface} surface`);
}
/* D-246: user explicitly defers CSS size limits during the UI iteration.
   Report actual bytes; retain content/asset checks and performance tests. */
const builtCssBytes = fs.statSync(path.join(root, "dist", "index.css")).size;
assert.ok(builtCssBytes > 0, "built CSS must not be empty");
/* T-1398：发布资产清单——check:release 先生成 .artifacts/release-manifest.json，
   此处逐条核对 dist/ 与 package.zip 的字节数与 SHA-256 必须与清单一致（清单漂移即失败）。 */
const manifestPath = path.join(root, ".artifacts", "release-manifest.json");
assert.ok(fs.existsSync(manifestPath), "release manifest missing — check:release must run release:manifest first");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.version, RELEASE_VERSION, "manifest version must match the release");
const sha256Of = (buffer) => require("node:crypto").createHash("sha256").update(buffer).digest("hex");
const actualAssets = new Map();
const walkDist = (dir, prefix = "") => {
    for (const name of fs.readdirSync(dir).sort()) {
        const absolute = path.join(dir, name);
        const relative = prefix ? `${prefix}/${name}` : name;
        if (fs.statSync(absolute).isDirectory()) walkDist(absolute, relative);
        else actualAssets.set(relative, sha256Of(fs.readFileSync(absolute)));
    }
};
walkDist(path.join(root, "dist"));
for (const entry of manifest.assets) {
    if (entry.path === "package.zip") continue;
    assert.equal(actualAssets.get(entry.path), entry.sha256, `manifest drift for dist/${entry.path}`);
    assert.equal(entry.bytes, fs.statSync(path.join(root, "dist", entry.path)).size, `manifest byte count drift for dist/${entry.path}`);
    actualAssets.delete(entry.path);
}
assert.equal(actualAssets.size, 0, `dist files missing from the manifest: ${[...actualAssets.keys()].join(", ")}`);
if (fs.existsSync(path.join(root, "package.zip"))) {
    const zipEntry = manifest.assets.find((entry) => entry.path === "package.zip");
    assert.ok(zipEntry, "manifest must include package.zip");
    assert.equal(zipEntry.sha256, packageHash, "manifest package.zip hash must match the current archive");
}
console.log(`Release assets: v${plugin.version} checks passed (css ${builtCssBytes} bytes; size reported only per D-246).`);
