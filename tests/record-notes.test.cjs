const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "features", "record-notes.ts"), "utf8");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-record-notes-"));
const output = ts.transpileModule(source, {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
const outputFile = path.join(outputRoot, "record-notes.js");
fs.writeFileSync(outputFile, output, "utf8");
const {extractSiyuanBlockLinks, extractSiyuanBlockLinkSpans, parseSiyuanBlockUrl} = require(outputFile);

const idA = "20260906123456-abcdefg";
const idB = "20260906123457-hijklmn";
const idC = "20260906123458-1234567";
const url = (id) => `siyuan://blocks/${id}`;
let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("extracts canonical URLs, Markdown labels and native static/dynamic references", () => {
        const note = [
            `before ${url(idA)}`,
            `[静态标题](${url(idB)})`,
            `(( ${idC} ))`,
            `((${'20260906123459-7654321'} "静态 \\\"标题\\\""))`,
            `((${'20260906123460-7654321'} '动态标题'))`,
        ].join("\n");
        assert.deepEqual(extractSiyuanBlockLinks(note), [
            {blockId: idA, url: url(idA), label: idA},
            {blockId: idB, url: url(idB), label: "静态标题"},
            {blockId: idC, url: url(idC), label: idC},
            {blockId: "20260906123459-7654321", url: url("20260906123459-7654321"), label: "静态 \"标题\""},
            {blockId: "20260906123460-7654321", url: url("20260906123460-7654321"), label: "动态标题"},
        ]);
    });

    check("deduplicates by block ID while retaining the first occurrence and ordering", () => {
        const note = [
            `(( ${idB} "first"))`,
            `[second](${url(idA)})`,
            `${url(idB)}`,
            `(( ${idA} 'third'))`,
            `(( ${idC} ))`,
        ].join("\n");
        assert.deepEqual(extractSiyuanBlockLinks(note), [
            {blockId: idB, url: url(idB), label: "first"},
            {blockId: idA, url: url(idA), label: "second"},
            {blockId: idC, url: url(idC), label: idC},
        ]);
    });

    check("rejects invalid node IDs, hosts, paths, queries, fragments, credentials and encoded values", () => {
        const invalid = [
            "2026090612345-abcdefg", "20260906123456-Abcdefg", "20260906123456-abcdef", "20260906123456-abcdefg0",
            "20260906123456-abcdefg/child", "20260906123456-abcdefg%2Fchild", "20260906123456-abcdefg?x=1",
        ];
        const urls = [
            "siyuan:/blocks/20260906123456-abcdefg",
            "siyuan://block/20260906123456-abcdefg",
            "siyuan://blocks.evil/20260906123456-abcdefg",
            "siyuan://blocks@evil/20260906123456-abcdefg",
            `siyuan://blocks/${idA}/child`, `siyuan://blocks/${idA}?run=script`, `siyuan://blocks/${idA}#hash`,
            `siyuan://blocks/${idA}%2Fextra`, ...invalid.map((id) => `siyuan://blocks/${id}`),
        ];
        const note = urls.concat(invalid.map((id) => `((${id}))`)).join(" ");
        assert.deepEqual(extractSiyuanBlockLinks(note), []);
        assert.deepEqual(extractSiyuanBlockLinks(`plain ${idA} and https://blocks/${idA}`), []);
    });

    check("does not treat script-looking labels as executable content and preserves note text", () => {
        const label = `<img src=x onerror=alert(1)> & \"quoted\"`;
        const note = `[${label}](${url(idA)})`;
        const result = extractSiyuanBlockLinks(note);
        assert.equal(result.length, 1);
        assert.equal(result[0].label, label);
        assert.equal(result[0].url, url(idA));
    });

    check("honors escapes and does not borrow labels from malformed Markdown", () => {
        const note = [
            `\\${url(idA)}`,
            `\\(( ${idB} "escaped"))`,
            `[old] text (${url(idB)})`,
            `[broken](${url(idC)}`,
            `prefixsiyuan://blocks/${idC}`,
            `[safe\\] label](${url(idC)})`,
        ].join("\n");
        assert.deepEqual(extractSiyuanBlockLinks(note), [
            {blockId: idB, url: url(idB), label: idB},
            {blockId: idC, url: url(idC), label: "safe] label"},
        ]);
    });

    check("supports multiline notes and escaped quote characters in anchors", () => {
        const note = `第一行\n((${'20260906123461-abcdef0'} "line one\nline two"))\n[多行\n标题](${url(idA)})\n((${'20260906123462-abcdef0'} 'it\\'s ok'))`;
        assert.deepEqual(extractSiyuanBlockLinks(note), [
            {blockId: "20260906123461-abcdef0", url: url("20260906123461-abcdef0"), label: "line one\nline two"},
            {blockId: idA, url: url(idA), label: "多行\n标题"},
            {blockId: "20260906123462-abcdef0", url: url("20260906123462-abcdef0"), label: "it's ok"},
        ]);
    });

    check("handles a large note without throwing or losing a valid reference", () => {
        const note = `${"x".repeat(1024 * 1024)}\n(( ${idC} "末尾"))`;
        assert.deepEqual(extractSiyuanBlockLinks(note), [{blockId: idC, url: url(idC), label: "末尾"}]);
    });

    check("returns a fresh result for empty and repeated calls", () => {
        const first = extractSiyuanBlockLinks(`(${idA})`);
        const second = extractSiyuanBlockLinks(`(${idA})`);
        assert.deepEqual(first, []);
        assert.notEqual(first, second);
        assert.deepEqual(extractSiyuanBlockLinks(""), []);
    });

    check("never mutates the caller's note string or returned object through later calls", () => {
        const note = `(( ${idA} "keep"))`;
        const first = extractSiyuanBlockLinks(note);
        first[0].label = "changed";
        const second = extractSiyuanBlockLinks(note);
        assert.equal(note, `(( ${idA} "keep"))`);
        assert.deepEqual(second, [{blockId: idA, url: url(idA), label: "keep"}]);
    });

    check("returns exact non-overlapping source spans while retaining every occurrence", () => {
        const fragments = [`[safe\\] label](${url(idA)})`, `(( ${idB} "two\\\" lines\nnext"))`, url(idA), `((${idC} 'dynamic'))`];
        const note = `before ${fragments.join(" and ")} after`;
        const spans = extractSiyuanBlockLinkSpans(note);
        assert.equal(spans.length, 4);
        assert.deepEqual(spans.map((span) => note.slice(span.start, span.end)), fragments);
        assert.deepEqual(spans.map((span) => span.label), ["safe] label", "two\" lines\nnext", idA, "dynamic"]);
        assert.equal(extractSiyuanBlockLinks(note).length, 3);
        assert.deepEqual(extractSiyuanBlockLinkSpans(`[${url(idB)}](${url(idA)})`).map((span) => span.blockId), [idA]);
        assert.deepEqual(extractSiyuanBlockLinkSpans(`((${idB} "${url(idA)}"))`).map((span) => span.blockId), [idB]);
    });

    check("does not link HTML attributes and validates URLs again at navigation time", () => {
        assert.deepEqual(extractSiyuanBlockLinks(`<a href="${url(idA)}">html</a> <a href='${url(idB)}'>html</a> <a href=${url(idC)}>html</a>`), []);
        assert.equal(parseSiyuanBlockUrl(url(idA)), idA);
        for (const invalid of [`${url(idA)}?x=1`, `${url(idA)}suffix`, ` ${url(idA)}`, `https://example.com/${url(idA)}`, "javascript:alert(1)"]) {
            assert.equal(parseSiyuanBlockUrl(invalid), undefined);
        }
    });

    check("rejects references nested in HTML attributes or other URL tokens", () => {
        const note = `<a href="https://example.org/(${url(idA)})">x</a>\n<span onclick="show(${url(idA)})">x</span>\nhttps://example.org/path/(${url(idA)})\n<!-- ${url(idA)} -->\n<span data-ref='((${idA} "title"))'>text</span>`;
        assert.deepEqual(extractSiyuanBlockLinkSpans(note), []);
    });

    check("keeps punctuation outside links and source offsets correct after Unicode text", () => {
        const note = `中文前缀 ✓ ${url(idA)}。\n第二条 ${url(idB)}, 下一项`;
        const spans = extractSiyuanBlockLinkSpans(note);
        assert.deepEqual(spans.map((span) => note.slice(span.start, span.end)), [url(idA), url(idB)]);
        assert.equal(note[spans[0].end], "。");
        assert.equal(note[spans[1].end], ",");
        assert.deepEqual(extractSiyuanBlockLinks(`${url(idA)}/child. ${url(idB)}?query=x, ${url(idC)}#hash。`), []);
    });

    console.log(`Record notes: ${checks} checks passed.`);
} finally {
    fs.rmSync(outputRoot, {recursive: true, force: true});
}
