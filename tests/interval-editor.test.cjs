const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");

assert.match(source, /interval:\s*"每隔 N 天"/);
assert.match(source, /name="intervalDays"[^>]*min="1"[^>]*max="3650"/);
assert.match(source, /name="anchorDate"[^>]*type="date"/);
assert.match(source, /intervalSchedule\.hidden = scheduleSelect\?\.value !== "interval"/);
assert.match(source, /scheduleType === "interval"[\s\S]*intervalDays: intervalDaysValue, anchorDate: anchorDateValue/);
assert.match(source, /formatScheduleLabel\(revision\.schedule\)/);
assert.match(source, /isValidLocalDateInput\(requestedAnchor\)/);
assert.match(source, /Math\.ceil\(current \/ step - 1e-9\) \* step/);
assert.match(source, /!weekdays\.querySelector<HTMLInputElement>\("input\[name='weekday'\]:checked"\)/);
assert.match(source, /const advanced = root\.querySelector<HTMLDetailsElement>\("\[data-advanced\]"\)/);

console.log("Interval editor structure checks passed.");
