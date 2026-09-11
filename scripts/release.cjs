#!/usr/bin/env node
/* 8.0 P4 一键发布流水线：
   node scripts/release.cjs <version> "<release title>"
   前置：工作区干净、dist 已随 build 刷新。
   步骤：版本号 → 构建 → 全部测试链 → 提交 → 推送 → tag → GitHub Release。 */
const {execSync} = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const version = process.argv[2];
const title = process.argv[3] || `小驴打卡 v${version}`;
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    console.error("用法: node scripts/release.cjs <version> [title]");
    process.exit(1);
}
const root = path.resolve(__dirname, "..");
const run = (command, options = {}) => execSync(command, {cwd: root, stdio: "inherit", ...options});

const parseVersion = (value) => value.split(".").map(Number);
const compareVersions = (left, right) => {
    const a = parseVersion(left);
    const b = parseVersion(right);
    for (let index = 0; index < 3; index += 1) {
        if (a[index] !== b[index]) return a[index] - b[index];
    }
    return 0;
};
const currentPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (compareVersions(version, currentPackage.version) < 0) {
    console.error(`发布版本 ${version} 低于当前 package.json 版本 ${currentPackage.version}`);
    process.exit(1);
}
try {
    const existingTag = execSync(`git tag --list v${version}`, {cwd: root, encoding: "utf8"}).trim();
    if (existingTag) {
        console.error(`Tag v${version} 已存在，不能重复发布`);
        process.exit(1);
    }
} catch {
    // git tag 查询失败时让后续发布步骤报告原始错误。
}

// 1. 版本号
for (const file of ["package.json", "plugin.json"]) {
    const target = path.join(root, file);
    const json = JSON.parse(fs.readFileSync(target, "utf8"));
    if (json.version !== version) {
        json.version = version;
        fs.writeFileSync(target, JSON.stringify(json, null, 4) + "\n", "utf8");
    }
}
const indexTs = path.join(root, "src", "index.ts");
let source = fs.readFileSync(indexTs, "utf8");
if (source.includes('const PLUGIN_VERSION = "')) {
    source = source.replace(/const PLUGIN_VERSION = "[^"]+";/, `const PLUGIN_VERSION = "${version}";`);
    fs.writeFileSync(indexTs, source, "utf8");
}
const versionTs = path.join(root, "src", "version.ts");
if (fs.existsSync(versionTs)) {
    let versionSource = fs.readFileSync(versionTs, "utf8");
    versionSource = versionSource.replace(/export const PLUGIN_VERSION = "[^"]+";/, `export const PLUGIN_VERSION = "${version}";`);
    fs.writeFileSync(versionTs, versionSource, "utf8");
}

// 2. 构建 + 全部测试链
run("pnpm run build");
for (const chain of ["check", "test", "test:ui", "test:mobile", "test:ecosystem", "check:release"]) {
    run(`pnpm run ${chain}`);
}

// 3. 提交 + 推送 + tag
run("git add -A");
run(`git commit -m "release: v${version}"`);
run("git push origin main");
run(`git tag -a v${version} -m "Release v${version}"`);
run(`git push origin v${version}`);

// 4. Release（notes 文件须提前放在 /tmp 或传入）
const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "package.zip"))).digest("hex");
const notesFile = process.argv[4] || `/tmp/release-notes-${version}.md`;
let notes = fs.readFileSync(notesFile, "utf8");
notes = notes.replace(/SHA-256\*\*: `[a-f0-9]+`/, `SHA-256**: \`${sha}\``);
const tmpNotes = path.join(root, ".artifacts", `notes-${version}.md`);
fs.mkdirSync(path.dirname(tmpNotes), {recursive: true});
fs.writeFileSync(tmpNotes, notes, "utf8");
run(`gh release create v${version} package.zip --title "${title}" --notes-file "${tmpNotes}"`);
console.log(`v${version} 已发布，SHA-256: ${sha}`);
