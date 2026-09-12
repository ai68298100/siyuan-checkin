# 进度
当前任务：T-024~T-028 完成（桌面弹窗/宽屏布局/按钮对齐、手机端固定双栏、侧边栏导航与归档入口）。等用户重启后在电脑与手机上复测
上次检查点：T-026 完成（操作区固定轨道对齐 + 阶梯档位下调）
已完成：T-001~T-004、T-010~T-014、T-020、T-021、T-022、T-024、T-025、T-026、T-027、T-028
未提交变更：无
上次提交：fix(mobile): cancel entrance animation so the pinned bars never shift
下一步：用户重启思源 → 确认（a）今日页在当前弹窗尺寸下是 2 列且打卡按钮成一条竖线（b）弹窗可拖动/缩放。真机若仍是单列，说明缩放比与推算不符，需要在真机上直接量 `.lc-checkin` 的 CSS 宽度（可临时加调试输出）
上下文备注：关键结论见 DECISIONS D-011~D-014。真机部署=unzip package.zip 到 <工作区>/data/plugins/siyuan-checkin/ 后**重启思源**（集市关开一次不够，前端不会重读磁盘文件）。守门测试 tests/desktop-dialog.test.cjs（含阶梯档位、固定轨道对齐、380 最小卡宽断言）。**容器名坑：`.lc-checkin` 上生效的是 lc5**。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
