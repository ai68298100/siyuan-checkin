# 进度
当前任务：全部可做任务完成。**v9.4.0 已正式发布到 GitHub**（2026-09-12，release 之前积压的 9.1~9.4 未发布版本一并上线，已标 Latest）。仅剩 T-023 阻塞于用户真机测试（BLOCKERS B-001）
上次检查点：v9.4.0 GitHub 发布（68 提交推送 + tag + release + package.zip 299133B, SHA efc61660…295ee）
已完成：T-001~T-004、T-010~T-014、T-020、T-021、T-022（全部，含可选收尾）
未提交变更：无
上次提交：docs: v9.4.0 发布检查点
下一步：等待用户真机反馈（T-023）。注意：github.com:443 偶发闪断（api.github.com 正常），push 失败先重试；release.cjs 已支持版本号一致时跳过空提交
上下文备注：index.ts 1853 行、render/ 14 模块（含 today-bindings.ts）。九项验证 + 无障碍审计 + 性能全绿。发布流水线 node scripts/release.cjs <ver> [title] [notes.md]，notes 需含 SHA-256 占位行。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
