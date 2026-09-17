# 小驴打卡 · 代码仓库全景分析

> 分析基线：v12.0.1（`package.json` / `plugin.json` 同版本），思源最低兼容 v3.4.2。
> 源码规模：`src/` 共 60 个 TS 文件约 14400 行，其中入口 `src/index.ts` 2483 行；`tests/` 74 个 `.cjs` 守门脚本。
> 本文基于源码实读，与仓库内 `docs/architecture.md`（模块地图）互补：那份讲"改哪里"，这份讲"怎么跑起来"。

---

## 1. 一句话定位

一个**以本地数据为中心**的思源笔记插件：记录一次完成 / 次数 / 时长 / 数量 / 自定义值，按计划生成"今天的机会"，再在同一份可追溯数据上做统计、提醒、复盘和跨插件协作。

关键取舍：**核心功能不依赖网络或 AI**。没有 `kernel.js`、不声明 `kernels`、不启用 `publish.data`。智能体、番茄钟、速切插件都是可选增强，缺了它们手动打卡照常工作。

---

## 2. 分层架构与依赖铁律

```
思源宿主
  └─ src/index.ts   插件类：生命周期 / 存储读写 / 渲染编排 / 页面切换
       ├─ render/          页面视图（纯函数出 HTML）+ 事件绑定（回调宿主方法）
       ├─ 领域层           model rules quota analytics occasions reminders charts features/*
       ├─ 集成层           api api-contract ecosystem integrations agent-capabilities agent-suggestions
       └─ 基础设施         shared i18n catalog lunar view-preferences types ui/*
```

**两条铁律**（`docs/architecture.md` 明确要求，源码中也确实如此）：

1. **依赖方向只能从上往下**。领域层不 `import` 任何 `render/*`，也不 `import` `index.ts`；领域层是纯函数，无 DOM、无 IO，因此可被 `node tests/*.test.cjs` 直接单测。
2. **`render/` 不做持久化**。视图模块拿不到 `loadData/saveData`，只能通过文件顶部显式声明的 `Host` 接口回调宿主方法（如 `BindTodayHost`、`NavigationHost`、`PluginOpsHost`）。

这套约束的直接产物是 `index.ts` 的持续瘦身：大量方法体外置成 `xxxFor(host, ...)` 纯函数（`api.ts`、`plugin-ops.ts`、`navigation.ts`、`model-helpers.ts` 及一堆 `render/bind-*.ts`），入口只保留编排与状态。宿主成员通过结构化接口暴露，例如 `createCheckinApi(this as unknown as CheckinApiHost)`。

---

## 3. 插件生命周期（与思源的握手）

| 阶段 | 位置 | 做了什么 |
| --- | --- | --- |
| `onload()` | index.ts:320 | 判前端类型（`getFrontend()`）、启动主题监听、`addIcons` 注入 SVG 符号、`addDock` 侧边栏、`addTab` 自定义页签、`addCommand` 两条命令、**创建并挂载 `window.siyuanCheckin`** |
| `onLayoutReady()` | index.ts:408 | `addTopBar` 顶栏按钮 → 在**存储锁内**并行读取全部存储键 → `normalizeStore` 归一化 → 需要迁移则立即落盘 → 置 `initializationState = "ready"` → 注册智能体能力 → 首次 `render()` → 预约午夜刷新 |
| `onDataChanged()` | index.ts:466 | 思源通知数据变化 → `reconcileStore()` 重放合并，并重载偏好、日期事项、模板、提醒动作 |
| `onunload()` | index.ts:494 | 置 `acceptingOperations = false` → 摘监听/移按钮 → 关弹窗、关页签 → **等待三条队列排空**（mutation / save / focus）→ 静默停止专注适配器 → 摘掉 `window.siyuanCheckin` |

几个值得注意的设计：

- **就绪门闩**：`readyPromise` + `settleReady()`。外部插件必须 `await checkin.whenReady()`，未就绪时所有写操作返回 `undefined` 而不是抛错。
- **初始化三态**：`loading | ready | failed`。未 ready 时 `renderInto()` 直接渲染"正在加载/读取失败"占位，不让用户看到半截界面。
- **主题跟随**：`resolvedAppearance()` 先读 `document.body` 的 `dark` / `light` 类（实时反映思源切主题），再退回 `window.siyuan.config.appearance.mode`，最后才是系统偏好。配合 `MutationObserver` 做 50ms 防抖的"跟随思源"实时重绘。
- **跨日边界**：`scheduleMidnightRefresh()` 预约次日 00:00:01，触发 `refreshDateBoundary()` 重置当天相关状态；同时 `window.focus` 事件也会兜底检查（休眠唤醒场景）。

---

## 4. 数据模型

### 4.1 核心类型（`src/types.ts`）

- `CheckinItem`：打卡项目。五种 `kind`（binary / count / duration / quantity / custom），`schedule` 支持 daily / weekly / workdays / custom / interval / quota。带 `revisions[]`（按生效日期的历史版本）、`archivePeriods[]`（归档区间）、`group`、`priority`、`sortOrder`、`timeSlot`、`linkedOccasionId`（与日期事项的联动）。
- `CheckinEvent`：不可变事实记录。`source` 区分 `manual | tomato | import | api`；`externalRef` 用于外部事件幂等；可带 `note` 与图片附件（data URL，≤500KB）。
- `CheckinEventTombstone`：**撤销 = 删除标记**，不是物理删除。这样旧客户端不会把已撤销事件从别处同步回来。
- `CheckinStore`：`{version: 2, items, events, eventTombstones, templates?}`。

### 4.2 领域层职责

| 文件 | 职责 |
| --- | --- |
| `model.ts` (820行) | 存储规范化、事件去重、墓碑过滤、跨窗口 `mergeStores`、`detectStoreConflict`、快照历史、审计条目 |
| `rules.ts` / `quota.ts` | "今天有没有机会、完成了没有"：调度谓词 `isScheduled`、进度求值 `evaluateRule`、周期配额（周/月，按天或按值计数） |
| `analytics.ts` | 日/周/月/自定义范围统计上下文，插件界面与智能体共用同一份契约 |
| `occasions.ts` (448行) | 日期事项：公历/农历、一次性/周/月/季/半年/自定义间隔、按月份第 N 个星期、提前提醒天数 |
| `reminders.ts` | 提醒中心投影（日期事项 + 打卡双来源），以及延期/跳过/恢复等用户动作 |
| `charts.ts` | 纯函数 SVG 图表：年度热力图、折线、柱状，空数据安全 |
| `lunar.ts` | 农历换算（日期事项的农历年度重复依赖它） |
| `features/*` | 成就墙、洞察、本地行动建议、历史筛选、记录备注（思源块链接净化）、模板管理、建议工作流、报告生成 |

`normalizeStore()`（model.ts:163）是数据入口的守门人，一次性完成：项目归一化 + 同 ID 择优、事件按 ID 去重 + 墓碑过滤 + 孤儿事件剔除、`externalRef` 幂等去重、归档态迁移。任何来源的数据（磁盘、导入、快照、外部 API）都必须先过这一道。

---

## 5. 渲染模型：视图与绑定分离

`render/` 下成对出现：**视图函数返回 HTML 字符串，绑定函数把 DOM 事件委托回宿主**。

```
render/fragments.ts   今日页碎片（事项横幅、项目卡、打卡日志、近期记录）
render/review.ts      回顾页（历史 + 总结 + 热力图 + 成就 + 提醒中心 + 逾期历史）
render/editor.ts / save-form.ts / bind-editor.ts   新建编辑表单（视图 / 校验保存 / 绑定）
render/occasions.ts / bind-occasions.ts            日期事项页
render/settings.ts / settings-navigation.ts        设置页与分类导航
render/bind-today.ts / today-bindings.ts            今日页事件：记录、批量、拖拽、j/k/e 键盘流
render/bind-page-navigation.ts                      回顾页折叠、筛选、提醒动作、补记、跳转
render/quick-dialog.ts                              快速弹窗生命周期、尺寸偏好、移动端顶栏、速切动作
render/focus-timer.ts / focus-adapter.ts            内置专注计时 / 外部番茄钟适配
```

渲染主链路（`render()` → `renderInto(root)`，index.ts:952 起）：

1. 收集三个"表面"根节点：`dockElement` / `tabElement` / `quickDialogElement`，去重后逐个渲染；
2. **切页前保存 `.lc-checkin` 的 `scrollTop`**（`WeakMap<root, Map<page, number>>`），渲染后恢复。用 WeakMap 而非全局标记，是因为同一轮要依次渲染多个表面，全局旧页标记会把 A 表面的滚动位置错记到 B 表面；
3. 按 `currentPage` 选择 `renderToday/renderReview/renderEditor/...` 整块替换 `innerHTML`；
4. 写入 `data-appearance` / `data-palette` / `data-reduced-motion`，把所有内容塞进 `.lc-checkin__layout` 包裹层（容器查询无法给自身容器设样式）；
5. 移动端补顶栏，dock 补左侧 rail。

**局部刷新**（`renderTodayItemLocally`，index.ts:793）是这个版本的性能与体验核心：打卡后只替换同结构的目标卡片和派生计数，保留滚动位置与焦点。但保守策略非常明确——只要涉及完成态切换、完成区归属变化、跨日事件、或某个表面找不到对应卡片，一律回退完整重投影。注释里写得很直白：避免"多窗口只更新一部分或卡片留在错误分区"。

---

## 6. 持久化与一致性

### 6.1 十个独立存储键

| 键 | 内容 |
| --- | --- |
| `checkin-store` | 主存储（items / events / tombstones） |
| `checkin-store-backup` | 快照历史（保留最近 3 份） |
| `checkin-store-audit` | 审计条目（conflict / merge / restore / migration，限 50 条） |
| `checkin-view-preferences` | 主题、动效、弹窗尺寸、排序等显示偏好 |
| `checkin-user-templates` | 我的模板 |
| `checkin-custom-icon-library` | 自定义图标库 |
| `checkin-reminder-actions` | 提醒用户动作（延期/跳过） |
| `checkin-suggestion-workflow` | 建议工作流（独立版本化，不混进主 store） |
| `checkin-occasions` | 日期事项（`occasions.ts` 内定义） |
| `agent-analysis-history.json` | 智能体分析缓存（`agent-suggestions.ts` 内定义） |

### 6.2 三道一致性防线

1. **Web Locks 跨窗口互斥**：`withStorageLock()` 优先用 `navigator.locks.request("siyuan-checkin-store-write", {mode:"exclusive"})`，不支持时退回模块级 Promise 队列。所有多窗口（dock + 页签 + 弹窗）读写都串行化。
2. **乐观锁（修订指纹）**：`revisionFingerprint(item, date)` 在动作发出时取样，写入前比对。不一致直接提示"数据已在别处更新"并放弃写入——这是防止旧窗口覆盖新数据的最后一道闸。
3. **保存队列 + 快照**：`persist()` 把写操作挂到 `saveQueue` 上串行执行；每次写入前先把**上一份已持久化状态**追加进快照历史，再写主存储。写失败会回滚内存状态并提示。

**跨窗口合并**（`enqueueMutation`，index.ts:2362）是每次写操作的前置动作：读磁盘 → `detectStoreConflict(lastPersisted, remote)` → 有冲突记审计 → `mergeStores(local, remote)` → 本地与远端不一致则回写 → 同步日期事项 → 执行实际操作 → 若发生过刷新则失效摘要并后台重绘。`window.focus` 事件也会触发 `reconcileStore()`，覆盖休眠唤醒场景。

外部事件另有一层幂等：相同 `source + externalRef` 直接视为重复，返回已存在事件而不新增。

---

## 7. 对外集成：`window.siyuanCheckin`

协议 `siyuan-checkin`，**API 版本 4**（`api-contract.ts`）。设计上刻意让接入方**按能力协商而不是猜版本号**：

```js
const checkin = window.siyuanCheckin;
await checkin.whenReady();
if (checkin.hasCapability("events.record")) {
  await checkin.recordEvent({
    itemId: "item-id", value: 25, unit: "分钟",
    source: "tomato", externalRef: "tomato-session-2026-001",
  });
}
```

能力集：`items.read` `events.read` `occasions.read` `events.record` `occasions.complete` `summary.read` `summary.custom` `analytics.read` `export.json` `export.csv` `focus.adapters` `summary.providers` `suggestions.read` `integrations.events`。

**事件广播**走 `window.dispatchEvent(new CustomEvent(...))`，事件名集中在 `integrations.ts`：`checkin:item-created`、`checkin:item-updated`、`checkin:event-recorded`、`checkin:event-deleted`、`checkin:suggestion-workflow-updated`、`checkin:analytics-updated`。该文件顶部有一段启动期自检——事件名与 `api-contract.ts` 的协议快照不一致就直接 `throw`，防止契约漂移。

**适配器注册**：`registerFocusAdapter()`（番茄钟）与 `registerSummaryProvider()`（总结模型）都返回反注册函数，并在宿主销毁/插件卸载时清理。两者都带超时（`withTimeout(..., 30000)`）与"注册者是否已变更"的二次校验，避免旧结果覆盖新状态。

**思源智能体**：`registerSiYuanAgentCapability()`（index.ts:736）先探测 `typeof plugin.addAgentCapability === "function"`，不支持就静默跳过。已注册 11 个能力（`agent-capabilities.ts`）：总结上下文、项目列表、单项洞察、记录事件、日期事项列表/完成、即将到来、周报、创建项目、创建事项。写入类能力一律要求用户确认 + 审计 + 可撤销；建议只生成结构化差异（`analysis-diff.ts`），必须经用户确认才落地。

---

## 8. 与思源的交互集成清单

| 思源能力 | 调用点 | 用途 |
| --- | --- | --- |
| `Plugin` 基类 | `src/index.ts:143` | 继承，获得生命周期与全部注册 API |
| `addIcons` | index.ts:330 | 注入 `iconLvCheckin` SVG 符号 |
| `addDock` | index.ts:335 | LeftBottom 侧边栏，默认 420px，拖窄后由容器查询兜底 |
| `addTab` + `openTab` | index.ts:361 / `navigation.ts` | 自定义页签 `checkin`，命令"在页签打开" |
| `addTopBar` | index.ts:409 | 右侧顶栏按钮（仅桌面） |
| `addCommand` | index.ts:388, 395 | `Alt+Shift+C` 快速弹窗、页签打开 |
| `loadData` / `saveData` | 全局 | 插件私有存储，10 个键 |
| `onDataChanged` | index.ts:466 | 响应外部数据变更 |
| `getFrontend` | index.ts:325 | 判断 desktop / mobile / browser-*，决定布局与入口 |
| `Dialog` | `render/quick-dialog.ts` | 快速弹窗，移动端 100vw/100dvh 且禁用动画 |
| `showMessage` | 多处 | 轻量提示 |
| `addAgentCapability` | index.ts:738（运行时探测） | 思源智能体能力注册 |
| `document.body` 主题类 | index.ts:190 | 跟随思源深色/浅色 |
| `mobileTopBar` / `toolbar` | `render/quick-dialog.ts:286` | 移动端注入顶栏入口按钮 |

一个细节体现"不臆造思源 API"：移动端顶栏按钮注入失败会退避重试（`mobileTopBarRetryTimer`），找不到宿主容器就安静放弃，而不是写死 DOM 结构。

---

## 9. 三条关键运行流程

### 9.1 启动
`onload`（注册 UI + 挂载 API）→ `onLayoutReady`（顶栏 + 存储锁内读全量数据 + 归一化 + 迁移落盘）→ 置 ready → 注册智能体 → `render()` → 预约午夜刷新。

### 9.2 打卡（以手动记录为例，`recordEvent` index.ts:1906）
点击 → 取当前项目与当日修订 → 校验可用性与"二值项目未完成" → **比对修订指纹**（不符则提示并放弃）→ 构造事件 → `appendEvent` 追加 → `persist()`（先存快照再写主存，失败回滚内存）→ 失效摘要缓存 → 广播 `event-recorded` + `analytics-updated` → 若项目由日期事项生成且已完成，联动标记事项完成 → 弹出 2.6 秒"已记录 +N"可撤销 toast → 登记局部刷新目标 → `renderBackgroundUpdate()`。

外部插件走 `recordExternalEvent`，额外做单位一致性校验、`externalRef` 幂等、非负数值校验，并统一经 `enqueueMutation` 排队。

### 9.3 撤销
`removeEvents` 生成墓碑而非删除 → `persist` → 广播 `event-deleted`。`normalizeStore` 读到墓碑会过滤对应事件，保证旧窗口同步后不会"复活"已撤销记录。

---

## 10. 构建与质量保障

- **构建**：Webpack + esbuild-loader + `sass`；`siyuan` 声明为 `externals`（运行时由宿主注入，不打进包）；生产构建输出 `dist/` 并通过自定义 `PackageZipPlugin`（yazl）直接产出 `package.zip`。CSS 走 `MiniCssExtractPlugin` + esbuild 压缩，**有硬体积预算**，超线会阻断发布。
- **测试**：74 个 `.cjs` 脚本，用原生 `node` + `assert` 跑，不引入测试框架。分链：`test`（领域/迁移/生态/交互）、`test:ui`（UI 结构/响应式/文档/稳定性）、`test:mobile`（模板/键盘/旋转/触控）、`test:ecosystem`（API/事件/偏好文档）、`test:perf`（大事件量性能基线）。
- **视觉走查**：需要显式指定浏览器（`CHECKIN_BROWSER`），`CHECKIN_QA_THEME=dark` 切主题；`tests/width-walkthrough.cjs` 做多宽度走查。README 明确声明：截图结果**不能**当作真实客户端兼容证明。

---

## 11. 观察与风险点

1. **`index.ts` 仍是 2483 行的"上帝对象"**。虽然已外置大量方法体，但它仍同时持有约 90 个实例字段（UI 状态、筛选条件、计时器、队列、页签句柄混在一起）。继续拆分的下一个自然边界是"UI 视图状态"——把 `todayQuery`/`reminderFilter`/`occasionSearchQuery`/`reviewFoldSections` 这类纯展示态抽成一个 `UiState` 对象，入口只留数据与编排。
2. **局部刷新的安全边界靠人工注释维护**。`renderTodayItemLocally` 的回退条件（完成态变化、跨日、缺卡）写得很严谨，但这类"什么时候必须全量重绘"的隐性契约没有测试直接断言，重构时容易被破坏。建议补一组针对性的回归用例。
3. **`persist()` 每次写入都先追加快照**。`appendStoreSnapshotHistory` 会读回整个快照历史再写回（上限 3 份），在事件量很大时每次打卡都有一次额外的全量 JSON 往返。性能测试已覆盖投影，但快照路径的写入放大值得单独测一遍。
4. **生态测试与真实客户端存在鸿沟**。仓库自己承认：浏览器自动化无法覆盖宿主页签/dock/系统键盘/多窗口生命周期。12.0.x 的发布前人工复核清单是不可省略的。
5. **`docs/` 下有 51 篇文档**，`architecture.md` 与本文内容存在一部分重叠。建议以其中一份为唯一索引，另一份退化为链接，避免两处维护。
