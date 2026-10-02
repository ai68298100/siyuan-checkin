# 多 root 独立页面设计小稿（T-1621 剩余，2026-09-30）

## 定位

本稿是 T-1621 剩余（按 root 独立 currentPage）的**架构设计与实施基线**。步骤一已落地：dock/页签/快速弹窗的页面路由按 root 保存并由绑定器传递 root；本稿继续约束后续日期、范围、筛选、焦点和滚动状态迁移，不把未完成的全量恢复误记为已完成。

## 现状根因

`currentPage` 是宿主级单字段（`src/index.ts:1689`），`render()` 遍历全部 root 调 `renderInto(root)`，所有 root 渲染同一页面（`src/index.ts:3365/3406-3411`）。导航函数（`showTodayFor` 等）改 `currentPage` 后调 `render()`，因此最后导航的表面决定了所有表面的页面。

## 设计方案

### 核心变更：引入 `RootContext` 取代宿主级 currentPage

```ts
interface RootContext {
    page: PageId;
    returnTo?: PageId;
    // 其余契约 1 params 字段可后续渐进迁入
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
| Root 级 | currentPage、pageScrollTops、renderedPages、settingsOpenSourcePanels | 每 root 独立 |
| 会话级（可迁移） | todayQuery、summaryRange、historyQuery、collapsedGroups | 首批保持宿主级（改 per-root 收益低/风险高） |
| 纯会话（暂不迁移） | bulkSelected、pendingAttachments、expandedExactEntries | 跟随宿主级 currentPage 快捷方式 |

### 实施策略：三步渐进

1. **步骤一**：引入 `RootContext` + `rootContexts` Map；`renderInto` 按 root 取页面；导航函数加可选 root 参数；宿主 `currentPage` 变为「最后活跃 root」的代理。
2. **步骤二**：折叠态/展开态（reviewFoldSections、collapsedTodayGroups 等）按需评估是否迁入 per-root——首批不迁（改动大/收益低）。
3. **步骤三**：把滚动位置、焦点和返回相关会话态纳入 root context 的恢复/清理策略；现有 `pageScrollTops` 已按 root 存储，但尚未完成契约化的全量序列化。

### 风险与缓解

- **双写不一致**：步骤一的代理层确保宿主 `currentPage` 始终与最后活跃 root 一致；test:quality 的 cross-surface-matrix 守门扩展覆盖
- **dock 不存在时**：`dockElement` 为空的宿主（纯页签）只有 `tabElement` 一个 root，行为不变
- **快速弹窗关闭**：`quickDialogElement` 销毁时从 `rootContexts` 删除对应条目

## 验收门

1. dock 打开今日、页签打开回顾、快速弹窗打开设置——三表面互不覆盖。
2. dock 切页后页签不跟随（反之亦然）。
3. 所有 `data-action`/`data-mobile-nav`/渲染块回调保持兼容（cross-surface-matrix 零回归）。
4. 每 root 的滚动位置/折叠态独立记忆。

## 实施估算

- 步骤一（核心）：~200 行改动（index.ts + navigation.ts），需重点回归 cross-surface-interaction 与 multi-root 守门
- 步骤二/三：视步骤一验收结果另行排期
