# 进度
当前任务：T-024 桌面端体验优化完成（真机走查驱动），v9.5.0 待复测。T-023 真机反馈进行中；新登记 T-025（容器/视口混用收敛）
上次检查点：T-024 完成 + v9.5.0 部署真机
已完成：T-001~T-004、T-010~T-014、T-020、T-021、T-022、T-024
未提交变更：无
上次提交：feat(desktop): adaptive dialog frame and wide-screen page layouts
下一步：等用户在真机试 v9.5.0（弹窗自适应尺寸/拖动缩放/多列、回顾双列、事项主从）→ 按反馈修；T-025 可独立推进
上下文备注：v9.5.0 关键改动见 TODO T-024 与 DECISIONS D-011~D-013。真机部署=unzip package.zip 到 <工作区>/data/plugins/siyuan-checkin/ 后在集市里关开一次插件。新增守门测试 tests/desktop-dialog.test.cjs（已入 test:ui 链）。**容器名坑：`.lc-checkin` 上生效的是 lc5，写 `@container lc-checkin` 是死规则**（T-025）。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
