/* T-1398 回滚演练（可复跑）：对齐 docs/release-rollback.md 的语义，在临时目录内
   全流程演练「预发布快照 → 坏版本发布 → 发现漂移 → 回滚 → 完整性复核」，
   不触碰真实 dist/ 与 package.zip。产出 .artifacts/rollback-rehearsal.json 证据并 exit 0；
   任何一步校验失败 exit 1。 */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const zipPath = path.join(root, "package.zip");
const evidencePath = path.join(root, ".artifacts", "rollback-rehearsal.json");

function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

function snapshotDir(source, target) {
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.cpSync(source, target, {recursive: true});
}

function manifestOf(dir, prefix = "") {
    const files = [];
    for (const name of fs.readdirSync(dir).sort()) {
        const absolute = path.join(dir, name);
        const relative = prefix ? `${prefix}/${name}` : name;
        if (fs.statSync(absolute).isDirectory()) {
            files.push(...manifestOf(absolute, relative));
        } else {
            files.push({path: relative, sha256: sha256(fs.readFileSync(absolute))});
        }
    }
    return files;
}

const steps = [];
const startedAt = new Date().toISOString();
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "lc-rollback-"));

try {
    /* 步骤 1：预发布——快照当前构建（模拟「已发布到用户侧的最后一个好版本」）。 */
    const goodSnapshot = path.join(workspace, "good-release");
    fs.cpSync(distDir, goodSnapshot, {recursive: true});
    if (fs.existsSync(zipPath)) fs.copyFileSync(zipPath, path.join(workspace, "package.zip.published"));
    const goodManifest = manifestOf(goodSnapshot);
    steps.push({step: "pre-release-snapshot", ok: true, assets: goodManifest.length, version: JSON.parse(fs.readFileSync(path.join(goodSnapshot, "plugin.json"), "utf8")).version});

    /* 步骤 2：坏版本发布——在发布副本上模拟一次带缺陷的升级（版本号被错误复用 + 多出未知文件）。 */
    const badRelease = path.join(workspace, "bad-release");
    fs.cpSync(goodSnapshot, badRelease, {recursive: true});
    const badPluginPath = path.join(badRelease, "plugin.json");
    const badPlugin = JSON.parse(fs.readFileSync(badPluginPath, "utf8"));
    badPlugin.version = "0.0.0-bad";
    fs.writeFileSync(badPluginPath, JSON.stringify(badPlugin, null, 2));
    fs.writeFileSync(path.join(badRelease, "unexpected-staging-file.txt"), "leftover from a broken pipeline");
    const badManifest = manifestOf(badRelease);
    const drifted = goodManifest.filter((file) => {
        const counterpart = badManifest.find((entry) => entry.path === file.path);
        return !counterpart || counterpart.sha256 !== file.sha256;
    }).map((file) => file.path).concat(badManifest.filter((file) => !goodManifest.some((entry) => entry.path === file.path)).map((file) => file.path));
    assert.ok(drifted.length >= 2, "the rehearsal must detect at least the manifest and the stray file");
    steps.push({step: "bad-release-detected", ok: true, drifted});

    /* 步骤 3：回滚——用预发布快照整目录替换坏版本。 */
    fs.rmSync(badRelease, {recursive: true, force: true});
    fs.cpSync(goodSnapshot, badRelease, {recursive: true});
    steps.push({step: "rollback-restored", ok: true});

    /* 步骤 4：完整性复核——回滚后逐文件哈希必须与预发布清单逐条一致。 */
    const restoredManifest = manifestOf(badRelease);
    assert.deepEqual(restoredManifest, goodManifest, "restored build must match the pre-release manifest byte-for-byte");
    const restoredPlugin = JSON.parse(fs.readFileSync(path.join(badRelease, "plugin.json"), "utf8"));
    assert.notEqual(restoredPlugin.version, "0.0.0-bad", "rollback must not reuse the bad version");
    const goodPlugin = JSON.parse(fs.readFileSync(path.join(goodSnapshot, "plugin.json"), "utf8"));
    assert.equal(restoredPlugin.version, goodPlugin.version, "restored version equals the last good version");
    steps.push({step: "integrity-verified", ok: true, assets: restoredManifest.length, version: restoredPlugin.version});

    const evidence = {startedAt, finishedAt: new Date().toISOString(), ok: true, steps};
    fs.mkdirSync(path.dirname(evidencePath), {recursive: true});
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(`rollback rehearsal passed: ${steps.length} steps, ${goodManifest.length} assets verified -> .artifacts/rollback-rehearsal.json`);
} finally {
    fs.rmSync(workspace, {recursive: true, force: true});
}
