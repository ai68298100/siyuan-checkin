const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const guide = read("docs/user-guide.md");
const faq = read("docs/faq.md");
const packageJson = JSON.parse(read("package.json"));

assert.match(guide, /当前已发布版本/);
assert.match(guide, /第一次记录/);
assert.match(guide, /二值/);
assert.match(guide, /次数/);
assert.match(guide, /时长/);
assert.match(guide, /数量/);
assert.match(guide, /补记/);
assert.match(guide, /撤销/);
assert.match(guide, /回顾/);
assert.match(guide, /日记/);
assert.match(guide, /迁移/);
assert.match(guide, /移动端/);
assert.match(guide, /恢复点独立于 JSON 主档/);
assert.match(guide, /导出、导入或清空/);
assert.match(guide, /常见问题/);
assert.match(guide, /data-privacy-and-uninstall\.md/);
assert.match(faq, /现象 → 检查 → 修复 → 反馈/);
assert.match(faq, /来源已开启/);
assert.match(faq, /移动端看不到/);
assert.match(faq, /提醒中心是插件内呈现/);
assert.match(faq, /升级或缓存异常/);
assert.match(faq, /存储本身失败/);
assert.match(faq, /恢复点导入、导出或清空失败/);
assert.match(faq, /当前打卡数据和旧恢复点仍在/);
assert.match(faq, /导出诊断 JSON/);
assert.match(faq, /Key、Token/);
assert.match(faq, /data-privacy-and-uninstall\.md/);

const faqSections = faq.split(/^## /m).slice(1);
assert.ok(faqSections.length >= 8, "FAQ must cover the required task failures");
for (const section of faqSections) {
    for (const marker of ["**现象**：", "**检查**：", "**修复**：", "**反馈**："]) {
        assert.ok(section.includes(marker), `FAQ section is missing ${marker}: ${section.split("\n", 1)[0]}`);
    }
}

const markdownLinks = [...`${guide}\n${faq}`.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
for (const target of markdownLinks) {
    if (/^(?:https?:|#)/.test(target)) continue;
    const file = target.split("#", 1)[0];
    assert.ok(fs.existsSync(path.resolve(root, "docs", file)), `missing local help link: ${target}`);
}
assert.ok(packageJson.version, "package version must remain available for help headers and release checks");
console.log("Help documentation checks passed: task paths, FAQ recovery sections and local links.");
