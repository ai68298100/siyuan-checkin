/* T-1253 智能体接入的真实侧验证：插件自己说「注册了」不算数，要看宿主登记了什么。
   宿主侧句柄：window.siyuan.ws 是 Model（public app: App），App.plugins 保存全部插件实例，
   Plugin.agentCapabilities 是 addAgentCapability 成功后由宿主登记的 {id, generation} 列表。 */
import {expect, test} from "@playwright/test";
import {openCheckin} from "./helpers/app.mjs";

const CAPABILITY_COUNT = 11;

test("宿主确实登记了插件的 11 项智能体能力", async ({page}) => {
    await openCheckin(page);

    const probe = await page.evaluate(() => {
        const app = window.siyuan?.ws?.app;
        const plugins = Array.isArray(app?.plugins) ? app.plugins : null;
        const plugin = plugins?.find((entry) => entry.name === "siyuan-checkin");
        return {
            hasHandle: Boolean(plugins),
            supported: typeof plugin?.addAgentCapability === "function",
            registeredIds: (plugin?.agentCapabilities || []).map((entry) => entry.id),
            policy: window.siyuan.config?.ai?.agent?.capabilityPolicy || null,
        };
    });
    test.skip(!probe.hasHandle, "宿主未暴露 window.siyuan.ws.app.plugins，无法做宿主侧核对");

    expect(probe.supported, "当前宿主缺少 addAgentCapability（需思源 3.8.0+）").toBe(true);
    expect(probe.registeredIds.length, `宿主登记的能力数量：${JSON.stringify(probe.registeredIds)}`).toBe(CAPABILITY_COUNT);
    for (const id of probe.registeredIds) {
        expect(id.startsWith("plugin/frontend/siyuan-checkin/"), `能力 id 前缀异常：${id}`).toBe(true);
    }
    expect(probe.registeredIds.some((id) => id.endsWith("/checkin-summary-context")), "缺少只读总结能力").toBe(true);
    expect(probe.registeredIds.filter((id) => /record-event|complete-occasion|create-item|create-occasion$/.test(id)).length, "写入型能力应为 4 项").toBe(4);

    /* 注册成功但对模型不可见的唯一常见原因：能力策略把它们拒了。 */
    const denied = probe.policy ? probe.registeredIds.filter((id) => (probe.policy.overrides?.[id] || probe.policy.default) !== "allow") : [];
    expect(denied, `以下能力被智能体策略拒绝，需到 设置 - 人工智能 - 能力 里允许：${denied.join(", ")}`).toEqual([]);
});
