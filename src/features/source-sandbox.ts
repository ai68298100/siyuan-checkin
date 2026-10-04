/* T-1523 外部来源粘贴样例试算台——纯函数层（无时钟；todayKey 由调用方注入）。
   纪律（承接产品计划批次 D）：
   - 复用生产解析/映射函数（叶归 parseYeguifMarker+resolveYeguifItemId、
     健康 parseHealthInboxLine、笔记推导 parseNoteQueryRows），不建第二套解析；
   - 试算只读：不执行 SQL、不访问网络、不写事件、不自动改映射、不伪装成已连接；
   - 样例正文仅会话内存在（宿主内存态），绝不持久化；
   - 输入有界（行数/行长），输出转义由渲染层负责；未知类型不落通用目标。 */
import {parseYeguifMarker, resolveYeguifItemId} from "./yeguif-adapter";
import {parseHealthInboxLine, type HealthInboxMetric} from "./health-inbox";
import {parseNoteQueryRows} from "./note-query";

export type SandboxSource = "yeguif" | "health" | "notequery";
export type SandboxLineState = "matched" | "unmatched" | "invalid";

export interface SandboxLine {
    /** 截断后的原行（渲染层转义）。 */
    input: string;
    state: SandboxLineState;
    /** 匹配到的目标项目名。 */
    targetName?: string;
    /** 未匹配/非法原因 i18n 键（today.sandbox.reason.*）。 */
    reasonKey?: string;
}

export interface SandboxOutcome {
    source: SandboxSource;
    lines: SandboxLine[];
    matched: number;
    unmatched: number;
    invalid: number;
    /** 超出行数上限被忽略的行数。 */
    truncatedLines: number;
}

export interface SandboxItemSnapshot {
    id: string;
    name: string;
    kind: string;
    unit: string;
    archived?: boolean;
}

const MAX_LINES = 50;
const MAX_LINE_CHARS = 200;

function boundedLines(text: string): {lines: string[]; truncatedLines: number} {
    const all = typeof text === "string"
        ? text.split(/\r?\n/).map((line) => line.trim().slice(0, MAX_LINE_CHARS)).filter((line) => line.length > 0)
        : [];
    const lines = all.slice(0, MAX_LINES);
    return {lines, truncatedLines: Math.max(0, all.length - lines.length)};
}

function summarize(source: SandboxSource, lines: SandboxLine[], truncatedLines: number): SandboxOutcome {
    return {
        source,
        lines,
        matched: lines.filter((line) => line.state === "matched").length,
        unmatched: lines.filter((line) => line.state === "unmatched").length,
        invalid: lines.filter((line) => line.state === "invalid").length,
        truncatedLines,
    };
}

/** 叶归试算：逐行解析「HH:MM 类型：事项」；类型按显式映射归属，未知类型不落通用目标。 */
export function sandboxYeguifSample(text: string, mappings: ReadonlyArray<{project: string; itemId: string}>, items: readonly SandboxItemSnapshot[]): SandboxOutcome {
    const {lines, truncatedLines} = boundedLines(text);
    const minuteCandidates = items.filter((item) => !item.archived && item.unit === "分钟").map((item) => ({id: item.id, name: item.name}));
    const out: SandboxLine[] = lines.map((line, index) => {
        const marker = parseYeguifMarker(`sandbox-${index}`, line);
        if (!marker) return {input: line, state: "invalid" as const, reasonKey: "today.sandbox.reason.invalid"};
        const itemId = resolveYeguifItemId(marker.type, mappings, minuteCandidates);
        if (!itemId) return {input: line, state: "unmatched" as const, reasonKey: "today.sandbox.reason.unmapped"};
        const target = minuteCandidates.find((item) => item.id === itemId);
        return target ? {input: line, state: "matched" as const, targetName: target.name} : {input: line, state: "unmatched" as const, reasonKey: "today.sandbox.reason.unmapped"};
    });
    return summarize("yeguif", out, truncatedLines);
}

/** 健康试算：逐行解析严格格式；指标按收件箱映射归属；目标单位不匹配即单位冲突。 */
export function sandboxHealthSample(text: string, bindings: ReadonlyArray<{metric: HealthInboxMetric; itemNames: readonly string[]}>, todayKey: string): SandboxOutcome {
    const {lines, truncatedLines} = boundedLines(text);
    const unitFor = (metric: HealthInboxMetric): string => (metric === "steps" ? "步" : "公斤");
    const out: SandboxLine[] = lines.map((line) => {
        const entry = parseHealthInboxLine(line);
        if (!entry) return {input: line, state: "invalid" as const, reasonKey: "today.sandbox.reason.invalid"};
        if (entry.localDate > todayKey) return {input: line, state: "invalid" as const, reasonKey: "today.sandbox.reason.future"};
        const names = bindings.filter((binding) => binding.metric === entry.metric).flatMap((binding) => binding.itemNames);
        if (!names.length) return {input: line, state: "unmatched" as const, reasonKey: "today.sandbox.reason.unmapped"};
        return {input: line, state: "matched" as const, targetName: names.join("、") + `（${unitFor(entry.metric)}）`};
    });
    return summarize("health", out, truncatedLines);
}

/** 笔记推导试算：粘贴行作为伪块内容跑生产解析；偏好未就绪如实提示（不是已连接）。
    伪块按 todayKey 合成日记 ial/路径（日期取注入的 today，不是系统时钟）。 */
export function sandboxNoteQuerySample(text: string, rawPreference: unknown, todayKey: string, targetItemName?: string): SandboxOutcome {
    const {lines, truncatedLines} = boundedLines(text);
    const digits = todayKey.replace(/-/g, "");
    const pseudoRows = lines.map((content, index) => ({
        id: `sandbox${String(index).padStart(6, "0")}`,
        content,
        root_id: "sandbox-doc",
        root_ial: `custom-dailynote-${digits}="${todayKey}"`,
        root_hpath: `/${todayKey.slice(0, 4)} /${todayKey.slice(5, 7)} /${todayKey}/`,
    }));
    const entries = parseNoteQueryRows(pseudoRows, rawPreference);
    const matchedBlocks = new Map(entries.map((entry) => [entry.blockId, entry]));
    const out: SandboxLine[] = lines.map((line, index) => {
        const key = `sandbox${String(index).padStart(6, "0")}`;
        const hit = matchedBlocks.get(key);
        if (hit) return targetItemName ? {input: line, state: "matched" as const, targetName: targetItemName} : {input: line, state: "matched" as const};
        return {input: line, state: "unmatched" as const, reasonKey: "today.sandbox.reason.unmatched"};
    });
    return summarize("notequery", out, truncatedLines);
}
