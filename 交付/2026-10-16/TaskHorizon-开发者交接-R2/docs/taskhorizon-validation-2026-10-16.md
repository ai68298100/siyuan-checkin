# Task Horizon 合作材料验证记录 R2

日期：2026-10-16。代码基线：小驴打卡 **v18.17.6**（公开 API v5），固定 commit `97d8ae94065f1bc16a343a4f6d4ce865dcc96548`。R2 为材料修订；本轮未修改生产代码、安装包或发布状态。

主入口：[开发者合作说明](taskhorizon-developer-handoff-2026-10-16.md)。本记录分别列出本次 R2 检查、此前发布证据和待验收事项。

## 本次 R2 检查

以下定向检查在本次材料修订后顺序执行，全部 EXIT 0。没有重新执行完整质量链、浏览器走查或双插件现场。

| 检查 | 结果与范围 |
| --- | --- |
| `node tests/api-v5.test.cjs` | 通过：真实生产 batch 规划与宿主边界，含身份、历史修订、回执和输入快照 |
| `node tests/calendar-projection.test.cjs` | 通过：投影、隐藏、六状态、范围/数量上限和隐私边界 |
| `node tests/task-horizon-contract.test.cjs` | 通过：现有 Task Horizon 身份、重放、墓碑与触发边界；不代表 W-03 新限制已实现 |
| `node tests/upstream-proposals.test.cjs` | 通过：draft fixture 与既有源码/文档约束；不把 draft 变为生产契约 |
| `node tests/api-v5-docs.test.cjs` | 通过：源码/manifest/参考文档，20 项能力与 8 项现有数据事件同步；生命周期不在此八项内 |
| `node tests/ecosystem-docs.test.cjs` | 通过：通用生态文档约束 |
| `git diff --check` | 通过：本轮文本差异无空白错误 |

上述仓库测试须在完整源码检出并安装依赖后运行。固定源码入口为 [v18.17.6](https://github.com/ai68298100/siyuan-checkin/tree/v18.17.6)，R2 更新的文档和 draft 以本附件为准；它们尚不能假定存在于旧 tag 中。

### 新发现：非法时刻会被归一化

本次直接运行生产 `planBatchRecord`，使用合成 count + daily 项目、显式 `source: "api"`、单位和合法 `taskhorizon:synthetic-block:2026-02-28` 身份；未启动思源宿主、未写入存储、未使用用户数据。宿主本地时区为 Asia/Shanghai。

| 输入 occurredAt | 规划器结果 | 规划 UTC 时刻 | 规划本地日 |
| --- | --- | --- | --- |
| `2026-02-30T10:00:00+08:00` | `recorded` | `2026-03-02T02:00:00.000Z` | `2026-03-02` |
| `2026-04-31T10:00:00+08:00` | `recorded` | `2026-05-01T02:00:00.000Z` | `2026-05-01` |
| `2026-02-28T24:00:00+08:00` | `recorded` | `2026-02-28T16:00:00.000Z` | `2026-03-01` |

这里的 `recorded` 只是纯规划器分类，不是实际落盘回执。当前 `normalizeValidIso` 检查带时区格式后使用 `Date.parse`，不能保证真实月日/小时合法；Task Horizon 身份日也尚未与该落账日校验。本问题纳入 W-03，严格时间校验及不一致阻塞仍待实现，不能将复现结果当作允许滚日的契约。

包内提供 [复现脚本](verification/date-planner-audit.cjs) 和 [本次输出](verification/taskhorizon-handoff-date-audit.json)。脚本仅需完整仓库及其 TypeScript 依赖，不执行宿主读写。在仓库目录安装依赖后，将以下两个占位路径替换成实际绝对路径运行：

```powershell
node "<R2附件目录>/docs/verification/date-planner-audit.cjs" "<完整源码检出目录>"
```

脚本会在其所在目录写入同名 JSON 结果；其它时区的 plannedDate 应按该宿主本地日解释，UTC 归一化结果不变。无需修改真实插件数据。

## 此前 v18.17.6 发布证据

- [正式 Release](https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.17.6)，非 draft、非 prerelease，tag 指向上述固定 commit。
- [CI run 38827502945](https://github.com/ai68298100/siyuan-checkin/actions/runs/38827502945)：`verify`、`browser-audit` 成功。
- 此前发布验收已通过完整 `pnpm run test:quality` 与 Chrome 明暗主题/宽度走查；它们属于发布阶段证据，本次 R2 未重跑，不等于双方联调验收。
- Release `package.zip` 已回下载并核对，882112 bytes，SHA-256：`2423592e00db72773a35a47a7c1c27db531842c465cf7ca49c452da294df8d5a`。本次不重新构建或夹带另一份安装包；需要安装时从该 Release 获取。
- 原始来件与归档逐字节相同，SHA-256：`656c79e3f6a7d85ae85bcd2d28739c9d382e00a9953a1517149261fbf0965599`。R2 包内副本仍须保持此摘要。

## 尚未通过的合作验收

- C-01/02/03、W-03 和 W-06 合作迁移未收口，两个拟议 integrationContracts 均未声明。
- batch 不进入 single pending 的源码路径已有依据，但“batch 失败→重载→无自动补写副本”仍缺专项验收；不能用旧 single 失败恢复实验代替。
- 没有 Task Horizon 当前消费端接入及真实双插件现场通过证据；桌面、独立窗口、移动端和双方实际联调需共同记录。
- 已有独立思源存储实验不代替上述合作验收，也不证明内核自然 I/O 故障恢复。
- 本包中的日历 fixture 为 draft；不包含 legacy bridge、旧 consumer kit 或可直接投产的新消费端实现。
