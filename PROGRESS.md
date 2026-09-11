# 进度
当前任务：T-022 index.ts 拆分——Phase 2 续（推荐顺序：renderEditor(146行) → bindToday → bindOccasions → bindEditor(500行) → registerSiYuanAgentCapability(300行) → createApi）
上次检查点：renderSettings 外置（08e4d9d）；index.ts 4684→3996；render/ 目录：fragments/review/occasions/settings
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 进行中
未提交变更：无
上次提交：08e4d9d refactor(T-022): extract renderSettings
下一步：按上述顺序继续外置；达到 <2000 行后出 9.4.0；T-023 阻塞于用户
上下文备注：PLUGIN_VERSION 已迁至 src/version.ts，release.cjs 已同步替换两处；settings.ts 引 labels 用 ../ui/labels；断言迁移继续（ui-theme settings-nav、preferences-docs reset-all/settings 字段已改 render/settings.ts）。抽取大方法时若整段 Edit 不中，用"先插壳改名 LegacyBody + Read 原文 + 分段删"三步法。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。





