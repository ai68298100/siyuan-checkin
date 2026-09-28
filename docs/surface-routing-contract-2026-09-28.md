# 跨页面路由与深链接状态契约（T-1603，2026-09-28）

## 定位与现状

- 阶段 1 共享契约，**先于 T-1576 页面壳与 T-1599 会话状态实施**；实施任务以本契约为验收基准，不得在实现时另立语义。
- 现状事实：`currentPage` 七页联合 `"today"|"editor"|"review"|"archived"|"insights"|"occasions"|"settings"`（navigation.ts NavigationHost；quick-dialog.ts:17 同 union）；切换走 `showXxxFor`（navigation.ts:28-117）直接改宿主字段 + `render()`；页签打开固定 `data:{page:"today"}`（openTabPageFor，navigation.ts:103）；**所有 root（dock/tab/quick 弹窗）共享同一宿主 currentPage**（render() 渲染同一页面到多 root，index.ts:3189-3193）。
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
- **Journal（问卷弹窗）/Reminder（提醒区）不是页面**：journal 是今日页弹层（journal-dialog），reminder 是 review 折叠区 + 今日横幅（registry §8/§9）——契约只覆盖它们的**打开来源回链**，不为其设 PageId。

## 契约 2：会话态归属（现状清单，实施时逐项迁入 context）

| 归属 | 字段（index.ts 行号） | 迁移目标 |
| --- | --- | --- |
| 宿主级（全 root 共享，现状） | currentPage、editingId/editingFingerprint、insightsItemId、insightsReturnPage:1586、summaryRequestId:1742、summaryRefreshing | T-1576：context 化，**每 root 独立**（多 root 打开不同页面不再互相覆盖） |
| 每-root（WeakMap，已按 root 隔离） | pageScrollTops:245、renderedPages:246、settingsOpenSourcePanels:253 | 保持 per-root 语义，纳入 context 序列化范围 |
| 今日页会话态 | todayQuery:265、quickEntryCancelled:263、bulkSelected:1571、pendingAttachments:1580、expandedExactEntries（bind-today.ts:35-36）、recentRecord:1745 | today context；**bulk 选中跨页清空**（现状切页不清，实施时明确） |
| 回顾页会话态 | reviewWorkspace:414、historyQuery:1730、historySource:1731、historyOrder:1734、historyPage:1737、historyBatchSelected:1710、historyBatchPreviewOpen:1712、historyBatchValues:1713、recordDetailsExpanded:1741、itemCompareSelection:1715、editingHistoryNoteId、summaryRange/CustomRange/Text/Error（bind-page-navigation.ts:42-46）、suggestionWorkflow:1697 | review context；summaryRequestId 是**过期响应丢弃**的既有实现（T-1604 引用，index.ts:5570/5592） |
| 归档页 | archivedQuery:1738 | archived context |
| 设置页草稿 | settingsDrafts:471、settingsSavedBaselines:473 | settings context（显式草稿语义归 T-1604/契约三） |
| 弹窗内部 | quick 弹窗 currentPage 副本（quick-dialog.ts:17）、模板导入 session（editor.ts:143） | 随宿主 context，弹窗关闭即失（现状契约不变） |

## 契约 3：返回栈规则

- 现状仅有两条显式返回：insights `back`→insightsReturnPage（bind-page-navigation.ts:292-294）；编辑器归档成功→`showToday`（index.ts:5856）。其余「返回」按钮语义=回到 today（renderSettings/renderInsights 头部 back）。
- 契约：`returnTo` 只记录**一个**来源页；从提醒/统计/事项/来源跳入时由跳转方显式设置，未设置时按页面默认值表取（insights←today、editor←today、settings←today）。**不做通用历史栈**——多 root 与弹窗场景下栈语义不可靠，深链打开时 returnTo=undefined 即显示默认返回。
- 跳转后返回**原工作区状态**（T-1599 验收）：review 三工作区、筛选、翻页、展开详情在返回时恢复（现状 reviewWorkspace 与 history* 已会话保持；详情展开集≤50 已有界）。

## 契约 4：打开路径 × 恢复矩阵

| 打开路径 | date | range/workspace | query/filters | itemId | scroll | 展开态 |
| --- | --- | --- | --- | --- | --- | --- |
| 页签重开（data.page=today 固定） | 当天 | 默认 overview | 清空 | 无 | 顶部 | 关闭 |
| Dock 重开 | 当天 | 默认 | 清空 | 无 | 顶部（per-root WeakMap 随销毁释放） | 关闭 |
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
