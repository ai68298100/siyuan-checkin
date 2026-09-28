/* 统一页面壳（T-1576）：详情页头部与返回路径的单一构造点，按 T-1603 表面路由契约收拢
   标题、上下文（eyebrow）、返回路径、状态区与动作槽。今日/回顾是根页面，保留各自头部变体
   （回顾头部承载区间页签与工具区，无返回键）。DOM 钩子（data-action="back"、
   editor-header/back-button/eyebrow/title 类名）保持原名 = 契约 4 兼容映射，绑定与样式零改动。
   危险区标记沿用既有三页统一方案（editor data-editor-section="danger" / archived
   data-archived-danger / settings data-data-section="reset"），不在此重复登记。 */
import {t} from "../i18n";
import {escapeHtml} from "../shared";

/** 七页联合（同 navigation.ts 的 currentPage；契约 1 PageId）。 */
export type PageId = "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";

export interface PageShellHeadInput {
    /** 返回按钮 aria（默认 common.back；archived 沿用既有专用文案）。 */
    backAria?: string;
    /** 上下文行纯文本（内部转义）。 */
    eyebrow?: string;
    /** 上下文行已转义 HTML（洞察图标等富内容；与 eyebrow 二选一，优先）。 */
    eyebrowHtml?: string;
    /** 标题纯文本（内部转义）。 */
    title: string;
    /** 头部动作槽（新建事项 + 等；调用方保证已转义）。 */
    actionsHtml?: string;
    /** 状态区（role=status；调用方保证已转义）。 */
    statusHtml?: string;
}

export function renderPageShellHead(input: PageShellHeadInput): string {
    const back = `<button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${escapeHtml(input.backAria ?? t("common.back"))}">‹</button>`;
    const eyebrow = input.eyebrowHtml ?? (input.eyebrow ? escapeHtml(input.eyebrow) : "");
    const context = eyebrow ? `<div class="lc-checkin__eyebrow">${eyebrow}</div>` : "";
    return `<header class="lc-checkin__editor-header">${back}<div>${context}<h1 class="lc-checkin__title">${escapeHtml(input.title)}</h1></div>${input.actionsHtml ?? ""}${input.statusHtml ?? ""}</header>`;
}

/** 契约 3 默认返回表：未显式记录 returnTo 的详情页统一回落 today（insights/editor 由各自会话返回栈优先）。 */
export function defaultReturnPage(_page: PageId): "today" {
    return "today";
}

/** 契约 1 SurfaceContext 读侧：把宿主会话态聚合为只读上下文。params 仅登记已落地键；
    日期/范围/滚动/焦点的全量序列化按 T-1599 边界随后续切片迁入（字段可增不可改义）。 */
export interface SurfaceContext {
    page: PageId;
    returnTo?: PageId;
    params: {itemId?: string};
}

export function readSurfaceContext(snapshot: {
    currentPage: PageId;
    editorReturnPage?: "today" | "review" | "insights";
    insightsReturnPage: "today" | "review";
    editingId?: string;
    insightsItemId?: string;
}): SurfaceContext {
    const page = snapshot.currentPage;
    const returnTo = page === "editor"
        ? snapshot.editorReturnPage ?? defaultReturnPage(page)
        : page === "insights" ? snapshot.insightsReturnPage : undefined;
    const itemId = page === "editor" ? snapshot.editingId
        : page === "insights" ? snapshot.insightsItemId : undefined;
    return {page, returnTo, params: itemId ? {itemId} : {}};
}
