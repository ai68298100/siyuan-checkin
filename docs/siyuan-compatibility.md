# 思源兼容矩阵

| 思源版本 | 桌面端 | 移动端 | 关键检查 |
| --- | --- | --- | --- |
| 3.8.3 | 目标支持 | 目标支持 | `Dialog`、`addDock`、`addTab`、快捷键、`visualViewport` |
| 3.8.x 后续版本 | 持续验证 | 持续验证 | 发布前运行完整测试和生产构建 |

插件只依赖思源公开插件接口：`Plugin`、`Dialog`、`addDock`、`addTab`、`addCommand`、`showMessage` 和 `getFrontend`。业务数据保存在插件自身存储中，未直接依赖思源内部 DOM 结构。插件 API 通过 `window.siyuanCheckin` 提供标准总结与自定义日期范围总结，不依赖思源内部接口。

`window.siyuanCheckin.version` 当前为 3。版本 2 新增 `getCustomSummaryContext`，版本 3 新增 `summarizeCustom`，并允许总结适配器收到 `customRange`；调用方应先检查版本，再使用这些能力。

发布前检查：

- 桌面端验证侧边栏、页签和快速弹窗三种入口。
- 移动端验证软键盘、旋转、安全区、触控按钮和窄宽度卡片。
- 验证 `package.zip` 内包含 `plugin.json`、`index.js`、`index.css`、图标、预览、README 和 LICENSE。
- 验证 `plugin.json.version` 与 `package.json.version` 一致，并与 Release tag 一致。
