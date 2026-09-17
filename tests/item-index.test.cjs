const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-item-index-"));
for (const filename of ["model.ts", "record-step.ts", "quota.ts", "rules.ts", "types.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), output, "utf8");
}

const {getActiveItemById, getItemById, getStoreIndex} = require(path.join(outputRoot, "model.js"));
const makeItem = (index, archived) => ({
    id: `${archived ? "archived" : "active"}-${index}`,
    name: `项目 ${index}`,
    icon: "✓",
    kind: "binary",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [],
    archivePeriods: [],
    archived,
});
const activeItems = Array.from({length: 25}, (_, index) => makeItem(index, false));
const archivedItems = Array.from({length: 25}, (_, index) => makeItem(index, true));
const store = {version: 2, items: [...activeItems, ...archivedItems], events: [], eventTombstones: []};

for (let index = 0; index < 25; index += 1) {
    assert.equal(getItemById(store, activeItems[index].id), activeItems[index], `active lookup ${index + 1}`);
    assert.equal(getActiveItemById(store, activeItems[index].id), activeItems[index], `active projection ${index + 1}`);
    assert.equal(getItemById(store, archivedItems[index].id), archivedItems[index], `archived lookup ${index + 1}`);
    assert.equal(getActiveItemById(store, archivedItems[index].id), undefined, `archived exclusion ${index + 1}`);
}

assert.equal(getItemById(store, "missing"), undefined);
assert.equal(getItemById(store, undefined), undefined);
assert.equal(getActiveItemById(store, "missing"), undefined);
assert.equal(getStoreIndex(store), getStoreIndex(store), "one store snapshot reuses its item index");

const replacementItem = makeItem(99, false);
const replacement = {...store, items: [...store.items, replacementItem]};
assert.notEqual(getStoreIndex(replacement), getStoreIndex(store), "replacement store invalidates the item index");
assert.equal(getItemById(replacement, replacementItem.id), replacementItem);

const duplicate = {...store, items: [activeItems[0], {...archivedItems[0], id: activeItems[0].id}]};
assert.equal(getItemById(duplicate, activeItems[0].id), activeItems[0], "duplicate IDs keep first-item semantics");
assert.equal(getActiveItemById(duplicate, activeItems[0].id), activeItems[0]);

console.log("Item index checks passed: 100 item lookup and active-state assertions plus cache boundaries.");
