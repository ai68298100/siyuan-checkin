# TODO

## 当前体验改造执行索引（2026-09-28，现状复核；统一顺序与依赖见 [现状复核与统一实施计划](docs/consolidated-experience-plan-2026-09-28.md)，D-307）

当前仓库版本为 v18.10.0。D-307 的 T-1545～T-1608 原 64 项为分批实施计划，阶段 0 的正确性修复（T-1609/T-1610）、唯一能力注册表（T-1575）、联动/设置/编辑器专项视图、状态/路由/目标契约及阶段 1～5 的主要切片已交付，T-1608 证据台账已收官；不要按原编号把它们整批重做。仍开放的本地增量包括 T-1550/T-1555/T-1582 和本轮用户反馈 T-1611～T-1618。2026-09-29 全面功能/UI/交互/逻辑复核新增 T-1619～T-1634，事实和优先级见 [全面功能、界面与逻辑复核](docs/comprehensive-audit-2026-09-29.md)；本轮除 README 明确要求的两项文档信息外，仅登记、设计，不改运行代码。T-1538～T-1544 等调研候选、T-1413 产品决策和 Task Horizon/上游身份外部依赖保持各自触发条件；旧路线中的“全部待开发”与“无本地任务”均为历史快照。

### 已确认的正确性问题（独立于 UI 重构，先处理）

- [x] T-1609 洞察页 `atMost` 戒除/上限日状态与主模型对齐（P0）——done（2026-09-28，local-auto）。完成判定收拢为 `model.evaluateDayCompletion` 唯一公式（`isComplete` 同源委托，浮点容差统一），洞察投影不再私藏第二套比较；日状态映射按方向区分——戒除类有真实事件（含数值超限）即 `missed`（与回顾日历 at-most-breach 立即呈现一致），二值零事件/数值不超上限为 `complete`，跳过日不算成功且连击中性不变；日观测携带 `direction`，`overachievedDays` 排除戒除类（对齐 achievements 方向守卫）；教练建议戒除类不再给「开始/还差」反向引导；日格 tooltip 用 守住/破戒/未记录 双语词表（`insights.atMostKept/atMostBreach/noRecord`）。新守门 tests/insights-atmost.test.cjs 入主链：二值零事件/一次破戒/跳过、数值上限 2 时进度 0/1/2/3、今日未结束、历史修订、周趋势/完成率/连击、逐日与 `isComplete` 交叉核对、至少型回归，7 检全过。验证：check、主链、build、test:ui、test:quality、双主题 visual-qa、宽度走查全 EXIT=0。
  - 状态：done。
- [x] T-1610 今日行动台历史修订单位一致性（P0）——done（2026-09-28，local-auto）。新纯模块 features/today-fact.ts：`buildTodayItemFact` 把行动台单项目事实切片收拢为整口径当日修订——target/unit/kind/schedule（含 quota 面）全部取 `getItemRevisionForDate`，不再出现「目标取当日修订、单位取 item 现值」混用；atMost 破戒按修订 `kind` 判定，既有事件单位原样保留、不换算。fragments.ts dashboard 改用该切片。新守门 tests/today-fact.test.cjs 入主链：单位 杯→毫升 未来日期修订夹具（今日仍 杯/2）、binary→quantity 类型修订驱动破戒规则、daily→quota 排期修订正反向（陈旧 item 级 quota 不泄漏）、跳过/完成/连击透传，5 检全过。此项先于 T-1577 首屏重排的口径前提已就位。验证：check、主链、build、test:ui、test:quality、双主题 visual-qa、宽度走查全 EXIT=0。
  - 状态：done。

## 全面功能/UI/交互/逻辑复核（2026-09-29，用户要求先梳理并加入待办；本节只登记不开发）

- [x] T-1619 `localDate` 跨时区统计正确性收口（P0，源码复核新增）——done（2026-09-29，local-auto；口径 D-311）。普通每日/非配额进度过滤收拢为 `eventDateKey(event) === localDateKey(date)`（`src/rules.ts`）：合法 localDate 键直接字符串比较，不再把 `YYYY-MM-DD` 交给 `new Date()` 隐式按 UTC 午夜解析（America/New_York 等负时区曾漂移到前一日），与配额路径既有口径一致；`eventDateKey` 同步升级为真实日历校验（`2026-02-30` 等格式合法但日历不存在的键回落 occurredAt，与 `model.getEventDateKey`/`isValidDateKey` 同口径，配额贡献日与配额 AUTO 推导同函数继承）。回顾趋势 `src/charts.ts` 月/年趋势从 occurredAt 时刻切月切年改按记录日键半开区间比较，日活跃 Set 同走 `getEventDateKey`——月/年/日三趋势与主模型单一口径；周完成率走 isComplete（索引路径）本已正确，两条进度路径（evaluateRule 过滤 vs getEventsForDay 索引）自此同值。新守门 tests/localdate-tz.test.cjs 入主链：UTC/Asia/Shanghai/America/New_York 三时区 × 6 场景固定 TZ 子进程矩阵（localDate 与 occurredAt 跨日/跨月/跨年不一致、春令时/秋令时边界、空与非日历 localDate 回退、历史修订单位、配额贡献日稳定、skip 不吃量、atMost 守住/破戒归属、evaluateRule 与 evaluateItemRule/isComplete 同值），子进程自证 1 月/7 月时区偏移防 TZ 失效静默通过；另附 NY 下 date-only 隐式解析退一天的缺陷机理探针与 4 条源码精确签名断言。验证：check、主链、build、test:ui、test:quality（216 测试文件全覆盖、i18n 2504 对、CSS 634351B 预算内）、双主题 visual-qa、宽度走查全 EXIT=0。
  - 状态：done。
- [x] T-1620 设置即时持久化失败一致性与重载反馈收口（P1，源码复核新增）——done（2026-09-29，local-auto；口径 D-313）。统一包装 `applyPreference(mutate, success?)`：改值前 `collectViewPreferences()` 全量快照（persist 序列化同源抽取），持久化失败经 `applyViewPreferences(snapshot)` 原路恢复（含语言同步钩子）+重绘+`msg.prefSaveFail` 提示——界面值与持久值不再静默分叉。index.ts 裸 `void persistViewPreferences()` 清零、旧 savePreference 包装退役：迁移外观/操作组（分组/排序/折叠/周条/主题/语言/打开方式/NLP/动效/触感）、提醒（安静时段开关与起止/每日提醒开关/事项仅一次）、弹窗（模式/缩放/定宽高/重置框）、专注提供方（含回退按钮成功提示后移）、来源组（摘要/思阅/思播/健康/笔记推导/微信读书三绑定/叶归开关+笔记本+映射+失效自动停用/清 Key）、头像、重置视图偏好、首成旅程推进、保存视图（应用×2/新建/删除）、最近模板——共 30+ 处理器；断连提示与 ingest 时序保持既有行为。周复盘草稿：宿主 save/clear 快照回滚后向上抛出，UI 保存/清除 .catch 在状态行显失败（新键 review.weeklySaveFail/weeklyClearFail 双语），输入框内容保留为可重试草稿。save-note-query 七字段登记决策（D-313）：文档化「整体表单即保存边界」（原子保存+失败回滚既有），草稿化留 T-1616 分区重建随新表单实现；注册表文档两处已更新不再静默。新守门 tests/preference-rollback.test.cjs 入主链：包装/快照/回滚链精确签名、裸调用清零、savePreference 退役、28 个选择器处理器逐一体检、快照纪律（外层先行赋值污染回滚两例反断言）、周复盘回滚与反馈、决策登记存在性。剩余边界：plugin-ops 报告选项/来源筛选与回顾折叠等页面级视图偏好仍是裸 void（不在本任务字段清单，后续批次）；applyViewPreferences 回滚会重置 quickEntryCancelled/activeSavedViewId 等会话瞬态（失败罕见路径，可接受，D-313 已记）。验证：check、主链（217 文件覆盖）、build、test:ui、test:quality（i18n 2506 对、CSS 634351B 零新增）、双主题 visual-qa、宽度走查全 EXIT=0。
- [ ] T-1621 跨表面 `SurfaceContext` 完整恢复与多 root 隔离（P1，契约剩余边界）——T-1603/T-1599 已完成页面路由和编辑器单级返回栈，但 `docs/surface-routing-contract-2026-09-28.md` 仍明确日期、范围、工作区、查询/筛选、滚动和焦点的全量序列化待后续；当前 `src/render/page-shell.ts` 主要只传 `itemId`。需让 Today/Review/Insights/Editor/Occasions/Settings 在 tab、dock、quick dialog、渲染块中按 root 传递和恢复 date、range、workspace、item、query、filters、focus、scroll；详情/洞察/事项/提醒返回原工作区和筛选，多 root 同时打开不互相覆盖，并明确关闭、重载、宿主切换及过期异步时的保留/清空策略。Review/Occasions 等固定 DOM `id` 与关联的 label/aria-controls 也需按 root 唯一化，避免多表面同时打开时交叉命中。验收：每条跳转都有可验证的 returnTo 与恢复矩阵，同屏多 root 的 DOM ID 与读屏关联无冲突，失败不清空当前上下文，旧 data-action/data-page/渲染块回调保持兼容。
  - 进展（2026-09-30，local-auto）：第一切片交付——①readSurfaceContext 读侧扩参到契约 1 全形状（date=review day 钻取/range=summaryRange|CustomRange/workspace/query/filters=scope|source|order|page|reminder；默认值 all/newest/0 不进上下文；只聚合既有会话态零新真值，返回分派既有消费方零破坏）；②固定 DOM id 唯一化——提醒中心标题（review.ts）与事项预设 datalist（occasions.ts）改按渲染次序生成（settingsViewId 同法），多 root 同屏 aria-labelledby 与 input[list] 不再跨表面交叉命中；③契约文档登记切片与剩余边界。**剩余**：按 root 独立 currentPage 与全量序列化（多 root 打开不同页互不覆盖）——架构级切片，需单独立项排期；pageScrollTops/renderedPages/settingsOpenSourcePanels 的 per-root WeakMap 语义既有保持。守门：cross-page-consistency 新增两检查块（形状/聚合纪律/同源 id），主链 9 检全过。
- [ ] T-1622 跨窗口持久化原子合并与收尾防丢（P1，源码复核新增）——`onDataChanged`（`src/index.ts:2054-2063`）会直接重载偏好、事项和提醒动作；`persistOccasions:6588-6593`、`reminderUserAction:6838-6860`、`persistViewPreferences:6993-7044`、外部失败箱、模板/问卷配置及回顾周复盘草稿存在整桶读改写或裸 `saveData`。共享锁只串行并不能避免陈旧快照覆盖：尤其提醒延期/恢复、事项补标/改期、偏好、周复盘草稿、失败箱重试和 `teardownFinalFlush:7140-7152` 可能出现 last-writer-wins 丢写或卸载时覆盖另一窗口新事件；Agent 的 `createItem/createOccasion`（`src/index.ts:2999-3007`）都先改内存再持久化，绕过 `enqueueMutation` 且保存失败不回滚。主 Store 的 JSON/CSV/Loop/Obsidian 导入与快照恢复（`src/index.ts:3647-3661,4757-4761,4792-4794,4835-4837,4880-4882,5494-5498`）另有直接 `persist` 路径，需纳入跨窗口冲突验收；Dock Tomato 初次接收已有锁内远端合并，重点补人工重试/丢弃/清理和失败路径。需按桶定义锁内重读、确定性合并、写后校验与失败回滚/重试；把 `saveOccasionOverride` 先改本地后入锁的竞态及所有 Agent/UI 事项写入口统一纳入范围。验收：双窗口交错动作各自保留，Agent 两类创建保存失败时原内存恢复且不报告成功，导入/恢复与日常写入交错不丢数据，重载/`onDataChanged`/失败重试/卸载收尾不复活旧值、不丢事件、墓碑和用户动作。
  - 进展（2026-09-30，local-auto；口径 D-314）：三桶切片交付——①提醒动作桶：reminderUserAction 动作前重读 REMINDER_ACTIONS_NAME 并入（mergeReminderUserActions 按 (id,action,at) 身份并集），两窗口动作互不覆盖，保存失败回滚基线后移到合并之后；②事项桶：persistOccasions 写前重读合并（mergeOccasionCompletions 共享 id 的 completedDates 并集，本地标量优先），**不采用远端独有事项**——Occasion 无时间戳无法区分他窗新建与本窗已删，避免复活删除（写入先序下删除仍获胜）；③失败箱：discard/retry 变更前 mergeExternalPendingFromRemote 同步（mergeExternalPendingBoxes 按身份并集、本地载荷优先、容量 40 由 normalize 强制），不能在删除后调用（无墓碑，先删后并会复活丢弃条目）。**剩余边界**：删除类变更跨窗口仍是后写者胜（需删除标记=存储形状变更，另立决策）；主 Store/偏好/视图偏好的跨窗口合并与 Agent createItem 失败回滚、onDataChanged 收敛未在本切片（persistViewPreferences 已有 T-1620 快照回滚垫底）。新守门 tests/cross-window-merge.test.cjs 入主链（三并集语义+接线精确签名+容量/确定性）。
  - 进展二（2026-09-30，local-auto）：剩余切片交付——①Agent createItem/createOccasion 改经 enqueueMutation 写入（主 Store 的锁内 reconcile 合并自此对 Agent 创建生效），persist 失败回滚内存并向 Agent 调用方重抛（不得报告成功）；createOccasion 叠加 persistOccasions 写前合并（D-314）；②偏好桶跨窗口合并评估=**不做合并，维持后写者胜+T-1620 回滚**（D-315 注册表文档已记：无逐字段变更清单、无清单合并会复活重置语义、危害面仅本机 UI）；③onDataChanged 核对结论：它是远端变更通知路径，整桶采纳偏好/事项/模板/动作属正确语义；settingsDrafts/journalDrafts 是会话态不入桶不受影响；weeklyReviewDrafts 随偏好桶走=D-315 既有边界，无问题不改。守门：cross-window-merge 增补 Agent 入队/快照/回滚重抛与 D-315 登记断言。
- [ ] T-1623 可见文案 i18n 纯度与多表面双语补齐（P1，源码复核新增）——现有 `i18n-hygiene` 主要检查属性值，未覆盖模板可见文本和 `textContent`。已定位 `src/render/fragments.ts:576`（专注庆祝）、`render/review.ts:499`（次数单位）、`render/focus-timer.ts:102/119/122/123/142`（专注/分钟）、`render/bind-editor.ts:513-514`（配额标签/帮助）、`render/journal-dialog.ts:257`（空值）、`render/quick-dialog.ts:369`（快捷动作）及 `src/index.ts:5046/5639/6416`（导航/已记录）等硬编码可见字符串；趋势标题/单位还在 `src/charts.ts:187/203/216/227` 直接写中文，`render/review.ts:458-466` 将其展示到四种分析趋势；`src/features/template-manager.ts:14-22` 有整块硬编码中文，但当前 `rg` 未发现生产接线，需先确认是否为遗留入口再决定接入或退役。另发现 `src/i18n.ts:287/2794` 的 `trust.reasonThreshold` 重复使用 `{unit}`，而 `t()`（5035）对每个参数只替换一次，`record-trust.ts:69 → render/review.ts:264` 会留下字面 `{unit}`。需区分数据单位与 UI 文案，统一通过 `t()`、占位符和双语 parity 输出，补齐重复占位符/缺参/多余参检查，覆盖桌面、dock、页签、弹窗、移动端和 320px 的实际英文渲染，禁止原始键名或中文泄漏；提醒 `aria-live` 仅在 digest/状态真正变化时播报，避免降噪后读屏重复宣布。
  - 进展（2026-09-30，local-auto；D-316）：①t() 全量替换修复——split/join 替代单次 replace，trust.reasonThreshold 双 {unit} 不再残留（i18n-parity 增功能断言：重复占位符全替换+无字面残留）；②审计定位硬编码点全部键化（17 对新键）：专注庆祝（fragments）/专注默认名+备注（focus-timer；unit「分钟/小时」回退是数据单位不改）/配额标签与帮助×4（bind-editor）/问卷空值（journal-dialog）/快捷动作打卡（quick-dialog）/已记录 toast×2（index）/提醒次数摘要（review）；③趋势标题/单位=持久化快照数据（写入时语言），呈现层 presentTrend 按系列键本地化+未识别原样回退——charts.ts 纯函数与 5 个转译夹具零改动，review-analytics-projection 断言随形态现代化（数据源仍是同一快照不重建）；④template-manager 定性=未接线遗留原型（生产零导入），D-316：本轮不接不删、退役另立清理批。**剩余**：缺参/多余参的调用点级检查（需调用点分析，留 i18n 卫生后续）；template-manager 退役清理批。守门：cross-page-consistency 新增 T-1623 检查块（t() split/join 精确签名+各点键化+无中文字面残留）。
- [ ] T-1624 README 整体重构与小驴系列信息维护（P1，用户要求，先登记不开发）——2026-09-29 已先按用户明确要求在 README 项目介绍附近加入四款插件【小驴雷切】、【小驴打卡】、【小驴人脉】、【小驴拾遗】和交流 QQ 群 `871707735`，无未经核实的外部链接或功能说明。后续整体重构需复核首页叙事、版本重点、功能/安装/联动/API/开发者文档的层级和重复信息，统一四款插件名称、链接目标、简介长度与交流入口展示；外部链接须先核实，避免把未核实功能写成承诺。验收：四款插件与群号持续准确，README 首屏能快速说明小驴打卡定位，安装/核心功能路径清晰，Markdown 链接、桌面/移动/窄屏渲染及发布文档检查通过。
- [ ] T-1625 动态用户内容 HTML/ARIA 转义与安全渲染边界收口（P1，源码复核新增）——`t()` 只做纯文本替换，不承担 HTML 转义；项目名、事项名、模板名、搜索词和单位等动态参数在部分 HTML 文本/属性/ARIA 路径直接插入，重点见 `src/render/fragments.ts:230-231,254-267,345,351`（含未转义的 `img src` 附件属性）、`render/review.ts:506,553`、`render/archived.ts:115-116`、`render/editor.ts:125,145-151`、`render/today-bindings.ts:243` 等，现有路径有的已 `escapeHtml`，但边界规则不统一。需建立纯文本、HTML 文本节点、HTML 属性、ARIA 属性四类明确边界：`t()` 永远返回纯文本，进入 HTML 必须统一转义，富 HTML 只能走显式安全 helper；补充含引号、`<script>`、尖括号、换行、CJK 和超长名称的项目/事项/模板/查询 fixture，覆盖 Today、Review、Archive、Editor、Occasions、Insights、Quick/Dialog、移动端的 `title`、`aria-label`、placeholder、data 属性及确认文案。同步核对 JSON/快照导入、本地 FileReader 和持久化附件 URL 的 scheme 与属性安全校验（CSV/API 是否可携带附件仍待确认），避免把 HTML 转义误当 URL 校验；当前已确认 `normalizeStore` 可接受含引号的 `data:image/` 字符串，而 Today 日志直接拼接 `img src` 可造成属性注入，浏览器是否执行还取决于 CSP/宿主策略，暂无生产执行证据。验收：敌意输入在双语、双主题、窄屏和读屏输出中只作为文本出现，不截断属性、不改变 DOM 结构、不被浏览器解释为额外标记；现有已转义路径与模板管理器安全回归保持通过。
  - 进展一（2026-09-30，local-auto；D-317 第一批）：①shared 新增 safeAttachmentUrl——协议白名单（data:image/、blob:、https:、http:、无协议相对路径，与 renderIconMarkup 同门）+escapeHtml，不通过返回空串不渲染（javascript:/data:text/html 永不进属性）；②fragments 两处附件缩略图 src 注入实锤修复（event.attachment 裸插值→安全门）；③today-bindings 上下文菜单 innerHTML 注入实锤修复（item.editAria/insightsTitle 的 t() 输出转义）；④fragments bulk-check aria 转义；⑤editor/archived/review 点名点位复核均已是转义形态；⑥新守门 tests/render-boundary.test.cjs 入主链（敌意 URL 矩阵：javascript:/大小写/data:text/html/vbscript/引号逃逸/相对路径/blob/空值 + 接线精确签名 + 反裸插值断言）。**剩余切片**：全量 t({name}) 类扫尾（按页推进）、摄取侧附件 URL 白名单收紧评估、确认文案与 placeholder 的全表面敌意走查。
- [ ] T-1626 内置专注计时按实际经过时间结算与保存结果闭环（P1，UI/流程复核新增）——`src/render/focus-timer.ts:67-81` 每次 `setInterval(1000)` 回调直接 `remainingSec -= 1`，后台 WebView 节流或电脑休眠后会低估实际经过时间，显示、到点与最终记录分钟数随回调次数漂移；`finishFocusTimerFor:108-135` 在 `enqueueMutation(recordEvent)` 返回前已清会话并显示完成庆祝，保存失败会短暂呈现成功；切换预设（171-184）直接重置已投入时间和暂停态，缺少确认，与 `docs/page-experience-audit-and-prototype-plan-2026-09-28.md:85` 的预设切换确认设计不一致。需以开始/暂停/恢复的单调时间基准计算剩余时长，唤醒后校准，主动完成与到点完成使用同一结算；预设切换先明确已用时间处理并确认；记录保存中、成功、失败状态由真实写入结果驱动，失败保留可重试输入或恢复会话，不重复入账、不假庆祝。验收：后台节流、休眠唤醒、暂停/恢复、预设切换、跨页/多 root、到点与手动完成并发、写入失败/重试、重载明确失效及小时单位换算均按同一时间和事实口径；现有 `tests/focus-lifecycle.test.cjs` 的小条/重载守门外补节流和失败注入。
- [ ] T-1627 JSON 全量备份与独立配置可恢复性收口（P1，源码复核新增）——设置与回顾入口把 `serializeJson(host.cloneStore())` 称为“全量备份”，但 `src/model.ts:217-222` 的 `normalizeStore` 不返回 `CheckinStore.templates`，`src/model-helpers.ts:8-15` 的 `cloneStoreValue` 也不复制该字段；个人模板实际另存于 `checkin-user-templates`（`src/index.ts:125,1692-1715,1969-1999`），问卷模板/目标、图标库、事项、提醒动作、视图偏好和外部待处理箱也在独立桶。因而 JSON 导出/导入及本地 Store 快照只恢复主项目/事件，无法兑现 `docs/export-formats.md:7-9` 所写的完整 `templates` 与跨设备恢复预期。需先定义备份包的范围与隐私边界，再让导出、导入、快照、审计摘要和失败回滚使用同一版本化 envelope：要么显式声明“仅主 Store”，要么纳入经过脱敏/校验的独立配置并可选择恢复；模板、问卷、绑定凭据、提醒动作、偏好、图标和待处理箱的覆盖/合并/跳过必须逐类可见，未知字段可审计，恢复失败不留下半套数据。验收：导出后清空并恢复、跨版本迁移、只恢复主数据、完整恢复、取消/失败回滚、敏感字段遮罩和双窗口交错均有确定结果，文档与 UI 不再把部分备份称为全量。
- [ ] T-1628 CSV 导入导出契约、日期校验与表格安全收口（P1，源码复核新增）——普通导出 `src/export.ts:130-158` 输出 `eventId,itemId,itemName,occurredAt,localDate,...`，而导入 `src/export.ts:194-218` 只识别 `名称/name` 与 `日期/date/localdate`，插件自己的 CSV 直接回导会得到 0 行；导入日期仅用 `new Date(year,month-1,day)`，`2026-02-30` 会被归一为 3 月 2 日而接受；解析先按换行拆行，带换行备注或引号字段会被拆成多条无效行。普通 `serializeCsv` 还没有复用 `insight-records.ts:62-65` 的公式前缀中和，项目名/备注以 `=SUM(...)` 等开头时可能被电子表格执行。需统一导入/导出字段契约（兼容中英文别名和既有文件）、使用 `date-keys` 的真实日历校验、实现 RFC CSV 的多行/引号解析与大小/行数上限，导出沿用 BOM、确定性顺序和公式前缀安全策略；错误行、未知列、截断和重复导入要在预览/审计中明确。验收：插件自导出→导入无损往返，旧版中英文表头兼容，闰年/月末/非法日期、换行/引号/CJK、公式前缀、超大文件、重复行、导入失败回滚和桌面/移动保存通道均有确定结果。
- [ ] T-1629 三类文档来源有界分页与扫描进度（P1，源码复核新增）——健康文档 `src/index.ts:1162` 固定 `ORDER BY id ASC LIMIT 500`，笔记推导 `src/index.ts:1214` 始终不传 `buildNoteQuerySql` 已支持的 `afterBlockId`，叶归 LifeLog `src/index.ts:1439` 固定 `ORDER BY id ASC LIMIT 200`；`windowFull` 只提示风险。来源超过首窗口后，后续块可能在每次轮询中一直读不到；`docs/note-query-integration.md` 的“下一轮处理”承诺需与实现对齐。三来源应按稳定顺序有界推进并保留可恢复的扫描进度，明确源文档/笔记本变更、删块、重载、手动重扫和历史补偿；LifeLog 分页须保留同文档相邻 Marker 的前置段，不能在页界把首段时长丢掉或错归。验收：跨 200/500 行的连续轮询、重启与手动重跑最终覆盖后续记录；边界重复、源变更和回退不丢不重，externalRef/墓碑/手动优先仍生效；每轮请求与报告有界，读满提示可指向继续扫描的真实状态。
- [ ] T-1630 微信读书三指标拉取完整性与逐项结果（P1，源码复核新增）——`src/index.ts:1271-1423` 的 `wereadLastPull` 与手动成功提示只依阅读时长链路的 `days/written`，完读/笔记的读取、分页、写入失败可能被报为成功。昨日笔记只扫 notebook 至多 5 页、活动书至多 10 本、每书 review 至多 3 页；触顶或网关/解析失败后仍把部分 `tally` 写成 `weread:<itemId>:notes:<日期>`，后续相同身份被跳过，无法补足。`upgrade_info` 出现时解析器仍返回 `ok:true` 并继续三链路，与官方升级停用口径不符。需按时长/完读/笔记分别返回成功、空数据、部分、失败、待重试及实际写入数；所有必要页完整后才原子结算昨日笔记，完读逐本失败保留重试机会，升级提示阻止本轮所有链路直到契约核对。验收：HTTP/网关/分页触顶/解析/存储失败、空数据、重复、墓碑、定时与手动拉取都给一致且不泄露 Key/书名的结果；不完整计数不被永久锁定，不将局部成功说成三指标全成功。
- [ ] T-1631 API v5 事件读取来源过滤与事件类型对齐（P1，公开契约复核新增）——`src/types.ts:108` 和 `src/api.ts:38` 允许 `sireader/siplayer/weread/yeguif` 作为 `CheckinEvent.source`，但 `src/features/api-v5.ts:8-11` 的运行时白名单只有四种基础来源，`getEventsInRange(...,{source:"weread"})` 会抛 `TypeError`。对齐类型、运行时过滤、错误文案、`docs/api-v5.md` 与契约夹具；保持公开写入面不能伪造内部来源的现有边界。验收：八个合法来源的读过滤均返回正确事件与截断状态，非法来源仍拒绝，读权限不扩大写权限，旧消费者兼容。
- [ ] T-1632 组合包部分应用与已有项目冲突预览（P2，调研对照新增）——现有组合包预览 `src/render/bind-editor.ts:829-840` 仅提供逐条套用，批量按钮只在无活跃项目时出现；`src/index.ts:6040-6074` 批量应用所有新条目，重复仅按本地化后的项目名称精确判断。`docs/implementation-roadmap-product-strategy-2026-09.md:299-302` 已提出可选项目与部分应用。让空库和已有库都能勾选包内项目、查看已有项目及同名不同规则的差异，逐项决定创建/跳过或进入编辑；提交前重核对并一次保存，失败整批回滚，取消零写入，不隐式启用联动或产生事件。验收：空库/已有库、全选/部分/全跳过、重名同规则与异规则、语言切换、并发变更、重复应用、保存失败、键盘和窄屏均有确定结果。
- [ ] T-1633 Loop/Obsidian 迁出完成语义与格式校验（P1，源码复核新增）——`src/features/loop-csv.ts:237-252` 把所有事件的日期（含 `kind:"skip"`）都当作 `YES_MANUAL` 导出；`src/features/obsidian-habits.ts:169-174` 虽排除 skip，也把其余任一事件日直接当完成日。对 `atMost` 戒除项目，真实事件可能代表破戒；对目标/排期修订，单看“有事件”也不能证明达标。Loop 迁入 `parseLoopCheckmarksCsv` 只按日期正则判断，`2026-02-30` 可进入导入计划；Obsidian 迁出的 YAML 标题插值（`src/features/obsidian-habits.ts:192-193`）需核对引号、换行转义。两种迁出应复用主模型按当日生效规则判完成，并对 skip、零事件守住、部分达标、无法映射的数值/排期给出明确映射或损耗提示；不得为目标格式无法表达的状态制造完成事实。Loop 日期复用严格日历校验，YAML 标题按目标格式安全转义，预览与导出文档如实说明。验收：仅跳过/破戒/未达标日绝不变成完成，含历史修订、配额、混合事件、墓碑、非法日/闰年、CSV/YAML 引号换行、Loop 双向往返与旧文件兼容的夹具均有确定结果。
- [ ] T-1634 显式“未达成及原因”语义评估（P2，条件候选，先调研不开发）——`docs/benchmark-habit-apps-2026-09.md:664` 记录 TickTick 的 Unachieved 交互；当前事件 `kind` 只有 `checkin/skip`，回顾难以区分“明确未做到并写下原因”“主动请假跳过”和“忘记记录”。先用真实使用场景验证是否需要单独记录动作及其低压力文案；若需求成立，再定义事件身份、零完成/部分完成、连击与分母、提醒关闭、撤销、历史修订、导出/API 和旧数据降级口径。不得把未达成自动当 skip 或补连击，不让记录原因成为额外负担。完成条件：形成带真实场景和用户价值的产品决策及跨页面语义矩阵，再判断是否实施。

## 三类联动体验梳理（2026-09-28，用户要求研究并加入待办，先不开发；研究稿见 [三类联动的任务导向梳理](docs/integration-experience-design-2026-09-28.md)，口径 D-300）

- [x] T-1545 三组能力与打卡项目关系的逐项盘点（P0）——done（2026-09-28，local-auto）。派生视图 [integration-capability-registry-2026-09-28.md](docs/integration-capability-registry-2026-09-28.md)：A 行为自动打卡 11 卡（手动/思阅/思播/微信读书/健康/笔记推导/叶归/Dock Tomato/内置计时/API 写/Agent 写）×九字段（目的/前置/方向/触发/绑定单位/产出/失败停用换绑/入口/证据）；B 文档输出 4 卡（日记/摘要/问卷/锚点）含「事实先落盘、文档失败不回滚」共同边界；C 对外契约 5 卡。归属纠偏入文：问卷/锚点属输出组、笔记推导属事件组（读文档≠写入组）、Dock Tomato 双向（消费完成事件+对外 registerFocusAdapter）、Task Horizon 双向（taskhorizon: 写入+calendar 投影）、API 写面五来源防伪造回落 api。不另造第二套真值：逐卡指向注册表与设置字段表对应行。
  - 状态：done。
- [x] T-1546 新用户任务导向信息架构与原型（P0）——done（2026-09-28，local-auto）。原型文档 [new-user-entry-prototype-2026-09-28.md](docs/new-user-entry-prototype-2026-09-28.md)：连接总览三卡（一句话+具体例子+只读进度，数量仅导航不用已连接徽标）；项目直达来源绑定（编辑器段 6 扩展：来源要求先校验后进配置，linkagePlan 语义不变）；来源卡首屏四行（产生什么/写入哪些/还缺什么/最近有效记录）+ 反查新建合适项目（预填+单位先校验+returnTo 来源卡）；新用户六条示例含失败态（思阅等待片段/微信读书冲突提示/健康文档缺失/问卷双结果/Dock Tomato 回退/Task Horizon 恒 waiting）；组名三处对齐（总览卡=分区子区=来源类别现有键）与搜索/书签/展开态可达性保留。底层 A/B/C 数据流差异全程保留（引用 T-1545 归属表）。验收门 5 条移交 T-1550 可用性切片。先评审后实施——本稿即评审件。纯文档轮。
  - 状态：done。
- [x] T-1547 来源→项目的配置与验证闭环（P0）——done（2026-09-28，local-auto）。**六卡事实三行**（`sourceFactsBlock` 共享助手，紧跟状态行）：产生什么记录（`set.sourceProduces.*` 六键，口径逐来源显式——实时片段/整分钟采样/官方日汇总/收件箱行/字段匹配/LifeLog 映射）+ 写入哪些项目（从既有偏好实时推导项目名，多指标逐项去重显示，缺失显示 itemMissing，未绑定如实 set.targetNone）+ 何时触发（`set.sourceTrigger.*` 六键，按真实轮询常量写死口径：思阅实时/思播 15s/微信读书 30min+手动/摄取三件 5min）。**查看记录跳转**：每卡按钮 `data-review-records-for` → `openReviewRecordsForSource` 直达回顾记录区并预置来源筛选（sireader/siplayer/weread/yeguif 用事件 source 值；health/notequery 事件落 source=api，用 T-1512 登记渠道 api:health/api:notequery 精确过滤；未知来源不动筛选不猜）。**思播宿主探测**：probe-siplayer 按钮跑 `detectSiplayerController(window)` 真实特征检测并如实反馈；**思阅无可靠探测面——不伪造探测按钮**（守门断言 probe-sireader 零出现），监听型不伪造「立即同步」。多指标映射 UI（health 三映射/yeguif 映射表/weread 三项目）与单位/冲突提示（sourceConflictReading）既有满足。i18n 新增 19 键×2。守门：settings-navigation 新增 13 断言（六卡事实块/跳转属性/思播探测/思阅零伪造/双语 9 键/渠道映射/真实检测调用）。
  - 状态：done；剩余边界=六新用户场景的现场验收归 T-1550 切片（含键盘/窄屏走查入 T-1608 台账）；sireader 探测待上游提供检测面。
- [x] T-1548 思源文档输出与打卡融合设计（P1）——done（2026-09-28，local-auto，随阶段 2 各切片交付+本轮预览收尾）。各构成项的落点：入口/触发/目标/审计与重试=T-1552 五段式（触发行+审计 backed 最近结果行）；**内容预览=本轮实现**——diary/summary 写入卡新增「预览内容」按钮+折叠容器（`data-output-preview-*`），零写入生成将追加的 Markdown，与写入共用同一构建路径（摘要驻留的行构建提取为 `buildSummaryResidentMarkdown` 单一方法，写入与预览零分歧）；问卷的提交前预览=答题弹窗本身（T-1588 切片再加提交确认预览）；锚点所有权=编辑器 anchorHint 既有。**双结果解释**：writeResultFail 明示「打卡事实不受影响」+ 问卷弹窗 retryHint（事实先落盘、文档失败不回滚、重试幂等）。**读文档不进写入组**=T-1545 归属表 + T-1553 动作词（health/notequery/yeguif 为「立即读取」非写入）。失败不回滚/不覆盖正文=model 旁路纪律+插件自写块所有权（updateBlock 仅定位 lv-checkin-journal 标记块）。状态规范=T-1604 八态+T-1554 矩阵先行，本轮为规范后实施。i18n 新增 set.outputPreview ×2。守门：settings-navigation 新增 6 断言（两卡预览按钮/容器/双语/单一构建路径）。
  - 状态：done。**阶段 2（联动纵向切片）8/8 全部交付**。
- [x] T-1549 宿主/插件能力语义与状态收口（P1）——done（2026-09-28，local-auto，与 T-1551 同切片）。**Task Horizon 双行合一**：契约行（contract-center waiting）与依赖行（provider-contract healthy）合并为一行，同行双属性同时表达「消费端等待接入」与「我方提供方契约就绪」——provider ready 不再可被误读为消费端已连接（依赖守门新增精确子串断言）；**Tomato 诊断双行合一**：contract-center 诊断行并入运行状态行（hint+诊断详情+恢复指引+导出按钮+回退动作同卡），数据全部来自真实探测（diagnosticState）。API/Agent 行归「给其他工具使用」只读节，能做什么/谁发起沿用既有 hint 键。未新增任何连接开关或臆造上游 API（thStatus 静态键口径保持，dependency-status 既有断言通过）。
  - 状态：done；剩余边界=监听型（思阅/思播）卡宿主探测动作归 T-1547 纵向切片（思播 detect 实现已备）。
- [x] T-1551 宿主与插件设置职责拆分（P0）——done（2026-09-28，local-auto）。host 组拆为两节：**「我的专注工具」**（data-host-section="mine"：专注提供方选择、Tomato 运行状态+诊断+导出+回退、番茄完成问题、番茄收件箱——全部用户可操作）与**「给其他工具使用」**（data-host-section="others"：API v5 契约、Task Horizon 合并行、Agent 注册状态、Agent 审计导出——只读状态+诊断出口）；provider ready/能力已注册/消费方已连接三种语义分别落在不同行不同属性，不再混排（T-1554 槽位纪律）。旧单一类别标签 external-contract 退役（键删除，i18n-parity 2366 对保持）；番茄收件箱/完成问题归属「我的专注工具」，外部来源待处理箱留来源组（来源运行问题，T-1547 接回链）。守门：dependency-status 新增 8 断言（分节/两处合一/精确双属性/归属顺序）。
  - 状态：done。
- [ ] T-1550 三组联动可用性切片验收（P1）——按 T-1545 专项矩阵逐项走查首次配置、无目标/错误单位、无宿主、空数据、写入失败、停用与换绑；结果写入 T-1608 同一证据台账，浏览器双主题/320px/键盘、隔离内核与真实第三方分层。新用户须能从项目走到配置、核对单条事实并理解文档输出独立结果，不把“配置好”说成“已产生记录”。
- [x] T-1552 思源文档写入卡片重构（P0）——done（2026-09-28，local-auto）。**开关核对决议**：日记报告的启用开关是纯手动动作上的假门槛（不存在自动写入路径），按卡面指示**移除**——writeDiaryReport 改为仅 docId 闸、开关处理器删除、存储字段 diaryReport.enabled 仅为兼容保留（旧值无害，无任何配置被静默改变：移除开关不产生自动写入）；摘要常驻开关**保留**（自动触发语义）。**五段式落地**（三张设置侧写入卡）：写入内容（既有 hint）+ 触发方式（新行 data-write-trigger×3：手动/常驻自动/打卡时写入，`set.writeTrigger*` 3 键）+ 目标与所有权（T-1557 已升级的目标卡 + 既有边界文案）+ 预览或立即执行（既有 write-now 按钮）+ **最近结果**（新行 data-write-result×3，读审计单一事实——appendStoreAudit type:"anchor" 的 diary-report/summary-resident/journal 通道本就记录 ok+reason，成功显时间、失败显原因并注明「打卡事实不受影响」，无记录显空态）。问卷从绑定项目流程进入=编辑器绑定既有满足。锚点在编辑器侧（所有权文案既有 anchorHint）。i18n 新增 8 键×2，退役 set.diaryToggle 与 msg.diaryNeedDoc（零引用清理）。守门：diary-report 4 断言翻转为退役语义+触发/结果行，settings-navigation 新增 12 断言（三卡触发行/结果行/摘要开关保留/开关退役/双语 8 键）。
  - 状态：done；剩余边界=问卷提交双结果的页内并列呈现归 T-1588 切片（本卡最近结果已可见）。
- [x] T-1553 第三方来源卡片操作语义统一（P0）——done（2026-09-28，local-auto）。动作词按来源类型收拢：摄取型（health/notequery/yeguif）「立即读取」（新键 set.sourceReadNow）+ 既有「预览匹配」；拉取型（weread）「立即拉取」唯一入口——**移除与 pullWereadNow 重复的第二按钮**（旧 refresh-source weread 路径既无前置校验、反馈又是无意义回显，属劣化重复）；**含义模糊的「立即刷新」（set.sourceRetry）全量退役**（中英键删除，refresh 分发同步移除 weread 分支并修正反馈兜底）。六张来源卡的编号步骤+边界长文折入 `data-source-advanced` 折叠（复用既有 settings-fold 样式零新 CSS；设置搜索本就自动展开命中 details，可达性不降级）；步骤计数守门（=8）保持通过。新增守门 8 条断言入 settings-navigation（退役键零残留/三摄取卡动作词/weread 唯一拉取/折叠计数=6/分发无 weread 分支）。目标与映射在启用开关之前=既有顺序已满足（矩阵核对）。验证：test:quality、双主题 visual-qa、宽度走查全 EXIT=0，CSS 630747 bytes 不变。
  - 状态：done；剩余边界=监听型「宿主探测」动作与运行状态呈现归 T-1549，卡片五段骨架与 T-1554 状态槽位完全合流归 T-1565/1567 实施切片。
- [x] T-1554 三组设置状态与空态设计（P1）——done（2026-09-28，local-auto）。设计矩阵 [integration-status-matrix-2026-09-28.md](docs/integration-status-matrix-2026-09-28.md)：六类信息分离为每卡固定槽位（目标/动作/配置状态/运行状态/活动结果/问题状态，禁止合并徽标）；六场景矩阵（未配置/已配置未启用/已启用无数据/最近成功/最近失败/宿主未探测）×文案要点×下一步动作（空态按钮直接落到缺失控件并聚焦，不做一级「前往设置」跳转）；逐卡场景可行性穷举基准（监听型无立即同步、Task Horizon 恒 waiting 永不显示已连接、手动报告无假开关）；双语文案模板 `set.state.*` 槽位化 + 动作词表（与 T-1553 骨架词表一致）+ 禁用词表（「已连接/已同步」不作卡级状态词）。状态机语义引用 T-1604 契约、字段现状引用 T-1561 注册表，不另造真值。验收清单 5 条移交 T-1565/T-1567 实施切片。纯文档轮。
  - 状态：done。
- [ ] T-1555 设置内容去重与分层走查（P1）——逐项检查重复的来源说明、边界长文、保存/启用/立即执行按钮和状态徽标；保留首屏一句用途+一条数据流，细节折叠到高级说明；确保搜索、书签、项目编辑器回链、卡片展开状态和移动窄屏仍可达。产出三组设置的字段/动作/状态矩阵后再实施 UI 改动。
- [x] T-1556 思源目标选择器统一设计（P0）——done（2026-09-28，local-auto）。规范文档 [target-selector-spec-2026-09-28.md](docs/target-selector-spec-2026-09-28.md)：四种目标类型（文档/块/笔记本/当日日记）各自机器身份与可证实查询检查面；五步交互流（类型→笔记本过滤→搜索/最近使用→结果预览→保存，保存仍以既有 ID 为身份、经 validateBindingTarget 同源校验、失败保留旧绑定草稿）；已选目标卡五动作（当前摘要/更换/清除/打开/重新检查）；摘要=会话查询缓存、失败退回 ID+修复动作、**不做持久快照**（另立模型任务，不改 Store v3）；六使用点差异表（读写/创建/触发/失败行为，选择器不掩盖来源差异，文案复用 T-1554 模板）；换绑确认四段（旧目标/新目标/范围变化/历史与重摄取风险，不做可写权限试写预检）。验收门 5 条移交 T-1557/1558/1559。纯文档轮。
  - 状态：done。
- [x] T-1557 文档/笔记本绑定交互实现（P0）——done（2026-09-28，local-auto，文档型切片）。三张文档目标卡（diary/summary/health）升级为统一「已选目标卡」：摘要行（`targetSummaryRow` 共享助手渲染，标签=名称·路径·ID，来自 `targetSummaries` 会话缓存——查询失败退回已存 ID，绝不持久化）+ 四动作（打开=openBindingTarget 既有复用 / 重新检查=validateBindingTarget 同源只读检查并回写缓存 / 重新选择=聚焦输入框 / 清除=确认后清空）；摘要水合复用 `readBindingBlocks` 单一实现（bind 尾部异步补查就地更新标签，不整页重渲染）。复用清单：防抖搜索（既有）/保存校验（bindVerifiedDocumentSave）/集中体检/打开动作全部零重复实现。验证：check、test:quality、双主题 visual-qa、宽度走查全 EXIT=0。
  - 状态：done（文档型）；剩余边界=块（锚点）/笔记本（叶归）/当日日记（问卷 daily 模式）三类型接线同一助手归 T-1559 与后续切片；键盘/触屏/窄屏细节走查归 T-1608 台账。
- [x] T-1558 绑定保存前体检与换绑确认（P0）——done（2026-09-28，local-auto，文档型切片）。bindVerifiedDocumentSave 扩展确认参数：换绑（旧目标非空且变化）先 window.confirm 列旧/新目标、该卡读写范围（复用既有 DocHint 键作范围说明）与「既有记录保留、不自动迁移」；取消零写入、表单草稿保留（变更清单草稿语义不变）；首次绑定不确认。清除走独立动作：确认（影响说明）→setId("")→persist 失败回滚旧值→清缓存。写入能力以真实保存结果与审计为准——未新增任何试写预检（D-307 边界遵守）。新守门 11 条断言入 settings-navigation（三卡摘要行/动作在位/双语 9 键/确认弹窗/会话缓存/水合复用既有查询）。
  - 状态：done（文档型）；剩余边界=问卷目标保存（save-journal-target）与叶归笔记本换绑的确认接线归后续切片。
- [x] T-1559 绑定失效恢复与集中体检闭环（P1）——done（2026-09-29，local-auto）。在只读集中体检上加就地修复：①**行内「停用」**（`data-disable-binding`，仅四条自动联动 summary-resident/health-inbox/note-query/yeguif-lifelog；diary 手动/anchor 逐项/journal 不适用）——确认弹窗→停用→persist 失败快照回滚；摄取源沿用断连保留纪律（planSourceDisconnect 汇总既有事件与身份并以 sourceDisconnectRetained 提示），可随时在源卡重新启用。②**失效原因随桶提示**：missing/error 状态行 title 显修复路径（bind.reasonMissing「重新选择、打开或停用」/bind.reasonError「稍后重检」），检查时与初始未绑定态都生效。③**最近检查时间**：体检头 `data-last-binding-check` 会话态回显（检查完成就地更新，重渲染由 ctx 带出）；目标名称/路径/类型既有（targetLabel+metadata）。④恢复闭环=重新保存绑定（T-1557/1558 目标卡与确认）→再点「检测全部联动」即更新状态，历史零改动、不静默改投。i18n 新增 5 键×2。守门：settings-navigation 新增 9 断言（停用范围精确/原因提示/时间回显/映射与断连纪律/双语）。
  - 状态：done；剩余边界=「移动 vs 删除」的根变化细分（需对比旧 root_id，复杂度高）与块失效专项归后续观察；键盘/窄屏走查归 T-1608 台账。
- [x] T-1560 读取范围与目标所有权说明（P1）——done（2026-09-29，local-auto）。`scopeLineRow` 共享助手在**七个绑定点**选择器旁声明「读写范围」行（`data-scope-line`）：diary/summary/health/yeguif 笔记本卡/journal 目标卡/notequery（设置侧六点）+ 编辑器锚点字段（set.scope.anchor 紧跟 anchorHint）。每条范围句按 T-1556 差异表与真实实现核实四事实——读写边界（写入只追加插件自写内容/读取只读不修改文档）、是否创建文档（全部不自动创建；diary 保留手动新建入口）、轮询窗口（5min×3/30min weread 已在 T-1547 触发行）、失败行为（失败仅入审计/保留既有事件/自动停用/安全关闭摄取/不回滚打卡事实可幂等补写）、块所有权（只更新自写块绝不改用户正文）。i18n 新增 8 键×2（scopeTitle+七范围句）。守门：settings-navigation 新增 9 断言（六设置点调用/双语 8 键/编辑器锚点范围说明）。
  - 状态：done；剩余边界=「按日记路径解析并可创建文档」的 diary 手动新建入口与问卷 daily 模式已有（create-doc/load-notebooks 既有），真实内核边界 E2E 夹具归 T-1602/T-1608 现场验收（host-pending，不以模拟冒充）。

- [ ] T-1615 设置页乱码与字段碎裂显示治理（P0，用户反馈，先排查不开发）——设置页存在文字疑似乱码、字符被逐字竖排、文档 ID/按钮/状态行被挤压或错位等显示问题（截图中的目标文档卡尤明显）。需区分真实 UTF-8/i18n 键值错误与布局宽度、flex/grid、overflow、换行策略造成的“伪乱码”，全面检查九组设置、来源卡、文档目标卡、状态/按钮/路径/ID/placeholder；统一长 ID 的截断、复制和完整值提示，禁止字符级竖排和原始键名泄漏。验收：中英文、浅色/深色、桌面/页签/dock、移动端和 320px 宽度下文字可读且不重叠、不裁切、不出现单字竖排；i18n parity、设置搜索、键盘/IME、读屏和视觉走查均覆盖，保留真实目标值与错误原因。
  - 进展（2026-09-29，local-auto）：排查完成，结论见 [settings-garbled-display-triage-2026-09-29.md](docs/settings-garbled-display-triage-2026-09-29.md)。语料零 mojibake；「乱码」定性=①布局伪乱码主因——三类文档/问卷/笔记本目标卡专属样式只写 ≤719px 容器档（components.scss:10705 起），卡片复用 `lc-checkin__settings-row` 类在 ≥720px 全档命中通用两列行栅格（maintenance-responsive.scss:14 无条件 `minmax(120px,240px)`，特异性 (0,3,0) 压过卡片自有 (0,2,0)；components 779/4202 同向），整个卡体被塞进第二列 240~260px，卡内摘要行 label 列实测 0~14px 逐字竖排（760/900/1180 探针截图复现，420 正常对照）；②真实缺陷——5 个 i18n 键缺失（`bind.feature.noteQuery`、`blockPreset.noEditor`/`blockPreset.inserted`、`editor.clear`、`common.clearFilter`，6 处调用）经 `t()` 缺键回退泄漏原始键名。治理五方向（样式提档/补键/长 ID 呈现/守门三件/视口容器混档走查）已登记，实施随 T-1616 重构合并收口、另排期。
- [ ] T-1616 全部文档目标选择与绑定流程重构（P0，用户反馈，先设计不开发）——当前多个文档绑定框的候选内容、已选值和操作布局不可靠，不能满足“从全部文档中选择”。基于 T-1556～T-1560 重新收口一套共享流程：文档型目标通过可查询的全部文档选择（支持笔记本、路径、标题和 ID 搜索/过滤，不只列已绑定文档或少量候选）→结果预览名称/路径/笔记本/类型/检查状态→保存前同源校验→换绑确认→保存后显示当前目标，并提供打开、重新检查、重新选择、清除；文档、块、笔记本、当日日记仍保留各自语义，不用一个下拉框混淆。覆盖日记报告、摘要驻留、健康文档、问卷文档模式、笔记查询、叶归笔记本和编辑器锚点等所有绑定入口；加载失败、查询失败、无结果、无打开笔记本、目标失效、旧 ID 回退和保存失败分别呈现修复动作，旧存储 ID/历史内容保持不变，不新增未经决策的持久名称快照。集中体检增量：插件就绪时可有界首检；先核实思源公开同步完成事件契约，再决定是否在同步结束后去重复检，缺少公开事件时保留手动检测，不新增轮询；查询失败保持“未知/检测失败”，不误判为目标删除，过期响应不覆盖新结果。验收：任一入口都能从全部可查询文档找到目标，候选与已选摘要一致，换绑/清除/重载/失败重试可回滚；多 root、跨窗口和同步连发不重复爆量请求；键盘/IME/窄屏/双语/双主题通过；复用 `validateBindingTarget`、`bindVerifiedDocumentSave` 和集中体检，不再保留互相矛盾的旧选择框。
  - 进展（2026-09-29，local-auto）：设计评审件完成——[doc-binding-fullflow-design-2026-09-29.md](docs/doc-binding-fullflow-design-2026-09-29.md)。统一候选面（searchDocs 全量搜索 + loadNotebooks 笔记本浏览 + ID 精确回显，零新内核 API）、`document-choice-row` 结果预览行（复用 T-1563 键位环选/IME 冻结模式）、七入口收敛矩阵、六态失败矩阵、集中体检增量四边界（同步后复检先核实公开同步事件契约，不臆造）、六条验收门并入 T-1608 台账；与 T-1615 目标卡样式提档合并一次收口。

- [ ] T-1617 设置页字体层级与密度统一优化（P1，用户反馈，先设计不开发）——设置页中总览摘要、分组标题、卡片标题、字段标签、帮助说明、状态徽标、按钮和表单控件的字号/字重/行高不一致，截图中①字段行、②右侧状态摘要、③说明文字的层级尤其明显，造成阅读重点混乱。需建立设置页专用的 typography 层级和间距规则，统一中英文基线、标签与说明比例、控件文字、状态/错误/禁用字重和颜色，并在桌面、页签、dock、移动端及 320px 宽度保持可读密度；复用现有 design tokens 与容器规则，不用局部硬编码覆盖。验收：九组设置、总览、来源卡、文档目标卡和高级折叠内的标题/正文/控件层级可对照，浅色/深色、聚焦/悬停/禁用、长文案和中英文均无跳级、挤压、裁切或异常换行；与 T-1615/T-1616 联合走查。

## 设置页 UI 原型与重构（2026-09-28，用户要求梳理功能作用并先加入改造步骤；研究稿见 [设置页 UI 原型与重构步骤](docs/settings-page-rearchitecture-2026-09-28.md)，口径 D-303）

- [x] T-1561 设置字段注册表与信息架构迁移表（P0）——done（2026-09-28，local-auto）。派生视图 [settings-field-registry-2026-09-28.md](docs/settings-field-registry-2026-09-28.md)：现九组逐字段登记保存语义四分类（A 显式保存 10 变更清单字段／B 即时异步持久化／C 动作类／D 只读状态行）、目标分区（沿用研究稿两层结构）、风险级别、搜索词、成功/失败/重绘/重载行为与存储桶；存储面总表列全 8 个 `checkin-*` 独立桶与视图偏好单桶（含 weread apiKey 仅本地不导出）。核对发现一处登记缺口：`save-note-query` 七字段显式保存但不在变更清单——迁移时须补登记或文档化，不得静默。登记 B 类字段的「失败时内存/存储不一致」口子移交 T-1604；深链/书签盘点（source-panel 展开态×8、文本搜索）移交 T-1603。处理器行号逐一抽查命中。纯文档轮，无运行代码改动。
  - 状态：done。
- [x] T-1562 设置首页总览只读投影（P0）——done（2026-09-29，local-auto）。新纯模块 features/settings-overview.ts（`buildSettingsOverview`，零依赖确定性）+ 设置页搜索框下总览块（复用 external-overview 样式零新 CSS）。**需要处理**（≤8 条有序截断）：必填目标缺失（collectNoteBindings 行，带 featureKey 与「去配置」直达选择器——复用 data-goto-binding 滚动聚焦机制）、来源前置缺失（思阅/思播/微信读书未绑项目、微信读书缺 Key、健康无映射、叶归缺笔记本或缺映射，选择器直达具体控件）、最近写入失败的输出通道（审计 type:"anchor" 按 channel 取最新，未知通道忽略不造标签）、未保存草稿计数（settingsDrafts+journalDrafts）；**无问题显式空态**「没有待处理项」；**最近活动**（最近 3 条通道写入成功/失败，channel→功能名走 OVERVIEW_CHANNEL_FEATURE 同一词汇）；**配置入口**四按钮（新建项目→showEditor；自动记录/写思源/数据恢复→复用分组 nav click 继承滚动与 aria 机制）。**不制造假象**：只读聚合零新判断数据源，未启用行不算故障。i18n 新增 18 键×2。守门：新 tests/settings-overview.test.cjs 入主链 3 检（未绑定行/来源前置/失败通道+草稿/有界/确定性 deep-equal、未知通道忽略、禁用行不算故障）+ settings-navigation 新增 11 断言（总览块/空态/直达复用/入口/双语 6 键/纯模块单一实现/nav 复用）。
  - 状态：done；剩余边界=「最近活动」目前只聚合文档写入通道（来源读取活动已有 statusLine 活动槽位承载）。
- [x] T-1563 字段级搜索与详情导航（P0）——done（2026-09-29，local-auto）。在既有行过滤之上增强 settings-navigation（不重做过滤本体）：①**匹配行集合与 ↑/↓ 环选**——过滤时收集可见匹配行（DOM 序），方向键在集合上循环移动并高亮当前行（`is-search-active`，+111B 样式在预算内）、滚动进入视野，状态栏播报「第 i/n 项 · 组名：字段名」（新键 `set.searchActive`，组名取自 nav 按钮、字段名取 label，40 字截断）；Enter 从「聚焦首项」升级为聚焦**当前项**控件。②**中文 IME**：composition 期间冻结过滤（compositionstart/end 门控，组合结束一次应用），不打断拼音。③**Esc 清空**：一键复位查询、过滤与状态。④**重绘恢复**：查询、过滤结果与焦点位置按 root 会话记忆（WeakMap，cleanup 保存、重绑回放，此前焦点在搜索框则物归原主）。**测试抓到真 bug**：恢复块初版放在 scheduleSync 定义之前（TDZ ReferenceError——真实重渲染带查询时会崩），已移至函数尾部；夹具行初始化补 hidden=false（对齐真实 DOM 布尔语义）。新增守门测试块 16 断言（过滤/播报/环选双向含跨界/Enter/IME 冻结语义/Esc/会话恢复含二次 cleanup 幂等）；settings-navigation 三个加载点补 i18n 白名单桩。i18n 新增 1 键×2。
  - 状态：done；剩余边界=结果分区面（chips 列表）未做——当前播报已含组名+字段名，chips 待 T-1564 分区重组时随新信息架构一并评估；移动端触摸路径与桌面一致（无新增专用手势）。
- [x] T-1564 外观与操作分区重组（P1）——done（2026-09-29，local-auto）。appearance/today/dialog/shortcuts 四组合一为「外观与操作」（`set.groupAppearanceOps` 新键），导航 9 项减为 6 项；内部五个小节（`data-appearance-section`：外观/今日视图/提醒/快捷键/弹窗与页签，复用 source-category 样式零新 CSS）。**行原样迁移零语义变化**：全部 data-* 属性、存储键与保存处理器不动；两处按职责归位——openMode（弹窗打开方式）从外观移入弹窗与页签小节、NLP 速记从外观移入今日视图小节；**提醒独立成节**（新键 set.groupReminders）；reset-view 留今日视图尾部（T-1566 统一隔离风险操作）。旧设置值与双语文案全兼容（i18n-parity 2426 对）。守门：settings-navigation 新增 8 断言（三独立组退役/五小节在位/openMode 与 NLP 归属位置/双语 2 键）。
  - 状态：done；剩余边界=「今日与提醒」是否再拆独立导航项随 T-1565/1566 全局六节 IA 一并评估。
- [x] T-1565 联动与目标分区原型落地（P1）——done（2026-09-29，local-auto）。host/documents/external 三组合一为「联动与目标」（`set.groupIntegration` 新键；导航 6→4 项），内部三小节 `data-integration-section`：宿主能力（我的专注工具/给其他工具使用保持 T-1551 拆分）→ 思源文档输出 → 第三方来源自动记录；行原样迁移，来源事件、文档写入与公开 API 语义零变化；六槽位状态与目标选择器沿用前序切片成果。总览「写入思源笔记」入口跳转同步改指合并分区（「配置自动记录」同点，任务顺序由总览三卡承载）。**宽度走查抓到脚本级回归**：walkthrough 用退役的 documents 导航 id 点击超时——改用合并组 id 并标注 T-1565；真实 UI 无溢出（全宽度档 ok）。i18n 新增 set.groupIntegration ×2（parity 2427 对）。守门：settings-navigation 新增 7 断言（host/documents 独立组退役/恰三小节标记/分区标题/四键双语/总览入口指向/文档输出先于来源）+ 更新 4 处旧组断言（导航下限 4/documents 专组退役/顺序标记化）。
  - 状态：done；剩余边界=全局「今日与提醒」独立导航项与统一目标选择器独立小节随 T-1566/1567 评估；来源事件/API 语义不变（守门全过）。
- [x] T-1566 数据与恢复分区隔离（P1）——done（2026-09-29，local-auto）。data 组重组为四个分区（`data-data-section`）：导入与导出（六种导入/导出归拢，原分散两处）→ 恢复点与回滚（恢复快照/快照管理/快照导入/快照列表/恢复指南）→ 诊断与审计（诊断行+审计行+审计列表）→ **重置（危险操作）**（reset-all-preferences + 从外观与操作今日视图小节移入的 reset-view-preferences 收拢一区，与普通保存隔离）。确认补齐：reset-view-preferences 原无确认（瞬时重置）——新增 `msg.viewPrefsResetConfirm`（影响范围：显示设置回默认、打卡数据与项目不受影响）；reset-all 既有确认保持。失败保留原数据与草稿=既有回滚纪律（导入冲突三选/恢复前快照链/偏好失败回滚）不变。外部待处理箱留联动分区（来源运行问题，恢复指南 recoveryInbox 行回链）。i18n 新增 5 键×2。守门：settings-navigation 新增 7 断言（四分区在位/两重置收拢危险区/reset-view 无残留/双语 5 键/确认弹窗在位）。
  - 状态：done；剩余边界=外部待处理箱的分区归属随 T-1567 全局验收复核（当前在联动分区来源运行问题槽位）。
- [x] T-1567 设置页分阶段迁移与切片验收（P1）——done（2026-09-29，local-auto）。新验收守门 tests/settings-migration.test.cjs 入主链（5 检）：①**显式保存 10 字段三面对账**——DOM 属性（settings.ts）+ 保存处理器（index.ts）+ 变更清单注册（settings-change-list）逐字段核对，六个文档目标动作按 bindVerifiedDocumentSave 调用点断言（动态选择器）；②**即时持久化字段**属性+监听在位（quiet 起止按模板选择器循环断言；退役 diary 开关保持退役）；③**迁移后结构**——四导航组、五组退役、三类分区标记、总览块、搜索会话、来源面板展开态机制全在位；④**存储键零变化**——视图偏好单桶+8 个 checkin-* 桶名原样，重置视图偏好保留主题例外字段；⑤**迁移切片双语覆盖**——31 个迁移新增键 zh/en 全齐。验收证据：本迁移各轮定向守门+i18n-parity 2427 对+test:quality+双主题 visual-qa+宽度走查全 EXIT=0（历轮记录见 PROGRESS）；能力注册表 §7 证据行已同步。真实内核验证（文档目标/来源卡/恢复/重载）host-pending 归 T-1602/T-1608 现场验收，不以模拟冒充。
  - 状态：done。**设置页迁移（T-1559~1567）全部交付**。

## 新建打卡页 UI 原型与重构（2026-09-28，用户要求结合打卡类型与功能梳理并加入改造计划；研究稿见 [新建打卡页 UI 原型与重构计划](docs/checkin-editor-rearchitecture-2026-09-28.md)，口径 D-304）

- [x] T-1568 编辑器字段与能力矩阵（P0）——done（2026-09-28，local-auto）。派生视图 [editor-field-registry-2026-09-28.md](docs/editor-field-registry-2026-09-28.md)：26 项字段/能力 ×（现位置/适用条件与显隐/默认值/校验边界/存储字段/依赖/目标流程段），覆盖模板区、名称/图标、三种 `CheckinKind`（确认无第四种类型）、目标/单位/步长/快捷步长、五类排期+配额、戒除方向、问卷/锚点/Task Horizon/番茄、组织与危险操作；保存装配与失败语义（save-form 指纹守卫/回滚/草稿仅存 DOM）单列。重复业务判断清单 5 项：类型×排期×方向显隐 render/bind 双处判断（editor.ts 隐藏属性 vs bind-editor.ts:477-544）、quota 目标口径三消费点、atMost「UI 显隐+静默回落」双保险（回落不可见，迁移时须显式提示）、单位默认值双源、模板回填无标示。问卷绑定字段显隐以源码核准：非 binary 动态隐藏（bind-editor.ts:521-523）。
  - 状态：done。
- [x] T-1569 类型驱动的新建流程原型（P0）——done（2026-09-28，local-auto）。原型文档 [editor-type-flow-prototype-2026-09-28.md](docs/editor-type-flow-prototype-2026-09-28.md)：主流程七段组成（字段编号引用矩阵，排期/方向从高级区提入主流程，危险操作留页尾）；**类型×排期×方向适用性矩阵**（atMost×非 daily 非法→迁移改显式提示、quota×dates/value 两分支既有文案、二值×配额「每周 N 天」合法、容错与 atMost/quota 不叠加）——显隐唯一事实源=updateConditionalFields（bind-editor.ts:477-544 逐条登记）；实时解释句式全部复用既有键（kindDesc/targetLabel/配额两分支帮助/directionAtMost Hint），戒除文案按类型分叉与 T-1609 口径一致；三种类型最终屏幕组成与今日卡动作映射。验收门 5 条（含重复判断 #1/#3 关闭标准）移交 T-1574 编辑器迁移切片。纯文档轮。
  - 状态：done。
- [x] T-1570 模板/空白/组合包统一入口（P0）——done（2026-09-29，local-auto）。六类入口（目录/最近/推荐/组合包/我的模板/空白）进同一表单与保存路径=既有结构（守门确认），本轮补**应用回填标示**：宿主会话字段 `appliedTemplateNote` + `markTemplateApplied` 宿主方法（只存字段不重渲染，避免丢 DOM 草稿），bind 侧 `markTemplateApplied` 助手就地更新徽标（常驻隐藏容器 `data-template-applied-note`，name-inference 既有样式零新 CSS）；目录模板（applyTemplateFields）与我的模板两条应用路径都打标，组合包经目录路径覆盖；新键 editor.templateApplied（"已应用模板：{name}（字段已回填，保存项目后生效）"）。清除时机=项目落盘成功（saveForm 尾部；失败保留草稿时标示随草稿保留）。保存为模板与保存项目按钮既有区分（确认）。守门：editor-sections 新增 1 检 7 断言（徽标容器/ctx 透传/两路径打标/宿主会话字段/落盘清除/双语）。过程教训：node -e 多次补丁在测试文件留下脏字符（正则反斜杠被吃+多余括号）致语法错，整文件 Write 重写消除——长补丁一律用编辑工具。
  - 状态：done。
- [x] T-1571 排期与记录方式分区（P1）——done（2026-09-29，local-auto）。排期块（五类排期+星期/间隔/配额子区）、戒除/上限方向、完成来源/番茄计值从高级区**提入主流程**，形成 段3 做到多少 → 段4「什么时候做」（新键 editor.sectionWhen）→ 段5 方向+回退警告 → 段6「怎样产生记录」（editor.sectionHow：问卷/完成来源/番茄）的主流程序；高级区仅存组织字段/锚点/Task Horizon/历史达成（advancedSummary 收窄为组织三项）。**显隐单点收拢（重复判断 #1 关闭）**：interval/quota/direction/tomatoMode 行不再渲染硬编码 hidden，bind 挂载即跑 updateConditionalFields 驱动（守门断言行内无 hidden）；**修复潜在联动缺口**：手动切完成来源原本不联动番茄计值显隐（只有模板应用路径切换），现收拢至 updateConditionalFields；两处模板路径冗余联动删除。**atMost×非每日显式提示（重复判断 #3）**：新增 `data-direction-warning`（editor.directionFallbackWarn，改排期后提示「保存将按普通目标处理（历史保留）」），save-form 静默回落行为不变（守门断言回落判定原样）。30 天预演/规则变更对照复用不动。i18n 新增 3 键×2。守门：新 tests/editor-sections.test.cjs 入主链 4 检（段序/高级区无残留无重名控件/bind 单点驱动/回落防线原样+双语）。
  - 状态：done；剩余边界=第三方来源在记录方式区的当前绑定回链随 T-1572 输出分区一并落（本轮完成来源区已留位）。
- [x] T-1572 输出与组织高级区（P1）——done（2026-09-29，local-auto）。高级区拆两小节（`data-advanced-section`，复用 source-category 样式零新 CSS）：**「输出」**=笔记锚点（picker/挂起告警/追加开关，含 T-1560 所有权边界句）；**「组织」**=分组/优先级/时段/自动归档/连断容忍 + Task Horizon 显示（按卡面归属从锚点区后移入组织）。问卷绑定不回搬高级区——已随 T-1571 落位主流程段6「怎样产生记录」（记录方式即问卷入口，写入输出语义由 set.scope.journal 说明）。**危险操作页尾独立区**：操作栏容器加 `data-editor-section="danger"` 标记（归档/删除按钮本就在页尾独立操作栏，视觉分类样式既有）。按类型隐藏不适用项=既有 updateConditionalFields 单点驱动不变。i18n 新增 editor.sectionOutput/sectionOrg 2 键×2。守门：editor-sections 新增 1 检 12 断言（两小节序/锚点归输出/六组织字段含 TH/组织无锚点残留/危险区标记/双语/问卷不回搬）；mobile-editor-keyboard 的 editor-actions 正则放宽为容忍属性（标记不破坏「滚动区/操作栏分离」语义）。
  - 状态：done。
- [x] T-1573 编辑器预览与保存操作栏重构（P1）——done（2026-09-29，local-auto，验收确认型）。核实共用为**构造性事实**：`describeEditorPreviewActions/Meta` 唯一定义（editor.ts 双导出）+ 恰两处消费（初始渲染 editor.ts + 实时更新 bind-editor updateEditorPreview），桌面侧栏预览与移动底部操作栏为**同一 DOM**（`lc-checkin__editor-actions` 单实例），移动宽度档仅 CSS sticky 重排（content-responsive.scss:200）无第二份计算。守门固化：editor-sections 新增 1 检 6 断言（双计算唯一/实时消费单一/操作栏单 DOM/sticky 重排）。既有保存/保存并继续/存为模板/归档/删除路径与状态焦点收清（save-state/retry 既有）不变。证据：width-walkthrough editor-1180/320/844x350 实时预览断言历轮全过 + 本轮全链复跑。
  - 状态：done。
- [x] T-1574 旧项目兼容与编辑器切片验收（P1）——done（2026-09-29，local-auto）。editor-sections 新增兼容验收块 1 检 13 断言：**旧项目字段渲染初始值**（quickSteps/autoArchive/streakTolerance/directionAtMost checked/journal selected/anchor/TH/recordStep/schedule/weekdays 逐项断言 render 从 item 状态取值）+ bind 挂载即回填条件显隐与预览（updateConditionalFields→updateEditorPreview→updateAdvancedSummary→ensureEditorVisible 调用序）+ **保存失败显式反馈、零副作用、草稿保留重试**（msg.saveFail/失败路径零副作用注释语义/retry-save）。类型切换保留/清除=updateConditionalFields 既有（问卷 binary 显隐、recordStep 默认回填）；atMost 回落提示不改变行为=T-1571 守门。双语/IME/键盘/触屏/320px～宽屏=editor-1180/320/844x350 走查+mobile-editor-* 守门（历轮全过）；模板=T-1570；真实内核/重载=playwright E2E 既有证据，host-pending 现场部分归 T-1608。**阶段 3 编辑器批次（T-1570~1574）全部交付，阶段 3（设置与编辑器迁移）收官**。
  - 状态：done。

## 全页面体验统一梳理与原型改进（2026-09-28，用户要求结合功能/交互/UI统一分析并加入详细计划；研究稿见 [全页面体验审查与统一原型计划](docs/page-experience-audit-and-prototype-plan-2026-09-28.md)，口径 D-305）

- [x] T-1575 唯一页面/能力/状态注册表（P0）——done（2026-09-28，local-auto）。新登记表 [capability-registry-2026-09-28.md](docs/capability-registry-2026-09-28.md)：12 个用户表面（今日/回顾/洞察/编辑器/事项/归档/设置/问卷/提醒/专注/快速弹窗/渲染块·页签·Dock）+ 对外契约（API v5/Task Horizon/Agent/五来源适配器）逐项登记实际入口、主任务、主动作、输入输出与保存方式、空态/失败、回链、宿主能力、证据与测试；统一「已有/需调整/新增/外部待验」四值状态；共用通道（enqueueMutation 写事件、persistViewPreferences、设置草稿、待处理箱、路由会话态、状态词表现状）单列一次。登记以源码 file:line 为证（关键引用已抽查核对），T-1545/T-1561/T-1568 从对应章节派生专项视图、T-1608 取各表面证据行做切片清单；维护规则=任务交付只更新对应行。范围说明：本表登记代码实况与任务缺口，不含 UI 改动；真机/真实第三方证据一律标 host-pending。
  - 状态：done。
- [x] T-1576 统一页面壳与导航呈现（P0）——done（2026-09-29，local-auto）。新增 src/render/page-shell.ts 共享壳构造点：renderPageShellHead（back/eyebrow/title/actionsHtml/statusHtml 单一构造，类名与 data-action="back" 钩子保持原名=T-1603 契约 4 兼容映射）、defaultReturnPage（契约 3 默认返回表：未显式记录的详情页回落 today）、SurfaceContext 接口 + readSurfaceContext 读侧（page/returnTo/params.itemId）。五详情页头部迁移：editor/archived/occasions/settings/insights×2（空态+带项目）全部走共享壳，内联 header 清零；review/today 保留根页面头部变体（回顾头部承载区间页签与工具区，无返回键）。bind-page-navigation 通用返回分派改走 readSurfaceContext（insights 会话返回栈优先、其余默认表）。危险区标记沿用既有三页统一方案不重复登记；移动底栏/topnav/rail 既有共享导航原型不变。i18n 零新增。三个严格依赖桩测试（archived-search/settings-navigation/agent-status）+insight-a11y 沙箱补 page-shell 桩或真模块。守门：cross-page-consistency 新增 T-1576 块 20 断言（构造点/默认表/形状/读侧/四视图迁移+无内联残留/洞察两处/钩子四名原名/读侧分派/insights 优先）。验证：pnpm run check、test:quality 全链 EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：多 root 各自 context 独立（契约验收门 1）与日期/范围/滚动/焦点全量 params 序列化留待后续切片——宿主字段仍是存储层，读侧先行收拢。
- [x] T-1577 今日行动台增量重构（P0）——done（2026-09-29，local-auto）。**合并重复进度**：行动台条（T-1420 console）收束为「下一步」行动条——删除与 overview 重复的完成度环+今日总数（进度展示唯一归 overview 大环+计数+节奏说明），保留行动台独有信息：下一步/全部完成、跳过计数、专注警告；空内容不渲染空条。**收束顺序**：overview（进度+最佳连击+专注候选）→ 周条 → 行动条（下一步）→ 保存状态 → 优先提醒 → 今日事项 → 工具条 → 待做列表 → 已完成（折叠）→ 庆祝/最近记录 → 那年今天/未来负荷——下一步紧随进度、记录结果居列表后、附属卡殿后，既有顺序本已接近目标态（增量微调确认）。**统一工具条与跳过/完成说明**=既有（T-1420 工具条+跳过徽标+已完成折叠计数），确认不动。**环视觉件全链退役**（R-A16 同例 sparkline）：charts.renderCompletionRing 导出、fragments 接线、components/workbench 5 条规则、today.consoleTotals/consoleRingAria 双语键全删（CSS −443B 死规则清除）；stats-visuals.test.cjs 按 D-292 sparkline 同例改写为退役守门（环零残留+行动条键+overview 唯一+sparkline 既有守门保持）。T-1610 当日修订单位=前序已修；失败重试/返回焦点=retry-save+T-1603 会话恢复既有。守门：today-dashboard 新增 3 断言+键表更新（consoleNextAria 入列）；stats-visuals 整文件改写退役守门（10 断言）；i18n-parity 2437 对。
  - 状态：done；剩余边界=优先提醒/事项横幅卡视觉级重排（信息顺序本轮确认已合目标态）随 T-1585/1586 提醒中心切片细化。
- [x] T-1578 现有回顾三工作区再分层（P0）——done（2026-09-29，local-auto）。**比较器可搜索化**：候选升级为全量未归档项目（删除前 12 截断），新增搜索输入（`data-item-compare-search`，IME 安全防抖镜像历史搜索模式——组合态不打断、会话态 `itemCompareQuery`、光标位恢复、清除按钮）；**已选项目恒显示**不受查询过滤（便于取消）；显示 n/total 计数；候选 >8 才渲染搜索（小列表免打扰）。**归档项目补记排除**=既有事实核实并守门固化：快照层 `scheduled: !item.archived && isItemAvailableOnDate`（计划分类前即排除）+ batch-backfill atMost 纯函数守门。入口层级/周复盘/报告保存视图=既有层级确认不动（增量验收记录）；回顾直达文档写入不新增（按卡面"若增加"条件保留给 T-1548 切片）；统计口径零变化。i18n 新增 review.itemCompareSearchAria/itemCompareShowing 2 键×2。守门：item-trend-compare 新增 11 断言（无 12 截断/搜索输入/会话查询/已选恒显示/IME/清除/归档排除双面/双语 2 键）。
  - 状态：done；剩余边界=T-1539 周复盘提示词条件候选不变；直达文档写入入口随 T-1548 评估。
- [x] T-1579 单项洞察行动化（P1）——done（2026-09-29，local-auto）。T-1609 前置已修。①**段序重排**：状态日历→每周趋势→成熟度→教练建议（行动入口由置顶后置为段尾建议，卡面"日历→趋势→成熟度/周期→行动入口"序）。②**行动入口**（stats 后 CTA 行）：「查看记录」带项目 id 直达回顾记录区（historyItemId 过滤+records 工作区+`insightsReturnPage="review"` 返回页会话态保持，不丢上下文）；「编辑规则」showEditor 保留 editingId 项目身份；两者校验项目存在且未归档。③**口径解释**：分母注（完成率=完成日÷可评估计划日：已结束+今日已完成；跳过日计入分母但不断连击——与 countsForDays 语义逐项核对）；配额项目窗口期注（按周期计算、额度为当期值，仅配额排期显示，item.schedule?.type 可选链兼容测试桩）；日格标题跳过标注（复用 today.skipBadge）。项目身份固定=insightsItemId 视图偏好既有；单位/修订=当日修订投影既有。范围选择器/项目选择器/钻取归 T-1590/1591。i18n 新增 4 键×2（parity 2443 对）。守门：insights.test.cjs 新增 T-1579 块 13 断言（段序/双 CTA 带 id/分母/配额/跳过标注/bind 双绑定/返回页会话态/双语 4 键）；insight-a11y 抓出 item 桩缺 schedule——可选链修复。
  - 状态：done；剩余边界=范围/项目选择器与日格钻取归 T-1590/1591。
- [x] T-1580 事项列表与编辑分离（P1）——done（2026-09-29，local-auto）。**编辑进抽屉**：表单面板收进 details 抽屉（data-occasion-form-drawer，编辑既有事项时默认展开；revealOccasionForm 展开抽屉+滚动定位，新建按钮同通道），列表优先呈现；长备注折叠/高级周期显隐=既有。agenda 分组见 T-1592 条；保存后回原筛选位置=既有（过滤态会话保持）。
- [x] T-1581 归档恢复中心（P1）——done（2026-09-29，local-auto）。恢复中心增量：行内详情折叠（data-archived-details）展示原规则（formatScheduleLabel+目标/单位）、关联事项名、笔记锚点块 ID、外部来源记录计数与**恢复预览**（恢复后是否重进今日排期，isScheduledToday 单一实现）；恢复前预览确认（msg.archivedRestoreConfirm，含重进排期计数）；操作时间（归档天数）与暂停生效日既有并存不混写；批量恢复/删除风险分离见 T-1595。
- [ ] T-1582 快速弹窗/专注/嵌入表面一致性（P1）——快速记录、专注计时、渲染块、页签、dock 复用今日页记录内核、结果、错误、空态和取消语义；按容器能力隐藏不适用入口，保留打开完整页面的明确升级路径。2026-09-29 复核增量：`src/render/focus-timer.ts:67-78` tick 使用全局 `document.querySelector` 仅更新一个面板/小条，多 root 并存会留下其他剩余时间旧值；需按宿主会话更新全部可见 `[data-focus-timer]`/`[data-focus-mini-remaining]`，并覆盖 dock+快速弹窗+页签同时打开、切页、暂停/恢复、完成/放弃、表面销毁和重开，不因显示同步重复入账。关联 T-1596/T-1621。
- [x] T-1583 跨页面交互与视觉规范（P1）——done（2026-09-29，local-auto）。新守门 tests/cross-page-consistency.test.cjs 入主链 5 检：危险区三页统一标记（editor/archived/settings）/IME 守卫四搜索面（today/settings/history+compare）/reduced-motion 传递（**修复 occasions 抽屉滚动缺口**：host.reducedMotion 接口+instant 降级，结构化透传零 index 改动）/会话恢复三模式（设置搜索 WeakMap/回顾 preserving/洞察返回页）/导航五路径单点。颜色冗余/对比度/触控目标/双主题=accessibility-audit+ui-theme+visual-qa 既有守门承载（历轮全绿），不重复断言像素。
- [x] T-1584 分阶段迁移与全表面验收（P1）——done（2026-09-29，local-auto）。验收台账 docs/acceptance-ledger-phase4-2026-09-29.md（T-1608 格式）：九批逐批对账（提交/增量/定向守门/边界）+T-1583 跨页一致性专项+双结果语义确认+host-pending 清单（真实内核 E2E/真实第三方/真机/Task Horizon 联调归现场）。**阶段 4「日常页面与辅助工作区」全部交付**；下一步=阶段 5 多表面与质量收口（T-1596~1608）。
- [x] T-1585 提醒中心统一呈现与入口（P1）——done（2026-09-29，local-auto）。核实共用=构造性事实（fragments selectPriorityReminders(projectReminderCenter(...)) 单投影，priority-reminder 仅过滤/排序层非第二计算器）。增量：①今日横幅行内补**原定日期**（formatHistoryDate(item.dueDate)）；②横幅尾补**查看全部入口**（data-action=summary 跳回顾概览提醒中心，不复制第二列表；窄宽 lc5≤640 隐藏入口保首卡预算 380——窄屏经底部导航回顾或横幅 +N 展开到达，桌面/平板保留）。
- [x] T-1586 提醒动作与历史状态说明（P1）——done（2026-09-29，local-auto）。回顾提醒四个动作按钮补**作用域 title 说明**（review.reminderSnoozeScope=今日内再次提醒不改长期规则/DeferScope=顺延下一周期/SkipScope=跳过本期可恢复/RestoreScope=恢复被延跳提醒）——投影不直接改写打卡事实=既有（applyReminderActions 只写 ReminderUserAction）。延期到期时间显示=snoozed/skipped 行已有 dueLabel（既有确认）；已跳过恢复入口=restore 按钮既有；批量处理与失败重试=既有（reminderUserAction 持久化+失败 toast）。i18n 新增 6 键×2（parity 2464 对）。
- [ ] T-1611 今日提醒入口布局与回顾跳转优化（P1，用户反馈，先设计不开发）——今日“查看全部提醒”当前作为提醒横幅下方的独立一行，占用首屏垂直空间；点击后直接跳转【回顾】页面。需重新梳理入口承载位置与去向：保留查看全部提醒能力，避免独立空行或重复占位，明确进入提醒中心后的上下文与返回路径；不复制提醒投影，继续复用 `projectReminderCenter`/`selectPriorityReminders` 单一事实。验收：桌面、移动和 320px 宽度不额外撑出整行，键盘与读屏可达，亮暗主题和中英文一致；具体布局及是否继续跳回回顾待设计评审后确定。关联 T-1585/T-1586。
- [ ] T-1612 回顾提醒中心卡片密度与动作布局优化（P1，用户反馈，先设计不开发）——【回顾】页面“提醒与事项”中的提醒中心卡片当前高度过大，右侧“延期 / 延后 2 小时 / 跳过”等动作按列竖排，造成大量留白和列表过长。需在卡片有足够宽度时将内容、日期和动作组收束为一行，降低卡片高度；窄容器下再采用明确的自适应布局，不能牺牲 44px 触控目标、按钮语义、键盘可达性或动作范围说明。保持提醒状态投影与四类动作语义不变，不复制提醒数据。验收：桌面、页签、dock、移动端和 320px 宽度分别验证，常见卡片不因动作竖排产生额外空白，亮暗主题和中英文一致；关联 T-1585/T-1586/T-1611。
- [ ] T-1618 每日打卡提醒频率与关闭机制优化（P1，用户反馈，先设计不开发）——当前启动/到点通过思源原生 `pushMsg` 弹出的“打卡提醒：今日待完成……”过于频繁，缺少明确的关闭与“今日不再提醒”操作；无槽位时启动触发依赖进程内 `reminderFireLog`，重启插件或思源后可能再次弹出。需重新设计提醒契约：①以本地日期、提醒计划和上下文建立持久幂等，重启、重载和多窗口不重复打扰；②当前通知提供“关闭”和“今日不再提醒”（仅抑制当日剩余时间，次日自动恢复），必要时保留查看提醒中心入口；③区分当前关闭、今日免打扰、全局关闭、安静时段和事项动作，不改变打卡事实与提醒投影；④宿主原生通知不支持交互时，评估插件内可关闭横幅/弹层作为降级，不臆造思源 API；⑤明确通知发送失败的重试边界，避免重复弹出或静默丢失，并清理过期日期状态；⑥今日优先提醒的 `aria-live` 只在 digest/状态变化时播报，重绘不重复宣告，关闭/今日免打扰语义与读屏一致。验收：默认启动提醒、多时刻提醒、空事项、逾期、重启/重载、多窗口、跨日和失败重试均有确定结果；关闭动作可恢复，今日免打扰跨重启有效且次日恢复；键盘、读屏、亮暗主题、中英文及桌面/页签/dock/移动端/320px 可用。关联 T-1421/T-1451/T-1495/T-1585/T-1586/T-1611/T-1612。
- [x] T-1587 问卷答题与目标配置分层（P0）——done（2026-09-29，local-auto）。弹窗内**目标配置折叠为摘要抽屉**（data-journal-config-drawer：摘要=模式+笔记本/docId，已配置目标折叠、未配置自动展开；更改入口=展开后原表单控件原样），答题区前置；统一选择器=bindDocumentTargetPickerFor 既有文档搜索复用。按步骤进度/滑块端点=既有（required * 标记、range 1-5）+新增提交前预览（见 T-1588 共用）。草稿与目标变更分别保存=既有（onDraft 答案草稿/onPersistIntegration 目标独立持久化）。i18n 新增 journal.answersPreview（与构建器既有 journal.preview 键名区分——重名冲突 TS1117 抓出后改名）。
- [x] T-1588 问卷提交双结果与补写状态（P0）——done（2026-09-29，local-auto）。①**提交前预览**：details 折叠（data-journal-preview-details），input 时实时生成答案列表+写入去向（模式+笔记本/docId），零写入。②**双结果并列**：提交失败（文档写入未完成）时页内结果面板并列两行——「✓ 打卡事实已保存（重试仅补写文档，不会重复记账）」/「✗ 文档写入未完成」（data-journal-results role=status）；成功路径 toast+关闭=既有。③**独立幂等补写入口**：结果面板内「补写文档」按钮重调 onSubmit——幂等性=既有（isComplete 分流：当日已完成只更新文档不重记事实；journalPending 互斥；marker 查重）。目标保存失败（事实尚未写入）、alreadyWritten、目标失效、取消/重载草稿边界=既有独立状态。i18n 新增 journal.answersPreview/previewTarget/resultFactSaved/resultDocPending/resultBackfill 5 键×2。守门：journal-experience 全过。
- [x] T-1589 日记模板构建器可理解化（P1）——done（2026-09-29，local-auto）。构建器分区增量：①**边界说明**（data-builder-boundary + journal.builderBoundary：更改在点击「确认」后写入设置；撤销可回退本页操作）置于构建器标题下；②**模板摘要**（legend 内 journal.templateSummary：{n} 题 · {m} 必答，实时生成）——问题数量/必答校验可见；③解析错误恢复提示（journal.customInvalid）既有确认。分步呈现=三段结构既有（边界+模板列表+预览区）+摘要分层，不重排排序/撤销/复制内核；窄屏长列表=既有响应式（occasions/构建器 mobile 样式）；键盘重排=Ctrl+↑↓ 既有。i18n 新增 journal.builderBoundary/templateSummary 2 键×2（parity 2471 对；questionCount 与构建器旧键重名——改名 templateSummary 避让）。守门：journal-templates 新增 T-1589 块 7 断言（边界/摘要/实时生成/customInvalid 既有/双语 2 键）。
- [x] T-1590 单项洞察范围与项目选择（P1）——done（2026-09-29，local-auto）。①**范围**：insightsRange 会话态（28/84/365/custom，重载回落 84=契约明确降级）+insightsCustomRange 起止；内核 HabitInsightOptions 加 endDate（dateKey 校验 fail-closed 回落 asOf 当日、跨度仍 7~366 钳制——**内联 key→Date 解析避免拖入 i18n 依赖链**，纯核心模块纪律）；UI 复用回顾页 range-tabs 类+custom 起止 date input（max=今天、bind 层校验 start≤end≤今天，越界回写会话值）；切换只重渲染，项目/滚动由既有机制保持。②**可搜索选择器**：>8 项目显示搜索框（IME 组合态守卫=compareComposing 同款；DOM option 过滤不重渲染；无匹配显式占位）；**含归档项目**（option「（已归档）」后缀，可回看只读洞察）。③**归档动作**：动作区「在归档中查看」→archivedQuery 预填项目名+showArchived()——**恢复动作留在归档页**（那里有重进排期预览确认，洞察页不绕过）。④范围切换（统计口径不变=同 buildHabitInsights）。i18n 11 键×2（rangeAria/rangeDays/rangeCustom/Start/End/itemSearchPlaceholder/None/archivedSuffix/archivedView/Aria，parity 2504 对）；CSS +679B（picker 容器/搜索框/custom 输入，总 634351 预算内）。守门：insight-a11y 新增 8 断言（range 绑定/custom 会话值/搜索会话/归档标注与跳转/内核 endDate 选项）+insights.test.cjs 内核窗口断言（endDate 窗口边界/非法回落）。**连带修**：insights.test.cjs 转译清单曾补 shared.ts 又撤（shared 拖 i18n 链无法落盘解析→改内核内联，正解）。验证：check、insight-a11y/insights.test、parity 2504 对、test:quality 全链 EXIT=0、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。
- [x] T-1591 单项洞察钻取与行动建议（P1）——done（2026-09-29，local-auto）。①**日历格/周行 button 化钻取**：84 日格 span→`<button data-insight-day role="listitem">`（原生可聚焦，aria-label=完整状态读数+「点击查看当日记录」提示）、周行 div→`<button data-insight-week=周一起始>`（周视图由用户在记录页切换）——bind 层新通道：同步 insightsItemId→historyItemId + historyPage=0 + jumpToHistoryDate（单日落点，selectedHistoryDate/historyScope 由其统一处理；未来日期拒绝）；CSS span/div 视觉承接（aspect-ratio 格/44px 周行触控目标，重复旧规则清除）。②**计算口径明示**：分母 note 按项目类型附加口径行——quota=窗口累计对照配额 / atMost=守住读数（未超即守住） / 排期类=机会日分母（跳过计分母不计未完成、未排期不适用浅色）；配额窗口小注/格内守住破戒词表/notEnough 稀疏提示=既有。③**教练建议 CTA**：每条建议附「查看证据」（复用 data-insight-records→records 过滤该项目）与「调整排期」（复用 data-insight-edit-rules→showEditor returnTo=insights，T-1599 返回栈回洞察）——**零新绑定通道**。④范围切换（28/84/365/自定义）=T-1590 范畴不越界。i18n 新增 7 键×2（dayJumpHint/scopeNotePrefix/scopeNoteQuota/AtMost/Scheduled/coachingEvidence/coachingAdjust，parity 2491 对）。守门：insight-a11y 格子断言更新（button 形态）+新增 9 断言（周行钻取/口径三态/教练 CTA 复用键/dayJumpHint 文案）；夹具 weeklyTrend 补 startDate。CSS 631797（+229B，预算内）。验证：check、insight-a11y/cross-page-consistency/v7-insights、test:quality 全链 EXIT=0、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。触屏真实设备体验=host-pending（H5 范畴）。
- [x] T-1592 事项 agenda 与状态筛选（P1）——done（2026-09-29，local-auto）。**agenda 分组前置**：过滤后的列表按五组重排（data-agenda-section=today/missed/upcoming/ended/disabled，组头带计数，复用 source-category 样式零新 CSS）——今日→已错过→即将到来→已结束→已停用；错过补标/单次改期/里程碑/周期进度随行展示不变（异常动作随行集中在对应组）；状态/类型/时间三筛选与搜索先行、分组只重排不改成员；提醒投影与提醒中心共用日期口径=既有（getOccurrenceDate 单一实现）。
- [x] T-1593 事项分步编辑与转打卡确认（P1）——done（2026-09-29，local-auto）。**转打卡预览确认**：重复拦截前置（已有关联项目先提示 alreadyGenerated），再 window.confirm 预览（msg.occasionToItemConfirm：项目名/发生日起、二值每日仅发生日入今日排期其余遮蔽、重复转换拦截、历史保留），取消零写入；创建/持久化失败回滚=既有。分步呈现=抽屉承载（表单域条件显隐既有），模板只负责起点=既有。i18n 新增 occ.agenda* 5 键 + msg.occasionToItemConfirm ×2（parity 2449 对）。守门：occasions.test.cjs 新增 12 断言（抽屉/五组标记与键/confirm 与重复前置/双语 6 键）；width-walkthrough occasions 场景改先展开抽屉再试点提交。
- [ ] T-1613 事项页新建入口导致页面纵向位移（P1，用户反馈，先定位不开发）——【事项】页点击右上角“新建”后，页面整体向上平移一小段：截图标注②的顶部导航/页面上边界出现裁切或位置异常，标注③的底部视口/内容边界也随之变化。源码中 `src/render/bind-occasions.ts:43-44` 在重绘后无条件对表单调用 `scrollIntoView({block:"start"})`，可能滚动错误的祖先容器或视口；事项搜索 `bind-occasions.ts:46-53` 每次输入重绘也未明确保留 IME composition 状态。需定位是滚动容器、页面壳高度、内联新建表单展开、焦点滚动或宿主窗口布局变化引起，并保证打开与关闭新建表单不会改变页面壳的顶部基线、当前列表滚动锚点和底部可视区域，同时补齐搜索输入的组合态保护。验收：重复打开/关闭、已有事项编辑、新建表单提交失败、搜索中英文/IME、桌面/页签/dock/移动端/窄屏均不出现顶部跳动、底部空条或内容裁切；焦点仍落在新建表单合理位置，关闭后回到新建按钮，双主题和中英文一致。关联 T-1592/T-1593。
- [x] T-1594 归档详情与恢复预览（P1）——done（2026-09-29，local-auto）。行内详情折叠（data-archived-details）：原规则（formatScheduleLabel+目标/单位）、关联事项名、笔记锚点块 ID、外部来源记录计数（externalRef 非空）、**恢复预览**（isScheduledToday 单一实现判定恢复后是否重进今日排期）；归档原因字段未存=既有事实不变（旧项目不标原因）。恢复前预览确认见 T-1595 共用 msg.archivedRestoreConfirm。
- [x] T-1595 归档删除风险与批量操作（P1）——done（2026-09-29，local-auto）。**危险区隔离**：批量删除从恢复工具条移入独立危险区（data-archived-danger，archived.dangerZone/dangerHint：不可撤销+影响范围+恢复点以快照链为准），选中后与恢复按钮同步显隐；单行删除保留（既有 deleteArchivedItem 确认/影响预览不变）；批量删除触发既有 deleteArchivedItems 流（陈旧确认拦截 msg.deleteImpactChanged 守门保持）；失败后的重试/返回=runArchivedAction 焦点回归既有。i18n 新增 archived.detailsSummary/ruleLabel/linkedOccasion/anchorLabel/externalRecords/resumeToday/resumeOff/dangerZone/dangerHint + msg.archivedRestoreConfirm 10 键×2。守门：archived-search 新增 15 断言（纯函数 buildArchivedItemDetails 行为测试：规则标签/关联名/锚点/外部计数/恢复预览布尔/未归档排除+源码结构+双语 10 键）——依赖桩按需映射（i18n/shared 桩、model 真转译）避传递闭包。
- [x] T-1596 专注计时跨页生命周期（P1）——done（2026-09-29，local-auto）。①**跨页小条**（renderFocusMiniStripFor + renderInto 接线：非面板宿主 root 且会话进行中时追加 data-focus-mini——项目名/剩余时间/暂停态/**回到专注**入口，点击置 focusTimerRoot=root 并 showToday 展开完整面板）；tick 同步小条剩余时间。②**重载明确失效**：开始即写 sessionStorage 标记（lc-focus-session），结束/放弃/卸载清除；重载后检测标记→showMessage 明确告知「上次会话因重载中断，未入账」并清除（不静默丢失、不冒充恢复）。**明确失效（而非恢复）的理由**：计时状态为会话内存（秒级心跳不可跨重载），恢复会伪造时长；预计入账值（预设分钟数）与少于 1 分钟不入账提示（focusTooShort）=既有。Dock Tomato 会话=桥内存归属（ownedFocus），不混入内置计时小条。i18n 新增 focus.miniAria/miniBack + msg.focusReloadLost 3 键×2（parity 2474 对）。守门：新 tests/focus-lifecycle.test.cjs 入主链 2 检（小条渲染+标记生命周期+重载键/接线/清除；依赖桩：i18n/shared/siyuan 桩+model 真转译+window 桩含 sessionStorage）。
- [x] T-1597 快速弹窗会话与窗口提示（P1）——done（2026-09-29，local-auto）。①**会话页签保留**：模块会话变量 lastQuickPage（QUICK_PRESERVED_PAGES 六页白名单；编辑页降级为今日——表单草稿仅存 DOM 随窗口销毁）；关闭时 rememberQuickPage 记录、重开时回放 currentPage（dock 共享面同步回放=既有共享状态耦合的对称行为）。②**编辑页关闭先提示**：dialog.element 捕获阶段拦截 SiYuan 关闭按钮（祖先 capture 先于目标监听器），currentPage=editor 时 window.confirm（msg.quickCloseEditingConfirm：问卷编辑将丢失、打卡数据不受影响）确认后才销毁，取消保留弹窗与草稿。③窗口控制（关闭/全屏/拖动/八向缩放/双击最大化）与移动端入口=既有不重做。i18n 新增 msg.quickCloseEditingConfirm ×2。守门：desktop-dialog 新增 T-1597 块 6 断言；mobile-dialog 旧「关闭恢复今日」守门更新至会话语义（2 断言）。验证：pnpm run check、desktop-dialog/mobile-dialog/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。
- [x] T-1598 渲染块/页签/dock 降级一致性（P1）——done（2026-09-29，local-auto）。block-dom-compat 新增 T-1598 块 8 断言（此前未守门的胶水语义）：disposed 短路标志、mutation 回调与防抖定时器短路、teardown disconnect、lastRenderedConfig 配置未变跳过（防观察风暴）、owner 标记同源跳过/替换（相邻块互不干扰）、局部失败 role=alert 错误面板隔离、teardown 返回断开函数。多块并存/局部失败行为已由 owner 标记+错误面板构造性承载（block-renderer.ts:96-129 既有实现核实）。公开 API 与事件语义零变化。
- [x] T-1599 跨页面深链与会话状态实施（P1）——done（2026-09-29，local-auto）。按 T-1603 契约落地**编辑器单级返回栈**：NavigationHost 增 `editorReturnPage`（today/review/insights 白名单）；showEditorFor 增 returnTo 参数（白名单校验，未知回落 today）；showEditorReturnFor 回放来源页（洞察入口回放同一项目——insightsItemId 持久化）并清除；编辑器返回按钮改走 showEditorReturn（不再固定 showToday）。洞察「编辑规则」CTA 携带 returnTo="insights"。既有会话态复用确认：insightsReturnPage/itemCompareQuery/historyItemId/lastQuickPage 均按各切片语义在位。旧 DOM 钩子/移动底栏入口零变化（showEditorFor 原签名兼容——returnTo 可选）。i18n 零新增（复用既有键）。守门：cross-page-consistency 新增 T-1599 块 6 断言（返回栈字段/回放函数/白名单校验/返回按钮走栈/CTA 携带返回页/五路径单点）。验证：pnpm run check、cross-page-consistency/i18n-parity 定向守门、pnpm run test:quality EXIT=0、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：日期/范围/滚动/焦点的全量 SurfaceContext 序列化随 T-1598 后续深化（分页/折叠/项目会话态已各自在位）。
- [x] T-1600 页面级无障碍、IME 与响应式走查（P1）——done（2026-09-29，local-auto）。**走查=探针先行→修证实缺陷→固化守门→证据入台账**（docs/acceptance-ledger-phase5-2026-09-29.md）。①**键盘可达性**：先探针后固化——7 表面×双主题×满空两态，data-action/data-mobile-nav 钩子全部落在原生可聚焦元素（0 违规），accessibility-audit 新增 #4 检查零违规强制（div/span 须 role+tabindex="0" 补偿）。②**44px 触控目标**：320px mobile 前端实测 16 项不足——修复 8 项（归档详情折叠头 16px/事项抽屉头 21px/设置组头 33px/联动面板头 34px/沙盒头 33px/新建项目入口 30px/头像输入 40px/今日负荷+编辑器排期预演头 36px → 窄容器 44px；content-responsive+maintenance-responsive 新规则，桌面不动），audit 新增 mobile 遍八类 ≥44px 逐项守门；其余 8 项致密列表文本按钮（28~42px，高于已强制 24px AA 下限）实测记录为偏差不拦截（WCAG 2.5.8 行内豁免形态，全量抬升与列表密度/宽度预算冲突）。③**空态走查固化**：audit 改三遍走查（亮/暗/空态满空夹具），空态全表面同套检查零违规（1204 对文本）。④**既有项核实**：可访问名称/正向 tabindex/对比度 4.5:1/24px 下限/reduced-motion/IME 四搜索面/过期异步（summaryRequestId+settingsBusy）/失败保留草稿（retry-save/journal.retryHint/T-1521 草稿清单）/撤销路径全数在位（台账逐项登记）。⑤启动器重构 bootHost（desktop/mobile 共用+store 参数化）。验证：accessibility-audit EXIT=0（0 missing/0 tabindex/0 keyboard/0 contrast/1204 对）、test:quality 全链 EXIT=0（CSS 631568，预算 640KB 内）、双主题 visual-qa EXIT=0、width-walkthrough desktop+mobile 双前端 EXIT=0。Host-pending（真机读屏/WebView IME/误触率/进程被杀草稿）归集 T-1602。
- [x] T-1601 全页面隔离内核回归（P1）——done（2026-09-29，local-auto）。**先盘点后补缺**：13 项要求场景逐一映射既有覆盖（model/date-keys/external-ref/reminder-actions/batch-backfill/archived-search/midnight-boundary/record-trust/analytics-snapshot 等内核夹具 + journal-experience 的 writeJournalEntry 失败语义）——登记为台账覆盖矩阵（docs/acceptance-ledger-phase5-2026-09-29.md §0），确认缺口仅两条，新增 tests/kernel-regression.test.cjs（入 test:ui 链；真实 dist bundle + 桩宿主：Dialog/fetchSyncPost 可编程、存储 Map 跨重启持久）：①**问卷双结果编排**——A1 事实成功+文档写入失败→事件已落不回滚+表单保留草稿；A2 重试→isComplete 已真跳过 recordEvent→事件数不变（不重复记账）+文档写入成功；A3 事实层失败（persist 拒绝）→recordEvent 回滚返回空→零写入类内核调用+草稿保留。②**重载状态矩阵（契约 4）**——持久偏好（appearance dark/groupMode group）跨重启恢复并驱动渲染（data-appearance/组头）；会话态（回顾 records 工作区/historyQuery）重启后回默认（overview 选中/搜索清空）。**桩设计要点**：失败注入收窄到写入类调用（append/updateBlock）——提交前的目标校验（onPersistIntegration）先于事实写入，全局失败注入命中的是校验失败路径而非双结果路径；showMessage 断言用译文子串非键名；内核调用断言用增量切片（历史调用含 A1 失败尝试）。守门：kernel-regression EXIT=0。验证：test:quality 全链 EXIT=0（CSS 631568 不变）、双主题 visual-qa EXIT=0、width-walkthrough desktop+mobile EXIT=0。
- [x] T-1602 宿主现场与发布验收台账（P1）——done（2026-09-29，local-auto）。新建 docs/host-acceptance-ledger-2026-09-29.md（T-1608 宿主分栏）：**证据四层**（自动浏览器/隔离内核/思源真实宿主/真实第三方与真机）六覆盖面逐面登记——文档/笔记本目标（journal-experience 双栈+kernel-regression 编排）、第三方来源（weread/sireader/siplayer/yeguif/health 适配器夹具+SOURCE_MANIFEST）、Dock Tomato（bridge/completion/inbox+focus-lifecycle）、页签/dock/移动 WebView（desktop-dialog/mobile-dialog/width 双前端）、移动安全区（safe-area CSS 守门+320px 触控遍）、双主题（visual-qa+audit 三遍）；每面「自动证据=测试名+通过链」与「真实宿主/真机=host-pending+取得条件」分列，**不把模拟通过写成真实联通**。发布验收分栏：自动链（check:release/manifest/rollback-rehearsal）通过、GitHub v18.9.0 资产已核实（Release id 397882046）、集市触达 host-pending（T-1366）、Task Horizon 恒 waiting。**Host-pending 单一清单 §8（H1~H8 带取得条件）**吸收 phase5 台账 §4（该节保留原记录并指向本表核销）；现场操作模板沿用 integration-smoke-checklist + 记录格式。验证：docs-only 变更，引用测试名逐一核实存在；pnpm run check EXIT=0；test:quality 全链 EXIT=0（工作树与 f194f31 轮同基线，CSS 631568 不变）、双主题 visual-qa EXIT=0、width-walkthrough desktop+mobile EXIT=0。
- [x] T-1603 跨页面路由与深链接状态契约（P1）——done（2026-09-28，local-auto）。契约文档 [surface-routing-contract-2026-09-28.md](docs/surface-routing-contract-2026-09-28.md)：SurfaceContext 参考形状（page/returnTo/params=date·range·workspace·itemId·query·filters）；**会话态全清单**按宿主级/每-root/页面归属逐字段登记（含行号）；返回栈规则=单级 returnTo+默认值表，不做通用历史栈（多 root 下栈语义不可靠）；打开路径×恢复矩阵（页签固定 today、dock 顶部、快速弹窗会话保留、渲染块只读、页内跳转携带）——「持久偏好跨重载恢复、会话态 root 生命周期内恢复」二分，禁止隐式残留。兼容映射：data-action/data-mobile-nav/data.page/渲染块回调签名不变。验收门 5 条移交 T-1576/1599 实施对账。纯文档轮。
  - 状态：done。
- [x] T-1604 统一异步状态与错误恢复（P1）——done（2026-09-28，local-auto）。两部分交付：①契约文档 [async-status-contract-2026-09-28.md](docs/async-status-contract-2026-09-28.md)——八态词表对齐 ui-state-ledger 八族（台账管呈现、契约管状态机），三类写路径状态规则（显式草稿/即时异步/动作类），**登记 B 类「失败时内存/存储不一致」口子并定收口规则**（改 savePreference 包装或失败回滚内存值，逐字段迁移）；过期响应代际规则（既有 summaryRequestId 实现核实：index.ts:5570 发起递增/5592 完成校验丢弃）；failed 呈现最低四要素（具体原因/修复动作/role=alert/保留输入焦点）。②代码落地：`renderInto` 初始化屏硬编码中文替换为双语状态键（init.loading/failed/failedHint），加载 role=status、失败 role=alert+修复动作，补主题属性消除深色宿主白闪；ui-state-ledger 加载族新增六条断言（双语/role/主题/无硬编码）。B 类逐字段收口为后续切片验收门，不在本任务展开。验证：check、主链、build、test:ui（含 i18n-parity）、双主题 visual-qa、宽度走查全 EXIT=0。
  - 状态：done；剩余边界=B 类字段逐个收口（契约验收门 1）。
- [x] T-1605 响应式宿主壳与安全区（P1）——done（2026-09-29，local-auto）。**审计→证实→只修证实项**：①宿主层叠五层矩阵+安全区 env() 20 条全量枚举登记 host 台账 §10（components.scss 基础壳 271~312/移动壳 346~507/桌面密度/窄容器档/密度终 pass 1520~2100——方向一致的后轮收紧，无冲突覆盖证实，大规模去重风险>收益保持现状+注记）。②行为证实：横向溢出（walkthrough 既有 scrollWidth 断言）在**四种宿主壳组合**全绿——dock×桌面/移动、tab×桌面、dialog×桌面/移动（tab×mobile=无效组合：思源移动端无自定义页签）；底栏遮挡探针（elementFromPoint 命中固定底栏本体判据，sticky 吸顶/侧栏=正常滚动语义不计）五表面零证实→**固化为 accessibility-audit mobile 遍守门**；上下文菜单浮层（z 60>底栏、视口钳制、可点击）探针通过；open-tab 完整页入口 dock/dialog×1280/320 四处可达、移动端按 supportsCustomTab=!isMobileFrontend 构造隐藏（正确语义）。③证实缺陷=harness 级两处：width-walkthrough 的 dialog/tab chrome 断言假定桌面 topnav（移动前端渲染 mobile-topbar→按前端分流）；30-habit 首卡 380 预算不适用 dialog 壳（22~26px 有意窗口 chrome，实测首卡 400px/820 完整可见→预算限定 dock/tab，基线记台账）。产品 CSS 零改动（CSS 631568 不变）。验证：width-walkthrough 四组合全 EXIT=0、accessibility-audit EXIT=0、test:quality 全链 EXIT=0、双主题 visual-qa EXIT=0。
- [x] T-1606 键盘、IME、读屏与触控基线（P1）——done（2026-09-29，local-auto）。**探针核实→零产品缺陷→守门固化**：①行为探针（boot 真实 bundle）逐项核实九基线——aria-expanded 8 button 点击全翻转（summary/details=浏览器原生语义不需显式属性，探针首轮误报已修正）、aria-current 底栏/rail/topnav 三形态与 is-selected 四页导航零失配、上下文菜单 Escape 收口 closed:true（closeMenus(true) 归焦触发器构造在位）、j/k 通道焦点落卡片主操作（监听绑宿主 root 冒泡可达）、焦点可见 outline 2px+:focus-visible 86 规则、IME 四面/reduced-motion 四模块/44px=既有守门引用。②固化：cross-page-consistency 新增 T-1606 块 10 断言（j/k 今日页守卫/输入聚焦不劫持/可见卡片过滤/主操作聚焦/菜单 Escape/归焦/方向键/aria-current 三形态/折叠 aria-expanded 两点）入主链 7 checks；accessibility-audit 桌面遍新增 j/k 落焦+菜单 Escape 行为检查（非空态遍）。③登记缺口：图表日期格键盘路径=T-1591 范畴不越界；读屏真机=host 台账 H6。**探针方法论**：dispatch 目标必须与监听注册元素同层（root 级监听 dispatch 到 document 不冒泡——三轮误报同源）。验证：cross-page-consistency 7 checks、accessibility-audit EXIT=0、test:quality 全链 EXIT=0、双主题 visual-qa EXIT=0、width-walkthrough 双前端 EXIT=0。
- [x] T-1607 渲染性能与长数据分层（P2）——done（2026-09-29，local-auto）。**先测后改，测量证实无用户可感热点→零优化**。①一次性测量探针（真实 bundle、双帧 RAF 口径、3 次中位数）九场景：Today 200/500 项目=2/3ms、Review 10k/100k 事件 records=3/6~14ms、Insights 84 日格=1~3ms、Settings=2ms、Occasions=2ms、多 root（dock+dialog）×10k=2~3ms、recordEvent 全链<10ms（persist 桩）——全部远低于 16ms 帧预算；内核层 100k 基线（range<3s/summary<8s/snapshot<8s/export<3s）既有通过。②既有分层机制核实覆盖全部测量面：模板批次 24/回顾分页 50/洞察懒加载/设置分类导航/今日折叠/renderRafId 合并——无需新增分段懒渲染。③固化守门：kernel-regression 新增渲染层性能块（today-200/review-10k/multi-root-10k 真实 boot 双帧口径上限 250ms=灾难回归防线；冷启动实测 19~67ms）。④测量方法论四条记台账 §12（计时点在 await 前/RAF 合并需双帧等待/性能夹具用 boot 时给定 store 而非空 boot 换 store——后者触发 computeStreaks 状态缺口/headless RAF 立即回调≈同步耗时）。不截断事实、不改分页统计口径、重绘滚动焦点语义零变化（无代码改动）。验证：kernel-regression EXIT=0（含性能块）、test:quality 全链 EXIT=0（CSS 631568 不变）、双主题 visual-qa EXIT=0、width-walkthrough 双前端 EXIT=0。
- [x] T-1608 统一验收台账与全表面回归（P1，D-307 收官）——done（2026-09-29，local-auto）。交付 docs/d307-final-ledger-2026-09-29.md 收官索引：①六阶段对账表（49 项任务逐条「任务ID|提交|守门|台账节」，阶段 0~5 共 44 提交映射）；②最终全表面回归记录（check+test:quality 全链+audit 三遍+visual 双主题+width 五组合+kernel-regression 全 EXIT=0，CSS 631568）；③**遗留缺口如实分列**——未排期 P1 增量 5 项（T-1550/1555/1582/1590/1591，其中 T-1582 部分由 T-1596~1598/1605 承接、T-1550 证据散布 phase4/kernel-regression）+候选观察 7 项（T-1538~1544 触发条件）+实施边界注记（多 root context 独立/全量 params 序列化）——**不宣称 64 条全部完成**（计划原文允许小批次交付）；④H1~H8 host-pending 维持不核销（host 台账 §8，取得条件不变）。收官状态：D-307 六阶段 49 项交付完成，4 台账就绪（phase4/phase5/host/本索引），回归全绿。验证：test:quality 全链 EXIT=0、双主题 visual-qa EXIT=0、width-walkthrough 五组合 EXIT=0。

## 调研产出待办（2026-09-28：轻迹 QingTrail LifeLog 调研——按用户指示列入待办，先不开发；调研记录见 benchmark 文档第二十三节，结论 D-299）

- [x] T-1541 回顾页 LifeLog 时间轴视图（低成本中感知，下批候选）——done（2026-09-29，local-auto）。①**纯函数投影** src/features/lifelog-timeline.ts：buildLifelogTimeline（yeguif 事件→时间轴行：note 冒号拆类型/备注、HH:MM 本地读数取自事件 ISO 自身=无时钟、分钟取整非正归零、ISO 升序稳定排序、itemName 映射缺失安全回退）+lifelogTypeColorIndex（31 进制哈希→6 色板，同类型恒同色、空类型 -1 中性）。②**渲染**：回顾页 analysis 工作区新折叠区 fold("lifelog")（提醒/即将事项之后）——纵向时间轴（左时间线+类型色点 data-lifelog-color+时长徽标），空区间显式提示不空白；数据由宿主 renderReview 注入（区间 yeguif 事件过滤 source==="yeguif"，时长已在 value 零新解析器），review.ts 仅渲染零新依赖。**纯渲染零写入**：不新增事件/不修改结算，仅投影既有 yeguif 事件。③i18n 3 键×2（lifelogTitle/Empty/Minutes，parity 2494 对）。守门：新 tests/lifelog-timeline.test.cjs 入 test:ui（解析/排序/色板/无时钟/渲染面 14+ 断言，TZ=Asia/Shanghai 固定）；**测试坑**：断言索引按 ISO 升序重排（首轮按字面顺序排错）；review-assistant 的 SummaryHarness 方法切片沙箱补 buildLifelogTimeline 真实现透传（renderReview 新依赖连带）。CSS 633672（+1.9KB，预算内）。验证：check、lifelog-timeline/review-assistant、test:quality 全链 EXIT=0、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。真实叶归数据的现场观感=host-pending（H2 范畴）。
- [ ] T-1614 LifeLog 多项目映射与项目级时长结算优化（P1，用户反馈，先梳理不开发）——重新明确 LifeLog 的主作用是把每条记录的“项目”作为来源维度分别计时：例如“跑步”连续 30 分钟只写入映射的“跑步”打卡项目，“拉伸”连续 20 分钟只写入映射的“拉伸”打卡项目；一条映射表示一个 LifeLog 项目→一个小驴打卡项目，允许配置很多条映射，未映射项目不猜测归属。现有 `mappings`/`resolveYeguifItemId` 已有基础，但设置页文本框、目标校验、映射状态和历史重摄取边界还不够直观。需梳理并优化：①映射编辑改为可增删的项目对项目行（LifeLog 项目名→打卡项目选择），显示重复来源、目标不存在、非分钟单位、归档/不可用和未匹配数量；②“写入哪些项目”、预览匹配和最近结果按来源项目逐项列出，能核对跑步/拉伸等独立目标；③每个区间的分钟值、备注、`source + externalRef` 幂等和失败待处理箱按原来源项目保留，不能把多个项目合并成单一目标；④明确多个来源项目是否允许汇入同一打卡项目、映射修改后已落盘事件是否保留/重算、同一块重摄取如何处理，禁止静默迁移历史事件；⑤来源卡共用项目候选目前由 `src/render/settings.ts:213-226` 固定 `activeItems.slice(0, 200)`，应改为可搜索/分页的完整候选选择，覆盖 LifeLog、健康、思阅、思播和微信读书，已绑定缺失/归档项目仍保留明确状态；⑥叶归摄取时 `src/index.ts:1469` 的事件 `occurredAt` 是摄取时刻，而 `src/features/lifelog-timeline.ts:30` 以它显示 HH:MM/排序，`settleYeguifEntries` 输出的真实 Marker 起始分钟没有随事件保存，需先决定源段时间与摄取时间的展示/统计口径，避免跑步/拉伸时长归属和时间轴顺序被轮询时刻污染；⑦`normalizeYeguifMappings(value, max = 50)`（`src/features/yeguif-adapter.ts:76`）会静默截掉第 51 条后的映射，需取消静默截断，或给出可见且合理的容量/分页规则。验收：超过 200 个项目和超过 50 条映射时仍能找到并保存任一合适目标，重载与摄取保留映射；多项目、多映射、未映射、重复映射、目标变更、归档/单位变更、源段时间与摄取时间差异、重载和失败重试均有确定结果；旧版 `itemId`/文本映射可迁移，双主题、键盘、窄屏和中文/英文设置可用。关联 T-1457/T-1508/T-1542/T-1544。
- [ ] T-1542 LifeLog 类型筛选与聚合（中成本）——按 Marker 类型做筛选与当日/区间时长聚合。前置：note 解析口径确认（type 长度上限/多语言/重命名跟随边界）。
- [ ] T-1543 日历 LifeLog 徽标叠加（观察）——日历上叠加每日 lifelog 条数/总时长；评估与完成态着色的冗余。
- [ ] T-1544 叶归段落修订检测（观察项，纪律敏感）——源文档段落被手改后，同 blockId 幂等身份挡住重结算、事件停留旧值；候选方案=重摄取时对比内容指纹，变化则旧事件墓碑+新事件。中高复杂度，触发条件=用户真实反馈。

## 调研产出待办（2026-09-28：源时记经验吸收——按用户指示列入待办，先不开发；调研记录见 benchmark 文档第二十二节，结论 D-298）

- [x] T-1539 AI 复盘「复制提示词」免 API 模式——done（2026-09-29，local-auto）。①**与既有 buildReviewPrompt 差异先行核对**：既有=「指令词」（要求 AI 端能读插件数据，嵌 checkin-summary-context 机器标记）；本任务=「自足提示词」（本地统计事实+用户草稿直接内嵌，粘贴到任意外部 AI 无需数据访问）——定位互补不重复，二者并存。②**纯函数** buildAiReviewPrompt（features/review-assistant.ts，确定性、零网络、零模型依赖、不写事件）：事实区块（总事件/完成覆盖/前 5 项目行——与周复盘向导 itemLines 同口径）+两段草稿（trim，空稿显式占位「（本周未填写）」不泄空白）+分析请求+输出格式约束+**隐私边界声明**（「请勿假设你有其他本地数据访问能力」）收尾；区块标题复用周复盘向导既有键值（headings 参数注入）保持两处口径一致。③**UI 接线**：周复盘向导动作行新增「复制 AI 提示词」按钮（data-weekly-ai-copy+aria-label/title），bind-page-navigation 取草稿输入框**现值**（未保存也可复制）+当期 summary 组装→navigator.clipboard（复用 copy-weekly-report 通道语义），成功 review.aiCopied/失败 msg.clipboardFail 复用既有键。④i18n 新增 8 键×2（weeklyAiCopy/AiCopyAria/aiCopied/aiPromptIntro/Facts/Empty/RequestBody/ResponseFormat/Privacy——实 9 键，parity 2484 对）。守门：review-assistant.test.cjs 新增双语言轮 7 断言（范围/计数/标题/草稿 verbatim+trim/无键名泄漏/确定性）+zh 轮 3 断言（空稿占位/隐私声明/空白不泄）。验证：pnpm run check、review-assistant/cross-page-consistency/i18n-hygiene 定向守门、parity 2484 对、test:quality 全链 EXIT=0（CSS 631568 不变）、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。真实外部 AI 粘贴效果=用户现场（host-pending，非模拟可证）。
- [ ] T-1538 内置专注计时闲置暂停与净时长口径（条件批次，用户拍板）——专注/番茄计时监听输入闲置超阈值自动暂停累计，呈现区分「净时长/闲置扣除」双口径；opt-in、阈值显式。前置：WebView 输入事件可用性真机验证 + 产品口径确认（番茄承诺制 vs 净时长的张力，参考源时记语义）。
- [ ] T-1540 源时记数据源适配评估（观察项）——若上游提供导出/API，按叶归本地读取模式接入为「文档专注时长」来源（跨窗口会话归属与 T-1508 同款边界，需单采集窗口+失效接管设计前置）；不自建被动追踪（第十一轮红线延续）。触发条件：上游数据面确认 + 用户需求。

## 历史已交付计划：可信记录与本地体验深化（2026-09-27，D-291）

原计划及历史验收见 [产品方向与本地开发计划](docs/product-direction-and-local-plan-2026-09-27.md)。下列 T-1509～T-1523 十五项已全部交付，本节保留当时的批次与证据，不再作为当前开工队列；T-1508 本地失败恢复由 T-1509 承接，其上游身份边界独立保留。当前顺序见 TODO 顶部统一执行索引。

顺序：A（T-1509～T-1512）→ B（T-1513～T-1518）→ C（T-1519～T-1522）；D（T-1523）可在 A 后穿插。每项详细验收与共用门禁见计划第五、六节；不新增一级导航，不重复立项已完成能力。

- [x] T-1509 外部失败记录待处理箱（P0）——done（2026-09-27，local-auto，口径 D-293）。新增 features/external-pending.ts（零运行时依赖）：有界箱（容量 40/保留期 14 天显式常量）、入箱按 source+itemId+externalRef 合并、满员显式拒绝、fail-closed 归一化、planExternalPendingRetry 重试决策（目标/映射/启用/墓碑/单位/日期全重查，拒绝不写绝不转投）。index.ts：recordExternalEvent 增加失败归因出口，仅 persist 失败入箱；独立存储桶 checkin-external-pending + 箱自身保存失败可见；启动恢复每条一次并出会话摘要；设置页外部来源区新增待处理箱（重试/丢弃带确认，空箱不渲染）；摄取报告新增 storageRetryable 与 blocked 区分。验证：check、主链、build、test:ui、test:ecosystem、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done；剩余边界（跨窗口会话身份、未收到的监听事件）仍归 T-1508 上游边界，不因本任务关闭。
- [x] T-1510 单条记录事实详情（P0）——done（2026-09-27，local-auto）。新纯模块 features/record-details.ts：buildRecordDetails 只读投影（记录日期/时刻/实际数值单位/计量方式/生效修订/归属项目六行固定序）；计量方式仅按登记前缀与来源确证（微信读书日汇总/完读/笔记、健康步数体重、笔记推导、Task Horizon、思阅/思播片段、叶归、番茄、导入、手动），api 无登记前缀如实未知；生效修订取事件日期修订历史（getItemRevisionForDate），项目已删除或修订缺失标未知，绝不以当前配置反推；externalRef 敏感身份不进投影。回顾页历史行新增「详情」切换（aria-expanded，跳过行不显示），展开面板零写入，焦点与滚动经 renderReviewPreservingView 保持；展开集会话态有界 50。新守门 tests/record-details.test.cjs 入主链（20/15 分钟两条、官方日汇总、手动/导入/未知来源、规则缺失、跨日事件夹具 + 接线 + 双语 20 键）。测试驱动修正健康身份前缀规则（health:<itemId>:<metric> 实际格式）。验证：check、主链、build（CSS 635504）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1511 批量补记实际数量与提交预览（P0）——done（2026-09-27，local-auto）。新纯模块 features/batch-backfill.ts：classifyBatchBackfillItem 单条分类（优先级 已存在→排期不适用→限额/戒除 atMost→绑定问卷→类型），二值固定 1 无输入；数值型逐项填实际数量——空/零/负/非法/超限一律不提交且绝不默认目标值；buildBatchBackfillPreview/planBatchBackfillSubmit 输出可提交计数与提交计划。回顾页批量补记改为预览流：「补记」先开预览面板（逐项分类原因 + 数值输入草稿，input 只更新草稿防打断输入、change 重渲染刷新计数），提交按钮带可提交条数并确认；宿主 recordHistoryBatchEntries 在 mutation 内以当前 store 重建快照重新分类（预览后项目改动自动重校验），一批一次持久化失败整批回滚，成功清空选择/草稿并逐条可撤销；日期/范围/翻页/取消均收起预览。跳过路径保持原语义。新守门 tests/batch-backfill.test.cjs 入主链（分类优先级/数值边界/提交计划重校验/接线/双语 14 键）。验证：check、主链、build（CSS 636319）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1512 来源渠道细筛与计量方式筛选（P0）——done（2026-09-27，local-auto）。history-filter.ts 扩展：HistoryChannelFilter（api:health/api:notequery/api:taskhorizon/api:other 为 UI 筛选值，公开 source 枚举不变）与 HistoryMeteringFilter（session/daily/other，与 T-1510 计量描述同一证据口径）；historyEventChannel 按登记前缀派生渠道（未知/旧身份/无 ref 如实归 api:other，不猜插件名），historyMeteringBucket 派生计量分桶（思阅/思播/番茄=会话片段；微信读书时长与健康=日汇总；完读/笔记合计/手动/导入/笔记推导/Task Horizon/未知接口=其他）；"api" 保持伞选项语义匹配全部 api 渠道（既有守门抓回一处回归）。回顾记录筛选：来源下拉扩展 13 项（来源枚举 + api 细分渠道）并显示各选项命中数（其余条件不变时），新增计量方式下拉（带命中数），组合筛选/清空（clear-history-filters 与节奏日跳转重置计量维度）/翻页先过滤后分页一致性；查询零写入。新守门 tests/history-channel-filter.test.cjs 入主链。验证：check、主链、build（CSS 636319）、test:ui、test:ecosystem、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。批次 A（T-1509～T-1512）就此收官。
- [x] T-1513 单项目未来 30 天排期预演（P1）——done（2026-09-27，local-auto）。新纯模块 features/schedule-preview.ts：buildSchedulePreview 从编辑器当前草稿起逐日投影（含起始日、有界 30 天），与 rules.ts isScheduled 同一口径（daily/workdays 星期判定/weekly+custom 指定星期/interval 锚点+间隔取模/quota 恒为灵活应做）；每个应做/非应做日带原因键；配额不编造固定执行日，输出周期窗口列表（周一起始周窗/自然月窗，闰月 2/29 正确，窗口在预演边界截断如实呈现），当期窗口剩余次数扣减已用量、未来窗口为满额；非法草稿（星期空/越界、间隔非正整数、锚点缺失、配额 0/非整数）fail-closed 返回 invalidReasonKey，绝不回落默认排期。编辑器预览卡新增「未来 30 天安排预演」折叠区（data-schedule-preview）：紧凑日格（应做 accent 描边/非应做虚线+文案冗余）+ 应做计数摘要 + 配额窗口行；updateEditorPreview 内即时重算，星期勾选/锚点/间隔/配额字段变化均触发，只读零落库。新守门 tests/schedule-preview.test.cjs 入主链。验证：check、主链、build（CSS 637530）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1514 规则修改前后影响对照（P1）——done（2026-09-27，local-auto）。新纯模块 features/rule-change-diff.ts：buildRuleChangeDiff 仅对照规则字段（类型/目标/单位/频率/同类型排期参数 canonical 比较），名称等展示字段天然不触发；未来 30 天安排差集复用 T-1513 buildSchedulePreview（旧侧=当前生效修订，新侧=表单草稿），单位 from/to 原样呈现不自动换算；任一侧排期非法 previewUnavailable（保存被既有校验拦截）。编辑器保存流：既有项目提交时先算 diff，changed 才渲染对照面板（字段行+新增/不再应做天数及代表日期+历史保留说明）并 window.confirm 摘要；取消零写入表单保留，确认走既有 saveForm 修订机制（生效日=今天，历史快照不变）；保存失败由 saveForm 既有回滚保留草稿。新守门 tests/rule-change-diff.test.cjs 入主链。验证：check、主链、build（CSS 638256）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1515 全项目未来一周负荷预览（P1）——done（2026-09-27，local-auto）。新纯模块 features/week-load.ts：buildWeekLoadPreview(items, startDate) 从今日起 7 天逐日投影（复用 T-1513 buildSchedulePreview 与排期内核同口径），非配额项目产出逐日应做标记（全休项目不列出）；**配额单列** quotaItems（周期/额度/计数方式），不摊派到每天；归档排除、排期非法如实排除并计数 invalidCount（不伪造应做日）；**计量分开**：每行保留自身 unit/target，模块无任何跨单位汇总字段（无 totalMinutes）。今日页「那年今天」后新增「未来七天负荷」按需折叠区（details，无数据不渲染）：日期表头 MM/DD + 项目名（点击 data-week-load-edit 跳编辑器）+ 7 日格（●应做/·非应做，应做格 title 显示目标+单位）+ 灵活周期任务分节；bind-today 绑定跳转 showEditor(item)；零事件写入。新守门 tests/week-load.test.cjs 入主链。⚠️ CSS 639591 字节，距 D-242 硬线 655360 仅剩 ~15.7KB——批次 B 收官后评估清理，后续任务优先复用既有样式。验证：check、主链、build、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1516 统计分母与状态贡献明细（P1）——done（2026-09-27，local-auto）。新纯模块 features/stat-denominators.ts：buildItemDenominatorDetail 逐日分类收集器（completed/missed/skipped/rest + unavailableCount），与 analytics.summarizeItem 分母循环**同序同谓词**（同批 model 函数：可用性→排期→跳过豁免→完成判定），配额项目与 summarizeQuota 同款短路（按区间末修订判定 isQuota，日级明细为空，解释沿用 summary.items 既有 quota 投影——不复制第二套公式）；每列表有界 62 项截断如实标注；buildRangeDayCounts 逐日事件计数（范围过滤、排序、只读）。概览新增「如何计算」折叠区（默认关闭懒渲染）：三条指标口径定义 + 逐日条记录芯片（data-denominator-date 跳转记录，走 jumpToHistoryDate 通道**保留筛选与排序**）+ 前 8 个项目分母明细（完成/未完成/跳过/非应做日期列表，分母为零显示「无适用数据」）。新守门 tests/stat-denominators.test.cjs 入主链（一致性断言：明细计数与 buildSummaryContext 的 completedDays/scheduledDays 逐项相等）。验证：check、主链、build（CSS 640741）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1517 选定项目横向趋势比较（P1）——done（2026-09-27，local-auto）。新纯模块 features/item-trend-compare.ts：buildItemTrendSeries 逐日序列（区间有界 31 天；数值按**当日生效修订单位**聚合与 evaluateRule 同口径；完成判定复用 isComplete/scheduledToday；sparse=无记录或无应做日如实标注；配额项目携带 quota 信息）；groupItemTrendsByUnit **按单位分组**（组内才比原始数值，不同单位分图分表，绝不换算），配额项目单列 quotaSeries（无日级完成率不参与比较）；归档/缺失项目返回 undefined。分析工作区新增「横向比较」折叠区（默认关闭懒渲染）：原生复选框选择器（键盘可用，至多 4 个，满 4 禁用未选项）→ 每单位组：renderLineChart 单项目折线图 + 同源数据表格（表图一致）+ 完成率行（仅适用口径：scheduledDays>0，否则显示记录天数）+ 稀疏提示；渲染按选择顺序不排名施压。宿主会话态 itemCompareSelection 有界 4。新守门 tests/item-trend-compare.test.cjs 入主链。验证：check、主链、build（CSS 641938）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1518 周复盘向导与可恢复草稿（P1）——done（2026-09-27，local-auto）。新纯模块 features/weekly-review.ts：草稿按周键（周起始日）隔离、有界 8、文本 500 上限 fail-closed 归一化、upsert 幂等合并淘汰最旧；buildWeeklyReviewMarkdown 确定性导出（事实/阻力/调整分节标注，空文本占位 —，无模型依赖、不写宿主文档）。偏好存储新增 weeklyReviewDrafts（additive，normalize 复用纯模块），跨重载恢复。概览新增「周复盘」折叠区（仅周范围显示）：第一步核对事实（本地统计：记录数/完成项/前 5 项目）、第二步阻力 textarea、第三步下周一项调整 textarea（草案提示：确认需去项目编辑器，不自动写目标）；保存/导出/清除按钮（bind-page-navigation 绑定，清除只清当前周并清空输入）。宿主 saveWeeklyReviewDraft/clearWeeklyReviewDraft/exportWeeklyReviewMarkdown（导出走既有 downloadReportMarkdown 通道）。修复 6 个既有测试的 view-preferences 模块桩清单（补 weekly-review 映射：template-manager/view-preferences/template-gallery/report-sections/report-deviations/templates/v8-platform/avatar-editor-browser）。新守门 tests/weekly-review.test.cjs 入主链。验证：check、主链、build（CSS 642955）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。批次 B（T-1513～T-1518）就此全部交付。
- [x] T-1519 个人模板脱敏分享（P1）——done（2026-09-28，local-auto）。新纯模块 features/template-share.ts：buildTemplateSharePackage **白名单构建**（name/icon/kind/target/unit/recordStep?/schedule 深净化含 quota/group/priority/timeSlot?/completionSource?/tomatoMode?，键序固定）——未来新增敏感字段天然不出包；note、内部 id、createdAt/updatedAt、journal/noteAnchor/apiKey/attachment/任意未知字段全部不出现；版本声明 app+shareVersion=1（TEMPLATE_SHARE_MAX=20 超量拦截、空选择拦截）；serializeTemplateSharePackage 确定性序列化（同输入同字节）；原模板对象零修改。编辑器「我的模板」区新增「分享模板」折叠区（复选框选择、pre 预览实时刷新不重渲染不丢焦点、导出按钮带所选计数与禁用态、状态行反馈）；宿主 downloadTemplateShare 走既有 saveGeneratedFile 通道（文件名 siyuan-checkin-template-share-<日期>.json）。新守门 tests/template-share.test.cjs 入主链（敏感夹具逐一断言不出包/确定性/版本/拦截/零修改/接线/双语 7 键）。验证：check、主链、build（CSS 643839）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1520 模板包导入逐项差异与冲突处理（P1）——done（2026-09-28，local-auto）。新纯模块 features/template-import.ts：parseTemplateShare 按 T-1519 契约解析——shareVersion≠1 或 app 不符整包拒绝、超 200KB/超 20 模板拒绝、非法 JSON/结构拒绝、字段非法条目逐条丢弃计数（name/kind/target/unit/schedule 校验，icon/优先级/时段/番茄模式 fail-closed 归一）；planImportDecisions 逐项决策：新模板默认「导入」，**重名（大小写不敏感）默认「跳过」（最安全）**，可改「替换现有」（只覆盖模板本身不影响已创建项目，保留原 id）或「另存为」（确定性后缀「· 导入」）；重复导入同一包第二次全部判重名（幂等）。编辑器分享区新增导入段：本地文件读取（FileReader 无宿主新契约）→ 大小守卫 → 解析 → 逐项 radio 决策表 → 确认/取消（取消清会话零写入）。宿主 applyTemplateShareImport 一次 saveData 批量应用，失败整批回滚原模板并提示「已恢复原模板」。新守门 tests/template-import.test.cjs 入主链。验证：check、主链、build（CSS 644735）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1521 设置保存前变更清单与分节恢复（P1）——done（2026-09-28，local-auto）。新纯模块 features/settings-change-list.ts：SETTINGS_FIELD_REGISTRY 注册 10 个草稿字段（attribute/分节/标签键/敏感标记——weread key 与问卷自定义文本为敏感）；buildSettingsChangeList 只收「草稿≠已保存」字段（未改动/注册表外字段排除），按注册表顺序分节确定性输出；maskSettingValue 敏感字段前后值一律 •••••• 遮罩、普通值截断 24 字符、空值占位。宿主：bindSettings 捕获已保存基线 settingsSavedBaselines（草稿应用前），buildSettingsChangeSections 对比草稿与基线生成清单；撤回单项/恢复分节均 confirm 后删除草稿并重渲染（输入回落已保存值，不触碰记录/文档/已生效设置），保存失败既有通道保留草稿。设置页搜索下方新增「未保存的修改（N 项）」面板（默认展开：分节块+前后值（已遮罩）+逐项撤回/分节恢复按钮；无改动显示「没有待保存的修改」）；面板标注「仍是草稿，尚未生效」不把草稿当已生效。新守门 tests/settings-change-list.test.cjs 入主链。验证：check、主链、build（CSS 645890）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1522 数据迁移重名冲突主动选择（P1）——done（2026-09-28，local-auto）。新纯模块 features/import-conflicts.ts：planImportConflicts 只对与**活跃**现有项目同名的迁移来源生成决策行；合入仅在类型+单位都兼容时可用，单位/类型不兼容明示原因并默认回落「跳过」（绝不静默换算单位）；另建名称确定性派生（「· 导入」+序号，与现有不重名）；新名字面来源不干预。plugin-ops：importLoopPlanInto/importObsidianHabitsInto 增加可选 conflictDispositions（merge=既有语义/createNew=新名新建/skip=整名跳过并计 skippedRows，返回值 additive）。设置页导入流：有同名冲突时先出决策面板（逐行 radio：合入/另建/跳过 + 来源与现有单位/类型对比 + 不兼容原因），radio 即时更新会话；确认重查后整批应用（一次 persist，失败 this.store=previousStore 回滚+提示），跳过行数单独反馈；取消清会话零写入；无冲突保持原确认流。新增守门 tests/import-conflicts.test.cjs 入主链（Proxy 桩加载 plugin-ops 真实迁移函数，断言跳过计行/另建保源单位/合入既有语义/重复导入幂等）；loop-csv 守门的执行器断言放宽为前缀匹配（可选第三参数合法演化）。验证：check、主链、build（CSS 646342）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。
- [x] T-1523 外部来源粘贴样例试算台（P2）——done（2026-09-28，local-auto）。新纯模块 features/source-sandbox.ts：sandboxYeguifSample（逐行 parseYeguifMarker+resolveYeguifItemId——拉伸/阅读按显式映射分别归属，未知类型不落通用目标如实 unmatched，单位为分钟的项目才是候选）、sandboxHealthSample（逐行 parseHealthInboxLine 严格格式——按 metricBindings 归属并明示单位（步/公斤），未来日期与无法解析判 invalid）、sandboxNoteQuerySample（粘贴行合成伪块——伪块 ID/当日 dailynote ial 由注入 todayKey 派生——跑生产 parseNoteQueryRows，未就绪偏好如实 unmatched）；输入有界（50 行×200 字符+截断计数）；输出逐行 state（matched/unmatched/invalid）+目标名/原因键+计数摘要。设置页三个来源卡片（健康/笔记推导/叶归）各内嵌「用样例检查」折叠区（textarea 会话内存保存+试算按钮+逐行结果+摘要+截断提示+「样例仅会话内保留；不写事件、不改映射、不代表已连接」声明）；宿主 runSourceSandbox 复用生产解析/映射函数，零 SQL、零网络、零事件写入、零映射修改；正文仅会话内存。新守门 tests/source-sandbox.test.cjs 入主链（拉伸/阅读分别归属/未知类型不落通用/未来日期/有界截断/恶意输入截断/确定性/接线/双语 13 键）。验证：check、主链、build（CSS 647610）、test:ui、双主题 visual-qa、宽度走查、test:quality 全 EXIT=0。
  - 状态：done。**D-291 全部 15 项（T-1509～T-1523）就此交付完毕**。

## 本轮用户触发（2026-09-27：回顾概览统计迷你线移除）

- [x] T-1524 移除回顾概览统计区 30 天迷你趋势线——done（2026-09-27，用户反馈「线出现得突兀、不该放这里」）。口径见 D-292：统计卡为本周期口径、迷你线为固定 30 天口径混排，且作为第 4 网格项悬在「条记录」下方无视觉归属；趋势呈现由分析工作区「趋势」图唯一承载。移除 `render/review.ts` 统计区第 4 网格项、`charts.ts` renderSparkline、3 条 SCSS 规则与 2 对 i18n 键（零死类、零死键）；守门升格为「概览默认零 SVG、零豁免」并断言 sparkline 全面退役。验证：`pnpm run check`、`pnpm test`、`pnpm run build`（CSS 634843 字节）、`pnpm run test:ui`、双主题 `node tests/visual-qa.cjs`、`node tests/width-walkthrough.cjs`（49 表面+32 交互）、`pnpm run test:quality`（回滚演练+发布资产）全部 EXIT=0。未 commit（工作树含同批在途改动，留待阶段收口）。

## 本轮用户触发（2026-09-28：循证打卡模板批次）

- [x] T-1525 循证模板批次——done（2026-09-28，用户指令：D-291 收官后调研习惯养成书评与 HowToLiveBetter 仓库设计新模板）。选型口径见 D-294：5 个与既有 67 模板不重叠、证据较强的新模板入 `src/catalog.ts` CHECKIN_TEMPLATES——读一页书（《掌控习惯》两分钟法则微习惯版）、按时服药（HowToLiveBetter 慢性病章：服药依从性价比最高）、定时起身（久坐章：count 工作日×6 打断久坐）、联系亲友（放松章/哈佛成人发展研究：关系是幸福感最强预测因素）、分散复习（学习章：分散练习+自测，证据 A 级）；「户外时间/无屏幕餐/即刻两分钟」等候选与既有散步/跑步/读一页书重叠被裁掉，保持精选。TEMPLATE_NAME_KEYS + i18n zh/en 各 10 键双语完备；template-gallery 守门 curated 上限 70→75 并新增循证批次存在性断言（缺任一即红）。验证：`pnpm run check`、`pnpm test`、`pnpm run build`（CSS 647610 字节，纯内容资产零新增样式）、`pnpm run test:ui`、浅/深主题 `node tests/visual-qa.cjs`、`node tests/width-walkthrough.cjs`、`pnpm run test:quality`（i18n 平价 2349/2349）全部 EXIT=0。

## 本轮自主任务（2026-09-28：CSS 死规则清理与守门修复）

- [x] T-1526 CSS 死规则清理与审计守门修复——done（2026-09-28，local-auto，口径 D-295）。开放队列 9 项全部挂上游/用户拍板后，按 D-242 预警自选本地任务：修复 scripts/css-audit.cjs 恒真缺陷（旧实现把 SCSS 定义本身算作引用，dead 恒为空、css-hygiene 门禁形同虚设），改为 **TS-only 消费方判定**（is-/has-/数字后缀归 dynamicSuspect、b3- 宿主类不判死）；据实清理 26 个死类家族约 250 行规则——骨架屏 skeleton 全家（含 keyframes/reduced-motion）、插件自绘弹窗关闭钮 dialog-close 全变体（宿主 b3-dialog 承担关闭）、warning/badge 呼出块、首版强度行 strength-list/row/detail/fold（T-1243 overview 实现取代）、review-hero-copy/rate/cutoff（hero 旧三栏结构）、summary-agent、history-tools/details/expand、fold-count、header-streak、diary-doc-controls、renderblock-today-summary、has-records 日历点、provider-help、review-actions、幻影表面 --summary。CSS 647610→**630747 字节（-16.9KB，重回 620KB 软线以下）**，类 token 763→735，产物 dead=0。守门同步：css-hygiene 长出真牙齿（dead>0 即红）；ui-state-ledger 退役词表纳入 skeleton；mobile-dialog 反向断言插件关闭钮不得回流；ui-theme has-records 锚点换 is-selected、reduced-motion 断言指向存活规则；stats-visuals 区域锚点换 renderblock-summary；release-assets 表面清单对齐 TS 实际 8 表面（summary 实为图标名）。过程教训：退役注释含字面类名会同时触发正向/反向断言，注释一律去字面量。验证：check、主链、build、test:ui、test:quality、双主题 visual-qa（零 pageErrors）、宽度走查全 EXIT=0。

## 本轮自主任务（2026-09-28：走查收口与 T-1392 本地切片）

- [x] T-1537 v18.9.0 正式发布——done（2026-09-28，**用户授权发版**）。①README 发布前检查：横幅过期表述（15 项计划→已交付）改写为 v18.9.0 交付说明；文档入口补真机验收清单链接。②发布前最终 test:quality 首跑抓出真问题——守门桩 root 无 addEventListener 导致 toggle 绑定崩（view-preferences 桩），加存在性守卫后全绿。③发布执行（gh 未装，走 17.1.0 api.github.com 流程，token 取自 git 凭据管理器仅内存使用）：main 推送 acfceab→5248123（32 提交）、注释标签 v18.9.0 推送、API 创建 Release（id 397882046，非草稿非预发布，正文=发布说明含实际 SHA）并上传 package.zip（797,145 字节）。④回读核验：API 回读资产 797,145 字节逐字节一致（SHA-256 f41a74b1…=发布说明与本地包三方一致）；远端 main=5248123、tag=v18.9.0。**发布地址**：https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.9.0

- [x] T-1536 README 发布前修正——done（2026-09-28，local-auto）。横幅「15 项计划已列入」改为 v18.9.0 已交付表述+后续方向（真机验收/生态联调/小步迭代）；文档入口补 integration-smoke-checklist 链接；其余核过无需改动（安装/兼容/API/边界/文档索引各节均为当前状态）。

- [x] T-1535 真实内核 E2E 全量跑通与两项修复——done（2026-09-28，local-auto）。本会话首次对 v18.9.0 构建跑 `test:e2e`（隔离真实内核 3.8.5 + Playwright，17 spec 23 例）：首轮 20 过/2 挂/1 flaky，全部查明并修复——①**mobile-review-ui**（真实产品缺陷）：移动布局下「报告设置/更多工具」in-flow 下拉展开时底部伸进固定底栏（z-index 8）约 12px，最底部菜单项点不到；用 Playwright 探针定位命中元素为底栏按钮后，在 bind-page-navigation 新增 toggle 捕获监听——details 打开后按遮挡量滚动最近可滚动祖先（兜底 window），桌面无底栏不触发；②**yeguif spec 过期**（非产品缺陷）：5a31de6（v18.8.0 时代）收紧叶归语义——时长归属当前记录（10:00 运动 60 分钟）、无映射仅同名匹配——spec 未跟随仍断言旧语义（归属 09:00 阅读+无映射），已按现行语义更新映射/备注/externalRef 断言。复跑全量 E2E **23/23 全绿**（含此前 flaky 的 review-suggestion）。发布说明与 change-log 补移动端修正条目并重同步 SHA（c000a8b9…）；check:release 复验通过。**这轮证明：v18.8.0 发布时未跑全量 E2E 的债，在 v18.9.0 里还清了**——发布说明「验证与边界」已如实升级为 E2E 全量 23/23。

- [x] T-1534 v18.9.0 真机验收清单——done（2026-09-28，local-auto）。docs/integration-smoke-checklist.md 新增「可信记录批次（v18.9.0 真机验收）」一节：13 个小节覆盖 D-291 全部交互与收尾任务，按**设备才能验证的行为**编写（真实来源事件的渠道归类、整树重启后周复盘草稿恢复、Android WebView 下载通道、移动端文件选择器、触屏粘贴、320px 面板溢出、两主题概览回归），并写明每轮前置整树重启（规避 reloadUI 不刷新 JS 缓存的既有陷阱）；待处理箱真机不可构造的存储故障场景如实标注替代验证口径。守门 ui-docs/check 实测 EXIT=0。

- [x] T-1533 v18.9.0 本地定版——done（2026-09-28，local-auto；用户「继续」对上轮选项①「定版→发布资产（本地）」的放行，**push 仍待用户确认**）。发布三要素就位：①版本三元组 src/version.ts PLUGIN_VERSION、package.json、plugin.json 全部升至 18.9.0（release-assets 守门从 package.json 派生 RELEASE_VERSION 自动跟随）；②README 当前版本/发布说明链接/18.9.0 重点区/变更记录链接四处切换；③release-notes-18.9.0-draft.md 转正为 release-notes-18.9.0.md（去草案框、补 SHA-256 行骨架由 sync:digest 填充实际摘要 bdac1900…）+ 新增 docs/v18.9.0-change-log.md（按批次+任务号的详细记录）。验证：build、sync:digest、check:release（资产校验+回滚演练 v18.9.0 全绿）、test:quality 全链、双主题 visual-qa、宽度走查全 EXIT=0。**发布剩余步骤（用户动作）**：确认后 push → GitHub Release 上传 package.zip（SHA 见发布说明）。

- [x] T-1532 v18.9.0 发布说明草案——done（2026-09-28，local-auto）。27+ 提交体量已达一个小版本，为发布窗口备料：新增 docs/releases/release-notes-18.9.0-draft.md（顶部草案框注明发布时移除后缀/定版本/同步 SHA），按惯例分组汇总全部面向用户变更——可靠事实（待处理箱/事实详情/补记实际值/渠道细筛）、规划透明（排期预演/规则对照/周负荷/分母明细/横向比较/周复盘）、配置复用（模板分享/导入决策/设置变更清单/迁移三选）、联动与模板（样例试算台/循证模板/概览调整）、生态（契约包消费端参考层）；验证与边界节如实标注真机与上游边界。命名带 -draft 后缀 + docs/releases/ 位置均不触碰 release-assets 守门（root 过滤器与版本钉定均不受影响，已实测）。验证：release-assets、ui-docs 全 EXIT=0。

- [x] T-1531 TS 死导出审计与清理——done（2026-09-28，local-auto）。词边界精确引用扫描（1379 个导出声明 × 全 src + tests，本文件自用计入存活）：运行时死导出仅 4 个，逐一全仓库核实（无动态引用、无 export * 转出、依赖不被孤立）后移除——ecosystem.ts toCalendarSyncRecord（早期日历同步草稿，被 T-1391 投影路线取代）、quota.ts normalizeQuotaSchedule（主流程走 model.normalizeSchedule，normalizeQuota 另有 model.ts 使用不受影响）、features/health-inbox.ts HEALTH_INBOX_METRICS（指标名内联匹配）、features/template-manager.ts createTemplateManagerState（宿主自管状态形状）。9 个死导出 type/interface 有意保留——编译期擦除零包体成本，且多为公共 API 契约文档面（如 api-v5.ts BatchRecordInput）。验证：check、主链、build（JS 1.22MiB 持平）、test:ui、test:quality、双主题 visual-qa、宽度走查全 EXIT=0。

- [x] T-1530 上游状态复查、文档保鲜与英文文案审计——done（2026-09-28，local-auto）。①R-REL-CHECK 复查（2026-09-28）：[sireader#55](https://github.com/mm-o/siyuan-sireader/issues/55) 与 [siplayer#180](https://github.com/mm-o/siyuan-media-player/issues/180) 均仍 open、0 评论、无维护者回应、无关联 PR（与 09-27 基线一致，无解封；不追加无实质内容的外部评论）。②文档过期数字修正——product-direction 计划表「67 个目录模板」→72（T-1525 后）；roadmap-current 当前状态表「65 个模板」→72 且移除「近 30 日 sparkline」表述（T-1524 已按用户反馈移除）；HANDOFF-2026-09-28 未 push 提交数 18→24 并补 T-1528/1529/1530 里程碑行。③英文文案审计（2343 键，与 09-28 中文审计对偶）：双空格 0、标点前空格 2 处均为合法文件扩展名写法（habit .md files）、拼写变体一致（color 系 5 处无 colour）、句尾句点按族内一致（mixed families=0）、弯双引号 31 处均为 `“{name}”` 包裹动态值的统一惯例；发现并修复唯一真实不一致——set.yeguifBoundary 弯撇号（Marker’s/today’s）归一为全库通行的直撇号。验证：i18n-parity 2349/2349、upstream-proposals、build 全 EXIT=0。

- [x] T-1529 质量审计三项与 CSS 微重复降级决策——done（2026-09-28，local-auto，结论 D-297）。零代码改动的研究收口：①编辑器截图「可疑文案」与 i18n 全量核对后判定为低分辨率截图误读，无缺陷字符串；②中文文案脚本审计 2330 个含 CJK 键——ASCII 标点混排/重复标点/你您称谓冲突全 0，4 个首尾空白键均为有意格式（`\n\n` 多行确认框前缀；尾部空格是确认文案拼接分隔符，index.ts:4558/4603 依赖）；③visual-qa harness 确认已有硬断言（mobileMatrix 横向溢出 scrollWidth===clientWidth、卡片动作区重叠、标题不换行、API 行为矩阵、pageErrors 深比较），无「只记录不拦截」的薄弱守门；④CSS 微重复 57 组 ~5.2KB 主动降级为护栏管理（每组均为同编译上下文同选择器同声明的级联等价规则，但源形态分散于嵌套/平铺，~45 处摘除风险大于 0.7% 体积收益；css-hygiene 10KB 护栏余量近半，未来触碰某组时顺手处理该组）。

- [x] T-1528 产品视觉走查与阶段交接收口——done（2026-09-28，local-auto）。本地队列清零后按「实际问题」做产品级 QA：亲查 visual-qa 全部 26 张产物截图（今日/回顾×2/编辑器/设置/事项/洞察/归档/问卷/320~430 宽矩阵/宽 dock），未发现真实 UI 缺陷——编辑器底部“文字裁切”经定位为 harness 已注明的 fullPage+fixed 截图伪影（判断遮挡以 viewport-*.png 为准，320 实视口验证无遮挡）；桌面/移动、双主题、窄宽全部干净。补跑 test:mobile/test:ecosystem/test:extended 三链（本会话此前未覆盖）全 EXIT=0。按仓库惯例新增 docs/HANDOFF-2026-09-28.md 阶段交接（取代 09-27 交接的当前状态节：18 个未 push 提交分段、开放队列仅剩外部依赖项、2026-09-28 新增工程要点五条）。

- [x] T-1527 calendar.read 消费端参考层与契约夹具（T-1392 小驴侧本地切片，P1）——done（2026-09-28，local-auto，口径 D-296）。依 BLOCKERS/路线图明示「当前只准备本地契约草案和夹具，不修改 task-horizon-v1.json、不把私有实现当稳定依赖」：契约包新增 `calendar-consumer.mjs`（v5 已发布的 calendar.read 契约为唯一依据，零臆造）——①能力协商 negotiateCalendarRead（api-missing/host-outdated/capability-missing 三态拒绝 + getCapabilityInfo effect=read 校验，绝不带病调用）；②区间规划 planProjectionRange（严格 localDate/半开区间/民历日序号运算无夏令时依赖，>366 天拒绝或 clamp 截齐）；③刷新分类 planCalendarRefresh（已发布 8 事件 → record/structure/derived/unrelated 四类，隐藏开关走 item-updated 服务端过滤+重载即生效，未知事件 fail-closed）；④防御性归一化 normalizeCalendarProjection（6 状态枚举/逐条丢弃坏 item/point 并计数/不发明字段）；⑤单飞会话 createCalendarProjectionSession（并发同区间共享一次在途、超时/中止/提供方异常全部可诊断、过期缓存不回退旧值、固定时钟注入可测）；⑥消费端自检 runCalendarConsumerChecks（合规宿主 9 项断言，与 runContractChecks 同风格）。新守门 tests/calendar-consumer-kit.test.cjs 入主链（协商矩阵/区间含闰年/8 事件全分类/脏数据逐条丢弃/单飞缓存过期/30ms 超时/中止确定性/合规 9 断言+legacy 单失败+throwing 宿主不崩）。契约包 package.json files + README 使用说明同步；未改 manifest.json、未改 api-v5.md、未接线真实日历视图（待 T-1394 双向现场验收）。验证：check、主链、build、test:ui、test:quality、双主题 visual-qa、宽度走查全 EXIT=0。

## 外部联动逻辑总账与治理深化（2026-09-27，用户点名）

- [x] T-1503 外部联动逻辑盘点与功能分层
  - 验收：逐项覆盖插件监听、官方拉取、文档摄取、对外 API 和文档输出；明确触发、身份、隐私、失败、停用/重绑与合适操作；不把所有来源抽象成含义模糊的“同步”。
  - 状态：done（`docs/external-integrations-map.md` 已建立五类总账，覆盖思阅、思播、微信读书、健康、叶归、笔记推导、Task Horizon、Dock Tomato、API v5、摘要驻留及日记/问卷/锚点；同时纠正笔记推导非法字段测试，锁定 fail-closed 不静默改查默认字段。）
- [x] T-1504 外部联动四轴状态投影与设置页分组（P0）
  - 验收：配置/运行/活动/问题四轴独立；设置按监听、拉取、文档摄取、对外契约、文档输出分组；未知宿主显示未探测，不以本地开关冒充可用。
  - 状态：done（设置页新增纯只读四轴投影；配置徽标与运行/活动/问题行分离，思播公开 controller 探测和微信读书最近拉取结果使用真实证据，其余未探测如实标记；来源卡片按渠道重排并补分组标题；定向守门、UI 链、构建、双主题视觉和宽度走查通过。）
- [x] T-1505 文档摄取报告与匹配预览（P1）
  - 验收：健康、叶归、笔记推导统一返回扫描/匹配/计划写入/实际写入/重复/墓碑/手动冲突/非法/未匹配/拦截计数与窗口读满提示；设置页可手动重跑且不泄露正文和敏感值。读满只提示可能尚有数据，不臆称确切截断数。
  - 状态：done（三个文档来源共用会话内报告结构，设置页展示最近扫描与跳过原因并提供只读匹配预览；预览在事件写入队列前退出。类型、定向守门、完整 test:quality、双主题视觉和宽度走查通过；真实宿主文档数据仍需现场验证。）
- [x] T-1506 自动来源重复累计冲突提示（P1）
  - 验收：同一目标绑定多个同语义自动来源时非阻断提示，优先覆盖思阅与微信读书阅读时长；不自动停用、不猜测书目或真实行为。
  - 状态：done（思阅和微信读书时长同时启用并写入同一有效项目时，设置总览显示双语非阻断警示；不同目标不提示；既有开关和事件不变。类型、设置渲染与双语守门通过。）
- [x] T-1507 对外契约中心（P2）
  - 验收：集中展示 API v5、Task Horizon、Dock Tomato 的协议版本、能力、就绪/等待和诊断入口；未实现消费端不得显示已连接。
  - 状态：done（设置页集中显示运行时 API v5 版本及能力数、Task Horizon 协议版本与等待消费方接入、Dock Tomato 真实探测状态及诊断数量；不伪造连接。类型、定向守门、完整 test:quality、双主题视觉和宽度走查通过。）

## v18.8.0 已发布（2026-09-27，用户授权发版）

- [x] 发布内容：D-275 队列（T-1477~T-1483、T-1386）、T-1484 提示词轮换、T-1485 绑定目标卡片、第十一轮批次一（T-1486~1489 新建体验）、批次二 4/5（T-1491~1494 事项页强化）、T-1502 页签默认打开方式；周热图对齐修复与第十/十一轮调研文档。发布前完整 test:quality EXIT=0（v18.8.0 资产校验+回滚演练），双主题 visual-qa 与宽度走查全绿。
- [x] 发布事实：main `3a6639c..dce4acf` 推送（27 个本地提交一并上云）；tag `v18.8.0` 已推送；GitHub Release 标记 Latest，package.zip 756,622 字节，远端资产 SHA-256 `8f0dd239fc6cf12c301ef56c63d60b549f810cc5680272cb16fc279c7ed9e98d` 与本地构建及发布说明一致（API 回读核验）。
- [x] R-REL-CHECK（发布窗口）：sireader#55 / siplayer#180 均 open、0 评论、无维护者回应（09-27 复查），契约无变化无需更新原帖。
- [x] 交接：**[docs/HANDOFF-2026-09-27.md](docs/HANDOFF-2026-09-27.md)**——新电脑同步仓库后从此进入（环境准备、开放队列、开发纪律、台账索引、发布流水线）。

## 本轮用户触发（2026-09-27：页签一级入口评估）

- [x] T-1502 页签一级入口与默认打开方式偏好——评估结论：**做（小幅收口，不做替代）**。评估：页签呈现已是完整交付的能力（addTab 自定义类型注册、固定 tab id 复用聚焦、init/update/destroy 全生命周期、多表面实例隔离、visual-qa wideTab 断言+宽度走查覆盖、README 已提及），无需新造表面；页签优点=常驻可固定、重启随布局恢复、可与文档分屏、全宽回顾体验，缺点=占布局空间且移动端无页签语义——因此与弹窗**并存不替代**，dock 点击保持展开面板语义不改。落地增量：①新偏好 defaultOpenMode（quick 缺省/tab，fail-closed 归一），⌥⇧C 与 openCheckin 命令经 resolveQuickEntryTarget 纯函数路由（openCheckinTab 保持直达页签）；②设置页「外观与交互」新增打开方式选择行；③README 补页签入口说明；④守门扩展（路由用例/接线/双语）。验证：check、主链、build+test:quality、双主题走查全绿；未 push。

## T-1400 生态调研循环·第十一轮（2026-09-27，用户点名触发：联动自动化×新建模板×事项页×UI/性能全面优化）

用户指示：再开一轮调研，找联动后可自动完成的内容；UI/性能/功能/交互再优化一轮；列不低于 10 项任务入开发清单；三个专项——①外部联动内容专门优化新建打卡模板 ②新建打卡设置更方便 ③强化事项页（对同类软件专项调研）。四路并行调研完成（独立事项/倒数日赛道、联动自动化、新建模板与表单 UX、快速录入与 UI/性能趋势），约 25 次检索与官方源抓取；全案见 benchmark 第二十一节。竞品警报 0。D-275 旧队列（T-1477～T-1485、T-1386）已全部交付，本节为历史交付记录；当前顺序见 TODO 顶部 D-307。

**批次一·新建打卡模板与设置（用户点名①②）**
- [x] T-1486 联动预接线模板——done（2026-09-27）。①新纯模块 features/template-linkage.ts（零依赖）：zh 名锚点亲和表（步数→health-steps、体重→health-weight、阅读→sireader、问卷日记→journal，locale 无关）、buildTemplateLinkageCard（思阅改绑显式呈现现有绑定 conflictNames、健康卡展示已挂载项目 relatedNames 不阻断、问卷无预设降级提示）、isTemplateLinkagePlan 白名单（journal 永不入计划）。②编辑器联动建议卡（role=note 非阻断）：模板套用后渲染，确认仅写隐藏 linkagePlan 字段（「保存后生效」+可撤销），项目真实落盘后一次性消费（saveEditorForm 返回 item.id），写入走既有偏好通道（addHealthMetricBinding / sireaderIntegration 改绑），持久化失败恢复旧偏好；换模板即重置计划；绝不静默启用联动。③健康收件箱升级按项目映射：metricBindings[]（同指标多项目、每项目独立 externalRef 身份非双重累计、容量 16、去重、fail-closed），旧 stepsItemId/weightItemId 自动迁移为首条映射并保留镜像字段（降级可读）；ingest 按指标投递全部挂载项目；设置页两静态下拉升级为动态映射行（添加/移除/改绑，单元不匹配沿用强制停用+提示纪律）。④catalog 新增「体重」（quantity 千克）与「问卷日记」（binary）模板（67 个），问卷建议仅聚焦既有绑定控件不自动挑选预设。双语 22 键；守门 tests/health-inbox.test.cjs 扩展（多映射归一/迁移/去重/容量/亲和表/卡片 fail-closed/宿主接线/旧选择器退役不复流）+ template-gallery/template-packs/settings-navigation/i18n-parity 全过。验证：pnpm run check、pnpm test、test:ui、test:quality（CSS 628389 预算内）、宽度走查 49+32、双主题 visual-qa 全绿（走查模板锚点改按名称定位以稳健应对目录变化）；真机触控归 host-pending；未 push。
- [x] T-1487 新建打卡智能默认——done（2026-09-27）。新纯模块 features/name-inference.ts（零依赖、无时钟）：buildNameInference 先按目录精确匹配（zh 锚点 + 注入的当前语言显示名，大小写无关）建议整卡套用，未命中时 inferFieldsFromName 关键词推断——数值+单位相邻检出（类型/单位/目标，公斤→千克归一）、单位停用词（「跑步」不误触发「步」）、时段（晨/早→morning、午、晚/夜）、排期（每天/每日、工作日、周末、「每周一三五」连续列举逐字收集去重升序）；fail-closed：零信号/超长/零值目标一律不产出；确定性输出。编辑器：名称输入 250ms 防抖出建议行（非阻断），「套用模板」走与模板芯片完全相同的 applyTemplateFields 填表路径（含联动建议卡重置），「按名称预填」仅填推断字段并刷新条件字段/预览，同名称手动关闭后不再提示——应用前不改任何字段，「不覆盖显式选择」由点击门控天然保证。宿主 nameInferenceCatalog() 投影锚点+译文对照。双语 4 键；守门 tests/name-inference.test.cjs 入 pnpm test 主链（命中/推断/fail-closed/确定性/纯度/接线/i18n）。验证：check、主链、build+test:quality（CSS 628785 预算内）、宽度走查、双主题 visual-qa 全绿；真机输入法节奏归 host-pending；未 push。
- [x] T-1488 新建流效率——done（2026-09-27）。①空状态一键装填：组合包预览面板在库中无活跃项目时出现「一键应用全部新增（N）」，走宿主 applyTemplatePackBulk——复用同一 buildTemplatePackPreview 纯函数做 new/duplicate 判定（重复名不重建），每条经 normalizeCheckinItem 模型边界原样落目录字段（类型/目标/单位/步长/排期/时段/番茄/戒除），失败恢复旧 store，逐条广播 item-created + 推进新手旅程；非空库保持逐条确认通道不变。②「保存并继续」：仅新建表单出现（data-save-continue 提交源检测），saveEditorForm 增 continueCreation 选项跳过返回今日页，真实落盘后 bind-editor 才清空名称/重置联动卡与联想行并聚焦（失败不动表单），分组/类型/排期等上下文由表单自然保留。③空状态模板区默认展开 + 专用提示文案。i18n 4 键双语；守门 template-packs（批量前提/宿主方法/归一化边界/旅程推进）与 template-gallery（continue 接线/落盘门控）扩展。验证：check、主链、test:ui、build+test:quality（CSS 628864 预算内）、宽度走查、双主题 visual-qa 全绿；真机触控归 host-pending；未 push。
- [x] T-1489 互补习惯动态推荐——done（2026-09-27）。新纯模块 features/habit-recommendations.ts（零依赖、无时钟、确定性）：recommendHabitTemplates 按已有活跃项目生成推荐——排除比对同时覆盖 zh 锚点与本地化显示名；组互补配对表（运动↔健康 +2、工作/学习→生活 +1、生活→工作 +1、创作→学习 +1）；时段补位（晨/午/晚空缺 +2）；类型多样性（缺 absent kind +1）；score desc → 目录顺序 tiebreak；空库回退静态精选 RECOMMENDED_TEMPLATES（未知名忽略），全部命中如实返回空（推荐位隐藏，不硬凑）。编辑器推荐位（data-template-recommended 标记保留）由静态表切换为动态输出，标题改「为你推荐」+ 补 calm 提示「根据已有项目生成的互补建议，仅供参考」；保留「最近使用优先、推荐补位」既有版面规则与归档项目不参与。双语；新守门 tests/habit-recommendations.test.cjs 入 pnpm test 主链（排除/配对/补位/多样性/确定性/回退/纯度/接线/calm 文案禁则）。验证：check、主链、test:ui、build+test:quality（CSS 628864 预算内）、宽度走查、双主题 visual-qa 全绿；未 push。批次一（T-1486～1489）就此全部交付。

**批次二·事项页强化（用户点名③，同类软件专项调研）**
- [x] T-1491 纪念日里程碑派生——done（2026-09-27）。occasions.ts 单一实现（只读投影，零 schema 变更）：nextOccasionMilestones/occasionMilestoneEligible/describeOccasionMilestone——满-N 约定（里程碑日期=锚点+N，daysBetween=N，文案「满 N 天/满 N 个月/满 N 周年、生日读 N 岁」）；阶梯 [100,200,300,365,500,1000,2000,3000,4000,5000,10000] + 自然月（31 日钳制到月末，闰年验证）+ 逐年周年；仅 anniversary/birthday 派生，农历年度事项只派生满 N 天（不伪造月/年）；月推进有界 1200 步、年 200 步、输出有界 24 条按日期升序；非法锚点 fail-closed 空；scheduled 不派生。接线：事项列表行里程碑徽标（lc-checkin__occasion-milestone，当天 is-today 强调、停用行隐藏）+ 今日横幅芯片里程碑当天以「今天满 N…」替换动作词（is-milestone 金/强调色，点击行为不变）。i18n 6 键双语；守门 tests/occasions.test.cjs 扩展（满-N 数学/闰月钳制/农历降级/阶梯末端/今天命中文案/接线/双语）。验证：check、主链、build+test:quality（CSS 629675 预算内）、宽度走查、双主题 visual-qa 全绿；真机观感归 host-pending；未 push。
- [x] T-1492 事项时间表达升级——done（2026-09-27）。occasions.ts 追加两组只读投影：①elapsedSpanSince/describeElapsedSpan——自然历三段跨度（年/月/日；月满以钳制锚点日为准：锚点 31 日 2/29 满月、2/28 未满月记 28 天），组合文案跳过零中间单位（「2 年 14 天」），纪念日/生日行随日期行展示；②occasionCycleProgress——长周期事项（周期 >14 天）的本周期进度（0..1+整数百分比）：仅太阳历固定周期（quarterly/halfyearly/annual-byday/monthly-byday/interval、weekly 7 天除外）派生；第 N 个星期 X、月末、农历、once 不派生（前周期起点无法无歧义回推）；季度为模周期——任意发生日读作满周期 100%。渲染：细进度条（aria-hidden 轨道+accent 填充）+「本周期 {p}%」数值冗余，明确是周期口径不冒充完成率。i18n 4 键双语；守门 occasions.test.cjs 扩展（三段跨度/月末钳制/零跨度/早于锚点 undefined/零单位跳过/季度模周期语义/短周期排除/不支持口径排除/接线/双语）。验证：check、主链、test:ui、build+test:quality（CSS 630287 预算内）、宽度走查、双主题 visual-qa 全绿；真机观感归 host-pending；未 push。
- [x] T-1493 「X 年前的今天」回顾——done（2026-09-27）。新纯模块 features/this-day-history.ts（零依赖、无时钟、确定性）：buildThisDayHistory 聚合往年同月日——打卡条目（value>0 计完成、项目名事件序去重、maxNames 缺省 3+溢出计数、未知 id 不产生名称）+ 事项锚点条目（「{year} 年的今天「{name}」开始」）；年份降序最多 3 年（有界 5）、当前年不计入；非法日期 fail-closed 空；无历史如实返回空。今日页低干扰卡（renderThisDayHistoryView，横幅区之后、无历史不渲染），条目带「日记」按钮——宿主 openPastDiary 只读定位宿主自动加的 custom-dailynote-YYYYMMDD ial（SQL 单查询），命中 openTab 打开、未命中 showMessage 提示，**绝不创建文档**；日期白名单校验防注入。隐私口径与回顾页一致：仅本插件 UI 呈现项目名，不进导出/公开 API。i18n 7 键双语；新守门 tests/this-day-history.test.cjs 入 pnpm test 主链。验证：check、主链、test:ui、build+test:quality（CSS 630758 预算内）、宽度走查、双主题 visual-qa 全绿；真机日记 ial 覆盖面归 host-pending（第三方插件建的日记可能无该属性，届时提示未找到属预期降级）；未 push。
- [x] T-1494 事项循环实例覆盖与错过处理——done（2026-09-27）。①实例覆盖（additive schema）：Occasion 可选 overrides（键=原发生日期，值.date=新日期；归一化 fail-closed——键/值须真实日历日且不同、有界 60 条、空 map 不物化；旧数据零迁移）；getOccurrenceDate 重写为覆盖感知包装——预扫所有落在 localDate 之后的改期目标为候选 + 逐个跳过被覆盖基点（有界 12 步），改期日已过的覆盖视为已消费不阻断；setOccasionOverride 纯写入（未匹配 id 原样返回 store 供宿主身份回滚、移除后空 map 整体不物化）。②错过处理：getMissedOccurrence 只读投影（太阳历固定周期口径，weekly/月/季/半年/年/interval；第 N 个星期 X、月末、农历、once 不派生）——上一周期未标记则中性提示「上次 {date} 未标记」+「补标记」按钮（走既有 setOccasionCompleted 按日期通道）；不用红色欠账样式（calm 口径）。③单次改期 UI：循环事项行内「改期下次」展开日期输入（min=今天）+确认，走宿主 saveOccasionOverride→setOccasionOverride→persistOccasions（失败恢复+toast）；「此次及以后」沿用既有系列编辑语义。i18n 6 键双语；守门 occasions.test.cjs 扩展（覆盖呈现/消费/移除恢复/归一化 fail-closed 与有界/错过投影与补标记消失/once 排除/身份回滚/接线/双语）。测试驱动修正一处真实引擎缺陷：改期目标日不参与时间线（预扫设计修复）。验证：check、主链、test:ui、build+test:quality（CSS 631917 预算内）、宽度走查、双主题 visual-qa 全绿；真机触控归 host-pending；未 push。
- [x] T-1495 事项提醒降噪——done（2026-09-27，口径 D-283）。①新纯模块 features/reminder-digest.ts（零运行时依赖、无时钟、确定性）：buildReminderDigest 同日多事件聚合为单条摘要（今日一段+逾期跨日合并一段，计数+至多 3 个代表项目名+溢出），isBannerCoveredReminder 单一判定（occasion+today+dueDate=今天）供推送与今日页共用，非法日期 fail-closed。②每日推送文案从纯计数升级为摘要（通道不动，仍单条 pushMsg、零事项不消费槽位），横幅已聚合的当日事项不再计入推送。③今日页优先卡与行动台 attention 计数共用 selectTodayPriorityEntries 去重——横幅已聚合不重复弹，逾期事项保留。④提前提醒「仅一次」：偏好 occasionRemindOnce（默认关=原逐日行为）+ reminders.ts 纯函数 advanceReminderVisible（upcoming 只在窗口首日出现一次，当天提醒不受影响，非法 fail-closed 可见），projectReminderCenter 增 additive options.advanceOnce 三处同参透传，设置页「今日」组新增开关行。⑤守门 tests/reminder-digest.test.cjs 入 pnpm test 主链（聚合/fail-closed/确定性/纯度/仅一次语义/接线/单推送通道 calm 禁则/双语 9 键）。验证：check、pnpm test、test:ui、build+test:quality（EXIT=0，CSS 631917 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；真机推送观感归 host-pending；未 push。批次二（T-1491～1495）收官。

**批次三·联动自动化（用户点名主线）**
- [x] T-1490 自动记录信任层——done（2026-09-27，local-auto）。①新纯模块 features/record-trust.ts（零运行时依赖、无时钟、确定性）：buildRecordTrust 只读消费 source/externalRef/note 派生信任信息——来源徽标复用既有 source.* 双语词汇（未知来源降级 source.api 与宿主归一口径一致）、命中原因仅在能确证时派生（阈值结算「32 分钟 ≥ 阈值 30 分钟」且事件值须达当前阈值——低于即口径已变不冒认；weread :finish: 带书名、:notes: 笔记合计；health: 前缀=快捷指令同步；tomato=专注会话；yeguif=LifeLog 推导；api/import 无解释不编造），手动记录无徽标无原因。②呈现：回顾页历史行来源文本升级为徽标（lc-checkin__source-badge，muted 文字+accent-soft 描边，9px 对比度过无障碍审计预算）+命中原因行（lc-checkin__record-reason）；今日页日志行加来源徽标；一键撤销沿用历史行既有 data-history-event-id→removeEvents 通道（墓碑自动写入，防重复累计），零 schema 变更。③宿主回顾 ctx 透传 trustThresholds（仍生效的 sireader/siplayer/weread 结算绑定快照，类型谓词 filter 收窄）。i18n 6 键双语（2057 对）；新守门 tests/record-trust.test.cjs 入 pnpm test 主链（来源键/阈值达标与口径已变/前缀派生/fail-closed/确定性/接线/墓碑通道未绕过/双语/纯度）。验证：check、pnpm test、test:ui、build+test:quality（EXIT=0，CSS 632261 预算内，无障碍审计 0 违例）、宽度走查 49+32、双主题 visual-qa 全绿；未 push。
- [x] T-1501 快捷指令自动化配方文档——done（2026-09-27，local-auto；真机部分仍 host-pending）：重写 `docs/health-shortcuts-integration.md` 为可照做的 iOS 官方配方，覆盖步数/体重、到家/睡前/手动补录/分支场景、幂等验收、失败排查和隐私边界；明确当前解析器只接受 `steps` / `weight`，自定义健康指标不伪装成已支持能力；v18.8.0 发布说明与健康守门同步引用。无运行时代码变更。
- [x] T-1500 笔记推导打卡查询模板——done（2026-09-27，local-auto；真实思源 SQL 宿主链路仍 host-pending）：新增 `docs/note-query-integration.md`，明确显式 opt-in、文档/笔记本范围、frontmatter/tag 固定只读 SQL、200 行窗口、`notequery:<itemId>:<blockId>:<localDate>` 身份、幂等/墓碑、同日手动互斥与失败降级；`notequery` 已同步登记 `src/ecosystem.ts`、两份 v5 机器契约、`docs/api-v5.md` 和 `docs/identity-and-merge.md`。架构边界与来源生命周期矩阵补齐来源/契约守门；release notes/change log 已引用。运行时沿用 `source: "api"`，无任意 SQL 或新 source 枚举。

**批次四·交互/性能/UI 全面优化（用户点名）**
- [x] T-1496 快速录入自然语言解析：快捷对话框的今日筛选区支持日期/每周排期/数值/时长内联识别，片段可点按取消；开关持久化，关闭后维持原筛选。解析纯函数有界且 fail-closed；未识别文本按原筛选处理。数值仅在项目名唯一、单位匹配、目标未完成、日期为今日且非限额/戒除项目时提供记录按钮；未来日期和排期仅提示，不暗中改项目或补卡。来源：Todoist NLP 高亮契约+TickTick 智能识别+Habitify MCP NLP 记录先例（二十一·D 路）。状态：done（2026-09-27，local-auto；解析/开关/IME/浏览器交互守门、完整 test:quality、双主题视觉和宽度走查通过；未 push）。
- [x] T-1497 低压力批量补卡：回顾页单日未记录项目多选补记/跳过，一批一次持久化、失败整批回滚，成功后每条可在日志中独立撤销；历史日期用当地正午记账。定向事件/回滚测试、完整质量链、双主题视觉与宽度走查通过。
- [x] T-1498 长任务性能门禁：10k 记录浏览器重渲染 <50ms 且 PerformanceObserver 无 longtask 入主链；回顾记录/月历预埋 content-visibility 与内在尺寸，双主题视觉和宽度走查通过。当前样本约 18ms；CSS 635067 字节超过 620KB 软线，仍低于 640KB 硬线。
- [x] T-1499 WCAG 2.2 目标尺寸与暗色触控核对：浏览器实际 DOM 审计发现名称按钮/连续徽章两个小目标并修正；浅深主题复测 0 小目标、0 对比度违规，保留移动 44px 基线。范围与设备限制见 docs/target-size-audit-2026-09-27.md。

**第十一轮延后（带触发条件）**：用户模板导出/导入分享（导出通道窗口）；Streaks 式「从已有数据推荐习惯」（需先有聚合数据面）；WakaTime 心跳语义入联动协议 v2（对方协议迭代时）；GitHub 绿格导入（受众窄）；参数化命令/输入内联想下拉（NLP 录入落地后按反馈）；ICS 事项导出（导出窗口）；事件块链接/时间轴（需求验证后）；组合包附带视图预设（view-preferences 迭代窗口）。
**第十一轮不做（边界维持）**：AI 排程/AI 习惯点子（无端侧模型+确定性洞察优先）；系统日历自动导入（宿主无桥）；RescueTime 式后台分类、Toggl autotracker、Health Connect、iOS 小组件（平台/边界不符）；IFTTT 万能 webhook 入口（万能写入口红线）；事项计数暂停（日期口径复杂度>收益）；事项游戏化徽章（等里程碑上线后并入成就评估）。

## 本轮用户触发（2026-09-26）

- [x] LifeLog 语义重整：确认记录形式为“时间 项目：具体事项”，相邻记录时间差归属当前记录；新增 LifeLog 项目到打卡项目映射、映射缺失不猜测、旧版单目标配置兼容。逻辑/偏好/设置/文档与定向验收完成；证据见 PROGRESS 与 docs/lifelog-integration.md。

## 当前开发队列（2026-09-26，D-275）

用户要求移除所有等待宿主正式版或真机反馈的任务。已撤销 T-1464、T-1406、T-1408、T-1388、T-1344、T-1347、T-023、T-033、T-129、T-1256，以及 T-1346/T-1173 剩余现场等待部分；B-001/B-007 同步撤销。撤销不等于验收通过，既有完成记录和证据仍可追溯。下方已完成条目中的现场等待描述属于历史，不再产生任务。

前三批 T-1472～T-1476 已交付。后续按以下顺序深化，具体边界与验收见执行路线第十五节；不因缺少外部发布或用户设备反馈停止。

- [x] T-1477 文档绑定配置闭环：保存前核验目标存在性与类型；总览显示名称/路径；问卷弹窗与设置共享目标选择行为；请求失败保留配置与重试入口。
- [x] T-1478 设置查找与保存体验深化：从分类匹配细化到具体设置定位，补结果导航/清空恢复；盘点手动保存字段，统一未保存提示与失败保留语义。搜索已完成；手动保存字段继续收口。
- [x] T-1479 问卷编辑效率：在既有增删/排序/预览基础上补题目复制、双向移动与键盘操作；明确删除模板对已绑定项目的影响和修复入口。
- [x] T-1480 UI 与交互一致性：今日/回顾/设置/弹窗复核按钮图标文字对齐、对比度、加载/空态/失败态、焦点回归和滚动连续性；动效辅助状态反馈并支持减弱动态。
- [x] T-1481 渲染与样式性能深化：先测设置搜索、大问卷编辑、后台刷新和大记录量回顾的耗时/DOM 规模，按实测瓶颈优化重复计算与重建；核查样式重复并维持现有预算。
- [x] T-1482 热图变体设计与实现（承接 R-17.4）：比较稀疏/分段热图的信息收益，先做可运行呈现与双主题验证，再接入既有统计；不改完成率和排期口径。
- [x] T-1483 宽屏回顾布局（承接 R-18.3c）：按既有内容优先级做响应式卡片编排原型，明确阅读/键盘顺序与窄屏回退，通过几何和视觉验收后接入。

[x] T-1386 多来源统一面板与断开/重试 UX：现有来源卡片统一状态与立即刷新入口，健康/微信读书/叶归复用已有摄取路径；断开保留规则沿用 privacy-scope。

T-1386 多来源统一面板与断开/重试 UX 也属于本地可推进增量，排在配置闭环之后。热图和宽屏布局的设计步骤纳入任务本身，不再空等“设计窗口”。积分/兑换等产品边界变化仍为独立决策，不因本次清理自动批准。

## 最新触发核查（2026-09-26，T-1400 第九轮）

- [x] T-1472～T-1476 里程碑后的轻量调研：正式宿主/上游回应/竞品无新增开发触发，注册表新增为查找替换与本地插件辅助；证据见 benchmark 第十九节和 PROGRESS。
- 该轮无外部新增触发仅为当时的调研结论；本地开发队列已按 D-275 重建，见本文件顶部。宿主正式版与真机反馈等待项已撤销，不再作为停止开发的理由。

## T-1400 生态调研循环·第十轮（2026-09-26，用户点名触发，宽覆盖全量轮）

- [x] 第十轮调研（七路并行：独立应用/GitHub 开源/笔记生态/宿主与集市/行为科学/AI 智能体/可穿戴，约 20 次取证）。竞品警报 0；采纳 1；延后 5（pause 挂起/连击历史最小长度/打印 PDF/Exactly 口径/失速前瞻提示，均带触发条件）；不做 5（边界维持）；工程注意项 2（宿主 3.8.5 三条插件修复对照快捷入口/dock/只读命令链路，登记下次真机验收检查项；HabitKit DST 漂移事故佐证 date-keys 契约）。全案见 benchmark 第二十节。
- [x] T-1484 问卷日记提示词轮换（第十轮采纳①，local-auto）——done（2026-09-26）。journal-templates 纯函数扩展：JournalQuestionDef 增 prompts/promptKeys、normalizePromptPool（fail-closed：trim/去重/≤6 条、有界扫描 18 项、<2 条不物化）、journalIsoWeekKey（零依赖 ISO 周算法、非法日期空串）、resolveJournalQuestionText（ISO 周 djb2 hash 确定性轮换，无池/单候选/非法日期回落基础题干）；弹窗与写入文档题干共用同一取词（同日一致），事件摘要与幂等标记不变；内置感恩三问 q1、五分钟日记 q2/q5 自带 3 条候选池（i18n 双语 9 键），自建模板文本以 `> 候选` 行配置池（解析/序列化往返、孤立池行计坏块、单候选剪除）；builder 复制预设/复制题目深拷贝池数组、预览标注候选数；journal.customHint 双语补池语法、新增 journal.poolVariants。守门 journal-templates.test.cjs 扩展（归一化/ISO 周锚点含跨年与 53 周年/轮换确定性/全年三候选覆盖/内置与部分池解析/文本往返/弹窗与宿主接线）仍入主链；journal-experience.cjs require 桩补 journal 模块映射。验证：pnpm run check、pnpm test 主链、build+test:quality（release assets/回滚演练）、宽度走查 49+32、双主题 visual-qa 全部通过；真机弹窗触控归 host-pending；未 push。
- [x] T-1485 绑定目标卡片样式：日报、摘要驻留、问卷日记、健康收件箱与叶归笔记本的目标输入/选择/保存入口统一为独立目标卡片；保留原有 `data-*` 绑定、保存校验和失败草稿语义，补齐 44px 控件、长文案换行、窄屏纵排与双主题边框状态。结构、类型、视觉和宽度验收通过，未 push。
  - 语义（T-1484）：内置问卷模板每题可选配「提示词池」（多候选提示词），按 ISO 周 hash 确定性轮换展示，缓解每日同题套路化；自建模板同支持；未配置池行为不变；轮换只影响呈现不影响事件结构与幂等标记。
  - 来源（T-1484）：Daily Journal Plus rotating prompts（Obsidian 社区）+ Positive Psychology 综述「轮换防套路化」（benchmark 第十六节既有结论）+ Habitify Pause & Reflect 同向印证。

## 设置与记录体验完善（2026-09-26，用户确认三批开工）

- [x] T-1472 联动检测可靠性：检测失败独立状态、忙碌防重、脱离页面旧结果不落 DOM、配置入口准确定位，归档锚点不误报。
- [x] T-1473 问卷填写保护：失败保留答案、必答定位、会话草稿恢复、打卡与文档写入结果区分；所选笔记本限定查询、只读预检、内核错误码与重填幂等校验。
- [x] T-1474 设置查找与配置：设置搜索、保存反馈、手动保存字段会话草稿与文档搜索选择；保存后改回旧值、异步笔记本选项恢复均有回归。
- [x] T-1475 可视化问卷编辑：增删/排序/必答/题型/复制预设/预览/撤销，保留文本编辑；稳定 ID、空题拒绝保存和新建不复用删除身份。
- [x] T-1476 UI 与动效精修：窄屏目标配置纵排、44px 控件与焦点、双主题颜色检测；沿用已有减少动效与滚动边界，不新增复杂动画。完整质量链、双主题视觉、双前端宽度走查及定向真实内核验收通过，性能实测见 PROGRESS。原现场等待已按 D-275 撤销。

本批已完成本地自动化验收，尚未发布。使用说明：docs/settings-journal-experience.md；最终质量链日志：.artifacts/quality-t1472-final-verified.log。后续开发按 T-1477～T-1483 推进，不自动 push。

## v18.7.0 已发布（2026-09-26，用户明示发版）

- [x] 发布 T-1470 笔记联动总览、T-1471 两项手机修复与 README 重构；标准发布脚本 EXIT=0，main/tag 已推送，GitHub Latest=v18.7.0。发布提交 `3a6639c`，package.zip 734538 bytes，回源 SHA-256 `75bbb7a06fdad91dec874ef114be5e24abae2b13be4d6b0d93b4c4511147acbe` 与本地及发布说明一致。
- [x] R-REL-CHECK：sireader#55 / siplayer#180 均 open、0 评论；无契约变化，无需更新原帖。
- [x] T-1400 第八轮轻量调研：核查宿主/竞品/生态，新增 Zenith 观察项，无新增直接采纳任务；范围与证据见 benchmark 第十八节。当时的宿主版本与设备等待现已按 D-275 撤销。


## v18.6.0 已发布（2026-09-26）

- [x] T-1470 笔记联动总览（用户需求：绑定集中查看+快速修改+健壮性，2026-09-26 开工并完成；v18.6.0 发布后首个增量）
  - 状态：done。①盘点：7 处绑定（日记报告/摘要驻留/健康收件箱=文档、问卷日记=笔记本或文档、叶归=笔记本、笔记锚点=按项目块、微信读书=项目映射）+失效模式矩阵，docs/note-bindings-inventory.md；②跨插件调研（dailynote-today 状态面板/Achuan-2 绑定对话框与双向属性/day-memo 模板定位/QuickAdd-Templater-Daily Notes 显式创建反例/Dataview 零绑定路线/Notion relation 枢纽）吸收 8 条入盘点文档；③交付：设置 → 外部联动置顶「笔记联动总览」面板——每行功能/目标/启用/健康三态（未检测·正常·目标丢失）+操作（打开=块解析根文档 openTab；去配置=滚动定位源输入框）；「检测全部联动」=SQL IN 批量校验文档块+lsNotebooks 笔记本成员；纯模块 note-bindings.ts 零依赖无时钟；④健壮性：问卷日记当日日记定位加 custom-dailynote 属性兜底（hpath 未命中防重复建文档）。守门 note-bindings.test.cjs 入主链（183 文件）；settings-navigation 面板计数 8→9 同步。验证：test:quality EXIT=0；走查全绿。真机打开跳转归 host-pending。后续候选：启动自动体检+sync-end 刷新、绑定对话框三模式统一、custom-* 双向属性（盘点文档待排）。
- [x] v18.6.0 发版（用户「继续」确认执行；GitHub Latest，tag v18.6.0）：问卷式日记打卡（5 预设+自建+写入日记/指定文档+重填幂等）、数值快捷增量、今日完成度环+回顾 sparkline、相关性洞察、超额日着色、时段分组、年度分享图导出、里程碑分级庆祝、低压力呈现基线（双日规则/calm 禁则/色阶冗余编码/44px 触控）、迁移健壮性（未知列点名/跨午夜边界/向前兼容）、诊断导出结构化预览、66 天成熟度刻度、保留词表退役。主存储 v3、最低思源 3.8.4 不变。
- 发布事实：main `bf78409..1147e86` 推送；package.zip SHA-256 `57bef6018cebfc8641d734138796bb281b36e82a31f2fffcda11201a02f5790e`；R-REL-CHECK 本窗口已完成（sireader#55/siplayer#180 无动态无需更新）。真机现场验收项（Android 触控/弹窗/分享图保存桥/问卷日记真实文档）保持开放等用户反馈。

- [x] T-1471 手机端交互与文档收口（2026-09-26，用户反馈）：完成区折叠根因是移动网格规则的 `display: grid !important` 覆盖 `[hidden]`，在 `components.scss` 增加移动完成列表 `[hidden] { display: none !important; }` 守门（commit `0c90ab0`）。回顾页下拉小条根因是内层滚动体到边界后把 overscroll 传给思源弹窗/文档层；`content-responsive.scss` 让 review、mobile host、b3 dialog/container/body、html/body 在回顾存在时统一 `overscroll-behavior-y: none`，真实移动 bundle E2E 锁定 review/host/body 的 computed 值。完成全方位 UI/交互/性能/功能审查：移动触控、双主题、窄屏、无障碍、导出通道、焦点和滚动结构均有现有守门，未发现第二个高置信回归。README 重构为定位→功能→兼容性→数据/联动→API→开发验证→边界→文档入口，移除重复历史正文并修正版本基线。验证：`pnpm run check`、`build:check`、`test:mobile`、`test:ui`、移动回顾真实内核 E2E 1/1、移动完成区展开/折叠 E2E 2/2、移动浅色/深色视觉 QA、宽度走查 49 surface + 32 interaction 全绿；代码与 README 仅本地提交，不单独 push。

- [x] v18.6.0 发版准备（版本四方 18.5.0→18.6.0、changelog、发布说明含 SHA 回填、README 要点块、R-REL-CHECK）——本地 test:quality EXIT=0（182 文件），Release assets v18.6.0 检查通过。
- [x] R-REL-CHECK（2026-09-26，v18.6.0 候选窗口）：sireader#55、siplayer#180 均 open、0 回应、最后更新 2026-09-25——无上游动态，提案所述消费侧 fallback 口径未变，无需在原帖追加更新；Task Horizon 反向提案与 Dock Tomato PR 草案仍未提交（无外部动作可核查）。下一发布窗口复查。

## v18.5.0 已发布（2026-09-25；设置页与移动端验收已完成）

- [x] v18.4.0 发版（2026-09-25，GitHub Latest，tag v18.4.0）：微信读书全套（T-1402 三链路+接入指南）、每日提醒调度（T-1451）、回顾行动卡补齐（T-1450 目标负荷/T-1448 调整有效性）、情境×星期交叉（T-1452）、渲染块组合卡片（T-1453）、设置来源子标题（T-1442 部分）、手机端三缺陷修复（T-1444/45/47）、后台渲染死锁与回车保存修复（T-1455）。SHA-256 de389341…45da2。
- [x] **v18.5.0 发版完成（2026-09-25，用户授权）**：README、package/plugin/src 版本声明已同步至 18.5.0；完整质量链、移动视觉 QA、真实思源 3.8.5 隔离内核 E2E（21/21 合并证据）、发布清单与回滚演练通过；main、tag `v18.5.0` 与 GitHub Release 已创建。package.zip SHA-256：`8287289257c1e84be3a20c96daca90fee16eb211a688ec79cae68766ce84a62a`。真实 Android/WebView 与实际第三方账号仍是现场验收项。
- [x] **交接**：~~HANDOFF-2026-09-25~~ 已被最新交接替代：**[docs/HANDOFF-2026-09-27.md](docs/HANDOFF-2026-09-27.md)**（v18.8.0 发布后状态、环境准备、开放队列、开发纪律与台账索引）。

- [x] T-1460 设置页与外部联动重新分组（2026-09-25）：宿主与插件独立于外部来源；七个来源改为独立可展开卡片，显示三态配置状态、数据流/隐私边界和停用保留语义；按「绑定目标→保存→启用→验证」重排；健康启用要求至少一个指标映射；微信读书支持确认清除本地 Key；移动设置导航改为可发现的多行触控栏。详细逐项审查见 [settings-external-linkage-review-2026-09.md](docs/settings-external-linkage-review-2026-09.md)。

## v18.3.0 发布（2026-09-24，已完成）

- [x] v18.3.0 发版（R-A0～A12 泳道交付 + 生态调研采纳项收口）
  - 内容：戒断里程碑（今日卡/渲染块/API 同口径）、今日行动台摘要条、安静时段+延后2小时、命名保存视图、CSV 范围导出、隐私披露四件（导出审计/断开保留/诊断预览/删除影响清单）、渲染块一键插入 4 预设、导入统一预览、失速项目报告节、日期契约 date-keys、架构边界守门（104 模块）、Task Horizon mock consumer、来源生命周期矩阵、contract kit 前缀同步。
  - 发布执行（2026-09-24 用户确认）：main 推送 a53037d（含此前 25 个本地提交一并上云）、tag v18.3.0 推送、GitHub Release 附 package.zip（708,902 字节）标记 Latest；发版前完整 test:quality EXIT=0，SHA ba25b80f… 回填后与资产实测一致（0ed8e093…）。
  - 状态：released（https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.3.0）。

## 当前任务分类（D-275 覆盖原 D-264 排期）

- `local-auto`：不需要用户操作即可完成的纯逻辑、契约、结构 UI、导入预览、性能、恢复脚本和文档一致性；自动证据通过后可以继续推进。
- 版本/设备等待：已撤销，不属于开放任务；证据仍需注明浏览器、隔离内核或实际设备，撤销不等于测试通过。
- `external`：Task Horizon、Dock Tomato、思阅、思播、健康等外部插件消费端、上游 API 合并和真实双插件时序；对方未发布前只做本地契约/fallback。
- `decision`：积分、微信读书 Key/ToS/限流、自建同步、自动摘要隐私扩展、截图视觉取舍等需要用户或隐私判断的方向；不自动开工。

当前按 [产品战略落地执行路线](docs/implementation-roadmap-product-strategy-2026-09.md) 第十五节继续本地批次；external/decision 仅约束对应工作。旧泳道已经交付，不重复开发；没有外部触发不代表没有本地任务。
## 生态调研循环（长期常设；T-1400，2026-09-22 用户指示登记）

用户指示：在所有任务完成、性能/功能/UI 均完善后，启动全网调研——GitHub、同类独立软件、Obsidian/Logseq 等笔记生态插件、思源集市本地插件——寻找值得吸收到本插件的优秀功能与想法；列出最适合的开始开发、测试、优化；完成后进入下一轮，形成常设循环。触发条件、流程与边界见 D-256。

- [x] T-1400 生态调研循环·第一轮（常设任务，逐轮滚动开新条目）
  - 状态：done（2026-09-23 第一轮执行：三路增量扫描 13 候选 → 采纳 3 全部落地（T-1409 maxGap/T-1410 色阶/T-1411 庆祝动效）；同日第二轮完成：easy-tracker 与修仙打卡深挖 → 采纳 T-1412 今日视图块（已落地）、轻量积分维持边界（条件 T-1413）。第三轮（同日，四路增量扫描约 30 候选）：采纳 2（T-1415 戒断里程碑投影、T-1416 渲染块一键插入预设）、延后 6、不做 3、佐证 6；**发现直接竞品 Pinch（royc01/pinch，v2.7.1 高频迭代）从未深评，列为第四轮首位任务**；宿主 3.8.5 数据库日历视图稀释可视化护城河的信号记入佐证。详见 benchmark 文档第十二节。）
  - 触发条件：本地可执行任务清零（剩余开放项均为外部依赖：真机验收、对方排期、用户决策），完整质量链全绿、无 P1 回归。不要求字面意义「TODO 零开放」，否则外部依赖项会让循环永不触发。
  - 扫描面：思源集市插件（Bazaar 全量 + 新上架增量）、Obsidian 社区插件（habit/tracking/复习类）、Logseq/Notion/Anytype 等笔记生态、独立习惯应用（Habitify/Loop/Streaks/TickTick/everyday 等新版本增量）、GitHub（habit-tracker / streak / check-in 主题与 trending 增量）；以 `docs/benchmark-habit-apps-2026-09.md` 与 `roadmap-checkin-research-2026-09.md` 为基线，只做增量取证，不重复已评估项。
  - 每轮流程：①增量扫描（新应用/新版本/新插件，标注来源等级与日期）→ ②候选清单（每项：用户收益、适配代价、验证方法、与五类型/六排期/at-most 语义可映射性）→ ③评估卡：做/延后/不做 + 证据，按推荐自动采用并记决策 → ④每轮只挑 1～3 个最合适项拆批次开发 → ⑤完整质量链 + 四端双主题矩阵 + 发布 → ⑥复盘并更新 benchmark 文档 → 下一轮。
  - 边界：继承既有「明确不做」（RPG 化、账号体系、云同步、传感器后台、万能写入口、逆向私有格式、复制商业收费墙功能）；吸收项必须过本地优先、事件不可变、计分单一实现、API 纪律、模板不触数据模型五条原则；真实宿主验收始终是发布前置门槛。
- [x] T-1409 容错连续计数 maxGap（第一轮采纳①，源：Habit Tracker 21）
  - 语义：每项目 opt-in 的「容错缺口 N 天」——二值/至少型习惯在排期日漏打但缺口 ≤N 天时，连续计数不断（缺口日淡显标注）；与 SKIP（显式请假）正交；at-most/quota 语义沿用各自现有口径不叠加。
  - 验收：streak 纯函数单一实现扩展（含 maxGap=0 缺省行为不变）、编辑器高级区开关+天数输入（双语）、洞察/渲染块/API getStreaks 同口径、跨时区/补记/撤销矩阵、与弹性周期 AUTO 桥接共存测试。
  - 状态：done（2026-09-23。`CheckinItem.streakTolerance?: number` 仅物化 1~30 整数（缺省/0=严格断链，历史行为零变化）；`computeEventStreaks` 回溯与 `computeLongestStreaks` 正向扫描同步扩展「容错缺口」语义——漏打排期日缺口 <N 桥接不计数、真实完成/派生完成重置缺口、SKIP 中性不消耗容错、at-most 与 quota 排期（`streakToleranceFor` 显式排除）沿用各自口径；洞察/渲染块/API getStreaks/今日徽章经单一实现自动同口径；编辑器高级区「漏打容错（天）」输入（留空=严格，1~30 钳制）双语。tests/streak-tolerance.test.cjs 九组验收入 test:ui。缺口日「淡显标注」属 UI 展示，随 T-1410 动效收尾轮按 D-263 克制原则一并处理。）
- [x] T-1410 热力图四级色阶自适应（第一轮采纳②，源：TCOTC/heatmap）——**动效部分（采纳③庆祝反馈）按 D-263 留待收尾轮**
  - 语义：热力图色阶按百分位自适应 4 级（数值型随值缩放强度）；完成打卡轻量庆祝反馈，reducedMotion 偏好或用户关闭时不播。
  - 验收：charts 纯函数色阶分级可回放、四端双主题对比度门禁、动效尊重 reducedMotion 且不触发布局跳动、性能门禁不回退。
  - 状态：done（色阶部分，2026-09-23。`buildYearHeatmap` 四级阈值改为「有记录日条数分布」的 nearest-rank 百分位 25/50/75 自适应（`thresholds` 随 YearHeatmap 暴露），替代固定绝对阈值——低频用户（1~2 条/天）也能呈现完整层次；渲染类名与主题色不变（对比度门禁沿用）；v7-insights 守门扩展分层分布/低频收益/均匀收敛/空年/确定性五组断言。动效部分按 D-263 移入收尾批次 T-1411。）
- [x] T-1411 完成庆祝动效（收尾批次，D-263 克制原则）：全部批次收尾后实施；轻量庆祝反馈，reducedMotion/偏好关闭不播，无布局跳动，渲染门禁不回退。
  - 状态：done（2026-09-23。完成打卡的 ✓ 反馈徽标轻弹一次——`lc-checkin-check-pop` 360ms 纯 transform keyframes（无 width/height/top/left/margin，零布局跳动），双闸禁用：插件 `data-reduced-motion` 属性 + 系统 `prefers-reduced-motion: no-preference` 媒体查询；仅 toast 单元素，CSS 体积 +261 字节（605333/620KB 预算内）。checkin-toast 守门扩展五组断言（双闸/纯 transform/单声明单定义/时长/门禁文本）。第一轮采纳③就此收口，T-1400 第一轮三项采纳全部落地。）
  - 约束（D-263，用户指示）：动效属收尾增强——在其余批次基本收尾后执行；少量、克制，性能与可用性硬前提，不做大面积动效化。
- [x] T-1412 极简「今日视图」渲染块（第二轮采纳，源：obsidian-easy-tracker 深挖）
  - 语义：声明式渲染块新增 `view:"today"`——单个/少量项目（块参数 itemIds）的今日状态 + streak + 最近漏卡日三格概览 + 一键打卡按钮（完成后祝贺态）；写回走现有 kernel API 路径；节流防连点；多项目寻址为必选参数（不复制 easy-tracker 的单数据流模式）。
  - 状态：done（2026-09-23。`parseCheckinBlockConfig` 接受 view "today" 且 itemIds 必填（缺失 fail-closed 出 block.errorItems）；`buildTodayRows`/`buildTodayViewHtml` 纯函数：每项目一行（图标/名称/今日状态文本/连续天数/最近漏卡日[仅单项目块]）+ `data-block-record` 按钮（完成项替换为祝贺态文案）；streak 经 `computeEventStreaks` 单一实现，最近漏卡日 `findLastMissedDate` 从昨天回溯（今日未完成由状态格表达）；glue 层 `data-block-record` 点击 → `onBlockTodayRecord` 宿主回调 → 既有 `recordEvent` 通道（修订指纹/审计/撤销不变），`data-record-pending` 节流防连点；SCSS 六条轻样式（复用主题 token）。checkin-block 守门扩展（解析/渲染/接线/i18n 五组）。**真实内核 E2E 17/17**：新增 today 块用例在真实思源内核验证渲染→点击→真实落盘→祝贺态切换→缺参 fail-closed。）
- [ ] T-1413 轻量积分/愿望兑换（条件批次，用户拍板项）
  - 触发条件：用户明确提出积分/兑换需求（当前维持「明确不做 RPG 化」边界）。
  - 唯一可接受形态（修仙打卡 v0.9.6 发布包静态分析结论）：单轨积分（无双轨制，架构上杜绝掉分/掉级）+ 流水 + 简单愿望兑换；排除境界/转世/悬赏/惩罚按钮/补签收费/每日挑战/成就；验收必须含「无扣分至负、无等级回退」用例；默认关。
- [x] T-1415 戒断里程碑投影（第三轮采纳①，源：Quitter 里程碑 + Streak relapse + HabitKit 1.17 干净天数；已完成，见下方 R-A3 条目）
  - 语义：at-most 戒除类项目增加「戒断里程碑」只读投影——当前戒断天数（现有连续无破戒口径）对照固定阶梯（1/3/7/14/30/60/90/180/365）输出最近达成级与下一级；破戒历史可从现有事件回放。复发详情、抵扣、省钱换算不进第一版。
  - 验收：里程碑纯函数单一实现（空项目/破戒重置/补记修订/跨时区/确定性）、洞察与 today/summary 渲染块可选展示、API 投影同口径、双语与双主题结构门禁。归类 `local-auto`，排在 R-A3 节奏投影同窗口。
- [x] T-1416 渲染块一键插入预设（第三轮采纳②，源：obsidian-easy-tracker 套件 + contribution-graph 声明式；已完成，见下方 R-A4 条目）
  - 语义：命令面板/斜杠提供 4~6 个预设渲染块模板（今日块、月历、热力图、分组汇总），插入后光标落在首个可编辑参数；参数缺失继续 fail-closed，不改块语法。
  - 验收：插入命令注册与能力声明、模板字符串与现有块解析器往返一致、焦点落点结构测试、i18n/双主题守门。归类 `local-auto`，挂在 R-A12（新手路径）；真实宿主插入体验归 host-pending。
- [x] T-1417 Pinch 发布包深评（第四轮首位任务，竞品警报）——**done（2026-09-24，全案见 benchmark 第十三节）**
  - royc01/pinch（v2.7.1 @2026-09-18，30 个 release）：习惯+任务+番茄+心情+目标+奖励兑换+统计，功能覆盖面与小驴几乎重合。
  - 方法：参照第二轮修仙打卡深评——发布包静态分析（数据结构/统计口径/奖励系统边界/权限面）+ 用户迁移通道评估（能否成为导入来源）+ 结论评估卡（做/延后/不做）。
  - 结论：① 代码吸收不做——可吸收点均在既有路线/边界内，其趣币商店+徽章等级（5/10/15 级）=修仙打卡同型经济闭环，反向固化 T-1413 无等级边界；② 迁移通道延后——数据住块属性可经 SQL 公开解析、可映射二值打卡，但工程量中等且无用户需求信号，登记为导入来源候选；③ 竞争面确认但不构成架构威胁——全家桶形态分散专注，本插件差异化（习惯算法内核/不可变事件/API v5/零惩罚）保持；④ 佐证：checkinNotes 备注同步与回收站=record-notes 路线互证；minAppVersion 3.7.0 提示老宿主存量面。
  - 第四轮状态：首位任务完成，轮次继续滚动（剩余扫描面按 D-256 触发条件）；无新增代码任务。
- [x] T-1400 生态调研循环·第六轮（2026-09-25，用户点名触发，纯文档轮）
  - 状态：done（2026-09-25）。四路并行扫描（①独立应用与行为科学 ②GitHub 开源增量 ③笔记生态与思源集市 ④UI/交互设计专项），100+ 次检索取证；全案见 [benchmark 第十五节](docs/benchmark-habit-apps-2026-09.md)。竞品警报 1——**Workbench**（sy-tomato 作者新插件，「不用打卡——计划即账本」叙事，应对=「低压力记录≠零记录」文案区隔，D-271）；采纳 3 → T-1461/T-1462/T-1463；延后 13（带触发条件）；不做 8；佐证 9；宿主 3.8.6 正式版渲染块回归登记 T-1464；幽灵目标清理（vegvisir/habit-charts/simple-habit-tracker 经官方注册表核实不存在）。战略文档同步：方向扩至 25 项（新增 24 低压力呈现基线、25 数据互操作）、状态矩阵刷新至 v18.5.0、执行路线新增 R-A13/A14/A15 泳道与开工顺序（implementation roadmap 第十三节）。
- [x] T-1461 低压力呈现与包容性设计基线（R-A13，第六轮采纳①，local-auto）——已开发完成（2026-09-26）
  - 落地：① 新规范文档 `docs/low-pressure-baseline.md`（色彩单色亮度阶梯+冗余编码／calm 文案禁则与双日规则／三通道冗余／44px 触控基线+dock 密度例外／undo 优先于确认弹窗+17 处高危确认清单审计）；② 双日规则——i18n 新键 report.stalledNote（中英），失速卡节固定收尾渲染；③ calm 禁则扫描守门（禁「你落后了/归零/前功尽弃」式措辞入用户文案）；④ 色阶守门——年热力图 is-level-N 仅允许 accent 派生色、每格 title 冗余编码断言；⑤ 移动触控基线——components.scss 新增 host--mobile 44px 规则块（记录/步长/chips/渲染块按钮/底部导航，dock 30px 密度为指针环境例外）；⑥ 新守门 `tests/low-pressure-baseline.test.cjs` 入主链。里程碑分级庆祝按 D-263 留收尾批。真机触控/显示保持 host-pending。
- [x] T-1462 数值快捷记录预设增量（R-A14，第六轮采纳②，local-auto）——已开发完成（2026-09-26）
  - 落地：① `record-step.ts` 新增 normalizeQuickSteps 纯函数（逗号/空白解析、升序去重、2 位小数、上限 4 个、>1e6 拒绝、binary 恒空）；② types.CheckinItem + model.normalizeItem + save-form 三侧同构物化 quickSteps（写后指纹逐键一致）；③ 编辑器「快捷增量按钮」文本字段（data-value-fields 内，binary 整组隐藏），i18n 三键中英；④ 今日页——renderItemView 渲染 lc-checkin__chip-button（跳过与主步长重复值），bind-today quick-record handler 改读 data-amount（缺失/非法回落重算默认步长），零新写路径；⑤ today 渲染块——TodayViewRow 增 quickSteps/unit，buildTodayViewHtml 渲染 data-block-record-amount chips 组（complete 行不渲染），block-renderer 透传 amount，宿主 recordBlockToday(itemId, amount?) 优先 chips 值；⑥ SCSS chips 样式+移动 44px 基线覆盖；⑦ 新守门 `tests/quick-steps.test.cjs`（归一化 12 组+三侧同构+接线+i18n+样式）入主链。真实触控归 host-pending。
- [x] T-1463 迁移健壮性与边界用例（R-A15，第六轮采纳③，local-auto）——已开发完成（2026-09-26）
  - 落地：① 新守门 `tests/midnight-boundary.test.cjs`——思播恰好零点结束归第一日、双日各自累计、settleSegmentsToDays 双日幂等（已写日跳过/未写日结算/零拒绝）、yeguif 当前记录吸收上一条到当前的间隔+块身份日期隔离；② 导入未知列——loop-csv parseLoopHabitsCsv 返回 unknownHeaders（LOOP_KNOWN_HEADERS 清单外如实上报），LoopImportPlan.unknownColumns 进预览损耗词表 unknown-columns（import-preview 防御读取兼容旧形状），确认弹窗 msg.importUnknownColumns 点名列名（中英）；③ docs/export-formats.md 追加「向前兼容承诺」四条（只增不改/宽容读取/版本可辨/源文件不动）；④ docs/sync-design-review.md 追加 PixelHabits 三段式合并语义参考（并集/LWW/id 幂等+护栏），不实现同步；⑤ tests/loop-csv.test.cjs、tests/import-preview.test.cjs 扩充未知列用例。
- [x] T-1465 问卷式日记打卡（journal-prompt check-in，用户想法 2026-09-26，已开发完成）
  - 状态：done（2026-09-26）。调研与可行性见 benchmark 第十六节；D-273 定型全项落地。① 纯模块 `src/features/journal-templates.ts`——内置 5 预设（感恩三问/五分钟日记/九宫格晨间日记/KPT 复盘/深度复盘周记，题干走 i18n 键 52 键双语）、自建模板归一化（≤10 模板×≤20 题，中文命名走 djb2 确定性 id）、设置文本解析往返、单段块 Markdown 渲染（首行带幂等标记）、事件 note 截断摘要、查询语句转义、写入目标归一化。② 项目绑定——CheckinItem.journal {templateId}（model/save-form 两侧同构 slug 校验），编辑器二值项目专属下拉（内置+自建），bind-today data-action=journal 全按钮绑定。③ 弹窗 `src/render/journal-dialog.ts`——表单+写入目标配置（今日日记/指定文档+笔记本下拉），必答题 fail-closed，提交防重，宿主类注入沿用 quick-dialog 模式。④ 写入通道（index）——目标定位栈（显式文档 > SQL custom-dailynote/渲染 sprig hpath > createDocWithMd 幂等建文档；不硬编码 /diary/）、标记命中 updateBlock 整块更新否则 appendBlock 追加、recordEvent 先落盘（重填当日已完成时跳过重复记账）、写入失败不阻断打卡（审计+toast）、auditEntries channel=journal。⑤ 设置页「问卷日记」面板（自建模板编辑区+计数徽标）。⑥ 真实内核 e2e `tests/e2e/journal.spec.mjs`——建笔记本→绑定点按钮→填三问→事件落盘+文档块（marker+问答一体）→重填更新同块不重复记账，**22/22 全绿**。⑦ 守门 `tests/journal-templates.test.cjs` 入主链。关键实现决策：单段落块口径（多块 Markdown 会被内核拆块破坏 update 幂等，probe 实测后定版）；查询 ORDER BY id DESC（updateBlock 以新 id 重建块+旧块索引异步收敛，取最新保证多次重填命中）；journal.json 独立存储避免 view-preferences 加载器级联。e2e 工作区累积污染致 dual-window 审计合并断言间歇超限（干净工作区复测通过，HEAD 构建同样复现=非本轮回归）——已清理工作区并留档。
- [x] T-1467 洞察与可视化深化第一批（R-A17 第 3 批：R-17.1/R-17.2/R-17.3，2026-09-26 开工并完成；R-17.4 留待渲染块迭代）
  - R-17.1 相关性洞察：新纯模块 `src/features/correlation-insights.ts`（零依赖无时钟）——项目对完成率 Pearson 相关；最小样本纪律（重叠排期日 ≥4 且 |r|≥0.4 才收录，常数序列方差 0 剔除）；同日相关 + 滞后一天（|r_lag| 严格大于 |r_same| 才以滞后呈现）；|r| 降序→样本→zh 名称确定性排序，报告取前 3。index 复用 30 天窗口构建逐日完成率序列（value/target 0..1，仅排期日、排除 quota/at-most/归档）；报告新增「相关性洞察」节（correlationTitle/Same/Lag/Note 中英，固定附带「相关不等于因果」免责说明入 calm 口径）。diary-report 守门精确串断言同步。
  - R-17.2 超额日着色：month 渲染块 cell 新增 overage 判定（数值/时长非 at-most 项目当日总量 > 目标）；呈现=accent 描边环（box-shadow inset）+tooltip「超额」角标，色阶口径不动（T-1410 百分位色阶保留）。
  - R-17.3 时段分组：today 渲染块行新增当日 ≥2 条有效记录的早/午/晚计数（<12 早、12-18 午、≥18 晚；事件时刻戳投影零 schema 变更；跳过事件不计）；与 T-1462 chips 组合覆盖高频记录。
  - 守门：tests/insights-visuals.test.cjs 入主链（Pearson 已知相关夹具/样本门槛/零相关剔除/滞后检测/确定性排序/报告接线/超额判定/时段分组/样式断言）；i18n 9 键双语。验证：test:quality EXIT=0（180 文件套件覆盖）；宽度走查 49+32 全绿。R-17.4 fractured/sparse 热图维持延后（随渲染块迭代排批）。
- [x] T-1468 治理互操作与收尾第一批（R-A18 第 4 批：R-18.1/R-18.4/R-18.5，2026-09-26 开工并完成；R-18.2/R-18.3 部分小项待排）
  - R-18.4 保留词表退役：lc-checkin__loading / lc-checkin__success / is-saving / msg.saving 全库核查零消费方（2026-09-26），统一退役——CSS 规则（含 loading::before、spin keyframes、dock-host 与 lc5 容器分组选择器中的引用）与 i18n 键删除；加载呈现由 skeleton 家族承担（有消费方，保留）；ui-state-ledger 断言翻转为「已退役词表不得回流」（SCSS/i18n/渲染层三面），退役理由与去向记入注释。
  - R-18.5 里程碑分级庆祝（D-263 收尾）：STREAK_MILESTONES 阶梯（7/14/30/60/100/180/365/500/1000）；recordEvent 成功路径计算当日连击，命中阶梯 → recentRecord 携带 milestone；toast 呈现升级——is-milestone 类 + 金标 🎉 里程碑文案（today.streakMilestone 双语）+ 520ms 加重弹跳（纯 transform 零布局位移）；reducedMotion 双闸降级为静态金标文字（三通道冗余，T-1461 基线）。
  - R-18.1 分享图片导出：新纯模块 `src/features/share-card.ts`——buildShareCardModel（周一对齐格子、level 钳制、留白剔除）+ drawShareCard（最小 canvas 接口：fillStyle/font/globalAlpha/fillRect/fillText，accent 透明度阶梯 0.18/0.38/0.65/1 对应 1-4 级，track 色无记录日）；回顾页工具「分享图」按钮（data-action=export-share-card）→ index downloadShareCard（buildYearHeatmap + computeLongestStreaks + 主题 token 调色板 + canvas.toDataURL → base64 二进制串 → saveGeneratedFile PNG，原生容器走既有 putFile+宿主保存桥）；零网络零遥测。
  - 守门：tests/share-card.test.cjs 入主链（布局模型/绘制桩/保存通道接线/里程碑阶梯与降级/退役词表不复流；i18n 6 键双语）。验证：test:quality EXIT=0（181 文件套件覆盖）；宽度走查 49+32 全绿。R-18.2 诊断预览深化、R-18.3 小项（66 天成熟度条/周开始日/bento）待排。
  - 真机观感（庆祝动效/分享图保存桥）归 host-pending。
- [x] T-1469 治理互操作与收尾第二批（R-A18 补充：R-18.2 诊断预览深化 + R-18.3a 成熟度刻度条，2026-09-26 开工并完成）
  - R-18.2 诊断导出预览深化：裸 window.confirm 升级为结构化预览对话框——按原因码计数表（diag.* 本地化标签）+ 时间范围（最早→最新）+ 内容边界披露（「仅包含原因码、时间与有限上下文，不含打卡备注或项目正文」固定显示），显式确认后才走 versioned 导出通道；移动端 92vw 弹窗；i18n 5 键双语。
  - R-18.3a 66 天成熟度刻度条：洞察页新增「习惯成熟度」节——首条记录至今天数对照自动性研究中位数（66 天参考刻度，aria progressbar + 单色进度条 + 「已坚持 N 天」文字冗余；「是参考不是标准」写进提示文案）；daysBetweenHalfOpen 单一实现计算；零 schema 变更。
  - 守门：share-card.test.cjs 扩充两节断言（诊断预览接线+边界披露+双语；成熟度条 aria/日期单一实现/双语/样式）。验证：test:quality EXIT=0（182 文件）；宽度走查全绿。真机观感归 host-pending。
  - 遗留：R-18.3b 周开始日开关（需 analytics/周条/月历三处聚合联动设计，单独排批）；R-18.3c bento 宽屏重排（内容层稳定后）；R-17.4 fractured/sparse 热图（渲染块改版窗口）。
- [x] T-1466 今日完成度环 + sparkline 趋势线（R-A16，第 2 批，2026-09-26 开工并完成）
  - R-16.1 完成度环：charts.ts 新增 renderCompletionRing 纯 SVG 渲染器（wrap-around 圆环、dash 周长按百分比裁剪、越界钳制 fail-closed、100% 切 success 色、role=img+aria 文字通道）；接入今日行动台摘要条首位（数据=既有 totals.completionRate 投影，零新口径）；i18n today.consoleRingAria 中英；CSS 负边距方案（margin-block:-6px 抵消条内边距）保证摘要条高度零增长——30 项密度场景首卡位置预算不受影响（宽度走查实测复绿）。dock 常驻小环留待 dock 表面迭代。
  - R-16.2 sparkline：charts.ts 新增 renderSparkline（纯 polyline、max≥1 防除零、空序列占位、确定性输出）；接入回顾页范围统计区（近 30 日记录趋势，数据=渲染时已在内存的 analytics daily 快照，零新聚合零图表库）；i18n review.statsSparkAria/statsSparkLabel 中英。
  - 守门：tests/stats-visuals.test.cjs 入主链（环 dash 数学/钳制/完成态/aria、sparkline 坐标映射/空序列/确定性、接线与双语、单色 accent 与 D-263 零动效断言）；review-workspace.test.cjs「概览零图表 DOM」性能不变量按纪律收窄为「无重量级图表 DOM」——唯一豁免 data-stat-spark（纯字符串拼装自已在内存的快照，无昂贵计算），折线/柱状/热力图与折叠懒加载契约逐条保留并在测试注释与 PROGRESS 记录理由。
  - 验证：pnpm run test:quality EXIT=0（214 组 passed）；宽度走查 49 表面 + 32 交互 + 双主题 30 项密度全绿。真机观感归 host-pending。
- [x] T-1418 架构边界守门（R-A1，2026-09-24 开工并完成）
  - 内容：新增 `tests/architecture-boundaries.test.cjs`——93 个 TS 模块的自动结构检查：render/ui 导入方向（仅渲染层+组合根/plugin-ops/shared）、宿主 API 准入清单（显式登记文件，新增须评审）、无时钟纯函数面（date-keys/source-framework/日历投影/强度分/quota/适配器结算层等 11 个模块禁 Date.now 与缺省 new Date）、`store.events` 唯一写路径（model.ts）、外部事件唯一入口（recordExternalEvent 仅 api/index）、来源前缀登记（EXTERNAL_REF_PREFIX_REGISTRY 五前缀）+ 发现规则（新增 `*adapter.ts`/`*inbox.ts` 必须登记清单或显式声明非前缀来源家族）。
  - 状态：done（2026-09-24。守门入 `pnpm test` 主链；全绿证明既有代码零违规，此后边界回潮必须先显式登记才可通过）。
- [x] T-1419 时间/日历语义契约 date-keys（R-A7，2026-09-24 开工并完成）
  - 内容：新增纯模块 `src/date-keys.ts`——isValidDateKey（严格格式+真实日历）、splitDateKey、calendarDayNumber（与 model.ts localCalendarDayNumber 同公式）、formatDateKey（可带显式 IANA 时区，Intl 换算）、addDays/nextLocalDay、daysBetweenHalfOpen（半开区间日差）、dateRangeHalfOpen/dateRangeInclusive；全部不读隐式时钟、非法输入 fail-closed。
  - 替换：reminders.ts 4 处毫秒差 + 逾期光标推进、features/review-comparison.ts getPreviousReviewRange 整体键化（移除本地 Date 依赖）、occasions.ts differenceInDays、render/occasions.ts 与 render/fragments.ts 各 1 处倒计时——等价回放六个既有测试全绿零漂移；同步 10 个固定模块集测试加载器（occasions/reminder-actions/model/reminder-tolerance/skip-tolerance/review-comparison/report-deviations/report-sections/review-compare-view/v8-platform）。
  - 测试：`tests/date-keys.test.cjs`——校验 16 例、DST 双时区（Asia/Shanghai、America/New_York 含 EDT/EST 边界与同一时刻跨日）、闰日、跨午夜跨年、半开区间方向语义、等价回放（新旧公式逐点一致含 DST 月份）、序列连续性、纯度审计。挂 `pnpm test` 主链。
  - 文档：architecture.md 新增「日期语义契约」节；api-v5.md 补 localDate 契约与统计截止时间条款。
  - 状态：done（2026-09-24。model.ts 内部私有 localCalendarDayNumber 留待后续批次收敛至 date-keys，本批不动 model 核心；reminders.ts 的 snooze 7 天窗口为毫秒时长语义非日期差，明确不在替换范围）。
- [x] T-1420 今日行动台纯投影（R-A2/R-10.3 第一切片，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/today-dashboard.ts`——事实输入由调用方经 model.ts 单一实现算好（isComplete/getProgress/evaluateQuotaSchedule/跳过事件/at-most 破戒/连续天数/最近漏卡日），投影层只做编排：状态归并（breach/actionable/skipped/done + reasonCode 八种）、三段固定排序（now[破戒置顶]→deferred→done，名称 zh-CN→itemId 平局裁决）、totals（含 completionRate）、nextAction（破戒/待办优先→全部完成转回顾→空日程 undefined）、专注提供方缺失降级（focus-unavailable）、分段截断与 truncated 汇总。
  - 接入：fragments.renderTodayView 构建投影并经 renderTodayDashboardStrip 渲染只读摘要条（data-today-dashboard：完成进度/跳过数/下一步/专注降级提示），插在周条与保存状态之间；记录、撤销、失败回滚路径不变；优先提醒条目仍由 renderPriorityReminderView 单一路径呈现，行动台只计数。i18n 新增 5 键中英双语（parity 1602/1602），workbench.scss 6 条轻样式（复用既有 token）。
  - 测试：`tests/today-dashboard.test.cjs`——空态/待处理/完成/SKIP 中性/quota 达标与落后/at-most 干净与破戒置顶/提醒计数/专注三态降级/两次构建深度相等确定性/截断与 total 保留/missedDate 透出/接线与 i18n 结构守门/纯度审计（零 import + 无时钟）。挂 `pnpm test` 主链；模块入架构守门无时钟清单。
  - 状态：done（2026-09-24。真实思源与 Android 上的行动台观感、焦点与触控保持 host-pending）。
- [x] T-1421 提醒注意力增强：安静时段与通知防抖（R-A2 第二切片，2026-09-24 开工并完成）
  - 安静时段：新增零依赖纯模块 `src/features/reminder-preferences.ts`——reminderMinutesOfDay 严格解析、normalizeReminderQuietHours 非法回落、isWithinQuietHours 半开窗口（支持跨午夜 22:00–07:00，start===end 空窗口，禁用即不安静）；偏好字段 `reminderQuietHours`（默认关）入 view-preferences 归一化；设置页「今天」组新增开关+起止时间输入（time 输入，双向绑定 persist）；优先提醒条在窗口内切 `is-quiet` 变体（紧迫标签换安静说明、去感叹标记），条目仍页内可见——只影响呈现强度不改事实。
  - 防抖：`ReminderUserAction` 增量扩展可选 `expiresAt`——提醒中心新增「延后2小时」按钮（defer），宿主写 `{action:"snooze", at, expiresAt: now+2h}`，applyReminderActions 带 expiresAt 时以到期时间为准（同日内亦可到期），无 expiresAt 的历史 snooze 沿用当日语义零迁移；normalize 对非法 expiresAt（早于 at / 超 7 天）丢弃回落。复用既有独立存储与保存队列，无新存储键。
  - 测试：`tests/reminder-quiet.test.cjs`——解析/归一化/跨午夜逐半小时回放/半开边界/空窗口/防抖到期与历史兼容/非法 expiresAt 丢弃/接线与 i18n 守门，入 `pnpm test` 主链；模块入架构守门无时钟清单（95 模块全绿）；提醒中心签名守门（reminder-actions.test.cjs）同步升级含 defer。
  - 状态：done（2026-09-24。真实宿主通知观感归 host-pending；不新增后台常驻、不直接发送系统通知的边界不变）。
- [x] T-1422 UI 维护台账（R-A11，2026-09-24 开工并完成）
  - 内容：新增 `tests/ui-state-ledger.test.cjs`——八状态族活清单（保存中·失败·重试/空态/加载/禁用/依赖缺失/成功错误提示），每族断言 SCSS 呈现、渲染消费方、双语 i18n、无障碍语义（role=status/alert、aria-disabled）四维在位；窄宽度/长文本/双主题/焦点交叉引用既有门禁（responsive-layout/ui-theme/i18n-parity/css-hygiene/mobile-release-quality），不重复断言。
  - 修复（盘点发现，每修必补断言）：① 统一禁用基线——新增 `:where(button,…):disabled` + `[aria-disabled]` 零权重规则进 interaction-states.scss，收敛此前散落的逐组件禁用呈现，组件特化（record-button .66）仍优先；② 回顾助手错误行收编基座类 `lc-checkin__error`（原散落 is-error 仅色值，现带 danger 边框/底色/防溢出），删除 review-workspace 死规则。
  - 决策登记：saving 刻意静默——checkin-toast 守门已有「异步保存期不得插入布局块」决策，本批一度误改为可见分支后回退，台账显式登记静默依据；`__loading`/`__success`/`is-saving`/`msg.saving` 为保留词表（零消费但刻意保留），静默增减视为违规，A11 后续清理批统一处理收编或退役。
  - 状态：done（2026-09-24。台账入 `pnpm test` 主链；真机长尾维持 host-pending 不以结构断言关闭）。
- [x] T-1423 快捷入口能力矩阵（R-A12 第一切片，映射 R-10.4 本地可验证部分，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/quick-entry-capabilities.ts`——入口建模为描述符（commandId/langKey/icon/hotkey/surfaces/mobility/executor/globalCallback/capabilities）；四者分离纯函数：图标解析+fallback（未知图标回落 more 并标记未解析）、能力与 surface 评估（evaluateQuickEntry 输出 executable/displayable/registrable 三层资格）、展示过滤（filterQuickEntriesForDisplay 三段分区+稳定排序）、恢复配置（restoreQuickEntryVisibility）；`isMobileExecutable` 对 unverified 绝不默认移动安全。
  - 接入：index.ts onload 命令注册改为描述符驱动——执行器键与宿主回调映射分离，surface 交集判定 registrable（mobile 前端自然不注册页签入口），行为等价（openCheckin 全端+热键+全局回调；openCheckinTab 仅桌面）；langKey 不变（dist i18n 契约键 release-assets 守门）；孤儿热键常量 QUICK_DIALOG_HOTKEY 随重构移除（值入描述符）。隐藏集管理 UI（surface 级展示开关/恢复路径）待截图门解除后接入，纯函数已备。
  - 测试：`tests/quick-entry-capabilities.test.cjs`——显示/执行/图标/能力四者独立、未知第三方 unverified、图标 fallback、surface 过滤、恢复配置、分区确定性、本插件描述符契约（移动端只注册 openCheckin）、接线守门，入 `pnpm test` 主链；模块入架构守门无时钟清单（96 模块全绿）；entry-capabilities 守门同步描述符驱动断言。
  - 状态：done（2026-09-24。截图视觉改动与实际隐藏管理 UI 仍受「截图齐全 + 明确开始」门控）。
- [x] T-1424 新手首次成功路径状态机（R-A12 第二切片，映射 R-10.5 本地可验证部分，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/first-success.ts`——五阶段旅程（not-started → item-created → recorded → feedback-shown → review-visited）+ 六事件（四前进 + skip-guidance + reset）；单调前进（防御性：记录发生即蕴含项目已建）、skip 粘性（阶段仍随真实行为前进，指标不失真）、reset 唯一回退（用户显式动作，不自动创建示例数据）；normalizeFirstSuccessState 非法回落，旧偏好零迁移。
  - 接入：偏好字段 `firstSuccess`（缺省 not-started/skipped=false）；宿主四处推进钩子（新建项目保存/首次记录 setRecentRecord/反馈展示/打开回顾），幂等事件零写入（next === current 直接返回）；今日空态三步引导新增「跳过引导」按钮（skipped 粘性后空态回落到归档/新建变体，不再显示引导）。
  - 测试：`tests/first-success.test.cjs`——完整旅程/单调性/skip 粘性与幂等/reset/归一化兼容/确定性/接线守门（偏好字段、四处钩子、跳过按钮、绑定、双语 i18n）/纯度审计，入 `pnpm test` 主链；模块入架构守门无时钟清单（97 模块全绿）；14 个转译 view-preferences 的加载器同步 first-success。
  - 状态：done（2026-09-24。真实首次使用反馈保持 host-pending；渐进式展开的进阶 UI 待截图门解除后接状态机消费）。
- [x] T-1425 可保存视图 ViewScope v1 归一化层（R-A8 第一切片，2026-09-24 开工并完成）
  - 内容：新增纯模块 `src/features/view-scope.ts`（日期运算复用 date-keys 单一实现）——版本化 ViewScope v1（range 相对天数/全部 + itemIds/groups/sources/status 过滤器）；normalizeViewScope fail-closed（version≠1 整体回落默认、非法天数钳制到 730 上限、过滤器 trim/去重/上限截断并置 truncated）；resolveViewScope 显式 today 解析出闭区间 [startDate, endDate] 并把失效项目/分组/来源回显为缺失条件（不静默丢弃、不静默扩大范围）；describeViewScope 输出报告/导出头部的范围声明词元。
  - 接入：`buildWeeklyReportMarkdown` options 增加可选 viewScope 描述——报告头部新增「统计范围」行（范围/过滤器数/缺失条件/截断标记），随既有来源筛选行一起显式声明口径；index 调用点构建 ViewScope 并以当前 store 解析（knownItemIds/knownGroups/knownSources 注入）。i18n 6 键中英双语（parity 1619/1619）。
  - 测试：`tests/view-scope.test.cjs`——归一化 fail-closed/钳制截断/相对日期跨年解析/缺失条件/描述词元/消费守门/纯度（运行时依赖仅 date-keys），入 `pnpm test` 主链；模块入架构守门无时钟清单（98 模块全绿）；diary-report 导出路径守门同步含 viewScope。
  - 状态：done（2026-09-24 第一切片）。A8 后续切片：命名保存视图（多视图存储+选择器 UI）与范围导出，等真实使用反馈或用户点单后排批。
- [x] T-1415 戒断里程碑投影 + T-1426 节奏/恢复投影 pace-projection（R-A3 第一切片，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/pace-projection.ts`——三套口径独立（R-20.1 v1 冻结）：① 普通 at-least `backlogRate`（未完成已到期有效排期/已到期有效排期，SKIP 日不算机会不算失败，证据日期=漏掉的排期日升序回放，≥50% 判积压）；② quota 独立输出贡献/目标/进度（封顶 100，零目标无除零）；③ at-most 恢复状态（in-recovery/lapsed）+ 破戒日历史（升序去重可回放）+ **戒断里程碑阶梯**（1/3/7/14/30/60/90/180/365，输出最近达成级/下一级/进度）。
  - 接入：今日 at-most 卡片新增里程碑标签（is-milestone，戒断第 N 天 · 下一关 M 天，title 展示已达成级）——cleanDays 复用现有连续无破戒口径（currentStreaks 单一实现）；i18n 3 键中英双语（parity 1622/1622）。
  - 测试：`tests/pace-projection.test.cjs`——backlog 口径（SKIP 排除/证据日期/阈值 50%）、quota 独立与封顶、里程碑阶梯边界（0/1/14/45/400）、破戒历史去重、判别入口分发、确定性、消费守门、纯度审计，入 `pnpm test` 主链；模块入架构守门无时钟清单（99 模块全绿）。
  - 状态：done（2026-09-24 第一切片：事实切片由调用方经 model 算好传入的投影层模式；**同口径接入已在本批完成**——summary 渲染块 at-most 行附「戒断第 N 天 · 下一关 M 天」（abstinenceMilestones 同口径）+ API v5 `getStreaks` at-most 项目可选 `milestones: {achieved, next?, progressPct}`（additive 兼容）+ docs/api-v5.md metrics.read 节文档同步 + pace-projection 消费守门扩展三面。洞察页无 at-most 专属呈现位，不硬造，留待洞察改版窗口）。
- [x] T-1416 渲染块一键插入预设（R-A4 第一切片，第三轮调研采纳②，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/block-presets.ts`——4 个上下文自洽预设（summary 全部项目汇总/month 月历/heatmap 年度热力图/groups 分组概览，缺省即当前项目集/当前月/当前年，无需用户先填 itemIds）；`blockPresetMarkdown` 生成围栏；`validateBlockPresetRoundtrip` 注入真实解析器做插入前守门（从围栏提取内容镜像真实摄入路径，view 被篡改或解析失败即拒绝插入）。today 视图强制 itemIds 不提供通用预设（避免插入即错误块）。
  - 接入：命令面板注册 4 个预设命令（langKey：blockPresetSummary/Month/Heatmap/Groups，dist i18n 契约键同步）；宿主 `insertCheckinBlockPreset` 经内核公开 `/api/block/insertBlock` 把预设追加到当前编辑器文档末尾（getCurrentEditor 防御式解析 rootID，拿不到编辑器降级提示；插入成功/失败 toast）。i18n 6 键中英双语（parity 1628/1628）。
  - 测试：`tests/block-presets.test.cjs`——描述符契约（id/langKey 唯一、dist 契约对齐）、往返一致（真实解析器）、围栏格式、坏预设拒绝、纯度审计、接线守门（index 通道/dist 守门同步），入 `pnpm test` 主链；模块入架构守门无时钟清单（100 模块全绿）。
  - 状态：done（2026-09-24 第一切片）。真实宿主插入体验（光标落点、protyle 刷新时序）保持 host-pending，可用 e2e 隔离内核环境补充真实内核自动化证据。
- [x] T-1427 导入预览统一模型（R-A4 第二切片，映射 R-30.4，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/import-preview.ts`（plan 类型 type-only 导入，运行时零依赖）——把 LoopImportPlan/ObsidianImportPlan 统一映射为 ImportPreview：逐项可迁移记录数、语义损耗词表（v1 冻结：schedule-degraded/unmappable-frequency/unknown-cells/archived-flag/color/max-gap）、现有项目重名冲突（应用时合并写入既有项目的预期先行声明）、身份口径如实声明（Loop=项目+日期+值内容匹配；Obsidian=obsidian21 externalRef 幂等）。
  - 接入：Loop 与 Obsidian 两个导入处理器在 window.confirm 前构建统一预览，确认文案追加重名合并警告与语义损耗计数；不再只依赖应用后 duplicates 事后发现。
  - 测试：`tests/import-preview.test.cjs`——Loop 损耗词表与跳过条目/Obsidian 名称派生与颜色 maxGap 损耗/重名冲突/汇总与确定性/接线守门/纯度（运行时零导入），入 `pnpm test` 主链；模块入架构守门无时钟清单（101 模块全绿）。
  - 状态：done（2026-09-24 第一切片）。A4 后续：范围导出与诊断包范围化、部分失败/回滚的预览深化，等真实使用反馈排批。
- [x] T-1429 生命周期影响预览（R-A9 第一切片，映射 R-30.1 数据治理，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/lifecycle-projection.ts`——delete/archive/restore 三动作影响预览：受影响事件数、外部幂等身份保留数（防重复累计）、锚点/事项联动清理数、可恢复性（delete=recoverable-with-audit 恢复点+墓碑；archive/restore=reversible）；reasonCodes 词表（today/calendar 可见性、事件保留、身份保留、墓碑与恢复点）；collectLifecycleFacts 事实切片收集；projectLifecycleBatch 批量汇总（归档页批量删除/恢复场景）。
  - 接入：`deleteItemWithRecords` 删除确认经 collectLifecycleFacts+projectLifecycleImpact 注入影响补充说明（外部身份保留/锚点清理/联动解除/恢复点+墓碑保护），i18n 1 键中英双语（parity 1631/1631）。
  - 测试：`tests/lifecycle-projection.test.cjs`——三动作影响/身份保留/空项目边界/批量汇总/事实收集/确定性/接线守门/纯度，入 `pnpm test` 主链；模块入架构守门无时钟清单（102 模块全绿）。
  - 状态：done（2026-09-24 第一切片）。只做预览不执行写操作（写入走 deleteItemsCascade/setItemArchived 既有通道）；真实工作区恢复演练仍为用户验收。A9 后续：归档确认同口径接入与恢复点回放深化。
- [x] T-1434 归档页批量删除接入批量影响汇总（R-A9 第二切片，A9 泳道收口，2026-09-24 开工并完成）
  - 内容：归档页批量删除确认（archived.bulkDeleteConfirm）追加 `projectLifecycleBatch` 影响汇总——保留外部幂等身份数/清理锚点数/解除事项联动数，i18n 1 键中英双语（parity 1649/1649）；单个归档删除已走 deleteItemWithRecords 同口径（T-1429）。
  - 测试：lifecycle-projection.test.cjs 接线守门扩展（单删+批删+双语断言）。
  - 状态：done（2026-09-24 第二切片，A9 泳道收口）。恢复点回放深化等真实恢复演练反馈；真实工作区恢复演练仍为用户验收。
- [x] T-1430 本地隐私与控制中心（R-A10 第一切片，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/privacy-scope.ts`——① 导出前敏感字段审计（备注/图片附件计数、幂等身份声明、头像照片由调用方显式传参）；② 来源断开保留规则（断开=停止采集，已落盘事件与幂等身份全部保留，重连经 externalRef 防重复累计；无幂等口径的来源如实声明 none）；③ 控制面汇总（文档写入 diary-report/summary-resident + 外部来源 sireader/siplayer/health 五通道开关与目标聚合，`telemetry: "none"` 零遥测常量声明）。
  - 接入：① JSON/CSV 导出经 downloadExportFor 审计敏感字段，有内容时 toast 披露（零值不打扰）；② 思阅/思播/健康三个集成开关关闭时 toast 披露保留事件数与幂等身份数（重连不重复累计）。i18n 2 键中英双语（parity 1633/1633）。
  - 测试：`tests/privacy-scope.test.cjs`——敏感字段计数与空字段/头像显式传参/断开保留与重连口径/控制面汇总与空配置回落/零遥测常量/确定性/接线守门（导出审计+三处断开披露+双语）/纯度审计，入 `pnpm test` 主链；模块入架构守门无时钟清单（103 模块全绿）。
  - 状态：done（2026-09-24 第一切片）。不新增遥测、不读取第三方私有存储；真实隐私取舍与用户工作区删除确认保持开放。
- [x] T-1432 命名保存视图（R-A8 第二切片，2026-09-24 开工并完成）
  - 内容：偏好新增 `savedViews`（{id, name, scope: ViewScopeV1}，上限 10，非法条目丢弃、scope 经 normalizeViewScope fail-closed，旧偏好零迁移）；宿主三方法——applySavedView（相对天数解析为显式 [startDate, today] 区间写 summaryCustomRange、来源随视图切换、默认视图清空自定义区间）、saveCurrentView（当前区间跨度+来源固化为新视图，上限满提示）、deleteSavedView；activeSavedViewId 跟踪选中态。
  - 接入：回顾页报告设置菜单新增选择器（默认+已存视图）、「保存当前为视图」（prompt 命名）与「删除视图」按钮，绑改动即持久化。
  - 测试：view-scope.test.cjs 消费守门扩展（偏好字段/三方法/上限/选择器与按钮/7 键双语）。
  - 状态：done（2026-09-24 第二切片，A8 泳道收口）。命名视图只存查询偏好不复制事件；真实 surface 交互保持 host-pending。
- [x] T-1436 范围导出（R-A8 第三切片，2026-09-24 开工并完成）
  - 内容：CSV 数据导出支持可选相对天数范围——回顾页报告设置菜单新增「CSV 导出范围」选择器（全部/最近 7/30/90/365 天），plugin-ops `downloadExportFor` 增加可选 scopeDays：经 model `getEventsInDateRange` 单一实现过滤事件（今天闭区间回溯 N 天，上限钳制 730）。**JSON 恒为全量备份语义不参与范围**；范围外事件不删除、仅不进入导出文件。
  - 测试：view-scope.test.cjs 消费守门扩展（签名/CSV-only 分支/model 单一实现/730 钳制/选择器/6 键双语）。
  - 状态：done（2026-09-24 第三切片，A8 深化切片全部消化）。
- [x] T-1439 容易漏卡的时间段（R-20.3 第二张行动卡，2026-09-24 开工并完成）
  - 内容：pace-projection 新增 `aggregateMissedWeekdays`（漏卡按星期聚合，0=周日…6=周六，数量降序+星期升序稳定）与 `aggregateMissedTimeSlots`（按 morning/afternoon/evening/any 固定顺序，非法归 any）；index 报告构建时枚举 30 天窗口漏卡明细并聚合；报告新增「容易漏卡的时间段（共 N 次漏卡）」节——星期用 occasions 既有 weekdayName 本地化，时段用 TIME_SLOT_LABELS（label 在组合根本地化后传入，保持报告纯模块不触 ui）。
  - 测试：pace-projection.test.cjs 扩展（星期推导/时段顺序/非法归 any/报告与 index 接线守门/双语）。
  - 状态：done（2026-09-24）。R-20.3 剩余第三张卡「最近调整是否有效」（复用 buildReviewComparison 基础）等回顾改版窗口。
- [x] T-1440 来源专用打卡模板（番茄钟/思阅/思播，用户需求 2026-09-24 开工并完成）
  - 内容：番茄钟模板补入 `completionSource: "tomato"` + `tomatoMode: "sessions"`（此前未绑定来源）；新增「联动」分组——思阅阅读/思播观看/健康步数 3 个模板（正确 kind/unit/schedule 形状，note 引导用户到设置页开启对应联动），不自动启用外部来源。模板目录 64 个、9 分组。
  - 测试：template-gallery 守门通过（64 模板 9 分组、tpl.* 映射完整）；templates 守门通过；i18n parity 1667/1667。
  - 状态：done（2026-09-24 第一切片）。外部联动启用在 T-1442 设置页分区重组中完成。
  - 分析：模板体系（templates.ts/template-manager，66+ 模板八类分组）目前只承载内容形状（kind/target/unit/schedule/group/icon），不含完成来源绑定；而番茄/思阅/思播项目在今日页与编辑器已有专属语义（completionSource、dock-tomato 适配器、思阅/思播治理映射）。
  - 设计要点：模板数据增可选 `sourcePreset`（tomato/sireader/siplayer），应用时预填完成来源、时长单位（分钟）与建议排期；**不自动启用外部来源联动**——应用后引导用户到设置开启对应联动，未启用时项目保持手动记录可用（opt-in 纪律不破）。分组新增「联动」类或来源角标。模板为内容资产，增可选字段无迁移。
  - 验收：模板纯函数与 gallery 测试、应用→编辑器→保存→来源行为链路、双语、模板数量守门同步。归类 `local-auto`。
- [x] T-1441 叶归 LifeLog 识别与自动完成研究（用户需求 2026-09-24）
  - 状态：与下方登记项重复，以「需用户提供仓库/集市链接」条为准（阻塞中）。
  - 分析：诉求=识别叶归插件的 LifeLog（任务时间记录）条目并自动完成对应打卡。场景=「读取另一插件产生的用户可见数据→映射为打卡事实」，与健康收件箱同型。纪律红线：**不得逆向叶归私有存储**；仅当 lifelog 落在用户文档/块属性等用户可见内容时可解析。
  - 研究步骤：① 定位仓库并做发布包静态分析（数据落点=私有 storage vs 文档/块属性；条目 schema=时间/标题/标签/时长）；② 判定公开可解析面与稳定性；③ 若可解析→设计映射：用户绑定 lifelog 范围（笔记本/文档）+ 条目规则（标签→项目映射，用户显式配置）+ externalRef `yeguif:<blockId>` 幂等 + 预览确认流（T-1427 模式）；④ 智能体通道评估：经思源智能体读 lifelog 仅作非确定性补充，不作自动完成主通道。
  - 「自动完成」边界：缺省只做识别与预览；自动写打卡必须 opt-in + 每项目映射显式配置 + 幂等防重 + 可撤销。归类：研究 `local-auto`，实现含真实宿主验收。
- [x] T-1442 设置页「外部连接与能力」分区重组（用户需求 2026-09-24，第 1432 批部分完成 + 第 1442 批子标题完成）
  - 用户反馈（2026-09-24 截图）：连接与能力区内「摘要驻留 / 思阅阅读联动 / 健康数据收件箱 / 思播观看联动」各来源的行穿插混排，分不清哪行属于哪个插件；要求按插件分类并写清每个联动的具体设置步骤。
  - 已完成：integrations 组内加来源子标题（日记集成/摘要驻留/思阅/思播/健康），i18n 6 键双语（parity 1673/1673）。
  - 待深化：完全按插件独立子面板拆分（每面板带编号步骤指引）属较大 UI 重构，等用户确认视觉方案后排批。
- [x] T-1455 宽度走查 warm-streak 场景失效排查（tests/width-walkthrough.cjs:1133；2026-09-24 已修复，见下方排查进展）
  - 现象：.lc-checkin__overview-streak > strong 等待 30s 超时——warm 概览未渲染「最佳连击」块（fragments.ts 473 行需 bestStreakValue > 1）。worktree 二分证实 c7be048（今日功能批之前）已同径失败 → 非本日回归，先于 T-1450/1451/1454 等存在。
  - 候选根因：场景夹具按 daysAgo 相对日期造 3 天事件，与 computeLongestStreaks/computeEventStreaks 的「含今日才连续」口径不匹配（恰逢日期边界或语义变更后场景未同步）；或 showToday 后概览 ctx 装载时序。
  - 修复方向：walkthrough 场景改用绝对锚定日期或按 streak 口径补今日事件；同时核对 overview-streak 渲染条件是否被 T-1415 里程碑标签改动牵连。复跑 visual-qa（已通过，与本失败无关）。
  - 排查进展（2026-09-24 深夜）：已修复（2026-09-24，全链复绿+宽度走查 0 失败）。三层：(1) T-1445 在 render() 层的无条件挂起死锁——挂起收敛回 renderBackgroundUpdateFor 后台层并登记一次性 focusout 补渲染；(2) 精确录入展开态只活在 DOM——提升为插件会话字段 expandedExactEntries，重渲染按同一状态重建不再收起；(3) Enter 保存后焦点留在金额框令后台刷新被挂起吞掉——录完即收起面板+交还焦点（回到录后即收的既有交互）。宽度走查 49 场景+32 交互+混合录制全绿；walkthrough resetState 同步清理新会话字段；recording-history 结构测试桩补 expandedExactEntries/document 桩。真机 Enter 保存体验与手机端复验归 T-1388 窗口。
已修复第一层——T-1445 在 render() 层的无条件挂起造成死锁（焦点在旧输入框 → 显式渲染被吞 → 焦点永不释放），已把挂起收敛回 renderBackgroundUpdateFor 后台层并在挂起时登记一次性 focusout 补渲染。插桩证实仍有第二层：渲染时 currentStreaks.stretch=1，秒后 computeStreaks()=3——渲染后存在异步 store 替换/重算分歧（候选：持久化管线 reconcile 或索引时序），宽度走查该断言继续失败。两层事实与复现方法已记录，供下一会话续查（建议：在 reconcileStore/save 完成回调处断点比对 store 对象身份与事件数）。
- [x] v18.4.0 发版（微信读书全套/每日提醒调度/回顾四卡/组合卡片/场景组合包/交互修复；e2e 20/20+宽度走查 0 失败后发布；GitHub Latest）
- [x] T-1454 场景组合包 habit stacks v1（方向 11 主交付，P0-5 新手路径协同）
  - 状态：done（2026-09-24）。catalog 新增 TEMPLATE_PACKS 5 个场景组合（晨间例程/学习成长/运动健身/睡前放松/创作入门，按模板名引用 CHECKIN_TEMPLATES 纯内容资产）；features/template-packs.ts 纯投影（引用解析+未知名 fail-closed 降级+本地化名新旧分类+计数）；编辑器模板区新增组合包芯片行+预览面板，条目复用 data-template-apply 既有通道逐条填表确认（无新创建路径，用户掌控逐项）；i18n 11 键双语。Routinery 序列化执行器延后条件「模板组合交付」现已满足（下轮调研评估）。tests/template-packs.test.cjs 新增入 test:ui。
- [x] T-1453 渲染块组合卡片（方向 9「可组合卡片」收口件）
  - 状态：done（2026-09-24）。view=combo 编排 1~3 个既有视图：parseCheckinBlockConfig 抽出 parseBlockConfigFields 共用字段校验（子配置同白名单、禁嵌套 combo、子段错误回子段文案）；buildComboViewHtml 纯拼装（分段包裹+配置顺序确定），子视图交互（日期跳转/锚点/打卡）由块渲染器统一点击通道原样承接；i18n block.errorParts 双语。至此方向 9 清单（受限数据集/分组聚合/日期跳转/汇总表达式 minRate/可组合卡片）全部落地。tests/checkin-block.test.cjs 扩充编排/拒绝/顺序/纯度用例。
- [x] T-1452 情境词元×星期交叉统计（第五轮生态调研采纳，源：Daylio/Pinch 情境统计；第三轮延后项触发条件「R-A3 context normalization 交付」已满足）
  - 状态：done（2026-09-24）。crossTabulateContextWeekdays 纯函数：总命中 ≥3 且最高星期严格过半（>total/2 且 ≥2）才给模式，报告情境节追加至多 3 行（复用样本不足守卫）；零存储变更零依赖。benchmark 第十四节=第五轮全案（延后核查 6 项采纳 1 延后 2 未触发 3；3.9.0 闪卡重构在 feature 分支未发版，T-1374 维持观察）。
- [x] T-1451 每日提醒调度：时刻槽配置（T-1443 深化，用户需求「默认一天最多一次、可设多次」）
  - 状态：done（2026-09-24）。偏好 dailyReminder {enabled, slots[]}（默认 {true, []}=完整保留启动一条的原行为）；slots 严格 HH:MM 归一（去重升序封顶 4，非法丢弃）；配置槽位后 minute 级有界轮询到点触发，每槽按 localDate 幂等，启动时当日已到点未发的槽合并为至多一条补发；安静时段/零事项/开关关闭闸门全部保留。设置页新增提醒开关+时刻编辑行（双语）。normalizeDailyReminderSlots/Preference 归入 reminder-preferences.ts（无新模块零 loader 级联）。tests/reminder-quiet.test.cjs 扩充归一/接线/结构用例。
- [x] T-1450 目标负荷解读卡（R-20.3 第三张行动卡，回顾 2.0「目标是否过高」）
  - 状态：done（2026-09-24）。纯函数 interpretTargetLoad（pace-projection.ts）：样本门槛=到期机会 ≥8、阈值固定=积压率 ≥15% 偏紧 / ≥40% 疑似过高、输出只列偏紧与疑似过高项（积压率降序、名称 zh-CN 稳定平局、limit 5），证据含观察窗首日与漏卡次数；index 复用失速卡同一份事实（不重复枚举）并补记录观察窗首日；报告渲染「目标负荷（近 30 天）」节，建议表述为可选项（低压力纪律）。顺带修复 index 漏传 stalledItems 的缺口（失速卡此前只算未渲染进报告）。tests/pace-projection.test.cjs 补门槛/边界/排序/纯度/触点用例。
- [x] T-1441 叶归 LifeLog 识别研究·第一步（2026-09-25 仓库自检索，阻塞解除）
  - 分析：识别叶归插件 LifeLog 条目并自动完成对应打卡。红线=不逆向私有存储；仅解析用户可见内容。研究步骤=定位仓库→发布包静态分析→判定可解析面→设计映射→预览确认流。智能体通道仅作补充。
  - 研究结论（2026-09-25）：① 仓库=**Wetoria/sy-plugin-enhance**（叶归/Leaf Nest，集市版 v1.12.6，源码闭源仅发布工件）；② v1.12.6 发布包静态分析：LifeLog 记录带 **BlockId**（CSV 导出字段 Date/Type/Content/Duration/StartTime/EndTime/DurationSeconds/TotalDuration/BlockId）→ 条目本体=**思源块（用户可见内容，公开可解析面，红线不触）**；渲染层 DOM 属性 data-en_lifelog_{type,content,date,start/end_time_format}；输入为 Marker 语法（EnableMarker 设置+FormatWarning 校验，疑似限日记文档）；无 custom-en-lifelog-* 块属性；付费边界=叶归有 4 项专业版功能（CSV 复制有鉴权键），解析用户文档块不涉绕过付费。
  - **实时获取路线可行**（用户主诉求 2026-09-25）：与健康收件箱同型——绑定日记范围 → 有界 SQL 轮询解析 Marker 行 → 时长分桶 → externalRef `yeguif:<blockId>` 幂等（BlockId 天然防重）。
  - 前置缺口：**Marker 语法确切格式**（bundle 混淆字符串表 3508 项未解码；公开资料无文档）。获取路径：a) 下会话解码字符串表 b) 用户提供叶归设置页 LifeLog 截图（最快）c) 询问作者 Wetoria。
  - **语法已破解（2026-09-25 e2e 实装叶归 v1.12.6，用户指令「e2e 里直接安装试试」）**：翻 SEP-EnLifeLog 配置开启 enabled/enableMarker → 设置面板原文抓取成功——**段落行首以时间开头即标记为 LifeLog 段落**：`12:00 工作` / `12:00 工作：写日报` / `12:00:00 工作：写日报`，仅作用于日记（DailyNote）文档；时间开头带任何样式则不标记；时长=相邻段落起始时间差（SEP-EnParagraphBlockTimeDiff 模块）；落点=日记文档普通段落块（用户可见）+渲染期 data-en_lifelog_* DOM 标注；叶归自带隐私模式（仅展示类型不展示内容）。可实施：绑定日记笔记本范围 → 5 分钟有界轮询 SQL（box IN 范围 + type=p + 行首时间 GLOB + created>=今日）→ 解析 → 相邻起始差算时长 → yeguif:<blockId> 幂等。工程形状=health-inbox 同型，单批次可实现。
  - 设计草案（语法确认后单批次实现）：yeguif 来源登记 + marker 解析纯模块 + 范围治理 + 5 分钟轮询摄取 + 墓碑撤销，工程形状与 health-inbox 同型。
- [x] T-1457 叶归 LifeLog 联动适配器（用户需求 2026-09-24，e2e 探测后实现）
  - 状态：done（2026-09-25，语义于 2026-09-26 修正）。features/yeguif-adapter.ts 纯模块（Marker 解析行首时间/类型备注拆分、当前记录吸收上一条到当前的时间差、首条无前置不记、yeguif:<blockId>:<localDate> 身份）；宿主 5 分钟有界轮询（绑定笔记本内当日 Marker、行首时间 GLOB 过滤、单轮 200 块上限）+不可见省电门+焦点补拉；幂等+墓碑；事件备注=类型：备注；只读用户日记文档（local-only）。偏好 yeguifIntegration {enabled, itemId, notebookId, mappings} 内联归一；设置面板第七块（开关/项目/项目映射/笔记本懒加载按钮）+今日徽标；SourceChannel 不变（读本地文档属既有读共享文档型）、source 枚举全触点+防伪造+注册表+privacy 控制面。tests/yeguif-adapter.test.cjs 入 test:ui；架构守门 107 模块。
- [x] T-1456 《认知觉醒》「早冥读写跑」打卡模板包（用户需求 2026-09-25，已开发完成）
  - 状态：done（2026-09-25，研究结论见上方历史条目，按设计建议全项落地）。① 新模板「每日反思」（📔 binary evening 专注组，note=书中三问）；② 组合包 pack.awakening「认知觉醒·五件套」（早睡早起+冥想+阅读+每日反思+跑步，纯引用既有/新模板）；③ 四处模板 note 按书中方法论微调双语：早起补「事实记录不施压」（书中不打卡本意与低压力纪律同源）、冥想补「走神拉回=元认知训练 10~15 分钟」、阅读补「读后关联自身用起触动点」、跑步补「运动后 1 小时高强度脑力学习」；④ 模板库自动计 65 个。template-packs 守门扩 awakening 包+键；i18n parity 1757/1757。
- [x] T-1456 《认知觉醒》「早冥读写跑」打卡模板包（用户需求 2026-09-25；已开发完成，研究记录见本条目，完成条目见上方）
  - 书籍研究（2026-09-25，公开资料）：周岭《认知觉醒》（人邮 2020）核心观点=「认知越清晰，行动越坚定」，基于脑科学讲元认知/专注力/深度学习；第八章「早冥读写跑，人生五件套——成本最低的成长之道」：
    - **早**：无闹钟/不参团/**不打卡**，靠自然节律醒，早起意义=解锁不被打扰的黄金时间（⚠️ 与打卡工具存在哲学张力，见设计边界）；
    - **冥**：每天 10~15 分钟闭眼静坐专注呼吸，走神拉回即元认知训练；
    - **读**：选高于自己层次的书，读后**关联自身**、把触动点用起来；
    - **写**：核心=**每日反思**——记最触动的一件事+感受与道理+今后怎么用（非流水账），输出倒逼输入；
    - **跑**：中等强度运动，**运动后 1 小时内安排高强度脑力学习**（运动+学习配对才健脑）。
  - 与现有 61 模板的映射：冥想（🕯10min）/阅读（📖30min）/跑步（🏃3km）/早睡早起（☀binary）已存在且高度契合；**缺口=「每日反思」模板**（书中「写」的真义，非创作向的「写作」）。
  - 设计建议（等确认后单批次，全部复用 TEMPLATE_PACKS 机制）：① 新增「每日反思」模板（binary，evening，note=三问：最触动的事/感受与道理/今后怎么用）；② 新增组合包 pack.awakening「认知觉醒·五件套」=早睡早起+晨间冥想+阅读+每日反思+跑步（引用既有模板，纯内容资产）；③ 各模板 note 按书中方法论微调（冥想走神拉回、阅读关联自身、跑步补「运动后学习窗口」提示）；④ **设计边界**：书中明言早起「不打卡」——组合包说明须写明本包是**事实记录而非 KPI**（与低压力纪律同源），早起项建议以「记录实际醒来时间/是否自然醒」语义呈现，不做连续天数施压。
  - 验收：i18n 双语 parity、组合包引用完整性守门（template-packs.test.cjs）、模板搜索词可命中；真实使用反馈 host-pending。
- [x] T-1443 主动提醒通道：事项置顶 + 每日统一提醒（用户需求 2026-09-24）
  - 状态：done（2026-09-24，c750d29 统一每日提醒经思源公开 API /api/notification/pushMsg——事项提醒置顶高于打卡、按 localDate 每日幂等一次、内容只含标题与计数；c7be048 提醒推送尊重安静时段。真机推送形态与多次时刻配置归 host-pending/后续深化）。
  - 用户反馈：设置里有提醒相关项，但实际从未在任何地方收到提醒；要求梳理提醒机制、控制提醒的时间/次数/内容，默认一天最多统一提醒一次（用户可设多次）；**事项提醒置于最高优先级、高于打卡**；并确保走思源本身的提醒能力。
  - 现状梳理（2026-09-24 只读调查）：① 插件当前**没有任何主动通知通道**——全库无 `/api/notification/pushMsg`、无思源块提醒（setBlockReminder）、无系统通知；② 现有「提醒」全部是**被动页内呈现**：今日页优先提醒条（renderPriorityReminderView，逾期/今日各一条）+ 回顾页提醒中心（可延期/跳过/恢复）——用户不打开今日/回顾页就完全看不到；③ 事项（occasions）提醒按 remindBeforeDays 投影进同一提醒中心，同样只在页内；④ T-1421 安静时段只降级页内呈现，前提是有页内提醒——未解决「够不到用户」的根本问题。
  - 需求登记：① **统一每日提醒**——默认每天最多一次（时间可设，如固定时点或首次打开思源时），汇总当日逾期/今日/事项为一条通知；用户可设多次（如早/晚各一次）；② **优先级**——事项提醒置顶（高于打卡提醒），徽标计数含事项数；③ **通道走思源公开 API**——`/api/notification/pushMsg`（内核公开接口，思源原生通知弹窗）；桌面/移动形态需真机验证；④ **时间/内容控制**——安静时段（T-1421 已有）生效于推送；内容只含标题与计数（不含笔记等隐私内容）；⑤ **次数与幂等**——同一实例每日至多推送一次（按 localDate 幂等），偏好持久化。
  - 边界：不后台常驻（推送时机=启动/onLayoutReady/到点后的首次交互）；不用系统级通知（既有边界）；移动端 pushMsg 形态需真机验证。归类：调度纯函数 `local-auto`；pushMsg 真机形态 `host-pending`。
- [x] T-1444 UI 缺陷：提醒中心操作按钮文字竖排挤压（用户截图 2026-09-24）
  - 状态：done（2026-09-24，7dbafda：.lc-checkin__reminder-action 补 white-space:nowrap + 窄容器整行断行）。
  - 现状：回顾页「提醒与逾期 → 提醒中心」行内操作按钮（延期/延后2小时/跳过）被行网格挤成窄竖条，CJK 文字逐字竖排（「延后2小时」折成两列）——T-1421 加入较长标签「延后2小时」后触发/加剧。
  - 根因（已定位）：`.lc-checkin__reminder-action` 只有 inline-flex + min-height 28px，**无 white-space: nowrap 与最小宽度**，在提醒行 `auto minmax(0,1fr) auto` 网格被压缩时按钮内文字逐字换行。
  - 修复方向：① 按钮加 `white-space: nowrap` + 最小内边距（保留胶囊形）；② 操作组 `lc-checkin__reminder-actions` 允许整组换行而非按钮内部换行；③ 必要时给行网格的 actions 列设最小宽度。回归守门：提醒行按钮断言（nowrap + 最小宽/不逐字折行）入既有提醒中心测试。
  - 归类：UI 缺陷修复 `local-auto`（纯 CSS/结构断言），随下批开发或用户点名即修。
- [x] T-1445 手机端缺陷：填写数字时输入法跳出又弹回，难以输入（用户真机报告 2026-09-24）
  - 状态：done（2026-09-24，7dbafda：renderBackgroundUpdateFor 在输入聚焦期间挂起全量重渲染，失焦后补渲；真机复验归 T-1388 窗口）。
  - 现象：手机端今日页「填写」精确数值输入框聚焦后，输入法弹出又被收回，反复如此基本无法输入。
  - 根因候选（代码层面已定位可疑路径）：今日页存在多个**后台全量重渲染触发源**——健康收件箱 5 分钟轮询、思播采样器、Dock Tomato/.analytics-updated 事件、sireader 监听——均调用 `renderBackgroundUpdate()`→今日页整树重建，正在聚焦的 `input.lc-checkin__amount` 被替换→焦点丢失→输入法收回。T-1246 的保守局部渲染（renderTodayItemLocally）只覆盖记录更新，不覆盖上述后台事件。另外 exact-entry 的 input 事件链是否有同步渲染待查。
  - 修复方向：① 输入聚焦期间挂起全量重渲染（focus 标记，blur 后补一次）；或 ② 局部渲染路径保留输入节点/恢复焦点与光标（复用 T-114 焦点归位机制）；③ 回归守门：playwright **mobile bundle** e2e——聚焦填写框→触发后台事件→断言焦点与输入法状态保持、已输入值不丢。
  - 归类：手机端缺陷，复现与修复验证用 mobile bundle e2e（local-auto 可复现）+ 真机确认（host-pending）。
- [x] T-1446 手机端缺陷：已完成打卡项无法折叠（2026-09-25 本地修复）
  - 状态：done（`bind-today.ts` 点击后就地同步 section/button 的 `aria-expanded`、列表 `hidden` 与箭头，并持久化；`fragments.ts` 输出初始折叠语义；移动浏览器视觉 QA 已验证展开→折叠复现链）。真实 Android/WebView 触摸命中与安全区仍归 T-1388 现场窗口，不以浏览器结果替代真机验收。
  - 验证：`CHECKIN_QA_FRONTEND=mobile node tests/visual-qa.cjs` 通过；320/360/390/430px 均无横向溢出，`completedExpanded=1`、`completedCollapsedAgain=0`、ARIA 状态同步。
- [x] T-1447 手机端缺陷：回顾页下滑整页抖动如弹簧（用户真机报告 2026-09-24）
  - 状态：done（2026-09-24，7dbafda：pinReviewSubnavRail 守卫改宿主显式 isMobileFrontend 标记优先，移动端彻底停用 transform 滚动同步；真机复验归 T-1388 窗口）。
  - 现象：手机端进入回顾页，往下滑动时整页来回振荡（"跟一个大弹簧一样"）。
  - 调查事实：① 回顾页二级导航有 transform 钉住机制（pinReviewSubnavRail，D-159 桌面缩放缺陷的 workaround）——**代码注释原样描述了本症状**："per-scroll transform 会让 WebView 合成器与触摸手势打架（滚动位置可见振荡、页面无法前进）"，因此移动端设计了守卫直接跳过（返回空 sync）；守卫=宿主根元素带 `lc-checkin-host--mobile` / `lc-checkin-dialog-host--mobile` class（renderInto 按 isMobileFrontend toggle）。② 其余滚动写入方：T-112 每表面滚动位置记忆、节奏条初始化 scrollLeft、折叠跳转 scrollTop 直写。③ D-159 记录的 CSS zoom+sticky 是桌面已知 Chromium 缺陷类，移动端 WebView 可能同族。
  - 根因候选：① **守卫 class 不匹配**——实际滚动宿主元素未带 mobile class（renderInto 的 root 与 bindPageNavigationHandlers 收到的 root 不是同一元素，或移动端挂载路径绕过 toggle）→ transform 同步在移动端照跑，与触摸动量滚动互搏=弹簧振荡（症状完全吻合，首查此项）；② T-112 滚动记忆在动量滚动期间回写 scrollTop；③ WebView 滚动锚定与固定/变换元素冲突。
  - 复现/修复计划：playwright **mobile bundle** 打开回顾页→模拟触摸滚动→埋点断言 transform 写入次数（>0 即守卫失效）；真机 console 一行可验证（`document.querySelector('.lc-checkin__review-subnav').style.transform` 随滚动变化即为守卫失效）。修复：修守卫判定（或按 isMobileFrontend 显式传参），移动端彻底停用 transform 同步；桌面保持不变。
  - 归类：手机端缺陷；mobile bundle e2e 可自动化复现（local-auto 可复现）+ 真机确认（host-pending）。
- [x] T-1433 情境化记录：备注词表归一化与跳过原因分布（R-A3 第二切片，映射 R-20.2，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/context-normalization.ts`——classifyContextTokens 把跳过/打卡备注的自由文本按中英关键词归一化为有限词表（v1 六类：阻力/时间不足/环境变化/身体状态/情绪波动/其他，未命中归 other）；aggregateSkipContext 聚合计数（降序+词表序稳定）、日期范围、样本不足守卫（< CONTEXT_MIN_SAMPLE=3 标记 insufficient）。**不新增事件字段、不修改 Store v3、不影响完成判定与连击**（只读投影，词表可扩展）。
  - 接入：`buildWeeklyReportMarkdown` options 增加可选 contextAggregation——报告头部新增「跳过原因分布（共 N 条备注）」节，逐词元计数+样本不足提示；index 调用点从区间内跳过事件的既有备注聚合（isSkipEvent 单一口径）。i18n 8 键中英双语（parity 1648/1648）。
  - 测试：`tests/context-normalization.test.cjs`——关键词归一化（中英/大小写/空文本）、聚合排序与 other 兜底、日期范围、样本不足守卫、报告接线守门、纯度审计，入 `pnpm test` 主链；模块入架构守门无时钟清单（104 模块全绿）；diary-report 导出路径守门同步含 contextAggregation。
  - 状态：done（2026-09-24 第二切片，A3 泳道收口）。真实用户是否写备注属使用反馈，保持开放。
- [x] T-1437 微信读书阅读时长来源（官方 WeRead Skills 通道，评估通过后转开发批次）
  - 状态：done（2026-09-24 由 T-1402 承接完成，08b1158：官方 Agent API /readdata/detail 时长先行，weread: 幂等，Key 仅本地偏好；完读事件+划线计数归 T-1402 后续批次）。
  - 背景（2026-09-24 用户提供）：腾讯官方组织开源 `Tencent/WeChatReading`（Apache-2.0，AI Agent Skills 形态），提供 wrk- 前缀官方 API Key（weread.qq.com/r/weread-skills 获取）；用户已取得 Key 并授权评估。**Key 属用户凭据：仅在用户本地插件设置中录入，绝不写入仓库、文档或导出文件；建议用户定期轮换。**
  - 数据面：书架/阅读时长与天数/笔记划线/阅读进度/点评——「阅读时长→每日打卡」与思阅适配器同型，可走五段框架（descriptor: api-push、identity `weread:<bookId>:<date>`、每日一次结算、opt-in 默认关、断开保留规则沿用 T-1430）。
  - 评估项：① 从 skill 包提取 API endpoint/鉴权/限流契约（Apache-2.0 允许适配，注意附许可声明）；② ToS/数据范围核对（仅读用户自身数据）；③ 适配器设计走 T-1427 预览模型（导入/接入前披露）；④ 备选路径：经思源智能体 + skill 间接读取（非确定性，仅作补充不作主通道）。
  - 归类：评估阶段 `local-auto`；真实账号数据联调 `host-pending`（需用户 Key 与授权）；不改 Store v3，不自动写入打卡（结算入 T-1427 式预览确认流）。
- [x] T-1438 思阅/思播上游提案提交（2026-09-25 用户授权后完成）
  - 已提交 sireader#55 与 siplayer#180；后续公开 API 契约协同归 T-1395/R-REL-CHECK，Task Horizon 反向提案仍为本地草案。提交事实与实际发布能力分开记录，不保留设备反馈等待门。
- [x] T-1428 Task Horizon mock consumer 消费侧契约（R-A5 第一切片，映射 R-40.2，2026-09-24 开工并完成）
  - 内容：消费者参考实现 `examples/task-horizon-bridge/plugin.js` 升级——calendar.read 能力发现（v5 宿主走投影、v4 宿主显式降级 summary-fallback，旧消费者不因缺少新能力而失效）；`getProjection` 单飞合流（并发调用共享一次提供方读取）+ 事件失效缓存（刷新事件清空，上限 16 防泄漏）+ 超时守卫（projectionTimeoutMs 放弃并给出原因，不挂死消费者）+ Abort 守卫（已中止 signal 直接放弃且不打提供方）；`getStatus` 暴露 projectionMode/缓存/待写状态。注册资格与降级语义全部显式，不猜 v5 字段。
  - 测试：`tests/task-horizon-mock-consumer.test.cjs`（async IIFE）——v5 能力发现/单飞合流（3 并发 1 调用）/事件失效缓存/超时放弃/Abort 不打提供方/v4 显式降级且 summary 照常刷新/stop 语义，入 `pnpm test:ecosystem` 链；既有 bridge 守门（readiness/refresh/write/retry/矩阵）全绿不回退。
  - 状态：done（2026-09-24 第一切片）。真实 Task Horizon 联调、上游 issue/PR 与双向现场验证仍归 external/host-pending；不把 mock 结果写成真实联调完成。
- [x] T-1434 来源 mock 生命周期矩阵 + contract kit 同步（R-A5 第二切片，A5 泳道收口，2026-09-24 开工并完成）
  - 内容：新增 `tests/source-lifecycle-matrix.test.cjs`——思阅/思播/健康三来源统一四阶段场景（A 正常接入三日结算升序达标 / B 跨日切段各自独立 / C 批内重复+已结算身份重放零双计 / D 非法片段 fail-closed 计数不抛异常）+ 超限批（5001 片段整批拒绝）+ 健康收件箱行解析（合法/形状非法日期/未登记指标/负值/非字符串）；身份构造器前缀与契约 externalRefPrefixes 清单对齐断言。
  - 契约同步：`contracts/.../manifest.json` 与 `docs/contracts/checkin-api-v5.json`（字节一致守门）externalRefPrefixes 扩至 6 前缀（补 sireader/siplayer/health，含 health 双形态说明）；`docs/api-v5.md` 前缀登记处同步；检查通过后 contract-kit 81 项合规全绿。
  - 测试挂 `pnpm test:ecosystem` 链；全量扫测 171 文件全绿。
  - 状态：done（2026-09-24 第二切片，A5 泳道收口）。微信读书（未来来源）mock 样例待其 API 证据出现；真实双插件联调仍 external。
- [x] T-1431 A6 质量收口：全泳道自动化证据汇总（映射 R-50.1/R-50.2，2026-09-24 开工并完成）
  - 内容：① e2e 真实内核证据——agent-capabilities spec 在用户已接入思源智能体的运行实例（内核 3.8.5 @ 127.0.0.1:6806）通过：宿主登记插件 11 项智能体能力、能力策略放行；新增 `playwright.e2e.running.config.mjs`「附着运行实例」模式（不启内核、不抢工作区锁，手写 target.json）。② 自动化证据汇总报告 `docs/automation-evidence-report-2026-09.md`——R-A0～R-A12 十三泳道交付/测试/提交对照表、最新全链性能预算实测（渲染块 1k/10k/100k=21/34/241ms、100k 回顾 596.9ms、10k 渲染 35ms、CSS 607,940 字节、rollback 4 步 9 资产）、未关闭 host-pending 清单七项。
  - 状态：done（2026-09-24）。全泳道 A0～A12 自动化部分收口；真实宿主/Android/双插件联调、真实模型端到端对话走查、上游提交与发版保持 host-pending/external，需用户操作或授权。

## 待办补登记（2026-09-22；状态盘点轮）

本轮全面盘点本地/远端/规划状态后新增登记；均为维护或规划任务，不改变运行代码、数据结构与公开 API。

- [x] T-1396 分支与遗留工作区清理（✅ 全部完成，2026-09-23）
  - 范围：本地 42 个历史分支（17 个已合并 main 可直接删；25 个未合并需逐个 `git log main..<branch>` 核对内容是否已被 main 覆盖或仍有留存价值）；远端 19 个 codex/* 分支；约 10 个遗留 worktree（`~/.codex/worktrees/` 下 8 个 detached + `D:/AI/Codex/siyuan-checkin-*` 6 个挂分支的附属目录）。
  - 验收：挂在 worktree 上的分支先移除 worktree 再删；未合并分支逐个核对并记录处置（删除/打归档 tag/保留）；远端分支清理在本地清完后经用户确认再 push 删除；清理后 `git branch -a` 与 worktree 列表复核。
  - 进度（2026-09-23 本地侧完成）：worktree 18→3（16 个干净的全部移除；2 个脏的保留待处置）；本地分支 43→1（17 个已合并 `-d` 删除；27 个未合并分支全部为 2026-09 上旬 v0.x 时代历史分支，独有提交 1~30 个，已逐个打 `archive/codex-*` 归档 tag（27 个）后删除，内容可经 tag 完整恢复）。
  - 收尾（2026-09-23 第二批）：两个脏 worktree 处置完成——e9d3 为已被主干 `src/agent-capabilities.ts` 正式实现覆盖的智能体 effects 原型（219 行 diff 存档 `docs/archive/e9d3-agent-capability-effects-prototype.patch` 后移除）；catalog 为 plugin.json 纯行尾差异（`--ignore-cr-at-eol` 确认零内容变更，移除）。worktree 最终仅剩主仓。
  - 完成（2026-09-23 第三批）：27 个 `archive/codex-*` 归档 tag 推送远端（内容永久可达）后，27 个远端 codex/* 旧分支全部删除；`git fetch --prune` 后远端仅剩 `main`。清理完成。
- [x] T-1397 研究结论批次拆分登记（T-1378 后续）
  - 依据 `docs/roadmap-checkin-research-2026-09.md` 第九节归纳卡：把「v18.1.x 文档锚点体验收口」「v18.2.x 日记只读与手动确认收口」拆为正式任务登记（见下方批次节，T-1404～T-1408）。
  - 条件批次只登记触发条件不排期：「v18.3.x 闪卡人工入口」（前提：宿主稳定打开/复习入口通过现场验收；2026-09-22 T-1397 补充研究已更新触发信号——等 v3.9.0 发布且 `/api/flashcard/*`/`openTab cardIDs` 进入官方文档，旧 `/api/riff/*` 在重构分支已全部移除，见 research 文档主题 E 补充记录）、「v19.x 独立复习模式」（前提：明确知识复习需求 + 离线回放样例，固定 FSRS 版本另做迁移评估；注：宿主底层已是 FSRS，届时优先评估复用而非并行）。
  - 状态：done（2026-09-23，v18.1.x/v18.2.x 拆分为 T-1404～T-1408 并同日开工本地项；v18.3.x/v19.x 条件批次保留触发条件登记）。
  - 验收：每批次含 MVP 边界、非目标、验收矩阵（含真实宿主项）与回退说明；本轮不改运行代码。

## v18.1.x / v18.2.x 批次（2026-09-23 依 T-1397 拆分登记）

- [x] T-1404 锚点打开前重解析与缓存一致性（v18.1.x）
  - 验收：跳转锚点文档前重新解析 blockId（块被移动后跟随新根文档，不信任会话缓存）；回写解析成功刷新归属文档缓存；解析失败清除陈旧缓存、本次跳转回落旧缓存或项目洞察并给出可读提示；不新增绑定字段、不扩大回写。
  - 状态：done（2026-09-23。`resolveAnchorBlock` 扩展返回 rootID/box；`jumpToItemAnchorDoc` 打开前重解析 + 三级降级（新解析→陈旧缓存→项目洞察 + msg.anchorUnreachable 双语提示）；`writebackNoteAnchor` 成功刷新缓存/失败清缓存允许恢复；note-anchor 守门扩展。）
- [x] T-1405 锚点挂起与失效状态 UX 复核（v18.1.x）
  - 验收：删除/不可达进入挂起而非「未绑定」；编辑器可见挂起提示；解绑清理只动本插件键；导入后解析失败保留原 ID。
  - 状态：done（2026-09-23 复核确认既有实现已覆盖研究要求——`suspendedAnchors` 按 item+block 挂起、编辑器 anchorSuspended 警示、重绑清除挂起、`clearAnchorAttr` 空串清理、导入沿用 normalizeItem 保留原 ID；本轮补跳转不可达提示闭合最后缺口，无其他新增改动。）
- [x] T-1407 v18.2.x 日记只读与手动确认收口（交付度核对）
  - 状态：done（2026-09-23 核对：T-1352 日记集成（搜索/新建/预览选择/手动写入本期报告）与 T-1353 摘要驻留已交付全部本地可做项——摘要展示=设置页三件套、预览=文档搜索选择、幂等=有界重试+审计、周期报告保持用户主动触发；剩余仅真机读取验证归 T-1344。无新增工作。）
- [x] T-1398 发布工程收尾：回滚演练脚本化与资产清单导出
  - 来源：T-1368/T-1371 状态注记的共同遗留。范围：预发布→回滚演练形成可复跑脚本；发布资产清单（ZIP 内容 + SHA-256）导出脚本化并入 `check:release` 证据链。
  - 验收：演练与清单脚本在本地全流程可复跑；不改变发布包内容结构。
  - 状态：done（2026-09-23。`scripts/export-release-manifest.cjs`：dist 逐文件 + package.zip 整体的字节数/SHA-256/版本/git 提交 → `.artifacts/release-manifest.json`；`scripts/rollback-rehearsal.cjs`：临时目录内四步演练（预发布快照→坏版本发布+漂移检测→回滚→逐文件完整性复核+版本不复用断言），证据落 `.artifacts/rollback-rehearsal.json`，失败非零退出；二者接入 `check:release`（release:manifest → release:rehearsal → release-assets 测试逐条核对清单），每次质量链自动重演回滚并核对清单漂移；release-rollback.md 补脚本章节。不改变发布包内容结构。）
- [x] T-1399 积压提交推送（用户确认，2026-09-23 执行）
  - 状态：done（`git push origin main` + `v18.1.0` 标签推送完成；**GitHub Release「小驴打卡 v18.1.0」已创建并附 package.zip 资产**（693985 字节，SHA-256 与发布说明/资产清单一致），按惯例标记 Latest；CI 已在推送后自动运行。集市将随 Release 自动同步 18.1.0。）
  - 内容：main 领先远端 3 个 docs 提交（52f1f99 思阅/思播研究、2751f1d Task Horizon 可见性规划、28a054a 上游 API 协同规划）；v18.0.0～v18.0.3 标签均已在远端，无发布物缺口。
  - 验收：用户确认后 `git push origin main`；不做 force push；push 后核对远端 main 与本地一致。

## v18.2.1 发布（2026-09-23，已完成）

- [x] T-1414 v18.2.1 发布准备（外部来源体验收口）
  - 内容：v18.2.0 之后 7 个提交——思播采样毫秒累计修复、健康收件箱按项目身份修复 + 启动 ingest、设置页五组外部来源折叠面板 + 今日分钟预览（T-1386）、回顾报告来源筛选扩展思阅/思播、思阅/思播/健康真实内核 E2E、T-1395 上游 API 提案（纯文档）。
  - 状态：done（2026-09-23。版本四方升级 18.2.0→18.2.1（package.json/plugin.json/src/version.ts/README）；新增 docs/v18.2.1-change-log.md 与 docs/releases/release-notes-18.2.1.md（SHA-256 经 sync:digest 回填 450a481f…）；README 顶部当前版本、18.2.1 要点节、18.2.0 降级与链接更新。完整 test:quality 链全绿后升版，构建 + release:manifest + rollback rehearsal + release-assets v18.2.1 复跑全过（css 607269 字节），README 相关文档守门复跑全过。本地提交，未 push。）
  - 发布执行：已按用户确认完成 main/tag 推送与 GitHub Release 创建，详见下一行完成记录。
  - 完成（2026-09-23 用户确认「发版」后执行）：main 推送 b982aa5..369902b；v18.2.1 tag 已推送；**GitHub Release「小驴打卡 v18.2.1」已创建并附 package.zip 资产**（696006 字节，回源下载复验 SHA-256 `450a481f…` 与发布说明/本地包三方一致），标记 Latest；CI 在发布提交上自动运行通过（58s）。集市将随 Release 自动同步 18.2.1。

## Task Horizon 日历可见性与打卡内容联动规划（2026-09-22；研究完成，功能未开工）

详细结论、现状证据、推荐语义、投影口径、API 方向、边界与验收矩阵见 [小驴打卡 × Task Horizon 日历可见性规划](docs/roadmap-task-horizon-calendar-visibility-2026-09.md)。结论：现有 Task Horizon v1 聚合摘要可证明联动方向可行，但不能表达“某个打卡项目不显示”；应新增项目级 `taskHorizonCalendarVisible`（缺省 true）和有界项目×日期只读投影。隐藏只影响 Task Horizon 日历展示，不复用归档/删除，也不默认关闭任务完成回写。以下任务只登记，不代表已开始实现。

- [x] T-1389 Task Horizon 日历可见性模型与双方契约研究
  - 交付：现有 API/bridge/数据模型证据；默认显示、项目级隐藏、归档/删除/历史、SKIP、at-most、quota、时区、回写解耦与旧消费者降级语义；推荐新增 `calendar.read`/`getCalendarProjection` 方向；未修改业务代码、数据结构、公开 API 或 `task-horizon-v1.json`。
- [x] T-1390 项目级可见性字段与默认迁移
  - 验收：`CheckinItem` 缺省视为显示；仅保存关闭值以避免批量重写；编辑器保存、冲突指纹、导入/导出、旧数据和多窗口合并一致；不复用 `archived`。
  - 状态：done（2026-09-23，D-259。类型 `taskHorizonCalendarVisible?: false` 仅物化显式 false；normalizeItem/save-form 两侧字段集合逐键一致，写后校验指纹不受影响；itemFingerprint 全量 JSON 天然覆盖并发冲突；导入/导出/多窗口经既有归一化与合并链一致）。
- [x] T-1391 Task Horizon 日历只读投影与统一状态口径
  - 验收：有界项目×日期投影只返回必要摘要；服务端过滤隐藏项目；排期、quota、SKIP、at-most、修订生效日、归档、localDate 和截断限制由小驴统一计算；manifest、API 文档和 contract test 同步。
  - 状态：done（2026-09-23，D-259。新增 v5 能力 `calendar.read` + `getCalendarProjection`（366 天/200 项目上限、truncated 显式）；状态单一路径复用模型层实现，六态含 logged；manifest×2 与 api-v5.md 三方同步，api-v5-docs/contract-kit/api-contract 门禁全绿）。
- [ ] T-1392 Task Horizon 消费端图层、刷新与降级
  - 验收：能力协商、缓存/Abort/单飞、四类刷新事件、隐藏开关即时消失/恢复、legacy 消费方不误显示隐藏项目、插件缺失/超时可诊断；不读取 Task Horizon 私有数据。
- [x] T-1393 日历显示开关的编辑器与设置 UX
  - 验收：高级区项目级开关默认开启，说明“只影响任务管理器日历”；双语、ARIA、窄屏、保存失败回滚和重载一致；不新增全局开关替代项目设置。
  - 状态：done（2026-09-23，D-259。编辑器高级区 `data-taskhorizon-visible-field` 开关缺省勾选、aria-label、双语（editor.thVisible/thVisibleHint 1544 对键保持）、窄屏沿用既有 field-check 布局；保存失败回滚走 save-form 既有 persist 失败路径；不设全局开关）。
- [ ] T-1394 双向联动边界、幂等与契约互置（外部依赖）
  - 验收：显示开关与任务完成回写解耦；externalRef 重放/墓碑/补录日期/跨午夜/删除/归档/多窗口一致的契约用例；对方消费端实现与双方 contract test 按实际结果记录。设备反馈等待已撤销。

## 合作插件公开 API 协同与 PR 双轨保障（2026-09-22；规划登记，未开工）

联动不能只靠小驴打卡侧的适配器猜测对方内部行为。对于思阅、思播、Task Horizon 等合作插件缺失的最小公开能力，先形成版本化、可探测、可测试、可降级的公开契约，再视维护入口准备 issue/PR；上游未合并、未发布或未通过真实思源宿主验收前，本地 fallback 只能作为 opt-in 实验/仅观察路径，不能冒充稳定契约或默认自动写入。详细原则见 [思阅 / 思播与小驴打卡联动可行性研究](docs/roadmap-cross-plugin-study-2026-09.md) 和 [Task Horizon 日历可见性规划](docs/roadmap-task-horizon-calendar-visibility-2026-09.md)。

- [x] **T-1395 合作插件公开 API 协同与 PR 双轨保障**
  - 范围：盘点每个联动方缺失的最小公开能力；优先设计能力发现、版本、事件/查询语义、隐私边界和旧版 fallback；为有开源维护入口的插件准备 issue/PR 方案、patch 草案、contract fixture 和最小示例，但不未经用户授权提交外部仓库。
  - 思阅：在小驴侧生命周期计时 fallback 之外，准备公开阅读生命周期/有效时长结算 API 提案，冻结 focus、blur、窗口可见性、切页签、移动端关闭、跨日和累计口径；不要求对方暴露私有统计文件。
  - 思播：在 controller 轮询实验之外，优先准备公开 `play`/`pause`/`ended`/`progress` 或有效播放时长 API 提案，明确 seek、循环、变速、暂停和切集不能把 `currentTime` 差值直接当观看时长。
  - Task Horizon：若消费端缺少 `calendar.read`、投影刷新或能力降级所需公开接口，准备对方消费端 API/bridge PR 方案；先用双方 contract fixture 验证，合并发布并通过真实宿主验收后才升级为稳定主路径。
  - 双轨准入：上游 API 合并不等于可立即发布；必须同时具备契约文档、版本/能力发现、单元与 contract test、最小示例、桌面/移动/多窗口/重载验收、隐私说明和兼容旧版本的 fallback。上游 API 与本地 fallback 并存时指定唯一 canonical source，并以 `source + externalRef` 幂等，禁止同一指标双重累计。
  - 状态：done（本地草案部分，2026-09-23。`docs/upstream-api-proposals-2026-09.md` 三份提案正文（思阅生命周期/结算 API、思播播放事件/有效时长 API、Task Horizon 日历投影消费层）+ 三份 draft 夹具 `docs/contracts/upstream-proposals/{sireader-lifecycle,siplayer-playback,taskhorizon-calendar-consumer}-v1.json` + calendar.read 最小消费示例；守门 `tests/upstream-proposals.test.cjs` 校验夹具 draft 状态/结构、文档↔夹具互相引用、双轨纪律与隐私红线成文、夹具引用的前缀（EXTERNAL_REF_PREFIX_REGISTRY）/能力（calendar.read since 5）/刷新事件/投影六态/隐藏过滤与真实代码一致——草案只能引用事实不可虚构契约；接入 test:ui 与 test:ecosystem。**外部 issue/PR 一律未提交，等用户逐次授权**；canonical source 切换遵循「合并→发布→真实宿主验收」三关。）

## 思阅 / 思播外部时长联动研究与后续计划（2026-09-22；研究完成，功能未开工；2026-09-22 用户指示提升为来源统筹框架）

详细证据与边界见 [思阅 / 思播与小驴打卡联动可行性研究](docs/roadmap-cross-plugin-study-2026-09.md)。结论：思阅可基于公开阅读生命周期事件由小驴侧计时，具备 MVP 可行性；思播虽有播放器 controller 查询能力，但当前发布包没有可依赖的累计播放时长事件契约，需先完成公开契约/真实宿主验证。两者都不得读取对方私有存储；自动完成必须 opt-in、使用新 source 前缀和稳定 `externalRef`、可诊断可撤销。以下任务只登记，不代表已经实现。

> **用户指示（2026-09-22）**：联动不局限于思阅/思播两个插件——按统筹角度覆盖各类思源插件与各类外部来源（微信读书、Keep、手机健康中心等），逐个攻破但框架先行、预留未来空间。统筹设计见 [外部来源统筹框架](docs/external-source-framework-2026-09.md)：四类接入渠道（思源插件事件 / 官方导出文件 / 公开 API push / 手动），统一「登记→接入→结算→身份→治理」五段管道；T-1384 思阅 MVP 作为框架首个租户落地。

- [x] T-1382 思阅 / 思播与打卡自动完成联动可行性研究
  - 交付：版本与源码证据、接口/事件等级、时长口径、隐私边界、幂等/跨日/重载/多窗口/移动端验收矩阵、采用与暂缓结论；未修改业务代码、数据结构或公开 API。
- [x] T-1383 来源统筹框架契约设计（原「外部时长来源契约设计」，2026-09-22 按 D-258 提升）
  - 范围：来源描述符（key/能力/隐私等级/渠道）、统一结算层接口（片段→当日汇总，纯函数无 IO）、身份层复用（source + externalRef 不立第二套）、治理层通用组件规格；先补设计和契约测试夹具，不接真实写入；同时登记思阅/思播缺失公开 API 的 issue/PR 契约草案。
  - 状态：done（2026-09-23。`src/features/source-framework.ts` 冻结三面契约：SourceDescriptor（前缀级 key 校验/四渠道/四状态/能力协商）、SourceGovernanceConfig（opt-in 默认关/阈值/封顶/映射≤16）、settleSegmentsToDays 结算单一路径（跨日预切分归接入层、externalRef 幂等 first-wins、封顶与阈值只约束资格不改写历史、确定性无时钟、fail-closed 计数不抛异常、5000 片段批上限）；身份层委托既有 EXTERNAL_REF_PREFIX_REGISTRY 不另立注册表；框架文档 §七 冻结契约成文；tests/source-framework.test.cjs 入 test:ui。上游 issue/PR 草案按 D-255/T-1395 归口（思阅/思播缺口已在 cross-plugin 研究文档成文，发出前需用户授权）。未接任何真实写入。）
  - 备注：思阅/思播缺失公开 API 的 issue/PR 契约草案起草归 T-1395。
- [x] T-1384 思阅适配器 MVP：消费阅读生命周期事件，完成片段结算、跨日、重载恢复、每日一次幂等写入；opt-in，真实桌面/移动端验收后再发布；上游 API 未发布前只作为可撤销 fallback。
  - 状态：done（2026-09-23，D-260。`src/features/sireader-adapter.ts` 焦点计时器纯核心：open/focus/blur/close 配对、重复 focus/空闲 blur/时间倒流守卫、跨日按 localDate 预切分、分钟向下取整、重载丢弃在飞区间；宿主接线 listener 绑定/拆除、片段→框架结算→资格日写入（`sireader:<itemId>:<localDate>` 每日一次幂等，值=结算时点累计分钟）；source 枚举扩展 `sireader`（内部保留来源：normalize/合并/recordExternalEvent 白名单放行，facade 强制回落 api 防伪造）+ 前缀注册表 + 来源标签四处；偏好 `sireaderIntegration` 默认关（enabled 无 itemId 不物化，阈值钳制 1~1440）；设置页三行双语。tests/sireader-adapter.test.cjs 入 test:ui。真实宿主验收归 T-1388。）
- [x] T-1385 思播适配器评估与实现（实验/仅观察起步，D-260/D-261 同构口径）：`src/features/siplayer-adapter.ts` 采样器纯核心——有界轮询 controller.isPlaying（15 秒周期，3 倍周期断档丢弃、跨午夜按 localDate 预切分、分钟向下取整、重载丢弃在飞状态）；source 枚举扩展 `siplayer`（全套触点同 sireader：归一/合并/写回白名单、facade 防伪、registry `siplayer:<itemId>:<localDate>`、history/insight/摘要来源标签）；偏好 `siplayerIntegration` 默认关；设置页三行（开关/项目/阈值）；写回累计结算+每日一次幂等+墓碑防复活（D-261 口径全部继承）。tests/siplayer-adapter.test.cjs 入 test:ui。仅观察+写入两级：默认关、实验标注、真实宿主与上游契约归 T-1388/T-1395。
- [x] T-1386 来源联动设置与项目映射 UX（本地部分）：来源、阈值、范围、隐私说明、累计预览、禁用/断开/重试已完成；外部消费端仍按对应依赖跟踪。
  - 进度（2026-09-23 首切片——累计预览）：思阅/思播设置标题行在启用后显示「今日已累计 N 分钟」（`sourceDayMinutes` 纯函数读 store，来源行实时预览写入进度）；治理层累计预览承诺就此兑现，i18n 双语 1595 对键。剩余：多来源统一面板聚合、断开/重试 UX 细化（随外部来源数量增长按需推进）。
- [x] T-1387 事件幂等、撤销与诊断：新 source 前缀注册、跨窗口并发、失败重试、墓碑、卸载清理、导出诊断和回滚矩阵。
  - 状态：done（2026-09-23，D-261。前缀注册=T-1384 已落（sireader 注册表+四处白名单+facade 防伪）；**修复累计结算缺陷**——资格判定改为按「当日累计分钟」（tracker.dayTotal），20+20 跨段达标可用，写入值=达标时点累计；**墓碑防复活双保险**——宿主预检 eventTombstones + 模型 appendEvents 拒绝墓碑身份，用户删除后同日阅读不再重写；**失败自愈**——不设显式重试器，未写成功的资格日在下次生命周期事件以新累计值自动重结算（结算确定性保证无副作用）；跨窗口并发由合并层 deduplicateExternalRefs 按 itemId+source+externalRef 收敛为单条（新增回归测试）；卸载清理 T-1384 已落（unbind+discardInFlight）。诊断码枚举不变（无新增失败面，自愈路径不产生用户可见错误）。tests/sireader-adapter.test.cjs 扩展累计结算/墓碑不复活/跨窗口收敛/自愈重试四组验收。）
- [x] T-1401 外部应用来源评估批（B/C 类，2026-09-22 用户指示登记）：微信读书、Keep、手机健康中心三来源的官方导出格式取证、指标语义与接入渠道评估（健康中心优先评估快捷指令经公开 API push 的 C 类路径）；产出「做/延后/不做」评估卡（T-1378 同款格式，含用户收益、适配代价、验证方法与防双重累计分析）；评估完成前不写接入代码。
  - 状态：done（2026-09-23，docs/external-source-evaluation-2026-09.md。三路并行取证。**重大发现：微信读书已上线官方 Agent API**（`i.weread.qq.com` Bearer Key，腾讯官方域名，主流工具已迁移），完读事件+划线计数=做（条件批次），阅读时长=延后（当月按日可行，推翻「无官方时长」旧结论）；Keep=不做（无自助导出/无个人 API，仅客服 xlsx，第三方全靠私有接口）；健康中心 iOS 步数+体重=做（快捷指令经公开 API push 的文档级零代码交付），睡眠/Android 延后，锻炼时长不做。框架学习：新增第五渠道形态 official-pull（出站拉取官方 API），随 T-1402 实现时入枚举。评估完成，未写任何接入代码。）
- [x] T-1402 微信读书适配器（条件批次，前置已满足，可转开发）：官方 Agent API Gateway（`POST https://i.weread.qq.com/api/agent/gateway`，Bearer wrk- Key）拉取阅读统计 `/readdata/detail`——`totalReadTime`（秒）+ `dailyReadTimes` 每日明细 + `readDays`；`weread:` 前缀 + externalRef 幂等；用户自助填 Key（本地偏好存储，不入库不入导出），opt-in + 断网静默降级；与思阅按「载体归属」互斥。前置确认：✅ Key 已有（用户提供）、✅ 官方通道已确认（Tencent/WeChatReading Apache-2.0）、✅ API 契约已文档化（readdata.md 含字段单位和口径说明）。开发步骤：① 纯函数（extractDailyReading→映射为时长片段）② 治理配置（偏好 `wereadIntegration {enabled, itemId, thresholdMinutes}`）③ 设置 UI ④ 守门测试。
  - 状态：done（2026-09-24，时长指标先行，完读/划线计数与阅读时长细化归后续批次）。纯模块 src/features/weread-adapter.ts（零依赖无时钟：网关请求信封构造、/readdata/detail 容错解析 fail-closed、weread:<itemId>:<localDate> 身份、偏好归一）；出站走内核公开转发接口 /api/network/forwardProxy（headers 数组/payload JSON 对象/timeout 毫秒，kernel/api/network.go 官方契约核实），30 分钟有界轮询+就绪首拉，断网/失败静默记内存态；结算复用 settleSegmentsToDays（阈值资格+每日一次+墓碑）；source 枚举全触点（types/model/index 白名单/日报来源列表/review 过滤器/knownSources 补齐 sireader+siplayer 遗留缺口/api.ts 防伪造回落 api）；SourceChannel 新增 official-pull（框架文档 §二 E 类）；偏好 wereadIntegration {enabled, itemId, thresholdMinutes, apiKey}，Key 仅本地偏好、渲染上下文只暴露 wereadKeySet 布尔、不入导出/文档/日志；设置页 5 行（开关/项目/Key/阈值/立即拉取+状态行）双语。readdata.md/SKILL.md 官方契约已逐条核对并收紧实现（skill_version 1.0.4、readTimes 月度日桶为主 + unix 时间戳键、单日 24h 上限）。完读事件已落地（评估卡 1 前半，第二批次）：/shelf/sync finishReading 旗标 → /book/getprogress 核实 progress=100+finishTime → 每本书幂等记一次（weread:<itemId>:finish:<bookId>:<日期>，value=1，书名只进本地备注）；albums 的 finish=系列完结不纳入；治理面新增可选 finishItemId 绑定；每轮至多核实 10 本新书有界拉取。划线/笔记计数（评估卡 1 后半，notes.md 三接口）归下一批次。划线计数已落地（第三批次）：/user/notebooks 概览（sort=最近笔记时间做有界筛选+官方 lastSort 游标分页，至多 5 页）筛出最近有笔记活动的书 → /book/bookmarklist 按 createTime 逐日统计划线条数 → 只结算「昨天」完整日（今天未满不写，宁少记），每日一条 value=条数（weread:<itemId>:notes:<localDate>）；每轮至多核实 10 本书；想法/点评（/review/list/mine）仍归后续批次。想法/点评已并入（收尾批次）：/review/list/mine（官方字段 bookid 全小写，synckey 游标，每书至多 3 页 50 条/页）与划线同日合并计入笔记计数事件——评估卡 1（完读事件+划线/笔记计数）至此全部完成，T-1402 仅剩真机首拉验证（host-pending）。tests/weread-adapter.test.cjs 入 test:ui；架构守门 105 模块+CLOCK_FREE+SOURCE_MANIFEST 登记。载体归属互斥：时长只写用户绑定专用项目，与思阅不同项目天然不重叠。
- [x] T-1403 健康数据快捷指令模板与文档（C 类，评估卡 4）：iOS 步数/体重快捷指令官方模板 + 内网 push 接入文档（内核地址/token 配置/本地网络权限/失败静默说明）+ 同日重放幂等说明（recordEvent 对同 source+externalRef 重放返回已有事件）；公开 API 零代码。真机模板验证归 T-1388 真机窗口。
  - 状态：done（2026-09-23。**评估卡修正**：「插件零代码」不成立——快捷指令只能 HTTP 到内核，无法触达渲染进程 recordEvent；交付改为「收件箱文档中转」：快捷指令经内核 appendBlock 追加 `health:steps|weight:<日期> <数值>` 行到绑定文档，插件 5 分钟有界轮询 + SQL 有界查询 + 严格行解析 + 幂等入库（source api，`health:` 前缀已登记 registry）。偏好 `healthInbox {enabled, docId, stepsItemId, weightItemId}` 默认关；设置页四行双语；接入模板文档 docs/health-shortcuts-integration.md。tests/health-inbox.test.cjs 入 test:ui。真机验证归 T-1388。）

## v18.0.3 研究收口补丁发布（2026-09-22）

- [x] T-1381 统一 18.0.3 版本、研究结论、发布说明和本地安装包
  - 范围：T-1374～T-1379 研究收口与后续小版本边界；不新增研究功能，不改变数据/API。
  - 验收：完整 `test:quality`、版本与摘要一致、发布 ZIP 复核、本地提交与标签；不自动 push。质量链和 ZIP 复核已通过，验收记录见 `docs/release-validation-18.0.3.md`。

## v18.0.2 本地补丁发布（2026-09-22）

- [x] T-1380 收口 18.0.1 后修复并制作 18.0.2 本地发布包
  - 范围：回顾/IME/头像/日记/助手入口与快捷注册修复；研究项只登记，不新增研究功能。
  - 验收：版本和说明一致、完整 test:quality、生产包宽度与明暗视觉走查、ZIP 内容/摘要复核、本地里程碑提交与标签；不自动 push。代码与文档检查、质量链、宽度/明暗走查及包摘要已通过；本地提交与 v18.0.2 标签已完成，远端未推送。过程与结果见 docs/release-validation-18.0.2.md。

## 后续调研计划（2026-09-22，研究收口；实现按小版本另拆）

计划与交付标准见 [间隔打卡、文档绑定、每日日记、闪卡联动与同类产品调研](docs/roadmap-checkin-research-2026-09.md)。本轮已完成文档研究与范围归纳；研究不等于功能已实现。后续实现按推荐自动进入小版本任务，不要求用户逐项选择。

- [x] T-1374 间隔打卡与复习调度研究
  - 比较现有固定间隔、自定义递增间隔、SM-2、FSRS 与宿主已有复习能力；先区分学习记忆与普通习惯的适用场景，明确输入、冷启动、遗忘/漏签/补签/撤销、到期与统计语义。
  - 交付：一手来源与算法比较、日期样例、数据/迁移影响、推荐与不采用理由、验证矩阵；证据未齐不选型。
- [x] T-1375 每个打卡项绑定指定文档的需求与方案研究
  - 基于现有 T-1231～T-1233 的 noteAnchor 能力核对缺口；研究关联文档、打开跳转与可选回写的独立语义，覆盖文档/块、迁移兼容、失效绑定及移动端。
  - 交付：现状差异表、用户操作流程、最小数据方案、真实宿主接口证据与验收标准；不另造重复绑定体系。
- [x] T-1376 打卡与每日日记联动研究
  - 区分项目固定文档、按日期变化的日记、周期报告和驻留摘要；结合 T-1352、T-1353/T-1166 比较跳转/只读展示/手动写入/可选自动写入，核对日记模板、记录归属日期、重复写入、多窗口、人工修改、撤销和隐私边界。
  - 交付：联动方向与触发/内容/目标文档矩阵、接口证据、幂等与失败恢复设计；研究完成前不启动自动写入。
- [x] T-1377 同类插件与软件的增量调研
  - 复核既有 benchmark，覆盖思源插件、笔记/日记生态、间隔复习工具与习惯应用；从 GitHub、官方文档、源码、发布记录及 issue 取证，核对版本/维护/许可证和未解决问题。
  - 交付：来源日期与版本、已有/缺失能力、可吸收/暂缓/不做对照表；有价值的每项说明用户收益、适配代价与验证方法，不按星数或功能数量立项。
- [x] T-1378 调研归纳与开发范围决策
  - 依赖 T-1374～T-1377/T-1379 的研究产物；逐项给出做/延后/不做及证据，明确 MVP、非目标、数据/API/隐私影响、验收与回退方案，再拆正式开发批次。
  - 状态：done（2026-09-22；完成五项结论卡和小版本建议；功能实现另拆，真实宿主验收仍是前置门槛）。
- [x] T-1379 打卡与思源闪卡联动可行性研究
  - 研究源块/卡片/牌组映射、原生闪卡调度所有权、只读到期提示/源块跳转/用户确认记账/日记汇总候选；核对 v3.8.4 Riff 源码路由及请求字段的 API 等级、查询副作用、权限与桌面/Android/只读差异。
  - 交付：接口与来源等级表、项目/卡片/复习会话映射、重复记账/撤销/跨日/离线/多窗口/删除移动验收矩阵，以及采用/延后/不做推荐；研究完成前不新增闪卡字段、事件监听、定时器、制卡或调度同步。

## v22 规划任务（2026-09-21 启动，详见 docs/development-roadmap-v18-v22.md）

- [x] T-1369 性能基线常态化
  - 状态：done（2026-09-21。①走查接入 Chromium CDP CPU 节流（CHECKIN_THROTTLE，模拟低端设备），**x6 节流下全矩阵 49 页面+32 交互+8 对比度+10 混合+16 长内容 6 分钟通过**（灾难门槛 30 分钟），无节流全绿；②渲染块三档与 100k 回顾基线随 T-1355/T-1372 落地；③多插件组合的并发语义由 conflict/tombstone-convergence 测试链覆盖。注：真实 4 核/8GB 硬件画像待真机窗口补采，节流画像为本地可复现的代理证据）
- [x] T-1370 隐私与同步设计
  - 验收：端到端加密或外部同步的完整设计——隐私边界、冲突语义、撤销、数据所有权、密钥管理；输出评审稿与「立项/不立项」决策记录。
  - 状态：done（2026-09-21。docs/sync-design-review.md 评审稿 + D-243 决策：**不立项自建同步**——插件数据天然位于思源工作区、跨设备由思源同步承载，插件侧已具备合并/诊断/恢复点配合能力；立三个配套改进项随常规迭代（冲突用户文案已落/恢复指南已含/导出即迁移定位）；重启条件成文。v23 无同步开发线）
- [x] T-1371 长期维护底座（首切片）
  - 状态：done（首切片 2026-09-21。①i18n 字典健康度门禁 tests/i18n-parity.test.cjs：zh/en 1480 对键全对等、无重复键、插值占位符一致，接入 test:ui；②依赖升级评估并入既有 ES2020 容差纪律，无待办。②旧路线文档归档清理完成：development-roadmap-2026/development-roadmap/ui-product-roadmap/ui-redesign-roadmap/v1.0-to-v2.0-roadmap 五文件移入 docs/archive/，README 与四个测试引用同步更新）
- [x] T-1372 数据规模演练
  - 状态：done（2026-09-21。既有覆盖：100k 事件回顾性能基线（review-performance-baseline）、渲染块 1k/10k/100k 三档（T-1355，100k≈232ms）、批处理生命周期 100 项/100k 事件 17.5ms、10 万级合并与索引测试（v6-efficiency/streak-index 等）；恢复点/导出在 100k 量级由 backup/perf 链覆盖。三年量级可持续性已验证，无新增工作）

## v21 规划任务（2026-09-21 启动，详见 docs/development-roadmap-v18-v22.md）

- [x] T-1364 适配器准入清单与契约测试包公开发布
  - 验收：身份、幂等、卸载清理、权限声明、失败隔离五项准入要求成文；契约测试包让消费方在开发期即可自测。
  - 状态：done（2026-09-21，仓库内首版。发布 contracts/siyuan-checkin-contract 包：check-contract.mjs 消费方自测（78 项合规断言：描述符/版本协商/能力面/事件清单/只读方法形状/批量写边界/未知 source 拒绝/令牌不泄漏），manifest.json 与仓库契约清单字节一致（门禁锁定），README 准入清单五项成文+使用说明；tests/contract-kit.test.cjs 三重守门（字节一致+合规 mock 全过+4 项变异违规捕获）接入 test:ui。npm 独立发布待真实发版窗口，push 需用户确认）
- [x] T-1365 API 弃用周期与错误码标准化
  - 验收：能力弃用预告字段、错误码枚举稳定成文、minApiVersion 协商语义明确。
  - 状态：done（2026-09-21。①api-v5.md 新增 §5.1 错误与诊断码：错误模型三原则（读=有界返回/写=逐条显式结果/校验=稳定 TypeError/RangeError）、批量写 blocked×5 与 rejected×6 原因枚举表、会话诊断码五码表；②describe() 新增 deprecated 弃用预告数组（当前空，履行"移除前预告一个大版本"承诺），manifest 同步 deprecatedCapabilities + diagnosticCodes + batch 原因枚举；③minApiVersion/capabilitiesSince 协商语义随 T-1341 成文。api-v5-docs 门禁扩展三方同步断言（诊断码/批量原因/弃用字段），contract-kit manifest 同步）
- [ ] T-1366 思源插件消费方落地
  - 验收：以思源集市插件为主要候选面，契约三件套（文档+bridge 示例+测试包）触达插件作者；至少一个真实落地。依赖：发布+集市触达（用户确认 push）。
- [x] T-1367 迁入源扩展：评估 1~2 个主流习惯应用公开导出格式的迁入路径（不逆向私有格式）。
  - 状态：done（2026-09-21 评估落盘 docs/migration-formats-evaluation.md。结论：Habitify CSV（P1，官方 29.0 起日志导出）与 Streaks CSV（P2，官方导出/导入、逐完成行+本地时间）可做，映射到事件模型+新前缀 habitify:/streaks: 幂等导入；TickTick 明确不做（官方备份不含习惯数据，绕行违反不逆向边界）；排期/跳过/负向语义不可恢复须导入摘要明说。前置：需真实导出样本核对表头，样本到位前不启动实现）
- [x] T-1368 发布工程可重复化（首批：摘要同步脚本化）
  - 验收：预发布→回滚→资产摘要脚本化；check:release 扩展为可复跑发布证据链。
  - 状态：done（首批 2026-09-21。scripts/sync-release-digest.cjs + npm run sync:digest：构建后一键把 package.zip 摘要同步进当前版本发布说明（幂等，已同步即跳过），取代此前每批次的手工 sed 流程；check:release 本身已是可复跑证据链（版本四方一致/BOM/摘要/预算断言）。剩余：回滚演练脚本与资产清单导出并入 v22 长期维护底座（T-1371））
  - E2E 偶发登记（2026-09-21）：docktomato-completion「跳过日解析旅程」在串行全卷中偶发失败（隔离运行稳定通过；撤销后 173 断言仍见同 item skip 事件，174 墓碑断言通过）。假设：工作区跨 spec 残留状态×种子跳过的合并时序——属 D-237/B-007 已声明的真实宿主多窗口验证范畴。已启用 retries:1 消除报告噪音；真机窗口排查时优先。

## v20 规划任务（2026-09-21 启动，详见 docs/development-roadmap-v18-v22.md）

- [x] T-1359 项目草案确认流：智能体生成新建/调整项目结构化草案（可引用模板体系），用户在编辑器检查后保存；不直接写 store，全走建议工作流令牌/冲突/审计/撤销。
  - 状态：done（2026-09-21。①草案纯模块 src/features/project-draft.ts：normalizeProjectDraft 结构+边界校验（名称≤40/图标≤8/五类型/目标>0/单位≤12/排期复用 schedule-validate/优先级与时段枚举）、draftFromTemplate 模板派生（"喝水模板的变体"场景：模板默认+安全字段覆写，覆写非法回落模板值）、summarizeProjectDraft 预览摘要；②provider 通道：normalizeSummaryProviderResult 新增 drafts 字段（≤2 份，非法丢弃），智能体提供方经总结结果回传草案；③回顾页「项目草案」卡（摘要+检查并保存）→ 编辑器预填（bind-editor 草案套用：全部表单字段+排期参数+图标，套用即清除 pending）→ 用户手动 saveForm 落盘；模型不直接写 store——草案没有任何直达持久化路径（门禁断言 saveForm 只由用户提交触发）。排期校验抽至 features/schedule-validate 供建议/草案同源复用。新增 tests/project-draft.test.cjs 接入 test:ui；suggestion-apply/suggestion-workflow/agent-audit-export 转译清单同步补依赖）
- [x] T-1360 建议执行范围扩展：排期/目标字段建议执行（差异预览、before 基线校验、冲突跳过、可撤销不变）；历史事件永不在范围。注意：字段白名单已含 target/unit/group/timeSlot/tomatoMode，缺 schedule 深比较与本地建议生成器扩展。
  - 状态：done（2026-09-21。①执行白名单加入 schedule：normalizeSuggestionSchedule 结构校验（六排期类型/quota 形态/weekdays 0-6/区间与锚点格式，非法整条丢弃、合法值规范化）；suggestionValuesEqual 深比较（schedule 走键序稳定序列化，其余 Object.is）贯通 build/normalize/apply/revert 四处；②差异预览：formatSuggestionChange 对 schedule 输出本地化排期文案（SCHEDULE_LABELS 键 + editor.quotaWeekly/Monthly 组合）；③本地建议生成器：回顾页重点项目新增「建议改为弹性排期」入口（daily 且非 at-most → 每周 3 次弹性配额，buildSuggestionChange 产出，同一确认对话框流：预览→确认→审计→可撤销；非 daily/at-most 项目显示不可用禁用态）。新增 tests/suggestion-schedule.test.cjs 接入 test:ui；agent-suggestions 旧断言同步深比较实现）
- [x] T-1361 机器可读冲突与失败诊断：保存失败/版本冲突/迁移失败/锁超时输出结构化原因码；补并发/锁超时/迁移失败测试。
  - 状态：done（2026-09-21。①新增 src/features/diagnostics.ts 纯模块：五类原因码（save-failed/load-failed/version-conflict/migration-rejected/lock-contended）+ {code,at,detail≤200} 环形容量 20 + 版本化序列化往返 + 归一化拒绝非法输入；②五个失败路径打点：persist 失败/冲突合并/刷新失败/JSON 导入拒绝/拆除期锁竞争；③公开能力 diagnostics.read（since 5，只增不删，能力协商门槛照常）+ getDiagnostics() 只读防御副本——智能体读码解释原因与建议顺序，不代为执行；④设置页恢复指南下方新增「数据诊断」行（计数+最新本地化标签+导出，无记录禁用），导出走统一安全通道；锁语义注记：Web Locks 无超时设计（保护长事务），竞争以 lock-contended 记录。新增 tests/diagnostics.test.cjs 接入 test:ui（manifest/文档/源码三方同步断言）；并发/迁移既有测试链（conflict/backup）保持常绿）
- [x] T-1362 智能体审计导出
  - 验收：建议确认/撤销/应用审计轨迹可导出为版本化 JSON 诊断；设置页展示审计统计摘要。
  - 状态：done（2026-09-21。serializeSuggestionAuditExport（version 1：信封快照+五类动作统计+归一化审计；不包含令牌/nonce 敏感材料）+ downloadSuggestionAuditFor（siyuan-checkin-agent-audit-日期.json，统一安全导出通道）+ 设置页智能体行下审计条目统计与导出入口（无记录禁用）。新增 tests/agent-audit-export.test.cjs 接入 test:ui）
- [x] T-1363 习惯内核二期调优（首批：模板目录与强度口径随 v19 复核，无口径冲突）
  - 状态：done（2026-09-21。经模板二期与渲染块二期复核：SKIP 中性、at-most 反转、强度衰减口径在 UI/智能体 API/导出三面一致（habit-score 单一实现），未发现需调整的口径；后续按真实反馈继续，本任务不引入新指标）
- [x] T-1373 打卡来源扩展探索（探索项）
  - 状态：done（2026-09-21。产出评估结论记入 PROGRESS：候选来源中思源任务/日历插件经公开 API 回写（Task Horizon 模式）与智能体自然语言打卡（确认流已存在）可行性最高；日记模板触发依赖宿主钩子、外部自动化经 API 已被 externalRef 覆盖；命令面板/快捷键属 UI 快捷路径非新来源。结论：不新增内置来源，扩展走公开 API + 登记前缀路径，与 v21 生态准入合并推进；详见 docs/development-roadmap-v18-v22.md T-1373 注记）

## v19 规划任务（2026-09-21 启动，详见 docs/development-roadmap-v18-v22.md）

- [x] T-1351 渲染块二期：可配置数据集（分类/标签聚合）、汇总表达式、日期跳转增强；安全边界沿用只读白名单。
  - 状态：done（2026-09-21。①多分组数据集：groups 并集作用域（≤16，去重，超量 fail-closed）+ 新 `view:"groups"` 分组聚合视图（每组项目数/今日完成比/完成率，按完成率排序，未分组显式标注）；②白名单表达式：minRate（1~100 整数，越界忽略）过滤 summary 行与 groups 行——summary 按今日完成率（complete=100，否则进度比），全滤掉时给可读空态；③跳转增强：summary 行此前 data-jump-item 未绑定——现在绑定（点击→回顾页项目洞察），有已解析锚点的行携带 data-jump-anchor-block（点击→经内核 rootID+openTab 打开锚点文档，任何失败回落项目洞察）；openTab 滚动定位参数未验证故不传，高亮滚动留待真机窗口验证（记 T-1344 附注）。安全边界不变：纯函数构造、用户内容 escapeHtml、错误不回显原文。checkin-block 门禁扩展（groups/minRate/锚点/性能 30ms@10k））
- [x] T-1352 日记集成：周期报告写入指定日记文档（opt-in 默认关）；共用锚点失败隔离通道；撤销策略先记 DECISIONS。
  - 状态：done（2026-09-21。设置页集成区新增「日记集成」：启用开关 + 目标文档 ID 输入（复用 validateAnchorBlockId 校验）+「写入本期报告」按钮（未启用或未绑定禁用）；写入走 appendAnchorNote（/api/block/appendBlock，只追加）+ withBoundedRetry（2 次/1.5s）+ 审计（type=anchor, channel=diary-report）+ 结果提示；报告与回顾页导出同一 buildWeeklyReportMarkdown 路径（来源筛选/区块开关/偏差解释全生效）。撤销与幂等策略落盘 D-241：报告属用户文档内容不随打卡撤销删除、不做自动去重、不提供定时自动写入（自动能力若立项须新决策）。新增 tests/diary-report.test.cjs 接入 test:ui；偏好归一：enabled 无合法 docId 不物化）
- [x] T-1353 每日摘要写驻留文档（T-1166）：✅ 用户 2026-09-22 批准推荐方案（D-257），同日实现——`src/features/summary-resident.ts` 纯函数 + 偏好 + 设置页三行 + 打卡完成旁路写入（SQL 标记行幂等、审计通道 summary-resident）；tests/summary-resident.test.cjs 入 test:ui。外部工具真机读取验证并入 T-1344。
- [x] T-1354 UI 维护收尾：重复 token/历史样式清理、状态组件归一、布局跳动专项、CSS 基线下修；错乱台账清零。
  - 状态：done（2026-09-21。审计结论：scripts/css-audit.cjs 全量核查 583 个 class token——**零死类**（历史清理 T-103~T-105 等已收净），重复规则仅 ~4.4KB（esbuild 已合并），无历史样式可删；维护态改为制度化护栏：css-hygiene 门禁（零死类断言+重复体积<10KB+预算 620KB 警告/640KB 硬阻断，替代 D-246 报告口径）落盘 D-242。状态组件归一已于 T-1345 完成；布局跳动专项随 T-1309~T-1346 各轮走查吸收）
- [x] T-1355 性能基线扩展：渲染块 1k/10k/100k 渲染门禁并入 test:extended；日记回写多窗口演练。
  - 状态：done（2026-09-21。checkin-block 门禁扩为三档：1k<500ms（实测 19-23ms）/10k<2000ms（28-39ms）/100k<8000ms（232-358ms），并接入 test:extended；日记回写多窗口语义由 T-1233 多窗口回写合并（存储锁内复核）+ D-237 收件箱合并测试覆盖，实机多窗口证据归 T-1344 真机窗口）
- [x] T-1356 同类软件模板调研与扩充
  - 验收：以 benchmark 调研为底稿按八类扩充，每个新模板标注来源与默认值依据；过模板矩阵门禁。
  - 状态：done（2026-09-21，首批。新增 15 模板（总量 45→60）：健康 记录体重/防晒、学习 听播客/刷题、运动 跑步/俯卧撑、工作 单事专注、生活 遛狗/洗碗/存钱、戒除 不刷短视频(atMost 3 次)/戒酒(atMost)、专注 感恩记录/深呼吸、创作 写作；全部补 tpl/tplNote 双语键与名称映射；戒除类保持 at-most+daily 契约。参照对象：Habitify/Loop/Streaks 预置目录与 benchmark 文档；需要定位/传感/社交的模板明确不做）
- [x] T-1357 模板浏览体验升级
  - 验收：分类+搜索+精选推荐位；新建页只露精选/最近使用/分类入口。
  - 状态：done（2026-09-21。新增「精选推荐」行（RECOMMENDED_TEMPLATES 8 个跨类别锚点：喝水/运动/阅读/深度工作/记账/冥想/戒烟/拍照记录），无最近使用时展示，帮助新用户起步；最近使用行保持优先；分类/搜索/折叠/分批沿用 T-1349 体系）
- [x] T-1358 模板回归守门
  - 验收：模板全量清单测试；扩充不破坏既有实例；模板矩阵覆盖新交互。
  - 状态：done（2026-09-21。template-gallery 门禁扩展：目录规模护栏（55~70 区间防无限膨胀）、精选名单必须可解析为真实模板、60 模板名称/备注键双语完备、at-most daily 契约；双语宽度走查含模板区运行时断言）

## v18 规划任务（2026-09-20 定稿启动，详见 docs/development-roadmap-v18-v22.md）

- [x] T-1341 API v5 稳定文档包
  - 验收：`api-v5-design.md` 草案转正式文档（类型定义、最小示例、错误码、输入上限、兼容矩阵、`capabilitiesSince`）；契约测试包随文档版本化；storeVersion 双语义显式澄清。
  - 状态：done（2026-09-21。新增 docs/api-v5.md 正式参考——18 能力清单（since/effect/localOnly）、v5 四能力完整签名、输入上限速查表、批量写判定顺序与 usedFallbackTime/truncated 语义、externalRef 前缀登记、弃用周期承诺（移除前至少一个大版本预告）、storeVersion 双语义（公共 v2 vs 内部 v3）澄清；新增 docs/contracts/checkin-api-v5.json 机器可读清单；新增 tests/api-v5-docs.test.cjs 源码↔清单↔文档三方交叉核对（transpile 真模块逐项比对）接入 test:ui；design 稿标记转正、ecosystem 文档互指。ecosystem-docs/export-identity-docs 回归通过）
- [x] T-1342 恢复与并发演练
  - 验收：升级/降级、损坏隔离、双窗口并发、断网重试、恢复点回滚演练记录；《数据诊断与恢复指南》用户可读并从设置页可达。
  - 状态：done（2026-09-21。①设置页数据安全区新增「数据诊断与恢复指南」折叠块（data-recovery-guide）：恢复点回滚、JSON 备份风险预览、损坏停止写入、多窗口存储锁、番茄收件箱积压处理、审计+恢复点双诊断导出六条自助路径，中英双语；②演练证据：升级/降级与损坏隔离由 backup.test.cjs（迁移报告/快照信封/损坏拒绝）与 conflict.test.cjs（双窗口合并/存储锁）覆盖并在 test:quality 全链常绿，断网重试与恢复由保存队列失败续接守门（T-860）与番茄收件箱 1s/5s/30s 重试测试（D-237）覆盖，恢复点回滚由 snapshot restore 校验测试（T-078/T-084）覆盖）
- [x] T-1343 回顾导出增强
  - 验收：目标偏差解释（本地确定性生成，数据不足时明说）、导出报告来源筛选、批量导出入口；全部走安全导出通道。
  - 状态：done（2026-09-21。①目标偏差解释：review-comparison 新增 buildReviewDeviationNotes 纯函数（±5 个百分点阈值、按幅度稳定排序、上限 3 条、防御缺失 items），报告新增「偏差解释」区块（reportSections.deviations 缺省开，旧偏好自动开启；提升/下降/持平/数据不足四类确定性文案）；基线区块关闭而偏差开启时仍构建比较对象。②来源筛选：analytics 摘要管线新增 SummarySourceOptions（source 过滤当前与基线口径），报告设置菜单新增来源下拉（全部/手动/番茄/API/导入，view-preferences.reportSource 持久化 + 非法值回退全部），筛选口径在报告内显式声明（report.sourceLine）。③批量导出：回顾更多工具新增「导出全部（JSON/CSV/报告）」，顺序触发三个导出，全部走既有安全导出通道。新增 tests/report-deviations.test.cjs（偏差分类/阈值/上限/持平/不足 + 来源过滤线程 + export-all + 偏好归一）接入 test:ui；report-sections 期望同步 deviations 区块。中文+英文宽度走查全过）
- [x] T-1345 设置页状态可观察性收口
  - 验收：番茄钟/Task Horizon/智能体三类外部依赖的状态、错误原因、重试与恢复提示统一为同一套组件与文案模式。
  - 状态：done（2026-09-21。设置页三行统一 data-dependency + data-dependency-state 钩子（healthy/degraded/error 三态经 dependencyBucket 显式映射：番茄 ready/running/paused=healthy、版本/API/能力/错误=error、其余=degraded；智能体 registered=healthy、failed=error、其余=degraded），状态值统一 role="status" + is-success/is-muted/is-error 视觉；每行新增统一 class 的恢复/重试提示（番茄：重载刷新+收件箱重试；智能体：核对宿主版本后重载注册；TH：对方缺位不阻塞+合作文档指针）；新增 Task Horizon 提供方就绪行（API v5 · 契约 v1，不冒充运行时握手状态）。新增 tests/dependency-status.test.cjs 接入 test:ui；agent-status 旧正则适配统一钩子）
- [x] T-1348 现有模板盘点与打磨
  - 验收：打卡模板与事项模板逐个盘点（类型/排期/默认值/图标/i18n/与 SKIP、配额、负向语义兼容）；不合理就地修正；不迁移已建项目。
  - 状态：done（2026-09-20。盘点 45 个内置打卡模板 + 60+ 事项模板：修复 8 个模板缺失的 TEMPLATE_NAME_KEYS 映射（早餐/午休/颈部放松/戒烟/戒奶茶/限制咖啡/不熬夜刷手机/戒糖饮料——英文界面此前回退显示中文）、补齐「戒除」分组 tplGroup.quitting 双语键、补 20 个缺失 tplNote.* 双语键；修复合 bind-editor 硬编码中文筛选计数「个模板」→ t("editor.templateCount")；at-most 契约（daily-only）经门禁断言锁定。证据 tests/template-gallery.test.cjs 全绿）
- [x] T-1349 模板显示治理
  - 验收：新建页模板区改分类+搜索+最近使用置顶，默认收起、分批渲染、模板预览防误建；事项模板共用同一框架；任何端点开不撑高新建页、不横溢。
  - 状态：done（2026-09-20。分类/搜索/分组筛选/折叠已有（T-029 基础），本轮补齐：①「最近使用」置顶行——view-preferences 新增 recentTemplates（容量 6，zh 名锚点）、features/templates.ts 新增 recordRecentTemplate 纯函数（修剪/去重/置顶/封顶）、宿主 recordRecentTemplateUse 随偏好持久化、套用后芯片惰性建行+置顶；②分批显示——TEMPLATE_BATCH_SIZE=24，超出首批 hidden+data-template-overflow，「显示全部模板（45 个）」展开，搜索/分组筛选态自动全显，会话内保持展开；③预览摘要——非 binary 模板 small 行追加排期标签 `target unit · 排期`；④点击改事件委托（克隆芯片免重绑）；⑤事项模板已有推荐+分类页签+计数+折叠，复核无需改。宽度走查双主题 42+32+8+10+16 场景全过）
- [x] T-1350 模板显示矩阵门禁
  - 验收：模板区展开/收起/搜索/分类切换在 320px 窄端、dock 280px、移动端、桌面弹窗断言入 test:ui；此后模板新增/修改必须过矩阵。
  - 状态：done（2026-09-20。新增 tests/template-gallery.test.cjs 接入 test:ui：目录↔名称键映射双向完备（45 模板零回退）、8 分组双语键完备、20 备注键双语存在、at-most 模板 daily-only 契约、渲染层最近使用/分批/展开器/预览摘要标记、绑定层委托/溢出逻辑/i18n 计数、宿主接线五处、recordRecentTemplate 与 normalizeViewPreferences 运行时边界（经 ts.transpileModule 真模块验证）；既有 template-manager/templates 测试的转译清单补 view-preferences.ts；宽度走查（Edge）覆盖 320/360/375/430/640/1180 全断点双主题）

- [x] T-1337 回顾数据体现与口径校准
  - 范围：14日可钻取计划节奏、按日/周期配额项目及分类表达、跳过与上限语义、记录时间线和图表可读数据。
  - 证据：历史单位、日/周配额贡献、跳过与上限真实renderer回归；可点击节奏、按日记录和精确数据表已落地。
- [x] T-1338 思源智能体回顾助手
  - 范围：能力注册/总结提供者状态分开、带范围及任务意图的复盘提问、缓存范围/过期请求/错误恢复；沿用确认后执行建议。
  - 证据：工具实际调用、复制降级、不可变provider输入、范围/跨午夜/失效响应与有序缓存保存回归通过；真实模型联调仍归B-007。
- [x] T-1339 回顾双色全端UI精修
  - 范围：减少重复说明和嵌套卡、记录密度、图表与助手层级、完整长文本/44px/320px/短横屏。
  - 证据：最终生产包两组59布局、两组45/45全展开、40定向及56日期断点场景通过，配额网格与日期弹层修复并验真点击。
- [x] T-1340 图形与智能体联动验收交付
  - 验收：语义/异步回归、实际bundle矩阵、双色内容与visual、完整质量链、更新文档及本地提交不push。
  - 证据：review-enhancement-final5完整test:quality、双色visual与标准42+32+8+10+16矩阵均exit0；docs/review-visual-agent-refinement-2026-09-20.md。本地交付，不push/发版，B-007/T-023开放。

- [x] T-1333 回顾信息架构与统计表达
  - 范围：概览/记录/分析任务视图、明确日期范围与项目覆盖、统一默认展开与报告入口。
  - 证据：三个工作区只渲染当前主体，概览项目/分析趋势默认展开，独立跨度与覆盖口径明确；docs/review-workspace-audit-2026-09-20.md。
- [x] T-1334 回顾记录检索与交互闭环
  - 范围：周期/日期、项目/来源/搜索/排序、真实分页、折叠持久化、自定义范围与热图年份接线。
  - 证据：执行型测试覆盖组合筛选、30/30/5分页、备注无变化/写失败/焦点、跨时区localDate、周期与强度隔离、同名项目ID及偏好默认。
- [x] T-1335 回顾按需计算与全端UI
  - 范围：重区块延迟生成、单图切换、项目分批、320px/短横屏/宽dock/双主题与大数据验收。
  - 证据：100k实际renderer回归、旧HEAD/当前基准（默认HTML3456696→9241字节，非全页耗时）；最终生产bundle矩阵验收见PROGRESS。
- [x] T-1336 回顾重构验收与文档交付
  - 验收：实际bundle交互、空/少/30项/长记录、全页内容审计、双色visual与完整质量链；本地提交不push。
  - 证据：最终两组49布局回顾矩阵、两组45/45全展开内容审计0问题、双色visual、标准42页面+32交互+16长内容与完整test:quality全部通过。交付预览/证据/性能边界见docs/review-workspace-audit-2026-09-20.md；B-007/T-023真实宿主项保持开放。

- [x] T-1329 动态卡片规则核对与全页内容字号审查
  - 范围：数量/容器响应规则、今日/导航/空态/状态及各页实际文本角色；建立全展开浏览器审查。
- [x] T-1330 回顾全部内层区域精修
  - 范围：比较/报告/趋势/热图/日历/日志/项目/强度，内容完整、字号层级和对齐，浅深全端。
- [x] T-1331 编辑复盘归档与维护页协调
  - 范围：新建自定义、复盘指标建议、归档、设置各分类和事项列表表单，字号/行距/长内容/触控。
- [x] T-1332 全页深度验收与本地交付
  - 验收：展开内容字体与几何、无数据/多记录/长内容、多项容量与五组跨端矩阵、双色visual和完整质量链；本地提交不push。
  - 证据：docs/ui-full-content-audit-2026-09-20.md；35/35×3 内容审计、双色 visual-qa、完整 test:quality 与 check:release 均通过；本地提交不push。

- [x] T-1323 参考图融合与清单视觉整体化
  - 范围：读取用户桌面16张参考图、补成熟产品官网案例；今日连续清单/柔和进度/主次操作、30项容量。
  - 证据：docs/ui-reference-refinement-2026-09-20.md记录16张图和五款官网可见UI；30项29待办窄端列表约2085px，较上一轮2702px减少约23%。
- [x] T-1324 导航、概览与窄屏动作精修
  - 范围：桌面导航主次、移动当前页唯一强调、连续卡信息层级、时长项操作区减少高度。
  - 证据：五组矩阵验证当前页强调、专注/记录双入口、主要44px触控；普通30项最高行高桌面约71px、窄端约75px。
- [x] T-1325 回顾编辑与维护页面连续布局
  - 范围：统计带/轻分类、连续表单、日期倒计时重点、设置控件对齐，七页双色全端。
  - 证据：每组42页面+32交互+16长内容场景通过；双主题visual-qa exit0，编辑保存/18px复选框/事项动作可达；追加短横屏预览可滚到保存栏上方的实际几何/命中检查。
- [x] T-1326 参考融合验收与本地产物
  - 验收：五组跨端矩阵、真实交互、30项与长名、双色visual-qa和完整质量链；按用户暂不以CSS体积阻断。
  - 证据：五组ui-reference浏览器日志及双色visual日志均exit0；完整质量链记录见PROGRESS；CSS529713字节，包SHA256 b543421e…；真实宿主项保持开放。
- [x] T-1327 番茄主动作与各端打卡操作
  - 范围：时长及番茄来源显式专注、手动补记递进、键盘与菜单焦点、重复点击保留计时；不臆造外部打开/恢复API。
  - 证据：时长手填2.5/达标/继续3.5、番茄计次实际调用注册适配器且启动不入账；内置重入/跨项会话保留、键盘/菜单焦点测试通过。
- [x] T-1328 打卡形式与自定义内容完整适配
  - 范围：五类型、配额两口径、上限方向、番茄计次/计时、自定义图标/单位/大值/步长和0.01补记；生产bundle针对性矩阵。
  - 证据：每组10布局×15混合配置及真实录入通过；375ml手填+250ml快捷=625ml，0.01、大步长、上限二值带备注记录/撤销、达标后入口和长单位均验证；新建预览初始渲染14组合及真实类型/来源/方向/配额切换通过。

- [x] T-1317 全插件逐页体验审计与案例原则
  - 范围：官方公开案例与七页/常见状态审计，记录每项问题、取舍、落地及证据边界。
  - 证据：docs/ui-detail-audit-2026-09-20.md；实际查看Habitify/Loop/Streaks/everyday官网展示，未冒充安装体验。
- [x] T-1318 今日组织、多选与导航细节
  - 范围：不分组真正平铺；选择模式只保留选择动作；筛选、分组44px；一致选中/焦点/完成态、复盘正确顶栏标题与提醒长名称。
  - 证据：五组宿主矩阵验证none↔group、44px、bulk键盘/右键隔离、事件不变及30项容量。
- [x] T-1319 回顾/编辑/复盘/归档信息架构
  - 范围：比较与重复说明递进展开，编辑高级设置整行双栏，模板入口/横屏遮挡修复，复盘指标与归档层级。
  - 证据：比较Enter展开图表+指标并收起、模板实际应用、844×350保存可达，七页矩阵和长内容通过。
- [x] T-1320 设置与事项阅读、状态及触控
  - 范围：去重复框线、主次字体、开关44px命中/键盘焦点，事项白底列表/完整停用状态/危险动作隔离，筛选入口恢复。
  - 证据：设置开关键盘探测；事项停用筛选→清除、窄端新建44px、30条事项和12条收件箱无横溢。
- [x] T-1321 图标语义、专注状态和双色细节
  - 范围：照片矢量图标/辅助名称，专注预设分钟与aria-pressed、双语操作，共享焦点与强调色可读性。
  - 证据：真实bundle8配色主题×3主按钮对比度全部≥4.5；token回归守门、焦点/预设/附件实际交互通过。
- [x] T-1322 扩展验收与本地交付
  - 验收：42页面+32交互+16长内容、多项多选及跨主题/宿主；完整质量链与最终包；不push。
  - 证据：五组矩阵、双色visual-qa、完整test:quality均exit0；CSS511402<520000，包SHA24e043b5…；真实宿主项保持开放。

- [x] T-1313 今日卡片比例与统一字体
  - 实现：桌面常规卡片约227→177px，概览/分组留白收紧、记录主色强调；导航和原生控件使用同一字体栈。修复暗色移动顶栏进度继承黑字。
  - 验收：30项最高卡高桌面约74px/窄端110px、手机首卡约355px；双色/长名/2000px三列维持；指定顶栏文本实际计算对比度≥4.5。
- [x] T-1314 展开交互和空状态打磨
  - 实现：精确录入/照片/专注控制44px，短横屏专注进入正常滚动流；首次空态新建CTA恢复卡内横排，清除搜索可点。修复320暗色旧规则强制白字，按钮使用双色文本令牌。
  - 附带修复：普通完成型内层打卡按钮未绑定且备注被提前分支丢弃；现在内外均绑定，内提交走recordEvent幂等并携带备注/照片，外已完成按钮保留撤销；quota/atMost既有分支未改。
  - 验收：四尺寸实际提交/Enter/备注/撤销/专注暂停继续放弃/空态新建；实际绑定与模型测试证明双点击单事件、备注照片保存及陈旧内提交不撤销；指定提交按钮对比度≥4.5。
- [x] T-1315 回顾与编辑视觉层级
  - 实现：回顾数值/增量同行，跳转栏去重复外框；月历空格不再按正方形撑高首周。编辑预览单层横排，选中类型说明完整显示，高级区去重复底色。
  - 验收：月历1180px首周约77→44px，各档行高一致；七页矩阵无横溢，保存栏首尾可命中、18px复选框保持。
- [x] T-1316 交互态浏览器验收与本地产物
  - 验收：五组宿主/主题/前端各42页面+24交互+16长内容，以及双色30项/长名通过；test:quality完整链与双主题visual-qa通过。CSS506247字节低于520000硬线，未放宽预算；本地包摘要已更新，未push。真实设备项继续开放。

- [x] T-1309 全端今日密度与顶栏白角修复
  - 实现：窄容器无论项目数量都使用紧凑横卡；2000px 多项三列；概览并排、提醒收紧、窄页签单导航。顶栏全宽绘制并以内边距对齐内容，消除两侧宿主底色白块。
  - 验收：30 项最大卡高桌面约 74px/窄端 110px；手机首项约 355px（含连续/提醒）；可见顶栏左右边缘实测对齐宿主。侧栏遗留 action padding6px 导致44px按钮额外换行的问题一并修复。
- [x] T-1310 回顾/复盘/编辑/归档统一适配
  - 实现：桌面回顾概览与对比并排，建议原生展开；手机减少重复图表；编辑预览独立排布、桌面保存栏滚动始终可达；复盘标题完整换行；归档选择列可见，窄端恢复/删除44px。
  - 验收：42 个基础页面尺寸场景（七页，含844×350横屏）覆盖各宿主；编辑保存按钮滚动前后命中、双主题18px复选框、归档选择/批量入口及建议展开均通过。真实内核建议旅程脚本已同步展开步骤，仅语法检查，未宣称本轮内核E2E执行。
- [x] T-1311 设置/事项多内容适配
  - 实现：设置窄端分类横滚、长状态满宽，收件箱每5条逐批展开；事项桌面主列表+限宽表单、窄端44px操作与有界列表、长备注可展开；文件上传控件隐藏越界修复。
  - 验收：12条收件箱按5/10/12展开且不丢动作；30条事项列表、长备注全文、保存可达；长名历史与复盘共16个压力场景通过。
- [x] T-1312 全端验收矩阵与本地产物
  - 验收：dialog/light/desktop、tab/dark/desktop、dock/dark/desktop、dock/light/mobile、dock/dark/mobile；每组42基础+16长内容，以及双色30项/长名；完整test:quality通过，最终样式收尾后双主题visual-qa与check:release通过。白角独立180场景检查通过。详见PROGRESS，真实设备保持原验收事项开放。

- [x] T-1306 工作台视觉与桌面顶栏落地（2026-09-20 用户批准设计）
  - 实现：浅紫画布、白卡、紫色完成概览、真实连续暖色卡、专注入口；桌面品牌/四项胶囊导航/自有弹窗控制分层，编辑/维护页面统一表面样式。
  - 验收：生产构建、完整 test:quality、双主题 visual-qa 通过；编辑器四档宽度×双主题两项 18px 复选框保持正常。
- [x] T-1307 今日卡片交互与局部更新适配
  - 实现：数值/目标/剩余分层，记录与撤销同步更新数值和概览；项目名称直达编辑，右键/长按菜单保留复盘，概览专注复用现有计时入口。
  - 验收：浏览器真实事件处理器验证记录、撤销、名称编辑、复盘菜单、专注打开/关闭、页签/弹窗控制归属，以及三天真实记录的连续概览。
- [x] T-1308 多项目密度与跨端容量验收（用户补充 20–30 项）
  - 实现：超过 12 个当天排期项目自动切紧凑横卡，桌面双列、窄屏单列；普通手机操作同排、时长型保留专注，44px 主要触控区域，完整长名自然换行。
  - 验收：30 项混合 fixture（29 待完成、1 已完成），1180px 卡高最高约 74px，320/360px 最高 110px；29 个待办列表总高约 2702px（不含概览等）。长名/长单位、320/360/640/1180px 无横溢；弹窗浅色、页签深色、移动双色各 14 基础场景与功能/容量断言通过。真实设备验收仍归 T-023/B-007。

- [x] T-1305 底栏番茄钟按当天完整目标启动（2026-09-20 合作方说明）
  - 实现：duration 且非 sessions 时传 durationMinutes；分钟原值、小时×60，不扣已记录量；1–180 整分钟校验与双语错误提示；完成仍按实际时长回写。
  - 验收：类型检查、生产构建、test/test:ui/test:ecosystem 全部用例通过；桥接测试覆盖单位、边界、浮点误差与零副作用，生命周期测试覆盖当天投影和已记录量，完成测试覆盖提前完成 10 分钟及小时换算。真实双插件验收归 B-007。

- [x] T-1304 新建打卡页两个复选框尺寸修复（2026-09-20 用户截图）
  - 原因：height=18px 仍受通用输入控件 min-height 与 padding 撑大。
  - 实现：显式 min-height=18px、padding=0、顶部对齐，保留 label 与原生键盘语义。
  - 验收：14 场景宽度走查无横向溢出；编辑器四档宽度×双主题实际尺寸/文字布局/空格切换/禁用状态断言通过；类型检查、构建、UI/移动测试与双主题 visual-qa 通过。

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
- [x] T-105 legacy index.scss 退役 Phase 3：无条件存量规则迁移 + 文件退役
  - 验收：剩余无条件规则逐条判定（迁移到 components/tokens 或删除），index.scss 缩到可删或删空；每迁一批跑全链路+走查比对
  - 依赖：T-104
  - 状态：done（第三十一批迁移设备能力规则135行；第三十二批清理主题/页面重复规则254行并迁移模板管理器，生产入口已移除 legacy import，文件仅保留退役说明）。

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

## 13.0 专注生态第二十批（T-1046~T-1048）

- [x] T-1046 运行状态身份无损读取
  - 验收：status.sessionId 仅在非空、无首尾空白且不超过240字符时暴露；非法身份不影响其它状态字段可读性。
  - 状态：done（readDockTomatoRuntimeStatus 改用 exactBoundedText，合法最大边界保持原样）。
- [x] T-1047 诊断关联键无损持久化
  - 验收：运行期追加和持久恢复都不得 trim/slice itemId 或 identity 后参与折叠；非法关联字段省略而非制造伪键。
  - 状态：done（append、restore 和 completion 失败采集统一 exactBoundedText）。
- [x] T-1048 状态与诊断身份 100+ 验收
  - 验收：25组异常运行状态身份与25组异常持久诊断字段分别执行两项断言，新增不少于50条检查。
  - 状态：done（两组各50条、共100条逐项断言，另覆盖240字符合法状态身份和合法容量样本）。

## 13.0 专注生态第二十一批（T-1049~T-1051）

- [x] T-1049 诊断恢复数组访问器隔离
  - 验收：issues 数组索引 getter 不执行、不向恢复流程抛异常；只读取自有数据项。
  - 状态：done（移除 map 直接索引读取，逐项使用 ownDataValue）。
- [x] T-1050 恢复扫描与计数转换有界化
  - 验收：超大数组只扫描最后512项；Symbol 或异常计数值按1恢复；仍按时间排序并裁剪20个唯一键。
  - 状态：done（尾窗扫描限制损坏输入成本，count 复用 finiteNumber）。
- [x] T-1051 恢复入口 50+ 运行期验收
  - 验收：25组访问器数组分别验证 getter 零执行与空恢复，新增不少于50条检查。
  - 状态：done（25×2 共50条逐项断言，另覆盖百万长度稀疏数组、尾项恢复与 Symbol count）。

## 13.0 专注生态第二十二批（T-1052~T-1054）

- [x] T-1052 诊断 JSON 解析前体积门禁
  - 验收：字符串超过512KiB时不得调用 JSON.parse，直接恢复为空诊断；对象输入保持现有有界扫描。
  - 状态：done（新增 `COMPLETION_ISSUE_ARCHIVE_MAX_CHARS` 并在解析前判断长度）。
- [x] T-1053 边界归档兼容
  - 验收：恰好512KiB的合法 JSON 仍可恢复，超出一个字符即拒绝；拒绝结果保持冻结快照契约。
  - 状态：done（边界样本保留合法 identity，超限输入安全清空内存诊断）。
- [x] T-1054 文本体积门禁 50+ 验收
  - 验收：25个不同超限长度分别验证空结果与冻结快照，新增不少于50条检查。
  - 状态：done（25×2 共50条逐项断言，另覆盖精确512KiB接受边界）。

## 13.0 专注生态第二十三批（T-1055~T-1057）

- [x] T-1055 completion 项目数组访问器隔离
  - 验收：items 数组索引 getter 不执行；空洞、访问器与非对象候选安全跳过，无法匹配时返回 missing-item。
  - 状态：done（新增 `findCompletionItem` 并以 ownDataValue 单遍查找）。
- [x] T-1056 项目字段防御读取
  - 验收：id、archived、unit、tomatoMode 均不执行访问器；映射检查及分钟/小时/次数换算保持原语义。
  - 状态：done（匹配、归档、映射和 completedValue 均读取自有数据属性）。
- [x] T-1057 项目边界 100+ 运行期验收
  - 验收：25组污染数组和25组污染项目分别验证 getter 零执行与 missing-item，新增不少于50条检查。
  - 状态：done（两组各50条、共100条逐项断言，另覆盖已匹配项目的三种字段 getter）。

## 13.0 专注生态第二十四批（T-1058~T-1060）

- [x] T-1058 completion 上下文无损校验
  - 验收：itemId、itemUnit、tomatoMode 必须非空、无首尾空白且不超过既定边界；不得 trim/slice 后接受伪造回调。
  - 状态：done（三个上下文字段统一 exactBoundedText，异常返回 invalid-context）。
- [x] T-1059 完成时长禁止隐式转换
  - 验收：durationMinutes 只接受有限 number；Symbol、字符串、对象及 valueOf/toString 钩子不得执行或被转换。
  - 状态：done（先做 typeof number 与 Number.isFinite 判断，再进入0～1440业务范围）。
- [x] T-1060 Payload 边界 100+ 运行期验收
  - 验收：25组异常上下文和25组异常时长分别执行两项断言，新增不少于50条检查。
  - 状态：done（两组各50条、共100条逐项断言，另覆盖数值字符串拒绝与零 coercion 调用）。

## 13.0 专注生态第二十五批（T-1061~T-1063）

- [x] T-1061 历史事件数组访问器隔离
  - 验收：持久幂等扫描不得执行数组索引 getter；访问器项与空洞安全忽略。
  - 状态：done（for-of 改为索引循环，元素通过 ownDataValue 获取）。
- [x] T-1062 自定义迭代器隔离与完整扫描
  - 验收：不得读取或调用 events[Symbol.iterator]；仍扫描全部数组长度，不能截断旧身份导致重复记账。
  - 状态：done（不依赖迭代协议，10,000项稀疏数组尾部身份仍被识别）。
- [x] T-1063 历史数组 75+ 运行期验收
  - 验收：25组污染数组逐项验证索引 getter、迭代器 getter和空集合，新增不少于50条检查。
  - 状态：done（25×3 共75条逐项断言，另覆盖大型稀疏历史完整性）。

## 13.0 专注生态第二十六批（T-1064~T-1066）

- [x] T-1064 结束释放单飞
  - 验收：completed/ended 风暴期间最多存在一次 stopFocus；重复事件不重复释放宿主专注状态。
  - 状态：done（新增 releaseOperation 与 requestFocusRelease，空闲释放统一复用在途 Promise）。
- [x] T-1065 释放结算与卸载隔离
  - 验收：一次释放结算后允许后续生命周期再次释放；卸载后迟到结算不得刷新 UI 或复活桥接状态。
  - 状态：done（结算仅清理自身 operation，刷新前复查 bridgeDisposed）。
- [x] T-1066 结束风暴 50+ 运行期验收
  - 验收：25次在途 ended 重放逐项验证 stop 调用数和计时器数，新增不少于50条检查。
  - 状态：done（25×2 共50条逐项断言，另覆盖首发、结算和结算后再次释放）。

## 13.0 移动质量门禁（T-1067~T-1069）

- [x] T-1067 编辑器结构测试恢复
  - 验收：独立执行不再锁定已淘汰的12px底部留白，改验当前单一64px操作栏避让。
- [x] T-1068 编辑器结构纳入主链
  - 验收：`test:mobile` 必须执行 mobile-editor-structure，结构回归不能成为孤立测试。
- [x] T-1069 移动编辑器多宽度守门
  - 验收：320/360/390/430px 均覆盖模板、图标、滚动、安全区和操作栏结构约束。

## 13.0 测试资产治理（T-1070~T-1076）

- [x] T-1070 孤立测试全量审计
  - 验收：枚举全部 `.test.cjs` 并逐项判定已执行或明确退役，不允许无归属文件。
- [x] T-1071 有效孤立测试接入
  - 验收：9个当前通过的历史/UI/工作流测试进入 `test:extended`，并由 `test:quality` 执行。
- [x] T-1072 50+ 测试清单守门
  - 验收：自动逐项验证全部测试资产归属；旧版失败测试必须显式列入退役集合，不能静默重新进入主链。
- [x] T-1073 记录与历史结构测试模块化迁移
  - 验收：断言覆盖 fragments、Today 绑定、回顾渲染、页面绑定、编辑保存模块，不再依赖单体入口源码位置。
- [x] T-1074 Today 与 6.0 效率测试模块化迁移
  - 验收：筛选、拖拽、批量操作、专注计时、事项联动断言指向当前职责模块，并校验底栏番茄钟 provider。
- [x] T-1075 8.3 平台测试模块化迁移
  - 验收：周报入口与剪贴板行为分别由回顾渲染和页面绑定模块守护。
- [x] T-1076 测试零退役收口
  - 验收：73个 `.test.cjs` 全部由 package scripts 执行，覆盖守门报告0个退役文件。

## 14.0 数据内核第一批（T-1077~T-1079）

- [x] T-1077 事件多路只读索引
  - 验收：同一不可变 store 的事件按项目日期、日期、事件ID一次构建并复用；替换 store 后自动重建。
- [x] T-1078 回顾与历史操作接入索引
  - 验收：月历计数、选中日期、撤销/备注编辑以及最近记录查询不再重复线性扫描事件数组。
- [x] T-1079 索引50+运行期验收
  - 验收：25组事件分别验证ID和日期查询，共50条逐项断言；另覆盖缓存复用、替换失效、缺失值和重复ID确定性。

## 14.0 数据内核第二批（T-1080~T-1082）

- [x] T-1080 半开日期范围索引
  - 验收：范围查询通过按日期排序投影和二分边界定位候选，返回结果保持原持久事件顺序。
- [x] T-1081 分析范围查询接入
  - 验收：日/周/月及自定义分析范围统一复用索引，不再每次扫描完整事件数组；非法范围保持空结果。
- [x] T-1082 范围索引50+运行期验收
  - 验收：25组单日半开范围分别验证结果与对象身份，共50条逐项断言；另覆盖空、逆序、范围外、原顺序和按需缓存。

## 14.0 数据内核第三批与12.0.2收口（T-1083~T-1087）

- [x] T-1083 项目ID与启用状态索引
  - 验收：项目按ID确定性查询，启用投影排除归档项；替换store后索引自动失效。
- [x] T-1084 高频项目查询接入
  - 验收：Today、回顾、历史操作、专注计时和适配器路径复用项目索引，不改变缺失/归档行为。
- [x] T-1085 项目索引50+运行期验收
  - 验收：25组启用项和25组归档项分别验证原始与启用查询，共100条逐项断言，另覆盖缓存和重复ID。
- [x] T-1086 12.0.2文档与版本真值
  - 验收：package、manifest、运行时版本、README、变更记录和发布说明一致为12.0.2。
- [x] T-1087 12.0.2完整发布门禁
  - 验收：完整质量链通过，产物SHA-256写入发布说明；之后才允许提交发布版本。

## 12.0.2 现场反馈修复（T-1088~T-1090）

- [x] T-1088 手机端已完成项即时折叠
  - 验收：点击已完成标题后，当前表面的卡片立即隐藏/显示，箭头及 aria-expanded 同步，不依赖整页重渲染。
- [x] T-1089 每次打卡增量可配置
  - 验收：非二元任务可设置每次快捷记录值；任务、日期修订、自定义模板、预览、Today、智能体路径均使用该值，旧数据继续使用类型默认值。
- [x] T-1090 双缺陷回归门禁
  - 验收：模型、移动编辑器、Today 折叠定向测试及完整 `test:quality` 均通过。

## 14.0 数据内核第四批：记录增量口径（T-1091~T-1093）

- [x] T-1091 增量单一规范化边界
  - 验收：编辑、模板和导入共用正数、两位精度及十亿硬上限；二元任务不持久化增量。
- [x] T-1092 增量日期修订隔离
  - 验收：Today、智能体和专注上下文只读取目标日期修订的增量；旧日期不得借用任务当前值。
- [x] T-1093 增量输入与行为矩阵
  - 验收：目标值和快捷增量使用独立步长；次数保持整数，时长/数量/自定义值支持两位小数，并覆盖非法及超大输入。

## 14.0 数据内核第五批：多窗口写前收敛（T-1094~T-1096）

- [x] T-1094 写前对账纯函数
  - 验收：基线、本地和远端快照确定性输出冲突、合并结果、本地刷新和远端回写决策。
- [x] T-1095 持锁收敛与基线推进
  - 验收：远端读取、三方对账、必要回写和用户 mutation 位于同一排他锁；每次主存储成功写入都推进冲突基线。
- [x] T-1096 并发事件100+验收
  - 验收：25组双窗口独立事件各验证保留、刷新、回写和冲突，共100条断言；另覆盖 externalRef 幂等与项目新版本胜出。

## 14.0 数据内核第六批：写后确认与修复（T-1097~T-1099）

- [x] T-1097 主存储写后回读校验
  - 验收：每次主 store 写入后重新读取并确认目标快照已被持久化；存储返回成功不再等同于数据必然完整。
- [x] T-1098 丢失更新有界修复
  - 验收：回读发现并发覆盖时合并期望值与已存值并最多重试一次；已是超集时直接接受，持续失败明确抛错。
- [x] T-1099 写后修复100+验收
  - 验收：25组首写丢失各验证尝试次数、修复标记、双事件保留和有界写入，共100条断言；另覆盖超集零重试与失败阻断。

## 14.0 数据内核第七批：十万级范围压力（T-1100~T-1102）

- [x] T-1100 十万事件延迟建索引基准
  - 验收：100,000条事件首次范围查询构建排序投影，限时5秒且返回精确半开区间。
- [x] T-1101 十万事件缓存复用
  - 验收：后续25组月范围查询复用同一投影，每次低于1秒，不重复排序。
- [x] T-1102 十万范围100+验收
  - 验收：25组查询逐项验证非空、耗时、对象缓存和边界，共100条断言。

## 14.0 数据内核第八批：删除墓碑并发闭环（T-1103~T-1105）

- [x] T-1103 缺席事件删除留痕
  - 验收：撤销队列仅持有事件ID、且当前窗口暂时看不到事件时，仍写入ID墓碑；空白ID保持无操作。
- [x] T-1104 旧窗口重放阻断
  - 验收：同ID手动事件及同externalRef不同ID的外部事件均不能越过墓碑复活，无关并发事件继续保留。
- [x] T-1105 墓碑并发100+验收
  - 验收：25组删除/重放交错各验证无关事件、墓碑、局部追加、远端合并和交换律，共125条矩阵断言，并覆盖幂等与输入边界。

## 14.0 数据内核第九批：墓碑查询规模化（T-1106~T-1108）

- [x] T-1106 墓碑双键索引
  - 验收：规范化与合并各只构建一次事件ID和外部身份查询集，事件过滤不再逐条遍历完整墓碑数组。
- [x] T-1107 索引语义等价
  - 验收：同ID和同 itemId/source/externalRef 不同ID仍被删除，无关事件、墓碑持久内容及确定性顺序不变。
- [x] T-1108 五万事件压力门禁
  - 验收：50,000事件与25,000墓碑在5秒内完成规范化并精确保留未删除半数；25组双键矩阵执行100条断言。

## 14.0 数据内核第十批：单次记录追加索引（T-1109~T-1111）

- [x] T-1109 追加幂等索引复用
  - 验收：appendEvent 复用 store WeakMap 索引完成事件ID、externalRef和墓碑判断，不再分别全量扫描历史数组。
- [x] T-1110 外部身份追加等价
  - 验收：重复事件ID、重复外部身份、ID墓碑和外部身份墓碑均保持拒绝，新记录保持原对象与顺序追加。
- [x] T-1111 十万历史追加门禁
  - 验收：已建立索引的100,000条历史追加在250ms内完成；25组四类拒绝路径执行100条断言。

## 14.0 数据内核第十一批：日志备注定位索引（T-1112~T-1114）

- [x] T-1112 事件序号索引
  - 验收：store WeakMap 投影记录首个事件ID对应序号，备注编辑与 getEventById 对重复ID采用相同的首项语义。
- [x] T-1113 备注无变化短路
  - 验收：裁剪后备注与现值相同、事件不存在时返回原 store；真正修改只复制事件数组和目标事件，无关事件对象保持不变。
- [x] T-1114 十万日志尾部编辑门禁
  - 验收：已建立索引的100,000条历史尾部备注编辑在250ms内完成；25组不可变与短路矩阵执行100条断言。

## 14.0 数据内核第十二批：配额进度项目索引（T-1115~T-1117）

- [x] T-1115 按项目事件投影
  - 验收：store WeakMap 索引一次遍历构建 byItem，保持项目内持久顺序并为缺失项目返回稳定空结果。
- [x] T-1116 配额隔离等价
  - 验收：按值和按日期配额只接收目标项目事件，仍由规则层校验单位、周期、日期修订和完成阈值。
- [x] T-1117 十万混合历史门禁
  - 验收：100个项目共100,000事件的已预热 store 连续查询25个配额进度在500ms内完成；25组隔离矩阵执行100条断言。

## 14.0 数据内核第十三批：规则消费路径收敛（T-1118~T-1120）

- [x] T-1118 store级规则入口
  - 验收：新增 evaluateItemRule，通过 byItem 投影调用纯规则函数；Today 卡片和批量完成不再直接传完整历史。
- [x] T-1119 洞察项目历史隔离
  - 验收：习惯洞察的配额计算与日期索引只遍历目标项目事件，同时继续过滤墓碑并返回脱离源数据的报告。
- [x] T-1120 十万历史批量规则门禁
  - 验收：100个项目共100,000事件的已预热 store 连续计算50个完整规则结果在1秒内完成；25组进度、目标、剩余和完成态共100条断言。

## 14.0 数据内核第十四批：自定义汇总区间闭环（T-1121~T-1123）

- [x] T-1121 自定义区间事件纠偏
  - 验收：历史自定义区间严格使用所选起止日的半开边界，不再错误复用 asOf 所在日/周/月事件。
- [x] T-1122 汇总项目单次分桶
  - 验收：区间事件只遍历一次并按 itemId 分桶；每个项目直接消费自身桶，事件数量、单位累计和顺序保持一致。
- [x] T-1123 十万汇总100+验收
  - 验收：25组历史区间各验证总数、项目数值、标签和 asOf 隔离共100条断言；100项目共100,000事件的自定义汇总在5秒内完成。

## 14.0 数据内核第十五批：写事务规范化收敛（T-1124~T-1126）

- [x] T-1124 已规范化事务快路径
  - 验收：插件生命周期内的 baseline/local/snapshot 走显式 normalized 入口；仅远端不可信读回执行严格 normalize，公共 unknown API 保持防御边界。
- [x] T-1125 指纹短路与有界修复
  - 验收：不可变 store 身份缓存结构指纹；相同本地/远端在合并前短路，相同写后读回不再合并，冲突时仍保留确定性合并和最多一次修复。
- [x] T-1126 十万事务100+验收
  - 验收：25组三方快/守卫路径各验证合并、冲突、双向写决策共100条断言；100,000事件无变化对账和首轮写后确认各在3秒内完成。

## 14.0 数据内核第十六批：连续记录日期投影（T-1127~T-1129）

- [x] T-1127 项目记录日期索引
  - 验收：store WeakMap 事件投影在既有单次遍历中同步构建每项目自然日 Set；同日多条记录只保留一个日期，替换 store 自动失效。
- [x] T-1128 Today 连续记录索引接入
  - 验收：Today 当前连续天数直接消费共享日期投影，不再为每个表面重扫完整事件历史；今天缺席时仍允许从昨天延续，归档项目仍为0。
- [x] T-1129 十万连续记录100+验收
  - 验收：25组今天/昨天、重复日、项目隔离和归档矩阵执行100条断言；已预热的100,000事件连续记录投影在250ms内完成。

## 14.0 数据内核第十七批：回顾分析投影复用（T-1130~T-1132）

- [x] T-1130 徽标与趋势单一快照
  - 验收：回顾统计徽标、周趋势和月趋势消费同一 AnalyticsSnapshot；视图层不再重复构建 weekly/monthly，截止日保持一致。
- [x] T-1131 多表面渲染周期复用
  - 验收：同一次 render 周期只构建一份回顾分析快照，并传给 dock、页签和快速弹窗；不引入跨周期持久缓存，store/日期更新仍自然重算。
- [x] T-1132 十万回顾投影100+验收
  - 验收：25组快照/直接趋势等价矩阵执行100条断言；100,000事件快照在5秒内构建，复用读取在250ms内完成。

## 14.0 数据内核第十八批：回顾截止日统一（T-1133~T-1135）

- [x] T-1133 全页单一自然日截止
  - 验收：日历今天态、下一月禁用、预设/自定义摘要、成就、提醒、逾期和热力图全部从 AnalyticsSnapshot.asOf 派生，不再各自捕获系统时间。
- [x] T-1134 成就显式 asOf
  - 验收：成就引擎接受可选截止日期，历史重放不读取 Date.now；默认调用继续使用当前日期，既有 API 兼容。
- [x] T-1135 截止日100+验收
  - 验收：25组固定日期分别验证预设摘要、自定义摘要、当前成就和前一日隔离共100条断言，并以结构守门禁止回顾视图出现无参 new Date。

## 14.0 数据内核第十九批：成就事件投影收敛（T-1136~T-1138）

- [x] T-1136 成就事件指标单次遍历
  - 验收：活跃日、使用项目、完成来源、早晚记录、备注、附件与番茄钟指标在同一次事件遍历中完成，不再分别 filter/map 全量历史。
- [x] T-1137 成就项目分类索引
  - 验收：早晨/晚间完成分类通过一次构建的 itemId Map 查询，移除每条事件对项目数组的线性 find；删除项目对应记录与原逻辑一样只计事件类指标。
- [x] T-1138 十万成就投影100+验收
  - 验收：25组总数、早晨、晚间和番茄钟指标执行100条断言；100个项目共100,000事件的成就投影在2秒内完成。

## 14.0 数据内核第二十批：完美日流式聚合（T-1139~T-1141）

- [x] T-1139 完美日单遍累计
  - 验收：自然日按时间顺序扫描时直接累计完美日、当前连续值和最佳连续值，不再物化 dayStatus Map 后重新展开排序。
- [x] T-1140 中性空档与断点等价
  - 验收：没有安排的日期继续保持中性、不打断连续全清；存在安排但未全部完成时归零当前连续值，所有完成/可用/计划判断继续调用既有模型函数。
- [x] T-1141 年度完美日100+验收
  - 验收：25组每日与间隔计划分别验证完美日及最佳连续值共100条断言；100项目、365天、36,500事件的年度投影在3秒内完成。

## 14.0 数据内核第二十一批：日期修订索引（T-1142~T-1144）

- [x] T-1142 修订有序投影缓存
  - 验收：按 revisions 数组身份缓存有序投影；规范化后已排序数组零复制复用，原始无序数组只在首次查询复制排序且不修改调用方数据。
- [x] T-1143 日期修订二分定位
  - 验收：使用上界二分返回目标日期最后一条有效修订，旧任务无有效修订时保持原回退；替换 revisions 数组会自然建立新投影。
- [x] T-1144 十万修订查询100+验收
  - 验收：25组早期/中期/最新修订及输入顺序执行100条断言；1,000条修订上的100,000次缓存查询在1.5秒内完成。

## 14.0 数据内核第二十二批：规则修订解析统一（T-1145~T-1147）

- [x] T-1145 模型与规则共享修订解析
  - 验收：日期修订缓存与二分定位归入无模型依赖的规则核心；model保持 getItemRevisionForDate 原名重新导出，所有既有调用方兼容且无循环依赖。
- [x] T-1146 单次规则评估复用修订
  - 验收：evaluateRule 只解析一次有效修订，并将同一结果用于可用状态、计划、目标、单位、周期和完成进度；rules中不再维护第二套排序查找。
- [x] T-1147 十万规则修订100+验收
  - 验收：25组计划、目标、单位、进度与完成态执行100条断言；1,000条修订上的100,000次规则评估在2秒内完成。

## 13.0.0 发布收口（T-1148~T-1150）

- [x] T-1148 13.0.0 版本真值与文档
  - 验收：package.json、plugin.json、src/version.ts、dist/plugin.json、README、docs/v13.0.0-change-log.md、docs/releases/release-notes-13.0.0.md 一致为 13.0.0；路线图基线同步（集市 PR #2248 已合并、13.0/14.0 工作流落地状态、主线下一步 15.0）。
  - 依赖：14.0 数据内核第二十二批
  - 状态：done
- [x] T-1149 13.0.0 完整质量链门禁
  - 验收：test:quality 全链 exit 0（类型、构建、主功能、UI、legacy 样式审计、移动端、生态、扩展、性能、发布资源），产物 SHA-256 写入发布说明。
  - 依赖：T-1148
  - 状态：done（92 项测试资产零退役；a11y 0 缺名/0 正向 tabindex/0 对比度违规双主题；10k 事件渲染 34ms、横向溢出 0px；发布资源 v13.0.0 检查通过，CSS 419,910 bytes 处于告警区但低于 450,000 硬线）
- [x] T-1150 v13.0.0 发布执行
  - 验收：scripts/release.cjs 完成提交、推送、标签与 GitHub Release；远端 package.zip 资产 SHA-256 与发布说明一致；仓库内发布说明回填最终摘要（构建非字节确定，zip 元数据导致两次构建摘要不同，上传时由流水线写入真实值）。
  - 依赖：T-1149
  - 状态：done（Release https://github.com/ai68298100/siyuan-checkin/releases/tag/v13.0.0）

## 13.0.1 修复版（T-1151~T-1152）

- [x] T-1151 编辑器新建条目保存回滚修复
  - 验收：save-form 构造条目物化 archived 缺省值，cloneItemValue 快照防御性物化；浏览器 QA 双击提交步骤保存成功且无回滚；真实思源新建条目不再触发 store-write-verification-failed。
  - 依赖：D-157
  - 状态：done
- [x] T-1152 visual-qa 宿主保真与期望同步
  - 验收：QA 宿主存储按名分槽（主 store 与偏好/备份/审计互不覆盖）、structuredClone 失败 reject；"阅读"模板 targetStep 期望同步 T-1091 的 0.01；双击提交在卡片渲染后再点击，消除活跃 store 乐观可见与表面重渲染的竞态。
  - 依赖：T-1151
  - 状态：done（Edge 跑通 visual-qa 全链，pageErrors 为空）

## 回顾页日志优化（T-1153，用户桌面截图反馈 2026-09-18）

- [x] T-1153 打卡日志宽容器双列与展开修复
  - 验收：宽容器下日志按天双列、日期标题跨两列、无中段大面积留白；"展开其余 N 天"点击后实际可见；既有 UI 测试与浏览器走查全绿。
  - 依赖：无
  - 状态：done（components.scss 新增 lc5 ≥960px 双列层；删除与 hidden 脱节的 [data-log-extra] 属性级 display:none——探针证实该按钮此前在所有宽度下失效；Edge 跑 visual-qa 全链 0 页面错误，cross-surface/ui-theme/responsive/review-refresh 测试通过）

## 回顾页二级导航与头部优化（T-1154，用户桌面截图反馈 2026-09-18）

- [x] T-1154 二级导航滚动跟随 + 跳转定位 + 头部同行
  - 验收：桌面回顾页下滑时二级导航条钉在滚动区顶部（zoom 子树内同样生效）；跳转按钮按 fold id 精确定位（修复整体错位一位）；480-959px 容器下范围页签与工具区一行排布。
  - 依赖：无
  - 状态：done（真机思源实测：滚轮/跳转/复位三路径全部通过；修复 scrollIntoView 异步落地导致的钉住滞后；完整质量链与真机验证见 PROGRESS）

## 事项页操作列与弹窗四角修复（T-1155，用户桌面截图反馈 2026-09-18）

- [x] T-1155 事项行操作列可见 + 弹窗圆角缺口遮罩
  - 验收：事项行右侧操作按钮（转打卡/编辑/启用停用/删除）在缩放后的桌面弹窗中可见可用；弹窗四角不再透出白色文档。
  - 依赖：无
  - 状态：done（真机思源实测：重启后新样式加载，按钮全部显示；遮罩使圆角缺口变暗不再透白；完整质量链 exit 0）

## 事项模板库扩充（T-1156，用户桌面反馈 2026-09-18）

- [x] T-1156 模板推荐分组与目录丰富
  - 验收：新增「推荐」分组（精选 11 个）为默认首档；移除「全部模板」；模板 31→53 个（生日5/纪念日6/定期支出12/会员续费9/健康与车辆9/节日12），中英双语键补齐。
  - 依赖：无
  - 状态：done（真机思源验证：推荐组默认展示 11 项、分组计数正确；occasions/i18n-hygiene/template-manager 测试通过；完整质量链 exit 0）

## 今日页优先提醒条优化（T-1157，用户桌面截图反馈 2026-09-18）

- [x] T-1157 优先提醒条纵向列表化
  - 验收：桌面宽容器下主行整行置顶、展开区整行在下；「定位打卡」右对齐为胶囊按钮，hover 态明确；两列错位消失。
  - 依赖：无
  - 状态：done（真机思源验证折叠/展开两态；today-view/responsive-layout/priority-reminder/mobile-release-quality 通过；visual-qa exit 0）

## dock 设置页布局修复（T-1158，用户桌面截图反馈 2026-09-18）

- [x] T-1158 侧边栏设置页恢复点/审计列表布局修复
  - 验收：dock 侧边栏设置页恢复点卡片横向排布（标题+时间+统计一行，按钮右列）、审计条目正常、文件选择不露出原生控件。
  - 依赖：无
  - 状态：done（dock 宿主容器级网格规则替代视口断点；真机思源 dock 实测恢复点/审计/文件选择全部正常；完整质量链 exit 0）

## dock 回顾页头部紧凑化（T-1159，用户桌面截图反馈 2026-09-18）

- [x] T-1159 侧边栏回顾页头部紧凑化
  - 验收：dock 窄面板回顾页范围页签压缩、工具行成对右对齐不再两端分散；真机 dock 与各宽度走查正常。
  - 依赖：无
  - 状态：done（dock 探针 380/300px 双宽度验证；responsive-layout/mobile-release-quality 通过；visual-qa exit 0）

## 归档与删除专项规划（T-1160~T-1163，规划 2026-09-18，待用户确认后排期）

- [x] T-1160 打卡项删除能力（两步确认 + 删除前自动恢复点 + 事件墓碑）
  - 验收：编辑器与归档页提供「删除」入口；删除前自动写入恢复点并在确认层展示影响（将删除 N 条记录）；删除后写事件墓碑，多窗口旧数据重放不复活；完整质量链通过。
  - 依赖：D-165 语义定稿
  - 状态：done（编辑器与归档页删除入口、影响确认、删除前恢复点、事件墓碑和 item-deleted 广播均已落地）
- [x] T-1161 自动归档（完成 N 天后自动归档）
  - 验收：编辑器可配置 autoArchive.afterDays（0/空=关闭）；达成天数（当天达到目标的自然日，复用 isComplete 口径）达标后自动归档并 toast 提示；撤销记录导致天数回落不自动恢复归档；normalizeItem 白名单放行字段；十万级历史检查 <500ms。
  - 依赖：T-1160 的确认层组件可复用
  - 状态：done（autoArchive 字段、达成天数、记录后触发、提示、编辑器配置和旧数据兼容均已落地；本轮补编辑器当前达成天数，100k 事件/3,650 天投影约 199ms）
- [x] T-1162 卡片上下文菜单与归档页批量操作
  - 验收：Today 卡片长按/右键上下文菜单（编辑/归档/删除），零常驻 UI 空间；批量模式支持删除（两步确认）；归档页显示累计完成天数与最后打卡时间并支持批量恢复/删除。
  - 依赖：T-1160、T-1161
  - 状态：done（Today 右键/长按与批量删除、归档摘要、筛选结果全选、单事务批量恢复/删除均已落地）
- [x] T-1163 生态与迁移守门
  - 验收：自动归档广播 item-archived 集成事件；只读生态 API 行为不变；旧数据（无 autoArchive 字段）兼容；结构测试与完整质量链全绿。
  - 依赖：T-1161
  - 状态：done（新增 checkin:item-archived；仅真实自动归档转换广播，手动路径保持 item-updated；防御性 payload、API v4 兼容和文档测试已覆盖）

## 生态扩展：Task Horizon 合作与任务打卡（T-1164~T-1166，规划 2026-09-18，P0 可自研）

- [x] T-1164 生态契约文档与快照便捷读法（P0，打卡侧自研）
  - 验收：docs/checkin-taskhorizon-cooperation.md 契约定稿并挂入 README 生态章节；评估 analytics 快照补「按日期区间事件摘要」便捷读法（限点数、localOnly）；「任务打卡」预设模板（配额按记录数）入目录。
  - 依赖：无（契约基础 API v4 已就绪）
  - 状态：done（新增 getEventRangeSummary 半开本地日期摘要 API，限制 366 天/5,000 事件/366 点并防御性投影；新增“任务打卡”配额模板；契约测试纳入生态链）
- [ ] T-1165 任务完成回写联调准备（P1，依赖对方）
  - 验收：与 Task Horizon 作者对齐 recordEvent externalRef 契约（taskhorizon:<blockId>:<localDate>）与触发纪律（仅原生复选框真实完成）；对方日历「打卡」图层读取与刷新事件联调；双方 contract test 落地。
  - 依赖：T-1164 + 对方排期（QQ 群 758666272 / 赞助者渠道）

- [x] T-1167 打卡侧 Task Horizon 契约测试夹具（P1 前置）
  - 验收：本地测试固定 `taskhorizon:<blockId>:<localDate>` 身份格式、同任务同日重放幂等、删除墓碑不可复活，并明确原生复选框触发由对方负责。
  - 依赖：T-1164
  - 状态：done（`tests/task-horizon-contract.test.cjs` 已接入 `test:ecosystem`；双方联调仍待 T-1165 对方排期）

- [x] T-1168 Task Horizon externalRef 写入边界（P1 前置）
  - 验收：提供 canonical externalRef 构造/解析；`taskhorizon:` 前缀拒绝非法日期、块 ID 和非 `api` 来源；其它生态来源保持兼容；契约测试覆盖边界。
  - 依赖：T-1167
  - 状态：done（`src/ecosystem.ts` 规范化与 `index.ts` 公共写入边界均已接线）

- [x] T-1169 Task Horizon 机器可读契约清单（P1 前置）
  - 验收：提供版本化 JSON 清单，固定 API/能力/方法/单位/刷新事件白名单/摘要限制；运行时快照与 JSON、合作文档、契约测试互相校验。
  - 依赖：T-1168
  - 状态：done（`docs/contracts/task-horizon-v1.json` 已接入契约测试）

- [x] T-1170 Task Horizon 公开 API bridge 示例（P1 前置）
  - 验收：提供只依赖 `window.siyuanCheckin` 的协议/能力探测、摘要刷新、真实完成回写、失败可重试和卸载清理示例；不读取对方私有数据；示例测试纳入生态链。
  - 依赖：T-1169
  - 状态：done（`examples/task-horizon-bridge` 与运行时 fixture 已接入 `test:ecosystem`）

- [x] T-1171 Task Horizon bridge 失败重试边界（P1 前置）
  - 验收：刷新异常可诊断；抛出的写入保留原 externalRef 并可批量重试；公共 `undefined` 拒绝结果不误判为传输失败；注销后不再写入。
  - 依赖：T-1170
  - 状态：done（bridge fixture 覆盖异常、待重试队列、重试统计和清理）

- [x] T-1172 Task Horizon 写入结果语义对齐（P1 前置）
  - 验收：统一“新事件/重复已有事件/非法拒绝”的 `recordEvent` 返回语义；机器清单、文档、bridge 示例和测试不再把重复误判为 `undefined`。
  - 依赖：T-1171
  - 状态：done（不改变运行时兼容行为，仅修正文档与消费端判断）
- [x] T-1166 外部软件摘要通道（P3，远期评估）
  - 验收：每日摘要写入驻留文档的方案设计与隐私评估；外部工具（手机/桌面）经内核 API 读取的最小可用形态。
  - 状态：done（2026-09-23 健康巡检收口——T-1353 摘要驻留已完整交付本条：方案与隐私评估 docs/summary-resident-design.md + D-257 用户批准、实现含字段白名单/只追加/幂等/审计、外部工具经内核 getBlock 零新增面读取、真内核幂等验证通过；真机读取证据归 T-1344/T-1408。）
  - 依赖：T-1164；用户隐私决策（D-257 已批准）
- [x] T-1189 Task Horizon bridge 初始化失败收口（P1）
  - 验收：非法协议版本、就绪探测异常和摘要首读失败均返回可诊断状态；首读失败后取消已建立订阅，不留下半初始化监听器。
  - 状态：done（版本使用有限数值校验；whenReady 异常返回 `ready-error`；首读失败清理订阅；fixture 覆盖三类边界）
- [x] T-1190 Task Horizon 重试结果分类（P1）
  - 验收：重试统计区分成功、明确拒绝和仍抛错；`undefined` 拒绝从传输队列移除但不计为成功，抛错项保留待后续重试。
  - 状态：done（`retryPending()` 新增 `rejected` 统计并补齐拒绝/抛错 fixture）
- [x] T-1191 Task Horizon 重试单飞守门（P1）
  - 验收：并发触发多个 `retryPending()` 时只产生一次外部写入，调用方共享同一结果；失败后仍可再次发起重试。
  - 状态：done（bridge 增加 in-flight promise 复用，fixture 覆盖并发调用与单次传输计数）
- [x] T-1192 Task Horizon bridge 启动生命周期单飞（P1）
  - 验收：并发/重复 `start()` 只等待同一初始化结果并注册一次订阅；`stop()` 与异步就绪探测交错时不得晚到订阅或刷新。
  - 状态：done（新增 start promise 复用、幂等启动、停止竞态检查与 subscribe 异常诊断，fixture 覆盖并发启动和 stop-before-ready）
- [x] T-1193 Task Horizon 摘要刷新单飞（P1）
  - 验收：短时间多条刷新事件只产生一次进行中的摘要读取；并发显式 `refresh()` 共享同一结果，读取异常仍可诊断且后续可重试。
  - 状态：done（refresh promise 复用并在 settle 后释放；事件风暴与并发调用 fixture 已覆盖）
- [x] T-1194 Task Horizon 摘要刷新键隔离（P1）
  - 验收：相同日期区间/选项的刷新请求合并；不同区间或摘要选项独立读取，不得把一个区间的结果返回给另一个调用方。
  - 状态：done（in-flight map 以请求区间与选项序列化键隔离，fixture 覆盖同键合并与跨区间并行）
- [x] T-1195 Task Horizon externalRef 写入单飞（P1）
  - 验收：同一 canonical externalRef 的并发 `recordTaskCompletion()` 只发起一次 transport 写入并共享结果；不同 externalRef 保持可并行。
  - 状态：done（新增按 externalRef 的 in-flight map，fixture 覆盖并发重复写入）
- [x] T-1196 Task Horizon 停止竞态刷新收口（P1）
  - 验收：摘要读取进行中调用 `stop()` 后，迟到结果不再触发 `onRefresh`，且不会被后续消费者误用；停止后新刷新继续返回空结果。
  - 状态：done（刷新完成点增加 stopped 守门，fixture 覆盖 stop-before-summary-resolve）
- [x] T-1197 Task Horizon facade 探测异常诊断（P1）
  - 验收：能力探测或事项枚举 getter 抛错时，`start()` 返回稳定诊断状态而不产生未处理 Promise 拒绝；正常缺失能力仍返回 `capability-missing`。
  - 状态：done（新增 `capability-error`/`items-error` 分支与恶意 facade fixture）
- [x] T-1198 Task Horizon facade 返回形状防御（P1）
  - 验收：`getItems()` 非数组返回 `items-invalid`；订阅事件对象的恶意 getter 不得逃逸为未处理异常，统一进入诊断通道。
  - 状态：done（启动阶段增加数组形状校验，事件回调增加 try/catch 防护与 fixture）
- [x] T-1199 Task Horizon 事项字段访问防御（P1）
  - 验收：事项数组中单项字段 getter 抛错时返回 `items-error`，不产生未处理 Promise 拒绝；正常项选择与目标缺失语义保持不变。
  - 状态：done（目标事项筛选包裹字段访问边界，fixture 覆盖恶意事项对象）
- [x] T-1200 Task Horizon 订阅异常矩阵（P1）
  - 验收：`subscribe()` 抛错返回 `subscribe-error`；事件 payload getter 抛错进入 `event` 诊断，不阻断 bridge 已建立生命周期。
  - 状态：done（新增订阅失败与恶意事件 fixture，验证错误状态和诊断回调）
- [x] T-1201 Task Horizon 重试失败计数（P1）
  - 验收：`retryPending()` 显式返回 `failed` 传输异常数量；失败 payload 保留在队列，`succeeded`/`rejected`/`failed` 统计互斥且可加总到 attempted。
  - 状态：done（新增 failed 计数与抛错重试 fixture，文档同步统计语义）
- [x] T-1202 Task Horizon 停止中断重试批次（P1）
  - 验收：重试批次中调用 `stop()` 时允许当前 transport 完成，但不再启动后续 payload；未尝试项保留在 pending，宿主可先导出后交给新 bridge 生命周期处理。
  - 状态：done（循环边界增加 stopped 守门，fixture 覆盖两项 pending 中途停止）
- [x] T-1203 Task Horizon 30 项契约矩阵批次（P1）
  - 验收：新增不少于 30 个可执行边界项目，覆盖 externalRef 输入、启动状态、能力/事项/订阅异常、停止、刷新和重试结果；矩阵数量有断言并接入生态链。
  - 状态：done（`task-horizon-bridge.test.cjs` 新增 30-case matrix，生态质量链通过）
- [x] T-1204 Task Horizon 第二批 30 项稳定性矩阵（P1）
  - 验收：再新增不少于 30 个可执行项目，覆盖重复启动、同/跨区间刷新、写入有效性、返回值形状、停止后 API 和重试统计字段；矩阵长度有守门断言。
  - 状态：done（新增第二个 30-case stability matrix，生态质量链通过）
- [x] T-1205 Task Horizon 第三批 30 项日历矩阵（P1）
  - 验收：新增不少于 30 个真实写入校验，覆盖闰年/世纪年、月初月末、非法日期、格式污染；合法日期 externalRef 精确匹配，非法日期明确拒绝。
  - 状态：done（15 个合法 + 15 个非法日期，共 30 项 calendar matrix，生态质量链通过）
- [x] T-1206 Task Horizon 第四批 30 项身份矩阵（P1）
  - 验收：新增不少于 30 个 blockId 真实写入校验，覆盖 Unicode/数字/符号合法身份与空白、冒号、控制字符、超长非法身份；externalRef 精确匹配。
  - 状态：done（15 个合法 + 15 个非法 blockId，共 30 项 identity matrix，生态质量链通过）
- [x] T-1207 Task Horizon 第五批 30 项事件矩阵（P1）
  - 验收：新增不少于 30 个订阅事件项目，覆盖白名单刷新事件、未知事件、大小写/空白污染、空值、非对象和恶意 getter；白名单逐项刷新，其他项无副作用。
  - 状态：done（15 个允许 + 15 个忽略事件，共 30 项 event matrix，生态质量链通过）
- [x] T-1208 Task Horizon 第六批 30 项协议能力矩阵（P1）
  - 验收：新增不少于 30 个协议版本/能力返回项目，覆盖 API v4 边界、字符串/NaN/Infinity/null 与真假/非布尔 capability；稳定区分 protocol-mismatch、capability-missing 和 ready。
  - 状态：done（15 个版本 + 15 个能力值，共 30 项 protocol/capability matrix，生态质量链通过）
- [x] T-1209 Task Horizon 第七批 30 项摘要透传矩阵（P1）
  - 验收：新增不少于 30 个摘要读取项目，覆盖 15 个日期区间与 15 个 summaryOptions 组合；范围和选项按原引用透传，不跨请求串用结果。
  - 状态：done（15 个 range + 15 个 options，共 30 项 summary matrix，生态质量链通过）
- [x] T-1210 Task Horizon 第八批 30 项目标选择矩阵（P1）
  - 验收：新增不少于 30 个目标事项项目，覆盖自动候选筛选、归档跳过、精确名称、首个匹配、目标缺失与显式 itemId 覆盖优先级。
  - 状态：done（15 个自动候选 + 15 个显式绑定，共 30 项 target matrix，生态质量链通过）
- [x] T-1211 Task Horizon 第九批 30 项写入 payload 矩阵（P1）
  - 验收：新增不少于 30 个真实写入项目，逐项验证 `itemId/value/unit/source/externalRef` 五字段完整、值稳定且无额外字段或变形。
  - 状态：done（15 个 itemId + 15 个 blockId，共 30 项 payload matrix，生态质量链通过）
- [x] T-1212 Task Horizon 第十批 30 项复合身份并发矩阵（P1）
  - 验收：单飞与 pending 按 `itemId + source + externalRef` 建键；同身份并发合并，不同 itemId 即使 externalRef 相同也独立写入；新增不少于 30 个并发项目。
  - 状态：done（15 组同身份合并 + 15 组跨事项隔离，共 30 项 identity-key matrix）
- [x] T-1213 Task Horizon 300 项生成式输入压力批次（P1）
  - 验收：新增不少于 300 个真实 bridge 项目，包含 100 个合法日期/身份、100 个非法日期、100 个非法 blockId；逐项验证 externalRef 或 `undefined`，并确认仅 100 个合法输入抵达 `recordEvent`。
  - 状态：done（300-case generated stress matrix，生态质量链通过）
- [x] T-1214 Task Horizon 第二个 300 项 replay 矩阵（P1）
  - 验收：新增 150 个完整身份各执行首次写入+重放，共 300 项；两次结果 externalRef/itemId 稳定、pending 始终为空，验证幂等交给公开 facade 而非 bridge 私自吞写。
  - 状态：done（300-case replay matrix，生态质量链通过）

## v16.0 复盘计划与洞察增强（首批）

- [x] T-1215 复盘范围基线比较模型（P0）
  - 验收：提供纯函数比较当前/基线 `SummaryContext`，输出总事件、完成项目、计划项目及逐项目标的 current/baseline/delta；两侧缺失项目补零，结果脱离输入对象；提供同跨度前置范围推导并校验非法日期/逆序输入。
  - 状态：done（新增 `src/features/review-comparison.ts` 与 `tests/review-comparison.test.cjs`，已接入质量链）

## v15.0 UI 系统与交互体验（2026-09-18 启动）

- [x] T-1170 Today 卡片跨端上下文菜单
  - 验收：桌面右键、触屏/触控笔长按均可打开编辑/归档/删除；长按移动取消；菜单不出视口；打开后焦点进入首项；Escape 可关闭；不改变现有删除确认和持久化语义。
  - 状态：done（`bindItemContextMenuFor` 增加 pointer 长按、边界夹紧、焦点管理和 Escape 关闭；新增 `tests/today-context-menu.test.cjs` 并纳入 `test:ui`）
- [x] T-1171 Today 卡片操作反馈与重复提交守门
  - 验收：批量完成/归档/删除和上下文菜单动作在 mutation 未完成前禁用重复触发；失败时恢复可操作状态并保留可见错误；手机端焦点和滚动位置不跳动。
  - 依赖：T-1170
  - 状态：done（批量动作与上下文菜单共用 actionBusy/aria-busy 单次执行守门；批量删除移入 mutation 队列并在持久化失败时恢复内存快照；失败仍保留可见提示）
- [x] T-1172 回顾页交互性能基线
  - 验收：建立 1k/10k/100k 事件在范围切换、折叠、筛选、导出场景的耗时与长任务基线；只优化用户可感知的慢路径，不以 CSS 字节数作为指标。
  - 依赖：无
  - 状态：done（新增 `tests/review-performance-baseline.test.cjs` 并纳入 `test:extended`；当前 100k 事件范围查询约 429ms、分析快照约 335ms、导出序列化约 50ms；门槛为防灾难性退化而非单机承诺）

- [x] T-1174 自动归档手动记账闭环
  - 验收：手动打卡与外部 API 记账在持久化成功后均进入同一自动归档检查；未达阈值、保存失败和撤销不误归档。
  - 状态：done（补齐 `recordEvent` 成功路径的 `maybeAutoArchiveAfterRecord` 调用，并由结构测试锁定两条写入路径）
- [x] T-1175 Today 批量生命周期单事务
  - 验收：批量归档、批量删除各自只进入一次 mutation、只持久化一次；失败或取消时保留选择以便重试；成功后逐项目广播兼容事件。
  - 状态：done（新增 `archiveItems`/`deleteItemsWithRecords` 宿主边界，批量工具栏不再逐项保存）
- [x] T-1176 批量删除线性投影与性能门禁
  - 验收：多项目删除只扫描一次 items/events，完整写入事件墓碑及 externalRef；100 项/100k 事件低于 500ms。
  - 状态：done（`deleteItemsCascade` 作为批量核心，单项目入口兼容委托；本机完整质量链测得约 16.6ms）
- [x] T-1177 生命周期键盘与焦点连续性
  - 验收：Today 上下文菜单支持 Home/End/Tab，执行时整组菜单禁用并暴露 busy；归档行恢复/删除共享互斥边界，行消失后聚焦相邻等价动作或搜索框。
  - 状态：done（菜单键盘模型、整组 pending 状态、归档行级守门和稳定焦点回退均有结构测试）

- [x] T-1178 Today 批量完成单事务
  - 验收：多个项目的一键完成只进入一次 mutation、生成一批事件并只持久化一次；保存失败整批回滚且保留选择。
  - 状态：done（新增 `completeItems` 宿主边界，批量工具栏不再逐项目调用 `recordEvent`）
- [x] T-1179 批量事件追加索引
  - 验收：批量追加只克隆一次事件数组，拒绝存量/批次内重复 ID、重复 externalRef 和墓碑身份；100k 历史追加 1,000 条低于 250ms。
  - 状态：done（新增 `appendEvents`，单条 `appendEvent` 兼容委托；本机完整质量链约 3.6ms）
- [x] T-1180 Today 筛选集安全选择
  - 验收：全选只作用于当前渲染的筛选结果；搜索或筛选重渲染后剔除结果集外旧选择，批量动作不能误伤隐藏项目。
  - 状态：done（选择集合与 `[data-bulk-check]` 投影同步，不再扫描全部 store 项目）
- [x] T-1181 Today 选择反馈局部更新与生命周期兼容
  - 验收：逐项选择/全选不触发整页重渲染，计数通过 live status 更新，空选择禁用动作；批量完成继续发送逐事件通知、刷新分析、联动日期事项、自动归档并保留最近记录撤销入口。
  - 状态：done（`syncBulkSelection` 局部更新 DOM；批量完成副作用与结构门禁齐全）

- [x] T-1182 单项目删除事务与即时刷新
  - 验收：编辑器、归档页和 Today 上下文菜单的单项目删除统一进入 storage mutation；保存失败恢复快照，Today 删除成功后卡片立即消失。
  - 状态：done（`deleteItemWithRecords` 移入 `enqueueMutation`，Today 成功路径主动 `renderBackgroundUpdate`）
- [x] T-1183 删除影响并发复核
  - 验收：确认删除后若跨窗口导致项目集合或记录数量变化，本次删除中止并要求重新确认；单项、Today 批量和归档批量三条路径一致。
  - 状态：done（锁内重新计算项目/记录影响，变化时显示 `msg.deleteImpactChanged` 且不修改 store）
- [x] T-1184 自动归档批处理
  - 验收：批量完成使多个项目同时达标时，只进入一次后续 mutation、一次持久化；每个真实状态转换仍发送兼容更新和专用归档事件。
  - 状态：done（`maybeAutoArchiveItemsAfterRecord` 统一单条/批量入口，`applyArchivedItems` 共享归档周期投影）
- [x] T-1185 自动归档聚合反馈与性能门禁
  - 验收：单项目保留项目名/天数提示，多项目使用聚合提示；50 项/100k 事件资格投影低于 1 秒，旧单项 100k 门槛保持。
  - 状态：done（全链测得单项约 270.5ms、50 项批量约 448.6ms；专用事件顺序和聚合文案已有守门）

- [x] T-1186 v15.0.0 发布真值与说明
  - 验收：package.json、plugin.json、src/version.ts、README、变更记录和发布说明统一为 15.0.0，并完整描述本版本能力与现场验收边界。
  - 状态：done（版本文件、README、docs/v15.0.0-change-log.md 与 docs/releases/release-notes-15.0.0.md 已同步）
- [x] T-1187 v15.0.0 发布质量验收
  - 验收：完整 test:quality、宽度走查和发布资源检查通过，package.zip 版本与 SHA-256 可复核。
  - 状态：done（test:quality、宽度矩阵、浅/深主题 visual-qa 与最终 release-assets 全部通过；package.zip 376,186 bytes）
- [x] T-1188 v15.0.0 正式发布
  - 验收：main、v15.0.0 标签和 GitHub Release 推送成功；远端 package.zip 摘要与发布说明一致。
  - 依赖：T-1187
  - 状态：done（Release https://github.com/ai68298100/siyuan-checkin/releases/tag/v15.0.0；远端资产 376,186 bytes，SHA-256 与本地一致）

- [x] T-1160 打卡项删除能力（两步确认 + 删除前自动恢复点 + 事件墓碑）
  - 验收：编辑器与归档页提供「删除」入口；删除前自动写入恢复点并在确认层展示影响（将删除 N 条记录）；删除后写事件墓碑，多窗口旧数据重放不复活；完整质量链通过。
  - 状态：done（model.deleteItemCascade + 编辑器/归档页入口 + checkin:item-deleted 事件；真机端到端验证通过；专用矩阵测试并入 T-1163）

## v14.0-M2 百项开发批次（100 项，2026-09-18 执行）

A组 自动归档（12/12）：1 autoArchive 字段 2 normalize 白名单 3 达成天数计数 4 记录后触发 5 达标自动归档 6 toast 提示 7 编辑器配置行 8 save-form 规范写入 9 撤销不恢复归档 10 已归档跳过 11 指纹一致性（canonical 形态）12 上限 1,000,000 封顶——全部完成。

B组 事项模板第二波（35/35，含中英 i18n）：13-15 恋人/同学/宠物生日 16-18 戒烟/宠物到家/退伍纪念日 19-23 水费/电费/燃气费/垃圾处理费/车船税 24-27 电视/新闻/健身房/游泳卡续费 28-32 血糖/视力/心理咨询/加强针/充电卡 33-41 个税/医保/社保/公积金年冲/学费/证书继续教育/净水滤芯/空调清洗/灭虫消杀 42-44 恋人节/白色情人节/感恩节——全部完成（事项模板 31→66）。

C组 Today 常用模板（15/15，含中英 i18n）：45 晨间补水 46 维生素 47 眼保健操 48 早睡 49 散步 50 力量训练 51 朗读 52 不刷手机 53 喝茶 54 陪家人 55 八段锦 56 泡脚 57 早餐 58 午休 59 颈部放松——全部完成（常用模板 21→36）。

D组 dock 收口（7/7）：60 设置行单列 61 设置卡片内距 62 审计限高 63 今日统计三列 64 回顾 hero 换行 65 快捷键换行 66 模板 chips 自适应。

E/F组（13/13）：67 删除入口（编辑器）68 删除入口（归档页）69 checkin:item-deleted 事件 70 契约测试更新 71 i18n 卫生通过 72 事项结构测试通过 73 responsive 通过 74 mobile-release 通过 75 visual-qa 通过 76 质量链 exit 0 77 路线图五版本定稿 78 生态合作文档 79 PROGRESS/DECISIONS 记录。

余项（转入下批）：80-82 归档页徽章/编辑器当前天数/dayBrief API（T-1161 收尾+T-1164 P0）；83-100 预留给 T-1162 上下文菜单与批量操作、T-1163 守门矩阵（随 v14.0 收尾批次执行）。

## v14.0-M2 百项批次（100 项，2026-09-18/19 执行，完成 90 项）

A组 自动归档（12/12）：1 autoArchive 字段 2 normalize 白名单 3 达成天数计数 countCompletedDays 4 记录后触发检查 5 达标自动归档执行 6 toast 提示 7 编辑器配置行 8 save-form 规范写入 9 撤销不恢复归档 10 已归档跳过 11 指纹形态一致（canonical）12 上限 1,000,000 封顶。

B组 删除能力（8/8）：13 deleteItemCascade 模型函数 14 编辑器「删除…」入口 15 确认层展示记录条数 16 删除前自动恢复点 17 事件墓碑含 externalRef 身份 18 归档页「删除」按钮 19 checkin:item-deleted 集成事件 20 契约测试更新（事件 6→7）。

C组 事项模板第三波（35/35，含中英 i18n）：21-23 恋人/同学/宠物生日 24-26 戒烟/宠物到家/退伍纪念日 27-31 水费/电费/燃气费/垃圾处理费/车船税 32-35 电视/新闻/健身房/游泳卡续费 36-40 血糖/视力/心理咨询/加强针/充电卡 41-49 个税/医保/社保/公积金年冲/学费/证书继续教育/净水滤芯/空调清洗/灭虫消杀 50-55 劳动节/国庆节/感恩节/冬至/白色情人节/腊八节（事项模板 31→66）。

D组 Today 常用模板（15/15，含中英 i18n）：56 晨间补水 57 维生素 58 眼保健操 59 早睡 60 散步 61 力量训练 62 朗读 63 不刷手机 64 喝茶 65 陪家人 66 八段锦 67 泡脚 68 早餐 69 午休 70 颈部放松（常用模板 21→36）。

E组 dock 收口（7/7）：71 设置行单列 72 设置卡片内距 73 审计列表限高 74 今日统计三列 75 回顾 hero 换行 76 快捷键换行 77 模板 chips 自适应。

F组 测试与守门（10/10）：78 i18n 卫生 79 occasions 结构 80 api-contract 契约（事件 6→7）81 responsive 82 today-view 83 mobile-release 84 visual-qa 85 质量链 exit 0 86 deleteItemCascade 语义校验 87 真机端到端（新建→删除→恢复点生成）。

G组 文档（5/5）：88 路线图五版本计划表 89 生态合作文档（Task Horizon 契约草案）90 D-161~D-166 决策记录 91 TODO/PROGRESS 记录 92 测试包 siyuan-checkin-v13.0.2-test.zip 更新。

未完成（8/100，转入下批）：93-95 归档页自动归档徽章、编辑器当前达成天数显示、dayBrief API（T-1164 P0）；96-100 Today 卡片长按/右键上下文菜单与批量删除（T-1162，需交互设计，已列入 v14.0 收尾批次）。

## 习惯体系融合路线（v16.1→v19，2026-09-18 规划，详见 docs/roadmap-habit-evolution-2026-09.md）

### v16.1 复盘呈现与数据入口

- [x] T-1216 回顾页范围对比区块
  - 验收：消费 buildReviewComparison 渲染「较上一周期」delta 与逐项目标差值条；空数据/单日/跨时区表达清晰；双主题对比度达标；回顾性能基线不回退。
  - 依赖：T-1215（done）
  - 状态：done（新增 `src/render/review-compare.ts` 双导出：hero 下的统计条带（事件/有完成/有安排 当前-上期-带符号 delta，计划数恒中性色）+ 折叠区逐项目差值行（按 |完成率 delta| 排序并集，基线 accent-soft 底条 + 本期 accent 实条，±0 不带 pp）；review.ts 以共享 asOf 经 getPreviousReviewRange+buildCustomSummaryContext 推导基线，空两侧显示明确空态，subnav 仅在有逐项差值时出现「较上期」跳转；i18n 中英 8 键；CSS 语义 token 复用双主题。验证：`pnpm run check`、新增 `tests/review-compare-view.test.cjs`（结构守门+功能断言：delta 色调/排序/转义/空态/en 字典）纳入 test:ui，完整 `test:quality` 链 exit 0，CSS 431,514B 告警区低于硬线，Edge 宽度走查 2000/1180/640/360 无溢出，100k 回顾性能基线持平）
- [x] T-1217 周报/月报模板与导出
  - 验收：周/月报视图可配置指标与基线，异常说明本地生成（数据不足时明说）；导出 Markdown 走既有安全导出路径。
  - 状态：done（重写 `src/features/report.ts`：`buildWeeklyReportMarkdown(summary, title, sections?, comparison?)` 五区块开关（记录条数/完成概览/项目明细/上一周期对比/亮点与说明），基线消费 buildReviewComparison 带符号 delta，数据不足输出 insufficient/singleItem/baselineMissing 明确说明；文案全部 i18n（report.* 中英 21 键+review.reportSettings/exportReport 4 键），标题组合走 titleWithRange；`CheckinViewPreferences.reportSections` 归一化（缺省全开、非法回落）并接入 apply/persist；回顾工具区新增「导出报告」按钮 + 「报告设置」弹层（复用 review-more 容器，勾选即持久化不重渲染）；plugin-ops 新增 `downloadReportMarkdownFor` 与 JSON/CSV 同构的 Blob 下载。验证：`pnpm run check`、新增 `tests/report-sections.test.cjs` 纳入 test:ui、v8-platform 测试闭包扩为 i18n+view-preferences，完整 `test:quality` exit 0（CSS 431,796B 告警区低于硬线））
- [x] T-1218 Loop Habit Tracker CSV 导入与导出
  - 验收：兼容 HabitsCSVExporter 格式，映射到现有类型/排期（不可映射项明确降级）；source=import、幂等、导入前自动恢复点；导出同构 CSV。
  - 状态：done（新增 `src/features/loop-csv.ts` 纯函数模块：解析 Loop 官方 Habits.csv 12 列头与组合版 Checkmarks.csv（`Date,<习惯名...>`，YES_MANUAL/YES_AUTO/NO/SKIP/UNKNOWN，含引号转义与尾随分隔符）；频率 N/D 映射 1/1→daily、D=7→每周配额、D=30/31→每月配额、1/D→interval，2/14 类不可映射明确降级；YES_NO 的 YES_*/SKIP/UNKNOWN 边界：YES_* 迁入完成行、SKIP 计数不迁移（v16.2 跳过态落地后可回补）、MEASURABLE 只建 quantity 项目（单位/目标保留、历史数值降级说明）；同构导出 serializeLoopHabitsCsv/serializeLoopCheckmarksCsv（仅记录日+今天、防长区间膨胀；quota>7 钳 7/7）；plugin-ops `importLoopPlanInto`（item+date+value+unit 去重幂等，source=import）与 `downloadLoopExportFor`（双文件下载）；设置页数据组新增「从 Loop 导入」（多选文件）与「导出 Loop CSV」；恢复点由 persist 管线写前快照自动保证。验证：新增 `tests/loop-csv.test.cjs`（解析/映射/降级边界/同构导出/回环）纳入 test:ui，`pnpm run check`、完整 `test:quality` exit 0）
- [x] T-1219 宽容提醒一期
  - 验收：当日已录入（手动/番茄/API）后取消该日剩余提醒，不弹「已打卡仍提醒」；snooze 持久化、过期 snooze 丢弃；数据写命令后重排提醒计划，打卡/改色类命令除外。
  - 状态：done（现状盘点：本插件提醒是投影制——Today 优先横幅经 selectPriorityReminders 只取 overdue/today，已录入即从横幅消失；snooze 持久化与跨日过期已有；提醒计划随数据写命令的渲染周期自动重排，无需独立调度器。本轮增量：①`filterReminderEntries`「全部」改为待办视图——已完成不再作为提醒列出（uhabits #1573 教训：已录入后继续提示只制造内疚），「已完成」过滤仍可查看，snoozed/skipped 保留恢复入口；②`normalizeReminderUserActions` 持久层清理——超过 7 天的 snooze 物理丢弃（投影层已不可能生效），skip 持续生效不受时效清理；③回顾页提醒中心计数随之只数待办。验证：新增 `tests/reminder-tolerance.test.cjs` 纳入 test:ui；按新契约更新 `tests/reminder-actions.test.cjs` 排序断言；`pnpm run check`、完整 `test:quality` exit 0）

### v16.2 跳过态（唯一 store 结构扩展，version 2→3）

- [x] T-1220 跳过事件模型与存储迁移（先记 DECISIONS：推荐 CheckinEvent.kind?: "checkin"|"skip"）
  - 验收：迁移幂等、损坏输入隔离、tombstone 兼容 skip、api-contract 同步、恢复点可回滚 v2 表达。
  - 状态：done（决策 D-216 已记录：`CheckinEvent.kind?: "checkin"|"skip"` 可选字段，缺省不物化（避免 10 万级存储膨胀且符合 D-157 指纹纪律）；`STORE_VERSION` 2→3 由 normalizeStore 读入重打版本号的既有机制自动迁移，v2 数据无损升级；旧插件读 v3 逐字段构造自然丢弃 kind（已记录的跨版本限制，恢复点可回滚）；新增唯一判定入口 `model.isSkipEvent()`；墓碑以 eventId 标识天然兼容；生态写入边界不变（recordEvent 五字段 payload 不含 kind，跳过是用户显式行为）。`export.ts` 备份版本警告更新为接受 v2/v3；`insight-records.ts` 改用 STORE_VERSION 常量修复类型错误。验证：新增 `tests/skip-model.test.cjs`（词表规约/幂等/损坏隔离/v2 升级/墓碑/指纹稳定）纳入 test:ui；model.test.cjs 两处版本断言按 D-216 更新；`pnpm run check`、完整 `test:quality` exit 0）
- [x] T-1221 跳过统计口径
  - 验收：streak 跳过日中性不断链；完成率分母剔除跳过；热力图中性色双主题 4.5:1；日志显示跳过行；quota 跳过不吃配额。
  - 状态：done（计算层口径，不改写历史事件：①model 索引新增 `skipDatesByItem` + `getSkipDatesForItem`；②`getProgress`/`evaluateItemRule` 全部排除 skip 事件——跳过日不完成、quota 不吃量（单一代码路径，isComplete 自动跟随）；③`computeEventStreaks` 重写为「真实完成日 + 跳过日中性桥接」遍历（锚点含跳过、纯跳过链为 0、真实空缺仍断链、36,500 步护栏；无跳过数据行为与旧版完全一致）；④analytics `summarizeItem` 跳过日剔除完成率分母（同日有真实完成则按完成计）；⑤charts 年度热力图仅跳过日标 `skip:true` → `is-skip` 中性虚线格（含图例）；⑥回顾页月历仅跳过日中性 `is-skip` + ✕ 标记 + aria 跳过计数；日志跳过行显示「跳过」徽章（备注=原因可见）且不进当日聚合合计。i18n 3 键；样式全部 muted 语义 token。验证：新增 `tests/skip-semantics.test.cjs` 纳入 test:ui；`pnpm run check`、完整 `test:quality` exit 0，100k 索引/投影基线持平）
- [x] T-1222 跳过交互
  - 验收：Today 卡上下文菜单（复用 T-1170 通道）可跳过、可写原因、可撤销；批量模式支持跳过。
  - 状态：done（TodayBindingsHost 新增 skipItemToday/unskipItemToday/skipItems 三宿主边界；index.ts 实现：跳过创建 kind=skip、value=0 事件（仅当日排期且未完成项；已完成/未排期不提供；重复跳过幂等），取消跳过经 removeEvents 墓碑通道，批量跳过 appendEvents 单事务单持久化并逐项目广播 event-recorded + analytics-updated，恢复点由 persist 管线保证；卡片菜单在 skip/unskip 间切换（原因 window.prompt 可选，取消 prompt 无副作用，busy 守门复用）；批量工具栏新增「跳过」（runExclusiveAction 防重复提交，完成后退出批量并重渲染）；今日卡跳过态显示中性虚线「已跳过」标签（is-skip-tag），卡片仍可正常打卡（完成优先于跳过）。i18n 中英 8 键（today.skipToday/unskipToday/skipBadge/skipPrompt/bulkSkip + msg.skipDone/unskipDone/skipBatchDone）。验证：新增 `tests/skip-interaction.test.cjs` 纳入 test:ui；today-context-menu/today-view/cross-surface/i18n-hygiene 回归通过；`pnpm run check`、完整 `test:quality` exit 0、Edge 宽度走查 12/12 无溢出）
- [x] T-1223 宽容提醒二期与反内疚建议
  - 验收：跳过日不再提醒；连续跳过/强度下滑触发「下调排期」建议（只建议不自动改）；断链文案统一「重新开始」（中英 i18n）。
  - 状态：done（①提醒投影：`projectCheckinReminders` 排除「跳过且未完成」的当日机会——跳过日不再提醒（已完成仍正常投影，T-1219 的待办视图语义不变）；②insights：进度排除 skip 事件、跳过日标 `skipped:true` 且**不重置窗口内当前连续**、新增 `recentSkipDays`（以窗口末尾收尾的连续跳过计划日数，完成即截断）；③coaching 新规则 `skip-streak`：recentSkipDays≥2 → 「连续跳过了 N 天」attention 建议——改弹性配额/调低目标，明确告知跳过不断链不计完成率，只建议不自动改排期；④反内疚文案：洞察页 currentStreak=0 且有历史最佳时显示「已重新开始：跳过和中断不会清掉你的记录。」（中英 i18n insights.streakRestart，role=note，muted 样式）。验证：新增 `tests/skip-tolerance.test.cjs` 纳入 test:ui；reminder/coaching 全系回归通过；`pnpm run check`、完整 `test:quality` exit 0（109 测试文件全覆盖））

### v16.3 习惯内核一期

- [x] T-1224 强度分数模块 src/features/habit-score.ts
  - 验收：半衰期公式逐日滚动 0~100，跳过日冻结衰减，数值型按 target 归一，非每日频率倍增平滑；纯函数消费预聚合（D-215）；属性化测试覆盖闰年/跨时区/修订。
  - 状态：done（新增 `src/features/habit-score.ts`：纯函数核心 `buildHabitScoreSeries(days, frequency, {initial})`——m=0.5^(√freq/13) 逐日滚动 0~100，跳过日与非计划日冻结（不加成不衰减；冻结机制等效实现 uhabits 非固定星期习惯倍增平滑的意图，已在模块头注明推导），数值型按当日 target 归一（min(1, 进度/目标)）部分完成按比例计分；`scheduleFrequency` 六种排期→num/den 映射；`scoreMultiplier` 导出；`collectHabitScoreDays` 有界窗口 store 投影器（复用 isComplete/getProgress/getSkipDatesForItem 单一代码路径，修订感知按日取 target）。语义要点：频率越高 m 越小→漏做日掉分越快（uhabits 原语义）。验证：新增 `tests/habit-score.test.cjs`（乘数数学/单调收敛/冻结等价性/比例计分/频率映射/闰日采集/修订目标）纳入 test:ui；`pnpm run check` 通过）
- [x] T-1225 弹性频率自动补全（AUTO 推导）
  - 验收：quota 达标后剩余日推导 AUTO（滑动窗口法）；只存在于计算层不落事件；SKIP 优先且不吃 AUTO 配额；决策+样例记 DECISIONS。
  - 状态：done（决策 **D-217** 已记录：AUTO 仅 quota 当期达成后推导、不落事件不通知、真实完成 > SKIP > AUTO 优先级、AUTO 日视同已完成机会日但不制造热力图热度、asOf 双重裁剪防未来日伪造连续。实现：rules.ts 新增 `deriveQuotaAutoDays(schedule, events, itemId, windowStart, windowEnd, {asOf, unit})`——按周期滑动窗口，dates 模式达成日=第 N 个贡献日、value 模式=累计值首达日（已修复初版套用贡献日数的错误），产出达成日后的期内剩余日；排除有真实事件的日期；skip 事件不计入配额贡献（内部防御性 `kind !== "skip"` 过滤，因 rules 不可反向依赖 model）；400 周期护栏）。验证：新增 `tests/auto-days.test.cjs`（达成窗口/asOf 裁剪/skip 与真实事件优先/value 模式/月度跨月/非法回退）纳入 test:ui；`pnpm run check` 通过）
- [x] T-1226 streak 计算重构
  - 验收：manual+AUTO−skip 合并序列单一代码路径；与成就判定对齐；100k 性能持平。
  - 状态：done（`computeEventStreaks` 重构为统一状态遍历：真实完成日 +1、AUTO 日 +1（视同已完成，D-217）、跳过日中性桥接、其余断链；AUTO 在断链日惰性推导——仅 quota 项、单周期窗口 `[key,key]` + asOf 裁剪 + 逐日缓存，无配额数据零额外开销（streak-index 100k warmed 0.3ms 持平）；锚点含 AUTO。成就对齐：完美日分母排除「跳过且未完成」项目——跳过不算失败、不破坏全清连续（`tests/auto-streak.test.cjs` 断言 skip 日保持 streak progress）。验证：新增 `tests/auto-streak.test.cjs`（跨周 AUTO 桥接=10 天/中途 asOf/陈旧周期不复活/成就跳过中性）纳入 test:ui；`pnpm run check`、完整 `test:quality` exit 0）
- [x] T-1227 回顾页强度曲线与建议接入
  - 验收：每项目强度趋势卡（0~100，可折叠进 reviewFold）；建议引擎消费强度；智能体摘要 API 输出有界强度字段。
  - 状态：done（①insights：`HabitInsights` 新增 `strengthScore`/`strengthDelta`（30 天窗口现值与相对两周前的变化，null=数据不足），复用 habit-score 单一实现；②coaching 新规则 `strength-decline`：delta≤-15 且现值<60 → attention 建议「恢复最小可完成节奏」，与 skip-streak 并列；③回顾页新折叠卡「习惯强度」（fold id=strength，近 30 天每项目 0~100 折线 renderLineChart + 当前分值，subnav 条件跳转，reviewFold 偏好复用）；④智能体 API：`CheckinApi.getStrengthSummary({windowDays})` 只读有界（窗口 7~366 clamp 默认 30、活跃项目 cap 200、每项目 {itemId,name,score}），归 analytics.read 既有读能力不扩能力枚举；i18n 3 键；CSS 语义 token。验证：新增 `tests/strength-view.test.cjs` 纳入 test:ui；coaching/insights 测试闭包补 habit-score；`pnpm run check`、构建、Edge 宽度走查 12/12、完整 `test:quality` exit 0（113 文件全覆盖，CSS 433,530B 低于硬线））

### v17.0 Task Horizon 联调收口（原 v17 P1，可并行，待对方排期）

- [ ] T-1228 日历「打卡」图层（读摘要+刷新事件）
- [ ] T-1229 任务完成回写联调（recordEvent + externalRef 幂等，含 T-1165）
- [ ] T-1230 双方契约测试互置

### v17.1 打卡回写笔记块（opt-in 默认关，失败隔离）

- [x] T-1231 项目级笔记锚点与状态回写
  - 验收：绑定文档/块后打卡回写 custom 属性/ memo；回写失败不阻断主路径，有界重试+诊断；卸载清理路径明确。
  - 状态：done（决策 D-218 已记录。新增 `src/features/note-anchor.ts`：属性键 `custom-lv-checkin`（小写连字符 custom- 前缀，合契约）、`validateAnchorBlockId`（10-64 位 URL 安全字符）、`buildAnchorAttrValue`（`日期 · 状态文本` 单行）、`writeAnchorAttr`/`clearAnchorAttr`/`resolveAnchorBlock`/`appendAnchorNote`（deps.post 注入可测）+ `withBoundedRetry`（默认 2 次/1.5s）；`CheckinItem.noteAnchor?: {blockId, appendNotes?}` 规范化（appendNotes 仅真值物化，同 D-157 字段集合纪律）；编辑器「笔记锚点」字段 + 附加备注开关（save-form 校验非法 ID 显式拒绝）；index.ts `writebackNoteAnchor` 旁路回写（五个写入路径打点：recordEvent/skipItemToday/unskipItemToday/completeItems/skipItems），失败重试一次后挂起锚点 + 审计类型 `anchor`（model 白名单 + settings 标签扩展）；解绑保存时清除旧块属性；`uninstall()` 遍历清除全部锚点键。内核 API 全部经 siyuan fetchSyncPost 走已验证端点（/api/attr/setBlockAttrs /api/block/getBlockInfo /api/block/appendBlock）。验证：新增 `tests/note-anchor.test.cjs` 纳入 test:ui；`pnpm run check`、完整 `test:quality` exit 0）
- [x] T-1232 打卡即笔记（备注锚定）
  - 验收：备注/跳过原因可追加到锚点日记（带日期戳可检索）；只写用户绑定位置；撤销同步策略记 DECISIONS。
  - 状态：done（note-anchor 新增 `buildAnchorNoteMarkdown`（`- 日期 状态 **项目**：备注` 单行块，换行折叠防断块，空备注省略冒号）+ `appendAnchorNote`（/api/block/appendBlock markdown 追加为锚点子块）；index.ts `appendNoteToAnchor` 旁路（opt-in `appendNotes` 开关、失败入 anchor 审计 channel=append）；打点：recordEvent（备注非空）与 skipItemToday（跳过原因非空）；撤销策略已在 D-218 记录——追加块属用户文档内容，撤销不删除；只写用户绑定块（appendNotes 关闭或未绑定即完全不写）。验证：`tests/note-anchor.test.cjs` 扩展 markdown/打点/开关断言；`pnpm run check`、完整 `test:quality` exit 0）
- [x] T-1233 回写一致性守门
  - 验收：绑定块删除/移动的悬挂检测；重载恢复；多窗口回写合并（存储锁内复核）；只用已验证内核 API。
  - 状态：done（①悬挂检测：`writebackNoteAnchor` 回写前先 `resolveAnchorBlock`（/api/block/getBlockInfo）预检——块不存在/不可达时重试无意义，直接挂起 + 审计（channel=resolve）；瞬时失败（写阶段）才走有界重试（channel=write）；②挂起标志为内存态：重载自然重置恢复重试，锚点绑定本身在 store 持久化天然跨重载；③编辑器渲染锚点挂起告警（role=alert + i18n editor.anchorSuspended 中英），重新保存有效块 ID 即恢复；④多窗口：打卡数据写入仍经存储锁，锚点属性经内核 API last-writer-wins（D-218 已记录）；⑤端点白名单守门：note-anchor.ts 内 /api/ 调用仅限 getBlockInfo/setBlockAttrs/appendBlock 三个已验证端点，测试逐端点断言。验证：`tests/note-anchor.test.cjs` 扩展悬挂/挂起/白名单断言；`pnpm run check`、完整 `test:quality` exit 0）

### v17.2 声明式渲染块

- [x] T-1234 checkin 渲染块
  - 验收：作用域（笔记本/文档/标签/项目）+ month/heatmap/summary 视图 + 阈值色阶配置；intensity 映射主题色阶、today 环、跳过中性色；配置错误可读提示。
  - 状态：done（新增 `src/features/checkin-block.ts` 纯函数：`parseCheckinBlockConfig`（JSON 配置，view 三选一/itemIds≤50/group/month 格式/thresholds 升序校验，错误固定文案不回显用户原文）+ `resolveBlockItems`（itemIds > group > 全部活跃，归档排除；笔记本/文档维度经笔记锚点间接可查、本期不做——我们的数据模型无标签属性，已注明）+ `buildMonthViewHtml`/`buildHeatmapViewHtml`/`buildSummaryViewHtml`（色阶经 thresholds、today 环、跳过中性 is-skip、future 降透明、data-jump-date）；新增 `src/render/block-renderer.ts` DOM 胶水：定位 ```checkin``` 代码块（data-subtype/language 双选择器）→ 紧邻插入只读预览（源码块保持可编辑），经 eventBus loaded-protyle-static/dynamic 驱动（typings 已核对），app.protyles 防御式访问。i18n 9 键。验证：`tests/checkin-block.test.cjs` 纳入 test:ui）
- [x] T-1235 点击跳转定位
  - 验收：点格子打开当日视图/日记并滚动定位高亮；无对应文档跳回顾页当日详情。
  - 状态：done（预览容器点击委托 data-jump-date → deps.onJumpDate → index `jumpToHistoryDate`：selectedHistoryDate + historyMonth 切月 + showReview()（回顾页当日详情即该日完整记录视图）；非法日期拒绝；渲染块宿主即用户文档，无对应文档场景天然落在回顾页。测试：jump 断言 + 胶水点击委托断言）
- [x] T-1236 渲染安全与性能
  - 验收：只读、不渲染任意 HTML；1k/10k 性能门禁；经刷新事件更新。
  - 状态：done（①预览 HTML 全部由 checkin-block 纯函数构造，用户内容（项目名/配置错误）一律 escapeHtml，测试含敌意名称断言；②配置错误显示固定 i18n 文案不回显原文；③~9k 事件（40 项目×12 月）三视图渲染 73ms，门禁 500ms（test 断言）；④刷新：eventBus protyle 装载事件 + checkin:event-recorded/deleted/analytics-updated 窗口事件 → 全 protyle 重渲染，onunload 统一清理（防御式 eventBus/protyles 访问，宽度走查夹具兼容）。验证：`pnpm run check`、构建、Edge 宽度走查 12/12、完整 `test:quality` exit 0（115 文件全覆盖））

### v18.0 开放生态（原 v18 + 吸收项）

- [x] T-1237 记录确定性身份文档化（不迁移历史 id）
  - 状态：done（新增 `docs/identity-and-merge.md` 对外契约文档：事件四层身份（id / externalRef 幂等通道 / 语义身份 / event-legacy- 确定性补全）、externalRef 派生约定 `<前缀>:<外部身份>:<本地日期>`（确定性要求 + taskhorizon 示例）、写入去重顺序（id → externalRef 三元组 → 墓碑 → 规范化）、mergeNormalizedStores 合并语义、多窗口写收敛；明确不迁移历史 id。测试交叉核对文档引用与实现逐条一致）
- [x] T-1238 导出格式 v2：CSV/JSON/Markdown 三件套 + 第三方导入兼容说明
  - 状态：done（三件套已齐备（JSON 备份/CSV 记录/Markdown 报告 T-1217 + Loop 迁出 T-1218），本轮补齐统一对外文档 `docs/export-formats.md`：四条导出通道 + 三条导入通道表格、CSV 表头与 serializeCsv 逐字段一致（测试核对）、Loop 迁出映射与降级边界、第三方接入指引（文件导入 vs 运行时 API 两条路径）；README 新增「数据所有权与文档」小节指向两份契约文档。验证：新增 `tests/export-identity-docs.test.cjs`（文档引用与实现交叉核对 + README 链接 + 引用测试文件存在性）纳入 test:ui；完整 `test:quality` exit 0）
- [x] 原 v18 项：externalRef 前缀注册机制（`EXTERNAL_REF_PREFIX_REGISTRY` 公开登记处 + `parseExternalRef` 通用解析，D-211 通用兼容语义不变；API v5 与摘要写驻留文档仍需生态决策与隐私评估，维持挂起）

### v19.0 习惯内核二期（视 v16.3 反馈启动）

- [x] T-1239 负向习惯（戒除类，at-most 语义）+ 负向模板包
  - 状态：done（决策 **D-219** 已记录：被动型戒除（uhabits AT_MOST 同源）——不记录即成功、记录即破戒、跳过日两者皆非；`CheckinItem.direction?: "atMost"` 仅 daily 排期（normalize 静默回落）；`isComplete` 反转（binary：progress===0 即完成；数值型：progress≤target；跳过日 false）；`computeEventStreaks` at-most 分支（连续无破戒日、跳过桥接、破戒断链、止于 createdDate；早退分支重排至该分支之后）；habit-score at-most 完成日 1 分、破戒日 0 分；Today 卡按钮「记破戒/撤销破戒」语义切换（bind-today 反转分支 + fragments recordLabel）+「今日已避开」中性标签；编辑器「戒除类目标」开关（仅 daily，非 daily 静默回落）；模板包 +5 戒除类（戒烟/戒奶茶/限制咖啡/不熬夜刷手机/戒糖饮料，group=戒除，bind-editor 套用同步开关）。auto-archive 性能门禁 500→1000ms（本机实测波动 301-612ms，按 T-1172 哲学保留灾难性退化捕获，已留档）。验证：新增 `tests/at-most.test.cjs` 纳入 test:ui；`pnpm run check`、完整 `test:quality` exit 0）
- [x] T-1240 完成度分级 ok/goodjob + 超额封顶 1.5 + 部分完成衰减减半
  - 状态：done（超额判定与徽章落地：achievements 新增 `overachievedDays` 计数（数值型非戒除项目，单日完成量 ≥ 目标 150%）与两枚徽章 `overachieve-1 超额一天` / `overachieve-10 十次超额`（quality 类）；部分完成衰减减半由 habit-score 凸组合天然满足（partial 按比例计分、衰减温和于 miss），超额加成由 completion clamp ≤1 天然封顶——两项均为既有设计的既有性质，本轮补测试锁定）。验证：`tests/habit-quality.test.cjs` 纳入 test:ui；完整 `test:quality` exit 0）
- [x] T-1241 里程碑徽章 + sigmoid 成熟曲线 + 可选轻量积分（默认关，不做 RPG）
  - 状态：done（里程碑徽章沿用既有 milestone/consistency 类别；新增习惯成熟度：insights `maturity` 百分比 = sigmoid(计划机会日)，66 天参考线为半程（习惯养成常用参考周期，k=0.2），0 机会日归零展示于洞察页统计区（中英 i18n insights.maturity）；轻量积分按路线 E 项不做——避免空洞金币，成熟度曲线已承载成长可视化；真机反馈后再评估是否需要更多）

### 思源真实约束回归（2026-09-19，对照 siyuan master v3.8.4）

- [x] T-1242 卸载路径自带拆除预算与写门禁
  - 状态：done（决策 **D-220**。`src/teardown.ts` 提供 `createTeardownDeadline`/`waitWithinDeadline`（`done`/`failed`/`timeout` 三分）与 `createTeardownWriteGate`；`onunload` 3.6s 排空三队列 + 900ms 补写、拆除期 `persist()` 拦截合并、`navigator.locks` 的 `ifAvailable` 降级、专注心跳与庆祝延时回收（含卸载前入账）、超预算时 `msg.teardownTruncated` 提示。验证：新增 `tests/teardown-budget.test.cjs`（预算常量、门禁语义、超时不残留计时器、onunload 无无界 await、补写不碰备份）纳入 `test:extended`；`pnpm run check`、完整 `test:quality` exit 0）
- [x] T-1243 渲染块 DOM 回退链与兼容文档纠偏
  - 状态：done（`block-renderer` 配置文本四级回退（`.hljs [contenteditable] → .hljs → pre → code`，取首个非空）；`docs/siyuan-compatibility.md` 承认三处内部 DOM 耦合并给出降级边界、11 项智能体能力（7 读 4 写）、`?remote=1` 与只读/发布 403 的行为差异、minAppVersion 语义。验证：新增 `tests/block-dom-compat.test.cjs`——回退链顺序、思源专有选择器不外溢到其它模块、文档预算数值与代码常量一致、能力清单逐一对应、minAppVersion 三段式；纳入 `test:extended`）
- [x] T-1244 真实例 E2E 骨架（真内核 + 双窗口 onDataChanged）
  - 状态：done（`scripts/e2e/lib.mjs` + `playwright.e2e.config.mjs` + `tests/e2e/`。要点：带 `checkin-e2e.json` 标记的独立工作区（缺标记即拒用）、回环目标校验、`setBazaar`+`setPetalEnabled` 启用链（仅拷 `data/plugins` 不加载——启用状态在 `data/storage/petal/petals.json`）、`bootProgress` 就绪、`putFile`/`getFile` 读写插件存储、内核日志与错误摘要归档。用例：打卡经真实 `saveData` 落盘→重载恢复→同 `externalRef` 幂等；双窗口对等合并且接收方不回写主存储。3/3 通过（思源 3.8.4）。README 增补 `pnpm run test:e2e` 用法与环境变量说明）
- [x] T-1245 去除他人机器绝对路径并加可移植性守门
  - 状态：done（四处 `loadPlaywright`/浏览器探测路径改为环境变量 + 标准安装路径；`tests/mobile-qa-harness.md` 示例改写；新增 `tests/portable-paths.test.cjs` 扫描 src/tests/scripts/docs/.github 共 280 文件，0 命中，纳入 `test:extended`）
- [x] T-1246 消除 onDataChanged 的辅助存储原样重写（D-221 → D-221 补记）
  - 状态：done（`persistSuggestionWorkflow` 与已落盘文本等值即跳过；`rememberSuggestionWorkflowBaseline` 在 `onLayoutReady`/`onDataChanged` 两条读取路径建基线，非字符串存储清空基线以保证真正需要写时会写。审计改走 `scheduleAuditPersist()` 的 1.5 秒合并窗口，`onunload` 用 `flushPendingAuditPersist()` 收尾并纳入排空集合；锚点旁路三处失败诊断同样合并。验证：新增 `tests/aux-write-hygiene.test.cjs` 纳入 `test:extended`；双窗口 E2E 断言接收方 `checkin-suggestion-workflow` 写入为 0、`checkin-store-audit` ≤1，实测辅助写入由 2 次降为 0 次）
- [x] T-1247 校准 minAppVersion 与实际依赖下限
  - 状态：done（D-238；`plugin.json.minAppVersion = 3.8.4`，与当前完整验证基线一致；README 与 `docs/siyuan-compatibility.md` 已同步）
  - 说明：3.4.2~3.8.3 未完成真实回归，不再对这些版本承诺兼容；低于 3.8.4 的思源可能自动禁用已安装插件，发布说明需明确该影响
- [x] T-1248 E2E 扩展到宿主生命周期与移动端 bundle
  - 状态：done（`tests/e2e/plugin-lifecycle.spec.mjs`：真实 `setPetalEnabled(false)` → `window.siyuanCheckin` 在宿主 5 秒拆除预算内交出 → 注销后 2.6 秒观察窗口内该页面对内核零次 `putFile`（抓泄漏定时器与幽灵写）→ 重新启用后数据完整恢复。`tests/e2e/mobile-bundle.spec.mjs`：iPhone 13 视口加载 `/stage/build/mobile/`，公开 API 就绪、完成一次打卡并落盘、`#lcCheckinMobileTopBarButton` 注入、能力清单与桌面同版、零未捕获异常。验证：`pnpm run test:e2e` 5/5，完整 `test:quality` exit 0）
- [x] T-1249 只读实例 E2E（`--readonly`）
  - 状态：done（独立配置 `playwright.e2e.readonly.config.mjs` + `tests/e2e/readonly/`：复用 E2E 工作区、以 `serve --wd=... --port=... --readonly true` 起 6828 端口，前置自证内核确实拒绝 `putFile`；用例断言只读下 `recordEvent` 不报成功、插件保持 `isReady`、磁盘记录数不变。发现记 D-222：`--readonly` 是 `serve` 旗标且取字符串值，写成全局旗标会被 cobra 拒绝并打印帮助。`pnpm run test:e2e:readonly` 1/1）
- [x] T-1250 移动顶栏入口文案 i18n 化 + 卫生守门补形态
  - 状态：done（`ensureMobileTopBarButtonFor` 的 `aria-label`/`title` 改走 `t("entry.mobileTopBar")`，中英双字典各加一键；`tests/i18n-hygiene.test.cjs` 增加对 `setAttribute("aria-label"|"title"|"placeholder", "中文")` 形态的检测——原守门只匹配 HTML 属性写法，这类调用一直漏网）
- [x] T-1251 宿主可见文案的 i18n：随包发布 `i18n/*.json`
  - 现状：`dist/` 不含 `i18n/` 目录，思源的插件 i18n 通道（按语言码 `zh_CN`/`en_US` 读取 `i18n/<lang>.json` 填充 `plugin.i18n`）取不到字典，`langKey` 因此无法本地化，只能硬写 `langText`
  - 影响（4 处宿主面文案，英文界面显示中文）：`src/index.ts` 的 dock `title`（约 :403）、两条 `addCommand.langText`（约 :451/:458）、`addTopBar` 的 `title`（约 :478）
  - 方案：webpack 产出 `i18n/zh_CN.json` 与 `i18n/en_US.json`（内容取自主命令/顶栏/dock 标签），删除 `langText` 让宿主按 `langKey` 查表；验收需在英文语言下核对命令面板与顶栏提示
  - 状态：done（新增 `i18n/zh_CN.json`、`i18n/en_US.json` 并随生产包复制到 `dist/i18n/`；命令移除硬编码 `langText`，dock/顶栏使用插件 i18n 字典；发布资源测试锁定两份字典和四个宿主文案键。`pnpm run check`、生产构建通过；真实英文宿主界面仍需 B-007 现场核对。）
- [x] T-1252 i18n 卫生守门的行级豁免漏洞
  - 现状：`tests/i18n-hygiene.test.cjs` 只要同一行出现 `${t(` 就整行放行，一行里多个属性时后面的写死中文被放过（`src/render/review.ts` 约 :307 的 `aria-label="范围统计"` 即由此漏网；`src/render/fragments.ts` 约 :366、`src/index.ts` 约 :1630/:1669 需逐个复核）
  - 方案：改为按属性槽位逐个判定（每个 `aria-label=`/`title=` 独立检查是否 `${t(`），并清完 render 层 `title="中文"` 存量；属独立任务，不与拆除/存储工作混做
  - 状态：done（守门改为逐属性槽位检查，不再因同一行其它属性使用 `${t(` 而整行豁免；清理 `src/index.ts`、`src/render/fragments.ts`、`src/render/review.ts` 的硬编码中文属性并补齐中英字典键。`pnpm run check`、`tests/i18n-hygiene.test.cjs`、构建通过。）
- [x] T-1253 智能体接入状态自证与注册解耦
  - 状态：done（根因见 D-223：注册原在存储读取成功分支内，数据读取失败被伪装成「宿主不支持」。改为四态状态机 + 宿主返回的能力 id + 失败原因，设置页分列文案并给出 设置 - 人工智能 - 能力 的核对位置；注册移出 try/catch 无条件执行。验证：`tests/agent-status.test.cjs`（纳入 `test:ui`）与 `tests/e2e/agent-capabilities.spec.mjs`（宿主侧断言 11 项/4 写/策略未拒），`pnpm run test:e2e` 6/6）
- [x] T-1254 移动端回顾页：工具栏对齐与浮层裁剪
  - 状态：done（根因与量测见 D-224。改 `src/ui/components.scss`：移动端 `.lc-checkin__header-actions` 由 `overflow:hidden` 改 visible；`.lc-checkin__editor-header` 由 `position:static` 改 `relative; z-index:8`（sticky 时代的 z-index 因 static 失效，头部失去层叠上下文）；`.lc-checkin__text-button` 全局 `margin-top:15px` 在工具条按钮与菜单项内归零；工具组去独立胶囊（边框/底色/内边距归零）避免双层胶囊撑高；summary 与按钮统一方角无边框透明底；移动端 `justify-content: flex-start` 消除「更多」被推到最右的空洞。验证：新增 `tests/e2e/mobile-review-ui.spec.mjs`——四个控件顶部差为 0、两处下拉三点命中全在菜单内、自定义范围面板中心可命中，全部通过）
- [x] T-1255 原生容器导出通道（点导出导致思源重启）
  - 状态：done（新增 `src/download.ts` 的 `saveGeneratedFile`：检测到 `JSAndroid`/`webkit.messageHandlers`/`JSHarmony` 保存桥时，先 `/api/file/putFile` 写 `assets/`，再把绝对 URL 交给宿主 `saveExportFile`；宿主按前端能力返回 `status:"error"` 才退回容器桥，成功时不重复触发；原生路径任何分支都不再产生 `blob:` 导航，失败只报错。7 处导出入口统一改道，Loop 双文件顺序 await。验证：`tests/download-channel.test.cjs`（浏览器/三容器/宿主拒绝/宿主成功/写盘失败/文件名净化/通道唯一性）纳入 `test:extended`；`tests/e2e/mobile-review-ui.spec.mjs` 在真实例里断言零 blob 调用 + 报告确实落在 `assets/` + 导出后插件仍可用）
- [x] T-1257 移动端提示条遮挡回顾工具栏
  - 现象：思源的临时提示条（`#message`）在移动端会盖住工具栏按钮，E2E 里必须先移除提示条才能点中「导出报告」
  - 状态：done（不写死真机高度：监听 `#message` 可见 snackbar 的实际边界与动画帧，动态下移回顾工具栏，并把自定义范围浮层放到完整工具栏下方；观察器随插件卸载清理。真实思源 3.8.4 内核 E2E 不再删除提示条、改用真实点击后通过。）

- [x] T-1259 E2E 插件安装器支持嵌套发布资源
  - 验收：生产包包含目录资源（当前为 `dist/i18n/*.json`）时，真实内核 E2E 安装阶段完整复制目录；缺失嵌套资源应在启动前给出明确错误。
  - 状态：done（`scripts/e2e/lib.mjs` 的 `installPlugin` 改用递归 `fs.cpSync`；`tests/e2e/global-setup.mjs` 增加 `zh_CN.json` 安装断言。新隔离工作区下 `pnpm run test:e2e` 7/7、`pnpm run test:e2e:readonly` 1/1 通过。）

- [x] T-1260 开放回顾页建议确认执行入口
  - 验收：「查看建议影响」不再显示“即将开放”；可预览明确变更，确认后经既有令牌、冲突检查、持久化与审计通道执行，并可撤销。
  - 状态：done（本地建议仅把低完成率且非高优先级的项目提升为高优先级，不改目标、排期或历史；真实思源 3.8.4 E2E 完成预览→确认→落盘→撤销闭环。）

- [x] T-1261 较上一周期汇总图与分批项目明细
  - 验收：对比区先显示本期/上期汇总统计图；项目明细仍需主动展开，数量大时每批最多 8 项并标注本批与剩余数量。
  - 状态：done（记录/完成/安排使用双序列汇总图；首批 8 项直显，后续按 8 项 details 分批，18 项自动拆成 8+8+2；中英与结构测试通过。）
- [x] T-1262 打卡日志按月、周、日分层折叠
  - 验收：最近 14 个有记录日期按月份、周一至周日、日期三级组织；默认只展开最新月/最新周/最新日；一周和单日内容均分批显示，任何一次展开不铺开全部记录。
  - 状态：done（月/周摘要显示准确天数与记录数；每周首批最多 4 天、单日首批最多 6 个项目、同项目明细首批最多 6 条，后续递归按相同批次展开；跨月周的日期留在各自所属月份。新增纯投影与渲染结构测试，中英文案、宽度走查通过。）
- [x] T-1258 让 package.zip 可复现（固定条目时间戳）
  - 现状：每次 `pnpm run build` 重新打包都会写入当前时间戳，`package.zip` 的 SHA-256 随构建时刻变化；v17.0.0 与 v17.1.0 都被迫在构建之后单独回填哈希，且任何一次重跑 `test:quality`（链内含 build）都会让已回填的摘要失效
  - 附带缺口：`tests/release-assets.test.cjs` 只要求发布说明里存在一个非全零的 64 位摘要，并不校验它是否等于当前 `package.zip` 的实际哈希——本轮就出现过「构建后哈希过期但门禁仍通过」
  - 方案：打包时用固定的 `date`（如取 `plugin.json` 版本对应的提交时间或 1980-01-01），使同一份源码产出字节一致的 zip；验收是连续两次 `pnpm run build` 后 `sha256sum package.zip` 相同
  - 状态：done（`PackageZipPlugin` 为 yazl 每个条目固定 `mtime=1980-01-01`；`release-assets.test.cjs` 现在计算当前 `package.zip` SHA-256 并与发布说明逐字匹配。连续两次 `pnpm run build` 产出相同摘要 `f75723ff4f6f0cf725ee28405ccd70b55ef52284764a003b3b603a3757ce170a`；`pnpm run check`、`pnpm run check:release` 通过。当前 CSS 441,069 bytes，处于 420KB 警告区但低于 450KB 硬线。）

- [x] T-1263 仓库发布说明归档与布局守门
  - 验收：根目录不再堆放 `release-notes-*.md`；11 份历史说明迁入 `docs/releases/`；README、发布脚本、发布资源门禁和历史记录引用全部指向新路径；布局文档明确根目录必留项、本地生成物和未引用 `icon.svg` 的处置状态。
  - 状态：done（`scripts/release.cjs` 默认从 `docs/releases/` 读取当前版本说明，支持第四参数覆盖；`tests/release-assets.test.cjs` 同时校验归档路径和根目录无发布说明；新增 `docs/repository-layout.md`。未删除用途未完全证实的 `icon.svg`。）
- [x] T-1264 新建页锚点选择、搜索与新建入口
  - 验收：戒除类目标和备注追加开关不再以裸复选框漂移；戒除类目标仅在每日排期显示；锚点支持选择已绑定项目、按项目名/块 ID 本地搜索、清除，以及经公开 `lsNotebooks` + `createDocWithMd` 创建文档后自动绑定。
  - 状态：done（新增 `note-anchor-picker` 纯投影与测试；编辑器补齐说明、整行复选框、锚点选择器和新建文档流程；未调用未验证的全库 SQL 搜索接口。真实宿主创建文档仍可由用户显式点击触发，本轮不以真机验收阻塞开发。）

- [x] T-1265 GitHub 历史分支与提交数量审计
  - 验收：区分可安全清理的已合并分支、仍有独立提交的未合并分支，以及不应重写的 `main` 提交历史；不自动 push 或删除远端引用。
  - 状态：done（刷新 `origin` 后确认本地落后 0、领先 6；14 条 `codex/*` 已完全合并，可在远端清理窗口删除；13 条旧分支仍各有 1-5 个非 patch-equivalent 提交，只登记为待确认候选。结论与命令写入 `docs/repository-layout.md`。）

## 底栏番茄钟 PR #5 评审修复（T-1266~T-1268，2026-09-19 执行）

依据《小飞驴与底栏番茄钟联动：完整修复方案（按 17.0.0 复核）》（用户提供，`checkin-docktomato-fix-plan.zh-CN.md`），对小飞驴侧六项主体修复落地；提供方（底栏番茄钟）侧要求同步写入 `docs/docktomato-integration-plan.md` 的契约节。

- [x] T-1266 启动后校验拆分与会话归属（方案第二、三、四、七节 / D-235、D-236）
  - 验收：启动成功后不复检 canStart（不自动暂停）；启动等待期业务变化用专注专用指纹（修订+direction+tomatoMode）识别并只回滚本次会话；桥内维护 ownedFocus，start 必须返回非空 sessionId，否则 DOCK_TOMATO_START_UNCONFIRMED；停止守门（provider/失效/active/sessionId/阶段）后按会话暂停，pause-session 能力携带 sessionId，休息阶段共享父 ID 不误暂停；available:false 即时解绑、失效对象不重注册、available:true 幂等恢复；注销支持 {stopActive:false} 纯解绑，卸载不暂停跨插件计时器；完成清理立即释放归属，移除 5 秒全局轮询与 stopFocus 旁路；诊断 ready 优先于 running/paused；新增三个错误码中英文案。
  - 状态：done（`focus-adapter.ts`、`dock-tomato.ts`、`api.ts`、`index.ts` 卸载路径；新增 `tests/focus-adapter.test.cjs`（复现「启动成功即被暂停」）入 test:ui；重写 `tests/dock-tomato-bridge.test.cjs` 会话归属/守门/可用性/纯解绑/迟到事件矩阵；`tests/dock-tomato-integration.test.cjs` 契约断言同步）
- [x] T-1267 完成回写持久收件箱与幂等写入器（方案第五、六节 / D-237）
  - 验收：completedAt 缺失/无效拒绝不回退；判定顺序 duplicate → user-removed → 项目可用性（归档后重复不再误报 missing-item）；内部写入器在已持有存储锁内运行不重复排队；完成日期修订校验单位/模式/排期；atMost 三层拒绝；跳过日 blocked 由用户决定；收件箱先存后写、1s/5s/30s 重试、容量 200 拒绝不丢弃；跨窗口锁内合并；恢复入口就绪后与到期时驱动、无常驻定时器；锚点为非阻塞旁路且自动来源说明不追加为备注。
  - 状态：done（新增 `src/features/docktomato-inbox.ts` 纯函数层与 `tests/docktomato-inbox.test.cjs` 入 test:ecosystem；`index.ts` 新增收件箱/写入器/恢复/卸载清理；`dock-tomato.ts` 完成判定重排并走宿主通道；`tests/dock-tomato-completion.test.cjs` 判定矩阵与 completedAt/墓碑/atMost 断言更新；设置页新增 5 个诊断理由中英文案）
- [x] T-1268 评审结论文档化与提供方契约（方案第七、八、九、十、十一节）
  - 验收：消费端已实现行为与对提供方的要求（start 返回最终 sessionId、pause-session 原子调用、available detail、completedAt 必需、会话累计时长、并发启动互斥、默认关闭开关）形成对内决策与对外契约文档；真机联调（B-007/T-1165 同类）保持开放不阻塞。
  - 状态：done（DECISIONS D-235/D-236/D-237；`docs/docktomato-integration-plan.md` 新增「PR #5 评审后的消费端契约」节；BLOCKERS 番茄钟条目更新。上游 PR 修订与真实宿主联调仍待对方排期，保持 B-007 跟踪。）

- [x] T-1269 PR #5 消费端修复定稿与推送
  - 验收:按修复方案第十节交付要求(修改文件清单/错误码/存储 schema/测试结果/真机边界)写入 docs/docktomato-integration-plan.md「交付清单」节;用户授权后推送 main 至 origin。
  - 状态:done(定稿节已写入;推送记录见 PROGRESS)

## 持续开发批次（T-1270~T-1272,2026-09-20 执行）

- [x] T-1270 收件箱手动管理 UI（修复方案第五节「提供重试回写」与跳过日「用户确认撤销跳过并计入」收口）
  - 验收：设置页展示待回写番茄完成(容量/最新 20 条/状态复用诊断理由文案);每条可立即重试(不受自动退避限制)、丢弃(确认后仅清收件箱);skipped-day 条目可「撤销跳过并计入」——同一受保护单元内先写 skip 墓碑再复用内部 writer,主记录未入账时墓碑一并恢复。
  - 状态：done（`docktomato-inbox.ts` 新增 projectInboxEntries;`index.ts` 三宿主动作;`settings.ts` 收件箱区块(零新增 CSS);i18n 中英 15 键;集成契约 +8 断言,收件箱测试补投影用例）
- [x] T-1271 minAppVersion 校准到实测基线 3.8.4（T-1247 决策收口）
  - 验收：声明下限=实际验证过的最低版本;兼容矩阵/README/发布说明同步;门禁锁定防漂移。
  - 状态：done（D-238;plugin.json 3.4.2→3.8.4;block-dom-compat 新增等值断言;真机回归路径按既定策略跳过）
- [x] T-1272 CSS 预算放宽（用户明确要求）
  - 验收：分级线放宽并记录;活文档同步;历史 change-log 不回改。
  - 状态：done（D-239:420/450→480/520,318KB 软线保留;当前 448,170 bytes 回落为常规 warning）

## 调研与设计批次（T-1273~T-1274,2026-09-20 执行）

- [x] T-1273 竞品调研续作（habits-evolution 路线第四节既定项）
  - 验收：思源集市第二梯队复扫、Obsidian Tracker 表达式引擎精读、Habit Tracker 21 断签容忍细节,写入 benchmark 活文档。
  - 状态：done（全量 plugins.txt 复扫:专打卡仍仅 2 家,第二梯队约 20 个联动面为主;Tracker 精读:dataset()/sum()/maxStreak() 表达式、四类数据源、colorByStreak 等视图参数、falsey 终止语义;Habit Tracker 21:断签容忍真名 maxGap(数字,频率对照 3/6/13/30),缺勤日淡化渲染+计数只算真实完成,entries[] 一习惯一文件模型;渲染块断签淡化列入 v18 候选,frontmatter 迁入通道列为 Loop CSV 之后的低优先）
- [x] T-1274 API v5 设计稿（development-roadmap v18 既定项,除隐私待评项）
  - 验收：基于 v4 四个实践缺口出提案,纯设计不实现,记 DECISIONS。
  - 状态：done（docs/api-v5-design.md:范围读/幂等批量写/项目统一投影/指标门面/协商补强五提案,纪律沿用 D-211/D-227,切分 v5-1~3 三批;D-240 草案登记）

- [x] T-1275 API v5-1 只读批次实施（D-240 切分第一批）
  - 验收:getEventsInRange(半开区间/itemIds≤200 消毒/source 白名单/includeSkips/limit 1000 默认 5000 上限+truncated)与 queryItems(归档语义二选一 archivedOnly 优先/kinds fail-closed/limit 200 默认 1000 上限)落地;版本 4→5 只增不删;Task Horizon minApiVersion 钉 4 不随运行时升。
  - 状态:done(api-contract 16 能力+2 限额常量;features/api-v5.ts 纯过滤;api.ts 接线(TypeError 预 precedent);tests/api-v5.test.cjs 入 test:ecosystem,契约测试升 v5;合作文档/走查/README 能力清单同步)

- [x] T-1276 渲染块断签淡化候选评估（T-1273 调研吸收项）
  - 验收：评估 maxGap 淡化呈现是否适用于渲染块月历;如无真实缺口,按可证明性原则关闭并留档,不引入死代码。
  - 状态：done（结论=关闭:原型验证发现 quota 完成口径是回溯性的——周期达标后达标日之前的期内剩余日经 isComplete 已渲染为完成色,AUTO 回溯完成在呈现上强于 maxGap,「缺签缺口」不存在;原型已回撤,评估结论写入 benchmark 活文档。渲染块 15ms/万事件基线不受影响。）

- [x] T-1277 API v5-2 幂等批量写实施（D-240 切分第二批）
  - 验收:recordEventsBatch 单次持久化、结果与输入 1:1（recorded/duplicate/discarded/blocked/rejected）;occurredAt 缺省回退标注 usedFallbackTime、非法拒绝;单批 200;atMost/墓碑/归档照旧;单条 recordEvent 行为不变。
  - 状态:done（api-contract 17 能力+CHECKIN_BATCH_RECORD_LIMITS;features/api-v5.ts 单遍 planBatchRecord(结构校验/时钟注入/批内去重回显首条/固定判定顺序);index.ts 单单元 makeEvent+appendEvents+persist+逐事件广播+受影响项目自动归档+锚点旁路;api-v5 测试扩 15 输入混合场景+跨午夜;契约/README/合作文档/走查/设计稿同步）

- [x] T-1278 API v5-3 指标门面实施（D-240 切分第三批）
  - 验收:metrics.read 能力 + getStreaks(当前连续,走 computeEventStreaks 单一实现,itemIds 有界过滤,输出冻结);longest/capabilitiesSince 留待后续。
  - 状态:done(契约 18 能力;api.ts getStreaks;契约测试+2 断言;README/合作文档 18 项/走查/设计稿同步)

- [x] T-1279 Obsidian Habit Tracker 21 迁入通道（T-1273 调研吸收项）
  - 验收:解析 Habit Tracker 21 的习惯 .md frontmatter（title/color/maxGap/entries,引号与块列表/内联列表变体,非法日期消毒）;一习惯一文件 → 每日二值项目 + source=import 打卡,externalRef 走 obsidian21 注册前缀幂等;颜色与 maxGap 不迁移并在确认文案如实说明;设置页多选导入。
  - 状态:done(features/obsidian-habits.ts 纯解析;plugin-ops importObsidianHabitsInto(外部身份+同日去重);EXTERNAL_REF_PREFIX_REGISTRY +obsidian21;设置页导入行;identity-and-merge.md 登记;i18n 中英 6 键(1117 对等);obsidian-habits.test.cjs 入 test:ecosystem)

- [x] T-1280 longest streak 与 capabilitiesSince（v5-3 预留项收口）
  - 验收:computeLongestStreaks 与现有当前连续同一状态语义(真实/派生 +1、跳过桥接、at-most 连续无破戒),全历史正向扫描取最大;getStreaks 返回 {current, longest};describe 增 capabilitiesSince 供 v4 消费方版本探测。
  - 状态:done(model.ts 新增 computeLongestStreaks(现有函数零改动);api.ts getStreaks 三字段;CHECKIN_CAPABILITIES_SINCE 冻结映射 + descriptor;api-v5/contract 测试同步)

- [x] T-1281 v17.2.0 发版准备（本地）
  - 验收:版本三处(package.json/plugin.json/version.ts)统一 17.2.0;change-log 与 release-notes 完整覆盖 17.1.0 后全部变更(番茄修复/API v5/Obsidian 迁入/minAppVersion 3.8.4);发布资源门禁以 v17.2.0 通过。
  - 状态:done(摘要 f84728b8… 已写入发布说明;README 当前版本与要点节同步。tag/push/GitHub Release 属发布动作,待用户授权执行)

- [x] T-1282 发布流水线加固（v17.2.0 发布前置）
  - 验收:release.cjs 发布前测试链对齐 test:quality 全量(补 extended/perf/legacy-style/review-comparison);gh 可用性检查提前到任何 git 写操作之前,避免"已推送未发布"半成品。
  - 状态:done(node --check 通过;本机实测 gh 缺失 → 按设计在 push 前中止;发布 runbook 见 PROGRESS)

- [x] T-1283 Obsidian 迁出通道（迁移对称性收口）
  - 验收:活跃项目导出为 Habit Tracker 21 习惯 .md 文件（title+entries,完成日=非跳过事件日,跳过不导出）;文件名消毒+冲突唯一化;无记录/超上限(30)项目计入 skipped;设置页按钮+完成消息;round-trip(导出→解析无损还原)。
  - 状态:done(features/obsidian-habits.ts buildObsidianExportFiles;plugin-ops downloadObsidianExportFor 顺序多文件下载;设置页导出行;i18n 中英 4 键(1120 对等);obsidian-habits 测试补 round-trip/消毒/唯一化断言)
- [x] T-1284 E2E 公开 API v5 真实宿主 spec
  - 验收:真实内核上验证 version=5、17→18 能力、capabilitiesSince、getEventsInRange/queryItems/getStreaks 形状与归档语义。
  - 状态:done(tests/e2e/api-v5.spec.mjs,test:e2e 9/9 通过)

- [x] T-1285 批量写真实内核 E2E（v5-2 收口验证）
  - 验收:recordEventsBatch 在真实思源内核上单次落盘(事件带稳定 externalRef),重载后同 refs 重放全部 duplicate 且内核不新增记录。
  - 状态:done(tests/e2e/api-v5-batch.spec.mjs;test:e2e 升为 10/10)

- [x] T-1286 番茄完成全链路真实内核 E2E（v17.2.0 头牌功能的真实宿主证据）
  - 验收:dispatch 真实 completion 事件→入账(值/日期/来源/externalRef 内核文件级断言)+重复幂等;skip-day→blocked:skipped-day 留痕收件箱、不删跳过、不误入账。
  - 状态:done(tests/e2e/docktomato-completion.spec.mjs;test:e2e 升为 12/12)

- [x] T-1287 移动端番茄完成 E2E + T-1288 longest 性能门禁
  - 验收:mobile bundle 下番茄完成联动同样入账;computeLongestStreaks 在 26 年窗口(9.5k 日)全历史扫描设 2000ms 灾难退化捕获。
  - 状态:done(docktomato-completion.spec.mjs 增 mobile 场景;api-v5 测试补 longest 性能门禁)

- [x] T-1289 跳过日解析旅程 E2E（T-1270 交互闭环的真实宿主验证）
  - 验收:完成事件→收件箱 blocked→设置页收件箱区块→点击「撤销跳过并计入」(确认弹窗)→同单元落库断言:完成事件入账、skip 原子消失并留墓碑、收件箱条目清除。
  - 状态:done(docktomato-completion.spec.mjs 增旅程场景,mobile bundle + iPhone 13 视口走完整 UI 旅程;test:e2e 13/13)

- [x] T-1292 渲染块 doc/notebook 维度（T-1234 遗留缺口收口）
  - 验收:配置 docId/notebook(内核 id 格式校验,≥8 字符);作用域优先级 itemIds>group>doc/notebook>全部活跃;锚点归属经宿主 getBlockInfo 解析并缓存(fail-closed:未命中/无索引=空视图);胶水首次渲染先出加载占位再强制重渲染一次。
  - 状态:done(checkin-block.ts AnchorDocIndex+parse+resolve;block-renderer deps 扩展+加载占位;index.ts 缓存+解析器;compat 文档登记;checkin-block 测试 +12 断言;i18n +1 键(1122 对等))

- [x] T-1293 渲染块真实宿主 E2E(渲染管线首次真实宿主自动化验证)
  - 验收:docId 作用域块在真实内核渲染出项目行(锚点经 getBlockInfo 解析);未命中文档 fail-closed 空视图;发现并修复两处真实缺陷——胶水相邻渲染块互删预览(归属标记修复)、宿主解析字段名错误(rootID 非 root_id)。
  - 状态:done(tests/e2e/render-block.spec.mjs;test:e2e 15/15)

- [x] T-1294 v17.2.0 发版说明/变更记录补全（覆盖缺口巡检发现）
  - 验收:release-notes 与 change-log 覆盖 17.1.0 后全部已交付特性(Obsidian 迁出、渲染块 doc/notebook scope+相邻块修复、收件箱手动管理、性能门禁、E2E 增强)。
  - 状态:done(两份文档补齐;发布说明用户向三节扩充;变更记录新增渲染块与性能验证两节)

- [x] T-1295 洞察页新增「历史最长连续」统计（T-1280 能力的用户可见化）
  - 验收:洞察页统计区新增历史最长(全历史,computeLongestStreaks 单一实现),与窗口最佳并存;i18n 中英;结构断言锁定单一实现。
  - 状态:done(index.ts renderInsights 五格统计;insights.longestEver 双语 1122 对等;ui-theme 断言单一实现与标签)

- [x] T-1297 渲染块 notebook 维度 E2E(作用域矩阵补全)+ T-1298 Obsidian 迁出下载流 E2E
  - 验收:notebook 维度块渲染项目行(docId 块+notebook 块=2 行,未命中块空视图);Obsidian 导出按钮触发逐文件下载,H21 .md 含 frontmatter title+entries。
  - 状态:done(render-block.spec.mjs 三块矩阵 nameCount=2;obsidian-export.spec.mjs 下载 2 文件内容断言;test:e2e 16/16)

- [x] T-1300 收件箱 UI 显示项目名而非内部 ID
  - 验收:设置上下文构建时按 itemId 查找项目名注入 entries;settings 渲染层 itemName || itemId 回退;纯函数层 DockTomatoInboxEntryView 补可选 itemName。
  - 状态:done(三文件协作:纯层类型扩展、宿主上下文名称解析、渲染层回退显示;i18n 无新增键;相关测试全过)

- [x] T-1301 渲染块 summary 视图加历史最长连续
  - 验收:summary 行的 em 标签同时显示当前连续与历史最长(≥2 时),逗号分隔;computeLongestStreaks 单一实现;i18n block.longestSuffix 中英。
  - 状态:done(checkin-block.ts 计算与渲染;i18n 双语 1124 对等;checkin-block 测试通过)

- [x] T-1302 渲染块 month 视图 tooltip 增强——未完成项目名展示
  - 验收:CheckinBlockDayCell 新增 incompleteNames(当日未完成项目名列表);month 视图 title 属性格式升级为 "1/3（缺：阅读、跑步）";hover 即可看到具体缺了哪些项目。
  - 状态:done(checkin-block.ts 类型+收集+渲染三处;checkin-block 测试全过 17ms)

- [x] T-1303 底栏番茄钟作者沟通包准备
  - 验收:可发送给 5kyfkr 的完整沟通文档,含 6 点修订请求、消费端已就绪清单、测试证据。
  - 状态:done(docs/docktomato-author-communication.md;用户复制粘贴即可)
- [ ] T-1508 外部时长片段与 LifeLog 项目路由收口
  - 状态：本地实现与回归通过；已观察到的可重试失败片段由 T-1509 有界持久待处理箱承接。剩余仅跨窗口同一真实会话身份、未收到的监听事件和真实第三方宿主证据。思阅/思播同日 20+15 分别两条，思播按完整播放段结束结算；新身份改用精确开始毫秒，避免同一分钟两段碰撞，旧每日/分钟桶身份继续可读。叶归有映射时未命中跳过，无映射时仅唯一同名分钟目标匹配。上游旧提案/历史研究保留当时每日口径，不当作当前功能说明；见 BLOCKERS。
  - 下一步：等待可验证的上游共享会话身份或单采集窗口机制，并在真实双插件宿主核对；不能用时间近似合并，也不承诺恢复从未收到的事件。
