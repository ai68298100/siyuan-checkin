/* T-1521 设置保存前变更清单与分节恢复——纯函数层（零运行时依赖、无时钟、确定性）。
   纪律（承接产品计划批次 C）：
   - 只汇总「草稿 ≠ 已保存」的字段；立即生效的开关不在清单（不存在草稿）；
   - 敏感字段（密钥/问卷文本）前后值一律遮罩，绝不回显明文；
   - 清单只是草稿呈现：不得把「草稿已改」当「已生效」；撤回/恢复走既有
     草稿通道（删除草稿 + 重渲染自已保存状态），不删除记录、不清空文档。 */

export interface SettingsFieldDescriptor {
    attribute: string;
    sectionId: string;
    labelKey: string;
    sensitive: boolean;
}

export const SETTINGS_FIELD_REGISTRY: readonly SettingsFieldDescriptor[] = [
    {attribute: "data-journal-custom", sectionId: "journal", labelKey: "set.change.journalCustom", sensitive: true},
    {attribute: "data-journal-mode", sectionId: "journal", labelKey: "set.change.journalMode", sensitive: false},
    {attribute: "data-journal-notebook-id", sectionId: "journal", labelKey: "set.change.journalNotebook", sensitive: false},
    {attribute: "data-journal-target-doc", sectionId: "journal", labelKey: "set.change.journalTargetDoc", sensitive: false},
    {attribute: "data-diary-doc", sectionId: "docs", labelKey: "set.change.diaryDoc", sensitive: false},
    {attribute: "data-summary-doc", sectionId: "docs", labelKey: "set.change.summaryDoc", sensitive: false},
    {attribute: "data-health-doc", sectionId: "health", labelKey: "set.change.healthDoc", sensitive: false},
    {attribute: "data-setting-reminder-slots", sectionId: "reminders", labelKey: "set.change.reminderSlots", sensitive: false},
    {attribute: "data-weread-threshold", sectionId: "weread", labelKey: "set.change.wereadThreshold", sensitive: false},
    {attribute: "data-weread-key", sectionId: "weread", labelKey: "set.change.wereadKey", sensitive: true},
];

export interface SettingChangeEntry {
    attribute: string;
    labelKey: string;
    /** 已保存值（敏感遮罩后）。 */
    saved: string;
    /** 当前草稿（敏感遮罩后）。 */
    draft: string;
}

export interface SettingsChangeSection {
    sectionId: string;
    labelKey: string;
    entries: SettingChangeEntry[];
}

const VALUE_PREVIEW_LIMIT = 24;

/** 前后值脱敏：敏感字段一律遮罩；普通字段截断预览。 */
export function maskSettingValue(sensitive: boolean, value: string): string {
    const trimmed = typeof value === "string" ? value : "";
    if (sensitive) return trimmed ? "••••••" : "（空）";
    if (!trimmed) return "（空）";
    return trimmed.length > VALUE_PREVIEW_LIMIT ? `${trimmed.slice(0, VALUE_PREVIEW_LIMIT)}…` : trimmed;
}

/** 汇总变更清单：只收草稿≠已保存的字段；按注册表顺序分节，确定性输出。 */
export function buildSettingsChangeList(pairs: ReadonlyArray<{attribute: string; saved: string; draft: string}>): SettingsChangeSection[] {
    const sections = new Map<string, SettingsChangeSection>();
    for (const descriptor of SETTINGS_FIELD_REGISTRY) {
        const pair = pairs.find((candidate) => candidate.attribute === descriptor.attribute);
        if (!pair || pair.draft === pair.saved) continue;
        const section = sections.get(descriptor.sectionId) || {sectionId: descriptor.sectionId, labelKey: `set.change.section.${descriptor.sectionId}`, entries: []};
        section.entries.push({
            attribute: descriptor.attribute,
            labelKey: descriptor.labelKey,
            saved: maskSettingValue(descriptor.sensitive, pair.saved),
            draft: maskSettingValue(descriptor.sensitive, pair.draft),
        });
        sections.set(descriptor.sectionId, section);
    }
    return [...sections.values()];
}
