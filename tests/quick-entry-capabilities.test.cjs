/* T-1423 · R-A12 快捷入口能力矩阵测试：显示/执行/图标/能力四者独立、未知第三方入口、
   图标 fallback、surface 过滤、恢复配置、确定性排序；外加 index 注册接线与 dist i18n
   契约守门。全部纯函数评估，不触宿主。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-quick-entry-"));
fs.writeFileSync(path.join(dir, "quick-entry-capabilities.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "quick-entry-capabilities.ts"), "utf8"), {compilerOptions}).outputText);
const qe = require(path.join(dir, "quick-entry-capabilities.js"));

const KNOWN_ICONS = ["home", "calendar", "check", "external", "more", "settings"];
const descriptor = (overrides = {}) => ({
    commandId: "entry-1", langKey: "openCheckin", icon: "check", hotkey: undefined,
    surfaces: ["desktop", "mobile"], mobility: "mobile-safe", executor: "quick-dialog",
    globalCallback: true, ...overrides,
});
const runtime = (overrides = {}) => ({availableSurfaces: ["desktop", "mobile"], capabilities: [], hidden: [], ...overrides});

/* —— 1. 基本评估：桌面移动都可用 → 可执行可展示 —— */
{
    const e = qe.evaluateQuickEntry(descriptor(), runtime());
    assert.equal(e.executable, true);
    assert.equal(e.displayable, true);
    assert.equal(e.registrable, true);
    assert.equal(e.surfaceSupported, true);
    assert.equal(e.capabilitiesMet, true);
    assert.equal(e.unverified, false);
}

/* —— 2. 显示/执行分离：用户隐藏只灭展示，执行资格不动 —— */
{
    const e = qe.evaluateQuickEntry(descriptor(), runtime({hidden: ["entry-1"]}));
    assert.equal(e.executable, true, "隐藏不剥夺执行资格");
    assert.equal(e.displayable, false, "隐藏只灭展示");
    assert.equal(e.hiddenByUser, true);
    const restored = qe.filterQuickEntriesForDisplay([descriptor()], runtime({hidden: ["entry-1"]}));
    assert.equal(restored.visible.length, 0);
    assert.equal(restored.hiddenByUser.length, 1);
    assert.equal(qe.restoreQuickEntryVisibility(["entry-1", "entry-2"], "entry-1").join(","), "entry-2", "恢复配置=从隐藏集移除");
}

/* —— 3. 执行能力独立：surface 支持但能力缺失 → 不可执行（而非仅隐藏） —— */
{
    const e = qe.evaluateQuickEntry(descriptor({capabilities: ["custom-tab"]}), runtime());
    assert.equal(e.surfaceSupported, true);
    assert.equal(e.capabilitiesMet, false);
    assert.equal(e.executable, false);
    assert.equal(e.displayable, false);
    const partition = qe.filterQuickEntriesForDisplay([descriptor({capabilities: ["custom-tab"]})], runtime());
    assert.equal(partition.notExecutable.length, 1, "能力缺失进 notExecutable 段，不从注册表删除");
}

/* —— 4. surface 过滤：desktop-only 入口在 mobile 运行时不可注册 —— */
{
    const desktopOnly = descriptor({commandId: "tab", surfaces: ["desktop"], mobility: "desktop-only"});
    assert.equal(qe.evaluateQuickEntry(desktopOnly, runtime({availableSurfaces: ["mobile"]})).registrable, false);
    assert.equal(qe.evaluateQuickEntry(desktopOnly, runtime({availableSurfaces: ["desktop", "tab", "dock"]})).registrable, true);
}

/* —— 5. 未知第三方：unverified 不默认移动安全，但保留可执行入口 —— */
{
    const thirdParty = descriptor({commandId: "third-1", surfaces: ["desktop", "mobile"], mobility: "unverified", icon: "mystery-icon"});
    const e = qe.evaluateQuickEntry(thirdParty, runtime());
    assert.equal(e.unverified, true);
    assert.equal(e.executable, true, "未验证仍保留可执行资格");
    assert.equal(qe.isMobileExecutable(thirdParty), false, "unverified 绝不默认 mobile-safe");
    assert.equal(qe.isMobileExecutable(descriptor({mobility: "desktop-only"})), false);
    assert.equal(qe.isMobileExecutable(descriptor({mobility: "mobile-safe", surfaces: ["desktop"]})), false, "缺 mobile surface 不可移动执行");
    assert.equal(qe.isMobileExecutable(descriptor({mobility: "mobile-safe"})), true);
}

/* —— 6. 图标 fallback：未知图标回落 + 标记未解析，已知图标原样 —— */
{
    assert.deepEqual(qe.resolveQuickEntryIcon("check", KNOWN_ICONS), {name: "check", resolved: true});
    assert.deepEqual(qe.resolveQuickEntryIcon("mystery-icon", KNOWN_ICONS), {name: "more", resolved: false});
    assert.equal(qe.QUICK_ENTRY_FALLBACK_ICON, "more");
}

/* —— 7. 过滤分区确定性：commandId 稳定排序，三段互斥 —— */
{
    const descriptors = [
        descriptor({commandId: "c-hidden", hidden: undefined}),
        descriptor({commandId: "a-visible"}),
        descriptor({commandId: "b-broken", surfaces: ["dock"]}),
    ];
    const r = runtime({hidden: ["c-hidden"]});
    const partition = qe.filterQuickEntriesForDisplay(descriptors, r);
    assert.deepEqual(partition.visible.map((d) => d.commandId), ["a-visible"]);
    assert.deepEqual(partition.hiddenByUser.map((d) => d.commandId), ["c-hidden"]);
    assert.deepEqual(partition.notExecutable.map((d) => d.commandId), ["b-broken"]);
    const again = qe.filterQuickEntriesForDisplay(descriptors, r);
    assert.deepEqual(again, partition, "同一输入两次过滤深度相等");
}

/* —— 8. 本插件描述符契约：langKey 与 dist i18n 键一致、热键在位、移动端运行时只注册 openCheckin —— */
const descriptors = qe.QUICK_ENTRY_DESCRIPTORS;
assert.deepEqual(descriptors.map((d) => d.langKey).sort(), ["openCheckin", "openCheckinTab"]);
assert.equal(descriptors.find((d) => d.commandId === "openCheckin").hotkey, "⌥⇧C");
const mobileRuntime = {availableSurfaces: ["mobile"], capabilities: [], hidden: []};
const mobileRegistrable = descriptors.filter((d) => qe.evaluateQuickEntry(d, mobileRuntime).registrable);
assert.deepEqual(mobileRegistrable.map((d) => d.commandId), ["openCheckin"], "移动端只注册快速窗口入口");
const desktopRuntime = {availableSurfaces: ["desktop", "tab", "dock"], capabilities: [], hidden: []};
const desktopRegistrable = descriptors.filter((d) => qe.evaluateQuickEntry(d, desktopRuntime).registrable);
assert.deepEqual(desktopRegistrable.map((d) => d.commandId), ["openCheckin", "openCheckinTab"], "桌面注册全部入口");

/* —— 9. 接线守门：index 描述符驱动注册 + dist i18n 键契约 —— */
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /QUICK_ENTRY_DESCRIPTORS/, "index 必须消费描述符注册命令");
assert.match(indexSource, /evaluateQuickEntry\(entry, quickEntryRuntime\)\.registrable/, "注册必须经能力评估");
assert.doesNotMatch(indexSource, /QUICK_DIALOG_HOTKEY/, "孤儿热键常量必须随重构移除（值已入描述符）");
const releaseAssets = fs.readFileSync(path.join(root, "tests", "release-assets.test.cjs"), "utf8");
assert.match(releaseAssets, /openCheckin/, "dist i18n 契约键守门必须保持（langKey 不得漂移）");

console.log("quick-entry-capabilities tests passed: 四者独立/未知第三方/fallback/surface 过滤/恢复配置/确定性/接线守门 全部通过");
