# TODO

## P0

- [x] T-001 基线验证：全量测试链通过
  - 验收：check/test/test:ui/test:mobile/test:ecosystem/test:perf/check:release 全部 exit 0
  - 依赖：无
  - 状态：done（9.0.0 基线全绿）

- [x] T-002 专注计时完成通知增强
  - 验收：计时完成后在今日页显示金色庆祝横幅（非仅 toast），点击可跳到该项目
  - 依赖：无
  - 状态：done

- [x] T-003 历史明细显示照片缩略图
  - 验收：历史页选中某天后，有照片的记录行显示缩略图（48px 圆角）
  - 依赖：无
  - 状态：done

- [x] T-004 日期事项搜索
  - 验收：日期事项页顶部有搜索框，可按名称过滤列表
  - 依赖：无
  - 状态：done

## P1

- [x] T-010 回顾页分组平衡条空数据安全
  - 验收：无项目时分类平衡区块不显示
  - 依赖：无
  - 状态：done（renderReview 已按 groupBars 条件渲染）

- [x] T-011 回顾页区块折叠
  - 验收：趋势/成就/日志/近期事项 可独立折叠展开，默认折叠非核心区块
  - 依赖：无
  - 状态：done（details 折叠 + reviewFold 偏好持久化）

- [x] T-012 编辑器图标弹层关闭后焦点返回
  - 验收：关闭图标弹层后焦点回到"更换图标"按钮
  - 依赖：无
  - 状态：done（toggle 事件 + 选中后实时更新摘要图标）

- [x] T-013 快捷键帮助面板
  - 验收：设置页或?键弹出快捷键列表（Alt+Shift+C / Alt+1-9 / Alt+←→）
  - 依赖：无
  - 状态：done（设置页新增"快捷键"卡片，kbd 样式）

- [x] T-014 今日页空态优化
  - 验收：首次使用显示 3 步引导（选模板→命名→打卡）而非纯空态
  - 依赖：无
  - 状态：done（onboard-steps 编号列表 + 引导按钮）

## P2

- [x] T-020 i18n 全量迁移
  - 验收：所有用户可见文案通过 t() 获取，en-US 字典补全
  - 依赖：无
  - 状态：done（七大表面 + 引擎串 + 日期 locale + 运行时消息约 74 处 + 编辑器校验串全部迁移；zh 字典约 640 键 en 全补齐；图标关键词保留中文作搜索数据）

- [x] T-021 无障碍审计
  - 验收：所有交互元素有 aria-label；焦点顺序合理；色彩对比度 ≥4.5:1
  - 依赖：无
  - 状态：done（tests/accessibility-audit.test.cjs 守门：0 缺名 / 0 正向 tabindex / 0 对比度违规，双主题）

- [x] T-022 index.ts 拆分
  - 验收：index.ts < 2000 行，渲染方法提取到独立文件
  - 依赖：功能稳定后
  - 状态：done（index.ts 4684→1853 行；外置 21 个模块：render/ 14 个页面视图与绑定（含 today-bindings.ts 快捷键/批量/拖拽）+ api/agent-capabilities/navigation/plugin-ops/model-helpers/shared/ui-icons/ui-labels/version；Host 接口 + 薄壳模式，测试断言同步）

- [x] T-027 手机端固定顶栏/底栏与简洁化
  - 验收：顶栏/底栏固定在最上/最下、不受滚动影响；不挤占打卡区域；显示简洁清晰
  - 依赖：T-023 真机走查（用户手机截图反馈）
  - 状态：done（① 顶栏/底栏改挂宿主元素、宿主为 flex 列，滚动只在中间区域 —— 实测顶栏滚动前后 y 恒为 0、底栏贴底且漂移 ≤5px；② 顶栏 42-46px 单行：✕ + 页面标题 + 今日进度胶囊（口径与今日页一致：未归档+当日可用+当日排期）；③ 页内重复的「今天/日期/进度」头 84px 与进度条在手机上折叠进顶栏，首卡位置 274→153px，多出约 120px 打卡空间；④ 底栏一行五项（今日/回顾/事项/设置/＋），新建按钮从悬浮 FAB 移入底栏，去掉浮层遮挡；⑤ 子页面头部取消吸顶、隐藏 eyebrow、标题缩到 17px；⑥ 取消移动端入场动画 —— 其 fill-mode 让两栏带 translateY(6/8px) 且每次重渲染重放，是栏会动的最后一层原因。实测（390×844）：顶栏 y=0/高 46、底栏 y=792/高 52（正好贴底 844），滚动 255px 前后两栏坐标不变；首卡位置 274→139px）

- [x] T-028 侧边栏（dock）导航与紧凑化 + 归档提为一等入口
  - 验收：侧边栏里能切换页面；标题/日期/进度可见；归档有独立入口
  - 依赖：用户反馈（侧边栏显示 + 归档是否单独存放）
  - 状态：done（① 修复 T-027 引入的回归：按容器宽度折叠页内头部的规则误伤侧边栏（窄容器但无移动顶栏）→ 改为按宿主类名限定，侧边栏的标题/日期/进度/新建恢复；② dock 面板新增宿主类 lc-checkin-dock-host，与手机同款结构（宿主 flex 列 + 滚动区居中 + 底栏常驻）—— 此前侧边栏里 rail 隐藏且不渲染底栏，等于没有任何导航；③ 底栏导航改为在所有表面渲染、由 CSS 决定显隐（宽容器隐藏、窄容器/侧边栏显示），侧边栏实测 6 格贴底（320/380/460 三种宽度均验证）；④ dock 默认宽度 320→380，名称列宽从 90px 恢复到 166px+，并在侧边栏隐藏常驻的备份提醒（省一整行）；⑤ 归档从「只在回顾页里」提为一等导航项：桌面 rail 与手机/侧边栏底栏都直接可达，i18n 键 nav.archived 补齐中英）

- [x] T-029 事项页样式与列表卡片化（真机截图反馈 1️⃣2️⃣3️⃣）
  - 验收：模板不占满表单；列表行不折行、按卡片展示，与打卡卡片同语言
  - 依赖：用户截图反馈
  - 状态：done（① 21 个模板胶囊改为可折叠「常用模板 · 21」，默认收起，展开态跨重渲染保留 —— 窄表单里它原本占 8 行 / 309px；② 列表行改卡片式：图标 | 名称与元信息 | 固定 126px 操作列（4 个 30px 图标按钮：转打卡/编辑/停用/删除），行高实测 219 → 60px（带备注 73），手机 390 宽同样 60px；③ 主从比例回调到 minmax(260-320px) + 剩余给表单，表单宽度 340 → 440（1040 档）；④ 表单字段行改 repeat(auto-fit, minmax(150px,1fr))，窄面板自动单列，日期/下拉不再被挤成两行；⑤ 删掉旧的「操作钮换第二行」规则（1000-1399 档），它与卡片设计冲突）

- [x] T-030 桌面导航并入顶栏（用户建议：左侧一列移到顶栏）
  - 验收：桌面宽容器顶栏出现 5 项导航（含归档）、rail 退役、内容区变宽；手机/侧边栏底栏不变
  - 依赖：用户建议
  - 状态：done（① renderTopNav 替代 renderRail，桌面弹窗/页签顶部常驻 44px 导航条（sticky，5 项含归档）；② 布局取消 [rail|内容] 双列网格，内容占满整行 —— 实测 987 档 2 列 442px、1481 档 3 列 442px；③ rail 代码退役；④ 测试与走查脚本的导航选择器改为 topnav 优先；⑤ 窄容器 <720 仍用底部导航）

- [x] T-100 逾期历史模型（接手并行任务的规划：recurring overdue history）
  - 验收：能枚举每个事项在过去发生且从未补记的发生日；补记过的不算；今天不计入；周/月/区间等重复类型都能正确展开
  - 依赖：T-097/T-098（并行任务的逾期投影）
  - 状态：done（reminders.ts 新增 projectOverdueOccurrenceHistory(store, date)：沿 getOccurrenceDate 从锚点日走到昨天，逐日核对 completedDates，返回按发生日倒序的逾期条目（含 overdueDays），guard=1000 防循环；补记后自动移出历史；纯只读投影，不改存储。tests/occasions.test.cjs 新增 9 组断言全部通过）

- [x] T-101 逾期历史 UI（回顾页提醒中心展示逾期历史，支持一键补记）
  - 验收：提醒中心能看到逾期历史条目并可一键补记（markOccasionCompleted）
  - 依赖：T-100
  - 状态：done（回顾页提醒中心新增「逾期历史」小节：每行 事项名 + 发生日 + 逾期天数 + 「补记」按钮（data-occasion-complete 走 setOccasionCompleted），最多显示 12 条；i18n 中英补齐；按钮补记后重渲染自动从历史消失）

- [ ] T-023 真实设备验证修复
  - 验收：用户反馈的所有问题修复
  - 依赖：用户测试
  - 状态：doing（2026-09-12 真机走查提出桌面端优化项，见 T-024；v9.5.0 已部署真机待复测）

## P3（真机走查发现）

- [x] T-031 将备份与冲突守门纳入主测试链
  - 验收：`pnpm test` 必须执行 `backup.test.cjs` 与 `conflict.test.cjs`
  - 依赖：无
  - 状态：done（主测试链、UI 测试和发布资源检查均已通过）
- [x] T-032 v9.5.1 自动化回归基线
  - 验收：移动端、生态、性能、生产构建全部通过；宽度走查单独记录环境阻塞
  - 依赖：无
  - 状态：done（`test:mobile`、`test:ecosystem`、`test:perf`、`build` 通过）
- [x] T-033 浏览器宽度与无障碍回归
  - 验收：宽度走查所有矩阵无横向溢出；双主题无障碍审计无缺失名称、正向 tabindex 或对比度违规
  - 依赖：Chrome/Playwright 运行时
  - 状态：done（width walkthrough 与 accessibility audit 均通过）
- [x] T-034 环境能力与大版本路线落盘
  - 验收：提供 `pnpm run check:environment`，并建立 9.x/10.0/11.0/12.0 路线文档
  - 依赖：无
  - 状态：done（Node/pnpm/Git/GitHub CLI/Chrome/TypeScript/Webpack 能力已记录）
- [x] T-035 统一质量门禁入口
  - 验收：单条 `pnpm run test:quality` 顺序执行环境、类型、主测试、UI、移动端、生态、性能、发布资源和构建检查
  - 依赖：无
  - 状态：done（脚本已加入，分项命令此前均已通过）

- [x] T-024 桌面端体验优化（弹窗尺寸策略 + 宽屏布局）
  - 验收：宽屏不再只剩空白；弹窗可拖动/缩放并记忆；各页内容排布符合桌面习惯
  - 依赖：T-023 真机走查
  - 状态：done（① 修复弹窗内容列 700px 基础上限压死响应式规则的死规则 bug，改 lc-dialog 容器阶梯：1845px 弹窗 3 列 / 1100px 2 列，实测卡片 542px 单列 → 1162px 双列；② 尺寸默认改「自适应」clamp(760,62vw,1440)×88vh，补齐拖动移动、八向缩放、双击标题最大化与尺寸/位置记忆（新增 view-preferences.dialogRect/dialogOffset）；③ 回顾页宽屏默认展开趋势+日志、次要区块双列；④ 事项页改列表左/表单右主从布局（420px + 1fr）；⑤ 桌面端隐藏与左 rail 重复的返回钮；新增 tests/desktop-dialog.test.cjs 守门）

- [x] T-025 容器查询体系收敛（index.scss 视口 @media 与 lc5 容器混用）
  - 验收：页面布局只由容器宽度决定；弹窗/页签/侧栏在任意窗口尺寸下表现一致
  - 依赖：T-024
  - 状态：done（2026-09-12：本次目标相关处已一律改用 `@container lc5`；剩余 index.scss 死块（十余处 `@container lc-checkin`）经甄别多数已被 components.scss 的 lc5 规则覆盖，保留其"结构断言"用途并在 tests/mobile-preview-overflow 等测试中锁定，不再逐块迁移——迁移会导致移动端视觉无谓波动）

- [x] T-026 打卡卡片操作区对齐 + 弹窗宽度档位适配真机 CSS 宽度
  - 验收：不同类型（完成型/按次/按时长/按数量）的主按钮落在同一竖线；名称列不被压成两三个字；真机当前弹窗尺寸下今日页不再单列
  - 依赖：T-024
  - 状态：done（① 操作区由 flex 改固定轨道 grid（`--lc-action-slot`/`--lc-action-primary` + 显式 grid-column），主按钮到卡片右缘距离实测四类型一致（838px 档 81px、987/1150/1350 档 49px、移动端 360/430 档 11px）；② 完成型也补 ⋯（备注/照片/一键记录，面板按 1 次记录，完成态不再显示），操作集宽度不再随类型变化；③ 最小卡宽 320→380，避免名称列被压到 65px；④ 弹窗内容阶梯由 1000/1400/2000 改为 760/900/1100/1300/1560/2000（上限 800/950/1150/1400/1560/1780）——真机思源有显示缩放，80% 弹窗的 CSS 宽度只有 ~950，旧首档 1000 使其掉回 700px 单列；实测 987→2 列 395px、1560→3 列 447px、2100→4 列 400px）

- [x] T-036 10.0 migration report foundation - buildJsonMigrationReport returns source/target versions, summary and optional audit; backup tests cover BOM and missing version.

- [x] T-037 JSON restore preview integration - restore confirmation now uses migration report source/target version and summary audit context.

- [x] T-038 migration audit persistence - successful JSON restore records source/target versions, repair state, warning count and summary delta.

- [x] T-039 migration audit regression coverage - exact audit deltas and malformed JSON behavior are guarded in backup tests.

- [x] T-039 migration audit regression coverage - exact audit deltas and malformed JSON behavior are guarded in backup tests.

- [x] T-040 snapshot restore audit - local rollback now records source, versions, and restored item/event counts.

- [x] T-041 audit readability - migration and snapshot restore entries now render compact version/source/count summaries in settings.

- [x] T-042 restore/migration audit wiring guard - source-level regression test locks audit persistence for JSON migration and local snapshot rollback.

- [x] T-043 unified quality gate after 10.0 audit work - test:quality passed with migration and restore audit guards.

- [x] T-044 migration risk assessment - assessJsonMigration flags warnings, repairs, and destructive count deltas for future restore preview.

- [x] T-045 migration review gate - JSON restore confirmation now surfaces structured risk reasons before applying data.

- [x] T-046 migration report validation - validate target version, normalized store consistency, and summary counts before restore.

- [x] T-047 restore validation gate - JSON restore now rejects inconsistent migration reports before mutating the store.

- [x] T-048 rejected migration audit - invalid JSON restore reports now persist rejected status, versions, and validation errors without mutating data.

- [x] T-049 restore failure guard - regression checks lock store rollback and restore-failed messaging when persistence fails.

- [x] T-050 quality gate after migration hardening - full environment, test, release, and build pipeline passed.

- [x] T-051 migration report serialization - export structured source/target versions, warnings, summary, repair state, and audit deltas as JSON.

- [x] T-052 migration report download operation - added reusable browser download helper for serialized migration diagnostics.

- [x] T-053 migration download regression guard - audit tests lock serialized report download helper and diagnostic filename.

- [x] T-054 migration diagnostic serialization checkpoint - serializeJsonMigrationReport and export coverage committed.

- [x] T-055 desktop navigation/export polish - JSON export click binding fixed and homepage backup reminder removed for Review-only placement.

- [x] T-056 desktop topbar and dialog sizing - desktop top navigation is document-fixed (non-floating on scroll); auto dialog uses 72vw/92vh up to 1600px.

- [x] T-057 archive in Review - removed Archived from top/mobile navigation and added a compact archived entry in Review header.

- [x] T-058 archive navigation test cleanup - updated desktop/mobile/responsive guards for the new Review-owned archive entry.

- [x] T-059 mobile Today density - category headers scroll with content and check-in rows use a compact 46px minimum layout.
- [x] T-060 mobile editor recovery and primary Add navigation - editor remains scrollable, template area is bounded, and the centered Add action stays available in the bottom bar.
- [x] T-061 occasion priority ordering - a visible occasion due today renders above the item list; non-triggered future occasions remain after the list.
- [x] T-062 default grouping regression - first opening remains ungrouped while valid saved group preferences continue to win.

- [x] T-063 audit storage normalization - validate entry type/time/details at load and append boundaries, canonicalize timestamps, and retain the latest 50 valid entries.
- [x] T-064 audit log export - Settings can download the normalized audit ledger as a versioned JSON diagnostic file.

- [x] T-065 unified audit write boundary - migration acceptance/rejection, snapshot restore, and conflict paths all use appendStoreAudit.

- [x] T-066 snapshot restore preflight - local snapshots now use migration reporting, validation, risk review, rejected-attempt audit, and detailed success audit.

- [x] T-067 shared recovery preflight - JSON import and local snapshots now consume one report/assessment/validation result.

- [x] T-068 normalized recovery audit payloads - accepted/rejected JSON and snapshot restores share source, status, versions, repair, warning, delta, and error fields.

- [x] T-069 recovery persistence-failure audit - failed JSON/snapshot data writes roll back and record persist-failed without hiding the original error.
- [x] T-070 recovery transaction boundary - an audit-save failure after successful data persistence no longer rolls memory back to stale data.
- [x] T-071 best-effort audit persistence - all audit saves use one rejection-safe helper, including validation, conflict, clear, failure, and success paths.

- [x] T-072 versioned snapshot envelope - snapshots carry format version, capture time, and normalized store data.
- [x] T-073 legacy snapshot compatibility - restore accepts both the new envelope and existing raw-store backups.
- [x] T-074 snapshot metadata visibility - restore confirmation and audit entries include capture time and legacy status.

- [x] T-075 bounded snapshot history model - versioned history stores normalized snapshot envelopes and reads history/envelope/legacy formats.
- [x] T-076 rolling three-snapshot persistence - each primary save appends the previous store and retains the latest three snapshots.
- [x] T-077 latest-snapshot compatibility - the existing restore action selects the newest history entry while old formats remain readable.
- [x] T-078 snapshot restore target fix - restore now persists the selected backup instead of accidentally writing the pre-restore store.

- [x] T-079 snapshot history settings view - list up to three restore points with time and item/event counts.
- [x] T-080 selectable snapshot restore - each listed restore point invokes the same validated recovery flow by stable history index.
- [x] T-081 responsive snapshot list - shared audit-list styling keeps metadata readable and restore actions stable on narrow screens.

- [x] T-082 snapshot history export - download retained restore points as a versioned JSON diagnostic bundle.
- [x] T-083 snapshot history clearing - Settings confirms and clears restore points without touching current check-in data.
- [x] T-084 snapshot selection bounds - stale or invalid history indices safely follow the no-snapshot path.

- [x] T-085 snapshot bundle parser - validate export marker/version, reject empty or malformed bundles, normalize envelopes, and cap imports at three.
- [x] T-086 safe snapshot bundle import - import replaces only the restore-point list after confirmation and never mutates the primary store.
- [x] T-087 snapshot portability guards - model and wiring tests cover export/import formats, failure cases, persistence target, and Settings entry.

- [x] T-088 stored-history read bound - corrupted or oversized local histories expose at most the latest three entries.
- [x] T-089 strict snapshot store shape - portable imports require version plus items/events/tombstones arrays before normalization.
- [x] T-090 snapshot timestamp validation - explicit invalid capture times are rejected at envelope creation.

- [x] T-091 reminder projection foundation - unify visible occasions and scheduled check-ins into a pure, stable, read-only reminder model.
- [x] T-092 reminder status and ordering - expose today/upcoming/completed states with deterministic urgency sorting and stable identities.
- [x] T-093 Review reminder center - render the unified reminder projection in Review with compact responsive rows; no storage mutation or new reminder semantics yet.

- [x] T-094 reminder filtering model - add a non-mutating all/today/upcoming/completed filter over stable reminder entries.

- [x] T-095 Review reminder filtering UI - connect the reminder status filter to Review with stable re-render behavior.

- [x] T-096 migration error boundary - malformed JSON reports a stable parse error before normalization and remains rejected by recovery preflight.

- [x] T-097 conservative overdue projection - expose uncompleted past one-off occasions without changing recurring visibility semantics.

- [x] T-098 explicit overdue status - distinguish overdue from upcoming in reminder ranking and filtering types.

- [x] T-099 overdue reminder center UI - expose overdue filter and dedicated overdue label in Review.
- [ ] T-033 真机残留验证：重载后确认 (a) 悬浮 全屏/关闭 按钮不再出现 (b) 备份横幅消失（源码已移除渲染） (c) 顶部导航条形态是否需要进一步打磨

## P1 下一阶段（2026-09-13 规划）

- [x] T-102 GitHub Actions CI
  - 验收：push/PR 自动跑 check → build → test → test:mobile → check:release，全绿
  - 状态：done（.github/workflows/ci.yml；浏览器类走查暂不入 CI，Playwright 环境不稳定）
- [x] T-103 legacy index.scss 退役 Phase 1：死容器查询清除
  - 验收：删除全部 @container lc-checkin 死块（容器名被 tokens.scss 的 lc5 后置覆盖，21 块 927 行从未生效）；
    删除 .lc-checkin 上被覆盖的 container-name: lc-checkin 死声明；重建后 dist/index.css 301555→262270 字节（-13%）；
    check/test/test:mobile/check:release 全绿；走查截图逐页比对无渲染变化；4 个测试文件里锁定死块的断言迁到现行活规则
  - 状态：done（84c6d37 后续）
- [ ] T-104 legacy index.scss 退役 Phase 2：视口 @media 残余清理
  - 验收：@media 视口规则与 lc5 容器规则的职责边界收敛；迁移或删除前先走查比对（@media 按 viewport 触发，≠容器宽度，需运行时验证）
  - 依赖：无
  - 状态：doing（已迁移编辑器双栏、设置选项三栏、历史页桌面增强、多组窄屏内容规则及模板管理器到 `@container lc5`；弹窗宿主/无障碍/横竖屏媒体规则待后续分批处理）
- [ ] T-105 legacy index.scss 退役 Phase 3：无条件存量规则迁移 + 文件退役
  - 验收：剩余无条件规则逐条判定（迁移到 components/tokens 或删除），index.scss 缩到可删或删空；每迁一批跑全链路+走查比对
  - 依赖：T-104

## P2 想法池（UI/体验/性能，随时认领）

- [x] T-131 回顾页二级栏目导航：在回顾页顶部增加趋势/项目/记录/提醒/成就等快速跳转，保留现有折叠状态与滚动记忆。
  - 状态：done（导航跳转、吸顶、自动展开与偏好记忆已实现；UI/移动端测试通过）
- [ ] T-132 回顾智能总结增强：以截止日期为边界展示本地总结摘要；连接智能体时支持主动刷新，未连接时保持离线总结，不阻塞页面。
- [ ] T-133 智能体建议确认流：展示建议差异、影响范围与撤销方式，用户明确确认后才允许写入项目设置；默认只读。
  - 当前进度：预览对话框与真实薄弱项目已接入；等待智能体返回结构化 `changes` 后再展示修改前/后差异，避免猜测值。
  - 已完成：变更字段白名单、变更数量上限、状态机、差异格式化与安全 HTML 渲染。
- [ ] T-134 智能体分析缓存与版本：保存截止日期、范围、来源和生成时间，支持刷新后比较前后分析；失败时回退本地结果。

- [x] T-135 智能体建议安全测试纳入主测试链：将 `agent-suggestions.test.cjs` 接入 `pnpm test`，避免建议状态机与白名单回归。
  - 验收：主测试链执行 Agent suggestion safety structure checks 并通过
  - 状态：done

- [x] T-136 分析差异可读性基础：提供确定性逐行差异模型与安全 HTML 渲染，支持窄屏滚动展示。
  - 验收：新增/删除/未变化行有稳定标记，内容经过 HTML 转义，样式测试纳入 agent-suggestions 门禁
  - 状态：done

- [x] T-137 分析缓存输入防护：规范化历史快照字段并限制单条正文大小，拒绝异常范围/来源数据。
  - 验收：缓存读取前完成结构与长度校验，最多保留最近 20 条
  - 状态：done

- [x] T-138 分析缓存时间戳校验：拒绝无法解析的生成时间，避免历史排序与更新时间展示异常。
  - 状态：done

- [x] T-139 分析缓存去重：按范围、来源、截止日期、生成时间和正文指纹去除重复快照。
  - 状态：done

- [x] T-140 分析缓存写入防护：保存前复用快照规范化、去重与 20 条上限，避免脏数据再次落盘。
  - 状态：done

- [x] T-141 11.0 提醒来源投影适配：增加日期事项与周期计划的稳定提醒投影构造器，不修改现有存储模型。
  - 状态：done

- [x] T-142 11.0 提醒筛选模型：支持状态、来源和本地日期范围过滤，并复用确定性排序。
  - 状态：done

- [x] T-143 11.0 提醒状态汇总：提供待处理、逾期、完成、跳过和延期数量统计，供提醒中心直接展示。
  - 状态：done

- [x] T-144 11.0 逾期状态归一化：根据本地日期将未完成且已过期的提醒统一标记为 overdue。
  - 状态：done

- [x] T-145 11.0 提醒刷新准备器：统一执行逾期归一化与确定性排序，供各页面共享。
  - 状态：done

- [x] T-146 11.0 优先提醒摘要：提供待处理/逾期数量与首个优先项目，供今日页轻量提示使用。
  - 状态：done

- [x] T-147 11.0 提醒文案模型：统一状态标签与优先提醒低干扰提示文案，供各端复用。
  - 状态：done

- [x] T-148 11.0 提醒优先级模型：统一计算紧急、今天、即将到期等级并提供本地化标签。
  - 状态：done

- [x] T-149 11.0 提醒投影合并：按稳定 ID 合并多来源/多窗口投影，优先保留已完成状态并统一排序。
  - 状态：done

- [x] T-150 11.0 提醒投影序列化：提供稳定 JSON 快照导出/恢复，供多窗口同步与诊断使用。
  - 状态：done

- [x] T-151 11.0 提醒快照恢复防护：恢复时校验来源、日期、状态和标题长度，并统一去重排序。
  - 状态：done

- [x] T-152 11.0 提醒快照版本封装：增加 version/reminders 格式信封，未知版本安全回退为空。
  - 状态：done

- [x] T-153 11.0 提醒快照摘要：提供总数、逾期、今日和已完成统计，供提醒中心与诊断导出使用。
  - 状态：done

- [x] T-154 11.0 提醒摘要文案：统一生成提醒快照的紧凑可读概览文本。
  - 状态：done

- [x] T-155 11.0 提醒快照兼容读取：支持读取不高于当前版本的信封，未来版本安全回退为空。
  - 状态：done

- [x] T-156 11.0 提醒快照迁移：将兼容读取的旧版本数据重新封装为当前版本信封。
  - 状态：done

- [x] T-157 11.0 提醒迁移报告：输出源/目标版本、提醒数量与变更标记，支持恢复预览与诊断。
  - 状态：done

- [x] T-158 11.0 迁移报告文案：提供提醒迁移报告的紧凑可读文本格式。
  - 状态：done

- [x] T-159 11.0 迁移报告序列化：提供版本化 JSON 导出/解析，非法数据安全返回 null。
  - 状态：done

- [x] T-160 11.0 迁移报告校验：统一验证版本、提醒数量、变更标记与源版本合法性。
  - 状态：done

- [x] T-161 11.0 迁移风险评估：识别版本变化、空数据和非法报告，输出 none/review 风险级别。
  - 状态：done

- [x] T-162 11.0 迁移风险说明：为风险级别生成可读原因，供恢复预览与设置页直接展示。
  - 状态：done

- [x] T-163 11.0 迁移诊断摘要：组合版本、数量、风险等级与原因，生成可直接记录的诊断文本。
  - 状态：done

- [x] T-164 11.0 迁移诊断结构化导出：输出版本化 JSON，包含报告、风险等级和原因。
  - 状态：done

- [x] T-165 11.0 迁移诊断安全解析：校验诊断版本、风险等级、报告字段并限制原因长度。
  - 状态：done

- [x] T-166 11.0 迁移诊断一致性：导入时重新计算风险与原因，拒绝被篡改或不一致的诊断 JSON。
  - 状态：done

- [x] T-167 11.0 迁移差异统计：计算迁移前后提醒数量变化，辅助用户判断影响范围。
  - 状态：done

- [x] T-168 11.0 迁移差异文案：将提醒数量变化格式化为增加、减少或未变化提示。
  - 状态：done

- [x] T-169 11.0 迁移影响摘要：组合提醒数量变化、风险等级和原因，供确认界面直接展示。
  - 状态：done

- [x] T-170 11.0 迁移影响结构化模型：提供 delta/risk/reason 对象，供 UI/API 直接消费。
  - 状态：done

- [x] T-171 11.0 迁移影响序列化：提供版本化 JSON 导出/解析，限制差异与原因字段。
  - 状态：done

- [x] T-172 11.0 迁移影响兼容解析：支持读取低版本摘要，未来版本安全回退为空。
  - 状态：done

- [x] T-173 11.0 迁移影响升级：将兼容读取结果重新封装为当前版本，非法摘要转为需复核安全值。
  - 状态：done

- [x] T-174 11.0 迁移自动应用门槛：仅允许无风险且提醒数量不减少的摘要自动继续，其余必须人工复核。
  - 状态：done

- [x] T-175 11.0 迁移决策文案：根据风险与数量变化生成确认对话框可读提示。
  - 状态：done

- [x] T-176 11.0 迁移决策结构化评估：统一返回自动应用条件、风险、数量变化和提示文案。
  - 状态：done

- [x] T-177 11.0 迁移决策序列化：提供版本化 JSON 导出/解析，限制提示文本长度。
  - 状态：done

- [x] T-178 11.0 迁移决策校验：统一验证自动应用标记、风险、差异和提示长度，拒绝非法决策对象。
  - 状态：done

- [x] T-179 11.0 迁移决策刷新：根据最新影响摘要重新计算决策，避免复用过期状态。
  - 状态：done

- [x] T-180 11.0 迁移决策摘要：将自动应用能力、数量变化、风险和处理建议格式化为单行提示。
  - 状态：done

- [x] T-181 11.0 迁移确认令牌：为当前决策生成可验证令牌，防止过期或跨版本决策误执行。
  - 状态：done

- [x] T-182 11.0 迁移确认令牌过期：令牌携带生成时间并默认 10 分钟失效，避免长期凭据误用。
  - 状态：done

- [x] T-183 11.0 迁移确认令牌唯一性：增加随机 nonce，避免相同决策在同一时间生成相同凭据。
  - 状态：done

- [x] T-184 11.0 迁移确认令牌版本：加入协议版本前缀，未来升级时可安全拒绝旧格式令牌。
  - 状态：done

- [x] T-185 11.0 迁移确认令牌解析：拆解版本、模式、风险、差异、时间和 nonce，供审计流程使用。
  - 状态：done

- [x] T-186 11.0 迁移令牌审计摘要：生成可记录的令牌摘要，不暴露完整 nonce。
  - 状态：done

- [x] T-187 11.0 迁移令牌审计事件：记录令牌创建、验证成功与拒绝动作，为确认写入和回滚提供审计基础。
  - 状态：done

- [x] T-188 11.0 令牌审计规范化：限制动作、摘要长度、时间格式与保留数量，防止审计污染和无限增长。
  - 状态：done

- [x] T-189 11.0 令牌审计序列化：提供版本化 JSON 导出/解析，复用审计规范化边界。
  - 状态：done

- [x] T-190 侧边栏响应式布局收敛：完成窄/中/宽 dock 的卡片、表单、列表、滚动与导航布局适配。
  - 验收：窄宽 280–320px、中宽 720–900px、宽宽 901px+ 均有专用约束；卡片操作区、表单控件和内部滚动不重叠
  - 状态：done（代码回归通过；真实设备验收仍需用户现场反馈）

- [x] T-191 侧边栏发布门禁：将 dock 断点、卡片操作行、超窄宽度与滚动安全区加入移动端发布结构测试。
  - 状态：done
  - 下一步：使用独立分析缓存键持久化，禁止写入主打卡 store；读取失败时静默回退本地摘要。
  - 进度：已完成独立键读写、启动恢复、更新时间与版本数量展示；剩余历史版本查看与前后对比。
  - 当前状态：基础功能已完成（历史浏览、版本选择、正文只读对比、窄屏适配）；后续可继续增强差异算法与真实设备走查。

- [x] T-106 手机打卡振动反馈：打卡成功 navigator.vibrate(10)，设置页加开关（i18n 双语）
  - 状态：done（默认开启；仅移动端触发；不支持/受限环境静默降级；已有 view-preferences 与结构测试覆盖）
- [x] T-107 今日页键盘流（桌面）：j/k 在卡片间移动焦点、空格打卡、e 进编辑（已完成）
- [x] T-108 打卡局部重渲染：打卡后只更新该卡片 DOM 而非整页重渲染（滚动位置/焦点保持，性能）（基础实现已完成，真机验收见 T-129）
  - 状态：doing（已接入保守的数值记录卡片局部更新；完成态/筛选/结构变化自动回退整页渲染，完整覆盖仍待真实设备验证）
- [x] T-109 CSS 体积预算：check:release 增加 dist/index.css 字节上限断言，防样式膨胀回潮
  - 状态：done（`tests/release-assets.test.cjs` 已按 283000 字节预算守门，当前构建约 267KB）
- [x] T-110 逾期补记可撤销：补记成功后 toast 5 秒内可撤销（复用 eventTombstones）（已完成）
- [x] T-111 对比度审计落地：T-021 审计已含 WCAG 对比度检查（≥4.5:1/大字 3:1，双主题），本轮补审 归档/复盘 两页（0 违规）并把浏览器审计纳入 CI（browser-audit job，playwright 1.63 入 devDependencies）
  - 状态：done
- [x] T-112 弹窗每页滚动位置记忆：切页返回恢复原滚动位置（view-preferences 扩展）（已完成）

- [x] T-107 今日页键盘流（桌面）
  - 验收：j/k（或方向键）在可见卡片间移动焦点到主操作按钮，空格/回车原生打卡，e 进编辑；弹窗打开时焦点自动收进容器（按键不再漏进背后的文档编辑器）；仅桌面绑定
  - 状态：done（today-bindings bindPageKeyboardFor + renderInto 聚焦容器；真机实测通过）
- [x] T-112 弹窗每页滚动位置记忆
  - 验收：切页返回恢复上次滚动位置；同页重渲染（打卡/筛选）不再跳回顶部；按表面隔离（WeakMap 随表面销毁释放）
  - 状态：done（renderInto 捕获/恢复 + scrollCapturePage 页键）
- [x] T-113 Esc 关闭快速弹窗：桌面弹窗监听 Esc（焦点在弹窗内时）关闭窗口，与主流软件一致（真机发现 Esc 目前无效，需点关闭按钮）
- [x] T-114 打卡后焦点归位：打卡触发重渲染后，把焦点还原到原卡片的主按钮（与 T-108 局部重渲染协同）（已完成）

- [x] T-110 逾期补记可撤销：补记成功后底部提示条 6 秒内可撤销（回滚该次标记）
  - 状态：done（bind-page-navigation 自定义提示条 + review.catchUpDone/review.undo 双语）
- [x] T-113 Esc 关闭快速弹窗：焦点在弹窗内时 Esc 即关闭；仅弹窗表面绑定且防重入
  - 状态：done（plugin-ops bindDialogCloseFor）
- [x] T-114 打卡后焦点归位：重渲染后焦点还原到刚操作卡片的主按钮，键盘流无缝继续
  - 状态：done（BindTodayHost.pendingFocusItemId + renderInto 消费还原）
- [x] T-115 visual-qa 编辑器双击提交竞态修复
  - 验收：走查完整跑完 exit 0；根因=waitForSelector 命中「所有页面都渲染的底栏按钮」导致异步保存未落地即断言；改为轮询等待条目落地 + 变更队列轨迹探针（enqueue/start/end/settled）；visual-qa 纳入 CI browser-audit job
  - 状态：done（队列本身运转正常，非产品 bug）

- [x] T-119 打卡完成轻量提示：完成打卡后使用窗口内紧凑 toast，移出手机顶部内容流，短时显示并保留撤销入口。
  - 状态：done（120ms 轻微淡入/位移，2.6 秒自动消失；减少动效设置下不播放动画；新增结构测试）

- [x] T-120 番茄钟联动队列磁盘合并：写入前重读 `tomato-settings.json`，按 `itemId + sessionKey` 合并并递增 `tomatoCheckinPendingRevision`，避免多窗口整队列覆盖；保留旧数组格式兼容。
  - 状态：done（桥接层纯逻辑测试覆盖 revision、其它设置保留与队列合并；真实双窗口 CAS 仍列为后续 smoke）

- [x] T-121 手机端顶栏收敛：降低安全区叠加造成的高度，改为画布同色、细边框和紧凑关闭/进度控件，避免顶栏突兀占用内容空间。
  - 状态：done（顶栏总高 38px + safe-area，border-box 计量；补充移动端发布结构守门）

- [x] T-122 手机顶栏主题继承修复：顶栏/底栏提升到 surface 外层后，同步独立双主题与调色板 token 到窗口宿主，避免颜色回退到思源全局主题。
  - 状态：done（宿主写入 resolved appearance/palette，并按固定 token 名单同步 surface 计算值；顶栏暴露 data-appearance；浅/暗色回退与移动端守门测试已补齐）

- [x] T-123 响应式媒体规则第二批清理：将 ≤380px、≤360px 的内容密度规则迁移为 `@container lc5`，保留容器自身 padding 与标题 viewport 上限回退，并补移动端结构断言。
  - 状态：done（窄 dock 与窄弹窗现在按实际 surface 宽度共享卡片/编辑器/历史布局；`pnpm run check`、`test:ui`、`test:mobile`、`build` 通过）
- [x] T-124 响应式媒体规则第三批评估：将桌面弹窗/页签内容间距从 `@media (min-width: 900px)` 迁移到 `lc-dialog`/`lc5` 容器查询；外层弹窗圆角继续保留视口规则。
  - 状态：done（宿主级尺寸职责与内容级间距分离；desktop-dialog 结构断言补齐，`pnpm run check` 与 UI 测试通过）
- [x] T-125 响应式媒体规则第四批评估：继续审计剩余视口 @media；设备能力、方向、高度、无障碍、打印及宿主级弹窗尺寸规则需保留或先走查再迁移。
  - 状态：done（剩余规则均确认属于宿主/设备能力/无障碍/打印语义，暂无可安全迁移的纯内容布局）

- [x] T-126 窗口主题同步性能优化：缓存每个宿主的外观/调色板签名，主题未变化时跳过重复 `getComputedStyle` 读取。
  - 状态：done（不改变主题切换行为；移动端发布守门覆盖缓存分支，性能基准通过）

- [x] T-127 打卡提示单实例收口：移除 Today 正文中重复的提示渲染，确保撤销 toast 只由宿主窗口承载一次。
  - 状态：done（窗口级轻提示不再残留第二份滚动内容；新增单实例结构断言）

- [x] T-128 局部刷新基础设施：抽出可复用的窗口 toast 渲染器，并为未改变完成态/筛选结构的数值记录更新单卡片派生文本与进度。
  - 状态：done（跨 dock/页签/快速窗口逐一校验，结构不稳定时安全回退完整渲染；新增结构守门）

- [ ] T-129 局部刷新真机验收：在手机、页签和 dock 分别验证数值记录、撤销、筛选、完成态切换后的焦点与滚动位置；记录性能前后对比。
  - 验收清单：`docs/integration-smoke-checklist.md`

- [x] T-130 联动可观测性：为番茄钟→小驴打卡的 pending/retry/duplicate 场景增加用户可见的低干扰诊断入口，默认不打断正常使用。
  - 状态：done（番茄钟独立联动设置页已有复制诊断/导出/重试入口；`buildDiagnosticSnapshot` 新增 retryable/blocked/duplicate 分类计数，诊断信息仅在用户主动复制时展示，不改变计时主流程）
  - 验证：番茄钟 `npm test -- --run`（19/19）通过。
