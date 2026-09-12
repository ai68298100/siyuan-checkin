# 决策
- D-001 独立双主题（不跟思源色） | 用户要求固定最好看的配色 | 所有 --b3-* 在插件作用域内重定义
- D-002 五项导航 | 用户要求精简（归档入回顾） | today/review/occasions/settings
- D-003 默认不分组 | 用户要求平铺列表放更多打卡内容 | TodayGroupMode 默认 "none"
- D-004 弹窗默认 90% | 用户实测反馈 80% 偏小 | dialogScale 默认 90
- D-005 手机端全屏 | 用户要求像原生 App | 100vw × 100dvh + 去除弹窗外观
- D-006 事件索引用 WeakMap | 按店对象自动缓存/失效，无泄漏 | model.ts getStoreIndex()
- D-007 保留 legacy index.scss 作底层地板 | 未全量覆盖前保底 | P6 退役
- D-008 版本号 8.8 在 9.0 后 | 功能完整性优先于语义版本 | 后续用 9.x 递增
- D-009 T-020（i18n 全量）推后到 T-021 之后 | 全量涉及数百字符串，风险大；先做可程序化验证的无障碍审计 | T-020 按页面分批迁移（today → settings → review → occasions/editor）
- D-010 引入文本专用色 token（accent/success/warning/danger/warm/gold-text + accent-fill/contrast） | WCAG 4.5:1 要求文本比填充更深；填充保持品牌色、深色模式填充配深色文字 | 审计脚本 tests/accessibility-audit.test.cjs 守门
- D-011 桌面弹窗默认「自适应」尺寸（clamp(760px,62vw,1440px) × 88vh）并支持拖动/八向缩放/双击最大化，尺寸与位置记忆进视图偏好（dialogRect/dialogOffset） | 按屏幕百分比放大的是空白不是内容：内容列有上限，百分比模式在大屏只增加留白 | 保留 percent/fixed/fullscreen 供手动选择；任一手动拖动即切到 auto 并记住
- D-012 弹窗内容列宽阶梯走 `@container lc-dialog`（宿主自身容器），阈值 1000/1400/2000 → 布局上限 1040/1400/1780 | 旧版写成 `@media (min-width)` 且置于 700px 基础上限之前，同特异性被后置规则覆盖成死规则（实测 1845px 弹窗内容列仅 542px 恒单列） | 新阶梯必须排在该 700px 基础上限之后；tests/desktop-dialog.test.cjs 锁顺序与阈值
- D-013 `.lc-checkin` 上生效的容器名是 **lc5**（tokens.scss 的 `container: lc5 / inline-size` 在 index.scss 之后导入，覆盖了 `container-name: lc-checkin`）；页面布局以容器宽度为准，不用视口 @media | index.scss 里十余处 `@container lc-checkin (...)` 因而全是死规则，另有 `@media (min-width:900/1500px)` 块按窗口决定页面布局，造成「弹窗大而布局按小屏走」 | 新增/修改布局规则一律用 `@container lc5`；遗留死块的清理见 T-025
- D-014 今日卡片操作区用「固定轨道 + 显式 grid-column」而不是 flex 自适应（`--lc-action-slot: 34px` / `--lc-action-primary: 92px→104px`；focus=轨道1、主按钮=轨道2、⋯=轨道3、拖拽柄=轨道4 且仅在手柄存在时占位） | flex 自适应会让操作区宽度随按钮数量变化（完成型无 ⋯、时长型多"开始专注"），导致主按钮在不同类型间横向漂移 34–68px、文字列宽也逐卡不同 | 新增按钮务必落在既定轨道；改操作区先看 tests/desktop-dialog.test.cjs 的对齐断言；今日货架最小卡宽 380px 与轨道宽度耦合（390 以下名称开始被压）
- D-015 手机端顶栏/底栏用「结构固定」而不是 sticky/fixed 技巧：顶栏与底栏由 JS 挂在宿主元素上（滚动容器之外），宿主自身是 flex 列（顶栏 / 滚动区 / 底栏），中间滚动区 flex:1 + overflow:auto | sticky 会被"包含块=内容盒"限制而在滚动中上浮（实测底栏 712→668 漂移）；fixed 在思源弹窗里取决于祖先是否有 transform，行为不稳定；把栏放到滚动容器之外，滚动在结构上不可能影响它们 | 结构属性（display/flex/position/margin/padding/overflow）在这几处用 !important 收口，因为 index.scss 与 modern-v4 有多处同/更高特异性的 padding/position 规则会反复覆盖；新增样式请勿再给 .lc-checkin 根容器写 padding（会与滚动区冲突）
- D-016 容器查询不能匹配容器元素自身（`@container lc5 { .lc-checkin { padding: 0 } }` 对 .lc-checkin 无效，只作用于其后代） | 初次实现时把滚动容器的 padding 重置写在 @container lc5 里，被 index.scss 各页预留的 88/82/68px 底栏内边距覆盖，排查耗时 | 需要改容器自身的盒模型时用：祖先类名（如 .lc-checkin-dialog-host--mobile）、视口 @media，或宿主上的内联样式；仅后代才用容器查询
- D-017 归档（archived）作为一等导航项：桌面 rail 与手机/侧边栏底栏都直接可达（此前手机与侧边栏只能从回顾页头部的按钮进入） | 归档是"回顾/清理"之外的高频独立意图，藏在二级入口会让用户以为没有归档功能；同时归档数据仍与主数据同库（archivePeriods 表达归档区间），不拆存储——拆存储会破坏跨区间的连续记录与统计口径 | 新增页面入口时同步更新 rail + renderMobileNav 两处（tests/desktop-dialog.test.cjs 已锁）；不要为归档单独建 store
- D-018 窄容器 ≠ 手机：所有"手机专属"的折叠/紧凑规则必须按宿主类名（lc-checkin-dialog-host--mobile / lc-checkin-dock-host）限定，不能按容器宽度 | 侧边栏 dock 也是窄容器但没有移动顶栏，按宽度限定时页内头部被折叠且无替代，标题/日期/进度/新建全部消失（T-027 引入、T-028 修复） | 判断依据是"这个表面有没有那条替代 UI"，不是"它有多窄"
- D-019 备份与冲突测试纳入主测试链 | 这些模块属于数据安全主流程，单独脚本容易在重构后失联 | `pnpm test` 现在固定执行 `tests/backup.test.cjs` 和 `tests/conflict.test.cjs`
- D-020 宽度走查启动失败按环境阻塞处理 | `tests/width-walkthrough.cjs` 在 Playwright `browserType.launch` 阶段找不到 Chromium，尚未执行任何断言 | 记录 B-002，待浏览器运行时可用后重试，不修改宽度断言或伪造结果
- D-021 宽度与无障碍浏览器测试优先使用显式 `CHECKIN_BROWSER` | Playwright 默认缓存可能缺少 Chromium，但系统 Chrome 可提供等价的 Chromium 运行时 | 使用系统 Chrome 完成 T-033，不修改测试断言
- D-022 大版本路线按稳定维护→数据迁移→计划提醒→分析生态推进 | 当前自动化质量已收敛，唯一阻塞是真实客户端；继续增加孤立 UI 功能会扩大未验收面 | 新路线写入 `docs/development-roadmap.md`，9.x 只处理反馈，10.0 起做平台化能力
- D-023 发布前统一执行 `test:quality` | 分项脚本较多，遗漏任一项都会削弱发布证据 | 保留分项脚本用于定位失败，同时提供顺序门禁入口
- D-024 环境诊断兼容 pnpm shim | Windows 下 `pnpm.ps1`/`pnpm.cmd` 可能导致子进程探测差异 | 诊断优先执行 pnpm.cmd，并在 pnpm 运行上下文用 `npm_config_user_agent` 兜底

- D-025 migration report uses sourceVersion and targetVersion together so restore preview can explain both data origin and normalized model.

- D-026 Dock Tomato �������ÿ�ѡֻ�����棺ʹ�ù��� stats facade��availability event��sessionKey ȥ�غ��û�����ӳ�䣬����ȡ�ڲ��ļ�·����

- D-027 Mobile primary navigation order is Today / Review / Add / Occasions / Settings. Add is the centered raised action and remains present in the editor so a long or keyboard-constrained form cannot trap navigation.
- D-028 Occasion placement follows urgency: if any visible occasion has status today, the banner precedes the item list; otherwise it follows the list to preserve check-in priority.

- D-029 Audit logs are normalized at storage boundaries and exported with an explicit format/version envelope. This keeps corrupted local records out of the UI and leaves room for backward-compatible diagnostic tooling.

- D-030 All audit writers use appendStoreAudit rather than duplicating array slicing. Validation, defensive copying, and retention therefore remain one model-level invariant.

- D-031 Local snapshot restore uses the same migration report, validation, and risk assessment as imported JSON. A storage snapshot is trusted only after validation; normalization alone is not sufficient authorization to overwrite current data.

- D-032 Recovery callers consume preflightJsonRecovery as one result. Report construction, risk assessment, and validation must not be independently assembled by each restore entry point.

- D-033 Recovery audit payloads use a shared builder and explicit accepted/rejected status. The source remains json-import or local-snapshot while field names remain identical across both flows.

- D-034 Primary store persistence determines recovery success. Audit persistence is best-effort diagnostics and cannot reverse a successful store write; a failed store write still restores the previous in-memory store before reporting failure.

- D-035 Snapshot storage uses a versioned envelope with capturedAt and normalized store content. Readers accept legacy raw stores indefinitely; metadata is informative and does not change recovery validation.

- D-036 Automatic snapshot history retains the latest three pre-write stores. The default restore action continues to select the newest entry; format readers remain backward-compatible with one-envelope and raw-store backups.
- D-037 Snapshot restoration sets this.store to the selected backup and calls persist() with no override. The persistence layer independently captures the previous lastPersistedStore into history.

- D-038 Settings exposes all retained snapshot entries newest-first while preserving Restore latest as the quick action. Selection passes the original history index so display reversal does not change the restored entry.

- D-039 Snapshot history export is a diagnostic/portable bundle with its own format marker. Clearing the history requires confirmation and never changes the primary check-in store.
