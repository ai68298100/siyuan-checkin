/* T-1354 CSS 审计工具：找出 dist/index.css 中无消费方的类。
   T-1526 修正：旧实现对「TS+SCSS 合并文本」做包含判定，而 dist CSS 本就编译自
   SCSS，任何类都必然命中自身定义——dead 恒为空，守门形同虚设。现改为：
   - TS 零字面引用 + 非动态/外部前缀 → dead（真实可清理的死规则）；
   - is-/has- 前缀、数字后缀 → dynamicSuspect（TS 以 is-${state} 等模板拼接，人工核对）；
   - b3- 前缀 → dynamicSuspect（思源宿主 DOM 类，插件只做覆盖样式，不由 TS 生成）。
   用法：node scripts/css-audit.cjs [--json]；也可被测试 require。 */
const fs = require("node:fs");
const path = require("node:path");

function readSources(dir, filter) {
    const files = [];
    const walk = (current) => {
        for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (filter.test(entry.name)) files.push(fs.readFileSync(full, "utf8"));
        }
    };
    walk(dir);
    return files.join("\n");
}

function cssAudit(cssPath) {
    const resolved = cssPath || path.join(__dirname, "..", "dist", "index.css");
    const css = fs.readFileSync(resolved, "utf8");

    const classTokenRe = /\.([a-zA-Z][\w-]*(?:__[\w-]+)?(?:--[\w-]+)?)/g;
    const classes = new Set();
    for (const match of css.matchAll(classTokenRe)) classes.add(match[1]);

    /* 死判定只看 TS：TS 是唯一会在运行时把类写进 DOM 的来源；
       SCSS 里出现只说明「有样式定义」，不说明「有元素挂这个类」。 */
    const tsBlob = readSources(path.join(__dirname, "..", "src"), /\.ts$/);

    const dead = [];
    const dynamicSuspect = [];
    for (const cls of [...classes].sort()) {
        if (tsBlob.includes(cls)) continue;
        if (/^(is|has|b3)-/.test(cls) || /\d$/.test(cls)) dynamicSuspect.push(cls);
        else dead.push(cls);
    }

    let duplicateRuleBytes = 0;
    let duplicateRules = 0;
    const rules = new Map();
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*[^{}\s])\}/g)) {
        const selector = match[1].trim().replace(/\s+/g, " ");
        const body = match[2].trim();
        if (!selector || !body) continue;
        const key = `${selector}{${body}}`;
        const seen = rules.get(key) || 0;
        rules.set(key, seen + 1);
        if (seen === 1) {
            duplicateRules += 1;
            duplicateRuleBytes += key.length + 1;
        }
    }

    return {total: classes.size, dead, dynamicSuspect, duplicateRules, duplicateRuleBytes, bytes: css.length};
}

module.exports = {cssAudit};

if (require.main === module) {
    const result = cssAudit();
    if (process.argv.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(`total class tokens: ${result.total}`);
        console.log(`dead (no TS consumer): ${result.dead.length}`);
        result.dead.forEach((cls) => console.log(`  DEAD ${cls}`));
        console.log(`dynamic-suspect (manual review): ${result.dynamicSuspect.length}`);
        console.log(`duplicate rules: ${result.duplicateRules} (~${result.duplicateRuleBytes} bytes)`);
    }
}
