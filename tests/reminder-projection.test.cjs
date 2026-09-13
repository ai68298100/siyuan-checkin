const assert = require('node:assert/strict'); const fs = require('node:fs');
const source = fs.readFileSync('src/features/reminder-projection.ts','utf8');
assert.match(source,/reminderId/); assert.match(source,/sortReminders/); assert.match(source,/transitionReminder/); assert.match(source,/status === "completed"/);
console.log('Reminder projection structure checks passed.');
