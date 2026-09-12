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
