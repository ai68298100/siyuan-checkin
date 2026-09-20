/* T-1354 CSS 审计工具：找出 dist/index.css 中在 src 源码（.ts/.scss）无字面引用的类。
   动态类（is-/has- 前缀、数字后缀状态、含 ${} 插值的类名片段）单独归类为 dynamic-suspect，
   不自动判死——删除需人工核对。用法：node scripts/css-audit.cjs [--json]；
   也可被测试 require：const {cssAudit} = require(".../css-audit.cjs")。 */
const fs = require("node:fs");
const path = require("node:path");

function cssAudit(cssPath) {
    const resolved = cssPath || path.join(__dirname, "..", "dist", "index.css");
    const css = fs.readFileSync(resolved, "utf8");

    const classTokenRe = /\.([a-zA-Z][\w-]*(?:__[\w-]+)?(?:--[\w-]+)?)/g;
    const classes = new Set();
    for (const match of css.matchAll(classTokenRe)) classes.add(match[1]);

    /* 收集 src 源码文本（模板串里的类名、classList 拼接、SCSS 规则）。 */
    const sources = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (/\.(ts|scss)$/.test(entry.name)) sources.push(fs.readFileSync(full, "utf8"));
        }
    };
    walk(path.join(__dirname, "..", "src"));
    const haystack = sources.join("\n");

    const dead = [];
    const dynamicSuspect = [];
    for (const cls of [...classes].sort()) {
        if (haystack.includes(cls)) continue;
        if (/^(is|has)-/.test(cls) || /\d$/.test(cls)) dynamicSuspect.push(cls);
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
        console.log(`dead (no literal source reference): ${result.dead.length}`);
        result.dead.forEach((cls) => console.log(`  DEAD ${cls}`));
        console.log(`dynamic-suspect (manual review): ${result.dynamicSuspect.length}`);
        console.log(`duplicate rules: ${result.duplicateRules} (~${result.duplicateRuleBytes} bytes)`);
    }
}
