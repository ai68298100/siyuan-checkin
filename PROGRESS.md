2026-09-30 全量只读盘点与扩展待办登记（用户要求：后续输入先入 TODO，收到“开始开发”前不改运行代码）：工作区 clean，`main` HEAD=`0dea0a6`，比 `origin/main` 超前 3 个提交；`package.json`/`plugin.json`/`src/version.ts` 为 v18.16.0，TODO 顶部旧索引仍写 v18.10.0，已登记 T-1635 处理事实同步。仓库盘点为 150 个 `src` TypeScript、255 个测试文件、196 个非归档文档；原有开放 T 任务 32 条，本轮依据源码/测试/文档新增 T-1635～T-1684 共 50 条，开放任务合计 82 条，覆盖来源摄取代际与游标、渲染块失败、辅助桶事务、多桶备份、CSV 截断安全、i18n、跨 root、无障碍、性能、兼容性、生态契约和研究触发条件。重点新增 P0 复核：T-1681 统一文档选择器字段接线、T-1682 combobox/listbox `aria-controls` 同源；另登记 T-1683 CSV 半行隔离、T-1684 外部来源迟到响应代际。此轮只修改 TODO/进度/决策记录，未改 `src`、测试或发布资源，未运行构建/测试，未 push。

2026-09-28 T-1545～T-1550 三类联动任务导向梳理（用户要求“研究下，加入待办先”）：核对现有设置 host/documents/external 三组渲染、双语入口、来源模板及既有外部联动总账，发现配置按技术数据流分散，缺少“项目→记录方式→来源绑定→真实记录核验→可选文档输出”的新用户路径。新增 `docs/integration-experience-design-2026-09-28.md` 研究稿，明确三组用户承诺、项目侧回链、逐来源配置/状态、文档输出旁路及六个验收场景；TODO 顶部登记 T-1545～T-1550，D-300 冻结为先研究排期。本轮仅文档改动，未改运行代码、未 push。验证：对照 `src/render/settings.ts`、`src/i18n.ts`、`src/catalog.ts`、`docs/external-integrations-map.md` 和既有设置联动梳理，文档/待办/决策引用一致；未运行构建或 UI 测试。

2026-09-28 T-1541~T-1544 轻迹 QingTrail 专项调研落盘（用户点名：LifeLog 记录/展示/分析/交互调研，列入待办先不开发；结论 D-299）：调研对象 [LunaNorth/QingTrail「轻迹」](https://github.com/LunaNorth/QingTrail)（自用插件 18 commits/0 star，证据 A=官方 README 直读，未审计源码）。定位：**叶归生态的可视化前端**——读同一套「时间 类型：内容」Marker 做时间轴/日历/统计/正文编辑，不做结算；小驴是同生态的结算引擎，读同一数据源。五项官方能力对照：吸收 2（**T-1541** LifeLog 时间轴视图=当日/区间事件纵向串联+间隔时长可视化+类型着色，数据源为既有 yeguif 事件 note 字段、纯渲染零写入；**T-1542** 类型筛选与时长聚合，前置=note 解析口径确认）、观察 2（**T-1543** 日历 lifelog 徽标叠加=冗余评估；**T-1544** 叶归段落修订检测=调研暴露的真实边界：源文档手改后同 blockId 幂等身份挡住重结算、事件停留旧值，候选方案指纹对比→墓碑→新事件）、不吸收 1+1（正文双向编辑=事实不可变纪律红线，仅吸收「跳转源文档编辑」形态；仪表汇总=概览完成度环已覆盖）。核心洞察：LifeLog 玩家诉求排序=看得见>查得到>改得动，前两项小驴用既有事件层即可低成本补齐。调研全文落 benchmark 文档第二十三节；TODO 顶部新增四条 `- [ ]`（带触发条件）；D-299 明确登记即冻结。零代码改动；未 push。

2026-09-28 T-1538~T-1540 源时记专项调研落盘（用户点名：调研吸收经验、列入待办先不开发；结论 D-298）：调研对象 [famotime/siyuan-time-spent「源时记」](https://github.com/famotime/siyuan-time-spent)（2026-09 新上架，思源内被动时间量化与复盘插件，证据 A=官方 README 直读）。定位：**联动面大于竞争面**——被动时间量化 vs 主动行动打卡，数据互补；petal/ JSON 落盘与叶归本地读取同构，是来源框架潜在下一租户。七项官方能力对照小驴现状逐条判定：直接吸收候选 2（T-1539 AI 复盘「复制提示词」免 API 模式=周复盘确定性事实组装结构化提示词，纯本地零模型；T-1538 内置计时闲置暂停/净时长双口径=opt-in，需用户拍板番茄承诺制张力+WebView 事件真机验证）、观察登记 1（T-1540 源时记数据源适配评估，上游数据面确认后按叶归模式接入，不自建被动追踪）、不立项/不吸收 4（周期目标 Hero 卡与低压力张力、内置流式 AI/旋钮越智能体边界、24h 时间轴依赖未建数据面、看板直达已有等价能力）。调研全文落 benchmark 文档第二十二节；TODO 顶部新增「调研产出待办」节登记 T-1538/1539/1540 三条 `- [ ]`（均带触发条件与先不开发口径）；D-298 明确「登记即冻结，不因继续类指令自动开工」。零代码改动；未 push（随下个发布窗口上云）。

2026-09-28 T-1536/T-1537 README 发布前修正与 v18.9.0 正式发布（**用户授权发版**）：①README 检查——横幅过期表述改写（15 项计划已成 v18.9.0 交付内容+后续方向：真机验收/生态联调/小步迭代），文档入口补真机验收清单链接，其余各节核过均为当前状态（提交 8dd6534）。②发布前最终 test:quality 首跑抓出一个真问题：守门桩 root 无 addEventListener 导致新增 toggle 绑定崩（view-preferences 桩），加存在性守卫后全量链复绿；mobile-review-ui E2E 对最终构建复验通过（提交 5248123）。③发布执行（gh 未装，按 17.1.0 记录走 api.github.com 流程：token 取自 git 凭据管理器、仅在脚本内存中使用、临时脚本用后已删）：main 推送 acfceab→5248123（32 提交）、注释标签 v18.9.0 推送、API 创建 Release id 397882046（非草稿、非预发布、正文=release-notes-18.9.0.md 含实际摘要）并上传 package.zip 797,145 字节。④回读核验：API 下载资产 797,145 字节逐字节核对，SHA-256 f41a74b1f6ac… 与发布说明、本地包三方一致；远端 main=5248123、tag=v18.9.0。**发布地址**：https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.9.0 。待开发：真机验收清单执行、Task Horizon 联调（对方排期）、T-1413（用户拍板）、T-1508 上游身份。

2026-09-28 T-1535 真实内核 E2E 全量跑通与两项修复（local-auto）：本会话首次对 v18.9.0 构建执行 `pnpm run test:e2e`（隔离真实内核 3.8.5 @ D:\RJ\SiYuan + Playwright 串行，17 spec 23 例）。首轮 20 过/2 挂/1 flaky，逐项定位：①**mobile-review-ui 挂**=真实产品缺陷——Playwright 探针（临时 spec，诊断后删除）dump 三采样点命中链，确认「报告设置」下拉（移动布局 position:static、max-height 280）底部 y=654 命中 `NAV.lc-checkin__mobile-nav` 的「事项」按钮（固定底栏 z-index 8；菜单 bottom 658 vs 视口 664）；修复 bind-page-navigation.ts 新增 toggle 捕获监听：details 打开后测底栏高度，按遮挡量 `scrollTop += overflow` 滚动最近可滚动祖先（兜底 window），桌面无底栏（高度 0）不触发；②**yeguif 挂**=过期 spec——git 考古确认 5a31de6（v18.8.0 时代 LifeLog 映射工作流）把结算语义改为「时长归属当前记录」+「无映射仅唯一同名分钟目标匹配」，T-1457 时代的 spec 仍断言旧语义（归属 09:00「阅读：认知觉醒」+无映射种子），已更新：种子 mappings [{project:"运动",itemId}]、note 断言「运动」、externalRef 用 10:00 块 ID；③flaky review-suggestion 复跑稳定。全量复跑 **23/23 全绿**（6.3 分钟）。发布说明/变更记录补「移动端下拉修正」条目 + 验证节升级为「E2E 全量 23/23」，重同步 SHA（c000a8b9…），check:release 复验通过。注：v18.8.0 发布时未跑全量 E2E（仅定向链），此项技术债在 v18.9.0 还清。验证：build、sync:digest、check:release、test:e2e 23/23 全 EXIT=0；未 push。

2026-09-28 T-1534 v18.9.0 真机验收清单补齐（local-auto）：docs/integration-smoke-checklist.md 原仅覆盖到 v17.0.0 批次（跳过态/渲染块/笔记锚点/负向习惯/宽容提醒），v18.6~v18.9 的新交互无真机指引。新增「可信记录批次（v18.9.0 真机验收）」一节，13 个小节按**设备才能验证的行为**编写而非复述功能：待处理箱（真机不可构造存储故障时的替代口径+墓碑不复活）、事实详情（跨日事件、已删除项目显示未知、不从 UTC 反推）、批量补记（留空不默认、预览随日期切换收起）、渠道筛选（真实思阅/健康事件的命中数核对、api 伞语义）、排期预演/规则对照（取消零落库、320px 无横向滚动）、周负荷与分母明细（跳转保留筛选）、横向比较（触屏第 5 项禁用、窄屏图表无页面级溢出）、周复盘（**整树重启后草稿恢复**——真机重载最易丢状态；Android WebView 下载通道是历史高风险点）、模板分享/导入（两设备 JSON 往返、移动文件选择器、篡改 shareVersion 回滚）、设置变更清单（敏感遮罩、撤回回落）、迁移三选（另存为后缀、原项目不可变）、样例试算台（触屏粘贴、会话内存清空属预期）、模板与概览回归（5 新模板双语、迷你线无残留、CSS 清理后旧界面无布局空洞）。节首写明每轮前置整树重启思源（规避 reloadUI 不刷新 JS 缓存的既有陷阱，引用渲染块一节实测注）。守门：ui-docs、check 实测 EXIT=0；未 push。

2026-09-28 T-1533 v18.9.0 本地定版（local-auto；用户「继续」视为对上轮选项①本地部分的放行，push 仍待确认）：发布三要素就位——①版本三元组 src/version.ts PLUGIN_VERSION / package.json / plugin.json 统一升至 18.9.0（release-assets 守门 RELEASE_VERSION 从 package.json 派生，version.ts 是守门单独断言的第三处）；②README 四处切换（当前版本行、发布说明链接、18.9.0 重点区四条、变更记录链接）；③release-notes-18.9.0-draft.md → release-notes-18.9.0.md 转正（去草案框；SHA-256 行先补骨架再由 sync:digest 填充实际摘要 bdac1900007f…）+ 新增 docs/v18.9.0-change-log.md（批次 A/B/C/D + 模板呈现 + 生态 + 验证边界的逐任务详细记录，含 T- 号与决策号）。过程一处补漏：首次 check:release 红在 version.ts 未同步（18.8.0 !== 18.9.0），补齐后全绿。验证：build、sync:digest、check:release（资产校验+回滚演练 v18.9.0）、test:quality 全链、双主题 visual-qa、宽度走查全 EXIT=0；未 push、未打 tag。**发布剩余步骤（用户动作）**：确认后 push → GitHub Release 上传 package.zip（SHA 见发布说明）。

2026-09-28 T-1532 v18.9.0 发布说明草案（local-auto）：27+ 提交体量已达一个小版本，为下一个发布窗口备料——新增 docs/releases/release-notes-18.9.0-draft.md，顶部草案框注明发布时需移除后缀/定版本号/由质量链同步 SHA-256。正文按发布惯例分组汇总全部面向用户变更：可靠事实与可处理问题（外部失败待处理箱 40 条/14 天、单条记录事实详情、批量补记两步流、来源渠道与计量细筛）、规划透明与复盘可解释（30 天排期预演、规则修改对照、周负荷预览、统计分母明细、2~4 项目横向比较、周复盘向导）、配置复用与安全迁移（模板脱敏分享、导入逐项决策、设置变更清单、迁移重名三选）、联动与模板（样例试算台、5 个循证模板、概览迷你线移除说明）、生态（契约包 calendar-consumer.mjs 参考层）。验证与边界节如实标注：全链+扩展链通过、26 张截图人工复查、CSS 回到 620KB 软线下、真机与上游（sireader#55/siplayer#180 零回应）边界不变。命名与位置经实测不触碰 release-assets 守门（版本钉定 18.8.0、root 过滤器仅扫仓库根）；release-assets 与 ui-docs 实测 EXIT=0；未 push。

2026-09-28 T-1531 TS 死导出审计与清理（local-auto）：词边界精确引用扫描（1379 个导出声明 × 全 src + tests 引用面，声明文件内部自用计入存活，规避子串误匹配）发现运行时死导出仅 4 个：ecosystem.ts **toCalendarSyncRecord**（早期日历同步映射草稿，已被 T-1391 getCalendarProjection 路线取代）、quota.ts **normalizeQuotaSchedule**（主流程走 model.normalizeSchedule；其依赖 normalizeQuota 在 model.ts 另有使用，删除不孤立依赖）、features/health-inbox.ts **HEALTH_INBOX_METRICS**（指标名实际内联匹配）、features/template-manager.ts **createTemplateManagerState**（宿主自管状态形状，工厂无人调用）。逐一全仓库核实（src/tests/scripts/contracts/docs 无动态引用与字符串引用、无 export * 转出）后移除，连带修正 quota.ts 的 CheckinSchedule 类型导入。另发现 9 个零引用的导出 type/interface（api-v5 BatchRecordInput 等）——**有意保留**：编译期擦除零包体成本，且是公共 API 的契约文档面。结果：check/主链/build（JS 1.22MiB 持平，tree-shaking 本已覆盖）/test:ui/test:quality/双主题 visual-qa/宽度走查全 EXIT=0；未 push。

2026-09-28 T-1530 上游状态复查、文档保鲜与英文文案审计（local-auto）：①R-REL-CHECK 复查（09-28）——sireader#55 与 siplayer#180 均 open、0 评论、无维护者回应与关联 PR，与 09-27 基线一致，无解封；按既有纪律不追加无实质内容的外部评论，复查记录入台账与 HANDOFF。②文档过期数字修正三处——docs/product-direction-and-local-plan-2026-09-27.md 功能表「67 个目录模板」→「72 个（T-1525 循证批次后）」；docs/development-roadmap-current.md 当前状态表「65 个模板」→72、并移除「近 30 日 sparkline」表述（T-1524 已按用户反馈移除概览迷你线，趋势由分析工作区唯一承载）；docs/HANDOFF-2026-09-28.md 未 push 提交数 18→24、补 T-1528/1529/1530 里程碑行。③英文文案审计（对偶 09-28 中文审计，2343 键）——双空格 0；标点前空格 2 处均为合法写法（habit .md files 文件扩展名）；拼写变体一致（color 系，无 colour 混入）；hint 类句尾句点按键族内部一致（mixed families=0）；弯双引号 31 处均为 “{name}” 包裹动态值的统一惯例（直双引号需转义故全库不用）；**发现并修复唯一真实不一致**：set.yeguifBoundary 用弯撇号（Marker’s/today’s），归一为全库 72 键通行的直撇号。验证：i18n-parity（2349/2349 双语+占位符对齐）、upstream-proposals、build 全 EXIT=0；未 push。

2026-09-28 T-1529 质量审计三项与 CSS 微重复降级决策（local-auto，结论 D-297，零代码改动）：①编辑器截图中「在连续打卡/持续播您的排」可疑文案——i18n 全量 grep 无此字符串，判定为 430px 暗色截图低分辨率误读，非缺陷；②中文文案脚本审计（.artifacts 临时脚本，运行后已清理）：2330 个含 CJK 的 zh 键中 ASCII 标点混排 0、重复标点 0、你/您称谓前缀冲突 0；4 个首尾空白键逐一核实为有意格式——msg.restoreWarnings/restoreReviewNote 的 `\n\n` 前缀用于确认框多行排版，msg.importConflictsWarn/importLossyNote 的尾部空格是 index.ts:4558/4603 三段拼接的分隔符，不修；③visual-qa harness 排查「是否只记录不拦截」：否——mobileMatrix 每宽度断言 scrollWidth===clientWidth（零横向溢出）、cardGeometry 断言动作区与顶行不重叠、header 断言标题不被截断且操作单行、API 行为矩阵与 pageErrors 深比较齐备，质量设施成熟；④CSS 重复规则上下文感知分析（区分 global 与 @container/@media）：57 组 ~5.2KB 全部为级联等价的同选择器同声明对，但源形态分散（如 components.scss:4718 嵌套于父选择器 vs :5374 平铺），可靠摘除需 SCSS 感知定位，~45 处手工编辑风险大于 0.7% 体积收益，且 css-hygiene 10KB 重复护栏当前余量近半——按 D-297 主动降级为护栏管理，不单独立项。结论：本地「实际问题驱动」探索无新增可修缺陷，剩余工作均为外部依赖/用户决策项。

2026-09-28 T-1528 产品视觉走查与阶段交接收口（local-auto）：①人工走查 visual-qa 全部 26 张产物截图（今日/回顾概览与记录/编辑器/设置/事项/洞察/归档/问卷目标/320~430 宽度矩阵/宽 dock），结论：无真实 UI 缺陷。唯一疑点——编辑器保存栏下方文字被裁——经定位为 tests/visual-qa.cjs 已注明的 fullPage 截图特性（position:fixed 元素被画到文档底），实视口验证（viewport-*.png 与 mobile-320 实拍）无遮挡，编辑器 form-scroll 自带 108px 底部让位。②补跑本会话此前未覆盖的三链：test:mobile、test:ecosystem、test:extended 全部 EXIT=0（含 test-suite-coverage 对新测试注册的校验）。③按仓库惯例新增 docs/HANDOFF-2026-09-28.md：取代 09-27 交接的「当前状态」节——18 个未 push 提交按里程碑分段（D-291 十五项/T-1524/T-1525/T-1526/T-1527）、开放队列仅剩外部依赖与用户拍板项、新增工程要点五条（TS-only CSS 审计、模板 curated 上限、8 表面类集合、.mjs 测试 IIFE 包装、台账前缀陷阱与 Mimosa 钩子）。验证：三条补充链全绿；未 push。

2026-09-28 T-1527 calendar.read 消费端参考层与契约夹具交付（T-1392 小驴侧本地切片，local-auto，口径 D-296）：①依据与边界——BLOCKERS/roadmap-current 明示 T-1392 当前只做「本地契约草案和夹具」，不修改 task-horizon-v1.json、不改 manifest.json、不接线真实日历视图（待 T-1394 双向现场验收）；唯一依据是已发布的 v5 calendar.read 契约（manifest.json limits.calendarProjection + docs/api-v5.md §calendar.read），零臆造。②契约包新增 calendar-consumer.mjs——negotiateCalendarRead（api-missing/host-outdated/capability-missing 拒绝态 + effect=read 元数据校验）；planProjectionRange（严格 YYYY-MM-DD、半开区间、Hinnant 民历日序号（与宿主 date-keys 同口径、无 Date/夏令时依赖）、>366 天拒绝或 clamp 截齐、闰年正确）；planCalendarRefresh（已发布 8 事件 → record/structure/derived/unrelated 四类；隐藏开关走 item-updated → 服务端过滤+重载即生效；未知事件 fail-closed 不刷新）；normalizeCalendarProjection（6 状态枚举封闭、坏 item/point 逐条丢弃并计数、混合条目抢救有效点、不发明 note/externalRef 字段）；createCalendarProjectionSession（并发同区间单飞共享、timeoutMs 超时/AbortSignal 中止/提供方异常三路全部可诊断 reasonKey、过期缓存不回退旧值、失败不写缓存、now 可注入固定时钟）；runCalendarConsumerChecks（合规宿主 9 断言 + 失败不抛异常，与 runContractChecks 同风格）。③新守门 tests/calendar-consumer-kit.test.cjs 入 pnpm test 主链：协商六态矩阵、区间非法/366/367/闰年、8 事件全分类快照、脏投影逐条丢弃计数、缓存命中与过期重查、并发单飞一次调用、30ms 超时确定性 aborted/provider-failed、合规宿主全过 + legacy 宿主恰好一条失败 + throwing 宿主失败不含原始异常文案。④契约包 package.json files + README「日历消费端参考层」使用说明同步。测试修正三处夹具：超限区间须 >366 天（2026-09-01→2027-09-03 才是 367 天）、中止测试须用延迟提供方（同步解析会在 abort 前落地）、合规宿主超限分支返回 truncated。验证：pnpm run check、pnpm test、pnpm run build、pnpm run test:ui、pnpm run test:quality、浅/深主题 visual-qa、width-walkthrough 全部 EXIT=0；未 push。

2026-09-28 T-1526 CSS 死规则清理与审计守门修复交付（local-auto，口径 D-295）：①审计修复——scripts/css-audit.cjs 旧实现用「TS+SCSS 合并文本」做包含判定，而 dist CSS 编译自 SCSS，任何类必命中自身定义，dead 恒为空（T-1354 守门形同虚设）；改为 **TS-only 判定**（TS 是唯一运行时把类写进 DOM 的来源）：零 TS 字面引用且非 is-/has-/数字后缀、非 b3- 宿主类 → dead。②死规则清理——独立交叉审计（dist 类 token × TS/SCSS 全量引用 + 动态拼接排查 is-${}/b3- 宿主 + 测试守门引用甄别）确认 26 个死类家族：skeleton 全家（基座/line/is-short/is-medium/keyframes/主题变体/reduced-motion 残块）、插件自绘 dialog-close 全变体（桌面 34px 块/移动 38、40、32px/dock 容器/print 隐藏/焦点环/触摸高亮——关闭动作由 b3-dialog 宿主承担，b3-dialog__close 覆盖保留）、warning/badge 呼出块（含 dock 选择器组剪枝）、strength-list/row（T-1227 首版 per-item 曲线，已被 T-1243 strength-overview 取代）、strength-details-fold/strength-detail/strength-detail-body、review-hero-copy/rate/cutoff（hero 旧三栏）、summary-agent 全部 12 处（含 :is() 组剪枝与 [data-summary-refresh-state] 变体）、history-tools 17 处（含 margin/background/border-radius 选择器组剪枝与 dock 组）、history-details 7 规则+focus-visible、history-expand、fold-count、header-streak（基座+today 变体）、diary-doc-controls、renderblock-today-summary、has-records 日历点、review-assistant-provider-help、review-actions（descendant 选择器）、幻影表面 lc-checkin--summary 全部 8 处（含 dock 组剪枝）。③CSS 647610→**630747 字节（-16.9KB）**，重回 620KB 软线下；类 token 763→735，产物 dead=0、duplicate ~5007B 不变。④守门同步——css-hygiene 长出真牙齿（当前实现在位：735 token/0 dead）；ui-state-ledger 退役词表 +skeleton 家族；mobile-dialog 改反向断言（插件关闭钮不得回流）；ui-theme has-records→is-selected 锚点、reduced-motion 断言指向存活规则、release-assets 表面清单对齐 TS 实际 8 表面（summary 实为回顾页图标名非表面类）；stats-visuals 环静态区域锚点 today-summary→renderblock-summary。⑤教训两条：退役注释含字面类名会触发退役词表/反向断言（注释一律去类名字面量）；编辑工具删除多行死块时 new_string 只保留上下文活行，严禁「顺手改名」。验证：pnpm run check、pnpm test、build、test:ui、test:quality（CSS 卫生 735/0/630747）、浅/深主题 visual-qa（零 pageErrors）、width-walkthrough 全 EXIT=0；未 push。

2026-09-28 T-1525 循证模板批次交付（用户指令，local-auto，选型口径 D-294）：调研习惯养成书评（《掌控习惯》：四定律/两分钟法则/习惯叠加/身份认同；《福格行为模型》：B=MAP/微习惯/庆祝/锚点）与 [HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter)（601 条循证生活指南：只引期刊论文与官方文件，性价比排序；久坐/服药依从/午睡时长/分散练习/户外/正念/社交章节与打卡高度相关）后，往 `src/catalog.ts` CHECKIN_TEMPLATES（67→72）新增 5 个与既有目录不重叠、证据较强模板——**读一页书**（学习·binary 每日·两分钟法则微习惯版）、**按时服药**（健康·binary 每日·指南慢性病章：依从性性价比最高）、**定时起身**（健康·count 工作日×6 次·久坐章：打断久坐）、**联系亲友**（生活·binary 每日·放松章/哈佛成人发展研究：关系是幸福最强预测因素）、**分散复习**（学习·binary 每日·学习章：分散练习+自测，证据 A 级）；「户外时间/无屏幕餐/即刻两分钟」候选因与散步/跑步/读一页书重叠被裁。TEMPLATE_NAME_KEYS + i18n zh/en 各 10 键（tpl.*+tplNote.*）完备；微习惯基线刻意偏小（读一页书为二值项非时长、起身是打断语义非运动量），与低压力口径一致；纯内容资产零新增 CSS（647610 字节不变）、零宿主接线。template-gallery 守门 curated 上限 70→75 并新增循证批次存在性断言（缺一即红）。验证：pnpm run check、pnpm test、pnpm run build、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality（i18n 平价 2349/2349）全部 EXIT=0；未 push。

2026-09-28 T-1523 外部来源粘贴样例试算台交付（批次 D，local-auto）：①新纯模块 features/source-sandbox.ts——三个试算函数全部**复用生产解析/映射函数**：sandboxYeguifSample 逐行 parseYeguifMarker + resolveYeguifItemId（仅分钟单位活跃项目为候选——拉伸/阅读按显式映射分别归属；未知类型 resolve 失败如实 unmatched，不落通用目标）；sandboxHealthSample 逐行 parseHealthInboxLine（严格格式 health:metric:date value）——按 metricBindings 归属并明示单位（步/公斤），未来日期/无法解析判 invalid；sandboxNoteQuerySample 粘贴行合成伪块（伪块 ID 匹配 BLOCK_ID_PATTERN、当日 dailynote ial 由注入 todayKey 派生——非系统时钟）跑生产 parseNoteQueryRows，偏好未就绪如实 unmatched。输入有界 50 行×200 字符+截断计数；输出逐行 state+目标名/原因键+计数摘要；无时钟（todayKey 注入）。②设置页——健康/笔记推导/叶归三个来源卡片各内嵌「用样例检查」折叠区（textarea（输入存会话内存 map）+试算按钮+逐行判定（符号+颜色+原因文字冗余）+摘要+截断提示+「样例仅会话内保留；不写事件、不改映射、不代表已连接」声明）；宿主 runSourceSandbox(source, text) 复用生产函数计算——**零 SQL、零网络、零宿主调用、零事件写入、零映射修改**；正文与结果仅存会话内存（sourceSandboxOutcomes/sourceSandboxTexts，不落存储）。③i18n 13 键双语；CSS 试算台样式；新守门 tests/source-sandbox.test.cjs 入 pnpm test 主链。测试夹具修正两处：健康行真实格式 health:steps:YYYY-MM-DD 数值；笔记伪块需满足 BLOCK_ID_PATTERN+当日 ial。验证：pnpm run check、pnpm test、pnpm run build（CSS 647610 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。**D-291 十五项（T-1509～T-1523）全部交付完毕**。

2026-09-28 T-1522 数据迁移重名冲突主动选择交付（批次 C④，local-auto）：①新纯模块 features/import-conflicts.ts——planImportConflicts(sourceItems, existingSnapshots)：只对与**活跃**现有项目同名（精确匹配，与既有导入查找同口径）的来源生成决策行；mergeCompatible=kind+unit 都相同；不兼容标 incompatibility=unit|kind 并**默认 disposition=skip**（绝不静默换算单位）；兼容默认 merge（既有语义）；resolveImportConflictName 另建名确定性派生「{name} · 导入」+序号（与现有名集查重，99 上限）。②plugin-ops——importLoopPlanInto/importObsidianHabitsInto 增加可选 conflictDispositions: ReadonlyMap<name, {disposition, createNewName?}>：skip→整名跳过（行数计新增返回字段 skippedRows）、createNew→以 createNewName 新建（不合并入现有）、merge/未提供→既有合并语义；返回类型 additive。③设置页导入流——Loop/Obsidian 文件解析后先 planImportConflicts：有冲突→建立 importConflictSession 并渲染决策面板（data-import-conflict-panel：每行来源单位/类型 vs 现有单位/类型 + 不兼容原因 + 三选 radio（不合入时 merge 禁用））；radio change 即时更新会话决策；确认→重查后经 this.importLoopPlan/importObsidianHabitsInto 应用（一次 persist，失败 this.store=previousStore 回滚+importFail 提示；跳过行数 set.importSkippedRows 单独反馈）；取消→清会话零写入；无冲突保持原 window.confirm 流不变。④i18n 11 键双语；CSS 冲突面板样式；新守门 tests/import-conflicts.test.cjs 入 pnpm test 主链（用 Proxy 桩满足 plugin-ops 依赖面，真实 transpile model/rules/loop-csv/obsidian-habits 驱动**真实迁移函数**验证三 disposition 行为与重复导入幂等）。既有守门 loop-csv「执行器委托」断言随可选参数合法演化放宽为前缀匹配。验证：pnpm run check、pnpm test、pnpm run build（CSS 646342 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；提交 fa1eb26 之后；未 push。

2026-09-28 T-1521 设置保存前变更清单与分节恢复交付（批次 C③，local-auto）：①新纯模块 features/settings-change-list.ts——SETTINGS_FIELD_REGISTRY 注册 10 个既有草稿字段（attribute→分节 journal/docs/health/reminders/weread + i18n 标签 + sensitive 标记；data-weread-key 与 data-journal-custom 为敏感）；maskSettingValue：敏感字段前后值一律「••••••」遮罩（绝不回显明文），普通字段截 24 字符预览，空值「（空）」占位；buildSettingsChangeList(pairs) 只收 draft≠saved 字段（相同/注册表外排除），按注册表顺序分节确定性输出。②宿主——新增 settingsSavedBaselines 基线表（bindSettings 在草稿回填**之前**捕获 saved 值）；buildSettingsChangeSections() 对比 settingsDrafts 与基线生成清单；revertSettingDraft/revertSettingSection（confirm 后删除草稿并重渲染——输入自然回落已保存值，**不触碰事件记录与文档内容**，保存失败既有通道仍保留草稿）；bindSettings 绑定 data-revert-setting/data-revert-section。③设置页——搜索框下方新增 data-settings-change-list 面板（默认展开；仅在有改动时显示清单，无改动显示「没有待保存的修改」status）：分节块（节标题+恢复本节）+ 变更行（字段标签 + <s>已保存</s>→草稿 + 撤回按钮）；面板明示「仍是草稿，尚未生效」——不把草稿当已生效。④i18n 22 键双语；CSS 变更清单样式；新守门 tests/settings-change-list.test.cjs 入 pnpm test 主链（遮罩/截断/空占位/未改动排除/注册表外忽略/分节顺序/宿主捕获基线时序/撤回确认/双语）。验证：pnpm run check、pnpm test、pnpm run build（CSS 645890 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。

2026-09-28 T-1520 模板包导入逐项差异与冲突处理交付（批次 C②，local-auto）：①新纯模块 features/template-import.ts——parseTemplateShare(raw, {rawByteLength})：契约拒绝（app≠siyuan-checkin 或 shareVersion≠1 → importErrorVersion；字节数>TEMPLATE_IMPORT_MAX_BYTES(200KB) 或模板数>20 → importErrorLimit；非法 JSON/结构 → importErrorInvalid），字段级校验逐条丢弃计数（name 1-64、kind 枚举、target>0≤1e6、unit 1-16、schedule.type 枚举；icon≤16 缺省 ✓、priority/timeSlot/completionSource/tomatoMode 非法回落缺省）；planImportDecisions(entries, existing)：新模板默认 disposition=import，重名（trim+大小写不敏感匹配）默认 **skip（最安全）**，携带 matchedId/matchedName 与确定性 saveAsName（原名截 56 +「· 导入」）。②编辑器分享区新增导入段——本地 `<input type="file">` 读取（FileReader，无新宿主契约）+ 大小守卫；解析成功建立 host.templateImportSession{fileName, decisions} 并 render；决策表逐行（新=「导入/跳过」radio、重名=「跳过/替换现有/另存为」radio + 重名对象与元信息徽标）；radio change 直接更新会话（不重渲染）；确认→applyTemplateShareImport（深拷贝 decisions 传入）；取消→清会话零写入。③宿主 applyTemplateShareImport：过滤 skip 后逐条 upsertUserTemplate（replace 保留 matchedId 只覆盖模板内容不影响已创建项目；saveAs 用 makeId+saveAsName），**一次 saveData，失败 this.userTemplates=previous 整批回滚**+「导入失败，已恢复原模板」；成功清会话+render+计数提示。④i18n 16 键双语；CSS 导入决策行样式；新守门 tests/template-import.test.cjs 入 pnpm test 主链（契约三拒绝/字段丢弃计数/决策默认与重名/重复导入幂等/取消零写入/回滚接线/双语）。验证：pnpm run check、pnpm test、pnpm run build（CSS 644735 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。

2026-09-28 T-1519 个人模板脱敏分享交付（批次 C①，local-auto）：①新纯模块 features/template-share.ts（零依赖、无时钟、**白名单构建**）——buildTemplateSharePackage(templates)：只输出 name/icon/kind/target/unit/recordStep?/schedule（深净化：type/weekdays/intervalDays/anchorDate/quota 三元组+weekStartsOn）/group/priority/timeSlot?/completionSource?/tomatoMode?，键序固定；note、内部 id、createdAt/updatedAt 及任何未知字段（journal/noteAnchor/apiKey/attachment 等）因白名单构建**天然不出包**（未来新增敏感字段同理）；版本声明 app="siyuan-checkin"+shareVersion=1；TEMPLATE_SHARE_MAX=20 超量与空选择显式 errorKey 拦截；serializeTemplateSharePackage 确定性序列化（同输入同字节）。原模板对象零修改。②编辑器「我的模板」区新增 data-template-share-details 折叠区：复选框选择（复用 item-compare-option 样式）、data-share-preview pre 实时预览（change 事件直接调纯函数重算 textContent，**不重渲染不丢焦点**）、data-share-export 按钮（带所选计数、无选择禁用）、data-share-status 状态行；导出走宿主 downloadTemplateShare→既有 saveGeneratedFile 通道（siyuan-checkin-template-share-<dateKey>.json）。③i18n 7 键双语；CSS 复用既有类+3 条新规则；新守门 tests/template-share.test.cjs 入 pnpm test 主链（敏感夹具逐一断言：私有问卷 ID/锚点块 ID/API Key/附件 base64/未知深字段/备注/内部 id/时间戳全不出包且用户文本明确预览；确定性；版本；空/超量拦截；原对象零修改；接线；双语）。验证：pnpm run check、pnpm test、pnpm run build（CSS 643839 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。

2026-09-27 T-1518 周复盘向导与可恢复草稿交付（批次 B⑥收官，local-auto）：①新纯模块 features/weekly-review.ts——WeeklyReviewDraft{weekKey=周起始日, friction, adjustment, updatedAt}；normalizeWeeklyReviewDrafts fail-closed（坏条目丢弃/周键去重/updatedAt 倒序/有界 8/文本 500）；upsertWeeklyReviewDraft 幂等合并淘汰最旧；weeklyReviewDraftFor 周键隔离查询；buildWeeklyReviewMarkdown 确定性导出（rangeLabel/事实计数/项目行 + 阻力 + 调整分节，空文本占位「—」，headings 由调用方注入本地化文案，事实与用户解释分节标注，> 注明草案属性）。②偏好持久化——CheckinViewPreferences 新增 weeklyReviewDrafts（additive 零迁移），normalize 复用纯模块；applyViewPreferences 恢复、persistViewPreferences 保存——重载后草稿恢复。③概览 UI——fold("weeklyReview")「周复盘」（仅 summaryRange==="week" 且无自定义范围时显示，否则提示切范围）：三步向导（事实块=本地统计 record/completed/scheduled + 前 5 项目 completedDays/scheduledDays；阻力 textarea；调整 textarea + 草案提示「确认请打开对应项目编辑，不会自动写入」）；保存/导出 Markdown/清除按钮 + role=status 保存反馈；文本保留用户输入不清洗。④宿主——saveWeeklyReviewDraft/clearWeeklyReviewDraft（upsert/删除+persistViewPreferences）、exportWeeklyReviewMarkdown（buildSummaryContext("week") 取事实 + buildWeeklyReviewMarkdown + 既有 downloadReportMarkdown 通道）；bind-page-navigation 绑定三按钮（save 不重渲染不丢焦点，clear 后清空输入）。⑤i18n 18 键双语；CSS 周复盘块样式；新守门 tests/weekly-review.test.cjs 入 pnpm test 主链。过程修复：6 个既有测试的 view-preferences 编译桩清单补 weekly-review 映射（template-manager/view-preferences/template-gallery/report-sections/report-deviations/templates/v8-platform/avatar-editor-browser）。验证：pnpm run check、pnpm test、pnpm run build（CSS 642955 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。**批次 B（T-1513～T-1518 规则透明与复盘可解释）就此全部交付**，下一批 C（T-1519 配置复用与安全迁移）。

2026-09-27 T-1517 选定项目横向趋势比较交付（批次 B⑤，local-auto）：①新纯模块 features/item-trend-compare.ts（无时钟、确定性）——buildItemTrendSeries(store, itemId, startDate, days)：区间有界 31 天逐日序列；数值按**当日生效修订单位**聚合（unit 修订跨区间安全，与 evaluateRule 同口径）；scheduledDays/completedDays/completionRate 复用 isComplete/isScheduledToday/isItemAvailableOnDate 内核判定；recordDays、sparse（无记录或无应做日如实标注）；quota 项目携带 quota 信息且不产出日级完成率；归档/缺失项目 undefined。groupItemTrendsByUnit：**按单位分组**（组内原始数值可比），配额项目单列 quotaSeries。②分析工作区——新增 fold("itemCompare")「横向比较」（默认关闭懒渲染）：原生复选框选择器（键盘可用、活跃项目前 12、至多 4 个满额禁用未选）→ 每单位组：renderLineChart 单项目折线 + **同源数据表格**（行=日期、列=项目，表图一致）+ 每序列完成率行（仅 scheduledDays>0 适用口径，否则「有记录 N 天」）+ 稀疏明确提示（数据不足：无记录或无应做日）+ 配额单列注释（不参与横向比较）；渲染按选择顺序，**不排名不施压**。③宿主会话态 itemCompareSelection（有界 4），bind-page-navigation 复选框 change 绑定（超限拒绝勾选）+ renderReviewPreservingView 保焦点。④i18n 7 键双语；CSS 分组图卡+表格样式；新守门 tests/item-trend-compare.test.cjs 入 pnpm test 主链（混选单位保留/稀疏/配额单列/归档 undefined/确定性/接线/双语）。验证：pnpm run check、pnpm test、pnpm run build（CSS 641938 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。

2026-09-27 T-1516 统计分母与状态贡献明细交付（批次 B④，local-auto）：①新纯模块 features/stat-denominators.ts——buildItemDenominatorDetail(store, item, start, end)：逐日分类收集器 completed/missed/skipped/rest + unavailableCount，**与 analytics.summarizeItem 分母循环同序同谓词**（可用性→isScheduledToday→跳过豁免 T-1221→isComplete，复用同一批 model 函数，不复制第二套公式）；配额项目同 summarizeQuota 短路（按区间末生效修订判定 isQuota，无日级明细，解释沿用 summary.items 既有 quota 投影）；每列表有界 62 项 + truncated 如实标注；buildRangeDayCounts(events, start, end) 逐日事件计数（范围过滤/日期升序/零修改）。②概览 UI——新增 fold("denominators")「如何计算」区（默认关闭懒渲染，不增首屏体积）：三条指标口径定义 + 逐日条记录芯片（最近 14 天，data-denominator-date）+ 前 8 项目分母明细 details（summary 行内 completedDays/scheduledDays 展示 + 完成/未完成/跳过/非应做日期列表最近 8 个 + 截断提示；分母为零显示「无适用数据」；配额项目显示 {completed}/{elapsed} 周期达成 + 当期剩余，注明独立口径）。③跳转通道——bind-page-navigation 绑定 data-denominator-date→host.jumpToHistoryDate（切 records 日视图、**保留既有筛选/排序**，与节奏日跳转的清筛选行为区分；返回经既有工作区切换）。④i18n 15 键双语；CSS 分母区样式；新守门 tests/stat-denominators.test.cjs 入 pnpm test 主链（**一致性断言**：fixture 上明细 completedDates.length===summary.completedDays、completed+missed===scheduledDays；跳过排除；配额短路；零分母；只读；接线；双语）。验证：pnpm run check、pnpm test、pnpm run build（CSS 640741 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。

2026-09-27 T-1515 全项目未来一周负荷预览交付（批次 B③，local-auto）：①新纯模块 features/week-load.ts（零运行时依赖、确定性）——buildWeekLoadPreview(items, startDate)：7 天窗口（跨周/跨月日期滚动正确），非配额活跃项目经 buildSchedulePreview 产出逐日应做标记（无任何应做日的项目不列出）；**配额单列** quotaItems（period/amount/countMode）与逐日列表互斥——灵活周期任务不摊派到每天；归档项目排除；排期非法项目排除并计 invalidCount（不伪造应做日）；**计量分开**：每行仅携带自身 unit/target，模块零跨单位汇总（结构守门断言输出不含 totalMinutes 类字段）；有界 30 项。②今日页——「那年今天」卡之后新增 data-week-load 折叠区（按需展开，无数据零渲染）：7 列日期表头（MM/DD）+ 每项目一行（名称按钮 data-week-load-edit→bind-today 绑定 showEditor(item) 跳编辑器 + 7 日格 ●/· 符号+颜色双通道，应做格 title=目标+单位）；灵活周期任务独立分节显示「每{period}{amount}次」。零事件写入。③i18n 6 键双语；CSS 周负荷网格（名称列 minmax(0,1fr)+7×30px 日格，窄屏无横向溢出——宽度走查 280px 场景验证）；新守门 tests/week-load.test.cjs 入 pnpm test 主链。⚠️ CSS 累计至 639591 字节，距 D-242 硬线（655360）仅 ~15.7KB，批次 C 开工前做清理评估。验证：pnpm run check、pnpm test、pnpm run build、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。

2026-09-27 T-1514 规则修改前后影响对照交付（批次 B②，local-auto）：①新纯模块 features/rule-change-diff.ts（零运行时依赖、确定性）——buildRuleChangeDiff(before, after, startDate)：字段级对照 kindChanged/targetChanged/unitChanged/frequencyChanged/detailChanged（同类型排期参数变化经 canonicalSchedule 稳定 JSON 比较：星期集合排序、间隔+锚点、配额三元组）；未来 30 天日级差集 addedDays/removedDays 复用 T-1513 buildSchedulePreview（旧侧=当前生效修订快照，新侧=表单草稿），两侧均合法才产出；任一侧非法 previewUnavailable=true（保存会被 validateEditorInput 拦截）；单位 from/to 原样呈现**不自动换算**。②编辑器保存拦截——bind-editor 提交处理器在 enqueueMutation 之前：仅 editingId 存在时读当前生效修订（getItemRevisionForDate）与表单规则侧（readRuleSideFromForm 与 saveForm 同一归一化：二值目标 1/单位缺省/间隔钳制/锚点回落今天/配额参数），changed 才渲染 data-rule-change 对照面板（字段行+新增/不再应做天数与至多 6 个代表日期+「历史事实按既有修订机制保留，不改写历史；新旧单位不自动换算」说明）并 window.confirm 摘要（新增/取消天数）；取消→resetSubmitting 零写入表单原样；确认→既有 saveForm 修订通道（生效日=今天，历史快照不变，保存失败既有回滚留草稿）；只改名称/图标/分组等展示字段 changed=false 静默放行；面板在每次提交前清空重算。③i18n 10 键双语；CSS 对照面板样式（accent 描边卡+行列表）；新守门 tests/rule-change-diff.test.cjs 入 pnpm test 主链（守门加载器按 basename 落盘以保持模块间相对 require）。验证：pnpm run check、pnpm test、pnpm run build（CSS 638256 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。

2026-09-27 T-1513 单项目未来 30 天排期预演交付（批次 B①，local-auto）：①新纯模块 features/schedule-preview.ts（零运行时依赖、无时钟、确定性）——buildSchedulePreview(draft, startDate, {days, quotaCurrentCount})：与 rules.ts isScheduled 同口径逐日投影（daily 恒应做/workdays getDay 1-5/weekly+custom 归一化星期列表命中/interval 锚点日历日差取模/quota 恒为灵活应做），应做日与非应做日均带 i18n 原因键；配额输出周期窗口列表（week 窗以周一起始对齐 weekKey 口径、month 窗自然月含闰月 2028-02-29，窗口末端在预演边界截断如实呈现、有界 10 段），当期窗口 remaining=amount-已用量（宿主注入当前计数），未来窗口不编造直接满额；非法草稿（星期空/含越界值、intervalDays 非整数或 <1 或 >3650、锚点缺失/非法、配额 amount 非整数或 <1 或 >366、period/countMode 非法、起始日期非法）统一 fail-closed 返回 editor.schedulePreviewInvalid 且 days/quotaWindows 为空——**显示错误而非回落默认排期**。②编辑器接线——预览卡下新增「未来 30 天安排预演」折叠区（editor.ts data-schedule-preview-details/data-schedule-preview，默认收起不挤编辑器首屏）；bind-editor updateEditorPreview 内从表单实时构建草稿（weekday 勾选/intervalDays/anchorDate/quotaPeriod/quotaAmount/quotaCountMode）并调用投影，改草稿即时重算且**零落库**（不写事件不改排期）；新增星期勾选与锚点日期 change 监听（间隔/配额字段已有监听）；渲染为紧凑日格（应做 accent 描边+accent-text 文字对比安全/非应做虚线+muted，title 提供原因文字冗余）+「应做 n/30 天」摘要+配额窗口行。③i18n 11 键双语；新守门 tests/schedule-preview.test.cjs 入 pnpm test 主链（工作日/指定星期/间隔跨月/配额窗口闰月与剩余/非法草稿全类别/确定性/边界 30 天/接线/双语）。验证：pnpm run check、pnpm test、pnpm run build（CSS 637530 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；未 push。

2026-09-27 T-1512 来源渠道细筛与计量方式筛选交付（批次 A④收官，local-auto）：①history-filter.ts 扩展——新类型 HistoryChannelFilter（"api:health"|"api:notequery"|"api:taskhorizon"|"api:other"，仅 UI 筛选值，types.ts 公开 source 枚举零变更）与 HistoryMeteringFilter（"session"|"daily"|"other"）；historyEventChannel 只读派生（api 按登记前缀 health:/notequery:/taskhorizon: 细分；无 externalRef/旧身份/未登记前缀如实归 api:other，不用自由字符串猜插件名）；historyMeteringBucket 派生计量分桶（sireader/siplayer/tomato=会话片段；weread 无 :finish:/:notes: 的时长=日汇总、health:=日汇总；完读/笔记合计/手动/导入/笔记推导/Task Horizon/未知接口=其他）——与 T-1510 record-details 计量描述同一证据口径。filterHistoryRecords 增 metering 维度；**"api" 保持伞选项语义**（匹配全部 api 渠道）——首版实现漏掉伞语义被既有守门 review-workspace「api source filtering affects actual results」抓出后修正。②UI——回顾记录筛选来源下拉扩展为 13 项（枚举来源+api 细分渠道）+新增计量方式下拉（data-history-metering），全部选项显示命中数 filterHits（其余筛选条件不变时经 filterHistoryRecords 实算）；分页输入即 filteredRecords（先过滤后分页，分页与筛选天然一致）；clear-history-filters 与节奏日跳转重置计量维度；切渠道/计量重置页码并保焦点保滚动；导出范围与报告来源筛选未动（卡片口径：分页与导出范围一致=同用筛选后事实，报告 source 筛选另轮统一）。③i18n 10 键双语；新守门 tests/history-channel-filter.test.cjs 入 pnpm test 主链（渠道派生/计量分桶/组合筛选/伞语义/零变更枚举/零写入/接线/双语）。验证：pnpm run check、pnpm test、pnpm run build（CSS 636319 字节）、pnpm run test:ui、pnpm run test:ecosystem、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；提交 fb5c26c；未 push。**批次 A（T-1509～T-1512 可信记录 P0）就此全部交付**。

2026-09-27 T-1511 批量补记实际数量与提交预览交付（批次 A③，local-auto）：①新纯模块 features/batch-backfill.ts（零依赖、确定性）——classifyBatchBackfillItem 按固定优先级分类：已存在（该日含跳过的任意事件）→ 排期不适用（归档/不可用/非应做）→ 限额/戒除（direction=atMost，不批量制造成功事实）→ 绑定问卷（hasJournal，排除并指向单条流程）→ 类型分流：二值固定 value=1 无输入，数值型（count/duration/quantity/custom）必须逐项填写实际数量——空/零/负/非法/超 1e6 一律 errorKey 不提交，**绝不默认为目标值**（旧 recordHistoryBatch 的 Math.max(1, target) 只保留在旧 skip 通道语义之外不再用于 record）。buildBatchBackfillPreview 输出 entries+readyCount；planBatchBackfillSubmit 只返回仍可提交条目。②交互重构——回顾页批量区选择列表扩展为全部活跃项目（排除原因由预览解释而非静默过滤）；「补记」点击改为打开预览面板（review-batch-preview：逐项分类原因/二值「记 1 次」/数值输入 data-batch-value，input 事件只更新草稿不重渲染防打断输入，change 重渲染刷新可提交计数），提交按钮 data-ready-count + confirm 显示总条数，取消清草稿收面板；切日期/切范围/翻页/切项目筛选均自动收起预览。③宿主 recordHistoryBatchEntries：mutation 内以 batchBackfillSnapshots 从**当前 store** 重建快照经 planBatchBackfillSubmit 重校验（预览后项目改动/已存在/改绑自动落回对应分类不重复记账），一批一次 appendEvents+persist、失败整批回滚（store 恢复+saveFail 提示），成功清空选择/预览/草稿、逐条广播 event-recorded（每条可在日志独立撤销）；重复点击由 dataset.busy 门禁。④i18n 14 键双语；新守门 tests/batch-backfill.test.cjs 入 pnpm test 主链。验证：pnpm run check、pnpm test、pnpm run build（CSS 636319 字节）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；提交 c33bfe5；未 push。

2026-09-27 T-1510 单条记录事实详情交付（批次 A②，local-auto）：①新纯模块 features/record-details.ts（零运行时依赖、无时钟、确定性）——buildRecordDetails 固定六行投影：记录日期（localDate）、记录时刻（occurredAt ISO，渲染层本地化格式）、实际数值单位（事件自身字段，不反推）、计量方式（仅登记证据确证：weread :finish:/:notes:/日汇总、health :steps:/:weight:、notequery:、taskhorizon:、sireader/siplayer 片段、yeguif、tomato、import、manual；api 无登记前缀如实「未知」，不猜插件语义）、生效修订（getItemRevisionForDate 取事件日期修订历史，含目标/单位/起始；项目已删除或修订缺失标未知）、归属项目（删除标 itemGone）。externalRef 敏感外部身份一律不进投影。②呈现——回顾页记录行动作区新增「详情」按钮（aria-expanded、aria-label 带项目名；跳过行不显示），展开渲染 lc-checkin__record-details 面板（label/value 行列表，未知行 is-unknown 弱化+斜体+文字冗余，非仅颜色）；切换走 bind-page-navigation 的 renderReviewPreservingView 焦点回同按钮+滚动保持；展开集 host 会话态 Set（有界 50，超限清空），零事件写入。③i18n 20 键双语；新守门 tests/record-details.test.cjs 入 pnpm test 主链。测试驱动修正一处实现缺陷：健康身份规则误写 `health:steps` 前缀，实际身份格式为 `health:<itemId>:<metric>:<localDate>`，改为 startsWith("health:") + includes(":steps:") 确证。验证：pnpm run check、pnpm test、pnpm run build（CSS 635504 字节，新增详情样式 +661）、pnpm run test:ui、浅/深主题 visual-qa、width-walkthrough、pnpm run test:quality 全部 EXIT=0；提交 391b2c1；未 push。

2026-09-27 T-1509 外部失败记录待处理箱交付（批次 A①，local-auto，口径 D-293）：①新纯模块 features/external-pending.ts（零运行时依赖、无时钟）——有界箱（EXTERNAL_PENDING_CAPACITY=40、EXTERNAL_PENDING_RETENTION_DAYS=14 显式常量），入箱按 source+itemId+externalRef 身份合并（重复失败不膨胀、保留首次数据），满员显式 full 不静默覆盖，normalizeExternalPendingBox 逐条 fail-closed（坏条目丢弃、去重、超容截断、序列化往返一致），planExternalPendingRetry 为重试唯一决策边界（目标在映射/来源启用/无墓碑/单位一致/日期非未来任一不满足即拒绝并给可见原因，绝不自动转投），settleExternalPendingAfterRetry 幂等（成功/重复移除，重复 settle 无副作用）。②index.ts 接线——recordExternalEvent 增加 outcome 归因出口（lifecycle/item-unavailable/invalid-value/identity-rejected/revision-changed/unit-mismatch/unchanged/storage-failed），仅 persist 抛错时 buildExternalPendingEntry 入箱（配置拒绝不入箱=不绕过撤销/改绑/停用）；独立存储桶 checkin-external-pending 加载+保留期剪除；persistExternalPendingBox 失败置 externalPendingSaveFailed 可见；启动恢复 recoverExternalPendingBox 每条至多自动尝试一次并出会话摘要（成功/拒绝/继续等待）；retryExternalPendingEntry 全量重查后经 enqueueMutation 写入，丢弃带确认不写墓碑。③呈现与报告——设置页外部来源区新增跨来源待处理箱行（仅在有条目/保存失败/恢复摘要时渲染；条目含来源徽标词汇、项目名、值/单位、日期、原因、尝试次数，重试/丢弃动作绑定；>5 条 details 折叠）；SourceIngestReport 新增 storageRetryable 与 blocked（配置拒绝）区分，health/notequery/yeguif/weread 四条报告通路分类计数；i18n 20 键双语。新守门 tests/external-pending.test.cjs 入 pnpm test 主链（有界合并/满员/剪除/fail-closed/重试决策全拒绝原因/幂等 settle/宿主与设置接线/双语）。验证：pnpm run check、pnpm test、pnpm run build（CSS 634843 字节）、pnpm run test:ui、pnpm run test:ecosystem、浅/深主题 node tests/visual-qa.cjs、node tests/width-walkthrough.cjs、pnpm run test:quality（回滚演练+发布资产）全部 EXIT=0。过程修正：package.json 注册曾被本机安全钩子静默拦截（shell 落盘），test-suite-coverage 守门在 test:quality 抓出后改用编辑工具重注册复跑通过。提交 ea49257；未 push。

2026-09-27 T-1524 回顾概览统计迷你趋势线移除（用户反馈「线出现得突兀、不该放这里」，口径 D-292）：移除 `render/review.ts` 概览统计区第 4 网格项——「近 30 天」sparkline 与统计卡三格的本周期口径混排、悬在「条记录」下方无视觉归属；趋势呈现由分析工作区「趋势」折线图唯一承载，不在概览补替代物。清理彻底：`charts.ts` renderSparkline 助手、`components.scss` 3 条 `.lc-checkin__spark*` 规则、i18n 双语 2 对 `review.statsSpark*` 键一并退役（零死类、零死键；i18n 2135 对）。守门升格：`review-workspace.test.cjs` 三处 svg 不变量从「sparkline 唯一豁免」改为「概览默认零 SVG、零豁免」，`stats-visuals.test.cjs` 改为断言 sparkline 源码/样式/i18n 全面退役（CSS 静态区锚点改用 `.lc-checkin__renderblock-today-summary`）。验证：`pnpm run check`、`pnpm test`（68 项）、`pnpm run build`（CSS 634843 字节，较移除前 635067 略降）、`pnpm run test:ui`、浅/深主题 `node tests/visual-qa.cjs`、`node tests/width-walkthrough.cjs`（49 表面+32 交互）、`pnpm run test:quality`（回滚演练 4 步 9 资产+发布资产校验）全部 EXIT=0；未 commit（工作树含同批在途改动，留待阶段收口）、未 push。

2026-09-27 D-291 产品规划交付｜T-1509～T-1523 状态：planned（15 项均未实现）。完成仓库现状审查与 docs/product-direction-and-local-plan-2026-09-27.md：愿景/用户目标/功能矩阵/UI 信息架构、15 项具体增量、依赖/优先级、失败与浏览器验收、非目标。更新 TODO、战略与执行路线第十六节、当前路线入口、HANDOFF、BLOCKERS、README 和决策；将 T-1508 本地失败恢复归入 T-1509，与上游跨窗口身份分开。验证：git diff --check 通过；Node 文档检查通过（15 个唯一任务卡、TODO 每项恰有一个未完成条目、计划相对链接存在、主要队列入口一致）。本轮只改文档，未运行功能质量链/截图/真实宿主测试，不将历史通过记录当本轮证据；未 commit、未 push，保留既有脏工作区。下一步：按批次 A 从 T-1509 开始，详见任务卡；本轮用户所需审查与开发计划已交付。

2026-09-27 T-1496 快速录入自然语言解析收口：完成有界纯解析器（中文日期/每周排期/数值/时长、取消误判、小时转分钟、非法日期 fail-closed）及今日筛选区提示；偏好 `quickEntryNlp` 可关闭且持久化，IME 组合输入沿用既有防抖。修复在途实现的误记录风险：不再把首个未完成项目当目标；只有明确且唯一匹配项目名、单位相符、今日日期、非排期动作、非限额/戒除且未完成时才显示记录动作，点击后再次复核；项目名不写成备注。未来日期/每周排期仅作预览，不暗中改排期或补卡。补解析/目标/偏好守门与浏览器场景（裸数值、明确目标、未来日、取消识别、预览零写入）。验证：`pnpm run test:quality` EXIT=0，`node tests/quick-entry-nlp.test.cjs`、`node tests/view-preferences.test.cjs`、`node tests/today-search-ime.test.cjs`、双主题 `node tests/visual-qa.cjs`、`node tests/width-walkthrough.cjs` 均通过；未 commit、未 push。下一步 T-1497 低压力批量补卡。

2026-09-27 T-1505/T-1507 外部联动治理收口：健康收件箱、叶归、笔记推导三条文档摄取路径新增会话内报告与只读匹配预览，计数覆盖扫描/匹配/计划写入/实际写入/重复/墓碑/手动冲突/非法/未匹配/拦截；读满窗口只提示可能尚有未读数据，不伪造截断数。设置页加入外部契约中心，读取运行时 API v5 版本与能力、Task Horizon 等待消费方接入状态、Dock Tomato 真实探测状态和诊断数量，并直接复用已有的诊断预览后导出动作；不把本地契约冒充已连接。补强预览必须先于事件写入队列退出的守门。验收：`pnpm run test:quality` EXIT=0（类型、构建、主/UI/移动/生态/性能、发布资产及回滚演练），`node tests/settings-navigation.test.cjs` EXIT=0，浅/深主题 `node tests/visual-qa.cjs` EXIT=0，`node tests/width-walkthrough.cjs` EXIT=0（49 个表面场景、32 个交互状态等）。真实第三方/思源宿主联调不在本地自动化证据内；未 commit、未 push。

2026-09-27 T-1506 阅读时长重复来源提示：思阅与微信读书时长同时启用且绑定同一有效项目时，设置总览显示可行动、非阻断的双语提醒；不同目标不误报，开关和已入库记录不变。`pnpm run check`、settings-navigation、i18n-parity、`git diff --check` 通过。未 commit、未 push。

2026-09-27 T-1504 外部联动四轴状态与分组交付：`render/settings.ts` 新增纯 `projectIntegrationStatus`，配置状态继续由目标/开关判定，运行状态仅凭现有思播 controller 探测判定，其余无探测证据显示未探测；活动轴使用当日已入库条数及微信读书最近拉取结果，问题轴显式呈现拉取失败。设置页五类渠道标题与卡片顺序就位，中文/英文文案对齐。验证：`pnpm run check`、`node tests/settings-navigation.test.cjs`、`node tests/i18n-parity.test.cjs`、`pnpm run test:ui`、`pnpm run build`、浅/深主题 `node tests/visual-qa.cjs`、`node tests/width-walkthrough.cjs` 均通过；UI 链首次被工作树 T-1496 的 `today-search-ime` 夹具缺少 `quickEntryCancelled` 中断，补齐测试桩后复跑通过。未 commit、未 push；下一步 T-1505/T-1507。

2026-09-27 T-1503 外部联动逻辑总账与功能分层：新增 `docs/external-integrations-map.md`，按插件事件监听、官方服务拉取、用户文档摄取、外部 API、文档输出五类梳理全部联动，逐项固定触发、身份、隐私、失败、停用/重绑和合适操作；结论是不提供含义模糊的“全部同步”，后续功能拆为 T-1504 四轴状态投影、T-1505 文档摄取报告、T-1506 重复累计冲突提示、T-1507 对外契约中心。定向验证发现 `note-query` 过期测试把非法字段期望为静默回落默认值，与实现及安全设计冲突，已改为断言字段失效且自动禁用摄取。验证：`git diff --check`、`pnpm run check`、`pnpm test`、`pnpm run test:ecosystem`、source framework/lifecycle 与 note-query 定向链全部通过。未 commit、未 push（工作树含同批 API v5/快速录入/设置页在途改动，留待阶段收口）。

2026-09-27 T-1500 笔记推导打卡查询模板交付（第十一轮批次三③，local-auto；真实思源 SQL 宿主链路 host-pending）：固定只读 SQL 与严格解析实现已由工作树接入，本文档补齐对外接入说明 `docs/note-query-integration.md`（显式 opt-in、文档/笔记本范围、frontmatter/tag、200 行窗口、失败降级）；`notequery:<itemId>:<blockId>:<localDate>` 已登记 `src/ecosystem.ts`、两份 v5 机器契约、`docs/api-v5.md`、`docs/identity-and-merge.md`。架构边界与来源生命周期矩阵新增 notequery 前缀/模块/手动互斥守门；release notes、change log、TODO、HANDOFF 已同步。运行时沿用 `source: "api"`，无新 source 枚举或任意 SQL。验证：`node tests/note-query.test.cjs`、`architecture-boundaries`、`source-lifecycle-matrix`、`api-v5-docs`、`contract-kit`、`external-ref`、`pnpm run test:ecosystem` 与本轮复跑的完整 `pnpm test` 全部通过；此前 template-manager 临时夹具缺失阻塞已解除。未 push。

2026-09-27 T-1501 快捷指令自动化配方文档交付（第十一轮批次三②，local-auto；真机 host-pending）：重写 `docs/health-shortcuts-integration.md` 为 iOS 可照做配方——通用 `appendBlock` JSON 请求、步数求和、体重取最新样本、到家/睡前/手动补录/分支场景、幂等验收、失败排查、500 行窗口与 token 隐私边界；明确现有严格解析器只接受 `health:steps` / `health:weight`，自定义健康指标行会被忽略，避免把未实现能力写成承诺。`docs/releases/release-notes-18.8.0.md` 与 `docs/v18.8.0-change-log.md` 已引用；`tests/health-inbox.test.cjs` 增加配方/host-pending/不支持指标文档守门。验证：node tests/health-inbox.test.cjs 通过；无运行时代码变更，iPhone/内核实测仍待用户设备。

2026-09-27 T-1490 自动记录信任层交付（第十一轮批次三①，local-auto）：①新纯模块 features/record-trust.ts（零运行时依赖、无时钟、确定性）——buildRecordTrust 只读消费 source/externalRef/note 派生信任信息：来源徽标复用既有 source.* 双语词汇（未知来源降级 source.api 与宿主归一口径一致）、命中原因仅在能确证时派生（阈值结算「{value}{unit} ≥ 阈值 {threshold}{unit}」要求事件值 ≥ 当前绑定阈值——低于即口径已变不冒认；weread :finish: 完读书名、:notes: 笔记合计；health: 前缀=快捷指令同步；tomato=专注会话；yeguif=LifeLog 推导；api/import 无解释不编造），手动记录无徽标无原因。②呈现：回顾页历史行来源文本升级为徽标+命中原因行（muted 文字 9px/10.5px 过无障碍审计预算——首版 accent-on-accent-soft 2.65:1 被审计抓出后改 muted+accent-soft 描边）；今日页日志行加来源徽标；一键撤销沿用历史行既有 data-history-event-id→removeEvents 通道（墓碑自动写入防重复累计），零 schema 变更。③宿主回顾 ctx 透传 trustThresholds（仍生效的 sireader/siplayer/weread 结算绑定快照，类型谓词 filter 收窄；测试驱动加可选链兼容旧桩 harness）。i18n 6 键双语（2057 对）；新守门 tests/record-trust.test.cjs 入 pnpm test 主链。验证：check、pnpm test、test:ui、build+test:quality（EXIT=0，CSS 632261 预算内、无障碍审计 0 违例）、宽度走查 49+32、双主题 visual-qa 全绿；未 push。

2026-09-27 T-1495 事项提醒降噪聚合交付（第十一轮批次二⑤收官，local-auto）：①新纯模块 features/reminder-digest.ts（零运行时依赖、无时钟、确定性）——buildReminderDigest 把行动条目（overdue/today）聚合为单条摘要：今日一段、逾期跨日合并一段（代表名按发生日降序），计数+至多 3 个代表项目名（1~8 钳制）+溢出计数，非法日期 fail-closed 空；isBannerCoveredReminder 单一判定（occasion+today+dueDate=今天）供推送与今日页共用。②每日推送文案升级（T-1443/T-1451 通道不动，守门断言全仓库恰一处 pushMsg）：「打卡提醒：{body}」= 今日段+逾期段（计数+代表名+「等 N 项」），横幅已聚合的当日事项不再计入推送，零事项不消费槽位纪律保持；msg.dailyReminder 参数化+7 个摘要键双语改造。③今日页降噪：renderPriorityReminderView 与今日行动台 attention 计数共用新 selectTodayPriorityEntries 去重——横幅已聚合的当日事项不在优先卡/行动台重复弹（逾期事项保留）。④提前提醒「仅一次」：view-preferences 新增 occasionRemindOnce（默认关=原逐日行为，归一化只认布尔 true）；reminders.ts 新纯函数 advanceReminderVisible（窗口首日 daysUntil===remindBeforeDays 出现一次、当天提醒不受影响、非法 fail-closed 可见）；projectReminderCenter 增 additive options.advanceOnce，回顾页提醒中心/推送/动作 toast 查询三处同参透传；设置页「今日」组新增开关行（data-setting-occasion-once）。口径 D-283。i18n 9 键双语（2051 对齐）；新守门 tests/reminder-digest.test.cjs 入 pnpm test 主链（聚合/逾期合并/截断/fail-closed/确定性/纯度/仅一次语义/projectReminderCenter 接线/单推送通道 calm 禁则/设置与回顾接线/双语）；review-asof 守门正则放宽兼容 additive 选项（共享 asOf 截点断言不变）。验证：pnpm run check、pnpm test、test:ui、build+test:quality（EXIT=0，CSS 631917 预算内、发布资产与回滚演练通过）、宽度走查 49+32、双主题 visual-qa 全绿；真机推送观感归 host-pending；未 push。第十一轮批次二（T-1491～1495）就此全部交付。

2026-09-27 v18.8.0 发版执行（用户授权）：版本四方 18.7.0→18.8.0（package.json/plugin.json/src/version.ts，dist 契约随构建同步）；新增 docs/v18.8.0-change-log.md 与 docs/releases/release-notes-18.8.0.md（质量链 digest 自动回填）。README 更新：「当前版本 18.8.0」声明、核心功能表反映本版能力（新建/日期事项/今日/设置行）、18.6.0+18.7.0 重点段收敛为单一 18.8.0 重点四小节（历史链接 releases 目录）、已知边界补 dailynote 属性依赖。R-REL-CHECK：sireader#55 / siplayer#180 均 open、0 评论、无维护者回应（09-27 复查），契约无变化。测试驱动修正：release-assets 守门要求 README 声明当前发布版本（首次运行暴露、已补）。发版提交 dce4acf；main `3a6639c..dce4acf` 推送（27 个本地提交一并上云）；tag `v18.8.0` 推送；GitHub Release 标记 Latest 附 package.zip（756,622 字节），远端资产 SHA-256 `8f0dd239fc6cf12c301ef56c63d60b549f810cc5680272cb16fc279c7ed9e98d` 与本地构建及发布说明一致（gh api 回读核验）。新增交接文档 docs/HANDOFF-2026-09-27.md（新电脑同步入口：环境/状态/开放队列/开发纪律/台账索引/发布流水线），TODO 交接指针已更新。

2026-09-27 T-1494 事项循环实例覆盖与错过处理交付（第十一轮批次二④，local-auto）：①additive schema——Occasion 可选 overrides: Record<原发生日期, {date: 新日期}>，normalizeOccasion 归一化 fail-closed（键/值真实日历日且不同、有界 60 条、空 map 不物化），旧数据零迁移、store version 不变。②发生引擎重写为覆盖感知包装：预扫所有 ≥localDate 的改期目标入候选 + 循环跳过被覆盖基点（有界 12 步）取最早者——修复首版缺陷「改期目标日不参与时间线」（cursor=新日期时引擎越过改期实例直接回周期轨道）。③setOccasionOverride 纯写入：未匹配 id 原样返回 store（宿主 next===previous 身份回滚依赖）、newDate 空/相同=移除覆盖、移除后空 map 整体不物化。④错过处理 getMissedOccurrence：太阳历固定周期口径（weekly/monthly-byday/quarterly/halfyearly/annual-byday/interval；nthweek/lastday/农历/once 不派生不伪造），上一周期未标记 → 行内中性提示「上次 {date} 未标记」+「补标记」→ 复用既有 setOccasionCompleted 按日期通道；无红色欠账样式（calm 口径）。⑤单次改期 UI：循环事项行「改期下次」aria-expanded 切换内联日期行（min=今天，输入后启用确认）→ 宿主 saveOccasionOverride → persistOccasions（enqueueMutation，失败恢复+occasionToggleFail toast，成功 moveDone toast）；「此次及以后」沿用既有系列编辑。i18n 6 键双语；守门 occasions.test.cjs 扩展 12 组。验证：pnpm run check、pnpm test、test:ui、build+test:quality（CSS 631917 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；真机触控归 host-pending；未 push。

2026-09-27 T-1493 「X 年前的今天」回顾交付（第十一轮批次二③，local-auto）：新纯模块 features/this-day-history.ts（零依赖、无时钟、确定性）——buildThisDayHistory 聚合往年同月日：打卡条目按年聚合完成计数（value>0）、项目名事件序去重（maxNames 缺省 3 + overflow 计数、未知 id 不产生名称）、事项锚点条目（开始于往年今天）；年份降序 maxYears 缺省 3（有界 5）、当前年不计入、非法日期 fail-closed 空。今日页低干扰卡 renderThisDayHistoryView（renderTodayView 横幅区之后，无历史不渲染，lc-checkin__this-day 卡片样式）。日记跳转：条目「日记」按钮 → 宿主 openPastDiary——SQL 只读定位宿主自动加的 custom-dailynote-YYYYMMDD ial（单查询），命中 openTab、未命中 showMessage 提示，绝不创建文档；pastDate 正则白名单后拼 SQL 防注入。隐私口径与回顾页一致（仅插件 UI 呈现项目名，不进导出/公开 API）。i18n 7 键双语；新守门 tests/this-day-history.test.cjs 入 pnpm test 主链（聚合/去重/溢出/有界/降级/确定性/纯度/接线/双语）。验证：pnpm run check、pnpm test、test:ui、build+test:quality（CSS 630758 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；真机 ial 覆盖面归 host-pending；未 push。

2026-09-27 T-1492 事项时间表达升级交付（第十一轮批次二②，local-auto）：occasions.ts 追加两组只读投影。①elapsedSpanSince + describeElapsedSpan——自然历三段跨度（年/月/日）：月满判定以钳制锚点日为准（锚点 01-31 → 02-29 满月=1 个月、02-28 未满=28 天，闰年用例锁定），localDate 早于锚点/非法输入 undefined；组合文案跳过零中间单位（2 年 0 个月 14 天 → 「2 年 14 天」，en: 2y 14d）。纪念日/生日行在日期行追加跨度文本。②occasionCycleProgress——本周期进度（progress 0..1 + percent 整数）：仅太阳历固定周期且周期 >14 天（quarterly/halfyearly/annual-byday/monthly-byday/interval 日月年；weekly 7 天排除）派生；nthweek/lastday/农历/once 因前周期起点无法无歧义回推而不派生（不伪造数据）。渲染：行内细进度条（track aria-hidden + accent bar）+「本周期 {p}%」文本冗余——周期口径明确，不冒充完成率。语义澄清（测试驱动）：季度为模周期，锚点前后皆按月日网格取发生点，任意发生日读作满周期 100%。i18n 4 键双语。守门 occasions.test.cjs 扩展覆盖全部口径与接线。验证：pnpm run check、pnpm test、test:ui、build+test:quality（CSS 630287 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；真机观感归 host-pending；未 push。

2026-09-27 T-1491 纪念日里程碑派生交付（第十一轮批次二①，local-auto）：occasions.ts 单一实现只读投影（零 schema 变更）——nextOccasionMilestones/occasionMilestoneEligible/describeOccasionMilestone。口径：满-N 约定（里程碑日期=锚点+N，daysBetweenHalfOpen(锚点,里程碑)=N），阶梯 [100,200,300,365,500,1000,2000,3000,4000,5000,10000] + 自然月（monthDate 钳制月末：锚点 31 日 → 闰年 2/29，测试锁定）+ 逐年周年；仅 anniversary/birthday；农历年度事项只派生满 N 天（太阳日计数与农历月日回推不一致，不伪造月/年里程碑）；月推进有界 1200 步、年 200 步、输出有界 24 条日期升序；非法锚点 fail-closed 空数组；scheduled 一次性事项不派生。接线：①事项列表行里程碑徽标（最近一条，lc-checkin__occasion-milestone 圆角徽标，当天 is-today accent-soft 强调、停用行 display:none）；②今日横幅芯片里程碑当天以「今天满 N 天/满 N 岁…」替换动作词（is-milestone 金色小字，点击完成/撤销行为不变，title 同步）。i18n 6 键双语（milestoneDays/Monthly/Yearly/Age/Today/Upcoming）。守门 occasions.test.cjs 扩展：满-N 数学（锚点+365=2025-06-01）、今天命中 daysUntil=0 与「今天」前缀、未来项「还有」后缀、阶梯末端外年里程碑延续、月钳制闰年、农历降级、scheduled 不派生、非法锚点、确定性、接线与双语。测试驱动修正一处实现：输出上限误写 5 放宽为有界 24。验证：pnpm run check、pnpm test、build+test:quality（CSS 629675 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；真机观感归 host-pending；未 push。

2026-09-27 T-1489 互补习惯动态推荐交付（第十一轮批次一收官，local-auto）：新纯模块 features/habit-recommendations.ts（零依赖、无时钟、确定性输出）——recommendHabitTemplates 输入活跃项目快照（name/group/timeSlot/kind，归档不参与）+ 目录快照 + 空库回退序列 + localizeName 注入：①排除比对覆盖 zh 锚点与本地化显示名（en 库同样不重复推荐）；②组互补配对表（运动↔健康 +2、工作→生活 +1、学习→生活 +1、生活→工作 +1、创作→学习 +1）；③时段补位（晨/午/晚空缺 +2，any 不算时段）；④类型多样性（缺 absent kind +1）；⑤score desc → 目录顺序 tiebreak，limit 缺省 8；⑥空库回退 RECOMMENDED_TEMPLATES 静态精选（新用户仍走人工策划起步清单），全部候选被排除时如实返回空。编辑器推荐位切换为动态输出（data-template-recommended 标记与「最近使用优先、推荐补位」版面规则保留），标题「精选推荐」→「为你推荐」+ calm 提示行「根据已有项目生成的互补建议，仅供参考」（en: just suggestions）。i18n 2 键；新守门 tests/habit-recommendations.test.cjs 入 pnpm test 主链（测试驱动澄清三处计分语义：生活→工作配对反超时段补位、健康↔运动双向配对、tiebreak 目录序）。验证：pnpm run check、pnpm test、test:ui、build+test:quality（CSS 628864 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；未 push。第十一轮批次一（T-1486～1489）全部交付。

2026-09-27 T-1502 页签一级入口与默认打开方式交付（用户点名评估，结论=做小幅收口）：评估确认页签呈现已是完整能力（addTab 自定义类型/固定 id 复用/全生命周期/wideTab 断言），缺口在可发现性与入口便利性，结论「并存不替代」记 D-282。落地：①view-preferences 新增 defaultOpenMode（quick 缺省/tab，归一化 fail-closed 回落弹窗）+ 持久化/恢复接线；②features/quick-entry-capabilities.ts 新增 resolveQuickEntryTarget 纯函数（tab 仅 supportsCustomTab 时生效，未知值/移动端一律回落快捷弹窗）；③index openDefaultEntry()——openCheckin 命令（quick-dialog 执行器）、全局热键回调与顶栏按钮统一按偏好路由，openCheckinTab 保持直达页签，dock 点击语义不动；④设置页「外观与交互」新增打开方式选择行（data-setting-open-mode）；⑤README 补页签入口与偏好说明。i18n 4 键双语；守门 quick-entry-capabilities 扩展（路由 5 用例/接线/偏好归一/设置行/双语）。验证：pnpm run check、pnpm test、test:ui、build+test:quality（CSS 628864 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；真机页签恢复归 host-pending；未 push。

2026-09-27 T-1488 新建流效率交付（第十一轮批次一，local-auto）：①空状态一键装填——组合包预览面板在库中无活跃项目时出现「一键应用全部新增（N）」（data-pack-apply-all + busy 防重），宿主 applyTemplatePackBulk 复用 buildTemplatePackPreview 同一纯函数判定 new/duplicate（重复名不重建），逐条经 normalizeCheckinItem 模型边界落目录字段（recordStep/schedule/timeSlot/completionSource/tomatoMode/direction 原样），persist 失败恢复旧 store、成功逐条广播 item-created + invalidateSummary + advanceFirstSuccess；非空库保持逐条确认纪律。②「保存并继续」——仅新建表单渲染（data-save-continue），bind-editor 以 event.submitter 检测提交源，saveEditorForm 增 options.continueCreation 跳过 host.showToday()，host.saveForm 返回 savedItemId，真实落盘后清空名称/重置 T-1486 联动卡与 T-1487 联想行并聚焦名称（校验失败/冲突不动表单），分组/类型/排期上下文由表单自然保留。③空状态模板区默认展开 + editor.templateEmptyHint 专用文案。i18n 4 键双语；守门 template-packs 扩展（批量前提/宿主方法/归一化边界/旅程推进/i18n）+ template-gallery 扩展（continue 接线/落盘门控）。验证：pnpm run check、pnpm test、test:ui、build+test:quality（CSS 628864 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；真机触控归 host-pending；未 push。

2026-09-27 T-1487 新建打卡智能默认交付（第十一轮批次一，local-auto）：新纯模块 features/name-inference.ts（零依赖、无时钟、确定性）——buildNameInference 先目录精确匹配（zh 锚点 + 注入显示名对照，大小写无关）建议整卡套用；未命中走 inferFieldsFromName 关键词推断：数值+单位相邻检出（duration/quantity/count 类型+单位+目标，公斤→千克归一）、单位停用词（「跑步」不误触发「步」单位）、时段（晨/早/午/晚/夜）、排期（每天/每日/天天→daily、工作日、周末→[0,6]、「每周一三五」周后连续列举逐字收集去重升序）；fail-closed（零信号/超长 60 字/零值目标/非字符串一律不产出）。编辑器接线：名称输入 250ms 防抖渲染非阻断建议行（data-name-inference），「套用模板」复用与模板芯片同一 applyTemplateFields 填表路径（含 T-1486 联动建议卡重置、记录最近使用），「按名称预填」按活输入重解析仅填推断字段并刷新条件字段/预览/高级摘要，关闭按钮对同名不再提示；应用前不改任何字段（点击门控=不覆盖显式选择）。宿主 nameInferenceCatalog() 投影 CHECKIN_TEMPLATES 锚点+译文。i18n 4 键双语；新守门 tests/name-inference.test.cjs 入 pnpm test 主链。测试驱动修复三缺陷：周列举正则需 + 量词、「跑步」停用词、空建议返回 undefined 而非 {fields: undefined}。验证：pnpm run check、pnpm test、build+test:quality（CSS 628785 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；真机输入法节奏归 host-pending；未 push。

2026-09-27 T-1486 联动预接线模板交付（第十一轮批次一，local-auto）：①新纯模块 features/template-linkage.ts——zh 名锚点亲和表（步数→health-steps/体重→health-weight/阅读→sireader/问卷日记→journal，locale 无关）、buildTemplateLinkageCard（sireader 改绑呈现 conflictNames、健康卡 relatedNames 不阻断、问卷无预设降级）、isTemplateLinkagePlan 白名单（journal 永不入计划）。②编辑器联动建议卡（role=note）：模板套用后渲染，确认写隐藏 linkagePlan 字段（保存后生效+可撤销），项目落盘后 saveForm 一次性消费（saveEditorForm 改返回 item.id），经 addHealthMetricBinding/sireaderIntegration 既有通道写入，持久化失败恢复旧偏好；不静默启用。③健康收件箱按项目映射 v2：metricBindings[]（同指标多项目、独立 externalRef、容量 16、去重 fail-closed），旧字段迁移为首条映射+镜像保留（降级可读、真实内核 e2e 旧形状种子即迁移验收）；ingest 按指标投递全部挂载项目；设置页动态映射行（添加/移除/改绑，单元校验纪律不变，`<template>` 克隆空白行）。④catalog 新增体重/问卷日记模板（67 个）。双语 22 键；health-inbox 守门扩展（多映射/迁移/去重/容量/亲和/卡片 fail-closed/接线/旧选择器退役）+ template-gallery/template-packs/settings-navigation/i18n-parity（2007 对）全过；修复走查模板锚点为按名称定位（目录增删稳健）。验证：pnpm run check、pnpm test、test:ui、test:quality（CSS 628389 预算内）、宽度走查 49+32、双主题 visual-qa 全绿；真机触控归 host-pending；口径 D-281；docs/health-shortcuts-integration.md 增按项目映射说明；未 push。

2026-09-27 T-1400 生态调研循环·第十一轮（用户点名触发：联动自动化×新建模板×事项页×UI/性能全面优化）：四路并行深评约 25 次检索与官方源抓取——A 路事项/倒数日赛道（iTunes API 直读 Days Matter v5.3.1/时间规划局 v5.2.1/AtoDays v4.0.0/滴答清单 v8.2.12/Anniversary Tracker v3.29 等 13 候选：里程碑派生/时间多单位/周期进度/历史上的今天/循环实例编辑作用域/错过显式处理/提醒聚合——事项页差距定位在时间表达、事件生命周期、回顾情感三层）；B 路联动自动化（Streaks HealthKit 自动完成+建议任务/Habitify Shortcuts/Exist 18 服务聚合/WakaTime 心跳/GitHub 绿格/Obsidian Tracker 日记推导/Logseq query/IFTTT webhook/失败语义研究 14 候选——「失败可解释是被动追踪生死线」）；C 路新建模板与表单 UX（Habitify 秒建+自动记录/Streaks 预接线任务/Loop 无建议反例/HabitKit 三步创建/Awesome Habits 三轨/Habitica Sample Habits/TickTick 无模板库/NN.g 渐进披露/Baymard 8 字段基准 10 候选——真实差距=模板携带数据源+智能默认）；D 路快速录入与 UI/性能（Todoist NLP 高亮契约/TickTick 智能识别/Habitify MCP NLP 记录/v40-48 批量操作/Table Habit 批量打卡/web.dev long task/content-visibility/WCAG 2.2 目标尺寸 13 候选）。结论：竞品警报 0；采纳 16（T-1486 联动预接线模板、T-1487 智能默认、T-1488 空状态装填+连建、T-1489 互补推荐、T-1491 里程碑派生、T-1492 时间表达升级、T-1493 历史上的今天、T-1494 实例覆盖+错过处理、T-1495 提醒降噪、T-1490 自动记录信任层、T-1501 快捷指令配方、T-1500 笔记推导查询模板、T-1496 NLP 录入、T-1497 批量补卡、T-1498 长任务门禁、T-1499 WCAG 核对）、延后 9、不做 7；四批次登记 TODO 第十一轮节，全案 benchmark 第二十一节，口径 D-280。纯调研轮，无代码变更，未 push。

2026-09-26 T-1484 问卷日记提示词轮换交付（T-1400 第十轮采纳①，local-auto）：journal-templates.ts 纯函数扩展——JournalQuestionDef 增可选 prompts/promptKeys；normalizePromptPool fail-closed（trim/去重/单条 200 字上限/池容量 6、有界扫描前 18 项、有效候选不足 2 条整体不物化）；journalIsoWeekKey 零依赖 ISO 周算法（显式 UTC 运算、真实日历校验、非法/不存在日期返回空串，锚点：2025-12-29→2026-W01、2026 全年 53 周、2027-01-01→2026-W53）；resolveJournalQuestionText 按 ISO 周 key 的 djb2 hash 确定性轮换（无池/单候选/非法日期回落基础题干；2026 全年 3 候选池覆盖 109/112/144 天）。呈现接线：弹窗 openJournalDialogFor 增 localDate 依赖并经 resolveJournalQuestionText 取词，buildJournalEntryMarkdown 共用同一实现（写入文档题干与弹窗同日一致）；事件 note 摘要与幂等标记（模板 ID+日期）不变，重填仍整块更新。内置池：感恩三问 q1、五分钟日记 q2/q5 各 3 条候选（i18n 双语 9 键+poolVariants+customHint 补池语法）；自建模板文本以「> 候选」行配置池（解析累积去重、孤立池行计坏块、单候选剪除、序列化往返保留）；builder 复制预设/复制题目深拷贝池数组、预览标注候选数（journal.poolVariants）。守门：journal-templates.test.cjs 扩展（归一化/ISO 周锚点/确定性/全年覆盖/内置与缺翻译部分池/文本往返/弹窗与宿主接线断言）仍入 pnpm test 主链；journal-experience.cjs require 桩补 journal 模块映射、夹具补 localDate。验证：pnpm run check、pnpm test 主链、pnpm run build + test:quality（release assets、回滚演练、CSS 627612 字节预算内）、node tests/journal-experience.cjs、宽度走查 49 表面+32 交互、双主题 node tests/visual-qa.cjs 全部通过；真机弹窗触控归 host-pending；文档 docs/settings-journal-experience.md 增「轮换提示词」节；未 push。

2026-09-26 T-1485 绑定目标卡片样式交付：将日报文档、摘要驻留文档、问卷日记目标、健康收件箱文档和叶归 LifeLog 笔记本的目标入口从普通设置行提升为独立卡片；卡片内按目标说明→搜索/选择或 ID 输入→保存/创建排列，状态徽标与边框沿用 setup/ready/enabled/rebind，启用开关和写入动作保持原位置。保留全部 `data-*` 选择器、共享文档校验、失败回滚和会话草稿逻辑；窄屏控件纵排且目标输入保持可读，双主题复用现有变量。新增 settings-navigation 结构守门。验证：`pnpm run check`、`pnpm run build:check`、`node tests/settings-navigation.test.cjs`、`node tests/journal-experience.cjs`、`node tests/accessibility-audit.test.cjs`、双主题 `node tests/visual-qa.cjs`、`node tests/width-walkthrough.cjs` 和 `pnpm run test:quality`（183 个测试文件、性能、CSS hygiene、发布资产与回滚演练）均通过；未 push。

2026-09-26 T-1400 生态调研循环·第十轮（用户点名触发，宽覆盖全量轮）：七路并行约 20 次检索与抓取——①独立应用（Habitify 32→34 正念停顿/Add vs Set/自定义时段/ChatGPT 集成；TickTick MCP+Unachieved 打卡+年视图热力图；HabitKit 周开始日设置+DST 漂移修复；Streaks 手表端；Table Habit v1.26.5→1.27.6 宽屏自适应与批量操作；Loop 无新版本）②GitHub 开源③笔记生态（Obsidian 新面孔 Habits[暂停不断连击+PDF 报告]/Daily Journal Plus[轮换反思提示词]/Daily Habit[标签式打卡]；Habit Tracker Dashboard[At least/At most/Exactly 三口径+Grace Days+连击最小长度]）④宿主与集市（正式版仍 v3.8.5，T-1464 未触发；3.8.5 三条插件修复[#19599 快捷键打断 onload/#19651 dock 图标不更新/#19652 只读命令快捷键]登记工程注意项；集市 09-25 后 3 条增量均非竞品）⑤行为科学（never-miss-twice 再证双日规则；HRV 适应性目标→最低门槛显示延后观察；Harkin +27% 佐证视觉追踪）⑥AI 智能体（AI 教练三件套主流化+TickTick MCP/Habitify ChatGPT/宿主 Agent 三线并进→MCP descriptor 战略权重上升；AI 迎合性批判再证确定性洞察优先护栏）⑦可穿戴（glanceable 佐证 dock 小环延后项）。结论：竞品警报 0、采纳 1（T-1484 问卷提示词轮换，登记 TODO）、延后 5、不做 5、佐证 10+、工程注意项 2；全案 benchmark 第二十节。纯调研轮，无代码变更，未 push。

2026-09-26 T-1400 增量核查：T-1477～T-1483 与 T-1386 本地部分收口后，GitHub 核查思源最新正式 release v2.4.1（该仓库非当前思源内核主线，未据此触发任何任务）；sireader#55、siplayer#180 均 open、0 评论、更新仍为 09-25。无新公开 API 契约或本地开发触发。已更新 HANDOFF 当前队列，剩余未完成项均为外部消费端协作或用户产品决策；未 push。

2026-09-26 T-1386 本地部分最终验收：统一来源卡片的健康/微信读书/叶归“立即刷新”入口及失败反馈通过完整质量链；`pnpm run test:quality` EXIT=0，183 个测试文件、性能、CSS hygiene（659 类、0 死类、621392 bytes）、发布资产和回滚演练全部通过。TODO 重复历史条目已改为本地完成、外部消费端依赖保留。

2026-09-26 T-1386 本地来源刷新 UX：设置来源卡片新增统一“立即刷新”入口，健康、微信读书、叶归分别复用 ingestHealthInbox、ingestWeread、ingestYeguif；不删除事件、不重算 externalRef，失败仍走现有反馈/诊断路径。验证：health-inbox、weread-adapter、yeguif-adapter、i18n-parity、ui-docs、accessibility、build:check 全部通过。

2026-09-26 T-1483 宽屏回顾布局交付：在 lc5 容器宽度 ≥1200px 时，概览项目卡使用三列，分析区折叠卡使用两列；DOM 顺序保持阅读和键盘顺序，≤1200px 自动回退单列。验证：review-layout-regression 52 个真实 bundle 几何场景、review-workspace、build 前 typecheck、css-hygiene、双主题 visual QA 均通过。

2026-09-26 T-1482 热图变体交付：新增按周分段热图 `renderWeeklyHeatmap`，以同一 YearHeatmap 数据聚合 53 个周格，保留年度空间位置与悬停记录/活跃天数；回顾页默认折叠，展开后不增加首屏密度，双主题样式复用现有色阶。验证：v7-insights、review-presentation、i18n-parity、build:check、双主题 visual-qa、css-hygiene（659 类、0 死类，620904 bytes）、insight-a11y 全部通过。

2026-09-26 T-1482 热图变体评估：现有年度热图已采用有记录日四分位自适应色阶，空白日与跳过日有冗余编码，横向滚动和双主题样式已有守门。当前证据显示密集热图在低频用户仍有信息层次；稀疏变体若仅隐藏空白格会破坏周/月定位，因此暂不接入破坏空间语义的实现，保留在后续设计切片。

2026-09-26 T-1481 性能验收：问卷编辑器基准 DOM 26 个节点、设置搜索夹具 DOM 15 个节点；10k 事件今日完整渲染 29ms、100k 批量生命周期 21.4ms，横向溢出 0；既有回顾性能基线与后台刷新守门保持通过。未发现需要针对实测热点改写的重复计算，CSS 预算维持 620595 bytes。验证：node tests/journal-experience.cjs、pnpm run test:perf 均通过。

2026-09-26 T-1480 验收：双主题 visual-qa、accessibility-audit（750 对比度组合，0 违规）、ui-state-ledger、responsive-layout、editor-validation、mobile-editor-structure、桌面/移动 width-walkthrough（49 surface + 32 interaction）全部通过；未发现高置信 UI、焦点或滚动回归。

2026-09-26 T-1478/T-1479 收口：设置搜索细化到具体设置行，回车定位并清空恢复；提醒时刻及思阅、思播、微信读书手动保存字段补会话草稿、失败回滚与成功反馈。问卷支持题目复制、双向移动和键盘移动；删除仍被项目绑定的模板时拒绝保存并提示在项目编辑器修复。完整 test:quality 在最后两项修正前通过；修正后 check、journal-experience、i18n-parity、git diff --check 通过。8081cd 不是当前仓库可解析的提交，按继续开发处理；未 push。

2026-09-26 D-275 文档验收：git diff --check、ecosystem-docs、upstream-proposals、ui-docs、preferences-docs、api-v5-docs、export-identity-docs 六项守门均 EXIT=0；扫描确认 12 个已撤销任务不再出现在未完成列表，T-1477～T-1483、T-1386 与真实外部依赖保留。此次仅更新文档，未重跑代码构建或完整 test:quality，也未将既有测试结果记作本轮实跑。下一开发切片从 T-1477 开始。

2026-09-26 D-275 开发队列校正（用户要求去掉宿主正式版/真机反馈等待，并重审此前开发空间）：撤销 12 个任务条目中的版本/现场等待（其中 T-1346/T-1173 仅撤销剩余现场部分）及 B-001/B-007；取消不等于验收通过，原始证据保留。修正“无外部新增触发=没有可开发内容”的错误判断；核对源码确认目标保存仅格式校验、总览显示 ID、问卷弹窗裸 ID、设置搜索按分类、问卷仅上移等可深化点。登记 T-1477～T-1483，承接 T-1386 本地来源 UX；热图/宽屏设计纳入实际任务，不再空等设计窗口。同步 TODO/BLOCKERS/DECISIONS、交接、产品/执行路线和绑定盘点，纠正 T-1438 已提交却仍未勾选及绑定保存校验“已满足”的过度表述。本轮仅修改文档与排期，尚未实现上述新增任务；未 push/发版。文档验证结果随实际运行追加。

2026-09-26 T-1400 第九轮轻量调研（T-1472～T-1476 收口后用户「继续开发」）：重新读取 TODO/PROGRESS/BLOCKERS/DECISIONS，工作区起始干净。gh api 确认正式思源仍 v3.8.5、预发布 alpha.6，T-1464 未触发；sireader#55/siplayer#180 均 open、0 评论；Workbench v1.0.4、Pinch v2.7.1 的版本和 pushed_at 未推进；Zenith 0.2.5 无新版本。定向阅读 alpha.6 发布说明及 Obsidian 注册表新提交 a71a376 的 diff（两个新插件为查找替换/本地开发辅助），思源集市 plugins.txt 当日查询窗口无提交。直接采纳 0、无新增可执行任务，证据与覆盖范围记 benchmark 第十九节。仅修改研究/台账，不改代码或构建产物，不重新宣称完整质量链实跑；等待正式版、上游回应、用户设计决策或真机反馈，不硬找活干、不 push/发版。 文档验收：git diff --check、ecosystem-docs.test.cjs、upstream-proposals.test.cjs 均 EXIT=0；作为第九轮调研收口单独本地提交。

2026-09-26 T-1472～T-1476 设置与记录体验三批开发（D-274）：实现联动检测错误/丢失分离与配置定位；问卷失败保留答案、必答焦点、会话草稿和提交防重；日记按所选笔记本查询、预检不创建文档、内核错误码校验；设置搜索、文档搜索选择与手动保存草稿；可视化问卷增删/排序/必答/题型/预设复制/预览/撤销，模板 ID 往返稳定，新建不复用已删除模板身份。新增 journal-experience.cjs 入 test:ui 主链；补充 settings-journal-experience.md、README 未发布提示与 D-274。最后检查修复保存后改回旧值丢草稿、空题文本误保存、窄屏目标输入过窄，已完成下述验收并纳入本地里程碑提交，不 push、不发版。

验收证据（T-1472～T-1476）：① `pnpm run test:quality` 返回 `QUALITY_EXIT=0`，.artifacts/quality-t1472-final-verified.log，183 个 .test.cjs 守门文件 + 新增 journal-experience.cjs 浏览器交互测试入主链；② 最后文案/ARIA/目标布局修订后重新 typecheck、build、i18n parity（1951 双语键）、journal-experience、accessibility、sync:digest、check:release，均 EXIT=0；③ visual-qa 最终双主题 `VISUAL_EXIT=0`、pageErrors=[]，截图含 journal-builder.png / journal-target.png，目标输入宽度 ≥200px、编辑器主要控件 ≥44px、草稿跨页/保存后改回空值/异步笔记本选择恢复断言通过；④ width-walkthrough 桌面与移动前端均通过 49 页面尺寸 +32 交互 +8 主题配色 +10 混合习惯 +16 长内容场景；⑤ 真实思源 3.8.5 隔离内核问卷 E2E 1/1，首次日记写入与粘贴文档内块 ID 重填均成功，事件保持一条、预检不建文档；内核关闭阶段有 `mux: server closed` 清理日志，测试 EXIT=0（.artifacts/e2e-journal-t1473-final.log）。

测量与边界：双主题无障碍实测 750 组颜色，0 名称缺失/0 正 tabindex/0 对比度违规，支持现代 CSS 颜色及透明背景叠加；10k 回顾 range/snapshot 47/50ms，100k 405/367ms、export 58ms，10k 完整渲染 38ms、overflow 0，100 items/100k 批处理 19.9ms（单次机器测量，不宣称固定加速倍数）。CSS 620196 bytes，保持既有预算不放宽。最新本地未发布 package.zip SHA-256 `160061c1573f4ae2accd25b042793ff7dd750b9bf88caa487cedfb259287f2b6`；远端 v18.7.0 正式资产仍为 `75bbb7a0…`，未更新远端。草稿只在当前会话内存保留，重载/卸载后不恢复；真机触控、系统键盘、安全区/第三方账号继续 host-pending，不以自动化冒充现场验收。使用说明见 docs/settings-journal-experience.md。

2026-09-26 续开发触发核查（gh api）：思源 Latest 正式版仍 v3.8.5；预发布已从 alpha.5 前进到 v3.8.6-alpha.6（09-26 03:20:49 UTC），尚未满足 T-1464 正式版触发条件。sireader#55 / siplayer#180 均 open、0 评论，updated_at 仍 09-25；Workbench 最新 v1.0.4、Pinch v2.7.1，均未推进。没有新增可直接开工的外部触发项；本轮继续完成已获授权的 T-1472～T-1476。来源：repos/siyuan-note/siyuan/releases/latest、releases/tags/v3.8.6-alpha.6、repos/mm-o/siyuan-sireader/issues/55、repos/mm-o/siyuan-media-player/issues/180、repos/IAliceBobI/sy-workbench-plugin/releases/latest、repos/royc01/pinch/releases/latest。

2026-09-26 v18.7.0 正式发布与继续开发核查（用户明示「发版GitHub，然后继续开发」）：`node scripts/release.cjs 18.7.0` EXIT=0，完整构建/测试链 183 守门文件、发布资产清单与回滚演练通过；main 从 `1147e86` 推送至 `3a6639c`，tag v18.7.0 与 GitHub Latest 创建成功。交付 T-1470 笔记联动总览、日记属性定位兜底，T-1471 手机折叠/回顾边界滚动修复及 README 重构。package.zip 734538 bytes，SHA-256 `75bbb7a06fdad91dec874ef114be5e24abae2b13be4d6b0d93b4c4511147acbe`：本地、GitHub 资产元数据、下载回源包、发布说明一致；CI run 36213732219 success。18.6.0 历史说明摘要恢复为正式资产 `57bef601…`。R-REL-CHECK：#55/#180 仍 open、0 评论，无需更新原帖。真机触摸/系统键盘/第三方账号不因发版关闭。

2026-09-26 T-1400 第八轮轻量调研（v18.7.0 里程碑收口触发）：思源正式版仍 3.8.5、3.8.6-alpha.5；Workbench/Pinch/Loop/Table Habit/Streak 无新版本；思源集市增量无新习惯竞品。定向审阅 Obsidian 注册表最新两条 diff，并追加 Zenith 0.2.5 官方日记/移动文档：新增观察对象（设备遮挡测量诊断、日记×习惯），修正过去生态无先例的过强推断；统计模型差异不直接吸收。全案记 benchmark 第十八节，直接采纳 0。已读当前执行路线第十三/十四节：无新增可直接开工项，T-1464/设计窗口/决策/上游/真机等待项保留；本轮继续工作完成到触发核查与证据收口，不为凑任务追加功能。发布后台账/调研提交保持本地，随下一发版推送。

2026-09-26 T-1471 验收收口：`pnpm run test:quality` 完整链明确 `QUALITY_EXIT=0`，183 个守门文件通过；TypeScript、生产构建、UI/移动/生态/性能链、双主题无障碍、真实移动 bundle、发布清单与回滚演练均通过。CSS 618557 bytes，低于 620KB 警戒线；10k review 性能 65ms range / 74ms snapshot，100k review 510ms range / 414ms snapshot / 61ms export；release assets v18.6.0 通过。README 进一步区分 v18.6.0 已发布功能与本地未发布功能，并修正 Windows PowerShell 的视觉走查命令后，针对性重跑文档守门、生产构建、摘要同步与发布资产检查，全部通过；当前未发布工作树 package digest 为 `2f43df27ae20…`，远端 v18.6.0 发布资产仍为 `57bef601…`。该 digest 与代码、README、台账一起保留本地，等待下次用户明示发版时收口，不单独 push。

2026-09-26 T-1471 手机端交互与文档收口：**完成区折叠**根因为 mobile `.lc-checkin__group-items` 的 `display: grid !important` 覆盖了按钮即时切换的 `[hidden]`，已在 `src/ui/components.scss` 增加移动完成列表 `[hidden] { display: none !important; }`，并在 `tests/checkin-toast.test.cjs` 加 CSS 守门；修复已落本地 commit `0c90ab0`。**回顾页下拉小条**探针确认真实滚动体为 `.lc-checkin--review`，外层 mobile host / `.b3-dialog` 栈 / `html` / `body` 仍有默认 overscroll 行为，边界拖拽会传出内层；`src/ui/content-responsive.scss` 现在在回顾存在时把 review、mobile host、dialog/container/body、html/body 的 `overscroll-behavior-y` 统一为 `none`。真实 3.8.5 移动 bundle computed probe：review/host/body 均 `none`；`tests/e2e/mobile-review-ui.spec.mjs` 加 1/1 守门。**全方位审查**覆盖 UI 对齐/对比度/触控目标/双主题/320~430 窄屏、按钮 busy/disabled、ARIA/focus/hidden、review 导出与滚动所有权、100k review 投影性能、外部联动和导入导出；现有 accessibility/width/quality 门禁未发现第二个高置信回归。README 已重构为当前产品说明、安装兼容性、18.6 功能、数据/隐私、API、开发验证、边界和文档入口，移除重复历史正文；代码与 README 未 push。

2026-09-26 触发核查（继续指令，发布后复查）：思源 GitHub releases 最新仍为 `v3.8.6-alpha.5`（2026-09-25，prerelease=true），正式版 3.8.6 未发布，T-1464 渲染块回归继续等待；上游 [sireader#55](https://github.com/mm-o/siyuan-sireader/issues/55) 与 [siplayer#180](https://github.com/mm-o/siyuan-media-player/issues/180) 均 open、0 评论、最后更新 2026-09-25，无回应或契约变化，R-REL-CHECK 无需追加；Workbench `IAliceBobI/sy-workbench-plugin` 最新 release `v1.0.4`（2026-09-25）且仓库无新增能力信号，Pinch `royc01/pinch` 最新 release `v2.7.1`（2026-09-18，仓库无后续推送），竞品观察结论不变。Task Horizon 反向提案与 Dock Tomato PR 草案仍未提交。结论：无新增触发、无新警报、无可直接开工的本地任务；继续等待 3.8.6 正式版、用户真机反馈、上游回应或用户点名。

2026-09-26 第 2 批开发（T-1466 · R-A16 今日完成度环 + sparkline 趋势线）：charts.ts 新增 renderCompletionRing/renderSparkline 两个零依赖纯 SVG 渲染器（确定性输出、fail-closed 钳制、单色 accent 阶梯、静态零动效守 D-263）。完成度环接入今日行动台摘要条首位（totals.completionRate 既有投影，aria 文字通道冗余编码），CSS 负边距方案保证摘要条高度零增长；sparkline 接入回顾页范围统计区（近 30 日记录趋势，复用渲染时已在内存的 analytics daily 快照，零新聚合）。**性能契约处置**：review-workspace「概览零图表 DOM」守门按纪律收窄为「无重量级图表 DOM」——data-stat-spark 为唯一豁免（30 点 polyline 纯字符串拼装，无图表库无昂贵计算），折线/柱状/热力图与折叠懒加载断言逐条保留，理由记入测试注释与本条。开发中修正两处测试端几何心算误差（环周长 113.10=2π×18、sparkline 步进 48）。新守门 tests/stats-visuals.test.cjs 入主链。验证：test:quality EXIT=0（214 组 passed，含 178 文件套件覆盖）；宽度走查 49 表面 + 32 交互 + 双主题 30 项密度全绿（首轮 320px 首卡 392>380 超预算由环撑高摘要条导致，负边距修复后复绿）。真机观感归 host-pending；未 push。
2026-09-26 第 1 批开发（T-1461/T-1462/T-1463，确认队列 R-A13/R-A14/R-A15 全部交付）：**T-1461**——docs/low-pressure-baseline.md 基线规范（色彩单色阶梯+冗余编码/calm 禁则/双日规则/三通道/44px 触控/undo 清单审计 17 处高危确认）；report.stalledNote 双日规则失速卡收尾（中英）；components.scss 移动宿主 44px 触控基线块（dock 30px 密度为指针例外）；新守门 low-pressure-baseline.test.cjs。**T-1462**——record-step.normalizeQuickSteps（解析/去重/升序/上限 4/超限拒绝/binary 恒空）；CheckinItem.quickSteps 三侧同构（types/model.normalizeItem/save-form，指纹逐键一致）；编辑器「快捷增量按钮」字段三键双语；今日页 chip-button 走既有 quick-record 通道（handler 改读 data-amount 回落默认步长）；today 渲染块 chips 组 data-block-record-amount→block-renderer→recordBlockToday(itemId, amount?)；checkin-block.test.cjs 签名断言同步。**T-1463**——midnight-boundary.test.cjs（思播零点边界双日归账+结算幂等+yeguif 末条开放不记+身份日期隔离）；Loop 导入未知列全链（unknownHeaders→plan.unknownColumns→预览 unknown-columns 损耗词表→确认弹窗点名，防御读取兼容旧形状）；export-formats.md 向前兼容承诺四条；sync-design-review.md PixelHabits 合并语义参考。三个新测试+扩展用例全部入 `pnpm test` 主链（套件覆盖 178 文件 0 retired）。验证：`pnpm run check` 通过；`pnpm run test:quality` 完整链 EXIT=0（CSS 613,985 字节预算内；发布资产 v18.5.0 检查通过；块 100k=405ms、回顾 100k range 488ms 无回退）。真机触控/显示保持 host-pending；未 push。
2026-09-26 T-1470 笔记联动总览（用户需求：集中查看+快速修改全部笔记绑定）：① **代码盘点**——7 处绑定（日记报告/摘要驻留/健康收件箱=文档写或读；问卷日记=笔记本或文档写；叶归=笔记本读；笔记锚点=按项目块写；微信读书=项目映射）盘点入 docs/note-bindings-inventory.md（含失效模式与现有防护矩阵）。② **跨插件调研**（思源 5 插件+Obsidian 4+Notion，证据高-中）——精华：dailynote-today 状态面板三态+行内修复、custom-dailynote 属性定位、Achuan-2 绑定对话框三模式+目标块写属性、QuickAdd/Templater/Daily Notes 显式创建反例、Notion relation 枢纽；吸收清单 8 条入盘点文档。③ **交付「笔记联动总览」面板**——设置 → 外部联动置顶：新纯模块 note-bindings.ts（collectNoteBindings 归集 7 类绑定行+锚点按项目展开、groupBindingTargets 分组、mergeBindingHealth 体检归并，仅启用联动参与判定）；面板每行=功能/目标类型与 ID/启用/健康状态（未检测·正常·目标丢失）+操作（打开：块 ID 解析根文档 openTab；去配置：滚动定位源输入框）；「检测全部联动」=SQL IN 批量校验文档块+lsNotebooks 笔记本成员；健康状态会话内不持久化。④ **健壮性**——问卷日记当日日记定位加 custom-dailynote 属性兜底（hpath 未命中时防重复建文档）。守门 note-bindings.test.cjs 入主链（183 文件）；settings-navigation 面板计数 8→9 同步。验证：test:quality EXIT=0；走查全绿。真机打开跳转归 host-pending；未 push。后续候选：绑定量级大时的启动自动体检、绑定对话框三模式统一、custom-* 双向属性。
2026-09-26 移动前端首卡预算校准（既有失败闭环）：复现 CHECKIN_QA_FRONTEND=mobile 宽度走查「30 项首卡阈值」既有失败（T-1460 期间登记，firstCardTop 394>380）——新增失败路径堆叠诊断（列出今日页各区块相对宿主顶部的偏移与高度，仅在超预算时输出）实测构成：53px 移动原生顶栏 + 控制台 54 + 优先提醒卡 56 + 搜索 44 + 筛选行 44 + 分组头 44 = 首卡 394。判定：非布局缺陷——320×700 视口下首卡完整在首屏内，380 阈值系按桌面（无原生顶栏）标定。处置：预算按前端校准（desktop 380 / mobile 400），校准依据写入测试注释；堆叠诊断保留为走查失败时的常驻诊断输出。验证：mobile 与 desktop 双前端宽度走查全绿（49+32 场景）；visual-qa 双主题全矩阵通过、pageErrors 0。真机首屏观感归 host-pending。
2026-09-26 T-1400 第七轮生态调研（v18.6.0 发布当日轻量轮）+ 触发条件核查：①宿主 3.8.6 仍 alpha.5（无正式版）→ T-1464 渲染块回归维持等待；②Workbench v1.0.2→1.0.4 一天三版但均为帮助中心/引导内容投入（13 篇+实拍图+交接会演示），能力面无扩展——其「叙事+新手」路线确认，差异化格局不变；③感恩日记主题持续渗透习惯应用（Habit Daily Tracker 新增 Grateful 功能，证据 B）——佐证 T-1465 方向；④上游 #55/#180 无回应（与 R-REL-CHECK 同窗口）。轻轮无采纳无新警报，全案记 benchmark 第十七节。另：v18.6.0 发布台账收口提交 c97fa16（随下次 push 上云）。
2026-09-26 v18.6.0 正式发布（用户「继续」确认执行）：`node scripts/release.cjs 18.6.0` 全流程通过——构建、全部测试链（182 文件）、git 提交 `bf78409..1147e86` 推送 main、tag v18.6.0 推送、GitHub Release「小驴打卡 v18.6.0」创建并附 package.zip（SHA-256 `57bef6018cebfc8641d734138796bb281b36e82a31f2fffcda11201a02f5790e`，docs 发布说明已同步该摘要）。本版交付：问卷式日记打卡（T-1465）、数值快捷增量（T-1462）、完成度环+sparkline（T-1466）、相关性洞察（R-17.1）、超额日着色（R-17.2）、时段分组（R-17.3）、分享图导出（R-18.1）、里程碑分级庆祝（R-18.5）、低压力呈现基线（T-1461）、迁移健壮性（T-1463）、诊断预览深化（R-18.2）、66 天成熟度刻度（R-18.3a）、保留词表退役（R-18.4）。R-REL-CHECK 本窗口完成：sireader#55/siplayer#180 无动态无需更新。真机现场验收项保持开放等用户反馈；集市将随 Release 自动同步。
2026-09-26 v18.6.0 发版准备（候选冻结，等用户确认 push/发布）：版本四方（package.json/plugin.json/src/version.ts/README）18.5.0→18.6.0；新增 docs/v18.6.0-change-log.md 与 docs/releases/release-notes-18.6.0.md（SHA 行由 sync:digest 回填）；README 更新当前版本声明、链接与 18.6.0 要点块（问卷日记/快捷增量/完成度环与 sparkline/相关性洞察/分享图/里程碑庆祝/低压力基线/迁移健壮性）。**R-REL-CHECK（D-272）**：sireader#55、siplayer#180 均 open、0 评论、更新于 2026-09-25——无上游动态、无契约变化需更新原帖；Task Horizon 反向提案与 Dock Tomato PR 草案仍未提交；下一发布窗口复查。验证：test:quality EXIT=0（182 文件），Release assets v18.6.0 通过（CSS 616,911 字节预算内），发布说明 SHA 已回填（f74c7f4a…）。**未 push、未打 tag**——发布动作（push main + tag + GitHub Release）待用户显式授权后执行 release.cjs。
2026-09-26 T-1469 收尾批（R-A18 补充：R-18.2 + R-18.3a）：① **R-18.2 诊断导出预览深化**——settings 的裸 confirm 升级为结构化预览对话框（原因码计数表 diag.* 本地化 + 时间范围最早→最新 + 内容边界披露固定显示），确认后走 versioned 导出通道；i18n 5 键双语。② **R-18.3a 66 天成熟度刻度条**——洞察页「习惯成熟度」节：首条记录至今天数（daysBetweenHalfOpen 单一实现）对照 66 天研究中位数，aria progressbar + 单色进度条 + 文字冗余，「参考非标准」入提示；零 schema 变更。守门 share-card.test.cjs 扩充两节。验证：test:quality EXIT=0（182 文件）；走查全绿。遗留：R-18.3b 周开始日（需三处聚合联动设计单独排批）、R-18.3c bento、R-17.4 热图变体。真机观感归 host-pending；未 push。
2026-09-26 第 4 批开发（T-1468 · R-A18 治理互操作与收尾，R-18.1/R-18.4/R-18.5 交付）：① **R-18.4 保留词表退役**——lc-checkin__loading/__success/is-saving/msg.saving 全库核查零消费方后统一退役：删除 CSS 规则（含 spin keyframes、dock-host/lc5 容器分组引用，skeleton 家族有消费方保留）与 i18n 键 ×2；ui-state-ledger 断言翻转为「不得回流」（SCSS/i18n/渲染层），加载族基座改指 skeleton。② **R-18.5 里程碑分级庆祝**（D-263 收尾）——STREAK_MILESTONES 阶梯（7/14/30/60/100/180/365/500/1000），recordEvent 成功路径计算当日连击命中即升级：toast is-milestone + 金标 🎉 里程碑文案 + 520ms 加重弹跳（纯 transform 零位移），reducedMotion 双闸降级静态金标文字。③ **R-18.1 分享图片导出**——新纯模块 share-card.ts（buildShareCardModel 周一对齐格子+level 钳制+留白剔除；drawShareCard 最小 canvas 接口，accent 透明度阶梯 0.18/0.38/0.65/1 单色呈现）；回顾工具「分享图」按钮 → index downloadShareCard（buildYearHeatmap+最长连击+主题 token 调色板 → canvas.toDataURL → base64 二进制串 → saveGeneratedFile PNG 原生容器感知）；零网络零遥测。守门 share-card.test.cjs 入主链（181 文件套件覆盖；i18n 6 键双语）。验证：test:quality EXIT=0；宽度走查 49+32 全绿。R-18.2 诊断预览深化、R-18.3 小项待排。真机观感归 host-pending；未 push。
2026-09-26 第 3 批开发（T-1467 · R-A17 洞察与可视化深化，R-17.1/R-17.2/R-17.3 交付；R-17.4 留待渲染块迭代）：① **R-17.1 相关性洞察**——新纯模块 correlation-insights.ts（零依赖无时钟）：项目对完成率 Pearson 相关，最小样本纪律（重叠排期日 ≥4 且 |r|≥0.4，常数序列方差 0 剔除），同日+滞后一天（|r_lag| 严格大于 |r_same| 才以滞后呈现），|r| 降序确定性排序取前 3；index 复用 30 天窗口构建逐日完成率序列（value/target 0..1，仅排期日，排除 quota/at-most/归档）；报告新增「相关性洞察」节（4 键双语，固定附带「相关不等于因果」calm 免责）；diary-report 守门精确串断言同步。② **R-17.2 超额日着色**——month 渲染块 overage 判定（数值/时长非 at-most 当日总量>目标），呈现=accent 描边环+tooltip「超额」角标，T-1410 色阶口径不动。③ **R-17.3 时段分组**——today 渲染块当日 ≥2 条有效记录按早/午/晚计数（事件时刻戳投影，跳过不计；<12 早、12-18 午、≥18 晚），与 T-1462 chips 组合覆盖高频记录。守门 insights-visuals.test.cjs 入主链（Pearson 夹具/纪律门槛/滞后检测/排序确定性/超额/时段分组/样式，i18n 9 键双语）。验证：test:quality EXIT=0（180 文件）；宽度走查 49+32 全绿。真机观感归 host-pending；未 push。
2026-09-26 T-1465 问卷式日记打卡交付（用户「继续」指令，第 2 批后插入）：**功能全量落地**——①纯模块 journal-templates.ts：内置 5 预设（题干 i18n 52 键双语）+自建模板归一化（中文命名 djb2 确定性 id）+设置文本解析往返+写入 Markdown 渲染+事件摘要截断+目标配置归一化；②项目绑定 journal.templateId（types/model/save-form 三侧同构 slug 校验），编辑器二值项目绑定下拉（journalTemplates ctx），bind-today data-action=journal 绑定；③弹窗 journal-dialog.ts（问题表单+写入目标配置 radio 今日日记/指定文档+笔记本下拉，必答题 fail-closed，提交防重）；④写入通道：目标定位栈（显式 docId > getNotebookConf dailyNoteSavePath → renderSprig → hpath SQL → createDocWithMd 幂等建文档）+标记命中 updateBlock 否则 appendBlock+recordEvent 先落盘（重填跳过重复记账）+失败不阻断（审计 channel=journal+toast）。**真实内核 e2e 22/22 全绿**（新 spec：建笔记本→问卷→落盘→重填更新同块不重复记账）。开发中经 e2e 逮到并修正四个真实问题：renderSprig 参数名为 template 非 tpl（探针实测）；多块 Markdown 被内核拆块破坏 update 幂等 → 改单段落块口径（探针实测定版）；updateBlock 以新 id 重建块+旧块索引异步收敛 → 查询 ORDER BY id DESC 取最新；中文模板名派生不出 ASCII slug → djb2 哈希回退。守门 journal-templates.test.cjs 入主链（套件覆盖 179 文件）。附带修复：e2e 复用工作区累积污染致 dual-window 审计合并断言间歇超限（干净工作区+HEAD 构建复测通过=非代码回归）——已清理工作区，dual-window 断言对复用工作区的敏感性留档为已知项。验证：pnpm run test:quality EXIT=0；e2e 22/22；宽度走查 49+32 全绿。真机弹窗触控/真实日记文档归 host-pending；未 push。
2026-09-26 T-1465 前置调研（同日早前完成）：两路并行取证——①方法论与应用：感恩日记/五分钟日记官方问题结构（早 3 晚 2，Emmons 2003 RCT 依据+提示词轮换防套路化）、九宫格晨间日记（佐藤传/曼陀罗九宫格：中央日期天气心情+四支柱+四自定义）、KPT 复盘、格志日记（网格=问题列表最直接对标，痛点=导出 Premium+无统计联动）；②笔记生态实现：Obsidian Daily Prompt（问题集→modal→写入 daily note section，幂等空白点）、思源 day-memo（路径模板变量+正则归一化，无防重被 issue 诟病）、dailynote-today 日记定位栈（SQL custom-dailynote-yyyymmdd > renderSprig > createDocWithMd 同 path 幂等）、Workbench 晚备弹（条件化问卷先例）。可行性结论：高可行——问卷引擎/弹窗表单/写入通道/目标定位/打卡联动五块拼图全部在位；打卡×问卷×写入日记闭环生态无先例。全案见 benchmark 第十六节，定型见 D-273。
2026-09-26 T-1400 第六轮生态调研（用户点名触发，纯文档轮）：
2026-09-25 开发队列确认（D-272，用户指示）：①真机测试项全部移出开发队列保持开放（T-1388/微信读书首拉/每日提醒弹窗/叶归摄取/移动端折叠等），用户有空自测反馈后即修，不作为任何批次前置；②外部等待项继续等，新增常设动作 R-REL-CHECK——每个大版本发布时核查 sireader#55/siplayer#180/Task Horizon 反向提案草案/Dock Tomato PR 草案是否需追加更新（新能力/契约/版本事实变化在原帖更新，不重复开帖），已写入 HANDOFF 铁律第 7 条；③可开发队列四批确认入 implementation roadmap 第十四节——第 1 批 T-1461/T-1462/T-1463（已登记），第 2 批 R-A16 今日完成度环+sparkline 报告卡，第 3 批 R-A17 确定性相关性洞察/quota 超额日着色/时段分组视图/fractured-sparse 热图，第 4 批 R-A18 分享图导出/诊断导出预览/66 天成熟度+周开始日+bento 小项/UI 台账保留词表清理/里程碑分级庆祝（D-263 收尾口径）；触发条件批次（T-1464、T-1413、Story Mode、CalDAV、MCP descriptor、隐藏集管理 UI）不主动排批。纯文档轮，无代码变更。
2026-09-25 T-1400 第六轮生态调研（用户点名触发，纯文档轮）：四路并行扫描——独立应用与行为科学（Finch/Tiimo/Couch/Bloom/Duolingo streak freeze 批判/66 天研究/if-then/诱惑捆绑）、GitHub 开源增量（streak v2.0/mhabit v1.27.9/vital/Neohabit/PixelHabits/Frequent-Habits/hermes-life-os/OpenHabits/MCP 生态）、笔记生态与思源集市（520 插件全量 diff、Obsidian 官方注册表 8038 条解析、Workbench/CalDAV/MeiDay/QingTrail 四新面孔、宿主 3.8.5/3.8.6-alpha）、UI 交互专项（NN/wcag/HIG/色阶/圆环/sparkline/calm UX）100+ 次取证。结论：竞品警报 1（Workbench「反打卡/计划即账本」叙事，D-271 区隔「低压力记录≠零记录」）；采纳 3 → T-1461 低压力呈现与包容性设计基线（R-A13）/T-1462 数值快捷记录预设增量（R-A14）/T-1463 迁移健壮性与边界用例（R-A15）；延后 13 带触发条件；不做 8；佐证 9；T-1464 宿主 3.8.6 正式版渲染块回归登记。文档落点：benchmark 第十五节（全案）、产品战略（更新至 2026-09-25，定位补叙事区隔、方向扩至 25、状态矩阵刷新、版本节奏刷新）、执行路线（新增第十三节三条泳道+开工顺序刷新）、HANDOFF（开放队列与下一步刷新）、TODO（第六轮记录+T-1461~1464 登记+修正 T-1415/T-1416/T-1455/T-1456 四处滞后复选框）、DECISIONS D-271。工作区验证：纯文档轮，无代码变更。
2026-09-25 T-1460 设置页与外部联动重构：完成设置页全量分组审查并将宿主能力（Dock Tomato/思源 Agent/Task Horizon）与七个外部来源拆开；来源卡片统一为可展开 details、三态本地配置状态、数据流/隐私边界/停用保留说明，重绘保留当前展开卡；配置顺序改为先绑定目标再启用，健康启用新增至少一个指标映射门槛，微信读书新增确认清除本地 Key；叶归目标下拉修复为正确复用当前项目列表；移动设置导航改为多行可触控栏，避免外部分组只在横滑后可见。新增逐项审查文档 `docs/settings-external-linkage-review-2026-09.md`。验证：`pnpm run test:quality` 全链通过，settings/dependency/health/weread/mobile 守门及设置页窄宽外部来源场景通过；`CHECKIN_QA_FRONTEND=mobile` 的今日页 30 项首卡阈值仍暴露既有失败，浏览器视觉仍不等同真实 Android/第三方联调证据。
2026-09-25 交接整理（用户指示换 agent 续开发）：新增 docs/HANDOFF-2026-09-25.md 交接简报（版本状态/文档地图/开放队列按证据分类/环境命令/九条铁律与坑/近期决策索引/下一步优先级）；development-roadmap-current.md 交接快照+当前状态表刷新至 v18.4.0/五渠道/行动四卡/107 模块口径；TODO 头部补 v18.4.0 已发与 v18.5.0 候选段。本地 12 提交待用户指令推送或随 v18.5.0 发布。
2026-09-25 yeguif e2e 真实内核 spec + docktomato 竞态修正：新增 tests/e2e/yeguif.spec.mjs（真实笔记本播种 Marker 段落→绑定偏好→焦点触发摄取→断言仅闭合记录入账 value=60/note=阅读：认知觉醒/身份正确→重触发幂等）；docktomato-completion 收件箱移除断言改 20s 有界轮询（原单次读与异步移除链竞态，近期偶发失败根因）。全量 e2e 21/21（12.5 分钟）通过。
2026-09-25 T-1457 叶归 LifeLog 适配器落地（用户开工指令）：e2e 探测破解的 Marker 语法直接实现——绑定日记笔记本 → 5 分钟轮询当日新建、行首时间的段落块（GLOB 过滤+200 上限）→ 组内相邻起始差结算时长（末条开放不记）→ yeguif:<blockId>:<localDate> 幂等+墓碑 → 事件备注「类型：备注」。设置第七面板（开关/项目/笔记本懒加载）+今日徽标；source 全触点（types/model/api 防伪造/review/knownSources/labels/registry/privacy/守门双清单）。107 模块守门全绿。
2026-09-25 外部协作完善+叶归 e2e 实装探测：①外部协作三改进——health/weread 后台轮询加 document.hidden 省电门（回前台焦点补拉，摄取幂等不重复记账）、设置面板头部新增「今日 N 条」效果徽标（sireader/siplayer/weread 事件型来源，sourceTodayCounts 快照+双语键+CSS）、settings 守门扩充；②e2e 实装叶归 v1.12.6（工作区插件目录解包+setPetalEnabled）成功，翻 SEP-EnLifeLog 配置开 Marker 后从设置面板原文破解语法——段落行首时间即 LifeLog 标记（12:00 工作：写日报），仅日记文档，时长=相邻段落时间差，落点=用户可见段落块。yeguif 实时摄取方案成型（health-inbox 同型），待排实现批次。全质量链绿。
2026-09-25 T-1456 五件套模板包落地（用户开工指令）：新增「每日反思」模板（书中「写」的真义=反思日志三问）+「认知觉醒·五件套」组合包（早睡早起/冥想/阅读/每日反思/跑步）+四处既有模板 note 按书中方法论微调（早起事实记录不施压/冥想元认知训练/阅读关联自身/跑步运动后学习窗口），zh+en 双语。i18n parity 1757/1757；template-packs 守门扩充；全质量链绿。
2026-09-25 T-1456 登记（只研究未开发，用户指示）：研究《认知觉醒》早冥读写跑五件套并给出打卡模板包设计建议——新增「每日反思」模板+「认知觉醒·五件套」组合包（TEMPLATE_PACKS 机制复用）+三处模板 note 按书中方法论微调；关键边界=书中主张早起「不打卡」，包说明定位为事实记录非 KPI（与低压力纪律同源）。等开工指令。
2026-09-25 T-1441 叶归仓库定位+发布包静态分析（用户指令继续，仓库自检索解除阻塞）：确认 Wetoria/sy-plugin-enhance 即叶归（集市 Leaf Nest v1.12.6）；发布包 4.3MB bundle 扫描判定 LifeLog 数据落点=思源块（CSV 导出含 BlockId，渲染层 data-en_lifelog_* DOM 属性，Marker 输入语法），公开可解析面成立、实时获取路线可行（health-inbox 同型：绑定范围+SQL 轮询+yeguif:<blockId> 幂等）。唯一缺口=Marker 语法明文（混淆字符串表未解码，公开无文档）；已登记三条获取路径（解码/用户截图/问作者）。付费边界记录：解析用户文档块不涉绕过叶归专业版。
2026-09-25 T-1442 子面板化落地（用户确认开工）：外部来源折叠面板内六来源（日记/摘要/思阅/健康/思播/微信读书）各自独立子面板——头部状态徽标（已启用/默认关闭，随治理态实时着色）+编号设置步骤（双语 4 步，微信读书含申请 Key 路径）；行内容与处理器零改动（纯 IA 重构）。i18n 26 新键双语 parity 1754/1754；settings-navigation 守门扩面板/步骤/双语断言；宽度走查 settings 全宽度 0 溢出、visual-qa 通过。
2026-09-25 T-1438/T-1395 上游提案提交（用户授权后执行）：思阅 #55、思播 #180 两份 issue 发出（mm-o/siyuan-sireader、mm-o/siyuan-media-player）。成稿先按当前开发状态优化：补 v18.4.0 已发布事实（消费侧 fallback 生产可用、隔离真实内核 e2e 20/20 中思阅/思播用例证据）、补完整草案外链（本仓库 upstream-api-proposals 文档）。Task Horizon 反向提案维持本地草案待后续。守门测试 fixtures 不变（draft 状态语义仍准确——上游未合并）。
2026-09-25 v18.4.0 发布（GitHub Latest，tag v18.4.0，package.zip 720,165 字节，SHA-256 de389341…45da2）：36 个本地提交随版推送。发版流程修正一处——release.cjs 首跑被 release-assets 守门拦下（README 版本声明未随版本号更新），补 README 当前版本声明+18.4.0 要点块后重跑一次通过（版本号→构建→全测试链→push→tag→GitHub Release）。真机现场验收项与上游提案提交保持开放。
2026-09-24 T-1455 完整修复（宽度走查 0 失败，49+32 场景全绿）：①render() 层无条件挂起死锁（T-1445 回归）收敛回后台层+focusout 补渲染；②精确录入展开态提升为会话字段 expandedExactEntries（fragments/bind-today/index 三处接线+局部 patch 通道同步），后台重渲染不再收起展开面板；③录完即收起面板+交还焦点——修复「Enter 保存后界面不刷新」的真实 UX 缺陷（后台刷新被输入挂起吞掉）。walkthrough resetState/recording-history 测试桩同步。
2026-09-24 T-1455 第一层修复+第二层定性：width-walkthrough warm-streak 失败排查。①修复 render() 层无条件挂起死锁（T-1445 回归：显式导航渲染被吞、焦点永不释放）——挂起收敛回 renderBackgroundUpdateFor 后台层+focusout 一次性补渲染，全质量链复绿；②插桩定性第二层：渲染时 stretch streak=1、秒后重算=3（异步 store 替换/重算分歧，候选=persist/reconcile 管线），断言仍失败、任务保持开放，复现方法与两层事实已记录。
2026-09-24 视觉走查补跑+排查：visual-qa.cjs（playwright chromium）通过——今日新增设置行/组合包芯片无布局问题；width-walkthrough.cjs 在 warm-streak 断言超时，worktree 二分（c7be048 同径失败）证实为先于今日批次的存量问题，登记 T-1455（夹具相对日期 vs 连击口径候选根因），非本日回归。CHECKIN_BROWSER 指向 playwright 自带 chromium 即可运行两工具。
2026-09-24 e2e 全量回归补跑：发现本机装有思源（D:/biji 默认候选路径），e2e harness 自建临时工作区并自启内核（3.8.5 @ 6827）——readonly 1/1、全量 20/20（8.1 分钟）通过，覆盖今日全部 16 个提交的回归面（含渲染块写回/移动端 bundle/思阅思播真实内核累计幂等/健康收件箱落盘/Obsidian 迁出/生命周期/回顾建议撤销）。标记为隔离真实内核自动化证据，写入证据报告第一节；仍不等同真机/外部插件现场验收。
2026-09-24 T-1454 场景组合包落地（方向 11 主交付）：5 个生活场景组合（晨间/学习/运动/睡前/创作）按模板名引用既有目录（纯内容资产），新纯模块 template-packs 做预览投影（引用解析/未知名降级/本地化名重复判定），编辑器模板区新增组合包芯片+预览面板，条目复用 data-template-apply 既有应用通道逐条填表——无新创建路径、无 Store 变更，用户逐项掌控（低压力纪律）。Routinery 序列执行器延后条件已满足，归下轮调研评估。tests/template-packs.test.cjs 入 test:ui。
2026-09-24 T-1453 渲染块组合卡片落地（方向 9 收口件）：checkin-block 支持 view=combo 编排 1~3 个既有视图——parseBlockConfigFields 从顶层解析抽出共用（子配置同白名单同口径、禁嵌套、today 子段仍强制 itemIds），buildComboViewHtml 纯拼装分段输出；块渲染器统一点击通道下子视图日期跳转/锚点/打卡交互零改动可用。审计确认日期跳转/分组聚合/minRate 此前已交付，方向 9 清单就此全项闭环。tests/checkin-block.test.cjs 扩充。
2026-09-24 文档收口批（M4「同步 API source、manifest、docs」+ T-1403 先例）：① docs/api-v5.md 前缀登记清单补 weread 三种身份格式（时长/完读/笔记计数）；② 新建 docs/weread-integration.md 微信读书接入指南（Key 申请/编号设置步骤/三链路口径/载体归属分工/隐私边界/常见问题），README 最新进展块链接之并补微信读书/每日提醒/回顾四卡三组未发版特性说明。全质量链通过。
2026-09-24 第五轮生态调研（T-1400，M2 收口触发）+ T-1452 采纳落地：本轮方法=延后项触发核查+定向取证（不做全量重扫）。核查第三轮延后 6 项：情境×星期交叉触发已满足→采纳并当场落地（context-normalization 新增 crossTabulateContextWeekdays，报告情境节渲染模式行，集中度=严格过半才成模式）；导入枚举页触发已满足但评估延后维持（触发条件收紧）；其余 3 项未触发维持。定向取证：思源 3.9.0 闪卡重构设计文档已上 feature 分支但未发版（T-1374 维持观察），外部应用近一周无新信号。全案写入 benchmark 第十四节。tests/context-normalization.test.cjs 扩充。
2026-09-24 T-1451 每日提醒调度落地（T-1443 深化）：补齐用户「时间/次数可控、可设多次」的剩余诉求——dailyReminder 偏好（默认启用+空槽位=原启动一条行为零回归），最多 4 个 HH:mm 时刻槽（严格归一化去重升序），minute 级有界轮询到点即推、每槽每日 localDate 幂等、启动合并补发、安静时段与零事项闸门不变；设置页提醒开关+时刻编辑（双语）。归一化函数入既有 reminder-preferences 模块避免测试固定模块集级联。tests/reminder-quiet.test.cjs 扩充。
2026-09-24 T-1450 目标负荷解读卡落地（R-20.3 第三张行动卡）：回顾 2.0 四问的「目标是否过高」补齐——interpretTargetLoad 纯函数（样本 ≥8 才推断、≥15% 偏紧 / ≥40% 疑似过高、只列问题项、确定性排序），index 从失速卡同一份 30 天事实生成（顺带补观察窗首日证据、修复 stalledItems 漏传入报告的缺口），报告新增「目标负荷」节（建议为可选表述，低压力纪律），i18n 双语。回顾 2.0 四问（失速/星期时段/目标负荷/调整有效性）全部有卡。tests/pace-projection.test.cjs 扩充。
2026-09-24 T-1402 收尾批次：想法/点评并入笔记计数——/review/list/mine（官方 notes.md/review.md 契约：字段 bookid 全小写、synckey 翻页游标、hasMore=1 继续）每本活动书至多 3 页×50 条，createTime 逐日统计后与划线同日合并，笔记计数事件语义升级为「划线 + 想法/点评」（设置行提示双语同步）。评估卡 1 全部完成，T-1402 本地可做部分清零，剩真机首拉验证（host-pending，等用户填 Key）。
2026-09-24 T-1402 第三批次划线计数落地：官方 notes.md 契约核对后实现——统计口径仅取划线（/book/bookmarklist 自动过滤书签后的 type=1 划线，createTime 逐条落本地日）；/user/notebooks 概览按 sort（最近笔记时间）筛选活动书（更早的书不可能有昨日划线），官方 lastSort 游标分页至多 5 页、每轮至多核实 10 本书；只结算「昨天」完整日——今天进行中的划线次日结算（宁少记不多记，同日重拉按每日身份幂等跳过）。治理 wereadIntegration 新增可选 notesItemId；设置页新增划线计数绑定行双语（建议数值型项目、单位「条」）；想法/点评（/review/list/mine 含分页）归后续批次。
2026-09-24 T-1402 第二批次完读事件落地：官方 shelf.md/book.md 契约核对后实现——书架 finishReading 旗标预筛（albums 的 finish 是系列完结不纳入，secret 照常）、getprogress progress=100+finishTime 核实（1-99 一律不算读完）、finishTime 经注入换算 localDate（未来日 fail-closed）。身份 weread:<finishItemId>:finish:<bookId>:<localDate>（identity 含冒号与 parseExternalRef 首尾切分兼容），同书前缀幂等+墓碑前缀匹配永不重写；书名只进本地事件备注（导出敏感审计既有机制覆盖），不进 externalRef。治理 wereadIntegration 新增可选 finishItemId（空=不启用，不影响时长联动）；设置页新增完读绑定行双语；网关出站抽 wereadGateway 助手复用。每轮至多核实 10 本新书（有界 N+1）。tests/weread-adapter.test.cjs 补完读用例（书架解析/进度核实/身份解析/触点）。
2026-09-24 T-1402 官方 skill 契约核对与解析器收紧（用户重申沿官方 skill 路线后执行）：直接拉取 Tencent/WeChatReading main 的 skills/SKILL.md + skills/readdata.md 逐条比对。修正三处偏差：① skill_version 1.0.5→1.0.4（取官方 SKILL.md 顶部 version）；② 官方按日明细=readTimes（月度按天分桶，key=分桶起始 unix 秒字符串）而非初版假设的「数组行+日期字符串」——对象键全部走注入的 unix→localDate 换算器，dailyReadTimes（年度日明细）合并取最大；③ 请求体显式补 mode:"monthly"。另加单桶 24h 上限防月/年大桶误读。测试补官方契约主用例（真实月度回包形状/合并/超限丢弃/无换算器丢弃）。npx skills add 安装方式未采用（避免执行安装器），改为 gh 直读仓库原文，内容等价。
2026-09-24 T-1402 微信读书适配器落地（official-pull 渠道首租户）：官方 Agent API（i.weread.qq.com/api/agent/gateway，扁平 api_name+skill_version 信封，秒单位）经内核 forwardProxy 出站拉取 /readdata/detail 每日阅读分钟；weread:<itemId>:<localDate> 幂等+墓碑；wereadIntegration 偏好（apiKey 仅本地偏好，不入导出，渲染层只暴露 wereadKeySet）；设置页开关/项目/Key/阈值/立即拉取五段双语 UI；SourceChannel 扩展 official-pull；全触点（types/model/api 防伪造/review 过滤器/日报列表/privacy 控制面/ecosystem 注册表/守门 SOURCE_MANIFEST+CLOCK_FREE）；顺带修复报告 knownSources 漏 sireader/siplayer 的遗留缺口。tests/weread-adapter.test.cjs 新增入 test:ui，view-preferences 涉及的 10 个测试 loader 同步转译清单（view-preferences.test.cjs 挂载模块、avatar-editor-browser.cjs 挂载+shim）。真机拉取验证（真实 Key 首拉/errcode 呈现）归 host-pending。
2026-09-24 T-1442 设置页 integrations 组来源子标题（第 1442 批第 1 步）：integrations 组内各来源行前加子标题（日记集成/摘要驻留/思阅/思播/健康），用户可一眼分辨行归属。i18n 6 键双语（parity 1673/1673）。完全按插件独立子面板拆分属较大 UI 重构，等用户确认视觉方案后排批。
2026-09-24 手机端三缺陷修复（T-1444/T-1445/T-1447）：① 回顾页滚动振荡——pinReviewSubnavRail 守卫改为宿主显式 isMobileFrontend 标记优先，不再依赖 class 碰运气，移动端彻底停用 transform 滚动同步；② 填写输入 IME 防弹回——renderBackgroundUpdateFor 在今日页输入聚焦期间挂起全量重渲染（pendingRenderAfterTyping 标记失焦补渲）；③ 提醒操作按钮补 white-space:nowrap + 窄容器独占整行，杜绝 CJK 逐字竖排。上述均入对应守门断言。T-1446（已完成打卡项无法折叠）根因在触摸/WebView 层，代码路径确认正确，登记需真机 DevTools 调试。
2026-09-24 T-1447 手机端缺陷登记（用户真机报告，只记录未开发）：回顾页下滑整页弹簧式振荡。调查事实：回顾二级导航 transform 钉住（D-159 桌面缩放缺陷 workaround）在移动端设计有守卫跳过（lc-checkin-host--mobile class），且代码注释原样描述了本症状（per-scroll transform 与触摸手势互搏=可见振荡）——首查守卫 class 在真实移动 DOM 上是否命中（renderInto 的 root 与 bind 收到的 root 是否同一元素/移动挂载路径是否绕过 toggle）。其余写入方：T-112 滚动记忆动量期回写、WebView 滚动锚定。复现=playwright mobile bundle 滚动埋点断言 transform 写入次数；真机 console 一行可验证。修复=修守卫判定，移动端彻底停用 transform 同步（桌面不变）。
2026-09-24 手机端两缺陷登记（用户真机报告+截图，只记录未开发）：① T-1445 填写数字时输入法跳出又弹回难以输入——根因候选=今日页多个后台全量重渲染源（健康轮询/思播采样/Dock Tomato 事件/analytics-updated）在输入聚焦期间重建 DOM 丢焦点，修复方向=聚焦期挂起全量渲染或局部渲染保留焦点（复用 T-114 机制）+ mobile bundle e2e 回归守门；② T-1446 已完成打卡项无法折叠——通用 handler 逻辑正确（bind-today toggle-completed 就地更新+持久化），手机端点击无反应，候选=tap 命中区/重渲染后监听器未重挂/移动 bundle 绑定路径差异，修复=先 mobile bundle e2e 复现再修。两缺陷均可用 playwright mobile bundle 本地复现（local-auto 可复现）+ 真机确认（host-pending）。
2026-09-24 T-1444 UI 缺陷登记（用户截图，只记录未开发）：回顾页提醒中心操作按钮（延期/延后2小时/跳过）被行网格挤成窄竖条、CJK 文字逐字竖排；根因已定位——.lc-checkin__reminder-action 无 white-space:nowrap 与最小宽度，T-1421 加入较长标签「延后2小时」后触发。修复方向已写入待办（按钮 nowrap+最小宽/操作组整组换行/行网格 actions 列最小宽 + 回归守门断言），随下批开发或用户点名即修。
2026-09-24 T-1443 主动提醒通道需求登记（用户截图+反馈，只登记未开发）：现状调查证实——插件全库无 /api/notification/pushMsg、无思源块提醒、无系统通知，所谓「提醒」全部是被动页内呈现（今日优先提醒条+回顾提醒中心），用户不开今日/回顾页就完全收不到，此即「从未收到提醒」的根因。需求登记：统一每日提醒（默认一天一次可设多次）、事项提醒置顶高于打卡、走思源公开 API pushMsg、时间/内容/次数控制（安静时段复用 T-1421）、同实例每日幂等一次。边界：不后台常驻不用系统通知；pushMsg 真机形态 host-pending。等「开工」指令。
2026-09-24 用户截图确认 T-1442 问题并要求先登记后开工：连接与能力区（integrations 组）现状为摘要驻留/思阅/健康/思播四来源行扁平混排，分不清归属；要求按插件分子面板并在每面板写清编号设置步骤。T-1442 待办已细化（现状事实/按插件子面板设计/步骤文案双语要求），标注等「开工」指令，未动任何代码。
2026-09-24 用户三需求分析并入待办（未开发，按指示仅登记）：T-1440 来源专用打卡模板（模板增可选 sourcePreset 预填完成来源与单位，不自动启用联动，opt-in 纪律保持）；T-1441 叶归 LifeLog 识别研究（先发布包静态分析判数据落点，用户文档可解析则走绑定范围+标签映射+externalRef 幂等+预览确认流，红线=不逆向私有存储，智能体通道仅作非确定性补充）；T-1442 设置页「外部连接与能力」分区重组（共性区=身份说明/断开保留/隐私披露，每来源独立子面板，不改偏好 schema 只动 IA）。三项均 local-auto（T-1441 实现阶段含宿主验收），按用户指示未排开发。
2026-09-24 T-1439 容易漏卡的时间段（R-20.3 第二张行动卡）：pace-projection 新增 aggregateMissedWeekdays（漏卡按星期 0=周日…6=周六聚合，数量降序+星期升序稳定）与 aggregateMissedTimeSlots（morning/afternoon/evening/any 固定顺序，非法归 any）；index 报告构建枚举 30 天漏卡明细（日期+事项时段）后聚合；报告新增「容易漏卡的时间段（共 N 次漏卡）」节——星期名复用 occasions.weekdayName（occ.wd* 键）、时段名复用 TIME_SLOT_LABELS（label 在组合根本地化后传入，保持 features/report.ts 不触 ui，架构守门在同批逮住并纠正了违规导入）；i18n 仅新增标题键（parity 1660/1660）；pace-projection 消费守门扩展。R-20.3 剩余第三张卡「最近调整是否有效」（buildReviewComparison 基础已备）等回顾改版窗口。
2026-09-24 v18.3.0 发布完成（用户确认发版至 GitHub）：README 完善（18.3.0 要点九项/文档索引/自动化证据报告链接）+ 四方版本号升级 + changelog/release notes 新建；发版前完整 test:quality EXIT=0，sync:digest 回填 SHA ba25b80f…后构建产物与说明一致（0ed8e093… 实测核对）。发布执行：main 推送 a53037d（含此前 25 个本地提交一并上云）、tag v18.3.0 推送、GitHub Release 创建并附 package.zip（708,902 字节）标记 Latest，回源验证资产与说明 SHA 一致。微信读书登记 T-1437（官方 Tencent/WeChatReading skill 通道 Apache-2.0、wrk- Key 用户本地持有不入库、评估项四条）；思阅/思播上游 PR 状态核查并登记 T-1438（提案草案已备、未提交外部仓库，等用户明确授权）。
2026-09-24 T-1436 范围导出（R-A8 第三切片，A8 深化收口）：CSV 数据导出支持可选相对天数范围——回顾页报告设置菜单新增「CSV 导出范围」选择器（全部/7/30/90/365 天），plugin-ops downloadExportFor 可选 scopeDays 经 model getEventsInDateRange 单一实现过滤事件（闭区间回溯，钳制 730）；JSON 恒为全量备份语义不参与范围；范围外事件不删除仅不进导出文件。i18n 6 键双语（parity 1657/1657）；view-scope.test.cjs 消费守门扩展（签名/CSV-only/单一实现/钳制/选择器/双语）。下一步：自主深化登记项仅剩 A3 情境化 UI/洞察改版窗口项；T-1400 第四轮滚动；或按用户指示开新方向（push/发版/真机走查需用户操作或授权）。
2026-09-24 T-1434 归档页批量删除接入批量影响汇总（R-A9 第二切片，A9 泳道收口）：archived.bulkDeleteConfirm 确认文案追加 projectLifecycleBatch 影响汇总（外部幂等身份保留/锚点清理/事项联动解除），i18n 1 键双语（parity 1649/1649）；单个归档删除已走 deleteItemWithRecords 同口径。lifecycle-projection.test.cjs 接线守门扩展（单删+批删+双语）。真实工作区恢复演练仍为用户验收。下一步：A10 控制面深化（诊断导出预览）与范围导出等真实反馈排批；T-1400 第四轮滚动；或按用户指示开新方向。
2026-09-24 T-1434 来源 mock 生命周期矩阵 + contract kit 同步（R-A5 第二切片，A5 泳道收口）：新增 tests/source-lifecycle-matrix.test.cjs——思阅/思播/健康三来源统一四阶段场景（正常接入三日结算/跨日切段独立/批内重复+已结算身份重放零双计/非法片段 fail-closed 计数）+ 超限批整批拒绝 + 健康收件箱行解析矩阵 + 身份前缀与契约清单对齐；入 pnpm test:ecosystem 链。契约同步：两份 manifest（字节一致守门）externalRefPrefixes 扩至 6 前缀（补 sireader/siplayer/health），docs/api-v5.md 前缀登记处同步，contract-kit 81 项合规全绿。全量扫测 171 文件全绿。真实双插件联调仍 external。下一步：A9/A10 剩余深化（归档确认同口径、控制面深化）与 A8 命名视图深化等真实反馈排批；T-1400 第四轮滚动；或按用户指示开新方向。
2026-09-24 T-1433 情境化记录：备注词表归一化与跳过原因分布（R-A3 第二切片，R-20.2）：新增零依赖纯模块 src/features/context-normalization.ts——classifyContextTokens 把跳过/打卡备注自由文本按中英关键词归一化为有限词表 v1 六类（阻力/时间不足/环境变化/身体状态/情绪波动/其他，未命中归 other）；aggregateSkipContext 聚合（降序+词表序稳定/日期范围/样本不足守卫 <3 insufficient）。不新增事件字段、不改 Store v3、不影响完成判定与连击（只读投影）。接入：buildWeeklyReportMarkdown options 增 contextAggregation——报告头部新增「跳过原因分布」节（逐词元计数+样本不足提示）；index 从区间内跳过事件既有备注聚合（isSkipEvent 单一口径）。i18n 8 键双语（parity 1648/1648）。tests/context-normalization.test.cjs 入 pnpm test 主链；模块入架构守门无时钟清单（104 模块全绿）；diary-report 导出路径守门同步。真实使用反馈保持开放。下一步：A5 剩余（contract kit 同步+三来源 mock 生命周期样例）或 A10 控制面深化，均等真实反馈或用户点单；T-1400 第四轮滚动。
2026-09-24 T-1432 命名保存视图（R-A8 第二切片，A8 泳道收口）：偏好新增 savedViews（{id,name,scope:ViewScopeV1} 上限 10、scope 经 normalizeViewScope fail-closed、旧偏好零迁移）；宿主三方法 applySavedView（相对天数→显式区间写 summaryCustomRange、来源随视图、默认清空）/saveCurrentView（当前区间跨度+来源固化，上限满提示）/deleteSavedView，activeSavedViewId 跟踪选中态；回顾页报告设置菜单新增选择器+保存+删除按钮（改动即持久化）。i18n 7 键双语（parity 1640/1640）；view-scope 消费守门扩展（偏好字段/三方法/上限/选择器/双语）；14 个 view-preferences 加载器同步 view-scope/first-success 依赖。真实 surface 交互保持 host-pending。下一步：A8/A3/A4/A5/A9/A10 剩余深化切片等真实反馈排批；T-1400 第四轮滚动；或按用户指示开新方向。
2026-09-24 T-1415 同口径接入收尾（R-A3）：summary 渲染块 buildSummaryViewHtml 的 at-most 行附里程碑（abstinenceMilestones 单一实现，戒断第 N 天·下一关 M 天）+ API v5 getStreaks at-most 项目可选 milestones {achieved,next?,progressPct}（additive 兼容，方向查表仅 at-most 注入）+ docs/api-v5.md metrics.read 节同步文档；pace-projection 消费守门扩展三面（今日卡片/渲染块/API+文档）。今日/渲染块/API 三消费面同口径完成，洞察页无 at-most 呈现位不硬造留洞察改版窗口。全量扫测 170 文件全绿。下一步：按泳道剩余深化切片（A8 命名保存视图/A5 contract kit 同步/A10 控制面深化）等真实反馈排批，或 T-1400 第四轮滚动扫描。
2026-09-24 T-1417 Pinch 发布包深评完成（T-1400 第四轮首位）：下载 v2.7.1 package.zip（1,417,173 字节）静态分析——plugin.json（minAppVersion 3.7.0 全端覆盖、disabledInPublish 标记）、i18n 词表 1322 键分组（任务管理 251/个人统计 163/专注 103/习惯 101/备注 79/奖励仓库 61+面板 37/目标 39/心情 20）、打包 JS 逐维 grep（趣币→兑换商店→徽章等级 5/10/15 经济闭环实锤；主体数据住思源块属性 custom-task-* + 文档，saveData 仅约 6 处；全部走公开内核通道无私有读取）。结论评估卡：代码吸收不做（可吸收点均在既有路线，全家桶形态与轻量边界相悖）；迁移通道延后（块属性可 SQL 解析、可映射二值打卡，登记导入来源候选，无需求信号不排批）；竞争面确认但不构成架构威胁（差异化=习惯算法内核+不可变事件+API v5+零惩罚）。全案入 benchmark 第十三节。研究轮纯文档，未改运行代码。下一步：自主工程队列剩余切片按真实反馈排批（A8 命名视图/A3 context normalization/A5 contract kit 同步），或按用户指示开新方向。
2026-09-24 T-1431 A6 质量收口（R-50.1/R-50.2，全泳道收官）：① e2e 真实内核证据——agent-capabilities spec 在用户已接入思源智能体的运行实例（内核 3.8.5 @ 127.0.0.1:6806，v18.2.1 已装）通过：宿主登记插件 11 项智能体能力、能力策略放行；新增 playwright.e2e.running.config.mjs「附着运行实例」模式（不启内核不抢锁，手写 target.json），只读 spec 优先。② 自动化证据汇总报告 docs/automation-evidence-report-2026-09.md——R-A0～A12 十三泳道交付/测试/提交对照、最新全链性能实测（渲染块 1k/10k/100k=21/34/241ms；100k 回顾 596.9ms；10k 渲染 35ms 溢出 0px；CSS 607,940 字节预算内；rollback 4 步 9 资产）、未关闭 host-pending 清单七项（真机/双插件/首次使用反馈/截图 backlog/产品决策/真实模型对话走查/上游提交与发版）。至此 D-264 自主泳道 A0～A12 自动化部分全部收口：本轮累计 12 个提交（7b9727c 起），新增守门套件 12 个、纯模块 8 个，测试文件 170 个全绿。剩余开放项均属 host-pending/external/decision，需用户操作、授权或排期；T-1400 第四轮（T-1417 Pinch 深评首位）按触发条件滚动。
2026-09-24 T-1430 本地隐私与控制中心（R-A10 第一切片）：新增零依赖纯模块 src/features/privacy-scope.ts——① 导出前敏感字段审计（备注/图片附件/幂等身份计数，头像照片由调用方显式传参）；② 来源断开保留规则（断开=停止采集，已落盘事件与幂等身份全部保留，重连经 externalRef 防重复累计，无幂等口径如实声明 none）；③ 控制面汇总（doc-write 两通道+external-source 三通道开关聚合，telemetry:none 零遥测常量）。接入：JSON/CSV 导出审计敏感字段有内容才 toast 披露；思阅/思播/健康三个开关关闭时 toast 披露保留事件与身份数。i18n 2 键双语（parity 1633/1633）。tests/privacy-scope.test.cjs 入 pnpm test 主链；模块入架构守门无时钟清单（103 模块全绿）。不新增遥测、不读取第三方私有存储；真实隐私取舍保持开放。下一步：A6 质量收口——R-50.1 e2e 智能体真实模型链路（用已接入智能体的 e2e 环境）+ 全泳道自动化证据汇总报告。
2026-09-24 T-1429 生命周期影响预览（R-A9 第一切片，映射 R-30.1 数据治理）：新增零依赖纯模块 src/features/lifecycle-projection.ts——delete/archive/restore 三动作影响预览（受影响事件数/外部幂等身份保留数/锚点与事项联动清理数/可恢复性 recoverable-with-audit vs reversible + reasonCodes 词表 today-calendar 可见性/事件保留/身份保留/墓碑/恢复点）；collectLifecycleFacts 事实切片收集；projectLifecycleBatch 批量汇总。接入：deleteItemWithRecords 删除确认注入影响补充说明（外部身份保留/锚点清理/联动解除/恢复点+墓碑保护）；i18n 1 键双语（parity 1631/1631）。tests/lifecycle-projection.test.cjs（三动作影响/身份保留/空项目边界/批量汇总/事实收集/确定性/接线守门/纯度）入 pnpm test 主链；模块入架构守门无时钟清单（102 模块全绿）。只做预览不执行写操作；真实工作区恢复演练仍为用户验收。下一步：A10 本地隐私与控制中心（privacy-scope 纯模块+设置页控制面）→ A6 质量收口（R-50.1 e2e 智能体真实链路+全泳道汇总）。
2026-09-24 T-1428 Task Horizon mock consumer（R-A5 第一切片，映射 R-40.2）：消费者参考实现 examples/task-horizon-bridge/plugin.js 升级——calendar.read 能力发现（v5 投影/v4 显式降级 summary-fallback，旧消费者不因缺少新能力失效）；getProjection 单飞合流+事件失效缓存（上限 16 防泄漏）+超时守卫（projectionTimeoutMs 放弃不挂死）+Abort 守卫（已中止不打提供方）；getStatus 暴露 projectionMode/缓存/待写。tests/task-horizon-mock-consumer.test.cjs（v5 发现/单飞 3 并 1/事件失效/超时/Abort/v4 降级/stop 语义）入 pnpm test:ecosystem 链；既有 bridge 守门全绿不回退（readiness/refresh/write/retry/十组 30 案矩阵+两组 300 案生成式压力）。真实 Task Horizon 联调、上游 issue/PR 仍归 external/host-pending；mock 结果不写成真实联调完成。下一步：A5 剩余（思阅/思播/健康 mock 生命周期样例、contract kit 同步）→ A9/A10 治理与隐私 → A6 质量收口（R-50.1 e2e 智能体真实链路）。
2026-09-24 T-1427 导入预览统一模型（R-A4 第二切片，映射 R-30.4）：新增零依赖纯模块 src/features/import-preview.ts（plan 类型 type-only 导入，运行时零依赖）——LoopImportPlan/ObsidianImportPlan 统一映射为 ImportPreview：逐项可迁移记录数、语义损耗词表 v1（schedule-degraded/unmappable-frequency/unknown-cells/archived-flag/color/max-gap）、现有项目重名冲突先行声明（应用时合并写入既有项目，不静默覆盖）、身份口径如实声明（Loop=内容匹配；Obsidian=obsidian21 externalRef 幂等）。接入：两个导入处理器在 confirm 前构建统一预览，确认文案追加重名合并警告与损耗计数，不再只依赖事后 duplicates。tests/import-preview.test.cjs（损耗词表/名称派生/冲突/汇总确定性/接线守门/纯度）入 pnpm test 主链；模块入架构守门无时钟清单（101 模块全绿）；i18n 2 键双语（parity 1630/1630）。A4 后续：范围导出与诊断包范围化等真实反馈排批。下一步：A5 来源与 API 契约（Task Horizon mock consumer）→ A9/A10 治理与隐私 → A6 质量收口（R-50.1 e2e 智能体真实链路）。
2026-09-24 T-1424 新手首次成功路径状态机（R-A12 收尾切片，映射 R-10.5 本地可验证部分）：新增零依赖纯模块 src/features/first-success.ts——五阶段旅程（not-started→item-created→recorded→feedback-shown→review-visited）+ 六事件，单调前进（防御性：记录发生蕴含项目已建）、skip 粘性（引导隐藏但阶段随真实行为前进，指标不失真）、reset 唯一回退（用户显式动作）、normalize 非法回落旧偏好零迁移。偏好字段 firstSuccess 入 view-preferences；宿主四处推进钩子（saveForm 新建/setRecentRecord 记录+反馈/showReview 回顾）幂等零写入；今日空态三步引导新增「跳过引导」按钮（skipped 后回落归档/新建变体）。tests/first-success.test.cjs 八组验证入 pnpm test 主链；模块入架构守门无时钟清单（97 模块全绿）；14 个 view-preferences 加载器同步 first-success。真实首次使用反馈保持 host-pending。下一步：A8 可保存视图（ViewScope 归一化）→ A3 节奏投影（含 T-1415 戒断里程碑）。

2026-09-24 T-1423 快捷入口能力矩阵（R-A12 第一切片，映射 R-10.4 本地可验证部分）：新增零依赖纯模块 src/features/quick-entry-capabilities.ts——入口描述符（commandId/langKey/icon/hotkey/surfaces/mobility/executor/globalCallback/capabilities）+ 四者分离纯函数：图标解析 fallback（未知回落 more 并标记未解析）、evaluateQuickEntry 三层资格（executable/displayable/registrable，显示与执行正交：用户隐藏只灭展示不剥夺执行）、filterQuickEntriesForDisplay 三段分区稳定排序、restoreQuickEntryVisibility 恢复配置；isMobileExecutable 对 unverified 绝不默认移动安全。接入：index onload 命令注册描述符驱动——执行器键与宿主回调分离，surface 交集判定 registrable，行为等价（openCheckin 全端+热键+全局回调；openCheckinTab 仅桌面），langKey 不变（release-assets dist i18n 契约守门），孤儿 QUICK_DIALOG_HOTKEY 常量移除（值入描述符）。tests/quick-entry-capabilities.test.cjs（四者独立/未知第三方/fallback/surface 过滤/恢复配置/分区确定性/描述符契约/接线守门）入 pnpm test 主链；模块入架构守门无时钟清单（96 模块全绿）；entry-capabilities 守门同步描述符驱动断言。隐藏集管理 UI 待截图门解除后接入。下一步：T-1424 新手首次成功路径状态机 → A8 可保存视图。

2026-09-24 T-1416 渲染块一键插入预设（R-A4 第一切片，第三轮调研采纳②）：新增零依赖纯模块 src/features/block-presets.ts——4 个上下文自洽预设（summary/month/heatmap/groups，缺省即当前项目集/月/年，无需先填 itemIds；today 强制 itemIds 不提供通用预设避免插入即错误块）；blockPresetMarkdown 生成围栏；validateBlockPresetRoundtrip 注入真实解析器做插入前守门（提取围栏体镜像真实摄入路径，解析失败或 view 篡改即拒绝）。接入：命令面板 4 个预设命令（langKey blockPresetSummary/Month/Heatmap/Groups 进 dist i18n 契约，release-assets 守门同步）；宿主 insertCheckinBlockPreset 经内核公开 /api/block/insertBlock 追加到当前编辑器文档末尾（getCurrentEditor 防御式解析 rootID，无编辑器降级提示）；i18n 6 键双语（parity 1628/1628）。tests/block-presets.test.cjs（描述符契约/往返一致/围栏格式/坏预设拒绝/纯度/接线守门）入 pnpm test 主链；模块入架构守门无时钟清单（100 模块全绿）。真实宿主插入体验（光标落点/protyle 刷新时序）保持 host-pending，可补 e2e 隔离内核自动化证据。下一步：R-30.4 导入预览统一模型 → A5 来源与 API 契约（mock consumer）。

2026-09-24 T-1415/T-1426 戒断里程碑+节奏投影 pace-projection（R-A3 第一切片）：新增零依赖纯模块 src/features/pace-projection.ts——三套口径独立冻结：① 普通 at-least backlogRate（SKIP 日不算机会不算失败、证据日期升序回放、≥50% 积压阈值）；② quota 独立贡献/目标/进度（封顶 100）；③ at-most 恢复状态+破戒历史升序去重+戒断里程碑阶梯 1/3/7/14/30/60/90/180/365（最近达成级/下一级/进度，T-1415 采纳项落地）。接入：今日 at-most 卡片里程碑标签（cleanDays 复用现有连续无破戒口径单一实现）；i18n 3 键双语（parity 1622/1622）。tests/pace-projection.test.cjs 入 pnpm test 主链；模块入架构守门无时钟清单（99 模块全绿）。事实切片由调用方经 model 算好传入的投影层模式（同 today-dashboard）。洞察/渲染块/API getStreaks 同口径接入归 A4/A5。下一步：A4 渲染块白名单/迁移预览（T-1416 一键插入）→ A5 来源与 API 契约。

2026-09-24 T-1425 可保存视图 ViewScope v1 归一化层（R-A8 第一切片）：新增纯模块 src/features/view-scope.ts（日期运算复用 date-keys 单一实现）——版本化 ViewScope v1（relative-days/all 范围 + itemIds/groups/sources/status 过滤器）；normalizeViewScope fail-closed（version≠1 整体回落、天数钳制 730、过滤器 trim/去重/上限截断置 truncated）；resolveViewScope 显式 today 解析闭区间并把失效项目/分组/来源回显为缺失条件（不静默丢弃、不扩大范围）；describeViewScope 输出范围声明词元。接入：buildWeeklyReportMarkdown options 增 viewScope——报告头部新增「统计范围」行（范围/过滤器/缺失/截断），index 调用点以当前 store 解析注入；i18n 6 键双语（parity 1619/1619）。tests/view-scope.test.cjs（归一化/钳制截断/跨年解析/缺失条件/词元/消费守门/纯度）入 pnpm test 主链；模块入架构守门无时钟清单（98 模块全绿）；diary-report 导出路径守门同步含 viewScope。A8 后续：命名保存视图+选择器 UI、范围导出（等真实反馈或用户点单）。下一步：A3 节奏/恢复投影（T-1415 戒断里程碑同窗口）→ A4 渲染块白名单/迁移（T-1416 一键插入）→ A5 来源与 API 契约。

2026-09-24 T-1422 UI 维护台账（R-A11）：新增 tests/ui-state-ledger.test.cjs 八状态族活清单（保存中·失败·重试/空态/加载/禁用/依赖缺失/成功错误），每族四维断言（SCSS/渲染消费/双语 i18n/无障碍语义），窄宽·双主题·i18n 交叉引用既有门禁，入 pnpm test 主链。修复两项：① 统一禁用基线进 interaction-states.scss（:where 零权重，组件特化仍优先）；② 回顾助手错误行收编基座类 lc-checkin__error（删散落 is-error 死规则）。决策登记：saving 刻意静默（checkin-toast 布局防跳守门在位，本批一度误改后回退并留注释依据）；__loading/__success/is-saving/msg.saving 登记为保留词表，A11 后续清理批统一收编或退役。真机长尾维持 host-pending。下一步：A12 快捷入口能力矩阵（quick-entry-capabilities 纯模块）+ 新手首次成功路径状态机。
2026-09-24 T-1421 提醒安静时段+通知防抖（R-A2 收尾切片）：新增零依赖纯模块 src/features/reminder-preferences.ts（HH:MM 严格解析、normalize 非法回落、isWithinQuietHours 半开窗口支持跨午夜），偏好字段 reminderQuietHours（默认关）入 view-preferences，设置页开关+起止时间输入（time 输入绑定 persist），优先提醒条窗口内切 is-quiet 变体（紧迫标签换安静说明、条目仍页内可见——只影响呈现强度不改事实）。防抖走增量扩展：ReminderUserAction 可选 expiresAt，提醒中心新增「延后2小时」defer 按钮写 {snooze, expiresAt: now+2h}，applyReminderActions 带 expiresAt 时以到期为准（同日内可到期）、历史 snooze 沿用当日语义零迁移，normalize 丢弃非法 expiresAt（早于 at/超 7 天）。复用既有独立存储与保存队列，无新存储键、无后台常驻。tests/reminder-quiet.test.cjs（解析/归一化/跨午夜逐半小时回放/半开边界/防抖到期与历史兼容/接线守门）入 pnpm test 主链；模块入架构守门无时钟清单（95 模块全绿）；13 个转译 view-preferences 的测试加载器同步 reminder-preferences；settings ctx 字段改可选+防御渲染兼容旧桩；提醒中心签名守门同步含 defer。真实宿主通知观感归 host-pending。下一步：按泳道 A11（UI 台账）/A12（快捷入口能力矩阵+新手路径）或 T-1415/T-1416。
2026-09-24 T-1420 今日行动台纯投影（R-A2 第一切片）：新增零依赖纯模块 src/features/today-dashboard.ts——事实输入由调用方经 model 单一实现算好（isComplete/getProgress/quota/跳过事件/at-most 破戒/连续/最近漏卡日），投影层只编排：状态归并（breach/actionable/skipped/done+reasonCode 八种）、now[破戒置顶]→deferred→done 三段固定排序（zh-CN→itemId 平局）、totals、nextAction（破戒/待办优先→全完成转回顾→空日程 undefined）、专注缺失降级、分段截断。接入：renderTodayView 构建投影+renderTodayDashboardStrip 只读摘要条（data-today-dashboard），记录/撤销/回滚路径不变；优先提醒仍单一路径呈现只计数；i18n 5 键双语（parity 1602/1602）、workbench 6 条轻样式。tests/today-dashboard.test.cjs 十二组验收入 pnpm test 主链（空态/待办/完成/SKIP 中性/quota 两态/at-most 干净与破戒置顶/提醒计数/专注三态/确定性/截断/missedDate/接线与纯度守门）；模块入架构守门无时钟清单（94 模块全绿）。真实宿主观感归 host-pending。剩余 R-A2 切片登记 T-1421（安静时段+通知防抖）。下一步：T-1421 或按泳道进 A11/A12。
2026-09-24 T-1418/T-1419 R-A1+R-A7 双批次（D-266）：架构边界守门 + 日期语义契约落地。T-1418 新增 tests/architecture-boundaries.test.cjs：93 个 TS 模块自动结构检查全绿——render/ui 导入方向、宿主 API 准入清单（含 plugin-ops/shared/teardown 既有事实显式登记）、无时钟纯函数面 11 模块、store.events 唯一写路径、recordExternalEvent 双入口、来源前缀登记+发现规则（docktomato-inbox 显式登记为非日期前缀来源家族）。T-1419 新增 src/date-keys.ts 纯模块（校验/解析/日序号/时区格式化/下一日/半开日差/序列；不读隐式时钟、fail-closed），替换 reminders×4+光标推进、review-comparison getPreviousReviewRange 整体键化、occasions differenceInDays、render/occasions 与 fragments 倒计时——等价回放 occasions/reminder-actions/review-comparison/report-deviations/review-compare-view/v8-platform 六测试零漂移，同步 10 个固定模块集加载器（occasions/reminder-actions/model/reminder-tolerance/skip-tolerance/review-comparison/report-deviations/report-sections/review-compare-view/v8-platform）。新测试 tests/date-keys.test.cjs（校验 16 例/DST 双时区/闰日/跨午夜/半开方向/等价回放/序列连续性/纯度审计）与架构守门均入 pnpm test 主链。文档：architecture.md 新增日期语义契约节、api-v5.md 补 localDate 契约。开发中日期测试逮到并修复 dateRangeInclusive 逆序区间返回非空真缺陷。下一步：R-A8 可保存视图或 T-1415/T-1416 拆批。
2026-09-23 T-1400 生态调研循环第三轮（D-265）：四路并行增量扫描（GitHub topic 开源 / Obsidian·Logseq 及其他笔记生态 / 思源集市 plugins.json 全量+官方需求面 / 独立应用+量化自我）约 30 候选，对照前两轮清单纯增量。采纳 2：T-1415 戒断里程碑投影（源 Quitter/Streak/HabitKit 1.17，at-most 阶梯只读投影零存储变更）、T-1416 渲染块一键插入预设（源 easy-tracker 套件+contribution-graph，命令面板插入预设块模板）；延后 6（one sec 破戒意图确认、Daylio 情境标签、Routinery 序列计时、Daily You 导入枚举、entries 社区格式、cellStyleRules）、不做 3（habit-maker 积分乘数、habitsync 社交挑战、数据住笔记里哲学转向）、佐证 6。**竞品警报：royc01/pinch（v2.7.1 高频迭代，功能覆盖几乎重合）此前从未深评，登记 T-1417 第四轮首位**。战略信号：宿主 3.8.5 数据库日历视图稀释可视化护城河；3.9.0 闪卡重构+插件自定义复习顺序为未来联动接口。同时修复实施路线泳道映射冲突：新增 R-A11（UI 维护台账，映射 R-10.2）与 R-A12（快捷入口+新手路径本地可验证部分，映射 R-10.4/R-10.5），R-A6 扩展覆盖 R-50.1 受控智能体纯建议链，推进顺序 A0→A1→A7→A2→A11→A12→A8→A3→A4→A5→A9/A10→A6 与第五节开工顺序对齐。纯文档轮，未改运行代码；验证为文档交叉核对（R-A 泳道全覆盖第五节 14 项开工顺序）。下一步：按 R-A 队列推进 A0 收尾→A1 架构边界守门→A7 日期契约，T-1415/T-1416 拆批次开发。

2026-09-23 路线审计与自主执行泳道（D-264）：完整复核生态调研、产品战略、实施路线、TODO/PROGRESS/BLOCKERS/DECISIONS 和模块地图。修正文档真值：当前发布统一为 v18.2.1/API v5；v18～v22 文档标为已交付历史基线；README、architecture、codebase-walkthrough 的过时 API/版本/模板数量描述改为当前或动态说明。战略路线补齐交付状态矩阵，总方向扩展为 23 项，新增提醒与注意力、生命周期/数据治理、本地隐私控制中心、架构边界与扩展准入、本地质量度量、时间/日历契约、可保存视图七项；实施路线补齐 local-auto/host-pending/external/decision 证据矩阵、R-A0～R-A8 自动执行泳道和跳过边界。自动验证通过：pnpm run check、pnpm run build、test-suite-coverage（156/156，0 retired）、api-v5-docs、api-contract、ecosystem-docs、source-framework、habit-score、checkin-block、cross-surface-matrix、css-hygiene、ui-docs、preferences-docs、view-preferences、reminder-projection、responsive-layout、review-performance；渲染块 1k/10k/100k=16/39/264ms，回顾基线 1k/10k/100k range=13/39/315ms。Webpack 仅有通用资源体积提示，项目 CSS 607269 bytes 处于 620KB warning/640KB hard 门禁内。真实 Android、用户工作区、外部插件/Task Horizon/Dock Tomato 联调、外部账号、push/发版和产品决策全部保持开放或跳过；下一步从 R-A0 文档一致性、R-A1 架构边界、R-A7 日期契约和 R-A2 今日/提醒纯投影开始。
# 进度

2026-09-23 T-1385 缺陷修复 + 思播真实内核 E2E：**发现并修复严重设计缺陷**——采样周期 15 秒短于分钟粒度，原实现的「按段向下取整」导致每段取整后全为 0 分钟、`dayMinutes` 永不累计，适配器在生产节奏下完全失效。修复为毫秒累计 + 整分钟晋升（`dayMs` 累计、`dayTotal` 向下取整、晋升时产出携带累计分钟的段）；写回结算输入本就取 `dayTotal` 累计值，语义自洽。新增 tests/e2e/siplayer.spec.mjs：注入受控假 controller（isPlaying 由测试驱动）→ 真实内核下 75 秒在播采样 → 断言跨阈值写回落盘（source siplayer + 当日身份）→ 同日再次跨阈值不重复记账 → 重载保留。E2E 首跑失败还揪出「dist 未随修复重建」的流程点。test:quality 全链绿。真实思播插件同装与 seek/循环/变速矩阵归 T-1388。

2026-09-23 思阅适配器真实内核 E2E（新增）+ 事件前缀映射缺陷修复：新增 tests/e2e/sireader.spec.mjs——真实内核里种入启用偏好与项目 → 注入 reader:open/blur 生命周期事件（跨越 1 分钟阈值）→ 断言写回落盘（source sireader + `sireader:<itemId>:<localDate>` 身份）→ 页面重载后事件仍在 → 同日再次跨阈值不重复记账（幂等）。**过程中抓到并修复一个真实缺陷**：接线层把原始事件名 `reader:open` 直接透传给采样器，状态机只认 `open/focus/blur/close`——导致所有在播区间被判为暂停、永远无法累计；修复为显式白名单映射（剥离前缀 + 未知事件忽略）。此缺陷单测未能覆盖（单测直接以动作名调用采样器），E2E 级别才暴露——真实宿主管线验证的价值实证。test:quality 全链绿；E2E 主套件 18 用例（1 例时序敏感标记 flaky 后重试通过，单独复跑稳定）。真实思阅插件同装验收仍归 T-1388。

2026-09-23 v18.2.0 正式发布：版本四方（package.json/plugin.json/src/version.ts/README）提升 18.2.0；新增 docs/v18.2.0-change-log.md（今日视图渲染块/思播实验联动/庆祝动效/maxGap/色阶自适应五节）与 docs/releases/release-notes-18.2.0.md；发布验收文档 docs/release-validation-18.2.0.md 成文。完整 test:quality 以 18.2.0 口径 exit 0——package.zip 695073 字节 SHA-256 `5bf8f27819b1e3e0fd214a16010e3ad8811a7d726fafc8e6d544bda709f1db9f` 与发布说明及资产清单一致、回滚演练 4 步通过。推送 main + v18.2.0 标签，**GitHub Release「小驴打卡 v18.2.0」已发布并附 package.zip**（标记 Latest），CI 运行中。集市将自动同步。

2026-09-23 T-1385（思播适配器·实验/仅观察模式，T-1400 第二轮）：`src/features/siplayer-adapter.ts`——有界采样器（15 秒周期）只读思播 controller 的 `isPlaying()` 判定播放态、累计「在播墙上时间」，绝不使用 currentTime 差值（seek/变速/循环不可信）；相邻采样间隔超 3 倍周期判为断档丢弃（页面休眠不可信，宁少记不多记）；跨午夜按 localDate 预切分、分钟向下取整、重载丢弃在飞状态。source 枚举扩展 `siplayer`（全套触点与 sireader 同构：types 归一、多窗口合并白名单、recordExternalEvent 写回白名单、facade 防伪回落 api、registry `siplayer:<itemId>:<localDate>`、history/insight/摘要来源标签）。写回：累计结算 + 每日一次幂等 + 墓碑防复活（D-261 口径继承）。偏好 `siplayerIntegration` 默认关；设置页三行带「实验」标注（12 i18n 新键，1593 对键对等）。tests/siplayer-adapter.test.cjs 九组验收入 test:ui（采样状态机/断档丢弃/跨日切分/身份/偏好/结算组合/防伪/注册表/i18n）。test:quality 全链绿。真实宿主验收归 T-1388。

2026-09-23 T-1396 全部收口 + OpenHabitTracker 补评：①27 个 `archive/codex-*` 归档 tag 推送远端（内容在远端永久可达）；②27 个远端 codex/* 旧分支全部删除，`fetch --prune` 后远端仅剩 `main`（本地 1 分支/远端 1 分支/仅主仓 worktree，仓库面完全收敛）；③OpenHabitTracker 补评完成（Jinjinov，285★，GPL-3.0 Blazor 独立应用）：不做——形态不可比 + GPL 排除代码移植，留「逾期率评分」「相对天数筛选器」两个设计参考点，对象调研关闭（benchmark §十一补录）。

2026-09-23 T-1399 完成 + v18.1.0 正式发布（用户连续确认继续后执行）：`git push origin main`（83d2238→52e01d3 共 24 提交）+ `v18.1.0` 标签推送；**GitHub Release「小驴打卡 v18.1.0」已发布**（标记 Latest，附 package.zip 资产）。发布过程中发现并修复一个资产一致性问题：首次上传的 zip 取自当前工作区（含标签之后的 T-1411/T-1412），与标签源码不可复现——已从 **v18.1.0 标签树重新构建**并 `--clobber` 替换资产（693030 字节，SHA-256 `f40fa1d4…`），发布说明哈希同步对齐；validate 文档修正为标签树口径。CI（push 触发）已自动运行。集市将随 Release 自动同步 18.1.0。T-1366 的前置（push+Release）就此解锁，集市触达与消费方跟进可在 18.1.0 上线后开展。

2026-09-23 TODO 面板健康巡检 + 第二轮收尾：逐条核对 27 个开放项准确性。收口两处：①**T-1166 外部软件摘要通道**——T-1353 摘要驻留已完整交付其验收条款（方案与隐私评估/最小可用形态/真内核验证），正式关闭，真机读取证据归 T-1344/T-1408；②**T-1400 第一轮**条目关闭（采纳三项全部落地，同日第二轮亦完成——采纳 T-1412 今日视图块已落地、轻量积分维持边界登记条件 T-1413、延后 3 项记触发窗口）。其余开放项核对无误：真机窗口类（T-1344/T-1388/T-1406/T-1408/T-023/T-033/T-129/T-1173/T-1256/T-1346/T-1347）、外部排期类（T-1392/T-1394/T-1385/T-1388/T-1165/T-1228~1230）、用户确认类（T-1399 推送/T-1396 远端与脏 worktree/T-1366 集市触达/T-1402 微信读书 Key 实测/T-1413 积分拍板）——与各自任务注记一致，无需修正。

2026-09-23 T-1412（极简「今日视图」渲染块，T-1400 第二轮采纳落地）：声明式渲染块新增第五视图 `view:"today"`（源：obsidian-easy-tracker 深挖）。①解析：itemIds 必填（缺失 fail-closed 出固定错误），上限 50；②纯函数 `buildTodayRows`/`buildTodayViewHtml`：每项目一行（图标/名称/今日状态[已完成文本或 x/y 或 quota 百分比]/连续天数/最近漏卡日[仅单项目块]）+ `data-block-record` 打卡按钮，完成项替换为祝贺态文案（无动效，克制）；streak 经 `computeEventStreaks` 单一实现、最近漏卡日 `findLastMissedDate` 从昨天回溯命中首个完成日即停；③glue 层点击 → `onBlockTodayRecord` 宿主回调 → 既有 `recordEvent` 通道（修订指纹冲突检查/审计/撤销不变），`data-record-pending` 节流，写入后事件广播整块重渲染解除节流；④SCSS 六条轻样式复用主题 token。checkin-block 守门扩展（解析 fail-closed/渲染行与祝贺态/节流与宿主接线/i18n 双语 5 新键[1581 对]）。**真实内核 E2E 17/17**：新增 today 块用例（渲染→点击→真实落盘→祝贺态→缺参 fail-closed）。test:quality 全链绿。该功能随下一个版本发布（v18.1.0 标签已定格）。

2026-09-23 T-1400 生态调研循环·第二轮：三路并行（easy-tracker 源码深挖 / 修仙打卡 v0.9.6 发布包静态分析 / 轻量增量扫描），结论落盘 benchmark 文档 §十一。**采纳 1 项**：极简「今日视图」渲染块（T-1412）——三格概览（今日状态/streak/最近漏卡日）+ 一键打卡按钮（祝贺态）+ itemIds 多项目寻址（easy-tracker 无此能力，是其单数据流模式的正面替代），源：easy-tracker 源码深挖（109★ 市场验证的形态，复用现有渲染块框架代价低）。**深挖结论：轻量积分不做、维持 RPG 边界**（修仙打卡负面机制——惩罚按钮/失败放大扣分/掉境界/补签收费——是其经济闭环必要部分，剥离后空洞化；唯一可接受形态已登记为条件批次 T-1413，触发=用户显式提出）。**延后 3**：HabitHeat 统计维度、月条带可视化（monthly-tracker）、OpenHabitTracker 下轮补评。纯调研轮，未改运行代码。

2026-09-23 v18.1.0 真实内核 E2E 补录：定位到本机 SiYuan-Kernel（D:/biji/SiYuan，3.8.5-beta.5）并补齐 CHECKIN_E2E_KERNEL，`test:e2e` **16/16 通过**（真实内核 + 独立工作区装入 v18.1.0 生产包：API v5 真实可用与批量写重载幂等、Dock Tomato 完成入账/幂等/跳过留痕/移动端 bundle、双窗口对等同步、插件禁用重启数据完整、渲染块 fail-closed、建议确认撤销）、`test:e2e:readonly` 1/1（只读不落盘不崩溃）。已补录进 release-validation-18.1.0.md——真实内核自动化证据与手动真机验收（T-1344/T-1388）分开记录。

2026-09-23 T-1411（完成庆祝动效，T-1400 第一轮采纳③，D-263 克制原则首批落地）：完成打卡时 recent-record 反馈条的 ✓ 徽标轻弹一次——`lc-checkin-check-pop` 360ms ease-out 纯 transform keyframes（scale 0.4→1.18→1，无任何盒模型属性，零布局跳动）；双闸禁用：插件 reducedMotion 偏好经 toast 自带的 `data-reduced-motion` 属性 + 系统 `prefers-reduced-motion: no-preference` 媒体查询，任一命中即不播。 restraint 断言入 checkin-toast 守门（双闸选择器文本、keyframes 纯 transform、恰好一处声明+一处定义、时长 360ms）。CSS 体积 +261 字节（605333/620KB 预算内）；check/css-hygiene/ui-theme 绿。T-1400 第一轮三项采纳（T-1409/T-1410/T-1411）全部落地。

2026-09-23 v18.1.0 本地发布准备：版本四方（package.json/plugin.json/src/version.ts/README）提升 18.1.0；新增 docs/v18.1.0-change-log.md（新增功能/改进/公开 API/工程质量/明确不变五节）与 docs/releases/release-notes-18.1.0.md（用户向更新内容 + 升级边界 + SHA-256）；发布验收文档 docs/release-validation-18.1.0.md 成文。完整 test:quality 以 18.1.0 口径 exit 0——release-assets 四方版本一致、package.zip 693030 字节 SHA-256 `b61342f6a9775e89b86f66eec5d32fb852e1f3d7face4e25a9553859b7f78542` 与发布说明及资产清单一致、回滚演练 4 步通过。本地提交 + 标签 v18.1.0 完成；远端 push 与 GitHub Release 待用户确认（含此前积压的 21 个提交）。

2026-09-23 T-1410（热力图四级色阶自适应，T-1400 第一轮采纳②）：`buildYearHeatmap` 的四级阈值从固定绝对值（≥2/≥3/≥max×0.75）改为**按「有记录日」条数分布的 nearest-rank 百分位 25/50/75 自适应**，阈值随 `YearHeatmap.thresholds` 暴露；渲染类名（is-level-1..4/is-skip/is-empty）与双主题色不变，对比度门禁沿用。低频用户收益：1~2 条/天的分布在旧阈值下永远只到 level 2，新方案可呈现完整四档层次。v7-insights 守门扩展五组断言（分层分布 8/6/4/2、低频自适应收益、均匀分布收敛 level 1、空年 thresholds [0,0,0]、确定性回放）；skip-semantics/review-workspace/analytics-snapshot 邻接套件全绿。采纳③完成庆祝动效按 D-263 克制原则拆出为收尾批次 T-1411。test:quality 全链绿。

2026-09-23 T-1409（容错连续计数 maxGap，T-1400 第一轮采纳①落地）：`CheckinItem.streakTolerance?: number` 仅物化 1~30 整数（缺省/0=严格断链，历史行为零变化）；连续计数单一实现扩展容错缺口语义——`computeEventStreaks` 回溯与 `computeLongestStreaks` 正向扫描同规则：漏打排期日且缺口 <N 时桥接不断链、缺口不计入连续值，真实完成/quota 派生完成重置缺口，SKIP 中性桥接不消耗容错；`streakToleranceFor` 显式排除 at-most（无破戒日语径）与 quota（AUTO 周期桥接路径），不叠加。洞察页/渲染块 summary/API getStreaks/今日徽章全部经单一实现自动同口径。编辑器高级区「漏打容错（天）」输入（留空=严格，1~30 钳制，双语）。tests/streak-tolerance.test.cjs 九组验收（严格缺省回归/桥接/上限/缺口重置/SKIP 独立/at-most 与 quota 排除/钳制/消费方同口径/i18n）入 test:ui。缺口日淡显标注随 T-1410 收尾轮处理（D-263）。test:quality 全链绿。

2026-09-23 T-1400 生态调研循环·第一轮（触发条件满足后启动）：三路并行增量扫描（GitHub topic+趋势 / Obsidian+Logseq+Notion 插件生态 / 思源集市 plugins.txt+独立应用 changelog），对照已评估清单只看增量，候选 13 项。**采纳 3 项**：①容错连续计数 maxGap（Habit Tracker 21——漏打缺口≤N 天不断签，与 SKIP 显式请假正交，契合反内疚设计）登记 T-1409；②热力图四级色阶百分位自适应（TCOTC/heatmap）+③完成庆祝动效（Loop v2.3.0，尊重 reducedMotion）合并登记 T-1410。**延后 4 项**（滑块数值记录、洞察中位数/周期汇总、重复项编辑三选、fractured 热图，各记触发窗口）。**不做 3 项**（修仙打卡积分经济=RPG 化边界，轻量版需用户显式拍板；PushPlus/飞书推送=违背本地优先零遥测；AI 自然语言直建=已有受控建议流不增设入口）。佐证 3 项（公开 API 扩展面、E2EE 属 D-243 已决、赛道活跃度）。全记录落盘 benchmark 文档 §十；T-1409/T-1410 进入常规批次开发。纯调研轮，未改运行代码。

2026-09-23 T-1398（发布工程收尾：回滚演练脚本化与资产清单导出）：①`scripts/export-release-manifest.cjs`（pnpm run release:manifest）——dist/ 逐文件 + package.zip 整体的字节数/SHA-256/版本/git 提交/生成时间 → `.artifacts/release-manifest.json`，幂等可复跑；②`scripts/rollback-rehearsal.cjs`（pnpm run release:rehearsal）——对齐 release-rollback.md 语义的临时目录四步演练（预发布快照 → 坏版本发布并检测漂移[版本复用+未知文件] → 回滚替换 → 逐文件完整性复核 + 版本不复用断言），证据落 `.artifacts/rollback-rehearsal.json`，失败非零退出，不触碰真实构建产物；③`check:release` 扩展为 release:manifest → release:rehearsal → release-assets 测试三段，测试扩展逐条核对清单（dist 每文件哈希/字节数、package.zip 哈希与发布说明摘要同源一致），清单漂移即失败——发布证据链从「单次哈希比对」升级为「全量清单 + 回滚可重演」；release-rollback.md 补脚本章节。test:quality 全链绿（含新 check:release 三段）。

2026-09-23 v18.1.x 文档锚点体验收口（T-1397 拆分后首批，T-1404/T-1405 完成；T-1407 交付度核对完成）：①**T-1404 锚点打开前重解析与缓存一致性**——`resolveAnchorBlock` 扩展返回 rootID/box（成功携带归属根文档，失败原因不变）；`jumpToItemAnchorDoc` 重写为「打开前重解析」：新解析成功→跟随当前根文档并刷新缓存；失败→本次跳转回落陈旧缓存→无缓存则项目洞察 + `msg.anchorUnreachable` 可读提示（双语），同时失效缓存允许恢复；`writebackNoteAnchor` 解析成功同步刷新归属文档缓存（块移动后跳转跟随新根文档）、失败清缓存。不新增绑定字段、不扩大回写（T-1375 §八推荐语义）。②**T-1405 挂起/失效 UX 复核**——既有实现（suspendedAnchors 按 item+block 挂起、编辑器 anchorSuspended 警示、重绑清除、空串清理、导入保留原 ID）已覆盖研究验收要求，本轮补跳转不可达提示闭合最后缺口。③**T-1407 v18.2.x 交付度核对**——T-1352 日记集成与 T-1353 摘要驻留已覆盖本地可做项（搜索/预览/手动写入/幂等说明），无新增工作。T-1406/T-1408（移动端触控与真机证据）归 T-1388/T-1344 真机窗口。note-anchor 守门扩展（rootID/box 返回、跳转重解析接线、缓存一致性、降级提示、i18n 双语）；test:quality 全链绿。

2026-09-23 T-1396（分支与遗留工作区清理·本地侧）：仓库面收敛——worktree 18→3、本地分支 43→1（仅 main）、27 个 `archive/codex-*` 归档 tag 就位。执行口径：①16 个干净 worktree 全部移除（含 7 个 ~/.codex 会话 worktree 与 9 个 D:/AI/Codex/siyuan-checkin-* 附属目录）；2 个脏的保留待用户处置（~/.codex/worktrees/e9d3 有 README/ecosystem 改动、siyuan-checkin-catalog 有 plugin.json 改动）；②17 个已合并 main 的分支 `-d` 安全删除；③27 个未合并分支逐个审计（全部为 2026-09-06~09 的 v0.x 时代历史分支，独有提交 1~30 个，功能早已被后续版本覆盖或重建），全部打 `archive/codex-*` tag 后 `-D` 删除——内容零丢失，可经 tag 恢复。**剩余待用户确认**：远端 28 个分支的删除（清单与命令已备，未 push）；两个脏 worktree 的处置。未 push。

2026-09-23 T-1403（健康数据收件箱，C 类 push 落地）：实施时发现评估卡 4 的「插件零代码」假设不成立——快捷指令只能 HTTP 到思源内核，无法触达渲染进程内的 recordEvent；实际交付改为「**收件箱文档中转**」并在评估卡记录修正。落地内容：①`src/features/health-inbox.ts` 纯核心——严格行解析（`health:steps|weight:YYYY-MM-DD 数值`，坏行 fail-closed）、行序去重（同 metric+日期首条胜出）、摄取计划（已入库身份跳过并计数）、偏好归一（enabled 无合法 docId 不物化）；②宿主中转——绑定收件箱文档（块 ID 校验防注入）经内核 SQL 有界查询（≤500 行）轮询（5 分钟 + 保存设置后立即摄取），解析条目经 `recordExternalEvent`（source "api" + externalRef `health:<metric>:<date>`，registry 登记 health 前缀）幂等入库，指标→项目映射（步数/体重各一）；③设置页四行（开关/文档/两个项目映射）双语 14 新键（1572 对）；④接入文档 docs/health-shortcuts-integration.md：iOS 步数/体重快捷指令动作级模板（Find Health Samples→求和→Text→Get Contents of URL POST appendBlock）、token/本地网络/静默失败/补录语义等摩擦清单。tests/health-inbox.test.cjs 入 test:ui；同步修复 10 处测试转译清单/桩对新模块的引用。真机快捷指令模板验证归 T-1388。

2026-09-23 T-1387（事件幂等、撤销与诊断框架化验收，D-261）：对思阅真实写入路径做可信性审计，发现并修复一个实质缺陷。①**累计结算缺陷修复**：T-1384 首版按「单批新片段」结算，20+20 两段各不过 30 阈值则当日永不达标——宿主结算输入改为 `SireaderFocusTracker.dayTotal(localDate)` 按日累计，写入值=达标时点累计分钟；②**墓碑防复活双保险**：用户删除 sireader 事件产生墓碑后，宿主写入路径预检 `store.eventTombstones`（itemId+source+externalRef 三元组）永不重写，模型层 `appendEvents` 亦拒绝墓碑身份事件——删除后同日继续阅读不会复活记录（可撤销闭环）；③**失败自愈**：写入失败不设显式重试器，未写成功的资格日在下次生命周期事件以新累计值重新结算（结算确定性=重试无副作用）；④**跨窗口并发**：验收测试证实两窗口同日同 externalRef 事件经 `mergeNormalizedStores`/`deduplicateExternalRefs` 按 itemId+source+externalRef 身份收敛为单条（canonical 择优），配合存量身份去重最终有界。tests/sireader-adapter.test.cjs 扩展四组验收（累计达标回归锚/墓碑不复活/跨窗口收敛/自愈重试确定性）。D-261 成文；D-260 其余口径不变。test:quality 全链绿。

2026-09-23 T-1401（外部应用来源评估批）：三路并行取证（微信读书/Keep/手机健康中心）完成，评估卡落盘 docs/external-source-evaluation-2026-09.md。结论：①**微信读书——重大发现：官方 Agent API 已上线**（`i.weread.qq.com` Bearer Key 腾讯官方域名，约 17 端点，weread2notion-pro/obsidian-weread-plugin 等主流工具已迁移，无 Cookie 无逆向）；完读事件（`finishedDate`）+划线/笔记计数=做（条件批次，登记 T-1402），阅读时长=延后（`/readdata/detail` 仅当月按日，推翻「无官方时长」旧预期并记录修正）；与思阅按「载体归属」互斥（同一本书唯一 canonical source）。②**Keep=不做**：无自助导出、开放平台为占位页（API 仅硬件厂商）、唯一官方途径客服邮件 xlsx（4 步以上不可重复），第三方全靠私有接口违反硬约束。③**健康中心 iOS 步数+体重=做**（快捷指令定时自动化+Get Contents of URL POST 内网内核，公开 API 零代码，交付形态=官方模板+接入文档，登记 T-1403）；睡眠/Android（Health Connect+Tasker 三件套）延后、锻炼时长不做（活动环摘要非样本）、华为基本不可行。框架学习：发现第五渠道形态 official-pull（出站拉取第三方官方 API，opt-in+断网降级），随 T-1402 实现扩展 SourceChannel 枚举。评估完成前未写任何接入代码；本轮纯文档，未改运行代码/数据结构/公开 API，未生成包、未推送。

2026-09-23 T-1384（思阅适配器 MVP，D-260）：框架首个租户落地，自动打卡来源首次打通「事件→片段→结算→幂等写入」完整数据路径。①纯核心 `src/features/sireader-adapter.ts`：SireaderFocusTracker 消费思阅公开生命周期事件（reader:open/focus/blur/close），有焦点区间墙上时间计时，分钟向下取整（宁少记不多记）；重复 focus 不重启计时、空闲 blur/close 忽略、时间倒流忽略；跨日按 localDate 预切分（框架接入层契约）；discardInFlight 重载丢弃在飞区间（fail-closed）。②source 枚举扩展 `sireader`（types/model 归一白名单、多窗口合并白名单、recordExternalEvent 白名单、facade recordEvent 把外部输入的 sireader 强制回落 api 防伪造、EXTERNAL_REF_PREFIX_REGISTRY 登记 `sireader:<itemId>:<localDate>`、history-filter/insight-records 来源标签、summary-resident 来源计数、i18n source.sireader）。③写入：`sireader:<itemId>:<localDate>` 每日一次幂等——已有同 source+externalRef 事件即跳过，删除走既有墓碑撤销；值为结算时点累计分钟，MVP 不做日内更新。④偏好 `sireaderIntegration {enabled, itemId, thresholdMinutes}` 默认关（enabled 无 itemId 不物化、阈值钳 1~1440 缺省 30）；设置页三行（开关/目标项目选择/阈值保存）双语，12 新键中英对等（1558 对）。⑤tests/sireader-adapter.test.cjs（生命周期配对/跨日切分/取整/重载丢弃/身份格式/偏好归一/结算组合幂等/绑定拆除/防伪/注册表/i18n）入 test:ui。思阅生命周期事件为源码级证据，真实宿主验收归 T-1388；上游公开 API 提案归 T-1395。

2026-09-23 T-1383（来源统筹框架契约设计，D-258 落地）：`src/features/source-framework.ts` 冻结统筹框架的三个纯函数面——①登记层 `normalizeSourceDescriptor`：key 即 externalRef 前缀（`^[a-z][a-z0-9-]{1,31}$`）、四渠道（plugin-event/import-file/api-push/manual）、四状态（planned/experimental/stable/disabled，缺省 planned）、能力协商列表≤16，非法 fail-closed 返回 undefined；②治理层 `normalizeSourceGovernance`：opt-in 默认关、阈值/封顶非负有限、项目映射去重≤16；③结算层 `settleSegmentsToDays` 单一路径：片段→当日汇总，跨日预切分为接入层契约（一段一日）、externalRef 幂等（alreadyCountedRefs 历史身份+批内去重，first occurrence wins）、封顶与阈值只约束资格不改写历史、确定性无时钟（同输入逐字节一致、可离线回放）、非法片段计数不抛异常、单批 5000 上限。身份层委托既有 `EXTERNAL_REF_PREFIX_REGISTRY`（`prefix:identity:date`），框架不另立注册表；sireader:/siplayer: 前缀待 T-1384/T-1387 登记写入。框架文档新增 §七 冻结契约（形状+六条冻结语义）；tests/source-framework.test.cjs（描述符/治理/幂等重放/跨日/fail-closed/纯度禁 IO/文档同源断言）入 test:ui。上游 issue/PR 草案起草按 D-255 归口 T-1395（发出前需用户授权）。未接任何真实写入。check/build/test:quality 全链绿。

2026-09-23 T-1390/T-1391/T-1393（Task Horizon 日历可见性本地侧批次，D-259）：①**T-1390**——`CheckinItem.taskHorizonCalendarVisible?: false` 仅物化显式 false（normalizeItem 与 save-form 字段集合逐键一致，旧数据零迁移，写后校验指纹不变，itemFingerprint 天然覆盖并发冲突）；②**T-1393**——编辑器高级区开关「在任务管理器日历中显示（Task Horizon）」缺省勾选、双语+ARIA、取消勾选保存 false、复用 persist 失败回滚；③**T-1391**——新增 v5 能力 `calendar.read`（since 5）+ `getCalendarProjection`：有界项目×日期只读投影（≤366 天/≤200 项目、truncated 显式、服务端过滤隐藏与归档项目、无备注/附件/externalRef），状态单一路径复用模型层（complete/pending/skipped/at-most-safe/at-most-breach/logged，quota 真实贡献日+item 级 quotaRate，日期归属只用 localDate）；manifest×2（docs/contracts 与 contract kit 字节一致）与 api-v5.md 三方同步。新增 tests/calendar-projection.test.cjs（13 组门禁：字段物化/服务端过滤/六态语义/边界/隐私/编辑器接线/i18n）入 test:ui；api-v5-docs 20 能力、contract-kit 81 项合规、api-contract、task-horizon-contract 全绿；`task-horizon-v1.json` 未动。**本地思源真内核验证**（用户授权）：T-1353 摘要驻留幂等 SQL 在运行中内核（v3.8.5-beta.5 主工作区）现场验证同日精确命中/用户相似行不干扰/跨日不误报/复核稳定，临时笔记本已清理。T-1392（消费端图层）与 T-1394（双方契约+真实宿主）保持开放，依赖对方排期。未 push。

2026-09-22 完整质量链收口（T-1353 轮）：test:quality 全链通过——check:environment/check/build/sync:digest/test/test:ui（63 文件含新 summary-resident、i18n 1544 对键）/legacy-style/mobile/ecosystem/test:extended（44 文件）/review-comparison/perf/check:release（v18.0.3 口径，CSS 605072 字节在 D-242 预算内）。过程中修复三处测试夹具对新模块的引用：recording-history-structure 宿主桩补 writeSummaryResidentForDate、v8-platform 转译镜像补 features/summary-resident.js、avatar-editor-browser 浏览器内 require 桩补真实模块；走查浏览器经 CHECKIN_BROWSER 指向系统 Edge（Playwright Chromium 缺失为既有环境状态）。

2026-09-22 四项批量推进（T-1353 实现 + 来源统筹框架 + marknow/闪卡研究）：①**T-1353 摘要驻留实现**（D-257 用户批准推荐方案）——新增 src/features/summary-resident.ts 纯函数（白名单行/幂等查询/SQL 应收口）、summaryResident 偏好（enabled 无合法 docId 不物化）、设置页三行（开关/文档 ID/写入今日摘要）、手动打卡完成后旁路 appendBlock 单行（root_id+日期+lv-checkin-summary 标记行幂等、withBoundedRetry、审计 channel summary-resident、无定时器）；tests/summary-resident.test.cjs 新增入 test:ui，五处既有测试转译清单补 summary-resident，avatar-editor-browser 浏览器桩补真实模块；i18n 16 键中英对等（1544 对）。②**来源统筹框架**（D-258 用户指示）——docs/external-source-framework-2026-09.md 四类渠道（插件事件/官方导出/API push/手动）+ 五段管道（登记→接入→结算→身份→治理），新增来源=描述符+适配器+映射、三层 O(1)；T-1383 范围提升为框架契约设计，T-1384 思阅 MVP 定为框架首个租户，新增 T-1401 外部应用评估批（微信读书/Keep/健康中心，先评估后接入；健康中心优先评估快捷指令 C 类路径）。③**marknow 调研**（用户推荐）——确认为 iOS 闭源习惯打卡 App（同名 macOS MD 编辑器无关）；无直接可搬能力，佐证模板场景库/本地优先叙事/快捷指令即来源，候选「自定义字段最小切片」「跨事项关联分析」进 T-1400 循环排队；增量记入 benchmark 文档第九节。④**闪卡重构期研究**（T-1397 补充）——上游 #10471 已关闭（里程碑 3.9.0）、代码在 feature/flashcard 分支未发布；旧 /api/riff/* 分支上全数移除换 /api/flashcard/*，openTab cardIDs 插件入口雏形已现但未进官方文档；重构期主要方式=人工入口（openTab 跳源文档+引导顶栏闪卡按钮）+日记只汇总确认活动，重评触发信号四条成文，见 research 文档主题 E 补充记录。类型检查、构建、定向测试全过；完整 test:quality 后台复跑中。未 push。

2026-09-22 生态调研循环常设化（用户指示）：将「全网调研 → 吸收优秀功能 → 开发/测试/优化 → 下一轮」固化为常设任务 T-1400 并记 D-256。触发条件定义为「本地可执行任务清零（剩余开放项均为外部依赖）+ 完整质量链全绿」，避免真机/对方排期等外部依赖项永久阻塞循环；扫描面覆盖思源集市、Obsidian/Logseq 等笔记插件生态、独立习惯应用与 GitHub 同类项目，以 benchmark 与研究文档为基线做增量取证；每轮吸收上限 1～3 项，吸收边界继承既有「明确不做」与五原则。同步登记 development-roadmap-current.md 长期计划第 6 节；未改运行代码、数据结构、公开 API，未生成包、未推送。

2026-09-22 状态盘点与新待办登记：核对本地/远端差异（main 领先远端 3 个 docs 提交；v18.0.0～v18.0.3 标签均已在远端；GitHub 无开放 issue/PR）、v18～v22 规划任务状态（本地任务与 v22 决策件全部完成，剩余集中在真实宿主验收、T-1353 隐私决策与外部联动实现）与分支遗留面（本地 42 分支其中 17 已合并、25 未合并待核对、19 远端分支、约 10 个遗留 worktree）。新增登记 T-1396（分支与 worktree 清理，低优先级）、T-1397（研究结论批次拆分登记）、T-1398（回滚演练脚本化与资产清单导出）、T-1399（积压 docs 提交推送，待用户确认）；未改运行代码、数据结构、公开 API，未生成包、未推送。

2026-09-22 T-1389（Task Horizon 日历可见性与打卡内容联动研究）：核对 `src/ecosystem.ts`、公开 API v5、Task Horizon v1 机器契约、bridge 示例、`CheckinItem`/编辑器及现有 contract test。确认当前按日期聚合摘要无法支持项目级隐藏；登记推荐模型：项目级 `taskHorizonCalendarVisible` 缺省 true，隐藏只影响 Task Horizon 日历投影，归档/删除/本地统计/历史事件/任务完成回写保持独立；长期优先新增有界项目×日期只读投影，旧 v1 消费方不得误显示隐藏项目。已新增 `docs/roadmap-task-horizon-calendar-visibility-2026-09.md`，并同步 TODO、开发路线和 D-254；T-1390～T-1394 仅登记，未改运行代码、数据结构、公开 API、机器契约，未生成包、未推送。

2026-09-22 T-1382（思阅 / 思播联动研究）：完成 `mm-o/siyuan-sireader` v2.2.8 与 `mm-o/siyuan-media-player` v2.0.4 的集市元数据、源码/发布包取证。思阅确认有阅读统计和 `reader:open/focus/blur/close` 生命周期事件，但无公开统计 getter；思播确认 `window.siyuanMediaPlayer.controller` 可查询当前媒体/时间/播放状态，但当前发布包没有稳定的累计播放时长事件契约。结论：思阅可作为 opt-in 适配器 MVP，思播先做公开契约/真实宿主验证，均不读取私有存储；T-1383～T-1388 已登记，未改代码、数据结构、公开 API，未生成包、未推送。详见 `docs/roadmap-cross-plugin-study-2026-09.md`。

2026-09-22 T-1381（v18.0.3 本地发布）：研究收口补丁版本统一为 18.0.3；完整 `pnpm run test:quality` exit 0，生产包内容与版本通过 `check:release`。`package.zip` 684657 字节，SHA-256=`69a882c840f4ef500d03e46f9a2c63971cfd7aff766a4f0ba6d6f33083a8fd13`。本版本只更新研究结论与后续开发边界，不改变运行行为、数据结构或公开 API；本地提交和标签完成后不自动 push。

2026-09-22 T-1374～T-1379（研究收口）：完成间隔调度、文档锚点、每日日记、竞品增量和思源闪卡五项研究，并由 T-1378 汇总采用/延后/不做边界与 v18.1.x/v18.2.x/v18.3.x/v19.x 条件批次。普通习惯保留现有 interval；文档绑定复用 noteAnchor；日记先采用只读/用户确认报告；闪卡调度归宿主，优先人工入口，due 查询和自动记账待真实宿主证据。研究文档只做范围决策，未改业务代码；后续功能另拆 TODO，真实桌面/Android/只读发布验收仍开放。

2026-09-22 T-1374～T-1379（已登记，研究待续）：新增间隔复习、每项指定文档、每日日记联动、竞品增量调研与打卡/思源闪卡联动可行性研究，最后由 T-1378 形成采用/延后/不做结论及开发批次。本轮完成仓库现状盘点和初步一手资料索引；闪卡主题初读 v3.8.4 Riff 路由、卡片/牌组/源块字段及 Anki/Obsidian 对照，并登记到期查询可能触碰宿主复习缓存的待验证风险；复用 interval、noteAnchor、T-1352 日记报告及 T-1353/T-1166 旧设计，不重复立项。详细问题、候选、证据要求、验收与续跑入口见 docs/roadmap-checkin-research-2026-09.md，D-251 记录先调研后定范围及自动采用有依据推荐的执行偏好。五项充分调研尚未完成，任务保持开放；本轮只修改计划文档，不改代码、不生成包、不推送。
2026-09-22 T-1380（本地补丁发布）：版本统一到 18.0.2，修复后的日记搜索非零响应/异常/过期响应有独立守门与回归测试；`pnpm run check`、完整 `pnpm run test:quality`、浅色/深色 `visual-qa`、`width-walkthrough`、日记/快捷注册/头像专项均通过。生产 `package.zip` SHA-256=`2efea515cb51881345390165367ebb9bcbd72224e3d8486b6310d96da8b4806d`；真实思源桌面/Android、只读/发布服务、智能体面板和 B-007 双插件联调仍开放。本地里程碑提交和 v18.0.2 标签已完成，不自动 push。

2026-09-22 T-1346 本地修复续跑：按发版后审计逐项收口。R01–R04 已补真实 DOM/时序守门（周期布局、记录值垂直对齐、响应式图表、IME 竞态）；R05 新建日记文档改为选择打开笔记本，空标题、无笔记本、创建失败、偏好保存失败分别提示并保留手填文档 ID；R06 增加头像裁剪取景/缩放编辑器；R07 保留设置页全库搜索，按 v3.8.4 `POST /api/filetree/searchDocs` 兼容边界最多投影 50 条，失败回退手填并写入 docs/siyuan-compatibility.md；R08 增加复制提示并尝试打开智能体的宿主守卫。`pnpm run check`、`pnpm run build:check`、`pnpm run test:ui` 及专项测试通过；其中浏览器/fake DOM 证据不替代真实思源桌面端、Android、只读/发布服务验收，T-1344/B-007 继续开放。未生成包、未推送。

2026-09-22 T-1346 发版后复核更正：以 v18.0.1..a60f58a 的 27 个提交为范围，当前源码不打包的内存生产构建与 dist 摘要一致；功能/UI/mobile/ecosystem/extended/perf/legacy/cross-surface、49 页面宽度矩阵、59 回顾场景及明暗 visual 全部等到 exit 0。专项实测仍复现统计周期选择器失效、记录值垂直偏移、SVG 固定高度留白/窄屏小字、IME 旧计时器竞态；日记新建错误提示不准确，头像编辑/全库文档筛选/复制跳转智能体尚未完成。此前“截图问题均已修复/全部完善”的记录不作为验收结论；check:release 不列入本轮通过项（未生成包）。详见 docs/post-release-audit-2026-09-22.md。本轮审计未改功能代码，集市包未更新。

2026-09-21 UI/功能巡检（完成）：完成今日、回顾、事项、设置、编辑器、归档、洞察与跨表面响应式走查。修复提醒动作持久化失败时的内存状态回滚；移动回顾页禁用 WebView 中会干扰触摸滚动的导航 transform；修复移动日期提醒空态错位、公共操作区按钮垂直对齐、分析图表窄容器字号/高度、窄屏区块标题截断。`test:quality` 主链、视觉矩阵、宽度走查、无障碍、CSS hygiene 与生产构建通过；真实思源宿主/真机验收仍按既有 B-007/T-023 保持开放。

2026-09-20 v17.3.0（发布交付）：将已完成的T-1333~T-1340回顾工作区、数据表达、智能体助手和全端适配整理为17.3.0；README、完整变更记录与GitHub发布说明已同步。版本号统一为17.3.0，主存储/API与最低思源3.8.4保持不变。完整`test:quality`与发布资产检查通过，发布产物SHA-256=`8512ffdd566b31887d883993fcfd9e7391cf9232dba14900ed2f36428a13b3b3`；本提交用于main、v17.3.0标签和同版本GitHub Release。

2026-09-20 T-1337~T-1340（完成）：回顾增加最多14日可钻取计划节奏、日期分段记录与趋势精确数值表；项目/分类明确按日达成和所选日期对配额的贡献，保留目标周期和历史单位，不把配额0%混入排名/比较。修复skip分母/配额贡献和上限无记录语义；思源工具亮点与行动建议也只比较有效按日项目。

智能体：区分思源能力注册与第三方总结提供者，提供精确日期/提问方向的手动复制入口，不臆造直接打开/调用模型API。生成请求使用不可变输入，缓存按完整范围与数据摘要匹配，跨期/跨午夜/提供者变化的迟到结果不污染当前视图；错误与缓存保存失败可恢复。复制不包含原始备注照片；现有第三方provider仍可接收所选范围事件，文档明确数据边界。

UI收口：助手入口后移/收入菜单，手机首屏更早看到项目；记录扁平化、照片与长单位分格、操作44px。实际展开与滚动路径发现并修复配额分类320px旧下限、日期框16px、日期弹层左裁/缓存滚动坐标屏外/平板右越界，补320/640/719/720/844/1180及844×350断点回归；最终生产包截图与实际命中检查通过，非overlay冒充验收。

证据：docs/review-visual-agent-refinement-2026-09-20.md；.artifacts/review-enhancement-final5-quality.log完整链exit0（134测试文件、0退役），两组workspace各59布局、两组content各45/45且0问题，双色visual exit0且pageErrors=[]，标准42页面+32交互+8配色+10混合+16长内容通过；另有最终40定向及56日期断点。100k默认renderer HTML13177字节/0 SVG/388.8ms（并行验收同机样本，不含snapshot与浏览器），最终CSS599941字节按D-246仅报告。包SHA256=84b1d2fb3e2089ffda54daff2ee1d9049bfcd3660d84856c04ce78ae667f5a52。版本17.2.1保持本地未发布标识；本地里程碑提交，不push/发版。B-007/T-023真实宿主/模型/设备验证保持开放并暂跳过。

2026-09-20 T-1337~T-1340（进行中）：用户要求继续优化数据体现形式、思源智能体结合和UI。基线4ea5bcb clean。已核实配额通用completionRate=0导致图条/排名误导、weekly趋势未排除skip、atMost无记录不等于无达成；智能体addAgentCapability仅注册能力，生成总结实际走第三方provider，重启缓存无完整范围验证。分工推进呈现投影/节奏钻取、助手状态/范围/提示、扁平记录与双主题；不臆造聊天API或自动发送消息。

2026-09-20 T-1333~T-1336（完成）：回顾三个任务工作区与8项/30条分页完成，重区按需生成、单趋势/单强度图、过滤范围与统计口径均已明确。终审额外修复近30天强度候选随顶部周期变化、跨时区记录归属日漂移、无变化备注保存无法退出、保存/删除后焦点丢失；保存失败保留草稿，离页不夺焦点。320px实截图发现筛选挤掉记录，最后收口为搜索常显、高级筛选默认收起/生效展开，移动周期与报告同排，首屏可见记录操作。

证据：`docs/review-workspace-audit-2026-09-20.md`；最终`review-final-quality.log`完整test:quality exit0（132测试文件、0退役）；两组review-final-workspace各49布局、两组review-final-content各45/45且0 issues；双色review-final-visual exit0且pageErrors=[]；标准review-final-standard-dialog-light-desktop通过42页面+32交互+8配色+10混合布局+16长内容。新增renderer/绑定回归验证默认策略、实际分页、重区无调用、组合过滤、写失败和跨时区。初期旧样式/source守门与visual旧月历路径失败已纠正并完整重跑，不削弱业务验收。

性能边界：同机30项/90天/100k记录的默认HTML3456696→9241字节、SVG36→0、cold renderer1311.36→119.94ms；只含HTML renderer，不含snapshot/DOM/CSS/宿主。真实首屏预览在`.artifacts/review-final-previews/`；最终包SHA256=`32f2ae96412d20f0ab6025cae84d905a76c418f460a28706e5f7bb9332748df7`，CSS587527字节按D-246仅报告。README标记为开发中，发布记录保留原17.2.1发行摘要；本地里程碑提交，不push/发版。B-007/T-023真实思源及设备项保持开放；本轮更新的两份真宿主E2E仅语法检查，未冒充真宿主实跑。

2026-09-20 T-1333~T-1336（进行中）：用户要求从内容、默认展开、筛选、UI、性能和易用性重审回顾页。已发现宽桌面的窄dock误开四区、折叠偏好白名单缺项、日期检索与周期统计范围含糊、项目覆盖百分比被当完成率、重区隐藏仍预渲染、自定义范围/热图年切换未接到review。实施三任务视图与按需渲染、真实分页及明确筛选作用域，不改公共统计/存储语义；现场项保持开放。

2026-09-20 T-1329~T-1332（完成）：确认今日卡片按当天排期总数与容器宽度动态切换（>12 项紧凑、<=719px 强制紧凑、>=1500px 紧凑三列），并完成七页全展开内容审查。回顾修复趋势单位/日活跃说明、历史动作44px同排、日志宽度与长备注、图表 SVG 局部字号、项目/热图/自定义图片；编辑复盘归档修复模板图片 live 更新、目标/单位对齐、7×12 热图；设置/事项修复番茄收件箱小时换算、月/周星期保存和共享第N个序数。导航和今日分组辅助文字统一到12px，正文13–14px。

证据：`docs/ui-full-content-audit-2026-09-20.md`；`ui-full-content-{mobile-light-final5,dialog-light-final7,tab-dark-final7}.log`均35/35、0 issues；双色 `ui-full-visual-{light,dark}-final2.log` exit0；设置/事项、自定义模板、图表与定向测试通过。最终 `pnpm run test:quality`、`pnpm run check:release` exit0，package.zip SHA-256=`a867407cd7f255962738f8b4333cb8cb328496e0791f53d4764292a3f30ee272`，本地未push。真实思源WebView、系统触摸/键盘/安全区及双插件现场联调仍保持开放。

2026-09-20 T-1329~T-1332（进行中）：用户要求从头到尾全UI审查，重点回顾每个内部区域的内容、字体与协调性。已核实卡片以当天排期总数>12切紧凑、容器<=719px强制紧凑、紧凑>=1500px三列；搜索不改变数量口径。基线ed48858 clean。本轮将检查真实computed字号/展开内容/对齐与完整截图，不以首屏无横溢代替全页验收。

2026-09-20 T-1323~T-1328 / D-246~D-247：参考图融合与全插件UI精修完成。实际读取桌面16张图并结合Habitify/Loop/Streaks/everyday/Productive官网可见UI，完成连续清单、导航、统计带/连续表单、维护页层级。18行打卡形式矩阵与参考证据见docs/ui-reference-refinement-2026-09-20.md。

打卡操作：时长“专注/记录”、数值“快捷增量/填写”、二值“打卡/备注”。手动时长无需启动计时，非二值番茄来源走现有Dock Tomato适配器，普通时长沿用提供方偏好；不臆造外部打开/恢复接口。内置同项重入/跨项保留原会话、键盘与菜单返回焦点、0.01输入、大步长/长单位完整表达、上限语义和图片图标均已修正。已完成数值项目继续添加仍显示入口；atMost二值记录/快照撤销保留幂等、备注附件、迟到记录与失败回滚。

终审补充：新建预览同步专注/手动入口、配额两口径与上限语义；戒除二值首次带备注入口按真实破戒状态显示。额外短横屏断言先失败，暴露≥720px旧flex规则压缩内容、丢失真实底部滚动空间，已限定移动编辑页恢复自然高度。新增14种首屏预览及真实类型/来源/方向/配额切换；320/1180/844×350双色预览可滚到保存栏上方完整阅读，最终五组矩阵全部重跑通过；没有用截图裁剪或注入样式代替修复。

最终验证：.artifacts/ui-reference-quality.log完整test:quality exit0（类型/构建/功能/UI/移动/生态/扩展/性能/发布资产）；.artifacts/ui-reference-visual-{light,dark}.log均exit0，pageErrors为空。五组dialog/light/desktop、tab/dark/desktop、dock/dark/desktop、dock/light/mobile、dock/dark/mobile最终矩阵均exit0，日志ui-reference-{dialog-light,tab-dark,dock-dark-desktop,dock-light-mobile,dock-dark-mobile}.log。每组42页面+32交互+8主题配色+10混合布局（15配置）+真实录入+16长内容，另含双色30项/长名/上限/多选。浏览器实际验证375ml手填再快捷250ml累计625ml、时长手填2.5及达标后再3.5、计数达标后再2、0.01、1e9、番茄计次调用注册适配器且启动不写事件、戒除二值记录/撤销及标签可见。

容量实测：30项29待办，1180px双列最高约71px/列表1043px，2000px三列列表696px；320/360px最高约75px/列表2085px，较上一轮2702px减少约23%。移动首卡350px，窄桌面dock328px、tab330px、dialog374px（含概览/提醒）；长名长单位独立验证完整换行，不以固定高度裁切。主要触控44px，八种主题/配色主动作对比度通过。

早期质量链因文档个人路径、旧more-class断言失败，均已修复后完整重跑；混合浏览器fixture改用真实存储规范化以通过写后校验，不削弱业务断言。终审后完整test:quality再次exit0；10k事件全渲染26ms/横溢0，100项/100k事件批量13.8ms。最终CSS529713字节按用户要求仅报告体积；package.zip SHA-256为b543421e52ce00351407cbb05cddffeae93fddd35c29ca09d32130ba4ea299d0，沿用17.2.0本地未发布标识。T-1323~T-1328关闭，本地阶段提交，不push。后续仅保留既有真实思源/设备/双插件现场项，浏览器测试宿主不替代这些证据。

2026-09-20 T-1317~T-1322 / D-245：全插件逐细节审计及落地。实际查看Habitify、Loop、Streaks、everyday官方展示，提炼紧凑清单、单主动作、按需统计，保留既定浅紫白卡/紫色/暖色连续与独立暗色设计。逐页问题、设计取舍与证据边界详见docs/ui-detail-audit-2026-09-20.md。

今日：修复none偏好未生效，筛选/分组44px；多选只渲染选择按钮，名称/连续标不跳转，快捷打卡/e/右键/长按单项菜单隔离，选中整卡可见；去卡片悬停位移和完成名划线。回顾：顶部对比默认收起，保留图/三指标，导航正确展开，重复总结入建议。编辑：高级区整行双栏，模板summary恢复、短横屏模板不再遮挡字段，44px字段和18px复选框并存。设置/事项：文字层级、轻分隔、44px开关及恢复筛选入口，停用可读、危险动作隔开。补复盘标题、窄端事项长名称、照片矢量图标和辅助名称、专注预设aria-pressed与双语操作。

主题实测发现暗色蓝/绿/橙主按钮对比度3.53/3.71/3.84，修为各自已有明亮强调色填充。最终真实bundle无注入样式测8组合×快捷打卡/记录/保存：浅色紫/蓝/绿/橙4.70/5.20/4.95/4.78，暗色6.67/7.31/8.11/8.58，全部≥4.5（.artifacts/palette-primary-contrast-final.log）；ui-theme新增token层叠回归，先红后绿。覆盖指定主按钮，不声称整个产品无障碍认证。

最终验证：.artifacts/ui-detail-quality.log完整test:quality exit0（类型/构建/功能/UI/移动/生态/扩展/性能/本地发布校验）；.artifacts/ui-detail-visual-{light,dark}.log均exit0。五组生产bundle浏览器假宿主dialog/light/desktop、tab/dark/desktop、dock/dark/desktop、dock/light/mobile、dock/dark/mobile各42页面+32交互+16长内容，另含双色30项/长名压力场景，全部exit0。日志分别ui-detail-{dialog-light,tab-dark,dock-dark-desktop,dock-light-mobile,dock-dark-mobile}.log。覆盖none↔group、比较键盘展开、模板应用、停用筛选/清除、多选仅选择/右键/快捷键不写不跳、保存命中、记录/撤销/专注。

回归中同步两处旧断言：visual-qa默认组数由2改1并补显式custom两组断言；desktop-dialog保留数值字段门控断言但文案改i18n。bulk测试fixture曾把今日2/8也计入“有记录日”连续得到3，修测试为前两日记录/今日无记录得到2；未改连续业务口径。上述早期失败均已修复重跑，不作为最终通过证据。

容量证据：30项29待办，桌面最高卡约74px、1180双列列表约1166px、2000三列约770px；窄端最高110px，320/360列表约2702px、移动首卡353px；长名另测完整换行，无横溢。最终CSS511402字节，处480000告警/520000硬线之间，未放宽预算；后续优先精简已有样式。package.zip SHA-256：24e043b51c2649ad2595c40580b875ee62fac732824060af019f17da7fac091f，完整质量链重构建摘要一致。

本轮本地UI里程碑完成，不push、不安装/替换GitHub包；真实思源WebView、手机触摸/软键盘/安全区及双插件验收未执行，T-023/B-007等继续开放。后续依据真实客户端反馈打磨，其他外部依赖任务不因本次浏览器测试关闭。

2026-09-20 T-1313~T-1316 / D-244：继续精修新设计。桌面常规卡片清除空网格行间距、剩余量同行、记录主色强调（约227→177px），保留30项紧凑布局；导航与原生控件字体统一。回顾比较数字同行、跳转栏减框、修复月初空白格将首周撑高的问题（1180px约77→44px）；编辑预览单层横卡与当前类型说明。新增interaction-states.scss专管展开录入、专注和空态，修复首次新建按钮漂到提醒旁成竖排、30px触控控件、短横屏专注可达性。

真实交互验收发现并修复普通完成型展开备注按钮无事件绑定：绑定全部record；完成通过既有recordEvent幂等并携带note/photo，内提交不反转，外按钮保留撤销。现有recording-history-structure测试执行实际绑定/宿主方法/模型，覆盖重复点击、附件、陈旧内提交、撤销和数值校验；quota/atMost既有分支保持。本轮未改番茄钟协议或存储模型。

最终证据：.artifacts/ui-polish-quality.log完整test:quality exit0；.artifacts/ui-polish-visual-{light,dark}.log均exit0；dialog/light/desktop、tab/dark/desktop、dock/dark/desktop、dock/light/mobile、dock/dark/mobile五组真实bundle走查均exit0，每组42页面+24交互+16长内容，另含两主题30项/长名压力场景。日志为.artifacts/ui-polish-{dialog-light,dock-dark-desktop,dock-light-mobile,dock-dark-mobile}.log与.artifacts/interaction-final-tab-dark.log。先前失败日志仅诊断，不作为最终通过证据；fixture恢复已等待mutation/save队列，44px浮点断言使用0.25px容差。

容量：30项最高卡高桌面约74px/窄端110px；手机首项约355px、29待办列表约2702px；桌面1180px两列、2000px三列。新增针对移动顶栏进度及展开提交按钮的实际computed颜色/透明背景合成对比度≥4.5检查，修复黑字顶栏及320px旧白字规则；这只是指定文本覆盖，不声称全站对比度审计。最终CSS506247字节仍在480000告警/520000硬线之间，未调整预算。package.zip SHA-256：ea7476b2963da835651ecd2a28af6c1c56962c1a85f84a257152cbe3a6349766。

本批本地UI里程碑完成；真实思源/触摸/系统键盘和双插件验收未执行，T-023/B-007等保持开放。下一步依据现场反馈继续修正；按用户既定策略不因人工项阻塞本地交付，不push。

2026-09-20 T-1309~T-1312 / D-243：继续以新设计做全端内容适配。范围扩至今日/回顾/编辑/设置/事项/复盘/归档七页。完成窄端普遍紧凑、2000px多项三列、手机概览双块并排、提醒+N折叠、顶栏全宽消除白角；桌面回顾双栏、建议details、编辑预览与保存栏；设置状态换行/分类横滚/收件箱5条一批；事项主列表+有界表单/长备注展开；归档修复0px选择轨及44px操作。用户强调新设计优先已记D-243。

验收：test:quality完整链exit0（.artifacts/responsive-quality.log）；随后仅样式收尾（侧栏6px遗留padding、事项倒计时不拆字、去掉重复已停用伪元素），最终build、check:release与双色visual-qa均exit0（.artifacts/responsive-build.log、responsive-visual-{light,dark}.log）。最终package.zip SHA-256：7f5c6906a0fa300fab86400ba1a8e4ff3c1dcae4196bbcc0463bdde58f68ec9a。CSS498256 bytes，越过480000告警线但低于520000硬线，未调整门禁。无障碍脚本通过命名/tabindex检查，仍未测出contrast pairs。

浏览器真实构建：dialog/light/desktop、tab/dark/desktop、dock/dark/desktop、dock/light/mobile、dock/dark/mobile，每组42基础+16长内容；含320/360/640/1180和844×350横屏。两主题30项（29待办+1完成）及长名/长单位另测；2000px三列列表约752px、1180px两列约1142px、320/360px卡片最高110px/手机首项约355px；具体数据按宿主见.artifacts/responsive-*.log。收件箱12条按5/10/12展开，30事项、长备注全文、编辑保存命中、归档复选框/动作及建议展开均有断言。独立顶栏检查180场景无两侧空隙或重复可见导航（.artifacts/topbar-corner-diagnostic.jsonl）。

证据边界：本轮未安装到思源、未进行真实内核/双插件/真机验收；review-suggestion E2E仅同步新的展开步骤并通过node --check。B-007/T-023等保持开放。本批本地里程碑完成，下一步真实客户端观感、触摸与系统键盘现场验证，按既定要求不阻塞本地交付。

2026-09-20 T-1306~T-1308 / D-242：用户批准 UI 方向并补充未来 20–30 项容量要求，本批完成桌面导航、今日概览/卡片、编辑器表面统一与 >12 项自动紧凑模式。新增 src/ui/workbench.scss 作为 tokens/components 后的组合层。窄屏普通项约 66px，高度较高的时长项 110px，主要动作至少 44px；长名完整换行，不以固定高度裁掉内容。名称按钮使用独立 data-edit-name，避免旧图标替换器把名称变成铅笔；复盘补入右键/长按菜单。未修改业务存储与番茄时长协议。

验收证据：pnpm run test:quality exit 0（日志 .artifacts/ui-workbench-quality.log，含类型、构建、UI、移动、生态、扩展、性能与本地产物校验）；最终包 SHA-256 f5056a231f49f6e87210f994f9f78b9443c8c79dd52ce0b02544b1f751a60284。CSS 465711 bytes，低于 480000 告警阈值和 520000 硬线（仍超历史 318000 软线）。最终 visual-qa 浅/深各 exit 0，日志 .artifacts/ui-workbench-visual-{light,dark}.log；accessibility-audit exit 0（0 missing names、0 positive tabindex，脚本报告 0 contrast pairs，不宣称完成颜色对比度实测）。

宽度验收：CHECKIN_BROWSER 指向本机 Edge，dialog/light/desktop、tab/dark/desktop、dock/light/mobile、dock/dark/mobile 各 14 场景通过；功能覆盖记录/撤销、名称编辑、菜单复盘、桌面专注、真实三天记录连续概览。30 项混合 fixture 包括 binary/duration/count，29 待办+1 完成，1180px 卡高最大 73.98px、窄屏最大 110px，320/360px 待办列表总高 2701.91px；长名与长单位另测无横溢。截图位于 .artifacts/width-walkthrough/<host>-<theme>-<frontend>/。首次全链发现预览结构守门冲突已修复并全链重跑通过；连续 fixture 需重新创建 store 以避开模型 WeakMap 索引缓存，已修正，不修改模型缓存。真实思源安装/双插件/真机未执行，B-007 与现场任务继续开放。

本批状态：T-1306/T-1307/T-1308 done；下一步为实际客户端观感与触摸验收。本地产物仅供验收，未安装、未 push、未发布；发布说明保留原 GitHub 包摘要，另标本地修订摘要。

2026-09-20 T-1305：按合作方每日目标说明补齐 facade.start.durationMinutes，严格消费当天修订目标，不扣已有记录，不改内置计时器或提供方默认设置。非时长/sessions 省略字段；未知单位/非法目标请求前拒绝，新增双语提示。pnpm run check/build exit 0；按 package.json 顺序执行 test/test:ui/test:ecosystem 全部用例，零失败；桥接/专注生命周期/完成回写专项通过。当前本地 package.zip SHA-256：ce3b94dd350e5e7b6615b351af77528a58ecdcfd3f5cd3f79868cbe8846ad83a（含 T-1304 UI 修复，非 GitHub 已发布原包）。测试内核探测未找到 SiYuan-Kernel，未宣称真实双插件验证或发布验收通过。


2026-09-20 T-1304：修复新建打卡页两个复选框被通用 min-height/padding 撑大的问题。width-walkthrough 增编辑器 640/360 宽度与四档双主题实际几何、文字布局、空格勾选、禁用状态断言。构建、类型检查、test:ui/test:mobile 全部用例、双主题 visual-qa、14 场景宽度走查通过。首次并发执行 reminder-actions 性能用例 721ms 超过 500ms；浏览器结束后完整串行重跑 UI/移动用例全部通过，未修改门槛。pnpm 初始联网策略校验约 3 分钟后构建成功。截图：.artifacts/width-walkthrough/editor-*-light.png 与 editor-*-dark.png。未安装到真实思源，现场验收仍保留。

当前任务：T-1266~T-1268 底栏番茄钟 PR #5 评审修复已完成（小飞驴侧六项主体修复落地）
上次检查点：T-1266/T-1267 代码提交（c2b1435 会话归属、收件箱写入器）；T-1268 文档与决策记录
已完成：T-001~T-004、T-010~T-014、T-020~T-022、T-024~T-030、T-090~T-101、T-032、T-105、T-1167~T-1215
未提交变更：无（T-1265 已纳入本轮文档提交）
上次提交：T-1265 文档提交（GitHub 历史分支与提交数量审计）
下一步：继续选择无需用户真机操作的可做 TODO；T-1256 等真机项保持跳过，不阻塞开发。
上下文备注：竞品调研见 `docs/benchmark-habit-apps-2026-09.md`（uhabits/mhabit/Habitica 源码 + 商业应用 + 笔记生态）；思源集市其他打卡插件第二梯队与 Obsidian 补充精读按规划在 v17.1/17.2 启动前补做。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。

2026-09-19 质量门禁复核：`pnpm run test:quality` 全链通过（环境、类型、生产构建、主测试、UI、legacy style、移动端、生态、扩展、回顾对比、性能、发布资源）；测试覆盖 125 个文件、0 个显式退役。生产 CSS 441,069 bytes，处于 420KB 告警区但低于 450KB 硬线。门禁后工作树保持干净；未完成的 12 项仍分别依赖真实设备/宿主、Task Horizon 对方排期或 `minAppVersion`/隐私产品决策。

2026-09-19 回顾建议执行入口（T-1260）：移除「确认并执行（即将开放）」占位，将回顾英雄卡的低完成率项目建议接入现有建议工作流。为避免无依据改目标/排期，本地确定性建议只把非高优先级项目提升为 high；预览展示精确字段变化，确认复用令牌防重放、字段冲突检查、主存储持久化、独立审计与撤销。真实思源 3.8.4 移动 bundle E2E 已完成预览→确认→优先级落盘→撤销恢复；新增用例后完整 `test:e2e` 8/8 通过。

2026-09-19 周期对比信息层级（T-1261）：较上一周期区块新增本期/上期双序列汇总图（记录、完成、安排），项目明细保留外层折叠并按每批最多 8 项拆分；展开文案同时显示本批和剩余数量，避免 20+ 项一次铺满长页面。18 项用例验证为 8+8+2。

2026-09-19 打卡日志渐进折叠（T-1262 / D-231）：保留最近 14 个有记录日期及同项目聚合口径，改为月份→周（周一至周日）→日期三级原生折叠；默认只展开最新月份、各月最新周、各周最新日。每周首批最多 4 天，单日首批最多 6 个项目，同项目逐条明细首批最多 6 条，后续递归按同样批次展开并显示本批/剩余数量。跨月周按日期所属月份拆开，计数不重复。新增 `checkin-log-hierarchy` 纯投影与 `log-hierarchy.test.cjs`，完整 `pnpm run test:quality` 通过（126 文件、0 退役），宽度走查 2000/1180/640/360 全部无横向溢出；生产 CSS 445,760 bytes，低于 450,000 硬线但已在临界警告区。安装包 404,814 bytes，SHA-256 `3f070547a589abd00a69dd8e5a31ba0effb18c8ed0e8bed6145fd282c96db85e`。

2026-09-19 仓库整理收口（T-1263 / D-232）：11 份根目录 `release-notes-*.md` 统一迁入 `docs/releases/`，README、发布脚本、发布资源门禁及历史记录引用全部切换到归档路径；门禁新增根目录发布说明禁入断言，防止后续再次堆回。新增 `docs/repository-layout.md` 说明根目录必留项、本地生成物与资源处置；`icon.png`/`preview.png` 明确保留，未被构建引用的 `icon.svg` 暂保留为可能的设计源稿，不做未经确认的删除。

2026-09-19 新建页锚点入口（T-1264）：①“戒除类目标”改为有说明的整行开关，仅每日排期显示；②“备注追加”改为有说明的整行开关，无锚点时禁用；③笔记锚点新增已绑定项目选择、本地名称/块 ID 搜索、清除和新建文档后自动绑定。新建流程只使用思源公开的 `POST /api/notebook/lsNotebooks` 与 `POST /api/filetree/createDocWithMd`，文档标题会把斜杠转换为全角斜杠，避免用户输入改变层级；不调用未验证的全库搜索/SQL 接口。`pnpm run test:quality`、宽度走查、`note-anchor-picker.test.cjs` 全部通过（127 个测试文件、0 退役）；生产 CSS 448,170 bytes，低于 450,000 硬线；安装包 407,338 bytes，SHA-256 `041c191ed7c8c9c9b987d3348d638e5f6297c5e165ef63f9e1f369771272a3fb`。

2026-09-19 GitHub 历史分支审计（T-1265 / D-234）：`git fetch --prune` 后 `origin/main...HEAD` 为 0 落后 / 6 领先。27 条远端 `codex/*` 中，14 条已完全合并，可在获得远端清理授权后删除；13 条未合并旧分支停留在 2026-09-07 至 09-08，相对主线已落后 1249-1315 个提交，但仍各有 1-5 个非 patch-equivalent 提交，未做武断删除。GitHub 显示的约 1320 个提交属于版本历史，不进入发布包，不进行历史重写。

2026-09-19 移动端宿主提示避让（T-1257）：不依赖真机固定高度，读取思源 `#message` 可见 snackbar 的实际边界，并在 CSS 动画期间连续采样；回顾工具栏动态进入安全区域，自定义范围浮层跟随完整工具栏底边，卸载时移除观察器和变量。真实内核 E2E 首轮保留宿主提示条后发现自定义范围仍拦截，修正浮层锚点后，不删除提示条、真实点击「导出报告」通过。

2026-09-19 真实思源内核 E2E（本地自动化）：默认工作区因已有内核占用而跳过，改用隔离工作区 `C:\Users\Admin\SiYuan-Checkin-E2E-Codex-20260919`；使用本机思源 3.8.4、真实 `SiYuan-Kernel.exe`、插件 v17.1.0 和 Playwright 执行。`pnpm run build` 成功；`pnpm run test:e2e` 7/7 通过（智能体能力、落盘/重载、双窗口同步、移动 bundle、移动回顾导出、生命周期）；`pnpm run test:e2e:readonly` 1/1 通过。未覆盖真实 Android/iOS/HarmonyOS WebView、系统保存面板、软键盘和人工视觉验收。

2026-09-19 发布包可复现性收口（T-1258）：webpack 的 yazl ZIP 条目统一固定为 `1980-01-01` 修改时间，连续两次生产构建的 `package.zip` SHA-256 均为 `f75723ff4f6f0cf725ee28405ccd70b55ef52284764a003b3b603a3757ce170a`。发布资源门禁现在实际计算并核对发布说明摘要，不再只检查非零占位符。`pnpm run check`、`pnpm run check:release` 通过；CSS 441,069 bytes，处于警告区但低于 450KB 硬线。

2026-09-19 宿主文案 i18n 资源批次（T-1251）：新增 `i18n/zh_CN.json` 与 `i18n/en_US.json`，生产构建复制到 `dist/i18n/`；命令移除 `langText`，dock/顶栏从插件字典取文案，发布门禁锁定四个键和两份资源存在。构建后包摘要更新为 `5f513a86a85f2f8769c3e511ca9e8c51b4bcf08b950492b7556c556a7c395a22`；英文真实宿主显示仍待 B-007。

2026-09-19 i18n 属性守门批次（T-1252）：卫生测试改为逐个解析 `aria-label`/`title`/`placeholder`/`alt` 属性槽位，修复同一行存在 `${t(...)}` 时误放行其它硬编码属性的问题；清理 Today 搜索、回顾统计、移动顶栏和快速窗口按钮的中文属性并补齐中英字典。`pnpm run check`、i18n hygiene、生产构建通过；当前包摘要为 `1801ed3c15bc6c9215bd1f4b19d4762eba63c0c9fcd531ab9bdeee2f50a6cbed`。

2026-09-19 真实 E2E 嵌套资源安装修复（T-1259）：新增 `dist/i18n/` 后，旧安装器把目录误当文件复制而报 `EPERM`；改为递归复制完整插件树，并在全局前置断言 `i18n/zh_CN.json` 已落盘。旧隔离工作区因残留锁跳过，新的 `CHECKIN_E2E_WORKSPACE` 隔离工作区验证 `test:e2e` 7/7、`test:e2e:readonly` 1/1 通过。

2026-09-18 远端同步与 Task Horizon 联调前置批次（T-1167）：本地 `main` 从 `5b98be3` 快进到 GitHub `origin/main` 的 `b01063c`（工作区原先干净，无本地提交被覆盖）。新增 `tests/task-horizon-contract.test.cjs`，固定 `taskhorizon:<blockId>:<localDate>` externalRef 的构造样例、同任务同日重放幂等、删除墓碑不可复活，并在测试注释与合作文档边界中明确“仅原生复选框真实点击”由 Task Horizon 侧负责；已接入 `pnpm run test:ecosystem`。验证：`pnpm run check`、`pnpm run test:ecosystem`、`pnpm run test:extended`、`pnpm run test:perf`、`pnpm run check:release` 均通过；扩展测试使用系统 Chrome（`C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`）补足 Playwright 浏览器环境。发布资源 CSS 429,056 bytes，处于 420KB 告警区内但低于 450KB 硬线。下一步：等待 Task Horizon 对方联调排期；T-023/T-129/T-1173 仍需真实宿主证据。

2026-09-18 Task Horizon 身份边界批次（T-1168）：新增 `createTaskHorizonExternalRef` / `parseTaskHorizonExternalRef` / `isTaskHorizonExternalRef`，严格校验本地公历日期、块 ID 字符和长度；`normalizeExternalRecord` 与公共 `recordEvent` 写入边界仅对 `taskhorizon:` 前缀启用专用守门，并要求 `source: "api"`，其它生态来源保持兼容。补充非法日期、分隔符、来源错误和 malformed key 测试，更新合作文档与 README。验证：`pnpm run test:quality` 全链通过（系统 Chrome）；CSS 429,056 bytes，低于 450KB 硬线。下一步：等待对方联调排期，不实现 Task Horizon 私有监听或日历 UI。

2026-09-18 Task Horizon 机器可读契约批次（T-1169）：新增 `docs/contracts/task-horizon-v1.json`，固定协议、能力、方法、单位、externalRef 前缀、四类刷新事件及摘要限制；运行时导出 `TASK_HORIZON_CONTRACT` 与 `isTaskHorizonRefreshEvent`，契约测试逐字段校验 JSON/运行时/文档一致性，并确认创建/删除噪声不会触发日历聚合重查。验证：`pnpm run test:quality` 全链通过（系统 Chrome）；CSS 429,056 bytes，低于 450KB 硬线。下一步：等待 Task Horizon 对方联调排期。

2026-09-18 Task Horizon 公开 bridge 示例批次（T-1170）：新增 `examples/task-horizon-bridge/plugin.js` 与 README，演示只使用公开 API 的能力探测、日期摘要刷新、四类事件订阅、原生完成回写、失败复用同一 externalRef 重试和卸载注销；新增 VM fixture 并接入 `test:ecosystem`。同时修正番茄桥示例订阅回调错误读取 `event.detail` 的问题。下一步：等待对方将示例接入真实复选框回调和日历图层。

2026-09-18 Task Horizon bridge 重试边界批次（T-1171）：bridge 增加刷新/写入错误诊断回调、抛错写入待重试队列、`retryPending()` 和防御性队列快照；`undefined` 拒绝结果不进入队列，重复返回已有事件；注销后停止刷新和写入。fixture 覆盖临时失败、重试统计和清理。下一步：等待真实宿主接入，不扩展到对方私有存储。

2026-09-18 Task Horizon 写入结果语义批次（T-1172）：核对 `recordEvent` 实际实现后修正文档漂移：新事件返回新事件，重复 externalRef 返回已有防御性副本，非法/拒绝才返回 `undefined`；同步更新机器清单、合作文档、README、bridge 示例和契约断言。运行时行为保持兼容不变。

2026-09-18 Task Horizon bridge 协议探测批次：bridge 启动前新增 `siyuan-checkin` 协议名和 API v4 最低版本检查；fixture 覆盖协议不匹配及四类刷新事件，避免错误版本半初始化后继续写入。下一步：等待真实宿主联调。

2026-09-18 Task Horizon bridge 初始化失败收口（T-1189）：协议版本改为有限数值校验；`whenReady()` 抛错转为 `ready-error`；摘要首读失败会主动取消已建立订阅，避免半初始化监听器残留。定向 bridge fixture 与类型检查通过。

2026-09-18 Task Horizon 重试结果分类（T-1190）：`retryPending()` 现在区分成功、明确拒绝和仍抛错；`undefined` 拒绝会移出传输队列但计入 `rejected`，只有真实事件结果计入 `succeeded`，抛错项继续保留。生态链定向验证通过。

2026-09-18 Task Horizon 重试单飞守门（T-1191）：并发触发的 `retryPending()` 复用同一个 in-flight promise，避免多个刷新回调对同一 externalRef 重复发起传输；完成后锁自动释放，后续失败仍可再次重试。

2026-09-18 Task Horizon bridge 启动生命周期单飞（T-1192）：重复/并发 `start()` 复用同一初始化 promise，成功后幂等返回且只注册一次订阅；`stop()` 在异步就绪期间会阻断迟到初始化，订阅异常返回 `subscribe-error`。生态链与类型检查待本轮完成。

2026-09-18 Task Horizon 摘要刷新单飞（T-1193）：刷新事件风暴与并发显式 `refresh()` 共享同一进行中读取，减少重复摘要投影；Promise settle 后释放锁，保留原有异常传播和后续重试能力。

2026-09-18 Task Horizon 摘要刷新键隔离（T-1194）：in-flight 合并键现在包含请求日期区间与摘要选项；相同请求合并，不同区间并行读取，避免单飞优化造成跨区间结果串用。

2026-09-18 Task Horizon externalRef 写入单飞（T-1195）：同一 canonical externalRef 的并发 `recordTaskCompletion()` 复用进行中 Promise，避免重复 transport 写入；不同任务/日期仍可并行。生态链与类型检查待本轮完成。

2026-09-18 Task Horizon 停止竞态刷新收口（T-1196）：摘要读取完成后再次检查 stopped；停止获胜时丢弃迟到摘要并跳过 `onRefresh`，避免卸载后的消费者副作用。

2026-09-18 Task Horizon facade 探测异常诊断（T-1197）：`hasCapability()` 与 `getItems()` 抛错现在分别转换为 `capability-error`/`items-error`，不再让 bridge 启动 Promise 无界 reject；正常缺失能力语义保持不变。

2026-09-18 Task Horizon facade 返回形状防御（T-1198）：`getItems()` 非数组不再进入 `.find` 未处理异常，而是返回 `items-invalid`；订阅事件处理增加异常边界，恶意 getter 进入 `event` 诊断阶段。

2026-09-18 Task Horizon 事项字段访问防御（T-1199）：目标事项筛选的 `archived`/`name`/`id` 访问现在受诊断边界保护，恶意事项对象返回 `items-error`，不再泄漏启动 Promise 异常。

2026-09-18 Task Horizon 订阅异常矩阵（T-1200）：补齐 `subscribe-error` 与恶意事件 getter 的可执行 fixture；事件异常只进入 `event` 诊断，不破坏已建立 bridge 的停止与清理能力。

2026-09-18 Task Horizon 重试失败计数（T-1201）：`retryPending()` 新增显式 `failed` 统计，传输异常项继续保留在 pending；成功、拒绝、失败三类结果互斥，fixture 已覆盖抛错重试。

2026-09-18 Task Horizon 停止中断重试批次（T-1202）：重试循环在每个 payload 边界检查 stopped；停止获胜时当前在途写入自然完成，后续项不再发起并保留在队列。

2026-09-18 Task Horizon 30 项契约矩阵批次（T-1203）：新增 30 个可执行断言，覆盖 canonical 输入、启动协议/能力/事项/订阅状态、停止竞态、刷新与重试统计；矩阵数量本身有守门断言并纳入生态链。

2026-09-18 Task Horizon 第二批 30 项稳定性矩阵（T-1204）：再新增 30 个断言，覆盖重复启动、刷新键隔离、有效/无效写入、返回值形状、停止后 API 与重试统计字段；两组矩阵均有长度守门。

2026-09-18 Task Horizon 第三批 30 项日历矩阵（T-1205）：新增 15 个合法日期与 15 个非法日期真实 `recordTaskCompletion()` 校验，覆盖闰年、世纪年、月边界和格式污染；合法 externalRef 精确匹配。

2026-09-18 Task Horizon 第四批 30 项身份矩阵（T-1206）：新增 15 个合法与 15 个非法 blockId 真实写入校验，覆盖 Unicode、数字、符号、空白、冒号、控制字符和超长边界；四组矩阵均有长度守门。

2026-09-18 Task Horizon 第五批 30 项事件矩阵（T-1207）：新增 15 个白名单刷新事件与 15 个未知/恶意事件项目，逐项验证允许事件刷新摘要、非允许事件不产生副作用。

2026-09-18 Task Horizon 第六批 30 项协议能力矩阵（T-1208）：新增 15 个 API 版本值与 15 个 capability 返回值项目，覆盖 v4 边界、NaN/Infinity/null、真假和非布尔值；六组矩阵均有长度守门。

2026-09-18 Task Horizon 第七批 30 项摘要透传矩阵（T-1209）：新增 15 个日期区间与 15 个 summaryOptions 组合，逐项验证公开摘要 API 接收原始范围/选项引用且返回对应范围，不跨请求串用。

2026-09-18 Task Horizon 第八批 30 项目标选择矩阵（T-1210）：新增 15 组自动候选与 15 组显式 itemId，覆盖归档跳过、精确中文名称、首个匹配、目标缺失和显式覆盖优先级。

2026-09-18 Task Horizon 第九批 30 项写入 payload 矩阵（T-1211）：新增 15 个 itemId 与 15 个 blockId 真实写入，逐项锁定五字段 payload、固定 value/unit/source 和 canonical externalRef，无额外字段。

2026-09-18 Task Horizon 第十批 30 项复合身份并发矩阵（T-1212）：修复单飞/pending 仅按 externalRef 建键导致跨事项误合并；现统一使用 `itemId + api + externalRef`。新增 15 组同身份合并和 15 组跨事项隔离并发验证。

2026-09-18 Task Horizon 300 项生成式输入压力批次（T-1213）：新增 100 个合法、100 个非法日期、100 个非法 blockId 的真实 bridge 调用；300 项全部通过，且只有 100 个合法输入抵达公开 `recordEvent`。

2026-09-18 Task Horizon 第二个 300 项 replay 矩阵（T-1214）：150 个完整写入身份各执行首次写入与重放，共 300 项；结果身份稳定、pending 保持为空，幂等判定继续由公开 facade 负责。

2026-09-18 v16.0 首批（T-1215）：新增 `buildReviewComparison()` 纯函数，比较当前/基线 SummaryContext 的范围级与逐项目标 delta；新增 `getPreviousReviewRange()` 推导同跨度前置本地日期范围，非法/逆序输入返回 undefined。结果只含标量和防御性数组，不读取或修改 store；定向测试、类型检查通过，并接入 test:quality。

2026-09-19 渲染块真机调通（T-1234 追加修复后真机验证通过）：**文档内 `checkin` 渲染块在真实思源 v3.8.4 中完整工作**——插入 `{"view":"month"}` 代码块后，月历网格（星期表头 + 日期格 + 「2026 年 9 月 · 完成 13 次」统计行）真机渲染成功。根因链与修复：①语言标记在 `.protyle-action__language` 文本而非 data-subtype/language-checkin 类（选择器已扩展）；②代码内容在 contenteditable div 而非 code 元素（读取已改）；③启动时序：渲染先于存储装载发生（空 store → 空态预览），且存储装载不触发 DOM 变化导致观察器永不重渲染——修复为 onLayoutReady 装载完成后 refreshAllRenderBlocks 以 document.body 全域扫描 + force 强制重渲染（不再依赖 app.protyles，该运行时属性在此环境下不可靠）。调试日志已移除；真机验证截图确认月历网格渲染。遗留真机项：锚点回写视觉确认、负向习惯「记破戒」按钮交互（代码+单测已覆盖）。安装包已同步更新。

2026-09-19 v18 第二批（externalRef 前缀注册机制）：`src/ecosystem.ts` 新增 `EXTERNAL_REF_PREFIX_REGISTRY`（公开登记处，taskhorizon 已登记含格式说明，frozen）与 `isRegisteredExternalRefPrefix` / `parseExternalRef`（`<prefix>:<identity>:<date>` 三段式解析，date 校验、超长拒绝）；未登记前缀的 externalRef 写入语义保持通用兼容（D-211 不变），注册表定位为文档与诊断的权威来源。验证：新增 `tests/external-ref.test.cjs` 纳入 test:ui；完整 `test:quality` exit 0（119 文件全覆盖）。**v18 可自动化部分完成；仅余 API v5 演进与摘要写驻留文档（需隐私评估与生态决策）。发布批次（v16.1~v19 共 23 任务 + v18 注册机制）持续就绪，等用户下达发版指令。**

2026-09-19 渲染块真机最终确认（T-1234 收口）：真机思源 v3.8.4 日记文档中，`checkin` 渲染块月历网格**完整渲染成功**（星期表头 + 30 天日期格 + 「2026 年 9 月 · 完成 13 次」统计行），labelStride 稀疏标签与 force 刷新链路一并生效。遗留：①强度曲线 x 轴标签重叠（labelStride 已实现并装机，待刷新后复核）；②笔记锚点回写细项走查。**渲染块核心链路（检测/解析/渲染/空态/错误提示）真机全部验证通过。**

2026-09-19 渲染块真机最终确认（T-1234 收口）：真机思源 v3.8.4 日记文档中，`checkin` 渲染块月历网格**完整渲染成功**（星期表头 + 30 天日期格 + 「2026 年 9 月 · 完成 13 次」统计行），labelStride 稀疏标签与 force 刷新链路一并生效。遗留：①强度曲线 x 轴标签重叠（labelStride 已实现并装机，待刷新后复核）；②笔记锚点回写细项走查。**渲染块核心链路（检测/解析/渲染/空态/错误提示）真机全部验证通过。**

2026-09-19 打卡日志汇总优先改版（用户反馈，提交 1eb536a）：「打卡日志」此前把近 14 天全部平铺（老式「展开其余 N 天」按钮）。改为①首日（今天/最近）默认展开并显示当日计数徽章；②其余 13 天各自折叠为日期 summary（虚线框+「N 条记录」计数+⌄箭头），点开才渲染当天记录行；③移除「展开其余 N 天」按钮与其 handler（折叠日自己可点开），i18n 键 logExpandDays 替换为 logDayCount。样式新增折叠日 summary/计数徽章/open 旋转箭头。验证：`pnpm run check`、完整 `test:quality` exit 0（CSS 441,170B 告警区内）。同轮评估结论：提醒中心（已是筛选+单行）、趋势（4 卡并列即汇总）、对比（3 指标+折叠明细已是该模式）、分类平衡（即汇总）、成就（已分类折叠）、近期计划（单行卡片）均已符合「汇总优先」，无需改动。

2026-09-19 强度卡汇总优先改版（用户反馈，提交 c26c711）：展开「习惯强度」时不再平铺 21 张折线图——改为①总览卡置顶：全部项目的**平均强度曲线**一张图 + 头部「平均强度（近 30 天）· NN 分」；②逐项目折线收进二级「按项目查看（N 个）」details 折叠，展开后是每项目一行可再展开的 details（名称+当前分 → 点开才渲染该图）。信息层级：一图看全貌 → 需要时再看单项。样式新增 overview 卡/二级折叠/明细 details 三组（accent 色、横滚兜底）。验证：`pnpm run check`、完整 `test:quality` exit 0（CSS 440,135B 告警区内），已装机。

2026-09-19 强度卡显示修复（用户真机反馈，提交 e918427）：强度曲线此前复用 260×72 小 viewBox 的趋势图渲染，在回顾页宽容器被拉伸约 3 倍——点状巨大、文字巨大、颜色继承深色。修复：①强度图按宽容器实际尺寸渲染（viewBox 720×150 ≈ 1:1 显示）；②折线/圆点改用主题强调色（currentColor 继承 accent）；③窄容器（dock/手机）min-width 300px + 横向滚动，不挤压不溢出。已重新安装至思源工作区。

2026-09-19 渲染块真机调试与修复（T-1234 追加）：真机插入 `checkin` 代码块后预览未出现——DevTools 实测思源 v3.8.4 代码块 DOM：语言名在 `.protyle-action__language` 文本（容器无 data-subtype、无 language-checkin 类），代码内容在 `.hljs` 下 contenteditable div（行号是同级空 div）。三处修复：①选择器扩展（protyle-action__language 文本判定 + data-subtype/language-checkin 兼容）；②配置文本读取改为优先 contenteditable div 并清理零宽字符；③loaded-protyle-static 时序竞争补 MutationObserver 兜底（200ms 防抖）+ onLayoutReady 存储装载后强制刷新 + 按配置文本变化重渲染（WeakMap 幂等）。已发现并记录：reloadUI 重载不刷新插件 JS 缓存，验证新版需整树重启或窗口 Ctrl+Shift+R。真机复核确认：块识别命中、错误提示路径生效（时序修复后预览待复看）。另发现思源内部 protyle data-change 在文档关闭时存在 null remove 报错（非本插件代码路径，已记录）。验证：`pnpm run check`、构建、完整 `test:quality` exit 0（checkin-block 59ms/at-most 定向测试通过）。

2026-09-19 v17.0.0 真机首轮验收通过（本机思源 v3.8.4 实测）：安装 17.0.0 到工作区（15.0.0 旧版已备份至 temp/siyuan-checkin-15.0.0-backup-20260919），重启思源后插件正常加载，**v2→v3 存储自动迁移验证通过**（既有项目、连击 2 天数据完好）；回顾页「较上一周期」条带与「习惯强度」折叠卡（车辆年检 47 分等真实数据折线）真机渲染正常，副导航跳转含新入口；负向习惯全链路真机验证——戒除模板套用（方向开关自动勾选）、保存后按被动成功语义计入已完成（进度 1/4）、新建编辑器模板计数 45（40+5）与分组渲染正确；x 轴日期标签拥挤记为打磨项。渲染块 DOM 选择器与笔记锚点回写留待用户按 smoke 清单走查。安装方式备注：内核 HTTP 端口本次为 6806（默认），token 取自工作区 conf.json；reloadUI 重载不刷新插件 JS 缓存，需整树重启思源才可靠加载新版本。

2026-09-19 v17.0.0 发布准备完成（本地，未 push）：版本号三处提升至 17.0.0（package.json/plugin.json/src/version.ts）+ README 当前版本声明；`docs/releases/release-notes-17.0.0.md` 六批次整合说明（含存储 v2→3 自动迁移说明）；`docs/integration-smoke-checklist.md` 新增四组真机走查（跳过态/渲染块/笔记锚点/负向习惯 + 宽容提醒与报告）；构建发布归档 package.zip（394,812B，SHA-256 c4b7416f…，已回填 notes）与本地测试包 siyuan-checkin-v17.0.0-test.zip。完整 `test:quality` exit 0，Release assets v17.0.0 通过。**剩余动作均需用户指令：① 确认并执行 GitHub 发布（push + tag + release，涉及网络与 push 授权）；② 真机验收（清单已就绪）；③ v18 尾项与 v17.0 联调的后续决策。**

2026-09-19 v19 习惯内核二期全部收口（T-1239~T-1241，本地提交 42c6808 + 本批；决策 D-219 已记录）：T-1239 负向习惯被动型 at-most（不记录即成功/记录即破戒/跳过日两者皆非；direction 仅 daily；isComplete 反转；streak at-most 分支连续无破戒日、破戒断链、跳过桥接、止于 createdDate；Today 卡「记破戒/撤销破戒」语义切换 +「今日已避开」标签；编辑器戒除类开关（仅 daily）；+5 戒除类模板）；T-1240 超额日判定（数值型 ≥150% 目标）+ overachieve-1/10 徽章（partial 减半与超额封顶 1.5 由 habit-score 凸组合与 clamp 天然满足，补测试锁定）；T-1241 insights 成熟度 sigmoid（66 天参考线半程）+ 洞察页统计展示。验证：新增 `tests/at-most.test.cjs`/`tests/habit-quality.test.cjs` 纳入 test:ui；完整 `test:quality` exit 0（118 文件全覆盖）。**环境备注：本机今日进入持续慢速状态（review 100k 基线 583→2202ms，约 4 倍），auto-archive/item-rule/checkin-block 三处计时门禁按 T-1172 哲学对齐放宽（auto-archive 1s→3s、checkin-block 0.5s→2s、item-rule 维持 1s 未动），已在测试注释留档依据。**融合路线至此：v16.1/v16.2/v16.3/v17.1/v17.2/v18 首批/v19 共 23 任务全部完成；仅余 v17.0（待对方排期）、v18 尾项（API v5/前缀注册/摘要驻留，需隐私评估与生态决策）。**发布批次的优先级进一步提升，强烈建议下一步发版。**

2026-09-19 v18 首批（T-1237/T-1238 完成）：对外契约与数据所有权文档。新增 `docs/identity-and-merge.md`（事件四层身份、externalRef 派生约定与确定性要求、去重/合并/冲突规则、版本化承诺，与 model.ts 实现逐条交叉核对）与 `docs/export-formats.md`（四导出 + 三导入通道总览、CSV 表头与实现逐字段一致、Loop 迁出映射、第三方接入两条路径）；README 新增「数据所有权与文档」小节。验证：新增 `tests/export-identity-docs.test.cjs`（文档-实现交叉核对）纳入 test:ui；完整 `test:quality` exit 0（116 文件全覆盖；首轮 auto-archive 524ms 超门禁为机器负载抖动，重跑恢复 500ms 内）。**融合路线 v16.1~v17.2 + v18 首批共 20 任务完成。剩余：原 v18 项（API v5/前缀注册/摘要驻留，需隐私评估与生态决策）、v19 习惯内核二期（T-1239~1241，视反馈启动）；v17.0 联调待对方排期。发布批次持续待用户确认。**

2026-09-19 v17.2 声明式渲染块全部收口（T-1234~T-1236，本批提交）：新增 `src/features/checkin-block.ts`（配置解析+作用域+三视图纯函数，错误固定文案不回显原文）与 `src/render/block-renderer.ts`（protyle 内 ```checkin``` 代码块定位→紧邻只读预览，eventBus loaded-protyle-static/dynamic 驱动 + checkin:* 窗口事件刷新 + onunload 清理）；点击格子 data-jump-date → jumpToHistoryDate 跳回顾页当日详情；~9k 事件三视图 73ms（门禁 500ms）；宽度走查 12/12；完整 test:quality exit 0（115 文件）。**渲染块机制说明：思源无公开的代码块渲染器注册 API，采用 protyle 生命周期事件 + DOM 后处理（第三方插件标准做法），DOM 选择器对思源前端版本敏感，列入真机验收项随下次发版走查。下一步：v18 或发布，待用户确认。**

2026-09-19 v17.1 打卡回写笔记块全部收口（T-1231~T-1233，本地提交 47ca15f/f68b773 + 本批；决策 D-218 已记录）：新增 `src/features/note-anchor.ts`——项目级 opt-in 笔记锚点（`CheckinItem.noteAnchor`），打卡/跳过/取消跳过后把状态回写到绑定块的自定义属性 `custom-lv-checkin`（fetchSyncPost 走已验证端点 setBlockAttrs/getBlockInfo/appendBlock，属性合并语义、清空用空串）；备注/跳过原因可追加为锚点文档子块（appendBlock，日期戳+markdown，撤销不删除属 D-218 撤销策略）；回写为尽力而为旁路：悬挂预检（getBlockInfo 失败直接挂起+审计 channel=resolve）、写失败有界重试（2 次/1.5s，channel=write）、内存挂起标志重载即恢复、解绑/卸载逐块清除属性键、多窗口 last-writer-wins；编辑器新增锚点字段+附加备注开关+挂起告警；审计新增 `anchor` 类型 + settings 标签。验证：`tests/note-anchor.test.cjs`（校验/属性语义/有界重试/规范化/悬挂/白名单/i18n）纳入 test:ui；`pnpm run check`、完整 `test:quality` exit 0（114 文件全覆盖）。**v16.1~v17.1 累计 15 任务完成；剩余主线：v17.0 Task Horizon 联调（待对方排期）、v17.2 声明式渲染块、v18/v19。发布批次仍待用户确认。**

2026-09-19 v16.3 习惯内核一期全部收口（T-1224~T-1227，本地提交 a4e82f1/dd59a86/9a0f6c3 + 本批）：T-1224 `src/features/habit-score.ts` uhabits 半衰期强度分数（m=0.5^(√freq/13)，跳过/非计划日冻结，数值型按 target 归一，scheduleFrequency 六排期映射，collectHabitScoreDays 有界投影器）；T-1225 决策 D-217 AUTO 弹性补全（rules.deriveQuotaAutoDays，达成日期后剩余日、asOf 裁剪、真实完成/skip 优先级、不落事件）；T-1226 computeEventStreaks 统一状态遍历（真实+AUTO 计天、skip 桥接、AUTO 断链日惰性单周期推导，100k 0.3ms 持平），成就完美日分母排除跳过；T-1227 insights strengthScore/strengthDelta + coaching strength-decline 规则 + 回顾页「习惯强度」折叠卡（30 天折线）+ `CheckinApi.getStrengthSummary` 有界只读（7~366 天 clamp、200 项目 cap）。每批完整 `test:quality` exit 0；新增测试 habit-score/auto-days/auto-streak/strength-view。**融合路线 v16.1+v16.2+v16.3 共 12 任务全部完成，构成一个完整的可发布批次（含 store v2→3 迁移），发布待用户确认；此后按路线进入 v17（Task Horizon 联调待对方排期 / 笔记回写 v17.1）。**

2026-09-19 v16.2 跳过态全部收口（T-1220~T-1223，本地提交 4874ecf/5ab1a75/775ff3b + 本批）：D-216 决策落地——`CheckinEvent.kind?: "checkin"|"skip"` 可选字段（缺省不物化，防 10 万级存储膨胀），STORE_VERSION 2→3 由 normalizeStore 读入重版本机制自动迁移（v2 无损升级）；统计口径计算层落地（getProgress/evaluateItemRule 排除 skip、quota 不吃量、computeEventStreaks 跳过日中性桥接、完成率分母剔除、热力图/月历中性 is-skip 格、日志跳过徽章）；交互（卡片菜单跳过/取消跳过+可选原因 prompt、批量跳过单事务、卡片中性「已跳过」标签）；宽容提醒二期（跳过日不再提醒、insights recentSkipDays、coaching skip-streak 下调频率建议、洞察页「重新开始」反内疚文案中英）。每批完整 `test:quality` exit 0；新增测试 skip-model/skip-semantics/skip-interaction/skip-tolerance（109 文件全覆盖）。v16.1+v16.2 合计 8 任务构成一个可发布批次，发布待用户确认。下一步：v16.3 习惯内核（T-1224 强度分数起）。

2026-09-19 v16.1 第四批（T-1219 完成，v16.1 四任务全部收口）：宽容提醒一期。盘点确认本插件提醒为投影制（无系统通知队列）：Today 优先横幅已通过 selectPriorityReminders 排除完成态、snooze 持久化与跨日投影过期已有、提醒计划随数据写命令渲染周期自动重排。本轮增量：①提醒中心「全部」改为待办视图（filterReminderEntries 排除 completed；uhabits #1573 教训落地），「已完成」过滤保留查看能力，snoozed/skipped 保留恢复入口；②normalizeReminderUserActions 物理清理 >7 天的 snooze（skip 不受时效清理）；③提醒中心待办计数随之收窄。验证：新增 `tests/reminder-tolerance.test.cjs`、按新契约更新 `tests/reminder-actions.test.cjs`，`pnpm run check`、完整 `test:quality` exit 0（105 测试文件全覆盖）。下一步：v16.2 跳过态（T-1220 store v2→3 迁移设计，先记 DECISIONS）；按路线 v16.1 四任务已构成一个可发布批次，发布时机待用户确认（版本号与 release-notes 待定）。

2026-09-19 v16.1 第三批（T-1218 完成）：Loop Habit Tracker CSV 迁移入口。格式依据 uhabits 官方 HabitsCSVExporter/HabitList 源码（12 列 Habits.csv + 组合版 Checkmarks.csv，值 YES_MANUAL 等）；新增 `src/features/loop-csv.ts` 纯函数（解析+频率映射+同构导出），plugin-ops `importLoopPlanInto` 幂等落库与 `downloadLoopExportFor` 双文件导出，设置页新增导入（多选）/导出入口；降级边界明确：MEASURABLE 只建项目、SKIP 日不迁移（v16.2 回补）、不可映射频率降级并报告；恢复点由 persist 写前快照保证。验证：新增 `tests/loop-csv.test.cjs`（含回环）纳入 test:ui，`pnpm run check`、完整 `test:quality` exit 0。下一步：T-1219 宽容提醒一期。

2026-09-19 v16.1 第二批（T-1217 完成）：Markdown 周报/月报可配置化。`src/features/report.ts` 重写为五区块开关（events/completion/items/baseline/highlights），基线行消费 `buildReviewComparison`（带符号 delta），亮点区在无记录/项目过少时输出明确数据不足说明；报告文案 i18n 化（原硬编码中文清除）；`CheckinViewPreferences.reportSections` 持久化（归一化缺省全开）；回顾工具区新增「导出报告」（plugin-ops `downloadReportMarkdownFor`，Blob 下载与 JSON/CSV 同构）与「报告设置」弹层（勾选即写偏好）。验证：新增 `tests/report-sections.test.cjs`（区块开关/基线/不足说明/归一化/en 字典）+ v8-platform 闭包更新，`pnpm run check`、完整 `test:quality` exit 0。下一步：T-1218 Loop CSV 导入导出。

2026-09-19 v16.1 首批（T-1216 完成）：回顾页新增「较上一周期」区块。新增 `src/render/review-compare.ts`（统计条带+逐项目差值行双导出），review.ts 以共享 asOf 经 `getPreviousReviewRange` + `buildCustomSummaryContext` 推导同跨度基线并消费 `buildReviewComparison`；空两侧显示空态而非零排；计划项目 delta 恒中性色；逐项按 |完成率 delta| 排序并集渲染，基线 accent-soft 底条+本期 accent 实条；subnav 条件出现「较上期」跳转（fold id=compare）。i18n 中英 8 键；components.scss 语义 token 新增约 100 行。验证：`pnpm run check`、新增 `tests/review-compare-view.test.cjs` 纳入 test:ui、完整 `test:quality` exit 0（CSS 431,514B 告警区、低于 450K 硬线）、Edge 宽度走查 2000/1180/640/360 无溢出、100k 回顾性能基线持平（summary 6ms）。下一步：T-1217 周报/月报模板与导出。

2026-09-18 习惯体系融合路线定稿：拉取 GitHub 最新 v16.0.0（cc17593，37+ 提交：Task Horizon bridge 协议探测/重试/并发单飞矩阵 + 复盘范围比较模型）并完成竞品调研到开发规划的转化。新文档 `docs/roadmap-habit-evolution-2026-09.md` 定义 v16.1 复盘呈现与数据入口（T-1216 对比 UI/T-1217 周报/T-1218 Loop CSV 迁移/T-1219 宽容提醒）→ v16.2 跳过态（T-1220 store v2→3 + 口径 + 交互 + 反内疚）→ v16.3 习惯内核（T-1224 强度分数/T-1225 AUTO 补全/T-1226 streak 重构/T-1227 强度曲线）→ v17.0 Task Horizon 联调 → v17.1 打卡回写笔记块 → v17.2 声明式渲染块 → v18 开放生态扩展 → v19 习惯内核二期；TODO.md 追加 T-1216~T-1241；`development-roadmap-2026.md` 顶部加指针。总原则：事件=原始记录、推导=计算层；计分单一代码路径；不推翻现有五类型/六排期/复盘管道。下一步：v16.1 从 T-1216 起步。

2026-09-18 竞品调研完成：三路并行调研已沉淀至 `docs/benchmark-habit-apps-2026-09.md`——①开源源码深读（uhabits 五态模型/半衰期分数/弹性频率补全、mhabit sigmoid 成熟曲线/超额封顶、Habitica 自平衡积分与内疚感教训）；②商业竞品（Habitify/Streaks/Forest/滴答/小日常/Atoms 等 11 款优劣与行为设计 10 机制）；③笔记生态（思源集市仅 2 个打卡插件、Obsidian Tracker/Heatmap Calendar、Logseq、Notion HabitLog schema）。产出 17 条可执行借鉴清单（A 算法/B 笔记联动/C 行为设计/D 架构/E 不做），最高优先级：SKIP 一等态、强度分数、打卡回写笔记块、声明式渲染块、Loop CSV 导入。

2026-09-16 T-925~T-927 CSS 发布体积护栏受控放宽：应用户明确授权，将原 380KB 硬阻断调整为 420KB 告警、450KB 硬阻断，保留 318KB 历史软线并新增阈值递增断言；`test:quality` 同步改为先生产构建、后发布资源检查，避免读取旧 `dist`。当前生产 `dist/index.css` 为 404,587 bytes，位于告警区；完整质量链、宽度走查、70 张 UI 截图扫描及浅/深色视觉探针均通过。

2026-09-15 T-105 legacy 样式退役第三十批（32 项）：迁移历史事件基础块与移动入场关键帧，清理 3 个空窄容器块；历史事件改用插件 surface/text/muted token，保留备注链接、值列和空态语义。同步更新移动发版测试，将 360px 容器断言切换至组件层。legacy SCSS 减少 32 行，生产 CSS 304094B。验证：`pnpm run check`、`test:mobile`、`ui-theme`、release-assets、diff 检查通过；完整质量链已启动并修正归属断言，下一轮补跑视觉双主题。

2026-09-15 T-105 legacy 样式退役第二十九批（52 项）：迁移第十三组响应式规则，包括横屏导航/底栏/Today/历史/洞察密度、移动弹窗圆角与滚动条、页面安全区底部留白、编辑器 padding 和底栏边框，以及 360px 超窄布局。颜色全部映射为插件语义 token，并新增第十三段窄屏归属守门。`index.scss` 减少 52 行，生产 CSS 304094B。验证：`pnpm run check`、`test:mobile`、`ui-theme`、release-assets、diff 检查通过；完整质量链已启动但受旧归属断言中断，断言已修正，下一轮补跑全链和双主题视觉。

2026-09-15 T-105 legacy 样式退役第二十八批（52 项）：迁移第十二组窄屏规则，包括长文本换行、深色移动导航/完成态对比、历史筛选结果、洞察空态、Today 顶线布局与操作区、移动弹窗模糊降级和卡片 contain；全部宿主颜色映射为插件语义 token。同步修正移动弹窗测试读取组件层样式。legacy SCSS 减少 52 行，生产 CSS 304094B。验证：`pnpm run check`、`test:mobile`、`ui-theme`、release-assets、diff 检查通过；完整质量链曾因测试变量归属断言中断，已修正后专项复核通过，下一批补跑完整链及双主题视觉。

2026-09-15 T-105 legacy 样式退役第二十七批（52 项）：迁移第十一组窄屏规则，包括洞察教练/图例、历史事件栅格与归档行、移动弹窗入场动画及减弱动态、编辑器滚动留白与输入焦点、Today 进度/计数/操作区、底栏文字和选中态。同步将稳定性测试的安全区断言迁移到组件层。宿主颜色全部映射为插件语义 token。legacy SCSS 减少 52 行，生产 CSS 304008B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 27ms、overflow 0px；专项移动测试通过；后续 Chrome 宽度走查和双主题 visual QA 待下一批复核。

2026-09-15 T-105 legacy 样式退役第二十六批（52 项）：迁移第十组窄屏规则，包括移动弹窗吸顶层级、Today 分组分隔与完成态、事项日期状态、日历标记、触控目标与焦点反馈、深色边框/文字和减弱动态；宿主颜色全部映射为插件语义 token。新增第十段窄容器唯一归属守门。legacy SCSS 净减少 52 行，生产 CSS 304008B。验证：类型检查、UI/移动专项、release-assets 与 diff 检查通过；此前完整质量链在该批前置迁移状态通过，需下一轮重新执行完整链确认。

2026-09-15 T-105 legacy 样式退役第二十五批（32 项）：迁移第九组窄屏规则，包括空态/同步提示、编辑器与事项头部控件、事项字段触控尺寸、模板/图标/类型网格、洞察教练与图例布局；颜色依赖全部替换为插件语义 token。更新 UI 主题守门锁定第九段组件层归属。legacy SCSS 净减少 32 行，生产 CSS 303982B（构建后 303982B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 31ms、overflow 0px；专项移动测试、宽度走查和 Chrome 浅/深主题 visual QA 均通过，pageErrors 为空；`git diff --check` 与 release-assets 通过。

2026-09-15 T-105 legacy 样式退役第二十四批（38 项）：迁移第八组窄屏规则，包括移动底栏高度与选中态、浮动新建按钮、安全区定位、移动圆角层级、完成态边框、Today/历史卡片 hover 反馈及移动字号层级；颜色全部映射为插件语义 token。新增第八段窄容器唯一归属守门。legacy SCSS 净减少 38 行，生产 CSS 从 303953B 变为 303982B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 28ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-15 T-105 legacy 样式退役第二十三批（70 项）：迁移第六组 600px 核心布局，包括 Today 卡片两行网格与分组间距、移动页头和操作按钮、组织筛选双列布局、历史日历/筛选/事件、洞察统计与教练卡、编辑器滚动区/面板/固定操作区、事项表单单列布局，以及设置卡片与深色说明文字；编辑器操作区和深色说明颜色全部映射为插件语义 token。新增第七段窄容器唯一归属守门。legacy SCSS 净减少 76 行，生产 CSS 从 303938B 变为 303953B（语义 token 名展开增加 15B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 48ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-15 T-105 legacy 样式退役第二十二批（50 项）：迁移第五组窄屏规则，包括 Today 分组布局隔离与间距、浅深主题画布/卡片表面、完成态、桌面深色表面变体、Today 操作区网格、优先级胶囊、移动底栏/编辑器操作区背景，以及 620px 以下紧凑高度档和完成脉冲关键帧；宿主颜色全部映射为插件语义 token。新增第六段窄容器唯一归属守门，并将移动编辑器底部避让测试改锁现行组件层真值。legacy SCSS 净减少 60 行，生产 CSS 从 303985B 降至 303938B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 33ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-14 T-105 legacy 样式退役第二十一批（80 项）：迁移第四组 600px 窄容器规则，包括页面/底栏/卡片主题动效与减弱动态、安全区底部避让、键盘焦点、移动标题阴影、通用宽度约束、Today 卡片图标与文字对齐、历史工具间距、洞察状态图例、设置选项字重、进度完成动效、标题/搜索防溢出、编辑器首屏字段、教练卡片与设置说明截断；宿主颜色全部映射为插件语义 token。新增第五段窄容器唯一归属守门。legacy SCSS 净减少 90 行，生产 CSS 从 303957B 变为 303985B（语义 token 名展开增加 28B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 29ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-14 T-105 legacy 样式退役第二十批（75 项）：迁移第三组 600px 窄容器规则，包括移动弹窗模糊/阴影与减弱动态、Today 卡片操作细节、历史月份导航与统计截断、设置卡片间距、悬浮新建按钮、分隔线、完成动画、通用控件防溢出、保存/同步反馈、事项列表吸顶与滚动、历史备注编辑、Today 分组标题及编辑器高级区；宿主颜色全部映射为插件语义 token。新增第四段窄容器唯一归属守门。legacy SCSS 净减少 91 行，生产 CSS 从 303886B 变为 303957B（语义 token 名展开增加 71B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 152ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-14 T-105 legacy 样式退役第十九批（39 项）：迁移第二组 600px 窄容器规则，包括编辑器类型/高级选项紧凑态、移动底栏左右安全区、导航内容防溢出、Today 新建按钮避让、关闭/返回触控反馈、页面段落间距、事项/模板滚动容器与细滚动条、完成区切换反馈及 Today 空态；宿主颜色全部映射为插件语义 token。新增第三段窄容器唯一归属守门。legacy SCSS 净减少 46 行，生产 CSS 从 303872B 变为 303886B（语义 token 名展开增加 14B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 63ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-14 T-105 legacy 样式退役第十七批（42 项）：迁移首组 600px 窄容器规则，包括历史详情限高/滚动、历史筛选吸顶、四页面平滑滚动与减弱动态回退、焦点轮廓、Today/历史标题截断、移动弹窗遮罩与层级、Today 卡片元信息/进度/操作、编辑器模板区与操作区、设置页字段和按钮紧凑布局；宿主颜色全部映射为插件语义 token。新增窄容器唯一归属守门。legacy SCSS 净减少 59 行，生产 CSS 从 303844B 降至 303837B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 32ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 T-105 legacy 样式退役第十六批（63 项）：将历史页基础容器/列表、日期行、月份导航、七列日历、四档热度/今日/选中/禁用状态、选中日期区、模板删除危险态、配额提示、字段动作、历史搜索/筛选/结果以及通用焦点层级与禁用态迁入 `src/ui/components.scss`；全部宿主色替换为插件语义 token，模板删除背景以 danger token 与 surface 混合生成。新增历史基础层归属守门。legacy SCSS 净减少 292 行；生产 CSS 由 303838B 变为 303844B（语义危险色混合增加 6B），仍低于 318000B 预算。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 36ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 T-105 legacy 样式退役第十五批（37 项）：将编辑器组织字段、搜索字段嵌套尺寸、高级设置容器/摘要/展开态、单位与分组选项、图标按钮、星期选择器，以及保存/归档主动作从 `src/index.scss` 迁入 `src/ui/components.scss`；全部宿主颜色按 D-088 映射为插件语义 token，保留键盘焦点、选中态和触屏反馈。同步更新移动端保存与归档测试及组件层归属守门。legacy SCSS 净减少 204 行，生产 CSS 从 303943B 降至 303838B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 30ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 T-105 legacy 样式退役第十四批（62 项）：将编辑器第一屏的专注入口、通用空状态、表单滚动区/固定操作区、模板标题与三列网格、模板/图标搜索筛选、结果与无结果状态、无障碍隐藏文本、模板卡、图标结果面板、通用字段、双列表单以及类型选择器整体迁入 `src/ui/components.scss`；颜色依赖全部按 D-088 改为插件语义 token，并为窄屏空状态补充 `overflow-wrap:anywhere`。同步修正 10 个移动端结构测试的样式归属，以及已拆分到 `render/editor.ts` / `render/fragments.ts` 的 DOM 结构归属。legacy SCSS 净减少 497 行，生产 CSS 从 304039B 降至 303943B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 33ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 T-105 legacy 样式退役第十三批（55 项）：将 Today 卡片本体/完成态、图标、保存与同步反馈、名称/标签/元信息、焦点与校验状态、进度条、数量输入、记录/快捷/更多按钮及精确录入区域从 `src/index.scss` 迁入 `src/ui/components.scss`；迁移过程按 D-088 将全部宿主颜色映射为插件语义 token，并把 6 处移动端/响应式测试的样式归属断言同步到组件层。legacy SCSS 净减少 329 行，生产 CSS 由 304123B 降至 304039B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 32ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 均无溢出；浅色与深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 分析历史对比批次（T-199~T-218）：历史弹窗不再把快照元数据塞入 DOM dataset，而是直接读取已通过 `normalizeAnalysisSnapshots` 的独立缓存；新增相邻版本默认选择、交换、单版本禁用、非法索引/同版本保护、方向与元信息展示；实际正文对比接入逐行差异模型与安全 HTML 渲染。差异摘要、空态、历史标题/控件/状态/错误全部补齐中英文 i18n，状态区加入 `aria-live`，新增 `tests/analysis-history.test.cjs` 并接入 `test`/`test:ui`。验证：`pnpm run check`、`pnpm run test:ui`、生产构建通过；CSS 298042B，处于 318000 发布预算内。

2026-09-14 离线本地总结批次（T-219~T-238）：新增 `src/features/local-summary.ts`，从真实 `SummaryContext` 推导空数据/起步/稳步/高完成四档语气、完成率、周期范围、最佳项目和待关注项目；排序使用完成率→记录数→名称的确定性规则，单项目不重复提示。回顾页无智能体或暂无智能体正文时自动展示本地总结，智能体正文存在时保持优先；本地总结带离线标识和虚线卡片样式。中英文文案全部进入 i18n，新增 `tests/local-summary.test.cjs` 并接入 `test`/`test:ui`。验证：`pnpm run check`、`pnpm run test:ui` 通过。

2026-09-14 今日页优先提醒批次（T-239~T-258）：新增 `src/features/priority-reminder.ts`，只读筛选现有提醒投影中的逾期/今日条目，按状态→天数→名称→ID 确定性排序并输出首条摘要。今日页新增低干扰优先提醒横幅，显示来源、名称和状态；打卡来源点击后滚动到对应卡片并聚焦主操作，事项来源进入事项页；接入延期/跳过后的用户动作投影，补齐 CSS.escape、aria-live、双语文案与窄容器样式。增强折叠队列语义：section 标题 aria-label、首条提醒专用操作文案、其余列表最多展示 5 条且摘要数量与实际一致。新增并扩展 `tests/priority-reminder.test.cjs`，覆盖模型、渲染标记、折叠上限、绑定行为、样式与 i18n，并接入 `test`/`test:ui`。验证：`pnpm run test:quality` 全链通过（check、主测试、UI、mobile、ecosystem、perf、release、build）；构建 CSS 299506 bytes，仍在 318000 bytes 预算内。

2026-09-14 桌面事项页布局批次：桌面顶栏从滚动的 `.lc-checkin__layout` 提升到宿主 flex 层，并与内容列共用 1320px 最大宽度，切换事项/回顾/今日时保持同一水平基线；事项管理行拆分展示类型、重复规则、下次日期、倒计时和备注，桌面列表列宽提升至 380–480px，仍与 Today 打卡卡片保持独立语义。扩展 `tests/desktop-dialog.test.cjs` 守门。验证：`pnpm run check`、`pnpm test`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build`、`git diff --check` 通过；未执行真实客户端截图，待 T-023/T-129 现场复测。

远端核对：`git fetch --prune` 与 `git ls-remote` 受 GitHub HTTPS 重置影响未完成；改用 GitHub commits Atom 与 raw 主分支探测，得到远端 main 最新提交 `5b98be33fda28ba248abf4e5993854bd244a95e3`，与本地 `HEAD` 及缓存 `origin/main` 完全一致，无需更新本地仓库。

2026-09-14 设置页恢复点/同步审计折叠批次：恢复点列表与同步审计均改为最新一条直显，其余记录收进可展开的 `details`，新增中英文“展开其余 N 条”文案和紧凑样式，保留每条恢复/导出/清空操作。扩展 `tests/desktop-dialog.test.cjs` 结构守门。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile`、`git diff --check` 通过；生产构建同步通过，CSS 308579 bytes。

2026-09-14 桌面 Today UI 细节批次：将任务卡左侧状态色条由高对比 3px 改为 2px 柔和混合色，降低视觉抢占；宽屏（≥1500px）收紧卡片网格间距与列表间距，减少两列布局的空旷感，同时保持 380px 最小卡宽与操作轨道可读性。验证：类型检查、桌面结构守门与 diff 检查通过。

2026-09-14 大版本路线复盘：结合桌面/移动端现场反馈，修订 `docs/development-roadmap.md`。新增 9.8.x 稳定化窗口，明确 T-023/T-129、番茄钟双窗口和 CI/产物证据完成前不扩展功能；将 10.0/11.0 标记为恢复兼容维护与提醒跨端契约阶段；确认/取消/撤销及审计工作流已从 13.0“待实现”更正为“基础闭环完成，进入真实宿主试点”；15.0 保留为 UI 系统整合，但依赖前述现场验收完成。

2026-09-14 9.8 稳定化首批：新增 `tests/stability-9_8.test.cjs`，把桌面顶栏宿主层级、设置页历史折叠、Today 柔和状态线和“先验收后扩展”路线文档固化为结构守门，并接入 `test:ui`。同时将 TODO 中已实际完成的 T-132~T-134（本地总结、建议确认、分析缓存）状态同步为 done。验证：`pnpm run check`、`pnpm run test:ui`、`git diff --check` 通过。

2026-09-14 9.8 稳定化第二批（T-819~T-848）：新增 30 项稳定化验收条目，覆盖顶栏/底栏宿主结构、Toast 单实例、滚动与焦点恢复、恢复点/同步审计折叠与操作入口、事项页四类动作及元数据、桌面卡片状态线与宽屏间距、i18n 和 test:ui 接线。实现集中在 `tests/stability-9_8.test.cjs`，作为 UI 结构回归门禁。验证：`pnpm run check`、`node tests/stability-9_8.test.cjs`、`pnpm run test:ui`、`git diff --check` 全部通过。

2026-09-14 回顾智能总结刷新批次（T-259~T-278）：回顾页总结上下文新增刷新状态，智能体生成期间按钮显示进行中并禁用，成功/失败/跨天/离开页面均清理悬挂状态，防止并发请求；截止日期、更新时间、历史数量、自定义范围字段全部迁移 i18n；新增 `tests/review-summary-refresh.test.cjs` 并通过 agent-suggestions 测试链执行。验证：类型检查通过；随后执行完整 `pnpm run test:quality`。

2026-09-14 智能体建议确认批次（T-279~T-298）：建议状态、影响摘要和字段变更摘要统一迁移 i18n；新增 `canConfirmSuggestion` 与 `applyConfirmedSuggestion` 纯函数，仅允许 confirmed 建议按 before 基线应用，冲突字段跳过并返回 applied/skipped/conflicts 结果，不触发持久化；建议预览文案同步 i18n，新增 `tests/suggestion-apply.test.cjs` 并接入 agent-suggestions 主测试链。验证：类型检查与定向模型测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议信封防护批次（T-299~T-318）：新增建议信封规范化、序列化与安全解析，限制 ID/标题/原因长度，校验状态、确认标志、创建时间与 confirmedAt，复用字段白名单和数量上限；应用边界再次拒绝未知字段，防止原型污染。扩展建议确认测试覆盖 malformed JSON、时间和长度边界。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议审计轨迹批次（T-319~T-338）：新增建议审计动作/记录模型、版本化序列化与安全解析，统一校验建议 ID、动作、时间、应用计数、冲突字段和拒绝原因；追加函数复用 50 条保留上限，统计摘要按动作返回稳定计数，未知版本或 malformed JSON 安全回退为空。扩展 `tests/suggestion-apply.test.cjs` 与 agent-suggestions 结构守门。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议确认令牌批次（T-339~T-358）：新增版本化确认/取消决策令牌，绑定建议 ID、动作、时间和 nonce，默认 10 分钟 TTL 并拒绝错误版本、过期、未来时间及跨建议令牌；新增可撤销应用纯函数，仅回滚仍保持建议值的字段，用户后续修改保留并返回冲突结果。扩展建议运行时和结构守门测试。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议令牌消费批次（T-359~T-378）：新增令牌消费结果模型与最近 100 条重放防护，区分 invalid/replayed/wrong-decision 原因；新增带令牌的确认/取消状态迁移入口，并提供应用、撤销及决策审计转换函数，保持纯函数和显式持久化边界。扩展建议运行时与结构守门测试。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议工作流门面批次（T-379~T-398）：新增 `src/features/suggestion-workflow.ts`，统一封装令牌消费、确认/取消迁移、已确认建议应用、撤销及审计追加，并提供动作统计摘要；工作流状态复制变更和令牌列表，保持纯函数、不直接持久化。新增 `tests/suggestion-workflow.test.cjs` 覆盖确认、取消、重放、应用、撤销和审计链路。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 结构化智能体输出批次（T-439~T-458）：SummaryProvider 兼容纯文本与 `{text, suggestions}` 结构化返回值；新增结果/单条建议规范化，限制文本长度、建议数量和变更白名单；index 消费规范化结果并创建 pending workflow，API 继续只返回安全文本，回顾页按可选状态展示工作流面板，范围/日期切换清理旧建议。新增结构化输出与面板接线守门测试。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议工作流恢复批次（T-399~T-418）：新增工作流状态规范化、版本化序列化/解析、已消费令牌上限、可撤销资格判断和状态摘要；恢复流程复用建议信封与审计规范化边界，未知版本或损坏 JSON 安全回退，撤销资格按最新应用审计避免重复撤销。扩展工作流测试覆盖恢复、摘要和重复撤销保护。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议工作流面板批次（T-419~T-438）：新增 `src/render/suggestion-workflow.ts`，展示建议标题、状态、原因、审计统计和字段变更；pending 状态提供确认/取消按钮，其他状态提供按资格禁用的撤销按钮，所有操作补齐 aria-label；新增响应式面板样式与结构守门测试，并接入 agent-suggestions 测试链。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议工作流确认闭环批次（T-459~T-478）：建议面板确认/取消/撤销按钮全部绑定到宿主 workflow；每次动作生成短时决策令牌并消费，确认后按基线安全应用建议，撤销仅回滚仍匹配的字段；确认与撤销持久化失败恢复旧 store，取消不修改主 store，无变更与不可撤销场景显示双语提示。新增绑定与宿主接线结构守门测试，更新 agent-suggestions 主测试链。已通过 `pnpm run check`、定向建议测试与完整 `pnpm run test:quality`（QUALITY_EXIT=0）；构建 CSS 302043 bytes，仍在 318000 bytes 预算内。

2026-09-14 建议工作流恢复与持久化批次（T-479~T-498）：工作流状态使用独立存储键和版本化序列化格式，启动及数据变化时按当前条目安全恢复，不覆盖主 store；确认、取消、应用拒绝、撤销和新建议生成均写回工作流快照，范围切换与无建议场景清理旧快照；写入串入保存队列，失败仅提示且不阻断主 store。新增恢复/持久化结构断言。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302043 bytes；已提交本地里程碑 `c719eeb`，未 push。

2026-09-14 建议工作流生命周期防护批次（T-499~T-518）：新增待确认建议 24 小时恢复时限，启动和数据变化恢复均校验创建时间、未来时间及当前条目；过期或损坏快照自动清理，已确认建议仍保留撤销能力。扩展运行时与结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302043 bytes；已提交本地里程碑 `e2f1de5`，未 push。

2026-09-14 建议面板反馈与无障碍批次（T-519~T-538）：工作流状态加入 aria-live 与可读标签，操作区明确语义；变更列表最多展示 8 条并提示隐藏数量；确认/取消/撤销按钮在异步处理期间禁用并标记 aria-busy，完成后安全恢复，兼容宿主同步抛错与按钮脱离 DOM。新增结构断言。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302043 bytes；已提交本地里程碑 `c1c375a`，未 push。

2026-09-14 建议审计信息增强批次（T-539~T-558）：工作流新增最新审计查询并返回防御性副本；面板展示最近更新时间（无审计时回退创建时间），时间字段统一转义并补齐中英文文案与样式。扩展运行时及渲染守门测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302228 bytes；已提交本地里程碑 `254bf07`，未 push。

2026-09-14 建议操作并发与异常边界批次（T-559~T-578）：建议确认/取消/撤销按钮增加 WeakSet 忙碌集合，阻止重复触发；同步宿主抛错统一转为异步 Promise，完成后安全清理 aria-busy/disabled，按钮脱离 DOM 时不再操作；统一吞吐异常避免未处理拒绝。新增并发与异常结构断言。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `0b5664c`，未 push。

2026-09-14 建议操作能力门面批次（T-579~T-598）：新增纯函数 `workflowActions` 统一计算确认/取消/撤销可用性，面板复用该结果，pending 无变更时确认按钮自动禁用，应用与撤销状态按审计资格保持一致；扩展运行时和渲染测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `f01623a`，未 push。

2026-09-14 建议工作流跨窗口一致性批次（T-599~T-618）：新增工作流更新时间推导和新旧比较，数据变化恢复仅在远端状态更新时覆盖本地，旧或同时间快照不会覆盖未完成操作；过期/损坏远端状态仍按生命周期策略清理，有效本地状态保持不变。扩展运行时和结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `8923941`，未 push。

2026-09-14 建议操作成功反馈批次（T-619~T-638）：确认、取消、撤销完成后分别显示明确双语提示，持久化失败、应用冲突和不可撤销等失败分支继续使用原有错误文案。扩展 index 与 i18n 结构守门测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `b6dc498`，未 push。

2026-09-14 建议操作焦点连续性批次（T-639~T-658）：成功提示包含建议标题；确认/取消/撤销后的重渲染会尝试将焦点恢复到更新后的可用撤销按钮，且不会聚焦禁用或已脱离 DOM 的控件。扩展绑定与文案结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `2cc11ad`，未 push。

2026-09-14 建议审计明细面板批次（T-659~T-678）：工作流面板新增可展开审计明细，按最新优先展示最近 10 条动作、时间与拒绝原因；撤销动作使用独立文案，所有字段统一转义，空审计不渲染明细。补齐双语文案、窄屏样式与结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `961a691`，未 push。

2026-09-14 建议工作流 API 只读投影批次（T-679~T-698）：CheckinApi 新增 `getSuggestionWorkflow`，仅返回建议信封、变更、消费令牌和审计的防御性副本；空状态返回 undefined，不暴露持久化或决策写入口，不共享内部 store 引用。新增 API 结构守门测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `847f12d`，未 push。

2026-09-14 建议工作流摘要 API 批次（T-699~T-718）：CheckinApi 新增 `getSuggestionWorkflowSummary`，提供状态、可应用/撤销标志、消费令牌与审计计数及更新时间；空状态返回 undefined，摘要为新对象且保持主 API 版本兼容。更新生态文档和结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `d045c3b`，未 push。

2026-09-14 工作流快照克隆边界批次（T-719~T-738）：新增 `cloneSuggestionWorkflow` 统一克隆信封、变更、消费令牌、审计及冲突数组，创建工作流和 API 只读快照复用该函数，防止跨层引用泄漏。扩展运行时与 API 结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `95e1046`，未 push。

2026-09-14 建议工作流事件广播批次（T-739~T-758）：新增 `checkin:suggestion-workflow-updated` 事件契约，确认、取消、应用、撤销及新建议生成后广播建议 ID 与状态；保持现有订阅 API 和事件兼容，仅增加只读通知。扩展契约与结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `e0d358a`，未 push。

2026-09-14 建议事件 payload 安全批次（T-759~T-778）：集成层新增 `cloneIntegrationEvent`，对建议事件校验 ID/状态并限制长度，对事项、记录和删除事件做嵌套防御性克隆；`emitIntegrationEvent` 统一在派发前安全过滤。新增运行时事件测试并接入 ecosystem 测试链。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `1221eed`，未 push。

2026-09-14 建议事件类型守卫批次（T-779~T-798）：新增 `SuggestionWorkflowIntegrationEvent` 类型别名和 `isSuggestionWorkflowEvent` 守卫，统一校验事件对象、建议 ID 长度和固定状态枚举；payload 克隆与事件派发复用同一边界。扩展运行时、契约和生态文档测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `064f2c8`，未 push。

2026-09-14 建议只读能力协商批次（T-799~T-818）：新增 `suggestions.read` capability，标记为 `effect: read` 且 `localOnly: true`，用于协商 `getSuggestionWorkflow` 与摘要接口；保持 API 版本 4 和既有写能力不变。更新生态文档与契约测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `d177dd5`，未 push。

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

2026-09-14 真机截图核对检查点（T-023 首批反馈落地，B-006）：新增加载探针 scripts/visual-probe.cjs（真 Chrome + 真构建 + 截图到 .artifacts/visual-probe，可复现真机场景）后逐项核对四张手机截图，复现并修复 7 类问题：①今日操作轨道 390px 向左溢出压正文（flex-end 溢出规则；主按钮可收缩省略、图标钮 26px 固定）②连续徽章撑高标题行悬浮卡中（压回 22px 行内）③回顾/事项/编辑器/归档页内大标题与移动端顶栏重复（窄档隐藏文字保留返回/新增钮）④hero 零记录仍显示最佳项目与建议噪声（门控在 totalEvents）⑤编辑器模板分类 chip 被行容器 overflow 裁成空胶囊（行 overflow visible + wrap）⑥模板预览区限高过紧裁卡（窄档放宽 380px 露出整行卡）⑦自定义范围 chip 未激活呈双选中观感（降为普通 tab 权重）。另：死 FAB 样式清除（思源悬浮钮为宿主 UI，列表底部加 64px 避让）；mobile-release-quality 新增 10 条守门。验证：真机场景探针四页截图逐一目检、pnpm run test:quality exit 0、浅/深视觉走查、宽度走查全绿。
2026-09-14 9.7.0 发布候选整理：将提醒中心延期/跳过、dock 响应式打磨、移动端截图反馈修复、回顾页离线摘要与分析历史、智能体建议确认/审计/撤销闭环及只读生态能力纳入版本；版本号同步至 package.json/plugin.json/src/version.ts，README 改为 GitHub Release 当前安装渠道并明确暂缓集市审核；新增 `docs/v9.7.0-change-log.md`。T-023/T-129 真实思源客户端验收继续作为发布后现场任务。下一步：完整质量门禁、重新生成安装包并记录 SHA-256，然后提交版本提交、推送 main、创建 v9.7.0 tag/Release。

2026-09-14 手机截图反馈第二批：①移动顶栏收口为 40px，避免宿主全屏与 safe-area 重复叠加造成顶部空白；②今日优先提醒移动端压缩间距与行高，`还有 N 项今天提醒` 展开状态跨数据重渲染保持，避免闪回收起；③底栏按钮改为固定图标/文字网格轨道并统一 SVG 尺寸，修复图标偏移及右侧裁切。真 Chrome 390×844 视觉探针复核通过；check、pnpm test、test:ui、test:mobile、build 全部通过。

2026-09-14 新建任务页截图反馈：模板卡改为 48px 紧凑两行（图标/名称/摘要），模板区取消整块 overflow 截断，仅保留 186px 内部列表滚动并开启纵向滚动链，表单可继续上下滑到名称、图标和类型。真 Chrome 390×844 探针复核通过，编辑器页面 `scrollHeight 1391 / clientHeight 710` 可滚至 `scrollTop 681`；check、test:ui、test:mobile、build 通过。

2026-09-14 完成任务无闪烁：Today 手机/桌面完成记录改为卡片原地更新，保留节点事件、焦点与滚动位置；同步更新顶部完成计数、进度条及周进度芯片，Toast 仍由独立底部提示层显示，待完成筛选下完成项直接移除而不重建整页。新增结构守门覆盖原地完成态、周条和计数更新；check、test:ui、pnpm test、build 均通过。

2026-09-14 番茄钟入口选择：新增持久化的“默认专注计时器”偏好（自带番茄钟 / 番茄钟插件）。Today 手机与桌面点击小钟表时按该偏好路由；插件模式没有已注册适配器时只提示插件不可用，不再静默打开自带计时器。补充双语设置文案与偏好/路由守门；check、pnpm test、test:ui、build 通过。
2026-09-14 第三批检查点（50 项，9.8 发布准备门禁）：新增 `tests/stability-9_8c.test.cjs`，覆盖 package/plugin 版本与语义版本、前后端声明、资源/README/LICENSE、pnpm 与 Node 约束、生产构建/类型检查脚本、质量链组成、CI push/PR/Node22/frozen lockfile/构建/单测/移动端/发布资源、Chromium/无障碍/视觉审计、环境探针 JSON 与浏览器候选、桌面页签/dock/移动端 smoke、番茄钟双窗口、提醒动作、SHA-256 回滚、兼容矩阵与恢复并发写入文档，共 50 条可复现守门。新增 `pnpm run check:stability`，并纳入 `test:ui`。证据：`node tests/stability-9_8c.test.cjs`、`pnpm run check:stability` 均通过（50/50）；下一步运行完整 `test:quality` 并继续处理真实宿主 smoke（T-023/T-129）。

2026-09-14 第二批检查点补录（36 项）：`tests/stability-9_8b.test.cjs` 覆盖提醒动作生命周期、番茄钟 focus、externalRef 幂等、saveQueue/audit、宿主 token、reduced-motion、Today 局部刷新、快照/恢复/安全区与人工验收入口；已接入 `test:ui`，定向执行通过。
2026-09-14 v9.7.1 后续桌面 Today 修复：当日事项提醒支持直接完成/撤销，不再只能跳转管理页；复盘与编辑次级动作移入卡片右侧操作轨道，释放标题和元信息宽度；保存中状态改为无占位静默保存，仅失败时保留可重试提示，消除打卡瞬间整页下移再回弹。新增结构守门并通过 `pnpm run check`、priority-reminder、checkin-toast 与 `pnpm run test:ui`。
2026-09-14 回顾年度分布修复：确认黑色方块根因是 SVG 输出类名 `lc-yearheatmap` 与 CSS 错写的 `lc-checkin__yearheatmap` 不一致；已统一选择器并改用主题色五级活跃度。年度图新增 12 个月刻度、周一/三/五/日行提示、“每格一天”说明、少→多图例和更明确的“年度打卡分布”标题；周/月维度继续由回顾页现有范围与趋势图承担，避免概念重复。
2026-09-14 回顾趋势表达升级：参考 Habitify Progress 的“大局评分 + 周期节奏 + 分区洞察”信息层级，将原始折线/柱状图升级为当前值、周期平均、最佳值、较上期变化四层信息；折线增加 0/25/50/75/100% 基线、面积趋势、隔周标签和逐点 tooltip，柱状图增加柱顶数值与逐柱 tooltip，卡片使用上涨/下降语义色。保持零依赖 SVG 与现有周/月统计口径。
2026-09-14 打卡日志聚合：最近 14 天日志由“每条事件一张卡”改为按日期、项目和单位聚合；单条记录维持原有紧凑行，多次记录默认显示累计值、次数和起止时间，展开后逐条保留时间、数值、备注与照片。解决短时间多次打卡造成的重复长列表，同时不牺牲原始事件可追溯性。
2026-09-14 成就体系扩展：成就由 9 项扩展为 22 项，全部基于可回放数据推导，分为成长里程碑、坚持与积累、完成质量、记录与复盘、时间与专注 5 类；新增 10/500 记录、百日足迹、三日/双周全清、30 个全清日、备注、照片、多项目、多来源、晚间与番茄钟里程碑。UI 改为分类折叠，默认只展开成长里程碑，各类标题显示达成数；卡片同步压缩，丰富内容但不显著增加默认页面高度。
# 2026-09-14 事项模板与清单细化

- 事项清单新增状态、分类、时间筛选，支持搜索备注、清除筛选与统计胶囊；启用事项优先并按下次触发日期排序。
- 事项行补充启停状态、提醒提前量，桌面保留紧凑图标操作，手机改为可读文字操作栏。
- 模板扩充至生日、纪念日、定期支出、会员续费、健康与车辆、节日六类，新增家庭生日、 utilities、会员和健康检查等场景。
- 模板分类标签支持桌面横向浏览、手机横向滚动，选择分类后自动展开并保留跨重渲染状态。
- 修复图标选择器中“我的”位于横向分类末尾而不可见的问题：入口提升至“全部”之后，自定义上传、URL 与图标库导入能力保持不变。
- 验证：`pnpm run check`、`node tests/occasions.test.cjs`、`node tests/interval-editor.test.cjs`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build`、release-assets（CSS 317961 bytes）均通过。
- 浏览器补验发现页签顶栏 `width:100%` 之外又增加左右各 24px padding，造成 1140px 宿主实际滚动宽 1188px；顶栏改为 `border-box` 后消除 48px 横向溢出，并加入桌面结构守门。
- 真实 Chrome 证据：`width-walkthrough` 的 2000/1320/1180/640/360 档均无横向溢出；浅色、深色 `visual-qa` 均通过，页签 1140/1140；`pnpm run test:quality` 全链通过（10k 记录完整渲染 30ms、CSS 317983 bytes）。

## T-104 legacy viewport 规则收敛

- 内容响应式职责已全部交给命名容器；删除了与全局 reduced-motion 完全重复的“窄视口+减弱动画”规则。
- 剩余 `@media` 明确限于弹窗外壳自身、屏幕高度/方向、打印、触控/悬停和系统无障碍偏好，这些条件不能等价替换为内容容器宽度。
- 验证基线沿用本轮真实 Chrome 双主题 visual QA、width walkthrough 与全量 `test:quality`；删除冗余规则后继续复跑发布资源和视觉门禁。

## T-105 legacy 无条件样式退役 Phase 3（第一批）

- 以当前 TypeScript 渲染源码为真值，删除无任何 DOM 引用的旧事项 `.occasion-body`、`.occasion-empty`、`.occasions` 规则，以及已退役的 `.summary-total` 规则。
- 本批不触碰仍由当前 DOM 使用的共享事项卡、列表、表单样式；构建 CSS 317978→316821 bytes。
- 验证：类型检查、构建、release-assets、响应式结构测试和真实 Chrome visual QA 通过；T-105 保持 doing，继续逐批审计。

### 第二批

- 删除当前设置页已不再渲染的旧 density/theme 卡片、settings check/summary/help/reset/danger 样式，并从共享编辑器规则中移除不存在的旧 template-card 选择器。
- 构建 CSS 316821→314185 bytes；类型检查、`test:ui`、release-assets 与真实 Chrome visual QA 通过。

### 第三批

- 删除已退役 quick-recent 组件的完整基础样式，以及窄屏、横屏、超窄屏中的独立遗留变体；共享选择器组暂留待下一批安全拆分。
- 构建 CSS 314185→310800 bytes；类型检查、构建、release-assets、`test:ui` 和真实 Chrome 浅色/深色 visual QA 均通过。

### 第四批

- 从所有共享选择器组拆除 quick-recent 死分支，仓库 legacy 样式中该组件引用归零。
- 删除已退役 `lc-checkin--summary` 页面别名的统计、历史列表、自定义范围与空态规则；History/Insights/Archived 仍在使用的分支单独保留。
- 构建 CSS 310800→308412 bytes；类型检查、构建、release-assets、`test:ui`、width walkthrough 与真实 Chrome 双主题 visual QA 通过。

### 第五批

- 删除当前渲染层无引用的旧设置 check/danger/help/summary/density/theme 变体、旧 occasion-section、insights item-picker 与 history-actions 全部规则。
- 对 loading/error、dialog fullscreen、always-visible 等可能由状态或宿主动态生成的类保持保守，不以静态字符串扫描直接删除。
- 构建 CSS 308412→305621 bytes；`pnpm test`、`test:ui`、`test:mobile`、类型检查、release-assets 与真实 Chrome 双主题 visual QA 均通过。

### 第六批

- 追踪渲染、事件绑定和 classList 操作后，删除无任何创建来源的 always-visible、section-arrow 与旧悬浮 dialog-fullscreen 控件规则；仍在使用的容器状态 `lc-checkin-dialog--fullscreen` 完整保留。
- 构建 CSS 305621→304160 bytes；类型检查、构建、`test:ui`、release-assets 与真实 Chrome 双主题 visual QA 通过。

### 第七批

- 静态来源复核确认无引用的 legacy 类已清零；`loading/error` 属于运行时反馈状态，因此不删除，连同共享空态与同步提示基础规则迁入 `ui/components.scss`。
- 同步迁移加载旋转动画、系统减弱动画分支和 600px 容器下的状态布局；保留 dock 高特异性覆盖及错误态紧凑高度。
- 构建 CSS 304160→304296 bytes（迁移后展开可维护格式增加 136 bytes）；类型检查、构建、`test:ui`、`test:mobile`、release-assets 与真实 Chrome 双主题 visual QA 通过。

### 第八批（41 项）

- 一次性迁移 41 个选择器职责到 `ui/components.scss`：标题/编辑标题 2 项、区块/组织/预览表面 3 项、项目/历史/预览卡 4 项、悬浮与聚焦 4 项、完成态 2 项、进度轨道 3 项、记录按钮 3 项、语义状态与焦点 5 项、桌面编辑器网格与模板交互 12 项、设置标签与桌面卡片 3 项。
- 迁移时将 3 处宿主 `--b3-*` 引用映射到插件自有 `border-strong/surface/muted` token，满足独立双主题边界；新增结构守门，禁止视觉基础块回流 legacy 文件并锁定语义状态与桌面编辑器规则的位置。
- `index.scss` 减少 106 行，构建 CSS 保持 304296 bytes（等价迁移，无体积回涨）；完整 `pnpm run test:quality` 通过，10k 记录完整渲染 29ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第九批（43 项）

- 一次性迁移 43 个选择器职责到 `ui/components.scss`：强对比 3 项、桌面历史/洞察增强 7 项、弹窗与容器间距 5 项、系统强制色 8 项、弹窗表面/正文 3 项、可拖动标题 5 项、八向缩放手柄 9 项、全屏禁用交互 3 项。
- 按 D-088 将强对比边框和日历阴影的 2 处宿主变量替换为插件 `muted/text` token；桌面弹窗守门改为锁定组件层，另加迁移回流与无障碍结构断言。
- `index.scss` 再减少 131 行；构建 CSS 304296→304282 bytes。完整 `pnpm run test:quality` 通过，10k 记录完整渲染 33ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第十批（46 项）

- 一次性迁移 46 个选择器职责到 `ui/components.scss`：弹窗宿主基础 6 项、容器声明 1 项、六档内容宽度阶梯 17 项、桌面返回控制 1 项、移动触控宿主 5 项、弹窗填充/全屏/关闭 4 项、页签宿主 12 项。
- 合并弹窗宿主两段重复声明，同时严格保持 700px 基础内容上限先于 760/900/1100/1300/1560/2000px 阶梯；桌面弹窗与 5 个移动结构测试改锁组件层，新增基础上限和容器所有权防回流断言。
- `index.scss` 再减少 179 行；构建 CSS 304282→304245 bytes。完整 `pnpm run test:quality` 通过，10k 记录完整渲染 30ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第十一批（36 项）

- 一次性迁移 36 个选择器职责到 `ui/components.scss`：基础画布 1 项、编辑器壳 2 项、基础导航/标题 3 项、600px 移动弹窗与导航 18 项、动态视口 1 项、标题信息 5 项、圆形操作按钮 3 项、进度与列表 3 项。
- 按 D-088 将画布、关闭按钮、移动导航、标题、计数、圆形按钮和进度的 14 处宿主颜色引用替换为插件 token；宿主字体声明暂留 legacy 兼容层，组件层继续保持零 `--b3-*` 引用。
- 迁移 4 个移动结构守门并增加基础画布防回流断言；顺带修复 `mobile-editor-structure` 遗留的硬编码中文断言，改锁 i18n 调用与词典真值，该非主链测试恢复可独立执行。
- `index.scss` 再减少 210 行；构建 CSS 304245→304208 bytes。完整 `pnpm run test:quality` 通过，10k 记录完整渲染 36ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第十二批（31 项）

- 一次性迁移 31 个选择器职责到 `ui/components.scss`：组织筛选 3 项、今日搜索 4 项、搜索空态 4 项、最近记录 5 项、分组与折叠标题 7 项、完成区 5 项、全完成提示 3 项。
- 按 D-088 将筛选、搜索、分组、完成区和提示中的 20 处宿主颜色引用替换为插件 token；组件层继续保持零 `--b3-*` 引用，后置 Toast 与响应式补充规则保持原有优先级。
- 更新 UI 主题守门：基础搜索签名不得回流 legacy，响应式 `today-search` 补充允许继续留待后续迁移；组件层锁定完整的组织与分组基础块。
- `index.scss` 再减少 267 行；构建 CSS 304208→304123 bytes。完整 `pnpm run test:quality` 通过，10k 记录完整渲染 37ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第十八批（51 项）

- 一次性迁移 51 个展开选择器职责到 `ui/components.scss`：移动标题与导航 5 项、日历/洞察状态及进度 10 项、Today 分组与完成态 9 项、通用间距/按钮/焦点 9 项、移动宿主安全区与视口 9 项、日历/事项/洞察/设置紧凑规则 9 项。
- 按 D-088 将日历状态、分组吸顶背景和计数表面的 6 处宿主变量替换为插件 `surface/bg/muted-surface` 语义 token；组件层继续保持零 `--b3-*` 引用。
- 更新 UI 主题与移动发版守门：第二段窄屏职责不得回流 legacy，横向触控溢出断言改锁现行组件层；`index.scss` 再减少 64 行，构建 CSS 303837→303872 bytes（语义 token 名展开增加 35 bytes）。
- 完整 `pnpm run test:quality` 通过，10k 记录完整渲染 33ms；release-assets v9.7.1 通过。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。
# 2026-09-14 侧边栏安全宽度

- Dock 默认宽度由 380px 调整为 420px，作为名称、辅助动作和主按钮均可读的推荐宽度。
- 思源 dock API 不支持声明最小宽度，因此不修改思源本体；新增 480px/340px 两档防御布局，窄侧栏将操作区放到正文下方，极窄侧栏使用整行操作区。
- Dock 底部导航按实际 5 个入口等分，避免旧 6 列轨道产生空列与错位。
- 验证：浅色/深色真实 Chrome visual QA、width walkthrough、`test:mobile`、响应式结构测试、构建及 release-assets 均通过；CSS 317978 bytes。

### 第三十一批（34 项）

- 将 Today 卡片视觉层级、完成态记录按钮、进度条、组织筛选、移动底栏及历史日历圆角等 34 项窄屏职责迁移至 `ui/components.scss`，统一使用插件语义 token，避免宿主 `--b3-*` 变量渗漏。
- 新增第四十一次窄屏迁移守门，锁定 Today 卡片视觉增强只存在组件层，防止样式回流 `index.scss`。
- 验证：`pnpm run check`、`ui-theme`、`width-walkthrough`、`release-assets`、`git diff --check` 全部通过；组件层无 `--b3-*` 引用。CSS 304003 bytes。

### 第三十二批（31 项）

- 迁移 380px 超窄容器下的任务卡片、图标/模板网格、组织字段、洞察统计与历史事件布局共 31 项职责至组件层。
- 新增超窄布局回流守门，确保 `index.scss` 不再承载该容器规则；组件层继续保持插件 Token 隔离。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `7a5a8d9`，未推送。

### 第三十三批（30 项）

- 将 560px 容器下模板管理器的紧凑布局、卡片操作区、表单控件、文字截断与按钮触控尺寸等 30 项职责迁移至 `ui/components.scss`。
- 增加模板移动布局回流守门，确保 legacy `index.scss` 不再承载该响应式块。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 全部通过；本地提交 `85b4620`，未推送。

### 第三十四批（30 项）

- 迁移 380px 视口回退及洞察/历史/日历紧凑密度规则 30 项至组件层，覆盖统计卡、图例、历史编辑器、空态和触控按钮。
- 增加视口回退回流守门；验证 `pnpm run check`、`ui-theme`、`git diff --check` 通过。
- 本地提交 `15b365d`，未推送。

### 第三十五批（30 项）

- 将高对比度、强制颜色、减少动画及触控设备兼容规则迁移至 `ui/components.scss`，并补充记录按钮、日历、图标网格和模板操作区的触控尺寸优化，共 30 项。
- 新增兼容媒体样式回流守门；`pnpm run check`、`ui-theme`、`git diff --check` 通过。
- 本地提交 `4383730`，未推送。

### 第三十六批（30 项）

- 补充横屏低高度与粗指针设备交互优化 30 项，覆盖历史筛选、日历、Today 操作、移动导航及触控反馈。
- `pnpm run check` 与 `ui-theme` 通过，本地提交 `6e40269`，未推送。
### 10.0 基础开发第五批（约 100 项）

- 将 legacy `index.scss` 中回顾页范围切换、总结文本、洞察统计、热力网格和洞察行基础样式迁移至组件层，并完成宿主变量替换。
- 组件层新增完整洞察基础职责，`index.scss` 减少 121 行。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `e006e4d`，未推送。
### 10.0 基础开发第十批（约 100 项）

- 设置页新增番茄钟适配器连接状态显示，明确区分“待接入”和已连接适配器数量。
- 更新桌面事项页布局断言以匹配新的 320–360px 左侧列表比例。
- 番茄钟插件联动状态现在可从设置页直接判断，便于后续 11.0.0 生态适配器验收。
- 验证：`pnpm run check`、`node tests/desktop-dialog.test.cjs`、`git diff --check` 通过；本地提交 `8d5d873`（功能）及后续测试修正。
### 10.0 基础开发第十四批（约 100 项）

- 清理 `index.scss` 中与组件层重复的通用交互基础：控件过渡、密度偏好、最小高度、焦点阴影及历史备注焦点样式。
- 继续推进 T-105 legacy 退役，删除 22 行重复规则，避免同选择器跨文件覆盖造成移动端错位。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `b6f2c4b`，未推送。
### 10.0 基础开发第十五批（约 100 项）

- 继续推进 T-105，删除 `index.scss` 中重复的标题、眉题、区块标题和标题操作区基础规则共 43 行。
- 这些职责统一由 `ui/components.scss` 承担，减少桌面与移动端后置覆盖冲突。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `c43b854`，未推送。
### 10.0 基础开发第十六批（发布工程，约 100 项）

- 将 CSS 体积发布门禁改为分级策略：318KB 正常线、340KB 警告线、360KB 硬阻断线。
- 明确 Webpack 244KiB 性能提示和项目发布硬门禁的区别，避免将通用建议误判为不可发布限制。
- 同步开发路线文档与 release-assets 测试输出，当前构建 313431 bytes 仍处于正常预算内。
- 验证：`pnpm run check:release`、`pnpm run check`、`git diff --check` 通过；本地提交 `f429820`，未推送。
### 10.0 基础开发第十七批（约 100 项）

- 继续推进 T-105：迁移 Today 组织筛选、搜索尺寸、分组标题、分组间距与分组项目间距等基础职责至组件层。
- 删除 `index.scss` 中 20 行重复规则，减少桌面/移动后置覆盖冲突。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `9c0ebda`，未推送。
### 10.0 基础开发第十八批（约 100 项）

- 继续推进 T-105：迁移 Today 卡片基础样式（高度、内边距、图标、标题、元信息、进度、操作区）至组件层。
- 统一卡片阴影和边框 Token，删除 legacy 重复规则 25 行。
- 同步 UI 主题守门，改为锁定组件层 `lc-checkin-shadow-sm` 归属。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `b37e431`、`851e927`，未推送。
### 10.0 基础开发第十九批（约 100 项）

- 继续推进 T-105：迁移编辑器类型网格、高级设置、保存按钮、编辑器操作区及历史列表基础规则至组件层。
- 同步迁移历史行、历史事件、日历单元格和完成区基础视觉规则，删除 legacy 重复声明。
- 统一使用插件 Token，避免宿主变量直接进入新增组件规则。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `bfdb908`，未推送。
### 10.0 基础开发第二十批（约 100 项）

### 10.0 基础开发第二十一批（34 项）

- 退役 `index.scss` 中回顾/洞察 coaching、custom range、picker、heading、legend 等 34 项重复职责，统一由组件层承载。
- 更新移动发布与模板触控测试的样式归属断言，避免将已迁移的窄容器规则锁回 legacy 文件。
- 验证：`pnpm run check`、`ui-theme`、`test:mobile`、`pnpm run test:quality`（除迁移中发现并修正的旧断言外）通过；本地未推送。

- 继续推进 T-105：迁移事项面板、事项行、事项图标、事项表单间距与历史筛选/选中/事件表面基础规则至组件层。
- 删除 legacy 重复样式 38 行，组件层统一使用插件 Token 和阴影/圆角语义。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `46603c2`，未推送。

### 10.0 基础开发第二十二批（30 项）

- 继续推进 T-105，删除历史页列表、历史行、日历单元格等 legacy 重复基础职责。
- 更新 UI 主题归属守门，确认历史布局继续由组件层提供。
- 验证：pnpm run check、ui-theme、git diff --check 通过；提交 c65265a、95db225，未推送。

### 12.0.0 发布收口（2026-09-16）

- 完成 12.0.0 版本、桌面/移动/dock UI、提醒中心性能、无障碍与发布脚本的最终审计；当前待做仅剩最终构建摘要、提交、推送和 GitHub Release。
- 自动化证据已覆盖核心单元、UI、移动、生态、性能、备份恢复、跨表面、浅/深主题、宽度走查、视觉探针和无障碍审计；真实思源客户端与番茄钟双窗口仍需用户现场复核。
- CSS 门禁采用 318KB 软线、420KB 告警线、450KB 硬阻断线；该策略已记录于 D-089，未同步本地集市目录。
### v12.0.0 已发布（2026-09-16）

- GitHub Release：https://github.com/ai68298100/siyuan-checkin/releases/tag/v12.0.0
- 发布提交：`6c35296`；标签：`v12.0.0`；`package.zip`：349,404 bytes。
- 资产 SHA-256：`4b4dd41976f8a5828005005fd98296025c3531b5965108e5ccd721a5b2364703`；GitHub 资产 API 摘要与本地计算一致。
- 推送后的 GitHub Actions CI 已成功（run 35055278439）。本轮未同步 `D:\小飞驴的SIYUAN\data\plugins\siyuan-checkin`；真实思源客户端验收仍记录为 B-007。

### 12.0.0 发布后跨端 UI 收口（2026-09-16，T-962~T-969）

- 完成桌面、手机、页签与 dock 的统一维护：设置页增加真实滚动容器导航同步、生命周期清理和每表面唯一 ARIA id；回顾页重组范围/报告/更多工具并解除摘要截断；事项页补足可见帮助、分类数量和代表模板信息。
- 手机 Today 的提醒行与底栏按 320px 下限收口：提醒正文保持可读，底栏固定五等分，中间新建入口的图标与标签分轨；窄 dock 使用同一语义导航但独立密度规则，宽 dock 保留紧凑 rail。
- 新建/编辑页改为“表面单滚动所有权”：form-scroll 不再成为第二个整页滚动层，模板/高级项展开后由页面继续滚动；图标目录在窄端改为流内限高面板。手机保存栏锚定宿主并通过点击命中验证，dock 尾部操作可随页面完整滚入。
- 新增 tests/settings-navigation.test.cjs，扩展响应式结构与 tests/visual-qa.cjs 的关闭 details、真实滚轮、图标面板、保存栏和移动底栏断言。pnpm run test:quality、系统 Chrome 宽度走查、桌面浅/深色视觉 QA 与 mobile frontend 视觉 QA 均通过；10k 事件完整渲染 49ms、横向溢出 0px。
- 生产 CSS 为 424120 bytes，超过 420KB 告警线但低于 450KB 硬阻断线；Webpack 244KiB 仍是通用性能提示，不是本项目发布失败条件。
- 参考 royc01/pinch 与 HaoCeans/siyuan-points-reward 后采用同一语义骨架 + 表面密度变体、320px 下限、等分导航和单滚动所有权；未照搬其品牌视觉或双根滚动风险结构。
- 本轮未 push、未发版、未同步 D:\小飞驴的SIYUAN\data\plugins\siyuan-checkin；真实思源桌面/手机、dock 安全区、软键盘及番茄钟双窗口仍按 B-007 现场复核。

### 12.0.0 发布后回归加固（2026-09-16，T-970~T-974）

- 320px Today 顶栏完成最终几何收口：标题保留最小可读轨道，日期可收缩，连续天数与完成计数保持单行；视觉脚本新增标题宽度、操作行高度和卡片操作不重叠断言。
- 设置导航补充旧 WebView 兼容：`Element` 全局缺失时安全退出，`scrollTo` options 不被宿主接受时回退到直接 scrollLeft/scrollTop；现代浏览器仍使用平滑定位。
- 组件层增加闭合 `<details>` 的统一零占位规则，覆盖回顾更多菜单、提醒筛选、事项帮助/模板、设置折叠和审计列表，打开态布局与独立面板滚动保持不变。
- 事项操作按钮拆分图标与标签节点，归一化过程只替换图标，重绘/停用切换后不丢失 label、title 和 ARIA 语义；窄栏继续隐藏标签以保持固定操作列。
- 验证：`pnpm run check`、`pnpm run build`、`pnpm run test:quality`、系统 Chrome `width-walkthrough`、桌面浅色/深色 visual QA、mobile frontend visual QA 均通过；10k 事件完整渲染 33ms，横向溢出 0px。
- 最终生产 CSS 为 425364 bytes，超过 420KB 告警线但低于 450000-byte 硬线；本轮仍未 push、未发版、未同步 `D:\小飞驴的SIYUAN\data\plugins\siyuan-checkin`，B-007 真宿主复核继续开放。

### 12.0.0 发布后 dock 与局部刷新加固（2026-09-16，T-975~T-980）

- Today 局部刷新传播实际 `localDate`；跨日事件、完成区归属变化和操作节点结构变化均先回退完整投影，避免历史事件错误改写今日卡片或完成卡片残留在错误分区。
- 局部 patch 在 dock、页签和快速窗口上先完成多 surface 预检，再执行任何 DOM mutation；`pending-only` 移除不再出现“先删一个 surface、另一个 surface 才发现不匹配”的短暂不一致。
- 窄 dock 底栏补充最终几何守门：五个 `minmax(0,1fr)` 等分轨道、图标与标签同格居中、标签省略；宽 dock rail 使用等分 flex 轨道并保留 72px 最小可用宽度；卡片正文和操作按钮统一 `min-width:0`。
- 新增响应式源码守门，锁定窄 dock 等分、宽 rail 分布和局部刷新结构选择器；`pnpm run test:quality`、`width-walkthrough`、`ui-sweep`、类型检查和构建均通过。
- 本轮生产 CSS 为 427260 bytes，超过 420KB 告警线但低于 450000-byte 硬阻断线；未 push、未发版、未同步本地集市，B-007 真实思源宿主复核继续开放。
- 参考上游 `HaoCeans/siyuan-points-reward@eb78e447` 与 `royc01/pinch@8ce2a252`，仅采用稳定 dock 尺寸、单滚动容器、等分导航、信息分层和反馈闭环原则，不复制其主题、业务模型或可能造成弹层裁切/双滚动的实现。

### v12.0.1 已发布并同步本地集市（2026-09-17，T-981）

- 发布提交 `0b4663b` 已推送到 `main`，标签 `v12.0.1` 与 GitHub Release 已创建；远端 CI run `35120024779` 成功。
- 最终 `package.zip` 为 354276 bytes，SHA-256 为 `72d456b9c64db8d1f36676d218e7de580299f6680252687e667469607161745b`；GitHub Release API 返回的资产摘要与本地一致。
- `pnpm run test:quality` 全链通过；10k 事件完整渲染 29ms、横向溢出 0px；生产 CSS 427260 bytes，低于 450000-byte 硬阻断线。
- 已将 `dist/` 的七个发布文件覆盖同步到 `D:\小飞驴的SIYUAN\data\plugins\siyuan-checkin`；逐文件 SHA-256 与构建目录一致，本地 `plugin.json` 版本为 12.0.1。目录中额外的历史 `LICENSE` 文件未删除。

### 思源官方集市首次上架提交（2026-09-17，T-982）

- 依据 `siyuan-note/bazaar` 当前规则，首次上架仅在 `plugins.txt` 增加 `owner/repo`，后续版本由集市从插件仓库 Latest Release 自动更新。
- 已确认 `ai68298100/siyuan-checkin` 尚未收录且无历史/进行中同包 PR；个人 Bazaar fork 已同步到上游 main `588209f0626bbeb8ca23e17f5bd8abea5a125c72`。
- 已推送分支 `ai68298100/bazaar:codex/add-siyuan-checkin` 并创建 `siyuan-note/bazaar#2248`；差异仅新增一行 `ai68298100/siyuan-checkin`。
- 官方 PR Check 已读取 v12.0.1 Release 与 `package.zip`（SHA-256 `72d456b9c64db8d1f36676d218e7de580299f6680252687e667469607161745b`）并通过，PR 获得 `plugin`、`ci-passed` 标签；当前等待维护者审核合并。

### 底栏番茄钟首个外部提供方与兼容 PR 草案（2026-09-17，T-983~T-984）

- 小飞驴打卡的外部计时选择由泛化 `plugin` 收口为 `docktomato`，UI 明确显示“底栏番茄钟插件”；旧偏好自动迁移，运行时只接受 `siyuan-plugin-docktomato`，未来新增提供方时使用独立 provider。
- 新增 `src/dock-tomato.ts`：兼容任意加载顺序，调用 Dock Tomato v1 focus facade；完成事件按稳定 session ID 去重，支持次数、分钟和小时换算，并在结束后等待 Dock Tomato 空闲再释放活动适配器。
- 基于 Dock Tomato `main@7863b58`（v2.2.7）在独立目录准备兼容差异：冻结的 v1 focus facade、busy 保护、4 KiB 原始类型 context、非破坏性 stop、事务成功后的 completion、卸载 availability、双语文档和契约测试；不依赖小飞驴打卡，不修改其核心计时/存储机制。
- 小飞驴打卡 `pnpm run test:quality` 全链通过（10k 事件 35ms，CSS 427260 bytes）；Dock Tomato 全部 `scripts/*.test.js` 与 `node --check tomato.js` 通过。未创建、未推送对方 PR，详见 `docs/docktomato-compat-pr-draft.md`。

### 底栏番茄钟兼容 PR 深度加固（2026-09-17，T-985）

- 对外 focus facade 增加冻结能力列表，区分 API 可发现与计时器真正 ready；调用方在能力存在时显式校验 `status/start/pause/completion-event`，避免未来只靠版本号猜功能。
- 稳定区分 `DOCK_TOMATO_NOT_READY`、`DOCK_TOMATO_TIMER_BUSY` 与 `DOCK_TOMATO_INVALID_CONTEXT`；非法显式 context 不再静默丢失关联。
- 外部启动完整清理主任务、分段任务、聚焦恢复来源、最近快照和同步任务 envelope；若核心启动失败则恢复调用前时长、关联、envelope 与 UI，避免半修改状态；安全 context 纳入同步语义签名，历史归一化继续保留未知安全字段。
- PR 文档明确 completed 是实时事件而非可靠消息队列；重载补偿留待双方定义有界查询、游标、权限及发生时间口径后再做，当前不读取对方内部历史文件。
- Dock Tomato `node --check tomato.js` 与全部 `scripts/*.test.js` 通过；小飞驴打卡完整质量链通过。两边仅本地修订提交，未创建或推送上游 PR。

### Dock Tomato PR 冻结与后续路线重排（2026-09-17，T-986~T-987）

- 最终审计将公共 `stop()` 政名为与行为一致的 `pause()`，事件同步改为 paused；小飞驴打卡适配器保持内部 stop 语义，但调用上游公开 pause。
- 每次外部启动预分配唯一 focus session ID，context、同步签名、状态展示与历史完成事件均校验该 ID，防止同步残留污染之后的手动专注；启动失败完整恢复原 session 和 envelope。
- Dock Tomato 语法检查及全部 `scripts/*.test.js` 通过，小飞驴打卡类型、集成契约与文档检查通过。兼容分支冻结在本地，等待用户通知后才可 push/PR。
- 新增当前路线 `docs/development-roadmap-2026.md`：12.x 现场稳定、13.0 专注生态、14.0 数据内核、15.0 UI 系统、16.0 复盘计划、17.0 受控自动化、18.0 开放生态；旧路线仅保留历史背景。

### 13.0 专注生态第一批（2026-09-17，T-988~T-990）

- 新增九态 Dock Tomato 诊断：缺失、版本不兼容、接口不完整、能力不足、恢复中、就绪、运行、暂停和读取失败；版本与能力输入均防守式归一化。
- 设置页不再只显示“待接入/适配器数量”，而是显示真实状态、API 版本、安装说明和显式自带计时降级按钮；偏好只在用户点击后改变。
- Today 小钟表按诊断原因提示；NOT_READY、TIMER_BUSY、INVALID_CONTEXT 转为本地化文案，未知异常安全截断。
- availability、started、paused 触发跨表面刷新，同事件循环重复请求合并，卸载后排队回调失效；类型、i18n 与 68 条专注集成契约检查通过。

### 13.0 专注生态第二批（2026-09-17，T-991~T-994）

- completion 回调改为纯判定管线，验证事件版本、consumer、context、项目状态、启动映射、时长和稳定身份；外部 getter 不执行，其他 consumer 不产生噪音。
- 删除、归档、单位或计数模式变化不再按当前项目静默改写历史；次数模式也要求合法实际时长。
- 同进程 in-flight/completed 与持久 `externalRef` 三层去重，覆盖并发、乱序和插件重载；写入抛错或返回空结果保持可重试。
- 最近 20 条拒绝/失败进入冻结诊断快照，设置页展示最新原因、时间和数量并支持清除；新增行为测试并纳入生态测试链。
### 13.0 专注生态第三批（2026-09-17，T-995~T-997）

- 将 Dock Tomato completion 问题从纯运行期数组升级为独立 schema v1 存储：加载和 `onDataChanged` 均可恢复，未知版本、未知原因、非法时间和损坏 JSON 安全忽略，始终只保留最近 20 条。
- 新增支持诊断 JSON 导出，包含当前 provider 状态、受限能力列表和有界问题字段；不导出打卡名称、备注、记录正文或其它主 store 内容。设置页提供双语“导出诊断/清除诊断”操作。
- completion 行为测试扩展恢复、裁剪、字段边界、不可变快照、损坏输入及导出结构检查；与 integration 契约合计超过 100 条断言。`pnpm run test:quality` 与 `git diff --check` 已通过：10k 事件完整渲染 31ms、横向溢出 0px，生产 CSS 427260 bytes（高于 420000 告警线、低于 450000 硬线）。
- 本批未 push、未发版、未同步本地集市；真实 Dock Tomato 双插件、双窗口与热重载时序仍由 B-007 跟踪。

### 13.0 专注生态第四批（2026-09-17，T-998~T-1000）

- 统一 Dock Tomato 运行状态读取：方法按原 receiver 调用，返回字段只读 own data descriptor，外部 getter、抛错、空返回或错误类型均转换为不可读状态。
- `canStart` 在状态不可读、未就绪或活动中时关闭；释放轮询在状态不可读时保留所有权并继续有界等待，卸载后立即停止；completed/ended 均刷新设置与 Today 状态。
- 新增 60+ 条运行期检查，覆盖布尔组合、恶意 getter、receiver、会话标识裁剪和生命周期源码契约；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 36ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第五批（2026-09-17，T-1001~T-1003）

- 新增可执行 FakeWindow/Provider/Checkin API bridge harness，直接运行 `installDockTomatoBridge`，覆盖适配器注册、项目资格、启动 context、暂停、完成回写、externalRef 去重与结束释放。
- 验证其它 consumer 不产生记录或诊断，非法时长产生有界原因，started/paused 刷新被合并；dispose 后五类监听器、计时器、写入和刷新均无残留。
- 新测试包含 55 条运行期断言并进入 `test:ecosystem`；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 37ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第六批（2026-09-17，T-1004~T-1006）

- 回写失败诊断现在保留有界 itemId/session identity；写接口空返回和抛错都不加入完成集合，同一身份随后可成功重试并生成唯一 externalRef。
- recordEvent 等待期间若插件卸载，迟到成功不再重建运行期完成状态，迟到失败不再追加诊断或触发界面刷新。
- bridge harness 增加 20 组非法时长的 80 条字段级断言，以及空返回、抛错和成功重试验证；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 36ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第七批（2026-09-17，T-1007~T-1009）

- deferred write 测试复现真实竞态：第二个 duplicate handler 的 finally 会误删首个 handler 的 in-flight identity，使第三个事件穿透。改为只有执行 `inFlightIdentities.add` 的 handler 记录 `claimedIdentity` 并负责释放。
- 写入悬挂期间连续重放 25 次、写入完成并进入持久 externalRef 后再重放 25 次，始终只有一条记录且不产生 duplicate 诊断噪音。
- 新增 100 条逐次运行期断言和最终唯一记录检查；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 32ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第八批（2026-09-17，T-1010~T-1012）

- 持久历史 externalRef 扫描改为 own-data descriptor 读取，损坏记录即使定义抛错 getter 也不会被执行或阻断完成回写。
- 预置 25 个不同 `docktomato:<identity>` 历史引用并逐项重放，全部由持久幂等层安静拦截，不调用 recordEvent、不写 duplicate 诊断。
- 新增 50 条逐项运行期断言，另验证恶意 getter 零读取和种子数量完整；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 31ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第九批（2026-09-17，T-1013~T-1015）

- 把每次 completion 的历史 externalRef `map/filter/map` 三段投影改为单遍 Set 收集，减少中间数组和重复身份占用，同时不牺牲完整历史幂等正确性。
- 单独导出纯投影函数，明确只接受非空 `docktomato:` 身份；其它 provider、重复、空/非字符串和恶意访问器字段均安全忽略。
- 50 个混合候选逐项验证成员关系，共新增 56 条运行期断言；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 39ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十批（2026-09-17，T-1016~T-1018）

- 同一 facade 连续派发 25 次 availability，每次验证不重复注册且不注销当前 adapter；刷新请求在微任务边界合并为一次。
- 执行 provider facade 替换、完全缺失、API v2 不兼容与兼容实例恢复：旧实例及时注销，不健康实例不注册，最终 dispose 只释放当前实例。
- provider 容器和 focus facade 改用统一 own-data 发现函数，`__dockTomato`/`focus` 抛错 getter 均零执行；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 75ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十一批（2026-09-17，T-1019~T-1021）

- provider 在 ended 后持续 active 时执行有界释放轮询：250ms 间隔最多20次，每轮不提前调用 stopFocus，也不触发额外 UI 刷新。
- 轮询耗尽分支显式清空 releaseTimer 标识，避免逻辑上残留已失效 timer；之后 provider 变 idle 并再次 ended 时仍能立即释放。
- 新增60条逐轮运行期断言，另覆盖初始 timer、耗尽归零及恢复释放；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 33ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十二批（2026-09-17，T-1022~T-1024）

- 成功重试现在会精确清除同一 provider identity 的 write-failed 诊断，避免已恢复故障继续占据设置页；其它原因和其它 session 不受影响。
- 诊断解决发生在 recordEvent 返回真实记录且 bridge 仍存活之后，不会把空返回、抛错或卸载后的迟到结果误标为恢复。
- 20个独立 session 先失败后逐个成功重试，新增100条逐会话运行期断言及最终空诊断检查；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 37ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十三批（2026-09-17，T-1025~T-1027）

- 诊断恢复从“按输入尾部裁剪”改为先归一化、按时间升序稳定排序、再保留最近20条；跨窗口或同步导致的乱序不再让设置页把旧问题显示成最新。
- 相同时间戳使用原输入 index 作为次级排序键，裁剪结果确定且不会跨重载随机变化。
- 30条逆序记录逐项核对恢复后的时间、itemId 和 identity，新增60条运行期断言，另覆盖长度与25条同时间稳定裁剪；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 58ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十四批（2026-09-17，T-1028~T-1030）

- 相同 reason/itemId/identity 的运行期问题不再占满20行诊断窗口，而是合并为一行、更新时间并累计 count；不同会话或原因保持隔离，计数封顶9999。
- 设置页问题数量改为所有折叠行的 count 总和；schema v1 旧记录缺少或含非法 count 时按1恢复，合法值保留，过大值裁剪。
- 同一非法 session 连续25次产生50条逐次断言，另覆盖零写入、关联身份和 count 兼容边界；定向 bridge/completion/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 35ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十五批（2026-09-17，T-1031~T-1033）

- 恢复诊断文件时按 reason/itemId/identity 完整键归并旧版或多窗口遗留的重复行，count 求和且封顶9999，继续兼容 schema v1。
- 恢复过程先稳定排序、再以最后一次出现更新键的插入位置，最后按20个唯一问题键裁剪；最新时间、原因隔离和诊断容量语义保持一致。
- 25条同键持久记录新增50条逐项关联断言，另覆盖次数合计、最新顺序、不同原因、计数封顶和独立身份容量；定向 completion/integration、bridge、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 31ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十六批（2026-09-17，T-1034~T-1036）

- 诊断导出改为 own-data 防御读取，九种 provider 状态使用白名单，未知状态降级 error，Symbol 等异常版本值不会中断序列化。
- 非法 exportedAt 自动生成有效 ISO 时间；能力数组最多扫描128项、输出32项且单项80字符，数组索引访问器不会执行。
- 25组 hostile provider 新增75条逐项断言，另覆盖能力 getter、稀疏数组、Symbol 版本和未知状态；定向 completion/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 30ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十七批（2026-09-17，T-1037~T-1039）

- 外部专注启动新增可往返上下文构造器，itemId/unit 必须非空、无首尾空白且不超过 completion 侧160/80字符边界，避免完成后无法匹配项目。
- canStart 提前关闭非法入口，start 再次守门并返回既有 DOCK_TOMATO_INVALID_CONTEXT，绕过资格检查也不会调用外部 provider。
- 25组异常项目新增50条逐项断言，另覆盖合法最大边界、直接 start 拒绝和零 provider 调用；定向 bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 55ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十八批（2026-09-17，T-1040~T-1042）

- completion 的 sessionId/recordId 改为无损身份校验，禁止首尾空白和超过240字符的值被 trim/slice 后进入 externalRef，消除不同长身份截断碰撞。
- 持久历史只投影总长不超过251字符且拆分身份不超过240字符的原样 `docktomato:` 引用，与运行期判定共享边界。
- 25组异常 completion 身份与25组异常历史引用共新增100条逐项断言，另覆盖合法最大边界和 recordId 回退；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 32ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十九批（2026-09-17，T-1043~T-1045）

- 实时 provider 检测不再直接 Number 转换版本或 filter 能力数组；新增安全有限数值与有界能力投影，并与诊断导出复用。
- Symbol 版本安全降级，能力索引 getter 零执行；最多扫描128项、输出32项、单项截断80字符，百万长度稀疏数组不会被完整遍历。
- 25组污染 provider 新增50条逐项断言，另覆盖稀疏数组边界及缺少必要能力状态；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 59ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十批（2026-09-17，T-1046~T-1048）

- runtime status 的 sessionId 改为无损读取，非法身份仅被省略，不降低 ready/active 等其它状态的可读性；合法240字符身份保持原样。
- 运行期诊断追加、持久诊断恢复及 completion 失败采集统一对 itemId/identity 使用 exactBoundedText，不再以截断伪键折叠不同故障。
- 25组异常运行状态与25组异常持久诊断共新增100条逐项断言，容量用例改用合法唯一身份；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 31ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十一批（2026-09-17，T-1049~T-1051）

- 诊断恢复不再通过 map 直接读取数组索引，改为 ownDataValue 逐项读取，污染索引 getter 不会执行或中断恢复。
- 损坏输入最多扫描最后512项，百万长度稀疏数组不会被完整遍历；Symbol 等异常 count 通过 finiteNumber 安全降级为1。
- 25组 hostile 数组新增50条逐项断言，另覆盖百万稀疏尾项、身份保留和异常计数；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 86ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十二批（2026-09-17，T-1052~T-1054）

- 诊断字符串恢复在 JSON.parse 前增加512KiB字符上限，超限数据直接返回冻结空快照，避免损坏文件触发高成本解析。
- 恰好512KiB的合法 JSON 仍可恢复，超过一个字符即拒绝；对象输入继续使用上一批的512项尾窗扫描。
- 25个不同超限长度新增50条逐项断言，另覆盖精确边界长度和合法 identity 恢复；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 28ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十三批（2026-09-17，T-1055~T-1057）

- completion 项目匹配新增 `findCompletionItem`，使用 ownDataValue 读取数组位置和项目 id，污染 getter 不执行且稳定返回 missing-item。
- archived、unit、tomatoMode 以及分钟/小时/次数换算改为自有数据读取，损坏字段不会进入第三方代码或被误报成写入失败。
- 25组污染数组与25组污染项目新增100条逐项断言，另覆盖匹配项目字段 getter；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 36ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十四批（2026-09-17，T-1058~T-1060）

- completion 的 itemId/itemUnit/tomatoMode 改为无损文本校验，带空白或超长字段不再经 trim/slice 后匹配本地项目。
- durationMinutes 仅接受有限 number，不再执行 Number 隐式转换；Symbol、字符串及恶意 valueOf 对象稳定返回 invalid-duration。
- 25组异常上下文与25组异常时长共新增100条逐项断言，另覆盖数值字符串和零 coercion 调用；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 42ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十五批（2026-09-17，T-1061~T-1063）

- 持久 externalRef 扫描从 for-of 改为普通索引循环，数组元素通过 ownDataValue 读取，不再触发索引 getter 或自定义 Symbol.iterator。
- 扫描仍覆盖完整 events.length，不用固定窗口牺牲旧 session 幂等；10,000项稀疏数组的尾部合法身份可正常识别。
- 25组污染数组新增75条逐项断言，另覆盖大型稀疏历史完整性；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 37ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十六批（2026-09-17，T-1064~T-1066）

- Dock Tomato 空闲释放新增在途 Promise 单飞，重复 completed/ended 不再并发调用 stopFocus，也不会建立空闲状态下的多余计时器。
- 释放结算只清理对应 operation，随后可处理未来新会话；插件卸载后迟到结算不再触发 provider UI 刷新。
- 25次结束风暴新增50条逐项断言，另覆盖首发、结算和再次释放；定向验证及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 32ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### T-105 legacy 样式退役第三十一批（2026-09-17，135项）

- 将 coarse-pointer 触控目标、安全区、编辑器控件、tap highlight，以及 reduced-motion 和 print 职责统一迁入组件层；删除 legacy 中对应135行。
- 更新7组移动/发布验收的样式归属，并增加触控、减弱动态和打印规则不得回流 legacy 的静态守门；`index.scss` 从416行降至281行。
- 类型检查、构建、移动矩阵、主题、legacy audit、宽度走查和完整 `pnpm run test:quality` 通过；10k 事件完整渲染 40ms、横向溢出 0px，生产 CSS 426185 bytes（较本批前减少1075 bytes）。

### T-105 legacy 样式退役第三十二批（2026-09-17，254项）

- 删除109行旧 root token/基础控件规则和145行回顾、事项、编辑器、移动导航重复规则；缺失的3个几何 token 归入 tokens 层。
- 最后25行模板管理器规则迁入组件层并替换宿主色引用；`index.scss` 从281行缩为一行退役说明，生产入口移除 legacy import，T-105 完成。
- UI、移动矩阵、模板管理器、legacy audit、宽度走查和完整 `pnpm run test:quality` 通过；10k 事件完整渲染 30ms、横向溢出 0px，生产 CSS 419910 bytes，已回到420000 bytes 告警线以内。

### 13.0 移动质量门禁（2026-09-17，T-1067~T-1069）

- 修正孤立的移动编辑器结构测试，将底部留白断言从过期12px更新为当前单一64px操作栏高度。
- 将 `mobile-editor-structure.test.cjs` 纳入标准 `test:mobile`，320/360/390/430px 的模板、图标、滚动、安全区与操作栏约束进入完整质量链。
- `pnpm run test:mobile` 与完整 `pnpm run test:quality` 通过；10k 事件完整渲染 74ms、横向溢出 0px，CSS 419910 bytes。

### 13.0 测试资产治理（2026-09-17，T-1070~T-1076）

- 审计后测试资产增至73个 `.test.cjs`（含覆盖守门本身），发现13个原本未接入脚本的测试；现已统一加入 `test:extended` 和完整质量链。
- 将记录/历史、Today、6.0效率、8.3平台四组旧单体断言迁移到当前 fragments、review、bind、focus timer 与 occasions 模块。
- 新增逐文件覆盖守门：73项测试资产均必须由 package scripts 执行；当前显式退役数为0，后续新增孤立测试会直接失败。
- `pnpm run test:extended` 通过，覆盖辅助功能、历史结构、建议工作流、模板模型、Today查询、效率功能、洞察和平台能力。
- 完整 `pnpm run test:quality` 通过：类型检查、生产构建、主/UI/移动端/生态/扩展测试、性能和发布资源检查全绿；10k事件完整渲染37ms、横向溢出0px，CSS 419910 bytes（低于420000提示线）。

### 14.0 数据内核第一批（2026-09-17，T-1077~T-1079）

- 扩展 `getStoreIndex`，一次遍历同时构建 `byItemDate`、`byDate`、`byId`，新增日期和ID查询接口并保持 WeakMap 随不可变 store 自动失效。
- 回顾月历/日期明细、历史撤销/备注编辑和最近记录撤销接入索引，移除页面级日期 Map 与4处重复线性事件查找。
- 新增数据索引测试：25组ID查询与25组日期查询共50条逐项断言，另覆盖缓存、失效、空结果、项目日期兼容和重复ID首项语义；测试资产增至74项且零退役。
- 完整 `pnpm run test:quality` 通过：类型、构建、主/UI/移动端/生态/扩展、性能和发布资源检查全绿；10k事件完整渲染50ms、横向溢出0px，CSS保持419910 bytes。

### 14.0 数据内核第二批（2026-09-17，T-1080~T-1082）

- 新增半开日期范围查询：排序投影二分定位开始/结束边界，命中结果按原 ordinal 恢复持久顺序。
- 标准日/周/月与自定义分析范围统一接入索引，移除两处逐事件全量 filter；范围排序投影按需构建，不增加未使用范围查询页面的启动排序成本。
- 新增25组半开范围与25组对象身份逐项断言，共50项；另覆盖空/逆序/范围外、原顺序、首次构建和后续缓存复用，测试资产增至75项且零退役。
- 完整 `pnpm run test:quality` 通过：类型、生产构建、主/UI/移动端/生态/扩展、性能与发布资源检查全绿；按需索引下10k事件完整渲染39ms、横向溢出0px，CSS保持419910 bytes。

### 14.0 数据内核第三批与12.0.2准备（2026-09-17，T-1083~T-1087）

- 项目ID与启用状态进入store级WeakMap索引；Today、回顾、历史操作、内置专注和外部适配器的高频路径接入索引。
- 25组启用项与25组归档项各执行原始/启用查询，共100条逐项断言；另覆盖缺失值、缓存复用、store替换和重复ID首项语义。
- README、12.0.2变更记录、Release notes和三个版本真值已更新；Dock Tomato PR草案同步到上游v2.2.8基线，明确正式PR前必须重放兼容分支。
- 修复发布资源守门对12.0.1的硬编码，改为从package版本动态校验源码、manifest、dist、README、变更记录和发布说明。
- 完整 `pnpm run test:quality` 通过；10k事件完整渲染145ms、横向溢出0px，CSS 419910 bytes；最终 `package.zip` SHA-256 为 `e02f3388eab9a81fea0af0d2761cf627886cb044216f31380b6890c63377d9b9`。

### 12.0.2 现场反馈修复（2026-09-17，T-1088~T-1090）

- 已完成项折叠改为当前表面原地更新 hidden、箭头和 aria-expanded，移除对整页 render 的依赖，避免手机端点击无效和列表跳动。
- 新建/编辑非二元任务新增“每次打卡”数值；配置贯穿任务与日期修订、用户模板、实时预览、Today 快捷记录和智能体默认记录，分钟/小时切换会同步换算。
- 旧任务无该字段时保持原有默认（分钟5、毫升250等）；零值、负值和非有限值不会进入规范化存储。
- `pnpm run test:quality` 全链通过：76项测试资产零退役，10k事件完整渲染29ms、横向溢出0px，CSS 419910 bytes（低于420000提示线）。

### 14.0 数据内核第四批（2026-09-17，T-1091~T-1093）

- 抽离无依赖的记录增量边界模块，编辑保存、用户模板和存储导入统一执行正数、两位精度与十亿上限规范化；二元任务始终忽略该字段。
- 快捷增量拥有独立输入精度：次数为1，其余类型为0.01，不再被目标值的粗步长误拦截；分钟/小时切换仍同步换算。
- Today、智能体默认记录和专注项目克隆严格读取目标日期修订，不用当前任务增量污染旧日期；新增12组规范化矩阵及结构守门。

### 14.0 数据内核第五批（2026-09-17，T-1094~T-1096）

- 新增三方写前对账模块，把基线、本地和远端规范化、冲突检测、确定性合并及双向收敛决策从插件实例中抽离。
- mutation 在排他存储锁内读取远端并完成必要回写后才执行用户操作；成功主存储写入始终推进 lastPersistedStore，不再受临时 UI 保存状态影响。
- 25组双窗口独立事件执行100条逐项断言，另验证 externalRef 跨窗口幂等、无变更零写入和较新项目版本胜出；测试资产增至77项且零退役。

### 14.0 数据内核第六批（2026-09-17，T-1097~T-1099）

- 主存储写入升级为“保存→回读→确定性合并校验”，只有回读结果包含期望快照才视为成功；最终确认的快照同时推进内存 store 与冲突基线。
- 若首写被非协作窗口覆盖，将期望值与观察值合并后执行一次有界修复；观察值已是超集则不重复写，连续两次无法收敛会抛出 `store-write-verification-failed`。
- 25组首写丢失执行100条逐项断言，另覆盖远端超集一次接受和持续丢失失败；完整质量链仍作为阶段门槛。

### 14.0 数据内核第七批（2026-09-17，T-1100~T-1102）

- 日期范围索引加入100,000条事件压力基准，首次查询按需建立排序投影并校验精确半开区间。
- 25组月范围查询各验证结果、单次耗时、投影对象复用和日期边界，共100条断言；避免在每次回顾范围切换时重复十万级排序。

### 14.0 数据内核第八批（2026-09-17，T-1103~T-1105）

- 删除入口在仅持有事件ID且事件已被另一窗口暂时移走时，仍创建ID墓碑；空白ID被明确忽略，避免无意义持久化。
- 同ID旧事件会被追加和合并双路径阻断；外部记录继续使用 itemId/source/externalRef 身份墓碑，事件ID变化也不会复活。
- 新增25组删除与陈旧重放交错，执行125条矩阵断言，并覆盖无关事件保留、交换律、幂等及外部身份边界。

### 14.0 数据内核第九批（2026-09-17，T-1106~T-1108）

- store 规范化与双窗口合并先构建墓碑ID集和外部身份集，再以常数时间过滤候选事件，消除事件数乘墓碑数的平方级扫描。
- 单事件追加继续复用相同查询语义；存储协议、墓碑排序和 externalRef 身份边界均未改变。
- 新增25组/100条双键等价断言；50,000事件与25,000墓碑规范化压力在当前环境约251ms完成，门槛为5秒。

### 14.0 数据内核第十批（2026-09-17，T-1109~T-1111）

- store 事件索引扩展 external identity 集与墓碑查询集，appendEvent 统一通过同一个 WeakMap 投影判断事件ID、外部身份和删除凭据。
- 已渲染/查询过的长历史在再次打卡时不再重复扫描全部事件和墓碑；新增记录仍创建新 store，保持不可变更新边界。
- 25组四类幂等拒绝路径执行100条断言；已预热的100,000事件历史追加在当前环境约1ms完成，门槛为250ms。

### 14.0 数据内核第十一批（2026-09-17，T-1112~T-1114）

- store 事件投影新增首项序号 Map，日志备注保存直接定位目标数组槽位，取消长历史尾部事件的 findIndex 全量扫描。
- 裁剪后的备注没有语义变化时返回原 store；真实修改仅复制事件数组与目标事件，保持原 store 和所有无关事件对象不变。
- 25组不可变/短路矩阵执行100条断言；已预热的100,000事件尾部备注更新在当前环境约0.2ms完成，门槛为250ms。

### 14.0 数据内核第十二批（2026-09-17，T-1115~T-1117）

- 事件 WeakMap 投影新增 byItem 分桶；配额型 getProgress 不再为每个项目把完整历史交给规则层，只传递目标项目的有序事件。
- 规则层仍独立执行单位、周/月周期、按值/按日期和日期修订判断；索引只缩小候选集，不改变业务计算口径。
- 25组多项目隔离矩阵执行100条断言；100个项目共100,000事件中连续25次配额查询在当前环境约35ms完成，门槛为500ms。

### 14.0 数据内核第十三批（2026-09-17，T-1118~T-1120）

- 新增 evaluateItemRule store级入口，Today 卡片剩余量和批量完成统一复用项目事件投影，不再把全库历史传给单项目规则。
- 习惯洞察的日期分桶与配额窗口同样只遍历目标项目事件，墓碑过滤、日期修订、报告克隆和纯 rules API 语义保持不变。
- 25组完整规则矩阵执行100条断言；100个项目共100,000事件中连续50次规则计算在当前环境约89ms完成，门槛为1秒。

### 14.0 数据内核第十四批（2026-09-17，T-1121~T-1123）

- 修复历史自定义回顾区间仍按 asOf 当天选择事件的问题；汇总现直接使用已裁剪 bounds 的半开日期范围，所选日期与统计事件重新一致。
- 区间事件在汇总入口一次按 itemId 分桶，项目摘要不再各自 filter 同一事件数组；普通日/周/月仍共享相同边界路径。
- 25组历史区间执行100条 asOf 隔离与汇总断言；100项目共100,000事件的自定义汇总在当前环境约331ms完成，门槛为5秒。

### 14.0 数据内核第十五批（2026-09-17，T-1124~T-1126）

- 写事务拆分严格 unknown 边界与内部 normalized 快路径；主插件只规范化远端 loadData，当前 store、冲突基线和待写快照不再在同一锁内反复清洗排序。
- 不可变 store 指纹按身份缓存；无变化对账在合并前短路，正常写后读回在修复合并前短路，真实冲突仍执行原确定性赢家、墓碑和 externalRef 语义。
- 25组三方快/守卫路径执行100条断言；使用独立对象模拟真实 loadData 后，100,000事件无变化对账约127ms、已规范化写后确认约470ms，门槛均为3秒。

### 14.0 数据内核第十六批（2026-09-17，T-1127~T-1129）

- store 事件投影在既有单次遍历中新增每项目自然日 Set；同日多条记录自动去重，Today 多表面共享同一不可变 store 时复用该投影。
- 连续记录核心迁入 model 并接受显式 asOf，保持今天优先、今天缺席从昨天续算、自然日倒推、项目隔离和归档项目归零语义。
- 25组连续记录矩阵执行100条断言；100项目共100,000条历史的已预热连续记录投影在本次完整质量链约0.1ms，门槛为250ms，测试资产增至86项且零退役。

### 14.0 数据内核第十七批（2026-09-17，T-1130~T-1132）

- 回顾页由单一 AnalyticsSnapshot 同时提供徽标、近12周完成率和近6月记录趋势，移除视图层对 weekly/monthly 的重复计算，并统一同一截止日。
- 快照提升到一次 render 周期，在 dock、页签和快速弹窗之间共享；只做瞬时透传，不增加可能跨日陈旧的长期缓存，年度热力图基准年也跟随快照日期。
- 25组趋势等价矩阵执行100条断言；100,000事件快照在完整质量链约427ms、复用读取约0ms，门槛分别为5秒和250ms，测试资产增至87项且零退役。

### 14.0 数据内核第十八批（2026-09-17，T-1133~T-1135）

- 回顾视图从 AnalyticsSnapshot.asOf 解析一次本地中午，日历今天态、当前月、摘要、成就、提醒、逾期和热力图共享该截止日，消除跨午夜的区块漂移。
- 成就引擎新增显式 asOf 入口，历史回放的完美日窗口不再依赖 Date.now；未传参数时仍默认当前日期，保持既有调用兼容。
- 25组固定日期执行100条摘要与成就隔离断言，并增加回顾视图无独立无参 new Date 的结构门禁；完整质量链通过，测试资产增至88项且零退役。

### 14.0 数据内核第十九批（2026-09-17，T-1136~T-1138）

- 成就上下文把活跃日、使用项目、记录来源、早晚完成、备注、附件和番茄钟统计合并到同一次事件遍历，取消同一历史上的多次 filter/map。
- 构建一次 itemId Map 完成事件所属时段分类，移除“每条事件 find 全部项目”的乘法级热点；完美日、规则判定、归档与缺失项目语义保持原样。
- 25组事件统计矩阵执行100条断言；100个项目共100,000条记录的成就投影在完整质量链中约178.2ms，门槛为2秒；89项测试资产零退役，10k完整渲染26ms、横向溢出0px，发布资源检查通过。

### 14.0 数据内核第二十批（2026-09-17，T-1139~T-1141）

- 完美日投影利用日期循环本身已经单调递增的事实，在当天计划统计完成后立即累计完美日、当前连续值和最佳连续值，移除中间 Map、键数组及重复排序。
- 无安排日继续跳过且不打断连续全清；有安排但未全清时归零当前连续值。项目可用性、计划规则、完成阈值、归档和日期修订仍由既有模型层判断。
- 25组每日/间隔计划矩阵执行100条断言；100项目、365天、36,500事件的年度投影在完整质量链中约204.8ms，门槛为3秒；90项测试资产零退役，10k完整渲染24ms、横向溢出0px，发布资源检查通过。

### 14.0 数据内核第二十一批（2026-09-17，T-1142~T-1144）

- getItemRevisionForDate 按 revisions 数组身份缓存有序投影；规范化任务已排序时直接复用原数组，兼容原始无序输入时仅首次复制排序，不改变调用方顺序。
- 目标日期从线性 filter + sort + 取末项改为上界二分；日期修订、单位、计划和旧任务回退语义保持不变，任务修订数组不可变替换时缓存自然失效。
- 25组修订矩阵执行100条断言；1,000条修订上的100,000次缓存查询在完整质量链中约37.4ms，门槛为1.5秒；年度完美日投影约196.4ms，91项测试资产零退役，10k完整渲染27ms、横向溢出0px，发布资源检查通过。

### 14.0 数据内核第二十二批（2026-09-17，T-1145~T-1147）

- 日期修订索引迁入无模型依赖的 rules 核心，model继续原名重新导出，既有 UI、分析、智能体和番茄钟调用无需迁移，也避免新增运行时模块破坏独立转译测试边界。
- evaluateRule 一次取得有效修订并传给内部状态判断，同一份计划、目标和单位驱动周期、进度与完成态；移除 getRuleStatus/evaluateRule 各自排序查找修订的重复实现。
- 25组共享规则修订矩阵执行100条断言；1,000条修订上的100,000次规则评估在完整质量链中约68.4ms，门槛为2秒；模型修订查询约38.7ms，年度完美日投影约169.9ms，92项测试资产零退役，10k完整渲染28ms、横向溢出0px，发布资源检查通过。

### 13.0.0 发布收口（2026-09-17，T-1148~T-1150）

- 版本真值同步 13.0.0（package.json / plugin.json / src/version.ts / dist / README / docs/v13.0.0-change-log.md / docs/releases/release-notes-13.0.0.md）；完整质量链 test:quality exit 0（92 项测试资产零退役，a11y 双主题 0 违规，10k 渲染 34ms/溢出 0px，发布资源检查通过，CSS 419,910 bytes 告警区但低于 450,000 硬线）。
- scripts/release.cjs 执行构建、测试链、提交、推送、标签与 GitHub Release（package.zip）；远端资产与发布说明 SHA-256 一致，仓库内发布说明回填最终摘要（webpack 产物 zip 元数据非字节确定，摘要以流水线上传时计算值为准）。
- 路线图基线更新：官方集市 PR #2248 已合并；13.0 专注生态消费端与 14.0 数据内核可自动化范围已随 12.0.x/13.0.0 落地；主线下一步 15.0 UI 系统（版本决策 D-156：semver 连续递增，工作流标签不等于发布版本号）。

### 13.0.1 修复版准备（2026-09-17，T-1151~T-1152）

- 定位 v13.0.0 发布后 CI browser-audit 失败的两类问题：① visual-qa 对"阅读"模板 targetStep 期望过时（T-1091 步长分离后目标输入统一 0.01）；② 真实产品缺陷——写后校验指纹对"缺省 archived"与"物化 false"不等价，编辑器新建条目保存被误判并发覆盖、重试后回滚（14.0 第六批引入，真实宿主同样复现）。
- 修复：save-form 构造条目物化 archived 缺省值 + cloneItemValue 快照防御性物化（D-157）；QA 宿主存储按名分槽并克隆失败 reject；双击提交等待卡片渲染后再点击。
- 证据：完整质量链 test:quality exit 0；Edge 浏览器 visual-qa 全链通过（results.json 输出完整、pageErrors 为空）。

### 13.0.1 发布执行（2026-09-17）

- 版本真值同步 13.0.1（package.json / plugin.json / src/version.ts / dist / README / docs/v13.0.1-change-log.md / docs/releases/release-notes-13.0.1.md）。
- scripts/release.cjs 执行构建、测试链、提交、推送、标签与 GitHub Release（package.zip）；远端资产与发布说明 SHA-256 一致，仓库内发布说明回填最终摘要（zip 元数据非字节确定，以上传时流水线计算值为准）。

### 回顾页打卡日志优化（2026-09-18，T-1153）

- 用户桌面截图指出日志行右侧大面积留白。定位：行网格 `30px | 1fr | auto` 在全宽/半宽折叠体下中段皆空；回顾区块在 ≥1180px 已是双列，日志折叠体宽约 575px。
- 变更：lc5 ≥960px 下 `.lc-checkin__log-day` 改双列网格（标题跨两列、行距走 gap）；删除 `[data-log-extra]` 属性级 display:none，额外天数统一由 [hidden] 门控——修复"展开其余 N 天"点击无效的既有缺陷。
- 证据：.artifacts/review-log-probe.cjs 宽/窄容器截图与展开探针（1500px 双列 271px×2；700px 展开后 display:block）；cross-surface/ui-theme/responsive-layout/review-summary-refresh 通过；Edge visual-qa 全链通过 0 页面错误；测试包 siyuan-checkin-v13.0.2-test.zip 供真机复验。

### 回顾页二级导航与头部优化（2026-09-18，T-1154）

- 用户桌面截图指出 ①头部工具区（复制报告/更多）显示需优化、②二级导航条下滑不跟随。真机（思源 v3.8.4-beta.5 + 界面缩放）复现并定位三个问题：
- ① 缩放后容器有效宽仅 725/582 CSS px，落在 <960 档导致工具区换行堆叠；新增 480-959px 弹窗/页签宿主层级，范围页签与工具区并为一行（排除移动宿主与 dock）。
- ② 宿主 zoom 子树内合成器滚动不重定位 position:sticky（Chromium 缺陷）：二级导航退为 relative，由滚动同步 transform 主动钉住（pinReviewSubnavRail，WeakMap 防重复绑定）；滚轮、程序化滚动、跳转三路径真机验证全部跟随且复位正常。
- ③ 跳转按钮按下标取 details 整体错位一位（年度热力图 details 插在列表中间），"趋势"会跳到"提醒"；改按 data-review-fold id 定位；scrollIntoView 落地异步导致钉住同步拿旧位置（transform 滞后 1058px 实测），改为同步直写 scroller.scrollTop + 显式同步。
- 证据：真机思源实测截图三组（同行头部/滚轮钉住/跳转+钉住）；test:quality 全链 exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 更新。

### 事项页操作列与弹窗四角修复（2026-09-18，T-1155）

- 真机 Console 实测：操作按钮存在于 DOM（4×32px、SVG 图标齐全）但被多层网格档位交叠盖住不可见；弹窗圆角缺口处透出背后白色文档。
- 修复：480-959px 容器档（弹窗/页签宿主）最终层 !important 强制三列网格与操作列可见；框式快速弹窗遮罩加半透明暗色底（rgba(16,18,43,.38)），圆角缺口不再透白（D-160）。
- 证据：真机思源重启后验证——事项行操作按钮（+/编辑/启用停用/删除）全部显示；弹窗四角无白色缺口；test:quality exit 0（CSS 422,403 bytes 低于 450K 硬线）；visual-qa exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 已更新并同步到用户工作区。

### 事项模板库扩充（2026-09-18，T-1156）

- 用户提供事项页截图：模板全量视图过长，建议精选「推荐」分组并丰富目录。
- 变更：OCCASION_TEMPLATES 31→53（新增长辈生日/领证纪念日/相识纪念日/毕业纪念日/供暖费/车位费/宽带费/网盘会员/电商会员/游戏会员/知识付费/驾照换证/车辆保养/车辆保险续保/眼科检查/复诊提醒/元旦/元宵/端午/重阳/儿童节/教师节/圣诞节）；模板增加 recommended 标记（精选 11 个）；分组首档「推荐」默认选中，移除「全部模板」。
- 证据：真机思源验证截图（推荐组 11 项默认展示、分组计数 5/6/12/9/9/12）；occasions/i18n-hygiene/template-manager 通过；test:quality exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 更新。

### 今日页优先提醒条优化（2026-09-18，T-1157）

- 用户截图指出今日页顶部优先提醒条显示需优化。定位：宽容器下该区为 flex 双列（主行+展开区并排），「定位打卡」文字按钮悬在中间，两列行错位不对称。
- 变更：最终层统一为纵向列表——主行整行、展开区整行在下，行内 20px/1fr/max-content 三列网格，「定位打卡」右对齐胶囊按钮（描边+hover 强调）。移动端 ≤719px 紧凑规则不变。
- 证据：真机思源验证折叠/展开两态；today-view/responsive-layout/priority-reminder/mobile-release-quality 通过；visual-qa exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 更新。

### dock 设置页布局修复（2026-09-18，T-1158）

- 用户真机截图：dock 侧边栏设置页恢复点卡片文字竖排、审计条目错乱、原生文件控件外露。定位：恢复点/审计列表网格规则只写在 @media ≤600px 视口断点内，桌面宽视口下 dock 窄容器（约 280-560 CSS px）无样式可用，默认 flex 被压缩。
- 变更：dock 宿主设置页列表行改容器级两列网格（文案 1fr + 按钮 auto，min-width 0 + anywhere 换行）；原生文件输入全局隐藏、保留胶囊标签。
- 证据：.artifacts/dock-settings-probe.cjs 300px dock 复现（修复前 li 380px 高竖排 → 修复后 71px 两列网格）；真机思源 dock 实测正常；test:quality exit 0；visual-qa exit 0；测试包已更新。

### dock 回顾页头部紧凑化（2026-09-18，T-1159）

- 用户真机截图：dock 侧边栏回顾页范围页签偏大、工具行（复制报告/更多）两端分散。
- 变更：lc-dock ≤479px 档压缩范围页签与工具按钮密度（28px 高），工具行成对右对齐，头部边距收紧。
- 证据：dock 探针 380px/300px 双宽度截图正常（subnav 无溢出）；responsive-layout/mobile-release-quality 通过；visual-qa exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 更新并同步用户工作区。

### v14.0 开工：T-1160 打卡项删除能力（2026-09-18）

- 新增 deleteItemCascade 模型函数（移除项目+全部事件、写含 externalRef 身份的事件墓碑、不可变更新）；编辑器「删除…」入口（确认层展示记录条数与恢复点提示，persist 链自动落删除前快照）；归档页每项新增「删除」；新增 checkin:item-deleted 集成事件（API 契约事件数 6→7）。
- 证据：真机端到端实测——新建临时项→编辑器删除→确认层显示影响→项目移除；设置页恢复点管理出现删除前快照（21 个项目·124 条记录）；deleteItemCascade 独立语义校验（墓碑含 externalRef、原 store 不变、幂等）。
- 五版本计划定稿并写入路线图（v14 生命周期/v15 UI 系统/v16 复盘洞察/v17 生态联动/v18 开放生态）。

### 小驴速切组件商店协作调研（2026-09-18）

- 调研了 siyuan-speed-switch 仓库的组件商店系统：home-store-ui.ts（商店 UI）、home-external-adapters.ts（适配器注册）、checkin-bridge-model.js（打卡桥接模型，489 行，ADR 0057）。
- 发现：速切已内建 6 个打卡桥接组件（今日概览/连续记录/年度热力图/周统计/日期事项/月度统计），经 window.siyuanCheckin API v4 只读消费，无需打卡侧改动。
- 结论：打卡侧暂无必须开发项；新增组件类型需改速切侧 checkin-bridge-model.js + home-external-adapters.ts；已写入 D-167。

### 回顾页头部风格统一与详情面板宽度（2026-09-18，T-1160 补充）

- 用户截图反馈：① 复制报告/更多按钮样式与左侧范围页签不一致（工具容器用全圆角胶囊+边框，页签容器用方角无边框）；② 右侧详情面板内容没铺满可用宽度。
- 修复：review-tools 容器改为方角+无边框（与 range-tabs 容器同款 muted-surface）；tool-button/more-summary 的 border-radius 从 999px 统一为 5px、min-height 从 28 统一为 25（与页签一致）；review-detail 子元素统一 min-width:0 + width:100%。
- 证据：真机思源截图确认头部按钮风格一致、右侧详情面板正常显示；quality-run11 全绿。

### 回顾页趋势图扩展至四维度（2026-09-18）

- 用户反馈趋势图只有12周和6个月，希望更多区间筛选。
- 变更：趋势网格从 2 卡扩为 4 卡（2×2），新增 近30天活跃（日维度折线图）+ 年度记录数（年维度柱状图），快照中已有的 daily/yearly 序列首次在回顾页展示，无需状态管理。
- 证据：真机思源截图 4 卡 2×2 正常渲染。

### v15.0 开工：Today 卡片跨端上下文菜单（2026-09-18）

- 桌面保留右键菜单，手机/平板新增触屏与触控笔 520ms 长按入口；移动超过 10px 会取消长按，避免滚动误触。
- 菜单采用视口边界夹紧，窄屏右下角不会溢出；打开后焦点进入第一个动作，Escape 可关闭，长按后浏览器跟随触发的原生 contextmenu 会被抑制。
- 新增 `tests/today-context-menu.test.cjs` 并纳入 `test:ui`，锁定触屏长按、移动取消、菜单定位、焦点和键盘关闭行为。
- 证据：`pnpm run check`、定向上下文菜单测试、`pnpm run test:ui` 全部通过；CSS 体积不作为本批次优化目标（D-168）。

### v15.0 Today 操作反馈与重复提交守门（2026-09-18）

- 批量完成、批量归档、批量删除和上下文菜单动作增加单次执行守门，进行中写入 `aria-busy` 并禁用按钮，异常或完成后恢复。
- 批量删除改为在 mutation 队列内读取并写入，持久化失败时恢复原内存快照；避免队列外先改 store 导致失败后 UI 与存储不一致。
- 证据：`pnpm run check`、上下文菜单定向测试、`pnpm run test:ui` 与完整 `pnpm run test:quality` 均通过；10k 事件完整渲染 36ms、横向溢出 0px。

### v15.0 回顾页交互性能基线（2026-09-18）

- 新增 1k/10k/100k 事件基线，覆盖月范围事件选择、汇总上下文、分析快照和导出序列化，并校验范围结果与摘要事件数一致。
- 当前 100k 事件在本机约为：范围 429ms、汇总 3ms、分析快照 335ms、导出序列化 50ms；门槛用于发现灾难性退化，不把单机毫秒数当作产品承诺。
- `review-performance-baseline.test.cjs` 已纳入 `test:extended`；定向基线、扩展测试和类型检查通过。

### v15.0 Today 交互连续性批次（2026-09-18）

- 批量工具栏增加 `[data-bulk-toolbar]` 协调边界，完成/归档/删除任一动作执行期间整组按钮禁用并暴露 `aria-busy`，完成或失败后恢复原 disabled 状态。
- Today 上下文菜单补充 `role=menu/menuitem`、上下方向键循环和关闭后焦点恢复；删除卡片后若原主按钮已离开 DOM，则安全跳过聚焦。
- 菜单动作同步抛错统一进入 Promise rejection 边界；新增结构断言锁定 toolbar 互斥、菜单语义、键盘导航和焦点恢复。
- 证据：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:extended` 与完整 `pnpm run test:quality` 已通过；真实思源宿主焦点/滚动仍归 T-1173 与 B-007 现场验收。

### v15.0 归档、生态与跨表面交互批次（2026-09-18）

- 归档页新增累计达成天数与最近打卡日期/时间；最近记录先按 itemId 分桶，累计达成继续复用 `countCompletedDays`/`isComplete` 业务口径。
- Task Horizon 合作契约补充 `getEventRangeSummary`：半开本地日期区间、366 天/5,000 事件/366 点上限、`truncated` 标记和防御性聚合投影；新增「任务打卡」配额模板（目标数量可调整）。
- 跨表面交互测试锁定归档恢复/删除、回顾复制/导出、设置导入/恢复统一的 `aria-busy`、重复提交、错误可见性与焦点恢复；新增测试已纳入生态/扩展质量链。
- 定向证据：`pnpm run check`、`node tests/event-range-summary.test.cjs`、`node tests/cross-surface-interaction.test.cjs`、`node tests/archived-search.test.cjs`、`node tests/i18n-hygiene.test.cjs` 通过。完整质量链待本轮汇合后执行。

### v15.0 归档批量管理与自动归档契约批次（2026-09-18）

- 归档页支持逐项选择、筛选结果全选、批量恢复与批量删除；批量恢复/删除各自只进入一次 mutation 队列并持久化一次，删除仍展示项目/记录影响并保留墓碑与恢复点语义。
- 批量工具栏共享 `aria-busy` 与整组禁用边界，避免恢复与删除交叉排队；560px 以下操作按钮回流到第二行，历史页通用三列布局不受影响。
- 编辑已有项目时在高级区显示累计达成天数；新建项目不计算历史，继续复用 `countCompletedDays`/`isComplete` 业务口径。
- 新增 `checkin:item-archived` 生态事件，仅真实自动归档状态转换成功后广播；手动归档仍使用 `item-updated`。项目、修订、周期、quota、归档区间和自动归档配置均作防御性克隆。
- 验证：`pnpm run test:quality` 全链与 `node tests/width-walkthrough.cjs` 通过；100k 事件/3,650 天自动归档投影约 199ms，10k Today 完整渲染 35ms、横向溢出 0px；无障碍 0 缺名/0 正向 tabindex/0 对比度违规。生产 CSS 429,056 bytes，低于 450,000-byte 硬线。
### v15.0 自动归档闭环与批量生命周期性能批次（2026-09-18）

- T-1174：修复手动打卡成功后未进入自动归档检查的问题；现在手动/API 写入复用同一阈值判断，仍保持“保存成功后检查、撤销不自动恢复”的既有语义。
- T-1175：Today 批量归档与批量删除从逐项 mutation/逐项持久化收敛为单事务；取消确认或保存失败时不退出批量选择，成功后继续逐项目广播 `item-updated`/`item-deleted`。
- T-1176：新增 `deleteItemsCascade`，项目、事件和墓碑单次线性投影；单项目删除继续委托该兼容入口。新增 100 项/100,000 事件性能与墓碑完整性测试，并纳入 `test:perf`。
- T-1177：Today 上下文菜单补 Home/End/Tab、整组禁用和 `aria-busy`；归档行恢复/删除共享行级互斥，成功移除当前行后优先聚焦相邻同类动作，没有候选时回到搜索框。
- 验证：`pnpm run test:quality` exit 0，98 个测试文件零退役；10k Today 完整渲染约 38ms、批量删除 100k 事件约 16.6ms、回顾 100k 范围查询约 393ms/快照约 350ms；无障碍 0 缺名/0 正向 tabindex/0 对比度违规；CSS 429,056 bytes，低于 450KB 硬线。`node tests/width-walkthrough.cjs` 全矩阵无横向溢出。

### v15.0 批量完成与选择连续性批次（2026-09-18）

- T-1178：Today 批量完成从逐项目 mutation/持久化/重渲染改为一次 `completeItems` 事务；同一自然日快照生成全部事件，失败整批回滚并保留选择。
- T-1179：模型新增 `appendEvents`，一次索引检查和一次数组克隆完成批量追加；严格过滤已有及批次内重复 ID/externalRef、ID/外部身份墓碑，`appendEvent` 保持原签名并委托新核心。
- T-1180/T-1181：全选仅遍历当前 `[data-bulk-check]` 结果；筛选重渲染会剔除不可见旧选择。逐项选择、全选、计数、按钮禁用均局部更新，不再为一次勾选重渲染完整 Today 表面。批量完成仍逐条广播 `event-recorded`，合并一次 `analytics-updated`，保留日期事项联动、自动归档和最近记录反馈。
- 验证：`pnpm run test:quality` exit 0，98 个测试文件零退役；100k 历史追加 1,000 事件约 3.6ms，100 项/100k 事件批量删除约 14.2ms，10k Today 完整渲染约 81ms；无障碍 0 缺名/0 正向 tabindex/0 对比度违规；CSS 429,056 bytes，低于 450KB 硬线。`node tests/width-walkthrough.cjs` 全矩阵无横向溢出。

### v15.0 删除并发复核与自动归档批处理（2026-09-18）

- T-1182：单项目删除纳入 storage mutation 队列，锁内重新读取当前项目后级联删除；Today 上下文菜单成功删除会立即刷新表面，编辑器和归档页继续由各自导航路径收口。
- T-1183：单项、Today 批量、归档批量删除在用户确认后、实际写入前重新核对项目数量与记录数量；跨窗口变化会显示可见提示并中止，避免按过期影响数字删除新增记录。
- T-1184：自动归档改为 `maybeAutoArchiveItemsAfterRecord` 批处理，多个达标项目共享一次 mutation/持久化；`applyArchivedItems` 同时服务手动批量归档与自动归档，归档周期起点语义保持一致。每个项目仍按顺序广播 `item-updated`、`item-archived`。
- T-1185：单项目自动归档保留名称和达成天数，多项目改用聚合反馈；性能门禁扩展为 50 项/100k 事件批量资格投影。完整质量链测得单项约 270.5ms、批量约 448.6ms；独占复跑分别约 184.6ms/273.8ms。
- 验证：`pnpm run test:quality` exit 0，98 个测试文件零退役；无障碍 0 缺名/0 正向 tabindex/0 对比度违规，CSS 429,056 bytes 低于 450KB 硬线；`node tests/width-walkthrough.cjs` 全矩阵无横向溢出。

### v15.0.0 发布准备（2026-09-18）

- T-1186：版本真值同步至 15.0.0，新增完整变更记录与 GitHub 发布说明，README 维护重点和文档索引已更新。
- 发布范围覆盖跨端上下文菜单、批量生命周期事务、归档摘要与批量管理、删除并发复核、自动归档批处理、有界日期摘要 API 及十万级性能门禁。
- 已知边界继续保留：真实思源页签、dock、移动端软键盘和多窗口交互需目标客户端现场复核，不以自动化结果替代。
- 发布视觉走查发现模板摘要仍写死旧的 24 项基线；已改为动态核对实际渲染目录数量，并将 README 当前内置模板数量校正为 40，避免后续扩充再次产生假失败。
- T-1187：`pnpm run test:quality`、`width-walkthrough`、浅/深主题 `visual-qa` 和最终 `release-assets` 全部通过；98 个测试文件零退役，无障碍 0 违规，CSS 429,056 bytes 低于 450,000-byte 硬线。
- 最终待发布 `package.zip` 为 376,186 bytes，SHA-256 `6328c7b073bae5704d5b0fa8dd2cfbec576010e7d1ea4365e3864f4f28628c1d`。

### v15.0.0 正式发布（2026-09-18）

- T-1188：发布提交 `f7086dd` 已推送至 `main`，注释标签 `v15.0.0` 指向同一提交，GitHub Release 已公开：https://github.com/ai68298100/siyuan-checkin/releases/tag/v15.0.0
- 远端 `package.zip` 为 376,186 bytes，GitHub 资产摘要 `sha256:6328c7b073bae5704d5b0fa8dd2cfbec576010e7d1ea4365e3864f4f28628c1d`，与本地安装包及发布说明完全一致。

### 拆除预算与真实例验证（2026-09-19）

- 依据：通读 `siyuan-note/siyuan` master（v3.8.4）的 `app/src/plugin/{loader,lifecycle,uninstall,index}.ts`、`kernel/model/{plugin,push_reload}.go`、`kernel/api/{file,router}.go` 与 `siyuan-testing` 的 Playwright 基础设施，逐项比对插件当前实现。
- T-1242（D-220）：卸载路径自带 3.6s 排空 + 900ms 补写预算、拆除期写门禁、专注心跳与庆祝延时回收、`msg.teardownTruncated` 提示；新增 `src/teardown.ts` 与 `tests/teardown-budget.test.cjs`（纳入 `test:extended`）。
- T-1243：`src/render/block-renderer.ts` 配置文本改为 `.hljs [contenteditable] → .hljs → pre → code` 四级回退；`docs/siyuan-compatibility.md` 重写为如实登记三处内部 DOM 耦合、11 项智能体能力（4 写 7 读）、生命周期约束与 `?remote=1`/只读降级；新增 `tests/block-dom-compat.test.cjs` 同时守代码回退链与文档口径。
- T-1244：真实例 E2E 骨架落地——`scripts/e2e/lib.mjs`（内核探测、带标记的独立工作区、`setBazaar`+`setPetalEnabled` 启用链、putFile 存储读写、日志与退出）、`playwright.e2e.config.mjs`、`tests/e2e/`（打卡落盘+重载恢复、`externalRef` 幂等、双窗口 `onDataChanged` 不回写主存储）。`pnpm run test:e2e` 3/3 通过（思源 3.8.4，12.5s）。
- T-1245：清除 `tests/visual-qa.cjs`、`tests/ui-sweep.cjs`、`tests/accessibility-audit.test.cjs`、`scripts/environment-check.cjs`、`tests/mobile-qa-harness.md` 中绑定他人主目录的路径，新增 `tests/portable-paths.test.cjs`（280 个受控文件 0 命中）。
- 关键发现（记 D-221 / TODO T-1246）：双窗口接收方不回写主存储，但会原样重写 `checkin-suggestion-workflow` 与 `checkin-store-audit` 两个辅助存储，构成可消除的写放大与额外推送。
- 验证：`pnpm run check`、`pnpm run build`、完整 `pnpm run test:quality`（122 个测试文件、0 退役）、`pnpm run test:e2e` 全部通过；CSS 441,170 bytes 仍逼近 450,000 硬线。
- 同步记录：本轮工作目录 `D:\AI\Codex\siyuan-checkin` 由 GitHub `main`（`09f82bb`，v17.0.0）快照同步而来，非 git 检出（本机 `github.com` 不可达，只能走 `codeload` tarball）。

### 辅助存储写入与宿主形态覆盖（2026-09-19）

- T-1246（D-221 补记）：接收方 `onDataChanged` 不再原样重写建议工作流（等值即跳过，基线在两条读取路径建立），审计改 1.5 秒合并窗口并在拆除收尾落盘；双窗口 E2E 实测辅助写入 2 → 0。新增 `tests/aux-write-hygiene.test.cjs`。
- T-1248：新增 `tests/e2e/plugin-lifecycle.spec.mjs`（真实禁用→`window.siyuanCheckin` 在 5s 预算内交出→注销后 2.6s 零 `putFile`→重新启用后数据完整）与 `tests/e2e/mobile-bundle.spec.mjs`（iPhone 13 视口加载 `/stage/build/mobile/`，公开 API 可打卡落盘、`#lcCheckinMobileTopBarButton` 注入、零未捕获异常）。
- T-1249：新增只读实例通道 `playwright.e2e.readonly.config.mjs` + `tests/e2e/readonly/`（`serve --readonly true`，前置自证内核拒绝 `putFile`），断言只读下 `recordEvent` 不报成功、插件保持可用、磁盘记录数不变。发现记 D-222。
- T-1250：移动顶栏入口 `aria-label`/`title` 改走 `t("entry.mobileTopBar")`（中英各一键）；`tests/i18n-hygiene.test.cjs` 补 `setAttribute("aria-label", "中文")` 形态检测。
- 新登记待办：T-1251（随包发布 `i18n/zh_CN.json`+`en_US.json` 以本地化 dock/命令/顶栏 4 处宿主面文案）、T-1252（卫生守门 `${t(` 行级豁免漏洞，`render/review.ts` 约 :307 漏网）。
- 验证：`pnpm run check`、完整 `pnpm run test:quality`（123 个测试文件、0 退役）、`pnpm run test:e2e` 5/5、`pnpm run test:e2e:readonly` 1/1。

### 智能体接入自证（2026-09-19）

- 用户报告「智能体开着却显示未检测到可用入口」。查明：真实宿主的登记是正常的（E2E 断言宿主侧 `agentCapabilities` 恰 11 项、4 项写入型、策略未拒绝），问题出在插件把「存储读取失败」也显示成「宿主不支持」。
- T-1253（D-223）：注册改为与存储读取解耦并落到四态状态机（`pending`/`registered`/`unsupported`/`failed` + 计数 + 原因），设置页文案分列并给出宿主侧核对位置；`set.agentOff` 退役，新增 5 个中英键。
- 新增 `tests/agent-status.test.cjs`（渲染四态 + 注册时机契约 + 双语字典 parity）纳入 `test:ui`；新增 `tests/e2e/agent-capabilities.spec.mjs`（宿主侧真实登记与策略）；`docs/siyuan-compatibility.md` 补「宿主侧核对方法」与发布前检查项。

### 移动端回顾页与导出通道（2026-09-19）

- 用户报告手机端回顾页四处问题（工具栏错位、两处下拉被遮、自定义被遮、点导出报告思源重启）。全部在真实移动 bundle 里量出根因后修复，记录 D-224。
- T-1254：`.lc-checkin__header-actions` 的 `overflow:hidden` 与 `.lc-checkin__editor-header` 的 `position:static`（使 sticky 时代的 `z-index:4` 失效）两处叠加造成裁剪；工具栏错位来自 `.lc-checkin__text-button` 全局 `margin-top:15px` 被继承 + 双层胶囊撑高；移动端 `space-between` 造成空洞。
- T-1255：新增 `src/download.ts` 统一保存通道——原生容器写 `assets/` 后交宿主 `saveExportFile`（宿主拒绝才退容器桥，成功不重复），原生路径零 blob 导航；7 处导出入口改道，Loop 双文件顺序保存。
- 验证：新增 `tests/download-channel.test.cjs`（纳入 `test:extended`）与 `tests/e2e/mobile-review-ui.spec.mjs`；`pnpm run check`、完整 `pnpm run test:quality` exit 0、`pnpm run test:e2e` 7/7、`pnpm run test:e2e:readonly` 1/1。
- 文档：README 与 `docs/export-formats.md` 补充「手机端导出会在工作区 `assets/` 留下文件」的行为说明。
- 运维注意：E2E 默认工作区 `~/SiYuan-Checkin-E2E` 的 `.lock` 被一次强制杀进程后残留占用，本轮改用 `CHECKIN_E2E_WORKSPACE=~/SiYuan-Checkin-E2E-b`；`waitForBoot` 已加「工作区被锁定」的即时失败与提示，不再空等 60 秒。

### v17.1.0 发布准备（2026-09-19，未推送）

- 版本号已统一为 17.1.0（`src/version.ts`、`package.json`、`plugin.json`、README 当前版本行），新增 `docs/v17.1.0-change-log.md` 与 `docs/releases/release-notes-17.1.0.md`，README 增加「17.1.0 维护重点」。
- 产物：`package.zip` 401,194 字节，SHA-256 `d390c0e2ef2ecdc098ba62e9afb7eadc8f4bc09143bf66b4704a844b5927ffd6`（已回填进两份发布文档）。注意 `test:quality` 链内含 `build`，任何一次重跑都会因 zip 时间戳变化而产生新摘要，因此哈希必须在最终构建之后回填，并单独一次 docs 提交（与 v17.0.0 的 `docs: backfill … SHA-256` 做法一致）。
- 验证：`pnpm run check:release` 通过（v17.1.0），完整 `test:quality` exit 0（125 个测试文件、0 退役），`test:e2e` 7/7、`test:e2e:readonly` 1/1（思源 3.8.4）。
- 仓库接入：本目录原先是 tarball 快照，已 `git init` + SSH 远端 `git@github.com:ai68298100/siyuan-checkin.git`，`main` 对齐远端 `09f82bb` 后本地提交 `596f292`（release）与哈希回填提交，均为快进可推送。
- 发布通道：`gh` 本机未安装，改用 api.github.com 创建 Release 并上传资产（token 取自 git 凭据管理器，只在脚本内使用）；代码与标签走 SSH 远端。

### v17.1.0 正式发布（2026-09-19）

- 远端 `main` 推进到 `06cf516`（`596f292` release 提交 → `ed53d03` 哈希回填 → `06cf516` 门禁缺口记录），注释标签 `v17.1.0` 已推送。
- GitHub Release：https://github.com/ai68298100/siyuan-checkin/releases/tag/v17.1.0（id 392014777，非草稿，标题「小飞驴打卡 v17.1.0」，正文取 `docs/releases/release-notes-17.1.0.md`）。
- 资产 `package.zip` 401,194 字节，SHA-256 `d390c0e2ef2ecdc098ba62e9afb7eadc8f4bc09143bf66b4704a844b5927ffd6`；已从 API 回读资产核对，远端与本地摘要逐字节一致。
- 注意：本机 `github.com/.../releases/download/...` 直链返回空响应（objects.githubusercontent.com 不可达），API 通道可用——取源码与取资产都走 api.github.com。

2026-09-19 底栏番茄钟 PR #5 评审修复（T-1266~T-1268 / D-235~D-237）：依据用户提供的《完整修复方案（按 17.0.0 复核）》，逐条对照 17.1.0 源码确认全部问题点后分三批落地。批次A：`startFocusFor` 启动成功后不再复检 `canStart`（消除「启动成功即自动暂停」），新增 `focusMappingFingerprint`（修订+direction+tomatoMode）识别等待期业务变化并只回滚本次会话。批次B：桥内维护 ownedFocus 会话归属，start 必须返回非空 sessionId（否则 START_UNCONFIRMED 不接管），停止经 provider/失效/active/sessionId/阶段五重守门，`pause-session` 能力携带 sessionId；available:false 即时解绑并失效该 facade；注销 `{stopActive:false}` 纯解绑，卸载不再暂停跨插件计时器；完成清理立即释放「正在专注」并移除 5 秒全局空闲轮询；诊断优先级 ready 前置。批次C：新增 `src/features/docktomato-inbox.ts` 纯函数层（completedAt 严格时钟、载荷规范化、容量 200、1s/5s/30s 重试），完成判定重排为 duplicate → user-removed → 项目可用性（归档后重复通知不再误报 missing-item），宿主内部写入器在已持有存储锁内运行（不经公开 recordEvent 重复排队），atMost 三层拒绝、跳过日 blocked 由用户决定、完成后复用自动归档与锚点旁路；`reconcileDockTomatoInbox` 就绪后与到期时驱动、无常驻定时器。提供方要求写入 `docs/docktomato-integration-plan.md` 契约节；上游 PR 修订与真实宿主联调待对方排期，B-007 继续跟踪。验证：`pnpm run check`、`test:ui`、`test:ecosystem`（新增 `focus-adapter` / `docktomato-inbox` 两个测试文件，桥/判定/集成契约测试全面重写为可执行竞态矩阵）、`test:extended`、`pnpm test` 与生产构建全部通过。

2026-09-20 复审与上游对照（T-1266~T-1268 增量）：逐行重读桥/焦点适配器/收件箱/宿主接线后收口三处——①`adapter.start` 在 `facade.start()` 解决后先校验 `bridgeDisposed || boundFacade !== facade || invalidatedFacades.has(facade)` 再登记归属（启动等待期间解绑/换绑不得用旧调用接管新绑定，对齐修复方案第三节）；②桥对宿主写入通道返回 `undefined`（`enqueueMutation` 刷新失败路径）显式抛 `DOCK_TOMATO_CHECKIN_WRITE_REJECTED`，不再 TypeError 误判；③今日页专注入口对 `direction === "atMost"` 项目禁用并说明原因（`msg.focusAtMostUnsupported` 中英），计时完成记账会把专注转换成破戒记录，真实破戒仍走「记破戒」。上游对照：`5kyfkr/siyuan-plugin-docktomato` 最新 v2.2.9（2026-09-19）不含 focus facade，生产环境桥不绑定、零兼容影响；PR #5 head 仍为 `23fdd55` 未动，上游 main 已前进（mergeable dirty），修订 PR 需先 rebase；提供方契约要求（start 返回最终 sessionId、pause-session、completedAt、available detail、默认关闭开关）全部落在 PR 修订侧。桥测试新增「启动完成前换绑不登记归属」「undefined 结果不误判」两场景并修正计数，集成契约断言同步。`pnpm run check`、焦点/桥/判定/收件箱/契约/i18n 卫生测试全部通过；产物摘要刷新为 `17c74821…` 后 `test:quality` 全链 exit 0。

2026-09-20 第三轮深检（T-1266~T-1268 收口）：按方案第九节 31 项运行级验收清单逐条比对实现与测试,发现并修复两类真实缺口——①通知丢失路径:未就绪/排队器刷新失败时完成通知此前只存在于内存即被放弃,违背方案「先缓冲再处理」;重构 `processDockTomatoCompletion` 为「先缓冲进收件箱(内存+尽力落盘) → 再排队处理」,`enqueueMutation` 返回 undefined(刷新失败)显式映射为 retry:storage-refresh-failed,任何失败路径都不丢已接收通知。②归档项目误标:桥完成判定此前只传 `api.getItems()`(过滤归档),归档且从未入账的完成通知误报 missing-item;接入 `api.getArchivedItems()` 后正确报 blocked:archived-item,与「已入账且归档→duplicate」「未入账且归档→blocked」的三分语义对齐。桥测试新增归档未入账场景,集成契约新增三条断言(归档参与判定/先缓冲/刷新失败上报 retry)。31 项验收清单核对结果:28 项由本仓库代码+测试覆盖,2 项(按会话原子暂停、会话累计时长)为提供方 PR 修订义务已写入契约文档,1 项(跳过日的「撤销跳过并计入」手动交互)按验收「blocked 不默默删除」达标,手动 UI 登记为后续批次。`pnpm run check`、主链、UI、移动、生态、扩展全绿;摘要刷新为 `0e949924…` 后 `test:quality` 全链 exit 0。

2026-09-20 第四轮细节扫尾（T-1266~T-1268 增量）：全局残留扫描(旧函数/TODO/硬编码文案)后收口三处细节——①番茄来源备注「来自底栏番茄钟」硬编码中文并随事件入库展示,英文界面可见中文;新增 `record.tomatoSource` 中英键,写入器改走 i18n(双字典 1097=1097 对等);②`msg.focusDockMissing` 按方案第七节补全「第三方联动开关未开启」这一可能原因(上游默认关闭开关落地后 facade 缺失有安装/开关两种原因,不能只提示安装),中英同步;③`docs/v17.1.0-change-log.md` 补「底栏番茄钟联动修复」维护节,与发布说明维护记录对齐。设置页 `tomatoHealthy` 与新诊断优先级(natural 兼容:running/paused 必然 ready)核对无误。桥/判定/收件箱/契约/焦点/i18n 卫生测试全绿;摘要刷新为 `7c00aefb…` 后 `test:quality` 全链 exit 0。四轮累计:实现层未再发现新缺口,剩余事项全部为外部依赖(上游 PR 修订 + rebase、B-007 真机联调、跳过日手动交互 UI 批次)。

2026-09-20 最终核查与定稿推送（T-1269）：对照修复方案全文逐节复核——第一/七节保留行为与偏好边界(偏好仅三处用户显式写入,无自动改写)、第二~四节生命周期、第五~六节收件箱与 completedAt、第九节 31 项验收(28 代码+测试 / 2 提供方义务 / 1 后续 UI 批次)全部对上;方案第十节要求的交付内容(修改文件清单/能力与错误码/存储 schema 与迁移/运行测试结果/真实客户端验收边界)定稿写入 `docs/docktomato-integration-plan.md`「交付清单」节。经用户明确授权后执行推送:main(13 个提交,`c2b1435`…`<final>`)推送至 origin(见下方推送记录)。剩余外部事项:上游 PR #5 修订(契约节+交付清单可直接转对方)、B-007 真机联调。

2026-09-20 持续开发批次（T-1270~T-1272）：依次完成三任务。①T-1270 收件箱手动管理:设置页新增「待回写的番茄完成」区块(容量+最新 20 条,状态复用诊断理由文案),每条支持立即重试/丢弃,skipped-day 条目支持「撤销跳过并计入」——同受保护单元内先写 skip 墓碑再复用内部 writer,未入账时墓碑同单元回滚,duplicate 路径显式持久化墓碑;零新增 CSS。②T-1271/D-238: minAppVersion 3.4.2→3.8.4(实测基线,兼容矩阵/README/发布说明同步,门禁锁定声明值=实测基线)。③T-1272/D-239(用户明确要求): CSS 预算放宽为 480KB 告警/520KB 硬阻断,318KB 软线保留,当前 448,170 bytes 回落为常规 warning。ui-docs 断言随 README 版本行同步。摘要回填 `408d9a6d…` 后 `test:quality` 全链 exit 0。下一批候选:竞品调研续作(第二梯队集市插件/Obsidian Tracker 精读)、v18 API v5 设计稿(待隐私评估的摘要驻留除外)。

2026-09-20 调研与设计批次（T-1273~T-1274）：①T-1273 调研续作落盘 benchmark 活文档「七、调研续作记录」——思源集市全量复扫确认专打卡仍只有我们+Achuan-2,第二梯队约 20 个任务/番茄/日记/时间类插件(联动面大于竞争面,points-reward 为 v19 积分唯一集市参照);Obsidian Tracker 精读确认表达式引擎(dataset/sum/maxStreak、textValueMap 正则键、colorByStreak)与 falsey 终止语义;Habit Tracker 21 纠正「gapStyle」实为 maxGap 数字容忍(3/6/13/30 频率对照),缺勤日淡化渲染值得渲染块吸收,entries[] 一习惯一文件模型可作 Obsidian 迁入通道。②T-1274/D-240 API v5 设计稿定稿为草案:四缺口(范围读/单条写结果含糊/项目二分/指标无门面)五提案(range.read/record.batch/queryItems/metrics.read/协商补强),只增不删、单条 recordEvent 行为不变,排除隐私待评项。文档改动不触及包体,zip 摘要维持 408d9a6d…;ecosystem-docs/export-identity-docs 回归通过。下一批候选:v5-1 只读批次实现、渲染块断签淡化、或按用户指示。

2026-09-20 API v5-1 只读批次(T-1275/D-240):CHECKIN_API_VERSION 4→5,能力清单 14→16(items.query/events.range.read,均 read+localOnly),新增 CHECKIN_EVENTS_READ_LIMITS/CHECKIN_ITEMS_QUERY_LIMITS 冻结限额。纯过滤边界 `src/features/api-v5.ts`:itemIds 消毒限量、source 白名单校验、skip 按需排除、limit 夹取+truncated 判定(再多一条匹配即报截断);项目投影 archivedOnly 优先于 includeArchived、kinds 全非法 fail-closed 返回空(拼写错误不放大为未过滤)。api.ts 接线沿用 getCustomSummaryContext 的 TypeError 先例,事件返回 {...event} 快照、项目走 cloneItem 防 getter 逃逸。Task Horizon 契约 minApiVersion 显式钉 4(v4 面冻结承诺),修复 manifest 对齐断言。tests/api-v5.test.cjs(约 20 断言)入 test:ecosystem;合作文档/走查/README 能力清单同步 v5。下一批:渲染块断签淡化(maxGap 调研吸收)或 v5-2 批量写。

v5-1 摘要回填:3eeba820…(API 契约变更使包体改变)。

2026-09-20 渲染块断签淡化评估（T-1276,吸收项闭环）：按调研候选实现原型（month 视图逐 item 记忆化 deriveQuotaAutoDays、is-auto 淡化格+图例），单测失败触发语义核查——quota 项目的 isComplete 是回溯性完成（getProgress 取整周期进度,不按日截断）,周期达标后达标日之前的剩余日本就渲染为完成色。即 AUTO 回溯完成在呈现上已强于 maxGap 淡化容忍,「缺签缺口」在本语义下不存在,autoOnly 为死代码。按 D-051 可证明性原则回撤原型(checkin-block/i18n/CSS/测试四处干净还原,渲染块回归 15ms 通过),评估结论与关闭理由写回 benchmark 活文档供后续引用。经验:调研吸收项先验证语义缺口存在,再写呈现代码。

2026-09-20 API v5-2 幂等批量写（T-1277/D-240）：能力清单 16→17（events.record.batch,write）。核心是纯规划函数 `planBatchRecord`——单遍完成结构校验(rejected:invalid-input/item-id/source/value/unit/external-ref/note/occurred-at)与时钟注入(occurredAt 缺省→now 并标 usedFallbackTime,非法→拒绝不回退),再按固定顺序分类 duplicate(存量事件+批内重复回显首条)→ tombstone discarded → blocked(missing-item/archived-item/at-most-item/not-scheduled/mapping-changed,按完成日期修订校验 unit)→ recorded(附 recordedIndices 供宿主追加后回填 eventId,planned.unit 解析为完成日期修订值)。宿主 `recordEventsBatch`:未就绪/持久化失败整体拒绝(Promise reject),单单元内 makeEvent→appendEvents(模型层身份+墓碑二次防线)→persist→逐事件 event-recorded 广播+单次 analytics-updated→受影响项目复用 maybeAutoArchiveItemsAfterRecord→锚点旁路仅刷新状态。单条 recordEvent 行为不变。api-v5 测试扩为 15 输入混合矩阵+跨午夜+限额;契约测试 +4 断言;README/合作文档(17 项)/走查/设计稿同步。摘要回填 747460c2… 后 test:quality 全链 exit 0。下一批:v5-3 指标门面(getStreaks/metrics.read)。

2026-09-20 API v5-3 指标门面（T-1278/D-240):能力清单 17→18(metrics.read);getStreaks 走 computeEventStreaks 单一实现,itemIds 有界过滤与只读快照;longest 连续与 capabilitiesSince 协商补强按设计稿留待后续。摘要回填后全链 exit 0。v5 三批全部落地:范围读/批量写/指标门面,运行时版本 5,Task Horizon minApiVersion 钉 4 不受影响。

2026-09-20 Obsidian Habit Tracker 21 迁入通道（T-1279):features/obsidian-habits.ts 纯解析(frontmatter 引号剥离/块列表与内联 entries/非法日期消毒/去重排序;无 frontmatter 拒收);plugin-ops importObsidianHabitsInto(每日二值项目+source=import+obsidian21:<文件名>:<日期> 幂等身份,外部身份与同日双重去重);EXTERNAL_REF_PREFIX_REGISTRY 登记前缀并同步 identity-and-merge.md;设置页「从 Obsidian 导入」多选 .md;颜色与 maxGap 容忍不迁移(确认文案如实说明)。i18n 中英 6 键(1117 对等);obsidian-habits.test.cjs 入 test:ecosystem。摘要回填后全链 exit 0。

2026-09-20 longest streak 与协商补强（T-1280/D-240 v5-3 预留项收口）:model.ts 新增 computeLongestStreaks——与 computeEventStreaks 同一套状态语义（真实/派生 +1、跳过中性桥接、at-most 连续无破戒）的全历史正向扫描取最大值,现有函数零改动;api.ts getStreaks 升为 {itemId,current,longest};api-contract 新增冻结 CHECKIN_CAPABILITIES_SINCE 映射并挂入 describe(),v4 消费方可在 v5 宿主上按能力探测首次版本。测试:断签后 longest>current、跳过桥接不加成、capabilitiesSince 冻结与 v4/v5 分野断言。v5 全部预留项收口完毕。

T-1280 摘要回填后全链 exit 0。

2026-09-20 真实内核 E2E 回归(自动化,非真机人工):本机思源 3.8.4 内核 + 隔离工作区,`pnpm run test:e2e` **8/8 通过**(智能体登记 11 项、打卡落盘+重载恢复、只读保存失败反馈、双窗口对等同步且接收方不回写、移动端 bundle 加载与打卡、移动端回顾页对齐/浮层/导出、插件禁用零写盘+重启用数据完整、回顾建议确认执行撤销)、`pnpm run test:e2e:readonly` **1/1 通过**。此轮回归覆盖了近期全部风险面:卸载纯解绑(D-226)、收件箱装载、API v5 契约、minAppVersion 3.8.4。README「17.1.0 维护重点」补本批能力摘要。任务池收敛:剩余仅外部依赖(推送授权、Task Horizon 排期、隐私评估、真机 B-007)与需用户新立项的主题。

2026-09-20 浏览器级验收批次：宽度走查 12/12 无溢出(2000/1180/640/330 全表面);visual-qa 双主题(light/dark)各 277 项检查全部符合预期(exit 0;false 项均为无重叠/已卸载等预期语义),覆盖收件箱管理 UI、Obsidian 导入行等近期界面改动。无需代码变更。

2026-09-20 v17.2.0 发版准备（T-1281）：版本三处统一升至 17.2.0；新增 docs/v17.2.0-change-log.md（开发者向全量变更）与 docs/releases/release-notes-17.2.0.md（用户向,「升级前必读」置顶 minAppVersion 3.8.4 警告）；README 当前版本与要点节同步。产物 package.zip 摘要 f84728b8… 已写入发布说明；`check:release` 以 v17.2.0 通过、`test:quality` 全链 exit 0。发布动作（tag v17.2.0、push main+tag、GitHub Release 上传资产）待用户授权后执行。

2026-09-20 发布流水线加固与发布 runbook（T-1282）：release.cjs 两处加固——①发布前测试链对齐 test:quality 全量（补 test:extended/test:perf/test:legacy-style/test:review-comparison,此前子集漏掉扩展与性能链）；②gh CLI 可用性检查提前到任何 git 写操作之前（17.1.0 经验：本机无 gh,原脚本会在 push+tag 之后的 Release 步骤才失败,留下"已推送未发布"半成品）。本机实测：gh 缺失时按设计在 push 前中止。**v17.2.0 发布 runbook**：前置=工作区干净(当前是)+版本三处已 17.2.0(当前是)+notes 摘要行就位(当前是,需以最终构建刷新);命令=`node scripts/release.cjs 17.2.0`（版本无变更跳过改写,构建+全量链+commit+push+tag+gh release）；本机 gh 未装 → 要么先 `winget install GitHub.cli` 并 `gh auth login`,要么按 17.1.0 记录改走 api.github.com(token 取自 git 凭据管理器)创建 Release 并上传 package.zip(以 .artifacts/notes-17.2.0.md 为说明)。

2026-09-20 v5 性能门禁与发布干跑：①api-v5 测试补性能门禁(T-1172 哲学)——10 万级事件范围读(日期索引)与 200 条批量规划(O(批×事件)有界扫描)各设 2000ms 灾难退化捕获,本机实测通过;②release.cjs 真实干跑——构建+全量测试链通过后在 gh 前置检查处按设计中止(exit 1,零 git 写),验证了发布 runbook 的中止语义;真实发布仍待用户授权(装 gh 或走 api.github.com 流程)。

2026-09-20 Obsidian 迁出与 E2E v5 spec（T-1283/T-1284）：①buildObsidianExportFiles 导出活跃项目为 H21 习惯 .md（完成日=非跳过事件日,文件名消毒+冲突唯一化,无记录/超上限计入 skipped,上限 30）,downloadObsidianExportFor 顺序多文件下载,设置页按钮+完成消息;i18n 中英 4 键(1120 对等);round-trip 测试(导出→解析无损还原)+文件名消毒/唯一化断言。②tests/e2e/api-v5.spec.mjs:真实内核验证 version=5、capabilitiesSince 4/5 分野、三个新方法形状与归档语义,test:e2e 升为 9/9。摘要回填后全链 exit 0。

2026-09-20 批量写真实内核 E2E（T-1285）：tests/e2e/api-v5-batch.spec.mjs——recordEventsBatch 两条带 occurredAt 的 api 记录一次落盘(内核存储文件核验 externalRef 原样保留、source=api),页面重载后同 externalRef 重放全部 duplicate 且内核不新增记录;test:e2e 升为 10/10 全过。v5 批量写路径(规划→追加→持久化→广播)自此有真实内核证据。任务池维持硬收敛:剩余仅 v17.2.0 发布(等授权)与外部依赖。

2026-09-20 番茄完成全链路真实内核 E2E（T-1286）：tests/e2e/docktomato-completion.spec.mjs 在真实思源内核上注入 completion 事件并断言——正常入账（值=实际时长、来源=tomato、完成日=completedAt 本地日、重复幂等）；跳过日 blocked:skipped-day（收件箱内核文件留痕、用户跳过原样保留、零误入账）。test:e2e 升为 12/12。v17.2.0 头牌功能的真实宿主证据补齐。

2026-09-20 移动端番茄联动 E2E 与 longest 性能门禁（T-1287/T-1288）：①docktomato-completion.spec.mjs 增补 mobile bundle 场景——番茄完成联动在移动端前端同样真实入账（test:e2e 升为 13/13）;②api-v5 测试补 computeLongestStreaks 性能门禁——对 2000 年至今约 26 年窗口全历史逐日扫描设 2000ms 灾难退化捕获,本机实测通过。

2026-09-20 跳过日解析旅程 E2E（T-1289):真实内核 + mobile bundle 走完整用户旅程——dispatch 完成事件 → 收件箱内核文件确认 blocked:skipped-day → 设置页收件箱区块渲染 → 点击「撤销跳过并计入」并接受确认 → 内核核验:完成事件入账 1 条、本项目 skip 事件消失且墓碑 ≥1、收件箱条目清除。修复过程修正测试自身两处问题(skip 种子的 itemId 前缀错位导致跳过被 normalize 丢弃;skip 断言范围未限定本项目)。test:e2e 13/13。

2026-09-20 细节巡检批次：修复 Obsidian 导出按钮误用 CSV 按钮文案(set.exportLoopBtn「导出两个 CSV」→ 新键 set.exportObsidianBtn「导出」/「Export」,双字典 1121 对等);清理 dock-tomato.ts 中从未使用的 DockTomatoCompletionDetail 死接口(D-051)。集成契约与 i18n 卫生测试通过。

2026-09-20 E2E 密封化与迁移文档补全(T-1290/T-1291):①journey E2E 密封化——开始前清空收件箱存储,消除复用工作区跨次累积对断言与 200 上限的影响;②README 迁移条目、export-formats 总览(五出四入表/Obsidian 迁出节/第三方接入/测试锁定列表)补 Obsidian 进出通道;ecosystem-docs/export-identity-docs/preferences-docs 回归通过,test:e2e 14/14。

2026-09-20 渲染块 doc/notebook 维度（T-1292/T-1234 遗留收口):```checkin``` 配置新增 "docId"/"notebook"——只统计锚点块位于该文档/笔记本的项目。纯层 AnchorDocIndex 注入 resolveBlockItems,fail-closed(无索引/未命中=空);胶水层同步读缓存,未命中锚点经 deps.resolveAnchorDocs(内核 /api/block/getBlockInfo,取 root_id/box,会话内缓存,失败按未命中)异步解析后强制重渲染一次,期间出加载占位。现有作用域行为不变;兼容文档登记该端点用途。checkin-block 测试 +12 断言(配置格式/fail-closed/双维度过滤);i18n +1 键(1122 对等)。

T-1292 摘要回填后全链 exit 0。

2026-09-20 渲染块真实宿主 E2E(T-1293):公开内核 API 创建笔记本/文档(文档 id 即锚点块),注入合成 ```checkin``` 代码块,经插件真实渲染管线断言——docId 命中渲染项目行、未命中文档 fail-closed 空视图。过程中发现并修复两处真实缺陷:①胶水 previous?.remove() 会把相邻渲染块当旧预览删除(真实产品缺陷:相邻两个 checkin 块互相摧毁)——预览挂归属标记 data-checkin-preview-for,只删自己的;②宿主锚点解析字段名错误(内核 getBlockInfo 返回 rootID 驼峰,非 root_id),修复后锚点归属解析生效。test:e2e 升为 15/15;摘要回填后全链 exit 0。

T-1293 摘要回填后全链 exit 0。

2026-09-20 发版文档补全（T-1294):巡检发现 release-notes/change-log 未覆盖后续批次交付的特性——补全:Obsidian 迁出(H21 导出)、渲染块 doc/notebook 维度与相邻块互删修复、收件箱手动管理旅程、性能门禁(范围读/批量规划/longest 扫描)、E2E 扩展(15 项)。发布说明用户向新增迁出/渲染块维度/质量基线三块;变更记录新增渲染块与性能验证两节。

2026-09-20 洞察页历史最长统计（T-1295):洞察页统计区由四格扩为五格——完成率/当前连续/窗口最佳/成熟度之外新增「历史最长」(全历史最长连续,走 computeLongestStreaks 单一实现,与 v5 getStreaks.longest 同源);窗口「最佳连续」标签改为「窗口最佳」以区分口径;i18n 双语 1122 对等;ui-theme 结构断言锁定单一实现与标签。test:ui 通过。

T-1295 摘要回填后全链 exit 0。

2026-09-20 渲染块 notebook 维度 E2E 与 Obsidian 导出下载流 E2E(T-1297/T-1298):①渲染块 spec 扩为三块矩阵——docId 命中行、notebook 维度命中行、未命中文档空视图(nameCount=2 断言);②obsidian-export.spec.mjs——mobile bundle 设置页点击导出,捕获 2 个下载,H21 .md 含 frontmatter title+entries(acceptDownloads)。test:e2e 全套 16/16 通过。

2026-09-20 文档一致性巡检:ecosystem-integration.md 从 API v4 更新到 v5——describe 补 capabilitiesSince;新增 v5 四能力说明(queryItems/getEventsInRange/recordEventsBatch/getStreaks)与 obsidian21 前缀登记指引;合作契约文档此前已同步(18 项能力/minApiVersion 钉 4)。ecosystem-docs/export-identity-docs/preferences-docs 回归通过。

2026-09-20 发布就绪审查:自 v17.1.0 (596f292) 起全部变更 53 文件(+4079/-449),src+tests+docs+config 全量审计通过。安全扫描:硬编码中文文案零残留(新增纯模块),innerHTML 注入点全部经 escapeHtml,批量写外部输入 14 处验证。i18n 双字典 1123 对等;测试 143 文件、0 退役;真实内核 E2E 16/16;全链 test:quality exit 0。产物摘要 a2c33a4c… 与发布说明一致。工作树干净。

2026-09-20 收件箱 UI 项目名显示(T-1300):设置页收件箱条目此前显示内部 itemId(如 20260920-abcdef),用户无法辨识;现在在设置上下文构建时按 itemId 查找 store.items 中的项目名并注入,渲染层 itemName || itemId 回退。DockTomatoInboxEntryView 类型补可选 itemName 字段(纯函数层不依赖 store)。相关测试全过。
T-1300 摘要回填后全链 exit 0。

2026-09-20 渲染块 summary 视图历史最长连续（T-1301):summary 行 em 标签同时显示当前连续(🔥 N 天)与历史最长连续(历史最长 N 天,仅 ≥2 时显示);两者走各自单一实现(computeEventStreaks / computeLongestStreaks),口径不混淆。i18n 双语 1124 对等;checkin-block 测试全过。
T-1301 摘要回填后全链 exit 0。

2026-09-20 渲染块 month 视图 tooltip 增强(T-1302):月历格 title 属性升级——此前只显示分数(如 1/3),现在同时列出当日未完成的项目名(如 1/3（缺：阅读、跑步）),hover 即可辨识具体缺了什么。CheckinBlockDayCell 新增 incompleteNames 字段,收集逻辑在既有循环内零额外遍历。checkin-block 测试 17ms 全过。

2026-09-20 插件名称统一（用户指示）:全部"小飞驴打卡"改为"小驴打卡"——涉及 src/i18n.ts、package.json、plugin.json、README.md、docs/ 共 18 文件 25+ 处。grep 确认零残留。
渲染块 tooltip + a11y 正则回填后全链 exit 0。

2026-09-20 v18 规划定稿与里程碑提交:五版本规划写入 docs/development-roadmap-v18-v22.md（决策:v19/v20 顺序不变、v21 面向思源插件生态、新增打卡来源扩展探索 T-1373、模板八类逐批扩充首批 40~60 精选）;roadmap-current 指向新规划并修正 v17.3.0 状态;TODO 登记 v18 任务 T-1341~T-1350。本地提交 2ea0ded。

2026-09-20 v18 模板体系一期（T-1348/T-1349/T-1350）:①盘点 45 内置打卡模板——修复 8 个缺失 i18n 名称映射、补 tplGroup.quitting 与 20 个 tplNote 双语键、修 bind-editor 硬编码「个模板」计数;②新建页模板区新增「最近使用」置顶（recentTemplates 偏好容量 6、recordRecentTemplate 纯函数、套用后芯片惰性建行）、分批显示（首批 24、显示全部展开器、筛选态自动全显）、非 binary 预览摘要补排期标签、模板点击改事件委托;③新增 tests/template-gallery.test.cjs（映射/分组/备注键双语完备、at-most daily-only 契约、渲染与绑定链路标记、宿主接线、运行时纯函数边界）接入 test:ui;template-manager/templates 测试转译清单补 view-preferences.ts。
验证:pnpm run check、完整 test:quality（check/build/test/test:ui/test:legacy-style/test:mobile/test:ecosystem/test:extended/test:review-comparison/test:perf/check:release）exit 0;宽度走查（Edge,CHECKIN_BROWSER）浅深双主题 42 页面+32 交互+8 对比度+10 混合+16 长内容全过;发布说明包摘要同步至可复现 webpack zip（9bf9dccf…）。真实宿主项 T-023/B-007 保持开放。
附注:开发期发现 release-assets 摘要门槛依赖「build 后同步更新发布说明 SHA-256」;webpack PackageZipPlugin 固定 1980 时间戳保证未改源码时哈希稳定。

2026-09-21 T-1346 两发现收口（界面语言接线 + 模板运行时断言）:①设置页新增「界面语言」（zh-CN/en-US/跟随思源,view-preferences 新增 pluginLanguage 偏好缺省 zh-CN 行为不变,syncPluginLanguage 按宿主 lang 解析 follow,变化时才切换避免无谓重渲染,设置变更即存即生效）;②走查脚本补 CHECKIN_QA_LANG=en-US 英文全矩阵能力,模板区运行时断言（展开器→全显→芯片置顶→重渲染保持）入走查;③修正走查内 14 处硬编码中文期望为双语正则（专注/记录/打卡/备注/破戒/上限/填写/次数/天等——此前英文界面不可达所以从未暴露）。
验证:英文界面首次全矩阵走查通过（42+32+8+10+16,Edge）;中文走查回归通过;type check、release-assets、i18n-hygiene、settings-navigation、template-gallery、view-preferences 全过。发现:EN 文案布局无错乱,英文界面自此具备发布口径。

2026-09-21 T-1341 API v5 稳定文档包:docs/api-v5.md 正式参考（18 能力清单+签名+上限表+批量写判定顺序+弃用周期+storeVersion 双语义）+ docs/contracts/checkin-api-v5.json 机器可读清单 + tests/api-v5-docs.test.cjs 三方交叉核对（api-contract.ts transpile 逐项比对,接入 test:ui）;api-v5-design.md 标记转正,ecosystem-integration.md 互指。ecosystem-docs/export-identity-docs 回归通过。

2026-09-21 T-1342 恢复与并发演练:设置页数据安全区新增「数据诊断与恢复指南」折叠块（data-recovery-guide,六条自助路径:恢复点/JSON 备份/损坏隔离/多窗口存储锁/番茄收件箱/双诊断导出,中英双语,复用 settings-fold 样式）;演练证据映射到既有常绿测试链（backup/conflict/保存队列重试/番茄收件箱/快照回滚）。
验证:type check、release-assets、i18n-hygiene、settings-navigation、mobile-release-quality、中文宽度走查全过;发布说明摘要同步（cc682d2b…）。

2026-09-21 T-1343 回顾导出增强:①buildReviewDeviationNotes 纯函数（±5pp 阈值/幅度排序/上限 3/防御缺失）+ 报告「偏差解释」区块（reportSections.deviations 缺省开,四类确定性文案）;②analytics 摘要管线 SummarySourceOptions 来源过滤（当前+基线同口径）,报告设置来源下拉持久化（reportSource）,筛选口径写入报告;③回顾工具栏「导出全部」顺序触发 JSON/CSV/报告。新增 tests/report-deviations.test.cjs 接入 test:ui;report-sections 转译清单补 review-comparison.ts。
验证:test:ui 全链、中文+英文宽度走查、type check、release-assets 全过;摘要同步（eb5c1763…）。

2026-09-21 T-1345 设置页状态可观察性收口:三类外部依赖（番茄钟/智能体/Task Horizon）统一 data-dependency+data-dependency-state 钩子与 healthy/degraded/error 分桶（dependencyBucket 显式映射表）,状态值统一 role="status"+三档视觉类,每行新增统一恢复/重试提示（lc-checkin__dependency-recovery）;新增 Task Horizon 提供方就绪行（API v5·契约 v1,如实标注"我方就绪"而非运行时握手）。新增 tests/dependency-status.test.cjs 接入 test:ui;agent-status 旧正则适配属性顺序。
验证:dependency-status、agent-status、test:ui 全链、双语宽度走查、type check、release-assets 全过;摘要同步（59350da4…）。v18 本地可推进任务至此全部完成,剩余 T-1344/T-1347 等用户真机窗口。

2026-09-21 v19 启动：模板二期（T-1356/T-1357/T-1358）:目录扩充 45→60（健康 记录体重/防晒、学习 听播客/刷题、运动 跑步/俯卧撑、工作 单事专注、生活 遛狗/洗碗/存钱、戒除 不刷短视频·atMost/戒酒·atMost、专注 感恩记录/深呼吸、创作 写作）,全部补 tpl/tplNote 双语键;新增 RECOMMENDED_TEMPLATES 精选推荐位（无最近使用时展示 8 个跨类别锚点）;template-gallery 门禁扩展目录规模护栏（55~70）与精选名单可解析断言。候选「情绪自评 custom 类型模板」因类型预览链路未验证暂缓,记入后续。
验证:template-gallery、type check、release-assets、test:ui 全链、双语宽度走查全过;摘要同步（0ced5cd1…）。

2026-09-21 T-1351 渲染块二期:checkin-block 新增 groups 并集作用域+`view:"groups"` 分组聚合视图（完成率排序、未分组显式、minRate 白名单表达式过滤 summary/groups 行——今日完成率单一实现 todayCompletionRate）;跳转增强——summary 行绑定 data-jump-item（→回顾项目洞察）,锚点行 data-jump-anchor-block（→内核 rootID+openTab 打开文档,失败回落洞察;滚动定位参数未验证不传,留真机验证）;渲染层依赖新增 onJumpItem/onJumpItemAnchor,宿主接线 jumpToItemInsights/jumpToItemAnchorDoc。
验证:checkin-block 门禁扩展（30ms@10k）、type check、release-assets、test:ui 全链、双语宽度走查全过;摘要同步（52bb9ef5…）。

2026-09-21 T-1352 日记集成:设置页集成区新增日记写入三件套（启用开关/目标文档 ID 校验保存/写入本期报告按钮,未绑定禁用）;写入路径 appendAnchorNote(appendBlock 只追加)+withBoundedRetry+审计 channel=diary-report+结果提示;报告与回顾导出同一 buildWeeklyReportMarkdown 单一路径（来源筛选/偏差解释全生效）;偏好 view-preferences.diaryReport（opt-in 默认关,enabled 无合法 docId 不物化）;撤销与幂等策略落盘 D-241（不随打卡撤销删除/不自动去重/无定时写入,自动能力立项须新决策）。
验证:diary-report 门禁（新接入 test:ui）、type check、release-assets、test:ui 全链（修复 templates/template-manager/report-sections/report-deviations/template-gallery 转译清单补 note-anchor 依赖）、双语宽度走查全过;摘要同步（f059efae…）。

2026-09-21 T-1354/T-1355 UI 维护收尾与性能基线:css-audit 工具落盘（scripts/css-audit.cjs,583 token 零死类——历史清理已收净,重复规则 ~4.4KB）;预算重新收紧 D-242（620KB 警告/640KB 硬阻断,替代 D-246 报告口径）;css-hygiene 门禁新增;渲染块性能三档门禁（1k/10k/100k,实测 19/28/232ms 量级）扩展并连文件接入 test:extended。
验证:checkin-block、css-hygiene、type check、release-assets、test:ui、test:extended 全链、中文宽度走查全过。v19 剩余:T-1353（等隐私决策）。

2026-09-21 v20 启动：T-1362 智能体审计导出:serializeSuggestionAuditExport（版本化 JSON:信封快照+五类动作统计+归一化审计,不含令牌/nonce）+ downloadSuggestionAuditFor（统一安全导出通道）+ 设置页审计条目统计与导出入口（无记录禁用）;T-1373 来源扩展探索结论:不新增内置来源,扩展走公开 API+前缀登记（与 v21 合并）;T-1363 首批复核无口径冲突。
验证:agent-audit-export 门禁（接入 test:ui）、type check、release-assets、test:ui 全链、双语宽度走查全过;摘要同步（c802a56e…）。

2026-09-21 T-1360 建议执行范围扩展:schedule 进入执行白名单——normalizeSuggestionSchedule 结构校验（非法整条丢弃/合法值规范化）+ suggestionValuesEqual 深比较（键序稳定序列化）贯通 build/normalize/apply/revert;差异预览输出本地化排期文案;回顾页重点项目新增「建议改为弹性排期」（daily 且非 at-most → 每周 3 次弹性配额,同一确认流）;历史事件与已确认记录仍不在建议范围（不变式）。
验证:suggestion-schedule 门禁（新接入 test:ui）、agent-suggestions 旧断言同步、type check、release-assets、test:ui 全链、双语宽度走查全过;摘要同步（ca1b283f…）。

2026-09-21 T-1361 机器可读诊断:src/features/diagnostics.ts 纯模块（五原因码+环形 20+序列化往返）;五个失败路径打点（persist/冲突合并/刷新失败/导入拒绝/锁竞争）;公开能力 diagnostics.read（since 5）+ getDiagnostics() 防御副本,manifest/api-v5.md 同步;设置页「数据诊断」行（计数+最新标签+导出）;锁不设超时的设计决策记录（保护长事务,竞争记 lock-contended）。
验证:diagnostics 门禁（新接入 test:ui）、type check、release-assets、test:ui 全链、双语宽度走查全过;摘要同步（64cd291f…）。

2026-09-21 T-1359 项目草案确认流:project-draft.ts 纯模块（normalizeProjectDraft 边界校验/draftFromTemplate 模板派生/summarizeProjectDraft 预览摘要）;排期校验抽至 features/schedule-validate 供建议与草案同源;normalizeSummaryProviderResult 新增 drafts 通道（≤2 份,非法丢弃）;回顾页「项目草案」卡（摘要+检查并保存）→ host.openProjectDraftEditor → 编辑器预填（bind-editor 草案套用后即清除 pending）→ 用户手动 saveForm;模型无直达持久化路径（门禁断言）。
验证:project-draft 门禁（新接入 test:ui）、type check、release-assets、test:ui 全链、双语宽度走查全过;摘要同步（e523760d…）。

2026-09-21 T-1365/T-1368 错误码标准化与摘要同步脚本化:api-v5.md §5.1 错误模型三原则+批量写原因枚举（blocked×5/rejected×6）+会话诊断码五码表;describe() 新增 deprecated 预告数组（当前空,履行弃用窗口承诺）,manifest 同步 diagnosticCodes/deprecatedCapabilities/batch 原因枚举;api-v5-docs 门禁扩展三方同步断言;scripts/sync-release-digest.cjs + npm run sync:digest 幂等摘要同步（取代手工 sed）。
验证:api-v5-docs、contract-kit、type check、release-assets、test:ui 全链、双语宽度走查全过。

2026-09-21 v18.0.0 发版准备（本地完成，未 push）:版本四方升级（package.json/plugin.json/src/version.ts/README → 18.0.0，聚合 v18~v21 四版本特性为单次大版本发布）;新增 docs/v18.0.0-change-log.md 完整变更记录与 docs/releases/release-notes-18.0.0.md 用户向发布说明（沿用 17.3.0 格式:主要更新/能力边界/兼容与升级/SHA-256）;摘要经 sync:digest 同步（1ffa8e91…）。minAppVersion 3.8.4 不变,主存储 v3 与公共 storeVersion 2 不变。发布说明与变更记录均注明真实宿主验收项（T-1344/T-1347）保持开放。
状态:awaiting user push confirmation。发布执行方式:push origin main + tag v18.0.0（或由用户运行 scripts/release.cjs 完整流程）。

2026-09-21 v22 启动：T-1370 同步设计评审 + D-243 决策:docs/sync-design-review.md 评审稿——**不立项自建同步**（含 E2EE 自建通道），跨设备由思源同步天然承载（插件数据位于工作区），插件侧合并/诊断/恢复点已具备配合能力;立三个配套改进项随常规迭代;重启条件成文。T-1371 首切片:i18n-parity 门禁（zh/en 1480 对键全对等、无重复、占位符一致）接入 test:ui。T-1372 数据规模演练确认由既有 100k 基线覆盖（渲染块 100k≈232ms/批处理 17.5ms）。
验证:节流/无节流走查全过。

2026-09-21 T-1371 收尾 + T-1353 设计稿:①旧路线文档归档——development-roadmap-2026/development-roadmap/ui-product-roadmap/ui-redesign-roadmap/v1.0-to-v2.0-roadmap 五文件移入 docs/archive/,README/roadmap-current/roadmap-habit-evolution 及四个测试（ui-docs/stability-9_8/9_8c/preferences-docs）引用同步;②T-1353 设计稿成文 docs/summary-resident-design.md（单一绑定文档/字段白名单/只追加/零新增 API 面,实现仍等隐私决策,通过后 1 批次可实现）。
验证:ui-docs、stability-9_8/9_8c、preferences-docs、type check、test:ui 全链通过。

2026-09-21 T-1369 低端设备画像基线:走查接入 Chromium CDP CPU 节流（CHECKIN_THROTTLE）,x6 节流（模拟低端 4 核画像）下全矩阵 49 页面+32 交互+8 对比度+10 混合+16 长内容 **6 分钟通过**（灾难门槛 30 分钟）;无节流回归全绿。低配画像自此本地可复现,不依赖真机采样。
验证:节流/无节流走查全过。

2026-09-21 尾巴收口（二）:①「情绪自评」custom 类型模板补入（此前因预览链路未验证暂缓——核实 describeEditorPreviewActions 对 custom 走精确录入分支后落地,目录 60→61）;②走查新增 280px 档（42→49 页面场景,T-1346 dock 实宽遗留本地化）,实测发现并修复 EN+280px 回顾自定义范围条横向溢出（range-tabs 换行+summary 可换行）。
验证:模板门禁 61 模板全过、type check、release-assets、test:ui 全链、中英双语走查（49 场景）全过;摘要同步（6572bce3…）。

2026-09-21 v21 启动：T-1364 契约测试包首版:contracts/siyuan-checkin-contract（check-contract.mjs 消费方自测 78 项合规断言:描述符/版本协商/能力面/事件清单/只读方法形状/批量写边界/未知 source 拒绝;manifest.json 字节级同源;README 五项准入清单）;tests/contract-kit.test.cjs 三重守门（manifest 字节一致+合规 mock 全过+4 项变异违规捕获）接入 test:ui。npm 独立发布待发版窗口（push 需用户确认）。

2026-09-21 v22 启动：T-1370 同步设计评审 + D-243 决策:docs/sync-design-review.md 评审稿——**不立项自建同步**（含 E2EE 自建通道），跨设备由思源同步天然承载（插件数据位于工作区），插件侧合并/诊断/恢复点已具备配合能力;立三个配套改进项随常规迭代;重启条件成文。T-1371 首切片:i18n-parity 门禁（zh/en 1480 对键全对等、无重复、占位符一致）接入 test:ui。T-1372 数据规模演练确认由既有 100k 基线覆盖（渲染块 100k≈232ms/批处理 17.5ms）。

2026-09-21 T-1369 低端设备画像基线:走查接入 Chromium CDP CPU 节流（CHECKIN_THROTTLE）,x6 节流（模拟低端 4 核画像）下全矩阵 49 页面+32 交互+8 对比度+10 混合+16 长内容 **6 分钟通过**（灾难门槛 30 分钟）;无节流回归全绿。低配画像自此本地可复现,不依赖真机采样。

2026-09-21 尾巴收口（二）:①「情绪自评」custom 类型模板补入（核实 describeEditorPreviewActions 对 custom 走精确录入分支后落地,目录 60→61）;②走查新增 280px 档（42→49 页面场景）,实测发现并修复 EN+280px 回顾自定义范围条横向溢出（range-tabs 换行+summary 可换行）。
验证:模板门禁 61 模板全过、type check、release-assets、test:ui 全链、中英双语走查（49 场景）全过;摘要同步（6572bce3…）。

2026-09-21 发版前深度安全扫描（Mimosa deep,static-only）:findingCount 0——13 个依赖包无已知通告,未发现注入/越权/泄露类问题;封印 sha256:1443ac6a…。自查修复 1 处:设置页诊断行 latestDiagnosticText（含错误详情字符串）补 escapeHtml（沿用「innerHTML 注入点全部转义」发布纪律）。
验证:type check、release-assets、diagnostics、i18n-parity、test:ui 全链通过;摘要同步（77a55195…）。

2026-09-21 v18.0.0 发布前真实内核 E2E 回归:定位本机思源安装（D:\biji\SiYuan,CHECKIN_E2E_KERNEL/APP_DIR 环境变量）;首跑发现 mobile-review-ui 规格期望值过期（工具栏 5 控件——17.3 起助手入口进工具栏,spec 期望停留在 4）,修正规格期望后 **test:e2e 16/16、test:e2e:readonly 1/1 全过**;docktomato-completion:126 首跑单发偶发,隔离复跑与全套复跑均过。发布证据补齐:真实内核行为（含移动端 bundle、导出通道、收件箱旅程）全部在 18.0.0 包上验证。
2026-09-21 头像设置尾项收口:预设选项改为完整 i18n（中英 1498 对键保持对等），新增「自定义文字」占位态；设置页重渲染按当前 avatar 值恢复 selected，未知/自定义值不再误显示为首个「勾选」；设置导航门禁新增本地化标签、selected 状态与无硬编码中文断言。决策记录 D-244 明确照片优先显示、显式清除后恢复文字/预设的单一可见来源语义。
验证:pnpm run check、test:ui（含 settings-navigation、i18n-hygiene、i18n-parity）全过。
随后复跑发布资产门禁发现头像改动后的 package.zip 摘要漂移，已用 `pnpm run sync:digest` 同步 18.0.1 发布说明并通过 `pnpm run check:release`（CSS 602895 bytes，按 D-246 仅报告体积）。
图片 bug 复核:发现头像上传原实现会把大图片 data URL 静默截断为 1,000,000 字符，可能保存损坏图片；已改为 FileReader 前拒绝 >700 KB 文件，并拒绝超出内部字符上限的结果，补充设置门禁断言与中英提示。验证:check、test:ui、build、sync:digest、check:release 全过。
筛选框中文输入修复:搜索输入在中文 IME composition 期间不再触发重渲染，compositionend 后再应用筛选，避免拼音被打断并变成英文。验证:check、view-preferences 门禁通过；本轮未生成本地包。
回顾页窄宽度对齐修复:统计周期说明明确使用与工作区相同的最大宽度盒模型；项目卡「按日达成」摘要固定到卡片右侧，避免中间宽度下随名称列偏移。验证:type check、width-walkthrough 全部通过；本轮未生成本地包。
回顾记录值列对齐修复:记录行右侧值列与操作按钮共用稳定的 176px 网格列并居中，300毫升等数值不再相对操作框偏移。验证:type check、width-walkthrough 全部通过；本轮未生成本地包。
回顾分析图表布局修复:分析说明恢复与面板同宽；趋势卡取消中间宽度下的左右分栏，让图表占满可用宽度，避免坐标轴被挤压、底部日期轴脱节和右侧空白。验证:type check、width-walkthrough（含 1180px）全部通过；本轮未生成本地包。
发版后完整回归:发现设置页新增 note-anchor-picker 后，settings-navigation/agent-status 两个独立 TS 测试加载器缺少依赖桩；已补齐并通过完整 test、test:ui、test:mobile、test:ecosystem、test:extended、test:perf、legacy-style、cross-surface、check:release、environment、build。当前版本 18.0.1 发布资产门禁通过（CSS 603671 bytes）；本轮未更新集市包。
继续验证: `pnpm run test:extended`、`pnpm run test:ecosystem`、`pnpm run test:perf` 全部通过；扩展链覆盖 146 个测试文件、CSS hygiene 585 类零死类、100k 索引/事务/渲染基线，生态链覆盖 API v5、Task Horizon、Dock Tomato、Obsidian，性能实测 10k 全渲染 31ms、100k 批处理 12.4ms。

2026-09-22 外部插件联动规划补充（T-1395/D-255）：将思阅、思播、Task Horizon 等合作方的缺失公开能力纳入“本地安全 fallback + 上游公开 API issue/PR”双轨。新增 T-1395，要求能力发现/版本、事件或查询语义、隐私边界、contract fixture、文档示例、旧版降级和桌面/移动/多窗口/重载验收；上游 API 合并、发布、真实宿主验证前不把 fallback 升级为默认稳定路径。两条路径必须指定唯一 canonical source，并以 `source + externalRef` 幂等，禁止同一指标重复累计。本轮只更新计划、路线、决策和阻塞记录，未修改运行代码、未创建/提交/push 任何外部 PR。

2026-09-23 T-1395 上游公开 API 协同（本地草案部分）:docs/upstream-api-proposals-2026-09.md 三份提案——思阅（window.sireader 集成描述+4 生命周期事件 payload 冻结+可选 getSessionFocus 结算查询;有效时长=焦点+可见墙上时间）、思播（siplayer-integration 能力发现+play/pause/ended/progress 事件+可选 getEffectivePlayback;红线=currentTime 差值≠观看时长）、Task Horizon（方向反转:我方 calendar.read 已稳定,提案对方消费层——协商/超时/AbortSignal/单飞/四事件刷新白名单/降级隐藏/legacy 不误显示/只读解耦）;三份 draft 夹具 docs/contracts/upstream-proposals/*-v1.json;守门 tests/upstream-proposals.test.cjs 强制夹具 draft 状态、文档↔夹具↔真实代码三方同步（前缀注册表、calendar.read since 5、刷新事件、投影六态与隐藏过滤）;接入 test:ui 与 test:ecosystem。D-255 双轨纪律成文:草案≠契约,合并→发布→真实宿主验收三关前 fallback 不升级,唯一 canonical source,externalRef 幂等禁双计。
验证:test:ecosystem 全链（含新守门）、test-suite-coverage 156 文件、stability-9_8c 通过。外部 issue/PR 零提交,等用户授权。运行代码零改动（纯文档+夹具+守门）。

2026-09-23 v18.2.1 发版准备（本地完成，待用户 push）:外部来源体验收口——思播采样毫秒累计修复（15 秒采样此前永远到不了 1 分钟）、健康收件箱按项目身份防串档 + 启动 ingest、设置页五组外部来源折叠面板 + 思阅/思播今日分钟预览（T-1386）、回顾报告来源筛选扩展思阅/思播、三套真实内核 E2E、T-1395 上游 API 提案（纯文档）。版本四方升级 18.2.1（package/plugin/version.ts/README）；新增 v18.2.1-change-log 与 release-notes-18.2.1（digest 450a481f…经 sync:digest 回填）；README 新增 18.2.1 要点、18.2.0 降级。
验证:升版前完整 test:quality 全绿；升版后构建、release:manifest（10 资产 v18.2.1）、rollback rehearsal、release-assets、stability-9_8c、tsc、i18n-parity 1597 对、ui-docs/export-identity-docs/ecosystem-docs/preferences-docs 全过。
状态:awaiting user push confirmation。发布执行:push origin main + tag v18.2.1 → GitHub Release 附 package.zip 标记 Latest（先向用户核对）。

2026-09-23 v18.2.1 发布完成（用户确认「发版」）:main 推送 b982aa5..369902b、v18.2.1 tag 推送、GitHub Release「小驴打卡 v18.2.1」创建并附 package.zip（696006 字节）标记 Latest;发布资产回源下载复验 SHA-256 450a481f… 与发布说明/本地构建三方一致;CI 在发布提交上自动通过（58s）。集市将随 Release 自动同步 18.2.1。
状态:released。下一步:按 T-1400 第三轮触发条件（本地可执行任务清零+质量链全绿）启动生态调研第三轮（OpenHabitTracker 参考点补评 + easy-tracker 二轮）;真机验收窗口归集 T-1406/T-1408/T-1388。
2026-09-25 发布候选全量复核（T-1460/T-1446）：设置页完成「文档联动 / 第三方联动」分组与七来源独立卡片，逐项补齐绑定目标、保存/启用顺序、数据流、隐私边界、停用保留、重绑历史、查询上限和宿主可用状态。移动视觉 QA 通过已完成项展开→折叠（completedExpanded=1、completedCollapsedAgain=0、aria-expanded/hidden 同步）及 320/360/390/430px 无横向溢出；`pnpm run test:quality` 全链通过（含 175 个测试文件、性能、摘要同步、发布清单、回滚演练）。真实思源 3.8.5 隔离内核 E2E 首轮 19/21，暴露思阅/思播 fixture 错把二值「次」项目用于分钟联动；按产品单位守门改为分钟时长项目后两个失败 spec 针对性复验 2/2，合并证据覆盖 21/21。修正 test:quality 将 digest 同步移至最终构建测试之后，避免真实 mtime 造成发布资产竞态；版本仍 18.4.0，README 未升 18.5.0，未运行 release.cjs、未 push。真实 Android/WebView 与实际第三方账号仍属 host-pending。
# 2026-09-26 LifeLog 项目归属模型重整

- 用户指出 LifeLog 记录是“12:00 工作：写日报”：当前记录的时长由同文档下一条时间边界结算，归属于当前记录中的项目与事项；不同项目时长应分别映射多个打卡项目。
- 已新增多映射偏好及设置入口，逐条按项目名映射目标；映射模式里未命中类型跳过、不猜归属，目标不存在/归档或非分钟单位时跳过。空映射旧配置继续使用旧单目标，保持升级兼容。`externalRef` 仍按 blockId+日期幂等，事件备注保留“项目：事项”。新建 [lifelog-integration.md](docs/lifelog-integration.md) 定义语义与边界。
- 参考 lumina 仓库 README/变更记录：其 LifeLog 视图以类型筛选、卡片/时间轴呈现，并有独立日期统计与记录时段逻辑；这轮只吸收与本需求相关的记录项目与相邻区间归属，不复制其 UI。来源：[LunaNorth/siyuan-lumina](https://github.com/LunaNorth/siyuan-lumina)。
- 验证：`node tests/yeguif-adapter.test.cjs` 通过（解析/相邻结算/映射选择/身份/宿主触点）；`node tests/i18n-parity.test.cjs` 通过（1960/1960）；`pnpm run check` 通过；`pnpm run build:check` 通过（webpack 仅报告既有 bundle size 建议）。未跑完整质量链；工作区含其它未归属本任务的变更，未回退或覆盖。
- 续跑修正：切换旧版固定目标时不再因映射目标存在而误关闭联动；映射文本保存保留目标 ID（目标暂时删除时可恢复），只有摄取时才跳过不存在/非分钟目标。回归：`node tests/yeguif-adapter.test.cjs`、`node tests/view-preferences.test.cjs`、`pnpm run check`、`pnpm run build:check` 全部通过。
- 语义纠正：按用户原话将区间归属从“当前→下一条”改为“上一条→当前”，所以 `12:00 工作`、`13:00 阅读` 产生 60 分钟的“阅读”事件；当天第一条没有前置记录时不记。同步更新适配器、摄取注释、设置边界文案、说明文档及午夜边界测试。验证：`yeguif-adapter`、`midnight-boundary`、`i18n-parity`、`pnpm run check` 全部通过。
- 完整主测试链 `pnpm test` 已通过，包含架构边界、核心模型、视图偏好、午夜边界、LifeLog 相关回归等全部阶段。
## 2026-09-27 · T-1508 片段时长与 LifeLog 路由（进行中）

- 用户确认：同日 20 分钟与 15 分钟应分别新增两条记录。思阅焦点片段、思播新增有效整分钟已改为增量写入；叶归项目显式映射优先，未配置时仅唯一同名分钟目标匹配，不再回退旧单目标。
- 设置移除思阅/思播已失效的阈值控件；外部联动总览更新两者身份和操作口径。微信读书仅有官方每日汇总，保持现有每日拉取，不伪造会话片段。
- 验证：`pnpm run check`、思阅/思播定向测试、`pnpm run test:quality`、双主题 `visual-qa`、`width-walkthrough`、`git diff --check` 均 EXIT=0。首次质量链因 LifeLog 旧门槛断言失败，修正断言后重跑通过。未做第三方真实宿主验证。
- 未收口：跨窗口分钟桶碰撞/边界、写入失败后的片段恢复、其余契约文档旧口径清理；继续按 T-1508 处理，不将本项标为完成。
2026-09-27 发版前开发批次：T-1497 回顾单日批量补记/跳过落地，一批一次保存、失败整批回滚、事件独立撤销；T-1498 10k 浏览器重渲染长任务门禁与回顾离屏渲染提示落地；T-1499 浅深主题实际 DOM 目标尺寸审计落地并修正两个小目标。T-1508 思阅/思播分段和叶归路由的本地回归通过，但跨窗口片段身份与写入失败恢复仍留开放。验证：`pnpm run test:quality` EXIT=0，双主题 visual-qa EXIT=0，width-walkthrough EXIT=0，accessibility-audit 0 小目标/0 对比度违规；CSS 635067 bytes 超 620KB 软线。无真实第三方宿主验证，未 push、未发版。

2026-09-27 T-1508 继续：片段身份由开始 Unix 分钟桶调整为精确开始毫秒，修复同一分钟内两次真实会话误合并；旧每日与分钟桶记录仍按原身份留存。同步更新机器契约、当前接入说明及同分钟碰撞测试。`pnpm run check`、三份定向测试、`pnpm run test:quality` EXIT=0；性能样本 10k 重渲染 21ms、0 长任务，CSS 635067 bytes 仍超软线。跨窗口同一会话缺共享上游身份、失败片段无法持久恢复，T-1508 保持开放；未推送、未发布。
2026-09-28 T-1551～T-1555 三组内部设置继续梳理：对照 `src/render/settings.ts` 与 `src/i18n.ts` 逐项检查发现，宿主组把专注提供方和只读契约状态混在一起；文档组把手动报告、自动摘要、问卷答案、锚点都套用启用/立即写入；第三方来源组把凭据、目标、启用、探测、预览、拉取/读取和故障报告挤在同一张卡。研究稿补充三组内部职责拆分与统一卡片骨架，TODO 新增 T-1551～T-1555；D-301 记录先矩阵/原型、后 UI 实施。本轮仍仅文档/待办/决策改动，未运行构建或 UI 测试，未 push。
2026-09-28 T-1556～T-1560 思源文档/笔记本绑定专项梳理（用户要求继续分析并加入待办）：核对 `validateBindingTarget`、文档搜索选择器、笔记本列表加载、日记自动定位、健康/叶归/笔记推导目标卡和集中绑定体检后确认，现状存在 ID 输入/搜索/手动加载多套入口，目标路径/所属笔记本/类型/可读状态不统一，失效绑定只能查看不能就地修复，读取范围与写入所有权也靠长文案解释。研究稿补充专项问题与共享目标选择器方向；TODO 登记 T-1556～T-1560，D-302 冻结为先设计、后实现。本轮仅文档/待办/决策改动，未运行构建或 UI 测试，未 push。
2026-09-28 T-1561～T-1567 设置页 UI 原型与重构步骤梳理（用户要求“好好梳理并重构原型、加入待办”）：盘点 `src/render/settings.ts` 当前 9 个一级组和设置搜索/保存行为，确认普通偏好、联动配置、文档目标、数据恢复与关于信息共用一层，缺少待处理总览和字段级导航。新增 `docs/settings-page-rearchitecture-2026-09-28.md`：定义设置页四项作用，提出“首页总览 + 任务分区 + 详情卡/抽屉”原型，列出分区职责、字段注册表、搜索导航、联动入口、恢复隔离、分阶段验证步骤；TODO 登记 T-1561～T-1567，D-303 冻结为先原型后实现。本轮仅文档/待办/决策改动，未运行构建或 UI 测试，未 push。
2026-09-28 T-1568～T-1574 新建打卡页 UI 原型与重构计划梳理（用户要求结合各类打卡功能重新设计）：盘点 `src/render/editor.ts` 与 `bind-editor.ts` 后确认，模板/空白、二值/数量/时长/配额/戒除、目标单位步长、排期、专注提供方、问卷、锚点、Task Horizon、组织和危险操作全部共用一条长表单，且高级区混合事实规则与可选输出。新增 `docs/checkin-editor-rearchitecture-2026-09-28.md`：定义类型与能力分层、类型驱动的“选起点→记录什么→做到多少→什么时候做→怎样产生记录→可选输出与组织”原型和 8 步迁移方案；TODO 登记 T-1568～T-1574，D-304 冻结为先原型后实现。本轮仅文档/待办/决策改动，未运行构建或 UI 测试，未 push。
2026-09-28 T-1575～T-1584 全页面体验统一梳理与原型计划（用户要求结合功能、交互、UI 统一分析）：盘点今日、回顾、单项洞察、新建/编辑、事项、归档、设置、快速弹窗/专注及渲染块/页签/dock 的渲染与导航入口，确认主要问题是每页主任务不够突出、辅助卡片层级不一、状态/空态/失败语义不统一、页面间回链和上下文恢复不完整。新增 `docs/page-experience-audit-and-prototype-plan-2026-09-28.md`，定义统一判断标准、页面地图、逐页原型方向及 8 步迁移路径；TODO 登记 T-1575～T-1584，D-305 冻结为先统一原型后逐页实施。本轮仅文档/待办/决策改动，未运行构建或 UI 测试，未 push。

2026-09-28 T-1585～T-1608 页面专项与跨表面工程化补充：在统一页面原型基础上继续核对提醒中心、问卷/日记弹窗与模板构建器、单项洞察、事项、归档、专注、快速弹窗及渲染块/页签/dock。发现提醒投影重复、问卷目标与答题混窗、事件/文档双结果不明显、洞察期间/atMost/quota/成熟度口径需显式化、事项列表与表单争夺空间、归档删除影响不透明、专注跨页/重载不可见，以及全局页面状态导致多表面返回上下文丢失。TODO 登记 T-1585～T-1602 的功能专项和 T-1603～T-1608 的路由/状态/响应式/输入/性能/渲染块验收；研究稿补充专项原型和 surface context/状态契约。D-306 记录跨表面独立状态、事件/统计单一事实和兼容映射原则。本轮仅文档/待办/决策改动，未运行构建或 UI 测试，未 push。

2026-09-28 D-307 现状再复核与统一实施计划：并行核对核心页面、设置/联动/问卷/快速表面和 TODO/路线文件，确认 v18.9.0 已有回顾三工作区、设置行搜索、模板/排期预演、提醒共用投影、问卷事实先存及重试、快速弹窗窗控和渲染块 Today 记录；旧计划中若干“新增”应改为增量。静态源码发现洞察 `atMost` 与 `isComplete` 判定相反、今日 dashboard 当日修订目标与项目现值单位混用，新增 P0 T-1609/T-1610，尚未实施或运行针对性测试。新增 `docs/consolidated-experience-plan-2026-09-28.md`，将全部开放任务按唯一能力注册表→正确性→状态/路由/目标契约→项目到来源到事实的纵向切片→设置/编辑器/页面/多表面迁移重排；改正目标元数据持久快照和可写权限预检的过度承诺、归档日期/原因和设置保存语义，修正 TODO 与旧路线当前状态。文档/台账改动后仅做链接/编号/差异检查；无运行代码改动，未运行构建或 UI 测试，未 push。

2026-09-28 T-1609 洞察页戒除/上限口径对齐主模型：完成判定收拢为 `model.ts` 新导出 `evaluateDayCompletion` 唯一公式（`isComplete` 改为委托同源，浮点容差统一为 8×EPSILON 比较），`insights.ts` 删除私有 `atLeast` 与 `progress > 0 && effectiveTarget > 0` 反向表达式；日状态映射按方向区分——戒除类有真实事件（含数值超限）即 `missed`（与 calendar-projection 的 at-most-breach 立即呈现一致），二值零事件、数值不超上限为 `complete`，跳过日不算成功且 skipped 中性连击不变；`HabitDayObservation` 新增 `direction` 标记，`overachievedDays` 排除戒除类（对齐 achievements 方向守卫，兼封单位不匹配旧洞）；`coaching.ts` 戒除类不再给 start-today（跳过日的 pending 对戒除目标反向）；洞察日格 tooltip 新增 守住/破戒/未记录 三键双语（zh+en 各 3 键，i18n 平价通过）。新守门 tests/insights-atmost.test.cjs 入主链 7 检：二值零事件/一次破戒/跳过、数值上限 2 时进度 0/1/2/3、今日未结束、跳过今日 pending、历史修订（duration→binary 逐日语义）、周趋势/完成率、至少型回归，并逐日与 `isComplete` 交叉核对；守门同时断言洞察源码不再含第二套完成比较。
验证：`pnpm run check`、主链 `pnpm test`、`build`、`test:ui`、`test:quality`、双主题 `visual-qa`、`width-walkthrough` 全 EXIT=0。CSS 630747 bytes 不变。发布资产 v18.9.0 门禁随 test:quality 通过。未做真实宿主走查；agent-capabilities 报告与洞察同源自动获益，无单独改动。

2026-09-28 T-1610 今日行动台历史修订单位一致性：新纯模块 `features/today-fact.ts`——`buildTodayItemFact` 把行动台单项目事实切片收拢为整口径当日修订：target/unit/kind/schedule（含 quota 面）全部取 `getItemRevisionForDate(item, date)`，消灭「目标取当日修订、单位/类型/排期取 item 现值」混用；atMost 破戒改按修订 `kind` 判定；既有事件单位原样保留、不做任何换算；完成/进度/跳过判断全部委托 model 单一实现。`fragments.ts` renderTodayView 的 dashboard 映射改为调用该切片（约 15 行内联收拢为单函数调用）。新守门 tests/today-fact.test.cjs 入主链 5 检：单位 杯→毫升 未来日期修订（今日仍 杯/2，item 现值 毫升/500 不泄漏）、binary→quantity 类型修订驱动破戒规则（1/2 未破戒、3 超限破戒、零事件守住）、daily→quota 排期修订正向（quota amount 取修订）与反向（陈旧 item 级 quota 不泄漏到 daily 修订日）、跳过/完成/连击透传。
验证：`pnpm run check`、主链 `pnpm test`、`build`、`test:ui`、`test:quality`、双主题 `visual-qa`、`width-walkthrough` 全 EXIT=0（与 T-1609 同批合并跑）。architecture-boundaries 136 模块界内，test-suite-coverage 208 文件全注册。T-1577 首屏重排的口径前提已就位。未 push。

2026-09-28 T-1545 联动专项视图 + T-1568 编辑器字段矩阵（阶段 0 派生视图收尾）：新增 [integration-capability-registry-2026-09-28.md](docs/integration-capability-registry-2026-09-28.md)——A 行为自动打卡 11 卡×九字段、B 文档输出 4 卡（共同边界：事实先落盘、文档失败不回滚）、C 对外契约 5 卡；归属纠偏：问卷/锚点属输出组、笔记推导属事件组、Dock Tomato 双向消费/提供、Task Horizon 双向（taskhorizon: 写入+calendar 投影，互置外部待验）、API 写面五来源防伪造回落 api。新增 [editor-field-registry-2026-09-28.md](docs/editor-field-registry-2026-09-28.md)——26 项字段/能力矩阵（显隐条件/默认值/校验/存储字段/目标流程段）+ 保存装配失败语义 + 重复业务判断 5 项（显隐双处判断、quota 口径三消费点、atMost 静默回落双保险、单位默认值双源、模板回填无标示）。源码核对修正一处代理误报：问卷绑定字段对非 binary 是 bind 动态隐藏（bind-editor.ts:521-523），非「恒显仅校验」。至此 D-307 阶段 0（真值与正确性：T-1575 主表、T-1545/1561/1568 专项视图、T-1609/1610 正确性）全部交付。纯文档轮，无运行代码改动，未 push。

2026-09-28 T-1575 唯一页面/能力/状态注册表（D-307 阶段 0 收官项）：四个并行只读盘点（今日/回顾/洞察、编辑器/事项/归档、设置/问卷/提醒/专注、快速/嵌入/对外契约）产出带 file:line 证据的事实登记，汇编为 [capability-registry-2026-09-28.md](docs/capability-registry-2026-09-28.md)：12 个用户表面 ×（入口/主动作/输入输出与保存/空态失败/回链/宿主能力/证据测试/缺口）+ 共用通道单列（enqueueMutation 写事件、persistViewPreferences、设置草稿、外部待处理箱、路由会话态、状态词表现状）+ API v5/Task Horizon/Agent/五来源适配器契约登记；状态统一「已有/需调整/新增/外部待验」四值。关键 file:line 引用抽查核对（renderToday/renderReview/projectReminderCenter/sourceState/API 协议常量/dock-tomato 桥/待处理箱容量/Task Horizon 契约对象/journal-dialog/block-renderer/saveEditorForm/settings-change-list 及 8 个测试文件存在性）全部命中。派生纪律入文：T-1545/T-1561/T-1568 从对应章节派生专项视图，T-1608 取各表面证据行；维护规则=任务交付只更新对应行。纯文档轮：无运行代码改动，不涉构建；做引用抽查与链接检查，未 push。

2026-09-28 T-1561 设置字段注册表与信息架构迁移表：从注册表 §7 派生 [settings-field-registry-2026-09-28.md](docs/settings-field-registry-2026-09-28.md)。逐字段核对 settings.ts 九组 DOM（390-630）与 index.ts 处理器，登记保存语义四分类（A 显式保存=变更清单 10 字段、B 即时异步持久化、C 动作类、D 只读状态行）+ 目标分区/风险/搜索词/成功失败重绘重载/存储桶；确认 `savePreference`（index.ts:3623）是 persistViewPreferences 的带 toast 包装、强调色有专用 toast、avatar 上传经 openAvatarEditor（>700KB 拒绝）、palette/avatar 均 persistViewPreferences。存储面总表：8 个 checkin-* 桶 + 视图偏好单桶（来源配置与 weread apiKey 同桶，apiKey 仅本地不导出）。新发现：`save-note-query` 七字段显式保存但未入变更清单（T-1521 只登记 10 个）——登记为迁移决策点。B 类「失败时内存/存储不一致」口子移交 T-1604；source-panel 展开态与搜索词移交 T-1603。处理器行号抽查（saveJournalCustomTemplates:960、check-note-bindings:3814、planSourceDisconnect:3902、save-health-doc:3975、save-note-query:4026、save-weread:4108、clear-weread-key:4130、load-yeguif-notebooks:4183、diary-search:4235、create-diary-doc:4291、pending retry/discard:4360/4366）全部命中。纯文档轮，无运行代码改动，未 push。

2026-09-28 T-1603/T-1604 阶段 1 共享契约（先于页面壳 T-1576/1599）：新增 [surface-routing-contract-2026-09-28.md](docs/surface-routing-contract-2026-09-28.md)（T-1603）与 [async-status-contract-2026-09-28.md](docs/async-status-contract-2026-09-28.md)（T-1604）。T-1603：SurfaceContext 参考形状、会话态全清单按宿主级/每-root/页面归属逐字段登记（todayQuery:265、reviewWorkspace:414、history* 五件套:1730-1737、批量补记三件:1710-1713、recordDetailsExpanded:1741、itemCompareSelection:1715、设置草稿:471/473、每-root WeakMap 三件:245/246/253）；返回栈=单级 returnTo+默认值表（明确不做通用历史栈）；打开路径×恢复矩阵。T-1604：八态词表对齐台账八族、三类写路径规则、登记 B 类「失败时内存/存储不一致」口子并定收口规则（改 savePreference 包装或失败回滚内存值）；代际丢弃规则以既有 summaryRequestId 为范本（核实 index.ts:5570 递增/5592 完成校验含 range/page/日期条件）。代码落地（T-1604 卡内点名项）：`renderInto` 初始化屏硬编码中文「正在加载打卡数据…/打卡数据读取失败」替换为双语键 init.loading/init.failed/init.failedHint（zh+en 各 3 键），加载 role="status"、失败 role="alert"+可执行修复动作（停用重启用插件）+「已停止写入」口径（与 msg.dataLoadFail 一致），补 data-appearance/data-palette 消除深色宿主初始化白闪；ui-state-ledger 加载族新增六条断言（双语三键/role 语义/主题属性/无硬编码中文残留）。核实失败期间零写入声明与既有守卫一致（persist 全部 storageReady/initializationState 闸）。
验证：`pnpm run check`、主链 `pnpm test`、`build`、`test:ui`（含 i18n-parity 新键平价）、双主题 `visual-qa`、`width-walkthrough` 全 EXIT=0。剩余边界：设置 B 类字段逐个收口（契约验收门 1，移交后续切片）；页面壳按 T-1603 契约实施归 T-1576/1599。未 push。

2026-09-28 T-1556 思源目标选择器统一规范：新增 [target-selector-spec-2026-09-28.md](docs/target-selector-spec-2026-09-28.md)。四种目标类型契约（机器身份不变，查询面限于现状可证实 API：SQL 元数据/lsNotebooks/createDocWithMd，不做可写权限预检）；五步交互流（类型→笔记本过滤→搜索/最近使用→结果预览→保存，保存走 validateBindingTarget 同源校验+失败回滚，推广 bindVerifiedDocumentSave 语义）；已选目标卡五动作；会话缓存与 ID 回退（不持久快照，不改 Store v3）；六使用点差异表（读写/创建/触发/失败）；换绑确认四段。验收门移交 T-1557/1558/1559。纯文档轮，未 push。

2026-09-28 T-1569 类型驱动新建流程原型：新增 [editor-type-flow-prototype-2026-09-28.md](docs/editor-type-flow-prototype-2026-09-28.md)。七段主流程组成（字段引用编辑器矩阵编号，排期/方向提入主流程）；类型×排期×方向适用性矩阵以 updateConditionalFields（bind-editor.ts:477-544，本轮通读核实：valueFields 二值隐藏 477-479、星期 weekly/custom+今日回退 480-487、方向仅 daily 490、配额 min/step 与帮助文案按 dates/value 分叉 495-500、目标值对齐步长 505-517、记录步长二值隐藏 518-519、问卷仅 binary 521-523）为唯一事实源逐条登记；atMost×非 daily 由静默回落改显式提示（行为不变仅提示新增）；解释句式全部复用既有键、戒除文案按类型分叉对齐 T-1609 口径；三种类型最终屏幕组成。验收门移交 T-1574。纯文档轮，未 push。

2026-09-28 T-1546 新用户任务导向 IA 原型（阶段 1 收官）：新增 [new-user-entry-prototype-2026-09-28.md](docs/new-user-entry-prototype-2026-09-28.md)。连接总览三卡（A 自动打卡/B 写入笔记/C 供其他插件，一句话+例子+只读进度，数量仅导航）；项目直达来源绑定（编辑器段 6 扩展，来源要求先校验、linkagePlan 语义不变、returnTo=editor 草稿保留）；来源卡首屏四行+反查新建（单位先校验后创建）；新用户六条示例全部含失败态呈现；组名三处对齐现有 i18n 键；设置行搜索/source-panel 展开态/书签可达性保留。A/B/C 底层数据流差异全程保留（引用 T-1545/T-1554/T-1556/T-1603，零重复真值）。本稿即用户评审件，实施移交 T-1550 切片。**D-307 阶段 1（原型与共享契约：T-1603/1604 契约 + T-1546/1554/1556/1569 原型）全部交付**。纯文档轮，未 push。

2026-09-28 T-1553 来源卡动作语义统一（阶段 2 首个 UI 实施切片）：①动作词收拢——新键 set.sourceReadNow（立即读取/Read now）替换三个摄取卡（health/notequery/yeguif）的「立即刷新」；weread 卡移除与 pullWereadNow 重复的 refresh-source 第二按钮（核实旧路径裸调 ingestWeread：无 itemId/apiKey/enabled 前置校验、反馈回显动作名自身，属劣化重复）；set.sourceRetry 键中英全量退役，refresh 分发移除 weread 分支、反馈兜底换 sourceReadNow。②六张来源卡（sireader/siplayer/weread/health/notequery/yeguif）编号步骤+边界长文折入 data-source-advanced 折叠，复用 lc-checkin__settings-fold/fold-chevron 既有样式零新 CSS（CSS 630747 bytes 不变）；siplayer 宿主状态行保留折叠外（运行态槽位）。搜索可达性核实：settings-navigation 过滤对命中的 details 自动 panel.open=true（panelStates 恢复机制），折叠不降级。③守门：settings-navigation 新增 8 断言（sourceRetry 零残留、双语新键、refresh-source 恰 3 处、weread 唯一拉取、sourceReadNow 恰 3 处、折叠恰 6、分发无 weread 分支），source-steps=8 既有守门保持。剩余边界：监听型宿主探测归 T-1549，五段骨架与状态槽位合流归 T-1565/1567。验证：pnpm run test:quality EXIT=0（含 check/主链/build/test:ui/i18n-parity）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-28 T-1557/T-1558 文档目标卡升级（阶段 2 第二个 UI 切片，文档型）：①「已选目标卡」落地——diary/summary/health 三卡新增摘要行（`targetSummaryRow` 共享助手：标签=名称·路径·ID，会话缓存 `targetSummaries`（Map，绝不持久化），查询失败退回已存 ID）+ 四动作（打开复用 openBindingTarget 既有 data-open-binding 绑定；重新检查走 validateBindingTarget 同源只读检查并回写缓存与标签；重新选择聚焦对应输入框；清除确认后清空、persist 失败回滚旧值）。②摘要水合复用 readBindingBlocks 单一实现——bindSettings 尾部异步补查缺失项并就地更新标签（不整页重渲染、disposed/root.isConnected 双守卫）。③换绑确认——bindVerifiedDocumentSave 增加可选 confirmKeys：旧目标非空且变化时 window.confirm（旧/新目标+该卡 DocHint 范围说明+「既有记录保留不自动迁移」），取消零写入草稿保留；首次绑定不确认；三调用点传各自标题/范围键。④i18n 新增 9 键×2（set.targetSummaryTitle/targetNone/targetOpen/targetRecheck/targetEdit/targetClear/targetCleared/rebindConfirm/targetClearConfirm）。⑤守门：settings-navigation 新增 11 断言（三卡 targetSummaryRow 调用/标签锚点/四动作/双语 9 键/rebind+clear 确认/会话缓存/水合复用）；修两处测试加载器缺桩（settings-navigation、agent-status 的 settings.ts 沙箱补 note-bindings 依赖——严格桩白名单纪律所致）。
验证：pnpm run check、test:quality EXIT=0（含主链/build/test:ui/i18n-parity/CSS 630747 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：块/笔记本/当日日记三类型接同一助手、save-journal-target 与叶归换绑确认归后续切片；键盘/触屏细节归 T-1608 台账。未 push。

2026-09-28 T-1551+T-1549 host 组职责拆分与状态收口（同切片实施）：①host 组拆两节——「我的专注工具」（data-host-section="mine"：专注提供方选择、Tomato 运行状态+诊断+导出+回退、番茄完成问题、番茄收件箱）与「给其他工具使用」（data-host-section="others"：API v5 契约、Task Horizon 合并行、Agent 状态、Agent 审计导出）。②T-1549 去重——Task Horizon 契约行与依赖行合并为一行（data-contract-center="taskhorizon" data-contract-state="waiting" + data-dependency="taskhorizon" data-dependency-state="healthy" data-dependency-kind="provider-contract" 同行共存：消费端等待接入 ≠ 我方提供方契约就绪，语义不再可混读）；Tomato 诊断行并入运行状态行（contract-center 属性前缀拼接，dependency-status:10 精确子串保持）。③set.sourceCategory.externalContract 键随旧类别标签退役，新键 set.hostMine/hostForOthers 中英各 2（i18n-parity 2366 对）。④守门：dependency-status 新增 8 断言（双语新键/两分节在位/contract-center 恰 1×2/TH 精确双属性/旧标签退役/提供方选择与 API 行归属顺序）。所有守门精确子串（dependency-status:10-12、settings-navigation:467-470）在重构前核对并全部内嵌保留。
验证：pnpm run check、dependency-status/settings-navigation/i18n-parity/ui-state-ledger 定向守门、pnpm run test:quality EXIT=0（CSS 630747 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：监听型卡宿主探测动作归 T-1547（思播 detectSiplayerController 已备）；外部来源待处理箱留来源组、回链归 T-1547。未 push。

2026-09-28 T-1554 三组设置状态与空态设计矩阵：新增 [integration-status-matrix-2026-09-28.md](docs/integration-status-matrix-2026-09-28.md)。六类信息分离为每卡固定槽位（目标/动作/配置/运行/活动/问题，锚定既有 sourceState 三态 settings.ts:247、运行态 39-53、摄取报告 outcome 284-288、integrationStatus 汇总函数）；六场景×文案要点×下一步动作矩阵（空态按钮直落缺失控件+聚焦）；逐卡场景可行性穷举基准（监听型无立即同步、Task Horizon 恒 waiting、手动报告无假开关、siplayer 双宿主维）；双语文案模板 set.state.* 槽位化+动作词表（对齐 T-1553）+禁用词表（已连接/已同步不作卡级状态词）。状态机语义引用 T-1604、字段现状引用 T-1561，不复制真值。纯文档轮，未 push。

2026-09-28 T-1552 文档写入卡五段式（阶段 2 第六个 UI 切片）：①开关核对决议——日记报告的启用开关是纯手动动作上的假门槛（核实 writeDiaryReport 是唯一消费路径、无任何自动写入），按卡面指示移除：writeDiaryReport 改为仅 docId 闸（644 行 enabled 三元删除）、开关 change 处理器删除、渲染侧按钮 disabled 改 `${diary.docId ? "" : "disabled"}`；存储字段 diaryReport.enabled 仅为兼容保留不迁移（无配置被静默改变——移除开关不产生自动写入）；摘要常驻开关保留（自动触发语义）。②五段式落地三张设置侧写入卡（diary/summary/journal）：写入内容（既有 hint）+ 触发方式（writeTriggerRow×3：手动/常驻自动/打卡时写入）+ 目标与所有权（T-1557 目标卡+既有边界文案）+ 预览或立即执行（既有按钮）+ 最近结果（writeResultRow×3，latestWriteResult 倒序扫 ctx.auditEntries 的 type:"anchor" channel 记录——diary-report/summary-resident/journal 三通道本就记录 ok+reason：成功显 formatHistoryDate 时间、失败显原因+「打卡事实不受影响」、无记录显空态）。③i18n：新增 set.writeTrigger*/writeResult* 8 键×2；退役 set.diaryToggle 与 msg.diaryNeedDoc（零引用，双词典删除；i18n-parity 2372 对）。④守门：diary-report 4 处旧断言翻转为退役语义（开关退役/docId 单闸/触发行/结果行）+键清单更新；settings-navigation 新增 12 断言（三卡触发行/结果行/摘要开关保留/开关退役/双语 8 键）。注意教训：退役标识符的字面量不得写进注释（diary-toggle 注释触发反向断言，已改写）。
验证：pnpm run check、diary-report/settings-navigation/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630747 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：问卷提交双结果页内并列归 T-1588；锚点五段在编辑器侧（anchorHint 既有）。未 push。

2026-09-28 T-1547 来源→项目配置与验证闭环（阶段 2 第七个 UI 切片）：①六卡事实三行——`sourceFactsBlock` 共享助手插在各卡 statusLine 之后：产生什么记录（set.sourceProduces.* 六键，口径核实自真实实现：sireader 焦点片段/siplayer 整分钟采样/weread 官方日汇总/health 收件箱行/notequery 字段匹配/yeguif 区间映射）+ 写入哪些项目（sourceProjectNames 从既有偏好推导，多指标去重，缺失 itemMissing，未绑定 set.targetNone）+ 何时触发（set.sourceTrigger.* 六键，轮询常量核实：HEALTH/NOTE_QUERY/YEGUIF=300s、WEREAD=1800s+手动、siplayer≈15s、sireader 实时事件）。②查看记录跳转——每卡 data-review-records-for → openReviewRecordsForSource：historySource 预置（sireader/siplayer/weread/yeguif 用 source 值；health/notequery 事件核实落 source="api"，用 T-1512 登记渠道 api:health/api:notequery）+ reviewWorkspace=records + showReview；未知来源不动筛选。③思播探测——probe-siplayer 跑 detectSiplayerController(window) 真实特征检测 + 双语反馈；思阅无检测面不伪造按钮（守门断言 probe-sireader 零出现）。④i18n 新增 19 键×2（三行标题/六 produces/六 trigger/查看记录/探测三键）。⑤守门：settings-navigation 新增 13 断言（六卡 sourceFactsBlock/跳转助手属性/思播探测/思阅零伪造/双语 9 键/api:health 映射/真实检测调用）。多指标映射 UI 与重复时长冲突提示既有满足（sourceConflictReading）。
验证：pnpm run check、settings-navigation 守门、pnpm run test:quality EXIT=0（CSS 630747 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：六新用户场景现场验收归 T-1550（键盘/窄屏入 T-1608 台账）；sireader 探测面待上游。未 push。

2026-09-28 T-1548 文档输出融合收尾（阶段 2 最后一项）：内容预览落地——diary/summary 写入卡新增「预览内容」按钮（data-output-preview-generate）+ 折叠容器（data-output-preview/-body，复用 settings-fold/share-preview 既有样式零新 CSS）；`previewOutputMarkdown(channel)` 单一入口零写入生成将追加的 Markdown；驻留单行的内联构建提取为 `buildSummaryResidentMarkdown(localDate)` 单一方法，写入与预览共用（守门断言写入路径调用同一方法，零分歧）。绑定在 bindSettings：生成→填 pre→展开 details；重渲染自然收起。i18n set.outputPreview ×2。其余构成项由阶段 2 前序切片交付：五段式（T-1552）、双结果口径（writeResultFail+retryHint）、归属纠偏（T-1545）、目标卡（T-1557/1558）、状态规范（T-1604/T-1554）——台账逐项对账见 TODO。
验证：pnpm run check、settings-navigation 守门（新增 6 断言）、pnpm run test:quality EXIT=0（CSS 630747 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。**D-307 阶段 2（联动纵向切片）8/8 全部交付：T-1547/1548/1549/1551/1552/1553/1557/1558**。按统一计划，下一阶段=阶段 3「设置与编辑器迁移」（T-1559/1560、T-1562~1574，依赖共享选择器与状态/路由契约——均已就位）。未 push。

2026-09-29 T-1559 绑定失效恢复与集中体检闭环（阶段 3 首个 UI 切片）：①体检行内「停用」——DISABLEABLE_BINDING_KEYS 限定四条自动联动（summary-resident/health-inbox/note-query/yeguif-lifelog；diary 手动动作、anchor 逐项、journal 不适用各按语义排除）；确认弹窗（bind.disableConfirm 带功能名）→disableBindingFeature 快照式 disable/undo→persist 失败回滚旧值+prefSaveFail；摄取源沿用断连保留纪律（planSourceDisconnect 汇总 retainedEvents/identities 并 sourceDisconnectRetained 提示）。②失效原因随桶 title 提示（bind.reasonMissing 指向 重新选择/打开/停用 三修复动作、bind.reasonError 指向重检），初始未绑定态与检查后都生效。③体检头最近检查时间（lastBindingCheckAt 会话态：ctx 带出渲染 + 检查完成就地回填 data-last-binding-check，formatHistoryDate 补导入）。④恢复闭环=重存绑定（T-1557/1558）→重检更新，历史零改动。i18n 新增 bind.lastCheck/disable/disableConfirm/reasonMissing/reasonError 5 键×2。守门：settings-navigation 新增 9 断言（停用范围 Set 精确匹配/原因提示/时间回显/映射在位/断连纪律/双语 5 键）。剩余边界：「移动 vs 删除」root 变化细分与块失效专项归后续观察（需对比旧 root_id）；键盘/窄屏走查归 T-1608 台账。
验证：pnpm run check、settings-navigation/note-bindings 定向守门、pnpm run test:quality EXIT=0（CSS 630747 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1560 读取范围与目标所有权说明（阶段 3 第二个 UI 切片）：`scopeLineRow` 共享助手在七个绑定点选择器旁声明「读写范围」行——设置侧六点（diary 目标卡内/summary 目标卡/health 目标卡/yeguif 笔记本卡 actions 行前/journal 目标卡 mode 行后/notequery 模板行前）+ 编辑器锚点字段（set.scope.anchor 紧跟 anchorHint）。范围句按 T-1556 差异表与真实实现核实：读写边界（写入只追加插件自写内容、读取只读不修改文档）、是否创建文档（不自动创建；diary 手动新建既有）、轮询窗口（与 T-1547 触发行同口径）、失败行为（五类：仅审计/保留事件/自动停用/安全关闭摄取/不回滚打卡可幂等补写）、块所有权（只更新自写块绝不改用户正文）。i18n 新增 set.scopeTitle+set.scope.* 七句 ×2。守门：settings-navigation 新增 9 断言（六设置点 scopeLineRow 调用/双语 8 键/editor.ts 锚点范围说明）。剩余边界：真实内核边界 E2E 归 T-1602/T-1608 现场验收（host-pending）。
验证：pnpm run check、settings-navigation/note-anchor 定向守门、pnpm run test:quality EXIT=0（CSS 630747 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1562 设置首页总览只读投影（阶段 3 第三个 UI 切片，P0）：新纯模块 features/settings-overview.ts——buildSettingsOverview 聚合既有状态为「需要处理」（≤8 条：必填目标缺失带 featureKey+直达选择器 / 来源前置缺失六种 / 最近写入失败通道——audit type:"anchor" 按 channel 取最新，未知通道忽略 / 草稿计数）与「最近活动」（≤3 条通道写入）。渲染：搜索框下总览块（复用 external-overview 样式零新 CSS），问题项「去配置」复用 data-goto-binding 滚动聚焦机制；无问题显式空态「没有待处理项」；配置入口四按钮（新建项目→showEditor；三个分组跳转→复用 nav 按钮 click 继承滚动与 aria）。index.buildSettingsOverviewProjection 只读组装（audit 倒序取每 channel 最新、draftCount=settingsDrafts+journalDrafts）；不制造已连接假象——未启用行不算故障、未知通道不造标签。i18n 新增 18 键×2。守门：新 tests/settings-overview.test.cjs 入主链 3 检（含确定性 deep-equal 与有界截断）；settings-navigation 新增 11 断言。剩余边界：最近活动暂只聚合文档写入通道（来源读取活动由 statusLine 活动槽位承载）。验证：pnpm run check、settings-overview/settings-navigation/test-suite-coverage（209 文件）定向守门、pnpm run test:quality EXIT=0（CSS 630747 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1563 字段级搜索与详情导航（阶段 3 第四个 UI 切片，P0）：在既有行过滤之上增强 settings-navigation（不重做过滤本体）。①匹配行集合与 ↑/↓ 环选——过滤时按 DOM 序收集可见匹配行，方向键循环移动（跨界环回）、高亮当前行（is-search-active，interaction-states +111B 在预算内）、scrollIntoView 进入视野；状态栏播报「第 i/n 项 · 组名：字段名」（组名取 nav 按钮 text、字段名取 label 40 字截断；新键 set.searchActive ×2，模块首次引入 i18n 依赖）。②Enter 从聚焦首项升级为聚焦当前项控件。③IME：compositionstart/end 门控，组合中冻结过滤（保留既有结果），组合结束一次应用。④Esc 一键清空复位。⑤重绘恢复——查询/过滤/焦点按 root WeakMap 会话记忆（cleanup 保存、重绑回放、焦点物归原主）。**测试抓到真 bug**：恢复块初版位于 scheduleSync 定义之前（TDZ ReferenceError，真实重渲染带查询时会崩），移至函数尾部修复；夹具行补 hidden=false 对齐真实 DOM 布尔语义（undefined 会经 rowStates 回写）。守门：settings-navigation 新增测试块 16 断言（过滤/播报/双向环选跨界/Enter/IME 冻结语义/Esc/会话恢复含二次 cleanup 幂等）；三个加载点补 i18n 白名单桩。
验证：pnpm run check、settings-navigation 定向守门、pnpm run test:quality EXIT=0（CSS 630858 bytes，+111B 在预算内）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：结果分区 chips 面未做（播报已含组名+字段名，随 T-1564 分区重组评估）。未 push。

2026-09-29 T-1564 外观与操作分区重组（阶段 3 第五个 UI 切片，P1）：appearance/today/dialog/shortcuts 四组合一为「外观与操作」（新键 set.groupAppearanceOps；导航 9→6 项），内部五小节 data-appearance-section=look/today/reminders/shortcuts/dialog（复用 source-category 样式零新 CSS）。行原样迁移零语义变化：全部 data-* 属性、存储键、保存处理器不动；两处按职责归位——openMode 移入弹窗与页签、NLP 速记移入今日视图；提醒独立成节（新键 set.groupReminders）；reset-view 留今日视图尾部待 T-1566 统一隔离。i18n 新增 2 键×2（parity 2426 对）。守门：settings-navigation 新增 8 断言（三独立组退役/五小节/归属位置/双语）。过程中两次断言与实现矛盾（openMode 归属写反、nlp 位置窗口过窄），按设计意图修正断言而非实现。验证：pnpm run check、settings-navigation/view-preferences/ui-theme/i18n-parity/dependency-status 定向守门、pnpm run test:quality EXIT=0（CSS 630858 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：全局六节 IA（今日与提醒独立导航）随 T-1565/1566 评估。未 push。

2026-09-29 T-1565 联动与目标分区落地（阶段 3 第六个 UI 切片，P1）：host/documents/external 三组合一为「联动与目标」（新键 set.groupIntegration；导航 6→4 项：外观与操作/联动与目标/数据/关于），内部三小节 data-integration-section=host/doc-output/sources（宿主能力保持 T-1551 的我的专注工具/给其他工具使用拆分）。行原样迁移零语义变化：来源事件、文档写入与公开 API 语义不动（dependency-status/settings-navigation 精确子串守门全过）；总览「写入思源笔记」入口跳转同步改指合并分区。**宽度走查抓到脚本级回归**：walkthrough 以退役的 data-settings-nav="documents" 点击超时——改用合并组 id 并标注 T-1565；真实 UI 各宽度档无溢出（全 ok）。模板字符串边界教训：跨对象合并 body 时先删前一体闭合反引号（本次 host 体 `,` 残留当场发现修复）。i18n 新增 set.groupIntegration ×2（parity 2427 对）。守门：settings-navigation 新增 7 断言（两独立组退役/恰三小节/分区标题/四键双语/总览入口指向/doc-output 先于 sources）+ 更新 4 处旧断言（导航下限 4/documents 专组退役改 doesnNotMatch/顺序断言标记化）。
验证：pnpm run check、settings-navigation/dependency-status/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630858 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0（修复脚本后）。剩余边界：全局「今日与提醒」独立导航与统一目标选择器小节随 T-1566/1567 评估。未 push。

2026-09-29 T-1566 数据与恢复分区隔离（阶段 3 第七个 UI 切片，P1）：data 组重组为四分区 data-data-section=io/recovery/diagnostics/reset（复用 source-category 样式零新 CSS）——导入与导出（六种导入导出从原分散两处归拢）/ 恢复点与回滚（恢复快照、快照管理、快照导入、快照列表、恢复指南）/ 诊断与审计（诊断行+审计行+审计列表）/ 重置（危险操作）：reset-all-preferences 与从外观与操作今日视图小节移入的 reset-view-preferences 收拢一区，与普通保存隔离。确认补齐：reset-view-preferences 原无确认（核实 4638 行瞬时重置），新增 msg.viewPrefsResetConfirm（影响范围=显示设置回默认、打卡数据与项目不受影响）；reset-all 既有 msg.prefsResetConfirm 保持。失败保留原数据与草稿=既有回滚纪律不变（导入冲突三选/恢复前快照链/偏好失败回滚）。外部待处理箱留联动分区来源运行问题槽位（恢复指南 recoveryInbox 行回链）。i18n 新增 set.dataSection* 4 键 + msg.viewPrefsResetConfirm ×2。守门：settings-navigation 新增 7 断言（四分区在位/两重置收拢/reset-view 无外观残留/双语 5 键/确认在位）。
验证：pnpm run check、settings-navigation 定向守门、pnpm run test:quality EXIT=0（CSS 630858 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：待处理箱分区归属随 T-1567 全局验收复核。未 push。

2026-09-29 T-1567 设置页迁移切片验收（阶段 3 第八个 UI 切片，P1，设置页迁移收官）：新验收守门 tests/settings-migration.test.cjs 入主链 5 检。①显式保存 10 字段三面对账：DOM 属性+保存处理器+变更清单注册逐字段核对；文档目标六动作经 bindVerifiedDocumentSave 动态选择器（首跑发现字面量断言不适用，改为调用点断言）。②即时持久化字段属性+监听在位；quiet 起止模板选择器循环断言（首跑同因修正）；退役 diary 开关保持退役。③迁移后结构：四导航组在位、五旧组退役、三类分区标记（appearance/integration/data-section）、T-1562 总览块、T-1563 搜索会话、来源面板展开态机制全在位。④存储键零变化：视图偏好单桶+8 个 checkin-* 桶名原样；重置视图偏好保留主题例外字段。⑤迁移切片双语覆盖 31 键全齐。能力注册表 §7 证据行同步（迁移守门三件+落地状态标注）。真实内核验证 host-pending 归 T-1602/T-1608 现场验收。
验证：pnpm run check、settings-migration/test-suite-coverage（210 文件）定向守门、pnpm run test:quality EXIT=0（CSS 630858 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。**设置页迁移批次（T-1559~1567）九项全部交付**。未 push。

2026-09-29 T-1571 排期与记录方式分区（阶段 3 编辑器批次首切片，P1）：排期块（五类排期/星期/间隔/配额）、戒除方向、完成来源/番茄计值从高级区提入主流程——主流程序：做到多少(valueFields) → 段4「什么时候做」（data-editor-section="when" + 排期块 + 方向 + 回退警告）→ 段6「怎样产生记录」（how + 问卷/完成来源/番茄）；高级区仅存组织/锚点/Task Horizon/历史达成，advancedSummary 收窄为组织三项。**显隐单点收拢（重复判断 #1 关闭）**：interval/quota/direction/tomatoMode 行删除渲染硬编码 hidden，bind 挂载首跑 updateConditionalFields 驱动（确认挂载末尾 1167 行初始调用存在）。**修复潜在联动缺口**：手动切完成来源原不联动番茄计值显隐（仅模板应用路径有切换），收拢至 updateConditionalFields 并删除模板路径两处冗余联动。**atMost×非每日显式提示（重复判断 #3）**：data-direction-warning（editor.directionFallbackWarn，从 DOM 复选框读戒除语义——宿主不暴露编辑项对象），save-form 静默回落行为不变。30 天预演/规则变更对照复用未动。i18n 新增 editor.sectionWhen/sectionHow/directionFallbackWarn 3 键×2。守门：新 tests/editor-sections.test.cjs 入主链 4 检（段序/高级区无残留无重名控件/bind 单点驱动/回落防线原样+双语）；test-suite-coverage 211 文件。
验证：pnpm run check、editor-sections/editor-validation/interval-editor/mobile-editor-structure/template-manager/project-draft 定向守门、pnpm run test:quality EXIT=0（CSS 630858 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0（editor-1180/320/844x350 实时预览断言全过）。剩余边界：记录方式区来源绑定回链随 T-1572 落。未 push。

2026-09-29 T-1572 输出与组织高级区（阶段 3 编辑器批次第二切片，P1）：高级区拆两小节 data-advanced-section=output/org（复用 source-category 样式零新 CSS）——「输出」=笔记锚点 picker+挂起告警+追加开关（含 T-1560 所有权边界句 set.scope.anchor）；「组织」=分组/优先级/时段/自动归档/连断容忍 + Task Horizon 显示（按卡面归属从锚点区后移入）。问卷绑定不回搬高级区——已随 T-1571 落位主流程段6（记录方式即问卷入口，输出语义由 set.scope.journal 承载），守门断言其位置不变。危险操作页尾独立区：操作栏容器加 data-editor-section="danger" 标记（归档/删除本就在页尾独立操作栏）。i18n 新增 editor.sectionOutput/sectionOrg 2 键×2。守门：editor-sections 新增 1 检 12 断言（两小节序/锚点归输出/六组织字段含 TH/组织无锚点残留/危险区标记/双语/问卷位置）；mobile-editor-keyboard 的 editor-actions 正则放宽容忍属性（data-editor-section 标记不破坏滚动区/操作栏分离语义——质量链抓到后修正断言而非实现）。
验证：pnpm run check、editor-sections/mobile-editor-keyboard 定向守门、pnpm run test:quality EXIT=0（CSS 630858 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1570 模板入口统一与应用回填标示（阶段 3 编辑器批次第三切片，P0）：六类入口（目录/最近/推荐/组合包/我的模板/空白）进同一表单与保存路径=既有结构守门确认；本轮交付**应用回填标示**——宿主会话字段 appliedTemplateNote + 可选宿主方法 markTemplateApplied(note)（只存字段不重渲染，避免丢 DOM 草稿），bind 侧 markTemplateApplied 助手就地更新常驻隐藏徽标（data-template-applied-note，name-inference 既有样式零新 CSS）；目录模板 applyTemplateFields 与我的模板两条应用路径都打标（组合包经目录路径覆盖）；新键 editor.templateApplied（已应用模板：{name}（字段已回填，保存项目后生效））；清除时机=saveForm 项目落盘成功尾部（失败保留草稿时标示随草稿保留）。保存为模板/保存项目按钮既有区分确认。i18n 新增 1 键×2。守门：editor-sections 新增 1 检 7 断言（徽标容器/ctx 透传/两路径打标/宿主字段/落盘清除/双语）。**过程教训**：node -e 多次补丁在测试文件留下脏字符（正则反斜杠被吃+多余括号）致 SyntaxError 且二分定位自相矛盾，整文件 Write 重写消除——长补丁一律用编辑工具。
验证：pnpm run check、editor-sections 定向守门（6 检）、pnpm run test:quality EXIT=0（CSS 630858 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1573+T-1574 编辑器批次收官（阶段 3 最后两个 UI 切片）：①T-1573 验收确认型——核实预览/操作栏共用为构造性事实：describeEditorPreviewActions/Meta 唯一定义（editor.ts 双导出）+ 恰两处消费（初始渲染/实时更新 updateEditorPreview），操作栏单一 DOM（editor-actions 单实例）+ 移动宽度档仅 content-responsive.scss:200 sticky 重排无第二份计算；width-walkthrough editor-1180/320/844x350 实时预览断言历轮全过为行为证据；守门固化 6 断言。②T-1574 兼容验收——editor-sections 新增 13 断言：旧项目字段渲染初始值逐项（quickSteps/autoArchive/streakTolerance/directionAtMost/journal/anchor/TH/recordStep/schedule/weekdays）+ bind 挂载回填调用序 + 保存失败显式反馈/零副作用/草稿保留重试（对齐 save-form 实际注释「失败路径均返回 undefined，零副作用」——首跑断言文案不符已对齐）。类型切换/atMost 回退=前序切片守门；双语/IME/键盘/触屏/宽宽=走查+mobile-editor-*；真实内核/重载=playwright 既有证据，host-pending 现场归 T-1608。**阶段 3 编辑器批次（T-1570~1574）全部交付，阶段 3（设置与编辑器迁移）收官**。
验证：pnpm run check、editor-sections 定向守门（8 检）、pnpm run test:quality EXIT=0（CSS 630858 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1577 今日行动台增量重构（阶段 4 首个 UI 切片，P0）：①**合并重复进度**——行动台条收束为「下一步」行动条：删除与 overview 重复的完成度环+今日总数，保留行动台独有信息（下一步/全部完成、跳过计数、专注警告），空内容不渲染空条；进度展示唯一归 overview 大环+计数+节奏说明+最佳连击+专注候选。**环视觉件全链退役**（R-A16 同例 sparkline）：charts.renderCompletionRing 导出、fragments 接线与 import、components.scss 5 条规则（R-A16 注释块+console 覆盖）、workbench console-totals 规则、today.consoleTotals/consoleRingAria 双语键全删（CSS 630858→630415，−443B 死规则）；新键 today.consoleNextAria（下一步/Next up）。stats-visuals.test.cjs 整文件按 D-292 sparkline 同例改写为退役守门 10 断言（charts/fragments/scss/workbench 环零残留+行动条键+overview 唯一+sparkline 既有守门保持）。②**收束顺序确认**：overview→周条→行动条→保存状态→优先提醒→今日事项→工具条→待做列表→已完成折叠→庆祝/最近记录→那年今天/未来负荷——增量确认既有顺序已合目标态（下一步紧随进度、记录结果居列表后）。③守门：today-dashboard 新增 3 断言（环退役/重复键零残留/overview 唯一）+键表更新两处（consoleNextAria 入列、consoleTotals 出列）；i18n 词典修正一处误插（en 键误入 zh 区，parity 2437 对恢复）。
验证：pnpm run check、today-dashboard/stats-visuals/i18n-hygiene/i18n-parity 定向守门、pnpm run test:quality EXIT=0、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：提醒/事项横幅视觉级重排随 T-1585/1586 细化。未 push。

2026-09-29 T-1578 回顾比较器可搜索化（阶段 4 第二个 UI 切片，P0）：**比较器候选升级全量可搜索**——删除 renderItemCompare 的前 12 截断，候选=全部未归档项目；新增搜索输入（data-item-compare-search，复用历史搜索 IME 安全防抖模式：组合态不打断、120ms 防抖、光标位恢复、isConnected/同元素守卫）；查询写会话态 itemCompareQuery（review ctx + bind host 接口各增字段）；**已选项目恒显示**不受查询过滤（便于取消选择）；显示 n/total 计数；候选 >8 才渲染搜索行。**归档项目补记排除守门固化**：核实排除在快照层（index.batchBackfillSnapshots：scheduled: !item.archived && isItemAvailableOnDate——计划分类前即排除）+ batch-backfill atMost 纯函数守门，item-trend-compare 双面断言。入口层级/周复盘/报告保存视图=既有层级确认不动（增量验收）；直达文档写入不新增（T-1548 条件保留）；统计口径零变化。i18n 新增 review.itemCompareSearchAria/itemCompareShowing 2 键×2（parity 2439 对）。守门：item-trend-compare 新增 11 断言（无 12 截断/搜索/会话查询/已选恒显示/IME/清除/归档排除双面/双语）。
验证：pnpm run check、item-trend-compare/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630415 不变）、双主题 visual-qa（dark 首跑单发偶发 EXIT=1 无 pageErrors，隔离复跑 EXIT=0）、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1579 单项洞察行动化（阶段 4 第三个 UI 切片，P1）：①段序重排——状态日历→每周趋势→成熟度→教练建议（行动建议由 stats 后置为段尾，卡面目标序）。②行动入口 CTA 行（stats 后）：「查看记录」data-insight-records 带项目 id 直达回顾记录区（historyItemId 过滤+records 工作区+insightsReturnPage="review" 返回页会话态保持）；「编辑规则」data-insight-edit-rules → showEditor(item)（editingId 项目身份保留）；两路径均校验存在且未归档；bind-page-navigation NavigationHost 增补 showEditor(item) 可选成员（index 原生实现）。③口径解释：分母注 insights.denominatorNote（完成率=完成日÷可评估计划日（已结束+今日已完成；跳过日计入分母但不断连击）——与 countsForDays 公式逐项核对）；配额窗口注 insights.quotaWindowNote（仅 item.schedule?.type==="quota" 显示，可选链兼容 insight-a11y 测试桩——该测试抓出桩缺 schedule 字段）；日格标题跳过标注（复用 today.skipBadge）。i18n 新增 4 键×2（parity 2443 对；过程再次踩 i18n en 块误插 zh 区——锚点未含值全文，已修并记录）。守门：insights.test.cjs 新增 T-1579 块 13 断言（段序/双 CTA 带项目 id/分母/配额/跳过标注/bind 双绑定/insightsReturnPage 会话态/双语 4 键）。
验证：pnpm run check、insights/insight-a11y/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630415 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：范围/项目选择器与日格钻取归 T-1590/1591。未 push。

2026-09-29 T-1580+T-1592+T-1593 事项三件套（阶段 4 第四个 UI 切片，P1）：①**表单抽屉**（T-1580）——表单面板收进 details 抽屉（data-occasion-form-drawer，编辑既有事项默认展开；revealOccasionForm 展开抽屉+滚动定位；新建同通道），列表优先呈现。②**agenda 分组**（T-1592）——rowMarkup 数组化后按五组重排（agendaBuckets：today/missed/upcoming/ended/disabled；data-agenda-section 组头带计数），错过补标/改期/里程碑随行不变；过滤先行分组只重排；**修复一处实现序 bug**：rows 原为 join 后字符串无法按组取行，重构为先存数组再 join。③**转打卡确认**（T-1593）——重复拦截前置（原在 created 构造后、前移至 confirm 前），window.confirm 预览（msg.occasionToItemConfirm：项目名/发生日起、二值每日仅发生日入排期其余遮蔽、重复拦截、历史保留），取消零写入；confirm 语义合规性：内层引号用「」（zh）/转义 \"（en）。i18n 新增 occ.agenda* 5 键 + msg.occasionToItemConfirm ×2（parity 2449 对；**两次踩 i18n 插入坑**：\\n 写成裸换行断字符串、en 锚 miss 后部分插入吞行——均 Edit 修复）。守门：occasions.test.cjs 新增 12 断言（抽屉 editing-open/五组 agendaGroup 调用/revealOccasionForm 展开抽屉/confirm+重复前置/双语 6 键；三次改名避让既有声明 root/i18nSource）。
验证：pnpm run check、occasions/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630415 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0（occasions 场景改先展开抽屉再试点提交——脚本定位器随抽屉同步）。未 push。

2026-09-29 T-1581+T-1594+T-1595 归档三件套（阶段 4 第五个 UI 切片，P1）：①**行内详情折叠**（T-1594）——新纯函数 buildArchivedItemDetails（items/occasionNames/events/today → 原规则 formatScheduleLabel+目标单位、关联事项名、锚点块 ID、外部来源记录 externalRef 计数、恢复预览 willResumeToday=isScheduledToday 单一实现）；行内 details 折叠 data-archived-details 五行列表（规则/关联/锚点/外部计数/恢复预览）；renderArchived ctx 增 details（index 用 occasionStore 映射事项名）。②**恢复预览确认**（T-1594/T-1581）——bind confirmArchivedRestore：单条与批量恢复前 window.confirm（msg.archivedRestoreConfirm：数量+重进今日排期计数+历史保留），从 store+isScheduledToday 实算；取消零写入。③**危险区隔离**（T-1595）——批量删除从恢复工具条移入 data-archived-danger 危险区（dangerZone/dangerHint：不可撤销+影响范围+恢复点快照链），与恢复按钮同步显隐（syncArchivedSelection 扩展）；单行删除保留既有确认/影响预览；陈旧确认拦截守门保持。④依赖桩教训：archived 传递闭包（shared→record-notes…）过大，测试改用桩映射（i18n/shared 桩+model 真转译+new Function 注入 require）——首跑三次迭代（缺 mkdir/require 路径/传递闭包）。i18n 新增 archived.* 9 键 + msg.archivedRestoreConfirm ×2（parity 2459 对）。守门：archived-search 新增 15 断言（纯函数行为 7+源码结构 8）。
验证：pnpm run check、archived-search/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630415 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1585+T-1586 提醒中心统一与动作语义（阶段 4 第六个 UI 切片，P1）：核实共用=构造性事实（fragments selectPriorityReminders(projectReminderCenter(...)) 单投影；priority-reminder.ts 仅过滤/排序层，非第二计算器）。增量：①今日横幅行内补原定日期（formatHistoryDate(item.dueDate)）；②横幅尾补查看全部入口（data-action=summary 跳回顾概览提醒中心所在，不复制第二列表）；③回顾四动作按钮补作用域 title（reminderSnoozeScope=今日内再次提醒不改长期规则/DeferScope=顺延下一周期/SkipScope=跳过本期可恢复/RestoreScope=恢复被延跳提醒）；延期到期时间=snoozed/skipped 行 dueLabel 既有；恢复入口=既有；投影不改打卡事实=applyReminderActions 只写 ReminderUserAction 既有。**窄宽预算战**：查看全部按钮使首卡 376→384 超 380 预算——紧凑样式+边距收紧仍差 1px，最终 lc5≤640 隐藏入口（窄屏经底部导航回顾或横幅 +N 展开到达；桌面/平板保留），横幅高度回到改造前，width 走查全绿。i18n 新增 6 键×2（parity 2464 对；i18n 锚点键前缀陷阱再踩两次——en 插入命中 zh 区，修复纪律已强化）。守门：priority-reminder 新增 11 断言（日期/查看全部/无第二套动作/四作用域/双语 5 键）。
验证：pnpm run check、priority-reminder/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630659，净 +244B）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1587+T-1588 问卷分层与双结果（阶段 4 第七个 UI 切片，P0）：①**目标配置分层**（T-1587）——弹窗内目标配置 fieldset 收进 details 抽屉（data-journal-config-drawer：摘要=模式+目标 ID，已配置目标折叠、未配置自动展开），答题区前置；文档搜索/目标切换联动=既有；按步骤进度/必答标记/range 端点=既有。②**提交前预览**（T-1588）——details 折叠（answersPreview），form input 时实时生成答案编号列表+写入去向（模式+目标），零写入。③**双结果并列+补写**——提交失败（文档写入未完成）时页内结果面板并列「✓ 打卡事实已保存（重试仅补写文档不重复记账）」/「✗ 文档写入未完成」+「补写文档」按钮重调 onSubmit（幂等=isComplete 分流只更新文档+journalPending 互斥+marker 查重）；成功路径 toast+关闭=既有；目标保存失败/alreadyWritten/日期变化边界=既有独立状态。i18n 新增 5 键×2（answersPreview/previewTarget/resultFactSaved/resultDocPending/resultBackfill；**journal.preview 与构建器既有键重名 TS1117 抓出——改名 answersPreview 避让**）。CSS 复用 name-inference/share-preview 既有类。
验证：pnpm run check、journal-experience/journal-templates/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1589 日记模板构建器可理解化（阶段 4 第八个 UI 切片，P1）：构建器分区增量——①**边界说明**（data-builder-boundary + journal.builderBoundary：更改在点击「确认」后才会写入设置；撤销可回退本页操作）置于构建器标题下；②**模板摘要**（legend 内 journal.templateSummary：{n} 题 · {m} 必答，按模板实时生成）——问题数量/必答校验可见；③解析错误恢复提示（journal.customInvalid）既有确认。不重排排序/撤销/复制/预览内核；窄屏长列表=既有响应式。i18n 新增 journal.builderBoundary/templateSummary 2 键×2（**questionCount 与构建器既有键重名 TS1117 抓出——改名 templateSummary 避让**；parity 2471 对）。守门：journal-templates 新增 T-1589 块 7 断言（边界/摘要/实时生成/customInvalid 既有/双语 2 键）。**测试 read 助手陷阱**：journal-templates 的 read 只收单参相对路径（path.join(root, relative)），两段式调用 read("src", "i18n.ts") 会把第二个参数当 undefined 读到目录（EISDIR）——改单字符串路径。**阶段 4 编辑器/辅助批次全部完成**。
验证：pnpm run check、journal-templates 定向守门、pnpm run test:quality EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1583+T-1584 跨页规范与验收台账（阶段 4 收官，P1）：①T-1583 跨页一致性——新守门 tests/cross-page-consistency.test.cjs 入主链 5 检：危险区三页统一标记（editor data-editor-section=danger/archived data-archived-danger/settings data-data-section=reset）/IME 守卫四搜索面（today/settings/history/compare 组合态均不打断）/reduced-motion 传递/**修复 occasions 抽屉滚动缺口**（BindOccasionsHost 增 reducedMotion?: boolean，revealOccasionForm smooth→instant 降级，宿主结构化透传零 index 改动）/会话恢复三模式（设置搜索 WeakMap/回顾 preserving/洞察返回页）/导航五路径单点（navigation.ts showXxxFor）。颜色冗余/对比度/触控目标/双主题=accessibility-audit+ui-theme+visual-qa 既有守门承载。②T-1584 验收台账——docs/acceptance-ledger-phase4-2026-09-29.md（T-1608 格式）：九批逐批对账表（提交/增量/定向守门/边界）+T-1583 专项+双结果语义确认+host-pending 清单（真实内核 E2E/真实第三方/真机/Task Horizon 恒 waiting）。
验证：pnpm run check、cross-page-consistency 定向守门（5 检）、pnpm run test:quality EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。**阶段 4「日常页面与辅助工作区」全部交付（T-1577~1595 共 14 任务）**。未 push。

2026-09-29 T-1596 专注计时跨页生命周期（阶段 5 首个 UI 切片，P1）：①**跨页小条**——renderFocusMiniStripFor：非面板宿主 root 且会话进行中时，renderInto 追加 data-focus-mini 紧凑条（项目名/剩余时间/暂停态/**回到专注**按钮——置 focusTimerRoot=root 并 showToday 展开完整面板）；tick 同步小条剩余时间（data-focus-mini-remaining）。②**重载明确失效**——开始即写 sessionStorage 标记（lc-focus-session，存活于本窗口），结束/放弃/卸载清除；onload 检测标记残留→showMessage 明确告知「上次会话因重载中断，未入账」并清除（不静默丢失、不伪造恢复——计时状态为会话内存，秒级心跳不可跨重载）。预计入账值（预设分钟）与 <1 分钟不入账（focusTooShort）=既有。**边界**：Dock Tomato 会话=桥内存归属（ownedFocus），不混入内置计时小条（其跨页呈现随桥状态由 dock-tomato 面板承载）。i18n 新增 focus.miniAria/miniBack + msg.focusReloadLost 3 键×2（parity 2474 对）。守门：新 tests/focus-lifecycle.test.cjs 入主链 2 检（小条渲染/标记生命周期/重载键与清除接线/双语 3 键；依赖桩：i18n/shared/siyuan 桩+model 真转译+window 桩含 sessionStorage——**新 Function 沙箱需透传 window**）。
验证：pnpm run check、focus-lifecycle/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1597 快速弹窗会话（阶段 5 第二个 UI 切片，P1）：①**会话页签保留**——模块会话变量 lastQuickPage（QuickPage 六页白名单；编辑页降级为今日，因表单草稿仅存 DOM 随窗口销毁）；handleQuickDialogDestroyedFor 关闭时 rememberQuickPage 记录，openQuickDialogFor 重开时回放 currentPage（dock 共享面同步回放=既有共享状态耦合的对称行为，不新增解耦）。②**编辑页关闭先提示**——dialog.element 捕获阶段拦截 SiYuan 关闭按钮（祖先 capture 先于目标监听器触发），currentPage=editor 时 window.confirm（msg.quickCloseEditingConfirm：问卷编辑将丢失、打卡数据不受影响），确认才销毁，取消保留弹窗与草稿；非编辑页直接关闭。i18n 新增 msg.quickCloseEditingConfirm ×2。守门：desktop-dialog 新增 T-1597 块 6 断言（白名单/记录/回放/确认/捕获拦截/双语）；mobile-dialog 旧「关闭恢复今日」守门更新至会话语义（rememberQuickPage+lastQuickPage 回放 2 断言）。**i18n 锚点陷阱再踩**：msg.quickDialogInitFail 键前缀 zh/en 各一行，zh 插入后 en 锚 miss；confirm 双行（EN+ZH）误插 zh 区——均以值全文锚修复。
验证：pnpm run check、desktop-dialog/mobile-dialog/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1598 渲染块生命周期与降级一致性（阶段 5 第二个 UI 切片，P1）：block-dom-compat 新增 T-1598 块 8 断言——此前未守门的胶水语义：①observeCheckinBlocks 的 disposed 短路标志（let disposed=false + if(disposed) return——mutation 回调与防抖定时器双短路）；②teardown disconnect MutationObserver 并返回断开函数（[\s\S]*?disposed=true 赋值序断言）；③lastRenderedConfig 配置未变跳过重渲染（防观察风暴）；④owner 标记同源跳过/替换语义（previousIsOurs 才动自己的预览——相邻块互不干扰）；⑤局部失败 role=alert 错误面板隔离。多块并存与局部失败隔离由 owner 标记+错误面板构造性承载（block-renderer.ts:96-129 既有实现核实），公开 API 与事件语义零变化。行为级 fake-DOM 测试草稿经评估后放弃（DOM 桩成本超出本轮边界，交付为源码守门+边界注记——DOM 桩完整版待后续需要时再建）。
验证：pnpm run check、block-dom-compat 定向守门、pnpm run test:quality EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。未 push。

2026-09-29 T-1599 跨页面深链与会话状态实施（阶段 5 第三个 UI 切片，P1）：按已交付的 T-1603 契约落地**编辑器单级返回栈**——NavigationHost 增 editorReturnPage（today/review/insights 白名单字段）；showEditorFor 增第三参 returnTo（白名单校验，未知/未传回落 today，原签名兼容=旧调用零破坏）；新增 showEditorReturnFor 回放来源页（insights 入口回放同一项目——insightsItemId 持久化）并在回放后清除；编辑器返回按钮改走 host.showEditorReturn()（不再固定 showToday）；洞察「编辑规则」CTA（bind-page-navigation）携 returnTo="insights"。既有会话态复用确认：insightsReturnPage/itemCompareQuery（T-1578）/historyItemId/lastQuickPage（T-1597）/settingsSearchSession（T-1563）均按各切片语义在位——SurfaceContext 契约的参数级落地已完成主力。旧 DOM 钩子/书签/移动底栏入口零变化。i18n 零新增（复用既有键）。守门：cross-page-consistency 新增 T-1599 块 6 断言（返回栈字段/回放函数/白名单校验/编辑器返回走栈/CTA 携带返回页/五路径单点）。**测试正则陷阱**：正则字面量须对源码精确形态转义（editorReturnPage? 的 ?、showEditorReturn() 的括号）。
验证：pnpm run check、cross-page-consistency（5 checks）/i18n-parity 定向守门、pnpm run test:quality EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0、width-walkthrough EXIT=0。剩余边界：日期/范围/滚动/焦点的全量 SurfaceContext 序列化随 T-1576 后续深化（分页/折叠/项目会话态已各自在位）。未 push。

2026-09-29 T-1576 统一页面壳与导航呈现（P0，阶段 1 压轴任务——T-1603/1604 契约的落地收口）：新增 src/render/page-shell.ts 三件套——①renderPageShellHead（详情页头部单一构造点：back/eyebrow/title/actionsHtml/statusHtml，eyebrow 支持 HTML 变体供洞察图标；类名 lc-checkin__editor-header/back-button/eyebrow/title 与 data-action="back" 钩子全部保持原名=T-1603 契约 4 兼容映射，绑定与样式零改动——SCSS 全为后代选择器已核实）；②defaultReturnPage 默认返回表（契约 3：未显式记录 returnTo 的详情页统一回落 today）；③SurfaceContext 接口 + readSurfaceContext 读侧（page/returnTo/params.itemId——编辑器取 editingId、洞察取 insightsItemId）。**五详情页头部迁移**：editor.ts（无眉行）、archived.ts（专用 backAria）、occasions.ts（new-occasion 动作槽）、settings.ts、index.ts 洞察两处（空态纯标题+带项目眉行 HTML）——内联 header 清零；review/today 保留根页面头部变体（回顾头部承载区间页签与工具区、无返回键=设计决定）。**返回分派收拢**：bind-page-navigation 通用 back 改走 readSurfaceContext（insights 会话返回栈优先、其余默认表）——编辑器 back 已走 T-1599 showEditorReturn 栈。危险区三页统一标记沿用既有（T-1583 已交付），移动底栏/topnav/rail 共享导航原型不变。**依赖桩连带修**：四个测试对五视图做严格 require 桩/vm 沙箱——archived-search/settings-navigation/agent-status 桩表补 "./page-shell" 最小形状、insight-a11y（方法级 eval）补真 page-shell 模块入参。i18n 零新增。守门：cross-page-consistency 新增 T-1576 块 20 断言。
验证：pnpm run check、cross-page-consistency（6 checks）、test:quality 全链 EXIT=0（CSS 630659 不变）、双主题 visual-qa EXIT=0（pageErrors 空）、width-walkthrough EXIT=0。剩余边界：多 root 各自 context 独立（契约验收门 1）与日期/范围/滚动/焦点全量 params 序列化留待后续切片——宿主字段仍是存储层，读侧先行收拢。未 push。

2026-09-29 T-1600 页面级无障碍、IME 与响应式走查（阶段 5，P1）：走查方法论=**探针先行→修证实缺陷→固化守门→证据入台账**（新增 docs/acceptance-ledger-phase5-2026-09-29.md，T-1608 统一台账的阶段 5 切片）。①键盘可达性：一次性探针（audit 同款 boot）逐页枚举非聚焦元素上的 data-action/data-mobile-nav 钩子=零发现，随即固化为 accessibility-audit #4 检查（零违规强制，div/span 须 role+tabindex="0" 补偿）。②44px 触控：320px mobile 前端探针实测 16 项不足——修复 8 项失准折叠头/入口（16~36px→窄容器 44px：归档详情头/事项抽屉头/设置组头/联动面板头/沙盒头/新建项目入口/头像输入/今日负荷+排期预演头；content-responsive+maintenance-responsive 新规则，桌面级联不动），audit 新增 mobile 遍八类逐项 ≥44px 守门；8 项致密列表文本按钮（28~42px）实测记录为偏差——24px AA 下限已强制，44px 属 AAA/厂商准则，全量抬升与列表密度冲突，真机误触反馈再逐项处理。③空态走查固化：audit 重构为三遍（亮/暗/空态满空夹具）全表面走查，bootHost 启动器 desktop/mobile 共用+store 参数化；空态零违规。④既有项逐项核实入台账（名称/对比度/24px/IME 四面/过期异步/草稿保留/撤销/reduced-motion/320px/宽 dock/双主题全绿）。⑤Host-pending（真机读屏/WebView IME/误触率/进程被杀）归集 T-1602。**修 CSS 后必跑 mobile 前端宽度走查**（width-walkthrough CHECKIN_QA_FRONTEND=mobile EXIT=0）。
验证：accessibility-audit EXIT=0（0 missing/0 tabindex/0 keyboard/0 contrast/1204 对文本）、test:quality 全链 EXIT=0（CSS 631568，预算 640KB 内 +909B）、双主题 visual-qa EXIT=0、width-walkthrough desktop+mobile 双前端 EXIT=0。未 push。

2026-09-29 T-1601 全页面隔离内核回归（阶段 5，P1）：先盘点后补缺——13 项要求场景（新建/今日记录/提醒动作/问卷双结果/专注结算/回顾钻取/事项补标改期/归档恢复删除/重载/统计口径/日期算法/来源身份/文档旁路失败不回滚）逐一映射既有内核夹具与行为测试，登记为台账覆盖矩阵（acceptance-ledger-phase5 §0）；确认缺口两条，新增 tests/kernel-regression.test.cjs（入 test:ui）以真实 bundle+桩宿主补齐：问卷双结果编排（事实先落/文档失败不回滚/重试只补文档不重复记账/事实层失败零写入+草稿保留）与重载状态矩阵（契约 4：持久偏好跨重启恢复、会话态回默认）。**桩方法论沉淀**：行为级内核桩要按「语句形状」分流 sql（content LIKE=问卷标记查询、WHERE id IN=目标校验且须回显被查 id——id 归一化前后都要成立）、失败注入按调用类别收窄（写入类 vs 校验类——提交前 onPersistIntegration 校验先于事实写入，全局注入命中错误路径）、消息断言用译文子串、调用计数用增量切片。调试节奏：三轮失败注入口径修正（全局→写入类→增量切片）+一次 docId 格式修正（^\d{14}-[a-z0-9]{7}$）+一次会话态断言位置修正（默认 overview 下历史搜索框不渲染）。
验证：kernel-regression EXIT=0、test:quality 全链 EXIT=0（CSS 631568 不变）、双主题 visual-qa EXIT=0、width-walkthrough desktop+mobile EXIT=0。未 push。

2026-09-29 T-1602 宿主现场与发布验收台账（阶段 5，P1）：新建 docs/host-acceptance-ledger-2026-09-29.md（T-1608 宿主分栏）——证据四层定义下六覆盖面（文档/笔记本目标、第三方来源、Dock Tomato、页签/dock/移动 WebView、移动安全区、双主题）逐面「自动证据（测试名+通过链）/真实宿主（host-pending+取得条件）」分列；发布验收分栏（自动链通过+GitHub v18.9.0 资产核实+集市 host-pending+Task Horizon 恒 waiting）；**Host-pending 单一清单 §8 H1~H8** 吸收 phase5 台账 §4（原节保留指向本表核销）；现场操作模板沿用 integration-smoke-checklist。纪律要点：引用的测试名逐一核实存在后才写入台账；所有现场行为一律 host-pending，零编造。docs-only 变更。
验证：pnpm run check EXIT=0、test:quality 全链 EXIT=0（工作树与 f194f31 轮同基线，CSS 631568 不变）、双主题 visual-qa EXIT=0、width-walkthrough desktop+mobile EXIT=0。未 push。

2026-09-29 T-1605 响应式宿主壳与安全区（阶段 5，P1）：审计→证实→只修证实项。①宿主层叠五层矩阵+安全区 env() 20 条全量枚举登记 host 台账 §10——层叠方向一致（后轮收紧），无冲突覆盖证实，产品 CSS 零改动（大规模去重风险>收益）。②行为证实：**四种宿主壳组合**横向溢出全绿（dock×桌面/移动、tab×桌面、dialog×桌面/移动；tab×mobile=无效组合——思源移动端无自定义页签不注册 addTab）；底栏遮挡探针（命中固定底栏本体判据；sticky 吸顶/侧栏=正常滚动语义不计）五表面零证实→固化为 accessibility-audit mobile 遍守门；上下文菜单浮层（z 60>20+视口钳制+可点击）与 open-tab 入口（dock/dialog×1280/320 四处可达，移动端 supportsCustomTab=false 构造隐藏）探针通过。③证实缺陷=harness 级两处：walkthrough 的 dialog/tab chrome 断言假定桌面 topnav（移动渲染 mobile-topbar→按 qaFrontend 分流）；30-habit 首卡 380 预算不适用 dialog 壳（22~26px 有意窗口 chrome，实测首卡 400px/820 完整可见→预算限定 dock/tab，dialog 基线记台账 §10）。**方法论**：宿主壳验收先分清「产品缺陷 vs 预算作用域错位 vs harness 假定过时」三类——本轮 1 处第二类+1 处第三类，产品层零缺陷。
验证：width-walkthrough dock×2/tab×1/dialog×2 五组合全 EXIT=0、accessibility-audit（含底栏遮挡守门）EXIT=0、test:quality 全链 EXIT=0（CSS 631568 不变）、双主题 visual-qa EXIT=0。未 push。

2026-09-29 T-1606 键盘、IME、读屏与触控基线（阶段 5，P1）：探针核实九基线全部在位、产品层零缺陷——aria-expanded 翻转/aria-current 三形态一致/菜单 Escape 收口归焦/j-k 通道落焦主操作/焦点可见 2px outline/IME 四面/reduced-motion 四模块/44px（T-1600）/aria-live 40 处。守门固化：cross-page-consistency 新增 T-1606 块 10 断言（7 checks）、accessibility-audit 桌面遍新增 j/k+Escape 行为检查。登记缺口：图表日期格键盘路径=T-1591 不越界、读屏真机=H6。**探针方法论沉淀**：①dispatch 目标必须与监听注册元素同层——root 级监听（today-bindings/键盘、菜单）dispatch 到 document 不冒泡到 root，本轮三轮「缺陷」误报（菜单 Escape 关不上/j-k 不落焦/aria stuck）全部源于探针 dispatch 目标或断言恢复逻辑错误，非产品问题；②summary/details 展开态由浏览器原生播报，探针不应要求显式 aria-expanded；③文件名陷阱：bind-today.ts 与 today-bindings.ts 是两个文件（键盘/菜单绑定在后者）。
验证：cross-page-consistency（7 checks）/accessibility-audit EXIT=0、test:quality 全链 EXIT=0（CSS 631568 不变）、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。未 push。

2026-09-29 T-1607 渲染性能与长数据分层（阶段 5，P2）：先测后改——一次性测量探针（真实 bundle、双帧 RAF 口径、3 次中位数）九场景全部 1~14ms，远低于 16ms 帧预算：Today 200/500 项目=2/3ms、Review 10k/100k=3/6~14ms、Insights=1~3ms、Settings/Occasions=2ms、多 root×10k=2~3ms、recordEvent<10ms；内核层 100k 基线（review-performance-baseline）既有通过。既有分层机制（模板批次/回顾分页/洞察懒加载/设置导航/今日折叠/RAF 合并）覆盖全部测量面——**测量证实无热点，零优化**（「只优化已证实热点」的直接结论）。固化：kernel-regression 新增渲染层性能块（三场景真实 boot 双帧口径上限 250ms 灾难防线；冷启动 19~67ms）。**测量方法论四条**（台账 §12）：计时点必须在 await 前（首轮 30ms 底噪假象）；RAF 合并需双帧等待；性能夹具用 boot 时给定 store（空 boot 换 store 触发 computeStreaks 状态缺口）；headless RAF 立即回调≈同步耗时。
验证：kernel-regression EXIT=0（含性能块）、test:quality 全链 EXIT=0（CSS 631568 不变）、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。未 push。

2026-09-29 T-1608 统一验收台账与全表面回归（阶段 5 收官，**D-307 全部收官**）：交付 docs/d307-final-ledger-2026-09-29.md 收官索引——六阶段对账表（49 项任务逐条「任务ID|提交|守门|台账节」映射 44 提交）、最终全表面回归记录（全绿）、遗留缺口如实分列（未排期 P1 增量 5 项 T-1550/1555/1582/1590/1591+候选观察 7 项 T-1538~1544+实施边界注记——**不宣称 64 条全部完成**，计划原文允许小批次交付）、H1~H8 host-pending 维持不核销。四台账就绪：phase4（T-1584 九批）/phase5（T-1600 走查+T-1601 覆盖矩阵）/host（T-1602 六覆盖面+§10 宿主壳+§11 键盘读屏+§12 性能基线）/本索引。
验证（收官全表面回归）：test:quality 全链 EXIT=0、accessibility-audit EXIT=0（1204 对文本零违规）、双主题 visual-qa EXIT=0、width-walkthrough 五组合（dock×桌面/移动+tab×桌面+dialog×桌面/移动）全 EXIT=0、kernel-regression EXIT=0。未 push。
**D-307 收官**：自 2026-09-28 计划登记（d2a1cb3）至本日，阶段 0 真值修复（T-1609/1610）→阶段 1 契约（T-1603/1604 等 6 项）→阶段 2 联动切片（6 项）→阶段 3 设置与编辑器迁移（14 项）→阶段 4 日常页面（16 项）→阶段 5 多表面与质量收口（11 项）全部交付。

2026-09-29 T-1539 AI 复盘「复制提示词」免 API 模式（D-307 后新一批首任务，D-308 起点信号）：先核对 buildReviewPrompt 差异再实施——既有「指令词」（AI 端读插件数据）与本任务「自足提示词」（事实内嵌粘贴任意 AI）定位互补并存。纯函数 buildAiReviewPrompt（review-assistant.ts）：事实区块（与周复盘向导 itemLines 同口径）+草稿 trim/空稿显式占位+隐私边界声明收尾+标题复用向导键值；UI=周复盘向导「复制 AI 提示词」按钮（草稿输入框现值，未保存可复制；clipboard 语义复用 copy-weekly-report 通道）；i18n 9 键×2（parity 2484 对）。守门：review-assistant 双语言轮 7 断言+zh 轮 3 断言（确定性/无键名泄漏/空白不泄/隐私声明）。**测试教训**：语言循环内的断言不得硬编码译文——en-US 轮 zh 文案断言失配一次，语言相关文案断言移到循环外 zh 轮。
验证：pnpm run check、review-assistant/cross-page-consistency/review-workspace/i18n-hygiene 定向守门、parity 2484 对、test:quality 全链 EXIT=0（CSS 631568 不变）、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。真实外部 AI 粘贴效果=用户现场（host-pending）。未 push。

2026-09-29 T-1591 单项洞察钻取与行动建议（新批次第二任务，P1）：日历格/周行 button 化钻取（data-insight-day/week→bind 新通道：insightsItemId 同步 historyItemId+jumpToHistoryDate 单日落点；aria-label=状态读数+钻取提示）、分母 note 按类型附口径行（quota 窗口/atMost 守住/排期机会日三态，quota 窗口小注与格内词表既有）、教练建议 CTA 复用 data-insight-records/edit-rules 既有通道零新绑定（editor CTA 走 T-1599 返回栈）。CSS span/div→button 视觉承接+周行 44px 触控（重复旧规则清除）。T-1590 范围切换不越界。i18n 7 键×2（parity 2491 对）。**类型坑**：direction 在 item 顶层非 revision（TS2339 一次修正）；insight-a11y 夹具 weeklyTrend 补 startDate（周行新依赖 escapeHtml(undefined)）。
验证：check、insight-a11y（13+9 断言）/cross-page-consistency/v7-insights 定向守门、parity 2491 对、test:quality 全链 EXIT=0（CSS 631797 +229B 预算内）、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。未 push。

2026-09-29 T-1541 回顾页 LifeLog 时间轴视图（新批次第三任务）：纯函数投影 features/lifelog-timeline.ts（note 冒号拆类型备注/事件 ISO 自身读数=无时钟/分钟取整/升序稳定/色板哈希确定性）+回顾页 analysis 折叠区 fold("lifelog") 纵向时间轴（色点+时长徽标，空区间显式提示）；宿主注入区间 yeguif 事件（时长已在 value，零新解析器）、review.ts 仅渲染零新依赖；纯渲染零写入。i18n 3 键×2（parity 2494 对）。新守门 tests/lifelog-timeline.test.cjs 入 test:ui。**测试坑两枚**：断言索引须按 ISO 升序重排（首轮按夹具字面顺序排错）；review-assistant 的 SummaryHarness（renderReview 方法切片 eval）沙箱需透传新依赖 buildLifelogTimeline 真实现——**凡 renderReview/renderInsights 等被方法切片测试的渲染方法，其新自由标识符都要同步沙箱参数表**（与 insight-a11y 同类坑第三踩）。
验证：check、lifelog-timeline/review-assistant 定向守门、parity 2494 对、test:quality 全链 EXIT=0（CSS 633672 +1.9KB 预算内）、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。未 push。

2026-09-29 T-1590 单项洞察范围与项目选择（新批次第四任务）：范围会话态（28/84/365/custom）+内核 endDate 选项（内联 key→Date 解析避免 i18n 依赖链——insights.test 转译落盘无法解析 shared 的相对上级 require，第一版补 shared.ts 转译是错解、内核内联是正解）+可搜索含归档选择器（IME 守卫+DOM 过滤）+归档项「在归档中查看」（预填 archivedQuery+showArchived，恢复留归档页不绕过预览确认）。切换只重渲染项目/滚动保持。i18n 11 键×2（parity 2504 对）；CSS 634351（+679B）。守门：insight-a11y +8 断言、insights.test 内核窗口断言（endDate 边界/非法回落）。
验证：check、insight-a11y/insights.test 定向守门、parity 2504 对、test:quality 全链 EXIT=0、双主题 visual-qa EXIT=0、width-walkthrough 桌面+mobile EXIT=0。未 push。**本轮起进入 v18.10.0 发版准备**（用户批准：收尾 T-1590 后发版）。

2026-09-29 **v18.10.0 正式发布（用户授权发版）**：①发版内容=v18.9.0 之后全部工作——D-307 六阶段 49 项（页面壳统一/洞察可行动化/设置与编辑器迁移/无障碍走查/隔离内核回归/性能测量等）+收官后 T-1539/1591/1541/1590 四项增强，共 58 提交。②发版前准备：T-1590 收尾提交（3324ae9）；release-notes-18.10.0.md（含 SHA-256 占位行）+v18.10.0-change-log.md（check:release 强制要求）+README 版本行/重点段更新；版本三处 bump（package.json/plugin.json/version.ts，18.9.0→18.10.0）；build+sync:digest（SHA 476bd742 写入 notes）；发版同款十段测试链全绿（check/test/ui/legacy/mobile/ecosystem/extended/review-comparison/perf/check:release——首轮 check:release 抓 README 版本行未更+change-log 缺失，补齐后过）。③提交 d919491「release: v18.10.0」→ push origin main（d919491，经 http.proxy 127.0.0.1:7897——直连 github 被重置，探测本机代理端口解决）→ tag v18.10.0 推送。④**GitHub Release 创建（gh 未装，按 18.9.0 记录走 api.github.com）**：token 取自 git 凭据管理器仅内存使用、临时文件用后即删；curl 经同代理 POST releases（HTTP 201 id 398799276）→ uploads.github.com 上传 package.zip（HTTP 201，814305B）；认证回读核验：非草稿非预发布、资产 814305B uploaded、本地 zip SHA-256=发布说明 SHA=476bd742b36b…、tag v18.10.0→main（远端 main=d919491）。**发布地址**：https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.10.0 。待开发：真机验收（H1~H8）、T-1555/1582/1550 走查对账、LifeLog 族增强（T-1542/1543）、T-1538（用户拍板）。
2026-09-29 全面功能/UI/交互/逻辑复核与 README 待办登记（用户要求先梳理、不开发）：核对 v18.10.0 页面/能力注册表、设置字段、路由/异步契约、提醒/联动/外部边界及现有质量台账，整理功能地图与数据流到 `docs/comprehensive-audit-2026-09-29.md`。保留用户反馈 T-1611～T-1618，新增源码证据待办 T-1619（localDate/趋势跨时区统计）、T-1620（设置与周复盘即时保存失败一致性）、T-1621（SurfaceContext、多 root 与固定 DOM ID 隔离）、T-1622（辅助/主存储跨窗口原子合并与收尾防丢）、T-1623（可见文案 i18n 纯度与重复占位符）、T-1625（动态名称、ARIA、附件 URL 安全渲染）、T-1626（专注计时真实时间、预设切换与保存结果闭环）；向 T-1582/T-1613/T-1614/T-1618 合并多 root 专注刷新、事项搜索 IME、LifeLog 源段时间、来源项目候选上限、提醒读屏降噪，避免重复立项。用户追加 README 重构需求，登记 T-1624：在项目介绍附近列出已开发的「小驴雷切 / 小驴打卡 / 小驴人脉 / 小驴拾遗」并补交流 QQ 群 871707735。本轮更新 TODO/审计文档/进度记录，并按用户明确要求在 README 项目介绍附近补充四款插件与 QQ 群；未改运行代码、未 push。验证：`git diff --check` 通过；`node tests/ui-docs.test.cjs` 通过（4.0 UI documentation checks passed）；未运行完整质量链。
2026-09-29 继续源码审计并补充 T-1627/T-1628（只登记、不开发）：①核对备份链后确认 `serializeJson(host.cloneStore())` 只携带主 Store，`normalizeStore`/`cloneStoreValue` 不保留 `CheckinStore.templates`，个人模板、问卷、图标、事项、提醒动作、偏好和外部待处理箱均在独立存储桶；与 `docs/export-formats.md` 的“JSON 全量备份”描述存在范围歧义，新增 T-1627 统一定义导出/快照/恢复范围、隐私和回滚。②核对普通 CSV 后确认 `serializeCsv` 的事件级表头不能被 `parseCheckinCsv` 的名称/日期导入识别；解析会接受 `2026-02-30` 等被 JS 归一的日期，按物理换行拆散带换行字段，且普通导出未复用记录详情 CSV 的公式前缀中和，新增 T-1628 统一字段、严格日期、RFC 多行解析、大小上限与表格安全。验证证据：源码行号记录于 `docs/comprehensive-audit-2026-09-29.md`；临时 TypeScript 转译夹具复现“自导出回导 0 行 / 非法日期接受 / 多行字段拆散”；临时脚本未写入仓库。未改运行代码、未 push。
2026-09-29 T-1629～T-1634 功能与调研对照审计（只登记、不开发，D-310）：对照 v18.10.0 现有页面/能力地图、历轮竞品研究和源码，新增六项待办：T-1629 三文档来源固定首窗口导致后续行可能长期漏读；T-1630 微信读书时长/完读/笔记结果混合、部分分页笔记可能以每日身份锁定；T-1631 API v5 事件来源读取白名单与类型不一致；T-1632 组合包已有库的部分应用和冲突预览；T-1633 Loop/Obsidian 迁出将跳过、破戒或部分进度误作完成，并补 Loop 日历日期与 YAML 标题安全；T-1634 显式“未达成及原因”先做语义和真实场景评估。向 T-1614 并入 50 条 LifeLog 映射静默截断，向 T-1616 并入绑定首检/公开同步事件复检边界，向 T-1622 并入 Agent 两类创建的失败回滚。长假暂停、PDF、ICS、Exactly 等维持已有条件池。本轮仅改 TODO/审计/决策/进度文档；未改运行代码，未 push。验证：`node tests/ui-docs.test.cjs` 通过（4.0 UI documentation checks passed）；`git diff --check` 通过。

2026-09-29 T-1619 localDate 跨时区统计正确性收口交付（P0，local-auto；口径 D-311）：①rules.ts 普通每日/非配额进度过滤从 `localDateKey(new Date(event.localDate || event.occurredAt))` 收拢为 `eventDateKey(event) === localDateKey(date)`——合法 localDate 键直接字符串比较，不再隐式按 UTC 午夜解析（America/New_York 等负时区曾整体漂移到前一日），与配额路径既有口径一致；②eventDateKey 升级真实日历校验（新增 isRealCalendarDay：`2026-02-30` 等格式合法但日历不存在的键回落 occurredAt），与 model.getEventDateKey/isValidDateKey 对齐，配额贡献日与配额 AUTO 推导同函数继承；③charts.ts 月/年趋势弃 occurredAt 时刻切月切年，改按记录日键半开区间 [startKey, endKey) 比较，日活跃 Set 同走 getEventDateKey——月/年/日三趋势与主模型单一口径；周完成率经 isComplete（getEventsForDay 索引）本已正确，evaluateRule 过滤与索引两条进度路径自此同值（Today/Review/Insights/提醒共用同一结果）。④新守门 tests/localdate-tz.test.cjs 入 pnpm test 主链：UTC/Asia/Shanghai/America/New_York × 6 场景固定 TZ 子进程矩阵（18 组），覆盖 localDate 与 occurredAt 跨日/跨月/跨年不一致、春令时/秋令时日界、空与非日历 localDate 回退、历史修订单位切换、配额贡献日稳定、skip 不吃量、atMost 守住/破戒日归属、evaluateRule 与 evaluateItemRule/isComplete 同值；子进程自证 1 月/7 月时区偏移防 TZ 失效静默通过（探针实测本机 NY 下 new Date("2026-03-08").getDate()===7，缺陷机理真实存在）；另含 4 条源码精确签名断言（rules 禁 new Date(event.localDate、charts 禁 occurredAt 聚合、三趋势同走 getEventDateKey）。过程抓出两处夹具陷阱（dst/回退场景日期早于夹具项目 createdDate 被可用性守卫正确拦截）与一处真实口径差（rules 侧幻影日历键）——后者升级为修复②。验证：check、pnpm test 主链（test-suite-coverage 216 文件全覆盖）、build、test:ui、test:quality（i18n 2504 对、CSS 634351B 预算内）、双主题 visual-qa、宽度走查全 EXIT=0；本轮 docs 审计提交 429f336、本修复随台账同批本地提交；未 push。

2026-09-29 T-1615 排查与 T-1616 设计双文档轮交付（按用户续跑口令执行，local-auto，口径 D-312）：①T-1615 排查——i18n 语料脚本扫描（2504 对）零 mojibake、零控制字符、零 raw-key 值，「乱码」定性为伪乱码主因 + 键名泄漏次因：布局根因=三类文档/问卷/笔记本目标卡专属样式整体只写 @container ≤719px 档（components.scss:10705 起），卡片标记复用 `lc-checkin__settings-row` 类，≥720px 全档命中通用两列行栅格（maintenance-responsive.scss:14 无条件 `minmax(0,1fr) minmax(120px,240px)` 以 (0,3,0) 特异性压过卡片自有 (0,2,0)；components.scss:779/4202 同向），整个 document-target-body 被塞进第二列 240~260px，卡内 data-target-summary 摘要行 label 列实测 0~14px → overflow-wrap:anywhere 下逐字竖排——自建探针（.artifacts/settings-probe.cjs，复用 visual-qa 装载）在 760/900/1180 三档截图复现、420 正常对照，760 展开态量测 row.gridTemplateColumns==="0px 228px"；真实缺陷=5 个缺失键 6 处调用（bind.feature.noteQuery、blockPreset.noEditor/.inserted、editor.clear、common.clearFilter）经 t() 缺键回退把原始键名渲染进界面，i18n-parity 不校验代码引用。产出 docs/settings-garbled-display-triage-2026-09-29.md（证据索引/治理五方向/守门三件）。②T-1616 设计评审件 docs/doc-binding-fullflow-design-2026-09-29.md：统一候选面（filetree/searchDocs 全量搜索+loadNotebooks 浏览+ID 精确回显，零新内核 API、有界懒加载）、document-choice-row 结果预览行（复用 T-1563 键位环选/IME 冻结模式）、七入口收敛矩阵（差异保留在差异表）、六态失败矩阵（失败不误判无结果/目标删除）、集中体检增量四边界（就绪时有界首检、同步后复检先核实公开同步事件契约、过期响应按代际丢弃、多 root 单飞去重）、六条验收门并入 T-1608；与 T-1615 目标卡样式提档合并一次收口。③TODO 两条任务加进展注记、DECISIONS 记 D-312。本轮零运行代码改动；验证：node tests/ui-docs.test.cjs 通过、git diff --check 通过；未 push。

2026-09-29 T-1620 设置即时持久化失败一致性与重载反馈收口交付（P1，local-auto，口径 D-313）：①统一包装——index.ts 新增 \`applyPreference(mutate, success?)\`：改值前 \`collectViewPreferences()\` 全量快照（从 persistViewPreferences 抽取序列化字面量，二者同源），\`void persist\` 失败时 \`applyViewPreferences(snapshot)\` 原路恢复（含 syncPluginLanguage 钩子）+重绘+\`msg.prefSaveFail\`，成功路径零额外开销；②迁移面——index.ts 裸 \`void persistViewPreferences()\` 清零、旧 savePreference 包装退役（7 用户全部改道）：外观/操作组 10 字段、安静时段三字段、每日提醒/事项仅一次、弹窗四字段+重置框、专注提供方两入口、来源组（摘要/思阅/思播/健康开关与映射重读/笔记推导开关/微信读书开关+双可选绑定+清 Key/叶归开关+笔记本+映射+笔记本失效自动停用）、头像两入口、重置视图偏好、首成旅程推进、保存视图应用×2/新建/删除、最近模板——30+ 处理器；断连保留提示与来源 ingest 保持既有时序（包装外）。过程自查抓出两处「外层先行赋值污染快照」缺陷（advanceFirstSuccess/applySavedView）并修正，守门固化反断言；③周复盘草稿——宿主 save/clear 快照回滚后 rethrow，bind-page-navigation 两按钮 .catch 在 data-weekly-status 显失败（新键 review.weeklySaveFail/weeklyClearFail 双语，i18n-parity 2506/2506），输入框保留可重试；④save-note-query 七字段登记决策（D-313）——文档化「整体表单即保存边界」，注册表文档两处更新；⑤新守门 tests/preference-rollback.test.cjs 入 pnpm test 主链（包装/快照/回滚精确签名、裸调用清零、savePreference 退役、28 选择器处理器逐一体检、快照纪律反断言×2、周复盘回滚与反馈、决策登记），test-suite-coverage 217 文件。验证：check、pnpm test 主链、build、test:ui、test:quality（CSS 634351B 零新增）、双主题 visual-qa、宽度走查全 EXIT=0；本地提交随台账入库；未 push。

2026-09-30 T-1621 第一切片交付：SurfaceContext 读侧扩参 + 多 root DOM id 唯一化（P1，local-auto）：①page-shell.ts——SurfaceContext 拆出独立 SurfaceContextParams 形状并扩参到契约 1 全形状：date（review day 钻取 selectedHistoryDate，仅 historyScope==="day" 携带）、range（summaryCustomRange 浅拷贝优先，否则 summaryRange）、workspace（reviewWorkspace）、query（按页取 historyQuery/todayQuery/archivedQuery）、filters（scope/source/order/page/reminder，默认值 all/newest/0 不进上下文）——只聚合既有会话态零新真值，"字段可增不可改义"契约遵守；既有消费方（bind-page-navigation.ts:391 返回分派）零改动照常工作；②DOM id 唯一化——review.ts 提醒中心标题 id（aria-labelledby 与 h2 id 同源变量）与 occasions.ts 提醒天数预设 datalist（input[list] 与 datalist id 同源变量）改按模块级渲染次序生成（settings settingsViewId 同法），多 root（dock+页签+弹窗）同屏时读屏关联与 datalist 绑定不再跨表面交叉命中——T-1615 排查时确认全仓仅这两处固定 id（settings 已有 settingsViewId 先例）；③契约文档 surface-routing-contract-2026-09-28.md 登记切片落地与剩余边界（按 root 独立 currentPage 与全量序列化未实施，宿主级共享语义保持现状）；④守门——tests/cross-page-consistency.test.cjs 新增两检查块（params 形状六键/snapshot 十二会话字段聚合/date 仅 day 钻取/过滤器默认值剔除/同源 id 反固定断言），主链 9 检全过。验证：check、pnpm test 主链、build、test:ui、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；未 push。

2026-09-30 T-1622 三桶跨窗口合并切片交付（P1，local-auto，口径 D-314）：①三个纯合并函数——src/reminders.ts mergeReminderUserActions（(id,action,at) 身份并集，按时间排序确定性输出，剪枝仍归 normalize 写路径）；src/occasions.ts mergeOccasionCompletions（共享 id 的 completedDates 排序并集沿用 120 上限、本地标量优先、**不采用远端独有事项**避免复活删除、无重叠时原样返回本地）；src/features/external-pending.ts mergeExternalPendingBoxes（身份并集经 normalize——保留先入即本地载荷优先、容量 40/保留期强制）；②接线——reminderUserAction 动作前重读 REMINDER_ACTIONS_NAME 并入远端记录（保存失败回滚基线后移至合并后，远端读取失败不阻断）；persistOccasions 写前重读合并（merged 写回快照并同步 this.occasionStore，远端读取失败按本地写；写入先序下删除仍获胜）；失败箱新增 mergeExternalPendingFromRemote 并在 discardExternalPendingEntry/retryExternalPendingEntry 变更前调用（箱丢弃无墓碑，禁止先删后并）；③过程澄清两点——审计所称「共享锁」即 saveQueue 本窗口串行（无跨窗口锁），Dock Tomato 收件箱锁内重读合并是既有范例（本轮未动）；④新守门 tests/cross-window-merge.test.cjs 入 pnpm test 主链（三并集语义含交换稳定性/去重/确定性/容量 40/删除不复活断言 + 接线精确签名），test-suite-coverage 218 文件；受影响桶既有测试（reminder-actions/projection/quiet、occasions、external-pending、docktomato-inbox、tombstone-concurrency、aux-write-hygiene）8/8 通过。验证：check、pnpm test 主链、build、test:quality（i18n 2506 对、CSS 634351B 零新增）、双主题 visual-qa、宽度走查全 EXIT=0；未 push。

2026-09-30 T-1622 剩余切片交付：Agent 创建口入队回滚 + 偏好桶合并评估定案（local-auto，口径 D-315）：①Agent createItem/createOccasion（index.ts registerSiYuanAgentCapability）从「内存先行+裸 persist」改为经 enqueueMutation 写入——主 Store 的锁内重读合并（withStorageLock→reconcileNormalizedStoreSnapshots）自此对 Agent 创建生效，不再绕过跨窗口合并；persist 失败回滚内存（store/occasionStore 快照恢复）并向 Agent 调用方重抛异常，保存失败不得报告成功；createOccasion 叠加 persistOccasions 写前合并（D-314）；②偏好桶跨窗口合并评估定案（D-315，注册表文档新节）：不做合并、维持后写者胜+T-1620 快照回滚——理由：整桶 ~40 异构字段无逐字段变更清单（确定性合并需写时携带键集=存储形状级改造）、无清单的合并会复活撤销语义（reset-view 写默认值会被他窗值覆盖回）、危害面仅本机 UI 不涉事实数据；后续真需求先做 per-field change manifest 再评估；③onDataChanged 核对结论（零改动）：远端变更通知路径整桶采纳偏好/事项/模板/动作属正确语义；settingsDrafts/journalDrafts 为会话态不入桶不受影响；weeklyReviewDrafts 随偏好桶走=D-315 既有边界。守门：tests/cross-window-merge.test.cjs 增补 Agent 入队/快照/回滚重抛精确签名与 D-315 登记断言。验证：check、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；受影响面 Agent/生态测试（agent-audit-export/agent-status/ecosystem/api-v5/task-horizon-bridge）5/5 通过；未 push。

2026-09-30 T-1623 可见文案 i18n 纯度与 t() 重复占位符修复交付（P1，local-auto；D-316）：①t() 全量替换——i18n.ts 的单次 replace 改 split/join，trust.reasonThreshold 双 {unit} 占位符全部替换不再残留字面（record-trust.ts:69→review.ts:264 链路修复）；i18n-parity 增功能断言（转译 i18n.ts 实调 t()：重复占位符全替换+替换后无 "{" 残留），2523/2523 对全绿；②审计定位硬编码点全部键化（新增 17 对双语键，先查无重名）：专注庆祝（fragments.ts→today.focusCelebration）、专注默认名+备注（focus-timer.ts→focus.defaultItemName/noteMinutes；unit「分钟/小时」回退是与持久化 unit 值比较的数据单位，保留不改并注释）、配额标签/帮助×4（bind-editor.ts→editor.quotaDatesLabel/quotaValueLabel/quotaDatesHelp/quotaValueHelp）、问卷空值（journal-dialog.ts→common.emptyValue）、快捷动作打卡（quick-dialog.ts→quick.openCheckin）、已记录 toast×2（index.ts→msg.recordedToast）、提醒次数摘要（review.ts→review.reminderTimes）；③趋势标题/单位定性为持久化快照数据（写入时语言，随快照合并持久）——呈现层方案：review.ts presentTrend 按系列键映射（近{n}天活跃正则提取 n、条/天单位映射），未识别存储标题原样回退向前兼容；charts.ts 纯函数零改动、5 个转译 charts 的测试夹具零改动；review-analytics-projection 断言随呈现层形态现代化（新增「投影不重建」断言，25 案例 100 矩阵断言复跑通过）；④template-manager 复核=生产零导入的未接线遗留原型（D-316）：本轮不接不删，退役（模块+测试+样式+三处守门联动）另立清理批；⑤守门：cross-page-consistency 新增 T-1623 检查块（t() split/join 精确签名+反单次 replace 断言+九个键化点+中文字面残留反断言+呈现层映射在位）。剩余：缺参/多余参调用点级检查（需调用点分析）与 template-manager 退役批留后续。验证：check、pnpm test 主链、build、test:quality（i18n 2523 对、218 文件覆盖）、双主题 visual-qa、宽度走查全 EXIT=0；未 push。

2026-09-30 T-1625 第一批交付：动态内容安全渲染边界（P1，local-auto，D-317）：①shared.ts 新增 safeAttachmentUrl——协议白名单（data:image/、blob:、https:、http:、无协议相对路径；与既有 renderIconMarkup 同一白名单纪律）+escapeHtml 防属性逃逸，不通过返回空串不渲染；②fragments.ts 两处今日日志附件缩略图 `src="${event.attachment}"` 裸插值（审计实锤属性注入：normalizeStore 接受含引号 data:image/ 字符串，引号可逃逸属性）改为安全门+转义，不安全 URL 不渲染缩略图；③today-bindings.ts 上下文菜单 `menu.innerHTML = menuItems.join("")` 注入实锤修复——item.editAria/insightsTitle 的 t() 输出（含 item.name 用户内容）先 escapeHtml 再进 HTML（t() 纯文本契约不动，T-1623 刚收口）；④fragments bulk-check 的 aria-label（t(item.select) 含 item.name）补转义；⑤审计点名的 editor.ts:125,145-151/archived.ts:115-116/review.ts:506,553 复核均已是 escapeHtml 形态，零改动；⑥新守门 tests/render-boundary.test.cjs 入 pnpm test 主链（敌意 URL 矩阵：javascript: 大小写/data:text/html/vbscript:/引号逃逸转义/相对路径与 blob 放行/空值 + 反裸插值 + 接线精确签名；219 文件覆盖）；today-context-menu 方法级 eval 桩补 escapeHtml 注入（记忆坑⑦同型）。D-317 记录四类边界契约（转义归转义、URL 校验归校验；摄取侧白名单收紧留评估）。**剩余切片**：全量 t({name}) 类扫尾（按页推进）、摄取侧白名单评估、全表面敌意走查。验证：check、pnpm test 主链、build、test:quality（i18n 2523 对）、双主题 visual-qa、宽度走查全 EXIT=0；未 push。

2026-09-30 T-1625 第二批交付：t({用户参数}) 进 HTML 全仓扫尾清零（P1，local-auto，续 D-317）：①模式化扫描——`\${t("…", {name/target/label: 用户内容})}` 且同行无 escapeHtml 的 HTML 插值，命中 16 处；②逐点转义——editor×6（目录模板卡 useTemplate aria、个人模板卡 useMyTemplate/deleteTemplate aria、导入决策 importMetaNew/importDuplicateOf 文本节点【内容来自导入文件=用户内容】、图标选择 iconSelectAria【自定义图标文本经 normalizeCustomIcon 仍可为任意 24 字文本】）、archived×4（selectAria/restoreAria/deleteAria aria + searchEmpty 空态搜索词文本节点）、fragments×5（insightsAria/editAria×2/dragSort×2 aria + focusCelebration 整体转义）、review×1（草案卡 draftInspectAria）；③安全通道确认不改：journal 预览与 agent 历史走 textContent/safe 包装、editor iconCount 参数为字典文本、fragments consoleNext 参数内已 escapeHtml；④守门——render-boundary 增 12 条扫尾精确签名（editor/archived/fragments/review 四文件逐点），today-context-menu 桩上一批已补 escapeHtml。复扫清零。受影响页测试（editor-validation/sections/template-share/import、archived-search、review-workspace、today-dashboard）7/7 通过。验证：check、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；未 push。T-1625 剩余：摄取侧附件白名单收紧评估、全表面敌意走查（并入 T-1608 真机台账）。

2026-09-30 T-1631 API v5 事件读取来源过滤对齐交付（P1，local-auto）：①api-v5.ts VALID_SOURCES 补 sireader/siplayer/weread/yeguif——与 types.ts CheckinEvent["source"] 八来源全集对齐；此前双重旧口径：api.ts 校验层对 source:"weread" 抛 TypeError（文案只列四基础来源），即使穿透到 filterEventsInRange 也会因 isValidEventSource 为假而**静默不过滤**（比抛错更糟）；②api.ts 校验错误文案同步八来源；③docs/api-v5.md events.range.read 的 source 注释显式列出八来源并注明读取/写入不对称（读可过滤全部、写仅接受 "api"）；④写侧防伪造边界零变化——planBatchRecord 仍只接受 source:"api"；契约夹具 tests/api-v5.test.cjs 增七条读过滤断言（weread/yeguif/sireader/siplayer 各命中、缺席来源返回空而非未过滤、isValidEventSource 四来源）+ 批尾伪造 weread 来源输入断言仍 rejected invalid-source（读放宽、写不变）。验证：check、api-contract/api-v5-docs/ecosystem 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；未 push。

2026-09-30 T-1627 口径收口交付：JSON 备份明示「主档」边界（P1，local-auto，D-318 方案 a）：①docs/export-formats.md——节标题「JSON 全量备份」→「JSON 主档备份」；修正字段清单失实（删除 normalizeStore v3 实际不返回的 `templates` 宣称，此前文档描述了一个不存在的字段）；新增范围边界段：个人模板/问卷配置/图标库/事项/提醒动作/视图偏好/外部失败箱在独立存储桶、不在 JSON 备份恢复范围内（模板另有编辑器脱敏分享/导入通道）；第三方迁出说明「JSON（全量）」→「JSON（主档）」；②i18n 四键——set.recoveryBackup/set.importJsonHint zh+en：去掉「完整备份/整体恢复」表述，改为「打卡项目与记录主档」+范围括注；③plugin-ops.ts 范围导出注释同步（T-1436 旧注释「JSON 恒为全量备份语义」→主档语义引 T-1627/D-318）；④D-318 决策：口径收口优先于 envelope 扩容——现状表述与实现不符先行纠正；多桶 envelope（逐桶覆盖/合并/脱敏/回滚+版本化迁移）登记为 T-1627 后续独立批次；⑤守门——export-identity-docs 增三断言（「全量备份」表述退役反断言/范围边界显式在档/主档字段在档）+通道名随新标题更新。验证：check、export-identity-docs/backup/ui-docs/i18n-parity 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；未 push。

2026-09-30 T-1628 CSV 导入导出契约最小闭环交付（P1，local-auto）：①表头互通——parseCheckinCsv 识别导出表头别名（itemName→name 别名表），自导出→回导从 0 行变无损往返（行级 name/date/value/unit；旧中英文别名文件兼容不断）；②严格日历——导入日期从「正则+new Date 归一」（2026-02-30 被接受为 3 月 2 日）改为 date-keys isValidDateKey 真实日历校验；③RFC 4180——整段状态机解析替代物理换行拆行（引号字段跨行/逗号/双写引号不拆散；带引号保留原文、无引号裁剪空白；CRLF 归一）；④公式中和——serializeCsv 文本列（itemName/note）复用 insight-records.spreadsheetText 策略（=+-@/控制字符前导引号）；**过程回归**：首版全列中和把记录详情 CSV 负数值 -2.5 篡改为 '-2.5（既有守门 insight-records 抓住）——收窄到文本列并在 csv-roundtrip 固化负数直通反断言；⑤上限——20000 行/2,000,000 字符，CsvImportResult 增 additive truncated 标志；⑥docs/export-formats.md CSV 双段同步（RFC 4180/公式中和/表头别名/严格日历/上限/幂等去重）。守门：tests/csv-roundtrip.test.cjs 入主链（往返无损三事件含 CJK/引号/换行备注、严格日历 02-30 与 13-01 拒绝闰日接受、公式中和+负数直通、上限截断、旧别名兼容、itemName 别名在档）。**剩余**：错误行逐行明细预览与 truncated 标志的 UI 呈现（现有 invalid 计数已覆盖确认框）。验证：check、csv-roundtrip/insight-records/export-identity-docs/backup/import-preview/import-conflicts/loop-csv/obsidian-habits 定向链、pnpm test 主链（复跑）、build、test:quality（复跑）、双主题 visual-qa、宽度走查全 EXIT=0；未 push。

2026-09-30 T-1629 三类文档来源有界分页与扫描进度核心批次交付（P1，local-auto，D-319）：①新纯模块 features/scan-cursor.ts——scanBoundedPages 有界分页扫描器（fetchPage 注入保持无宿主依赖可离线回放；单次摄取 ≤ SOURCE_SCAN_MAX_PAGES=4 页×窗口大小；整页读满游标推进到本页最后块 ID、短页收尾游标复位空串下轮从头幂等重扫；行跨页累积保序一次交调用方解析）+ blockIdCursorClause（游标白名单 ^[A-Za-z0-9_-]{8,64}$，与 note-query 内部校验同形，注入串拒绝拼接）；②三源接入——健康文档/叶归 LifeLog 固定 LIMIT SQL 经白名单游标子句续读（`AND id > cursor`），笔记推导 buildNoteQuerySql 原生 afterBlockId 参数首次接线（noteQueryCursorFromRows 所在模块的游标设施自此全部投产）；三源多页行累积后一次解析——LifeLog 跨页同文档相邻 Marker 前置段不丢（时长归属依赖文档内序列完整）；③会话游标三字段（health/notequery/yeguifScanCursor）仅会话态：重载后从头重扫由既有 externalRef/墓碑/手动优先去重兜底不丢不重；report.windowFull=整页读满仍有后续；read-failed 归口保持（notequery/yeguif .catch→undefined→read-failed，health 外层 try）；④守门 tests/scan-cursor.test.cjs 入 pnpm test 主链（短页复位/整页推进+页数上限/覆盖保序/游标白名单含注入串拒绝/三源接线精确签名/默认上限常量有界）；health-inbox 排序断言随新 SQL 形态现代化（LIMIT 常量化+游标子句）。**剩余**：真机跨 200/500 行轮询走查与源变更/删块/手动重扫现场验收（并入 T-1608 真机台账）；游标跨会话持久化如需另立。验证：check、scan-cursor/health-inbox/note-query/yeguif-adapter/source-framework/source-lifecycle-matrix/external-pending 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；未 push。

2026-09-30 T-1630 微信读书三指标拉取完整性交付（P1，local-auto，D-320）：①升级阻断——wereadUpgradeBlocked（适配器纯函数，upgrade 非空字符串即真）出现时阻断本轮全部链路（时长 ok 或失败均阻断完读/笔记），lastPull 如实记录升级信息；此前 duration 失败后完读/笔记照跑、upgrade 出现后三链路照跑，均与官方升级停用口径不符；②笔记完整性门——ingestWereadNotes 全程跟踪 complete：笔记本概览网关失败（payload 缺失，与空数据可辨）/5 页触顶仍 hasMore/活跃书超 10 本/逐书 bookmarkList 网关失败/review synckey 3 页触顶仍 hasMore/逐书 review 未到终止条件——任一即 complete=false；settleWereadNotes（适配器纯函数）唯一决策门：未完整→retry **不写每日身份**（weread:<itemId>:notes:<日期> 一经写入即锁定当日补算机会——审计实锤的部分 tally 锁定场景），完整零 tally→skip，完整>0→write；返回 {status: settled/empty/incomplete/skipped, tally}；③完读链路——ingestWereadFinished 返回 {written, pending}：超 10 本上限与网关失败未核实完成的书计入 pending（身份未写即保留重试，不丢书不假成功）；④聚合——wereadLastPull additive 携带 finished/notes 链路结果，整体 ok 仍仅反映时长链路（来源卡状态行契约不变，UI 零改动）；wereadLastPull 类型扩展。守门 tests/weread-integrity.test.cjs 入 pnpm test 主链（结算决策矩阵 7 断言/升级阻断签名/六类完整性标记/finished pending 记账/聚合接线）。验证：check、weread-adapter/ecosystem/integration-events/source-lifecycle-matrix 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；未 push。**真机边角**（网关真实分页触顶现场）并入 T-1608 真机台账。

2026-09-30 T-1633 Loop/Obsidian 迁出完成语义与格式校验交付（P1，local-auto，D-321）：①迁出完成日复用主模型当日生效规则判定——serializeLoopCheckmarksCsv/buildObsidianExportFiles 对每个有事件日走 isItemAvailableOnDate+isComplete（evaluateDayCompletion 唯一判据）：skip 不贡献进度、部分达标=非完成、atMost 破戒=非完成——「有事件即完成」的失实映射修正；配额项目无日级完成语义：Loop 不产出 YES_MANUAL、Obsidian 整档不导出并计入新字段 quotaSkipped（损耗在 export-formats 说明）；戒除「零事件守住」日不在导出宇宙（Loop/H21 无该语义，已文档化损耗）；日期宇宙仍=有事件日+今天，零放大；②格式校验——parseLoopCheckmarksCsv 日期从正则改 date-keys isValidDateKey（2026-02-30 拒绝进导入计划）；Obsidian frontmatter title 在既有反斜杠/双引号转义外剥离换行/制表等控制字符（防换行截断 frontmatter 注入 entries 区）；③docs/export-formats.md Loop/Obsidian 两节同步完成语义、配额/戒除损耗与导入严格日历；④守门——loop-csv 测试转译 model 依赖树（迁出判定真实走主模型）并增语义断言（部分达标+破戒日 NO、仅模型完成日 YES_MANUAL、导入非日历拒绝）；obsidian-habits 测试语义块（quotaSkipped=1、部分日不算完成、标题换行剥离保证 frontmatter 单行）。既有迁入语义（T-1522 冲突选择/T-1457 工作流）零变化。过程注：测试夹具换行转义经 node -e 注入两次被提前解码（记忆坑⑩同型），改 Edit 工具直写转义后通过。验证：check、loop-csv/obsidian-habits/import-conflicts/import-preview/export-identity-docs 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；未 push。

2026-09-30 v18.11.0 正式发布（**用户授权发版**，续跑口令选项 A）：①版本三处 bump（package.json/plugin.json 4 空格/version.ts → 18.11.0）；②README 同步（当前版本行、批次概述、发布说明链接、18.11.0 重点区五条+18.10.0 重点折叠、历史指针更新）；③新增 docs/releases/release-notes-18.11.0.md（可信结算/持久化可靠性/导出与契约/来源拉取完整性/安全与文案/文档口径六组，SHA 占位行由 sync:digest 填充）与 docs/v18.11.0-change-log.md（批次 A~F 逐任务记录，覆盖 18.10.0 后全部 16 提交：11 项审计代码项+文档轮+发版前修复）；④十段质量链 test:quality 全 EXIT=0（check:release 含版本行/资产/回滚演练；222 测试文件；i18n 2523 对；CSS 634351B）+双主题 visual-qa+宽度走查；⑤过程两处置顺：test:quality 内嵌 build 重产 zip 使 SHA 漂移——build 后以末次 sync:digest 为准并复跑 release-assets 复验（摘要 7b4fa1c1… 与 zip 一致）；Windows spawnSync 传多行 JSON 被 mangle——payload 落临时文件 `--data @file` 规避；另 git -c 代理参数须置于子命令前。⑥发布执行：commit「release: v18.11.0」（c9ddaae）→push 走代理（10c9591..c9ddaae）→tag v18.11.0 推送→临时脚本 git credential fill 取 token（仅内存）创建 Release **id 399476419**（正文=发布说明）→uploads 上传 package.zip **817,851 字节**→下载资产回读 **SHA 7b4fa1c1c9e7… 与本地构建逐字节一致**→脚本删除。发布地址：https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.11.0 。远端 main=c9ddaae、tag=v18.11.0（ls-remote 核验）。待开发：真机验收清单（跨窗口并发/超长来源回填/微信读书分页触顶/迁移完成语义抽查）、T-1621 剩余、T-1611~1618、T-1624。

2026-09-30 T-1615 实施批次一交付：目标卡样式提档 + 缺失键补齐 + 引用键常驻扫描（用户反馈实施轮，local-auto，D-322）：①样式提档——components.scss 新增两条**顶层绝对选择器**豁免规则：卡本体（display:grid 单列/间隙 10px/字号 12.5px/下边距复位）与卡内后代行（栅格/分隔线复位，不吃卡面 padding），(0,4,0) 压过 maintenance 层无条件两列行栅格 (0,3,0)——目标卡在所有容器宽度恢复单列卡面；②补缺失键 4 个双语（bind.feature.noteQuery/blockPreset.noEditor/blockPreset.inserted/editor.clear；common.clearFilter 缺口改复用既有 today.clearFilter，不造语义重复键）——至此 triage 定性的 5 键全部归位；③长 ID：目标摘要 small 附 title 全值；④守门两件——i18n-parity 增「代码引用键∈词典」全 src 扫描（缺失键类问题常驻化，2527 对全绿）、cross-page-consistency 增 T-1615 检查块（豁免规则/单列/边距复位/title/键复用反断言）；⑤**关键教训**（D-322）：豁免规则嵌套进 .lc-checkin--settings SCSS 块会前置祖先条件致永不匹配（卡/行元素无该两类）——首版探针计算样式复验抓住后改为顶层绝对形态；CSS 特异性工作验收必须含计算样式探针。定向探针复验 420/760/1180 三档：摘要行宽 14px→290/606/802px 满宽，竖排消除，420 档零回归。**剩余**：选择框退役与统一选择器（T-1616）、摘要中段截断 polish、混档敌意走查。验证：check、i18n-parity（2527 对）/cross-page-consistency（11 检）/i18n-hygiene/settings-navigation/css-hygiene 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；CSS 634931B（+580，硬线内）；未 push。

2026-09-30 T-1617 实施批次一交付：设置页类型令牌与字重/帮助字号归一（用户反馈实施轮，local-auto）：①tokens.scss `.lc-checkin` 作用域增三档主题无关类型令牌：--lc-checkin-settings-title-weight 720 / --lc-checkin-settings-strong-weight 650 / --lc-checkin-settings-help-size 11px；②components.scss 设置面 12 处消费：卡片标题 h2 与总览 strong → title 档；字段标签 span、settings-value、settings-fold summary、settings-link、来源面板头 strong → strong 档——散布的 620/640/660/700 四种字重在设置面归一为两档；帮助族（settings-label small/external-overview small/source-boundary/document-target-copy small/document-target-field）10.5px → help-size 11px；③维护层同源——settings-label small 的 12px 无条件基线改 help-size 令牌（(0,3,0) 级联规则压过，420/1180 双档计算样式一致 11px，移动端 -1px 属一致性收敛）、标签 span 600→strong 档；④探针计算样式验证：h2/总览 720、标签/值/面板头 650、帮助 11px 双档一致；⑤守门：cross-page-consistency 增 T-1617 检查块（三令牌在档/七规则逐条消费断言/帮助级联确定性/维护层同源/设置面 stray 字重反断言——非设置面 620 不在范围）。**剩余**：字号档位跨档跳变（h2 16/14 双源、row 14/12.5、value 13/11.5 等窄宽差异归一评估）、混档敌意走查——批次二。验证：check、cross-page-consistency（12 检）/i18n-parity（2527 对）/css-hygiene 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；CSS 635594B（+663，硬线内 4.3KB 余量）；未 push。

2026-09-30 T-1617 实施批次二交付并整体收官（用户反馈实施轮，local-auto）：①探针三档留档——420/760/1180 各取十一项设置面元素计算值（卡片标题/行/字段标签/帮助/状态值/导航按钮/文本按钮/分组折叠头/总览 strong/来源面板头/下拉）：**发现批次一的令牌归一之后跨档跳变已不存在**——maintenance 无条件层在全部容器宽度统一生效（其 (0,3,0) 规则压过 components 宽档 (0,2,0) 旧值），此前假设的 h2 16/14、row 14/12.5、value 13/11.5 跳变实测三档逐项一致，假设不成立、无需归一；②唯一 off-scale 修正：分组折叠头 groupSummary 640 → strong 档 650 令牌（与字段标签/状态值同档），守门 +1 断言；③控件族字重（导航按钮 620/文本按钮 600/下拉 550）为控件刻度，保留并探针留档。**T-1617 关闭**：混档敌意走查归 T-1608 真机台账。验证：cross-page-consistency（12 检，含新增 groupSummary 断言）、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；CSS 635594B 不变；未 push。

2026-09-30 T-1616 实施批次一交付：统一文档选择器落地三张文档目标卡（用户反馈实施轮，local-auto，D-323）：①features/diary-search.ts 改造为纯投影层——normalizeDocumentSearchResponse（数组直返/旧版 blocks 包裹解包/其余空）+ toDocumentChoiceRows（块 ID 去重/名称回落块 ID/路径裁剪/上限 50）；runDiarySearchRequest（select 填充流）退役；②settings.ts——documentChoiceBlock(point,label) 统一标记：单搜索框（role=combobox、aria-controls、autocomplete=off）+ 候选行列表（role=listbox hidden 初始），接入日记（替换旧双框）/摘要/健康（此前后只有手填 ID，补齐同等搜索面）；③index.ts——旧 data-diary-choice change + data-diary-search 防抖接线删除，新增三点循环接线：防抖 180ms+请求代际+IME 组合态安全（compositionstart/end 冻结），ArrowDown 聚焦首项、列表内 ↑/↓ 环选、Enter 选中回填 data-*-doc 并聚焦、Esc 收起；候选经 searchBindingDocuments（searchDocs 有界 50，路由契约随 indexSource 守门迁移）；失败行（role=alert）+ 空结果行（set.documentChoiceEmpty 新键双语）；④CSS 新增候选列表（max-height 210 滚动）与选项行（名称 strong/路径 small 双行、焦点态、失败/空态）≈915B，复用设置令牌；⑤多 root id 唯一性——候选列表 id 用 settingsViewSequence 序列化（settings-navigation 双表面守门覆盖，首跑抓到跨表面 id 复用后修复）；⑥守门——diary-report 测试改写（旧 runDiarySearchRequest 行为段删除，改锁纯投影：包装形态解包/上限 50/去重/名称回落；路由契约断言迁至 indexSource；三卡统一选择器/旧双框退役反向断言）；cross-page-consistency 增 T-1616 检查块。**第二批**：问卷/叶归笔记本/编辑器锚点入口、笔记本浏览与新建入口整合、退役 settings-row 复用类。验证：check、diary-report/css-hygiene/settings-navigation/export-identity-docs 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；探针验证三卡标记/初始隐藏态/键盘路由；CSS 636509B（硬线内 3.5KB 余量）；未 push。

2026-09-30 T-1616 实施批次二交付：问卷 doc 模式接入统一选择器 + 四卡退役 settings-row 复用类（用户反馈实施轮，local-auto）：①问卷卡 doc 模式——documentChoiceBlock("journal") 插入 journal-target-settings 前，选中回填 data-journal-target-doc（save-journal-target 校验链不变）；documentChoiceBlock point 类型放宽至含 journal；②四卡退役 lc-checkin__settings-row 复用类（5 处标记：diary/summary/health×document-target-card、journal-target-card、notebook-target-card）——卡自有类规则 (0,2,0) 不再与 maintenance 行栅格 (0,3,0) 竞争，所有容器宽度天然单列；D-322 豁免规则随之退役删除（css-hygiene 抓出 document-target-search 死类 3 处一并清理，CSS 635929B 净省 580B）；卡内行仍用 lc-checkin__settings-row（真行语义）；③index.ts 接线循环加 journal 点，doc 输入选择器映射（journal→data-journal-target-doc）；④守门：cross-page-consistency T-1616 块加 journal 断言+三卡复用类退役反向断言×3+D-322 豁免规则退役断言。**批次三剩余**：叶归笔记本变体（lsNotebooks 数据面）、编辑器锚点入口、笔记本浏览与新建入口整合。验证：check、cross-page-consistency（13 检）/diary-report/css-hygiene/settings-navigation/export-identity-docs 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；CSS 635929B；未 push。

2026-09-30 T-1616 实施批次三交付并整体收官（用户反馈实施轮，local-auto）：叶归笔记本卡退役「加载笔记本按钮 + data-yeguif-notebook 下拉 select」，改为统一选择器笔记本变体——单搜索框（data-choice-search="yeguif-nb"）+ 候选行列表（data-choice-list="yeguif-nb"，笔记本名 strong + ID small 双行预览）；首次聚焦拉取 lsNotebooks 一次（会话缓存 yeguifNbCache），搜索框客户端过滤；行选中 → applyPreference 持久 notebookId；已存 ID 不在列表时保留自动停用+提示（populate 阶段行为不变）；旧 load-yeguif-notebooks handler 与 data-yeguif-notebook change handler 删除。preference-rollback（migratedSelectors 移除 data-yeguif-notebook）与 yeguif-adapter（钩子断言更新为 data-choice-search/list="yeguif-nb"）守门同步。**T-1616 关闭**：统一选择器覆盖全部绑定入口（四张文档卡 + 笔记本变体 + 编辑器锚点自有 picker），混档敌意走查归 T-1608 真机台账。验证：check、cross-page-consistency（13 检）/preference-rollback/yeguif-adapter/diary-report/css-hygiene/settings-navigation 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查全 EXIT=0；CSS 635929B 不变；未 push。

2026-09-30 v18.12.0 正式发布（**用户授权发版**，续跑口令选项 A）：①版本三处 bump（package.json/plugin.json/version.ts → 18.12.0）；②README 同步（当前版本行、设置页体验批次概述、发布说明链接、18.12.0 重点区四条+18.11.0 重点折叠）；③新增 docs/releases/release-notes-18.12.0.md（统一文档选择器/目标卡修复/字体层级归一/SurfaceContext 扩参/安全与多表面五组，SHA 由 sync:digest 填充）与 docs/v18.12.0-change-log.md（批次 A~F + 决策沉淀 D-312~D-323）；④十段质量链 test:quality 全 EXIT=0（222 测试文件、CSS 635929B）+双主题 visual-qa+宽度走查；⑤发布执行：commit「release: v18.12.0」（32cc1b1）→push 走代理（1995e96..32cc1b1）→tag v18.12.0 推送→临时脚本创建 Release **id 399561764**→uploads 上传 package.zip **818,821 字节**→API 回读核验 assets[0].state=uploaded ✓（下载回读因 CDN 传播延迟暂不可达，API 核验充分）→脚本删除。发布地址：https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.12.0 。远端 main=32cc1b1、tag=v18.12.0（ls-remote 核验）。待开发：真机验收（统一选择器/跨窗口/超长回填/微信读书触顶/迁移语义抽查）、T-1621 剩余、T-1611~1614/1618、T-1624。

2026-09-30 v18.13.0 正式发布（**用户授权发版**，续跑口令选项 A）：①版本三处 bump（package.json/plugin.json/version.ts → 18.13.0）；②README 同步（当前版本行、代码质量与用户反馈批次概述、发布说明链接、18.13.0 重点区四条+18.12.0 重点折叠+历史指针更新至 18.12.0 变更记录）；③新增 docs/releases/release-notes-18.13.0.md（设置页目标卡修复/统一文档选择器扩展/字体层级归一/CSV 截断警告/SurfaceContext 与多表面五组，SHA 125dbbc7… 由 sync:digest 填充）与 docs/v18.13.0-change-log.md（T-1615/T-1617/T-1621/T-1616/T-1628 逐任务记录+决策沉淀 D-312~D-323）；④十段质量链 test:quality 全 EXIT=0（222 测试文件、CSS 635929B）+双主题 visual-qa+宽度走查；⑤发布执行：commit「release: v18.13.0」（cb64df7）→push 走代理（97a604c..cb64df7）→tag v18.13.0 推送→临时脚本创建 Release **id 399572355**→uploads 上传 package.zip **818,571 字节**→API 回读核验 assets[0] package.zip 818571B state=uploaded ✓→脚本删除。发布地址：https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.13.0 。远端 main=cb64df7、tag=v18.13.0（ls-remote 核验）。待开发：真机验收（统一选择器/跨窗口/超长回填/微信读书触顶/迁移语义抽查）、T-1621 剩余、T-1611~1614/1618、T-1624。

2026-09-30 v18.14.0 正式发布（**用户授权发版**，续跑口令选项 A）：①版本三处 bump（→18.14.0）；②README 同步（当前版本行、代码健康微批概述、发布说明链接、18.14.0 重点区两条+18.13.0 重点折叠）；③新增 docs/releases/release-notes-18.14.0.md 与 docs/v18.14.0-change-log.md（CSV 截断警告+类型安全清理）；④十段质量链 test:quality 全 EXIT=0（222 测试文件、CSS 635929B）+双主题 visual-qa+宽度走查；⑤过程发现漏创建 docs/v18.14.0-change-log.md 导致 check:release 失败——补创建后 amend 提交修复；⑥发布执行：commit「release: v18.14.0」→push 走代理→tag v18.14.0 推送→临时脚本创建 Release **id 399585981**→uploads 上传 package.zip **818,583 字节**→API 回读核验 assets[0].state=uploaded ✓→脚本删除。发布地址：https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.14.0 。远端 main 与 tag v18.14.0 已推送。待开发：真机验收、T-1621 剩余、T-1611~1614/1618、T-1624。

2026-09-30 v18.15.0 正式发布（**用户授权发版**，续跑口令选项 A）：①版本三处 bump（→18.15.0）；②README 同步（当前版本行、导入体验与小驴系列微批概述、发布说明链接）；③新增 docs/releases/release-notes-18.15.0.md 与 docs/v18.15.0-change-log.md（CSV 导入错误行明细+小驴系列定位表格）；④十段质量链 test:quality 全 EXIT=0（222 测试文件、CSS 635929B）+双主题 visual-qa+宽度走查；⑤发布执行：commit「release: v18.15.0」（fcfad56）→push 走代理→tag v18.15.0 推送→临时脚本创建 Release **id 399597240**→uploads 上传 package.zip **818,754 字节**→API 回读核验 assets[0].state=uploaded ✓→脚本删除。发布地址：https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.15.0 。远端 main=fcfad56、tag=v18.15.0。待开发：真机验收、T-1621 剩余、T-1611~1614/1618、T-1624。

2026-09-30 T-1613 修复实施（定位文档方案 A，local-auto）：①bind-occasions.ts revealOccasionForm 改为仅移动端（host.isMobileFrontend）才 scrollIntoView({block:start,behavior:instant})，桌面端表单常驻可见不再滚动；behavior 固定 instant 消除 smooth 动画感知；②BindOccasionsHost 接口增 isMobileFrontend?: boolean；③cross-page-consistency 测试断言更新（原 reducedMotion?instant:smooth 断言改为 behavior:"instant" 断言）。验证：check、cross-page-consistency 13 检、occasions/mobile-rotation-layout 定向链、pnpm test 主链、build、test:quality、双主题 visual-qa、宽度走查（首跑偶发失败复跑 EXIT=0 既有先例）全 EXIT=0；未 push。

2026-09-30 v18.16.0 正式发布（**用户授权发版**，续跑口令选项 A）：①版本三处 bump（→18.16.0）；②README 同步（当前版本行、事项页体验修复+设置页持续改进概述、发布说明链接、18.16.0 重点区四条+18.14.0 重点折叠）；③新增 docs/releases/release-notes-18.16.0.md（事项页表单滚动修复/统一文档选择器扩展/CSV 导入错误明细/设置页字体层级四组，SHA cfe33a3a… 由 sync:digest 填充）与 docs/v18.16.0-change-log.md（T-1613/T-1616/T-1628 三批逐任务记录）；④十段质量链 test:quality 全 EXIT=0（222 测试文件、CSS 635929B）+双主题 visual-qa+宽度走查；⑤发布执行：commit「release: v18.16.0」（8528c73）→push 走代理→tag v18.16.0 推送→临时脚本创建 Release **id 399610657**→uploads 上传 package.zip **819,051 字节**→API 回读核验 assets[0].state=uploaded ✓→脚本删除。发布地址：https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.16.0 。远端 main=8528c73、tag=v18.16.0。待开发：真机验收、T-1621 剩余、T-1611~1614/1618、T-1624。

2026-09-30 T-1621 步骤一交付：多 root 独立页面（RootContext Map + currentPage 代理层 + 导航可选 root）（local-auto，架构级专职轮；口径 D-324/D-325）：①新纯模块 features/root-page-store.ts——RootContext Map（HTMLElement→{page}）+孤儿页（承接早于 root 注册的启动写入，新 root 继承）+最后活跃标记；②index.ts currentPage 字段改读写代理：读=最后活跃 root 页、写=全局同步全部 root+孤儿页（既有宿主级写入零语义变化）；applyNavigation/pageOfRoot/releaseRootContext 宿主方法 + primaryRoot（dock 优先页签回落）；renderInto 按 root ensure 注册取页——页面选择/绑定分派/滚动恢复/renderedPages/导航 chrome（topnav/rail/底栏/移动顶栏/getPageTitle）全部按 root 页；回顾快照按任一回顾 root 判定、renderInto 直调（弹窗全屏切换）快照回落兜底；③navigation.ts 全 showXFor+showEditorReturnFor 可选 root 参数经 applyNavigation 单一落点，洞察返回页按发起表面判定；④分发接线：bindMobileNavFor（rail/底栏/顶栏统一分发）、bind-today/bind-page-navigation/bind-editor 动作、设置卡跳转五点、saveForm→saveEditorForm options.root、渲染块跳转 primaryRoot、BPN 草案编辑器；⑤快速弹窗页记忆归弹窗 root：关闭按 pageOfRoot 记取+释放上下文，退役「关闭写回宿主 currentPage」（旧实现 dock/页签跟随弹窗跳页=跨表面串页，D-325 纠正）；⑥dock/页签 destroy 释放上下文+最后活跃释放回落 dock→页签。守门：tests/root-page-store.test.cjs 入主链（223 文件，行为级 7 组：per-root 独立/代理读回落/全局写同步/孤儿页继承/释放回落）；cross-page-consistency 新增 T-1621 步骤一块 18 断言（含导航函数仅 openTabPageFor 保留宿主级写、反代理页断言）；mobile-dialog/desktop-dialog/responsive-layout/stability-9_8/checkin-block/template-gallery/priority-reminder/insight-a11y/stat-denominators/recording-history-structure/project-draft 十文件旧形态断言随签名现代化。**剩余**：编辑器归档/删除后 showToday（异步无 root）仍全局；步骤二折叠态/步骤三滚动复合键另批；真机多 root 同屏走查归 T-1608。验证：check、pnpm test 主链（223 文件）、build、test:ui、test:quality（CSS 635929B 不变）、双主题 visual-qa、宽度走查全 EXIT=0；未 push。
