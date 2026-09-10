# 小驴打卡生态接入契约

第三方插件可以通过 `window.siyuanCheckin` 接入记录、专注和总结能力。接入必须把外部完成事件转换为稳定记录，并提供唯一的 `source` 与 `externalRef`。

当前 API 版本为 `4`，名称为 `siyuanCheckin`，协议标识为 `siyuan-checkin`。`describe()` 返回协议、API 版本、存储版本、能力和事件名称快照；`hasCapability(name)` 用于调用前检查单项能力。接入方应先检查 `isReady()` / `whenReady()`，再读取项目和事件；可通过 `capabilities` 和 `getCapabilityInfo()` 协商能力与本地写入边界，能力不存在时必须保留自己的离线流程。事件名称固定为 `checkin:item-created`、`checkin:item-updated`、`checkin:event-recorded` 和 `checkin:event-deleted`，删除事件通过事件详情中的 `deletedEvents` 提供具体记录。删除事件目前只通过内部历史操作产生，公共 API 不声明外部删除能力。

## 记录同步

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

相同 `source + externalRef` 的事件会被去重。同步失败时，外部插件应保留原始事件并允许稍后重试，不要生成新的随机引用。

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

## 智能体

思源支持 `addAgentCapability` 时，插件可以注册只读总结、项目列表、单项洞察和明确确认后的记录能力。不支持该 API 时应显示离线状态，不要求用户重复配置模型 API。

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

接入方应把 `version` 作为协议主版本判断，把 `capabilities` 作为功能开关，不应通过插件版本号猜测能力。推荐流程：

1. 检查 `window.siyuanCheckin` 的 `name` 和 `version`。
2. 等待 `whenReady()` 完成，再读取 `capabilities`。
3. 对需要写入的能力检查 `getCapabilityInfo()[name].localOnly`，并保留用户确认。
4. 缺少能力时隐藏对应入口，保留本地或稍后重试路径。
5. 外部事件始终携带稳定的 `source` 与 `externalRef`，不要依赖事件数组顺序。
