/* T-1745（D-369）：健康收件箱映射候选——纯投影。
   步数只候选"步/步数"单位、体重只候选"公斤/千克/kg"单位的活跃项目（与写入校验
   hasHealthTarget 同纪律，把失败提前到候选层）；当前绑定项永远保留（retained）；
   已被其他绑定占用的指标-项目对保持可选（同项目多指标语义保持）。 */
import type {CheckinItem} from "../types";

export type HealthMetric = "steps" | "weight";

export interface HealthCandidates {
    items: CheckinItem[];
    retained: CheckinItem | undefined;
}

const matchesMetric = (item: CheckinItem, metric: HealthMetric): boolean => {
    if (metric === "steps") return item.unit === "步" || item.unit === "步数";
    return item.unit === "公斤" || item.unit === "千克" || item.unit === "kg";
};

export function healthCandidates(items: readonly CheckinItem[], selectedId: string, metric: HealthMetric, windowSize = 200): HealthCandidates {
    const active = items.filter((entry) => !entry.archived && matchesMetric(entry, metric));
    const visible = active.slice(0, windowSize);
    const selected = selectedId ? items.find((entry) => entry.id === selectedId) : undefined;
    const retained = selected && !visible.some((entry) => entry.id === selected.id) ? selected : undefined;
    return {items: retained ? [selected as CheckinItem, ...visible] : visible, retained};
}
