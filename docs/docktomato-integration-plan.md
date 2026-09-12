# Dock Tomato 联动准备

Dock Tomato 公开提供 `window.__dockTomatoStatsFacade`（同时挂载到 `window.__dockTomato.stats`），门面包含 `listSessions`、`queryFocus`、`queryRoutine` 等只读查询，并广播 `tomato:stats-availability-changed`。标准化 session 包含阶段、开始/结束时间、`sessionKey`、`isCompleted`、计划时长和任务块 ID。

联动应采用可选适配器：能力探测通过后按日期范围查询完成 session；以 `isCompleted === true` 和有效结束时间为准；通过用户把任务块 ID 映射到打卡项目；写入 `source: "docktomato"`、`externalRef: "docktomato:<sessionKey>"`，使用现有 externalRef 去重；结束时间作为记录时间，value 默认 1。没有映射、被放弃或未完成的 session 不自动写入。

待双方插件都上架集市后，再考虑向 Dock Tomato 提交小型公开契约 PR，只增加事件/类型声明、字段示例和兼容性文档，不修改其核心存储，不依赖内部文件路径。
