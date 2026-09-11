# 进度
当前任务：T-022 index.ts 拆分——Phase 2 续（推荐顺序：renderOccasions → renderSettings → renderEditor(146行) → bindToday → bindOccasions → bindEditor(500行) → registerSiYuanAgentCapability(300行) → createApi）
上次检查点：renderReview 外置（3e3d320）；index.ts 4684→4127；新增 render/review.ts（ReviewViewContext 模式）
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 进行中
未提交变更：无
上次提交：3e3d320 refactor(T-022): extract renderReview
下一步：按上述顺序继续外置；达到 <2000 行后出 9.4.0；T-023 阻塞于用户
上下文备注：拆分模式=类留薄壳+外置函数收 ReviewViewContext/TodayViewContext ctx 参数（字段清单见 src/render/review.ts、fragments.ts）；断言迁移模式=测试改读对应模块文件（mobile-dialog/responsive/ui-theme/interval-editor/mobile-preview-overflow/entry-capabilities/archived-search 已改）。注意 renderReviewFold 已内联为 review.ts 里的 fold() 闭包，类内原方法仍保留（勿删，测试断言存在）。抽取后跑全链九项。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。



