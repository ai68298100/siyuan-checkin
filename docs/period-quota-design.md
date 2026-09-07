# 周期配额设计

这份设计定义 weekly/monthly quota 的数据和统计边界。当前版本只提供 `src/rules.ts` 中的纯函数合同，不把 quota 写入既有 `CheckinSchedule`，也不改变旧项目的统计结果。

## 数据模型

在后续存储版本中，为 `CheckinSchedule` 增加可选字段：

```ts
type ScheduleType = "daily" | "weekly" | "workdays" | "custom" | "interval" | "quota";

interface CheckinSchedule {
    type: ScheduleType;
    weekdays?: number[];
    intervalDays?: number;
    anchorDate?: string;
    quota?: {
        period: "week" | "month";
        amount: number;
        countMode: "dates" | "value";
        weekStartsOn?: 1;
    };
}
```

`countMode: "dates"` 表示一个自然日最多贡献一次，适合“每周运动 3 天”；`countMode: "value"` 表示按事件值累加，适合“每月阅读 600 分钟”。单位仍由当日生效的 revision 决定，不跨单位换算。

`quota` 与 `interval` 是不同语义：interval 产生离散的到期日，quota 产生一个周期窗口。二者不能同时出现；编辑器保存时必须拒绝或明确转换。

## 迁移

- 存储版本保持向后读取：没有 `quota` 的旧 schedule 原样归一化为 daily/workdays/weekly/custom/interval。
- 新字段只接受合法周期、正整数/正数配额和合法日期；非法字段丢弃并回退旧规则。
- `target`、`unit`、`revisions` 不迁移成 quota。旧项目的历史分母因此保持不变。
- 引入 quota 时将存储版本递增，并为每个 revision 归一化 `quota`，保证历史日期仍使用当时的周期规则。
- 导入未知 quota 字段时保留核心项目和事件，忽略无法验证的规则，不阻塞整个文件导入。

## 统计分母

周期窗口以本地日历边界计算：周为周一至周日，月为自然月。统计截止日当天属于进行中窗口：

- 已结束周期：进入分母；达标周期进入分子。
- 当前周期：不进入完成率分母，但页面显示“已完成 / 配额”和“还差 N”。
- `dates` 模式：分子是有合格记录的不同自然日数量；同日多次记录只计一次。
- `value` 模式：分子是同单位事件值之和；超额只计入当前周期，不结转下一周期。
- 归档、创建前和暂停期间不产生配额机会。没有事件代表未完成，零值事件仍保留事实记录。
- 周期缺失时完成率显示“暂无”，不要用 0% 暗示失败。

今日卡片只显示当前周期进度，不把 quota 项目混入“今日计划日完成数”；历史日历显示周期状态而不是伪造每日失败。总结和洞察应使用同一份周期计算结果，避免一个页面按天、另一个页面按周期。

## 接入阻塞点

正式接入前仍需确定：

1. quota 是否允许按不同日期计数与按数值计数以外的模式。
2. 周起始日是否固定为周一，是否需要用户时区字段。
3. 目标/单位 revision 在一个周期内变化时，周期应按事件发生日拆分，还是按周期开始日锁定。
4. 当前周期是否显示预计达标率，以及跨周期修订如何展示。
5. 导入导出 schemaVersion 和旧客户端遇到 `type: "quota"` 时的降级行为。

在这些问题确定前，不应把 `quota` 加入编辑器或修改 `analytics.ts` 的 `scheduledDays` 语义。当前 `evaluatePeriodQuota` 可作为 fixture 和 UI 的唯一计算入口，先完成 schema 评审再接入存储迁移。
