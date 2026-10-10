const assert = require("node:assert/strict");
const fs = require("node:fs");

const readme = fs.readFileSync("README.md", "utf8");
const packageManifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
const changeLog = fs.readFileSync("docs/v4.0-ui-change-log.md", "utf8");
const roadmap = fs.readFileSync("docs/archive/ui-product-roadmap.md", "utf8");
const noteQueryGuide = fs.readFileSync("docs/note-query-integration.md", "utf8");
const currentReleaseStart = readme.indexOf("### 本次更新");
const historyStart = readme.indexOf("<details>", currentReleaseStart);
const historyEnd = readme.indexOf("</details>", historyStart);
assert.ok(currentReleaseStart >= 0 && historyStart > currentReleaseStart && historyEnd > historyStart,
    "current release must appear before a collapsible historical section");
const currentRelease = readme.slice(currentReleaseStart, historyStart);
assert.match(currentRelease, new RegExp(`本次更新（${packageManifest.version.replaceAll(".", "\\.")}）`));
assert.match(currentRelease, /\n\n[^\n]+\n\n新增：/,
    "current release must begin with a concise overall summary before categorized changes");
for (const category of ["新增：", "优化：", "修复："]) {
    assert.ok(currentRelease.includes(category), `current release is missing the ${category} category`);
}
const betaNotice = readme.slice(0, currentReleaseStart).match(/^> \*\*内测说明\*\*：([^\r\n]+)/m)?.[1] || "";
for (const pluginName of ["小驴考试", "小驴管家", "小驴闪卡", "小驴常用"]) {
    assert.ok(betaNotice.includes(pluginName), `the early beta notice must identify ${pluginName}`);
}
assert.match(readme.slice(historyStart, historyEnd), /<summary>历史版本更新（点击展开）<\/summary>/,
    "historical release notes must have a visible disclosure label");
for (const plugin of [
    ["小驴雷切", "siyuan-speed-switch"],
    ["小驴打卡", "siyuan-checkin"],
    ["小驴人脉", "siyuan-contacts"],
    ["小驴拾遗", "siyuan-glean"],
    ["小驴考试", "siyuan-exam"],
    ["小驴管家", "siyuan-home"],
    ["小驴闪卡", "siyuan-lv-cards"],
    ["小驴常用", "xiaolv-common"],
]) {
    assert.ok(readme.includes(plugin[0]) && readme.includes(`https://github.com/ai68298100/${plugin[1]}`),
        `series plugin table must include ${plugin[0]} and its GitHub repository`);
}
assert.match(readme, /交流 QQ 群：\*\*871707735\*\*/,
    "README must show the feedback and request QQ group");
assert.match(readme, /思源 v3.8.4/);
assert.match(readme, /pnpm run test:ui/);
assert.match(readme, /docs\/v4\.0-ui-change-log\.md/);
assert.match(readme, /docs\/archive\/ui-product-roadmap\.md/);
assert.match(changeLog, /Today/);
assert.match(changeLog, /Archived/);
assert.match(changeLog, /视觉测试需要设置 `CHECKIN_BROWSER`/);
assert.match(changeLog, /真实 SiYuan 桌面端、移动端/);
assert.match(roadmap, /智能体增强/);
assert.match(roadmap, /番茄钟/);
assert.match(roadmap, /移动端/);
assert.match(noteQueryGuide, /固定只读 SQL/);
assert.match(noteQueryGuide, /notequery:<itemId>:<blockId>:<localDate>/);
assert.match(noteQueryGuide, /手动事实优先/);
assert.match(noteQueryGuide, /任意 SQL/);
console.log("4.0 UI documentation checks passed.");
