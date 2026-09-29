# 宿主现场与发布验收台账（T-1602，2026-09-29）

定位：D-307 阶段 5 收口证据之一，T-1608 统一验收台账的宿主分栏。**证据四层**（D-307 总纲）：自动浏览器（桩宿主+真实 bundle）/ 隔离内核（转译桩映射）/ 思源真实宿主 / 真实第三方与真机。本台账只登记前两层的实测证据与后两层的 host-pending 状态——**未具备现场条件的项如实标注 host-pending 与取得条件，不以模拟通过冒充实测**。人工现场验收的操作模板沿用 `docs/integration-smoke-checklist.md`（表面矩阵/番茄双窗口/提醒中心三节）。基线 = commit f194f31 构建包（v18.9.0 工作树）。

## 1. 文档/笔记本目标

| 层 | 证据 | 状态 |
| --- | --- | --- |
| 自动浏览器 | journal-experience.cjs：resolveJournalTarget 显式文档/当日日记双栈（block→root 解析、dailyNoteSavePath sprig 渲染、hpath/ial 双策略定位、createDocWithMd 幂等）、失败查询不追加不建档、目标校验失败阻止记账且保草稿 | 通过（test:ui） |
| 隔离内核 | kernel-regression.test.cjs：目标校验先于事实写入、双结果编排、事实层失败零写入类调用 | 通过（test:ui） |
| 源守门 | note-anchor.test.cjs、note-anchor-picker.test.cjs、diary-report.test.cjs、summary-resident.test.cjs | 通过（主链） |
| **真实宿主** | 思源内核真实写入：真实文档 append/update、文档被改名/移动后的 ial 兜底定位、真实笔记本 conf/sprig 渲染、真实权限拒绝（只读笔记本）路径 | **host-pending**——取得条件：思源真机 + 打卡插件启用 + 一个真实笔记本/文档目标；按 smoke 清单执行并回填本表 |

## 2. 第三方来源（微信读书/思阅/思播/叶归/健康快捷）

| 层 | 证据 | 状态 |
| --- | --- | --- |
| 隔离内核 | weread-adapter（官方契约回包形状/日明细合并/身份/触点）、sireader-adapter、siplayer-adapter、yeguif-adapter（Marker/段落摄取）、health-inbox、external-ref（身份幂等/墓碑）、source-framework | 通过（test:ui/test:extended） |
| 源守门 | SOURCE_MANIFEST/CLOCK_FREE/aux-write-hygiene、integration-events、source-lifecycle-matrix | 通过（主链/test:ecosystem） |
| **真实第三方** | 微信读书真实 Key 首拉/errcode 呈现（T-1402 遗留）、思阅/思播真实片段、叶归真实笔记摄取、健康快捷真实步数——真实数据形状漂移与限流行为 | **host-pending**——取得条件：各来源真实账号/Key + 真实片段产生；逐来源首拉并在设置页核对「等待事件→已同步」状态迁移，不把配置成功当已产生记录 |

## 3. Dock Tomato（番茄适配）

| 层 | 证据 | 状态 |
| --- | --- | --- |
| 隔离内核 | dock-tomato-bridge（会话归属 ownedFocus）、dock-tomato-completion（完成入账/issue 分类）、dock-tomato-integration、docktomato-inbox（收件箱队列/去重）、focus-adapter、focus-lifecycle（重载失效明示） | 通过（test:ui/test:ecosystem） |
| **真实宿主** | 真实番茄插件双窗口联动：A/B 同目标各写一次 externalRef 不重复、API 不可用→pending→恢复重试、A 重试×B 删除并发不复活（smoke 清单「番茄钟双窗口」节）、真实 Dock 面板尺寸/主题 | **host-pending**——取得条件：思源桌面端 + 任一兼容番茄插件真实运行；按 smoke 清单逐项执行回填 |

## 4. 页签 / dock / 移动 WebView 表面

| 层 | 证据 | 状态 |
| --- | --- | --- |
| 自动浏览器 | desktop-dialog（弹窗窗口控制/全屏/尺寸档）、mobile-dialog（生命周期/关闭确认）、visual-qa 双主题 dock 宿主、width-walkthrough 桌面+mobile 双前端（49 表面+32 交互态）、kernel-regression（页签 data.page 固定 today 语义） | 通过（主链/visual 链） |
| 源守门 | openTabPageFor 单一路径（cross-page-consistency）、tab-open 兼容回落 quick | 通过 |
| **真实宿主** | 思源真实页签打开/关闭/重载、真实 dock 拖拽宽度与固定状态、移动 WebView 真实返回手势、渲染块在真实文档中的观察/跳转回调 | **host-pending**——取得条件：思源桌面+移动端各一台；页签/dock/渲染块三表面按 smoke 清单表面矩阵执行 |

## 5. 移动安全区与触控

| 层 | 证据 | 状态 |
| --- | --- | --- |
| 自动浏览器 | mobile-release-quality（safe-area-inset CSS 守门：topbar/editor-header/底栏 padding calc）、width-walkthrough mobile（320/360/375 交互态、模板折叠 43.75px 目标）、accessibility-audit 320px 触控遍（T-1600 八类 ≥44px 守门+致密列表实测报告） | 通过（主链/test:extended） |
| **真机** | 真机刘海/手势条 env() 实际取值、底栏不遮挡实测、真实触控误触率与触觉反馈（hapticFeedback 设置项）、真实键盘弹出/横屏漂移（smoke 清单表面矩阵 1–5 窄屏键盘节） | **host-pending**——取得条件：刘海屏真机（iOS/Android 各一）+ 思源移动端；smoke 清单记录格式回填（版本/OS/尺寸/表面/滚动焦点/截图） |

## 6. 双主题与无障碍

| 层 | 证据 | 状态 |
| --- | --- | --- |
| 自动浏览器 | visual-qa 亮/暗双主题（pageErrors 空）、ui-theme、accessibility-audit 三遍走查（亮/暗/空态：名称/tabindex/键盘可达/对比度 4.5:1/24px 下限全零违规，1204 对文本） | 通过（visual 链/test:extended） |
| 真机读屏 | VoiceOver/TalkBack 逐页导航顺序与播报 | **host-pending**——归 T-1608；自动层只能守静态名称/角色/状态正确性 |

## 7. 发布验收

| 层 | 证据 | 状态 |
| --- | --- | --- |
| 自动 | check:release（release assets/CSS 预算）、export-release-manifest（10 资产）、rollback-rehearsal（4 步 9 资产校验）、test:quality 全链 EXIT=0 | 通过（2026-09-29 f194f31 工作树） |
| **真实发布** | GitHub Release v18.9.0 资产已在位（Release id 397882046，SHA-256 见 release-notes-18.9.0.md——**发布时点哈希**，工作树重建哈希随 sync:digest 漂移属设计行为）；集市安装/升级链路与真实用户升级路径 | 集市触达 **host-pending**（T-1366 外部协作）；GitHub 资产=已核实 |
| 上游协作 | Task Horizon 联调（T-1392/1394/1228~1230）、T-1508 上游会话身份 | **恒 waiting**（对方排期，不阻塞本地里程碑，沿用 D-300~D-306 边界） |

## 8. Host-pending 汇总与触发条件

吸收 acceptance-ledger-phase5 §4，合并为本表（单一清单，T-1608 收口时逐项核销）：

| # | 项 | 取得条件 | 归属 |
| --- | --- | --- | --- |
| H1 | 真实宿主文档写入/改名兜底/权限拒绝 | 思源真机+真实目标 | §1 |
| H2 | 第三方来源真实首拉与限流 | 各来源真实账号/Key | §2 |
| H3 | 番茄双窗口真实联动 | 桌面端+真实番茄插件 | §3 |
| H4 | 页签/dock/渲染块真实表面 | 桌面+移动端真机 | §4 |
| H5 | 真机安全区/误触/触觉/键盘漂移 | 刘海屏真机×2 | §5 |
| H6 | 真机读屏（VoiceOver/TalkBack） | 真机+读屏启用 | §6 |
| H7 | 集市安装升级真实路径 | 集市上架（T-1366） | §7 |
| H8 | Task Horizon 联调 | 对方排期 | §7 |

## 9. 现场验收记录格式（沿用 smoke 清单）

- 客户端版本 / 操作系统 / 屏幕尺寸：
- 表面（手机 / 页签 / dock）：
- 记录前后滚动位置与焦点元素：
- 全量渲染基线与局部刷新体感：
- 发现的问题、复现步骤与截图：

每条现场记录回填到对应覆盖面表格的「真实宿主/真机」行，注明日期与执行人；发现缺陷按常规任务登记 TODO，不在本台账内修复。

## 10. T-1605 宿主壳与安全区审计（2026-09-29）

**层叠矩阵**（components.scss 宿主规则五层序，审计结论=方向一致的后轮收紧，无冲突覆盖证实；大规模去重风险大于收益，保持现状并注记）：

| 层 | 位置（约） | 职责 |
| --- | --- | --- |
| 基础壳 | 271~312 | dialog-host flex 壳、padding 22/24/18、lc-dialog 容器宽度梯（760/900/1150 max-width） |
| 移动壳 | 346~507、424~442 | mobile host 顶/底 padding+safe-area calc、底栏与 tab-host 底栏隐藏 |
| 桌面密度 | ~1345/1554 | 桌面/平板排版与裁剪 |
| 窄容器档 | content/maintenance-responsive（719/600/560/479/359） | 容器查询布局重排+44px 触控（T-1600） |
| 密度终 pass | 1520~2100（1588/1623/1767/1872/1935/2020 等） | 多轮叠加的最终壳校准（后写覆盖先写） |

**安全区 env() 全量枚举**：20 条规则覆盖 top/bottom/left/right 四向（editor 操作栏、mobile topbar、底栏、新建悬浮钮、周视图 scroll-padding、设置页尾 padding 等），`max()/calc()` 双形态防 env()=0 退化。

**行为证实（自动浏览器，f194f31 基线 + T-1605 harness 修复）**：

| 断言 | 手段 | 结果 |
| --- | --- | --- |
| 320~2000 无横向溢出 | width-walkthrough 既有 scrollWidth 断言 | dock×桌面/移动、tab×桌面、dialog×桌面/移动 全 EXIT=0 |
| 菜单不被底栏遮挡 | accessibility-audit mobile 遍新增底栏遮挡检查（elementFromPoint 命中点落在固定底栏本体判据；sticky 吸顶/侧栏=正常滚动语义不计） | 五表面零命中；固化守门 |
| 上下文菜单浮层 | 探针：z-index 60 > 底栏 20、视口钳制（today-bindings:259-264 margin 8）、首项可点击 | 通过 |
| 完整页入口可达 | 探针：open-tab 在 dock/dialog 宿主×1280/320 可见且 elementFromPoint 命中 | 通过；移动端按 supportsCustomTab=!isMobileFrontend 构造隐藏（无页签能力=正确语义） |
| 首卡预算作用域 | dialog 壳 22~26px 有意窗口 chrome（实测首卡 400px/820 完整可见）不适用无 chrome 整页预算 → 预算限定 dock/tab；dialog chrome 断言按前端分流（移动断 mobile-topbar） | harness 修复后 dialog×双前端 EXIT=0 |

tab×mobile = 无效组合（思源移动端无自定义页签，插件不注册 addTab），不作验收路径。

## 11. T-1606 键盘、IME、读屏与触控基线审计（2026-09-29）

**逐项核实结论（探针+源守门，全部在位，产品层零缺陷）**：

| 基线项 | 证据 | 固化 |
| --- | --- | --- |
| 焦点恢复 | 回顾 preserving view / 设置搜索会话 / 设置动作失败回焦 focusSelector（既有源守门）；j/k 通道探针：dispatch 到 .lc-checkin 冒泡至宿主监听（today-bindings:94），焦点落卡片主操作按钮 | audit 桌面遍新增 j/k 行为检查 |
| 焦点可见 | :focus-visible 规则 86 条+:focus 17 条；探针实测 outline 2px solid+boxShadow | css-hygiene 既有 |
| 中文输入法组合态 | 四搜索面 compositionstart 守卫（today/settings/history/compare） | cross-page-consistency 块 2 既有 |
| aria-current | 底栏/rail/topnav 三形态同构 `aria-current="${currentPage===page?"page":"false"}"`；探针四页导航与 is-selected 零失配 | cross-page-consistency T-1606 块 |
| aria-expanded | 14 渲染点+绑定侧同步；探针 8 个 button 点击全翻转（false→true）；summary/details 原生语义不需显式属性 | cross-page-consistency T-1606 块（折叠两渲染点） |
| aria-live/status | role=status/alert 40 处（结果行/搜索状态/危险区提示等，逐面清单见源码 grep） | 既有（i18n-hygiene/audit 名称检查） |
| 44px 触控 | T-1600 audit（24px AA 零违规+八类 44px 守门+致密列表实测报告） | T-1600 既有 |
| reduced-motion | 四模块断言 | cross-page-consistency 块 3 既有 |
| 弹层键盘路径 | 上下文菜单：Escape 收口+归焦触发器（closeMenus(true)）+方向键/Home/End/Tab（探针 closed:true）；quick 弹窗/页面级键盘=bindQuickKeyboardFor/bindPageKeyboardFor | audit 桌面遍新增 Escape 行为检查+T-1606 源守门块 |

**登记缺口（不越界）**：图表日期格/趋势点的键盘与触屏跳转属 T-1591（未实施），其实施时以本表为基线补路径；读屏（VoiceOver/TalkBack）真机走查=host 台账 H6。

**探针方法论教训**：行为探针的 dispatch 目标必须与监听注册元素同层（root 级监听 dispatch 到 document 不冒泡到 root——三轮误报均源于此）；summary/details 的展开状态由浏览器原生播报，探针不应要求显式 aria-expanded。

## 12. T-1607 渲染性能与长数据分层测量（2026-09-29）

**先测后改，测量证实无用户可感热点 → 零优化**。测量工具=一次性探针（真实 bundle、双帧 RAF 口径、3 次取中位数；headless Chrome 1280×900）：

| 场景 | median | 备注 |
| --- | --- | --- |
| Today 200 项目 | 2ms | 分组/折叠/仪表盘全渲染 |
| Today 500 项目 | 3ms | 同上 |
| Review 10k 事件（records） | 3ms | 分页 50/页=既有分层 |
| **Review 100k 事件（records）** | **6~14ms** | 全量快照+当页渲染；内核层基线（review-performance-baseline）100k range<3s/summary<8s 既有通过 |
| Insights 84 日格 | 1~3ms | 懒加载既有 |
| Settings | 2ms | 分类导航按需渲染 |
| Occasions | 2ms | 模板折叠懒展开（TEMPLATE_BATCH_SIZE 语义同类） |
| 多 root（dock+dialog）×10k | 2~3ms | 单次 render() 双 root 同步出 |
| recordEvent 全链 ×10k | <10ms | persist 为桩（真实思源 IPC 不在本测量内） |

**既有分层机制核实（覆盖测量面）**：模板批次 24（TEMPLATE_BATCH_SIZE）、回顾分页 50/页、洞察懒加载、设置分类导航、今日折叠组、renderRafId 合并（scheduleRender 路径）——极端数据量下架构仍然流畅，无需新增分段/懒渲染。

**固化守门**：kernel-regression 新增渲染层性能块（today-200/review-10k/multi-root-10k 真实 boot 双帧口径，上限 250ms——灾难回归防线而非精确断言；冷启动实测 19~67ms）。

**测量方法论**：①计时点必须在 await 等待之前（首轮把 setTimeout(30) 计入样本=30ms 底噪假象）；②render() 走 RAF 合并时需双帧等待再取值（renderRafId 路径同步返回不含真实工作）；③「空 boot 后换 store」与「boot 时给定 store」内部状态不同——性能夹具用后者（前者触发 computeStreaks 状态缺口）；④头less 环境 RAF 立即回调，测得值≈同步 render 耗时。
