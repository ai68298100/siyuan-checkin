# 进度
当前任务：T-022 index.ts 拆分——Phase 2 续（推荐顺序：bindToday(200行) → bindOccasions → bindEditor(500行) → registerSiYuanAgentCapability(300行) → createApi(127行)；bind 系列用 this 绑定，可按"外置函数收 (root, plugin 可见性公开后)"或保留类内拆分为多个私有方法两方案，建议先保留类内只做段落注释分块）
上次检查点：renderEditor 外置（f1627d5）；index.ts 4684→3866；render/ 五模块齐（fragments/review/occasions/settings/editor）
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 进行中
未提交变更：无
上次提交：f1627d5 refactor(T-022): extract renderEditor
下一步：继续外置/分块至 <2000 行后出 9.4.0；T-023 阻塞于用户
上下文备注：editor.ts 用本地 weekdaysFromSunday + todayGroupMode 进 ctx（勿忘传）；七个测试文件的 editor DOM 断言已改读 render/editor.ts（interval-editor/mobile-template-touch/visual/delete-touch/grid/save-feedback/editor-keyboard/mobile-editor-structure/mobile-preview-overflow）。bind 方法与 view 不同：大量事件绑定依赖 this.enqueueMutation 等，直接外置需先解决可见性——可先类内分块注释。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。






