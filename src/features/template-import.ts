/* T-1520 模板包导入逐项差异与冲突处理——纯函数层（零运行时依赖、无时钟、确定性）。
   纪律（承接 T-1519 分享包格式）：
   - 未知版本/未知字段按契约拒绝或提示：shareVersion ≠ 1 整包拒绝；
     字段非法的条目逐条丢弃并计数，绝不猜测修复；
   - 重名（与现有模板同名，大小写不敏感）→ 用户逐项选择：跳过（默认，安全）/
     替换（只覆盖模板本身，不影响已创建项目）/ 另存（自动生成新名）；
   - 新模板默认导入；全部决策可取消，取消零写入；
   - 不执行脚本、不自动接联动。 */

export interface ImportedTemplate {
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

export interface ParsedShare {
    entries: ImportedTemplate[];
    /** 字段非法被丢弃的条目数。 */
    invalidCount: number;
    errorKey?: "editor.importErrorInvalid" | "editor.importErrorLimit" | "editor.importErrorVersion";
}

export type ImportDisposition = "import" | "skip" | "replace" | "saveAs";

export interface ImportDecision {
    index: number;
    entry: ImportedTemplate;
    /** 与现有模板重名。 */
    isNew: boolean;
    matchedId?: string;
    matchedName?: string;
    disposition: ImportDisposition;
    /** saveAs 时宿主生成的新名称（自动后缀，用户可在预览中看到）。 */
    saveAsName?: string;
}

export const TEMPLATE_IMPORT_MAX_TEMPLATES = 20;
export const TEMPLATE_IMPORT_MAX_BYTES = 200 * 1024;

const KINDS = new Set(["binary", "count", "duration", "quantity", "custom"]);
const PRIORITIES = new Set(["low", "medium", "high"]);
const TIME_SLOTS = new Set(["morning", "afternoon", "evening", "any"]);
const SCHEDULE_TYPES = new Set(["daily", "workdays", "weekly", "custom", "interval", "quota"]);

function boundedText(value: unknown, max: number): string {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseEntry(raw: unknown): ImportedTemplate | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const source = raw as Record<string, unknown>;
    const name = boundedText(source.name, 64);
    const kind = typeof source.kind === "string" && KINDS.has(source.kind) ? source.kind : "";
    const target = typeof source.target === "number" && Number.isFinite(source.target) && source.target > 0 && source.target <= 1000000 ? source.target : NaN;
    const unit = boundedText(source.unit, 16);
    const schedule = source.schedule && typeof source.schedule === "object" ? source.schedule as Record<string, unknown> : undefined;
    if (!name || !kind || !Number.isFinite(target) || !unit || !schedule || typeof schedule.type !== "string" || !SCHEDULE_TYPES.has(schedule.type)) return undefined;
    const entry: ImportedTemplate = {
        name,
        icon: boundedText(source.icon, 16) || "✓",
        kind,
        target,
        unit,
        schedule,
        group: boundedText(source.group, 32),
        priority: typeof source.priority === "string" && PRIORITIES.has(source.priority) ? source.priority : "medium",
    };
    if (typeof source.recordStep === "number" && Number.isFinite(source.recordStep) && source.recordStep > 0) entry.recordStep = source.recordStep;
    if (typeof source.timeSlot === "string" && TIME_SLOTS.has(source.timeSlot)) entry.timeSlot = source.timeSlot;
    if (source.completionSource === "tomato" || source.completionSource === "manual") entry.completionSource = source.completionSource;
    if (source.tomatoMode === "minutes" || source.tomatoMode === "sessions") entry.tomatoMode = source.tomatoMode;
    return entry;
}

/** 解析 T-1519 分享包：版本不符整包拒绝；超大包拒绝；非法条目逐条丢弃计数。 */
export function parseTemplateShare(raw: unknown, options: {rawByteLength?: number} = {}): ParsedShare {
    if (typeof options.rawByteLength === "number" && options.rawByteLength > TEMPLATE_IMPORT_MAX_BYTES) {
        return {entries: [], invalidCount: 0, errorKey: "editor.importErrorLimit"};
    }
    let parsed: unknown;
    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw);
        } catch {
            return {entries: [], invalidCount: 0, errorKey: "editor.importErrorInvalid"};
        }
    } else parsed = raw;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {entries: [], invalidCount: 0, errorKey: "editor.importErrorInvalid"};
    }
    const pkg = parsed as Record<string, unknown>;
    if (pkg.app !== "siyuan-checkin" || pkg.shareVersion !== 1) {
        return {entries: [], invalidCount: 0, errorKey: "editor.importErrorVersion"};
    }
    if (!Array.isArray(pkg.templates)) {
        return {entries: [], invalidCount: 0, errorKey: "editor.importErrorInvalid"};
    }
    if (pkg.templates.length > TEMPLATE_IMPORT_MAX_TEMPLATES) {
        return {entries: [], invalidCount: 0, errorKey: "editor.importErrorLimit"};
    }
    const entries: ImportedTemplate[] = [];
    let invalidCount = 0;
    for (const candidate of pkg.templates) {
        const entry = parseEntry(candidate);
        if (entry) entries.push(entry);
        else invalidCount += 1;
    }
    return {entries, invalidCount};
}

/** 逐项决策（纯函数）：新模板默认导入；重名默认跳过（最安全），由用户改为替换/另存。 */
export function planImportDecisions(entries: readonly ImportedTemplate[], existing: readonly {id: string; name: string}[]): ImportDecision[] {
    return entries.map((entry, index) => {
        const match = existing.find((template) => template.name.trim().toLocaleLowerCase() === entry.name.trim().toLocaleLowerCase());
        if (match) {
            return {index, entry, isNew: false, matchedId: match.id, matchedName: match.name, disposition: "skip" as ImportDisposition, saveAsName: `${entry.name.slice(0, 56)} · 导入`};
        }
        return {index, entry, isNew: true, disposition: "import" as ImportDisposition};
    });
}
