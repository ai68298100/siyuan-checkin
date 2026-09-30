/* T-1723 切片守门：事项页双语漏出清理（D-364）。
   缺陷：components.scss 停用伪元素 content 写死中文"已停用"——en-US 下同样显示
   中文（双语漏出），且与渲染层 status 徽章（occ.statusDisabled，双语）重复显示。
   契约：CSS 不再持有任何中文文案字面量（content: none）；停用状态由渲染层
   双语徽章唯一承担；datalist id 用递增序列多 root 不冲突。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const cssSource = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
assert.doesNotMatch(cssSource, /content:\s*"已停用"/, "the hardcoded Chinese pseudo-element is gone (red was 4529)");
assert.match(cssSource, /is-disabled::after \{ content: none; \}/, "the disabled pseudo-element is explicitly neutralized");

/* 渲染层停用徽章（双语）仍是唯一状态来源。 */
const viewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
assert.match(viewSource, /occ\.statusDisabled/, "the disabled status comes from the i18n-driven badge");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.equal((i18nSource.match(/"occ\.statusDisabled":/g) || []).length, 2, "statusDisabled exists in both dictionaries");

/* 其余 SCSS 不再持有中文 content（全库清点）。 */
const otherFiles = ["src/ui/components.scss", "src/ui/workbench.scss", "src/ui/tokens.scss", "src/ui/content-responsive.scss", "src/ui/maintenance-responsive.scss"].filter((file) => fs.existsSync(path.join(__dirname, "..", file)));
for (const file of otherFiles) {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    assert.doesNotMatch(source, /content:\s*"[^"]*[\u4e00-\u9fff][^"]*"/, `${file} holds no hardcoded Chinese content`);
}

/* 红证对照：修复前（165aeba）SCSS 写死中文。 */
const preFixCss = cp.execSync("git show 165aeba:src/ui/components.scss", {encoding: "utf8"});
assert.match(preFixCss, /content:\s*"已停用"/, "the pre-fix CSS held the hardcoded Chinese copy (red evidence)");

console.log("occasion-i18n: all assertions passed");
