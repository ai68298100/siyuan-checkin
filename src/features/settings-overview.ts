/* T-1562 设置首页总览只读投影——需要处理 / 最近活动。
   纪律（T-1554 六槽位 / T-1604 状态契约 / D-307）：
   - 只聚合既有状态：collectNoteBindings 行、来源前置、审计（type:"anchor"）与草稿计数；
     不产生第二套业务判断，不制造「已连接」假象；
   - 每个待处理项带直达控件选择器（复用集中体检「去配置」的滚动+聚焦机制）；
   - 无待处理显式空态；有界（problems ≤ 8、activities ≤ 3）、零依赖、确定性输出。 */

import type {NoteBindingRow} from "./note-bindings";

export type OverviewSeverity = "missing" | "failed" | "draft";

export interface OverviewProblem {
    key: string;
    labelKey: string;
    /** 渲染侧插值键：target 缺失类带 featureKey/featureParams，来源类带 sourceKey。 */
    featureKey?: string;
    featureParams?: Readonly<Record<string, string>>;
    sourceKey?: string;
    selector?: string;
    severity: OverviewSeverity;
}

export interface OverviewActivity {
    key: string;
    labelKey: string;
    featureKey: string;
}

export interface SettingsOverview {
    problems: OverviewProblem[];
    activities: OverviewActivity[];
}

export interface SettingsOverviewInput {
    bindings: readonly NoteBindingRow[];
    sireader: {enabled: boolean; itemId: string};
    siplayer: {enabled: boolean; itemId: string};
    weread: {enabled: boolean; itemId: string; hasKey: boolean};
    healthEnabled: boolean;
    healthBindingCount: number;
    yeguifEnabled: boolean;
    yeguifNotebookId: string;
    yeguifMappingCount: number;
    /** 最近一次写入失败的输出通道（audit type:"anchor" ok=false）。 */
    failedWriteChannels: readonly string[];
    draftCount: number;
    /** 最近写入活动（调用方按审计倒序传入）。 */
    recentWrites: readonly {channel: string; ok: boolean; at: string}[];
}

/** 输出通道 → 功能名键（与 writeResultRow/审计 channel 同一词汇）。 */
export const OVERVIEW_CHANNEL_FEATURE: Record<string, string> = {
    "diary-report": "bind.feature.diaryReport",
    "summary-resident": "bind.feature.summaryResident",
    "journal": "bind.feature.journal",
};

const MAX_PROBLEMS = 8;
const MAX_ACTIVITIES = 3;

/** 构建设置首页总览。确定性：输出只由输入决定，按固定规则排序与截断。 */
export function buildSettingsOverview(input: SettingsOverviewInput): SettingsOverview {
    const problems: OverviewProblem[] = [];
    for (const row of input.bindings) {
        if (row.enabled && row.required && !row.targetId) {
            problems.push({
                key: `binding:${row.key}`,
                labelKey: "set.overviewTargetMissing",
                featureKey: row.featureKey,
                featureParams: row.featureParams,
                selector: row.sourceSelector || undefined,
                severity: "missing",
            });
        }
    }
    if (input.sireader.enabled && !input.sireader.itemId) {
        problems.push({key: "source:sireader-item", labelKey: "set.overviewSourceItem", sourceKey: "set.sireaderTitle", selector: "[data-sireader-item]", severity: "missing"});
    }
    if (input.siplayer.enabled && !input.siplayer.itemId) {
        problems.push({key: "source:siplayer-item", labelKey: "set.overviewSourceItem", sourceKey: "set.siplayerTitle", selector: "[data-siplayer-item]", severity: "missing"});
    }
    if (input.weread.enabled && !input.weread.itemId) {
        problems.push({key: "source:weread-item", labelKey: "set.overviewSourceItem", sourceKey: "set.wereadTitle", selector: "[data-weread-item]", severity: "missing"});
    }
    if (input.weread.enabled && input.weread.itemId && !input.weread.hasKey) {
        problems.push({key: "source:weread-key", labelKey: "set.overviewSourceKey", sourceKey: "set.wereadTitle", selector: "[data-weread-key]", severity: "missing"});
    }
    if (input.healthEnabled && input.healthBindingCount === 0) {
        problems.push({key: "source:health-bindings", labelKey: "set.overviewHealthBindings", selector: "[data-action='add-health-binding']", severity: "missing"});
    }
    if (input.yeguifEnabled && !input.yeguifNotebookId) {
        problems.push({key: "source:yeguif-notebook", labelKey: "set.overviewYeguifNotebook", selector: "[data-yeguif-notebook]", severity: "missing"});
    }
    if (input.yeguifEnabled && input.yeguifNotebookId && input.yeguifMappingCount === 0) {
        problems.push({key: "source:yeguif-mappings", labelKey: "set.overviewYeguifMappings", selector: "[data-yeguif-mappings]", severity: "missing"});
    }
    for (const channel of input.failedWriteChannels) {
        const featureKey = OVERVIEW_CHANNEL_FEATURE[channel];
        if (!featureKey) continue;
        const selector = channel === "diary-report" ? "[data-diary-doc]" : channel === "summary-resident" ? "[data-summary-doc]" : "[data-journal-mode]";
        problems.push({key: `write-failed:${channel}`, labelKey: "set.overviewWriteFailed", featureKey, selector, severity: "failed"});
    }
    if (input.draftCount > 0) {
        problems.push({key: "drafts", labelKey: "set.overviewDrafts", severity: "draft"});
    }

    const activities: OverviewActivity[] = [];
    for (const write of input.recentWrites) {
        const featureKey = OVERVIEW_CHANNEL_FEATURE[write.channel];
        if (!featureKey) continue;
        activities.push({
            key: `write:${write.channel}:${write.at}`,
            labelKey: write.ok ? "set.overviewWriteOk" : "set.overviewWriteFail",
            featureKey,
        });
        if (activities.length >= MAX_ACTIVITIES) break;
    }

    return {problems: problems.slice(0, MAX_PROBLEMS), activities};
}
