# 多 root 独立页面设计小稿（T-1621 剩余，2026-09-30）

> **实施状态（2026-09-30）**：步骤一已交付——存储落 `src/features/root-page-store.ts` 纯模块（孤儿页承接启动写入、新 root 继承），宿主 currentPage 为读写代理（读=最后活跃 root、写=全局同步全部 root），导航函数可选 root，快速弹窗页记忆归弹窗 root（D-325）；步骤二/三未实施。

## 定位

本稿是 T-1621 剩余（按 root 独立 currentPage）的**架构设计与实施基线**。步骤一已落地：dock/页签/快速弹窗的页面路由按 root 保存并由绑定器传递 root；2026-10-02 已交付第二切片：滚动、已渲染页和一次性焦点恢复已纳入 `RootContext`；2026-10-03 交付第三切片，将 Today/Archived 查询与输入焦点按 root 隔离；同日第四切片将 Review 核心日期、范围、工作区、条目与分页状态按 root 隔离；2026-10-04 已交付 Review 查询/筛选、批量/折叠/详情与异步摘要 root 会话，并补齐关闭/卸载/重载清理及设置页 root 导航。剩余仍按本稿约束 Review 以外页面的完整恢复矩阵、无 root 入口兼容和现场切换验收，不把未完成边界误记为已完成。

## 现状根因

原先 `currentPage` 是宿主级单字段，`render()` 遍历全部 root 后所有 root 渲染同一页面；T-1621 步骤一已改为 `RootContext.page` 决定目标表面的页面，宿主 `currentPage` 只保留为最后活跃 root 的兼容镜像。当前剩余问题集中在页面内会话态，而非页面路由本身。

## 设计方案

### 核心变更：引入 `RootContext` 取代宿主级 currentPage

```ts
interface RootContext {
    page: PageId;
    returnTo?: PageId;
    renderedPage?: PageId;
    scrollTops: Partial<Record<PageId, number>>;
    pendingFocusItemId?: string;
    todayQuery?: string;
    archivedQuery?: string;
    review: ReviewRootContext;
}
interface ReviewRootContext {
    historyMonth: Date;
    selectedHistoryDate: string;
    summaryRange: "day" | "week" | "month";
    summaryCustomRange?: {startDate: string; endDate: string};
    reviewWorkspace: "overview" | "records" | "analysis";
    historyItemId: string;
    historyScope: "day" | "period";
    historyPage: number;
    reviewProjectPage: number;
}
private rootContexts = new Map<HTMLElement, RootContext>();
```

- 每个 root 在注册时（`renderInto` 首次调用或 dock/tab 注册时）创建独立 `RootContext`
- `renderInto` 改为读 `rootContexts.get(root)?.page ?? "today"` 而非 `this.currentPage`
- 导航函数（`showTodayFor` 等）需接受可选 `root` 参数：有 root 时只改该 root 的 context；无 root（全局导航）时改所有 root

### 兼容层

- 宿主 `currentPage` 保留为**快捷方式**：读写时自动代理到「最后活跃 root」的 context，现有代码零改动
- `data-action="back"` 等钩子在绑定层已持有 root 引用，分派时传入 root
- 渲染块回调（`onJumpDate` 等）继续操作宿主级状态（渲染块只有 dock root 一个消费者）

### 会话态分层

| 层级 | 字段 | 归属 |
| --- | --- | --- |
| 宿主级（共享） | editingId/editingFingerprint、store、preferences | 全局唯一实体 |
| Root 级 | page、returnTo、renderedPage、scrollTops、pendingFocusItemId、todayQuery、archivedQuery、`review.*` 核心日期/范围/工作区/条目/日/分页状态、`today.*` 纯会话、`settings.openSourcePanels` | 每 root 独立；查询在注册时以宿主偏好种子；宿主字段仅作兼容镜像 |
| 会话级（可迁移） | 已迁入 `review.*` 的查询/来源/计量/排序、折叠态、批量选择、详情展开、异步摘要状态，以及 `today.*` 的批量/精确录入/附件/快速录入状态 | Review 与 Today 纯会话已按 root 隔离；仍未迁移的是 Insights/Editor/Occasions/Settings 的完整恢复矩阵与无 root 入口兼容 |
| 纯会话（已迁移） | `today.bulkMode`、`today.bulkSelected`、`today.expandedExactEntries`、`today.pendingAttachments`、`today.quickEntryCancelled`、`today.priorityReminderExpanded` | 由所属 Today root 的 `RootContext.today` 持有，宿主字段只保留兼容镜像 |

### 实施策略：按切片渐进

1. **步骤一**：引入 `RootContext` + `rootContexts` Map；`renderInto` 按 root 取页面；导航函数加可选 root 参数；宿主 `currentPage` 变为「最后活跃 root」的代理。
2. **步骤二**：滚动位置、已渲染页和一次性焦点纳入 root context 的恢复/清理策略；折叠态仍按收益评估，暂不迁移。
3. **步骤三**：Today/Archived 查询、归档预填、目标 root 重绘与搜索框焦点迁入。
4. **步骤四（2026-10-03）**：Review 核心日期、范围、工作区、条目、日/周期与分页状态迁入 `RootContext.review`。
5. **步骤五/六（2026-10-04）**：Review 查询/筛选、批量/折叠/详情与摘要异步会话迁入 `RootContext.review`；请求按 root、请求号、事实和提供方校验，关闭/切页/重载拒绝过期回调。
6. **生命周期收口（2026-10-04）**：root 关闭与卸载清空 Map；`isSurfaceRoot` 阻止旧 HTMLElement 重新注册；设置页导航入口显式传递 root。
7. **Today/Settings 会话收口（2026-10-04）**：Today 批量、精确录入、附件、快速录入取消和优先提醒展开会话迁入 `RootContext.today`；Settings 来源卡片展开态改由 `SettingsRootContext.openSourcePanels` 持有，持久化视图偏好仍按共享桶语义保留。

### 风险与缓解

- **双写不一致**：步骤一的代理层确保宿主 `currentPage` 始终与最后活跃 root 一致；test:quality 的 cross-surface-matrix 守门扩展覆盖
- **dock 不存在时**：`dockElement` 为空的宿主（纯页签）只有 `tabElement` 一个 root，行为不变
- **快速弹窗关闭**：`quickDialogElement` 销毁时从 `rootContexts` 删除对应条目

## 验收门

1. dock 打开今日、页签打开回顾、快速弹窗打开设置——三表面互不覆盖。
2. dock 切页后页签不跟随（反之亦然）。
3. 所有 `data-action`/`data-mobile-nav`/渲染块回调保持兼容（cross-surface-matrix 零回归）。
4. 每 root 的滚动位置/折叠态独立记忆。
5. Today/Archived 在两个 root 同时打开时，输入、清除、预填和焦点不互相覆盖。
6. Review 在两个 root 同时打开时，日期、范围、工作区、条目、日/周期、分页、查询、筛选、批量、折叠和异步摘要不互相覆盖；关闭表面后不回写 DOM。
7. 关闭/卸载/重载后 root Map 不保留旧会话；设置页返回、来源记录和编辑入口只改变触发 root。

## 实施估算

- 步骤一（核心）：~200 行改动（index.ts + navigation.ts），需重点回归 cross-surface-interaction 与 multi-root 守门
- 步骤二、步骤三、步骤四、步骤五/六与生命周期守门已交付；剩余参数迁移与完整恢复矩阵另行排期
