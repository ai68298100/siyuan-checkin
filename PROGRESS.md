# 进度
当前任务：T-022 index.ts 拆分——距 <2000 行还差 ~190 行。剩余可外置：recordExternalEvent(50)/onLayoutReady+onDataChanged+onunload(125)/bindSettings(110)/bindBulkMode(60)/importCsvRows(55)/enqueueMutation(43)/changeHistoryMonth+restoreItem+restoreLatestBackup+downloadExport(90)
上次检查点：focus-adapter 外置（d33ec31）；index.ts 4684→2187
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 绝大部（render/ 目录 12 模块 + api/agent-capabilities/shared/ui/version）
未提交变更：无
上次提交：d33ec31 refactor(T-022): extract focus adapter lifecycle
下一步：继续外置上述剩余（建议先 onLayoutReady 组 125 行 + recordExternalEvent 50 行 ≈ 达标）；达标后跑 release 全链出 9.4.0；T-023 阻塞于用户
上下文备注：本次新增模块 quick-dialog.ts(265)/focus-timer.ts(120)/focus-adapter.ts(110)/save-form.ts(140)/bind-page-navigation.ts(211)/bind-editor.ts(542)。Host 接口 + 双转换模式；测试断言迁移 15+ 文件。九项验证（build/check/test/test:ui/test:mobile/eco/rel/vqa/width/audit）全绿。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
