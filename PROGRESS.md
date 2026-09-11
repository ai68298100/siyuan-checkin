# 进度
当前任务：T-022 index.ts 拆分——Phase 2 续（推荐顺序：renderReview(155行，含月历/明细/聚合/热力图/折叠) → renderOccasions → renderSettings → renderEditor(146行) → bindToday → bindOccasions → bindEditor(500行) → registerSiYuanAgentCapability(300行) → createApi）
上次检查点：renderToday+renderTodayGroups 外置（05efe42）；index.ts 4684→4259；fragments.ts 322 行
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 进行中
未提交变更：无
上次提交：05efe42 refactor(T-022): extract renderToday...
下一步：renderReview 抽取（TodayViewContext 模式复制为 ReviewViewContext：store/historyMonth/selectedHistoryDate/historyQuery/historySource/historyOrder/heatmapYearOffset/reviewFoldSections/occasionStore/appearance 等），然后按上述顺序；达到 <2000 行后出 9.4.0；T-023 阻塞于用户
上下文备注：拆分模式=类留薄壳+外置函数收 ctx 参数（TodayItemContext/TodayViewContext 先例）；renderToday 壳内保留 computeStreaks/bestStreak 状态赋值再调 renderTodayView(ctx)。字面量断言测试改读 fragments.ts（entry-capabilities 的 open-tab、interval-editor 的 formatScheduleLabel/isBinary、mobile-preview-overflow 的 item-name 等已改）。抽取后跑：build+check+test+test:ui+test:mobile+eco+vqa+width+audit。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。


