const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/index.ts", "utf8");
const editorSource = fs.readFileSync("src/render/bind-editor.ts", "utf8");
assert.match(source, /sanitizeDiagnosticDetail/, "settings feedback must use the diagnostic sanitizer");
assert.match(source, /const rawDetail = error instanceof Error \? error\.message : typeof error === "string" \? error : ""/, "only bounded text error details may reach the settings alert");
assert.match(source, /settingsFeedback\(detail \|\| t\("common\.unknownError"\)\)/, "empty/non-text failures use localized generic feedback");
assert.doesNotMatch(source, /settingsFeedback\(String\(error instanceof Error \? error\.message/, "raw host exception strings must not be rendered directly");
assert.match(source, /function safeUserErrorDetail\(error: unknown\)/, "shared user-facing error details must use one sanitizer boundary");
assert.ok((source.match(/safeUserErrorDetail\(error\)/g) || []).length >= 12, "settings, summary and persistence feedback paths must use the sanitizer");
assert.match(editorSource, /import \{sanitizeDiagnosticDetail\} from "\.\.\/features\/diagnostics"/, "editor feedback must share the diagnostic sanitizer");
assert.match(editorSource, /function safeEditorErrorDetail\(error: unknown\)/, "editor error paths must normalize unknown failures");
assert.ok((editorSource.match(/safeEditorErrorDetail\(error\)/g) || []).length >= 4, "anchor and icon error feedback must pass through the sanitizer");
console.log("Settings feedback safety checks passed.");
