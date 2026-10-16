# Task Horizon 合作材料验证记录

日期：2026-10-16。版本：小驴打卡 18.17.6，公开 API v5。对应发布入口：[v18.17.6](https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.17.6)。源码与 Release 的最终核验记录见仓库 PROGRESS。

正式 Release 已发布，tag 指向 `97d8ae94065f1bc16a343a4f6d4ce865dcc96548`。资产已回下载，确认与本地发布包逐字节一致、ZIP 完整且清单版本为 18.17.6。发布源码的 [CI run 38827502945](https://github.com/ai68298100/siyuan-checkin/actions/runs/38827502945) 中 verify、browser-audit 均成功。

## 当前通过的验证

| 验证 | 结果与证据 |
| --- | --- |
| `pnpm run test:quality` | EXIT 0；环境、类型、生产构建、主/UI/旧样式/移动/生态/扩展/回顾对比/性能、摘要同步、发布资产与四步回滚演练全部通过；本地日志 `.artifacts/release-18.17.6-quality.log` |
| 契约/行为定向 | API v5、方向修订、Task Horizon contract/bridge/mock、calendar projection/consumer kit、upstream proposals、API/生态文档及架构边界通过；最终文档修改后补跑 contract、upstream proposals、API v5 docs 均通过 |
| Chrome 视觉 | 显式使用 Google Chrome，浅/深主题 `tests/visual-qa.cjs` EXIT 0，均 `pageErrors=[]` |
| Chrome 宽度与交互 | `tests/width-walkthrough.cjs` EXIT 0：56 个表面场景、32 个交互状态、8 个主题/色板对比度场景、10 个混合项目布局、真实记录表单动作和 16 个长内容维护/历史场景；本地日志 `.artifacts/release-18.17.6-width-light.log` |
| 可访问性与 CSS | 自动审计缺名、正 tabindex、键盘不可达和对比度违规均为 0，覆盖 1345 组对比；CSS 669430 bytes，低于 660 KiB 硬线，保留 620 KB 软提醒；785 类 token、死类 0 |
| 原始来件 | 归档文件与原件逐字节一致，SHA-256 `656c79e3f6a7d85ae85bcd2d28739c9d382e00a9953a1517149261fbf0965599`；Git 对该原件禁用文本行尾转换 |
| 安装包 | `package.zip` 882112 bytes；SHA-256 `2423592e00db72773a35a47a7c1c27db531842c465cf7ca49c452da294df8d5a`；已过资产清单检查与回滚演练 |

完整质量链首轮暴露旧的源码结构正则依赖 `inputs.length/Promise.resolve([])` 写法；该断言已由运行真实生产方法的空批次/非法输入行为测试覆盖，修正后完整链通过。没有放宽性能或 CSS 门禁。

## 在仓库复现

安装依赖后，完整验证使用 `pnpm run test:quality`。合作专项可运行：

```powershell
node tests/api-v5.test.cjs
node tests/calendar-projection.test.cjs
node tests/task-horizon-contract.test.cjs
node tests/task-horizon-bridge.test.cjs
node tests/task-horizon-mock-consumer.test.cjs
node tests/calendar-consumer-kit.test.cjs
node tests/upstream-proposals.test.cjs
```

浏览器走查设置 `CHECKIN_BROWSER` 为本机 Chrome 可执行文件绝对路径，然后依次运行 `node tests/visual-qa.cjs`（`CHECKIN_QA_THEME=light/dark`）及 `node tests/width-walkthrough.cjs`。文件包中的契约工具可用于消费方自检；以上仓库测试需在完整源码检出中运行。

## 验证边界

- 这些结果证明本版本提供端及参考消费层的指定行为，未证明 Task Horizon 真实消费端已接入。
- C-01/02/03、W-03 和 W-06 合作迁移仍有未完成项；两种 integrationContracts 均未声明。
- 指定思源 3.8.7 独立存储实验已完成快照基准、双窗口并发和受控插件写失败重载；自然 I/O 故障、Android/TalkBack、第三方账号、缩放/保存面板及双插件现场仍待验证。
- v4 bridge 的待处理队列在内存中，single 可能另进入提供端自动恢复队列；本包不是新合作的生产接线实现。
