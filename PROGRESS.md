# 进度
当前任务：T-020 i18n 全量迁移（分批：today → settings → review → occasions/editor）
上次检查点：UI 走查修复批次（本次提交）
已完成：T-001~T-004、T-010~T-014、T-021；UI 全页走查（69 张截图，页面×宽度×主题×色板）修复 5 处问题
未提交变更：UI 修复（本次提交）
上次提交：55e2123 release: bump to v9.1.0
下一步：T-020 分批 i18n → T-022 拆分（功能稳定后）→ T-023 真机反馈修复
上下文备注：新增 tests/ui-sweep.cjs 一次性走查（CHECKIN_BROWSER 指向系统 Edge；viewport 必须=frame 宽度，否则 legacy @media 失真）。今日卡关键机制：item 网格第三列 max-content（勿改回固定 78px）、item-name min-width 4.5em、货架 auto-fill minmax(390px,1fr)、900-1360 容器隐藏拖拽柄。今日卡双列所有断言在 tests/responsive-layout.test.cjs 与 visual-qa wideTab。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
