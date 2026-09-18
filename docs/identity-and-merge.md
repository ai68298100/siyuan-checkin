# 记录身份与多端合并规则（对外契约）

> 面向第三方集成者与未来多端同步的公开契约说明。本文描述的所有行为都有测试锁定（`tests/skip-model.test.cjs`、`tests/api-contract.test.cjs`、`tests/tombstone-*.test.cjs`、`tests/normalized-transaction.test.cjs`）。历史数据不做 id 迁移；新集成方只需遵守 externalRef 约定。

## 一、事件的四层身份

一条打卡记录（`CheckinEvent`）的身份由四层共同决定，从强到弱：

| 层 | 字段/规则 | 说明 |
| --- | --- | --- |
| 1. 存储主键 | `id` | 运行时生成（`makeId("event")` → `event-<时间36进制>-<随机>`），**非确定性**；仅用于唯一性与墓碑对应 |
| 2. 幂等通道 | `externalRef` | 外部系统驱动的写入（`source:"api"` 等）必须携带的幂等引用，见第三节 |
| 3. 语义身份 | `itemId + localDate + source` | 人类可读的"谁在哪天干了什么"；统计口径按此聚合 |
| 4. 历史补全 | `event-legacy-*` | 早期版本无 id 的事件按内容稳定哈希补 id（确定性，跨窗口一致） |

## 二、写入边界与去重

`appendEvent / appendEvents`（写入口，手动/批量/导入/API 全部经由）按以下顺序拒绝候选事件：

1. **id 冲突**：与已有事件 id 相同 → 丢弃；
2. **externalRef 幂等**：`[itemId, source, externalRef]` 三元组已存在（含墓碑记录的外部身份）→ 丢弃（幂等重放返回已有结果）；
3. **墓碑**：id 或外部身份命中墓碑 → 永久拒绝复活（删除即终态）；
4. **规范化**：进入 store 前经 `normalizeEvent` 词表校验（kind/source/unit 等），非法字段裁剪而非丢弃记录。

`externalRef` 空缺的事件（手动打卡）不做幂等去重——同一项目同一天允许多条真实记录（次数型）。

## 三、externalRef 约定（新集成的接入方式）

格式：`<前缀>:<外部身份>:<本地日期>`，例如 Task Horizon 使用 `taskhorizon:<blockId>:<localDate>`。

- 前缀即来源注册名（v18 开放 externalRef 前缀注册）；本地日期必须是设备本地时区日历日（`YYYY-MM-DD`）；
- **派生规则必须确定性**：同一外部实体在同一日期重复触发必须产出同一 externalRef——这是多端/多窗口幂等的基础（mhabit 确定性 UUID 思路的等价物）；
- 不迁移历史 id：已入库事件的 `id` 永不重写；换设备迁移依赖 JSON 备份全量搬运或按 externalRef 幂等重放。

## 四、合并与冲突

- **规范化即迁移**：`normalizeStore` 读入任意旧版本数据并重打当前 `STORE_VERSION`（现为 3，D-216）；写前快照（恢复点）由持久化管线自动生成；
- **合并**（`mergeNormalizedStores`）：项目与墓碑按 id 并集；事件按 id 并集后做 externalRef 去重；无引用冲突时字段级保留规范胜出者；
- **冲突检测**：写前指纹（JSON stringify）与回读比较（`detectNormalizedStoreConflict`），产出变更项目/事件清单供诊断；多窗口写收敛由存储锁 + 写后校验保证；
- **多窗口回写**（笔记锚点属性，D-218）：经内核 API 天然 last-writer-wins，打卡数据本体仍受存储锁保护。

## 五、版本化承诺

- `STORE_VERSION` 变更只增不减；旧版本数据在加载时无损升级（v2→v3 升级仅新增可选字段，缺省语义不变）；
- 新版本读旧数据：永远支持；旧版本读新数据：未知字段被逐字段构造丢弃（如 v3 的 `kind`），属已记录限制，恢复点可回滚；
- 公共 API（`window.siyuanCheckin`）不暴露存储结构；第三方一律走 API 与本文档约定。
