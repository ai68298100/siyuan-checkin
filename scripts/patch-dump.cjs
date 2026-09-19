const fs = require("fs");
let c = fs.readFileSync("tests/e2e/render-block.spec.mjs", "utf8");
const lines = c.split("\n");
const start = lines.findIndex((line) => line.includes("let previewTexts = [];"));
const end = lines.findIndex((line, index) => index > start && line.trim() === "});");
if (start < 0 || end < 0) { console.error("block missing"); process.exit(1); }
const dump = [
    "    await page.waitForTimeout(8000);",
    "    const dump = await page.evaluate(() => ({",
    "        blocks: document.querySelectorAll(\".code-block\").length,",
    "        previews: [...document.querySelectorAll(\"[data-checkin-preview]\")].map((node) => ({cls: node.className, text: (node.textContent || \"\").slice(0, 80)})),",
    "    }));",
    "    throw new Error(\"RENDER DUMP: \" + JSON.stringify(dump));",
].join("\n");
lines.splice(start, end - start, dump);
fs.writeFileSync("tests/e2e/render-block.spec.mjs", lines.join("\n"));
console.log("dump block installed");
