/* T-1518 周复盘向导与可恢复草稿——纯函数层（无时钟；时间戳由调用方注入）。
   纪律（承接产品计划批次 B）：
   - 三步流程：核对本周事实（本地统计，无模型也可用）→ 记录阻力 → 下周一项调整；
   - 草稿按周键（周起始日）隔离：切换周不串草稿；持久化到偏好存储可跨重载恢复；
   - 事实与用户解释分开标注；调整只是草案，确认要去既有编辑器，绝不自动写目标。 */

export interface WeeklyReviewDraft {
    /** 周键 = 该周起始日（YYYY-MM-DD）。 */
    weekKey: string;
    friction: string;
    adjustment: string;
    updatedAt: string;
}

export const WEEKLY_REVIEW_DRAFT_LIMIT = 8;
const TEXT_LIMIT = 500;

function boundedText(value: unknown): string {
    return typeof value === "string" ? value.trim().slice(0, TEXT_LIMIT) : "";
}

function isValidDateKey(value: unknown): value is string {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidIso(value: unknown): boolean {
    return typeof value === "string" && !!value && Number.isFinite(Date.parse(value));
}

/** 偏好存储的草稿列表归一化：坏条目丢弃、按周键去重、按更新时间倒序、有界。 */
export function normalizeWeeklyReviewDrafts(raw: unknown): WeeklyReviewDraft[] {
    if (!Array.isArray(raw)) return [];
    const drafts: WeeklyReviewDraft[] = [];
    const seen = new Set<string>();
    for (const candidate of raw) {
        if (!candidate || typeof candidate !== "object") continue;
        const entry = candidate as Record<string, unknown>;
        if (!isValidDateKey(entry.weekKey)) continue;
        if (seen.has(entry.weekKey)) continue;
        seen.add(entry.weekKey);
        drafts.push({
            weekKey: entry.weekKey,
            friction: boundedText(entry.friction),
            adjustment: boundedText(entry.adjustment),
            updatedAt: isValidIso(entry.updatedAt) ? (entry.updatedAt as string) : "",
        });
        if (drafts.length >= WEEKLY_REVIEW_DRAFT_LIMIT) break;
    }
    drafts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return drafts;
}

/** 更新或插入一份周草稿：按周键合并，刷新更新时间，有界并淘汰最旧。 */
export function upsertWeeklyReviewDraft(existing: readonly WeeklyReviewDraft[], draft: WeeklyReviewDraft): WeeklyReviewDraft[] {
    const merged = existing.filter((entry) => entry.weekKey !== draft.weekKey);
    merged.unshift({...draft, friction: boundedText(draft.friction), adjustment: boundedText(draft.adjustment)});
    merged.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return merged.slice(0, WEEKLY_REVIEW_DRAFT_LIMIT);
}

export function weeklyReviewDraftFor(drafts: readonly WeeklyReviewDraft[], weekKey: string): WeeklyReviewDraft | undefined {
    return drafts.find((entry) => entry.weekKey === weekKey);
}

export interface WeeklyReviewFacts {
    rangeLabel: string;
    totalEvents: number;
    completedItems: number;
    scheduledItems: number;
    /** 每行已本地化的项目事实（渲染层组装，例：「拉伸 · 5/7 天」）。 */
    itemLines: string[];
    headings: {facts: string; friction: string; adjustment: string; note: string};
}

/** 导出 Markdown：事实与用户解释分开标注；确定性输出；独立可用（无模型、不依赖宿主文档）。 */
export function buildWeeklyReviewMarkdown(facts: WeeklyReviewFacts, friction: string, adjustment: string): string {
    const itemLines = facts.itemLines.map((line) => `- ${line}`).join("\n");
    const frictionBlock = boundedText(friction) || "—";
    const adjustmentBlock = boundedText(adjustment) || "—";
    return [
        `# ${facts.rangeLabel}`,
        "",
        `## ${facts.headings.facts}`,
        `- ${facts.totalEvents}`,
        `- ${facts.completedItems} / ${facts.scheduledItems}`,
        itemLines,
        "",
        `## ${facts.headings.friction}`,
        frictionBlock,
        "",
        `## ${facts.headings.adjustment}`,
        adjustmentBlock,
        "",
        `> ${facts.headings.note}`,
        "",
    ].join("\n");
}
