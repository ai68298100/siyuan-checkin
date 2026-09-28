# 统一异步状态与错误恢复契约（T-1604，2026-09-28）

## 定位

- 阶段 1 共享契约：跨页面统一 loading/empty/unprobed/unsupported/failed/retryable/saved/draft 八态语义，与 [ui-state-ledger 八族台账](../tests/ui-state-ledger.test.cjs)（保存中/失败/重试/空态/加载/禁用/依赖缺失/成功错误）对齐——台账管呈现族，本契约管**状态机与恢复语义**。
- 现状事实基线：[设置字段注册表](settings-field-registry-2026-09-28.md) 的保存语义四分类（A 显式草稿/B 即时异步/C 动作/D 只读）是逐字段状态来源；本契约引用它，不复制。

## 契约 1：八态词表与呈现

| 状态 | 语义 | 呈现（对齐台账） | 允许的动作 |
| --- | --- | --- | --- |
| loading | 请求在途、无既有内容 | 既有通道（`lc-checkin__empty` + `role="status"`）；**禁止骨架屏复活**（R-18.4 退役词表） | 仅取消 |
| empty | 正常无数据 | `lc-checkin__empty` 族 + 下一步动作按钮（今日空态已有：fragments.ts:486-490） | 跳转/新建 |
| unprobed | 宿主能力未探测/未就绪 | 依赖缺失族（`role="status"` + 恢复指引 set.*Recovery） | 探测/降级动作 |
| unsupported | 宿主确定不支持（版本/能力缺失） | 同上，文案区分「未探测」与「确定不支持」（T-1549 收口对象） | 无或降级 |
| failed | 操作失败、有具体原因 | `role="alert"` 强提示 + **修复动作** + 诊断入口（对照 msg.dataLoadFail「已停止写入」口径） | 重试/修正输入/导出诊断 |
| retryable | failed 的子态：重试安全（幂等或纯读） | failed 呈现 + retry 按钮（`data-action="retry-save"` 既有模式） | 重试（不重复写入） |
| saved | 已持久化确认 | toast（msg.prefSaved/accentSaved 族）或行内状态 | — |
| draft | 显式草稿未保存 | 变更清单（settings-change-list，草稿≠已生效）；**不得把草稿呈现为已生效**（settings-change-list.ts 纪律） | 保存/撤回 |

- 未知状态不得冒充连接：`unprobed ≠ connected`、`已启用 ≠ 已产生记录`（注册表 §16/设置表 B 类「失败时内存/存储不一致」口子）。
- 初始化屏（renderInto 非 ready 分支）是 loading/failed 全屏唯一实例，已按本契约实现（index.ts；ui-state-ledger 守门在位）。

## 契约 2：三类写路径的状态规则

1. **显式草稿（A 类 10 字段 + save-note-query 待决策）**：输入只更新 draft（不触发渲染打断 IME）；保存=「基线对比 → persist → 成功清草稿+toast → 失败回滚 previous+toast」；撤回=删草稿+重渲染（既有 revertSettingDraft/revertSettingSection）。失败后界面显示**回滚后的已保存值**。
2. **即时异步（B 类）**：change 即改内存值并 persist。**已知口子（本契约登记）**：多数 handler 裸 `void persistViewPreferences()`，失败时内存值已改、存储为旧值——重绘显示内存值，重载回到存储值，两者不一致且用户无感知。收口规则（按字段逐个迁移，不整页统一）：要么改走 savePreference 包装（有 toast），要么失败时回滚内存值；选择记录进设置字段注册表对应行。
3. **动作类（C 类）**：busy 防重入（runSettingsAction/runArchivedAction）+ 失败回滚 + toast；**重试安全判定**：读操作/幂等写（appendEvent 以 externalRef 幂等、removeEvents 墓碑）可 retryable；非幂等动作（导入）失败即终止，重试=重新发起整个动作。

## 契约 3：过期响应与并发

- **请求代际**：跨请求异步结果必须携带代际号，过期即弃。既有实现：`summaryRequestId`（navigation.ts showTodayFor:30 递增；生成总结校验）。推广规则：任何「发起时页面/日期/范围，完成时校验」的异步（图表加载、来源预览）按同模式加代际或以 `dateKey(currentCalendarDate())` 变更为弃用条件。
- **写并发**：所有事件/偏好写入经 `enqueueMutation` 串行（注册表共用通道）； mutation 内重校验（batch-backfill 提交时重建快照重新分类是范例）。
- **跨日边界**：午夜刷新（scheduleMidnightRefresh）后，携带旧日期的在途响应按代际规则丢弃，不以旧日期结果渲染新日期视图。

## 契约 4：失败呈现的最低要素

每个 failed 呈现必须同时具备（现有反例=整改对象）：
1. 具体原因（不是「出错了」）——沿用 msg.*Fail 的 `{error}` 插值模式；
2. 至少一个可执行修复动作（重试/修正输入/换目标/导出诊断）；
3. `role="alert"`；
4. 失败保留用户输入与焦点（bind-editor 保存失败草稿保留、journal 失败保留会话答案是既有范例）。
今日页保存错误条（fragments.ts:185-188）满足 1-4，作为组件级范本。

## 已落地与验收门

- **已落地（本轮）**：renderInto 初始化屏 i18n 化 + role 语义 + 修复动作提示 + 主题属性；ui-state-ledger 新增六条断言（双语键/role/主题属性/无硬编码中文）。
- **验收门（后续切片对账）**：
  1. 设置页 B 类字段逐个收口「内存/存储不一致」口子（对照注册表 4373-4400 区段 handler 清单）；
  2. 每个新 surface 按契约 1 八态声明其空态/失败态（验收时逐 state 走查，双主题+窄屏）；
  3. 来源预览/总结/图表加载具备代际丢弃；
  4. i18n-parity 保证八态文案双语齐备。
