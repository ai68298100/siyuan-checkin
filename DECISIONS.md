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

- D-026 Dock Tomato 联动采用可选只读门面：使用公开 stats facade、availability event、sessionKey 去重和用户任务映射，不读取内部文件路径。

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

- D-040 Importing a snapshot bundle replaces only the bounded restore-point history. It never invokes primary-store persistence; applying data remains a separate explicit restore action with preflight and confirmation.

- D-041 Snapshot safety limits are enforced while reading as well as writing. Portable snapshot envelopes require a valid timestamp and the persisted store array shape before normalization, preventing malformed objects from becoming accepted empty stores.

- D-042 Reminder projection is read-only and storage-neutral. It merges occasions and scheduled check-ins for Review, uses stable source-prefixed identities, and keeps completion mutations on the existing recording paths.
- D-043 The first reminder center keeps completed entries queryable but visually secondary. Overdue, snooze, and skip states require an explicit persisted contract and are deferred to a later 11.0 slice.

- D-044 Reminder filtering is a projection concern. Filtering clones entries and never changes source stores or the canonical sorted projection.

- D-045 Review reminder filter is session-local and defaults to all; it is intentionally not persisted until reminder preferences have a stable schema.

- D-046 Malformed migration JSON remains rejected, but through a stable user-facing parse error before normalization; no synthetic empty store is produced.

- D-047 Overdue reminders initially cover only one-off occasions. Recurring/lunar overdue calculation is deferred until prior-occurrence and completion semantics are explicitly modeled.

- D-048 Overdue is a distinct status, not negative upcoming. This keeps UI copy and future snooze rules unambiguous.

- D-049 Overdue UI is exposed only for the conservative one-off projection; recurring reminders remain absent until prior-occurrence history is modeled.

- D-050 移动端最终布局层放在 components.scss 文件末尾（同特异性后写胜出），多代旧层先删后加，杜绝「竖排按钮」类层叠打架回归。
- D-051 legacy 死代码删除以可证明性为准：仅当容器名/选择器被后置声明覆盖、查询永不匹配时才整块删；曾锁定死块的源码断言一律改锁现行活规则（ui-theme 的 radius 16px 断言实际锁的是从未生效的死值，live 为 20px）。
- D-052 仓库行尾统一 LF（`.gitattributes` `* text=auto eol=lf`，bat/cmd 例外 CRLF）：源码读取型断言按 LF 书写，Windows 检出不再因 autocrlf 把工作区变 CRLF 而假失败；6 个历史 CRLF blob 已随归一化改为 LF。
- D-053 pnpm 构建脚本白名单入版本库（`pnpm-workspace.yaml` allowBuilds：esbuild true、@parcel/watcher false）：pnpm 11 下没有它 `pnpm install --frozen-lockfile` 直接失败，这是此前 GitHub Actions 全部倒在 Install dependencies 的根因；不使用 dangerouslyAllowAllBuilds。
- D-054 修复历史编码损伤以字节证据为准，不靠猜：GBK 混编码行按行转码（DECISIONS.md D-026 行；PROGRESS.md Dock Tomato 行取自最后一个干净版本 24fe250 的 GBK 字节）；已提交的 U+FFFD 字符不可恢复，依任务 ID、提交信息与相邻断言重写（desktop-dialog 守门注释与断言消息、responsive-layout 的 i18n 断言按 i18n.ts 真值重建）。
- D-055 QA 脚本不得硬编码机器路径：项目根一律 `path.resolve(__dirname, "..")`（可被 `CHECKIN_QA_PROJECT_ROOT` 覆盖），playwright 走候选列表解析（`CHECKIN_PLAYWRIGHT_MODULE` → 包内依赖）。原默认值 `D:/AI/Codex/...` 与 sunku 缓存路径会让 CI browser-audit 在 Ubuntu 上必然失败。
- D-056 CSS 预算上调要有核查记录：B-005 处置时先做全量类名引用核查（构建产物 419 个 class 逐一在源码全文验证），确认无死样式才上调（283000 → 318000，新基线 294502 + 8%），并同步 T-109 注释；同时把"样式合并精简"立项为 15.0-A，防止上调变成膨胀豁免。
- D-057 建议确认/取消/撤销动作必须由用户点击触发：确认与撤销先保留旧 store，持久化失败时恢复；取消只迁移建议状态、不修改主 store；智能体建议绝不自动应用。
- D-057 分析历史对比只读取插件内存中的已规范化快照，不从 HTML dataset 恢复正文：历史快照来自独立缓存键并已在 `loadAnalysisSnapshots` 处完成字段、时间、长度、去重和数量限制；DOM 只承载打开动作，正文对比时再按索引读取内存快照。这样可避免大段用户文本进入属性、绕过规范化边界或因 HTML 转义/大小限制造成不一致。
- D-058 回顾页本地总结作为离线兜底独立于智能体：总结只消费已经计算好的 `SummaryContext`，不写入主 store、不调用网络、不伪造智能体来源；智能体正文存在时优先展示，智能体不可用或尚未生成时展示本地统计摘要。这样未配置智能体的核心体验仍完整，且后续接入模型不会改变统计口径。
- D-059 今日页优先提醒只消费 `projectReminderCenter` 的只读结果：横幅不创建新状态、不改变延期/跳过语义；点击打卡提醒只做 DOM 定位和聚焦，点击事项提醒进入事项页。这样 11.0-C 的独立动作存储继续是唯一状态来源，今日页只是低干扰入口。

- D-060 今日页优先提醒队列采用“首条直显、其余折叠且最多展示 5 条”的低干扰策略：section 以标题 aria-label 标识语义，首条按钮使用专用操作文案，其余条目共享通用文案；折叠摘要数量按实际渲染条数计算，避免提示数量与视觉内容不一致。
- D-061 回顾智能总结刷新状态属于页面瞬时状态，不写入主 store 或分析缓存：请求开始即显示禁用态，成功、失败、跨天和离开回顾页都清理状态；这样可避免重复请求和过期响应把按钮永久锁死，同时保留离线本地总结作为稳定兜底。
- D-062 智能体建议采用“确认后、按 before 基线、逐字段应用”的纯函数边界：未确认建议不改变数据，当前值与建议 before 不一致时视为冲突并跳过，结果返回稳定的 applied/skipped/conflicts 供 UI 和审计层消费；持久化仍由上层显式调用。
- D-063 建议信封在进入确认或应用流程前必须经过统一规范化：限制标识与文本长度、校验状态/时间/确认标志、复用字段白名单与数量上限；解析失败返回 undefined，不生成空建议，避免外部智能体输出污染运行时状态。
- D-064 建议审计轨迹采用独立、版本化、最多 50 条的诊断模型，不混入主打卡审计枚举；未知版本和损坏 JSON 一律安全回退为空，动作统计仅用于展示与诊断，不改变建议确认或持久化语义。
- D-065 建议确认/取消使用短时版本化决策令牌（默认 10 分钟）：令牌绑定建议 ID、动作、时间和 nonce；撤销按 after 值做条件回滚，若用户随后修改则记录冲突并保留用户值，避免旧建议覆盖新状态。
- D-066 决策令牌消费采用显式已消费列表（最多 100 条）并区分 invalid/replayed/wrong-decision：状态迁移入口只接受未过期、未重放且动作匹配的令牌；应用、撤销和确认/取消均通过审计转换函数生成诊断记录，仍由上层决定是否持久化。
- D-067 将建议确认流程封装为独立 workflow 门面：门面只编排令牌消费、状态迁移、应用/撤销和审计，不直接写入 store 或存储；这样 UI/API 可共享一致的安全顺序，并可在未来接入持久化而不改变核心模型。
- D-068 工作流恢复必须复用建议信封与审计的规范化边界，并以最新应用审计判断是否可撤销；未知版本/损坏 JSON 回退为空，撤销后不允许重复撤销，避免跨窗口恢复出过期或重复动作。
- D-069 建议工作流面板只负责状态投影与动作入口：pending 显示确认/取消，已确认状态按最新应用审计决定是否可撤销；面板最多展示 8 条变更并统一转义，实际状态迁移和持久化继续由 workflow/API 层处理。
- D-070 SummaryProvider 采用向后兼容的结构化返回：纯文本继续有效，`{text, suggestions}` 先经过统一规范化后才进入工作流；API 对外仍只暴露安全文本，回顾页仅展示首条 pending 建议，范围或日期变化立即清理旧工作流，避免跨上下文误操作。
- D-071 建议工作流状态保存于独立版本化键：恢复时复用条目规范化并且不覆盖主 store；所有写入串入现有保存队列，工作流写入失败只提示，不回滚已经成功的主 store 持久化。
- D-072 待确认建议仅在创建后 24 小时内允许恢复；确认、取消或已应用的建议属于用户已处理历史，继续保留以支持审计和条件撤销。未来时间或损坏快照视为不可恢复并清理。
- D-073 建议面板操作采用异步忙碌态与实时状态播报：点击后立即禁用对应按钮并设置 aria-busy，完成或异常时仅在按钮仍连接 DOM 时恢复，避免重复提交和重渲染竞态；变更列表固定展示前 8 条并明确隐藏数量。
- D-074 建议面板显示最近审计时间但不暴露令牌或内部字段；时间来自最新审计记录，无记录时回退信封创建时间，并在渲染边界统一 HTML 转义。
- D-075 建议按钮操作使用按元素 WeakSet 串行保护，并将同步/异步宿主异常统一收口；完成时仅对仍连接 DOM 的按钮恢复状态，避免重复提交、未处理 Promise 拒绝及重渲染竞态。
- D-076 建议面板动作可用性统一由 workflowActions 纯函数计算：确认/取消仅在 pending 时出现，确认还要求存在变更；撤销依据最新应用审计资格，避免渲染层重复实现状态规则。
- D-077 跨窗口恢复工作流按“最近审计时间→创建时间”单调比较：仅远端更新状态覆盖本地；旧或同时间快照保持当前状态，避免数据变化事件把用户刚做的决策回退。
- D-078 建议确认、取消和撤销成功后显示低干扰双语提示；失败分支沿用持久化/冲突/不可撤销错误提示，避免成功消息掩盖数据安全问题。
- D-079 建议确认完成重渲染后尝试把焦点移到新的可用撤销按钮；查询限定 `:not([disabled])`，找不到可用控件时不强行聚焦，避免键盘焦点落入无效动作。
- D-080 审计明细仅作为可展开只读投影，最多显示最近 10 条并按最新优先；撤销动作使用独立标签，原因和时间统一转义，不改变审计存储模型。
- D-081 对外 API 仅提供 `getSuggestionWorkflow` 只读快照，所有嵌套数组和对象均复制；不暴露工作流持久化、令牌创建或主 store 写入口，避免第三方绕过确认边界。
- D-082 对外新增 `getSuggestionWorkflowSummary` 只读摘要，复用 workflowSummary 并附最近更新时间；返回新对象、空状态为 undefined，不提升 API 主版本，调用方仍应通过能力/版本协商。
- D-083 工作流快照统一通过 `cloneSuggestionWorkflow` 防御性复制，创建流程与对外 API 共用同一克隆边界，避免嵌套数组引用泄漏和实现漂移。
- D-084 建议工作流状态变化通过新增只读集成事件广播（含建议 ID 与状态），不增加外部写入口；现有四类事件保持兼容，订阅方可按需忽略未知新事件。
- D-085 所有集成事件在 `emitIntegrationEvent` 前统一经过 `cloneIntegrationEvent` 校验和克隆；建议事件仅允许有限长度 ID 与固定状态，避免异常 payload 和内部引用泄漏到第三方。
- D-086 建议事件提供独立类型别名与 `isSuggestionWorkflowEvent` 守卫，订阅方可在处理前验证形状；守卫与克隆共用同一 ID/状态约束，避免校验规则分叉。
- D-087 建议只读快照与摘要通过新增 `suggestions.read` capability 协商，标记 `effect: read`、`localOnly: true`；不提升 API 主版本，也不新增任何写权限。

## D-088：组件层不直接消费宿主主题变量（2026-09-14）

- 从 legacy 样式迁入 `ui/components.scss` 时，所有 `--b3-*` 引用必须映射为 `tokens.scss` 中的插件自有语义 token。
- 原因：组件层承担独立浅/深主题，直接依赖宿主变量会让思源主题改变插件视觉，并违反现有响应式架构守门。
- legacy 文件在完全退役前仍可使用由 `tokens.scss` 反向提供的 `--b3-*` 兼容别名；新迁移规则不得扩大该兼容面。

## D-057：9.7.0 正常发版但暂缓集市审核（2026-09-14）

- 决策：将当前已完成的提醒、dock、移动端、回顾页和智能体安全协作能力整理为 `v9.7.0`，按 GitHub Release 正常发布；不提交思源集市审核。
- 依据：自动化质量门禁已全绿，发布资源和版本一致性可复核；真实思源桌面/移动端的 T-023/T-129 仍缺现场证据，暂不把该项写成“通过”。
- 影响：README 只把 GitHub Release 作为当前安装渠道，集市入口改为后续待办；发布说明明确已知限制。发布后优先收集真实客户端验收，再决定集市审核与 15.0 视觉优化。

## D-089：CSS 发布硬线受控放宽（2026-09-16）

- 用户明确允许放宽原 380KB 硬上限；该数值是仓库自设的发布门禁，不是 Webpack 或浏览器的性能硬限制。
- 保留 318KB 历史软线，将 420KB 设为告警线，450KB 设为新的硬阻断线，并在测试中校验三条线严格递增；`test:quality` 必须先生成生产构建，再执行发布资源检查，避免旧 `dist` 绕过门禁。
- 原因：11.0 UI 组件迁移和跨端布局收敛带来可审计的 CSS 增长；完全取消门禁会让后续无意膨胀失去可见信号，故采用一次性、可回收的受控放宽。15.0-A 继续推进样式合并精简，未来可下修基线。

## D-090：12.0.0 发布收口证据（2026-09-16）

- 12.0.0 以最终生产构建生成的 `package.zip` 为唯一发布资产，发布说明中的 SHA-256 必须来自该文件，不接受占位摘要。
- 自动化门禁可以证明源码、构建、结构和浏览器回归通过，但不能替代真实思源桌面/移动端、dock、页签和番茄钟双窗口验收；这些限制继续在 README 与发布说明中明确。
- 本轮只推送 GitHub 仓库并创建 Release，不同步本地集市目录；用户另行提出时再执行集市同步。

## D-091：跨表面采用同一语义骨架与宿主密度变体（2026-09-16）

- 参考 `royc01/pinch` 的 dock/teleport、mode=dock 信息降级与同构任务卡，以及 `HaoCeans/siyuan-points-reward` 的 320px dock、固定状态区和等分操作后，桌面、手机、页签和 dock 继续共享语义结构，差异只由宿主类和命名容器控制。
- 320px 作为窄表面下限；手机与窄 dock 使用五等分底栏，宽 dock 使用紧凑 rail。参考项目只提供信息层级与滚动所有权依据，不复制其视觉品牌，也不引入其可能形成双根滚动的结构。

## D-092：窄端编辑器实行单个整页滚动所有权（2026-09-16）

- 手机与窄 dock 由页面根表面承担整页滚动；`form-scroll` 只负责字段排列，不再形成第二个整页滚动容器。模板、高级项和图标入口因此不会吞掉页面手势。
- 只有图标目录这类边界明确的长清单可以在流内面板中独立限高滚动；手机保存栏锚定宿主并为正文预留底部空间，dock 尾部操作随内容滚入。以后新增长表单必须沿用这一边界。

## D-093：设置导航以滚动容器为真值，ARIA id 按表面实例隔离（2026-09-16）

- 设置页高亮由 `.lc-checkin--settings` 的实际滚动位置决定，scroll + `requestAnimationFrame` 为确定性主路径，IntersectionObserver/ResizeObserver 负责刷新与兼容；绑定必须返回 cleanup，并在重渲染和卸载前释放。
- 同一插件进程可能同时存在弹窗、页签和 dock，故导航目标、标题和说明 id 必须带设置视图实例前缀；禁止重新使用全局固定 id。点击定位、`aria-controls`、`aria-labelledby` 与 `aria-current` 必须引用同一实例。

## D-094：闭合 details 由组件层统一裁切，打开态不改变滚动所有权（2026-09-16）

- 嵌入式 WebView 可能在 author rule 下为闭合 `<details>` 直接子节点保留 flex/grid 盒子；组件层统一使用 `details:not([open]) > :not(summary) { display: none !important; }`，确保折叠菜单、帮助、筛选、模板和审计内容不泄漏空间。
- 该规则只约束闭合态，打开态继续由各组件的现有布局和独立面板滚动规则负责；新增 details 组件必须保留 summary 作为唯一可见触发器。

## D-095：事项按钮归一化只替换图标节点（2026-09-16）

- 事项操作按钮采用 `.lc-checkin__action-icon` 与 `.lc-checkin__action-label` 双节点。重绘时 `normalizeUiIcons` 只更新图标节点，不整体覆盖 `innerHTML`，从而保留标签、title 和辅助技术可读名称；启用图标由 `.is-on` 状态类决定，不依赖可变文本。
- 紧凑事项操作栏继续隐藏 label 以保持固定宽度；标签保留在 DOM 是语义与未来宽表面展示的稳定边界，不改变现有动作钩子或状态迁移。

## D-096：Today 局部刷新只允许同结构、同日期的原子更新（2026-09-16）

- 局部 patch 必须先验证事件日期等于当前 Today 日期，并在 dock、页签、快速窗口等所有可见 surface 上完成目标卡片与结构预检后，才开始任何 DOM mutation。
- 完成态变化、完成区归属变化、准确记录/主记录/批量/拖拽节点增删都视为结构变化，统一回退完整渲染；同结构的数值、进度和徽章变化才可原地更新。
- 该保守边界优先保证跨 surface 一致性和撤销正确性，避免“先移除一个 surface、后发现另一个不匹配”或完成卡片残留在错误分区。未来若要扩大局部更新，必须先补充原子节点重绑与真机焦点/滚动证据。

## D-097：参考插件只提供信息架构证据，不复制视觉或滚动风险（2026-09-16）

- `royc01/pinch` 的等分底部导航（`flex: 1 1 0`、`min-width: 0`、安全区）、任务卡信息分层、弹层矩形对齐和单一滚动所有权可作为本插件的静态守门依据。
- `HaoCeans/siyuan-points-reward` 的窄 dock 固定状态区、打卡后的即时反馈以及积分/成就/日历反馈闭环可用于继续完善信息层级和反馈设计。
- 两个项目的品牌主题、业务模型和可能形成双根滚动的实现不直接移植；本插件继续由宿主密度变体、独立主题 token 与单滚动所有权控制跨端表现。

## D-098：官方集市通过单包 PR 首次收录，后续由 Release 自动更新（2026-09-17）

- 首次上架严格采用 Bazaar 当前流程：同步个人 fork，只向 `plugins.txt` 新增 `ai68298100/siyuan-checkin`，并通过独立 PR 接受官方包检查与维护者审核；不修改生成的 `stage` 数据或夹带其他清单调整。
- 后续版本不重复提交 Bazaar PR，只在插件仓库发布版本号匹配、包含 `package.zip` 的 Latest Release，等待集市自动抓取。
- `ci-passed` 证明发布包满足自动规则，不替代 B-007 的真实思源桌面/手机交互验收；PR 合并后仍需在客户端重启/刷新集市验证实际展示与安装。

## D-099：首个外部计时提供方固定为 Dock Tomato，跨插件契约由提供方拥有（2026-09-17）

- 设置层不再使用含义不确定的“番茄钟插件”，首个 provider 固定为 `docktomato`，适配器 ID 固定为 `siyuan-plugin-docktomato`；旧值自动迁移，未来每个新增插件都有独立 provider 与明确选择。
- Dock Tomato 拥有计时状态机，因此由其提供版本化、消费方无关的公开 focus facade 和持久化后事件；小飞驴打卡只负责用户选择、项目映射、单位换算和幂等落账。禁止 DOM 模拟点击、内部文件读取或私有函数调用。
- Dock Tomato 的第三方 context 只允许 4 KiB 内的有限原始类型；已有计时拒绝覆盖，stop 只暂停，完成事件只在原事务成功后发送。该边界允许任务、积分、日历等插件复用，同时保证任何消费方故障不反向破坏番茄钟记录。

## D-100：v1 完成通知保持实时事件，补偿读取延后到显式查询契约（2026-09-17）

- `tomato:focus-session-completed` 只承担同一运行环境内的低耦合通知，不宣称跨插件重载、窗口关闭或离线期间可靠必达；消费方必须按稳定 session ID 幂等处理。
- context 进入同步状态语义签名并随安全历史草稿持久化，为未来补偿提供关联依据，但 v1 不开放内部文件路径，也不让消费方直接读取 Dock Tomato 私有历史结构。
- 未来若增加最近完成查询，必须先共同确定 consumer/correlationId 过滤、最大条数、时间游标、权限、保留期和原始发生时间写入口径；在这些边界未确定前，不用“功能完整”之名引入隐式耦合。

## D-101：外部专注 context 必须绑定唯一 session，公开动作按真实语义命名（2026-09-17）

- Dock Tomato v1 在外部启动前生成 focus session ID，并将 context 与该 ID 一同进入同步语义状态；状态读取与历史完成事件只有在 active/completed session 匹配时才携带 context，杜绝陈旧同步字段被后续手动会话继承。
- 公共动作使用 `pause()` 和 `tomato:focus-session-paused`，不再用 `stop()` 表示非破坏性暂停；真正放弃/终止若未来开放，应使用独立能力、权限和事件。
- 该本地 PR 完成自动化审计后冻结，等待用户明确通知再创建远端 PR；后续小驴打卡主线按 13.0 专注生态到 18.0 开放生态推进。

## D-102：外部计时不可用时诊断并显式降级，不静默改偏好（2026-09-17）

- “未安装”“版本不兼容”“API 缺失”“能力不足”“恢复中”“已有运行/暂停会话”和“状态读取失败”具有不同恢复方式，必须分别呈现；适配器数量不能替代提供方健康状态。
- 外部提供方不可用时保留用户选择并解释原因，只提供显式“改用自带番茄钟”动作。这样插件稍后加载或恢复后仍能按原选择工作，也避免用户偏好在后台被改写。
- 外部生命周期事件可能在同一事务内连续到达，UI 刷新必须合并；插件卸载先标记 bridge disposed，再释放监听器，排队回调不得访问已销毁表面。

## D-103：完成回写使用启动口径并在漂移时拒绝，不按结束时配置猜测（2026-09-17）

- 外部专注开始时写入的 itemUnit 与 tomatoMode 是本次 session 的计量契约；完成时若项目已删除、归档或映射改变，自动回写必须拒绝并提示用户核对，不能用结束时的新配置重新解释旧会话。
- 幂等边界同时使用正在处理、当前运行期已完成和 store 中已有 externalRef；只有写接口返回真实记录后才加入完成集合，失败仍允许提供方重试。
- 拒绝与失败诊断是有界的运行期观察信息，不冒充持久可靠队列。跨重载补偿仍等待上游显式查询契约，不通过读取私有历史实现。

## D-104：诊断可持久化但不充当完成补偿队列（2026-09-17）

- completion 问题使用独立 schema v1 存储并限制为最近 20 条，只为热重载后排障和用户导出；它不重放事件、不自动补写打卡，也不改变 D-100 的实时事件边界。
- 支持包只包含 provider 健康快照、稳定原因码、时间、受限 itemId/session identity；不包含项目名称、备注、打卡正文或完整主 store。外部能力最多 32 项、单项 80 字符，关联字段继续沿用 160/240 字符边界。
- 损坏 JSON、未知 schema、未知原因和非法日期按空诊断处理；导入式恢复只接受自有数据字段，不执行 getter。跨窗口通过思源既有 `onDataChanged` 重新读取独立存储，不额外建立未经验证的广播协议。

## D-105：外部状态不可读时保持所有权并关闭新启动（2026-09-17）

- 外部插件状态读取失败属于“不确定”，不能解释为“空闲”：小飞驴打卡保留当前专注所有权并进行有限轮询，避免同一项目误启第二个计时；新启动资格同时 fail-closed。
- provider 返回对象视为不可信输入，版本、能力、方法、状态布尔值和 sessionId 均只读取自有数据属性，不执行 getter；方法调用保留原 receiver，兼容依赖 `this` 的公开 facade。
- ended/completed 既影响所有权也影响可见诊断，因此都触发合并后的后台刷新；卸载标记优先于计时器回调，任何剩余轮询不得访问已销毁表面。

## D-106：跨插件桥接必须有可执行宿主测试，不以源码守门替代行为（2026-09-17）

- 静态契约检查继续负责事件名、公开方法和文案边界，但注册、调用参数、异步完成、幂等、刷新合并与卸载清理必须在 FakeWindow + facade + consumer API 中真实执行。
- 假宿主只模拟双方已经定义的公共能力，不臆造思源 API；真实客户端加载顺序和多窗口事件仍由 B-007 验收。
- 每个新增 provider 都应复用同类行为门禁：至少验证资格关闭、唯一身份、写入失败可重试、外部 consumer 隔离和 dispose 零副作用。
