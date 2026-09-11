# 进度
当前任务：T-020 i18n 续：打卡项编辑器批次 → 设置页批次 → 归档页 → occasions.ts 引擎串 → 日期 locale 化
上次检查点：i18n 标签体系(7b159d5) + 回顾页(e333c92) + 事项页(a7a7a3d)
已完成：T-001~T-004、T-010~T-014、T-021；UI 走查修复；i18n 今日/标签/回顾/事项
未提交变更：无
上次提交：a7a7a3d feat(i18n): migrate occasions editor and list to t()
下一步：按上述 T-020 剩余顺序继续；完成后 T-022 拆分、T-023 真机反馈
上下文备注：i18n 模式=常量表存键、取词点 t(X_LABELS[x])；grep "t(t(" 防双重包裹；历史遗留字面量可能被 tests/*.cjs 断言（mobile-dialog/responsive/interval/insight-a11y 已改字典断言，settings 批次留意 ui-theme/ui-docs/mobile-release-quality）；编辑器字段 const：KIND_OPTIONS/ICON_GROUPS(组名中文)/TEMPLATE_GROUPS；日期 locale：index.ts 内多处 toLocaleDateString("zh-CN") + WEEKDAYS/CALENDAR_WEEKDAYS + formatHistoryDate。ui-sweep 走查 CHECKIN_BROWSER=Edge。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
