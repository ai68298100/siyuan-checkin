# 小驴打卡 唯一页面/能力/状态注册表（T-1575，2026-09-28）

## 定位与维护规则

- **本文件是页面/能力/状态登记的唯一真值**：T-1545（联动专项视图）、T-1561（设置字段与保存视图）、T-1568（编辑器字段视图）从对应章节派生，不另建第二份全量清单。
- 基线：v18.9.0 + T-1609/T-1610（2026-09-28，提交 233ca53）。任务交付时**只更新对应行与证据**，不重写全表。
- 状态词表（四值，沿用 D-307）：**已有**（代码已交付且验收）／**需调整**（已有基础，按任务卡增量改造）／**新增**（当前不存在，待任务实施）／**外部待验**（依赖上游/真实宿主证据，本地不冒充）。
- 证据规则：每条登记附 `file:line` 源码证据；测试证据只列实际存在的守门文件。设计稿截图只证明布局；外部来源连通性必须有真实宿主证据，否则标 `host-pending`。

## 表面总览

| 表面 | 渲染入口 | 状态 | 主要派生视图 |
| --- | --- | --- | --- |
| 今日行动台 Today | `renderToday` index.ts:4897 → render/fragments.ts:436 | 已有（结构）+ 需调整（首屏层级，T-1577） | T-1545/T-1603 |
| 回顾 Review（三工作区） | `renderReview` index.ts:4997 → render/review.ts:92 | 已有（结构）+ 需调整（分层/回链，T-1578） | T-1548 |
| 单项洞察 Insights | `renderInsights` index.ts:4692 | 已有 + 需调整（行动化，T-1579；atMost 口径已修 T-1609） | T-1590/T-1591 |
| 编辑器 Editor | `renderEditor` index.ts:5115 → render/editor.ts:83 | 已有（能力）+ 需调整（类型驱动分区，T-1568/1569） | T-1568 |
| 事项 Occasions | `renderOccasions` index.ts:5087 → render/occasions.ts:23 | 已有 + 需调整（agenda 分层，T-1580） | T-1592/T-1593 |
| 归档 Archive | `renderArchived` index.ts:5082 → render/archived.ts:52 | 已有 + 需调整（恢复预览/危险区，T-1581） | T-1594/T-1595 |
| 设置 Settings（九组） | `renderSettings` index.ts:3369 → render/settings.ts:146 | 已有 + 需调整（字段注册表/总览，T-1561/1562） | T-1561 |
| 问卷日记 Journal | openJournalEntry index.ts:862 → render/journal-dialog.ts:186 | 已有（双结果内核）+ 需调整（分层/双结果并列，T-1587/1588） | T-1552 |
| 提醒中心 Reminder | projectReminderCenter src/reminders.ts:156 | 已有（共用投影）+ 需调整（统一呈现，T-1585） | T-1554 |
| 专注 Focus/Tomato | render/focus-timer.ts:32 + dock-tomato.ts:413 | 已有 + 需调整（跨页生命周期，T-1596） | T-1551 |
| 快速弹窗 Quick dialog | render/quick-dialog.ts:71 | 已有 + 需调整（会话恢复，T-1597） | T-1582 |
| 渲染块/页签/Dock | index.ts:1920(块)/1795(dock)/1823(tab) + render/block-renderer.ts:95 | 已有 + 需调整（降级一致性，T-1598） | T-1582 |

## 共用通道（所有表面共享，登记一次）

- **写事件唯一通道**：宿主 `enqueueMutation` 串行化 → model `appendEvent(s)`/`removeEvents`/`updateEventNote` → `persist()`，失败回滚 + `msg.saveFail`/retry-save（index.ts:6080-6103；fragments.ts:185-188）。公开 API 与 Agent 写入同走此通道（api.ts:235-247、agent-capabilities.ts:192）。
- **视图偏好即时持久化**：`persistViewPreferences`（index.ts:6701），成功/失败 `msg.prefSaved/prefSaveFail`（index.ts:3623）。
- **设置草稿通道**：显式保存字段基线/草稿 `settingsSavedBaselines/settingsDrafts`（index.ts:3462-3504），单项撤回 `revertSettingDraft:3476`、分节恢复 `revertSettingSection:3482`。
- **外部失败待处理箱**：features/external-pending.ts（容量 40:37、保留 14 天:39、五闸重试决策 `planExternalPendingRetry:193`；仅 persist 失败入箱，拒绝不转投）。UI 在设置外部区（settings.ts:289-314；动作 index.ts:4360/4366）。
- **页面路由/会话态**：currentPage 七页联合（quick-dialog.ts:17），`navigation.ts:28-117`（showXxxFor + openTabPageFor）；会话态（bulkSelected、historyQuery*、reviewWorkspace、recordDetailsExpanded、insightsReturnPage 等）集中在 bind-page-navigation.ts:55-61 一类模块，重载即失（T-1599/T-1603 契约的登记基础）。
- **状态词表现状（需统一前的实况）**：来源卡 `sourceState` 三态 enabled/ready/setup（settings.ts:247）+ 运行态 unprobed/available/missing（projectIntegrationStatus settings.ts:39-53）+ 问题态（last-read/write-failed）；番茄提供方 9 态（settings.ts:156-167）；Agent 4 态（settings.ts:148-155）；Task Horizon 恒 waiting（settings.ts:465）；诊断 5 类（features/diagnostics.ts:7-16）；摄取报告 outcome 键（sourceReportLine settings.ts:284-288）。→ T-1554 的统一对象就是这份实况。

## 1. 今日行动台 Today

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 实际入口 | 三套导航 `data-mobile-nav="today"`（index.ts:4748/4766/4773；绑定 plugin-ops.ts:106-116）；自定义页签 navigation.ts:89-117；命令 open-tab index.ts:1862；quick 弹窗默认页 | 已有 |
| 主动作 | 记录 recordEvent（bind-today.ts:378-441，at-most 破戒反转 405-419）；快捷步长 324-339；二值 toggle 289-302；精确录入/附件≤500KB 344-377；NLP 速记 161-177；撤销 185/index.ts:6152；跳过（右键 today-bindings.ts:242-249→index.ts:5366；批量 index.ts:5428）；批量六动作（today-bindings.ts:120-210）；筛选/排序/分组/折叠（127-271，偏好持久化）；专注 304-323（atMost 禁用）；问卷 340-343；那年今天/周负荷/洞察跳转 224-232 | 已有 |
| 输入/输出·保存 | 记录/跳过/批量写事件经 model 单一实现；视图偏好即时持久化；bulkSelected/expandedExactEntries/todayQuery/pendingAttachments 为会话态；行动台/周负荷/那年今天为只读投影（today-dashboard.ts:134、week-load.ts:50、this-day-history.ts:53）；**单项目事实切片经 today-fact.ts 整口径取当日修订（T-1610）** | 已有 |
| 空态/失败 | 五组空态文案（fragments.ts:479-513：无项目/引导/无排期/搜索无结果/已完成区空）；保存失败条+重试（fragments.ts:188）；专注缺失提示 fragments.ts:432 | 已有 |
| 回链 | 回顾（history/summary）、洞察、归档、事项、编辑器、页签、pastDiary（bind-today.ts:203-236） | 已有 |
| 宿主能力 | focusTimerProvider 探测（bind-today.ts:313-317）；occasionStore；quickEntryNlp；supportsCustomTab | 已有 |
| 证据 | 主链：today-dashboard/today-fact/quick-steps/quick-entry-nlp/quick-entry-capabilities/this-day-history/first-success/priority-reminder/week-load/journal-templates/view-preferences；UI 链：today-search-ime/today-context-menu/checkin-toast/skip-*/journal-experience/desktop-dialog/stability-9_8b/at-most；extended：today-view/v6-efficiency/recording-history-structure/cross-surface-interaction；双主题 visual-qa + 宽度走查 | 自动证据已有；宿主证据 host-pending |
| 缺口 | 首屏「下一步→待做→记录结果」收束、重复进度合并（overview 进度环 fragments.ts:545 与 console 总计 424-433 并存）、工具条统一 → T-1577（前置 T-1610 已交付） | 需调整 |

## 2. 回顾 Review（概览/记录/分析三工作区）

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 实际入口 | 导航 data-mobile-nav="review"（plugin-ops.ts:109）；今日 history/summary 动作（bind-today.ts:203/220→index.ts:2808/2814）；设置页 review 动作 index.ts:4407；洞察返回 bind-page-navigation.ts:292-294；三工作区子导航 review.ts:652（切换会话态 bind-page-navigation.ts:298-308） | 已有 |
| 主动作 | 概览：范围/自定义区间（bind-page-navigation.ts:844-885）、保存视图 CRUD（index.ts:4805-4854，上限10）、AI 总结 index.ts:5560（provider 超时、快照入 analysisHistory 5614-5622）、建议 confirm/undo 896-915、分析历史比较 916-956、报告复制/导出 1054/1092、周复盘 save/export/clear（index.ts:1609-1620）、导出 csv/json/share-card（index.ts:5711/2767/5716）、节奏日/分母/热力图跳转 423-452、提醒行内动作 286-291、逾期补记+可撤销 244-270。记录：搜索/渠道/计量/排序/范围/翻月/选日（490-589）、批量补记预览流（597-661→index.ts:5491，appendEvents+失败整批回滚；archived/atMost/已有事件过滤 5537-5543）、单删/备注/详情展开（662-750，详情会话态≤50）。分析：趋势/强项/横向比较 2~4 项目（347-389） | 已有 |
| 输入/输出·保存 | 批量补记/单删/备注写事件（mutation+回滚+invalidateSummary+broadcast）；折叠/报告开关/保存视图/周复盘草稿即时持久化；historyQuery*/compareSelection/详情展开会话态；AI 总结依赖 summaryProviders（外部 AI，零本地模型） | 已有 |
| 空态/失败 | historyDayEmpty/historyFilterEmpty（review.ts:305）、emptyProjects（358/440）、remindersEmpty（496）、rhythmEmpty（148）、denominatorNone（585）、总结 stale/none（index.ts:5003-5005）、summaryError 5039、缓存写失败 review.assistantCacheSaveFailed 5625 | 已有 |
| 回链 | 洞察（455-458/486-489）、编辑器草稿（openProjectDraftEditor）、日期钻取 jumpToHistoryDate、汇总行→洞察、锚点行→文档 openTab（index.ts:529-542） | 已有（比较器可搜索化等 → T-1578 需调整） |
| 宿主能力 | analytics 快照（ready 态闸 index.ts:3190）；外部 AI provider；无外部来源依赖 | 已有 |
| 证据 | 主链：record-details/batch-backfill/history-channel-filter/stat-denominators/item-trend-compare/weekly-review/record-trust/history-filter/analysis-history/local-summary/agent-suggestions/reminder-actions/view-scope/view-preferences；UI 链：review-presentation/review-assistant/review-workspace/analytics-snapshot/review-compare-view/review-layout-regression/report-sections/report-deviations/strength-view 等；extended：review-analytics-projection/review-asof/review-summary-refresh/review-performance-baseline/suggestion-* 系列 | 自动证据已有 |
| 缺口 | 工作区职责/入口层级再分层、比较器候选可搜索、回顾直达文档写入（若新增，复用 T-1548 目标/输出动作）、补记入口对归档项目阻止的显式说明 → T-1578 | 需调整 |

## 3. 单项洞察 Insights

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 实际入口 | renderInsights index.ts:4692；今日卡次级按钮/工具条/连击徽章/右键（bind-today.ts:105-108/221/285-288；today-bindings.ts:244/282）；回顾两处跳转（bind-page-navigation.ts:455-458/486-489）；导航处理器支持 insights 但固定导航无此项（plugin-ops.ts:111 vs index.ts:4748/4766/4773） | 已有 |
| 主动作 | 仅两个：项目切换 data-insight-item（bind-page-navigation.ts:271-277）、返回（292-294）。整页只读无写动作 | 已有 |
| 输入/输出·保存 | 只读聚合 buildHabitInsights（features/insights.ts:82，固定 84 天；完成判定经 model.evaluateDayCompletion 唯一公式——T-1609 已修，戒除类 守住/破戒词表与 isComplete 逐日一致）；computeLongestStreaks index.ts:4697；coaching（features/coaching.ts:14，戒除类不给反向建议）；持久化仅 insightsItemId 随视图偏好；insightsReturnPage 会话态 | 已有 |
| 空态/失败 | 项目缺失 insights.empty（index.ts:4694）；周趋势不足 notEnough（4726）；戒除重启说明 streakRestart（4708） | 已有 |
| 回链 | 仅 back→today/review；无「跳回记录/编辑规则」入口 | 需调整（T-1591） |
| 宿主能力 | 无外部依赖，纯 store 派生 | 已有 |
| 证据 | 主链：insights/insights-atmost/coaching/insight-records/habit-quality/entry-capabilities；UI 链：insight-a11y/strength-view；extended：v7-insights；skip-tolerance 引用 | 自动证据已有 |
| 缺口 | 范围/可搜索项目选择（T-1590）、日历/趋势钻取与行动 CTA、配额/稀疏/异常日期解释 → T-1579/1590/1591 | 需调整 |

## 4. 编辑器 Editor（新建/编辑）

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 实际入口 | showEditor index.ts:2835→navigation.ts:68；今日「+」/卡片编辑/键盘 e/右键/周负荷/绑定卡/移动添加（bind-today.ts:273-282、today-bindings.ts:109/280、bind-today.ts:232、index.ts:3874/4751） | 已有 |
| 主动作 | 保存 submit（bind-editor.ts:1070-1127→index.ts:5735→save-form.ts:24）；保存并继续（仅新建 bind-editor.ts:1082/1121-1127）；存为模板 951-993（checkin-user-templates）；归档/删除（editor.ts:317→index.ts:5844/5938，删除含影响预览 projectLifecycleImpact 5864-5866+数量复核+级联墓碑）；模板套用（内置/最近/推荐/组合包/我的模板 bind-editor.ts:661-877）；模板分享导入导出 879-950（纯函数 template-share.ts:74）；锚点选择/新建文档 266-296；智能体草案预填 1133-1172（project-draft.ts:55） | 已有 |
| 输入/输出·保存 | 显式保存：saveEditorForm 装配 CheckinItem+revisions（save-form.ts:92-110），persist 失败回滚零副作用（148-161）；编辑指纹冲突拒存（57-61）；草稿仅存 DOM 无独立持久化；联动计划走隐藏 input linkagePlan（editor.ts:210）；atMost 仅 daily 否则回落（save-form.ts:81-82）；锚点非法显式拒绝（74-79） | 已有（字段级登记 → T-1568 需派生） |
| 校验/空态 | editor-validation.ts:19-27（name/target/unit/weekdays/quotaAmount）；模板搜索空态 editor.ts:195；图标空态 229；锚点无候选 113 | 已有 |
| 回链/预演 | 今日卡动作预览 describeEditorPreviewActions（editor.ts:21-62，实时更新 bind-editor.ts:292-366）；30 天排期预演 schedule-preview.ts:95（fail-closed）；规则变更对照 rule-change-diff.ts:45+确认弹窗（取消零写入 bind-editor.ts:1090-1118）；联动建议卡 renderLinkageCard（bind-editor.ts:106-141）；问卷绑定（仅 binary 530）；锚点区+挂起告警 editor.ts:279-292；Task Horizon 显示开关→save-form.ts:84 | 已有（排期/方向仍在高级区 → T-1571/1572 需调整） |
| 宿主能力 | 无直接外部依赖；问卷/锚点/番茄/Task Horizon 为预接线（需调整：项目↔来源定向回链 T-1568） | 已有 |
| 证据 | editor-validation/schedule-preview/rule-change-diff/name-inference/project-draft/interval-editor/quick-steps/note-anchor*/template-gallery/import/manager/packs/share/templates/journal-templates/mobile-editor-*/ui-state-ledger | 自动证据已有 |
| 缺口 | 类型驱动分区（T-1569）、模板入口统一标示（T-1570）、预览/保存操作栏共用计算（T-1573）、旧项目兼容切片验收（T-1574） | 需调整 |

## 5. 事项 Occasions

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 实际入口 | showOccasions index.ts:2827→navigation.ts:52；今日卡 occasions 芯片/即将来临「管理」（bind-today.ts:222、fragments.ts:107/115）；移动/桌面导航 bind-page-navigation.ts:454 | 已有 |
| 主动作 | 新建/编辑/取消（bind-occasions.ts:42-60）；转打卡 data-occasion-toitem 61-63→index.ts:6464（binary+daily+archivePeriods 遮蔽非发生日 6484-6487，重复守卫 6489）；启用/停用 64-67；删除 69-73；错过补标 77；单次改期 94-99→index.ts:6585（overrides，次日生效口径 6582-6584）；模板芯片/分类页签 occasions.ts:100-112 | 已有 |
| 输入/输出·保存 | 表单显式保存 saveOccasionForm index.ts:6504（normalize→upsert→persistOccasions，失败回滚 msg.occasionSaveFail）；toggle/删除/补标/改期即时逐动作 mutation 各自回滚；completedDates/overrides 写 OccasionStore 独立于打卡事件 | 已有 |
| 校验/空态 | normalizeOccasion 失败 msg.occasionInvalid index.ts:6528；表单 required（occasions.ts:126/129）；筛选空态/全空 occasions.ts:88；农历提示 141 | 已有 |
| 回链 | linkedOccasionId→今日卡显示（index.ts:6487）；芯片点非今日事项跳回事项页（fragments.ts:107） | 已有 |
| 宿主能力 | 无外部依赖 | 已有 |
| 证据 | occasions.test.cjs（renderOccasionsView 另命中 desktop-dialog/v6-efficiency）；提醒侧 reminder-projection/reminder-actions | 自动证据已有（覆盖偏薄，标注） |
| 缺口 | agenda 列表优先/编辑抽屉（T-1580/1592）、分步编辑与转打卡预览确认（T-1593，现状直接建项仅重复 toast） | 需调整 |

## 6. 归档 Archive

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 实际入口 | showArchived index.ts:2823→navigation.ts:44；今日 data-action='archived'（bind-today.ts:205）与空态「查看归档」（fragments.ts:490） | 已有 |
| 主动作 | 行内恢复/删除（bind-page-navigation.ts:811-818，busy 防重入 785-806）；批量恢复/删除（833-840，全选/计数 815-832，批量栏选中后才显示 archived.ts:74）；搜索/清空（archived.ts:75） | 已有 |
| 输入/输出·保存 | 恢复 restoreArchivedItems index.ts:5951（闭合 archivePeriod：started≥today 删除否则 endDate=today 5963-5969，失败回滚 5974-5979）；删除复用 deleteItemWithRecords（影响预览+墓碑+恢复点）；摘要投影 buildArchivedItemSummaries archived.ts:16（completedDays/lastRecordAt） | 已有 |
| 空态/失败 | 查询无结果 vs 全空区分（archived.ts:72）；失败走各 mutation 回滚+toast | 已有 |
| 回链 | 编辑器归档成功回今日（index.ts:5856）；恢复后停留归档页（5983）；今日空态跳归档/新建 | 已有 |
| 宿主能力 | 无 | 已有 |
| 证据 | archived-search/restore-audit/auto-archive-performance/batch-lifecycle-performance/tombstone-* | 自动证据已有 |
| 缺口 | 原规则/关联状态与恢复预览（T-1594：当前未存手动/自动原因，旧项目只能标未知）、永久删除独立危险区（T-1595）、操作日 vs 次日生效日期分开标注 | 需调整 |

## 7. 设置 Settings（九组）

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 实际入口 | 今日齿轮（bind-today.ts:235→index.ts:2831）→ renderSettings index.ts:3369→renderSettingsView settings.ts:146；九组定义 settings.ts:390-630（appearance/today/dialog/shortcuts/data/host/documents/external/about）；行搜索+Enter 首项（settings-navigation.ts:40-80）；导航滚动同步 index.ts:4680 | 已有 |
| 主动作·显式保存 | **变更清单 10 字段**（features/settings-change-list.ts:15-26）：journal-custom/journal-mode/journal-notebook/journal-target/diary-doc/summary-doc/health-doc/reminder-slots/weread-threshold/weread-key（敏感遮罩 :46）；保存动作：save-reminder-slots index.ts:3682（失败回滚 3693-3696）、save-journal-* 3775/3789、save-weread 4108（Key 留空保留、整体回滚 4120-4128）、文档目标统一校验保存 bindVerifiedDocumentSave 3728-3756（validateBindingTarget→persist 失败回滚；diary/summary/health 三入口） | 已有 |
| 主动作·即时持久化 | 偏好开关 3653-3675（group/sort/completed/weekstrip/appearance/language/open-mode/nlp/motion/haptic/安静时段）；提醒 3677/3699；专注提供方与回退 3704/3711；diary/summary 开关 3717/3759（无 docId 拒启 3719-3723）；来源开关 sireader/siplayer/item 3886-3943（断开保留事件 planSourceDisconnect 3902）；health 3944-3993（单位不符强制停用）；yeguif 4139-4227（笔记本经 lsNotebooks 4189，失效自动停用 4196-4202） | 已有（逐字段登记 → T-1561 需派生） |
| 来源卡动作 | refresh-source（立即读取）index.ts:3624-3640（health/notequery/weread/yeguif 四 ingest）；preview-source 3641-3652；weread-pull 4136；load-yeguif-notebooks 4183；日记文档搜索防抖 4235-4254（/api/query/sql）+ create-diary-doc 4291（createDocWithMd）。⚠️ 动作词不统一：weread 仅 pull、sireader/siplayer 无即时动作 → T-1553 | 需调整 |
| 绑定体检 | check-note-bindings index.ts:3814-3868（SQL IN 批量+lsNotebooks；状态键 bind.statusOk/Missing/Error/Unknown）；行动作 open/edit/goto-binding 3869-3885；数据源 features/note-bindings.ts。⚠️ 只读无就地修复 → T-1559 | 需调整 |
| 待处理箱/番茄问题 | 待处理箱渲染条件与动作（settings.ts:289-314；index.ts:4360/4366；纯函数 external-pending.ts）；番茄完成问题 15 类 reason（settings.ts:330-346，export/clear 4326/4332）；番茄收件箱 inbox-retry/undo-skip/discard（4336-4351；features/docktomato-inbox.ts 容量 200、重试 1s/5s/30s） | 已有（归属拆分 → T-1551 需调整） |
| 诊断/数据组 | 诊断行+导出（settings.ts:449；features/diagnostics.ts 5 类、上限 20）；审计 450-451（auditEmpty）；快照恢复 444-448；导入 JSON/CSV/Loop/Obsidian 443-454 | 已有（卡片隔离 → T-1566 需调整） |
| 状态/空态 | sourceState 三态+rebind（247-249）；运行态三态（39-53）；摄取报告 outcome（284-288）；siplayer 宿主三态（223-228）；项目下拉缺失/归档/保留（201-216）；思阅/微信读书同项目冲突提示（263-265） | 已有（六类统一 → T-1554 需调整） |
| 宿主能力 | 思源 kernel API（SQL/filetree/notebook/notification）；外部来源五件套；契约行 api/taskhorizon/docktomato（463-473，taskhorizon 恒 waiting） | 已有 + 外部待验（真实宿主） |
| 证据 | settings-change-list/settings-navigation/external-pending/health-inbox/source-framework/source-sandbox/source-lifecycle-matrix/各 adapter/note-bindings/note-query/note-anchor*/diagnostics/import-conflicts/import-preview/backup/restore-audit/preferences-docs/dependency-status/i18n-parity/i18n-hygiene/ui-state-ledger；T-1567 迁移验收：settings-migration（逐字段三面对账/四组结构/存储键/双语）+ settings-overview（总览投影）+ today-fact（行动台口径） | 自动证据已有；T-1565~1566 已落地（分区合并+数据隔离，迁移守门在位）；真实内核 host-pending |
| 缺口 | 首页总览投影（T-1562）、字段级搜索导航（T-1563）、分区重组（T-1564/1565）、迁移与切片验收（T-1567） | 需调整 |

## 8. 问卷日记 Journal

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 实际入口 | 项目卡 data-action='journal'（bind-today.ts:340-343）→ openJournalEntry index.ts:862（模板缺失回退普通打卡 868-872；预检 alreadyWritten 876-883）→ journal-dialog.ts:186 | 已有 |
| 主动作 | 答题 slider/text/textarea（journal-dialog.ts:188-200）；目标配置 daily/doc+笔记本+docId（204-209）；文档选择器 bindDocumentTargetPickerFor:28（防抖 180ms、失败重试）；必答 fail-closed 251-258；草稿 onDraft 239（index.ts:891-896） | 已有（目标配置与答题混窗 → T-1587 需调整） |
| 双结果提交 | index.ts:899-923：先 recordEvent 事实层（失败即中止不旁路 912-913）→ writeJournalEntry 842-860（SQL 幂等查重 846→updateBlock/appendBlock；返回 {ok,updated,docId,docName,reason}）；审计 channel:journal 917；结果 toast 919；失败保留答案+retryHint（journal-dialog.ts:279-282）；重填不重复记事实 910-911 | 已有内核；页内并列双结果+独立补写入口 → T-1588 新增 |
| 模板构建器 | bindJournalBuilder（journal-dialog.ts:92-184，挂载 index.ts:3505-3509）：模板上限10/题上限20/排序/Ctrl+↑↓/撤销/预览；textarea 唯一保存边界（102-105），确认走 save-journal-custom；数据层 features/journal-templates.ts | 已有（分步化 → T-1589 需调整） |
| 宿主能力 | 思源块 API（SQL/updateBlock/appendBlock）；写入失败不回滚打卡事实 | 已有 |
| 证据 | journal-templates/journal-experience/template-manager 等模板系列 | 自动证据已有 |
| 缺口 | T-1587/1588/1589（见上）；提交前答案预览缺失 | 需调整 + 新增 |

## 9. 提醒中心 Reminder

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 唯一投影 | projectReminderCenter（reminders.ts:156-206，单次遍历+稳定排序；occasion 逾期/窗口+checkin 今日 85-102，跳过日不投影 88-90）；用户动作 applyReminderActions 264-280（snooze 当日/防抖、skip 持续、completed 终态）；动作存储 normalizeReminderUserActions 221（上限 200、snooze 7 天清理）；独立契约层 features/reminder-projection.ts | 已有 |
| UI 呈现 | 回顾页折叠区 renderReminders（review.ts:464-506）+过滤下拉（all/overdue/today/upcoming/completed）；行内动作 snooze/defer/skip/restore（476-483→bind-page-navigation.ts:286-293→index.ts:6546-6571，失败回滚）；逾期补记（498-501）；今日页横幅 renderPriorityReminderView（fragments.ts:172-181，选择器 features/priority-reminder.ts；动作跳转 bind-today.ts:109-122） | 已有（统一呈现 → T-1585 需调整） |
| 主动通知 | maybeSendDailyReminder index.ts:6901-6943（槽位/补发、安静时段 6910、聚合 digest features/reminder-digest.ts、pushMsg 6939 失败静默）；降噪 advanceOnce reminders.ts:147-151 | 已有 |
| 宿主能力 | /api/notification/pushMsg | 已有 |
| 证据 | reminder-projection/reminder-actions/reminder-digest/reminder-quiet/reminder-tolerance/priority-reminder/occasions | 自动证据已有 |
| 缺口 | 今日只投影前 1~3 条+查看全部（T-1585）、动作作用域（实例 vs 规则）UI 说明与批量处理（T-1586） | 需调整 |

## 10. 专注 Focus / Dock Tomato

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 内置计时 | data-action='focus'（bind-today.ts:304-323：atMost 拒绝 309-312；docktomato/completionSource=tomato 走适配器 313-320）；面板 focus-timer.ts:32（复用不重置、预设 15/25/45/60:123、pause/finish/abandon 131-163）；入账 ≥1 分钟 87-115（不足提示 focusTooShort 112）；卸载清理 stopFocusTimerFor:53 | 已有 |
| Dock Tomato 桥 | installDockTomatoBridge dock-tomato.ts:413-664（装配 index.ts:1881）；探测 9 态 inspectDockTomatoProvider:103（必需能力 status/start/pause/completion-event:52）；start 归属校验 494-518；完成结算 evaluateDockTomatoCompletion:273（15 类拒绝/阻止 reason:125）；幂等身份 docktomato:<sessionId> 300/573；墓碑 553；窗口事件 645-649 | 已有 |
| 适配器 | focus-adapter.ts（startFocusFor:56 业务指纹含 direction/tomatoMode 28-34、错误码→文案 36-54、stopFocusFor:127） | 已有 |
| 状态 | 提供方 9 态（settings.ts:156-167）；今日页提示键 DOCK_TOMATO_MESSAGE_KEYS（bind-today.ts:80-90） | 已有（语义收口 → T-1549/T-1551 需调整） |
| 证据 | focus-adapter/dock-tomato-bridge/dock-tomato-completion/dock-tomato-integration/docktomato-inbox/interval-editor/skip-* | 自动证据已有；真实 Dock 宿主 host-pending |
| 缺口 | 跨页小条/重载恢复（T-1596：状态仅会话内存，docktomato 会话归属在桥内存 ownedFocus:419）；净时长口径（T-1538，条件批次） | 需调整 |

## 11. 快速弹窗 Quick dialog

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 入口 | 顶栏 openCheckinDialog（index.ts:1911-1917）；移动端 topbar 注入（quick-dialog.ts:288-311，缺宿主 800ms 重试）；小驴速切 launcher（326-363，未装 1200ms 重试、防重复注册） | 已有 |
| 能力/主动作 | toggle 63-69；siyuan Dialog 创建/销毁（88-97，destroyCallback 94）；全屏 253-259；桌面拖动+八向缩放+双击最大化 127-250；尺寸四模式 fullscreen/fixed/auto/scale 49-61（偏好持久化）；移动端 visualViewport 适配 365-392；内部页签=七页 currentPage 17 | 已有 |
| 状态/降级 | disposed/disposing 短路 72；初始化失败消息 100-102；销毁兜底清 viewport/frame 并重置页码 270-286 | 已有 |
| 宿主能力 | 思源 Dialog/window；supportsCustomTab 影响页签入口 | 已有 |
| 证据 | desktop-dialog/mobile-dialog/mobile-rotation-layout/mobile-editor-keyboard/responsive-layout/width-walkthrough/view-preferences/entry-capabilities/quick-entry-capabilities/cross-surface-* | 自动证据已有 |
| 缺口 | 会话保留（页签/筛选/草稿）、未保存编辑提示（T-1597）；移动端次要入口收溢出菜单 | 需调整 |

## 12. 渲染块 / 页签 / Dock

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 入口 | 渲染块 eventBus loaded-protyle-static/dynamic（index.ts:1920-1925）+数据事件刷新 1928-1933+延迟补扫；Dock addDock index.ts:1795-1813（LeftBottom 420px）；页签 addTab 1823-1846（仅 supportsCustomTab）；快捷入口按 surface 交集注册 1848-1855；默认入口偏好路由 1856-1860 | 已有 |
| 能力/主动作 | 渲染块定位 ```checkin``` 块插只读预览（block-renderer.ts:95-170，归属标记防互删 101-107）；today 视图记录→宿主 recordEvent（144-155，data-record-pending 节流；chips 增量）；deps 回调面 20-36（onJumpDate/onJumpItem/onBlockTodayRecord 等）；MutationObserver 200ms 防抖 175-193 | 已有 |
| 写边界 | 预览只读；唯一写路径 onBlockTodayRecord→宿主既有幂等通道（T-1412 注释 30-32） | 已有 |
| 宿主能力 | 思源 protyle/dock/tab API | 已有 |
| 证据 | checkin-block/block-dom-compat/block-presets/quick-steps/today-view/today-context-menu/cross-surface-* | 自动证据已有 |
| 缺口 | 宽 dock/窄列/页签重载/多块并存/teardown 降级一致性（T-1598） | 需调整 |

## 13. 公开 API v5（对外能力）

| 字段 | 登记 | 状态 |
| --- | --- | --- |
| 方法表 | CheckinApi 接口 api.ts:20-72；工厂 createCheckinApi 109-320；协议 protocol/version=5（api-contract.ts:1-2）；20 项能力清单（40-62）；限额 events.range 366d/5000、events.read 200ids、batch 200（4-29） | 已有 |
| 只读面 | getStore/getItems/getEvents、getEventRangeSummary、getCalendarProjection（服务端滤隐藏/归档 api.ts:147-153）、getEventsInRange（truncated）、queryItems、getStreaks（封顶 200）、getDiagnostics、getStrengthSummary、exportJson/Csv（142-233） | 已有 |
| 写面 | completeOccasion/setItemArchived（指纹乐观锁）/recordEvent/recordEventsBatch——经宿主 enqueueMutation；**防伪造**：sireader/siplayer/weread/yeguif 输入一律回落 api（238-239） | 已有 |
| 注册面 | registerFocusAdapter（注销不模拟用户停止 252-253）、registerSummaryProvider、subscribe 8 事件（254-318） | 已有 |
| v5 纯边界 | features/api-v5.ts：filterEventsInRange:16、projectItems fail-closed:42、planBatchRecord:112（判定序 duplicate→discarded→blocked→recorded；blocked 五原因 201-221）；批身份 `${itemId}\u0000api\u0000${externalRef}`:178 | 已有 |
| 契约/证据 | docs/contracts/checkin-api-v5.json；api-v5/api-v5-docs/api-contract/calendar-projection/contract-kit/aux-write-hygiene/tombstone-*/source-lifecycle-matrix | 已有；真实第三方消费方 host-pending（T-1366） |

## 14. Task Horizon（消费方参考层）——外部待验

- 契约对象 TASK_HORIZON_CONTRACT（ecosystem.ts:11-26：read=analytics.read/getEventRangeSummary、write=events.record*、source="api"、externalRefPrefix "taskhorizon:"、刷新 4 事件）；身份 createTaskHorizonExternalRef（taskhorizon:<blockId>:<localDate>，54-60）；前缀注册表 8 前缀（85-94）。
- 读面数据层 buildCalendarProjection（calendar-projection.ts，at-most-safe/breach 专用状态）；能力协商参考层 contracts/siyuan-checkin-contract/calendar-consumer.mjs（negotiateCalendarRead 拒绝三态、planProjectionRange 366 天钳制、planCalendarRefresh 四类）。
- 设置页状态恒 waiting（settings.ts:465）；**对方未实现，全链外部待验**（T-1392/1394/1165/1228-1230）。证据：task-horizon-bridge/contract/mock-consumer/calendar-consumer-kit/ecosystem/external-ref/dependency-status。

## 15. Agent 能力（11 项）

- registerAgentCapabilities（agent-capabilities.ts:40-335；宿主探测 plugin.addAgentCapability index.ts:2933-2944）。读 7：action-suggestions/summary-context/list-items/item-insights（内部用 buildHabitInsights——T-1609 修正自动获益）/list-occasions/list-upcoming/weekly-report；写 4：record-event（canRecord+revision 指纹+单位校验+note≤500，178-194）/complete-occasion/create-item（同名拒绝 298）/create-occasion；每项声明 effects{localRead/localWrite/dataEgress}。
- 数据未就绪统一报「尚未准备好」（51/79/178）；状态 4 态（settings.ts:148-155）。证据：agent-suggestions/agent-status/agent-navigation/agent-audit-export/entry-capabilities/review-assistant。

## 16. 外部来源适配器（五来源+番茄桥）

| 来源 | 入口/监听 | 身份/幂等 | 写入/失败 | 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 思阅 sireader | window 事件 reader:open/focus/blur/close（index.ts:1066-1075）；焦点墙上时间 tracker（sireader-adapter.ts:25-86） | sireader:<itemId>:<startUnixMs>:<localDate>（89-94） | 写入查重+墓碑（index.ts:1107-1119）；失败入待处理箱 | sireader-adapter/source-lifecycle-matrix | 已有；跨窗口会话身份**外部待验**（T-1508） |
| 思播 siplayer | 特征探测 window.siyuanMediaPlayer.controller（siplayer-adapter.ts:125-128）；15s 轮询（index.ts:999-1006） | adapter 身份（117-122）；断档>3x 周期丢弃（57-65） | 写入 index.ts:1045-1057 | siplayer-adapter | 同上 |
| 微信读书 weread | 出站拉取网关 Bearer（index.ts:1229-1234）；日汇总/读完/笔记（1247-1380） | 三种 ref 形态（ecosystem.ts:92）；前缀级墓碑 1315 | 门槛 enabled+key+storageReady（1249） | weread-adapter | 已有；官方日汇总口径（不伪造片段） |
| 叶归 yeguif | 文档块标记解析（yeguif-adapter.ts:33-46）；5 分钟轮询（index.ts:1904，上限 200 块）；预览模式 index.ts:3647 | blockId+日期幂等 | 项目映射 resolveYeguifItemId:66；多映射未命中跳过 | yeguif-adapter | 已有；段落修订检测观察项 T-1544 |
| 健康 health | 内核 SQL 拉 health:% 行（index.ts:1138）；5 分钟轮询 1891 | health:<itemId>:<metric>:<localDate>（1162） | 行格式 steps/weight（health-inbox.ts:36-39） | health-inbox | 已有 |
| Dock Tomato 桥 | 见 §10 | docktomato:<sessionId> | 完成结算 15 类拒绝 reason | dock-tomato-* | 已有；真实宿主 host-pending |
| 失败待处理箱 | 统一承接仅 persist 失败（external-pending.ts:44-52） | 来源集合 10/58；身份合并 77-79；满员显式拒绝 140-147 | 重试五闸 193-200；启动恢复 index.ts:1955-1979 | external-pending | 已有 |

## 17. 外部依赖边界（登记，不入本地里程碑）

- **T-1508**：思阅/思播无跨窗口稳定会话 ID——精确开始时刻+幂等/墓碑防同分钟吞并，不证明两窗口同一会话；未收到事件不承诺恢复（BLOCKERS.md:7）。
- **Task Horizon**：消费端协商与契约互置等对方实现；本地参考层+夹具就绪，不修改能力声明冒充升级（BLOCKERS.md:9）。
- **T-1395 上游 API**：sireader#55/siplayer#180 仍 open；草案≠契约，合并→发布→真实宿主三关前 fallback 不升级。
- **T-1366**：真实第三方消费方采用需用户确认 push 与集市触达。

## 派生视图索引（从本表派生，不复制真值）

- **T-1545 联动专项**：取 §10/§14/§15/§16 → 逐能力补用户目的/前置/数据方向/触发/绑定/最终事件或文档/失败与停用。
- **T-1561 设置字段视图**：取 §7 三段主动作登记 → 每字段补新分区/风险/搜索词/状态来源/跳转/实际保存方式。
- **T-1568 编辑器字段视图**：取 §4 → 每字段补适用条件/默认/校验/存储字段/依赖。
- **T-1608 统一证据台账**：各表面「证据」行的链名即切片清单；宿主证据列统一标 host-pending，不以模拟冒充。
