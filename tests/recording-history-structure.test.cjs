const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "src");
const source = [
    "index.ts",
    "render/fragments.ts",
    "render/bind-today.ts",
    "render/review.ts",
    "render/bind-page-navigation.ts",
    "render/bind-editor.ts",
    "render/save-form.ts",
].map((name) => fs.readFileSync(path.join(root, name), "utf8")).join("\n");
assert.match(source, /data-action="add"/);
assert.match(source, /class="lc-checkin__record-note" type="text" maxlength="2000"/);
assert.match(source, /aria-label="\$\{t\("item\.noteAria"\)\}"/);
assert.match(source, /data-edit-history-event-id/);
assert.match(source, /updateEventNote\(host\.store, event\.id, note\)/);
assert.match(source, /data-history-event-id/);
assert.match(source, /getEventById\(host\.store, eventId\)/);
assert.match(source, /data-history-date="\$\{key\}"/);
assert.match(source, /future \? "disabled"/);
assert.match(source, /host\.showEditor\(\)/);
assert.match(source, /host\.saveForm\(data, editingId/);
assert.match(source, /expectedFingerprint/);
console.log("Recording and history editing structure checks passed.");
