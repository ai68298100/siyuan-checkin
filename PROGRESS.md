# 进度
当前任务：T-022 index.ts 拆分——Phase 2 续：按 render/fragments.ts 模式继续外置方法体（推荐顺序：renderOccasionSection → renderSaveStatus/renderSyncNotice → renderToday+renderTodayGroups → renderReview → renderOccasions → renderSettings → renderEditor → bindToday/bindOccasions → bindEditor(500行) → registerSiYuanAgentCapability(300行) → createApi）
上次检查点：Phase1(shared/ui-icons/ui-labels，9ded91e) + Phase2 试点(fragments，a97459e)；index.ts 4684→4405
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 进行中
未提交变更：无
上次提交：a97459e refactor(T-022 phase2 pilot)
下一步：按上述顺序继续外置；完成后跑 release 级全链 + 9.4.0；T-023 阻塞于用户
上下文备注：拆分模式（已验证）——类保留 `private renderX(): string` 薄壳调用外置函数（外置函数收显式参数如 store/occasionStore），测试断言 `private renderX` 仍匹配；外置函数放 src/render/fragments.ts（后续可按页拆文件）；字面量断言测试改读新模块文件（参照 mobile-dialog 对 ui/icons.ts、entry-capabilities 对 shared.ts 的改法）。注意：抽出方法后删除类内原体，勿留重复实现（曾出现 TS2393）。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
