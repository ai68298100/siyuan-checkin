/* T-1465 · D-273 问卷式日记打卡：问题集定义、内置预设、归一化与 Markdown 渲染（纯函数面）。
   定型口径（DECISIONS D-273）：
   - 内置 5 预设为只读内容资产（文本走 i18n 键，经注入的 translate 本地化）；自建模板存原文；
   - 写入目标文档的内容以结构化标记 `lv-checkin-journal:<模板id>:<localDate>` 定位，
     同日同模板幂等（更新插件自写块），绝不改写用户已有内容；
   - 事件 note 只存截断摘要，答案正文只进目标文档（privacy-scope 既有审计覆盖）；
   - 本模块零依赖、无时钟、确定性输出；宿主 IO（SQL/appendBlock）在 index.ts 侧。
   T-1484 提示词轮换：每题可选配「提示词池」（≥2 条候选），按 ISO 周 key 的 djb2 hash
   确定性轮换展示，缓解每日同题套路化；轮换只影响呈现（弹窗题干与写入文档的题干同行），
   不影响事件结构（note 摘要）与幂等标记；无池/单候选/非法日期一律回落基础题干。 */

export type JournalQuestionType = "text" | "textarea" | "slider";
export type JournalLayout = "list" | "grid";
export type JournalPeriod = "morning" | "evening" | "any";

export interface JournalQuestionDef {
    /** 内置模板的 i18n 键（journal.tpl.<id>.qN）。 */
    textKey?: string;
    /** 自建模板的原文。 */
    text?: string;
    /** 提示词池原文（自建模板）；内置模板经 promptKeys 解析。≥2 条有效候选才构成池。 */
    prompts?: string[];
    /** 内置模板的提示词池 i18n 键（journal.tpl.<id>.qN.pK）。 */
    promptKeys?: string[];
    type: JournalQuestionType;
    required?: boolean;
}

export interface JournalTemplateDef {
    /** slug：[a-z0-9-]{1,40}，同时是幂等标记的一部分。 */
    id: string;
    icon: string;
    nameKey?: string;
    name?: string;
    period: JournalPeriod;
    layout?: JournalLayout;
    questions: JournalQuestionDef[];
}

/** 解析后的可用模板（内置经 translate 本地化；自建用原文）。 */
export interface ResolvedJournalTemplate {
    id: string;
    icon: string;
    name: string;
    period: JournalPeriod;
    layout: JournalLayout;
    custom: boolean;
    questions: ReadonlyArray<{text: string; type: JournalQuestionType; required: boolean; prompts?: ReadonlyArray<string>}>;
}

export interface JournalAnswer {
    question: string;
    answer: string;
}

/** 幂等标记前缀：对用户可见以保留写入溯源（同 lv-checkin-summary 惯例）。 */
export const JOURNAL_MARKER_PREFIX = "lv-checkin-journal";

const TEMPLATE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const JOURNAL_MAX_CUSTOM_TEMPLATES = 10;
export const JOURNAL_MAX_QUESTIONS = 20;
/** 提示词池容量上限；≥2 条有效候选才构成池（单候选不是轮换，按无池回落基础题干）。 */
export const JOURNAL_MAX_PROMPT_POOL = 6;
const ANSWER_NOTE_LIMIT = 60;

export function journalMarker(templateId: string, localDate: string): string {
    const safe = typeof templateId === "string" ? templateId.trim().toLowerCase() : "";
    return safe && TEMPLATE_ID_PATTERN.test(safe) && DATE_PATTERN.test(localDate)
        ? `${JOURNAL_MARKER_PREFIX}:${safe}:${localDate}`
        : "";
}

/** 内置 5 预设（D-273）：感恩三问 / 五分钟日记 / 九宫格晨间日记 / KPT 复盘 / 深度复盘周记。
    题干只存 i18n 键；键按 question 顺序约定为 journal.tpl.<id>.q1..qN。 */
export const JOURNAL_BUILTIN_TEMPLATES: readonly JournalTemplateDef[] = [
    {
        id: "gratitude3",
        icon: "🙏",
        nameKey: "journal.tpl.gratitude3.name",
        period: "any",
        layout: "list",
        questions: [
            {textKey: "journal.tpl.gratitude3.q1", promptKeys: ["journal.tpl.gratitude3.q1.p1", "journal.tpl.gratitude3.q1.p2", "journal.tpl.gratitude3.q1.p3"], type: "textarea", required: true},
            {textKey: "journal.tpl.gratitude3.q2", type: "textarea"},
            {textKey: "journal.tpl.gratitude3.q3", type: "textarea"},
        ],
    },
    {
        id: "fiveminute",
        icon: "🌅",
        nameKey: "journal.tpl.fiveminute.name",
        period: "any",
        layout: "list",
        questions: [
            {textKey: "journal.tpl.fiveminute.q1", type: "textarea", required: true},
            {textKey: "journal.tpl.fiveminute.q2", promptKeys: ["journal.tpl.fiveminute.q2.p1", "journal.tpl.fiveminute.q2.p2", "journal.tpl.fiveminute.q2.p3"], type: "textarea"},
            {textKey: "journal.tpl.fiveminute.q3", type: "text"},
            {textKey: "journal.tpl.fiveminute.q4", type: "textarea", required: true},
            {textKey: "journal.tpl.fiveminute.q5", promptKeys: ["journal.tpl.fiveminute.q5.p1", "journal.tpl.fiveminute.q5.p2", "journal.tpl.fiveminute.q5.p3"], type: "textarea"},
        ],
    },
    {
        id: "ninegrid",
        icon: "☀",
        nameKey: "journal.tpl.ninegrid.name",
        period: "morning",
        layout: "grid",
        questions: [
            {textKey: "journal.tpl.ninegrid.q1", type: "text"},
            {textKey: "journal.tpl.ninegrid.q2", type: "text"},
            {textKey: "journal.tpl.ninegrid.q3", type: "text"},
            {textKey: "journal.tpl.ninegrid.q4", type: "text"},
            {textKey: "journal.tpl.ninegrid.q5", type: "text"},
            {textKey: "journal.tpl.ninegrid.q6", type: "text"},
            {textKey: "journal.tpl.ninegrid.q7", type: "text"},
            {textKey: "journal.tpl.ninegrid.q8", type: "text"},
        ],
    },
    {
        id: "kpt",
        icon: "📒",
        nameKey: "journal.tpl.kpt.name",
        period: "evening",
        layout: "list",
        questions: [
            {textKey: "journal.tpl.kpt.q1", type: "textarea", required: true},
            {textKey: "journal.tpl.kpt.q2", type: "textarea"},
            {textKey: "journal.tpl.kpt.q3", type: "textarea"},
        ],
    },
    {
        id: "weekreview",
        icon: "🗓",
        nameKey: "journal.tpl.weekreview.name",
        period: "any",
        layout: "list",
        questions: [
            {textKey: "journal.tpl.weekreview.q1", type: "textarea", required: true},
            {textKey: "journal.tpl.weekreview.q2", type: "textarea"},
            {textKey: "journal.tpl.weekreview.q3", type: "textarea"},
            {textKey: "journal.tpl.weekreview.q4", type: "textarea"},
        ],
    },
];

const QUESTION_TEXT_LIMIT = 200;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const normalizeType = (value: unknown): JournalQuestionType => (value === "text" || value === "slider" ? value : "textarea");
const normalizePeriod = (value: unknown): JournalPeriod => (value === "morning" || value === "evening" ? value : "any");
const cleanText = (value: unknown, limit: number): string => (typeof value === "string" ? value.trim().slice(0, limit) : "");
const hashSeed = (value: string): number => {
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
    return hash;
};

/** 提示词池归一化（fail-closed）：只接受字符串数组，trim/限长/去重、容量封顶；
    有界扫描（最多检查前 18 项，防损坏稀疏巨数组），凑满 6 条即停；
    有效候选不足 2 条时返回空数组（调用方按无池处理，回落基础题干）。 */
export function normalizePromptPool(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const pool: string[] = [];
    for (const entry of value.slice(0, JOURNAL_MAX_PROMPT_POOL * 3)) {
        const text = cleanText(entry, QUESTION_TEXT_LIMIT);
        if (!text || seen.has(text)) continue;
        seen.add(text);
        pool.push(text);
        if (pool.length >= JOURNAL_MAX_PROMPT_POOL) break;
    }
    return pool.length >= 2 ? pool : [];
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isRealCalendarDate = (year: number, month: number, day: number): boolean => {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
    if (month < 1 || month > 12 || day < 1) return false;
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return day <= (month === 2 && leap ? 29 : MONTH_LENGTHS[month - 1]);
};

/** ISO 周 key（如 2026-W39）：提示词轮换的确定性相位。零依赖实现（模块保持单文件可转译），
    UTC 日历运算不读隐式时钟；非法/不存在日期返回空串（fail-closed 回落基础题干）。 */
export function journalIsoWeekKey(localDate: string): string {
    if (typeof localDate !== "string" || !DATE_PATTERN.test(localDate)) return "";
    const [year, month, day] = localDate.split("-").map(Number);
    if (!isRealCalendarDate(year, month, day)) return "";
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const week = Math.ceil(((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** 当日应展示的题干：有池按 ISO 周 hash 确定性轮换；无池/单候选/非法日期回落基础题干。
    弹窗取词与写入文档的题干必须共用本函数，保证同日呈现一致。 */
export function resolveJournalQuestionText(question: {text: string; prompts?: ReadonlyArray<string>}, localDate: string): string {
    if (!question.prompts || question.prompts.length < 2) return question.text;
    const week = journalIsoWeekKey(localDate);
    return week ? question.prompts[hashSeed(week) % question.prompts.length] : question.text;
}

/** 把模板定义解析为可用形态：缺题干/无有效问题的模板 fail-closed 丢弃。 */
export function resolveJournalTemplate(def: JournalTemplateDef, translate: (key: string) => string): ResolvedJournalTemplate | undefined {
    if (!isRecord(def as unknown) && typeof def !== "object") return undefined;
    const id = cleanText(def.id, 40).toLowerCase();
    if (!TEMPLATE_ID_PATTERN.test(id)) return undefined;
    const name = cleanText(def.nameKey ? translate(def.nameKey) : def.name, 60);
    if (!name) return undefined;
    const icon = cleanText(def.icon, 8) || "📝";
    const questions: ResolvedJournalTemplate["questions"][number][] = [];
    for (const question of Array.isArray(def.questions) ? def.questions : []) {
        if (!isRecord(question as unknown)) continue;
        const text = cleanText(question.textKey ? translate(question.textKey) : question.text, QUESTION_TEXT_LIMIT);
        if (!text) continue;
        const pool = normalizePromptPool(Array.isArray(question.promptKeys)
            ? question.promptKeys.slice(0, JOURNAL_MAX_PROMPT_POOL).map((key) => translate(typeof key === "string" ? key : ""))
            : question.prompts);
        questions.push({text, type: normalizeType(question.type), required: question.required === true, ...(pool.length ? {prompts: pool} : {})});
        if (questions.length >= JOURNAL_MAX_QUESTIONS) break;
    }
    if (!questions.length) return undefined;
    return {id, icon, name, period: normalizePeriod(def.period), layout: def.layout === "grid" ? "grid" : "list", custom: false, questions};
}

/** 自建模板清单归一化：≤10 个、每题 ≤200 字、类型白名单、非法条目静默丢弃（偏好纪律）。 */
export function normalizeCustomJournalTemplates(value: unknown): JournalTemplateDef[] {
    if (!Array.isArray(value)) return [];
    const templates: JournalTemplateDef[] = [];
    for (const entry of value.slice(0, JOURNAL_MAX_CUSTOM_TEMPLATES)) {
        if (!isRecord(entry as unknown)) continue;
        const id = cleanText(entry.id, 40).toLowerCase();
        if (!TEMPLATE_ID_PATTERN.test(id)) continue;
        const name = cleanText(entry.name, 60);
        const questions: JournalQuestionDef[] = [];
        for (const question of Array.isArray(entry.questions) ? entry.questions.slice(0, JOURNAL_MAX_QUESTIONS) : []) {
            if (!isRecord(question as unknown)) continue;
            const text = cleanText(question.text, QUESTION_TEXT_LIMIT);
            if (!text) continue;
            const pool = normalizePromptPool(question.prompts);
            questions.push({text, type: normalizeType(question.type), required: question.required === true, ...(pool.length ? {prompts: pool} : {})});
        }
        if (!name || !questions.length) continue;
        templates.push({id, icon: cleanText(entry.icon, 8) || "📝", name, period: "any", layout: "list", questions});
    }
    return templates;
}

/** 设置页自建模板文本解析：空行分块；块首行 `# 名称 | 图标`；其后每行 `问题 | 类型`（缺省 textarea）；
    问题行之后可跟 `> 候选提示词` 行，累积为该题的提示词池（≥2 条有效候选生效，不足整体回落该题主干）。 */
export function parseCustomJournalTemplatesText(raw: string, existingIds: readonly string[] = []): {templates: JournalTemplateDef[]; invalidBlocks: number} {
    const blocks = String(raw || "").split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
    const templates: JournalTemplateDef[] = [];
    let invalidBlocks = 0;
    if (blocks.length > JOURNAL_MAX_CUSTOM_TEMPLATES) return {templates: [], invalidBlocks: blocks.length - JOURNAL_MAX_CUSTOM_TEMPLATES};
    const taken = new Set<string>();
    for (const block of blocks) {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const header = lines[0] || "";
        if (!header.startsWith("#")) { invalidBlocks += 1; continue; }
        const headerParts = header.slice(1).split("|").map((part) => part.trim());
        if (headerParts.length > 3 || headerParts[2] && !TEMPLATE_ID_PATTERN.test(headerParts[2])) { invalidBlocks += 1; continue; }
        const name = headerParts[0] || "";
        if (!name) { invalidBlocks += 1; continue; }
        let icon = headerParts[1] || "📝";
        if (!icon) icon = "📝";
        const questions: JournalQuestionDef[] = [];
        let invalidQuestion = false;
        for (const line of lines.slice(1)) {
            /* `> ` 前缀行是上一题的提示词池候选；出现在任何问题行之前视为坏块（fail-closed）。 */
            if (line.startsWith(">")) {
                const candidate = cleanText(line.slice(1), QUESTION_TEXT_LIMIT);
                const last = questions[questions.length - 1];
                if (!candidate || !last) { invalidQuestion = true; continue; }
                last.prompts = last.prompts || [];
                if (!last.prompts.includes(candidate)) last.prompts.push(candidate);
                continue;
            }
            const required = /\|\s*required$/.test(line);
            const content = required ? line.replace(/\|\s*required$/, "").trim() : line;
            const separator = content.lastIndexOf("|");
            const text = separator >= 0 ? content.slice(0, separator).trim() : content;
            const typeText = separator >= 0 ? content.slice(separator + 1).trim() : "";
            const type = normalizeType(typeText === "text" ? "text" : typeText === "slider" ? "slider" : "textarea");
            const clean = cleanText(text, QUESTION_TEXT_LIMIT);
            if (clean) questions.push({text: clean, type, required});
            else invalidQuestion = true;
        }
        /* 池统一走归一化收口：去重/限长/封顶，不足 2 条整体移除（该题回落基础题干）。 */
        for (const question of questions) {
            const pool = normalizePromptPool(question.prompts);
            if (pool.length) question.prompts = pool;
            else delete question.prompts;
        }
        if (invalidQuestion || !questions.length || questions.length > JOURNAL_MAX_QUESTIONS) { invalidBlocks += 1; continue; }
        /* id 从名称派生：ASCII 名称直接 slug 化；纯中文等无 ASCII 字符的名称回退到
           确定性哈希（djb2）——同一名称重解析得到同一 id，重命名即新模板（可接受）。 */
        let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
        if (!slug) {
            let hash = 5381;
            for (let index = 0; index < name.length; index += 1) hash = ((hash << 5) + hash + name.charCodeAt(index)) >>> 0;
            slug = `custom-${hash.toString(36)}`;
        }
        if (!slug) { invalidBlocks += 1; continue; }
        const explicitId = headerParts[2] || "";
        if (explicitId && (taken.has(explicitId) || JOURNAL_BUILTIN_TEMPLATES.some(template => template.id === explicitId))) { invalidBlocks += 1; continue; }
        let candidate = TEMPLATE_ID_PATTERN.test(explicitId) ? explicitId : slug;
        let suffix = 2;
        while (taken.has(candidate)) candidate = `${slug}-${suffix++}`;
        taken.add(candidate);
        templates.push({id: candidate, icon, name, period: "any", layout: "list", questions});
        if (templates.length >= JOURNAL_MAX_CUSTOM_TEMPLATES) break;
    }
    return {templates, invalidBlocks};
}

export interface JournalEntryInput {
    template: ResolvedJournalTemplate;
    localDate: string;
    /** 与 template.questions 一一对应（缺失答案以空串占位，不进正文）。 */
    answers: readonly string[];
}

/** 渲染写入目标文档的 Markdown。**单段落块**口径：全部内容（含幂等标记）在一个 p 块内，
    软换行分题——重填时 updateBlock 整块替换，不会残留旧答案的兄弟块。
    （多块渲染——标题+逐题段落/表格——会被内核拆成多个块，破坏 update 幂等，故弃用；
    JournalTemplateDef.layout 保留为未来呈现扩展位，当前统一按 list 渲染。） */
export function buildJournalEntryMarkdown(entry: JournalEntryInput): string {
    const marker = journalMarker(entry.template.id, entry.localDate);
    if (!marker) return "";
    const lines = [`**${entry.template.icon} ${entry.template.name} · ${entry.localDate}** · ${marker}`];
    entry.template.questions.forEach((question, index) => {
        const answer = (entry.answers[index] || "").trim().replace(/\n+/g, " ");
        if (!answer) return;
        /* 题干与弹窗共用同一轮换取词：同日呈现一致，跨周自然轮换（仅呈现，标记不变）。 */
        lines.push(`**${resolveJournalQuestionText(question, entry.localDate)}** ${answer}`);
    });
    if (lines.length === 1) lines.push("*（空）*");
    return `${lines.join("\n")}\n`;
}

/** 事件 note 截断摘要：`<模板名>：<第一份非空答案前 60 字>`；无答案仅模板名（隐私最小暴露面）。 */
export function buildJournalEventNote(template: ResolvedJournalTemplate, answers: readonly string[]): string {
    const first = answers.map((answer) => (answer || "").trim()).find(Boolean) || "";
    const clipped = first.length > ANSWER_NOTE_LIMIT ? `${first.slice(0, ANSWER_NOTE_LIMIT)}…` : first;
    return clipped ? `${template.name}：${clipped}` : template.name;
}

/** 查询语句：在目标文档内定位既有条目块（幂等/更新锚点）。
    ORDER BY id DESC：updateBlock 后内核可能以新 id 重建块且旧块索引异步收敛，
    块 id 内嵌时间戳——取最新者保证多次重填始终命中最新的插件自写块。 */
export function buildJournalLookupQuery(docId: string, templateId: string, localDate: string): string {
    const marker = journalMarker(templateId, localDate);
    if (!docId || !marker) return "";
    return `SELECT id, content FROM blocks WHERE root_id = '${docId.replace(/'/g, "''")}' AND content LIKE '%${marker}%' ORDER BY id DESC LIMIT 1`;
}

/* —— 写入目标与持久化数据（独立 journal.json，不进 view-preferences 避免加载器级联） —— */

export interface JournalIntegration {
    /** daily=写入当日日记（笔记本 dailyNoteSavePath 经 sprig 渲染）；doc=写入指定文档。 */
    mode: "daily" | "doc";
    notebookId: string;
    docId: string;
}

export const JOURNAL_DATA_NAME = "journal.json";

export function normalizeJournalIntegration(value: unknown): JournalIntegration {
    const entry = isRecord(value) ? value : {};
    const mode = entry.mode === "doc" ? "doc" : "daily";
    const notebookId = typeof entry.notebookId === "string" ? entry.notebookId.trim().slice(0, 64) : "";
    const docId = typeof entry.docId === "string" ? entry.docId.trim().slice(0, 120) : "";
    return {mode, notebookId, docId};
}

/** 自建模板序列化回设置页文本（与 parseCustomJournalTemplatesText 往返一致，含 `> ` 提示词池行）。 */
export function serializeCustomJournalTemplatesText(templates: readonly JournalTemplateDef[]): string {
    return templates
        .map((template) => {
            const lines = [`# ${template.name} | ${template.icon} | ${template.id}`];
            for (const question of template.questions) {
                const text = typeof question.text === "string" ? question.text : "";
                lines.push(`${text} | ${question.type}${question.required ? " | required" : ""}`);
                for (const candidate of Array.isArray(question.prompts) ? question.prompts : []) {
                    lines.push(`> ${candidate}`);
                }
            }
            return lines.join("\n");
        })
        .join("\n\n");
}
