const assert = require("node:assert/strict");
const fs = require("node:fs");

const readme = fs.readFileSync("README.md", "utf8");
const changeLog = fs.readFileSync("docs/v4.0-ui-change-log.md", "utf8");
assert.match(readme, /当前开发线：4\.0/);
assert.match(readme, /pnpm run test:ui/);
assert.match(readme, /docs\/v4\.0-ui-change-log\.md/);
assert.match(changeLog, /Today/);
assert.match(changeLog, /Archived/);
assert.match(changeLog, /真实思源客户端视觉验收/);
console.log("4.0 UI documentation checks passed.");
