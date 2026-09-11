# 进度
当前任务：T-022 index.ts 拆分——Phase 2 续（推荐顺序：renderToday+renderTodayGroups → renderReview(155行) → renderOccasions → renderSettings → renderEditor(146行) → bindToday → bindOccasions → bindEditor(500行) → registerSiYuanAgentCapability(300行) → createApi）
上次检查点：renderItem 外置（ef99827）；index.ts 4684→4343；fragments.ts 含 banner/save-status/sync-notice/item 视图
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 进行中（fragments 模式已扩展）
未提交变更：无
上次提交：ef99827 refactor(T-022): extract renderItem body
下一步：按上述顺序继续外置；每外置 2-3 个方法跑一次全链；达到 <2000 行后出 9.4.0；T-023 阻塞于用户
上下文备注：拆分模式=类留薄壳+外置函数收显式参数（TodayItemContext 先例：store/streaks/bulk/sortMode 打包传入）；字面量断言测试同步改读 fragments.ts/shared.ts 等（mobile-preview-overflow/interval-editor/mobile-dialog 已改，遇新断言失败同法处理）。拆分时先 grep 方法体行号，读原文，Edit 整段替换。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。

