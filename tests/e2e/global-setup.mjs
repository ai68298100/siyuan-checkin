/* E2E 全局前置（T-1244）：准备独立工作区 → 装入 dist → 起内核 → 等就绪 → 落盘 target.json；
   返回的清理函数负责关内核并把内核日志与错误摘要写到 .artifacts/e2e/。 */
import fs from "node:fs";
import path from "node:path";
import {
    e2eConfig,
    assertPortAvailable,
    configureAccessToken,
    enablePlugin,
    installPlugin,
    kernelErrorLines,
    PLUGIN_NAME,
    prepareWorkspace,
    resolveInstall,
    SiyuanClient,
    startKernel,
    stopKernel,
} from "../../scripts/e2e/lib.mjs";
import {prepareScratch} from "../../scripts/lib/smoke-kernel.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const artifactDir = path.join(repoRoot, ".artifacts", "e2e");
export const targetFile = path.join(artifactDir, "target.json");

export default async function globalSetup() {
    fs.mkdirSync(artifactDir, {recursive: true});
    const cfg = e2eConfig();
    const install = resolveInstall();
    await assertPortAvailable(cfg);
    const prepared = prepareWorkspace(cfg.workspace);
    const token = configureAccessToken(cfg.workspace, {token: cfg.token, created: prepared.created});
    const installed = installPlugin(cfg.workspace, repoRoot);
    if (!fs.existsSync(path.join(cfg.workspace, "data", "plugins", PLUGIN_NAME, "i18n", "zh_CN.json"))) {
        throw new Error("E2E plugin install did not copy nested i18n resources");
    }
    console.log(`[e2e] 工作区 ${cfg.workspace}（${prepared.created ? "新建" : "复用"}）· 插件 v${installed.version} · 内核 ${install.kernel}`);

    const running = await startKernel({kernel: install.kernel, appDir: install.appDir, ...cfg});
    const client = new SiyuanClient({baseURL: cfg.baseURL, token});
    let kernelVersion;
    let booted = false;
    try {
        await client.waitForBoot(running.lines);
        booted = true;
        await prepareScratch((route, body) => client.post(route, body), {base: cfg.baseURL});
        kernelVersion = await client.version();
        const enabled = await enablePlugin({client, workspace: cfg.workspace, pluginName: PLUGIN_NAME});
        console.log(`[e2e] 插件已启用并下发：${enabled.name} v${enabled.version}（js ${Math.round(enabled.jsBytes / 1024)}KB / css ${Math.round(enabled.cssBytes / 1024)}KB）`);
    } catch (error) {
        fs.writeFileSync(path.join(artifactDir, "kernel-start.log"), running.lines.join("\n"));
        if (booted) await prepareScratch((route, body) => client.post(route, body), {base: cfg.baseURL}).catch(cleanupError => {
            console.error(`[e2e] 启动失败前清扫临时库失败：${String(cleanupError).slice(0, 240)}`);
        });
        await stopKernel({client, child: running.child}).catch(() => undefined);
        throw error;
    }
    fs.writeFileSync(targetFile, JSON.stringify({baseURL: cfg.baseURL, token, workspace: cfg.workspace, kernelVersion, pluginVersion: installed.version}, null, 2));
    console.log(`[e2e] 就绪：思源 ${kernelVersion} @ ${cfg.baseURL}（带访问码）`);

    return async () => {
        let cleanupError;
        try {
            const removed = await prepareScratch((route, body) => client.post(route, body), {base: cfg.baseURL});
            fs.writeFileSync(path.join(artifactDir, "smoke-cleanup.json"), JSON.stringify({removed, complete: true}, null, 2));
        } catch (error) {
            cleanupError = error;
            fs.writeFileSync(path.join(artifactDir, "smoke-cleanup.json"), JSON.stringify({complete: false, error: String(error)}, null, 2));
        } finally {
            await stopKernel({client, child: running.child}, running.lines);
        }
        fs.writeFileSync(path.join(artifactDir, "kernel.log"), running.lines.join("\n"));
        const errors = kernelErrorLines(running.lines);
        fs.writeFileSync(path.join(artifactDir, "kernel-errors.log"), errors.join("\n"));
        if (errors.length) console.warn(`[e2e] 内核日志有 ${errors.length} 行错误，见 .artifacts/e2e/kernel-errors.log`);
        if (cleanupError) throw cleanupError;
    };
}
