/* T-1255 导出保存通道守门：原生容器下绝不产生 blob 导航（Android WebView 会把 blob: 当导航，
   表现为「点导出报告，思源直接重启」），必须先写 /assets 再交给宿主原生保存。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const projectRoot = path.join(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");

function loadDownload({bridge, putFileResponse = {code: 0}, saveExportFileAvailable = true, hostSaveResult = undefined}) {
    const output = ts.transpileModule(read("src/download.ts"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
        fileName: "src/download.ts",
    }).outputText;
    const calls = {createObjectURL: 0, putFile: [], nativeSaves: [], hostSaveExportFile: [], messages: [], links: []};
    const posted = [];
    const fetchPost = (url, data, cb, headers, failCb) => {
        posted.push({url, data});
        if (url === "/api/file/putFile") {
            calls.putFile.push({path: data.get("path"), name: data.get("file")?.name, type: data.get("file")?.type});
            queueMicrotask(() => (putFileResponse.code === 0 ? cb : failCb)(putFileResponse));
        }
    };
    const saveExportFile = saveExportFileAvailable ? async (uri) => { calls.hostSaveExportFile.push(uri); return hostSaveResult; } : undefined;
    const window = {JSAndroid: bridge === "android" ? {saveExportFile: (uri) => calls.nativeSaves.push(["android", uri])} : undefined,
        webkit: bridge === "ios" ? {messageHandlers: {saveExportFile: {postMessage: (uri) => calls.nativeSaves.push(["ios", uri])}}} : undefined,
        JSHarmony: bridge === "harmony" ? {saveExportFile: (uri) => calls.nativeSaves.push(["harmony", uri])} : undefined};
    const document = {createElement: () => { const link = {click() { calls.links.push(this.href); }}; return link; }};
    const URL = {createObjectURL: () => { calls.createObjectURL += 1; return "blob:fake"; }, revokeObjectURL: () => {}};
    const module = {exports: {}};
    vm.runInContext(output, vm.createContext({
        module, exports: module.exports,
        require: (specifier) => {
            if (specifier === "siyuan") return {fetchPost, saveExportFile, showMessage: (text, ms, type) => calls.messages.push({text, type})};
            if (specifier === "./i18n") return {t: (key, params) => `${key}:${JSON.stringify(params || {})}`};
            throw new Error(`未预期依赖 ${specifier}`);
        },
        window, document, URL, Blob, File, FormData,
        location: {origin: "http://127.0.0.1:6806"},
        setTimeout, queueMicrotask, Promise, console,
    }), {filename: "src/download.ts"});
    return {exports: module.exports, calls};
}

const file = {fileName: "siyuan-checkin-report-2026-09-19.md", content: "# 报告\n", mime: "text/markdown;charset=utf-8"};

(async () => {
    /* 1. 浏览器/桌面：保持临时 Blob 下载。 */
    const plain = loadDownload({bridge: undefined});
    assert.equal(await plain.exports.saveGeneratedFile(file, 1700000000000), "browser");
    assert.equal(plain.calls.createObjectURL, 1, "无原生桥时应走 Blob 下载");
    assert.deepEqual(plain.calls.putFile, [], "无原生桥时不应写资源目录");

    /* 2. Android：先写 /assets，再交宿主；关键是零 blob。 */
    for (const bridge of ["android", "ios", "harmony"]) {
        const native = loadDownload({bridge});
        assert.equal(await native.exports.saveGeneratedFile(file, 1700000000000), "native", bridge);
        assert.equal(native.calls.createObjectURL, 0, `${bridge} 下绝不允许出现 blob 下载`);
        assert.equal(native.calls.links.length, 0, `${bridge} 下不得触发 <a download> 导航`);
        assert.equal(native.calls.putFile.length, 1, bridge);
        assert.equal(native.calls.putFile[0].path, "/assets/siyuan-checkin-report-2026-09-19-1700000000000.md", bridge);
        assert.equal(native.calls.hostSaveExportFile[0], `http://127.0.0.1:6806/assets/siyuan-checkin-report-2026-09-19-1700000000000.md`, `${bridge} 应把绝对 URL 交给宿主 saveExportFile`);
        assert.match(native.calls.messages[0].text, /^msg\.exportSaved:/, `${bridge} 要告诉用户文件落在资源目录`);
    }

    /* 3. 宿主未导出 saveExportFile 时退回原生桥本身，仍然零 blob。 */
    const legacy = loadDownload({bridge: "android", saveExportFileAvailable: false});
    assert.equal(await legacy.exports.saveGeneratedFile(file, 1700000000001), "native");
    assert.deepEqual(legacy.calls.nativeSaves, [["android", "http://127.0.0.1:6806/assets/siyuan-checkin-report-2026-09-19-1700000000001.md"]]);
    assert.equal(legacy.calls.createObjectURL, 0);

    /* 3b. 宿主保存通道按前端能力拒绝（status:"error"）时必须退回容器原生桥。 */
    const settle = () => new Promise((resolve) => setImmediate(resolve));
    const declined = loadDownload({bridge: "android", hostSaveResult: {status: "error"}});
    assert.equal(await declined.exports.saveGeneratedFile(file, 1700000000003), "native");
    await settle();
    assert.deepEqual(declined.calls.nativeSaves, [["android", "http://127.0.0.1:6806/assets/siyuan-checkin-report-2026-09-19-1700000000003.md"]], "宿主拒绝后要直接调用容器桥");
    assert.equal(declined.calls.createObjectURL, 0);

    /* 3c. 宿主报告成功时不得重复调用容器桥（否则会弹两次保存框）。 */
    const accepted = loadDownload({bridge: "android", hostSaveResult: {status: "success"}});
    assert.equal(await accepted.exports.saveGeneratedFile(file, 1700000000004), "native");
    await settle();
    assert.deepEqual(accepted.calls.nativeSaves, [], "宿主已接管，不应再触发容器桥");

    /* 4. 写盘失败：报错，但绝不退回 blob 导航。 */
    const failed = loadDownload({bridge: "ios", putFileResponse: {code: -1, msg: "permission denied"}});
    assert.equal(await failed.exports.saveGeneratedFile(file, 1700000000002), "failed");
    assert.equal(failed.calls.createObjectURL, 0, "失败也不能退回 blob：那正是崩溃路径");
    assert.equal(failed.calls.messages.at(-1).type, "error");
    assert.match(failed.calls.messages.at(-1).text, /permission denied/);

    /* 5. 资源文件名：扩展名保留、非 ASCII 收敛、路径分隔与穿越必须清掉。 */
    const sanitizer = loadDownload({bridge: undefined}).exports;
    assert.equal(sanitizer.assetPathFor("../../etc/passwd", 1), "/assets/passwd-1");
    assert.equal(sanitizer.assetPathFor("打卡报告 v2.csv", 7), "/assets/v2-7.csv");
    assert.equal(sanitizer.assetPathFor("中文 名称.json", 9), "/assets/export-9.json");
    assert.equal(sanitizer.assetPathFor("a\\..\\..\\b.md", 3), "/assets/b-3.md");
    assert.ok(!sanitizer.assetPathFor("../x/中文.md", 5).includes(".."), "不得留下上级目录片段");

    /* 6. 通道唯一性：plugin-ops 里不得再残留任何直接 Blob 下载。 */
    const opsSource = read("src/plugin-ops.ts");
    assert.equal(opsSource.includes("createObjectURL"), false, "导出站点必须全部改走 saveGeneratedFile");
    assert.equal([...opsSource.matchAll(/saveGeneratedFile\(/g)].length >= 7, true, "七处导出入口都要接新通道");
    assert.match(opsSource, /export function downloadLoopExportFor[\s\S]*?async function saveLoopExportPair[\s\S]*?for \(const file of files\) \{\s*await saveGeneratedFile/, "Loop 两文件必须顺序 await，避免两个原生保存面板叠加");
    const downloadSource = read("src/download.ts");
    assert.match(downloadSource, /host\.JSAndroid\?\.saveExportFile \|\| |if \(host\.JSAndroid\?\.saveExportFile\)/, "原生桥检测要覆盖 Android");
    assert.equal([...downloadSource.matchAll(/nativeExportBridge/g)].length >= 2, true, "检测函数要在模块内被真正使用");

    console.log("Download channel checks passed: browser blob path kept, native containers write /assets then host saveExportFile, zero blob on native and on failure, filename sanitization.");
})();
