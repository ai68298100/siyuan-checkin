/* T-1371 i18n 字典健康度门禁：zh-CN 与 en-US 字典键集合完全对等、无重复键、
   插值占位符一致；字典间不得出现只属于单一语言的键（防止文案漂移）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/i18n.ts", "utf8");
const zhBlock = source.slice(source.indexOf("const zhCN"), source.indexOf("const enUS"));
const enBlock = source.slice(source.indexOf("const enUS"));

const parseKeys = (block) => {
    const keys = new Map();
    for (const match of block.matchAll(/"((?:[^"\\]|\\.)*)":\s*(?:"((?:[^"\\]|\\.)*)"|`([^`]*)`)/g)) {
        const key = match[1];
        assert.ok(!keys.has(key), `duplicate key in dict: ${key}`);
        keys.set(key, match[2] ?? match[3] ?? "");
    }
    return keys;
};
const zh = parseKeys(zhBlock);
const en = parseKeys(enBlock);

const zhOnly = [...zh.keys()].filter((key) => !en.has(key));
const enOnly = [...en.keys()].filter((key) => !zh.has(key));
assert.deepEqual(zhOnly, [], `zh-only keys missing from en dict: ${zhOnly.join(", ")}`);
assert.deepEqual(enOnly, [], `en-only keys missing from zh dict: ${enOnly.join(", ")}`);

/* 插值占位符对等：同名键在中英两侧的 {placeholder} 集合必须一致。 */
const placeholders = (text) => new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]));
let mismatches = 0;
for (const [key, zhText] of zh) {
    const enText = en.get(key);
    if (!enText) continue;
    const a = [...placeholders(zhText)].sort().join(",");
    const b = [...placeholders(enText)].sort().join(",");
    if (a !== b) {
        mismatches += 1;
        console.error(`placeholder mismatch ${key}: zh {${a}} vs en {${b}}`);
    }
}
assert.equal(mismatches, 0, `${mismatches} keys have mismatched placeholders`);


/* T-1623：t() 全量替换契约——同一占位符出现多次时全部替换，不得残留字面占位符。 */
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const i18nDir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-i18n-parity-"));
fs.writeFileSync(path.join(i18nDir, "i18n.js"), ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
const {t: translate, setPluginLanguage} = require(path.join(i18nDir, "i18n.js"));
setPluginLanguage("zh-CN");
assert.equal(translate("trust.reasonThreshold", {value: 30, threshold: 30, unit: "分钟"}), "30分钟 ≥ 阈值 30分钟", "repeated {unit} placeholders are all replaced");
assert.ok(!translate("trust.reasonThreshold", {value: 1, threshold: 2, unit: "次"}).includes("{"), "no literal placeholder survives substitution");
fs.rmSync(i18nDir, {recursive: true, force: true});
console.log(`i18n parity checks passed: ${zh.size} zh keys, ${en.size} en keys, placeholders aligned`);
