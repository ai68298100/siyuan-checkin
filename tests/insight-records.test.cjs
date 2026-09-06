const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-insight-records-"));
for (const filename of ["export.ts", "features/insight-records.ts"]) {
    const output = ts.transpileModule(fs.readFileSync(path.join(sourceRoot, filename), "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const {selectInsightRecords, serializeInsightRecordsCsv} = require(path.join(outputRoot, "features", "insight-records.js"));
const {serializeCsv} = require(path.join(outputRoot, "export.js"));

function item(overrides = {}) {
    return {
        id: "reading", name: "Reading", icon: "book", kind: "duration", target: 20,
        unit: "minutes", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01",
        revisions: [], archivePeriods: [], ...overrides,
    };
}

function event(id, overrides = {}) {
    return {
        id, itemId: "reading", occurredAt: "2026-09-06T04:00:00.000Z",
        localDate: "2026-09-06", value: 20, unit: "minutes", source: "manual", ...overrides,
    };
}

function deepFreeze(value) {
    if (value && typeof value === "object") {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
    }
    return value;
}

const ids = (records) => records.map((record) => record.id);
const header = "\uFEFFeventId,itemId,itemName,occurredAt,localDate,value,unit,source,note,externalRef";
let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("query terms match across note, unit, value, date and source without case sensitivity", () => {
        const records = [
            event("a", {note: "Read CHAPTER one", value: 47, source: "tomato"}),
            event("b", {note: "Read chapter two", value: 10, source: "tomato"}),
            event("c", {note: "Read chapter one", source: "manual"}),
        ];
        assert.deepEqual(ids(selectInsightRecords(records, {query: "  chapter\tMINUTES 47\n2026-09 专注  "})), ["a"]);
        assert.deepEqual(ids(selectInsightRecords(records, {query: "read TOMATO"})), ["b", "a"]);
        assert.deepEqual(selectInsightRecords(records, {query: "one two"}), []);
    });

    check("source selection is combined with text search and all Chinese labels are searchable", () => {
        const records = [event("a"), event("b", {source: "tomato"}), event("c", {source: "import"}), event("d", {source: "api"})];
        for (const [query, id] of [["手动", "a"], ["专注", "b"], ["导入", "c"], ["外部", "d"]]) {
            assert.deepEqual(ids(selectInsightRecords(records, {query, source: "all"})), [id]);
        }
        assert.deepEqual(selectInsightRecords(records, {query: "手动", source: "api"}), []);
        assert.deepEqual(ids(selectInsightRecords(records, {source: "api"})), ["d"]);
        assert.equal(selectInsightRecords(records, {query: " \t\n", source: "all"}).length, 4);
    });

    check("sorting respects recorded local date first, then timestamp and a deterministic id tie break", () => {
        const records = [
            event("b"), event("older", {localDate: "2026-09-05", occurredAt: "2026-09-07T01:00:00.000Z"}),
            event("a"), event("later", {occurredAt: "2026-09-06T05:00:00.000Z"}),
        ];
        assert.deepEqual(ids(selectInsightRecords(records)), ["later", "b", "a", "older"]);
        assert.deepEqual(ids(selectInsightRecords(records, {order: "oldest"})), ["older", "a", "b", "later"]);
        assert.deepEqual(ids(selectInsightRecords([...records].reverse())), ["later", "b", "a", "older"]);
        const duplicates = [event("same", {note: "first"}), event("same", {note: "second"})];
        assert.deepEqual(selectInsightRecords(duplicates).map((record) => record.note), ["first", "second"]);
    });

    check("selection returns independent records and leaves frozen inputs and options untouched", () => {
        const records = deepFreeze([event("b", {note: "original"}), event("a")]);
        const options = Object.freeze({query: "minutes", order: "oldest"});
        const before = JSON.stringify(records);
        const selected = selectInsightRecords(records, options);
        assert.notEqual(selected, records);
        selected[0].note = "changed";
        selected[1].value = 100;
        selected.pop();
        assert.equal(JSON.stringify(records), before);
        assert.deepEqual(selectInsightRecords([], options), []);
    });

    check("CSV preserves existing columns, BOM, Unicode, quotes and multiline text", () => {
        const habit = item({name: "阅读,成长"});
        const records = [event("a", {note: "第一行\r\n第二行 \"quoted\"", unit: "分钟", externalRef: "session,1"})];
        const result = serializeInsightRecordsCsv(habit, records);
        assert.equal(result, serializeCsv({version: 2, items: [habit], events: records, eventTombstones: []}));
        assert.equal(result, `${header}\na,reading,"阅读,成长",2026-09-06T04:00:00.000Z,2026-09-06,20,分钟,manual,"第一行\r\n第二行 ""quoted""","session,1"`);
        assert.equal(serializeInsightRecordsCsv(habit, []), header);
    });

    check("CSV neutralizes formula prefixes and leading controls without changing numeric values", () => {
        for (const prefix of ["=", "+", "-", "@", "\t", "\r", "\n", "\u0000", "\u001b", "\u007f", "\u0085", "  =", "\u00a0@", "\uFEFF+"]) {
            const text = `${prefix}SUM(1)`;
            const result = serializeInsightRecordsCsv(item(), [event("a", {note: text, value: -2.5})]);
            const safeText = `'${text}`;
            const expectedCell = /[",\n\r]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
            assert.equal(result, `${header}\na,reading,Reading,2026-09-06T04:00:00.000Z,2026-09-06,-2.5,minutes,manual,${expectedCell},`);
        }
    });

    check("CSV sanitizes identifiers, names, dates, units and external references while retaining item lookup", () => {
        const habit = item({id: "=item", name: "@name"});
        const records = [event("+event", {
            itemId: "=item", occurredAt: "=date", localDate: "+day", unit: "-units", note: "'already escaped", externalRef: "@remote",
        })];
        const result = serializeInsightRecordsCsv(habit, records);
        assert.equal(result, `${header}\n'+event,'=item,'@name,'=date,'+day,20,'-units,manual,'already escaped,'@remote`);
    });

    check("CSV exports every supplied result in order with zero values and never mutates source data", () => {
        const habit = deepFreeze(item({name: "=Reading"}));
        const records = deepFreeze(Array.from({length: 205}, (_, index) => event(`row-${index}`, {value: 0, note: index ? "note" : "=first"})));
        const before = JSON.stringify({habit, records});
        const result = serializeInsightRecordsCsv(habit, records);
        const rows = result.split("\n");
        assert.equal(rows.length, 206);
        assert.match(rows[1], /^row-0,reading,'=Reading,/);
        assert.match(rows.at(-1), /^row-204,reading,'=Reading,/);
        assert.ok(rows[1].endsWith(",0,minutes,manual,'=first,"));
        assert.equal(JSON.stringify({habit, records}), before);
    });

    console.log(`Insight records: ${checks} checks passed.`);
} finally {
    fs.rmSync(outputRoot, {recursive: true, force: true});
}
