const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
const opsSource = fs.readFileSync(path.join(__dirname, "..", "src", "plugin-ops.ts"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "render", "review.ts"), "utf8");
assert.match(source, /data-history-month="-1"/);
assert.match(source, /data-history-month="1"/);
assert.match(source, /data-history-date="\$\{key\}"/);
assert.match(source, /future \? "disabled"/);
assert.match(source, /data-edit-history-event-id/);
assert.match(source, /data-history-event-id/);
assert.match(source, /formatHistoryDate\(ctx\.selectedHistoryDate\)/);
assert.match(source, /review\.recordsCount/);
assert.match(source, /data-action="export-json"/);
assert.match(source, /data-action="export-csv"/);
assert.match(source, /nextDisabled = ctx\.historyMonth >= currentMonth/);
assert.match(opsSource, /candidate > currentMonth/);

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8") + fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
assert.match(styles, /\.lc-checkin__calendar\s*\{/);
assert.match(styles, /\.lc-checkin__history-selected\s*\{/);
assert.match(styles, /\.lc-checkin__history-event\s*\{/);
assert.match(source, /lc-checkin__history-aggregate/);
assert.match(source, /<details class="lc-checkin__history-details">/);
assert.match(source, /review\.historyDetails/);
assert.match(styles, /\.lc-checkin__history-aggregate\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
console.log("History page structure checks passed.");
