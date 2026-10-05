/* Attach only after explicit target/auth/workspace and notebook-isolation preflight. Never stops this kernel. */
import fs from "node:fs";
import path from "node:path";
import {assertScratchWorkspace, SiyuanClient} from "../../scripts/e2e/lib.mjs";
import {prepareScratch, resolveTarget} from "../../scripts/lib/smoke-kernel.mjs";

export async function preflightRunningTarget(saved = {}, {env = process.env} = {}) {
    if (env.SIYUAN_BASE_URL && saved.baseURL && env.SIYUAN_BASE_URL.replace(/\/+$/, "") !== saved.baseURL.replace(/\/+$/, "") && !env.SIYUAN_TOKEN) {
        throw new Error("附着目标地址改变时必须同时提供 SIYUAN_TOKEN，拒绝复用另一个内核的旧 token");
    }
    const {base, token} = resolveTarget({baseArg: env.SIYUAN_BASE_URL ?? saved.baseURL, tokenArg: env.SIYUAN_TOKEN ?? saved.token, env});
    const workspace = env.CHECKIN_E2E_WORKSPACE ?? saved.workspace;
    assertScratchWorkspace(workspace, {env});
    const client = new SiyuanClient({baseURL: base, token});
    await prepareScratch((route, body) => client.post(route, body), {base, env});
    const kernelVersion = await client.version();
    return {...saved, baseURL: base, token, workspace, kernelVersion};
}

export default async function runningSetup() {
    const file = path.resolve(import.meta.dirname, "..", "..", ".artifacts", "e2e", "target.json");
    const saved = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    const target = await preflightRunningTarget(saved);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, JSON.stringify(target, null, 2));
    console.log(`[e2e] 附着靶场已通过隔离预检：${target.baseURL}；不会停止该内核`);
    const client = new SiyuanClient({baseURL: target.baseURL, token: target.token});
    return async () => {
        // Attached runs never stop the user's kernel, but they still remove
        // only this project's temporary notebooks after the suite.
        await prepareScratch((route, body) => client.post(route, body), {base: target.baseURL});
        console.log(`[e2e] 附着靶场临时库已清扫：${target.baseURL}`);
    };
}
