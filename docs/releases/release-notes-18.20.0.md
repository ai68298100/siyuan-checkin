# 小驴打卡 v18.20.0

「全生态联邦中枢互联、日记 LifeLog 闭环与长春花紫 Bento 美学」里程碑版本发布：全面接入 Epoch 6 跨插件联邦 SDK（`src/ecosystem-bridge-kit.ts`），实现 `siyuanCheckin`, `LvCheckin`, `lvCheckin`, `xiaolvCheckin` 四别名挂载与安全核验注销；向小驴雷切安全注册工作台小组件；正式收录全生态 `exam:`, `cards:`, `glean:`, `contacts:`, `home:` 引用前缀；打卡/跳过实时以 LifeLog 格式追加至思源当日日记，支持分节标题、图文混排、撤销删除、一键批量同步与即时预览；顶栏与侧栏升级为 32×32 单色矢量图标；全面响应思源 v3.8.8 桌面紧凑模式与生命周期加固；注入长春花紫与暖橙水波纹 Bento 美学。主存储保持向前兼容，最低思源版本仍为 3.8.4。

## 核心更新

### 1. 跨插件联邦：Epoch 6 联邦标准与行为落地中枢（T-1897 / T-1898，D-549 / D-550）
- **四别名首实例独占与安全注销**：统一挂载 `siyuanCheckin`, `LvCheckin`, `lvCheckin`, `xiaolvCheckin` 四别名，`onload` 实行首实例独占（First-Instance-Wins），`onunload` 实行身份所有权校验注销，绝不误删并发打开的兄弟窗口 API 引用。
- **全生态 externalRef 命名空间收录**：正式收录小驴考试（`exam:`）、小驴闪卡（`cards:`）、小驴拾遗（`glean:`）、小驴人脉（`contacts:`）、小驴管家（`home:`）引用前缀，统一批量幂等入账规范，同日重复入账自动幂等对账。
- **小驴雷切工作台小组件注册**：在 `onLayoutReady` 阶段通过 `registerRaikiriModuleSafely` 安全向小驴雷切注册 `checkin-daily-streaks` 连续坚持组件，支持无强依赖优雅降级。

### 2. 生态联动升级：思阅、思播与日记 LifeLog 深度互操作（T-1882～T-1894）
- **思阅 SiReader v2.5.6 移动端深度联动**：适配 `reader:mobile-open/close` 生命周期，自动提取中英文书名注入打卡备注。
- **思播 SiPlayer v2.0.9 事件驱动结算**：监听 `mediaChanged` 与 `playerDestroy`，自动提取音视频标题，暂停时关闭轮询，消灭后台 CPU 空转。
- **日记 LifeLog 结构化追加与图文混排**：打卡/跳过实时以纯净项目名追加到思源当日日记，支持自定义分节标题（如 `### LifeLog`），打卡附带照片时自动生成 Markdown 图文时间线。
- **撤销打卡清理日记与批量同步去重**：撤销打卡自动调用 `/api/block/deleteBlock` 精确清理刚刚追加的日记块；设置页支持一键批量补写今日打卡至日记，结合 SQL 前置扫描精准去重。
- **Today 页面行动轨迹抽屉与 Review 日期分组卡片**：Today 首页挂载“今日行动轨迹”折叠抽屉并提供日记 0 距离直达跳转；Review 回顾页时间轴按日期分桶为 `.lc-checkin__lifelog-day-group` 卡片流，与月历和热力图快速下钻联动。

### 3. 视觉与交互：单色高灵动图标与长春花紫 Bento 美学（T-1899 / T-1900，D-551 / D-552）
- **32×32 单色矢量图标**：顶栏与侧栏升级为与新版 Logo 1:1 映射的单色矢量图标（圆角便签卡 + 饱满对勾 + 勋章点），与思源系统原生主题图标风格严密融合；根目录保持 256×256 高清彩色头像不变。
- **长春花紫+暖橙 Bento 美学注入**：引入 `--lv-brand: #6366F1` 经典长春花紫与 `--lv-accent-orange: #FB8C00` 暖橙跳色，连续打卡大卡片呈现同心圆水波纹底纹，按钮挂载 `:active` 物理微触感。
- **统一弹窗家族门面**：弹窗标题栏统一呈现紫底白标、主标题与版本号微胶囊徽标。

### 4. 宿主协同与生命周期加固（T-1895 / T-1896，D-547 / D-548）
- **思源桌面紧凑模式自适应**：无缝感知 `:root[data-ui-density="compact"]`，分屏 Tab 与快速弹窗自适应缩放至 0.9（控件高度收窄至 30px）。
- **生命周期契约加固**：重写并对齐 `onDataChanged` 契约，全仓零引用已废弃的 `Protyle.updateTransaction`，拆除预算严格控制在官方 5 秒硬限内。
- **工程排雷防线**：`plugin.json` 开启 `settingsWindow: true` 独立大窗；输入框 keydown 增加中文输入法组字态（`isComposing`）防误触拦截；二级弹窗 Escape 阻止冒泡防击穿；根目录补齐 `CHANGELOG.md` 与 `.github/workflows/release.yml`。

## 升级与兼容说明

- **主存储向前兼容**：数据结构向前兼容，旧版本升级无需手动数据迁移；
- **全质量门禁全绿**：全量测试套件、v18 专项测试套件（46项）、CSS 卫生门禁（0死类，严格维持在680KiB预算内）全部通过。

- SHA-256：`f5048d68dd64edba865492a9a326628a73a794c69b7dd02d38cdf6f97d1bf3d2`
