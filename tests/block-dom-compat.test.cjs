/* T-1243 渲染块与兼容文档守门：内部 DOM 依赖必须限定在 block-renderer 一个模块内、有版本回退链，
   且 docs/siyuan-compatibility.md 的声明要与代码一致（此前文档写「未直接依赖思源内部 DOM」与代码矛盾）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const blockSource = read("src", "render", "block-renderer.ts");
const teardownSource = read("src", "teardown.ts");
const compatDoc = read("docs", "siyuan-compatibility.md");
const pluginJson = JSON.parse(read("plugin.json"));

/* 1. 代码块识别的三条回退链，顺序：宿主 data 属性 → 语言类 → 语言标签文本。 */
assert.match(blockSource, /const subtype = block\.dataset\.subtype \|\| "";\s*if \(subtype === BLOCK_LANGUAGE\) return true;\s*if \(block\.querySelector\("\.language-checkin"\)\) return true;/, "block detection must keep the class-based fallback ahead of the language label");
assert.match(blockSource, /\.protyle-action__language"\);\s*return \(lang\?\.textContent \|\| ""\)\.trim\(\)\.toLowerCase\(\) === BLOCK_LANGUAGE/, "the language label path must stay case-insensitive and trimmed");

/* 2. 配置文本读取必须是四级回退并取第一个非空结果。 */
const readBody = blockSource.slice(blockSource.indexOf("function readBlockConfigText"));
const readSlice = readBody.slice(0, readBody.indexOf("\n}"));
for (const selector of [".hljs [contenteditable='true']", "\".hljs\"", "\"pre\"", "\"code\""]) {
    assert.ok(readSlice.includes(selector), `config text must fall back to ${selector}`);
    assert.ok(readSlice.indexOf(selector) < readSlice.indexOf("for (const node of candidates)"), `${selector} must be declared before the loop`);
}
assert.match(readSlice, /if \(raw\.trim\(\)\) break;/, "the first non-empty candidate must win so an empty .hljs cannot mask the real content");

/* 3. 思源专有选择器不得扩散到其它模块（contenteditable 之类的通用判定不算耦合）。 */
const coupled = ["protyle-action__language", "protyle-linenumber__rows", "protyle-attr", "b3-typography"];
const srcFiles = [];
(function walk(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(rel); continue; }
        if (rel.endsWith(".ts")) srcFiles.push(rel);
    }
})("src");
for (const token of coupled) {
    const offenders = srcFiles.filter((rel) => !rel.endsWith("block-renderer.ts") && read(rel).includes(token));
    assert.deepEqual(offenders, [], `思源内部 DOM 选择器 ${token} 只允许出现在 block-renderer 内，实际出现在: ${offenders.join(", ")}`);
}

/* 4. 拆除预算常量与文档口径一致。 */
const drainMs = Number((teardownSource.match(/TEARDOWN_DRAIN_BUDGET_MS = (\d+)/) || [])[1]);
const flushMs = Number((teardownSource.match(/TEARDOWN_FLUSH_BUDGET_MS = (\d+)/) || [])[1]);
assert.ok(compatDoc.includes(`${Math.round(drainMs / 100) / 10} 秒`), `doc must state the ${drainMs}ms drain budget`);
assert.ok(compatDoc.includes(`${flushMs} 毫秒`), `doc must state the ${flushMs}ms flush budget`);
assert.ok(compatDoc.includes("5 秒"), "doc must state the host teardown budget");

/* 5. 文档要如实登记三处内部 DOM 依赖与降级边界。 */
for (const claim of [".protyle-action__language", ".hljs [contenteditable='true']", "#mobileTopBar", "?remote=1", "403", "静默不加载"]) {
    assert.ok(compatDoc.includes(claim), `兼容文档必须登记 ${claim}`);
}
assert.ok(!compatDoc.includes("未直接依赖思源内部 DOM"), "文档不得再声明「未直接依赖思源内部 DOM」");

/* 6. 智能体能力清单与文档必须逐一对应。 */
const capSource = read("src", "agent-capabilities.ts");
const caps = [...capSource.matchAll(/name: "(checkin-[a-z-]+)"/g)].map((match) => match[1]);
assert.equal(caps.length, 11, `agent capability count drifted: ${caps.join(", ")}`);
for (const cap of caps) {
    assert.ok(compatDoc.includes(cap), `兼容文档缺少智能体能力 ${cap}`);
}
const writable = caps.filter((cap, index) => {
    const start = capSource.indexOf(`name: "${cap}"`);
    const end = index + 1 < caps.length ? capSource.indexOf(`name: "${caps[index + 1]}"`) : capSource.length;
    const effects = capSource.slice(start, end).match(/effects: \{[^}]*\}/);
    return Boolean(effects && effects[0].includes("localWrite: true"));
});
assert.equal(writable.length, 4, `写入型能力应为 4 项，实际 ${writable.length}: ${writable.join(", ")}`);

/* 7. plugin.json 的版本门槛必须是三段式 semver，否则内核比较失效。 */
assert.match(pluginJson.minAppVersion, /^\d+\.\d+\.\d+$/, "minAppVersion must be a three-part semver for the kernel gate to work");
assert.ok(compatDoc.includes(pluginJson.minAppVersion), "doc must state the declared minAppVersion");

console.log(`Block DOM-compat and compatibility-doc checks passed: ${caps.length} agent capabilities, ${coupled.length} coupled selectors confined, budgets ${drainMs}/${flushMs}ms.`);
