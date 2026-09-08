const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("docs/ecosystem-integration.md", "utf8");
assert.match(source, /source/); assert.match(source, /externalRef/); assert.match(source, /recordEvent/); assert.match(source, /registerFocusAdapter/); assert.match(source, /addAgentCapability/); assert.match(source, /离线/); assert.match(source, /去重/); assert.match(source, /明确要求/);
assert.match(source, /宿主兼容矩阵/); assert.match(source, /第三方接入检查清单/); assert.match(source, /itemId/); assert.match(source, /注销函数/); assert.match(source, /待重试事件/);
console.log("Integration ecosystem documentation checks passed.");
