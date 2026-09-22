/* T-1398 发布资产清单导出：对 dist/ 逐文件与 package.zip 整体计算字节数与 SHA-256，
   连同版本、git 提交与生成时间写入 .artifacts/release-manifest.json。
   幂等可复跑：同一次构建重复执行产物一致（generatedAt 除外）。
   该清单是 check:release 证据链的输入，由 tests/release-assets.test.cjs 核对。 */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const zipPath = path.join(root, "package.zip");
const outputRoot = path.join(root, ".artifacts");

function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

function walk(dir, prefix = "") {
    const entries = [];
    for (const name of fs.readdirSync(dir).sort()) {
        const absolute = path.join(dir, name);
        const relative = prefix ? `${prefix}/${name}` : name;
        if (fs.statSync(absolute).isDirectory()) {
            entries.push(...walk(absolute, relative));
        } else {
            const bytes = fs.readFileSync(absolute);
            entries.push({path: relative, bytes: bytes.length, sha256: sha256(bytes)});
        }
    }
    return entries;
}

assert.ok(fs.existsSync(distDir), "dist/ missing — run pnpm run build first");
const files = walk(distDir);
assert.ok(files.some((file) => file.path === "index.js"), "dist/index.js missing from the build");
assert.ok(files.some((file) => file.path === "plugin.json"), "dist/plugin.json missing from the build");

const assets = [...files];
if (fs.existsSync(zipPath)) {
    const zipBytes = fs.readFileSync(zipPath);
    assets.push({path: "package.zip", bytes: zipBytes.length, sha256: sha256(zipBytes)});
}

const plugin = JSON.parse(fs.readFileSync(path.join(distDir, "plugin.json"), "utf8"));
let commit = "";
try {
    commit = require("node:child_process").execFileSync("git", ["rev-parse", "HEAD"], {cwd: root, encoding: "utf8"}).trim();
} catch {
    commit = "unavailable";
}

const manifest = {
    version: plugin.version,
    commit,
    generatedAt: new Date().toISOString(),
    assets,
};

fs.mkdirSync(outputRoot, {recursive: true});
const target = path.join(outputRoot, "release-manifest.json");
fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`release manifest: ${assets.length} assets (version ${plugin.version}) -> .artifacts/release-manifest.json`);
