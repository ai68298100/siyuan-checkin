# 小驴打卡生态接入契约

第三方插件可以通过 `window.siyuanCheckin` 接入记录、专注和总结能力。接入必须把外部完成事件转换为稳定记录，并提供唯一的 `source` 与 `externalRef`。

当前 API 版本为 `4`，名称为 `siyuanCheckin`，协议标识为 `siyuan-checkin`。`describe()` 返回协议、API 版本、存储版本、能力和事件名称快照；`hasCapability(name)` 用于调用前检查单项能力。接入方应先检查 `isReady()` / `whenReady()`，再读取项目和事件；可通过 `capabilities` 和 `getCapabilityInfo()` 协商能力与本地写入边界，能力不存在时必须保留自己的离线流程。事件名称固定为 `checkin:item-created`、`checkin:item-updated`、`checkin:event-recorded`、`checkin:event-deleted`、`checkin:item-deleted`、`checkin:item-archived`、`checkin:suggestion-workflow-updated` 和 `checkin:analytics-updated`。`item-archived` 仅在自动归档成功后广播，携带归档项目的防御性快照；手动归档仍使用 `item-updated`，避免旧接入方重复处理。删除事件通过 `deletedEvents` 提供具体记录；建议事件仅包含规范化的建议 ID 与状态，不包含令牌或完整变更；分析事件仅表示只读快照已刷新。公共 API 不声明外部删除或建议写入能力。

## 记录同步

Task Horizon 的公开 API 消费示例见 [examples/task-horizon-bridge](../examples/task-horizon-bridge/plugin.js)，包含能力探测、摘要刷新、完成回写和卸载清理；它不读取任务插件私有数据。

```js
await window.siyuanCheckin.recordEvent({
  itemId: "checkin-item-id",
  value: 25,
  unit: "分钟",
  source: "tomato",
  externalRef: "session-2026-09-09-001",
  note: "来自番茄钟的完成记录"
});
```

分析快照读取会限制趋势窗口（周 52、月 24、日 366、年 10 个点），并拒绝超过 512 KiB 的 JSON、非法日期、负数或过长标签。接入方应将返回值视为受校验的只读数据。

相同 `source + externalRef` 的事件会被去重；重复写入返回已有事件的防御性副本，非法或拒绝才返回 `undefined`。同步异常时，外部插件应保留原始事件并允许稍后重试，不要生成新的随机引用。

## 快速开始（10 分钟接入）

最短路径：等待就绪 → 能力检查 → 写记录。可运行的完整示例见 [examples/tomato-bridge](../examples/tomato-bridge/plugin.js)：

```js
const checkin = window.siyuanCheckin;
await checkin.whenReady();                      // 1. 等待数据加载
if (!checkin.hasCapability("events.record")) return; // 2. 能力协商
const item = checkin.getItems().find((i) => !i.archived); // 3. 选择项目
await checkin.recordEvent({                     // 4. 写入记录（去重安全）
    itemId: item.id, value: 25, unit: "分钟",
    source: "tomato", externalRef: "session-001",
});
```

## 专注联动

番茄钟可以通过 `registerFocusAdapter` 提供开始和停止专注能力。适配器不可用、宿主不支持或调用超时时，核心打卡仍可离线使用。

当前产品设置只开放 `siyuan-plugin-docktomato`（底栏番茄钟）这一外部提供方。小飞驴打卡通过 `window.__dockTomato.focus` v1 启动计时，监听持久化后的 `tomato:focus-session-completed`，并以 `docktomato:<sessionId>` 去重。旧偏好值 `plugin` 自动迁移为 `docktomato`；未来增加其他番茄钟时，应增加独立 provider 值和适配器 ID，不恢复“任取第一个已注册适配器”的不确定行为。

底栏番茄钟桥接只消费公开门面和事件，不读取其数据文件、不调用私有函数、不模拟 DOM 点击。次数模式记录 1；分钟模式记录实际完成分钟，打卡单位为“小时”时除以 60。项目已归档/删除、API 版本不匹配、完成时长非法或缺少稳定会话 ID 时拒绝写入。

## 智能体

思源支持 `addAgentCapability` 时，插件可以注册只读总结、项目列表、单项洞察和明确确认后的记录能力。不支持该 API 时应显示离线状态，不要求用户重复配置模型 API。

### 建议工作流只读查询

`getSuggestionWorkflow()` 返回当前建议的防御性快照，包含信封、变更、已消费令牌和审计轨迹；`getSuggestionWorkflowSummary()` 返回状态、可用动作、计数和最近更新时间。两个接口仅用于展示和诊断，不提供确认、撤销、持久化或令牌创建能力。

订阅 `checkin:suggestion-workflow-updated` 后，可使用集成层的 `isSuggestionWorkflowEvent` 约束事件形状；建议事件只保证 `suggestionId` 与固定状态字段，未知或伪造状态应直接忽略。

调用前可通过 `hasCapability("suggestions.read")` 协商建议只读能力，并检查 `getCapabilityInfo()["suggestions.read"]` 确认其 `effect` 为 `read`、`localOnly` 为 `true`。

## 安全边界

- 外部来源必须可追溯，不能伪装成 `manual`。
- 记录能力属于本地写入，必须在用户明确要求后执行。
- 适配器只声明 `record`、`focus` 或 `calendar` 能力。
- 宿主异常、超时和网络失败都必须降级为可诊断错误。

## 宿主兼容矩阵

| 宿主能力 | 可用功能 | 降级行为 |
| --- | --- | --- |
| 基础插件 API | 手动打卡、统计、导出、跨插件 `recordEvent` | 无需 AI，完整离线运行 |
| `addAgentCapability` | 智能体总结、列表、洞察和确认后记录 | API 不存在时不注册，保留离线功能 |
| 第三方番茄钟 | `registerFocusAdapter` 与完成记录同步 | 适配器未加载时隐藏专注入口 |
| 任务 / 日历插件 | 通过 `recordEvent` 和订阅事件同步 | 外部插件离线时保留待重试事件 |

## 第三方接入检查清单

1. 使用固定且唯一的插件 `source`。
2. 同一个外部事件始终使用相同 `externalRef`。
3. 写入前取得真实的打卡 `itemId`，不要使用显示名称作为主键。
4. 记录单位应与项目当前版本一致。
5. 写入失败后使用原引用重试，避免产生重复记录。
6. 卸载或停用适配器时调用注册函数返回的注销函数。
7. AI 或宿主接口不可用时继续提供原有手动流程。

## 2.0 能力协商建议

### 分析只读能力（12.0）

调用 `getAnalyticsSnapshot()` 或 `getAnalyticsSummary()` 前，先检查 `hasCapability("analytics.read")`。两个接口均为本地只读，不会修改打卡数据；订阅 `checkin:analytics-updated` 可在数据刷新后重新读取。事件中的 `analyticsAsOf` 仅用于判断日期，不应被当作写入版本号。

趋势模型对窗口数量设有保护上限：周 52、月 24、日 366、年 10；超出范围会自动截断，非法值回退到默认窗口。

```js
const checkin = window.siyuanCheckin;
if (checkin?.hasCapability("analytics.read")) {
  const render = () => console.log(checkin.getAnalyticsSummary());
  render();
  window.addEventListener("checkin:analytics-updated", render);
}
```

接入方应把 `version` 作为协议主版本判断，把 `capabilities` 作为功能开关，不应通过插件版本号猜测能力。推荐流程：

1. 检查 `window.siyuanCheckin` 的 `name` 和 `version`。
2. 等待 `whenReady()` 完成，再读取 `capabilities`。
3. 对需要写入的能力检查 `getCapabilityInfo()[name].localOnly`，并保留用户确认。
4. 缺少能力时隐藏对应入口，保留本地或稍后重试路径。
5. 外部事件始终携带稳定的 `source` 与 `externalRef`，不要依赖事件数组顺序。
