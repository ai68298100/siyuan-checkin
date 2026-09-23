/* T-1416 · R-A4 渲染块一键插入预设——内容资产与插入通道分离（纯函数面）。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-10.4/T-1416）：
   - 预设只是「可一键插入的块内容资产」：不改变块语法、不触渲染管线、不改变
     数据模型；插入走宿主内核公开通道（/api/block/insertBlock）；
   - 每个预设的围栏内容必须能被 parseCheckinBlockConfig 无错解析（往返一致，
     由注入解析器的验证函数在测试与插入前守门）——参数缺失继续 fail-closed；
   - 选择这 4 个预设（summary/month/heatmap/groups）是因为它们全部上下文自洽
     （缺省=当前项目集/当前月/当前年），无需用户先填 itemIds 即可正确渲染；
     today 视图强制 itemIds（T-1412），不提供通用预设以免插入即错误块；
   - 零依赖、无时钟；langKey 与 i18n dist 契约一致（release-assets 守门）。 */

export type CheckinBlockPresetId = "summary" | "month" | "heatmap" | "groups";

export interface CheckinBlockPreset {
    id: CheckinBlockPresetId;
    /** 思源命令 langKey（命令面板标题）；dist i18n 契约键。 */
    langKey: string;
    /** 围栏内的块配置对象（单行 JSON，键序稳定）。 */
    config: {view: "summary" | "month" | "heatmap" | "groups"} & Record<string, unknown>;
}

export const BLOCK_PRESETS: readonly CheckinBlockPreset[] = [
    {id: "summary", langKey: "blockPresetSummary", config: {view: "summary"}},
    {id: "month", langKey: "blockPresetMonth", config: {view: "month"}},
    {id: "heatmap", langKey: "blockPresetHeatmap", config: {view: "heatmap"}},
    {id: "groups", langKey: "blockPresetGroups", config: {view: "groups"}},
];

export function getBlockPreset(id: string): CheckinBlockPreset | undefined {
    return BLOCK_PRESETS.find((preset) => preset.id === id);
}

/** 生成插入用围栏 markdown：```checkin 围栏 + 单行 JSON 配置。 */
export function blockPresetMarkdown(preset: CheckinBlockPreset): string {
    return "```checkin\n" + JSON.stringify(preset.config) + "\n```";
}

/** 往返一致验证：注入真实解析器，从插入用围栏中提取块内容（镜像真实摄入路径）
    后必须无错解析且 view 保持不变。插入前守门（fail-closed：验证失败宁可拒绝插入）
    + 测试双重消费。 */
export function validateBlockPresetRoundtrip(
    preset: CheckinBlockPreset,
    parse: (text: string) => {ok: boolean; config?: {view?: string}},
): boolean {
    const body = blockPresetMarkdown(preset).replace(/^```checkin\n/, "").replace(/\n```$/, "");
    const result = parse(body);
    return result.ok === true && result.config?.view === preset.config.view;
}
