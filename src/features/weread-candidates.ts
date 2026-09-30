/* T-1742（D-366）：微信读书三种项目映射的候选过滤——纯投影。
   阅读时长只候选"分钟"单位（与写入校验 hasMinuteTarget 同纪律）；完读每本一次
   适合二值项目；笔记计数适合数值项目。当前绑定项永远保留（retained，避免归档或
   排到候选窗口外后设置页丢失真实绑定）；不自动合并同一项目多指标。 */
import type {CheckinItem} from "../types";

export type WereadMetric = "minutes" | "binary" | "numeric";

export interface WereadCandidates {
    items: CheckinItem[];
    /** 当前绑定项不在候选窗口内时置顶保留。 */
    retained: CheckinItem | undefined;
}

const matchesMetric = (item: CheckinItem, metric: WereadMetric): boolean => {
    if (metric === "minutes") return item.unit === "分钟";
    if (metric === "binary") return item.kind === "binary";
    return item.kind !== "binary";
};

export function wereadCandidates(items: readonly CheckinItem[], selectedId: string, metric: WereadMetric, windowSize = 200): WereadCandidates {
    const active = items.filter((item) => !item.archived && matchesMetric(item, metric));
    const visible = active.slice(0, windowSize);
    const selected = selectedId ? items.find((item) => item.id === selectedId) : undefined;
    const retained = selected && !visible.some((item) => item.id === selected.id) ? selected : undefined;
    return {items: retained ? [selected as CheckinItem, ...visible] : visible, retained};
}
