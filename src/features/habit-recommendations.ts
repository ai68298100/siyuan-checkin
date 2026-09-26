/* T-1489 互补习惯动态推荐：按已有项目生成模板推荐（benchmark 二十一·C 路，D-280）。
   纪律：
   - 纯规则、零依赖、无时钟、确定性输出（score desc → 目录顺序 tiebreak）；
   - 已有项目不重复推荐：模板 zh 锚点与本地化显示名任一命中活跃项目名即排除；
   - calm 口径：只决定「推荐什么」，措辞由渲染层 i18n 负责（不产出「你缺/你落后」类信号）；
   - 空库回退调用方注入的静态精选（新用户仍走人工策划的起步清单）；
   - 全部候选被排除时如实返回空（渲染层隐藏推荐位，不硬凑）。 */

export interface RecommendationItemSnapshot {
    /** 项目显示名（与模板本地化名或 zh 锚点比对排除）。 */
    name: string;
    group: string | undefined;
    timeSlot?: string | undefined;
    kind?: string | undefined;
}

export interface RecommendationTemplateSnapshot {
    /** zh 名锚点（推荐结果返回锚点，渲染层再本地化）。 */
    name: string;
    group: string | undefined;
    timeSlot?: string | undefined;
    kind?: string | undefined;
}

/** 互补配对表：已有某组项目时，为配对组模板加分（恢复/平衡语义，非惩罚）。 */
const GROUP_PAIR_BOOSTS: ReadonlyArray<readonly [string, string, number]> = [
    ["运动", "健康", 2],
    ["健康", "运动", 2],
    ["工作", "生活", 1],
    ["学习", "生活", 1],
    ["生活", "工作", 1],
    ["创作", "学习", 1],
];

const TIME_SLOTS: readonly string[] = ["morning", "afternoon", "evening"];

export interface HabitRecommendationInput {
    existing: ReadonlyArray<RecommendationItemSnapshot>;
    catalog: ReadonlyArray<RecommendationTemplateSnapshot>;
    /** 空库（无活跃项目）时的静态精选锚点序列。 */
    fallback: ReadonlyArray<string>;
    /** 模板 zh 锚点 → 当前语言显示名（用于排除比对）。 */
    localizeName?: (name: string) => string;
    /** 推荐位容量（缺省 8，与既有静态推荐位一致）。 */
    limit?: number;
}

/** 互补推荐：排除已有 → 组互补/时段补位/类型多样性计分 → 确定性排序截断。 */
export function recommendHabitTemplates(input: HabitRecommendationInput): string[] {
    const existing = Array.isArray(input.existing) ? input.existing : [];
    const catalog = Array.isArray(input.catalog) ? input.catalog : [];
    const limit = Math.max(1, Math.min(16, Math.round(Number(input.limit) || 8)));
    if (!catalog.length) return [];
    if (!existing.length) {
        /* 空库：静态精选按目录顺序解析为锚点（未知名忽略）。 */
        const anchors = new Set(catalog.map((template) => template.name));
        return input.fallback.filter((name) => anchors.has(name)).slice(0, limit);
    }
    const existingNames = new Set(existing.map((entry) => entry.name).filter(Boolean));
    const existingGroups = new Set(existing.map((entry) => entry.group).filter(Boolean));
    const existingKinds = new Set(existing.map((entry) => entry.kind).filter(Boolean));
    const existingSlots = new Set(existing.map((entry) => entry.timeSlot || "any"));
    const scored: Array<{name: string; score: number; order: number}> = [];
    catalog.forEach((template, order) => {
        const display = input.localizeName ? input.localizeName(template.name) : template.name;
        if (existingNames.has(template.name) || existingNames.has(display)) return;
        let score = 0;
        if (!existingGroups.has(template.group)) score += 2;
        for (const [whenGroup, boostGroup, boost] of GROUP_PAIR_BOOSTS) {
            if (existingGroups.has(whenGroup) && template.group === boostGroup) score += boost;
        }
        const slot = template.timeSlot || "any";
        if (slot !== "any" && TIME_SLOTS.includes(slot) && !existingSlots.has(slot)) score += 2;
        if (template.kind && !existingKinds.has(template.kind)) score += 1;
        scored.push({name: template.name, score, order});
    });
    scored.sort((left, right) => right.score - left.score || left.order - right.order);
    /* 零分候选仍然可用（目录顺序兜底），但全部被排除时如实返回空。 */
    return scored.slice(0, limit).map((entry) => entry.name);
}
