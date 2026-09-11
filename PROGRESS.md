# 进度
当前任务：T-020 i18n 续：occasions.ts/catalog.ts 数据串 → 日期 locale 化 → showMessage/confirm 运行时消息
上次检查点：编辑器批次(61755a7) + 设置页批次(8e41f2d) + 归档页批次(28b61fd)
已完成：T-001~T-004、T-010~T-014、T-021；UI 走查修复；i18n 七大表面（今日/标签/回顾/事项/编辑器/设置/归档）
未提交变更：无
上次提交：28b61fd feat(i18n): migrate archived page to t()
下一步：T-020 按上述剩余顺序；完成后跑 release 级全链 + 出 9.2.0 测试包；然后 T-022/T-023
上下文备注：i18n 模式=常量表存键+t() 取词；grep "t(t(" 防双包裹；字面量测试断言迁移方式=改查 i18n.ts 字典（已有 8 个测试文件同步）；occasions.ts 的 describeRecurrence 输出进入 occasion rows 的 kind/recurrence 小字（index.ts 2121 附近 escapeHtml(kind)）——引擎函数需接收 label 回调或改查字典；日期 locale 需把插件语言传给 toLocaleDateString locale 参数。ui-sweep 走查 CHECKIN_BROWSER=Edge。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
