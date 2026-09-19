/* i18n 卫生守门：render 层的 aria-label/placeholder/title/alt 属性与可见文本不得写死中文，
   一律走 i18n 字典（t 键）。注释与 t(...) 调用本身不算违规。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const renderDir = path.join(__dirname, "..", "src", "render");
const files = fs.readdirSync(renderDir).filter((name) => name.endsWith(".ts"));
const offenders = [];
for (const name of files) {
    const source = fs.readFileSync(path.join(renderDir, name), "utf8");
    source.split("\n").forEach((line, index) => {
        if (/^\s*(\/\*|\*|\/\/)/.test(line)) return;
        /* 属性槽里出现中文且不是 ${t( 表达式 */
        if (/(?:aria-label|placeholder|title|alt)="[^"]*[\u4e00-\u9fff][^"]*"/.test(line) && !line.includes("${t(")) {
            offenders.push(`${name}:${index + 1} ${line.trim().slice(0, 90)}`);
        }
        /* setAttribute("aria-label"|"title"|"placeholder", "中文") 同样算写死，字符串字面量里没有插值通道。 */
        if (/setAttribute\(\s*"(?:aria-label|title|placeholder)"\s*,\s*"[^"{]*[\u4e00-\u9fff]/.test(line)) {
            offenders.push(`${name}:${index + 1} ${line.trim().slice(0, 90)}`);
        }
    });
}
assert.deepEqual(offenders, [], `render 层存在写死中文的用户可见属性:\n${offenders.join("\n")}`);
console.log(`i18n hygiene checks passed across ${files.length} render modules.`);
