# 进度
当前任务：T-020 收尾——运行时消息串（showMessage/confirm 约 74 处）迁移；catalog.ts 数据串（打卡模板名/备注、图标组显示名）
上次检查点：v9.2.0 测试包已产出（本次提交）
已完成：T-001~T-004、T-010~T-014、T-021；UI 走查修复；i18n 七大表面 + occasions/catalog 引擎串 + 日期 locale 化（getPluginLocale()）
未提交变更：版本号/changelog/进度（本次提交）
上次提交：79bb613 feat(i18n): locale-aware dates
下一步：T-020 收尾两批 → release 全链 + 9.3.0；T-022 index.ts 拆分；T-023 真机反馈
上下文备注：运行时消息建议模式——msg.* 键 + t()；showMessage 有模板串（含 ${}）与字面串两类；confirm 用 window.confirm。测试字面量断言已全部改为查 i18n.ts 字典的模式，新增迁移沿用。ui-sweep/audit 用 CHECKIN_BROWSER=系统 Edge。打包：dist/ 八文件 zip（见 9.2.0 流程）。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
