/* T-1368 发布工程：把 dist 构建产物 package.zip 的 SHA-256 同步进当前版本发布说明。
   package.zip 保留真实构建时间以避免宿主同步按 mtime 回退安装包，因此每次构建
   都可能产生新摘要。用法：node scripts/sync-release-digest.cjs（最终构建和完整测试
   链结束后、check:release 前运行）。 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const zipPath = path.join(root, "package.zip");
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const notesPath = path.join(root, "docs", "releases", `release-notes-${version}.md`);

if (!fs.existsSync(zipPath)) {
    console.error("package.zip 不存在：先运行 pnpm run build（webpack 自动产出可复现 zip）。");
    process.exit(1);
}
if (!fs.existsSync(notesPath)) {
    console.error(`发布说明缺失：${path.relative(root, notesPath)}`);
    process.exit(1);
}

const digest = crypto.createHash("sha256").update(fs.readFileSync(zipPath)).digest("hex");
const notes = fs.readFileSync(notesPath, "utf8");
const digestLine = notes.match(/SHA-256(?:\*\*)?\s*[:：]\s*`([a-f0-9]{64})`/i);
if (!digestLine) {
    console.error("发布说明中未找到 SHA-256 行（格式：SHA-256：`<64 位十六进制>`）。");
    process.exit(1);
}
if (digestLine[1] === digest) {
    console.log(`digest already in sync: ${digest.slice(0, 12)}…`);
    process.exit(0);
}
fs.writeFileSync(notesPath, notes.replace(digestLine[1], digest), "utf8");
console.log(`release notes digest updated: ${digestLine[1].slice(0, 12)}… -> ${digest.slice(0, 12)}…`);
