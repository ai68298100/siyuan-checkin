# 进度
当前任务：**v9.5.1 已正式发布到 GitHub**（2026-09-12，含 T-024~T-030：桌面弹窗尺寸/宽屏布局/按钮对齐、手机端固定双栏、侧边栏导航、归档一等入口、事项页卡片化、桌面顶栏导航）。仅剩 T-023 真机反馈修复
上次检查点：v9.5.1 发布（tag v9.5.1、release Latest、package.zip 302921B、SHA-256 0cd3601e…7ff5）
已完成：T-001~T-004、T-010~T-014、T-020、T-021、T-022、T-024、T-025、T-026、T-027、T-028、T-029、T-030
未提交变更：无
上次提交：docs: v9.5.1 release checkpoint
下一步：手机端/桌面端用 v9.5.1 复测（集市更新或安装本地包）；等待 T-023 真机反馈。自动化侧已完成 T-031~T-035；统一质量门禁使用 `pnpm run test:quality`，大版本路线见 `docs/development-roadmap.md`。
上下文备注：v9.5.1（T-029 事项页三处修复）。手工部署三步：unzip 覆盖 → 集市安装本地包 或 重启思源；测试包 siyuan-checkin-v9.5.1-test.zip。守门测试 tests/desktop-dialog.test.cjs。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。

10.0 checkpoint: T-036 migration report foundation implemented and backup tests expanded. Next: connect report to JSON restore preview; T-023 real-device validation remains blocked.

T-037 complete: JSON restore flow now builds migration report against current store and includes source-to-target version in confirmation preview.

T-038 complete: successful JSON restores now append migration audit entries and persist the audit ledger.

Correction: T-038 audit persistence is deferred; restore preview integration remains limited to migration report generation until audit write path is added safely.

T-038 completed: successful JSON restore now persists a migration audit entry with source/target versions, repair state, warning count, and summary delta.

T-039 complete: migration report tests now verify exact zero deltas, BOM/missing version, and malformed JSON rejection.

T-039 complete: migration report tests now verify exact zero deltas, BOM/missing version, and malformed JSON rejection.

T-040 complete: local snapshot rollback writes a restore audit entry after successful persistence; full test chain remains green.

T-041 complete: settings audit list formats migration and restore records into readable summaries while retaining raw JSON for other event types.

T-042 complete: added restore-audit.test.cjs and included it in test:backup/main test chain.

Quality checkpoint: pnpm run test:quality passed after T-042, including environment, type, main, UI/mobile/ecosystem/perf/release checks, and build.

T-044 complete: added assessJsonMigration with review reasons for warnings, normalization repairs, and negative restore deltas.

T-045 complete: assessJsonMigration is connected to JSON restore confirmation; warnings, repairs, and destructive deltas are shown for review.

T-046 complete: validateJsonMigrationReport added with version/store/summary consistency checks and backup coverage.

T-047 complete: restore flow validates migration report consistency and aborts safely on invalid target/store/summary data.

T-048 complete: validation failures are recorded as rejected migration audit entries before restore aborts.

T-049 complete: restore audit guard now verifies persistence failure rollback path remains intact.
