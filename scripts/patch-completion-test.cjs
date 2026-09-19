const fs = require("fs");
const path = "tests/dock-tomato-completion.test.cjs";
let c = fs.readFileSync(path, "utf8");
const oldRequire = `const localRequire = (id) => {
    if (id === "./integrations") return {DOCK_TOMATO_ADAPTER_ID: "siyuan-plugin-docktomato"};
    if (id === "./types") return {};
    throw new Error(\`Unexpected dependency: \${id}\`);
};`;
const newRequire = `const loadTs = (file, stubs) => {
    const src = fs.readFileSync(file, "utf8");
    const compiledSrc = ts.transpileModule(src, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
    const module = {exports: {}};
    new Function("require", "module", "exports", compiledSrc)((id) => {
        if (stubs[id]) return stubs[id];
        throw new Error(\`Unexpected dependency: \${id}\`);
    }, module, module.exports);
    return module.exports;
};
const localDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
};
const inboxModule = loadTs("src/features/docktomato-inbox.ts", {"./model": {dateKey: localDateKey}});
const localRequire = (id) => {
    if (id === "./integrations") return {DOCK_TOMATO_ADAPTER_ID: "siyuan-plugin-docktomato"};
    if (id === "./types") return {};
    if (id === "./features/docktomato-inbox") return inboxModule;
    throw new Error(\`Unexpected dependency: \${id}\`);
};`;
if (c.split(oldRequire).length !== 2) { console.error("require anchor not found"); process.exit(1); }
c = c.replace(oldRequire, newRequire);
fs.writeFileSync(path, c);
console.log("require updated");
