const fs = require("fs");
let c = fs.readFileSync("tests/e2e/render-block.spec.mjs", "utf8");

// 1) 注入扩展:补 month/heatmap/坏配置三块
const a1 = "        host.innerHTML =";
const b1 = [
    "        host.innerHTML =",
    "            `<div class=\"code-block\"><div class=\"protyle-action__language\">checkin</div><pre><code class=\"hljs\"><div contenteditable=\"true\">{\"view\":\"month\"}</div></code></pre></div>` +",
    "            `<div class=\"code-block\"><div class=\"protyle-action__language\">checkin</div><pre><code class=\"hljs\"><div contenteditable=\"true\">{\"view\":\"heatmap\",\"year\":2026}</div></code></pre></div>` +",
    "            `<div class=\"code-block\"><div class=\"protyle-action__language\">checkin</div><pre><code class=\"hljs\"><div contenteditable=\"true\">not-json-at-all</div></code></pre></div>` +",
].join("\n");
if (c.split(a1).length !== 2) { console.error("inject anchor"); process.exit(1); }
c = c.replace(a1, b1);

// 2) 断言扩展:month/heatmap/错误占位 + 数量
const a2 = '        return {hit, missIsEmpty};\n    }, {timeout: 20000}).toEqual({hit: true, missIsEmpty: true});';
const b2 = [
    "        const monthRendered = await page.locator(\"[data-renderblock-month]\").count();",
    "        const heatmapRendered = await page.locator(\"[data-renderblock-year]\").count();",
    "        const errorShown = await page.locator(\"[data-checkin-preview] [role='alert']\").count();",
    "        return {hit, missIsEmpty, monthRendered, heatmapRendered, errorShown};",
    "    }, {timeout: 20000}).toEqual({hit: true, missIsEmpty: true, monthRendered: 1, heatmapRendered: 1, errorShown: 1});",
].join("\n");
if (c.split(a2).length !== 2) { console.error("a2 anchor", c.split(a2).length); process.exit(1); }
c = c.replace(a2, b2);

fs.writeFileSync("tests/e2e/render-block.spec.mjs", c);
console.log("views extended");
