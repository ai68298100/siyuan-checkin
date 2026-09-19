/* 可移植性守门（T-1245）：仓库里不得出现某个人机器的绝对路径。
   此前 tests/visual-qa.cjs、tests/ui-sweep.cjs、tests/accessibility-audit.test.cjs 与
   scripts/environment-check.cjs 都写死了别人主目录下的模块路径，换一台机器就直接失败。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const extensions = new Set([".ts", ".cjs", ".mjs", ".js", ".scss", ".md", ".json"]);
const scanned = [];

function collect(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const rel = path.posix.join(dir, entry.name);
        if (entry.isDirectory()) { collect(rel); continue; }
        if (extensions.has(path.extname(entry.name))) scanned.push(rel);
    }
}
/* 只约束可执行与对外文档面；历史跟踪日志（PROGRESS/TODO/DECISIONS）保留当时的记录原样。 */
for (const dir of ["src", "tests", "scripts", "docs", ".github"]) collect(dir);

/* 个人主目录特征：Windows 的 Users\<name>、POSIX 的 /Users/<name> 与 /home/<name>。 */
const patterns = [
    {label: "Windows 用户目录", regex: /[A-Za-z]:[\\/]{1,2}[Uu]sers[\\/]{1,2}\S+/},
    {label: "POSIX 用户目录", regex: /\/(?:Users|home)\/[A-Za-z0-9._-]+\//},
];
const offenders = [];
for (const rel of scanned) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    text.split(/\r?\n/).forEach((line, index) => {
        for (const entry of patterns) {
            if (entry.regex.test(line)) offenders.push(`${rel}:${index + 1} ${entry.label}: ${line.trim().slice(0, 100)}`);
        }
    });
}

assert.deepEqual(offenders, [], `发现绑定个人机器的绝对路径，请改用环境变量或标准安装路径:\n${offenders.join("\n")}`);
console.log(`Portable-path checks passed across ${scanned.length} tracked files.`);
