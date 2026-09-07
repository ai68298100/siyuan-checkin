const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "..", "src", "features", "history-filter.ts");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-history-filter-"));
const outputPath = path.join(outputRoot, "history-filter.js");
const output = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
fs.writeFileSync(outputPath, output, "utf8");

const {filterHistoryRecords, HISTORY_SOURCE_LABELS} = require(outputPath);

function event(id, overrides = {}) {
    return {
        id,
        itemId: "reading",
        occurredAt: "2026-09-07T08:00:00.000Z",
        localDate: "2026-09-07",
        value: 20,
        unit: "分钟",
        source: "manual",
        ...overrides,
    };
}

function record(id, overrides = {}, itemName = "晨间阅读") {
    return {event: event(id, overrides), itemName};
}

function deepFreeze(value) {
    if (value && typeof value === "object") {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
    }
    return value;
}

const ids = (records) => records.map(({event: entry}) => entry.id);
let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("search matches item name, note, unit and source with AND terms", () => {
        const records = [
            record("manual", {note: "读完 Chapter ONE"}),
            record("focus", {source: "tomato", note: "整理读书摘录", unit: "minutes"}, "写作"),
            record("import", {source: "import", unit: "页"}, "英语阅读"),
            record("api", {source: "api", note: "SYNCED"}, "饮水"),
        ];

        assert.deepEqual(ids(filterHistoryRecords(records, {query: "  晨间  chapter one  "})), ["manual"]);
        assert.deepEqual(ids(filterHistoryRecords(records, {query: "MINUTES 专注"})), ["focus"]);
        assert.deepEqual(ids(filterHistoryRecords(records, {query: "英语 页 import"})), ["import"]);
        assert.deepEqual(ids(filterHistoryRecords(records, {query: "饮水 外部 synced"})), ["api"]);
        assert.deepEqual(filterHistoryRecords(records, {query: "阅读 写作"}), []);
    });

    check("source filter combines with search and recognizes all localized labels", () => {
        const records = [
            record("manual"),
            record("focus", {source: "tomato"}),
            record("import", {source: "import"}),
            record("api", {source: "api"}),
        ];

        assert.deepEqual(HISTORY_SOURCE_LABELS, {
            manual: "手动记录", tomato: "专注记录", import: "导入记录", api: "外部记录",
        });
        assert.deepEqual(ids(filterHistoryRecords(records, {source: "tomato"})), ["focus"]);
        assert.deepEqual(ids(filterHistoryRecords(records, {query: "手动", source: "manual"})), ["manual"]);
        assert.deepEqual(filterHistoryRecords(records, {query: "手动", source: "api"}), []);
        assert.equal(filterHistoryRecords(records, {source: "all", query: " \t\n"}).length, 4);
    });

    check("time sorting defaults to newest and supports oldest with deterministic ties", () => {
        const records = [
            record("same-b"),
            record("early", {occurredAt: "2026-09-07T06:00:00.000Z"}),
            record("same-a"),
            record("late", {occurredAt: "2026-09-07T10:30:00.000Z"}),
        ];

        assert.deepEqual(ids(filterHistoryRecords(records)), ["late", "same-b", "same-a", "early"]);
        assert.deepEqual(ids(filterHistoryRecords(records, {order: "oldest"})), ["early", "same-a", "same-b", "late"]);
        assert.deepEqual(ids(filterHistoryRecords([...records].reverse())), ["late", "same-b", "same-a", "early"]);
    });

    check("selection returns independent records and does not mutate frozen input or options", () => {
        const records = deepFreeze([
            record("late", {note: "original", occurredAt: "2026-09-07T09:00:00.000Z"}),
            record("early", {occurredAt: "2026-09-07T07:00:00.000Z"}),
        ]);
        const options = Object.freeze({query: "分钟", source: "all", order: "oldest"});
        const before = JSON.stringify(records);
        const result = filterHistoryRecords(records, options);

        assert.notEqual(result, records);
        assert.notEqual(result[0], records[1]);
        assert.notEqual(result[0].event, records[1].event);
        result[0].event.note = "changed";
        result.pop();
        assert.equal(JSON.stringify(records), before);
        assert.deepEqual(filterHistoryRecords([], options), []);
    });

    console.log(`History filter: ${checks} checks passed.`);
} finally {
    fs.rmSync(outputRoot, {recursive: true, force: true});
}
