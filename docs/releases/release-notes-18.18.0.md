# 小驴打卡 v18.18.0

「可信行动事实层与生态连接里程碑」大版本发布：收口 Task Horizon 合作提供端协议（C-01~03、W-03），彻底消除非法日期时间隐式滚日与夏令时跨度漂移，全面落地多 root 跨表面交互隔离与表单草稿保护，统一 API/Agent/快速写入幂等，提供初始化失败可达修复通道与隐私敏感字段脱敏矩阵。主存储保持向前兼容，最低思源版本 3.8.4。

## 核心更新

### 1. Task Horizon 合作提供端协议（L1 日历与 L2 回写前置就绪）
- **C-01 远端变更广播**：远端 Store 产生实质变更进入本地时广播一次既有 `analytics-updated`，无变化不广播，卸载安全保护。
- **C-02 API 生命周期规范**：增设全局 CustomEvent `checkin:api-state-changed`（覆盖 loading/ready/failed/unavailable 四阶段）；卸载时彻底移除 `window.siyuanCheckin` 全局引用；`isReady` 与 `whenReady` 强化自身全局挂载与未卸载复验。
- **C-03 日历投影增量字段**：日历投影每个 point 增补当日有效修订的 `scheduleType`，顶层输出增补宿主本地基准日 `asOfDate`。
- **W-03 & T-1803 严格时间与专用写入约束**：
  - 升级 `normalizeValidIso` 严格带时区 ISO 校验，彻底拒绝 `2026-02-30`、`2026-04-31`、`24:00` 隐式滚日及 date-only/无时区输入；
  - 固定判序为：`输入格式 → 同身份墓碑 discarded → 已存/批内重复 duplicate → 业务校验 blocked → 写入 recorded`（墓碑优先于重复，历史事实不因后续规则变动被 blocked 覆盖）；
  - 落地 Task Horizon 合作专用约束：value 必须为 1、显式单位、身份日与落账本地日严格一致（`ref-date-mismatch`）、`count + daily + atLeast`（`target-incompatible`）、当日未显式 SKIP（`skip-blocked`）。

### 2. 核心事实层与日期时区正确性
- **T-1774 戒除类今日暂守口径**：底层 D-219 零破戒即守住与连击自然继承承诺不变；呈现层消歧：今日完成区标题自适应纯戒除（`today.atMostHoldingTitle`）与混合场景（`today.completedHolding`），洞察日格进行中展示为 `insights.atMostHolding`（今日守住中）。
- **T-1793 & T-1811 严格真实日期契约**：日历投影、排期预演与周负荷全量接入 `date-keys.ts` 严格公历校验，淘汰 `eachDayCount` 无界循环，改按 `calendarDayNumber` O(1) 跨度计算与 366 天截断。
- **T-1794 配额末日 DST 算术**：消除 `-86400000` 物理毫秒减法（杜绝美东等春令时 23 小时天漂移到前两日），改按 `addDays(endKey, -1)` 纯整数日序号推导上一民历日。
- **T-1812 日历投影数值戒除与单位同源**：数值型 atMost 戒除项日状态改用 `isComplete` 单一模型判定（未超上限为 `at-most-safe`，真实超额才判 `at-most-breach`），单日 value/progress 严格对齐当日生效修订单位。
- **T-1802 渲染块时段统计对齐**：引入 `getEventLocalHour`，优先按显式时区偏移或 timeZone 参数提取字面小时，彻底消除跨时区早/午/晚分组漂移。

### 3. 多表面交互隔离与编辑草稿保护（Multi-Root Isolation）
- **T-1791 & T-1792 快速弹窗稳定性与草稿安全**：
  - 引入 `shouldProtectQuickDialogDraft`，放弃全局代理 currentPage，直接读取弹窗自身 root 的 `pageOfRoot` 与 `isEditorFormDirty` 状态；外部关闭、重新打开重置以及 `.b3-dialog__close` 按钮统一拦截，确认后才销毁/重置，取消保留草稿与弹窗；
  - 标题拖动与双击最大化重构为 `container` 事件委托（经 `isHeaderTarget` 过滤交互控件），消除首开渲染前查询 header 为 null 导致监听未安装的缺陷，在 `quickDialogFrameCleanup` 中精确释放。
- **T-1804 & T-1805 多 root 搜索/焦点隔离与后台刷新**：
  - `focusTodaySearchFor` 扩参为 `(host, selection?, root?)`，显式传递发起 root 限制搜索聚焦，避免 dock 抢走 quick/tab 焦点；
  - 建立 `pendingFocusByRoot` WeakMap，优先归位发起 root 的待聚焦卡片；
  - `renderBackgroundUpdateFor` 改造为逐 root 读取 `pageOfRoot`，非编辑页正常刷新更新视觉，编辑页（`page === "editor"`）跳过重绘以保护 DOM 表单草稿。
- **T-1806 上下文菜单几何边界与焦点还原**：重构定位算法，结合 `rootRect`、`visualViewport` 与 `menu.offsetParent` 实时计算相对偏移与安全边距，解决 dock 窄面板越界与 quick 弹窗 CSS transform 坐标偏移，点外关闭与 Esc 自动还原焦点。
- **T-1809 & T-1810 跨表面导航 root 传递**：事项页返回按钮、关联项目编辑以及历史/Today 键盘与菜单导航统一传递当前 `root`，跨表面返回栈严格隔离。
- **T-1789 & T-1790 委托监听幂等与销毁**：`bind-editor.ts` 导出 `cleanupEditorFor` 并建立自动销毁表，绑定前清理旧监听，卸载联动清理；Today 拖拽与移动端 toggle 捕获增加单例标记。

### 4. 数据安全、错误恢复与无障碍完备
- **T-1786 统一写入幂等与破戒**：Agent `checkin-record-item` 增加 `requestId` 幂等键并映射为 `agent:<requestId>`；`recordEvent` 支持 `externalRef` 去重，重复请求直接回显已有事实，杜绝重复增账。
- **T-1783 敏感信息脱敏与安全截断矩阵**：`privacy-scope.ts` 引入 `redactSensitiveText` 与 `sanitizeDiagnosticDetail`，清洗恶意控制字符与双向覆盖字符，自动脱敏 Bearer 令牌、API Key 与用户私有绝对路径，安全截断 UTF-16 代理对；`diagnostics.ts` 接入脱敏。
- **T-1808 初始化失败状态可达修复**：渲染失败屏增设可达的“重试加载”与“复制诊断信息”按钮，自动聚焦重试控件保障读屏操作；提供 `retryInitialization` 锁内安全重试通道与结构化诊断导出。
- **T-1779 页面级偏好一致性与回滚**：回顾折叠 sections、洞察项目选择、助手报告跳转、快捷锚点跳转、报告区块开关、报告来源筛选 6 处改动全部接入 `applyPreference`，持久化失败自动快照回滚并提示。
- **T-1785 动态图标白名单与 DOM 节点采用**：`renderIconMarkup` 严格限制图片白名单（https:// 或 base64 data:image），未编码 SVG 与脚本转义为安全文本；`normalizeUiIcons` 全面消除裸 `innerHTML = uiIcon()`，升级为 DOM 原生 `replaceChildren(this.iconNode(...))`。
- **T-1800 & T-1801 渲染块可达性与截断可见性**：月历与热力图日期格全面升级为原生 `<button type="button">`，增设 Enter/Space 键盘跳转回调与 `:focus-visible` 焦点环；Today 视图超过 5 项时显式输出截断提示并提供“查看全部”直达入口。

## 升级与兼容说明

- **兼容性**：主存储结构向前兼容，旧版本数据零迁移；
- **公开 API**：API v5 保持兼容并增强了 Task Horizon 严格契约与生命周期通知；
- **全质量链**：全量 250+ 测试、UI 走查套件、移动端矩阵与生态测试全线通过。

- SHA-256：`bcaf2416a1b131ef962f7e3d0fa45311ca9e2c507b0db7c228d05683ac41cf3a`
