# 小驴打卡最终 Agent 执行待办

> **文档性质**：合并前唯一的开发执行队列。它把现有 `TODO.md`、`PROGRESS.md`、`BLOCKERS.md`、`DECISIONS.md`、UI 原型规范和旧 PM 清单收敛成可直接交给 AI Agent 的工作包。
>
> **适用对象**：开发 Agent、审查 Agent、产品/设计协作人员。
>
> **维护原则**：旧任务不删除，已交付任务不重开；本文件只增加一个可观察、可验收的 canonical outcome。旧 PM 编号和 T/D 编号通过 `source_ids` 追溯。

## 1. 使用边界

### 1.1 受保护文件

以下文件由用户明确要求保持不变，任何工作包都不得直接修改：

- 版本号相关：`package.json`、`plugin.json`、`src/version.ts` 及仓库内其他版本源文件。
- `CHANGELOG*`。
- `README` 中的徽章、安装/下载入口和用户要求保护的发布信息。
- `PROGRESS.md`。
- 思源笔记本体、未经确认的思源内部 API 或私有 Store。

如果实现确实需要修改受保护文件，任务必须先转为 `decision-needed`，提出具体 diff、原因、风险和回滚办法，不能自行绕过。

### 1.2 状态来源优先级

发生冲突时按以下顺序判断任务是否仍需执行：

1. 当前源码、测试和实际命令输出。
2. `TODO.md`、`PROGRESS.md`、`BLOCKERS.md` 的最新状态与证据。
3. `DECISIONS.md` 中已经落地的口径和决策门槛。
4. [UI 原型规范](ui-prototype-system-v2-2026-10-03.md)与可点击原型。
5. 旧 PM 清单与调研文档，仅作为候选需求和追溯来源。

TODO 中的历史版本快照不能覆盖当前源码事实。`[x]`、明确的交付证据或测试证据优先于同一事项的旧描述；无法核实的事项标为 `triage`，不得假定完成。

### 1.3 每轮 Agent 协议

Agent 开始前必须：

1. 阅读 `AGENTS.md`、本文件、相关 `TODO/PROGRESS/BLOCKERS/DECISIONS` 条目和 UI 原型规范。
2. 执行 `git status --short --branch`，检查受保护文件是否已有外部改动。
3. 选择一个最早的、依赖已满足且状态为 `ready` 的工作包；需要并行时明确写入 `parallel_with`。
4. 先审计真实代码和测试，再写实现计划；不能依据文件名臆造架构或思源 API。
5. 只改当前工作包的范围；发现新需求时追加新的 `AG-xxx`，不静默扩大范围。
6. 完成实现、测试、文档和证据记录，再将状态改为 `done`；真实设备、宿主窗口、外部服务未验证时写 `host-pending` 或 `blocked-external`。
7. 每 3–5 个相关工作包本地提交一次；用户已经授权本轮收工后推送，因此最终由主 Agent 执行 `git push`。

### 1.4 状态和优先级

| 状态 | 含义 |
|---|---|
| `ready` | 依赖满足，可领取 |
| `in-progress` | 已有 Agent 领取，其他 Agent 不重复实现 |
| `done` | 代码/文档、测试和证据均完成 |
| `triage` | 事实、范围或完成状态尚未确认 |
| `blocked-external` | 需要外部仓库、宿主、服务或用户环境 |
| `decision-needed` | 需要产品决策、公开契约或受保护文件变更 |
| `deferred` | 有价值但不进入当前核心合并线 |
| `host-pending` | 自动化通过，真实宿主/设备验证尚缺 |

优先级：`P0` 为数据正确性、崩溃、丢失、隐私和发布阻断；`P1` 为主流程和高频体验；`P2` 为增强、生态和远期能力。

## 2. 目标产品和统一验收口径

小驴打卡的核心定位是：**在思源笔记内，把一次行动可靠地记录下来，逐步形成可理解、可复盘、可调整的个人行动系统**。产品价值链固定为：

`行动入口 → 事实记录 → 规则/时间解释 → 回顾理解 → 温和建议 → 用户确认后的下一步行动`。

任何新能力必须回答：它服务哪一环、产生什么事实、如何撤销或修正、失败后用户怎么办、在 Today/Quick/Dock/Mobile/Review 是否保持同一含义。

### 2.1 全局 Definition of Done

一个工作包只有同时满足以下条件才可标记 `done`：

- 行为、数据结构、日期/localDate/时区、幂等、撤销和错误状态有明确契约。
- 成功、空数据、加载中、失败、部分成功、离线、无权限、冲突、恢复至少覆盖适用状态。
- 桌面主页面、Dock/嵌入页、移动窄屏、键盘导航、IME 输入、浅色/深色主题按适用范围验证。
- 用户可看懂当前状态、下一步主动作和失败原因；AI 生成内容有来源、置信度和确认门。
- 有针对行为的测试或 fixture；测试命令实际执行并记录结果，不能只写“应通过”。
- 没有触碰版本、CHANGELOG、README 徽章、PROGRESS 或无关代码；必要迁移具备回滚说明。
- 证据写入工作包的 `evidence` 字段或关联进度记录，包含命令、产物路径、宿主限制和未覆盖项。

### 2.2 统一证据分类

`logic`（纯函数/模型）、`contract`（数据/API 契约）、`ui`（交互绑定）、`visual`（截图/视觉 harness）、`a11y`（键盘/读屏）、`perf`（预算/基准）、`host`（思源真实宿主）、`external`（外部适配器或上游协作）。模拟数据不能充当 `host` 或 `external` 证据。

## 3. 执行阶段和依赖图

```text
G0 盘点与契约台账
 ↓
G1 真值、日期、事件、规则、存储、迁移
 ↓
G2 共享 UI 壳（SurfaceContext、PageShell、返回栈、状态、tokens）
 ↓
G3 核心行动（Today、Quick、Editor、Focus）
 ↓
G4 理解与治理（Review、Insights、Occasions、Archive、Reminder、Settings）
 ↓
G5 多表面、导入导出、外部适配器、API 契约
 ↓
G6 AI（解释→草稿→编辑→确认→审计）
 ↓
G7 精品门禁（a11y、i18n、安全、性能、视觉、移动、宿主、发布）
```

G1 内的数据工作包可并行；G3 的 Today/Quick 可并行，但必须共享 G2 契约；G4 各页面可并行；G5 的纯 adapter/fixture 可先做，真实上游联调保持 `blocked-external`；G6 不得绕过 G1 的数据来源和 G2 的状态组件。

### 当前领取队列（Now）

每轮默认只从这里领取一个任务；完成后按依赖顺序补充下一项。队列不是新的需求来源，状态仍以对应 AG 条目和源文档为准。

1. `AG-001` 保护文件与变更边界检查。
2. `AG-002` PM/T/D 去重与来源台账。
3. `AG-003` 能力、页面和来源注册表。
4. `AG-004` 时间、时区和异步 fixture。
5. `AG-005` 六层数据词典。
6. `AG-006` UI 原型 v2 实现清单。
7. `AG-007` 测试与质量门禁矩阵。

当 Now 中的任务全部完成后，按 G1 → G2 → G3 的依赖选择；若某项转为 `triage`、`decision-needed` 或 `blocked-external`，跳过它并领取下一个无阻塞项，同时留下原因和回到队列的条件。

### Canonical 卡片补全要求

条目中的一行摘要是索引。Agent 领取后必须在该条目下补全以下字段，才能开始实现：

```md
owner: <agent/task path>
goal: <用户问题和可观察结果>
scope: <允许修改的模块/文件>
out_of_scope: <明确不做的内容>
source_ids: <PM/T/D/原型/测试来源>
depends_on: <AG IDs>
parallel_with: <可并行 AG IDs>
data_surface_contract: <事件、API、页面、权限、失败语义>
implementation_steps: audit -> contract -> minimal change -> fixture/test -> docs
acceptance: success / empty / loading / failure / partial / offline / conflict / undo
evidence_required: <命令、产物、宿主/外部限制>
migration_rollback: <迁移、兼容和回滚>
stop_conditions: <触发 triage/blocked/decision-needed 的条件>
```

一个工作包只保留一个可观察结果、一个主契约和一组主要证据；跨越三个以上独立验收族或需要多个产品决策时，拆成新的 `AG-xxx`。页面任务必须写主动作、上下文、返回路径和全状态；AI 任务必须先生成解释或草稿，经过编辑、确认和可撤销写入。

## 4. Canonical 工作包

每个工作包均采用：`ID | 状态 | 优先级 | 类型 | 依赖 | 来源 | 结果 | 范围 | 验收/证据`。实现时应把实际文件、命令输出和未覆盖风险补充到对应条目后。

### G0：盘点、契约与质量台账

- [ ] **AG-001** `ready` `P0` `docs/quality`：建立受保护文件检查和变更边界。依赖：无。来源：AGENTS、本请求。结果：每轮可自动列出保护文件 diff；验收：`git diff --name-only` 与保护清单检查脚本/命令均可复现。
- [ ] **AG-002** `ready` `P0` `docs/governance`：建立 PM/T/D 来源去重台账。依赖：无。来源：PM-001..930、TODO、PROGRESS、DECISIONS。结果：每个旧任务映射到一个 AG 工作包或明确 `done/blocked/deferred`；验收：无重复 canonical outcome、无丢失来源段。
- [ ] **AG-003** `ready` `P0` `contract`：同步能力注册表、页面注册表和来源能力矩阵。依赖：AG-002。结果：新增能力先登记数据事实、入口、权限、失败回退和证据类型。
- [ ] **AG-004** `ready` `P0` `test`：建立固定时间、时区、随机性和异步时钟 fixture。依赖：AG-002。结果：测试可稳定重现跨日、夏令时、年份边界、定时器漂移和重试场景。
- [ ] **AG-005** `ready` `P0` `contract`：固化 Fact/Rule/Derived/Suggestion/Action/Governance 六层数据词典。依赖：AG-003。验收：页面与 AI 不再把派生结论伪装成事实，类型和文档可互查。
- [ ] **AG-006** `ready` `P1` `ui`：把 UI 原型 v2 的 tokens、组件状态和页面契约转成实现清单。依赖：AG-003。来源：UI 原型规范。验收：每个页面有 loading/empty/error/partial/offline/disabled 状态和主动作。
- [ ] **AG-007** `ready` `P0` `test`：建立行为、UI、移动、生态、性能、发布门禁矩阵。依赖：AG-004。验收：矩阵能指向现有 `pnpm run check`、`test:ui`、`test:mobile`、`test:ecosystem`、`test:perf`、`test:quality` 及视觉命令。

### G1：数据真值、规则和持久化

- [ ] **AG-008** `ready` `P0` `bug/contract`：统一 localDate/date-key/timezone 的单一实现。依赖：AG-004。来源：T-1621、D-311、PM-181..210。验收：跨时区、跨年、午夜、夏令时和非法日期均有明确结果及测试。
- [ ] **AG-009** `ready` `P0` `contract`：统一 schedule/rule 的周期、周起始、skip、rest、no-data、failure 和 completion 语义。依赖：AG-005、AG-008。验收：Today、Review、Reminder、Analytics 使用同一规则解释。
- [ ] **AG-010** `ready` `P0` `bug`：统一数值、单位、时长、百分比、计数和四舍五入边界。依赖：AG-005。验收：输入、显示、统计、导入导出不发生单位漂移或 NaN 污染。
- [ ] **AG-011** `ready` `P0` `contract`：强化 append/event 边界校验和不可变事实约束。依赖：AG-005。验收：非法事件、未来日期、未知类型和重复事件被拒绝或明确降级，错误可诊断。
- [ ] **AG-012** `ready` `P0` `contract`：稳定化 normalization ID、externalRef 和 identity 完整性。依赖：AG-003、AG-011。验收：重复同步、重放、重命名和跨来源合并不会产生重复事实。
- [ ] **AG-013** `ready` `P0` `contract`：固化模板、项目、目标和 Store schema 的版本化契约。依赖：AG-005。验收：旧数据可读、未知字段可保留、迁移可回滚；不修改受保护版本源。
- [ ] **AG-014** `ready` `P0` `reliability`：设计 tombstone、事件压缩和历史保留策略。依赖：AG-011、AG-013。验收：重放后语义不变，Store 增长有预算，压缩前后统计一致。
- [ ] **AG-015** `ready` `P0` `bug`：修正 Analytics 分母、缺失日、休息日和失败日口径。依赖：AG-009、AG-014。验收：每个指标能展示分子、分母、排除原因和数据来源。
- [ ] **AG-016** `ready` `contract`：统一 API 的 range/asOf、分页、排序和空结果语义。依赖：AG-008、AG-015。验收：同一查询在页面、Dock、外部 API 返回一致事实。
- [ ] **AG-017** `ready` `contract`：建立记录、项目、来源、外部项目的 identity 生命周期。依赖：AG-012、AG-013。验收：创建、归档、恢复、合并、拆分和删除均有引用处理方案。
- [ ] **AG-018** `ready` `diagnostics`：实现数据健康、孤儿引用、异常时间、重复 ID 和修复建议报告。依赖：AG-011..017。验收：只读诊断默认不改数据，修复必须预览、确认、可撤销。

### G1：可靠写入、跨窗口和恢复

- [ ] **AG-019** `ready` `P0` `reliability`：统一所有写入经过 enqueueMutation/事务边界。依赖：AG-011、AG-013。验收：成功、失败、取消、重试、回滚和通知顺序可测试。
- [ ] **AG-020** `ready` `P0` `contract`：固化跨窗口 bucket 边界、版本、last-writer-wins 和回滚规则。依赖：AG-013、AG-019。来源：D-314、D-315。验收：并发编辑有明确冲突提示，不静默覆盖用户输入。
- [ ] **AG-021** `ready` `reliability`：实现 import/restore 的预览、校验、事务、失败回滚和结果报告。依赖：AG-013、AG-019。验收：坏文件、部分成功、重复导入、撤销均有证据。
- [ ] **AG-022** `ready` `bug`：收口 teardown、timer、RAF、事件监听和异步任务生命周期。依赖：AG-019。验收：重复打开/关闭不会重复监听、内存泄漏、晚到写入或崩溃。
- [ ] **AG-023** `ready` `reliability`：为来源同步建立 in-flight 锁、超时和取消语义。依赖：AG-019、AG-022。验收：重复触发不会并发污染，取消后不写入过期结果。
- [ ] **AG-024** `ready` `reliability`：完善 pending/outbox 重试、退避、死信和人工重放。依赖：AG-020、AG-023。验收：离线/恢复/重复重试保持幂等，并展示用户可理解的状态。
- [ ] **AG-025** `ready` `diagnostics`：统一错误分类、用户文案、开发诊断和脱敏日志。依赖：AG-005、AG-019。验收：错误可定位到 action/source/correlationId，不泄露正文或密钥。
- [ ] **AG-026** `ready` `ui`：实现冲突、覆盖、恢复和撤销的统一交互。依赖：AG-020、AG-025。验收：每个危险操作有影响范围、预览、确认和恢复路径。
- [ ] **AG-027** `ready` `test`：完成备份→破坏→恢复→复核演练。依赖：AG-021、AG-026。验收：记录、事件、模板、tombstone 和设置的恢复边界与文档一致。
- [ ] **AG-028** `ready` `perf`：为大 Store 建立索引、分页、增量计算和内存预算。依赖：AG-014、AG-016。验收：基准数据下首屏、查询、写入和峰值内存不超过预算。
- [ ] **AG-029** `ready` `migration`：提供迁移 dry-run、统计、失败清单和回滚入口。依赖：AG-013、AG-018、AG-027。验收：迁移不会静默丢字段，旧数据可在只读模式继续查看。

### G2/G3：共享 UI 壳与核心行动

- [ ] **AG-030** `ready` `P0` `ui/contract`：完成 SurfaceContext、多 root 隔离、当前页代理和序列化恢复。依赖：AG-020、AG-022。来源：T-1621、D-324。验收：主窗口、Dock、嵌入页之间导航和返回栈不串 root。
- [ ] **AG-031** `ready` `P0` `ui`：统一 Quick/Today 的记录 adapter 和唯一主动作。依赖：AG-030、AG-019。验收：同一记录入口在桌面、Dock、移动产生同一事实。
- [ ] **AG-032** `ready` `P0` `ui/bug`：修正数值输入、键盘、IME、焦点恢复和移动安全区。依赖：AG-031。验收：中文输入组合态不重复提交，焦点不跳失，窄屏不遮挡主按钮。
- [ ] **AG-033** `ready` `P0` `reliability`：实现记录后的 undo、幂等和重复点击保护。依赖：AG-019、AG-031。验收：网络慢、重复点击、返回重进和刷新不会重复写事实。
- [ ] **AG-034** `ready` `ui`：覆盖 skip/rest/no-data/source-failure 的记录入口和反馈。依赖：AG-009、AG-025、AG-031。验收：用户知道是否完成、为什么不能完成以及如何稍后处理。
- [ ] **AG-035** `ready` `feature`：提供回补、纠错、批量修正和历史变更预览。依赖：AG-008、AG-026、AG-033。验收：未来日期、跨日回补和批量操作均有权限、范围和撤销控制。
- [ ] **AG-036** `ready` `feature`：实现批量操作的选择、全选范围、部分成功和失败重试。依赖：AG-021、AG-035。验收：不会把未选择项目误改，结果可导出或继续处理。
- [ ] **AG-037** `ready` `ux`：完成首次打开到首条成功记录的引导和低打扰提示。依赖：AG-031、AG-034。验收：无项目、无规则、权限不足和空数据都有下一步，不强迫注册或 AI。
- [ ] **AG-038** `ready` `ux`：统一 Today/Review/Insights 的空、低数据、加载和失败状态。依赖：AG-005、AG-030。验收：空状态解释价值、给主动作、可安全退出。
- [ ] **AG-039** `ready` `feature`：实现 Today reminder entry 的卡片密度、主动作和回退。依赖：AG-034、AG-060。来源：T-1611。验收：提醒与事实状态一致，不把提醒误显示为完成。
- [ ] **AG-040** `ready` `ui`：完成移动底部操作区、safe-area、横竖屏和窄宽度走查。依赖：AG-032、AG-038。验收：280–1280px 关键页面无横向溢出和不可达操作。
- [ ] **AG-041** `ready` `ui`：建立统一 success/error/undo/toast/status feedback 组件。依赖：AG-025、AG-033。验收：反馈不遮挡主内容，读屏可感知，重复操作可判断结果。

### G3：Editor、规则、模板和项目生命周期

- [ ] **AG-042** `ready` `ui`：实现渐进式创建流程，先目标后可选高级字段。依赖：AG-013、AG-037。验收：新用户可在最少步骤完成，专家可展开完整配置。
- [ ] **AG-043** `ready` `ui/contract`：提供 schedule/rule 实时预览和未来日期样例。依赖：AG-008、AG-009、AG-042。验收：预览与 Today/Reminder 实际计算共享函数。
- [ ] **AG-044** `ready` `ui`：实现规则变更 diff、影响范围和生效时间确认。依赖：AG-026、AG-043。验收：历史事实不被回写，未来计划变化可撤销。
- [ ] **AG-045** `ready` `bug`：完善字段校验、草稿恢复、离开保护和异步保存状态。依赖：AG-019、AG-025、AG-042。验收：无效字段聚焦明确，草稿不丢，保存失败可重试。
- [ ] **AG-046** `ready` `feature`：模板创建、应用、导入、导出、分享和冲突策略。依赖：AG-013、AG-021、AG-045。验收：模板不携带隐私事实，版本不兼容时可解释。
- [ ] **AG-047** `ready` `feature`：名称/字段推断和推荐，带来源、置信度和手动覆盖。依赖：AG-005、AG-046。验收：推荐失败不阻塞手动创建。
- [ ] **AG-048** `ready` `ui`：按 UI 原型 v2 完成 Editor tokens、布局、状态和视觉回归。依赖：AG-006、AG-042..045。证据：visual、a11y、mobile。
- [ ] **AG-049** `ready` `feature`：项目暂停、恢复、归档、删除和引用清理。依赖：AG-017、AG-044。验收：暂停不伪造失败，归档后历史可读，删除有范围预览。

### G4：Review、Insights、Archive 和回顾闭环

- [ ] **AG-050** `ready` `P1` `ui`：Review 采用 fact-first 信息层级。依赖：AG-005、AG-038。验收：事实、规则解释、派生指标、建议和操作视觉分层。
- [ ] **AG-051** `ready` `bug`：Review/Insights 每个指标展示分母和解释。依赖：AG-015、AG-050。验收：低数据、缺失日、休息日不会造成夸大结论。
- [ ] **AG-052** `ready` `feature`：历史搜索、筛选、详情和返回栈。依赖：AG-016、AG-030。验收：筛选条件可见、可清除、返回后保留，结果分页稳定。
- [ ] **AG-053** `ready` `ui`：图表 drill-down、hover/focus、详情返回和窄屏替代。依赖：AG-016、AG-052。验收：图表不是唯一信息来源，键盘和移动可访问。
- [ ] **AG-054** `ready` `ui`：比较视图处理不同周期、空数据和口径差异。依赖：AG-009、AG-051。验收：比较前显示可比性和数据范围。
- [ ] **AG-055** `ready` `feature`：周/月回顾、报告、复制和导出。依赖：AG-050..054。验收：报告区分事实与建议，导出可脱敏并可复核。
- [ ] **AG-056** `ready` `feature`：Archive 页面提供筛选、恢复、永久删除前预览。依赖：AG-014、AG-017、AG-026。验收：归档不等于删除，恢复后引用和统计可验证。
- [ ] **AG-057** `ready` `ui`：把建议与事实分离，提供接受、忽略、稍后、反馈四种动作。依赖：AG-050、AG-088。验收：建议不会改变事实或规则，用户可看到来源。
- [ ] **AG-058** `ready` `perf`：Review/Insights 大数据量首屏、滚动和计算预算。依赖：AG-028、AG-053。验收：长列表分页/虚拟化，统计计算可取消。

### G4：提醒、Occasions、Focus 和时间型交互

- [ ] **AG-059** `ready` `feature`：统一 reminder projection 与 Today/Review 状态。依赖：AG-009、AG-039。验收：提醒只投影事实，不创造完成记录。
- [ ] **AG-060** `ready` `P0` `reliability`：实现提醒频率、关闭、今日静音、跨窗口和幂等。依赖：AG-020、AG-059。来源：T-1618。验收：重启、重复触发和时区变化不重复提醒。
- [ ] **AG-061** `ready` `ui`：Reminder Center 卡片密度、批量处理和主动作。依赖：AG-060、AG-041。验收：处理结果即时反馈，可跳转到事实或规则。
- [ ] **AG-062** `ready` `ux`：安静时段、关闭原因、延期和恢复入口。依赖：AG-060、AG-061。验收：用户能理解为什么没提醒以及如何恢复。
- [ ] **AG-063** `ready` `bug`：修复 Occasions 长列表滚动、IME、焦点和弹层定位。依赖：AG-032、AG-040。来源：T-1613。验收：输入法组合态、滚动容器和移动键盘均稳定。
- [ ] **AG-064** `ready` `feature`：Occasions 里程碑、日期表达、周期和重复规则。依赖：AG-008、AG-009、AG-063。验收：自然语言日期与实际 localDate 可互证。
- [ ] **AG-065** `ready` `P0` `bug`：修正 Focus elapsed time、暂停、恢复和页面重进。依赖：AG-004、AG-022。验收：后台/休眠/时区变化不虚增时长。
- [ ] **AG-066** `ready` `ui`：Focus 在主页面、Dock、弹窗和移动端同步。依赖：AG-030、AG-065。验收：只存在一个活动会话，多个 surface 显示同一状态。
- [ ] **AG-067** `ready` `reliability`：Focus 提交、重试、取消和异常退出恢复。依赖：AG-019、AG-024、AG-065。验收：提交幂等，失败后可继续或放弃且不丢时长。
- [ ] **AG-068** `ready` `ux`：休息、跳过、恢复和中断后的用户路径。依赖：AG-034、AG-065。验收：每种中断都给出下一步，不把中断误计为完成。
- [ ] **AG-069** `ready` `feature`：日历、周期、配额和长期目标的边界展示。依赖：AG-009、AG-015。验收：配额/连续天数等展示不能诱导错误因果，缺数据显式说明。

### G5：设置、来源、导入导出和生态

- [ ] **AG-070** `ready` `P1` `ui`：Settings v2 信息架构、搜索、分组和 tokens。依赖：AG-006、AG-003。验收：常用设置三步内可达，危险设置有影响说明。
- [ ] **AG-071** `ready` `ui/bug`：统一文档/目标选择器为搜索 combobox + listbox。依赖：AG-070。来源：D-323、D-322。验收：键盘、IME、读屏、空结果和大数据量稳定。
- [ ] **AG-072** `ready` `ui`：设置草稿、变更列表、保存/取消/恢复默认。依赖：AG-020、AG-045。验收：跨窗口冲突不静默覆盖，保存失败保留用户输入。
- [ ] **AG-073** `ready` `contract`：来源 capability registry：权限、字段、刷新、失败和降级。依赖：AG-003、AG-025。验收：UI 依据能力显示，不为未支持来源渲染假按钮。
- [ ] **AG-074** `ready` `feature/external`：LifeLog 多项目映射、项目级时长和健康报告。依赖：AG-073、AG-017。验收：本地映射/fixture 先完成；真实上游缺失标 `blocked-external`。
- [ ] **AG-075** `ready` `feature/external`：健康数据多映射、冲突和可解释缺口。依赖：AG-073、AG-018。验收：来源失败不伪造健康事实。
- [ ] **AG-076** `ready` `feature/external`：Weread duration/completion/notes 三条独立链及 identity 完整性。依赖：AG-012、AG-073。来源：D-320。验收：单链失败不覆盖其他链。
- [ ] **AG-077** `ready` `feature/external`：Sireader/Siplayer 仅按公开 API 和稳定 session ID 适配。依赖：AG-023、AG-073。来源：D-1395、BLOCKERS。验收：无公开契约时保持 adapter/fixture，不猜私有 Store。
- [ ] **AG-078** `ready` `bug/external`：source scan 有界分页、短页游标重置和取消。依赖：AG-023、AG-028。来源：D-319。验收：大库、空页、权限错误和重复扫描均可恢复。
- [ ] **AG-079** `ready` `feature`：Loop/Obsidian 导入导出与实际 day semantics。依赖：AG-008、AG-021、AG-046。来源：D-321。验收：不制造假配额/戒断完成，导入报告可复核。
- [ ] **AG-080** `ready` `contract`：API v5、事件 schema、错误码和示例客户端。依赖：AG-016、AG-073。验收：API 版本、分页、权限和 asOf 文档与实现一致。
- [ ] **AG-081** `ready` `external`：Task Horizon consumer contract 和 mock fixture。依赖：AG-080。来源：T-1392/T-1394/T-1165。验收：本地纯函数和契约测试完成；上游采用前标 `blocked-external`。
- [ ] **AG-082** `ready` `feature`：Dock Tomato、health inbox、pending 和来源失败统一入口。依赖：AG-024、AG-059、AG-073。验收：Dock 不复制另一套事实和提醒语义。
- [ ] **AG-083** `ready` `P0` `privacy`：隐私控制中心：数据范围、来源开关、脱敏、清理和导出。依赖：AG-018、AG-073。验收：默认最小授权，危险操作有预览、确认和回滚。
- [ ] **AG-084** `ready` `ui`：来源失败、权限不足、配额限制、超时和降级卡片。依赖：AG-025、AG-073。验收：失败不阻塞本地记录，恢复后可重试并显示时间。

### G6：AI 融入、隐私和评估

- [ ] **AG-085** `ready` `contract`：AI provider abstraction、local-first 策略、能力和成本声明。依赖：AG-003、AG-083。验收：无 provider 时核心流程可用，调用前显示数据范围。
- [ ] **AG-086** `ready` `feature`：自然语言快速记录解析。依赖：AG-005、AG-031、AG-085。验收：文本只生成草稿，不直接写入事实。
- [ ] **AG-087** `ready` `ui/contract`：解析预览、字段高亮、置信度、冲突和手动修正。依赖：AG-086。验收：低置信度必须确认，原文、解析结果和最终事实可对照。
- [ ] **AG-088** `ready` `feature`：suggestion workflow 的接受、忽略、稍后、应用、撤销和反馈。依赖：AG-026、AG-057、AG-087。验收：建议不能静默改规则或事实。
- [ ] **AG-089** `ready` `feature`：回顾草稿、周报和行动建议。依赖：AG-050..055、AG-085。验收：引用事实、显示时间范围和生成时间，数据不足时明确降级。
- [ ] **AG-090** `ready` `privacy`：AI 可解释性、provenance、来源片段和生成/修改边界。依赖：AG-005、AG-087。验收：用户可追溯每个建议，不把模型推测写成事实。
- [ ] **AG-091** `ready` `privacy`：发送前脱敏、字段级同意、撤回和本地清理。依赖：AG-083、AG-085。验收：密钥、正文、敏感来源和日志均按策略隔离。
- [ ] **AG-092** `ready` `test`：AI golden set、对抗集、幻觉、注入、重复和越权评估。依赖：AG-087、AG-090、AG-091。验收：阈值、失败样例和回归命令可追踪。
- [ ] **AG-093** `ready` `reliability`：AI 超时、限流、离线、解析失败和 provider 切换回退。依赖：AG-024、AG-085。验收：核心记录不依赖 AI，失败后仍保留用户草稿。
- [ ] **AG-094** `ready` `governance`：Agent capability、工具权限、操作审计和人工确认门。依赖：AG-083、AG-090。验收：AI 只能调用声明能力，危险写入始终有用户确认和可撤销记录。

### G7：精品门禁（UI、可访问性、安全、性能、发布）

- [ ] **AG-095** `ready` `ui/contract`：完成多 root/root context 在所有页面、弹层和 Dock 的迁移收口。依赖：AG-030、AG-048、AG-070。验收：跨 root 无共享可变状态泄漏。
- [ ] **AG-096** `ready` `ui`：tokens、组件、间距、圆角、层级、动效和双主题全量迁移。依赖：AG-006、AG-048。验收：不再出现页面私有颜色和不可解释的设计漂移。
- [ ] **AG-097** `ready` `ui`：统一状态、按钮、表单、弹层、列表、空态和确认组件。依赖：AG-041、AG-096。验收：主次动作、禁用、危险和加载状态可预测。
- [ ] **AG-098** `ready` `ui/mobile`：280–1280px、Dock、嵌入、横屏和触控走查。依赖：AG-040、AG-096。证据：`node tests/width-walkthrough.cjs` 及截图/缺陷清单。
- [ ] **AG-099** `ready` `a11y`：键盘、焦点、读屏、减少动效、对比度和错误关联。依赖：AG-097、AG-098。证据：`tests/accessibility-audit.test.cjs` 和人工键盘走查。
- [ ] **AG-100** `ready` `i18n`：全量文案 key、复数、日期/数字格式、长文案和伪翻译走查。依赖：AG-005、AG-097。验收：无硬编码用户文案、无截断导致语义丢失。
- [ ] **AG-101** `ready` `security`：动态渲染、HTML、URL、SVG、外部内容和日志边界审计。依赖：AG-025、AG-083、AG-090。来源：D-317、T-1625。验收：协议白名单、转义和拒绝策略均有 adversarial fixture。
- [ ] **AG-102** `ready` `visual`：视觉 harness 覆盖主要页面、双主题、关键状态和原型对照。依赖：AG-096..101。证据：`node tests/visual-qa.cjs`、`CHECKIN_QA_THEME=dark` 和差异记录。
- [ ] **AG-103** `ready` `perf`：首屏、交互响应、滚动、Store 查询、图表和 AI 等待预算。依赖：AG-028、AG-058、AG-098。验收：超预算有诊断，不以关闭功能掩盖问题。
- [ ] **AG-104** `ready` `test`：跨 surface E2E：主窗口→Dock→嵌入→移动、记录→回顾→纠错→恢复。依赖：AG-030..084。验收：核心旅程成功/失败/离线/冲突/撤销均有可重放证据。
- [ ] **AG-105** `ready` `docs`：开发者文档、故障排查、数据契约、UI 状态目录和 handoff 模板。依赖：AG-001..104。验收：新 Agent 可只读本文件和引用文档领取任务。
- [ ] **AG-106** `ready` `release`：最终发布门：检查、构建、测试、视觉、宽度、生态、性能、保护文件和 git diff。依赖：AG-007、AG-102..105。验收：命令实际通过；未能在真实宿主验证的项明确列入 `host-pending`，不伪造 release 结论。

## 5. 条件性、外部阻塞和暂缓队列

这些项目可保留为需求，但不能擅自进入核心 DAG：

| 项目 | 状态 | 开始条件 |
|---|---|---|
| Sireader/Siplayer 稳定 session ID 与跨窗口联动 | `blocked-external` | 上游公开稳定契约和协作环境可用；本地 adapter/fixture 可先做 AG-077 |
| Task Horizon 消费者接入 | `blocked-external` | 上游采用并提供契约；本地 mock/纯函数由 AG-081 完成 |
| 其他生态消费者采用 API v5 | `blocked-external` | 对方明确采用版本和字段 |
| points/exchange、Story Mode、CalDAV | `decision-needed` | 产品明确价值、数据模型、隐私和维护成本 |
| 云同步、远程推送、跨设备账号体系 | `decision-needed` | 安全模型、服务成本、宿主能力和用户授权明确 |
| 完全自动执行的 AI Agent 写入 | `deferred` | 仅在权限、审计、确认、撤销和安全评估达标后重新评审 |

外部阻塞不能阻塞本地可靠记录、Review 和导入导出；适配器必须提供本地降级和清晰的 `blocked-external` 状态。

## 6. 旧清单映射和去重规则

旧文件 [`pre-merge-development-backlog-2026-10-02.md`](pre-merge-development-backlog-2026-10-02.md) 保留 930 条 PM 原始需求，作为研究/追溯池，不再作为 Agent 直接领取队列。映射规则如下：

| 旧 PM 范围 | 主题 | 本文件主工作包 |
|---|---|---|
| PM-001..140 | 基线、核心行为、数据与测试 | AG-001..041 |
| PM-141..320 | 目标、生命周期、长期数据与体验 | AG-008..069 |
| PM-321..360 | 源码审计、边界 Bug、可靠性 | AG-008..029、AG-101..104 |
| PM-361..500 | AI、隐私、安全与评估 | AG-085..094、AG-101 |
| PM-501..600 | 产品定位、IA、生命周期、回顾 | AG-042..069 |
| PM-601..690 | 视觉、指标、质量与治理 | AG-005..007、AG-095..106 |
| PM-691..740 | 生态、互操作、采用与客户成功 | AG-073..084、条件性队列 |
| PM-741..755 | 来源审计与可信度 | AG-018、AG-023..029、AG-073..084 |
| PM-756..821 | 用户顺畅度、移动、可访问性 | AG-030..041、AG-095..104 |
| PM-822..930 | UI 原型 v2 | AG-006、AG-030、AG-042、AG-048、AG-050、AG-061、AG-070、AG-095..102 |

去重规则：一个结果只保留一个 canonical AG；跨越两个独立数据契约或三个以上验收族时拆分；旧任务已完成时只保留来源和证据；同一结果以 `supersedes` 指向旧 ID，不复制为新的 `ready`。

## 7. Agent 领取、完成和交接模板

领取时在本文件对应条目补充：

```text
owner: <agent/task path>
claimed_at: <UTC>
plan: <审计 → 契约 → 实现 → 测试 → 文档>
files_in_scope: <真实路径>
out_of_scope: <明确列出>
dependencies_checked: <AG IDs + evidence>
```

完成时补充：

```text
status: done | host-pending | blocked-external | decision-needed
implemented: <用户可观察结果>
tests:
  - command: <实际命令>
    result: pass | fail | host-pending
evidence:
  logic: <路径或测试名>
  contract: <路径或 fixture>
  ui: <路径/截图>
  visual: <产物>
  a11y: <命令/结果>
  perf: <基准/预算>
  host: <真实宿主或明确未测>
risks: <剩余风险>
rollback: <回滚方式>
handoff: <下一个 AG ID 和原因>
```

如果遇到以下任一情况必须停止实现并转状态：需要猜测思源 API；需要改受保护文件；需要新的 Store/schema 但没有决策；上游契约缺失；UI 没有唯一主动作、返回路径或错误态；基线测试失败且原因尚未分类。

## 8. 验证命令索引

按工作包选择最小充分证据；不要为了“绿色”跳过失败：

```powershell
pnpm run check
pnpm test
pnpm run test:ui
pnpm run test:mobile
pnpm run test:ecosystem
pnpm run test:perf
pnpm run check:release
pnpm run test:quality
node tests/visual-qa.cjs
$env:CHECKIN_QA_THEME='dark'; node tests/visual-qa.cjs
node tests/width-walkthrough.cjs
git diff --check
git status --short --branch
```

命令未执行、真实宿主不可用或外部服务不可用时，证据必须如实标记 `host-pending`/`blocked-external`。本文件不把计划命令写成已经通过的测试结果。

## 9. 当前维护动作

- 本文件是唯一可领取队列；旧 PM 清单、调研和原型是来源，不直接领取。
- 每次完成工作包只更新对应状态和证据，不删除未完成任务。
- 每个里程碑复查 `TODO/PROGRESS/BLOCKERS/DECISIONS`，把已交付的 AG 标为 `done`，把新增问题追加为新的 AG ID。
- 合并前必须完成 AG-106，且所有 `P0` 未完成项都有明确 `blocked-external`、`decision-needed` 或用户认可的延期记录。
