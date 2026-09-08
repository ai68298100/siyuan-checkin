const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
assert.match(source, /data-action="add"/);
assert.match(source, /class="lc-checkin__record-note" type="text" maxlength="2000"/);
assert.match(source, /aria-label="记录备注"/);
assert.match(source, /data-edit-history-event-id/);
assert.match(source, /updateEventNote\(this\.store, event\.id, note\)/);
assert.match(source, /data-history-event-id/);
assert.match(source, /this\.store\.events\.find\(\(candidate\) => candidate\.id === eventId\)/);
assert.match(source, /data-history-date="\$\{key\}"/);
assert.match(source, /future \? "disabled"/);
assert.match(source, /this\.showEditor\(\)/);
assert.match(source, /saveForm\(data, editingId/);
assert.match(source, /expectedFingerprint/);
console.log("Recording and history editing structure checks passed.");
