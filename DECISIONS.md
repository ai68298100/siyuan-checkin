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

## D-107：写失败保留最小关联信息，迟到异步结果服从卸载边界（2026-09-17）

- write-failed 仅保留有界 itemId 和 provider identity，帮助用户定位并由提供方重试；不保存项目名称、备注或 payload 全文。
- 空返回与抛错具有相同幂等语义：都不标记完成、不吞掉 session，后续同身份完成通知仍可重试；只有真实记录返回后才进入完成集合。
- 插件卸载是异步任务的最终边界。已发出的存储调用无法撤销，但其迟到结果不能重建 bridge 内存、诊断或 UI 刷新状态。

## D-108：in-flight 身份采用 handler 所有权，duplicate 无权释放（2026-09-17）

- `inFlightIdentities` 不只是集合，也是并发写锁。只有实际把 identity 加入集合并开始持久化的 handler 才拥有释放权；观察到 duplicate 后提前返回的 handler 不得在 finally 删除共享锁。
- 幂等验证分为写入中与写入后两阶段：前者由 owner-held in-flight identity 阻断，后者由 store 的 externalRef 阻断；运行期 completed 集合只是加速层，不是唯一正确性来源。
- duplicate 属于预期重放而非用户故障，不进入诊断列表、不产生提示；只有格式、映射或持久化问题才需要可见处理。

## D-109：历史幂等索引按不可信数据读取（2026-09-17）

- 主 store 虽由本插件维护，但可能来自旧版本、恢复包或损坏同步，因此用于幂等的 externalRef 也必须按不可信数据处理，不执行 getter、不接受非字符串、不扫描无限长度。
- 历史去重只识别 `docktomato:` 命名空间并剥离前缀后的身份；其它 provider 或手工 externalRef 不进入 Dock Tomato 判定集合。
- 已落账重放是正常恢复路径，保持安静；损坏历史字段被忽略，让当前事件继续按自身合法性处理，而不是让一条坏记录阻断所有后续回写。

## D-110：历史幂等投影保持完整性，先消除中间分配而非截断扫描（2026-09-17）

- 为保证很早以前的 session 仍不会重复记账，当前不按最近 N 条截断历史；优化采用一次循环直接构建 Set，去掉三段数组分配和重复身份。
- 若未来十万级数据证明全量扫描成为瓶颈，应在 14.0 数据内核建立可校验的 provider identity 索引，并通过迁移/重建保证正确性，不能仅靠固定窗口牺牲幂等。
- 投影函数保持纯粹、可独立测试，不缓存主 store 引用，避免跨窗口更新后使用陈旧索引。

## D-111：Provider 注册以 facade 对象身份为生命周期边界（2026-09-17）

- availability 可高频重复，若 facade 对象未变且已有 disposer，注册保持不动，仅合并 UI 刷新；避免重复 adapter、重复监听和无意义状态闪烁。
- facade 对象变化视为 provider 热重载：先调用旧 disposer，再为新健康实例注册；缺失、不兼容或不可读状态只解绑，不保留指向失效插件实例的闭包。
- 全局 provider 容器同样是不可信边界，发现过程只读取自有数据属性；访问器污染按未安装处理，不让第三方 getter 进入插件调用栈。

## D-112：结束释放采用有界确认，不把 ended 等同于立即 idle（2026-09-17）

- Dock Tomato 的结束事件与状态持久化/广播可能存在短暂顺序差，收到 ended 后先读取公开状态；仍 active 时每250ms重试，最多20次（约5秒）。
- 轮询期间不提前释放小驴打卡的 active adapter，避免用户在提供方仍活动时启动第二个计时；轮询也不重复刷新 UI，状态事件本身负责可见更新。
- 达到上限只停止观察并清理 timer 标识，不猜测 provider 已空闲；后续 lifecycle 事件可重新触发确认。

## D-113：可恢复故障在真实成功后按 session 精确解决（2026-09-17）

- write-failed 是可恢复状态，不应永久成为历史错误；只有 recordEvent 返回真实记录后，才删除同一 identity 的 write-failed 诊断。
- 解决范围不按 itemId 批量匹配，因为同一项目可能有多个独立失败 session；也不删除 invalid-duration、mapping-changed 等仍需用户理解的非写入问题。
- 诊断解决与成功回写在同一 bridge 流程中触发持久化刷新，设置页最终反映当前未解决问题，而导出的支持包不会继续携带已恢复噪音。

## D-114：诊断恢复以事件时间决定新旧，同时间保持输入稳定性（2026-09-17）

- 存储数组顺序可能因同步、旧版本或手工恢复而不可靠；恢复时以已校验的 ISO 时间排序，使 UI 的“最近一次”和20条容量窗口符合真实发生顺序。
- 相同时间戳不使用 reason、itemId 或 identity 做业务排序，而使用原输入位置保持稳定，避免无意义重排改变用户排障上下文。
- 排序只作用于最多进入内存前的诊断文件，不改变主打卡事件顺序；容量仍固定20条，避免诊断恢复扩大内存占用。

## D-115：重复诊断折叠展示，按完整问题键隔离（2026-09-17）

- 高频重发同一坏事件不应挤掉其它有价值的问题；运行期按 reason + itemId + identity 完整键折叠，更新时间并移到末尾，UI 仍能识别它是最近发生的问题。
- count 表示实际发生次数，设置页汇总 count 而非数组长度；为防损坏数据或无限增长，单行计数上限9999。
- 不仅按 reason 或 itemId 折叠，避免同一项目的不同 session、或同一 session 的不同故障互相覆盖；成功重试仍只解决对应 identity 的 write-failed。

## D-116：持久诊断在排序后按完整键归并（2026-09-17）

- 运行期折叠不能消除旧版本或多窗口已写入的重复行，因此恢复路径也执行相同的 reason + itemId + identity 完整键归并。
- 先按已校验时间稳定排序，再让重复键删除后重插，保证聚合行的时间与位置均代表最后一次发生；计数求和后仍封顶9999。
- 20条容量限制作用于归并后的唯一问题键，避免重复行在裁剪前挤掉其它故障；存储 schema 仍为 v1，旧数据无需迁移写回即可读取。

## D-117：用户触发的诊断导出仍视输入为不可信（2026-09-17）

- 即使正常入口传入内部 provider 快照，诊断序列化函数也可能被未来 API、测试工具或损坏状态直接调用，因此所有字段使用 own-data descriptor 读取，不执行 getter。
- provider 状态只接受九个稳定枚举，未知值降级为 error；版本数值转换允许失败并省略，能力数组最多扫描128项、收集32项，避免稀疏巨数组拖慢导出。
- 非法 exportedAt 不再让用户点击导出时报错，而是替换为调用时的有效 ISO 时间；该修复只影响支持包元数据，不修改主数据或问题发生时间。

## D-118：外部专注上下文必须无损往返（2026-09-17）

- completion 消费端对 itemId 和 unit 有160/80字符边界，因此启动端不能发送会被截断或 trim 后改变的字段，否则一次合法计时也无法匹配回原项目。
- canStart 与 start 共享上下文构造器：前者让 UI 提前禁用不可用入口，后者防止状态变化或直接调用绕过资格检查。
- 不自动修剪或截断项目字段，因为那会让外部 session 绑定到不同标识；非法上下文使用既有 DOCK_TOMATO_INVALID_CONTEXT 错误码和用户提示。

## D-119：幂等身份禁止规范化后使用（2026-09-17）

- sessionId、recordId 和持久 externalRef 都是身份而非展示文本；对身份执行 trim 或 slice 会让两个不同上游值碰撞成同一幂等键，因此必须原样满足边界才接受。
- sessionId 缺失或非法时仍允许使用合法 recordId，这是既有契约的降级路径；两者均非法时返回 missing-identity，不创建截断后的 externalRef。
- 历史投影只接收总长不超过 `docktomato:` 11字符加240字符身份的完整引用，并再次校验拆分后的身份，使运行期与跨重载去重语义一致。

## D-120：Provider 检测与诊断导出共享安全投影（2026-09-17）

- 实时检测和支持包导出面对的是同一个第三方 facade 边界，版本与 capabilities 不应各自维护不同的强制转换和数组读取逻辑。
- 版本通过捕获异常的有限数值投影处理，Symbol 等值降级为未知版本；能力数组只读取自有数据属性，最多检查128个索引、输出32项。
- 缺失 capabilities 继续兼容早期 provider，但只要声明了非空能力列表，就必须满足 REQUIRED_CAPABILITIES；此次加固不改变协商策略。

## D-121：状态与诊断关联字段同样遵守身份无损原则（2026-09-17）

- status.sessionId 虽然当前主要用于状态观察，未来可能进入恢复或冲突提示，因此不能保留一个与 completion 身份不同的 trim/slice 语义。
- 诊断 itemId/identity 参与重复折叠和成功解决匹配，截断会错误合并不同故障；非法字段改为省略，reason 与时间仍可用于排障。
- 容量测试使用合法的唯一240字符身份，不再依赖截断产生唯一值，确保测试分别证明“容量限制”和“身份完整性”。

## D-122：损坏诊断数组只扫描有界尾窗（2026-09-17）

- 正常诊断文件最多20行，远超该规模的数组已属于损坏或恶意输入；恢复时最多检查最后512个自有数据项，兼顾近期问题和防止百万稀疏数组阻塞 UI。
- 不使用 map/filter 直接索引，因为数组元素也可能被访问器污染；每个位置通过 ownDataValue 读取，getter 视为空项。
- count 与 provider 版本共用异常隔离的有限数值转换，Symbol 等值按兼容默认1恢复，不让单条损坏记录清空全部诊断。

## D-123：诊断文本在 JSON.parse 前设512KiB硬边界（2026-09-17）

- 正常诊断仅20个有界对象，512KiB 已远高于合法写出规模；超过该值意味着损坏或非本插件数据，应在解析前拒绝，避免先付出大字符串解析成本。
- 边界采用字符数而非磁盘字节数，因为恢复函数接收的是已加载 JavaScript 字符串；精确上限继续允许，保持明确可测试的闭区间语义。
- 超限恢复与非法 JSON 一样清空内存诊断并返回冻结空快照，不尝试截断 JSON，因为截断后内容不完整且可能产生误导记录。

## D-124：completion 项目解析不信任数组与字段访问器（2026-09-17）

- bridge 正常接收主 store 项目，但 completion 判定是独立导出的安全边界；损坏数组或对象不应执行 getter，更不应被 catch 分支误记为 write-failed。
- 项目查找通过 ownDataValue 读取数组元素和 id，未找到稳定返回 missing-item；找到后 archived、unit、tomatoMode 也只接受自有数据属性。
- 不限制项目数组长度，以免大型合法仓库找不到旧项目；13.0 先消除副作用，十万级索引和查询性能按路线归入14.0数据内核。

## D-125：Completion 回调必须原样复现启动上下文（2026-09-17）

- itemId、itemUnit、tomatoMode 是启动时签名的一部分，消费端不能通过 trim/slice 接受被修改的回调；任何不可无损往返字段均按 invalid-context 拒绝。
- durationMinutes 的公共契约是 number，不接受数值字符串或对象隐式转换；这既避免执行第三方 valueOf/toString，也避免不同 provider 对字符串格式产生歧义。
- 严格校验位于项目匹配和持久写入之前，因此异常 payload 不调用 recordEvent，也不会污染幂等身份集合。

## D-126：历史幂等扫描绕过数组迭代协议但保持全量（2026-09-17）

- `for...of` 会读取数组 Symbol.iterator 并通过迭代器访问元素，即使 entry.externalRef 使用 ownDataValue，污染数组仍可在进入边界前执行代码。
- 改用长度索引循环并以 ownDataValue 获取每个位置，访问器和空洞视为空项；externalRef 继续使用无损身份校验。
- 不设历史数量上限，因为任何被漏掉的旧 externalRef 都可能造成重复记账；大型索引优化必须由14.0可重建索引解决。

## D-127：宿主专注释放按在途操作单飞（2026-09-17）

- completed 与 ended 可能连续、重复或由上游重放；当 provider 已空闲时，两类事件都可能请求释放本插件的专注所有权。
- stopFocus 是异步生命周期操作，同一在途窗口只允许一次调用；后续事件共享该结果，不排队重复 stop，也不创建无意义的空闲轮询。
- 操作结算后解除单飞，允许未来新会话再次释放；结算回调必须复查 bridgeDisposed，防止卸载后的迟到 Promise 刷新已销毁界面。

## D-128：设备能力规则由组件层统一拥有（2026-09-17）

- coarse-pointer、reduced-motion 与 print 都描述跨页面交互能力，不应继续在 legacy 与组件层各保留一份并依赖加载顺序覆盖。
- 将 legacy 独有声明并入组件层已有的同类 media block，再删除旧块；触控目标、安全区、编辑器控件和打印隐藏语义保持不变。
- 相关移动测试改为锁定 `ui/components.scss` 的现行真值，并新增 legacy 禁止回流守门；这属于样式归属迁移，不改变业务行为。

## D-129：Legacy 样式以零生产引用方式退役（2026-09-17）

- `index.scss` 剩余主题、页面和表单规则均已有 tokens/components 后置真值；继续打包只会增加重复 CSS 与加载顺序耦合。
- 缺失的 control-height、density-scale、section-gap 正式归入 token 层；模板管理器的必要规则迁入组件层并改用插件语义色。
- 入口移除 legacy import，文件暂保留一行退役说明供历史测试和迁移审计读取；任何 active selector、media block 或 root token 回流都由 legacy audit 阻止。

## D-130：移动结构测试必须进入标准门禁（2026-09-17）

- 独立测试文件若不在任何 package script 中执行，会在布局演进后静默过期，无法提供发布保护。
- 移动编辑器当前由宿主外固定操作栏占用64px，布局只预留这一份高度；测试应锁定现行结构语义而不是旧的12px临时值。
- `mobile-editor-structure` 纳入 `test:mobile`，使本地质量链和 CI 都覆盖模板、图标、独立滚动、安全区与操作栏结构。

## D-131：测试文件必须可执行或显式退役（2026-09-17）

- 测试文件仅存在于目录中并不代表受到 CI 保护；package scripts 才是实际执行边界。
- 13个原孤立测试组成 `test:extended` 并接入完整质量链；测试资产清单逐文件验证，规模不少于50项。
- 结构测试应读取功能当前所属的 render/bind 模块，而不是继续把 `index.ts` 当作所有 UI 与交互实现的唯一位置。
- 显式退役集合仅用于迁移缓冲，不作为长期白名单；本轮已将4个旧单体结构测试全部迁移，当前退役数为0。

## D-132：事件只读索引绑定不可变 Store 身份（2026-09-17）

- 主存储写路径以新 store 对象表达变更，因此 WeakMap 可以安全地让同一快照复用索引，并在替换 store 后自然失效和回收。
- 一次遍历同时构建项目日期、日期和事件ID三路索引；回顾月历、日期明细和事件操作共享同一数据真值，避免各自建立临时 Map 或执行 find。
- 重复事件ID按数组中的首项确定性解析，与原先 `find` 行为一致；索引只优化读取，不改变规范化、冲突或持久化结构。

## D-133：范围索引按需构建并保持持久顺序（2026-09-17）

- 日期范围采用 `[start, end)` 半开语义，与现有摘要边界一致；排序投影通过二分查找缩小候选集合。
- 日期排序会改变跨日期交错写入的持久顺序，因此命中候选按原 ordinal 恢复顺序后再返回，公共 API 行为不因优化而变化。
- 排序投影仅在首次范围查询时建立并缓存到 store 索引；Today 和单日回顾不需要范围查询时不支付排序成本。

## D-134：12.0.2作为数据读取与质量治理维护版本（2026-09-17）

- 本轮不迁移持久数据 schema；事件、范围和项目索引都绑定内存中的不可变 store 快照，可随对象替换自动失效。
- Dock Tomato 消费端代码与诊断可以随维护版发布，但 README 必须明确上游兼容 API 尚未发布，不能把自动化契约描述成已经可用的真实联动。
- 发布前版本真值、README、变更记录、Release notes、完整质量链和产物摘要必须一致；真实宿主验证继续作为非阻塞限制披露。

## D-135：快捷记录增量按日期修订持久化（2026-09-17）

- “每次打卡”会直接决定快捷按钮写入的事件值，和目标、单位一样属于任务在某日期生效的记录语义，因此同时写入任务当前投影与 `CheckinItemRevision`。
- 旧数据不强制迁移：字段可选，缺失或非法时继续调用既有类型/单位默认值，确保喝水250毫升、时长5分钟等历史行为不变。
- 二元任务始终记录1且隐藏该控件；分钟与小时切换同时换算目标和增量，避免单位变化后数值含义意外放大60倍。

## D-136：纯展开折叠交互优先原地更新（2026-09-17）

- 已完成区折叠不改变数据投影，点击时直接同步 hidden、箭头与 aria-expanded，并异步保存偏好，无需重建整个 Today DOM。
- 这样保留手机端滚动位置、焦点和卡片节点，也消除多表面完整渲染时序造成的“点击后看起来没折叠”风险。

## D-137：快捷增量使用独立规范化与日期口径（2026-09-17）

- 目标值的输入粒度用于规划目标，不应限制每次记录值；快捷增量因此单独定义输入步长，次数保持整数，其余类型允许两位小数。
- 增量与目标、单位一样按日期修订读取。历史修订缺少增量表示当时使用类型默认值，不能回退到任务当前字段，否则修改今天配置会重写过去交互语义。
- 所有持久入口共享同一纯规范化函数，避免编辑保存有上限而导入/模板没有上限的口径分裂。

## D-138：用户写入前必须在同一排他锁内完成三方收敛（2026-09-17）

- 多窗口可靠性不能只比较当前内存和远端；必须以最后成功持久化快照为基线，对基线、本地、远端执行冲突检测与确定性合并。
- 远端读取、必要的合并回写以及随后的用户 mutation 保持在同一 Web Lock 临界区，避免对账完成后到实际写入前再被另一窗口插入。
- lastPersistedStore 表示最后一次成功主存储写入，不是保存提示 UI 状态；任何成功写入都必须推进它，否则后续会重复报告已经吸收的冲突。

## D-139：主存储成功以回读收敛为准（2026-09-17）

- `saveData` Promise 完成只证明宿主接受了写请求，不能证明随后读取的主 store 仍包含该快照；非协作窗口或同步回放可能在临界点覆盖内容。
- 写后回读若已经是期望值的确定性超集，直接接受并吸收额外数据；若缺失期望数据，则合并双方并仅重试一次，避免无界写入风暴。
- 两次仍无法收敛按真实保存失败处理，由现有回滚和错误反馈路径接管，不向用户宣称记录成功。

## D-140：十万级范围查询继续采用按需排序投影（2026-09-17）

- 十万级历史的主要成本应在首次需要范围分析时支付；Today、单日记录和普通项目查询不应为未使用的范围功能预先排序。
- 首次构建后由 store 身份绑定的 WeakMap 复用排序投影，后续范围通过二分缩小候选并恢复持久顺序；store 替换时自然失效。
- 性能门槛采用宽松的跨机器上限防止灾难性退化，不把单台开发机的毫秒值当作产品承诺。

## D-141：删除意图不能依赖事件仍在当前快照中（2026-09-17）

- 多窗口对账可能先让待撤销事件从当前窗口消失；若此时因为取不到完整快照而不写墓碑，旧窗口稍后重放同ID就会复活已删除记录。
- 已知事件ID本身足以建立最小墓碑，因此字符串删除始终保留ID墓碑；只有完整事件快照存在时才附带外部身份，用于阻断同externalRef但不同ID的重放。
- 手动事件没有跨ID稳定身份，不推测其业务等价性；只阻断同ID重放，避免误删用户真实的独立打卡。

## D-142：墓碑索引按操作重建而不进入存储协议（2026-09-17）

- 墓碑是长期可靠性凭据，不能为缩短数组而牺牲旧窗口重放保护；规模问题应通过可重建查询索引解决。
- normalizeStore 和 mergeStores 对一个操作只构建一次 ID Set 与 external identity Set，把事件过滤从 O(events × tombstones) 收敛到线性构建和查询。
- 索引是瞬时派生数据，不持久化、不迁移，也不跨 store 对象缓存，避免失效管理和备份协议复杂化。

## D-143：单次记录追加复用当前 store 的完整事件投影（2026-09-17）

- Today 渲染和进度查询通常已经为当前不可变 store 建立 WeakMap 索引；打卡追加应复用该投影，而不是再次扫描完整事件历史和墓碑数组。
- 投影同时维护事件ID、外部身份和墓碑双键，三类幂等规则由同一数据边界执行，避免不同入口口径漂移。
- appendEvent 仍返回带新 events 数组的新 store；不原地修改旧 store 或缓存索引，后续渲染自然为新身份建立新投影。

## D-144：事件ID查询与编辑共享首项序号语义（2026-09-17）

- 正常化 store 不应出现重复事件ID，但原始/测试输入仍可能包含；getEventById 既然确定性返回首项，备注编辑也必须更新同一首项，不能另建不同口径。
- WeakMap 事件投影在一次遍历中同时记录首项对象和首项序号，读取与定点复制共享索引，不增加持久字段。
- 备注裁剪后未变化属于真正无操作，返回原 store 可以避免无意义持久化、冲突检测和页面刷新。

## D-145：配额规则接收项目候选集但保留规则层二次过滤（2026-09-17）

- Today 同时计算多个配额项目时，不应让每个项目重复扫描全库事件；store 投影先按 itemId 缩小候选集，把复杂度从项目数乘全历史降为各自历史之和。
- evaluateQuotaSchedule 仍保留 itemId、单位和周期过滤，既维持纯函数公共契约，也防止未来调用方传入未预筛选数组时出现串项。
- byItem 是不可变 store 的瞬时索引，不改变事件顺序、不持久化，也不以缓存结果替代日期修订语义。

## D-146：UI和洞察通过store级规则入口消费项目投影（2026-09-17）

- rules.ts 继续保持仅依赖 item/events/date 的纯函数，便于独立测试和外部调用；知道完整 store 的调用方则通过 model.evaluateItemRule 自动获得按项目候选集。
- Today 卡片、批量完成和习惯洞察属于高频消费方，禁止再次直接把 store.events 传给单项目规则，以免项目数放大全历史扫描。
- 洞察仍在项目候选集上执行墓碑与日期窗口过滤，索引优化不假设调用方输入一定经过 normalizeStore。

## D-147：汇总事件选择以最终bounds为唯一真值（2026-09-17）

- buildSummaryForBounds 已同时服务预设范围和自定义范围，不能再根据 range + asOf 二次推导事件窗口；否则历史自定义区间会显示正确标签却统计今天的数据。
- 入口先按最终 elapsed bounds 读取半开事件区间，再一次按 itemId 分桶；项目摘要只消费自身事件，不重复扫描共享区间数组。
- asOf 只负责裁剪尚未结束的当前范围，不能替代用户明确选择的历史起止日期。

## D-148：严格规范化留在不可信边界，锁内可信快照使用显式快路径（2026-09-17）

- normalizeStore 继续负责 load/import/API 等 unknown 输入，不能用性能理由跳过损坏字段、墓碑和外部身份清洗；插件自己通过不可变模型产生的 store 则不应在同一事务重复规范化。
- normalized 函数名明确调用前提，只在内部事务链使用；公共 mergeStores、detectStoreConflict 和 persistStoreWithVerification 仍保留严格包装层。
- 指纹只缓存到 WeakMap，不持久化；调用约束与既有事件索引相同，生命周期内的 store 及嵌套集合必须采用不可变替换。相同指纹用于短路无变化合并和写后修复，指纹不同仍逐项生成冲突ID并执行确定性合并。

## D-149：连续记录复用事件索引中的自然日集合（2026-09-17）

- 连续记录的既有口径是“某自然日存在任意记录”，不是“当天达到目标”；索引只按 itemId/localDate 去重，不能改用完成态或计划日判断。
- Today 完整渲染和局部刷新都应复用当前不可变 store 的日期投影；store 替换时 WeakMap 身份自然失效，不把派生日期集合写入持久数据。
- 今天没有记录时允许从昨天起算；归档项目仍固定为0。同日多条只增加记录次数，不增加连续天数。

## D-150：回顾表面共享单次渲染周期的分析快照（2026-09-17）

- 统计徽标、周趋势和月趋势必须来自同一 store/asOf 快照，避免重复计算及恰逢午夜时徽标与图表截止日不一致。
- 同一 render 周期的 dock、页签和快速弹窗复用该不可变快照；不跨 render 周期缓存，因为即使 store 身份不变，周/月/日窗口仍会随本地日期推进。
- 汇总范围和历史月历仍是独立交互口径，不能用日/周/月/自定义汇总或 historyMonth 改写趋势锚点；热力图只复用快照的基准年份，不把近五年 yearly 趋势误当单年热力图。

## D-151：回顾页所有当前日期投影共享 AnalyticsSnapshot.asOf（2026-09-17）

- 一次回顾渲染中的“今天”必须是单一值；日历、摘要、成就、提醒和逾期若各自调用 new Date，恰逢午夜可能在同一页面出现两个自然日。
- YYYY-MM-DD 必须通过本地日历解析为中午，不能直接 new Date(dateKey) 触发 UTC 解析倒日；日期推进继续使用日历构造而不是固定毫秒数。
- historyMonth 和自定义摘要范围仍由用户输入控制；统一 asOf 只负责今天边界与未来裁剪，不覆盖用户明确选择的历史范围。

## D-152：成就事件派生指标共享单次遍历（2026-09-17）

- 仅依赖事件本身或项目当前时段的成就指标，应在一个事件循环中同步累计；不能为每个徽章类别重复 filter/map，也不能为每条事件线性查找项目。
- itemId Map、活跃日 Set 和来源 Set 都是一次 buildAchievements 调用内的瞬时投影，不持久化、不进入备份协议，也不跨 store 身份缓存。
- 完美日需要计划、归档、日期修订和完成规则的逐日判断，语义不同，暂不并入事件计数快路径；本轮优化不得改变历史成就解锁口径。

## D-153：完美日统计跟随自然日循环流式累计（2026-09-17）

- 完美日日期循环已经从最早项目日期单调推进到 asOf，同一循环内即可维护累计天数与连续值；为此再建立 Map 并排序既增加分配，也制造第二套日期顺序真值。
- 没有计划项目的日期不属于完美日统计样本，应跳过且不重置 streak；存在计划但完成数不足时才重置，这一既有语义必须通过矩阵测试锁定。
- 本轮只移除派生中间结构，不复制或改写 isItemAvailableOnDate、isScheduledToday、isComplete 的规则；配额、日期修订和归档边界继续由模型层统一解释。

## D-154：日期修订投影以 revisions 数组身份缓存（2026-09-17）

- 插件模型通过任务与嵌套数组不可变替换更新；因此 revisions 数组身份可作为有序投影的准确失效边界，避免每次日期查询都复制、过滤和排序。
- 规范化数据本来按 effectiveDate 有序，应直接复用；公共模型仍兼容无序原始输入，首次发现逆序才复制排序，绝不原地重排调用方数组。
- 查询采用稳定排序后的上界二分，保留“目标日期最后一条有效修订”语义；缓存只存在 WeakMap，不持久化、不进入备份或同步协议。

## D-155：共享修订解析归属无模型依赖的规则核心（2026-09-17）

- rules 只依赖 types，model 已依赖 rules；把共享修订解析放入 rules 并由 model 重新导出，可让两层复用同一实现且不形成循环依赖。
- evaluateRule 必须一次解析修订并复用到状态、计划、目标、单位与配额计算，禁止 getRuleStatus 再次查询，以免同一评估出现重复工作或口径漂移。
- 保持 model 的 getItemRevisionForDate 导出路径属于兼容契约；缓存仍以 revisions 数组身份失效，不改变持久化、备份、同步和公共规则函数签名。

## D-156：版本号连续递增，数据内核成果随 13.0.0 发布（2026-09-17）

- semver 不跳号：12.0.2 之后的下一个大版本是 13.0.0；TODO 里的"13.0 专注生态 / 14.0 数据内核"是工作流标签而非发布版本号，先例是 12.0.2 已同时搭载两个工作流的内容。
- 13.0 专注生态的剩余完成门槛（上游兼容版本可安装、真机双窗口记账）保持 B-007 开放，不阻塞数据内核成果发布；后续上游联调内容以维护版本承载。
- 发布说明与变更记录只写用户可见变化，工作流批次号保留在 TODO/PROGRESS 内部记录。

## D-157：生命周期条目必须与 normalizeStore 规范字段集合一致（2026-09-17）

- 写后校验以 JSON 指纹比较期望快照与回读快照；normalizeStore 将缺省 archived 物化为 false，插件侧构造条目若省略该字段，指纹永不等价，保存被误判失败并回滚。该缺陷随 14.0 数据内核第六批引入、v13.0.0 发布，被 CI browser-audit 的 visual-qa 双击提交步骤拦截，v13.0.1 修复。
- 新增条目/事件的构造点必须物化 normalize 的全部非 undefined 默认值；cloneItemValue 作为快照边界保留防御性物化（archived === true）。
- 浏览器 QA 宿主的存储模拟必须按存储名分槽且克隆失败时 reject，与真实思源 loadData/saveData 契约一致；单槽模拟会让偏好写入串进主存储，制造伪失败并掩盖真实缺陷。

## D-158：回顾日志宽容器双列，额外天数仅由 hidden 门控（2026-09-18）

- 打卡日志行在 1180px 限宽（或双列区块的半宽折叠体）下名称与数值之间大面积留白；日志按天分组在 lc5 ≥960px 改双列网格，日期标题跨两列，行距由网格 gap 接管，窄容器保持单列。双列只影响行排布，行内结构、缩略图与多记录 details 不变。
- `data-log-extra` 的隐藏一律由 `[hidden]` 属性承担（`.lc-checkin__log-day[data-log-extra][hidden]`）；展开按钮把 hidden 置 false 即显示。属性级 `display:none` 与 hidden 切换逻辑脱节，曾使"展开其余 N 天"在所有宽度下点击无效（探针证实后删除）。
- 新布局规则放在回顾区块容器查询层，与既有 720px/1180px 层并列；不引入第二个容器名，继续走 lc5 体系。

## D-159：回顾二级导航 JS 钉住与跳转按 fold id 定位（2026-09-18）

- 真机实测（思源界面缩放，容器有效宽 725/582px）：宿主 zoom 子树内合成器滚动不会重定位 position:sticky（Chromium 缺陷，重排后才短暂恢复），二级导航条滚动时不跟随。
- 二级导航条定位退为 relative，由 bind-page-navigation 的滚动同步（passive scroll 监听 + transform translateY）主动钉在滚动区顶部；滚动事件可能缺失的场景（跳转点击）在处理器内显式调用同步。wheel、程序化 scrollTop 与跳转三条路径均已真机验证。
- 跳转一律按 data-review-fold id 定位并同步直写 scroller.scrollTop：区块列表混有年度热力图 details，按下标取整体错位一位；scrollIntoView 的滚动落地是异步的，钉住同步会拿到旧位置。
- 桌面弹窗/页签宿主在 480-959px 档（缩放后实际容器常落此区间）范围页签与工具区并为一行；dock 与移动宿主维持原布局。

## D-160：事项行操作列可见性与弹窗遮罩兜底（2026-09-18）

- 用户真机截图：事项行右侧操作按钮整体不可见、弹窗四角透出白色文档。真机 Console 实测：按钮存在于 DOM（4×32px、SVG 齐全）但被多层网格档位交叠覆盖不可见；圆角缺口处 elementFromPoint 命中 b3-dialog__container 本身（透出背后白色文档）。
- 操作列在 480-959px 容器档（弹窗/页签宿主，排除移动）用最终层 !important 强制三列网格与可见性；不再依赖与中间档位的优先级竞争。
- 框式快速弹窗的遮罩（b3-dialog__scroller）加半透明暗色底：圆角缺口不再透白，悬浮窗口层次成立；移动端全屏宿主不受影响。
- 真机调试经验：思源 Ctrl+Shift+I 可开 DevTools，Console 跑 JS 用 document.title/clipboard 回传结果；reloadUI 后渲染器样式表可能仍是旧缓存（版本号未变），重大样式改动后必须完整重启思源验证。

## D-161：事项模板推荐分组与目录扩充（2026-09-18）

- 模板目录扩至 53 个（生日5/纪念日6/定期支出12/会员续费9/健康与车辆9/节日12），取消「全部模板」分组：模板总量增长后全量视图只会越来越长，用户没有浏览全部的诉求。
- 新增首档「推荐」分组（筛选模板的 recommended 标记，非独立 category，保证类别测试与统计口径不变），默认选中；精选 11 个覆盖高频场景（家人生日、房贷、房租、水电燃气、信用卡、发工资、视频会员、车辆年检、驾照换证、春节、中秋）。
- 节日模板沿用既有的农历锚点日期模式（2026 年锚点，用户可自行调整）；新增模板的 nameKey 必须中英双语补齐（i18n hygiene 守门）。

## D-162：优先提醒条纵向列表化（2026-09-18）

- 桌面宽容器下优先提醒条原为 flex 双列：主行占左半、展开区占右半，「定位打卡」悬在中间、两列行错位（用户真机截图反馈）。
- 统一为主行整行置顶、展开区整行在下，行内三列网格（标记/文案/操作），「定位打卡」右对齐为胶囊按钮；移动端既有紧凑规则不变。

## D-163：dock 设置页列表布局与容器断点解耦（2026-09-18）

- 真机复现：dock 侧边栏设置页的恢复点/审计卡片文字竖排、按钮裸文本。根因：恢复点与审计列表的网格布局只写在 @media ≤600px 视口断点内，桌面宽视口下 dock 窄容器（约 280-560 CSS px）落入无样式默认 flex，文案列被压缩成竖排。
- 修复：dock 宿主下恢复点/审计列表行改用容器维度常驻两列网格（文案 1fr + 按钮自适应），不再依赖视口断点；文件选择的原生 input 全局隐藏、保留胶囊标签（此前只在编辑器页隐藏，dock 设置页会同时露出原生控件与标签）。
- 教训：dock/弹窗内嵌布局一律用容器查询档位，不要用视口媒体查询（二者在缩放与宿主场景下完全脱节）。

## D-164：dock 回顾页头部紧凑化（2026-09-18）

- dock 窄面板（≤479px）下回顾页范围页签偏大、工具行（复制报告/更多）两端分散，视觉重心散乱。压缩页签与工具按钮密度（28px 高、9px 内距），工具行由两端分散改为成对右对齐；与既有的 lc-dock ≤719 紧凑层合并语义，不影响弹窗/页签/移动端。

## D-165：归档/删除语义与自动归档口径规划（2026-09-18，待实施）

- 现状：打卡项只有「归档」（archived + archivePeriods，记录全保留、可恢复）没有「删除」；归档入口仅在编辑器与批量模式；归档页只有搜索与恢复。
- 计数口径：自动归档按「达成天数」计（当天达到目标 isComplete 计 1 天，与进度模型一致）；次数型项目天然等价，多记录同日只计 1。
- 触发与回环：record/undo 提交后同步检查；撤销导致天数回落不自动恢复归档（归档是显式状态，恢复走归档页）；恢复后再次打卡达标会再次自动归档（语义一致）。
- 删除语义：移除 item + 其全部事件，并写事件墓碑（复用批次 8 基础设施，防多窗口旧数据复活）；删除前自动落恢复点，确认层展示记录条数——保证可恢复路径。
- 字段：autoArchive = { afterDays } 挂 item 级（不进日期修订），normalizeItem 显式放行，随主存储备份协议持久化。
- UI 原则：卡片零常驻空间——配置在编辑器高级区、操作在上下文菜单/批量模式、结果用 toast；归档页承担浏览与批量管理。

## D-166：Task Horizon 合作契约与扩展位规划（2026-09-18）

- 调研结论：Task Horizon 已与底栏番茄钟建立跨插件范式（globalThis.__dockTomato.stats.queryFocus + 能力检测/超时/AbortSignal + 契约测试），并有原生复选框完成触发的积分联动——打卡侧直接复用该范式。
- 显示合作（L1）：对方日历经 window.siyuanCheckin 的 analytics.read/events.read 读打卡数据 + 订阅 checkin:analytics-updated/event-recorded 刷新；未授权即降级隐藏。
- 写入合作（L2）：任务完成回写经 events.record，externalRef 契约为 "taskhorizon:<blockId>:<localDate>"（幂等防重放）；打卡项目用配额按记录数目标 N，达成即当天完成，可与自动归档（T-1161）组合。
- 责任边界：打卡侧只维护 siyuanCheckin 公共面（v4 已就绪）+ 文档 + 预设模板；日历图层与完成回写在对方侧实现；不读取对方私有文件、不做文档污染式同步。
- 外部软件通道：短期导出 JSON/CSV；中期评估每日摘要写驻留文档（经内核 API 供外部工具读取，需隐私评估，另立项）。

## D-167：小驴速切组件商店协作模式调研（2026-09-18）

- 小驴速切（siyuan-speed-switch）的组件面板已有完整的小组件商店系统（home-store-ui.ts），其中**已包含 6 个小驴打卡桥接组件**（ADR 0057）：checkin-today/streak/year-heatmap/weekly/occasions/monthly，经 `window.siyuanCheckin` API v4 读取数据，source 标注为 siyuan-checkin 使商店按来源归组。
- 桥接采用「速切侧消费」模式而非「打卡侧注册」：打卡的生态 API v4 已是稳定公开契约，速切以内建 adapter 直接消费，组件即刻可用，无需打卡发版。
- 打卡侧目前**无需任何改动**；如需新增组件类型（如成就展示、目标进度），需修改速切侧 checkin-bridge-model.js + home-external-adapters.ts。若将来打卡插件自行注册相同 moduleId，token 覆盖会让原生实现接管（桥接预留的升级路径）。
- 组件在商店中按来源归入「小驴打卡」组、功能归入「生活信息/Life」组。

## D-168：v15 以性能、功能和交互质量优先，CSS 体积不作主约束（2026-09-18）

- v15 的验收优先级调整为：数据与功能正确性、运行时性能、跨端 UI 可读性、交互连续性和真实宿主稳定性。
- CSS 体积只保留 450KB 硬阻断线及构建可用性检查；不再为了达到 360KB 目标牺牲触控反馈、布局清晰度或组件可维护性。
- 第一批从 Today 卡片上下文菜单开始：桌面右键与触屏长按共用动作菜单，菜单位置必须限制在视口内，打开后焦点进入首个动作，Escape 可关闭，移动取消长按不得误触。

## D-169：Today 多动作交互共享互斥边界并恢复焦点（2026-09-18）

- 批量工具栏的完成、归档、删除动作共享 `[data-bulk-toolbar]` 互斥边界；任一动作进入 mutation 队列时，整组按钮同时禁用，避免用户在排队期间切换语义。
- 上下文菜单使用 `role=menu/menuitem`，支持上下方向键循环移动；关闭菜单（动作完成、Escape 或外部点击）后优先把焦点还给原卡片的主操作按钮，若卡片已被删除则不强行聚焦脱离 DOM 的节点。
- 菜单动作的同步异常也必须经过 Promise rejection 边界，避免编辑器打开或宿主 API 抛错产生未处理 rejection；批量删除的 store 变更继续在 mutation 队列内执行。

## D-170：Task Horizon 日期摘要 API 采用有界本地日期投影（2026-09-18）

- 对外新增 `getEventRangeSummary`，输入使用半开区间 `[startDate, endDateExclusive)`，只信任事件 `localDate`，不从 UTC 时间戳推导日历归属。
- 默认限制为 366 天、5,000 条事件和 366 个日期点；超出事件或点数返回 `truncated`，非法范围或超长范围直接拒绝。
- 返回值仅包含按日聚合的数量/数值/单位统计，不暴露 store、备注、附件或事件对象；消费者可安全缓存并自行刷新。

## D-171：归档摘要统一使用一次性事件投影（2026-09-18）

- 归档页显示累计达成天数与最近记录时间；渲染前按 `itemId` 分桶，避免每个归档项目重复扫描全量事件。
- 达成天数继续复用 `isComplete` 口径，但只遍历有事件的日期索引；保留日期修订和 3,660 天安全上限。

## D-172：跨表面动作反馈采用结构统一守门（2026-09-18）

- 归档动作、回顾工具和设置导入/恢复统一使用 `aria-busy`、禁用/互斥和 finally 清理；重渲染导致原控件脱离 DOM 时恢复到稳定入口焦点。
- 设置导入失败除 toast 外保留页面内 `role=status` 可见反馈，避免错误只存在于瞬时通知。

## D-173：归档批量操作采用筛选集选择与单事务提交（2026-09-18）

- “全选”只作用于当前搜索结果，避免用户在看不见的筛选外项目上误操作；删除前仍汇总项目数和记录数二次确认。
- 批量恢复和批量删除各自只进入一次 mutation 队列、只持久化一次；工具栏内全部动作共享互斥边界，执行期间整组禁用并暴露 `aria-busy`。
- 窄容器下选择框/图标/信息保留首行，恢复与删除回流第二行；通用历史行网格不因归档专用选择列而改变。

## D-174：自动归档使用专用追加事件但保持通用更新兼容（2026-09-18）

- 新增 `checkin:item-archived` 作为自动归档成功后的专用通知，便于 Task Horizon 等消费者移除日历项；手动归档继续只依赖既有 `item-updated`。
- 自动归档队列执行时若项目已被其他动作归档，不广播专用事件；只有本次操作真实完成 false→true 转换才触发。
- 事件 payload 必须深克隆周期 weekdays/quota、修订、归档区间和 autoArchive，第三方修改 detail 不得污染插件 store。

## D-175：批量生命周期动作以单事务快照为一致性边界（2026-09-18）

- Today 批量归档/删除不能逐项目进入 mutation 并反复持久化；一轮用户确认对应一次当前快照变换和一次写盘，避免中间态被其他窗口观察、降低恢复点与写后校验成本。
- 保存失败必须恢复整批操作前的内存快照；确认取消或失败时保留当前选择，用户可以调整或直接重试。成功后仍逐项目发送既有集成事件，外部消费者不需要理解新的批量事件类型。
- 批量删除使用 ID Set 对 items/events 各扫描一次并集中生成墓碑；单项目删除委托同一核心，防止两套删除语义漂移。

## D-176：自动归档检查归属于所有成功记账边界（2026-09-18）

- `autoArchive.afterDays` 的含义不区分写入来源；手动打卡和公共 API 记账只要已经成功持久化，都必须进入同一 `maybeAutoArchiveAfterRecord` 检查。
- 检查仍在记录持久化与事件广播之后排入 mutation 队列，不把记录和自动归档强绑为一次不可拆事务；这样归档保存失败不会回滚已经成功的打卡记录，用户仍可从正常项目状态重试或手动归档。
- 专用 `item-archived` 事件只在实际发生未归档→已归档转换时发送，手动批量归档继续发送通用 `item-updated`，保持 D-174 的兼容边界。

## D-177：批量完成共享一次事件追加与持久化边界（2026-09-18）

- Today 批量完成应以一次用户动作对应一次 store 快照：在 mutation 锁内统一校验当前项目/日期规则，生成全部记录，再通过 `appendEvents` 一次追加和一次持久化；不能逐项目触发完整 `recordEvent` 写盘与重渲染。
- `appendEvents` 与单条入口执行完全相同的 ID、externalRef 和墓碑守门，并额外去除输入批次内部重复；单条 `appendEvent` 委托批量核心，避免幂等语义分叉。
- 外部消费者仍收到每条 `event-recorded`，但同一日期批次只需一个 `analytics-updated` 刷新信号；日期事项完成、自动归档和最近记录反馈继续在成功持久化后执行。

## D-178：Today 批量选择以当前渲染结果为授权范围（2026-09-18）

- “全选”只遍历当前表面的 `[data-bulk-check]`，不能扫描 store 后选中搜索/筛选之外的项目；重渲染后现有选择必须与新结果集求交集，防止隐藏选择继续参与归档或删除。
- 勾选只改变内存 Set、按钮 `aria-pressed`/选中态、live 计数和批量动作 disabled，不需要完整重渲染；这样保留当前焦点、滚动位置并减少移动端触控抖动。
- 空选择时完成/归档/删除按钮保持禁用；退出批量模式和成功提交仍走完整渲染，以清理模式状态并刷新业务结果。

## D-179：删除确认必须在存储锁内复核影响范围（2026-09-18）

- 确认框展示的项目数和记录数只是用户授权的精确范围；等待 mutation 锁期间若其他窗口新增/删除记录或改变批量目标的归档状态，不能沿用旧确认继续删除。
- 单项、Today 批量和归档批量路径在锁内重新计算影响；数量变化即中止并提示重新确认，不尝试静默扩大或缩小用户授权。项目已被其他窗口删除时视为幂等成功并刷新表面。
- 单项目删除也必须走 `enqueueMutation`，与批量删除共享 reconciliation、storage lock、恢复点和写后校验边界；Today 上下文删除成功后由宿主主动刷新，不能只关闭菜单留下幽灵卡片。

## D-180：多个自动归档转换共享一次后续事务（2026-09-18）

- 批量完成后可能同时有多个项目达到 `autoArchive.afterDays`；这些转换先按当前 store 预筛，进入锁后针对 reconciled store 再校验，并通过共享归档周期投影一次写盘。
- 每个真实转换仍依次发送 `item-updated` 和 `item-archived`，保证旧消费者和专用消费者兼容；只有界面提示在多项目时聚合，避免连续 toast 覆盖。
- 单条手动/API 记账继续调用单项包装器，但最终委托同一批处理入口；撤销不恢复、明日起暂停和失败不回滚已成功记录的语义保持不变。

## D-181：v15.0.0 以自动化全链发布并显式保留宿主现场边界（2026-09-18）

- v15 的发布门槛是完整 `test:quality`、宽度走查、发布资源校验、版本真值一致和远端资产摘要一致；CSS 继续执行 450,000-byte 硬线，不以压缩体积牺牲交互质量。
- 用户明确要求发版，因此不因 B-007 的真实思源现场证据缺失阻断 GitHub 正式发布；发布说明必须明确页签、dock、软键盘和多窗口仍建议目标设备复核。
- 标签只指向通过门禁的发布提交；GitHub Release 上传的 `package.zip` SHA-256 作为最终产物真值，发布后回填仓库说明并再次核对远端资产。

## D-182：Task Horizon 联调先固化打卡侧身份与删除语义（2026-09-18）

- 在对方尚未排期前，打卡侧只增加可执行契约夹具，不臆造 Task Horizon 的原生复选框监听或日历消费实现。
- 合作身份继续使用 `taskhorizon:<blockId>:<localDate>`；同一项目、来源和 externalRef 的重放由 `appendEvents`/`normalizeStore` 去重，事件墓碑优先阻止删除后的旧回调复活。
- 契约测试纳入 `test:ecosystem`，但 T-1165 仍保持未完成，直到双方对齐真实回调、刷新事件和双仓库 contract test。

## D-183：仅对 Task Horizon 前缀启用专用 externalRef 校验（2026-09-18）

- `taskhorizon:<blockId>:<localDate>` 由打卡侧提供 canonical 构造/解析；日期按本地公历严格校验，块 ID 拒绝冒号、空白和控制字符。
- 公共 `recordEvent` 写入仅在检测到 `taskhorizon:` 前缀时启用专用守门，并要求 `source: "api"`；番茄钟、快捷指令等其它 externalRef 前缀保持原有通用语义。
- malformed Task Horizon identity 返回 `undefined`，不自动修正、不截断、不把后台同步伪装为用户完成。
- 公共 API 与生态规范化都先以同一首尾空白策略识别 `taskhorizon:`，避免“规范化入口拒绝、直接 API 入口接受”的分叉。

## D-184：Task Horizon 合作用机器可读清单作为单一对齐入口（2026-09-18）

- 契约 JSON 固定协议版本、能力、方法、单位、externalRef 前缀、刷新事件白名单和摘要限制；运行时导出同形快照，测试阻止两者漂移。
- 日历消费者只对四类刷新事件重查：新记录、分析刷新、自动归档和手动更新；创建/删除等事件不直接触发聚合重算。
- 清单只描述公开 API，不承诺 Task Horizon 私有块监听、配置存储或 UI 实现。

## D-185：Task Horizon 示例只实现公开 facade 消费（2026-09-18）

- 示例负责能力协商、日期摘要读取、公开刷新事件订阅、`recordEvent` 写入和注销；块发现、原生复选框触发与日历渲染由对方插件保留。
- 示例失败时返回明确的 `unavailable` / `not-ready` / `capability-missing` / `target-missing` 状态；重试必须复用同一 blockId+localDate，不创建随机 externalRef。
- 订阅回调接收 `checkin.subscribe` 传出的事件详情对象本身，不再误读 DOM `CustomEvent.detail`。

## D-186：bridge 只为抛错保留待重试写入（2026-09-18）

- `recordEvent` 返回 `undefined` 的语义同时覆盖重复和拒绝，示例不能把它当作网络失败自动堆积；只有 Promise 抛错才进入 pending 队列。
- pending payload 保存原始 `itemId`、单位和 canonical externalRef，重试不生成新身份；重试统计与队列快照均为防御性副本。
- 刷新和诊断回调的异常不应形成未处理 rejection，也不能阻断 bridge 的注销流程。

## D-187：recordEvent 重复结果按现有运行时语义记录（2026-09-18）

- 现有实现检测到相同 `itemId + source + externalRef` 时返回已有事件的防御性副本；这不是新写入，但也不是拒绝。
- 合作消费者只在返回 `undefined` 时停止处理；重复结果沿用原 externalRef，不创建随机替代身份。
- 本轮只修正文档、机器清单、示例和测试，避免为契约文字变更破坏已有消费者。

## D-188：bridge 先验协议再协商能力（2026-09-18）

- 公开消费示例先检查 `describe().protocol === "siyuan-checkin"` 与 `version >= 4`，再等待就绪和检查能力，避免把其它 facade 当成兼容 API。
- `describe()` 抛错或协议不匹配只返回诊断状态，不订阅、不读取、不写入；缺少 `describe()` 的旧兼容 facade 仍可按既有能力检查流程工作。

## D-189：bridge 初始化失败必须撤销已注册监听（2026-09-18）

- `whenReady()` 异常返回 `ready-error`，协议版本非有限数值视为不匹配；这些失败均不进入订阅阶段。
- 摘要首读发生异常时主动调用已返回的 unsubscribe，再返回 `read-failed`，避免消费者重试后叠加重复刷新监听。

## D-190：重试统计不把明确拒绝伪装成成功（2026-09-18）

- `recordEvent` 返回 `undefined` 表示确定性拒绝：从 pending 传输队列移除，但 `retryPending()` 只增加 `rejected`，不增加 `succeeded`。
- 只有返回事件对象才计入成功；再次抛错的 payload 保留在队列，便于后续恢复后重试。

## D-191：pending 重试采用单飞而非丢弃并发请求（2026-09-18）

- 多个刷新事件可能在同一时间触发重试；bridge 复用当前 in-flight promise，让所有调用方观察同一组统计结果。
- promise settle 后释放锁；失败 payload 仍保留，因此下一次显式重试不会被永久阻断。

## D-192：bridge 启动与停止遵循同一生命周期锁（2026-09-18）

- 并发或重复 `start()` 共享一个初始化 promise，成功后直接返回已选项目，不重复订阅或首读摘要。
- `stop()` 设置终止标记；若就绪探测尚未完成，后续步骤在订阅/刷新前后再次检查并返回 `stopped`，避免迟到副作用。

## D-193：摘要刷新采用单飞合并事件风暴（2026-09-18）

- 同一 bridge 的并发 `refresh()` 调用共享进行中的 Promise，避免多个订阅事件重复读取同一日期摘要。
- 读取或回调失败时 Promise 正常 reject 并释放锁，下一次刷新仍可重新尝试，不缓存失败结果。

## D-194：摘要单飞键必须包含请求范围（2026-09-18）

- in-flight map 使用请求日期区间与 `summaryOptions` 的序列化组合键；只有完全相同的读取才共享 Promise。
- 不同区间或选项允许并行读取，避免性能优化改变调用方请求的语义范围。

## D-195：写入单飞按 canonical externalRef 隔离（2026-09-18）

- 同一 `taskhorizon:<blockId>:<localDate>` 的并发写入共享 Promise，确保重复回调不会制造多次 transport 请求。
- 不同 externalRef 使用独立 map 条目，保持多个任务完成事件的并行吞吐。

## D-196：停止优先于迟到摘要副作用（2026-09-18）

- `stop()` 与进行中的摘要读取竞态时，读取结果仍可自然完成，但不得调用 `onRefresh`，并向调用方返回 `undefined`。
- 停止后的新 `refresh()` 继续短路为空结果，避免卸载后重新建立读取活动。

## D-197：facade 探测 getter 异常转稳定启动状态（2026-09-18）

- `hasCapability()` 抛错返回 `capability-error`，`getItems()` 抛错返回 `items-error`，并通过统一 `onError` 诊断通道报告。
- 只有返回正常但能力不足时才使用 `capability-missing`；不把宿主 getter 异常伪装成用户配置缺失。

## D-198：生态 facade 返回形状先校验再消费（2026-09-18）

- `getItems()` 必须返回数组；其它形状返回 `items-invalid`，避免在消费端调用 `.find` 产生未处理异常。
- 订阅事件的字段访问也处于诊断边界内，恶意 getter 不得阻断宿主事件分发。

## D-199：目标事项字段读取纳入同一诊断边界（2026-09-18）

- `archived`、`name`、`id` 等目标选择字段由宿主对象提供，任一 getter 抛错均返回 `items-error`。
- 不改变正常目标缺失的 `target-missing` 语义，避免把数据异常误报为用户没有配置事项。

## D-200：订阅建立与事件消费分别隔离异常（2026-09-18）

- `subscribe()` 建立阶段抛错返回 `subscribe-error`，不进入首读或伪装成读取失败。
- 订阅后的单个事件 payload 异常只报告 `event`，不自动停止 bridge；后续事件仍可继续处理，卸载仍由 `stop()` 负责。

## D-201：重试结果显式区分传输失败（2026-09-18）

- `retryPending()` 返回 `succeeded`、`rejected`、`failed` 三个互斥计数；三者之和等于本轮 `attempted`。
- `failed` 仅表示 transport 抛错，payload 留在队列；`rejected` 表示 API 确定拒绝并从队列移除。
