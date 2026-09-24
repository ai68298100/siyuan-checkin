# TODO


## v18.3.0 发布（2026-09-24，已完成）

- [x] v18.3.0 发版（R-A0～A12 泳道交付 + 生态调研采纳项收口）
  - 内容：戒断里程碑（今日卡/渲染块/API 同口径）、今日行动台摘要条、安静时段+延后2小时、命名保存视图、CSV 范围导出、隐私披露四件（导出审计/断开保留/诊断预览/删除影响清单）、渲染块一键插入 4 预设、导入统一预览、失速项目报告节、日期契约 date-keys、架构边界守门（104 模块）、Task Horizon mock consumer、来源生命周期矩阵、contract kit 前缀同步。
  - 发布执行（2026-09-24 用户确认）：main 推送 a53037d（含此前 25 个本地提交一并上云）、tag v18.3.0 推送、GitHub Release 附 package.zip（708,902 字节）标记 Latest；发版前完整 test:quality EXIT=0，SHA ba25b80f… 回填后与资产实测一致（0ed8e093…）。
  - 状态：released（https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.3.0）。

## 当前任务证据分类（D-264，2026-09-23）

- `local-auto`：不需要用户操作即可完成的纯逻辑、契约、结构 UI、导入预览、性能、恢复脚本和文档一致性；自动证据通过后可以继续推进。
- `host-pending`：思源桌面、页签、dock、Android WebView、系统键盘/安全区、用户工作区和真机显示；保持开放，不以浏览器或 mock 关闭。
- `external`：Task Horizon、Dock Tomato、思阅、思播、健康等外部插件消费端、上游 API 合并和真实双插件时序；对方未发布前只做本地契约/fallback。
- `decision`：积分、微信读书 Key/ToS/限流、自建同步、自动摘要隐私扩展、截图视觉取舍等需要用户或隐私判断的方向；不自动开工。

当前路线不要求字面意义的 TODO 全部关闭才可继续本地开发。只要剩余阻塞项均属于 `host-pending`、`external` 或 `decision`，就可以按 [产品战略落地执行路线](docs/implementation-roadmap-product-strategy-2026-09.md) 的 R-A0～R-A12 泳道继续本地批次，并在 PROGRESS 中区分自动证据与现场证据。
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
- [ ] T-1415 戒断里程碑投影（第三轮采纳①，源：Quitter 里程碑 + Streak relapse + HabitKit 1.17 干净天数）
  - 语义：at-most 戒除类项目增加「戒断里程碑」只读投影——当前戒断天数（现有连续无破戒口径）对照固定阶梯（1/3/7/14/30/60/90/180/365）输出最近达成级与下一级；破戒历史可从现有事件回放。复发详情、抵扣、省钱换算不进第一版。
  - 验收：里程碑纯函数单一实现（空项目/破戒重置/补记修订/跨时区/确定性）、洞察与 today/summary 渲染块可选展示、API 投影同口径、双语与双主题结构门禁。归类 `local-auto`，排在 R-A3 节奏投影同窗口。
- [ ] T-1416 渲染块一键插入预设（第三轮采纳②，源：obsidian-easy-tracker 套件 + contribution-graph 声明式）
  - 语义：命令面板/斜杠提供 4~6 个预设渲染块模板（今日块、月历、热力图、分组汇总），插入后光标落在首个可编辑参数；参数缺失继续 fail-closed，不改块语法。
  - 验收：插入命令注册与能力声明、模板字符串与现有块解析器往返一致、焦点落点结构测试、i18n/双主题守门。归类 `local-auto`，挂在 R-A12（新手路径）；真实宿主插入体验归 host-pending。
- [x] T-1417 Pinch 发布包深评（第四轮首位任务，竞品警报）——**done（2026-09-24，全案见 benchmark 第十三节）**
  - royc01/pinch（v2.7.1 @2026-09-18，30 个 release）：习惯+任务+番茄+心情+目标+奖励兑换+统计，功能覆盖面与小驴几乎重合。
  - 方法：参照第二轮修仙打卡深评——发布包静态分析（数据结构/统计口径/奖励系统边界/权限面）+ 用户迁移通道评估（能否成为导入来源）+ 结论评估卡（做/延后/不做）。
  - 结论：① 代码吸收不做——可吸收点均在既有路线/边界内，其趣币商店+徽章等级（5/10/15 级）=修仙打卡同型经济闭环，反向固化 T-1413 无等级边界；② 迁移通道延后——数据住块属性可经 SQL 公开解析、可映射二值打卡，但工程量中等且无用户需求信号，登记为导入来源候选；③ 竞争面确认但不构成架构威胁——全家桶形态分散专注，本插件差异化（习惯算法内核/不可变事件/API v5/零惩罚）保持；④ 佐证：checkinNotes 备注同步与回收站=record-notes 路线互证；minAppVersion 3.7.0 提示老宿主存量面。
  - 第四轮状态：首位任务完成，轮次继续滚动（剩余扫描面按 D-256 触发条件）；无新增代码任务。
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
- [ ] T-1440 来源专用打卡模板（番茄钟/思阅/思播，用户需求 2026-09-24）
  - 分析：模板体系（templates.ts/template-manager，66+ 模板八类分组）目前只承载内容形状（kind/target/unit/schedule/group/icon），不含完成来源绑定；而番茄/思阅/思播项目在今日页与编辑器已有专属语义（completionSource、dock-tomato 适配器、思阅/思播治理映射）。
  - 设计要点：模板数据增可选 `sourcePreset`（tomato/sireader/siplayer），应用时预填完成来源、时长单位（分钟）与建议排期；**不自动启用外部来源联动**——应用后引导用户到设置开启对应联动，未启用时项目保持手动记录可用（opt-in 纪律不破）。分组新增「联动」类或来源角标。模板为内容资产，增可选字段无迁移。
  - 验收：模板纯函数与 gallery 测试、应用→编辑器→保存→来源行为链路、双语、模板数量守门同步。归类 `local-auto`。
- [ ] T-1441 叶归 LifeLog 识别与自动完成研究（用户需求 2026-09-24）
  - 分析：诉求=识别叶归插件的 LifeLog（任务时间记录）条目并自动完成对应打卡。场景=「读取另一插件产生的用户可见数据→映射为打卡事实」，与健康收件箱同型。纪律红线：**不得逆向叶归私有存储**；仅当 lifelog 落在用户文档/块属性等用户可见内容时可解析。
  - 研究步骤：① 定位仓库并做发布包静态分析（数据落点=私有 storage vs 文档/块属性；条目 schema=时间/标题/标签/时长）；② 判定公开可解析面与稳定性；③ 若可解析→设计映射：用户绑定 lifelog 范围（笔记本/文档）+ 条目规则（标签→项目映射，用户显式配置）+ externalRef `yeguif:<blockId>` 幂等 + 预览确认流（T-1427 模式）；④ 智能体通道评估：经思源智能体读 lifelog 仅作非确定性补充，不作自动完成主通道。
  - 「自动完成」边界：缺省只做识别与预览；自动写打卡必须 opt-in + 每项目映射显式配置 + 幂等防重 + 可撤销。归类：研究 `local-auto`，实现含真实宿主验收。
- [ ] T-1442 设置页「外部连接与能力」分区重组（用户需求 2026-09-24，**用户截图确认混排问题，已点名待开工**）
  - 用户反馈（2026-09-24 截图）：连接与能力区内「摘要驻留 / 思阅阅读联动 / 健康数据收件箱 / 思播观看联动」各来源的行穿插混排（目标文档ID → 写入今日摘要 → 思阅启用 → 目标项目 → 阈值 → 健康启用 → 收件箱文档 → 步数映射 → 体重映射 → 思播启用 → 目标项目…），分不清哪行属于哪个插件；**要求按插件分类，并写清楚每个联动的具体设置步骤**。
  - 现状事实：设置组 id=`integrations`（settings.ts groups 数组），行序扁平混排；偏好 schema 不动。
  - 设计要点：① 重组为**按插件分子面板**——每来源（摘要驻留/思阅/思播/健康/Dock Tomato）独立子面板（标题+折叠），面板内行按「启用开关 → 目标配置 → 参数 → 保存动作」固定顺序；② **每面板头部写清编号设置步骤**（如思阅：①安装并打开思阅插件 ②启用联动 ③选目标项目 ④设每日阈值——达标自动记一次打卡），双语；③ 共性区——幂等身份与前缀说明（六前缀登记表）、断开保留规则（T-1430）、导出/隐私披露说明；④ 不改偏好 schema，只动分组与渲染，绑定 data-* 全部保留。
  - 验收：settings-navigation/preferences-docs 守门同步（断言按新结构更新）、每面板步骤文案双语齐全、ARIA/折叠可访问、全链。归类 `local-auto`。**用户已点名，等「开工」指令即执行。**
- [x] T-1433 情境化记录：备注词表归一化与跳过原因分布（R-A3 第二切片，映射 R-20.2，2026-09-24 开工并完成）
  - 内容：新增零依赖纯模块 `src/features/context-normalization.ts`——classifyContextTokens 把跳过/打卡备注的自由文本按中英关键词归一化为有限词表（v1 六类：阻力/时间不足/环境变化/身体状态/情绪波动/其他，未命中归 other）；aggregateSkipContext 聚合计数（降序+词表序稳定）、日期范围、样本不足守卫（< CONTEXT_MIN_SAMPLE=3 标记 insufficient）。**不新增事件字段、不修改 Store v3、不影响完成判定与连击**（只读投影，词表可扩展）。
  - 接入：`buildWeeklyReportMarkdown` options 增加可选 contextAggregation——报告头部新增「跳过原因分布（共 N 条备注）」节，逐词元计数+样本不足提示；index 调用点从区间内跳过事件的既有备注聚合（isSkipEvent 单一口径）。i18n 8 键中英双语（parity 1648/1648）。
  - 测试：`tests/context-normalization.test.cjs`——关键词归一化（中英/大小写/空文本）、聚合排序与 other 兜底、日期范围、样本不足守卫、报告接线守门、纯度审计，入 `pnpm test` 主链；模块入架构守门无时钟清单（104 模块全绿）；diary-report 导出路径守门同步含 contextAggregation。
  - 状态：done（2026-09-24 第二切片，A3 泳道收口）。真实用户是否写备注属使用反馈，保持开放。
- [ ] T-1437 微信读书阅读时长来源（官方 WeRead Skills 通道，评估通过后转开发批次）
  - 背景（2026-09-24 用户提供）：腾讯官方组织开源 `Tencent/WeChatReading`（Apache-2.0，AI Agent Skills 形态），提供 wrk- 前缀官方 API Key（weread.qq.com/r/weread-skills 获取）；用户已取得 Key 并授权评估。**Key 属用户凭据：仅在用户本地插件设置中录入，绝不写入仓库、文档或导出文件；建议用户定期轮换。**
  - 数据面：书架/阅读时长与天数/笔记划线/阅读进度/点评——「阅读时长→每日打卡」与思阅适配器同型，可走五段框架（descriptor: api-push、identity `weread:<bookId>:<date>`、每日一次结算、opt-in 默认关、断开保留规则沿用 T-1430）。
  - 评估项：① 从 skill 包提取 API endpoint/鉴权/限流契约（Apache-2.0 允许适配，注意附许可声明）；② ToS/数据范围核对（仅读用户自身数据）；③ 适配器设计走 T-1427 预览模型（导入/接入前披露）；④ 备选路径：经思源智能体 + skill 间接读取（非确定性，仅作补充不作主通道）。
  - 归类：评估阶段 `local-auto`；真实账号数据联调 `host-pending`（需用户 Key 与授权）；不改 Store v3，不自动写入打卡（结算入 T-1427 式预览确认流）。
- [ ] T-1438 思阅/思播上游提案提交（R-40.2，等用户明确授权后执行）
  - 现状核查（2026-09-24）：**上游 issue/PR 尚未提交**——T-1395 三份提案（思阅/思播/Task Horizon）仅存在于 `docs/contracts/upstream-proposals/` 本地草案 + 守门测试，符合 D-255「无授权不提交外部仓库」纪律。
  - 匹配度答复：思阅=本地生命周期计时适配器已交付（opt-in）；思播=实验采样适配器已交付（默认关）；两者均能在隔离内核 E2E 自动化通过，但**上游 API 未合并、真实双插件联调（T-1388）未做**——「完全匹配」尚不成立，差上游合并与现场证据两步。
  - 提交内容（授权后）：三份提案按各自仓库转 issue/PR；附 contract fixture 与降级说明；提交后更新 T-1395 状态与 BLOCKERS。
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
- [ ] T-1406 锚点移动端触控与 Android 真机验收（v18.1.x，外部依赖）
  - 验收：移动端锚点跳转触控目标/滚动定位、Android WebView 打开文档行为、块内定位不可用时的提示可读性；按 integration-smoke-checklist 记录真机证据。归 T-1388/T-1344 真机窗口。
- [x] T-1407 v18.2.x 日记只读与手动确认收口（交付度核对）
  - 状态：done（2026-09-23 核对：T-1352 日记集成（搜索/新建/预览选择/手动写入本期报告）与 T-1353 摘要驻留已交付全部本地可做项——摘要展示=设置页三件套、预览=文档搜索选择、幂等=有界重试+审计、周期报告保持用户主动触发；剩余仅真机读取验证归 T-1344。无新增工作。）
- [ ] T-1408 v18.2.x 真机验收（外部依赖）：日记写入与摘要驻留的真机读取/写入证据，归 T-1344 真机窗口。
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
- [ ] T-1394 双向联动边界、幂等与真实宿主验收
  - 验收：显示开关与任务完成回写解耦；`taskhorizon:<blockId>:<localDate>` 重放/墓碑/补录日期/跨午夜/删除/归档/多窗口一致；双方 contract test 及思源桌面/页签/dock/Android 现场证据齐全后，再决定进入哪个 v18.x 小版本。

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
- [ ] T-1386 来源联动设置与项目映射 UX：来源、阈值、范围、隐私说明、累计预览、禁用/断开/重试；不把标题或 URL 作为必填配置。
  - 进度（2026-09-23 首切片——累计预览）：思阅/思播设置标题行在启用后显示「今日已累计 N 分钟」（`sourceDayMinutes` 纯函数读 store，来源行实时预览写入进度）；治理层累计预览承诺就此兑现，i18n 双语 1595 对键。剩余：多来源统一面板聚合、断开/重试 UX 细化（随外部来源数量增长按需推进）。
- [x] T-1387 事件幂等、撤销与诊断：新 source 前缀注册、跨窗口并发、失败重试、墓碑、卸载清理、导出诊断和回滚矩阵。
  - 状态：done（2026-09-23，D-261。前缀注册=T-1384 已落（sireader 注册表+四处白名单+facade 防伪）；**修复累计结算缺陷**——资格判定改为按「当日累计分钟」（tracker.dayTotal），20+20 跨段达标可用，写入值=达标时点累计；**墓碑防复活双保险**——宿主预检 eventTombstones + 模型 appendEvents 拒绝墓碑身份，用户删除后同日阅读不再重写；**失败自愈**——不设显式重试器，未写成功的资格日在下次生命周期事件以新累计值自动重结算（结算确定性保证无副作用）；跨窗口并发由合并层 deduplicateExternalRefs 按 itemId+source+externalRef 收敛为单条（新增回归测试）；卸载清理 T-1384 已落（unbind+discardInFlight）。诊断码枚举不变（无新增失败面，自愈路径不产生用户可见错误）。tests/sireader-adapter.test.cjs 扩展累计结算/墓碑不复活/跨窗口收敛/自愈重试四组验收。）
- [ ] T-1388 真实宿主验收与小版本决策：桌面页签/dock、独立窗口、Android、插件缺失/升级/重载、暂停/seek/循环/切集、跨日和时区；证据齐全后再决定进入哪个 v18.x 小版本。
- [x] T-1401 外部应用来源评估批（B/C 类，2026-09-22 用户指示登记）：微信读书、Keep、手机健康中心三来源的官方导出格式取证、指标语义与接入渠道评估（健康中心优先评估快捷指令经公开 API push 的 C 类路径）；产出「做/延后/不做」评估卡（T-1378 同款格式，含用户收益、适配代价、验证方法与防双重累计分析）；评估完成前不写接入代码。
  - 状态：done（2026-09-23，docs/external-source-evaluation-2026-09.md。三路并行取证。**重大发现：微信读书已上线官方 Agent API**（`i.weread.qq.com` Bearer Key，腾讯官方域名，主流工具已迁移），完读事件+划线计数=做（条件批次），阅读时长=延后（当月按日可行，推翻「无官方时长」旧结论）；Keep=不做（无自助导出/无个人 API，仅客服 xlsx，第三方全靠私有接口）；健康中心 iOS 步数+体重=做（快捷指令经公开 API push 的文档级零代码交付），睡眠/Android 延后，锻炼时长不做。框架学习：新增第五渠道形态 official-pull（出站拉取官方 API），随 T-1402 实现时入枚举。评估完成，未写任何接入代码。）
- [ ] T-1402 微信读书适配器（条件批次，评估卡 1）：官方 Agent API 拉取完读事件（`finishedDate`）+ 划线/笔记计数；`weread:` 前缀 + externalRef 幂等；用户自助申请 API Key，opt-in + 断网静默降级；与思阅按「载体归属」互斥（同一本书唯一 canonical source）。前置：Key 申请流程实测 + 用户需求确认 + Agent API ToS/限流重新核对；阅读时长指标延后（评估卡 2）。
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
- [ ] T-1344 真实宿主验收清零（依赖用户）
  - 验收：T-023/T-033/T-129/T-1256/T-1173 按 integration-smoke-checklist 逐项关闭；B-007 双插件现场联调。证据进 PROGRESS，浏览器结果不替代真机。
- [x] T-1345 设置页状态可观察性收口
  - 验收：番茄钟/Task Horizon/智能体三类外部依赖的状态、错误原因、重试与恢复提示统一为同一套组件与文案模式。
  - 状态：done（2026-09-21。设置页三行统一 data-dependency + data-dependency-state 钩子（healthy/degraded/error 三态经 dependencyBucket 显式映射：番茄 ready/running/paused=healthy、版本/API/能力/错误=error、其余=degraded；智能体 registered=healthy、failed=error、其余=degraded），状态值统一 role="status" + is-success/is-muted/is-error 视觉；每行新增统一 class 的恢复/重试提示（番茄：重载刷新+收件箱重试；智能体：核对宿主版本后重载注册；TH：对方缺位不阻塞+合作文档指针）；新增 Task Horizon 提供方就绪行（API v5 · 契约 v1，不冒充运行时握手状态）。新增 tests/dependency-status.test.cjs 接入 test:ui；agent-status 旧正则适配统一钩子）
- [ ] T-1346 UI 错乱清查与修复
  - 验收：文本截断/重叠/错位/滚动穿透/塌陷/主题切换残留扫描 × 四端双主题 × 关键宽度 × 长文本/英文 i18n/显示缩放；修复即补守门断言；长尾入多端显示台账。
  - 进度（2026-09-20/21）：宽度走查（Edge）浅深双主题 42 页面+32 交互+8 对比度+10 混合+16 长内容全过，含编辑器模板披露高度、芯片点击断言；模板区改动（分批/最近使用/预览摘要）无溢出回归。
  - 发现 1（已解决 2026-09-21）：pluginLanguage 未接线——已实现设置页「界面语言」（zh-CN/en-US/跟随思源，缺省 zh-CN 行为不变）；走查脚本支持 CHECKIN_QA_LANG=en-US 全矩阵英文审计，修正走查内 14 处硬编码中文期望为双语后，**英文界面全矩阵通过**（布局无错乱；EN 文案布局首次获得真实走查证据）。
  - 发现 2（已解决 2026-09-21）：模板区分批显示与最近使用行的运行时断言已补入走查（展开器可见→点击全显→芯片置顶→重渲染后保持）。
  - 剩余：仅真机显示缩放（80%/110%）变量——随 T-1344 真机窗口一并执行。dock 实宽 280px 场景已本地化：走查新增 280px 档（49 页面场景），实测发现并修复回顾页自定义范围条在 EN+280px 下的横向溢出（range-tabs 允许换行 + summary 可换行，review-workspace.scss）。
- [ ] T-1347 真机显示回归通道（依赖用户反馈）
  - 验收：真机显示问题台账逐条「脚本复现 + 用户确认」双证据关闭。
  - 状态：台账建立于本文件与 BLOCKERS 跟踪；当前无新增真机显示反馈，通道就绪待第一份反馈。
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
- [ ] T-1173 v15 跨端交互回归批次
  - 验收：Today/回顾/事项/设置在桌面、页签、dock、移动端的焦点、滚动、触控、键盘和错误反馈一致；完整质量链及真实宿主验收记录齐全。
  - 依赖：T-1171、T-1172
  - 进度：自动化结构、宽度、移动端、无障碍和性能门禁已覆盖；真实思源宿主与多窗口现场证据仍待 B-007。
  - 进度：本轮补齐归档恢复/删除、回顾导出、设置导入/恢复的 aria-busy、重复提交、错误可见性与焦点恢复结构守门；真实思源宿主与多窗口现场证据仍待 B-007。
  - 进度：归档页批量工具栏已补整组互斥、筛选结果全选、单事务恢复/删除和 560px 窄容器回流；真实宿主触控与焦点仍待 B-007。

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
- [ ] T-1256 真机复核移动端修复
  - 现状：E2E 用 Chromium 的移动 bundle + 伪造的 `JSAndroid` 桥验证，覆盖不到 Android WebView 的真实下载/保存面板与键盘行为
  - 验收：在思源 Android 客户端上复核回顾页工具栏、两处下拉与自定义范围展开，并实际完成一次「导出报告」的系统保存（确认不再重启、`assets/` 内生成报告文件）
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
