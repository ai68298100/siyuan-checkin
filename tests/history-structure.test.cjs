const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
assert.match(source, /data-history-month="-1"/);
assert.match(source, /data-history-month="1"/);
assert.match(source, /data-history-date="\$\{key\}"/);
assert.match(source, /future \? "disabled"/);
assert.match(source, /data-edit-history-event-id/);
assert.match(source, /data-history-event-id/);
assert.match(source, /formatHistoryDate\(this\.selectedHistoryDate\)/);
assert.match(source, /selectedEvents\.length} 条记录/);
assert.match(source, /data-action="export-json"/);
assert.match(source, /data-action="export-csv"/);
assert.match(source, /nextDisabled = this\.historyMonth >= currentMonth/);
assert.match(source, /candidate > currentMonth/);

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");
assert.match(styles, /\.lc-checkin__calendar\s*\{/);
assert.match(styles, /\.lc-checkin__history-selected\s*\{/);
assert.match(styles, /\.lc-checkin__history-event\s*\{/);
console.log("History page structure checks passed.");
