const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1596 专注计时跨页生命周期守门：
   - 跨页小条（renderFocusMiniStripFor）：非今日表面显示剩余时间/项目名/回到专注；
   - 会话标记（sessionStorage）：开始即写、结束即清、重载后明确失效提示；
   - tick 同步小条剩余时间。
   面板 DOM 交互（pause/finish/presets）由既有面板绑定承载，不重复。 */

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

/* sessionStorage 桩（node 无此全局；语义：存活于本窗口/进程，重载模拟=同 stub 再读）。 */
const sessionStore = new Map();
globalThis.sessionStorage = {
    getItem: (key) => sessionStore.has(key) ? sessionStore.get(key) : null,
    setItem: (key, value) => { sessionStore.set(key, String(value)); },
    removeItem: (key) => { sessionStore.delete(key); },
};

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

/* CommonJS 语义加载 focus-timer.js：require 桩（i18n/shared/siyuan）+ 真转译 model。 */
function loadFocusTimer(dir) {
    const compiled = ts.transpileModule(read("src", "render", "focus-timer.ts"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const moduleShell = {exports: {}};
    const requireStub = (specifier) => {
        if (specifier === "../i18n") return {t: (key, params) => params ? `${key}:${JSON.stringify(params)}` : key};
        if (specifier === "../shared") return {
            captureActionMoment: () => ({occurredAt: "2026-09-29T12:00:00.000Z", localDate: "2026-09-29"}),
            calendarDateFromKey: (key) => new Date(2026, 8, 29, 12),
            escapeHtml: (value) => String(value),
            renderIconMarkup: () => "",
        };
        if (specifier === "siyuan") return {showMessage: () => undefined};
        if (specifier === "../model") return require(path.join(dir, "src", "model.js"));
        throw new Error("unexpected dependency " + specifier);
    };
    const windowStub = {
        setInterval: () => 1,
        clearInterval: () => undefined,
        setTimeout: () => 1,
        clearTimeout: () => undefined,
        sessionStorage: globalThis.sessionStorage,
    };
    const run = new Function("require", "exports", "module", "window", compiled);
    run(requireStub, moduleShell.exports, moduleShell, windowStub);
    return moduleShell.exports;
}

const storeStub = {
    items: [{id: "f1", name: "深呼吸", icon: "🌿", kind: "number", target: 25, unit: "分钟", schedule: {type: "daily"}, createdAt: "", updatedAt: "", createdDate: "2026-01-01", revisions: []}],
    events: [], eventTombstones: [],
};
const item = storeStub.items[0];

try {
    /* —— 1. 跨页小条：渲染 + 会话标记生命周期 —— */
    check("mini strip renders name, remaining time and back entry; session marker lifecycle", () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-focus-lifecycle-"));
        const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
        for (const filename of ["src/date-keys.ts", "src/record-step.ts", "src/quota.ts", "src/rules.ts", "src/model.ts"]) {
            const target = path.join(dir, filename.replace(/\.ts$/, ".js"));
            fs.mkdirSync(path.dirname(target), {recursive: true});
            fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, filename), "utf8"), {compilerOptions}).outputText);
        }
        const focus = loadFocusTimer(dir);
        const store = JSON.parse(JSON.stringify(storeStub));
        const host = {
            store, disposed: false, disposing: false,
            focusTimerMinutes: 25,
            render: () => undefined,
            revisionFingerprint: () => "fp",
            enqueueMutation: async (op) => op(),
            recordEvent: (it, value, moment) => ({recorded: value}),
        };
        focus.openFocusTimerFor(host, "f1");
        const strip = focus.renderFocusMiniStripFor(host);
        assert.match(strip, /data-focus-mini/, "小条容器在位");
        assert.match(strip, /深呼吸/, "项目名在位");
        assert.match(strip, /data-focus-mini-remaining/, "剩余时间在位");
        assert.match(strip, /data-focus-mini-back/, "回到专注入口在位");
        /* sessionStorage 标记生命周期（stub 全局）。 */
        assert.equal(globalThis.sessionStorage.getItem("lc-focus-session"), "f1", "开始即写会话标记");
        focus.stopFocusTimerFor(host);
        assert.equal(globalThis.sessionStorage.getItem("lc-focus-session"), null, "停止即清标记");
        assert.equal(focus.renderFocusMiniStripFor(host), "", "无会话不渲染小条");
        fs.rmSync(dir, {recursive: true, force: true});
    });

    /* —— 2. 重载后明确失效：标记仍在 → 提示键存在且 index 消费后清除 —— */
    check("reload-lost notice key is bilingual and index consumes then clears the marker", () => {
        const indexSource = read("src", "index.ts");
        assert.match(indexSource, /msg\.focusReloadLost/, "重载失效提示在位");
        assert.match(indexSource, /removeItem\("lc-focus-session"\)/, "提示后清除标记（不重复打扰）");
        assert.match(indexSource, /renderFocusMiniStripFor/, "跨页小条在 renderInto 接线");
        assert.match(indexSource, /data-focus-mini-back/, "小条回到专注绑定在位");
        const focusSource = read("src", "render", "focus-timer.ts");
        assert.match(focusSource, /lc-focus-session/, "会话标记键在位");
        assert.match(focusSource, /data-focus-mini-remaining/, "小条剩余时间同步在位");
        const i18nSource = read("src", "i18n.ts");
        for (const key of ["focus.miniAria", "focus.miniBack", "msg.focusReloadLost"]) {
            const count = i18nSource.split(`"${key}"`).length - 1;
            assert.ok(count >= 2, `${key} 必须中英双语齐备（当前 ${count}）`);
        }
    });

    console.log(`Focus lifecycle: ${checks} checks passed.`);
} finally {
    fs.rmSync(path.join(os.tmpdir(), "siyuan-focus-lifecycle-"), {recursive: true, force: true});
}
