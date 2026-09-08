# 小驴打卡生态接入契约

第三方插件可以通过 `window.siyuanCheckin` 接入记录、专注和总结能力。接入必须把外部完成事件转换为稳定记录，并提供唯一的 `source` 与 `externalRef`。

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

## 专注联动

番茄钟可以通过 `registerFocusAdapter` 提供开始和停止专注能力。适配器不可用、宿主不支持或调用超时时，核心打卡仍可离线使用。

## 智能体

思源支持 `addAgentCapability` 时，插件可以注册只读总结、项目列表、单项洞察和明确确认后的记录能力。不支持该 API 时应显示离线状态，不要求用户重复配置模型 API。

## 安全边界

- 外部来源必须可追溯，不能伪装成 `manual`。
- 记录能力属于本地写入，必须在用户明确要求后执行。
- 适配器只声明 `record`、`focus` 或 `calendar` 能力。
- 宿主异常、超时和网络失败都必须降级为可诊断错误。
