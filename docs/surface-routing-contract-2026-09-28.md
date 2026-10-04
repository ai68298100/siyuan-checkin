# 跨页面路由与深链接状态契约（T-1603，2026-09-28）

## 定位与现状

- 阶段 1 共享契约，**先于 T-1576 页面壳与 T-1599 会话状态实施**；实施任务以本契约为验收基准，不得在实现时另立语义。
- 现状事实：`currentPage` 七页联合 `"today"|"editor"|"review"|"archived"|"insights"|"occasions"|"settings"`（navigation.ts NavigationHost；quick-dialog.ts:17 同 union）；切换走 `showXxxFor`（navigation.ts:28-117）。T-1621 步骤一已由 `RootContext.page` 决定目标 root 页面，宿主字段只保留最后活跃 root 的兼容镜像；第四切片进一步将 Review 核心会话态迁入 `RootContext.review`。
- 无 URL 深链——思源自定义页签的 `data.page` 是唯一持久入口参数；DOM 钩子（`data-action`/`data-mobile-nav`/`data-*` 跳转属性）是唯一页内导航通道。

## 契约 1：页面上下文（SurfaceContext 参考形状）

实施（T-1576/1599）按此形状收拢，字段可增不可改义：

```ts
interface SurfaceContext {
    page: PageId;                      // 七页 union，同现状
    returnTo?: PageId;                 // 返回栈顶；现仅 insights 有（insightsReturnPage ∈ {today, review}）
    params: {
        date?: string;                 // today/review 的当日或钻取日（dateKey）
        range?: "day" | "week" | "month" | {startDate; endDate};  // review 概览（summaryRange/summaryCustomRange）
        workspace?: "overview" | "records" | "analysis";          // review 三工作区
        itemId?: string;               // insights 项目 / editor 编辑对象（editingId+editingFingerprint）
        query?: string;                // today 搜索（todayQuery）/review 记录（historyQuery）/archived（archivedQuery）
        filters?: Record<string, string>;  // review 渠道/计量/排序/翻页（historySource/Order/Page）、occasions 筛选
    };
}
```

- **编辑器上下文**=`editingId + editingFingerprint`（冲突守卫，save-form.ts:57-61）；无 item 时为新建。编辑完成/取消的落点见契约 3。
- **T-1621 第一切片（2026-09-30）、步骤一、第二切片（2026-10-02）、第三切片与第四切片（2026-10-03）已落地**：readSurfaceContext 读侧扩参到契约 1 全形状（date=review day 钻取 selectedHistoryDate/range=summaryRange|CustomRange/workspace/query/filters=scope|source|order|page|reminder，默认值 all/newest/0 不进上下文）；提醒中心标题与事项预设 datalist 两处固定 DOM id 改按渲染次序唯一化；`index.ts` 引入 `RootContext`/`rootContexts`，`renderInto(root)` 按 root 读取页面，`showXxxFor` 与主要页面绑定器传递目标 root，快速弹窗销毁时清理 root context；第二切片再把 `renderedPage`、`scrollTops`、`pendingFocusItemId` 纳入 root context，今日记录动作按所属 root 登记焦点；第三切片把 Today/Archived 查询、归档预填、清除、目标 root 重绘与搜索焦点纳入 root context；第四切片把 Review 核心日期、范围、工作区、条目、日/周期和分页纳入 `RootContext.review`，目标 root 渲染与导航动作读取/写入该状态。**剩余边界**：Review 查询/来源/计量/排序、折叠/批量/异步摘要、完整 per-root 序列化、完整 returnTo 策略，以及无 root 全局入口的兼容策略验收仍待后续。
- **T-1621 编辑器会话草稿（2026-10-04，D-342/D-343）**：`pendingProjectDraft` 与 `templateImportSession` 属于 `EditorRootContext`；Review 草案卡、模板包文件解析和导入确认必须把触发 root 传入，编辑器在该 root 预填/展示后消费会话。普通编辑器导航显式清空这两类草稿，无 root 旧入口只保留全局兼容语义。
- **Journal（问卷弹窗）/Reminder（提醒区）不是页面**：journal 是今日页弹层（journal-dialog），reminder 是 review 折叠区 + 今日横幅（registry §8/§9）——契约只覆盖它们的**打开来源回链**，不为其设 PageId。

## 契约 2：会话态归属（现状清单，实施时逐项迁入 context）

| 归属 | 字段（index.ts 行号） | 迁移目标 |
| --- | --- | --- |
| 宿主级（全 root 共享，现状） | currentPage、editingId/editingFingerprint、insightsItemId、insightsReturnPage:1586、summaryRequestId:1742、summaryRefreshing | T-1576：context 化，**每 root 独立**（多 root 打开不同页面不再互相覆盖） |
| 每-root | `RootContext.renderedPage/scrollTops/pendingFocusItemId/todayQuery/archivedQuery/review`；`settingsOpenSourcePanels` 仍为 WeakMap | 保持 root-local 语义；Today/Archived 查询与 Review 核心状态已迁入 context，完整参数序列化仍待后续 |
| 今日页会话态 | `quickEntryCancelled:263`、`bulkSelected:1571`、`pendingAttachments:1580`、`expandedExactEntries`（bind-today.ts:35-36）、`recentRecord:1745` | today context；**bulk 选中跨页清空**（现状切页不清，实施时明确） |
| 回顾页会话态 | `historyQuery`、`historySource`、`historyMetering`、`historyOrder`、`historyBatchSelected`、`historyBatchPreviewOpen`、`historyBatchValues`、`recordDetailsExpanded`、`itemCompareSelection`、`editingHistoryNoteId`、`summaryText/Error`、`suggestionWorkflow` | Review 核心日期/范围/工作区/条目/日/分页已进入 `RootContext.review`；查询/筛选、批量/折叠和异步摘要仍是后续迁移对象，`summaryRequestId` 继续承担过期响应丢弃 |
| 归档页 | archivedQuery（RootContext；宿主字段保留兼容镜像） | archived context |
| 设置页草稿 | settingsDrafts:471、settingsSavedBaselines:473 | settings context（显式草稿语义归 T-1604/契约三） |
| 弹窗内部 | quick 弹窗 currentPage 副本（quick-dialog.ts:17）、模板导入 session（editor.ts:143） | 随宿主 context，弹窗关闭即失（现状契约不变） |

## 契约 3：返回栈规则

- 现状仅有两条显式返回：insights `back`→insightsReturnPage（bind-page-navigation.ts:292-294）；编辑器归档成功→`showToday`（index.ts:5856）。其余「返回」按钮语义=回到 today（renderSettings/renderInsights 头部 back）。
- 契约：`returnTo` 只记录**一个**来源页；从提醒/统计/事项/来源跳入时由跳转方显式设置，未设置时按页面默认值表取（insights←today、editor←today、settings←today）。**不做通用历史栈**——多 root 与弹窗场景下栈语义不可靠，深链打开时 returnTo=undefined 即显示默认返回。
- 跳转后返回**原工作区状态**（T-1599 验收）：Review 核心工作区与翻页现按 root 会话保持，筛选、详情展开集≤50 与异步摘要仍按现有宿主会话规则运行，完整 per-root 恢复归 T-1621 后续切片。

## 契约 4：打开路径 × 恢复矩阵

| 打开路径 | date | range/workspace | query/filters | itemId | scroll | 展开态 |
| --- | --- | --- | --- | --- | --- | --- |
| 页签重开（data.page=today 固定） | 当天 | 默认 overview | 清空 | 无 | 顶部 | 关闭 |
| Dock 重开 | 当天 | 默认 | 清空 | 无 | 顶部（root context 随表面销毁释放） | 关闭 |
| 快速弹窗重开 | 当天（destroyCallback 重置 today，quick-dialog.ts:281） | 默认 | **按会话保留**（现状：弹窗生命周期内保留） | 无 | 保留 | 保留 |
| 渲染块 | 只读 Today 视图，固定当天 | 不适用 | 不适用 | 跳转时携带 | 宿主文档滚动 | 不适用 |
| 页内跳转（提醒→review、负荷→editor、徽章→insights） | 携带 | 携带 | 携带 | 携带 | 同页恢复/异页顶部 | 携带 |

- 「可恢复」与「明确降级」的边界：**持久偏好**（视图偏好桶）跨重载恢复；**会话态**仅 root 生命周期内恢复，重载后按本矩阵取默认——两种都算合法，禁止第三种（隐式残留）。
- 兼容映射：旧 `data-action`/`data-mobile-nav`/`data-page` 钩子保持原名（bind 层适配）；`data.page:"today"` 页签参数不变；渲染块 `onJumpDate/onJumpItem` 回调签名不变（block-renderer.ts:20-36）。

## 验收门（T-1576/1599 实施时逐条对账）

1. 多 root（dock+tab+quick）各自 context 独立，互不覆盖 currentPage。
2. 每个跳转入口能回答：returnTo 是什么、返回后哪些状态恢复。
3. 刷新/重开后每参数落在本矩阵的「恢复」或「默认」格，无隐式残留。
4. 旧 DOM 钩子、页签 data、渲染块回调零破坏（cross-surface-interaction 守门扩展覆盖）。
5. journal/reminder 弹层关闭后回到打开来源并保持其筛选（T-1585/1588 切片验收时复用本契约）。
