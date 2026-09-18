# 数据导出与导入格式总览（对外说明）

> 小驴打卡是本地优先插件：所有数据归用户所有，可随时完整导出、可迁入迁出。本文覆盖全部四条导出通道与三条导入通道。格式行为由测试锁定。

## 导出通道三件套 + Loop 迁出

### 1. JSON 全量备份（设置 → 导出 JSON；回顾页更多菜单同入口）

- `serializeJson` 输出完整 `CheckinStore`（version 3）：`items` / `events` / `eventTombstones` / `templates`；
- 含恢复点语义：导入/恢复前自动生成快照（写前快照管线）；
- 导入：设置 → 导入 JSON；接受 v2/v3 数据并自动迁移（`parseJsonBackup`，其他版本给出警告）。

### 2. CSV 记录导出（设置 → 导出 CSV）

一行一条打卡事件，UTF-8 带 BOM，RFC 风格引号转义。表头（与 `serializeCsv` 逐字段一致）：

```csv
eventId,itemId,itemName,occurredAt,localDate,value,unit,source,note,externalRef
```

### 3. Markdown 报告（回顾页 → 导出报告 / 复制报告）

- 周报/月报/自定义范围，五区块可配置：记录条数、完成概览、项目明细表、上一周期对比、亮点与说明（T-1217）；
- 面向人阅读与归档，不提供机器导入。

### 4. Loop Habit Tracker CSV 迁出（设置 → 导出 Loop CSV）

- 两个文件：`Habits.csv`（12 列官方格式）+ `Checkmarks.csv`（`Date,<习惯名...>` 组合格式）；
- 迁出映射：binary → YES_NO_HABIT（1/1 频率），count/duration/quantity → MEASURABLE（含单位与目标）；quota 周 N 次 → N/7、月 N 次 → N/30（超过 7/31 钳制）；
- 可直接被 Loop 或支持该格式的应用导入。

## 导入通道

| 通道 | 入口 | 格式要点 | 幂等与安全 |
| --- | --- | --- | --- |
| JSON 备份恢复 | 设置 → 导入 JSON | 本插件导出的 JSON（v2/v3） | 恢复点先行；恢复审计 |
| CSV 记录导入 | 设置 → 导入 CSV | 表头需含 `名称`、`日期`；可选 `数值`、`单位` | `source=import`；按 项目+日期+值+单位 去重；确认框先行 |
| Loop CSV | 设置 → 从 Loop 导入 | Habits.csv +/或 Checkmarks.csv（可多选） | YES_NO 完成日导入；数值习惯仅建项目；SKIP 日不迁移（见降级说明）；确认框先行 |

## 第三方接入说明

1. **把你们的打卡数据导入小驴打卡**：产出我们 CSV 导入格式（表头 `名称,日期[,数值,单位]`，日期 `YYYY-MM-DD`）即可，或直接产出 JSON 备份结构；
2. **从小驴打卡迁出**：JSON（全量）/CSV（事件级）/Loop CSV（习惯语义级）任选；
3. **运行时集成**不走文件：使用 `window.siyuanCheckin` API（`events.read` / `events.record` / `analytics.read` / `suggestions.read` 等能力）与 externalRef 幂等约定，见 `docs/identity-and-merge.md`；
4. 格式行为由测试锁定（`tests/backup.test.cjs`、`tests/insight-records.test.cjs`、`tests/loop-csv.test.cjs`、`tests/report-sections.test.cjs`、`tests/api-contract.test.cjs`）；破坏性变更有迁移期与版本警告。
