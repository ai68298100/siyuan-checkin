/* 只读实例 E2E 前置（T-1249）：同一个测试工作区用 --readonly 再起一个内核。
   只读角色下 setPetalEnabled / putFile 都会被 CheckAdminRole + CheckReadonly 拒绝（403），
   所以这里不再启用插件——插件的启用状态与信任开关已经由 test:e2e 落在工作区里。 */
import fs from "node:fs";
import path from "node:path";
import {
    e2eConfig,
    assertOwnedWorkspace,
    kernelErrorLines,
    PLUGIN_NAME,
    DEFAULT_E2E_PORT,
    readAccessToken,
    resolveInstall,
    SiyuanClient,
    startKernel,
    stopKernel,
} from "../../../scripts/e2e/lib.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const artifactDir = path.join(repoRoot, ".artifacts", "e2e");
export const targetFile = path.join(artifactDir, "target-readonly.json");

export default async function globalSetup() {
    fs.mkdirSync(artifactDir, {recursive: true});
    const writable = e2eConfig();
    assertOwnedWorkspace(writable.workspace);
    if (!fs.existsSync(path.join(writable.workspace, "data", "storage", "petal", "petals.json"))) {
        throw new Error("插件尚未在 E2E 工作区登记启用，请先跑 pnpm run test:e2e");
    }
    const readonlyPort = Number(process.env.CHECKIN_E2E_READONLY_PORT || DEFAULT_E2E_PORT + 1);
    const cfg = {...writable, port: readonlyPort, baseURL: `http://127.0.0.1:${readonlyPort}`};
    const install = resolveInstall();
    const token = cfg.token ?? readAccessToken(cfg.workspace);
    const client = new SiyuanClient({baseURL: cfg.baseURL, token});
    const running = await startKernel({kernel: install.kernel, appDir: install.appDir, ...cfg, extraArgs: ["--readonly", "true"]});
    try {
        await client.waitForBoot(running.lines);
    } catch (error) {
        fs.writeFileSync(path.join(artifactDir, "kernel-readonly-start.log"), running.lines.join("\n"));
        await stopKernel({client, child: running.child}).catch(() => undefined);
        throw error;
    }
    const kernelVersion = await client.version();
    const petals = await client.post("/api/petal/loadPetals", {frontend: "desktop"});
    if (!(petals.data || []).some((item) => item.name === PLUGIN_NAME)) {
        await stopKernel({client, child: running.child});
        throw new Error(`只读实例未下发插件 ${PLUGIN_NAME}`);
    }
    const rejected = await client.putFile("checkin-e2e-readonly-probe", {probe: true}).catch((error) => error);
    if (!(rejected instanceof Error)) {
        await stopKernel({client, child: running.child});
        throw new Error("只读实例竟然接受了 putFile 写入，--readonly 未生效");
    }
    fs.writeFileSync(targetFile, JSON.stringify({baseURL: cfg.baseURL, token, workspace: cfg.workspace, kernelVersion, readonly: true}, null, 2));
    console.log(`[e2e] 只读实例就绪：思源 ${kernelVersion} @ ${cfg.baseURL}（putFile 已被内核拒绝）`);

    return async () => {
        await stopKernel({client, child: running.child}, running.lines);
        fs.writeFileSync(path.join(artifactDir, "kernel-readonly.log"), running.lines.join("\n"));
        const errors = kernelErrorLines(running.lines);
        if (errors.length) console.warn(`[e2e] 只读实例内核日志有 ${errors.length} 行错误，见 .artifacts/e2e/kernel-readonly.log`);
    };
}
