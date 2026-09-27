# siyuan-checkin-contract（小驴打卡契约自测包）

第三方插件在**开发期**即可自测与 `window.siyuanCheckin` 公开 API（v5）的兼容性，无需安装双插件联调。与 `docs/api-v5.md` 参考文档、`manifest.json` 契约清单同源发布。

## 准入清单（五项，全部满足才可标注「已接入小驴打卡」）

1. **身份**：使用固定且唯一的插件 `source` 与 `externalRef` 前缀（向仓库登记，格式 `yourplugin:<稳定身份>`）；不伪装 `manual`，不冒用已登记前缀。
2. **幂等**：同一外部事件永远使用相同 `source + externalRef`；重复写入会被去重并返回已有事件，禁止生成新的随机引用重试。
3. **卸载清理**：卸载/停用时调用注册函数返回的注销函数（摘要提供方、专注适配器、事件订阅），不留孤儿监听。
4. **权限声明**：只调用 `hasCapability`/`getCapabilityInfo` 协商过且 `effect` 匹配用途的能力；写能力（`events.record` 等，`localOnly: true`）必须在用户明确要求后触发。
5. **失败隔离**：宿主异常/超时/能力缺失一律降级为可诊断错误并保留原始 `externalRef` 待重试；不抛裸异常进入宿主，不静默丢弃用户数据。

## 使用

浏览器/插件开发环境（全局对象就绪时）：

```js
import {runContractChecks} from "./check-contract.mjs";
const report = await runContractChecks({api: window.siyuanCheckin});
if (report.failures.length) console.error(report.failures);
else console.log(`契约自测通过（${report.passed} 项）`);
```

Node 冒烟（针对你自己的 API mock，验证消费端逻辑）：

```js
const {runContractChecks} = require("./check-contract.mjs");
const report = await runContractChecks({api: myMock});
```

自测范围：描述符与版本协商、能力面与 `capabilitiesSince`、事件名清单、只读方法形状（`queryItems`/`getEventsInRange`/`getStreaks`/`getDiagnostics`）、批量写边界（超限逐条 `rejected`、未知 source 拒绝不误判、空输入零写入）。

不在自测范围（需真实联调，见 B-007 门槛）：多窗口并发时序、跨插件事件投递顺序、Android/iOS 容器行为。

## 版本

跟随插件 API 主版本：v5 → `5.x`。`manifest.json` 为该版本的机器可读契约（能力清单、since、限制、事件名、externalRef 前缀登记处）；与仓库 `docs/contracts/checkin-api-v5.json` 强制一致（仓库门禁锁定）。

## 日历消费端参考层（calendar-consumer.mjs，T-1392 本地切片）

面向日历类消费方（如 Task Horizon 的「打卡」图层）的 `calendar.read` 参考实现：能力协商 → 区间规划 → 单飞加载（超时/中止/有界缓存）→ 防御性归一化 → 刷新分类。语义纪律与宿主一致：只呈现不自算完成率、日期原样回显不做时区换算、过期缓存不回退旧值、失败一律可诊断（`api-missing`/`host-outdated`/`capability-missing`/`invalid-range`/`range-too-long`/`timeout`/`aborted`/`provider-failed`/`projection-invalid`）不抛裸异常。

```js
import {createCalendarProjectionSession, runCalendarConsumerChecks} from "./calendar-consumer.mjs";

const session = createCalendarProjectionSession(window.siyuanCheckin, {timeoutMs: 8000});
const result = await session.load({startDate: "2026-09-01", endDateExclusive: "2026-10-01"});
if (result.ok) render(result.projection); else console.warn(result.reasonKey);

// 刷新：订阅 manifest.events，按四类决定是否重载（隐藏开关走 item-updated，重载即生效）
// 自检：开发期对宿主逐条核对消费前提
const report = await runCalendarConsumerChecks({api: window.siyuanCheckin});
```

状态：**参考层，v1 机器契约未变**。真实双插件联调（多窗口/加载顺序/移动端）仍按 T-1394 门槛现场验收后才可作为稳定路径。
