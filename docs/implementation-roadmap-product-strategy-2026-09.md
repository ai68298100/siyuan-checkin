# 小驴打卡产品战略落地执行路线

更新时间：2026-09-25（第六轮生态调研后刷新；发布基线 v18.5.0）  
对应研究文档：[产品战略与生态调研路线](roadmap-product-strategy-2026-09.md)

本文把战略方向转换成可执行的工程批次。它回答四个问题：

1. 现有插件已经具备什么，哪些能力可以直接复用。
2. 每个方向还缺哪一小段产品能力。
3. 按什么顺序改哪些文件、写哪些测试、收集什么验收证据。
4. 哪些工作要等真实宿主、外部插件、用户选择或额外隐私评审。

本文是实施计划，不代表所有批次已经开始。批次使用 R-* 作为计划编号；确定开工后再把它们登记成正式 T-*，避免在范围还没有冻结时污染 TODO.md。

本路线把工作分成两条并行证据线：本地线可以在不请求账号、不操作用户工作区、不依赖用户判断的条件下自主实现和验证；宿主线记录思源桌面、页签、dock、Android、系统文件面板和外部插件的现场验收待办。宿主线未完成不会阻塞本地线，也不能被浏览器模拟或隔离内核 E2E 冒充。隔离内核 E2E 使用仓库自建并带标记的临时工作区时属于本地自动证据，可以自主运行，但仍单独标注为“真实内核自动化”，不等于用户设备验收。

文中写“新增”的文件表示拟新增；已有模块和测试只作为复用或扩展目标。已交付的 API v5、报告、模板体系、today 渲染块和外部来源基础不重新立项。

## 一、先冻结的产品原则

后续每个批次都必须同时满足以下原则：

- 事实保存为不可变事件，统计、报告、图表和渲染块都是可重算投影。
- 事件至少保留项目身份、localDate、来源、外部身份和可审计修订路径；同一外部事实不能重复记账。
- 思源文档只在用户明确开启并指定位置后写入；追加、重试、撤销和失败审计沿用现有边界。
- 桌面、页签、dock、Android WebView 共享数据语义；控件密度和入口布局可以按 surface 调整。
- “显示”“执行”“图标”“能力”分开建模。隐藏一个入口不能删除用户已配置的命令，也不能让第三方命令失去执行能力。
- 所有外部来源都必须 opt-in、可诊断、可断开、可撤销；不读取第三方私有数据库，不依赖未版本化 DOM。
- 智能体只能产生解释、问题和待确认草案；任何写入都必须经过差异预览、用户确认、冲突检查和审计。
- 低压力优先：SKIP、容错、补记和恢复状态必须保留；不引入掉分、掉级、惩罚和社交排名。

## 二、当前代码基线与战略方向映射

| 战略方向 | 当前可复用资产 | 需要补的最小能力 | 第一阶段不做什么 |
| --- | --- | --- | --- |
| 真实宿主与移动端 | src/model.ts、src/api.ts、src/render/*、移动测试、docs/integration-smoke-checklist.md | 现场证据、时序夹具、问题归因与回归记录 | 不把浏览器模拟当 Android 验收 |
| 今日行动台 | queryTodayItems、进度/排期计算、bind-today.ts、today-bindings.ts、提醒投影、专注入口、摘要驻留 | 一个纯投影层，把今日事项、待处理、专注、最近漏卡、累计和笔记入口组合起来 | 不在渲染层重新实现排期和完成判断 |
| 快捷入口/命令 | quick-dialog.ts、设置导航、既有快捷注册和各 surface 入口 | 命令描述符、能力矩阵、图标 fallback、触控安全的 dialog/sheet、首帧稳定 | 不通过删除命令解决展示问题 |
| UI 维护 | src/ui/tokens.scss、components.scss、interaction-states.scss、响应式 SCSS、现有 UI 守门 | 状态组件台账、窄屏/双主题/键盘焦点矩阵 | 不一次性重写全部页面 |
| 新手引导 | templates.ts、template-manager.ts、编辑器保存链、现有默认设置 | 首次成功记录路径、精选模板预览、渐进式高级设置 | 不增加云端模板市场 |
| 习惯内核二期 | model.ts 的排期、配额、SKIP、容错、连续计数；habit-score.ts | 逾期率、应做节奏、恢复状态、最近稳定区间纯投影 | 第一版不改事件存储结构 |
| 情境化记录 | 事件备注/来源和审计链、记录对话框、record-notes.ts | 可选的低摩擦上下文入口和只读分组统计 | 不把每次打卡变成问卷 |
| 回顾 2.0 | analytics.ts、charts.ts、insights.ts、report.ts、review-presentation.ts、智能体建议 | 事实→推断→建议三层输出、证据跳转、调整效果比较 | 不让建议直接改数据 |
| 笔记原生渲染块 | features/checkin-block.ts、render/block-renderer.ts、今日块和 API v5 | 有界数据集、白名单聚合、日期跳转、可组合卡片 | 不执行任意 JS/HTML，不复制第二份事实数据 |
| 日记与周期报告 | summary-resident.ts、report.ts、diary-search.ts、锚点和追加审计 | 周/月报告模板、预览、追加、撤销说明 | 不启用常驻后台偷偷写入 |
| 模板与组合 | templates.ts、template-manager.ts、编辑器 | 场景组合预览、项目/排期/默认值的可选化 | 不让模板改变数据模型 |
| 外部来源平台 | source-framework.ts、思阅/思播/健康适配器、recordExternalEvent | 来源注册、能力发现、断开/重试/失败诊断、更多公开来源 | 不接私有数据库和未版本化 DOM |
| 导入导出迁移 | loop-csv.ts、obsidian-habits.ts、export.ts、诊断包和快照 | 导入预览、语义差异、身份冲突报告、可重复导入 | 不静默丢失 SKIP、备注或排期 |
| 公开 API 与生态 | api.ts、features/api-v5.ts、contract manifest、Task Horizon 规划 | 稳定能力协商、错误码、受限写入、至少两个真实消费方 | 不让消费者读取私有存储 |
| 受控智能体 | agent-capabilities.ts、agent-suggestions.ts、suggestion-workflow.ts、预览渲染 | 解释和规划卡片、差异预览、引用证据、失效缓存处理 | 不开放万能写入口 |
| 性能/无障碍/恢复 | test:extended、test:perf、发布回滚脚本、诊断与合并逻辑 | 10k/100k 事件基线、焦点恢复、升级/降级演练 | 不以“测试通过”替代现场证据 |

这张表确定了一个约束：新方向优先做“投影层、编排层和验收层”，只有现有模型无法表达时才申请数据结构或公开 API 变化。

## 三、总执行顺序

### 阶段 0：整理基线，再开始写代码

目标是把当前“已经完成、可以本地做、需要真实宿主、需要用户决定”分开，防止未来路线和 TODO.md 冲突。

#### R-00.1 版本和路线文档对齐

执行步骤：

1. 把 docs/development-roadmap-current.md、README.md、docs/architecture.md 和 docs/codebase-walkthrough.md 的当前版本、API 主版本、模块规模和开放项核对到 v18.2.1/API v5；历史发布说明保留历史事实。
2. 把本执行文档和 docs/roadmap-product-strategy-2026-09.md 链接加入路线索引。
3. 对每个已有 T-* 标记 local-auto / host-pending / external / decision 四种状态；同一事实只保留一个原任务归属。
4. 只把本地可执行项登记成正式新任务；外部依赖保留原任务，不复制一份。

验证：

- rg -n "18\.0\.3|18\.2\.1|API v4|API v5|T-1344|T-1388|T-1413" README.md docs/development-roadmap-current.md docs/architecture.md docs/codebase-walkthrough.md TODO.md
- git diff --check
- 文档链接和任务状态人工复核。

完成条件：路线文档不再把 v18.0.3 当成当前版本；每个新批次都有唯一任务归属和依赖说明。已交付能力只作为复用基线，不重复登记。

#### R-00.2 建立证据矩阵

新建或补充一张发布前矩阵，列出四类证据：

| 证据 | 可以自动化的内容 | 必须现场完成的内容 |
| --- | --- | --- |
| 纯逻辑 | 排期、统计、身份、迁移、边界和确定性 | 无 |
| 结构 UI | DOM、CSS、ARIA、键盘、窄宽度、双主题 | 无 |
| 浏览器/模拟 | 渲染时序、响应式、降级 | 不能替代 Android |
| 真实宿主 | 思源桌面、页签、dock、Android、外部插件 | 必须按 integration-smoke-checklist.md 留证 |

每个后续批次都要在提交说明里引用这张矩阵，不能只写“测试通过”。

### 阶段 1：P0 可靠性和入口收口

顺序改为：路线/边界基线 → 本地可复现 UI 与投影 → 隔离内核自动化 → 宿主现场验收待办。入口语义没有稳定前，过早扩展统计会放大维护成本；宿主现场不再作为本地开发的前置条件。

#### R-10.1 宿主验收待办与本地准备

对应现有任务：T-1344、T-023、T-033、T-129、T-1256、T-1388、T-1406、T-1408。

本批次当前只做本地准备，不执行需要用户操作的现场验收：

1. 为今日、编辑、回顾、设置、渲染块、页签、dock、Android、锚点、日记/摘要和外部来源整理可复跑场景、预期结果和失败归因字段。
2. 用当前 v18.2.1 包运行隔离内核 E2E（`pnpm run test:e2e`、`pnpm run test:e2e:readonly`）时，只使用仓库自建并带 `checkin-e2e.json` 标记的临时工作区；结果写为真实内核自动化证据。
3. 将思源桌面、Android、系统键盘/安全区、页签/dock、双插件时序和用户旧工作区列为 host-pending；没有现场证据不关闭 T-1344 等任务。
4. 每个失败先归类为宿主 API、WebView 时序、插件逻辑、CSS 或测试夹具，再决定是否改代码。
5. 将能稳定重现且不依赖宿主状态的失败转成自动守门；只偶发或依赖环境的情况保留现场证据和复现前提。

本地证据命令：`pnpm run check`、`pnpm run build`、`pnpm run test:e2e`、`pnpm run test:e2e:readonly`、`pnpm run test:mobile`、`pnpm run test:ecosystem`、`pnpm run check:release`。真实桌面/Android/双插件验收仍按 `docs/integration-smoke-checklist.md` 由用户现场完成。

完成条件：自动证据与 host-pending 证据分栏记录；每个外部依赖项都有通过证据、失败原因或下一步所需用户操作，不能以模拟浏览器结果关闭任务。

#### R-10.2 UI 维护台账

执行步骤：

1. 以 src/ui/tokens.scss、components.scss、interaction-states.scss 为入口，建立保存中、成功、失败、重试、空态、加载、禁用和依赖缺失的统一状态清单。
2. 为今日、回顾、设置、编辑器、quick dialog 建立窄宽度、长文本、中英文、双主题和焦点恢复样例。
3. 只修能复现的问题；每次修复同时补一个结构守门或纯 CSS 断言。
4. 将 host-theme 伪元素、滚动穿透、首帧空白、IME 竞态列入维护台账，不在一次提交中大范围改色或改布局。

验证：

- pnpm run test:ui
- pnpm run test:mobile
- node tests/width-walkthrough.cjs
- 有环境时运行 node tests/visual-qa.cjs 并明确记录主题和浏览器范围。

完成条件：每个 UI 缺陷都有最小复现、修复位置、回归断言和未覆盖的真实宿主范围。

#### R-10.3 今日行动台

新增建议模块：src/features/today-dashboard.ts，先做纯函数，再接渲染。

执行步骤：

1. 定义只读输入：当前 localDate、queryTodayItems 结果、进度、提醒投影、专注状态、最近漏卡、今日累计、摘要/笔记入口状态。
2. 定义只读输出：sections、每项 status、primaryAction、secondaryActions、reasonCode、sourceRefs 和 truncated。
3. 所有完成、排期、SKIP、quota、at-most 判断委托 src/model.ts；投影层只负责编排和排序。
4. 在 src/render/bind-today.ts 和 today-bindings.ts 接入第一版行动台，保留原有记录、撤销和失败回滚路径。
5. 在桌面使用可收缩双列，在移动端使用单列；同一输出数据不因 surface 重新计算。
6. 把“高级统计”和“回顾入口”放到次级区域，首屏只保留当前行动和记录反馈。

测试计划（`tests/today-dashboard.test.cjs` 为拟新增；其余为已有测试的扩展）：

- tests/today-dashboard.test.cjs：空态、已完成、待处理、SKIP、quota、at-most、提醒、专注、缺失依赖、排序确定性。
- tests/today-context-menu.test.cjs：记录、撤销、重复点击、失败回滚。
- tests/mobile-release-quality.test.cjs：320px、键盘、滚动和触控目标（自动结构证据；Android 现场另列）。

完成条件：同一日期和 store 输入得到确定性输出；旧今日页行为仍可回退；本地结构与隔离内核自动化通过。真实思源和 Android 的记录入口、焦点、滚动与触控证据保持 host-pending。

#### R-10.4 快捷入口与命令系统

这批对应历史截图 backlog。截图最终取舍和视觉 UI 改动仍等待截图汇总及明确的“开始/继续”信号；命令描述符、能力矩阵、图标 fallback、显示/执行分离等纯逻辑和结构检查不受该旧截图门控影响，可以单独推进。

建议涉及文件：

- src/render/quick-dialog.ts
- src/render/settings-navigation.ts
- src/render/settings.ts
- src/ui/components.scss
- 新增纯模块 src/features/quick-entry-capabilities.ts

执行步骤：

1. 把每个入口建模为 commandId、标题、描述、图标描述符、执行器、支持 surface、移动安全等级、依赖能力和可见性状态。
2. 将图标解析、未知第三方图标 fallback、能力判定、展示过滤和执行分开写成纯函数。
3. 桌面使用 dialog，移动端使用触控安全的 sheet/全屏面板；首帧等待 viewport 和首批列表稳定后再计算尺寸。
4. 保留用户已配置命令和恢复路径。关闭某个 surface 的展示只改变显示，不从共享注册表删除执行器。
5. 为第三方未知能力显示“未验证/需宿主”，但仍保留可执行入口；不把未知值默认为移动安全。
6. 处理设置根页横向滚动、开关伪元素和 IME 竞态，避免通过加大容器或隐藏溢出绕过问题。

新增/扩展测试：

- tests/quick-entry-capabilities.test.cjs：显示/执行/图标/能力四者独立、未知插件、fallback、surface 过滤、恢复配置。
- tests/desktop-dialog.test.cjs：焦点、Esc、点击外部、滚动锁定。
- tests/mobile-dialog.test.cjs：DOM 结构、键盘/安全区/旋转的自动检查；真实触控目标仍需 Android 现场。
- tests/mobile-release-quality.test.cjs：首帧和长列表。

完成条件：命令注册、显示/执行分离、未知能力 fallback 和 mock dialog 通过；截图视觉改动与 Android 触控/返回验收保持待办。

#### R-10.5 新手首次成功路径与渐进式复杂度

执行步骤：

1. 复用已经交付的 `templates.ts`、`template-manager.ts`、`template-gallery.test.cjs` 和现有精选模板；只有缺少首次路径状态时才新增纯状态机，不重复扩充模板目录。
2. 设计“第一次成功记录”流程：选择模板或空白项目 → 今日记录 → 明确反馈 → 回顾入口。
3. 高级排期、quota、at-most、来源映射和渲染块保持折叠，只有用户主动展开才加载。
4. 增加跳过引导、恢复引导和重置示例数据路径；所有状态写入现有偏好存储并可诊断。

验证：

- 模板纯逻辑与迁移测试（已有 `tests/templates.test.cjs`、`tests/template-manager.test.cjs`、`tests/template-gallery.test.cjs`；缺口再新增针对性测试）。
- tests/template-gallery.test.cjs。
- tests/editor-save-form.test.cjs、tests/mobile-editor.test.cjs。

完成条件：本地状态机、模板预览、旧偏好兼容和回退通过；真实首次记录路径属于用户验收待办，不能由自动化代替。

### 阶段 2：P1 习惯数据和回顾差异化

#### R-20.1 习惯内核二期：节奏、逾期率、恢复

建议新增纯模块：src/features/pace-projection.ts。第一版不修改 STORE_VERSION，不新增持久化字段。

执行步骤：

1. 先冻结指标定义：普通 at-least 项目分别输出 `backlogRate`（截至当前日期仍未完成的有效排期机会 / 已到期有效排期机会）与 `periodOverdueRate`（指定周期内已过期且未完成的普通排期日 / 指定周期内有效排期日）；二者都排除未来日和 SKIP。quota 单独输出周期贡献、周期进度和周期滞后；at-most 单独输出无破戒日、破戒日和恢复状态，不能把 quota/at-most 塞进普通逾期率。
2. 将所有日期、时区和修订生效规则委托 model.ts 的现有函数。
3. 为每个结果返回 reasonCode 和原始日期范围，允许回顾页和 API 展开证据。
4. 在 habit-score.ts、洞察、今日徽章、渲染块和 getStreaks 之间只保留一个计算入口。
5. 先以只读卡片发布；收集使用反馈后再评估是否保存用户自定义目标。统计“欠账率”不得改名后冒充“周期逾期率”，每个指标都携带口径说明和日期范围。

测试：

- tests/pace-projection.test.cjs（拟新增）：严格/宽容、SKIP、补记、跨时区、空窗口和确定性；另以独立断言覆盖普通 `backlogRate`、`periodOverdueRate`、quota 进度/滞后和 at-most 破戒统计。
- 扩展 tests/habit-score.test.cjs、tests/streak-tolerance.test.cjs、tests/calendar-projection.test.cjs。
- 运行 pnpm run test:ui、pnpm run test:extended。

完成条件：同一组事件在今日、回顾、渲染块和 API 中得到同口径结果；普通排期、quota、at-most 各自保持独立；用户能看到“为什么是这个状态”。

#### R-20.2 情境化记录

执行步骤：

1. 先盘点现有事件备注、记录对话框和审计字段，能复用就不新增字段。
2. 第一版只提供一个可跳过的短备注和有限枚举原因，例如阻力、时间不足、环境变化；枚举要能扩展但不写入私有格式。
3. 把上下文作为可选投影输入，默认不显示、不影响完成判定和连击。
4. 在回顾页按原因和场景聚合时显示样本数、日期范围和“样本不足”提示。
5. 如果最终确实需要新事件字段，先增加迁移设计、导入导出规则、审计规则和版本回退说明，再实现。

测试：

- 记录对话框保存/取消/失败回滚。
- 上下文缺失、非法枚举和旧事件兼容。
- 日记/报告不泄漏未选择范围以外的备注。

完成条件：记录仍能在两次点击内完成；上下文不会改变完成状态；报告可以追溯到原始事件。

#### R-20.3 回顾 2.0

执行步骤：

1. 在 analytics.ts 和 insights.ts 中建立“事实、推断、建议”三层数据形状。
2. 每个建议必须包含指标、日期范围、项目/事件引用、置信度或样本量和建议原因。
3. 在 review-presentation.ts、review.ts 中先做“失速项目”“容易漏卡的时间段”“最近调整是否有效”三类卡片。
4. 卡片点击跳转到对应日期/项目/原始事件；无法定位时显示降级解释。
5. 复用 agent-suggestions.ts，智能体只生成问题和草案，不直接改排期。

测试：

- tests/review-actionability.test.cjs（拟新增）：证据引用、样本不足、事实与推断分离、旧报告兼容。
- tests/review-layout-regression.test.cjs、tests/review-comparison.test.cjs。
- pnpm run test:ui、pnpm run test:mobile。

完成条件：每张主卡片都能回答“依据是什么”和“下一步在哪里操作”，而不是只展示一张图。

### 阶段 3：笔记原生工作流和迁移

#### R-30.1 渲染块二期（已有能力增量）

执行步骤：

1. 以 features/checkin-block.ts 现有 month、heatmap、summary、groups、today 配置为兼容基线。
2. 设计受限数据集：项目、分组、日期范围、来源和聚合函数均有上限；解析失败继续 fail-closed。
3. 只允许受限、可枚举的纯函数，例如 sum、rate、streak、maxGap、lastMissedDate；拒绝任意表达式求值。
4. 增加日期跳转、项目筛选和卡片组合；写回仍通过 recordEvent 和既有审计路径。
5. 为旧块保留旧 HTML/属性兼容，新增视图使用版本化配置而不是隐式猜测。

测试：

- 扩展 tests/checkin-block.test.cjs：解析、边界、权限、确定性、点击写回、节流和 fail-closed。
- 已有 `tests/checkin-block.test.cjs`、`tests/block-dom-compat.test.cjs`、`tests/api-v5-docs.test.cjs`、`tests/cross-surface-matrix.test.cjs`；只有新增组合交互缺口时再新增针对性测试，不重复创建 `render-block.test.cjs`。
- 真实思源内核渲染→点击→落盘→再次读取 E2E。

完成条件：块的纯解析/渲染/安全边界和隔离内核 E2E 通过；真实用户文档中的点击、定位和写回仍由宿主现场验收。

#### R-30.2 日记与周期报告

执行步骤：

1. 复用已经交付的 `report.ts`、`summary-resident.ts`、`diary-search.ts`、锚点和审计通道；只补缺失的范围说明、预览和恢复路径，不重写已有周报/摘要功能。
2. 在现有报告生成器上提供周/月报告预览，默认只读；用户点击“追加”后才写入指定文档。
3. 报告正文包含统计范围、生成时间、数据源、失败项和回到原始事件的链接。
4. 绑定文档使用现有锚点/文档选择器；文档不可达时保留报告预览并给出重新选择入口。
5. 不创建定时器；重复报告通过范围和报告身份判定，不用模糊文本匹配。

测试：

- tests/diary-report.test.cjs、tests/summary-resident.test.cjs。
- 日记搜索非零响应、异常、过期响应和创建失败回归。
- 隔离内核自动化可验证选择、预览、追加和失败回滚；桌面/Android 的真实文档读取与写入保持 host-pending。

完成条件：任何文档写入都能在界面上看到目标、预览、结果和失败重试路径。

#### R-30.3 模板与 habit stacks

执行步骤：

1. 复用现有 60+ 模板和模板管理器；只有用户场景证据支持时，才用纯内容资产增加晨间、学习、运动、睡前、创作等组合。
2. 每个组合预览项目数、排期、默认值、可选项目和预计首次记录路径。
3. 应用组合时逐项走现有编辑器保存/归一化链，不直接拼接 store。
4. 支持只应用部分项目、撤销未开始的草稿和重复应用去重提示。

测试：

- 已有 `tests/template-gallery.test.cjs`、`tests/template-manager.test.cjs`、`tests/templates.test.cjs`、`tests/editor-validation.test.cjs`；组合/部分应用/重复应用缺口再新增命名明确的测试，不能引用不存在的 `migration.test.cjs` 或 `editor-save-form.test.cjs`。

完成条件：模板只是创建项目的便捷入口，不产生隐藏事件，不改变已有项目。

#### R-30.4 导入、导出和迁移

执行步骤：

1. 统一 loop-csv.ts、obsidian-habits.ts、export.ts 的中间导入模型，先生成预览再写入。
2. 预览逐项列出可迁移字段、无法等价表达的字段和用户需选择的默认策略。
3. 用 source + externalRef 或文件行身份做导入幂等；冲突显示为报告，不静默覆盖。
4. 导出支持范围、项目、来源和诊断包，包含版本、时区、生成时间和校验摘要。
5. 导入写入沿用事务、快照、撤销和失败恢复。

测试：

- 已有 `tests/loop-csv.test.cjs`、`tests/obsidian-habits.test.cjs`；导入预览中间模型和差异报告属于拟新增模块/测试。
- 重复导入、部分失败、非法日期、SKIP、maxGap、备注、颜色和排期差异矩阵。
- 10k 事件导入性能和恢复演练。

完成条件：预览、身份、冲突和回滚纯逻辑通过；真实旧文件与 Android 文件系统验证保持用户待办；同一文件重复导入不会重复记账。

### 阶段 4：来源平台与生态协作

#### R-40.1 外部来源适配器平台化（已有框架增量）

执行步骤：

1. 复用已经交付的 `source-framework.ts`、`sireader-adapter.ts`、`siplayer-adapter.ts`、`health-inbox.ts` 和 `recordExternalEvent`；不重复建立第二套来源模型。
2. 新来源继续拆成“生命周期接入、片段结算、身份生成、写入/撤销、诊断”五个边界；接入层可以有 IO，结算层和身份层必须可离线回放。
3. 补齐 T-1386 剩余的多来源统一设置、断开/重试/最近错误 UX；来源默认关闭，已写入事件的保留规则要可见。
4. 外部事件进入 `recordExternalEvent`，用已登记前缀和 `source + externalRef` 去重。
5. 适配器必须在断网、重载、重复通知、跨日和宿主缺失时安全退出。
6. 思阅、思播、健康和微信读书按公开接口证据分批推进；微信读书在 API key、条款、限流和用户需求未确认前保持条件批次。

测试：

- tests/source-framework.test.cjs。
- 各适配器生命周期、跨日、幂等、撤销、断开、重试和防伪测试。
- 已有 `tests/source-framework.test.cjs`、`tests/sireader-adapter.test.cjs`、`tests/siplayer-adapter.test.cjs`、`tests/health-inbox.test.cjs`、`tests/external-ref.test.cjs`；本地 mock 和隔离内核 E2E 可自主运行，真实宿主/双插件时序保持 host-pending。

完成条件：新增来源只需“描述符 + 适配器 + 映射 + 测试 + 文档”，不会在多个页面散落重复口径。

#### R-40.2 API v5 与 Task Horizon 消费端（API v5 已交付）

执行步骤：

1. 复用已经交付的 `api.ts`、`api-contract.ts`、`features/api-v5.ts`、`docs/api-v5.md` 和 contract kit；本插件侧不重新实现 API v5。
2. 在 Task Horizon 侧实现能力发现、缓存、Abort、单飞、四类刷新事件和插件缺失降级；不读取私有数据。
3. 验证隐藏项目即时消失/恢复，旧消费者不会因为缺少新能力而误显示隐藏项目。
4. 将消费端失败写入可读诊断，区分超时、能力缺失、数据截断和宿主异常。
5. 至少完成 Task Horizon 和另一个真实消费者的双向现场验证，再扩展更复杂写回。

测试：

- 已有 `tests/api-contract.test.cjs`、`tests/api-v5-docs.test.cjs`、`tests/api-v5.test.cjs`、`tests/task-horizon-contract.test.cjs`、`tests/task-horizon-bridge.test.cjs` 和 `tests/contract-kit.test.cjs`；消费端 mock 超时/Abort/单飞/旧消费者降级属于拟新增测试。
- 真实宿主联调（刷新、断开、重载、权限失败、隐藏开关）和对方仓库改动保持 external/host-pending。

完成条件：消费者只依赖公开契约；小驴升级后旧消费者仍可安全降级。

### 阶段 5：受控智能体、性能和恢复

#### R-50.1 受控智能体

执行步骤：

1. 在 agent-capabilities.ts 中只注册读取、解释、建议和用户确认后的有限动作。
2. 在 agent-suggestions.ts 和 suggestion-workflow.ts 增加证据引用、差异预览、冲突指纹、过期缓存和撤销入口。
3. 让智能体生成复盘问题、节奏调整草案、模板选择草案；草案必须可复制、可编辑、可拒绝。
4. 不配置提供者、提供者失败或结果过期时，今日记录和回顾核心功能继续可用。
5. 继续禁止直接改事件、批量删除、自动惩罚和未确认的文档写入。

测试：

- 已有 `tests/agent-suggestions.test.cjs`、`tests/suggestion-workflow.test.cjs`、`tests/suggestion-workflow-binding.test.cjs`、`tests/suggestion-workflow-render.test.cjs`、`tests/project-draft.test.cjs`、`tests/agent-audit-export.test.cjs`；只为新增证据引用或失效缓存缺口补测试。
- 现有 agent、suggestion-workflow 和 review-comparison 测试。
- 隔离内核可验证能力注册、建议确认和审计；真实宿主打开智能体入口、复制和返回行为保持 host-pending。

完成条件：智能体提升理解和规划效率，但关闭智能体不会改变事实记录链。

#### R-50.2 性能、无障碍和恢复

执行步骤：

1. 建立 10k/100k 事件、200 项目、366 日期、多个来源和多窗口基线。
2. 优先测索引、日期投影、回顾聚合、渲染块和导入，不用盲目缓存掩盖算法问题。
3. 检查所有弹层的焦点进入/恢复、键盘网格、ARIA 名称、错误可读性和 reduced motion。
4. 每次版本演练升级、降级、损坏条目隔离、导出恢复、冲突合并和撤销。
5. 将预算和结果接入 test:perf、test:extended、check:release。

验证：

- pnpm run test:extended
- pnpm run test:perf
- pnpm run check:release

完成条件：性能预算、无障碍门禁、恢复演练和生产包检查均有可重跑证据。

## 四、每个批次的标准开发循环

今后一个批次都按以下顺序执行，避免“先改页面、最后才发现模型不够”：

1. 确认范围：写场景、非目标、数据来源、失败和回退。
2. 查现有单一口径：先搜索 src/model.ts、src/api.ts、对应 feature 和现有测试，确认是否已有实现。
3. 先写纯函数和契约：输入/输出/边界/确定性先固定；不在渲染回调里新增业务判断。
4. 接入现有副作用路径：记录走 recordEvent/recordExternalEvent，写文档走现有追加/审计/重试，设置走既有归一化和回滚。
5. 补 targeted tests：先跑纯逻辑和结构测试，再跑移动/生态测试。
6. 跑完整质量链：相关代码稳定后运行 pnpm run test:quality，不要用局部通过替代发布门禁。
7. 更新宿主验收队列：本轮跳过需要用户操作的桌面、Android 和外部插件现场项；以后具备窗口时单独记录，不阻塞下一本地批次、不以自动结果关闭现场任务。
8. 更新文档和任务：写完成条件、未覆盖范围、回滚方式、版本影响和下一批依赖。

标准回滚方式：

- 纯投影问题：撤回投影模块接线，保留原有模型和事件。
- UI 问题：关闭新 surface 或 feature flag，恢复原入口。
- 数据写入问题：停止新写入、导出快照、按审计/墓碑回滚，不能直接删除历史事件。
- API 问题：能力协商失败时降级到旧只读能力，禁止猜测新字段。
- 外部来源问题：断开适配器并保留已落盘事件；后续重放必须依靠外部身份去重。

## 五、建议的实际开工顺序

本顺序把本地开发和现场验收拆开，任何 host-pending 项都不阻塞可复现的纯逻辑、结构、契约和隔离内核自动化工作：

1. R-00.1/R-00.2：路线版本、模块真值和证据矩阵。
2. R-A1：架构边界白名单与文档同源检查。
3. R-A7：时间/日历语义契约，先统一日期工具和测试。
4. R-10.2：只修本地可复现的 UI 维护问题；真机长尾保留 host-pending。
5. R-10.3 + R-A2：今日行动台、提醒投影和结构接线。
6. R-10.4：命令能力矩阵与 mock 可先做；旧截图 backlog 的视觉改动仍受“截图齐全 + 明确开始”门控。
7. R-10.5：首次成功路径状态机，复用现有模板体系。
8. R-A8：可保存视图与筛选作用域。
9. R-20.1/R-20.2/R-20.3 + R-A3：节奏、恢复、情境投影和可行动回顾。
10. R-30.1/R-30.2/R-30.3/R-30.4 + R-A4：渲染块、报告、模板组合和迁移预览。
11. R-40.1/R-40.2 + R-A5：来源平台、API mock consumer 和契约降级；真实消费者另列外部依赖。
12. R-A9/R-A10：数据治理和隐私控制面。
13. R-50.1/R-50.2 + R-A6：受控智能体、性能、无障碍和恢复常态化。
14. 在本地批次稳定后，按 integration-smoke-checklist.md 集中处理 host-pending 现场验收。

硬依赖只约束数据语义和安全边界：日期契约稳定后再扩展跨模块统计；今日投影稳定后再扩展回顾/渲染块编排；来源身份和 API 契约稳定后再启用自动联动；恢复和撤销路径稳定后再扩大智能体动作。真实宿主问题不会阻止纯逻辑和结构工作，但对应现场功能不得标记为完成。

## 六、暂不进入排期的方向

以下项目保留研究结论，但当前不进入执行批次：

- T-1413 轻量积分/愿望兑换：只有用户明确提出后再做；即使启动也必须默认关闭、单轨积分、无负分和无等级回退。
- T-1402 微信读书：等待 API key、公开条款、限流和明确用户需求。
- 自建云同步：除非思源同步被真实证明不足，并先完成密钥、隐私、冲突、迁移和恢复评审。
- RPG 化、掉血掉级、社交排名、系统后台常驻、读取第三方私有存储、任意 JS/HTML 渲染、万能 AI 写入口。

## 七、最终完成定义

路线达到可发布状态，需要同时满足：

- 今日记录、回顾、渲染块、报告、API 和外部来源使用同一事件与日期口径。
- 桌面、页签、dock、Android 和双主题都有对应证据；模拟浏览器证据单独标注。
- 新能力有纯逻辑测试、结构/UI 测试、失败与恢复测试；发布前完整质量链通过。
- 文档写入、外部导入和智能体动作都有预览、确认、审计、撤销或可恢复失败路径。
- 旧数据、旧 API 消费者和旧模板可以继续工作；迁移差异在写入前可见。
- 每个批次的未覆盖项、外部依赖、回滚方式和下一步都已写回 TODO.md、PROGRESS.md、BLOCKERS.md 或 DECISIONS.md 对应位置。



## 八、审计后的批次状态与证据类型

| 批次 | 当前可做状态 | 可自动产生的证据 | 必须保留开放的证据 |
| --- | --- | --- | --- |
| R-00.1/R-00.2 | 本轮审计完成，后续持续维护 | 文档版本、任务分类、链接、证据矩阵、git diff | 无 |
| R-10.1 宿主验收 | host-pending；隔离内核 E2E 可 local-auto | 清单、自动化夹具、隔离内核 E2E、失败归因 | 思源桌面、页签、dock、Android、外部插件 |
| R-10.2 UI 维护 | local-auto + host-pending | CSS/DOM/ARIA、键盘、窄宽度、双主题、浏览器结构检查 | 真机截图、真实 WebView、系统键盘 |
| R-10.3 今日行动台 | projection 可自动推进 | 纯投影、状态原因、排序、mock 记录、回滚测试 | 真实思源记录、焦点、滚动、Android 触控 |
| R-10.4 快捷入口 | capability 可自动规划 | 命令矩阵、图标 fallback、mock dialog、结构测试 | 截图最终取舍和实际 UI 开工信号 |
| R-10.5 新手引导 | 纯逻辑可自动推进 | 现有模板预览、状态机、渐进字段、旧偏好兼容 | 首次真实使用反馈 |
| R-20.1/R-20.2/R-20.3 | 可自动推进 | pace、context normalization、证据链和回顾纯函数 | 新字段取舍和真实使用反馈 |
| R-30.1/R-30.4 | 可自动推进；隔离内核 E2E 可自动验证部分流程 | 渲染块解析、白名单、导入预览、幂等和冲突测试 | 真实用户文档点击、Android 文件系统和用户旧数据 |
| R-30.2/R-30.3 | 可自动推进 | 报告 Markdown、模板组合、审计和回滚测试 | 真实日记读写和移动端应用 |
| R-40.1 | 可自动推进 | descriptor、settlement、identity、治理和 contract fixture | 思阅/思播/健康/微信读书真实 API 和双插件时序 |
| R-40.2 | consumer mock 可自动推进 | API descriptor、文档、错误码、mock consumer、降级测试 | Task Horizon 真实刷新、旧消费者和双方联调 |
| R-50.1 | 纯建议链可自动推进；e2e 环境已接入思源智能体（2026-09-24），真实模型链路可产出真实内核自动化证据 | 草案、差异、缓存、冲突、审计和撤销测试；智能体建议真实调用（隔离内核自动化，agent-capabilities spec 扩展） | 真实设备上的智能体入口、复制/返回行为与用户工作区验收 |
| R-50.2 | 自动基线可推进 | 10k/100k、性能、ARIA、恢复脚本和发布检查 | 低端 Android、真实工作区升级/降级 |
| R-A7 | 可立即本地推进 | 日期工具、DST/闰日/跨午夜/半开区间回放 | 无；现场仅在宿主验收阶段复核显示 |
| R-A8 | 可立即本地推进 | ViewScope 归一、筛选作用域、迁移和导出范围测试 | 真实 surface 交互与用户历史偏好 |
| R-A9 | 设计与纯投影可本地推进 | 生命周期状态图、影响预览、墓碑/冲突/恢复审计测试 | 用户真实数据恢复演练 |
| R-A10 | 设计与控制面结构可本地推进 | 来源/文档写入/导出范围清单、隐私字段审计、断开语义测试 | 用户隐私取舍与真实工作区删除确认 |

“自动证据已通过”只代表本地代码和模拟环境满足条件，不代表现场证据已经完成；所有 host-pending 项保持原任务开放。

## 九、当前自动执行泳道

R-A0～R-A15 是执行泳道标签，用来映射前面已有 R-00/R-10/R-20/R-30/R-40/R-50 批次和横切基础设施，不是重复立项。每条泳道都先做本地可验证部分，宿主或外部协作证据单独保留开放。A0→A1→A7→A2→A11→A12→A8→A3→A4→A5→A9/A10→A6 的原始推进顺序已于 2026-09-24 全部收口（见 PROGRESS T-1431）；2026-09-25 第六轮生态调研后新增 R-A13/R-A14/R-A15 三条泳道（第十三节），作为当前开工队列，与真机反馈修复、上游契约评审并行。

### R-A11：UI 维护台账（映射 R-10.2）

1. 以 src/ui/tokens.scss、components.scss、interaction-states.scss 为入口，维护保存中、成功、失败、重试、空态、加载、禁用和依赖缺失的统一状态清单。
2. 为今日、回顾、设置、编辑器、quick dialog 累积窄宽度、长文本、中英文、双主题和焦点恢复样例与守门断言。
3. 只修本地可复现的问题；每次修复同时补一个结构守门或纯 CSS 断言；真机长尾保留 host-pending。

### R-A12：快捷入口与新手路径（映射 R-10.4/R-10.5 的本地可验证部分）

1. 命令描述符、能力矩阵、图标 fallback、显示/执行分离的纯逻辑与结构测试先行；截图视觉改动仍受「截图齐全 + 明确开始」门控。
2. 新手「第一次成功记录」状态机复用现有模板体系做纯逻辑与偏好兼容测试。
3. 真实触控、返回手势和首次真实使用反馈保持 host-pending。

### R-A0：路线真值和状态矩阵（映射 R-00.1/R-00.2）

1. 保持 roadmap-current、产品战略、实施路线、TODO、PROGRESS 和版本文件互相可追溯。
2. 将历史 T-023、T-033、T-129、T-1173、T-1256 统一标为 umbrella 下的历史别名，不重复排新任务。
3. 按 TODO 顶部逐项索引分类：T-1386 的本地治理归 local-auto、真实交互归 host-pending；T-1392 归 external；T-1394 归 external/host-pending；T-1402 归 decision；T-1406/T-1408 归 host-pending；T-1413 归 decision。保留原任务 ID，不新建重复待办。
4. 把 v18-v22 文档标成已交付基线，下一阶段只从本路线的 R-A 队列取任务。

### R-A1：架构边界守门（横切门禁，服务 R-10～R-50）

新增自动结构检查，建议文件为 `tests/architecture-boundaries.test.cjs`（拟新增）：

1. 只对白名单的纯模块或纯函数检查不得反向导入 render/ui、window/document/fetch/宿主写 API/定时器；不能把 `features/*` 整体假定为纯函数。`note-anchor.ts`、`diary-search.ts` 等含宿主 IO 的模块要明确列为副作用边界。
2. render 可以调用 model/features，但业务判断应尽量在 projection 中完成；DOM 回调只负责调用显式宿主接口并处理结果。
3. 外部来源写入只能经过 `recordExternalEvent`；文档写入只能经过既有追加/审计通道。
4. 检查新增来源是否登记 descriptor、前缀、治理和测试；只扫描可识别的来源模块，不用模糊规则阻止合法扩展。

这批完全可以使用源码扫描和现有测试运行，不触发思源宿主。

### R-A2：提醒、注意力和今日行动台（映射 R-10.3，提醒部分为增量）

1. 先扩展已有 `reminders.ts`、`priority-reminder.ts` 和 `reminder-projection.ts`：安静时段、重复通知防抖、来源解释、可关闭状态和依赖缺失降级。
2. 再实现 today-dashboard 纯投影，把提醒、排期、进度、专注、最近漏卡、累计和笔记入口编排在同一输出。
3. 复用 model 的完成和排期判断；不增加后台常驻，不直接发送系统通知。
4. 加入空态、SKIP、quota、at-most、maxGap、跨日、重复事件和排序确定性测试。
5. 只接入可由 mock DOM 验证的结构层；真实触控、滚动和宿主记录留在 host-pending。

### R-A3：节奏、恢复和决策型回顾（映射 R-20.1/R-20.2/R-20.3）

1. 新增拟定的 `src/features/pace-projection.ts`，输出应做、完成、普通 backlog、普通周期逾期、恢复、稳定区间、reasonCode 和证据日期。
2. context normalization 优先复用已有事件备注，不修改 Store v3；新字段先只做设计和迁移评估。
3. review actionability 把事实、推断、建议、样本量、日期范围和原始事件引用分开。
4. 让今日、洞察、回顾、渲染块和 API 复用同一 projection。
5. 用确定性样例覆盖时区、SKIP、补记、quota、at-most、容错和空窗口。

### R-A4：笔记原生和迁移安全（映射 R-30.1～R-30.4，已有能力增量）

1. 在已有 `features/checkin-block.ts`、`render/block-renderer.ts` 和 `api-v5` 能力上扩展白名单数据集和聚合函数，非法配置继续 fail-closed；不重新实现已交付的 today/month/heatmap/summary/groups。
2. 增加日期跳转、项目/分组过滤和组合卡片的纯解析/渲染结构测试。
3. 统一 Loop、Obsidian 和其他公开格式的导入预览模型。
4. 预览字段差异、身份冲突、重复导入、部分失败和回滚，不写入真实用户 store。
5. 维护报告、模板组合和摘要的幂等/审计纯函数。

### R-A5：来源与 API 契约（映射 R-40.1/R-40.2，API v5 已交付）

1. 复用已有 source-framework、适配器和 API v5 contract fixture；只为断开/重试、mock consumer 和新来源补缺口。
2. 为思阅、思播、健康和未来微信读书准备 mock 生命周期、跨日、重复通知和宿主缺失样例。
3. 同步 API source、manifest、docs、错误码和 contract kit。
4. 为 Task Horizon 建立 mock consumer 的能力缺失、超时、Abort、单飞、刷新和旧消费者降级测试。
5. 不提交外部 issue/PR，不把 mock 结果写成真实联调完成。

### R-A6：本地质量、性能和恢复（映射 R-50.1/R-50.2）

1. 建立 10k/100k 事件、200 项目、366 日期和多来源组合 fixture。
2. 增加 import、calendar、review、render-block 和 source-settlement 的预算断言。
3. 增加架构、版本一致性、i18n、ARIA、CSS、reduced motion 和文档同源守门。
4. 受控智能体（R-50.1）的纯建议链——证据引用、差异预览、冲突指纹、失效缓存和撤销——并入本泳道自动验证；真实模型链路可用已接入思源智能体的 e2e 环境做隔离内核自动化证据（2026-09-24 起），真实设备宿主入口保持 host-pending。
5. 复跑 check、build、targeted tests、extended、perf、release manifest 和 rollback rehearsal。
6. 输出一份自动化证据报告，明确哪些 host-pending 项没有被关闭。性能、无障碍、隐私与恢复门禁从 M1 起随每批运行，M5 只集中补齐跨模块覆盖，不把质量工作延到最后。

## 十、明确跳过的工作

本轮不执行以下操作：

- 不运行或宣称通过真实思源桌面、页签、dock、Android WebView、系统保存面板和真机触控验收。
- 不进行思阅、思播、健康、Task Horizon、Dock Tomato 的双插件现场联调。
- 允许运行仓库自建临时工作区中的 `pnpm run test:e2e` 与 `pnpm run test:e2e:readonly`；报告必须标为隔离真实内核自动化，不得写成用户设备或外部插件现场完成。
- 不把浏览器响应式、fake DOM 或 mock consumer 结果写成移动端或生态完成。
- 不替用户决定积分、微信读书 Key/ToS、自建同步、隐私自动写入、删除/恢复真实数据和截图视觉取舍。
- 不提交上游 issue/PR，不 push，不发版，不操作需要账号或外部权限的流程。
- 不修改用户真实工作区数据，不执行迁移脚本，不自动写入日记或摘要文档。

## 十一、连续里程碑路线

版本号只在范围、质量链和发布窗口冻结后确定；本实施文档不把未来批次绑定为必须发布的 v18.3.x/v19/v20/v21/v22。

- M0 基线真值：v18.2.1 作为已发布基线；路线、模块、API v5、任务状态和证据矩阵互相可追溯。
- M1 本地可靠性：R-A1、R-A7、R-10.2、R-10.3/R-A2、R-10.4 纯逻辑部分和 R-10.5 首次路径状态机完成；host-pending 单独保留。
- M2 可解释统计：R-A8、R-20.1/R-20.2/R-20.3/R-A3 完成，普通排期、quota、at-most 三套口径独立且可追溯。
- M3 笔记与迁移：R-30.1～R-30.4/R-A4 完成纯解析、预览、幂等、审计和回滚；真实文档写入另验收。
- M4 生态契约：R-40.1/R-40.2/R-A5 完成来源和 API mock/契约；真实消费者和双插件联调另验收。
- M5 控制面与质量：R-A9/R-A10、R-50.1/R-50.2/R-A6 完成数据治理、隐私控制、性能、无障碍和恢复自动证据。
- 每个里程碑结束后做增量生态调研，只吸收 1～3 个能映射到现有事件、投影和笔记边界的能力；是否切出发布版本由当时证据决定。

这条路线允许本地工作持续前进，同时把真实宿主、用户判断和外部协作清晰留在对应门槛之后。



## 十二、横切自动化基础

### R-A7：时间与日历语义契约

当前 reminders.ts、features/review-comparison.ts 和部分渲染辅助仍各自以毫秒差计算日期。该批次先统一语义，再接入新投影：

1. 设计拟新增的纯模块 src/date-keys.ts，至少包含日期键校验、解析、格式化、下一本地日、半开区间日差和日期序列；实现前先核对 model.ts 已有 localCalendarDayNumber，避免重复导出。
2. 只接受显式 localDate、时区或 Date 输入，不读取隐式当前时间；跨午夜来源在接入层切段。
3. 逐步替换 reminders.ts、features/review-comparison.ts、render/fragments.ts、render/occasions.ts 中可替换的日期差计算；保留已有公开结果，先用等价回放证明没有行为漂移。
4. 测试 Asia/Shanghai、America/New_York 的夏令时、闰日、跨午夜、半开区间、无效日期、补记、撤销和历史修订。
5. 在 docs/architecture.md 和 docs/api-v5.md 写明 localDate 的来源、边界和统计截止时间。

完成条件：今日、回顾、提醒、渲染块、报告、API、导入和来源结算的日期测试共享同一套纯函数；现场设备不参与本批次判定。

### R-A8：可保存视图与筛选工作台

现有 view-preferences.ts 已有显示偏好基础，可在不改 Store v3 的前提下扩展查询范围：

1. 增加版本化 ViewScope 归一化：相对日期、项目、分组、来源、状态、完成率和排序；非法或过大的范围安全回落默认值。
2. 今日、回顾、报告和导出统一接收 ViewScope，并在结果中回显 scope、truncated 和 sourceRefs。
3. 失效项目或来源显示为可恢复的缺失条件，不删除事件、不复制事件、不静默扩大范围。
4. 增加 view-preferences、analytics、report、export 的纯测试和中英文/ARIA 结构门禁。
5. 移动、dock 和桌面只改变布局，不改变筛选语义；真实 surface 交互留在 host-pending。

完成条件：用户可以保存查询偏好并清楚看到报告/导出的实际范围；旧偏好和无效值可安全迁移。

### R-A9：项目生命周期与数据治理（拟新增横切批次）

现有 `model.ts`、`storage-transaction.ts`、`diagnostics.ts`、快照/冲突/墓碑和 `archived.ts` 已覆盖基础；本批次只补统一的可解释投影，不重新设计 Store v3。

1. 定义 active、暂停/归档区间、archived、deleted/tombstoned 的状态图，明确各状态对今日、回顾、导出、外部投影和历史事件的影响。
2. 新增拟定纯模块 `src/features/lifecycle-projection.ts`，输出删除/归档/恢复前的影响预览、关联事件数量、外部身份数量、锚点引用和可恢复动作。
3. 复用 `deleteItemsCascade`、tombstone、冲突审计、快照恢复和诊断码；禁止用直接数组删除绕过墓碑或审计。
4. 为跨窗口、重复撤销、恢复后重算、归档区间和外部事件保留规则建立纯测试；真实工作区恢复演练仍为用户验收。

拟新增 `tests/lifecycle-projection.test.cjs`；扩展已有 `tests/backup.test.cjs`、`tests/conflict.test.cjs`、`tests/restore-audit.test.cjs`、`tests/tombstone-concurrency.test.cjs` 和 `tests/archived-search.test.cjs`。

完成条件：高影响操作前能看到范围和可恢复性；历史事件不会被无审计地清除；隔离工作区恢复/冲突自动化通过，真实用户数据恢复保持开放。

### R-A10：本地隐私与控制中心（拟新增横切批次）

现有 `export.ts`、`diagnostics.ts`、`view-preferences.ts`、来源设置、文档写入和安全导出通道是实现基础；本批次先做可见控制面和纯审计，不替用户决定隐私偏好。

1. 汇总本地数据范围、来源、外部联动、文档写入目标、诊断包和导出字段，明确事实、投影、审计和缓存的区别。
2. 新增拟定纯模块 `src/features/privacy-scope.ts`，归一化控制面状态、导出前敏感字段清单、来源断开后的已写入事件保留规则和重新接入提示。
3. 设置页提供逐来源断开、文档写入关闭、诊断导出预览、导出范围和删除/撤销影响清单；不新增遥测、不读取第三方私有存储。
4. 所有控制面写入复用既有偏好归一化、审计和安全下载通道；来源断开不删除已经确认落盘的事实事件。
5. 本地测试覆盖字段泄漏、范围越界、断开/重连、空配置和双语/ARIA 结构；真实隐私取舍和用户工作区删除确认保持开放。

拟新增 `tests/privacy-scope.test.cjs`；扩展已有 `tests/diagnostics.test.cjs`、`tests/download-channel.test.cjs`、`tests/export-identity-docs.test.cjs`、`tests/preferences-docs.test.cjs` 和 `tests/aux-write-hygiene.test.cjs`。

完成条件：用户能看懂数据去了哪里、导出了什么、关闭来源后会发生什么；不因控制面新增隐式写入或不可逆删除。


## 十三、第六轮生态调研采纳批次（2026-09-25 新增，当前开工队列）

来源：benchmark 第十五节（T-1400 第六轮，用户点名触发）。三条泳道均属 local-auto，可在不请求用户操作的前提下推进；均不改 Store v3、不新增持久化字段（除 T-1462 的 per-item 偏好字段走既有偏好归一化通道）。

### R-A13：低压力呈现与包容性设计基线（映射战略方向 24，T-1461）

执行步骤：

1. **色彩**：复核热力图/成就/失速/情境统计的用色——紫罗兰单色亮度阶梯（感知均匀、色盲安全），格子保留日期数字与 tooltip 冗余编码；禁红绿对举；低完成度日不上警示红；双主题只调端点（T-1410 百分位色阶保留，本项管色相与冗余编码）。
2. **文案**：失速卡与连击呈现按「双日规则」改写（断一天是数据，连断两天才是信号）；全局 calm 禁则（禁「你落后了」「归零」式措辞）写进 ui-docs 文案节；i18n 双语同步。
3. **无障碍**：完成态颜色+图标+文字三通道静态可辨，动效只是增量；断言入 tests/ui-state-ledger.test.cjs。里程碑分级庆祝归 D-263 收尾，不在本批。
4. **触控**：44/48px 触控目标全量审查（底部操作栏、渲染块按钮、周条格子、设置行），写入视觉 harness 与 mobile-release-quality 断言。
5. **操作**：审查快捷记录删除/修改路径——低风险操作 toast 撤销优先于确认弹窗；仅不可逆高危操作保留确认。

验证：`pnpm run test:ui`、宽度走查、双主题对比度门禁、visual-qa；文案类断言入 i18n parity 与 ui-docs 守门。

完成条件：低压力边界从设计原则变成守门断言；真机触控与显示保持 host-pending。

### R-A14：数值快捷记录预设增量（映射战略方向 2/11，T-1462）

执行步骤：

1. 编辑器 per-item 新增可选「预设步长」配置（如 +1/+250/+500，归一化钳制与上限沿用既有偏好纪律），无配置时行为不变。
2. 记录对话框与今日快捷记录区按配置渲染增量 chips；一次点击=一条追加式增量事件（事件不可变语义不变，走既有 recordEvent value 通道与审计/撤销）。
3. today 渲染块（`view:"today"`）对配置了步长的数值项目把单个 record 按钮扩展为 chips 组；写回走既有 `data-block-record` 通道与节流。
4. 来源联动写入的数值事件不受影响（结算层口径不变）。

验证：编辑器配置、对话框、渲染块三面守门 + i18n parity + 事件追加语义测试；隔离内核 e2e 补一条 chips→落盘→幂等用例。

完成条件：数值/计数类记录从「点开输入」降到一键；真实触控归 host-pending。

### R-A15：迁移健壮性与边界用例（映射战略方向 25，T-1463）

执行步骤：

1. **跨午夜双日归账断言**：以 streak v2.0「跨午夜会话两天都计数」为参照场景，为 siplayer/docktomato 切段与 localDate 归账补纯函数+e2e 边界断言（T-1385 已按 localDate 预切分，本项是证据补强，无行为变更）。
2. **未知字段保留**：Loop/Obsidian 导入预览把未识别列/字段原文计入损耗词表与审计（不静默丢弃）；导出文档注明向前兼容承诺（mhabit WebDAV 先例）。
3. **合并语义参考记录**：PixelHabits 三段式（每日取并集/元数据 updated_at LWW/事件按 id 幂等去重）写入 docs/sync-design-review.md 参考节——只记录设计参考，不实现同步。

验证：导入预览测试扩充、跨午夜边界用例、文档同源守门；`pnpm run test:quality`。

完成条件：迁移路径对未来格式升级的宽容性有可复跑证据；真实旧文件与 Android 文件系统验证保持用户待办。

### T-1464：宿主 3.8.6 渲染块兼容回归（触发条件批次）

3.8.6-alpha 四连发期间数据库视图 API 在变动；正式版发布后跑 `pnpm run test:e2e` 全量 + 渲染块真实内核用例，确认 combo/today/日期跳转无宿主回归。local-auto（隔离内核）。

### 开工顺序刷新（2026-09-25）

1. R-A13（T-1461）——定位叙事的工程落地，性价比最高，先行。
2. R-A14（T-1462）——独立功能增强，可与 A13 并行拆批。
3. R-A15（T-1463）——文档+测试为主，随任一批次顺带。
4. T-1464——3.8.6 正式版发布后立即执行。
5. 并行线（非本地）：真机反馈修复（host-pending 回来即修）、上游 #55/#180 契约评审（external）、T-1400 第七轮（触发=M3/M4 全收口或用户点名；Workbench 迭代持续观察）。
6. 延后池按 benchmark 第十五节触发条件滚动，不主动排批。


## 十四、确认开发队列（2026-09-25 用户确认，D-272）

用户指示：①真机测试项全部移出队列，保持开放，用户有空自测反馈后即修，不作为任何批次前置；②外部等待项继续等，但**每个大版本发布时核查既有上游 issue/PR 是否需要更新**（常设动作 R-REL-CHECK）；③可开发内容确认排序如下。本节是当前唯一有效的开工队列，与 TODO 中已登记任务一一对应；R-* 编号在开工时升格为 T-*。

### 第 1 批（已交付，2026-09-26，commit f836b8c）

- **T-1461 / R-A13** 低压力呈现与包容性设计基线 ✅（docs/low-pressure-baseline.md + 双日规则文案 + 44px 触控基线 + calm 禁则/色阶守门）
- **T-1462 / R-A14** 数值快捷记录预设增量 ✅（quickSteps 三侧同构 + 今日页 chips + today 渲染块 chips）
- **T-1463 / R-A15** 迁移健壮性与边界用例 ✅（midnight-boundary 守门 + Loop 未知列全链 + 向前兼容承诺 + 合并语义参考）

### 第 2 批：今日与回顾呈现增强（R-A16，已交付，2026-09-26，commit d31e6a9，T-1466）

1. **R-16.1 今日完成度环** ✅：行动台摘要条 SVG wrap-around 环（既有 totals.completionRate 投影；aria 文字通道；负边距保持条高零增长；dock 常驻小环留待 dock 表面迭代）。
2. **R-16.2 sparkline 报告卡** ✅：回顾页范围统计区近 30 日记录趋势迷你线（复用内存中 analytics daily 快照）；「概览零图表 DOM」性能不变量按纪律收窄并记录理由。

### 新增登记（2026-09-26，等开工指令）

- **T-1465 问卷式日记打卡**（用户想法，调研完成见 benchmark 第十六节，D-273 定型）：打卡项目绑定问卷模板（内置 5 预设+自建），填完写入今日日记或指定文档并完成打卡；写入走 summary-resident 同款幂等/旁路纪律。建议排期=第 2 批（R-A16）之后、第 3 批前；归类 local-auto（含隔离内核 e2e）。

### 第 3 批：洞察与可视化深化（R-A17）

1. **R-17.1 确定性相关性洞察**：项目对相关性只读投影——最小样本纪律（重叠 ≥4 天且 |r|≥0.4 才输出）+可选滞后相关（「睡眠差的日子 X 完成率低」型文案）；纯统计无 AI 依赖，防相关性误读措辞入 calm 禁则。
2. **R-17.2 quota 超额日着色**：month/summary 渲染块对超额完成的正向表达（色阶/角标），沿用既有 quota 口径单一实现。
3. **R-17.3 时段分组多次记录视图**：一日多次项目按早/午/晚分组渲染（既有事件时刻戳投影，零 schema 变更）；与 T-1462 chips 组合覆盖高频记录场景。
4. **R-17.4 fractured/sparse 热图**：高频次单元格分裂显示与低频项目月/45 天投影（maxGap 组合评估）；随渲染块迭代排批。

### 第 4 批：治理、互操作与收尾（R-A18）

1. **R-18.1 分享图片导出**：年度格子/统计卡渲染为本地 canvas 图片（含 streak/完成率），零网络零遥测。
2. **R-18.2 诊断导出预览深化**（A10 剩余）：诊断包范围化选择与导出前预览确认。
3. **R-18.3 小项收口**：66 天成熟度进度条（投影层）、周开始日开关（数据聚合确认后）、宽屏 bento 布局重排（内容层稳定后）。
4. **R-18.4 UI 台账保留词表清理**：T-1422 遗留的 `__loading`/`__success`/`is-saving`/`msg.saving` 保留词表统一收编或退役。
5. **R-18.5 里程碑分级庆祝**（D-263 收尾口径）：日常完成=轻反馈，里程碑=重反馈，reducedMotion=静态徽章+文案；放在收尾批执行。

### 触发条件批次（不主动排批）

- **T-1464** 宿主 3.8.6 正式版渲染块回归（等宿主发版）。
- **T-1413** 轻量积分/愿望兑换（等用户明确提出）。
- Story Mode 渐进解锁（等「帮我控制只养少数习惯」类需求）；CalDAV 外部来源（等用户呼声）；Pinch/entries 迁移通道（等需求信号）；MCP descriptor（等 API v5 真实消费方 ≥2）；隐藏集管理 UI 与新手进阶 UI（等截图设计确认门）；streak freeze/护盾（默认不做）。

### 外部等待线与 R-REL-CHECK（常设）

- 继续等待：sireader#55、siplayer#180 回应；Task Horizon 反向提案与 Dock Tomato PR 草案时机；T-1392/T-1394/T-1366/T-1165/T-1228~1230 消费端与联调。
- **R-REL-CHECK**：每个大版本发布时（含候选冻结阶段）核查上述 issue/PR/草案——有新交付能力、契约或版本事实变化时在原帖追加更新；结果记 PROGRESS。
- 真机现场项（T-1388、微信读书首拉、每日提醒弹窗、叶归摄取、移动端折叠/安全区复验、T-023/T-033/T-129 等）保持开放，用户自测反馈后即修。


