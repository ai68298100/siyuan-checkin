# 进度
当前任务：T-031 顶栏合并（导航+全屏/关闭并入一条应用栏，退役悬浮按钮）已完成并推送；真机上发现旧实例残留的悬浮按钮和备份横幅（见 T-033 待办：彻底重载后确认）
上次检查点：v9.5.1 发布（tag v9.5.1、release Latest、package.zip 302921B、SHA-256 0cd3601e…7ff5）
已完成：T-001~T-004、T-010~T-014、T-020~T-022、T-024~T-030、T-090~T-100（T-090~T-099 为并行任务成果，已由本任务接手收尾）
未提交变更：无
上次提交：fix(nav): merge window controls into the app bar
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

T-050 quality checkpoint: test:quality passed after migration validation and rejected-restore audit changes.

T-051 complete: serializeJsonMigrationReport added for portable migration diagnostics and future support bundles.

T-052 complete: plugin operations now expose downloadMigrationReportFor for future restore/support UI integration.

T-053 complete: restore-audit guard now covers migration report download operation.

T-054 complete: migration diagnostic serialization is now committed and verified.

T-055 complete: review JSON export now responds to click; backup recommendation removed from Today and remains a Review concern.

T-056 complete: desktop topnav no longer sticks over content; default auto dialog shows more content with expanded width/height ratios.

Dock Tomato �����о���ɣ�������Լ��δ�� PR �߽��Ѽ�¼�� docs/docktomato-integration-plan.md����ǰ������������������ PR��

T-057 complete: Archived is now a Review sub-entry, reducing primary navigation while preserving direct access.

T-057 verification checkpoint: pnpm run check, pnpm test, and pnpm run test:ui pass after nesting Archived under Review.

T-059~T-062 complete: mobile group labels no longer stick, cards are denser, the editor retains an escape route and bounded scrolling, Add is centered in the bottom navigation, today occasions move above the list, and the default ungrouped preference is guarded. Verification: pnpm run check, pnpm run test:mobile, pnpm test, pnpm run test:ui, and system-Chrome width walkthrough passed.

Next: continue 10.0 data-safety work with migration audit retention/export management; T-023 remains pending real-device feedback.

T-063~T-064 complete: audit storage now rejects malformed entries and Settings exports a versioned normalized audit JSON file. Main, backup, UI, and type checks pass; final quality gate pending.

Quality checkpoint: pnpm run test:quality passed after T-063~T-064. T-065 then unified all four audit writers; pnpm run check, pnpm run test:backup, and pnpm test passed.

Next: design audit filtering/detail expansion or proceed to the next 10.0 recovery-platform slice; T-023 remains pending real-device feedback.

T-066 complete: local snapshot restore cannot silently normalize a malformed snapshot into destructive data. Validation failures are rejected and audited; repairs and negative deltas are surfaced before confirmation. Verification: pnpm run check, pnpm run test:backup, and pnpm test passed.

Roadmap audit: duplicate event IDs and externalRef identities are already normalized deterministically in normalizeStore/mergeStores and covered in model tests; no duplicate implementation added.

Next: extract a reusable recovery preflight result for JSON and snapshot restore, then reduce duplicated restore orchestration.

T-067 complete: preflightJsonRecovery now owns migration report construction, risk assessment, and consistency validation for both restore entry points. A v1-to-v2 normalization is intentionally review-worthy even when counts do not decrease. Verification: pnpm run check, pnpm run test:backup, and pnpm test passed.

Uncommitted checkpoint: T-066~T-067 are complete and verified. Accumulate one more related recovery task before the next local commit; do not push.

T-068 complete: buildRecoveryAuditDetails provides one audit payload contract for accepted/rejected JSON imports and local snapshots. Verification: pnpm run test:backup and pnpm test passed.

Milestone ready: T-066~T-068 form the shared recovery preflight/audit slice and may be committed together.

T-069~T-071 complete: recovery data persistence and diagnostic persistence now have separate transaction boundaries. Failed data writes roll back and attempt a persist-failed audit; failed audit writes never roll back successful data or leak an unhandled rejection. Verification before quality gate: pnpm run check, pnpm run test:backup, and pnpm test passed.

Quality checkpoint: pnpm run test:quality passed after T-069~T-071, including production build. Existing size warnings remain: index.js 355 KiB, index.css 289 KiB, package.zip 297 KiB.

Next: continue recovery-platform work with snapshot metadata/history rather than a single opaque rolling backup.

T-072~T-074 complete: rolling backups now use a versioned snapshot envelope with capturedAt; legacy raw-store snapshots remain restorable. Confirmation shows capture time and all snapshot audit outcomes retain capture/legacy metadata. Verification: pnpm run check, pnpm run test:backup, and pnpm test passed.

Next: extend the single rolling envelope into a small bounded snapshot history while preserving the current restore-latest behavior.

T-075~T-078 complete: backup storage is now a bounded three-entry snapshot history with compatibility for history, single-envelope, and legacy raw formats. The latest restore flow selects the newest snapshot. Fixed a pre-existing target bug where persist(current) wrote the old store instead of the selected backup. Verification before quality gate: pnpm run check, pnpm run test:backup, and pnpm test passed.

Quality checkpoint: pnpm run test:quality passed after T-075~T-078, including production build. Existing size warnings: index.js 356 KiB, index.css 289 KiB, package.zip 298 KiB.

Next: expose bounded snapshot history in Settings so users can inspect and choose a restore point; keep latest as the quick default.

T-079~T-081 complete: Settings loads and renders bounded snapshot history, shows capture time plus item/event counts, and lets users restore a selected entry through the shared preflight flow. Responsive list styling covers narrow surfaces. Verification before quality gate: pnpm run check, pnpm test, pnpm run test:ui, and pnpm run test:mobile passed.

Quality checkpoint: pnpm run test:quality passed after T-079~T-081, including production build. Existing size warnings: index.js 358 KiB, index.css 289 KiB, package.zip 298 KiB.

Next: add snapshot-history export/clear management and test restore-point index bounds.

T-082~T-084 complete: snapshot history can be exported and explicitly cleared from Settings; current data is unaffected. Selected-index bounds are guarded before preflight. Verification: pnpm run check, pnpm run test:backup, pnpm test, and pnpm run test:ui passed.

Next: add import validation for exported snapshot-history bundles, then allow restoring those bundles without replacing current data until a concrete restore point is selected.

T-085~T-087 complete: exported snapshot bundles can be imported through strict format validation. Import confirmation explicitly replaces only restore points; current check-in data remains untouched until a selected restore runs through preflight. Verification before quality gate: pnpm run check, pnpm run test:backup, pnpm test, and pnpm run test:ui passed.

Quality checkpoint: pnpm run test:quality passed after T-085~T-087, including production build. Existing size warnings: index.js 362 KiB, index.css 289 KiB, package.zip 299 KiB.

Next: review 10.0 migration/recovery acceptance criteria and identify remaining automated work; T-023 remains the only real-device blocker.

T-088~T-090 complete: snapshot history read paths enforce the three-entry bound, imported snapshot stores require the complete persisted shape, and invalid capture times are rejected. Verification: pnpm run check, pnpm test, and pnpm run test:backup passed.

Next: close the 10.0 automated acceptance checklist and move remaining non-device work to the 11.0 planning/reminder platform.

T-091~T-092 complete: the new pure reminder projection merges visible occasions with scheduled check-in opportunities, derives today/upcoming/completed status, and applies stable urgency/name/id ordering without mutating either store. Verification: pnpm run check and pnpm test passed.

T-093 complete: Review now includes a compact reminder center backed by the projection model; completed entries remain visible but visually secondary, while narrow layouts collapse timing below the title. Verification: pnpm run check and pnpm run test:ui passed.

Next: add reminder-center filtering and explicit overdue representation in the 11.0 model/UI slice; keep snooze/skip semantics deferred until the storage contract is designed. T-023 remains pending real-device feedback.

T-094 complete: reminder entries now support a non-mutating status filter while preserving deterministic ordering and stable identities. Verification: pnpm run check, pnpm test, and pnpm run test:quality passed before this filter addition; targeted type/test verification follows.

Next: connect the filter to Review controls and define overdue semantics without changing persisted data. T-023 remains pending real-device feedback.

T-095 complete: Review now exposes an all/today/upcoming/completed reminder filter backed by the non-mutating projection. Verification: pnpm run check and pnpm run test:ui passed.

Next: model overdue reminders as a separate date projection, then add focused boundary tests before changing visible occasion semantics.

T-096 complete: migration report parsing now emits a stable JSON parse error before normalization, preserving explicit rejection for malformed imports. Verification: pnpm run check and pnpm run test:backup passed.

Next: design overdue reminder projection separately from current visible occasion semantics; document date and recurrence edge cases before implementation.

T-097 complete: added a conservative overdue occasion projection for uncompleted one-off dates; recurring and lunar occurrences remain excluded until a recurrence history contract is specified. Verification: pnpm run check, pnpm test, and occasion tests passed.

Next: add overdue entries to the reminder center behind an explicit filter, with copy that distinguishes overdue from upcoming.

T-098 complete: overdue is now a first-class reminder status ranked ahead of today and upcoming entries; existing filter types remain backward-compatible for all prior states. Verification: pnpm run check and occasion tests passed.

T-099 complete: Review reminder center now exposes overdue filtering and dedicated overdue copy, while preserving compact responsive rendering. Verification: pnpm run check, pnpm run test:ui, and occasion tests passed.

Next: run full quality gate, then design recurring overdue history as a separate model task.
