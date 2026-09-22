/* Real canvas, pointer and modal behavior, compiled from current source without building a package. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const sass = require("sass");
const {chromium} = require("playwright");
const root = path.resolve(__dirname, "..");
const compile = name => ts.transpileModule(fs.readFileSync(path.join(root, name), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
const css = [...fs.readFileSync(path.join(root, "src/index.ts"), "utf8").matchAll(/import "(.+\.scss)";/g)]
    .map(match => sass.compile(path.join(root, "src", match[1]), {logger: sass.Logger.silent}).css).join("\n");
const outputRoot = path.join(root, ".artifacts", "avatar-editor");
fs.mkdirSync(outputRoot, {recursive: true});

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    try {
        const page = await browser.newPage({viewport: {width: 1000, height: 800}});
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.setContent('<main class="lc-checkin" data-appearance="light"><button id="opener">Upload</button></main>');
        await page.addStyleTag({content: css});
        await page.addScriptTag({content: `window.__modules = {}; (() => {const exports = {}; ${compile("src/i18n.ts")} window.__modules.i18n = exports;})(); (() => {const exports = {}; const require = name => name === '../i18n' ? window.__modules.i18n : {}; ${compile("src/render/avatar-editor.ts")} window.__editor = exports;})(); (() => {const exports = {}; const require = () => ({validateAnchorBlockId: () => undefined}); ${compile("src/features/summary-resident.ts")} window.__modules.summaryResident = exports;})(); (() => {const exports = {}; const require = () => ({validateAnchorBlockId: () => undefined}); ${compile("src/features/health-inbox.ts")} window.__modules.healthInbox = exports;})(); (() => {const exports = {}; const require = name => name === './features/summary-resident' ? window.__modules.summaryResident : name === './features/health-inbox' ? window.__modules.healthInbox : {validateAnchorBlockId: () => undefined}; ${compile("src/view-preferences.ts")} window.__preferences = exports;})();`});
        await page.evaluate(() => {
            window.__saved = [];
            window.__failSave = false;
            const picture = document.createElement("canvas");
            picture.width = 800; picture.height = 400;
            const context = picture.getContext("2d");
            context.fillStyle = "red"; context.fillRect(0, 0, 400, 400);
            context.fillStyle = "blue"; context.fillRect(400, 0, 400, 400);
            window.__source = picture.toDataURL("image/png");
            window.__open = async (kind = "file") => {
                document.querySelector("#opener").focus();
                const blob = await (await fetch(window.__source)).blob();
                const source = kind === "file" ? new File([blob], "photo.png", {type: "image/png"})
                    : kind === "oversize" ? new File([new Uint8Array(10 * 1024 * 1024 + 1)], "photo.png", {type: "image/png"})
                    : kind === "broken" ? new File(["invalid"], "photo.png", {type: "image/png"})
                    : window.__preferences.normalizeViewPreferences({avatarImage: window.__saved.at(-1)}).avatarImage;
                window.__close = window.__editor.openAvatarEditor(source, document.querySelector("main"), async value => {
                    if (window.__failSave) throw new Error("disk-full");
                    window.__saved.push(value);
                });
            };
        });
        const open = async (kind = "file") => {
            await page.evaluate(kind => window.__open(kind), kind);
            if (!["broken", "oversize"].includes(kind)) await page.waitForFunction(() => !document.querySelector("[data-avatar-save]").disabled);
        };
        const cropData = () => page.locator("[data-avatar-crop]").evaluate(canvas => canvas.toDataURL());
        await open();
        const initial = await cropData();
        await page.locator("[data-avatar-crop]").press("ArrowRight");
        assert.notEqual(await cropData(), initial, "keyboard changes the actual crop pixels");
        await page.locator("[data-avatar-reset]").click();
        assert.equal(await cropData(), initial, "reset restores the original crop");
        await page.locator("[data-avatar-zoom]").fill("2");
        assert.equal(await page.locator("[data-avatar-zoom-value]").textContent(), "200%");
        const cropBox = await page.locator("[data-avatar-crop]").boundingBox();
        await page.mouse.move(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(cropBox.x + cropBox.width * 1.5, cropBox.y + cropBox.height / 2);
        await page.mouse.up();
        const pixel = await page.locator("[data-avatar-crop]").evaluate(canvas => Array.from(canvas.getContext("2d").getImageData(128, 128, 1, 1).data));
        assert.deepEqual(pixel, [255, 0, 0, 255], "dragging changes the selected region to the red half of the source");
        await page.locator("[data-avatar-save]").click();
        await page.waitForFunction(() => !document.querySelector("dialog"));
        assert.equal(await page.evaluate(() => window.__saved.length), 1);
        const encodedImage = await page.evaluate(async () => {
            const saved = window.__saved[0];
            const image = await createImageBitmap(await (await fetch(saved)).blob());
            const dimensions = {width: image.width, height: image.height, bytes: saved.length};
            image.close();
            return dimensions;
        });
        assert.equal(encodedImage.width, 256, "saved image is downsampled to a small avatar");
        assert.equal(encodedImage.height, 256);
        assert.ok(encodedImage.bytes < 1_000_000, "the full encoded PNG fits the persistence limit");
        await open("saved");
        assert.deepEqual(await page.locator("[data-avatar-crop]").evaluate(canvas => Array.from(canvas.getContext("2d").getImageData(128, 128, 1, 1).data)), pixel, "persisted crop survives normalization and re-editing");
        assert.equal(await page.evaluate(() => document.querySelector("[data-avatar-crop]").width), 256);
        await page.keyboard.press("Escape");
        assert.equal(await page.evaluate(() => window.__saved.length), 1, "canceling never saves");
        assert.equal(await page.evaluate(() => document.activeElement.id), "opener", "focus returns to upload control");

        await open();
        await page.evaluate(() => {window.__failSave = true;});
        await page.locator("[data-avatar-save]").click();
        await page.waitForFunction(() => document.querySelector("[data-avatar-status]").textContent.includes("未能保存"));
        assert.equal(await page.evaluate(() => window.__saved.length), 1, "failed save keeps the existing avatar");
        await page.evaluate(() => {window.__failSave = false;});
        await page.locator("[data-avatar-save]").click();
        await page.waitForFunction(() => !document.querySelector("dialog"));
        assert.equal(await page.evaluate(() => window.__saved.length), 2, "a failed save can be retried");
        for (const kind of ["oversize", "broken"]) {
            await open(kind);
            await page.waitForFunction(() => /10 MB|无法读取/.test(document.querySelector("[data-avatar-status]").textContent));
            assert.equal(await page.locator("[data-avatar-save]").isDisabled(), true);
            await page.locator("[data-avatar-cancel]").click();
            assert.equal(await page.evaluate(() => window.__saved.length), 2, "invalid uploads do not replace the avatar");
        }
        for (const locale of ["zh-CN", "en-US"]) for (const theme of ["light", "dark"]) for (const width of [1000, 320, 280]) {
            await page.setViewportSize({width, height: 760});
            await page.evaluate(({locale, theme}) => {window.__modules.i18n.setPluginLanguage(locale); document.querySelector("main").dataset.appearance = theme;}, {locale, theme});
            await open();
            const layout = await page.locator("dialog").evaluate(dialog => ({width: dialog.getBoundingClientRect().width, overflow: dialog.scrollWidth - dialog.clientWidth, height: dialog.getBoundingClientRect().height, bottomSpace: dialog.getBoundingClientRect().bottom - dialog.querySelector(".lc-checkin__avatar-editor-actions").getBoundingClientRect().bottom}));
            assert.ok(layout.width <= width && layout.overflow <= 1 && layout.height <= 760, `${locale} ${theme} ${width}: modal fits the viewport`);
            assert.ok(layout.bottomSpace <= 24, `${locale} ${theme} ${width}: modal height follows content, not the full viewport: ${JSON.stringify(layout)}`);
            await page.screenshot({path: path.join(outputRoot, `${locale}-${theme}-${width}.png`)});
            await page.locator("[data-avatar-cancel]").click();
        }
        await page.setViewportSize({width: 640, height: 320});
        await open();
        const shortViewport = await page.locator("dialog").evaluate(dialog => {
            const crop = dialog.querySelector("[data-avatar-crop]").getBoundingClientRect();
            return {height: dialog.getBoundingClientRect().height, squareError: Math.abs(crop.width - crop.height), canScroll: dialog.scrollHeight > dialog.clientHeight};
        });
        assert.ok(shortViewport.height <= 320 && shortViewport.squareError <= 1 && shortViewport.canScroll, "short windows scroll the dialog without distorting the square preview");
        await page.locator("[data-avatar-cancel]").click();
        await open();
        await page.evaluate(() => window.__close());
        assert.equal(await page.locator("dialog").count(), 0, "plugin cleanup closes the editor");
        assert.deepEqual(errors, []);
        const indexSource = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");
        const avatarStorageMethods = indexSource.slice(indexSource.indexOf("    private async saveAvatarImage("), indexSource.indexOf("    private async persistAuditBestEffort("));
        const storageCode = ts.transpileModule(`class AvatarStorage { ${avatarStorageMethods} }`, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText;
        await page.addScriptTag({content: `(() => {const VIEW_PREFERENCES_NAME = 'checkin-view-preferences'; const showMessage = () => {}; const t = key => key; ${storageCode} window.__AvatarStorage = AvatarStorage;})();`});
        const storage = await page.evaluate(async () => {
            const host = new window.__AvatarStorage();
            Object.assign(host, {storageReady: true, disposed: false, disposing: false, avatarImage: "previous-image", collapsedTodayGroups: new Set(), reviewFoldSections: new Set(), recentTemplates: [], saveQueue: Promise.resolve(), render() {this.renders = (this.renders || 0) + 1;}, async saveData() {throw new Error("disk-full");}});
            let failed = false;
            try {await host.saveAvatarImage(window.__saved[0]);} catch {failed = true;}
            const failedValue = host.avatarImage;
            const failedRenders = host.renders || 0;
            host.saveData = async (name, preferences) => {host.persisted = preferences;};
            await host.saveAvatarImage(window.__saved[0]);
            const savedIntact = host.persisted.avatarImage === window.__saved[0] && host.avatarImage === window.__saved[0];
            await host.saveAvatarImage(undefined);
            return {failed, failedValue, failedRenders, savedIntact, clearPersisted: host.persisted.avatarImage === undefined && host.avatarImage === undefined};
        });
        assert.deepEqual(storage, {failed: true, failedValue: "previous-image", failedRenders: 0, savedIntact: true, clearPersisted: true}, "real plugin storage methods commit avatar state only after the write succeeds");
        console.log("Avatar editor browser checks passed: canvas crop, zoom, drag, keyboard, reset, save/reload, cancel, retry, invalid/oversize images, cleanup and 12 locale/theme/width scenes.");
    } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
