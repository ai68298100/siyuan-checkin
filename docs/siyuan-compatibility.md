# 思源兼容矩阵

| 思源版本 | 桌面端 | 移动端 | 关键检查 |
| --- | --- | --- | --- |
| 3.8.3 | 目标支持 | 目标支持 | `Dialog`、`addDock`、`addTab`、`addAgentCapability`、快捷键、`visualViewport` |
| 3.8.x 后续版本 | 持续验证 | 持续验证 | 发布前运行完整测试和生产构建 |

插件只依赖思源公开插件接口：`Plugin`、`Dialog`、`addDock`、`addTab`、`addCommand`、`showMessage` 和 `getFrontend`。业务数据保存在插件自身存储中，未直接依赖思源内部 DOM 结构。插件 API 通过 `window.siyuanCheckin` 提供标准总结与自定义日期范围总结，不依赖思源内部接口。

在支持 `addAgentCapability` 的思源版本中，插件向思源自带智能体注册四项能力：`checkin-summary-context` 读取日、周、月或自定义范围的聚合上下文，`checkin-list-items` 列出项目配置，`checkin-item-insights` 读取单项完成率、连续记录和趋势，`checkin-record-event` 在用户明确要求时记录一次打卡。前三项只读并声明本地读取，最后一项单独声明本地写入，思源智能体可以据此执行权限确认。能力输出使用结构化 JSON，智能体可以先查询再分析，最后在确认后执行写入；插件沿用思源已经配置的模型和密钥，无需重复维护 API，也不直接调用未公开的 `/api/ai/agent/chat` 内部端点。较旧版本没有该方法时，核心打卡、公开 API 和第三方总结适配器保持可用。

`window.siyuanCheckin.version` 当前为 3。版本 2 新增 `getCustomSummaryContext`，版本 3 新增 `summarizeCustom`，并允许总结适配器收到 `customRange`；调用方应先检查版本，再使用这些能力。

发布前检查：

- 桌面端验证侧边栏、页签和快速弹窗三种入口。
- 移动端验证软键盘、旋转、安全区、触控按钮和窄宽度卡片。
- 验证 `package.zip` 内包含 `plugin.json`、`index.js`、`index.css`、图标、预览、README 和 LICENSE。
- 验证 `plugin.json.version` 与 `package.json.version` 一致，并与 Release tag 一致。
