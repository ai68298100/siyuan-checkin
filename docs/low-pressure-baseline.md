# 低压力呈现与包容性设计基线（T-1461 · R-A13，2026-09-26）

本文把「低压力」从设计原则落成可验收的工程规范（战略方向 24）。后续所有 UI/文案批次按本基线自检；`tests/low-pressure-baseline.test.cjs` 是它的自动守门。依据与候选来源见 `docs/benchmark-habit-apps-2026-09.md` 第十五节（NN/g、Apple HIG / Material / WCAG 2.2、viridis 色阶共识、PMC 红绿配色临床证据、66 天自动性研究、Duolingo streak freeze dark pattern 批判）。

## 一、色彩：单色亮度阶梯 + 冗余编码

1. 热力图/日历/渲染块的强度色阶只用**紫罗兰主色的单色亮度阶梯**（`color-mix(in srgb, var(--lc-checkin-accent) N%, var(--lc-checkin-surface))`，感知均匀、色盲安全，双主题只调端点）。不得引入红绿对举或彩虹映射。
2. 强度信息**不得只靠颜色承载**：年热力图每格带 `<title>` 悬停详情；月历格保留日期数字；图例与文字标签并存。新可视化必须同时给文字/数字通道。
3. **低完成度不上警示红**：漏卡、落后、失速是「数据」，不是「错误」。`--lc-checkin-danger` 只用于保存失败、写冲突、数据损坏等真实错误态。SKIP 用中性色，断签不做红色惩罚视觉。
4. 完成态用 success 色 + 文案，不与 danger 形成红绿情绪对举（如「红=差/绿=好」的 mood 映射禁用；情境统计用蓝紫渐变）。

## 二、文案：calm 禁则与双日规则

1. **禁则词表**（用户可见文案禁止出现）：「你落后了」「前功尽弃」「归零」「补签罚款」类愧疚/惩罚措辞。断签表述用「重置/回到节奏」，不用「清零/失败」。
2. **双日规则**（失速卡固定收尾）：断一天是数据，连断两天才是信号——单日漏卡只陈述事实，不渲染危机。对应键 `report.stalledNote`。
3. 事实、推断、建议三态分开表述（低压力纪律）：推断注明样本量与观察窗；建议用「可选」语气；不顺手上纲到人格评价。
4. 提醒/安静时段文案沿用既有安静口径；「延后」「跳过」永远是一等操作，不设负 wording。
5. 依据备注：66 天是习惯自动性研究中位数（个体 18~254 天），「单日中断影响有限」有据可依——文案不做「连击归零」式恐吓。

## 三、无障碍：三通道冗余

1. **完成/失败/跳过等关键状态必须颜色 + 图标/文字 + 语义标记三通道静态可辨**；动效（庆祝弹跳等）只是增量，`prefers-reduced-motion` 或偏好关闭时降级不失效（T-1411 双闸口径）。
2. 可打卡状态按钮带可读文本（「打卡/撤销/记录」），不只靠颜色或对勾图形。
3. 弹层焦点、role=status/alert、aria-disabled 等沿用 `tests/ui-state-ledger.test.cjs` 八状态族台账；本基线不重复断言。

## 四、触控：移动宿主 44px 基线

1. 移动宿主（`lc-checkin-host--mobile` / `lc-checkin-dialog-host--mobile`）下的**主要打卡目标 ≥44px**：记录按钮、步长按钮、增量 chips（T-1462）、today 渲染块按钮、底部导航。守门在 `tests/low-pressure-baseline.test.cjs`（规则在 `src/ui/components.scss` 的「T-1461 低压力触控基线」块）。
2. **dock 密度布局例外**：`lc-checkin-dock-host` 的 30px 按钮预算是桌面指针环境产物，不强制 44px；若 dock 出现在触控环境由宿主移动标记决定走基线。
3. 新增可点控件默认给 `min-height`；小于 44px 的必须落在桌面/指针上下文并注明理由。

## 五、操作：undo 优先于确认弹窗

1. **低风险、可逆操作不弹确认**：toast/撤销即可（NN/g user-control 原则）。打卡/撤销/改备注/删除单条记录走撤销与审计通道。
2. **保留确认的高危清单**（2026-09-26 全量审计，共 17 处 `window.confirm`，全部为不可逆/大批量/外部副作用操作）：删除项目及全部记录、今日/归档批量删除、导入（JSON/CSV/Loop/Obsidian）、恢复快照、清空快照历史、重置全部偏好、微信读书清除 Key、dock 收件箱丢弃/撤销跳过、图标库导入。新增确认弹窗前先对照此表——能撤销的不要弹窗。
3. 任何写路径的失败提示必须带「下一步」（重试/查看诊断），不留死胡同。

## 六、守门映射

| 规则 | 自动守门 |
| --- | --- |
| 色阶单色 + 冗余编码 | `low-pressure-baseline`（charts.ts `<title>` + scss 色阶仅 accent/surface/muted） |
| calm 禁则 / 双日规则 | `low-pressure-baseline`（i18n 双语值扫描 + `report.stalledNote` 接线） |
| 触控 44px | `low-pressure-baseline`（scss 规则块）+ `mobile-release-quality` 既有结构门禁 |
| 三通道/状态台账 | `ui-state-ledger`（不重复） |
| undo/确认清单 | 本文档第五节清单（新增确认需同步更新此表，测试断言表存在） |
| 真机触控/显示 | 保持 host-pending，不在本基线内关闭 |
