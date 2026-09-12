# 进度
当前任务：T-022 index.ts 拆分收尾——距 <2000 行差 126 行（现 2126）
上次检查点：model-helpers 外置（24c426b）
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 绝大部
未提交变更：无
上次提交：24c426b refactor(T-022): extract pure data helpers
下一步（精确清单，做完即达标）：
  1) 新建 src/plugin-ops.ts：showSyncNotice/settleReady/invalidateSummary/renderBackgroundUpdate/getQuickTodayItems/focusTodaySearch/changeHistoryMonth/restoreItem/downloadExport/bindDialogClose/bindMobileNav（≈90 行，宿主接口 + 壳）
  2) importCsvRows 改自由函数 importCsvRowsInto(store, rows) 返回 {store, itemsCreated, eventsCreated, duplicates}（≈55 行）
  3) 达标后跑 release 级九项 + 出 9.4.0 测试包（dist 八文件 zip）
  4) 更新 TODO 记 T-022 done；T-023 阻塞于用户（BLOCKERS B-001）
上下文备注：模块布局 src/render/（fragments/review/occasions/settings/editor/bind-today/bind-occasions/bind-editor/bind-page-navigation/quick-dialog/focus-timer/focus-adapter/save-form 共 13）+ src/api.ts + src/agent-capabilities.ts + src/model-helpers.ts + src/shared.ts + src/ui/{icons,labels}.ts + src/version.ts。Host 接口 + `this as unknown as XHost` 双转换模式；测试断言迁移 15+ 文件（遇断言失败先 grep 断言名定位文件，再改读对应模块）。指标：渲染 10k 事件 16ms。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
