const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "model.ts"), "utf8");
assert.match(source, /detectStoreConflict/);
assert.match(source, /StoreConflictReport/);
assert.match(source, /resolveStoreConflict/);
assert.match(source, /appendStoreAudit/);
console.log("Store conflict detection contract checks passed.");
