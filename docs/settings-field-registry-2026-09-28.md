# 设置字段注册表与信息架构迁移表（T-1561，2026-09-28）

## 定位

- 从 [唯一注册表 §7](capability-registry-2026-09-28.md) 派生的设置专项视图；目标分区名沿用 [设置页研究稿](settings-page-rearchitecture-2026-09-28.md) 的两层结构。本表登记**现状事实**与**迁移目标**，不含 UI 改动。
- 证据：`src/render/settings.ts:390-630`（九组 DOM）、`src/index.ts` 处理器（行号随行登记）、`src/features/settings-change-list.ts:15-26`（变更清单注册表）、`src/view-preferences.ts`（偏好结构）、`src/index.ts:119-129`（存储名常量）。关键处理器已逐一核对源码。

## 保存语义四分类（全文引用）

- **A 显式保存**（变更清单 10 字段，`SETTINGS_FIELD_REGISTRY`）：有基线/草稿/单项撤回（`revertSettingDraft` index.ts:3476）/分节恢复（3482）；保存成功清草稿+toast，失败回滚 previous。**注意：`save-note-query` 也是显式保存但不在变更清单**——T-1620 决策（D-313）：文档化「整体表单即保存边界」——七字段由 save-note-query 一次性收集、校验、保存，失败整表回滚（既有 previous 恢复）；草稿跟踪待 T-1616 分区重建时随新表单一并实现，不在旧标记上打补丁。
- **B 即时异步持久化**（change 即存 → `persistViewPreferences()` → `checkin-view-preferences` 单桶）：多数无独立失败提示（裸 `void` promise）；走 `savePreference` 包装（index.ts:3623）的有 `msg.prefSaved/prefSaveFail` toast；强调色有专用 `msg.accentSaved/accentSaveFail`（4377）。失败时内存值已改、存储为旧值——**重绘显示内存值，重载回到存储值**，两者可能短暂不一致（T-1604 状态契约要覆盖的口子）。
- **C 动作类**：执行操作（导入/恢复/探测/拉取/体检/重置），本身不持久化字段；各自 confirm/busy 防重入（`runSettingsAction` 3609-3622）与失败回滚。
- **D 只读状态行**：契约、依赖状态、统计量、快捷键说明、版本。

## 存储面总表

| 存储 | 内容 | 证据 |
| --- | --- | --- |
| `checkin-view-preferences` | 外观/语言/打开方式/NLP/动效/触感/强调色/头像文字、今日组排序折叠周条、安静时段、每日提醒槽、事项仅一次、专注提供方、diaryReport/summaryResident/journalTarget、sireader/siplayer/healthInbox/noteQuery/wereadIntegration（含 apiKey，**仅本地不导出**）/yeguifIntegration | index.ts:119；view-preferences.ts:81-98 |
| `checkin-user-templates` | 我的模板 | index.ts:120 |
| `checkin-custom-icon-library` | 自定义图标库 | index.ts:121 |
| `checkin-reminder-actions` | 提醒用户动作（snooze/skip/completed，上限 200） | index.ts:122 |
| `checkin-suggestion-workflow` | 智能体建议工作流审计 | index.ts:125 |
| `checkin-focus-diagnostics` | 专注诊断 | index.ts:126 |
| `checkin-docktomato-inbox` | Dock Tomato 收件箱（容量 200） | index.ts:127 |
| `checkin-external-pending` | 外部失败待处理箱（容量 40/14 天） | index.ts:129 |
| 主存储（store） | 项目/事件/墓碑/审计/快照——设置页不直接写，经导入/恢复动作 | — |

## 逐字段迁移表（按现九组）

风险级别：低=纯偏好；中=影响行为或需校验；高=凭据/文档写入/数据破坏。

### 现 appearance 组 → 目标「外观与操作/外观」

| 字段 | 语义 | 保存行为（证据） | 风险 | 搜索词 | 目标卡 |
| --- | --- | --- | --- | --- | --- |
| 主题 data-setting-appearance | B | persist+重绘（index.ts:3657），失败静默，重载恢复 | 低 | 主题/深色/浅色/跟随 | 外观 |
| 语言 data-setting-language | B | syncPluginLanguage+persist+重绘（3658） | 低 | 语言/中英/language | 外观 |
| 打开方式 data-setting-open-mode | B | persist（3659），无重绘 | 低 | 打开方式/弹窗/页签 | 弹窗与页签 |
| NLP 速记 data-setting-quick-entry-nlp | B | persist+重绘（3660） | 低 | NLP/速记/自然语言 | 今日视图 |
| 减弱动效 data-setting-motion | B | persist+重绘（3661） | 低 | 动效/动画/无障碍 | 外观 |
| 触感 data-setting-haptic | B | persist（3662），无重绘 | 低 | 触感/振动 | 外观 |
| 强调色 data-setting-palette | B | persist+专用 toast+重绘（4373-4379） | 低 | 强调色/配色 | 外观 |
| 头像（预设/文字/上传/编辑/清除） | B | 预设与文字 persist+重绘（4381-4388）；上传经 openAvatarEditor→saveAvatarImage（4389-4396，>700KB 拒绝） | 中 | 头像/照片/昵称 | 外观 |
| 自定义图标数量行 | D | 只读；管理在编辑器图标选择器 | 低 | 图标 | 外观 |

### 现 today 组 → 目标「外观与操作/今日视图 + 今日与提醒/提醒」

| 字段 | 语义 | 保存行为 | 风险 | 搜索词 | 目标卡 |
| --- | --- | --- | --- | --- | --- |
| 分组 data-setting-group | B | persist，无 toast 无重绘（3653） | 低 | 分组 | 今日视图 |
| 排序 data-setting-sort | B | persist（3654） | 低 | 排序 | 今日视图 |
| 已完成折叠 data-setting-completed | B | persist（3655） | 低 | 已完成/折叠 | 今日视图 |
| 周条 data-setting-weekstrip | B | savePreference【toast】+重绘（3656） | 低 | 周条/周视图 | 今日视图 |
| 安静时段开关 data-setting-quiet | B | 归一化+persist（3664-3666） | 中 | 安静/免打扰 | 提醒 |
| 安静起止 quiet-start/end | B | 归一化回落默认+persist+重绘（3668-3674） | 中 | 安静时段/时间 | 提醒 |
| 每日提醒开关 reminder-toggle | B | persist+重绘（3677-3680） | 中 | 每日提醒 | 提醒 |
| **提醒时刻槽 reminder-slots** | **A** | 归一化去重封顶 4；成功 toast+清草稿+重绘；失败回滚 previous+prefSaveFail（3682-3697） | 中 | 提醒时刻/槽 | 提醒 |
| 事项仅一次 occasion-once | B | persist+重绘（3699-3702） | 低 | 事项提醒/仅一次 | 提醒 |
| 重置视图偏好（动作） | C | confirm 后重置偏好 | 中 | 重置/恢复默认 | 数据与恢复/重置（迁移时移出今日组） |

### 现 dialog 组 → 目标「外观与操作/弹窗与页签」

| 字段 | 语义 | 保存行为 | 风险 |
| --- | --- | --- | --- |
| 尺寸模式 dialog-mode | B | savePreference（含百分比行/固定行显隐） | 低 |
| 缩放 dialog-scale | B | savePreference+重绘（4662-4665，50-100 钳制） | 低 |
| 重置窗框（动作） | C | 仅 auto 模式且有自定义框时显示 | 低 |
| 固定宽高 dialog-width/height | B | 钳制 320-2560/240-2048+savePreference（4666-4676） | 低 |

### 现 shortcuts 组 → 目标「外观与操作/快捷键」

三行只读说明（D）：Alt+Shift+C / Alt+1-9 / Alt+↑↓（settings.ts:433-435）。无存储。

### 现 data 组 → 目标「数据与恢复」（导入导出/恢复点/诊断与审计/重置 四卡）

| 行 | 语义 | 行为与风险 |
| --- | --- | --- |
| 打开回顾（动作） | C 跳转 | 低 |
| 存储量行 | D 只读 | items/events/照片 KB/图标 KB 统计（442） |
| import-json | C | **高风险**：冲突三选（import-conflicts 守门） |
| import-csv / import-loop / import-obsidian | C | **高风险**：解析失败保留原数据 |
| restore-backup（恢复快照） | C | **高风险**：恢复前有快照链（45-46 行入口） |
| export/clear-snapshots、import-snapshots | C | clear 需确认 |
| 快照列表/恢复指南 | D | 折叠 details（447-448） |
| 诊断行+export-diagnostics | D+C | 上限 20 条（features/diagnostics.ts:18） |
| 审计 export/clear+列表 | D+C | clear 需确认；auditEmpty 空态 |
| export-loop / export-obsidian | C | 低 |
| reset-all-preferences | C | **高风险**：目标「重置」独立危险卡，不与普通保存相邻（研究稿步骤 6） |

### 现 host 组 → 目标「联动与目标/宿主能力」（待处理类归属 → T-1551）

| 行 | 语义 | 行为 | 状态来源 |
| --- | --- | --- | --- |
| API v5 契约行 | D | 只读 provided（464） | publicApiContract |
| Task Horizon 契约行 | D | **恒 waiting（465）——外部待验，不得显示已连接** | TASK_HORIZON_CONTRACT |
| Dock Tomato 契约行（诊断+导出） | D+C | tomatoHealthy 双态+诊断导出（466） | 桥 9 态 |
| 专注提供方 focus-timer | B | savePreference，无重绘——状态行不即时刷新（3704-3710） | focusTimerProvider |
| Tomato 依赖行+回退 use-builtin-focus | D+C | 回退 persist+toast+重绘（3711-3715） | diagnosticState |
| 番茄完成问题行 export/clear | C | 15 类 reason 键（settings.ts:330-346） | completion issues |
| 番茄收件箱 inbox-retry/undo-skip/discard | C | 重试延迟 1s/5s/30s | docktomato-inbox |
| Agent 状态行 | D | 4 态（471） | agentCapability.state |
| Agent 审计 export | C | 472 | suggestionWorkflowAudits |
| Task Horizon 依赖行 | D | 恒 waiting（473） | — |

### 现 documents 组 → 目标「联动与目标/思源文档输出 + 思源目标管理」

| 字段 | 语义 | 保存行为 | 风险 | 搜索词 |
| --- | --- | --- | --- | --- |
| 文档写入总览卡 | D | 只读聚合 enabled 数（479-482） | 低 | 文档写入 |
| 绑定体检 check-note-bindings（动作） | C | SQL IN 批量+lsNotebooks；行动作 open/edit/goto（index.ts:3814-3885）；**只读无就地修复 → T-1559** | 中 | 绑定体检/失效 |
| **日记目标 data-diary-doc** | **A** | save-diary-doc → bindVerifiedDocumentSave（3728-3756）：validateBindingTarget→persist 失败回滚 setId(previous)；搜索防抖（4235-4254）/create-doc（4291）为会话/动作 | 高 | 日记/文档目标 |
| 日记开关 diary-toggle | B | 无 docId 拒启 msg.diaryNeedDoc+重绘（3717-3727） | 中 | 日记报告 |
| 立即写入日记报告（动作） | C | disabled 当未启用/无 docId（503）；执行门槛语义核对 → T-1552 | 中 | 写入 |
| **问卷目标 journal-mode/notebook-id/target-doc** | **A** | save-journal-target（3789）；变更清单 3 字段 | 中 | 问卷/目标 |
| **问卷自定义 journal-custom** | **A（sensitive）** | save-journal-custom → saveJournalCustomTemplates（3775→960）：fail-closed 解析、绑定中模板禁删（968-971）、失败回滚（976） | 中 | 问卷模板 |
| 问卷模板构建器 | 会话态 | textarea 唯一保存边界，确认走 save-journal-custom（journal-dialog.ts:102-105） | 低 | 构建器 |
| **摘要目标 data-summary-doc** | **A** | save-summary-doc（3770，同一 bindVerifiedDocumentSave） | 高 | 摘要/驻留 |
| 摘要开关 summary-toggle | B | 无 docId 拒启（3759） | 中 | 摘要 |
| 立即写入摘要（动作） | C | disabled 同日记（528） | 中 | 写入 |

### 现 external 组 → 目标「联动与目标/自动记录来源」+「数据与恢复/待处理箱」

| 字段 | 语义 | 保存行为 | 风险 | 搜索词 |
| --- | --- | --- | --- | --- |
| 第三方总览卡 | D | 只读+思阅/微信读书同项目冲突警告（536） | 低 | 来源总览 |
| 待处理箱 retry/discard | C | 重试五闸（target-gone/source-disabled/tombstoned/future-date/unit-changed）拒绝各 toast（4360/4366；REFUSE_TOAST_KEYS 129-135） | 中 | 待处理/失败 |
| 思阅 sireader-item + toggle | B | 项目需活跃+分钟单位（3886-3943）；断开保留事件 planSourceDisconnect（3902） | 中 | 思阅/阅读 |
| 思播 siplayer-item + toggle + 宿主状态 | B | 同上；宿主三态行（554） | 中 | 思播/视频 |
| 微信读书 weread-item/finish/notes（三 select） | B | 即时持久化 | 中 | 微信读书 |
| **weread-key** | **A（sensitive）** | save-weread（4108）：Key 留空保留旧值、失败整体回滚（4120-4128）；clear 需 confirm（4130）；**apiKey 仅本地偏好不导出**（view-preferences.ts:94） | 高 | 密钥/Key |
| **weread-threshold** | **A** | 同 save-weread 整体保存（4108） | 低 | 门槛/分钟 |
| weread-toggle + weread-pull/refresh | B/C | 启用门槛 enabled+itemId+apiKey+storageReady（index.ts:1249） | 中 | 拉取 |
| 健康 health-doc | **A** | save-health-doc（3975，bindVerifiedDocumentSave） | 高 | 健康/文档 |
| 健康映射行 add/remove/apply | C | applyHealthBindingsFromDom（3980-3993）：单位不符强制停用 | 中 | 步数/体重/映射 |
| 健康 toggle + preview/refresh + 试算台 | B/C | 需 docId+映射+单位（3944-3974） | 中 | 健康 |
| 笔记推导 note-query 七字段 | **显式保存但不在变更清单** | save-note-query 整体收集保存（4018-4026）；toggle 为 B | 中 | 笔记/推导/字段 |
| 叶归 yeguif-mappings | B | change 即存（4160）；旧单目标 legacyIgnored 警告行（609） | 中 | 叶归/映射 |
| 叶归 notebook select+load + toggle | B/C | load 走 lsNotebooks（4183）；失效自动停用（4196-4202） | 中 | 叶归/笔记本 |
| 各来源 preview/refresh + 试算台 | C | 立即读取 ingest*（3624-3640）/预览（3641-3652） | 中 | 预览/拉取 |

### 现 about 组 → 目标「关于与兼容性」

版本号（PLUGIN_VERSION）与 GitHub 链接，均 D 只读（627-628）。

## 变更清单覆盖核对（T-1561 验收点）

- 变更清单 10 字段（settings-change-list.ts:15-26）：journal-custom/journal-mode/journal-notebook-id/journal-target-doc/diary-doc/summary-doc/health-doc/reminder-slots/weread-threshold/weread-key——与上表 A 类一一对应，无遗漏。
- **缺口一处（已决策，D-313）**：note-query 七字段（template/scope/targetId/itemId/field/value/tag，data-note-query-*）显式保存未入清单——选文档化「整体表单即保存边界」（保存原子+失败回滚已具备）；草稿化（入 settingsDrafts+SETTINGS_FIELD_REGISTRY）留 T-1616 分区重建随新表单实现。
- 深链/书签：设置页无 URL 深链；外部锚点=source-panel 展开态（`data-source-panel`×8 + `sourcePanelOpen`）与 `data-settings-search` 文本过滤（settings-navigation.ts:40-80）。迁移时旧面板 id 需别名映射到新分区（研究稿步骤 4），展开态与搜索词进 T-1603 会话态契约。

## 迁移规则（源自研究稿步骤 1/4/5，本表为其输入）

1. 每字段按上表「目标卡」搬迁；**存储键不改**，旧值原样恢复。
2. B 类字段的「失败时内存/存储不一致」口子由 T-1604 统一异步状态契约收口（逐字段决定保留即时或转草稿，单独展示影响）。
3. 高风险字段（diary-doc/summary-doc/health-doc/weread-key、导入/恢复/重置）迁移时保持确认与回滚行为，不得因重排丢失。
4. 事件监听按 `data-*` 属性逐一搬移，上表「语义/证据」列即验收对照表。
