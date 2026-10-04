const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const moduleCache = new Map();
function loadTs(filename) {
    if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
    const loaded = {exports: {}};
    moduleCache.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const localRequire = (name) => name.startsWith(".")
        ? loadTs(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name);
    new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
    return loaded.exports;
}

const {normalizeAttachmentDataUrl, normalizeStore, normalizeItem, createStoreSnapshotEnvelope, readStoreSnapshot} = loadTs(path.join(sourceRoot, "model.ts"));
const {makeEventValue} = loadTs(path.join(sourceRoot, "model-helpers.ts"));
const {parseJsonBackup, serializeCsv, parseCheckinCsv} = loadTs(path.join(sourceRoot, "export.ts"));
const {t: translate, setPluginLanguage} = loadTs(path.join(sourceRoot, "i18n.ts"));
const validAttachment = "data:image/png;base64,iVBORw0KGgo=";
const item = normalizeItem({id: "photo-item", name: "Photo", kind: "binary", target: 1, schedule: {type: "daily"}, createdAt: "2026-10-01T00:00:00Z"});
assert.ok(item);
const moment = {occurredAt: "2026-10-04T00:00:00Z", localDate: "2026-10-04"};
const rawEvent = {id: "photo-event", itemId: item.id, value: 1, unit: "times", source: "manual", ...moment};
const rejectedAttachments = [
    undefined, null, 5, "", "javascript:alert(1)", "java\nscript:alert(1)", "https://example.com/photo.png",
    "blob:photo", "/attachments/photo.png", "data:text/html;base64,PHNjcmlwdD4=",
    "data:image/svg+xml;base64,PHN2Zz4=", "data:image/svg+xml,<svg/>", "data:image/png;utf8,photo",
    "data:image/png;base64,", "data:image/png;base64,AAA", "data:image/png;base64,AA!=", "data:image/png;base64,A===",
    "data:image/png;base64,AAAA\n", 'data:image/png;base64,AAAA" onerror="alert(1)',
    "data:image/png;base64," + "A".repeat(700000),
];
for (const attachment of rejectedAttachments) {
    assert.equal(normalizeAttachmentDataUrl(attachment), undefined);
    const store = normalizeStore({version: 3, items: [item], events: [{...rawEvent, attachment}], eventTombstones: []});
    assert.equal(store.events.length, 1, "rejecting an optional image cannot discard its check-in fact");
    assert.equal(store.events[0].id, rawEvent.id);
    assert.equal(store.events[0].attachment, undefined);
    assert.equal(makeEventValue(item, 1, "manual", "times", undefined, undefined, moment, attachment).attachment, undefined);
}
for (const mime of ["png", "jpeg", "jpg", "webp", "gif"]) {
    const attachment = `data:image/${mime};base64,iVBORw0KGgo=`;
    assert.equal(normalizeAttachmentDataUrl(attachment), attachment, "normalization validates the URL grammar without HTML escaping or binary decoding");
    const store = normalizeStore({version: 3, items: [item], events: [{...rawEvent, attachment}], eventTombstones: []});
    assert.equal(store.events[0].attachment, attachment);
    assert.equal(makeEventValue(item, 1, "manual", "times", undefined, undefined, moment, attachment).attachment, attachment);
}
const boundaryAttachment = "data:image/png;base64," + "A".repeat(699976);
assert.equal(boundaryAttachment.length, 699998);
assert.equal(normalizeAttachmentDataUrl(boundaryAttachment), boundaryAttachment);
const validStore = normalizeStore({version: 3, items: [item], events: [{...rawEvent, attachment: validAttachment}], eventTombstones: []});
const imported = parseJsonBackup(JSON.stringify(validStore), normalizeStore).store;
assert.equal(imported.events[0].attachment, validAttachment, "JSON recovery retains valid local photos");
const snapshot = createStoreSnapshotEnvelope(validStore, moment.occurredAt);
assert.equal(normalizeStore(readStoreSnapshot(snapshot).store).events[0].attachment, validAttachment,
    "snapshot recovery uses the same attachment boundary");
const contaminated = {...validStore, events: [{...rawEvent, attachment: rejectedAttachments[18]}]};
assert.equal(parseJsonBackup(JSON.stringify(contaminated), normalizeStore).store.events[0].attachment, undefined,
    "JSON cannot bypass the production image validator");
assert.equal(normalizeStore(readStoreSnapshot({...snapshot, store: contaminated}).store).events[0].attachment, undefined);
const csv = serializeCsv(validStore);
assert.ok(!csv.includes(validAttachment), "ordinary CSV does not carry image data URLs");
assert.ok(parseCheckinCsv(csv).rows.every((row) => !("attachment" in row)), "ordinary CSV imports cannot introduce attachments");

const bindingSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-today.ts"), "utf8");
const bindingFile = ts.createSourceFile("bind-today.ts", bindingSource, ts.ScriptTarget.Latest, true);
let attachmentStatement;
const findAttachmentStatement = (node) => {
    if (ts.isExpressionStatement(node) && node.getText(bindingFile).startsWith('element.querySelector<HTMLInputElement>("[data-attach-file]")')) attachmentStatement = node;
    ts.forEachChild(node, findAttachmentStatement);
};
findAttachmentStatement(bindingFile);
assert.ok(attachmentStatement, "the production FileReader attachment binding must exist");
const compiled = ts.transpileModule(attachmentStatement.getText(bindingFile), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
const wireAttachment = new Function("element", "host", "itemId", "root", "FileReader", "normalizeAttachmentDataUrl", "showMessage", "t", compiled);
setPluginLanguage("en-US");
for (const scenario of ["valid", "invalid", "read-failed", "oversized"]) {
    let listener;
    let reader;
    let marked = false;
    const messages = [];
    const input = {value: "selected-photo", files: [{size: scenario === "oversized" ? 500 * 1024 + 1 : 20}]};
    const button = {classList: {add(name) { assert.equal(name, "has-photo"); marked = true; }}, dataset: {}};
    const element = {querySelector(selector) {
        if (selector === "[data-attach-file]") return {addEventListener(event, callback) { assert.equal(event, "change"); listener = callback; }};
        assert.equal(selector, "[data-attach-button]");
        return button;
    }};
    class ReaderMock {
        constructor() { reader = this; }
        readAsDataURL(file) { assert.equal(file, input.files[0]); }
    }
    const host = {pendingAttachments: new Map(), todayStateForRoot() { return this; }};
    wireAttachment(element, host, item.id, {}, ReaderMock, normalizeAttachmentDataUrl, (message) => messages.push(message), translate);
    listener({currentTarget: input});
    if (scenario === "oversized") {
        assert.equal(reader, undefined);
        assert.deepEqual(messages, [translate("msg.photoTooLarge")]);
    } else if (scenario === "read-failed") {
        reader.onerror();
        assert.deepEqual(messages, [translate("editor.errImageRead")]);
    } else {
        reader.result = scenario === "valid" ? validAttachment : 'data:image/png;base64,AAAA" onerror="alert(1)';
        reader.onload();
        assert.deepEqual(messages, [translate(scenario === "valid" ? "msg.photoAttached" : "editor.errImageRead")]);
    }
    assert.equal(marked, scenario === "valid", "invalid reads cannot show a successful attachment affordance");
    assert.equal(host.pendingAttachments.get(item.id), scenario === "valid" ? validAttachment : undefined);
    if (scenario !== "valid") assert.equal(input.value, "");
}
console.log("Attachment ingestion checks passed: raster MIME/base64/size boundary, facts retained, JSON/snapshot/CSV paths and FileReader validation.");
