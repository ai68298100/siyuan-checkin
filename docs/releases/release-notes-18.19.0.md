# 小驴打卡 v18.19.0

「多桶备份版本化、写入幂等事实对账与全表面视觉系统收口」大版本发布：正式落地版本化多桶 BackupEnvelope 协议，提供辅助存储桶三分类架构与全量原子回滚；收口跨入口写入幂等去重、二值完成阻断与戒除首破对账口径；彻底修复顶栏图标消失与后台重绘突发打断痛点；全面收敛五级按钮、表单输入、长表单分节与宿主容器三档密度规范。主存储保持向前兼容，最低思源版本仍为 3.8.4。

## 核心更新

### 1. 数据可靠性：版本化多桶 BackupEnvelope 协议与原子事务（T-1787 / T-1862，D-515 / D-517）
- **统一输入识别与旧版单主档向后兼容**：落地 `preflightUnifiedBackup`，自动识别旧版单主档 JSON（`envelopeVersion: 0`）与新版多桶 BackupEnvelope（`envelopeVersion: 1`）；旧版单主档如实披露未包含模板、问卷、偏好等独立配置，消除“主档恢复等于全量迁移”的用户认知误区；未知未来版本严格 fail-closed 拦截。
- **逐桶规划与敏感桶遮罩治理**：基于 D-514 分类策略自动生成逐桶处理规划（主档/覆盖型=overwrite，追加型=merge，敏感桶=skip 且 payload null 遮罩）；恢复前弹窗展示包含的存储桶清单、来源插件版本与时间戳、修改风险提示，得到明确确认后才执行恢复。
- **多桶原子写入与全量回滚事务（Atomic Multi-Bucket Rollback）**：多桶恢复在 `withStorageLock` 锁内执行，预先快照所有桶的内存状态；主档严格走 `enqueueMutation` 协调调度；若主档或任何辅助桶在保存时异常，立即触发全量原子回滚，杜绝部分迁移或内存-磁盘分叉。
- **一键全量备份导出**：在设置页与 `plugin-ops.ts` 落地 `downloadBackupEnvelopeFor` 与 `createBackupEnvelopeFromBuckets`，支持一键导出包含全部辅助桶与脱敏审计日志的完整版本化备份。

### 2. 存储基建：辅助存储桶三分类架构与生命周期治理（T-1860 / T-1861，D-514）
- **三分类辅助存储桶体系落地**：
  - 追加型（AI 分析历史、操作审计日志）：重读远端快照并执行并集合并，持久化失败显式回滚，卸载前有界预算排空；
  - 覆盖型 / LWW（视图偏好与会话草稿）：严格覆盖，杜绝重置被旧磁盘快照复活；
  - 显式删除与增删改型（用户模板、自定义图标库、问卷日记）：计算被删除项目并在并集前剥离，杜绝删除后被远端快照复活缺陷。
- **单桶写入事务回滚**：`persistUserTemplates`、`persistCustomIconLibrary` 与 `saveJournalData` 在磁盘写入失败时严格回滚内存快照，全仓 TypeScript `any` 保持零残留。

### 3. 核心事实层：跨入口写入幂等、二值完成阻断与破戒回执对齐（T-1786，D-518）
- **二值完成与戒除破戒口径彻底收敛**：在 `recordExternalEvent`（API 单条调用）补齐对二值项目完成和二值戒除项目（`atMost`）的同口径判定：
  - 普通二值项目当天若已完成（`isComplete`），拦截写入并返回 `fail("already-complete")`；
  - 二值戒除项目当天零破戒事实时，首次破戒允许写入，如实记录犯规事实并中断守住连击；当天若已有破戒事实，后续重复尝试拦截并返回 `fail("already-complete")`。
- **跨入口写入幂等与事实回显**：无论通过 API 单条 `recordEvent`、Agent `checkin-record-item` 携带 `requestId`（映射为 `agent:<requestId>`）还是 UI 入口，重复提交同一 `externalRef` 时严格返回既有事实，杜绝重复增账。
- **回执对账与撤销对象统一**：幂等回显既有事件以及外部 API 写入成功时，统一调用 `setRecentRecord` 刷新当前回执（含 `eventId`, `itemId`, `localDate`, `source`, `target`, `progress`），保证界面上的事实展示、查看详情面板与撤销对象跟实际入账事件 100% 对齐。

### 4. 稳定性加固：顶栏图标消失与后台暴力重绘防御治理（D-522）
- **根除纵向滚动外溢**：在 `bindNavOverflowHintFor` 中废除 `scrollIntoView`，改用纯内部的 `scroller.scrollLeft` 自包含横向位置计算，彻底杜绝任何父级或祖先容器产生纵向滚动，顶栏永远稳固钉在顶部视野内。
- **建立后台重绘交互保护门**：在 `renderBackgroundUpdateFor` 中建立活动输入状态检测，若当前容器包含获得焦点的输入控件（`input, textarea, select, [contenteditable]`），立即挂起后台全量重绘，等待用户失焦（`focusout`）后再执行，绝不在用户交互期间突发闪烁破坏 DOM。
- **中窄屏顶栏自适应紧凑显示**：重构 `< 720px` 规则，440px~719px 自动进入紧凑模式保留小驴品牌头像与所有导航图标；仅在极窄状态（`< 440px`）隐藏品牌文字，仍然保留头像与图标导航。
- **顶栏事件统一闭环与 SVG 尺寸固化**：在 `renderInto` 统一收尾处对当前 `root` 闭环绑定 `bindDialogClose`、`bindMobileNav` 与 `normalizeUiIcons`；在 CSS 中将顶栏 SVG 图标强制钉死为 `18px`，杜绝任何阶段的尺寸坍缩。

### 5. UI/UX 视觉系统收口与多容器响应式基线（T-1817~T-1824，D-516 / D-519 / D-520 / D-521）
- **五级动作按钮语义体系（T-1817）**：落地 Primary / Secondary / Quiet / Destructive / Icon 五级语义类名，统一定制 `:focus-visible` 焦点环，高对比度模式下自动注入实体轮廓。
- **表单输入高度与文本域 Token 收敛（T-1818）**：新增 `field-height-sm: 28px`、`field-textarea-min-height: 72px`、`field-textarea-min-height-lg: 88px` 标准 token，统一表单校验与禁用状态。
- **长表单分节与折叠系统（T-1821）**：为 `[data-editor-section]` 增设虚线视觉分隔与加粗标题，清晰界定“基础设置 / 排期规则 / 记录方式”区域；收敛高级设置抽屉微动效。
- **导航溢出指引与防折行（T-1819）**：新增横向溢出渐变蒙层，启用 `scroll-snap-type: x proximity` 与 `flex: 0 0 auto` 防折行，选中项自动居中可见。
- **宿主容器三档密度与软键盘保护（T-1824）**：统一定义 dock 紧凑档（0.9 / 30px）、tab/quick 标准档（1.0 / 34px）与移动端触控优先档（1.1 / 44px）；移动端输入框聚焦时自动注入 96px `scroll-margin-bottom` 防软键盘遮挡。

## 升级与兼容说明

- **主存储向前兼容**：数据结构向前兼容，旧版本无需手动数据迁移；
- **全质量门禁全绿**：全量自动化测试、v18 专项测试套件（27项）、CSS 资产卫生门禁（0死类，体积受限在680KiB内）全部通过。

- SHA-256：`472388194c7cc07cffdc74166ddff960ab27ba2486b4876a1bb638d14daab165`
