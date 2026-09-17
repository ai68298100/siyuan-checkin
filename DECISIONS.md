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
