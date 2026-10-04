const assert = require("node:assert/strict");
const path = require("node:path");
const ts = require("typescript");

function unwrapExpression(expression) {
    while (expression && (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression)
        || ts.isTypeAssertionExpression(expression) || ts.isSatisfiesExpression(expression)
        || ts.isNonNullExpression(expression))) expression = expression.expression;
    return expression;
}

function literalKeys(expression) {
    const value = unwrapExpression(expression);
    if (!value) return undefined;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return [value.text];
    if (ts.isConditionalExpression(value)) {
        const whenTrue = literalKeys(value.whenTrue);
        const whenFalse = literalKeys(value.whenFalse);
        if (whenTrue && whenFalse) return [...new Set([...whenTrue, ...whenFalse])];
    }
    return undefined;
}

function propertyName(property) {
    if (!property.name) return undefined;
    if (ts.isComputedPropertyName(property.name)) {
        const names = literalKeys(property.name.expression);
        return names?.length === 1 ? names[0] : undefined;
    }
    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        || ts.isNumericLiteral(property.name)) return property.name.text;
    return undefined;
}

function parameterNames(expression, checker) {
    const value = unwrapExpression(expression);
    if (!value) return {names: [], complete: true};
    if (ts.isIdentifier(value) && value.text === "undefined") {
        const symbol = checker.getSymbolAtLocation(value);
        if (!symbol?.declarations?.length) return {names: [], complete: true};
    }
    if (!ts.isObjectLiteralExpression(value)) return {names: [], complete: false};
    const names = new Set();
    let complete = true;
    for (const property of value.properties) {
        if (ts.isSpreadAssignment(property)) {
            const spread = parameterNames(property.expression, checker);
            spread.names.forEach((name) => names.add(name));
            complete = complete && spread.complete;
        } else {
            const name = propertyName(property);
            if (name === undefined) complete = false;
            else names.add(name);
        }
    }
    return {names: [...names].sort(), complete};
}

function readDictionaries(sourceFile) {
    const dictionaries = new Map();
    const visit = (node) => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
            && ["zhCN", "enUS"].includes(node.name.text)) {
            const initializer = unwrapExpression(node.initializer);
            assert.ok(initializer && ts.isObjectLiteralExpression(initializer), `${node.name.text} must be a literal dictionary`);
            const dictionary = new Map();
            for (const property of initializer.properties) {
                const key = propertyName(property);
                const value = ts.isPropertyAssignment(property) ? unwrapExpression(property.initializer) : undefined;
                assert.ok(key !== undefined && value && (ts.isStringLiteral(value)
                    || ts.isNoSubstitutionTemplateLiteral(value)), `${node.name.text} entries must have static names and text`);
                assert.ok(!dictionary.has(key), `${node.name.text} has duplicate key ${key}`);
                dictionary.set(key, value.text);
            }
            dictionaries.set(node.name.text, dictionary);
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    assert.equal(dictionaries.size, 2, "both translation dictionaries must be audited");
    return dictionaries;
}

function auditTranslationCalls(program, options) {
    const i18nFile = path.resolve(options.i18nFile);
    const root = path.resolve(options.root);
    const sourceFiles = new Set(options.sourceFiles.map((filename) => path.resolve(filename)));
    const checker = program.getTypeChecker();
    const i18nSource = program.getSourceFile(i18nFile);
    assert.ok(i18nSource, "the production i18n module must be loaded");
    const moduleSymbol = checker.getSymbolAtLocation(i18nSource);
    assert.ok(moduleSymbol, "the i18n module must have a module symbol");
    const translationSymbol = checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === "t");
    assert.ok(translationSymbol, "the i18n module must export t");
    const dictionaries = readDictionaries(i18nSource);
    const calls = [];
    const issues = [];
    const boundaries = [];
    for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFiles.has(path.resolve(sourceFile.fileName)) || sourceFile.isDeclarationFile) continue;
        const visit = (node) => {
            if (ts.isCallExpression(node)) {
                const callee = unwrapExpression(node.expression);
                const lookup = callee && ts.isElementAccessExpression(callee) ? callee.argumentExpression : callee;
                let symbol = lookup && checker.getSymbolAtLocation(lookup);
                if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) symbol = checker.getAliasedSymbol(symbol);
                if (symbol === translationSymbol) {
                    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    const location = `${path.relative(root, sourceFile.fileName).replace(/\\/g, "/")}:${position.line + 1}:${position.character + 1}`;
                    const keys = literalKeys(node.arguments[0]);
                    const params = parameterNames(node.arguments[1], checker);
                    const call = {location, keys, params: params.names, complete: Boolean(keys && params.complete)};
                    calls.push(call);
                    const reasons = [];
                    if (!keys) reasons.push("dynamic-key");
                    if (!params.complete) reasons.push("unknown-params");
                    if (reasons.length) boundaries.push({...call, reasons, expression: node.getText(sourceFile)});
                    for (const key of keys || []) {
                        for (const [locale, dictionary] of dictionaries) {
                            if (!dictionary.has(key)) {
                                issues.push({location, key, locale, code: "missing-key", names: []});
                                continue;
                            }
                            const expected = new Set([...dictionary.get(key).matchAll(/\{(\w+)\}/g)].map((match) => match[1]));
                            if (params.complete) {
                                const missing = [...expected].filter((name) => !params.names.includes(name)).sort();
                                if (missing.length) issues.push({location, key, locale, code: "missing-params", names: missing});
                            }
                            const extra = params.names.filter((name) => !expected.has(name));
                            if (extra.length) issues.push({location, key, locale, code: "extra-params", names: extra});
                        }
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    calls.sort((first, second) => first.location.localeCompare(second.location));
    issues.sort((first, second) => first.location.localeCompare(second.location) || first.locale.localeCompare(second.locale));
    boundaries.sort((first, second) => first.location.localeCompare(second.location));
    return {
        statistics: {
            calls: calls.length,
            complete: calls.filter((call) => call.complete).length,
            boundaries: boundaries.length,
            dictionaries: Object.fromEntries([...dictionaries].map(([locale, dictionary]) => [locale, dictionary.size])),
        },
        calls,
        issues,
        boundaries,
    };
}

function auditProject(root) {
    const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
    assert.ok(configPath, "a TypeScript project config is required");
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    assert.equal(config.error, undefined, "the project config must be readable");
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
    assert.deepEqual(parsed.errors, [], "the project config must parse");
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    return auditTranslationCalls(program, {root, i18nFile: path.join(root, "src", "i18n.ts"), sourceFiles: parsed.fileNames});
}

module.exports = {auditProject, auditTranslationCalls};

if (require.main === module) {
    const result = auditProject(path.join(__dirname, ".."));
    const boundaryReasons = {};
    result.boundaries.forEach((boundary) => boundary.reasons.forEach((reason) => {
        boundaryReasons[reason] = (boundaryReasons[reason] || 0) + 1;
    }));
    console.log(JSON.stringify(process.argv.includes("--json") ? result
        : {statistics: result.statistics, issues: result.issues, boundaryReasons}, null, 2));
    process.exitCode = result.issues.length ? 1 : 0;
}
