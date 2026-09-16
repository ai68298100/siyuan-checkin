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

- [x] T-130 桌面事项页顶栏与完整信息展示
  - 验收：事项页顶栏与其他桌面页面同一水平基线；事项列表显示类型、重复规则、下次日期、倒计时和备注；转为打卡项目后才进入 Today 卡片
  - 依赖：T-023 真实客户端复测
  - 状态：done（顶栏提升到宿主 flex 层；事项详情行拆分并扩展桌面列表列宽；结构与全量自动化验证通过，真实客户端截图待现场复测）

- [x] T-131 设置页恢复点与同步审计折叠
  - 验收：恢复点和同步审计仅直显最新一条，其余记录可展开查看
  - 依赖：无
  - 状态：done（新增 details 折叠、双语文案与结构测试；默认不占用额外空间）

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
- [x] T-104 legacy index.scss 退役 Phase 2：视口 @media 残余清理
  - 验收：@media 视口规则与 lc5 容器规则的职责边界收敛；迁移或删除前先走查比对（@media 按 viewport 触发，≠容器宽度，需运行时验证）
  - 依赖：无
  - 状态：done（内容布局均已迁到 `@container lc5`；删除窄屏+减弱动画重复规则。保留的 viewport 规则仅负责无法由子容器查询表达的弹窗外壳尺寸/圆角、屏幕高度与方向，以及 prefers/forced-colors/reduced-motion/pointer/hover/print 等设备和无障碍能力）
- [ ] T-105 legacy index.scss 退役 Phase 3：无条件存量规则迁移 + 文件退役
  - 验收：剩余无条件规则逐条判定（迁移到 components/tokens 或删除），index.scss 缩到可删或删空；每迁一批跑全链路+走查比对
  - 依赖：T-104

## P2 想法池（UI/体验/性能，随时认领）

### T-199~T-218 分析历史对比闭环（2026-09-14）

- [x] T-199 分析历史弹窗改用宿主内存中的受校验快照，不再从 DOM dataset 反序列化正文。
- [x] T-200 ReviewViewContext 移除不再需要的历史元数据镜像字段。
- [x] T-201 历史列表保留截至日期、统计范围、来源和生成时间。
- [x] T-202 基准版本选择器接入真实快照索引。
- [x] T-203 对比版本选择器接入真实快照索引。
- [x] T-204 两个版本默认选中最近的相邻快照。
- [x] T-205 只有一个快照时禁用交换与对比操作。
- [x] T-206 增加交换基准/对比版本按钮。
- [x] T-207 增加索引越界和缺失快照保护。
- [x] T-208 增加同版本对比保护。
- [x] T-209 对比结果显示基准到目标的方向。
- [x] T-210 对比结果显示双方快照元信息。
- [x] T-211 接入既有逐行差异模型。
- [x] T-212 接入安全 HTML 差异渲染器，正文继续转义。
- [x] T-213 差异摘要改为 i18n 文案。
- [x] T-214 空差异提示改为 i18n 文案。
- [x] T-215 新增中文历史对比标题、控制、状态和错误文案。
- [x] T-216 新增英文历史对比标题、控制、状态和错误文案。
- [x] T-217 对比状态加入 aria-live，选择控件和交换按钮补齐 aria-label。
- [x] T-218 新增结构守门并接入 test/test:ui，完成类型检查与生产构建验证。

### T-219~T-238 离线本地总结增强（2026-09-14）

- [x] T-219 新增独立 `local-summary` 纯函数模块，不改变主数据协议。
- [x] T-220 定义本地总结模型的空数据/起步/稳步/高完成四档语气。
- [x] T-221 统一计算周期完成率并四舍五入为整数百分比。
- [x] T-222 统计总记录数、已完成项目数和计划项目数。
- [x] T-223 输出本地总结的开始日期和结束日期。
- [x] T-224 计算最佳项目候选并保留稳定排序。
- [x] T-225 最佳项目排序增加完成率优先级。
- [x] T-226 最佳项目排序增加记录数次级权重。
- [x] T-227 最佳项目排序增加中文名称确定性 tie-break。
- [x] T-228 计算需要关注的计划项目候选。
- [x] T-229 关注项目排序优先选择较低完成率。
- [x] T-230 单项目时避免重复输出最佳与关注提示。
- [x] T-231 无数据时输出明确的下一步行动提示。
- [x] T-232 有数据时输出周期统计概览。
- [x] T-233 有数据时输出最佳项目提示。
- [x] T-234 有多个项目时输出需要关注的项目提示。
- [x] T-235 回顾页无智能体时自动展示本地总结。
- [x] T-236 智能体总结存在时保持智能体正文优先。
- [x] T-237 本地总结增加离线标识和独立视觉样式。
- [x] T-238 新增四档语气、排序、空态、渲染和接线守门并纳入 test/test:ui。

### T-239~T-258 今日页优先提醒摘要（2026-09-14）

- [x] T-239 新增独立优先提醒选择模块，不修改提醒存储。
- [x] T-240 仅从现有提醒投影筛选逾期和今日状态。
- [x] T-241 逾期提醒优先于今日提醒。
- [x] T-242 同状态按剩余天数稳定排序。
- [x] T-243 同日期按名称稳定排序。
- [x] T-244 同名条目按稳定 ID 排序。
- [x] T-245 生成优先提醒数量摘要。
- [x] T-246 优先提醒摘要复制首条数据，避免共享可变对象。
- [x] T-247 对非优先状态返回 none。
- [x] T-248 今日页接入独立提醒动作数据。
- [x] T-249 今日页渲染逾期优先横幅。
- [x] T-250 今日页渲染今日优先横幅。
- [x] T-251 横幅显示提醒来源和名称。
- [x] T-252 横幅显示低干扰状态提示。
- [x] T-253 打卡来源点击后定位对应卡片。
- [x] T-254 定位后滚动卡片进入视口并聚焦主操作。
- [x] T-255 事项来源点击后进入事项页。
- [x] T-256 定位动作使用 CSS.escape 防止特殊 ID 选择器问题。
- [x] T-257 优先提醒补齐中英文文案和响应式样式。
- [x] T-258 新增模型/渲染/接线结构守门并接入 test/test:ui。

### T-259~T-278 回顾智能总结刷新与截止日期语义（2026-09-14）

- [x] T-259 回顾页总结上下文显式暴露刷新状态。
- [x] T-260 智能体刷新期间显示进行中状态。
- [x] T-261 刷新按钮进行中时禁用，防止重复请求。
- [x] T-262 刷新按钮补齐专用 aria-label。
- [x] T-263 刷新按钮恢复时保持原有总结优先级。
- [x] T-264 生成成功后清理刷新状态。
- [x] T-265 生成失败后清理刷新状态并保留错误提示。
- [x] T-266 日期跨天时取消悬挂刷新状态。
- [x] T-267 离开回顾页时取消悬挂刷新状态。
- [x] T-268 防止刷新请求并发执行。
- [x] T-269 截止日期统一使用 i18n 文案。
- [x] T-270 上次更新时间统一使用 i18n 文案。
- [x] T-271 历史版本数量统一使用 i18n 文案。
- [x] T-272 自定义范围开始标签迁移 i18n。
- [x] T-273 自定义范围结束标签迁移 i18n。
- [x] T-274 自定义范围分隔符迁移 i18n。
- [x] T-275 自定义范围应用按钮迁移 i18n。
- [x] T-276 新增回顾总结刷新结构守门测试。
- [x] T-277 回顾总结刷新接线纳入现有 agent-suggestions 测试链。
- [x] T-278 完成类型检查、质量门禁和生产构建验证。

### T-279~T-298 智能体建议确认安全边界（2026-09-14）

- [x] T-279 建议状态标签统一使用 i18n。
- [x] T-280 建议影响摘要统一使用 i18n。
- [x] T-281 建议字段变更摘要统一使用 i18n。
- [x] T-282 增加建议可确认性纯函数判断。
- [x] T-283 仅 pending 且要求确认的建议允许进入确认流程。
- [x] T-284 空变更建议禁止确认。
- [x] T-285 增加已确认建议应用结果模型。
- [x] T-286 非 confirmed 建议不会修改 store。
- [x] T-287 应用建议前校验字段 before 基线。
- [x] T-288 检测建议与当前项目之间的字段冲突。
- [x] T-289 冲突字段跳过且保留其他可应用变更。
- [x] T-290 应用结果返回 applied/skipped 计数。
- [x] T-291 应用结果返回稳定冲突标识。
- [x] T-292 应用建议保持纯函数，不触发持久化。
- [x] T-293 建议预览文案迁移 i18n。
- [x] T-294 建议预览继续明确不会自动写入。
- [x] T-295 新增确认模型运行时回归测试。
- [x] T-296 扩展建议结构守门覆盖 i18n 与冲突保护。
- [x] T-297 将确认测试接入主测试链。
- [x] T-298 完成类型检查、质量门禁和生产构建验证。

### T-299~T-318 智能体建议信封序列化与输入防护（2026-09-14）

- [x] T-299 建议信封 ID 长度上限。
- [x] T-300 建议标题长度上限。
- [x] T-301 建议原因长度上限。
- [x] T-302 建议创建时间格式校验。
- [x] T-303 建议状态枚举校验。
- [x] T-304 强制要求 requiresConfirmation 标记。
- [x] T-305 建议字段变更复用白名单校验。
- [x] T-306 建议字段变更数量上限复用。
- [x] T-307 建议信封文本字段去除首尾空白。
- [x] T-308 建议信封 confirmedAt 时间校验。
- [x] T-309 错误信息长度截断。
- [x] T-310 新增建议 JSON 序列化函数。
- [x] T-311 新增建议 JSON 安全解析函数。
- [x] T-312 解析 malformed JSON 静默返回 undefined。
- [x] T-313 禁止未知字段通过应用边界。
- [x] T-314 防止原型污染字段写入。
- [x] T-315 扩展建议确认模型回归测试。
- [x] T-316 增加信封边界与时间校验断言。
- [x] T-317 将序列化测试纳入 agent-suggestions 链。
- [x] T-318 完成类型检查、质量门禁和生产构建验证。

### T-319~T-338 智能体建议审计轨迹模型（2026-09-14）

- [x] T-319 定义建议审计动作枚举。
- [x] T-320 定义建议审计记录结构。
- [x] T-321 增加建议审计协议版本号。
- [x] T-322 增加建议审计保留上限。
- [x] T-323 校验审计建议 ID。
- [x] T-324 校验审计动作枚举。
- [x] T-325 校验审计时间戳。
- [x] T-326 校验 applied 非负整数。
- [x] T-327 校验 skipped 非负整数。
- [x] T-328 校验冲突字段数组长度与文本。
- [x] T-329 校验拒绝原因长度。
- [x] T-330 新增审计记录规范化函数。
- [x] T-331 新增审计 JSON 序列化函数。
- [x] T-332 新增审计 JSON 解析函数。
- [x] T-333 未来审计版本安全回退为空。
- [x] T-334 malformed 审计 JSON 安全回退为空。
- [x] T-335 新增审计追加函数并复用上限。
- [x] T-336 新增按动作统计摘要函数。
- [x] T-337 扩展建议测试覆盖审计边界。
- [x] T-338 完成类型检查、质量门禁和生产构建验证。

### T-339~T-358 建议确认令牌与可撤销应用（2026-09-14）

- [x] T-339 定义建议确认/取消决策类型。
- [x] T-340 增加决策令牌协议版本。
- [x] T-341 增加决策令牌默认 TTL。
- [x] T-342 增加决策 nonce 长度上限。
- [x] T-343 新增决策令牌生成函数。
- [x] T-344 令牌绑定建议 ID。
- [x] T-345 令牌绑定确认或取消动作。
- [x] T-346 令牌携带生成时间。
- [x] T-347 新增决策令牌解析函数。
- [x] T-348 拒绝错误版本令牌。
- [x] T-349 拒绝过期令牌。
- [x] T-350 拒绝未来时间令牌。
- [x] T-351 拒绝跨建议 ID 令牌。
- [x] T-352 新增可撤销应用结果模型。
- [x] T-353 撤销前校验当前字段仍为建议值。
- [x] T-354 撤销时保留用户后续修改。
- [x] T-355 返回 reverted/skipped/conflicts 结果。
- [x] T-356 扩展令牌与撤销运行时测试。
- [x] T-357 扩展结构守门覆盖 TTL 和冲突语义。
- [x] T-358 完成类型检查、质量门禁和生产构建验证。

### T-359~T-378 建议决策令牌消费与撤销审计（2026-09-14）

- [x] T-359 定义决策消费结果模型。
- [x] T-360 消费令牌前过滤非法已消费记录。
- [x] T-361 已消费令牌拒绝重放。
- [x] T-362 消费令牌绑定 expected decision。
- [x] T-363 消费成功后追加令牌并保留最近 100 条。
- [x] T-364 区分 invalid 与 replayed 原因。
- [x] T-365 区分 wrong-decision 原因。
- [x] T-366 新增带令牌确认状态迁移入口。
- [x] T-367 新增带令牌取消状态迁移入口。
- [x] T-368 无效确认令牌不会改变状态。
- [x] T-369 无效取消令牌不会改变状态。
- [x] T-370 新增应用结果审计转换函数。
- [x] T-371 应用无变更结果标记 rejected。
- [x] T-372 新增撤销结果审计转换函数。
- [x] T-373 撤销审计保留 revert 原因。
- [x] T-374 新增确认/取消决策审计转换函数。
- [x] T-375 决策审计动作保持稳定映射。
- [x] T-376 扩展运行时测试覆盖令牌重放与撤销。
- [x] T-377 扩展结构守门覆盖审计转换。
- [x] T-378 完成类型检查、质量门禁和生产构建验证。

### T-379~T-398 建议确认工作流门面（2026-09-14）

- [x] T-379 新增 suggestion-workflow 独立模块。
- [x] T-380 定义工作流状态结构。
- [x] T-381 工作流复制建议变更，避免共享引用。
- [x] T-382 工作流初始化空已消费令牌列表。
- [x] T-383 工作流初始化空审计列表。
- [x] T-384 统一决策令牌消费入口。
- [x] T-385 统一确认状态迁移入口。
- [x] T-386 统一取消状态迁移入口。
- [x] T-387 工作流返回 accepted 标记。
- [x] T-388 工作流返回 invalid/replayed/wrong-decision 原因。
- [x] T-389 工作流应用已确认建议。
- [x] T-390 工作流追加应用审计。
- [x] T-391 工作流撤销建议应用。
- [x] T-392 工作流追加撤销审计。
- [x] T-393 工作流按动作生成审计统计。
- [x] T-394 工作流保持纯函数不直接持久化。
- [x] T-395 新增工作流运行时测试。
- [x] T-396 覆盖重放令牌测试。
- [x] T-397 覆盖确认/取消双路径测试。
- [x] T-398 完成类型检查、质量门禁和生产构建验证。

### T-399~T-418 建议工作流状态恢复与摘要（2026-09-14）

- [x] T-399 定义工作流协议版本。
- [x] T-400 限制工作流已消费令牌数量。
- [x] T-401 定义工作流摘要结构。
- [x] T-402 新增工作流状态规范化函数。
- [x] T-403 复用建议信封规范化边界。
- [x] T-404 复用建议审计规范化边界。
- [x] T-405 过滤非法消费令牌。
- [x] T-406 新增工作流 JSON 序列化函数。
- [x] T-407 新增工作流 JSON 解析函数。
- [x] T-408 拒绝未知工作流版本。
- [x] T-409 malformed 工作流 JSON 安全回退。
- [x] T-410 新增可撤销资格判断。
- [x] T-411 撤销资格按最新应用审计判断。
- [x] T-412 撤销后禁止重复撤销。
- [x] T-413 新增工作流状态摘要函数。
- [x] T-414 摘要输出当前状态。
- [x] T-415 摘要输出可应用/可撤销标记。
- [x] T-416 摘要输出令牌和审计数量。
- [x] T-417 扩展工作流测试覆盖恢复与摘要。
- [x] T-418 完成类型检查、质量门禁和生产构建验证。

### T-419~T-438 建议工作流面板渲染（2026-09-14）

- [x] T-419 新增建议工作流面板渲染模块。
- [x] T-420 面板显示建议标题。
- [x] T-421 面板显示当前状态标签。
- [x] T-422 面板显示建议原因。
- [x] T-423 面板显示令牌/审计统计。
- [x] T-424 面板显示已应用/已拒绝统计。
- [x] T-425 面板展示最多 8 条字段变更。
- [x] T-426 字段名渲染前转义。
- [x] T-427 before/after 值渲染前转义。
- [x] T-428 无变更时显示空态。
- [x] T-429 pending 状态显示确认按钮。
- [x] T-430 pending 状态显示取消按钮。
- [x] T-431 非 pending 状态显示撤销按钮。
- [x] T-432 不可撤销时禁用撤销按钮。
- [x] T-433 确认/取消按钮补齐 aria-label。
- [x] T-434 撤销按钮补齐 aria-label。
- [x] T-435 新增工作流面板样式。
- [x] T-436 新增工作流面板结构守门测试。
- [x] T-437 将面板测试接入 agent-suggestions 链。
- [x] T-438 完成类型检查、质量门禁和生产构建验证。

### T-439~T-458 结构化智能体输出接入（2026-09-14）

- [x] T-439 扩展 SummaryProvider 兼容结构化返回值。
- [x] T-440 保持旧版纯文本 provider 兼容。
- [x] T-441 定义结构化 summary text 字段。
- [x] T-442 定义 suggestions 数组字段。
- [x] T-443 增加 summary 文本长度上限。
- [x] T-444 新增单条建议规范化函数。
- [x] T-445 建议标题/原因/ID 复用长度边界。
- [x] T-446 建议变更复用字段白名单。
- [x] T-447 建议变更复用数量上限。
- [x] T-448 过滤无变更建议。
- [x] T-449 结构化建议最多保留 5 条。
- [x] T-450 新增 summary provider 结果规范化函数。
- [x] T-451 index 生成总结时消费规范化结果。
- [x] T-452 结构化结果创建 pending workflow。
- [x] T-453 保持分析历史只保存 summary 文本。
- [x] T-454 API summarize 返回规范化文本。
- [x] T-455 回顾页接入可选建议工作流面板。
- [x] T-456 日期/范围切换清理旧建议工作流。
- [x] T-457 新增结构化输出与面板接线守门测试。
- [x] T-458 完成类型检查、质量门禁和生产构建验证。

- [x] T-131 回顾页二级栏目导航：在回顾页顶部增加趋势/项目/记录/提醒/成就等快速跳转，保留现有折叠状态与滚动记忆。
  - 状态：done（导航跳转、吸顶、自动展开与偏好记忆已实现；UI/移动端测试通过）
- [x] T-132 回顾智能总结增强：以截止日期为边界展示本地总结摘要；连接智能体时支持主动刷新，未连接时保持离线总结，不阻塞页面。
  - 状态：done（本地离线总结、智能体优先、主动刷新与失败回退均已实现）
- [x] T-133 智能体建议确认流：展示建议差异、影响范围与撤销方式，用户明确确认后才允许写入项目设置；默认只读。
  - 状态：done（变更白名单、数量上限、差异预览、确认/取消/撤销、持久化与审计闭环已完成）
- [x] T-134 智能体分析缓存与版本：保存截止日期、范围、来源和生成时间，支持刷新后比较前后分析；失败时回退本地结果。
  - 状态：done（独立缓存键、历史版本、相邻版本对比、窄屏适配与失败回退已完成）

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

- [x] T-192 提醒模型主测试门禁：将 reminder-projection 测试接入 `pnpm test`，避免核心提醒逻辑仅由 UI 链覆盖。
  - 状态：done

- [x] T-193 提醒状态迁移校验：阻止完成状态回退和非法跳转，统一状态机边界。
  - 状态：done

- [x] T-194 提醒状态迁移原因：记录状态变化来源（用户/日期/同步）与时间，非法迁移返回 null。
  - 状态：done

- [x] T-195 状态迁移记录规范化：校验状态、来源和时间，并限制迁移记录保留数量。
  - 状态：done

- [x] T-196 状态迁移日志序列化：提供版本化 JSON 导出/导入，复用迁移记录规范化边界。
  - 状态：done

- [x] T-197 状态迁移日志摘要：统计用户、日期和同步来源的迁移次数，供审计面板概览。
  - 状态：done

- [x] T-198 状态迁移日志筛选：支持按 ISO 时间范围查询迁移记录，供审计面板查看近期变化。
  - 状态：done
  - 下一步：使用独立分析缓存键持久化，禁止写入主打卡 store；读取失败时静默回退本地摘要。
  - 进度：已完成独立键读写、启动恢复、更新时间与版本数量展示；剩余历史版本查看与前后对比。
  - 当前状态：基础功能已完成（历史浏览、版本选择、正文只读对比、窄屏适配）；后续可继续增强差异算法与真实设备走查。

- [x] T-106 手机打卡振动反馈：打卡成功 navigator.vibrate(10)，设置页加开关（i18n 双语）
  - 状态：done（默认开启；仅移动端触发；不支持/受限环境静默降级；已有 view-preferences 与结构测试覆盖）
- [x] T-107 今日页键盘流（桌面）：j/k 在卡片间移动焦点、空格打卡、e 进编辑（已完成）
- [x] T-108 打卡局部重渲染：打卡后只更新该卡片 DOM 而非整页重渲染（滚动位置/焦点保持，性能）（基础实现已完成，真机验收见 T-129）
  - 状态：done（已接入保守的数值记录卡片局部更新；完成态/筛选/结构变化自动回退整页渲染；真实设备体验验收单独保留在 T-129）
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

### T-819~T-848 9.8 稳定化自动化护栏（2026-09-14）

- [x] T-819 桌面顶栏宿主层级守门
- [x] T-820 移动底栏宿主层级守门
- [x] T-821 Toast 单实例接线守门
- [x] T-822 页面滚动记忆结构守门
- [x] T-823 打卡后焦点恢复结构守门
- [x] T-824 UI 图标归一化守门
- [x] T-825 最新恢复点直显守门
- [x] T-826 较早恢复点标签守门
- [x] T-827 恢复点动作入口守门
- [x] T-828 恢复点导出入口守门
- [x] T-829 恢复点清空入口守门
- [x] T-830 同步审计最新项直显守门
- [x] T-831 同步审计旧项折叠守门
- [x] T-832 审计导出入口守门
- [x] T-833 审计清空入口守门
- [x] T-834 事项转打卡入口守门
- [x] T-835 事项编辑入口守门
- [x] T-836 事项启停入口守门
- [x] T-837 事项删除入口守门
- [x] T-838 事项元数据结构守门
- [x] T-839 事项备注展示守门
- [x] T-840 设置折叠专用样式守门
- [x] T-841 设置折叠容器间距守门
- [x] T-842 设置折叠展开反馈守门
- [x] T-843 事项元数据响应式守门
- [x] T-844 事项备注高度上限守门
- [x] T-845 桌面事项列表宽度守门
- [x] T-846 Today 状态线低对比度守门
- [x] T-847 宽屏货架最小卡宽守门
- [x] T-848 稳定化守门纳入 test:ui
  - 状态：done（新增 `tests/stability-9_8.test.cjs`，30 项结构断言全部通过；真实客户端交互仍由 T-023/T-129 清单验收）

### T-849~T-884 9.8 稳定化自动化护栏 B（2026-09-14）

- [x] T-849 提醒动作独立存储键守门
- [x] T-850 提醒动作加载规范化守门
- [x] T-851 提醒动作序列化守门
- [x] T-852 提醒恢复清理动作守门
- [x] T-853 提醒中心投影入口守门
- [x] T-854 番茄钟偏好保留守门
- [x] T-855 番茄钟来源字段守门
- [x] T-856 外部事件幂等键守门
- [x] T-857 重复外部事件拒绝守门
- [x] T-858 统一审计写入守门
- [x] T-859 审计 best-effort 持久化守门
- [x] T-860 保存队列失败续接守门
- [x] T-861 宿主主题 token 同步守门
- [x] T-862 主题同步缓存守门
- [x] T-863 reduced-motion surface 标记守门
- [x] T-864 打卡焦点队列守门
- [x] T-865 周进度局部刷新守门
- [x] T-866 Today 原地刷新入口守门
- [x] T-867 Toast 集中同步守门
- [x] T-868 快照历史追加守门
- [x] T-869 快照历史兼容读取守门
- [x] T-870 审计模型规范化守门
- [x] T-871 审计追加函数守门
- [x] T-872 快照导入验证守门
- [x] T-873 快照历史数量上限守门
- [x] T-874 提醒动作类型守门
- [x] T-875 提醒状态迁移守门
- [x] T-876 已完成提醒状态守门
- [x] T-877 浮层避让底栏守门
- [x] T-878 移动安全区样式守门
- [x] T-879 reduced-motion 样式守门
- [x] T-880 顶部安全区守门
- [x] T-881 底部滚动安全区守门
- [x] T-882 局部刷新人工清单守门
- [x] T-883 双窗口人工清单守门
- [x] T-884 提醒中心人工清单守门
  - 状态：done（新增 `tests/stability-9_8b.test.cjs`，36 项结构断言全部通过并接入 `test:ui`；真实客户端交互仍由 T-023/T-129 清单验收）

- [x] T-130 联动可观测性：为番茄钟→小驴打卡的 pending/retry/duplicate 场景增加用户可见的低干扰诊断入口，默认不打断正常使用。
  - 状态：done（番茄钟独立联动设置页已有复制诊断/导出/重试入口；`buildDiagnosticSnapshot` 新增 retryable/blocked/duplicate 分类计数，诊断信息仅在用户主动复制时展示，不改变计时主流程）
  - 验证：番茄钟 `npm test -- --run`（19/19）通过。

## 建议工作流确认闭环（T-459~T-478）

- [x] T-459 定义建议决策 host 方法
- [x] T-460 绑定确认按钮
- [x] T-461 绑定取消按钮
- [x] T-462 绑定撤销按钮
- [x] T-463 生成确认令牌
- [x] T-464 生成取消令牌
- [x] T-465 接入令牌消费
- [x] T-466 接入确认状态迁移
- [x] T-467 接入取消状态迁移
- [x] T-468 应用确认建议
- [x] T-469 应用前保留旧 store
- [x] T-470 应用成功持久化
- [x] T-471 应用失败恢复旧 store
- [x] T-472 无变更应用拒绝提示
- [x] T-473 撤销建议应用
- [x] T-474 撤销成功持久化
- [x] T-475 撤销失败恢复旧 store
- [x] T-476 无法撤销提示
- [x] T-477 结构与运行时测试
- [x] T-478 完整质量门禁验证
  - 状态：done（用户点击驱动确认/取消/撤销；确认与撤销持久化失败恢复旧 store；未自动应用建议）

## 建议工作流恢复与持久化（T-479~T-498）

- [x] T-479 定义独立工作流存储键
- [x] T-480 启动时读取工作流快照
- [x] T-481 复用版本化工作流解析
- [x] T-482 按当前项目条目校验恢复内容
- [x] T-483 数据变化时刷新工作流投影
- [x] T-484 增加工作流序列化写入门面
- [x] T-485 工作流写入串入保存队列
- [x] T-486 工作流写入失败提示
- [x] T-487 确认后持久化工作流
- [x] T-488 取消后持久化工作流
- [x] T-489 应用拒绝后持久化审计状态
- [x] T-490 撤销后持久化工作流
- [x] T-491 生成新建议后刷新工作流快照
- [x] T-492 无建议时清理旧工作流快照
- [x] T-493 统计范围切换时清理工作流快照
- [x] T-494 工作流恢复不覆盖主 store
- [x] T-495 工作流存储失败不阻断主 store
- [x] T-496 增加恢复与持久化结构测试
- [x] T-497 扩展建议安全测试断言
- [x] T-498 完整质量门禁与本地提交
  - 状态：done（独立版本化存储；恢复与主 store 解耦；所有写入经保存队列，失败仅提示）

## 建议工作流生命周期防护（T-499~T-518）

- [x] T-499 定义待确认建议恢复时限
- [x] T-500 增加工作流恢复资格判断
- [x] T-501 过期待确认建议自动忽略
- [x] T-502 确认后历史建议允许恢复
- [x] T-503 未来时间建议拒绝恢复
- [x] T-504 启动恢复复用条目校验
- [x] T-505 数据变化恢复复用条目校验
- [x] T-506 恢复失败清理内存状态
- [x] T-507 恢复失败清理持久化快照
- [x] T-508 工作流独立键不污染主 store
- [x] T-509 工作流写入复用保存队列
- [x] T-510 工作流写入错误低干扰提示
- [x] T-511 新建议创建刷新生命周期
- [x] T-512 范围变化清理生命周期
- [x] T-513 取消状态保留审计轨迹
- [x] T-514 撤销状态保留审计轨迹
- [x] T-515 增加待确认时限运行时测试
- [x] T-516 增加恢复接线结构测试
- [x] T-517 更新建议安全主测试链
- [x] T-518 完整质量门禁与里程碑提交
  - 状态：done（过期待确认建议不再跨日恢复；已确认建议保留撤销能力）

## 建议面板反馈与无障碍（T-519~T-538）

- [x] T-519 建议状态加入实时播报
- [x] T-520 建议状态补充可读 aria-label
- [x] T-521 建议操作区补充 aria-label
- [x] T-522 变更列表保留可见上限
- [x] T-523 超出上限显示剩余数量
- [x] T-524 剩余数量文案接入中文
- [x] T-525 剩余数量文案接入英文
- [x] T-526 确认按钮点击后禁用
- [x] T-527 取消按钮点击后禁用
- [x] T-528 撤销按钮点击后禁用
- [x] T-529 异步操作设置 aria-busy
- [x] T-530 异步操作结束恢复按钮状态
- [x] T-531 处理宿主同步抛错
- [x] T-532 处理按钮脱离 DOM
- [x] T-533 工作流面板禁用态视觉反馈
- [x] T-534 增加面板结构断言
- [x] T-535 增加按钮绑定断言
- [x] T-536 更新 i18n hygiene 覆盖
- [x] T-537 更新建议测试入口
- [x] T-538 完整质量门禁与本地提交
  - 状态：done（状态变化可感知，重复点击受保护，变更长列表明确提示）

## 建议审计信息增强（T-539~T-558）

- [x] T-539 提供最新审计记录查询
- [x] T-540 最新审计返回防御性副本
- [x] T-541 面板显示最近更新时间
- [x] T-542 无审计时回退创建时间
- [x] T-543 更新时间文案接入中文
- [x] T-544 更新时间文案接入英文
- [x] T-545 更新时间字段统一转义
- [x] T-546 审计状态保持实时播报
- [x] T-547 审计计数保持稳定
- [x] T-548 变更列表继续限制 8 条
- [x] T-549 隐藏变更数量可感知
- [x] T-550 操作区语义保持一致
- [x] T-551 异步按钮忙碌态不回归
- [x] T-552 增加最新审计运行时测试
- [x] T-553 增加更新时间渲染断言
- [x] T-554 增加更新时间样式断言
- [x] T-555 更新主测试链守门
- [x] T-556 完成类型检查
- [x] T-557 完成质量门禁
- [x] T-558 本地里程碑提交
  - 状态：done（状态与审计时间可读，防御性复制避免外部修改内部轨迹）

## 建议操作并发与异常边界（T-559~T-578）

- [x] T-559 建立建议按钮忙碌集合
- [x] T-560 确认按钮重复触发保护
- [x] T-561 取消按钮重复触发保护
- [x] T-562 撤销按钮重复触发保护
- [x] T-563 同步宿主异常转异步处理
- [x] T-564 异步异常统一吞吐
- [x] T-565 操作结束清理忙碌集合
- [x] T-566 操作结束移除 aria-busy
- [x] T-567 操作结束恢复 disabled
- [x] T-568 脱离 DOM 后不触碰按钮
- [x] T-569 确认动作保持原有状态迁移
- [x] T-570 取消动作保持原有状态迁移
- [x] T-571 撤销动作保持原有状态迁移
- [x] T-572 保存失败不产生未处理拒绝
- [x] T-573 面板重渲染后旧按钮集合可回收
- [x] T-574 增加并发结构断言
- [x] T-575 增加异常吞吐断言
- [x] T-576 更新无障碍回归测试
- [x] T-577 完成类型与定向测试
- [x] T-578 完整质量门禁与里程碑提交
  - 状态：done（建议操作串行化，异常安全收口，不产生未处理 Promise 拒绝）

## 建议操作能力门面（T-579~T-598）

- [x] T-579 定义工作流操作能力类型
- [x] T-580 计算确认可用性
- [x] T-581 计算取消可用性
- [x] T-582 计算撤销可用性
- [x] T-583 pending 无变更时禁用确认
- [x] T-584 pending 有变更时启用确认
- [x] T-585 非 pending 禁用确认
- [x] T-586 非 pending 禁用取消
- [x] T-587 应用后按审计启用撤销
- [x] T-588 撤销后关闭撤销
- [x] T-589 面板复用能力门面
- [x] T-590 能力判断保持纯函数
- [x] T-591 能力结果不修改 workflow
- [x] T-592 增加能力运行时测试
- [x] T-593 扩展确认按钮结构断言
- [x] T-594 扩展撤销按钮结构断言
- [x] T-595 更新建议渲染守门
- [x] T-596 更新主测试链
- [x] T-597 完成类型检查
- [x] T-598 完整质量门禁与里程碑提交
  - 状态：done（面板动作统一由 workflowActions 计算，避免状态条件分散）

## 建议工作流跨窗口一致性（T-599~T-618）

- [x] T-599 定义工作流更新时间推导
- [x] T-600 优先读取最新审计时间
- [x] T-601 无审计回退创建时间
- [x] T-602 增加工作流新旧比较函数
- [x] T-603 空当前状态接受远端恢复
- [x] T-604 远端较新状态覆盖本地
- [x] T-605 远端较旧状态不覆盖本地
- [x] T-606 同时间状态保持本地
- [x] T-607 本地未完成操作防覆盖
- [x] T-608 过期远端状态继续清理
- [x] T-609 损坏远端状态不清理有效本地
- [x] T-610 启动恢复保持原语义
- [x] T-611 数据变化恢复加入版本比较
- [x] T-612 主 store 保持只读隔离
- [x] T-613 增加更新时间运行时测试
- [x] T-614 增加新旧比较测试
- [x] T-615 增加跨窗口结构断言
- [x] T-616 更新建议安全主测试链
- [x] T-617 完成类型与定向测试
- [x] T-618 完整质量门禁与里程碑提交
  - 状态：done（远端同步按审计时间单调更新，避免旧快照覆盖本地操作）

## 建议操作成功反馈（T-619~T-638）

- [x] T-619 定义确认成功提示
- [x] T-620 定义取消成功提示
- [x] T-621 定义撤销成功提示
- [x] T-622 增加中文确认文案
- [x] T-623 增加英文确认文案
- [x] T-624 增加中文取消文案
- [x] T-625 增加英文取消文案
- [x] T-626 增加中文撤销文案
- [x] T-627 增加英文撤销文案
- [x] T-628 确认成功后显示提示
- [x] T-629 取消成功后显示提示
- [x] T-630 撤销成功后显示提示
- [x] T-631 保持持久化失败提示优先
- [x] T-632 保持应用拒绝提示
- [x] T-633 保持撤销拒绝提示
- [x] T-634 扩展 index 结构测试
- [x] T-635 扩展 i18n 结构测试
- [x] T-636 更新建议测试入口
- [x] T-637 完成类型与定向测试
- [x] T-638 完整质量门禁与里程碑提交
  - 状态：done（用户动作完成后获得明确反馈，失败分支语义不变）

## 建议操作焦点连续性（T-639~T-658）

- [x] T-639 成功提示包含建议标题
- [x] T-640 确认提示包含标题
- [x] T-641 取消提示包含标题
- [x] T-642 撤销提示包含标题
- [x] T-643 增加确认后焦点恢复
- [x] T-644 查询更新后的撤销按钮
- [x] T-645 仅聚焦可用撤销按钮
- [x] T-646 保持按钮脱离 DOM 防护
- [x] T-647 保持异步异常吞吐
- [x] T-648 保持持久化顺序
- [x] T-649 确认状态变化后焦点连续
- [x] T-650 撤销状态变化后不误聚焦禁用控件
- [x] T-651 增加标题文案断言
- [x] T-652 增加焦点查询断言
- [x] T-653 增加成功反馈结构断言
- [x] T-654 更新建议安全主测试链
- [x] T-655 完成类型检查
- [x] T-656 完成定向测试
- [x] T-657 完成质量门禁
- [x] T-658 本地里程碑提交
  - 状态：done（成功反馈带上下文，确认后可继续键盘操作）

## 建议审计明细面板（T-659~T-678）

- [x] T-659 增加审计明细折叠区
- [x] T-660 展示最近 10 条审计
- [x] T-661 审计按最新优先排序
- [x] T-662 显示审计动作
- [x] T-663 显示审计时间
- [x] T-664 时间输出 datetime 属性
- [x] T-665 撤销动作单独文案
- [x] T-666 显示拒绝原因
- [x] T-667 审计字段统一转义
- [x] T-668 审计为空时隐藏明细
- [x] T-669 增加中文动作文案
- [x] T-670 增加英文动作文案
- [x] T-671 增加明细折叠样式
- [x] T-672 增加窄屏网格布局
- [x] T-673 增加面板渲染断言
- [x] T-674 增加 i18n 断言
- [x] T-675 更新建议安全主测试链
- [x] T-676 完成类型检查
- [x] T-677 完成定向测试
- [x] T-678 完整质量门禁与里程碑提交
  - 状态：done（审计轨迹可展开查看且保持长度上限）

## 建议工作流 API 只读投影（T-679~T-698）

- [x] T-679 扩展 CheckinApi 类型
- [x] T-680 扩展宿主接口
- [x] T-681 增加 getSuggestionWorkflow
- [x] T-682 空工作流返回 undefined
- [x] T-683 导出信封副本
- [x] T-684 导出变更副本
- [x] T-685 导出令牌副本
- [x] T-686 导出审计副本
- [x] T-687 导出冲突数组副本
- [x] T-688 API 保持只读语义
- [x] T-689 不暴露持久化写入口
- [x] T-690 不暴露决策令牌创建入口
- [x] T-691 不暴露内部 store 引用
- [x] T-692 增加 API 结构断言
- [x] T-693 增加 index 类型断言
- [x] T-694 更新 API 文档守门
- [x] T-695 更新建议安全主测试链
- [x] T-696 完成类型检查
- [x] T-697 完成定向测试
- [x] T-698 完整质量门禁与里程碑提交
  - 状态：done（外部仅可读取建议快照，所有字段均为防御性副本）

## 建议工作流摘要 API（T-699~T-718）

- [x] T-699 定义工作流摘要 API 类型
- [x] T-700 扩展 CheckinApi 接口
- [x] T-701 扩展宿主 API 类型
- [x] T-702 增加 getSuggestionWorkflowSummary
- [x] T-703 空工作流返回 undefined
- [x] T-704 暴露当前状态
- [x] T-705 暴露可应用标志
- [x] T-706 暴露可撤销标志
- [x] T-707 暴露消费令牌计数
- [x] T-708 暴露审计计数
- [x] T-709 暴露更新时间
- [x] T-710 摘要保持只读
- [x] T-711 摘要不共享内部引用
- [x] T-712 保持主 API 版本兼容
- [x] T-713 更新生态文档
- [x] T-714 增加 API 结构断言
- [x] T-715 增加生态文档断言
- [x] T-716 更新建议安全主测试链
- [x] T-717 完成类型检查
- [x] T-718 完整质量门禁与里程碑提交
  - 状态：done（集成方可读取稳定摘要，不具备任何写入权限）

## 建议工作流事件广播（T-739~T-758）

- [x] T-739 定义工作流更新事件名
- [x] T-740 扩展事件契约列表
- [x] T-741 扩展事件类型
- [x] T-742 增加建议 ID 字段
- [x] T-743 增加建议状态字段
- [x] T-744 映射外部事件名称
- [x] T-745 确认后广播更新
- [x] T-746 取消后广播更新
- [x] T-747 应用后广播更新
- [x] T-748 撤销后广播更新
- [x] T-749 新建议生成广播更新
- [x] T-750 保持现有事件兼容
- [x] T-751 更新 API 描述事件数量
- [x] T-752 增加契约测试断言
- [x] T-753 增加建议结构测试
- [x] T-754 更新生态事件文档
- [x] T-755 更新建议安全主测试链
- [x] T-756 完成类型检查
- [x] T-757 完成定向测试
- [x] T-758 完整质量门禁与里程碑提交
  - 状态：done（外部订阅方可感知建议状态变化，事件仅广播不提供写入能力）

## 建议事件 payload 安全（T-759~T-778）

- [x] T-759 定义集成事件克隆函数
- [x] T-760 校验建议事件对象
- [x] T-761 校验建议 ID 非空
- [x] T-762 限制建议 ID 长度
- [x] T-763 校验建议状态枚举
- [x] T-764 修剪建议 ID 空白
- [x] T-765 丢弃无效建议事件
- [x] T-766 克隆事项事件
- [x] T-767 克隆事项归档周期
- [x] T-768 克隆事项计划
- [x] T-769 克隆记录事件
- [x] T-770 克隆删除事件数组
- [x] T-771 emit 前统一安全克隆
- [x] T-772 防止建议 payload 引用泄漏
- [x] T-773 保持外部事件名称映射
- [x] T-774 增加事件运行时测试
- [x] T-775 增加事件契约断言
- [x] T-776 更新生态文档
- [x] T-777 完成类型与定向测试
- [x] T-778 完整质量门禁与里程碑提交
  - 状态：done（集成广播统一经过 payload 校验和防御性克隆）

## 建议事件类型守卫（T-779~T-798）

- [x] T-779 定义建议事件类型别名
- [x] T-780 增加 isSuggestionWorkflowEvent
- [x] T-781 校验事件对象类型
- [x] T-782 校验事件类型字段
- [x] T-783 校验建议 ID 类型
- [x] T-784 校验建议 ID 非空
- [x] T-785 校验建议 ID 长度
- [x] T-786 校验状态枚举
- [x] T-787 接入 payload 克隆流程
- [x] T-788 拒绝未知状态
- [x] T-789 拒绝空建议 ID
- [x] T-790 拒绝超长建议 ID
- [x] T-791 保持现有事件守卫
- [x] T-792 保持事件名称映射
- [x] T-793 增加类型守卫运行时测试
- [x] T-794 增加结构断言
- [x] T-795 更新生态接入文档
- [x] T-796 更新测试脚本链
- [x] T-797 完成类型与定向测试
- [x] T-798 完整质量门禁与里程碑提交
  - 状态：done（建议事件可由订阅方安全识别，伪造 payload 被拒绝）

## 建议只读能力协商（T-799~T-818）

- [x] T-799 定义 suggestions.read capability
- [x] T-800 标记只读 effect
- [x] T-801 标记 localOnly
- [x] T-802 加入能力列表
- [x] T-803 加入能力信息映射
- [x] T-804 保持 API 版本 4
- [x] T-805 支持 hasCapability 查询
- [x] T-806 支持 getCapabilityInfo 查询
- [x] T-807 对外快照能力可协商
- [x] T-808 对外摘要能力可协商
- [x] T-809 不增加写能力
- [x] T-810 不改变现有能力语义
- [x] T-811 更新生态接入说明
- [x] T-812 增加 capability 运行时测试
- [x] T-813 增加结构守门断言
- [x] T-814 更新 API 契约测试
- [x] T-815 更新建议安全主测试链
- [x] T-816 完成类型检查
- [x] T-817 完成定向测试
- [x] T-818 完整质量门禁与里程碑提交
  - 状态：done（第三方可标准化探测建议只读能力，写边界保持不变）

## 工作流快照克隆边界（T-719~T-738）

- [x] T-719 定义工作流克隆函数
- [x] T-720 克隆信封对象
- [x] T-721 克隆变更数组
- [x] T-722 克隆消费令牌数组
- [x] T-723 克隆审计数组
- [x] T-724 克隆冲突数组
- [x] T-725 创建工作流复用克隆
- [x] T-726 API 快照复用克隆
- [x] T-727 防止信封引用泄漏
- [x] T-728 防止变更引用泄漏
- [x] T-729 防止令牌引用泄漏
- [x] T-730 防止审计引用泄漏
- [x] T-731 防止冲突引用泄漏
- [x] T-732 保持克隆函数纯函数
- [x] T-733 增加克隆运行时测试
- [x] T-734 增加 API 结构断言
- [x] T-735 更新建议安全主测试链
- [x] T-736 完成类型检查
- [x] T-737 完成定向测试
- [x] T-738 完整质量门禁与里程碑提交
  - 状态：done（工作流快照统一防御性克隆，避免跨层引用泄漏）
- [x] T-885~T-924 9.8 稳定性第三批：发布与环境门禁（50 项结构检查）
  - 状态：done；新增 `tests/stability-9_8c.test.cjs` 与 `check:stability`，覆盖版本/资源/CI/浏览器审计/Smoke/回滚/兼容/恢复文档。

- [x] T-925~T-927 CSS 发布体积护栏受控放宽与门禁纠偏
  - 验收：保留软线与告警状态，380KB 不再作为硬阻断，450KB 作为新的硬上限并校验阈值顺序；用户明确授权记录在 DECISIONS.md
  - 依赖：T-105 样式迁移与发布资源检查
  - 状态：done（T-925：318KB/420KB/450KB 分级门禁；T-926：`test:quality` 改为先构建再检查发布资源，避免旧 dist 误判；T-927：路线文档同步当前阈值。最近一次生产 CSS 404,587 bytes 进入告警区但低于 450,000-byte 硬线；`test:quality`、宽度走查、70 张 UI 截图扫描及浅/深色视觉探针均通过）

## 12.0.0 发布收口（T-928~T-957）

- [x] T-928 审核桌面 Today 页面空间与卡片操作轨道
- [x] T-929 审核桌面回顾页日历、折叠区与提醒中心
- [x] T-930 审核桌面设置页模块尺寸与控件对齐
- [x] T-931 审核桌面日期事项页表单与列表比例
- [x] T-932 审核手机 Today 单列卡片与底栏等宽分布
- [x] T-933 审核手机新建/编辑页模板、图标和滚动边界
- [x] T-934 审核手机回顾、设置、事项页安全区与截断
- [x] T-935 审核浅色主题全部主要页面
- [x] T-936 审核深色主题全部主要页面
- [x] T-937 审核 320/360/390/430px 窄宽度
- [x] T-938 审核 640/768/1180/1280/1600/2000px 宽度
- [x] T-939 审核页签生命周期与重复关闭按钮
- [x] T-940 审核 dock 窄宽度底栏入口
- [x] T-941 增加 dock 宽宽度固定导航栏
- [x] T-942 增加宽 dock 导航视觉回归证据
- [x] T-943 优化提醒中心 2000 条事项投影算法
- [x] T-944 增加提醒中心性能基准稳定性
- [x] T-945 修复提醒来源文字对比度
- [x] T-946 修复优先提醒图标对比度
- [x] T-947 修复无障碍审计桌面 dock 导航探针
- [x] T-948 修复无障碍审计低对比度回归
- [x] T-949 让移动视觉走查识别移动顶栏标题
- [x] T-950 增加 release 脚本双语 SHA-256 行兼容
- [x] T-951 禁止发布说明保留零摘要占位
- [x] T-952 完成 TypeScript 类型检查
- [x] T-953 完成核心、UI、移动、生态与性能测试
- [x] T-954 完成浅色/深色视觉走查与无障碍审计
- [x] T-955 完成宽度走查、备份恢复与跨表面门禁
- [x] T-956 完善 README、变更记录和发布说明
- [x] T-957 生成 v12.0.0 构建、提交、标签和 GitHub Release
  - 状态：done；最终构建、哈希核对、提交 `6c35296`、推送、`v12.0.0` 标签和 GitHub Release 均完成。

- [x] T-958 补齐 12.0.0 发布审计记录（PROGRESS/DECISIONS/BLOCKERS）
  - 状态：done；自动化证据与真实宿主验收边界已记录。
- [x] T-959 最终构建后写入真实 package.zip SHA-256
  - 证据：`4b4dd41976f8a5828005005fd98296025c3531b5965108e5ccd721a5b2364703`，GitHub 资产摘要一致。
- [x] T-960 提交并推送 v12.0.0 发布范围
  - 证据：`main` 已推送至 `6c35296`，远端 CI 成功。
- [x] T-961 创建并核对 GitHub v12.0.0 Release
  - 证据：https://github.com/ai68298100/siyuan-checkin/releases/tag/v12.0.0，资产 349404 bytes。

## 12.0.0 发布后跨端 UI 收口（T-962~T-969）

- [x] T-962 跨端 UI 结构与空间利用复核
  - 验收：桌面、手机、页签与 dock 共用语义结构并按宿主密度分层；关闭态 details 不占位，窄端无错位或无意义空白。
  - 状态：done（工具/帮助内容关闭态显式隐藏，跨表面最终覆盖集中到组件层）。
- [x] T-963 设置页导航滚动同步与 ARIA 唯一性
  - 验收：点击导航可定位区块，右侧滚动同步高亮；同进程多表面渲染无重复 id；重渲染/卸载无残留监听器。
  - 状态：done（新增 settings-navigation 门面、observer/fallback/cleanup 与行为测试，设置视图 id 使用实例前缀）。
- [x] T-964 回顾页工具区与摘要完整显示
  - 验收：复制报告、归档及导出按主次分组；更多菜单关闭时不占空间；总结、建议和提醒自然换行且不截断。
  - 状态：done（范围/报告/更多三组工具及 hero 文本轨道完成收口）。
- [x] T-965 事项页帮助入口与代表模板展示
  - 验收：新建、筛选和帮助入口语义可见；模板展示分类数量与代表项；桌面和窄端无裁切或横向溢出。
  - 状态：done（帮助面板、分类数量、模板提示及窄端双列模板已落地）。
- [x] T-966 手机 Today 提醒与五等分底栏
  - 验收：今日提醒标题、来源、时间和动作从 320px 起可读；底栏固定五等分，图标/文字居中，新建入口不与标签重叠。
  - 状态：done（提醒轨道、操作宽度及 Today/回顾/新建/事项/设置五轨完成收口）。
- [x] T-967 手机与窄 dock 编辑器滚动、弹层和操作区收口
  - 验收：根表面是唯一整页滚动层；模板/高级项展开后仍可上下滚动；图标目录是流内大面板；手机保存栏持续可见，dock 尾部操作可完整滚入且不裁切。
  - 状态：done（form-scroll 取消第二整页滚动，图标面板流内限高；视觉脚本增加真实滚轮、几何与点击命中检查）。
- [x] T-968 dock 窄栏密度与参考插件设计复盘
  - 验收：320px 基线下导航、卡片和操作不横向溢出；宽 dock 使用紧凑 rail；记录 pinch 与 siyuan-points-reward 的可借鉴和不照搬边界。
  - 状态：done（窄 dock 五等分底栏、操作轨道和宽 dock 导航完成，参考结论写入 D-091/D-092）。
- [x] T-969 跨端 UI 最终回归与阶段提交
  - 验收：差异检查、类型、构建、完整质量链、系统 Chrome 宽度走查及浅/深色、桌面/移动视觉 QA 通过；记录 CSS 字节与 B-007 边界；本地里程碑提交，不 push、不发版、不复制本地集市。
  - 状态：done（生产 CSS 424120 bytes，处于 420KB 告警区但低于 450KB 硬线；10k 事件 49ms、overflow 0px；真机边界继续由 B-007 跟踪）。

## 12.0.0 发布后回归加固（T-970~T-974）

- [x] T-970 320px Today 顶栏单行几何守门
  - 验收：标题、日期、连续天数与完成计数在 320/360px 下不产生额外换行空白；标题宽度和操作行由浏览器几何断言确认。
  - 状态：done（标题固定最小轨道、日期可收缩，320/360/390/430px 均通过）。
- [x] T-971 设置导航旧 WebView 滚动回退
  - 验收：`scrollTo` options 调用失败时回退到直接偏移，`Element` 不存在时不抛异常；现代浏览器路径保持平滑滚动。
  - 状态：done（新增防守式类型检查与 try/catch fallback）。
- [x] T-972 闭合 details 跨宿主零占位
  - 验收：菜单、帮助、筛选、审计、模板等闭合内容不泄漏高度；打开态原有流式/独立滚动行为不变。
  - 状态：done（组件层增加统一闭合态规则并纳入响应式静态守门）。
- [x] T-973 事项操作图标/标签重绘稳定性
  - 验收：重绘或切换停用状态后图标仍正确，操作标签节点不被图标归一化抹除，ARIA/title 保持有效。
  - 状态：done（`normalizeUiIcons` 仅替换 `.lc-checkin__action-icon`，停用状态由 `.is-on` 稳定判定）。
- [x] T-974 最终构建与跨主题视觉回归
  - 验收：类型、完整质量链、宽度走查、桌面/移动/深色 Chrome 视觉 QA 均通过；CSS 低于 450KB 硬线。
  - 状态：done（CSS 425364 bytes；质量链、宽度走查与三套视觉 QA 全部通过）。

## 12.0.0 发布后局部刷新结构安全加固（T-975~T-980）

- [x] T-975 Today 局部刷新跨日守门
  - 验收：事件携带的 `localDate` 非当前日时不改写 Today 卡片，自动回退完整投影。
  - 状态：done（`pendingLocalItemDate` 与局部刷新入口贯通，跨日事件安全回退）。
- [x] T-976 局部刷新多表面预检
  - 验收：dock、页签和快速窗口全部找到同结构目标卡片后才开始替换；任一表面缺卡或结构不一致时不产生部分移除。
  - 状态：done（预检阶段先收集所有 surface，风险命中即返回完整渲染）。
- [x] T-977 完成区与操作节点结构回退
  - 验收：完成/撤销、完成区归属、准确记录、拖拽手柄、批量操作等结构变化不得使用同卡片局部 patch。
  - 状态：done（比较完成态、完成区和结构选择器；变化统一走完整渲染）。
- [x] T-978 事件日期传播与分析口径修正
  - 验收：记录、删除、撤销路径均携带实际事件日期；删除事件的 analyticsAsOf 不再使用当前系统日期覆盖历史日期。
  - 状态：done（所有 pendingLocalItemId 设置点同步日期，删除广播使用 `moment.localDate`）。
- [x] T-979 局部刷新回归断言扩展
  - 验收：源码守门覆盖跨日、pending-only、完成区结构和选择器变化，并确认不再移动或提前删除卡片。
  - 状态：done（`tests/checkin-toast.test.cjs` 增加结构安全断言，定向测试通过）。
- [x] T-980 参考插件研究结论落盘
  - 验收：记录 `pinch` 与 `siyuan-points-reward` 对 dock 宽度、等分导航、滚动所有权、任务卡信息层级和反馈闭环的可借鉴边界，不复制品牌视觉或双根滚动结构。
  - 状态：done（研究证据与采用/不采用边界已写入 D-091、D-097）。
- [x] T-981 v12.0.1 发布与本地集市同步
  - 验收：版本、README、变更记录、发布说明与构建产物一致；完整质量链和远端 CI 通过；GitHub Release 资产摘要与本地一致；本地集市文件逐项校验一致。
  - 状态：done（Release `v12.0.1`；提交 `0b4663b`；package.zip 354276 bytes，SHA-256 `72d456b9c64db8d1f36676d218e7de580299f6680252687e667469607161745b`；本地集市版本 12.0.1）。
- [x] T-982 思源官方集市首次上架提交
  - 验收：按官方 Bazaar 规则确认插件未重复收录；个人 fork 与上游 main 同步；PR 仅向 `plugins.txt` 增加 `ai68298100/siyuan-checkin`；官方自动检查通过。
  - 状态：done（Bazaar PR `siyuan-note/bazaar#2248` 已创建，`prepare` 与包检查均成功，获得 `plugin`、`ci-passed` 标签；等待维护者审核合并）。
- [x] T-983 底栏番茄钟提供方收口
  - 验收：设置只显示自带/底栏番茄钟；旧 `plugin` 偏好无损迁移；只按 `siyuan-plugin-docktomato` 精确路由，不误选其他适配器。
  - 状态：done（新增明确 provider、固定适配器 ID、迁移与生态契约守门）。
- [x] T-984 底栏番茄钟兼容 PR 本地草案
  - 验收：基于上游 v2.2.7 准备消费方无关的 v1 focus facade、生命周期事件、安全 context、持久化后完成事件、文档、测试及详尽 PR 正文；不得创建或推送对方 PR。
  - 状态：done（本地目录 `D:\AI\Codex\siyuan-plugin-docktomato-pr`；全量 `scripts/*.test.js` 与语法检查通过；待用户审阅）。
- [x] T-985 底栏番茄钟 PR 契约边界加固
  - 验收：能力协商、稳定错误码、同步语义签名、旧任务关联清理、ready 时序和实时事件边界均有实现、测试及双语文档；不扩大为不可靠的内部历史读取或消费方耦合。
  - 状态：done（增加冻结 capabilities、NOT_READY/BUSY/INVALID_CONTEXT、externalFocus 签名与完整关联清理；对方全量脚本与本项目质量链通过）。
- [x] T-986 底栏番茄钟 PR 最终可合并性审计
  - 验收：方法命名与真实语义一致；外部 context 绑定唯一专注 session，不能污染后续手动会话；差异、测试和文档通过后冻结待命，不 push、不创建 PR。
  - 状态：done（`stop` 收敛为 `pause`，新增 externalFocusSessionId 全链守门；Dock Tomato 全量脚本通过，分支保持本地领先 1 提交）。
- [x] T-987 12.x 后续大版本路线重排
  - 验收：结合现有能力、技术债、真机阻塞和生态依赖，明确 13.0～18.0 的目标、范围、非目标、顺序和完成门槛。
  - 状态：done（新增 `docs/development-roadmap-2026.md`，README 指向当前路线，旧路线保留为历史背景）。

## 13.0 专注生态第一批（T-988~T-990）

- [x] T-988 Dock Tomato 提供方诊断矩阵
  - 验收：缺失、版本不兼容、接口不完整、能力不足、恢复中、就绪、运行、暂停和读取失败可区分；外部字段有类型与数量边界。
  - 状态：done（新增 `inspectDockTomatoProvider`，只有健康状态注册适配器，设置页展示实时诊断）。
- [x] T-989 专注启动错误与显式降级
  - 验收：Today 按原因给出可行动提示；稳定错误码本地化；选择外部提供方但不可用时可一键改用自带计时，且不静默修改偏好。
  - 状态：done（九状态提示、三类稳定错误码翻译、中英文恢复文案和偏好持久化完成）。
- [x] T-990 提供方生命周期刷新收口
  - 验收：availability/started/paused 触发状态刷新；重复刷新合并；卸载释放监听器并阻止已排队回调。
  - 状态：done（微任务合并、disposed 二次守门及 68 条专注集成契约断言通过）。

## 13.0 专注生态第二批（T-991~T-994）

- [x] T-991 completion 纯判定与 payload 防护
  - 验收：版本、consumer、context、项目、映射、时长和身份逐层验证；不执行外部 getter；其它 consumer 安静忽略。
  - 状态：done（新增 `evaluateDockTomatoCompletion` 与 descriptor-only 读取，行为测试覆盖合法和异常矩阵）。
- [x] T-992 项目生命周期与映射漂移守门
  - 验收：计时期间删除、归档、单位变化或 sessions/minutes 变化不得按新口径静默写入；原因可见。
  - 状态：done（missing/archived/mapping-changed 独立原因并进入有界诊断）。
- [x] T-993 completion 跨重载与并发幂等
  - 验收：in-flight、运行期已完成和既有 externalRef 共同去重；无身份拒绝；写失败保留重试机会。
  - 状态：done（500 身份内存窗口 + 持久事件 externalRef；空写入和异常均不标记成功）。
- [x] T-994 回写问题可观察性
  - 验收：最近问题有原因、时间和有界数量；设置页可读、可清除；返回值不可变；测试进入生态链。
  - 状态：done（20 条运行期诊断、冻结快照、双语设置 UI、新增 completion 行为测试并接入 `test:ecosystem`）。

## 13.0 专注生态第三批（T-995~T-997）

- [x] T-995 回写诊断版本化恢复
  - 验收：诊断独立于主 store 保存；插件重载及数据变更后可恢复；损坏版本、未知原因、非法日期和超量记录安全裁剪。
  - 状态：done（新增 schema v1 序列化/恢复、20 条容量上限、字段长度限制及独立存储）。
- [x] T-996 支持诊断安全导出
  - 验收：设置页可导出当前 provider 快照与回写问题；导出不包含打卡名称、备注或正文；能力列表和标识字段有明确长度/数量边界。
  - 状态：done（新增 JSON 诊断包、日期化文件名、双语操作与当前 provider 快照）。
- [x] T-997 专注诊断 50+ 验收矩阵
  - 验收：合法回写、拒绝原因、getter 防护、不可变快照、恢复、裁剪、脱敏和 UI/存储契约累计不少于 50 条自动化检查。
  - 状态：done（completion 行为与 integration 契约合计超过 100 条断言，定向测试、类型检查和差异检查通过）。

## 13.0 专注生态第四批（T-998~T-1000）

- [x] T-998 提供方运行状态防御读取
  - 验收：状态方法保留 receiver；返回空值、抛错、访问器字段及异常类型均不穿透 bridge；会话标识有界。
  - 状态：done（新增统一 `readDockTomatoRuntimeStatus`，版本、能力、方法与状态字段均采用 own-data 读取）。
- [x] T-999 专注释放与卸载竞态收口
  - 验收：不可读状态不提前释放所有权；结束/完成刷新可见状态；卸载后轮询停止；启动资格读取失败时关闭。
  - 状态：done（release/canStart fail-closed，ended/completed 刷新，disposed 守门进入轮询入口）。
- [x] T-1000 生命周期 50+ 验收矩阵
  - 验收：空值、异常、组合布尔状态、恶意 getter、receiver、字段长度和源码契约新增不少于 50 条自动化检查。
  - 状态：done（运行期新增 60+ 断言，生态定向链与类型检查通过）。

## 13.0 专注生态第五批（T-1001~T-1003）

- [x] T-1001 Bridge 可执行宿主模拟
  - 验收：以事件、计时器、provider facade 和小驴 API 假宿主执行真实 bridge，不以源码正则代替核心行为验证。
  - 状态：done（新增 `dock-tomato-bridge.test.cjs`，运行真实注册、启动、暂停、回写和卸载流程）。
- [x] T-1002 完成事件与隔离行为回归
  - 验收：合法完成只写一次；持久 externalRef 阻止重复；其它 consumer 安静忽略；非法时长只留诊断；结束释放所有权。
  - 状态：done（覆盖记录字段、重复/外部/非法事件、刷新合并和 ended 释放）。
- [x] T-1003 Bridge 55 项运行期验收
  - 验收：适配器、资格、context、回写字段、诊断、监听器和 dispose 累计不少于 50 条断言，并纳入 `test:ecosystem`。
  - 状态：done（55 条运行期断言已通过，类型与差异检查通过）。

## 13.0 专注生态第六批（T-1004~T-1006）

- [x] T-1004 回写失败上下文保留
  - 验收：写接口空返回或抛错时诊断保留 itemId 与 session identity，不泄漏项目正文；失败不进入完成集合。
  - 状态：done（write-failed 诊断携带有界关联字段，同身份仍可重试）。
- [x] T-1005 卸载后迟到异步结果隔离
  - 验收：recordEvent 等待期间卸载时，迟到成功不得重建完成集合，迟到失败不得重建诊断或刷新。
  - 状态：done（await 后二次 disposed 守门，catch 仅在 bridge 存活时记录）。
- [x] T-1006 失败重试 50+ 运行期验收
  - 验收：非法时长矩阵、空写入、抛错、同身份重试和诊断字段累计新增不少于 50 条断言。
  - 状态：done（20 组非法时长提供 80 条字段断言，另覆盖两类写失败及成功重试）。

## 13.0 专注生态第七批（T-1007~T-1009）

- [x] T-1007 并发完成身份所有权修复
  - 验收：重复 handler 不得释放首个持久化 handler 持有的 in-flight identity；写入完成或失败后仅 owner 释放。
  - 状态：done（新增 `claimedIdentity` 所有权，修复第三个并发事件穿透的真实竞态）。
- [x] T-1008 写入中与持久化后双层重放守门
  - 验收：首个写入悬挂期间 25 次重放、写入完成后 25 次重放均只保留一条记录，且 duplicate 不生成问题噪音。
  - 状态：done（FakeWindow deferred write 精确复现并验证 in-flight + externalRef 两层边界）。
- [x] T-1009 并发幂等 100+ 运行期验收
  - 验收：两阶段各 25 次重放，每次同时断言写入数和诊断数，新增不少于 50 条自动化检查。
  - 状态：done（新增 100 条逐次断言及最终唯一 externalRef 检查）。

## 13.0 专注生态第八批（T-1010~T-1012）

- [x] T-1010 持久事件字段安全扫描
  - 验收：历史 externalRef 使用 own data descriptor 读取，损坏对象的 getter 不得执行或中断完成事件。
  - 状态：done（stored identity 投影改用 `ownDataValue`，恶意访问器读取次数保持 0）。
- [x] T-1011 多身份持久去重矩阵
  - 验收：25 个不同已落账 Dock Tomato session 重放后均不再调用 recordEvent，也不产生 duplicate 诊断噪音。
  - 状态：done（FakeWindow store 预置 25 个 externalRef 并逐项派发验证）。
- [x] T-1012 持久去重 50 项运行期验收
  - 验收：每个身份分别断言写入数不变和诊断为空，新增不少于 50 条自动化检查。
  - 状态：done（25×2 共 50 条逐项断言，另验证 getter 零执行与种子完整性）。

## 13.0 专注生态第九批（T-1013~T-1015）

- [x] T-1013 持久身份单次投影
  - 验收：完成事件扫描历史时不再创建 map/filter/map 中间数组；一次遍历直接构建唯一身份集合，完整历史仍参与判断。
  - 状态：done（新增 `collectDockTomatoStoredIdentities` 单遍 Set 投影并接入 bridge）。
- [x] T-1014 混合历史隔离与命名空间
  - 验收：仅接受非空 `docktomato:` 引用；其它 provider、重复、空值、非字符串、空对象和访问器字段安全忽略。
  - 状态：done（50 条混合记录矩阵及 getter 零执行验证通过）。
- [x] T-1015 历史投影 50+ 行为验收
  - 验收：50 个候选身份逐项断言成员关系，另验证唯一数量、空身份、重复和非法输入。
  - 状态：done（新增 56 条运行期断言，bridge/completion/integration 定向测试通过）。

## 13.0 专注生态第十批（T-1016~T-1018）

- [x] T-1016 Availability 风暴幂等注册
  - 验收：同一 facade 连续 25 次 availability 不重复注册、不注销当前适配器，状态刷新合并为一次。
  - 状态：done（每次同时断言注册数与注销数，共 50 条逐事件检查）。
- [x] T-1017 Provider 替换/停用/恢复生命周期
  - 验收：facade 替换先注销旧适配器再注册新实例；缺失或版本不兼容时解绑；恢复兼容实例后重新注册；最终卸载只释放当前实例。
  - 状态：done（FakeWindow 完整执行替换、缺失、v2 不兼容、恢复和 dispose）。
- [x] T-1018 Provider 容器访问器隔离
  - 验收：`__dockTomato` 或 `focus` 为抛错 getter 时不得执行，诊断按 missing 安全返回，availability 不向宿主抛异常。
  - 状态：done（统一 `getDockTomatoCandidate` own-data 读取，两个恶意 getter 执行次数均为 0）。

## 13.0 专注生态第十一批（T-1019~T-1021）

- [x] T-1019 活动状态释放轮询上限
  - 验收：ended 后 provider 持续 active 时按 250ms 最多轮询 20 次，不提前 stopFocus，不无限创建 timer。
  - 状态：done（FakeWindow 逐轮驱动全部20次并确认最终 timer 数为0）。
- [x] T-1020 轮询耗尽资源清理与恢复
  - 验收：达到上限后清空内部 timer 标识；之后 provider 变 idle 再收到 ended 时可立即释放，不受旧 timer 干扰。
  - 状态：done（耗尽分支显式 `releaseTimer = undefined`，后续 idle 路径成功 stopFocus）。
- [x] T-1021 释放轮询 60+ 运行期验收
  - 验收：每轮同时断言执行成功、不提前释放、不产生刷新风暴，新增不少于50条检查。
  - 状态：done（20×3 共60条逐轮断言，另覆盖初始/耗尽/恢复状态）。

## 13.0 专注生态第十二批（T-1022~T-1024）

- [x] T-1022 成功重试自动解决旧诊断
  - 验收：同一 session 成功写入后清除其历史 write-failed，设置页不再持续显示已经恢复的错误。
  - 状态：done（成功持久化后调用 identity-scoped 诊断解决逻辑）。
- [x] T-1023 诊断解决范围隔离
  - 验收：只删除 reason=write-failed 且 identity 完全相同的记录；其它 session 和其它原因保持不变。
  - 状态：done（倒序原地删除精确匹配项，不使用模糊前缀或 itemId 批量清除）。
- [x] T-1024 重试恢复 100+ 运行期验收
  - 验收：20个独立 session 先失败再成功，每个阶段逐项验证诊断、写入和唯一 externalRef，新增不少于50条检查。
  - 状态：done（失败阶段40条、成功阶段60条，共100条逐会话断言及最终空诊断检查）。

## 13.0 专注生态第十三批（T-1025~T-1027）

- [x] T-1025 诊断恢复时间排序
  - 验收：持久记录无论输入顺序如何，恢复后按 ISO 时间升序排列，设置页末项始终是真正最新问题。
  - 状态：done（归一化后按时间戳排序，再裁剪最近20条）。
- [x] T-1026 同时间戳稳定裁剪
  - 验收：时间相同的诊断保持原输入顺序；超过20条时保留最后20条，不因排序实现产生随机跳动。
  - 状态：done（原始 index 作为稳定次级排序键，25条同时间记录保留 stable-5～stable-24）。
- [x] T-1027 乱序恢复 60+ 运行期验收
  - 验收：30条逆序数据恢复后逐项核对时间、itemId 和 identity，新增不少于50条检查。
  - 状态：done（20×3 共60条逐项断言，另覆盖长度与同时间稳定性）。

## 13.0 专注生态第十四批（T-1028~T-1030）

- [x] T-1028 重复诊断折叠计数
  - 验收：reason、itemId、identity 完全相同的问题合并为一行，更新时间并移到最新位置，count 累加且封顶9999。
  - 状态：done（运行期 append 使用完整问题键查找、移除并重新追加）。
- [x] T-1029 设置页显示真实发生次数
  - 验收：折叠后设置页数量为各行 count 总和，不误显示为问题行数；旧数据无 count 时按1计算。
  - 状态：done（新增 `completionIssueCount` 汇总，存储恢复兼容 count 缺失/非法/过大）。
- [x] T-1030 重复失败 50+ 运行期验收
  - 验收：同一非法 session 连续25次，每次断言列表仍为一行且 count 正确，新增不少于50条检查。
  - 状态：done（25×2 共50条逐次断言，另验证零写入、identity、count 默认/保留/封顶）。

## 13.0 专注生态第十五批（T-1031~T-1033）

- [x] T-1031 持久重复诊断恢复归并
  - 验收：旧文件或多窗口遗留的相同 reason/itemId/identity 行在恢复时合并；count 求和并封顶9999。
  - 状态：done（恢复路径按完整键使用 Map 归并，不修改 schema v1）。
- [x] T-1032 恢复后最新顺序与容量语义
  - 验收：归并行采用最后一次发生时间并位于其时间顺序位置；不同原因或身份保持隔离；容量限制作用于归并后的20个问题键。
  - 状态：done（排序后删除旧键并重新插入，最终再裁剪最近20个唯一键）。
- [x] T-1033 持久归并 50+ 运行期验收
  - 验收：25条同键持久记录逐项验证关联字段，另覆盖合计次数、最新时间、原因隔离、计数封顶和独立容量样本，新增不少于50条检查。
  - 状态：done（25×2 共50条逐项断言，另有9条聚合/隔离/封顶断言；定向测试与类型检查通过）。

## 13.0 专注生态第十六批（T-1034~T-1036）

- [x] T-1034 诊断导出不可信字段隔离
  - 验收：provider 的 state、布尔状态、版本和能力字段均不得执行访问器；未知状态降级为 error，异常版本省略。
  - 状态：done（导出统一使用 own-data 读取与状态白名单，数值转换异常被隔离）。
- [x] T-1035 导出时间与能力扫描边界
  - 验收：非法导出时间自动替换为当前有效 ISO 时间；能力扫描最多检查128项、导出32项，每项截断80字符，数组访问器不执行。
  - 状态：done（无效日期不再触发 RangeError，稀疏或污染能力数组保持有界）。
- [x] T-1036 防御式导出 50+ 运行期验收
  - 验收：不少于25组 hostile provider，每组验证 getter 零执行、安全状态及有效时间，新增不少于50条检查。
  - 状态：done（25×3 共75条逐项断言，另覆盖 Symbol 版本、能力 getter、未知状态与扫描上限）。

## 13.0 专注生态第十七批（T-1037~T-1039）

- [x] T-1037 外部专注启动上下文可往返校验
  - 验收：itemId 不超过160字符、unit 不超过80字符且均非空；首尾空白或截断风险在调用 provider 前拒绝。
  - 状态：done（新增统一 `dockTomatoStartContext`，canStart 与 start 复用同一校验结果）。
- [x] T-1038 启动竞态二次守门与稳定错误码
  - 验收：即使调用方绕过 canStart 直接执行 start，非法上下文也不得到达外部插件，并返回已有 DOCK_TOMATO_INVALID_CONTEXT。
  - 状态：done（start 在构造 payload 时重新验证，错误可复用现有本地化恢复提示）。
- [x] T-1039 启动上下文 50+ 运行期验收
  - 验收：25组空白、空值、超长 ID/单位分别验证 canStart=false 且 provider 零调用，新增不少于50条检查。
  - 状态：done（25×2 共50条逐项断言，另覆盖最大合法边界、直接 start 拒绝和稳定错误码）。

## 13.0 专注生态第十八批（T-1040~T-1042）

- [x] T-1040 completion 身份无损校验
  - 验收：sessionId/recordId 必须非空、无首尾空白且不超过240字符；不得截断后参与 externalRef 或幂等判断。
  - 状态：done（新增 `exactBoundedText`，合法 session 优先、非法或缺失时可回退合法 recordId）。
- [x] T-1041 持久幂等引用同边界解析
  - 验收：只接受总长不超过251字符且身份不超过240字符的完整 `docktomato:` 引用；空白、截断风险和其它命名空间忽略。
  - 状态：done（历史投影与 completion 使用相同无损身份边界，避免不可能匹配的键污染集合）。
- [x] T-1042 身份边界 100+ 运行期验收
  - 验收：25组异常 completion 身份和25组异常历史引用分别执行不少于两项断言，新增不少于50条检查。
  - 状态：done（两组各50条、共100条逐项断言，另覆盖240字符合法边界与 recordId 回退）。

## 13.0 专注生态第十九批（T-1043~T-1045）

- [x] T-1043 Provider 版本安全投影
  - 验收：Symbol、抛转换异常或非有限版本不得中断实时检测；统一返回 incompatible-version 且不泄漏非法值。
  - 状态：done（新增 `finiteNumber` 并由实时检测与诊断导出共同复用）。
- [x] T-1044 Provider 能力安全有界投影
  - 验收：能力索引 getter 不执行；最多扫描128项、输出32项、单项80字符；实时检测和导出语义一致。
  - 状态：done（新增 `projectCapabilities`，替代直接 filter/slice 读取）。
- [x] T-1045 Provider 投影 50+ 运行期验收
  - 验收：25组污染版本/能力对象分别验证 getter 零执行和诊断可返回，新增不少于50条检查。
  - 状态：done（25×2 共50条逐项断言，另覆盖百万长度稀疏数组的128项扫描边界）。
