# 小驴打卡 × Task Horizon 开发者交接 R2

2026-10-16；代码基线 **v18.17.6**，R2 为沟通材料修订。本包用于合作方案、分工和验收确认，当前尚未声明日历/完成回写合作就绪。

请先阅读 [开发者合作说明](docs/taskhorizon-developer-handoff-2026-10-16.md)。转发时可复制 [话术正文](可直接发送的话术.txt)，随附本 ZIP 即可。

## 文件

- [主说明](docs/taskhorizon-developer-handoff-2026-10-16.md)：两批合作范围、当前状态、接口边界、分工、共同验收及三个确认问题。
- [十项处理清单](docs/taskhorizon-provider-review-2026-10-16.md)：逐条回应 C-01～C-04、W-01～W-06。
- [验证记录](docs/taskhorizon-validation-2026-10-16.md)：本轮定向检查、新发现的日期纯规划复现、此前发布证据及待验收项。
- [原始来件](docs/contracts/incoming/checkin-provider-fix-guidance-2026-10-12.zh-CN.md)：字节不变的归档副本。
- [API v5 参考](docs/api-v5.md)及[基础 manifest](docs/contracts/checkin-api-v5.json)：当前通用接口；API 参考中未打包的背景链接已指向 v18.17.6 固定 tag。
- [日历 fixture 草案](docs/contracts/upstream-proposals/taskhorizon-calendar-consumer-v1.json)：仍为 draft，不表示新增生命周期/投影字段已交付。
- [日期复现脚本](docs/verification/date-planner-audit.cjs)及[输出](docs/verification/taskhorizon-handoff-date-audit.json)：只运行完整源码检出的纯规划器，不读写宿主数据，运行方式见验证记录。
- [文件摘要](SHA256SUMS.txt)：除摘要文件自身外，包内全部文件的 SHA-256。

## 使用边界

本包未包含旧 v4 bridge、consumer kit、长 Issue 草案、历史规划或新合作生产消费端。新合作单条也必须使用 v5 batch；我方先完成 C-01/02/03、W-03/W-06 并交付候选版与 fixture，再共同接入和验收。双方现场尚未完成，内部循环及撤回另立契约。

R2 更新文件以本附件为准，不假定已在旧 tag 中。生产代码与安装包仍为 [v18.17.6 Release](https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.17.6)，本包不另附安装包或用户数据。
