# Dock Tomato 联动准备

Dock Tomato 公开提供 `window.__dockTomatoStatsFacade`（同时挂载到 `window.__dockTomato.stats`），门面包含 `listSessions`、`queryFocus`、`queryRoutine` 等只读查询，并广播 `tomato:stats-availability-changed`。标准化 session 包含阶段、开始/结束时间、`sessionKey`、`isCompleted`、计划时长和任务块 ID。

联动应采用可选适配器：能力探测通过后按日期范围查询完成 session；以 `isCompleted === true` 和有效结束时间为准；通过用户把任务块 ID 映射到打卡项目；写入 `source: "docktomato"`、`externalRef: "docktomato:<sessionKey>"`，使用现有 externalRef 去重；结束时间作为记录时间，value 默认 1。没有映射、被放弃或未完成的 session 不自动写入。

当前已准备兼容 PR 草案：由 Dock Tomato 增加版本化、消费方无关的 focus facade 和持久化后完成事件，小飞驴打卡负责适配器注册及幂等写入。完整范围、失败策略、测试矩阵和后续合作空间见 [docktomato-compat-pr-draft.md](docktomato-compat-pr-draft.md)。用户确认前不创建或推送对方仓库 PR。
