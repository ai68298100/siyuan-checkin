# 进度
当前任务：T-022 index.ts 拆分——Phase 2 续（推荐顺序：renderSettings → renderEditor(146行) → bindToday → bindOccasions → bindEditor(500行) → registerSiYuanAgentCapability(300行) → createApi）
上次检查点：renderOccasions 外置（b3773c6）；index.ts 4684→4056；render/ 目录现有 fragments.ts(340行)/review.ts(191行)/occasions.ts(150行)
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 进行中
未提交变更：无
上次提交：b3773c6 refactor(T-022): extract renderOccasions
下一步：按上述顺序继续外置；达到 <2000 行后出 9.4.0；T-023 阻塞于用户
上下文备注：拆分模式=类留薄壳+外置函数收 ctx 参数（TodayItemContext/TodayViewContext/ReviewViewContext/OccasionsViewContext 先例）；occasions 渲染里 nthOptions 定义勿遗漏；整段 Edit 匹配失败时用"先插壳+旧方法改名 LegacyBody+按 Read 原文精确删除"三步法（本次用此法成功）。抽取后跑九项验证（build/check/test/test:ui/test:mobile/eco/vqa/width/audit）。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。




