const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/index.ts", "utf8");
const editorSource = fs.readFileSync("src/render/bind-editor.ts", "utf8");
const navigationSource = fs.readFileSync("src/navigation.ts", "utf8");
const downloadSource = fs.readFileSync("src/download.ts", "utf8");
const journalSource = fs.readFileSync("src/render/journal-dialog.ts", "utf8");
const yeguifSource = fs.readFileSync("src/render/yeguif-mappings.ts", "utf8");
const ecosystemSource = fs.readFileSync("src/ecosystem.ts", "utf8");
assert.match(source, /sanitizeDiagnosticDetail/, "settings feedback must use the diagnostic sanitizer");
assert.match(source, /const rawDetail = error instanceof Error \? error\.message : typeof error === "string" \? error : ""/, "only bounded text error details may reach the settings alert");
assert.match(source, /settingsFeedback\(detail \|\| t\("common\.unknownError"\)\)/, "empty/non-text failures use localized generic feedback");
assert.doesNotMatch(source, /settingsFeedback\(String\(error instanceof Error \? error\.message/, "raw host exception strings must not be rendered directly");
assert.doesNotMatch(source, /showMessage\(error instanceof Error && error\.message \? error\.message/, "note-query validation feedback must not show raw exception strings");
assert.match(source, /function safeUserErrorDetail\(error: unknown\)/, "shared user-facing error details must use one sanitizer boundary");
assert.ok((source.match(/safeUserErrorDetail\(error\)/g) || []).length >= 12, "settings, summary and persistence feedback paths must use the sanitizer");
assert.match(editorSource, /import \{sanitizeDiagnosticDetail\} from "\.\.\/features\/diagnostics"/, "editor feedback must share the diagnostic sanitizer");
assert.match(editorSource, /function safeEditorErrorDetail\(error: unknown\)/, "editor error paths must normalize unknown failures");
assert.ok((editorSource.match(/safeEditorErrorDetail\(error\)/g) || []).length >= 4, "anchor and icon error feedback must pass through the sanitizer");
for (const [name, moduleSource] of Object.entries({navigation: navigationSource, download: downloadSource, journal: journalSource, yeguif: yeguifSource, ecosystem: ecosystemSource})) {
    assert.match(moduleSource, /sanitizeDiagnosticDetail/, `${name} feedback must share the diagnostic sanitizer`);
}
assert.doesNotMatch(navigationSource, /msg\.openTabFail[\s\S]{0,120}String\(error\)/, "tab-open feedback must not expose raw exception strings");
assert.doesNotMatch(downloadSource, /msg\.exportSaveFail[\s\S]{0,120}String\(error\)/, "export feedback must not expose raw exception strings");
assert.doesNotMatch(journalSource, /status\.textContent = error instanceof Error \? error\.message/, "journal feedback must not expose raw exception strings");
assert.doesNotMatch(yeguifSource, /liveStatus\.textContent = error instanceof Error \? error\.message/, "mapping feedback must not expose raw exception strings");
assert.doesNotMatch(ecosystemSource, /error: String\(error instanceof Error \? error\.message/, "agent integration results must not expose raw exception strings");
console.log("Settings feedback safety checks passed.");
