# 思源兼容矩阵

| 思源版本 | 桌面端 | 移动端 | 关键检查 |
| --- | --- | --- | --- |
| 3.8.3 | 目标支持 | 目标支持 | `Dialog`、`addDock`、`addTab`、`addAgentCapability`、快捷键、`visualViewport` |
| 3.8.x 后续版本 | 持续验证 | 持续验证 | 发布前运行完整测试和生产构建 |

插件只依赖思源公开插件接口：`Plugin`、`Dialog`、`addDock`、`addTab`、`addCommand`、`showMessage` 和 `getFrontend`。业务数据保存在插件自身存储中，未直接依赖思源内部 DOM 结构。插件 API 通过 `window.siyuanCheckin` 提供标准总结与自定义日期范围总结，不依赖思源内部接口。

在支持 `addAgentCapability` 的思源版本中，插件注册只读能力 `checkin-summary-context`。思源自带智能体可以读取打卡复盘上下文并使用用户已经配置的模型生成总结，无需在插件中重复配置 API。该能力声明本地读取和数据外发，由思源智能体按自身权限流程确认；它不会写入打卡数据，也不直接调用思源未公开的 `/api/ai/agent/chat` 内部端点。较旧版本没有该方法时，核心打卡、公开 API 和第三方总结适配器保持可用。

`window.siyuanCheckin.version` 当前为 3。版本 2 新增 `getCustomSummaryContext`，版本 3 新增 `summarizeCustom`，并允许总结适配器收到 `customRange`；调用方应先检查版本，再使用这些能力。

发布前检查：

- 桌面端验证侧边栏、页签和快速弹窗三种入口。
- 移动端验证软键盘、旋转、安全区、触控按钮和窄宽度卡片。
- 验证 `package.zip` 内包含 `plugin.json`、`index.js`、`index.css`、图标、预览、README 和 LICENSE。
- 验证 `plugin.json.version` 与 `package.json.version` 一致，并与 Release tag 一致。
