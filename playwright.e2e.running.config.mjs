/* T-1428 · R-50.1：附着到「已在运行」的思源内核实例跑 e2e（不启内核、不抢工作区锁）。
   用法：先手动启动独立 e2e 工作区内核，再
   ① 手写 .artifacts/e2e/target.json（baseURL/token/workspace）；
   ② npx playwright test --config playwright.e2e.running.config.mjs <spec>
   可用 SIYUAN_BASE_URL / SIYUAN_TOKEN / CHECKIN_E2E_WORKSPACE 覆盖 target 中的明确目标。
   默认拒绝共享笔记本；显式 SIYUAN_E2E_ALLOW_SHARED=1 仅豁免笔记本隔离判定。
   AI 请求默认禁用，真实模型验证需显式 SIYUAN_E2E_AI=1。 */
import {defineConfig} from "@playwright/test";
import path from "node:path";
import base from "./playwright.e2e.config.mjs";

export default defineConfig({
    ...base,
    globalSetup: path.resolve(import.meta.dirname, "tests/e2e/running-setup.mjs"),
    teardown: undefined,
    outputDir: path.resolve(import.meta.dirname, ".artifacts", "e2e", "running-artifacts"),
});
