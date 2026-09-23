/* T-1428 · R-50.1：附着到「已在运行」的思源内核实例跑 e2e（不启内核、不抢工作区锁）。
   用法：先手动启动 e2e 工作区内核（或任一已装入本插件的实例），再
   ① 手写 .artifacts/e2e/target.json（baseURL/token/workspace）；
   ② npx playwright test --config playwright.e2e.running.config.mjs <spec>
   适用：用户已在 e2e 环境接入思源智能体后，采集真实模型链路的自动化证据；
   只读 spec（如 agent-capabilities）优先，写入类 spec 需用户知情。 */
import {defineConfig} from "@playwright/test";
import path from "node:path";
import base from "./playwright.e2e.config.mjs";

export default defineConfig({
    ...base,
    globalSetup: undefined,
    teardown: undefined,
    outputDir: path.resolve(import.meta.dirname, ".artifacts", "e2e", "running-artifacts"),
});
