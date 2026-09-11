# 进度
当前任务：T-020 i18n 续：今日页剩余（分组/排序选项标签、项目卡 aria、emptyProgress 两处字面量受 responsive 测试锁定需同步改断言）
上次检查点：UI 走查修复（0ab5c50）+ i18n 今日页核心批次（本次提交）
已完成：T-001~T-004、T-010~T-014、T-021；UI 全页走查修复 5 处；i18n 今日页工具栏/空态/引导/横幅
未提交变更：i18n 批次（本次提交）
上次提交：0ab5c50 fix(ui): today card action overflow...
下一步：T-020 续（见上）→ 回顾页批次 → 事项/编辑器 → 设置页 → 日期 locale 化；T-022 拆分；T-023 真机
上下文备注：i18n 键集中在 src/i18n.ts 两字典；zh 值必须与旧字面量一致否则结构测试断言失败（如 没有待处理的匹配项）。ui-sweep 走查 viewport 必须=frame 宽度。今日卡网格第三列 max-content、item-name min-width 4.5em、货架 minmax(390px,1fr) 勿回退。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
