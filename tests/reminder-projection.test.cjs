const assert = require('node:assert/strict'); const fs = require('node:fs');
const source = fs.readFileSync('src/features/reminder-projection.ts','utf8');
assert.match(source,/reminderId/); assert.match(source,/sortReminders/); assert.match(source,/transitionReminder/); assert.match(source,/status === "completed"/);
assert.match(source,/projectOccasionReminder/); assert.match(source,/projectScheduleReminder/);
assert.match(source,/filterReminders/); assert.match(source,/options\.from/); assert.match(source,/options\.to/);
assert.match(source,/summarizeReminders/); assert.match(source,/pending: 0/);
assert.match(source,/normalizeReminderStatus/); assert.match(source,/item\.dueDate < today/);
console.log('Reminder projection structure checks passed.');
