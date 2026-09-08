const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("docs/ecosystem-integration.md", "utf8");
assert.match(source, /source/); assert.match(source, /externalRef/); assert.match(source, /recordEvent/); assert.match(source, /registerFocusAdapter/); assert.match(source, /addAgentCapability/); assert.match(source, /离线/); assert.match(source, /去重/); assert.match(source, /明确要求/);
console.log("Integration ecosystem documentation checks passed.");
