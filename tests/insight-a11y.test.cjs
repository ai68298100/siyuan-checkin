const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/index.ts", "utf8");
assert.match(source, /role=\\"list\\" aria-label=\\"近 84 天完成情况\\"/);
assert.match(source, /role=\\"listitem\\" tabindex=\\"0\\"/);
assert.match(source, /day\.status === \\"complete\\"/);
console.log("Insight accessibility structure checks passed.");
