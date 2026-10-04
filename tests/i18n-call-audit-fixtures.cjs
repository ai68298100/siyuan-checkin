const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const {auditTranslationCalls} = require("./i18n-call-audit.cjs");

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-i18n-calls-"));
try {
    const dictionary = `
        const zhCN = {plain: "纯文本", named: "{name} 与 {name}", numbered: "{n}", escaped: "{na\\u006de}"};
        const enUS = {plain: "Plain", named: "{name} and {name}", numbered: "{n}", escaped: "{name}"};
        export function t(key: string, params?: Record<string, string | number>) { return key; }
    `;
    const fixture = `
        import {t, t as translate} from "./i18n";
        import * as locale from "./i18n";
        import {translate as forwarded} from "./forward";
        declare const selected: boolean;
        declare const dynamicKey: string;
        declare const dynamicParams: Record<string, string>;
        declare const name: string;
        declare const n: number;
        t("named", {name});
        translate("named", {name});
        locale.t("named", {name});
        locale["t"]("named", {name});
        forwarded("named", {name});
        t(("named" as const), ({name} as Record<string, string>));
        t(\`plain\`);
        t("plain", undefined);
        t("escaped", {name});
        t("named", {...{name}});
        t("named", {["name"]: name});
        t(selected ? "named" : "numbered", {name, n});
        t("named");
        t("named", {unexpected: name});
        t("unknown", dynamicParams);
        t(dynamicKey, {name});
        t("named", dynamicParams);
        t("named", {...dynamicParams});
        t("named", {[dynamicKey]: name});
        t("named", {...dynamicParams, unexpected: name});
        (function(t: (key: string) => string) { t("unknown-local"); })((key) => key);
        const unrelated = {t: (key: string) => key};
        unrelated.t("unknown-member");
        const example = 't("unknown-string")';
    `;
    fs.writeFileSync(path.join(fixtureRoot, "i18n.ts"), dictionary);
    fs.writeFileSync(path.join(fixtureRoot, "forward.ts"), 'export {t as translate} from "./i18n";');
    fs.writeFileSync(path.join(fixtureRoot, "calls.ts"), fixture);
    const sourceFiles = ["i18n.ts", "forward.ts", "calls.ts"].map((name) => path.join(fixtureRoot, name));
    const program = ts.createProgram(sourceFiles, {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, strict: true});
    assert.deepEqual(program.getSyntacticDiagnostics(), [], "audit fixtures must be valid TypeScript");
    const result = auditTranslationCalls(program, {root: fixtureRoot, i18nFile: sourceFiles[0], sourceFiles});
    assert.equal(result.statistics.calls, 20, "imports, import aliases, namespaces and re-exports resolve to the production symbol");
    assert.equal(result.statistics.complete, 14, "only fully known key and parameter shapes count as complete");
    assert.equal(result.statistics.boundaries, 6, "dynamic or incomplete calls stay visible");
    assert.equal(result.issues.filter((issue) => issue.code === "missing-params").length, 4,
        "omitted and wrong params leave each locale's required name missing");
    assert.equal(result.issues.filter((issue) => issue.code === "extra-params").length, 8,
        "conditional keys and known extra properties remain checked even with unknown spreads");
    assert.equal(result.issues.filter((issue) => issue.code === "missing-key").length, 2,
        "known keys must exist in both dictionaries even when params are unknown");
    assert.equal(result.issues.length, 14, "every seeded defect must be detected with no failures on valid or unrelated calls");
    assert.ok(result.issues.every((issue) => /^calls\.ts:\d+:\d+$/.test(issue.location)), "diagnostics identify the real call location");
    assert.ok(result.boundaries.some((boundary) => boundary.reasons.includes("dynamic-key")));
    assert.equal(result.boundaries.filter((boundary) => boundary.reasons.includes("unknown-params")).length, 5);
    assert.ok(!result.issues.some((issue) => issue.key.startsWith("unknown-")), "local t shadows, unrelated members and string examples are ignored");
    console.log("i18n call audit fixtures passed: symbol identity, both locales, missing/extra params and explicit boundaries.");
} finally {
    fs.rmSync(fixtureRoot, {recursive: true, force: true});
}
