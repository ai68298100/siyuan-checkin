# 数据导出与导入格式总览（对外说明）

> 小驴打卡是本地优先插件：所有数据归用户所有，可随时完整导出、可迁入迁出。本文覆盖全部五条导出通道与四条导入通道。格式行为由测试锁定。

## 导出通道三件套 + Loop / Obsidian 迁出

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

### 5. Obsidian Habit Tracker 21 迁出（设置 → 导出 Obsidian 习惯文件，T-1283）

- 每个活跃项目生成一个习惯 `.md` 文件：frontmatter `title` + `entries`（YYYY-MM-DD 完成日数组，升序）；
- 完成日 = 有真实（非跳过）事件的日期；跳过记录 H21 无对应语义，不导出；无完成日与超出上限（30 个文件）的项目计入跳过数并如实提示；
- 文件名由项目名消毒生成（去除 `\/:*?"<>|` 等字符，冲突自动加后缀）；
- 可直接放入 Obsidian 仓库的 Habits 目录被 Habit Tracker 21 读取。

## 导入通道

| 通道 | 入口 | 格式要点 | 幂等与安全 |
| --- | --- | --- | --- |
| JSON 备份恢复 | 设置 → 导入 JSON | 本插件导出的 JSON（v2/v3） | 恢复点先行；恢复审计 |
| CSV 记录导入 | 设置 → 导入 CSV | 表头需含 `名称`、`日期`；可选 `数值`、`单位` | `source=import`；按 项目+日期+值+单位 去重；确认框先行 |
| Loop CSV | 设置 → 从 Loop 导入 | Habits.csv +/或 Checkmarks.csv（可多选） | YES_NO 完成日导入；数值习惯仅建项目；SKIP 日不迁移（见降级说明）；确认框先行 |
| Obsidian 习惯文件 | 设置 → 从 Obsidian 导入 | Habit Tracker 21 习惯 `.md`（frontmatter `entries` 完成日数组，可多选） | 每日二值项目 + `source=import` 事件；`externalRef=obsidian21:<文件名>:<日期>` 幂等；外部身份与同日双重去重；确认框先行；颜色与 maxGap 容忍不迁移 |

## 第三方接入说明

1. **把你们的打卡数据导入小驴打卡**：产出我们 CSV 导入格式（表头 `名称,日期[,数值,单位]`，日期 `YYYY-MM-DD`）即可，或直接产出 JSON 备份结构；
2. **从小驴打卡迁出**：JSON（全量）/CSV（事件级）/Loop CSV（习惯语义级）/Obsidian H21（习惯语义级）任选；
3. **运行时集成**不走文件：使用 `window.siyuanCheckin` API（`events.read` / `events.record` / `analytics.read` / `suggestions.read` 等能力）与 externalRef 幂等约定，见 `docs/identity-and-merge.md`；
4. 格式行为由测试锁定（`tests/backup.test.cjs`、`tests/insight-records.test.cjs`、`tests/loop-csv.test.cjs`、`tests/obsidian-habits.test.cjs`、`tests/report-sections.test.cjs`、`tests/api-contract.test.cjs`）；破坏性变更有迁移期与版本警告。

## 保存通道（按宿主形态分流）

五条导出通道共用一条保存路径（`src/download.ts` 的 `saveGeneratedFile`）：

- 思源 Android / iOS / 鸿蒙客户端（检测到 `JSAndroid.saveExportFile`、`webkit.messageHandlers.saveExportFile` 或 `JSHarmony.saveExportFile`）：先用 `/api/file/putFile` 写入工作区 `assets/siyuan-checkin-<类型>-<日期>-<时间戳>.<扩展名>`，再把该绝对 URL 交给宿主的 `saveExportFile`；宿主按前端能力拒绝（返回 `status:"error"`）时退回容器原生桥。**这些容器下绝不使用 `blob:` + `<a download>`**——WebView 没有下载处理，会把 blob 当成一次导航。
- 桌面端与普通浏览器：仍走临时 `Blob` + `<a download>`，不写入工作区。
- 文件名主干只保留 ASCII 安全字符（非 ASCII 收敛为 `-`，为空则用 `export`），扩展名按原名保留，并附时间戳避免同名覆盖。
