/* T-1519 个人模板脱敏分享——纯函数层（零运行时依赖、无时钟、确定性）。
   纪律（承接产品计划批次 C）：
   - 白名单输出：只导出类型/目标/单位/排期与展示配置；从白名单构建，
     绝不"黑名单删除"——未来新增的敏感字段天然不出包；
   - 排除：事件（本就不在模板内）、项目/文档/外部绑定 ID、凭据、附件、
     用户备注（note）与内部 id、时间戳；
   - 导出确定性：固定键序 + 固定模板顺序，同输入必得同字节；
   - 不修改原模板；不建模板云市场。 */

export interface TemplateShareTemplate {
    name: string;
    icon: string;
    kind: string;
    target: number;
    unit: string;
    recordStep?: number;
    schedule: Record<string, unknown>;
    group: string;
    priority: string;
    timeSlot?: string;
    completionSource?: string;
    tomatoMode?: string;
}

export interface TemplateSharePackage {
    app: "siyuan-checkin";
    shareVersion: 1;
    templates: TemplateShareTemplate[];
}

export const TEMPLATE_SHARE_VERSION = 1;
/** 超量拦截：一次最多分享的模板数（显式常量）。 */
export const TEMPLATE_SHARE_MAX = 20;

export interface TemplateShareResult {
    package?: TemplateSharePackage;
    serialized?: string;
    errorKey?: "editor.shareErrorEmpty" | "editor.shareErrorLimit";
}

function sanitizeSchedule(schedule: unknown): Record<string, unknown> {
    const source = schedule && typeof schedule === "object" ? schedule as Record<string, unknown> : {};
    const result: Record<string, unknown> = {type: source.type};
    if (Array.isArray(source.weekdays)) result.weekdays = [...source.weekdays];
    if (source.intervalDays !== undefined) result.intervalDays = source.intervalDays;
    if (source.anchorDate !== undefined) result.anchorDate = source.anchorDate;
    if (source.quota && typeof source.quota === "object") {
        const quota = source.quota as Record<string, unknown>;
        result.quota = {period: quota.period, amount: quota.amount, countMode: quota.countMode, ...(quota.weekStartsOn !== undefined ? {weekStartsOn: quota.weekStartsOn} : {})};
    }
    return result;
}

function sanitizeTemplate(template: Record<string, unknown>): TemplateShareTemplate {
    /* 键序固定：输出字节确定。 */
    const shared: TemplateShareTemplate = {
        name: String(template.name ?? ""),
        icon: String(template.icon ?? "✓"),
        kind: String(template.kind ?? "binary"),
        target: Number(template.target ?? 1),
        unit: String(template.unit ?? "次"),
        schedule: sanitizeSchedule(template.schedule),
        group: String(template.group ?? ""),
        priority: String(template.priority ?? "medium"),
    };
    if (typeof template.recordStep === "number" && template.recordStep > 0) shared.recordStep = template.recordStep;
    if (template.timeSlot !== undefined) shared.timeSlot = String(template.timeSlot);
    if (template.completionSource !== undefined) shared.completionSource = String(template.completionSource);
    if (template.tomatoMode !== undefined) shared.tomatoMode = String(template.tomatoMode);
    return shared;
}

/** 构建脱敏分享包：白名单字段 + 版本声明；确定性序列化。 */
export function buildTemplateSharePackage(templates: readonly unknown[]): TemplateShareResult {
    if (!Array.isArray(templates) || !templates.length) {
        return {errorKey: "editor.shareErrorEmpty"};
    }
    if (templates.length > TEMPLATE_SHARE_MAX) {
        return {errorKey: "editor.shareErrorLimit"};
    }
    const pkg: TemplateSharePackage = {
        app: "siyuan-checkin",
        shareVersion: TEMPLATE_SHARE_VERSION,
        templates: templates.map((template) => sanitizeTemplate(template as Record<string, unknown>)),
    };
    return {package: pkg, serialized: serializeTemplateSharePackage(pkg)};
}

export function serializeTemplateSharePackage(pkg: TemplateSharePackage): string {
    return JSON.stringify(pkg, null, 2);
}
