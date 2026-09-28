# 编辑器字段与能力矩阵（T-1568，2026-09-28）

## 定位

- 从 [唯一注册表 §4](capability-registry-2026-09-28.md) 派生的编辑器专项视图；「目标流程」列对应 T-1569 类型驱动流程的段落名（选起点→记录什么→做到多少→什么时候做→方向→怎样产生记录→输出与组织）。
- 证据：`src/render/editor.ts:83-322`（表单 DOM）、`src/render/bind-editor.ts`（条件显隐 477-544、保存 1070-1127、模板 661-993、锚点 266-296、草案 1133-1172）、`src/render/save-form.ts:24-161`（装配与回滚）、`src/editor-validation.ts:19-27`（校验）、`src/types.ts`（存储字段）。

## 字段矩阵

| # | 字段（data/name） | 现位置 | 适用条件与显隐 | 默认值 | 校验/边界 | 存储字段 | 依赖 | 目标流程 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 模板区（最近/推荐/组合包/目录/我的/分享导入导出） | editor.ts:174-197 | 仅新建（编辑不渲染） | 空库开展开（174） | 搜索无结果空态（195）；目录上限 75 守门 | 应用后进各字段 | CHECKIN_TEMPLATES/userTemplates | 选起点 |
| 2 | 名称 name | 207 | 恒显 | 空 | required、maxlength 40 | CheckinItem.name | 名称推断提示（208，name-inference） | 选起点 |
| 3 | 联动卡 + 隐藏 linkagePlan | 209-210 | 名称推断命中联动时显示（bind-editor renderLinkageCard 106-141） | 空 | — | 问卷/锚点/番茄字段 | journalTemplates/锚点/番茄 | 选起点（输出预接线） |
| 4 | 图标（弹窗：搜索/分组/尺寸预览/自定义文字/上传/导入库） | 211-240 | 恒显 | "✓" | 输入 maxlength 500；图片/URL 皆可 | CheckinItem.icon | checkin-custom-icon-library 桶 | 选起点 |
| 5 | 类型 kind radio（binary/count/duration） | 241-242 | 恒显；**三值即全部 CheckinKind，无第四种** | binary | 切换触发值字段/单位/步长联动（bind-editor 477-544） | CheckinItem.kind（修订含 kind） | kindDesc 文案 | 记录什么 |
| 6 | 目标 target | 244 | 数值/时长显示；二值隐藏（updateConditionalFields） | duration+小时=0.5，否则 KIND_OPTIONS.step（103） | required、min/step=getEditorStep(kind,unit) | revision.target | — | 做到多少 |
| 7 | 单位 unit + 常用单位 chips | 245 | 二值隐藏 | KIND_OPTIONS.defaultUnit | maxlength 12 | revision.unit | 单位选项按 kind | 做到多少 |
| 8 | 记录步长 recordStep | 246 | 非二值显示 | getRecordStep 默认 | min/step=getRecordStepInputStep | revision.recordStep | record-step.ts 单一实现 | 做到多少 |
| 9 | 快捷步长 quickSteps | 247 | 数值/时长显示（binary 不物化，types.ts 注释） | 空 | 逗号分隔小数；1~4 个正数升序去重≤1e6（normalizeQuickSteps） | CheckinItem.quickSteps | 今日页 chips 渲染 | 做到多少 |
| 10 | 问卷绑定 journalTemplateId | 249 | **仅 kind=binary 显示**——bind 动态隐藏（bind-editor.ts:521-523 `journalField.hidden = kind !== "binary"`） | 空=不绑定 | 模板已删显示占位 disabled 选项（249） | CheckinItem.journal.templateId | journalTemplates | 怎样产生记录（输出） |
| 11 | 分组 group + 建议 chips | 270 | 高级区 | 空=默认组 | maxlength 32 | CheckinItem.group | 现有组+模板组建议 | 组织 |
| 12 | 优先级 priority | 271 | 高级区 | medium | 枚举 | CheckinItem.priority | 排序消费 | 组织 |
| 13 | 时段 timeSlot | 272 | 高级区 | any | 枚举 | CheckinItem.timeSlot | 时间分组视图 | 组织 |
| 14 | 自动归档 autoArchiveDays | 273 | 高级区 | 空=关 | 1~1000000 整数 | CheckinItem.autoArchive.afterDays | 达成天数计数 | 组织 |
| 15 | 容错连续 streakToleranceDays | 274 | 高级区 | 空=严格 | 1~30；**at-most 与 quota 不叠加**（types.ts 注释） | CheckinItem.streakTolerance | 连击计算 | 组织 |
| 16 | **戒除方向 directionAtMost** | 275 | **仅 schedule=daily 显示**（render hidden + bind 双处判断） | 关 | save-form.ts:81-82 非 daily 静默回落 at-least（UI 防线+数据防线双保险） | CheckinItem.direction | 今日「记破戒」/洞察 T-1609 口径 | 方向 |
| 17 | 完成来源 completionSource | 276 | 高级区 | manual | 枚举 manual/tomato | CheckinItem.completionSource | 番茄桥/内置计时 | 怎样产生记录 |
| 18 | 番茄计值 tomatoMode | 277-278 | 仅 completionSource=tomato 显示 | minutes | 枚举 minutes/sessions | CheckinItem.tomatoMode | Dock Tomato 结算 | 怎样产生记录 |
| 19 | 笔记锚点 anchorBlockId + 选择器/新建 + appendNotes | 279-291 | 高级区（opt-in） | 空 | blockId maxlength 64；非法保存显式拒绝（save-form.ts:74-79）；appendNotes 无 blockId 时 disabled；挂起告警（290） | CheckinItem.noteAnchor | 锚点回写（T-1231） | 输出 |
| 20 | Task Horizon 日历显示 taskHorizonVisible | 292 | 高级区 | 显示（false 才物化） | 布尔 | CheckinItem.taskHorizonCalendarVisible | 外部日历投影（T-1390） | 输出 |
| 21 | 排期 schedule select（daily/workdays/weekly/interval/quota） | 295 | 高级区 | daily | 枚举五类 | revision.schedule.type | 排期内核 rules.ts | 什么时候做 |
| 22 | 指定星期 weekdays | 296 | weekly 显示 | 全勾（86） | 至少一天（editor-validation） | schedule.weekdays | — | 什么时候做 |
| 23 | 间隔 intervalDays + 锚点日 anchorDate | 297-300 | interval 显示 | 2 / createdDate 或今天 | 1~3650；锚点缺失 fail-closed（schedule-preview） | schedule.intervalDays/anchorDate | 「回到今天」动作 | 什么时候做 |
| 24 | 配额 quotaPeriod/quotaAmount/quotaCountMode | 301-308 | quota 显示 | week/3/dates（89-91） | amount≥1 整数（editor-validation）；countMode dates/value | schedule.quota | 周期评估 evaluateQuotaSchedule；**配额≠第四种类型** | 什么时候做 |
| 25 | 历史达成天数（只读） | 268 | 仅编辑 | — | — | 只读 countCompletedDays | — | 组织 |
| 26 | 动作条（保存/保存并继续/存为模板/归档/删除） | 313-320 | 保存并继续仅新建；归档/删除仅编辑 | — | 删除走影响预览+数量复核（index.ts:5859-5880） | — | saveForm 指纹守卫 | 全局 |

## 保存装配与失败语义（save-form.ts:24-161）

- 提交 → `saveEditorForm` 装配 CheckinItem + revisions（92-110，编辑走修订：生效日=今天，历史快照不变）→ 替换 store.items（143-147）→ persist 失败回滚旧 store + `msg.saveFail`（148-155）→ 广播 item-created/updated（157）。失败路径零副作用返回 undefined（161）。
- 编辑指纹冲突拒存（57-61）；锚点非法显式拒绝（74-79）；atMost 非 daily 回落（81-82）；规则变更对照确认（bind-editor.ts:1090-1118，取消零写入）。
- 草稿无独立持久化——仅存 DOM 表单；切页/重载即失（T-1604 契约要覆盖的显式边界）。

## 重复业务判断清单（T-1568 验收点：收拢目标）

1. **类型×排期×方向显隐双处判断**：render 时写死 `hidden`（editor.ts:275/277/297/301），bind 时 `updateConditionalFields` 再算一遍（bind-editor.ts:477-544）——模板重渲染与字段联动必须保持同一规则，T-1569 类型驱动流程应收拢为单一适用条件函数。
2. **quota 目标口径两处换算**：今日卡 `displayTarget = quota ? quota.amount : target`（fragments.ts:197）vs 行动台 `target: revision.target` + 独立 quota 面（today-fact.ts，T-1610 已修）——编辑器预演（schedule-preview）用 quota 窗口口径；三处口径已在各自层文档化，但仍是三个消费点，值得在 T-1569 流程文案中统一解释。
3. **atMost 方向防线双保险**：UI 显隐（daily 才显示）+ save-form 静默回落——回落路径用户不可见，迁移时应把「方向×排期冲突」显式提示而非静默（现行为记录在案）。
4. **单位默认值双源**：editorTarget 默认（editor.ts:103 特判 小时=0.5）与 KIND_OPTIONS.defaultUnit（101）——默认值规则分散在两处。
5. **模板应用回填 vs 用户输入**：applyTemplateFields（bind-editor.ts:661）直接写 DOM，无「已应用模板」标记（仅 aria-pressed 高亮，agent 盘点确认）——T-1570 的「应用后标示回填字段」缺口的数据基础。

## 迁移对照（T-1569/1570/1571/1572/1573/1574）

- **T-1569 类型驱动**：上表「目标流程」列即分段归属；显隐规则收拢为单一点（重复判断 #1）。
- **T-1570 模板入口**：缺口=应用标示、保存模板 vs 保存项目区分（#5）；搜索/分类/键盘/移动操作已有。
- **T-1571 排期入主流程**：#21-24 现全在高级区（265-311）；30 天预演/规则对照已有（259-263），复用不重做。
- **T-1572 输出与组织分区**：#10/19/20 → 输出；#11-18 → 组织；危险操作已在页尾动作条但未独立区。
- **T-1573 预览与操作栏**：预览卡+排期预演已有；桌面侧栏与移动底栏共用同一 HTML（agent 盘点），缺分面共用计算层。
- **T-1574 旧项目兼容切片**：上表「存储字段」列即兼容对照表；类型切换提示字段保留/清除需新增。
