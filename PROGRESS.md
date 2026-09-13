# 进度
当前任务：T-122 手机顶栏主题继承修复完成，准备进入 T-123 响应式媒体规则第二批清理
上次检查点：v9.5.1 发布（tag v9.5.1、release Latest、package.zip 302921B、SHA-256 0cd3601e…7ff5）
已完成：T-001~T-004、T-010~T-014、T-020~T-022、T-024~T-030、T-090~T-101、T-032
未提交变更：无
上次提交：feat(nav): app-bar style top navigation, 归档 folded into 回顾
下一步：手机端/桌面端用最新本地包复测顶栏颜色与占比；自动化侧继续推进 T-129 局部刷新真机验收与 T-133 建议确认写入闭环。统一质量门禁使用 `pnpm run test:quality`，大版本路线见 `docs/development-roadmap.md`。
上下文备注：v9.5.1（T-029 事项页三处修复）。手工部署三步：unzip 覆盖 → 集市安装本地包 或 重启思源；测试包 siyuan-checkin-v9.5.1-test.zip。守门测试 tests/desktop-dialog.test.cjs。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。

T-122 complete: mobile topbar and bottom navigation now inherit the resolved independent light/dark palette from the surface even though they live outside the scrolling `.lc-checkin` element. Host datasets and fixed token synchronization prevent fallback to Siyuan global colors; topbar exposes `data-appearance` for deterministic styling. Verification: `pnpm run check`, `pnpm run test:mobile`, `pnpm run test:ui`, and `pnpm run build` passed (CSS 262 KiB, existing webpack size warnings only).

T-135 complete: `tests/agent-suggestions.test.cjs` is now part of the main `pnpm test` chain. Verification: `pnpm test` passed, including Agent suggestion safety structure checks.

T-136 complete: added deterministic line diff and escaped HTML renderer for saved analysis comparison, with compact scrollable styles and regression assertions. Verification: `pnpm run check` and agent-suggestions safety checks passed.

T-137 complete: added strict analysis snapshot normalization, including range/source validation, generated timestamp presence, 200k text bound, and 20-entry retention.

T-137 follow-up: wired normalization into `loadAnalysisSnapshots`, so persisted cache data now always passes the same validation boundary before entering UI state.

T-140 complete: `saveAnalysisSnapshot` now normalizes, deduplicates, and bounds history before persistence, keeping read/write cache invariants aligned. Verification: type check and agent-suggestions checks passed.

T-190 complete: sidebar dock responsive layout batch consolidated across ultra-narrow, narrow, medium, and wide containers. Card actions, headers, forms, lists, calendar, navigation, focus, overflow, and scroll boundaries now have dedicated constraints. Automated type/mobile checks pass; real-client validation remains separate.

T-131 status corrected to complete: review secondary navigation is implemented with jump targets, auto-expansion, sticky navigation, and persisted fold state; covered by UI/mobile regression checks.

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

Dock Tomato 联动研究完成：公开契约与未来 PR 边界已记录于 docs/docktomato-integration-plan.md；当前不启用联动、不创建 PR。

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

T-102 complete: GitHub Actions CI added (.github/workflows/ci.yml) running check/build/test/test:mobile/check:release on push and PR. Browser walkthroughs stay local until Playwright provisioning is reliable.

T-103 complete: retired 21 dead `@container lc-checkin` blocks (927 lines) plus the overridden `container-name: lc-checkin` longhand from index.scss. Proof of safety: tokens.scss declares `container: lc5 / inline-size` on `.lc-checkin` after index.scss, so the lc-checkin container name never existed and none of those queries could ever match; walkthrough screenshots confirm pixel-identical pages. dist/index.css shrank 301555→262270 bytes (-13%). Four test files that locked the dead blocks (ui-theme, mobile-preview-overflow, mobile-rotation-layout, mobile-visual-regression) were re-pointed at the live lc5 rules in components.scss; one assertion was locking a dead 16px radius token while the live tokens value is 20px.

Next: T-104 viewport @media residue cleanup (requires runtime comparison), then phase-3 migration of unconditional legacy rules toward full index.scss retirement.

T-107 complete: desktop page keyboard flow (j/k or arrows move focus across visible cards onto their primary action button, space/enter checks in natively, e opens the editor). Opening the desktop dialog now focuses the page container so keys cannot leak into the document editor underneath; verified on the live desktop.

T-112 complete: per-surface page scroll memory. renderInto captures the outgoing scroll position under the old page key and restores the incoming page's remembered position after binding, so check-ins and filter edits no longer jump the viewport and page switches resume where the user left off. Storage is a WeakMap keyed by surface root, released with the surface.

Next: T-104 viewport @media residue cleanup, then T-105 unconditional legacy rule migration toward full index.scss retirement; T-110 catch-up undo toast from the idea pool.

T-110/T-113/T-114 complete: catch-up undo snackbar (6s, rolls back the occasion mark), Escape closes the quick dialog (bound only on the dialog surface with a re-render guard), and post-record focus restore (the card acted on regains focus after re-render so the keyboard flow continues). All verified by the structure suite; desktop build redeployed and reloaded.

T-111 complete: the contrast audit already existed inside the T-021 accessibility audit (WCAG 4.5:1 / 3:1 large-text, both themes, all main pages); this round added the archived and insights pages to the audit walk (0 violations across 7 pages × 2 themes) and moved the browser audit into CI as a dedicated browser-audit job (playwright 1.63 added to devDependencies, Chromium installed on the runner).

T-115 complete (visual-qa crash root-caused and fixed): the double-submit editor step raced the async mutation queue — the wait selector matched the bottom-nav button that renders on every page, so the assertion ran before the save landed. The step now polls for the persisted item, the harness carries a queue trace probe (enqueue/start/end/settled per mutation), and a stale-form marker (form.dataset.submitBound) aids future diagnosis. Visual-qa exits 0 with zero page errors and is now part of the CI browser-audit job.

T-119 complete: post-check-in feedback is now a compact window-level toast hoisted to the dialog/tab/dock host after the Today list, avoiding the mobile top content flow and staying bounded by the active plugin window. It uses a subtle 120ms fade/2px lift, dismisses after 2.6s, leaves the undo action available, and disables animation for reduced-motion users. Verification: `pnpm run check`, `node tests/checkin-toast.test.cjs`, `pnpm run test:ui`, `pnpm test`, `pnpm run build`, and the Edge-backed mobile visual harness passed. Build retains the existing size warnings (index.js 377 KiB, index.css 259 KiB, package.zip 300 KiB).

T-120 complete (番茄钟快照): 联动待同步队列新增带 revision 的磁盘合并写入。新增 `mergePendingCheckinToDisk`，每次写入前重读设置文件，仅替换队列与 `tomatoCheckinPendingRevision`，按 `itemId + sessionKey` 去重合并；新增/重试/删除/清空路径统一接入，同一插件实例内写入串行化，旧数组格式继续可读。验证：`npx tsc --noEmit`、`npm test -- --run`（19/19）及 `npm run build` 通过。

下一步：补充真实双窗口 smoke，验证思源多前端并发 saveData 下 revision 与队列合并的最终行为；继续保留 T-023 真机验证阻塞记录。

T-121 complete: 手机端顶栏改为紧凑的画布融合样式。顶栏总高固定为 `38px + safe-area-inset-top` 并使用 `border-box`，避免安全区 padding 与 min-height 叠加；背景统一为插件画布色，关闭按钮与今日进度改为低对比度细边框/胶囊，减少突兀感和内容占比。新增移动端发布结构断言。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile` 全部通过。
T-104 首批迁移完成：将 `index.scss` 中编辑器双栏布局、设置页三栏选项、历史页桌面增强三组安全规则从视口 `@media (min-width: 900px)` 改为 `@container lc5`，使弹窗、页签、侧栏按自身容器宽度决定布局。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build` 全部通过；剩余弹窗宿主与可访问性媒体规则保留待分批走查。

T-109 complete: 发布资源检查已包含 `dist/index.css` 体积预算（283000 bytes），当前构建约 267KB，样式增长超过预算会在 `check:release` 阶段阻断。验证：`pnpm run test:ui` 中 release-assets 守门通过。

T-104 第二批迁移完成：将 `index.scss` 中多组仅作用于 `.lc-checkin` 内容的窄屏规则（原 `max-width: 600px` 的滚动行为、历史/设置/今日紧凑布局、空态、触控文本换行、今日卡片视觉层）改为等价的 `@container lc5 (max-width: 600px)`，使窄弹窗与侧栏按容器宽度一致响应。保留弹窗外框、横竖屏/高度、安全区、无障碍、打印及 380px 模板触控断点等视口媒体规则，避免改变宿主级行为。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build` 全部通过。

T-104 第三批迁移完成：编辑器模板管理器的 `max-width: 560px` 子树规则改为 `@container lc5`，让模板卡片在窄弹窗/侧栏按实际容器宽度收敛；直接作用于 `.lc-checkin` 自身的 360px 规则仍保留视口媒体，遵循容器查询不能匹配容器元素自身的限制。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile` 通过。

质量门禁：`pnpm run test:quality` 全部通过（环境、类型、主测试、UI、移动端、生态、性能、发布资源、构建）；性能基准 10k events 渲染 44ms，CSS 产物 267679 bytes，构建仅保留既有体积警告。

T-106 complete: 手机打卡成功后的轻振动反馈已接入统一记录路径，设置页提供开关（中英文文案），默认开启；仅移动端且 `navigator.vibrate` 可用时调用 10ms，桌面或受限 WebView 静默跳过。现有 view-preferences 与结构测试已覆盖该行为。

T-123 complete: `index.scss` 中 ≤380px 与 ≤360px 的内容密度规则已迁移为 `@container lc5`，窄 dock 与窄弹窗按实际 surface 宽度共享卡片、编辑器和历史布局；容器自身 padding 及标题 viewport 上限保留为宿主级回退。新增移动端发布断言。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build` 通过，构建仅保留既有 webpack 体积警告。

下一步：T-124 继续评估剩余视口媒体规则，先处理纯内容布局，保留设备能力、方向、高度、无障碍、打印和宿主级弹窗尺寸规则，迁移前补运行时走查。

T-124 complete: 桌面弹窗/页签的内容级顶部间距与控制按钮位置已从视口 `@media (min-width: 900px)` 拆到 `lc-dialog`/`lc5` 容器查询；外层弹窗圆角仍保留视口规则，避免改变宿主窗口行为。新增 desktop-dialog 结构断言。验证：`pnpm run check`、`node tests/desktop-dialog.test.cjs`、`pnpm run test:ui` 通过。

下一步：T-125 继续审计剩余视口媒体查询，优先确认是否存在可迁移的纯内容布局；设备能力、方向、高度、无障碍、打印及宿主级尺寸规则保持谨慎处理。

T-126 complete: 窗口主题 token 同步增加按宿主缓存的 appearance/palette 签名；同一主题下的打卡重渲染跳过重复 `getComputedStyle` 读取，主题切换或调色板改变时仍会完整同步。验证：`pnpm run check`、移动端发布守门、`pnpm run test:perf`（10k events 渲染约 51ms，横向溢出 0px）通过。

下一步：继续 T-125 的剩余媒体查询审计；若无安全纯布局规则，则转向 T-108 打卡局部重渲染或真实双窗口联动 smoke 设计。

T-127 complete: 修复 Today 视图重复渲染打卡提示的问题。提示现在只在列表之后生成一次，再由 `renderInto` 提升到窗口宿主，撤销入口不会残留在滚动正文顶部或出现双份。新增单实例结构断言；`pnpm run check`、`pnpm run test:ui` 通过。

下一步：继续评估 T-108 局部重渲染，优先从单卡片 DOM 更新与事件委托边界设计入手；同时保留真实双窗口番茄钟 smoke 作为联动验收项。

T-128 complete: 为 Today 建立保守的单卡片局部刷新路径。数值记录在卡片仍处于同一筛选/完成态/结构时，仅更新派生 meta、进度宽度和连续徽章；完成态变化、卡片不可见或结构变化自动回退完整渲染。窗口级 toast 抽出为 `renderRecentRecordView`，局部路径可同步新增/替换/移除 toast。覆盖 dock、页签和快速窗口，新增结构守门。验证：`pnpm run check`、`pnpm run test:ui` 通过。

下一步：T-108 继续做真实设备与交互验证，重点检查局部更新后的焦点、滚动记忆、撤销及番茄钟联动；必要时再扩展到更多可安全局部更新的事件路径。

T-129 queued: 局部刷新自动化边界已明确，真机验收单独记录为手机/页签/dock 三表面场景，避免把结构测试替代真实交互证据。

T-130 complete: 番茄钟独立联动设置页已有复制诊断、导出待同步、重试/删除/清空入口；诊断快照新增 pendingStatus 分类计数（retryable/blocked/duplicate），并保持默认静默，仅用户主动复制诊断时输出。番茄钟单测 19/19 通过。

下一步：T-129 真实手机/页签/dock 交互验收，以及真实双窗口联动 smoke；当前仍需用户设备环境提供证据。

T-125 本轮审计：复核 `src/index.scss` 剩余视口媒体查询。当前残余均属于宿主级弹窗尺寸、设备能力/方向/高度、无障碍/强制颜色、减少动效、触控指针或打印语义；没有可在未走查前安全迁移的纯内容布局规则，保持现状以避免改变真实客户端行为。验证：`pnpm run test:ui` 全部通过。

性能回归：`pnpm run test:perf` 通过，10k events 全量渲染 42ms，横向溢出 0px；局部刷新与主题同步缓存未造成可观测退化。

新增 `docs/integration-smoke-checklist.md`，将 T-129 与番茄钟双窗口联动的人工验收步骤、通过标准和记录格式固化；待用户提供真实客户端环境后执行并回填证据。

移动端/发布回归：`pnpm run test:mobile` 与 `pnpm run check:release` 均通过；320/360/390/430px 触控、键盘、模板、旋转和溢出检查全绿，CSS 产物 268155 bytes。

工作区质量检查：`git diff --check` 无代码空白错误（仅保留 Git 的换行格式提示），`pnpm run check` 类型检查通过。

远端同步检查：已执行 `git fetch origin --prune`；当前 `main` 与 `origin/main` 同步（无领先/落后提交），远端最新提交为 `c0a01b6 fix(release): Windows-safe release notes path`。工作区未提交改动均为本轮持续开发内容。

生产构建复核：`pnpm run build` 通过（Webpack 约 2.1s，`dist/index.css` 262 KiB、`dist/index.js` 382 KiB、`package.zip` 301 KiB）；仅有既有体积建议警告，未出现编译错误。

生态联动回归：`pnpm run test:ecosystem` 通过，公共 API 契约、联动文档与偏好设置文档检查全部通过。

规划新增：T-131 回顾页二级栏目快速跳转；T-132 截止日期智能总结增强。当前回顾页已有趋势/项目/日志/提醒/成就折叠区块及智能体主动生成入口，后续在不破坏折叠与滚动记忆的前提下补充顶部导航。
10.0 智能体协作：新增只读 `checkin-action-suggestions` 能力，按日/周/月范围返回薄弱项目与需用户确认的建议，不执行自动写入。生态测试与构建通过。

安全门禁回归：类型检查、生态集成、API 契约与偏好设置文档检查全部通过；差异预览 UI 将在确认写入模型落地后实现。

T-133 进展：建议预览对话框已可展示真实关注项目并安全关闭；修改前/后差异暂不伪造，待智能体提供结构化 `changes` 后接入确认写入。

回归验证：`pnpm test` 与 `pnpm run test:ecosystem` 均通过，主测试链和智能体能力契约保持稳定。

本轮回归：`pnpm run check`、`pnpm run test:ui` 全部通过；智能体建议安全测试、回顾导航、日志折叠和发布资源检查均保持通过。

T-133 文档同步：建议确认流已具备字段白名单、状态机、差异格式化和安全渲染；实际写入继续等待真实结构化 `changes` 与审计/回滚链路，不提前开放。

智能体回归：类型检查、生态契约、API/偏好设置文档与建议安全测试全部通过；当前预览仍保持只读。

T-134 进展：新增 `AgentAnalysisMeta` 与有界 `AgentAnalysisSnapshot` 缓存模型，历史默认保留最近 5 次、最多 20 次；缓存层纯函数测试与类型检查通过，尚未接入持久化。

T-134 新增独立缓存 IO：`loadAnalysisSnapshots` / `saveAnalysisSnapshot` 已完成，读取失败静默降级且不写入主打卡 store；下一步接入插件生命周期与回顾页更新时间。

生命周期审计：确认主数据、视图偏好、事项、模板、快照与审计均通过独立 `loadData` 键加载；分析缓存应在同一初始化阶段以独立键接入，不得混入主 store 恢复事务。

T-134 生命周期接入：插件初始化已通过独立缓存键加载分析历史到内存；后续仅在智能体分析成功后追加快照，失败时保留上一版本并回退本地摘要。

2026-09-13 环境与基线检查点：修复 CI 全红根因（pnpm 11 构建脚本白名单未入库 → allowBuilds 入库）与 Windows CRLF 假失败（.gitattributes 固定 LF）；按字节证据修复 4 个历史乱码文件（82fc9c3）；QA 脚本去除硬编码机器路径（D-055）。本机实测：check / pnpm test / test:mobile / test:ecosystem / test:perf / check:environment 全绿；系统 Chrome 下无障碍审计（浅+深 0 违规）、视觉走查（浅/深）、宽度走查通过。唯一红灯 = CSS 预算 294502 > 283000（B-005；同工具链 v9.6.1 实测 264920，增量为未发布 dock 工作的真实增长）。下一步：处置 B-005 后跑通完整 test:quality，push 验证 CI 首次转绿；大版本路线已补齐 13.0/14.0（docs/development-roadmap.md）。

2026-09-14 B-005 处置与 11.0-C 检查点：CSS 预算经全量类名核查（419 class 全有引用）后按 D-056 上调至 318000，`pnpm run test:quality` 全链复绿（exit 0）；无障碍审计（浅+深 0 违规）、视觉走查（浅/深）、宽度走查通过。11.0-C 延期/跳过/恢复已落地：reminders.ts 用户动作模型（独立存储键 checkin-reminder-actions、跨日本地日期自动过期、completed 终态守卫、有界日志），提醒中心行内胶囊按钮 + 宿主持久化 + 中英文案，新增 tests/reminder-actions.test.cjs（转译执行 + 接线守门）入 test/test:ui 门槛。路线图新增 15.0「UI 与使用体验全面提升」（A 视觉系统整合/F 文案引导等六切片）。下一步：push 验证 CI 转绿；11.0 对外提醒事件契约；15.0-A dock 四档样式合并精简。

2026-09-14 模块化与细节检查点（15.0-A 首批）：模块依赖图扫描入档（scripts/module-map.cjs + docs/architecture.md，含分层铁律/存储键清单/三条常见任务路径/守门索引）；删除 8 个不在构建图的 v4 补丁层（archived/history/insights/modern/occasions/settings/summary/today，约 124KB 死源码），archived-search 守门从锁死层改为锁 components.scss 活规则并把缺了的布局意图（工具行 space-between、lc5 窄档堆叠）实装进活层（D-051/D-016 应用）。提醒中心细节打磨：非待办行（completed/snoozed/skipped）统一 0.68 弱化、动作胶囊 28px 触控对齐 small-button、延期/跳过行补原日期显示。验证：tsc、reminder-actions/archived-search/responsive-layout/ui-docs、pnpm run test:quality（exit 0）、无障碍审计、浅/深视觉走查、宽度走查全绿。下一步：push 验证 CI；15.0-A 续做 dock 四档样式合并与 token 收敛。

2026-09-14 第二批检查点（15 项）：①归档视图外置 render/archived.ts（index.ts 2184→2166 行）②-④归档/今日/回顾三页约 28 处用户可见硬编码迁入 i18n 双语（新增 33 键），editor.ts 番茄钟标签复用 source.*；⑤归档搜索 Esc 清除；⑥重建提醒中心基础布局（v4 层退役后行网格/来源/时间标签/标题行排版一直缺席，已入构建产物并加 4 条守门防再丢失）；⑦行悬浮反馈；⑧动作组 role=group；⑨过时 modern-v4 注释清理；⑩performance.test.cjs 去 sunku 硬编码；⑪提醒投影基准（2000 事项+200 动作实测 <500ms 入门槛）；⑫README 特色补提醒中心；⑬真机清单补 11.0-C 六步；⑭⑮ui-theme/archived-search 守门跟随文件外置。验证：tsc、pnpm run test:quality（exit 0）、浅/深视觉走查、宽度走查全绿；CSS 296740B（预算 318000 内）。下轮批次：回顾页 hero/子导航/设置导航文案 i18n、bind-editor 34 处中文清单化、15.0-A dock 四档样式合并。

2026-09-14 第三批检查点（22 项，i18n 收尾批次）：render 层剩余硬编码全部迁入 i18n 双语——回顾页 hero 全块/三档建议语/子导航 7 标签/4 个折叠标题/智能体分析元信息、设置导航 aria、事项 kind 三标签、bind-editor 图标计数 4 分支与间隔/配额标签与图片错误 3 处、fragments 最近记录条/单位默认/日志展开/分组 3 选项/批量条 5 处、agent 预览弹窗 9 处、analysis-diff/focus-timer/quick-dialog aria（新增 60 键，含复用已有键 8 处）；新增 tests/i18n-hygiene.test.cjs 守门（17 个 render 模块属性级中文为零）入 test:ui；agent-suggestions 守门改锁 i18n 键。验证：tsc、pnpm run test:quality（exit 0）、浅/深视觉走查、宽度走查全绿；CSS 296740B。下轮批次：15.0-A dock 四档样式合并（专轮）、回顾页 hero 徽章 token 化、settings.ts 剩余 group label 盘点。
