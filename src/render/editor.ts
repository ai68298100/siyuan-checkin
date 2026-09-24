/* 打卡项编辑器视图：从 index.ts 外置；依赖以 EditorViewContext 显式传入。 */
import {t} from "../i18n";
import {countCompletedDays, dateKey} from "../model";
import {currentCalendarDate, escapeHtml, formatNumber, formatScheduleLabel, getEditorStep, getRecordStep, getTargetLabel, renderIconMarkup} from "../shared";
import {getRecordStepInputStep} from "../record-step";
import {CHECKIN_TEMPLATES, ICON_GROUPS, ICON_SEARCH_KEYWORDS, KIND_OPTIONS, RECOMMENDED_TEMPLATES, TEMPLATE_PACKS, templateGroupLabel, templateName, templateNote, templatePackName} from "../catalog";
import {KIND_LABELS, PRIORITY_LABELS, SCHEDULE_LABELS, TIME_SLOT_LABELS} from "../ui/labels";
import type {TodayGroupMode} from "../view-preferences";
import type {CheckinItem, CheckinKind, CheckinPriority, CheckinSchedule, CheckinTimeSlot, CheckinStore, CompletionSource, ScheduleType, TomatoValueMode, UserTemplate} from "../types";
import {renderSaveStatusView, renderSyncNoticeView, type SaveState} from "./fragments";
import {collectAnchorChoices} from "../features/note-anchor-picker";

const weekdaysFromSunday = (): string[] => [0, 1, 2, 3, 4, 5, 6].map((index) => t(`date.wd${index}`));

/** T-1349：模板区初始只展示前 N 个，其余经「显示全部」展开；搜索/分组筛选时自动全显。 */
export const TEMPLATE_BATCH_SIZE = 24;

/** Keep the initial and live previews aligned with the action paths on Today. */
export function describeEditorPreviewActions(input: {
    kind: CheckinKind;
    unit: string;
    recordStep: number;
    scheduleType: ScheduleType;
    quotaCountMode?: "dates" | "value";
    completionSource?: CompletionSource;
    directionAtMost?: boolean;
}): {label: string; detail: string} {
    const atMost = input.directionAtMost && input.scheduleType === "daily";
    const isBinary = input.kind === "binary" && input.scheduleType !== "quota";
    const canFocus = (input.kind === "duration" || input.completionSource === "tomato" && input.kind !== "binary") && !atMost;
    if (canFocus) return {label: `${t("item.focus")} · ${t("item.manualShort")}`, detail: ""};
    if (isBinary) return {label: `${t(atMost ? "item.recordLapse" : "item.checkin")} · ${t("item.noteShort")}`, detail: ""};
    const stepText = formatNumber(input.recordStep);
    const longStep = stepText.length > 4 || [...input.unit].length > 4;
    return {
        label: `${longStep ? t("item.record") : t("editor.recordStep", {n: stepText, unit: input.unit})} · ${t("item.exactShort")}`,
        detail: longStep || input.scheduleType === "quota" && input.quotaCountMode === "dates"
            ? t("item.quickCustom", {value: stepText, unit: input.unit}) : "",
    };
}

export function describeEditorPreviewMeta(input: {
    kind: CheckinKind;
    unit: string;
    target: number;
    scheduleType: ScheduleType;
    scheduleLabel: string;
    quotaAmount?: number;
    quotaCountMode?: "dates" | "value";
    directionAtMost?: boolean;
}): string {
    const parts = [t(KIND_LABELS[input.kind])];
    if (input.kind !== "binary" || input.scheduleType === "quota") {
        const target = formatNumber(input.scheduleType === "quota" ? input.quotaAmount || input.target : input.target);
        const unit = input.scheduleType === "quota" && input.quotaCountMode === "dates" ? t("common.days") : input.unit;
        parts.push(input.directionAtMost && input.scheduleType === "daily"
            ? `0 · ${t("item.limitValue", {value: target, unit})}` : `0 / ${target} ${unit}`);
    }
    return [...parts, input.scheduleLabel].join(" · ");
}

export interface EditorViewContext {
    store: CheckinStore;
    userTemplates: UserTemplate[];
    customIconLibrary: string[];
    editingId?: string;
    appearance: "light" | "dark";
    todayGroupMode: TodayGroupMode;
    saveState: SaveState;
    syncNoticeActive: boolean;
    /** T-1349：最近使用的内置模板名（zh 名锚点），用于「最近使用」置顶行；缺省视为空。 */
    recentTemplates?: string[];
    /** T-1233：当前编辑项的锚点块回写被挂起（内核不可达/块不存在）。 */
    anchorSuspended?: boolean;
}

export function renderEditorView(ctx: EditorViewContext): string {
    const item = ctx.editingId ? ctx.store.items.find((candidate) => candidate.id === ctx.editingId) : undefined;
    const schedule: CheckinSchedule = item?.schedule || {type: "daily"};
    const weekdays = schedule.weekdays || [1, 2, 3, 4, 5, 6, 0];
    const intervalDays = schedule.intervalDays || 2;
    const anchorDate = schedule.anchorDate || item?.createdDate || dateKey(currentCalendarDate());
    const quotaPeriod = schedule.type === "quota" ? schedule.quota?.period || "week" : "week";
    const quotaAmount = schedule.type === "quota" ? schedule.quota?.amount || 3 : 3;
    const quotaCountMode = schedule.type === "quota" ? schedule.quota?.countMode || "dates" : "dates";
    const selectedIcon = item?.icon || "✓";
    /* 组件商店（T-116）：默认「全部」视图一次看全内置 9 组；「我的」页签承载自定义图标库。 */
    const selectedIconGroup: string = "all";
    const allIconCount = ICON_GROUPS.reduce((sum, group) => sum + group.icons.length, 0);
    const imageIcons = ctx.customIconLibrary.filter((icon) => /^(data:image|https?:)/.test(icon));
    const textIcons = ctx.customIconLibrary.filter((icon) => !/^(data:image|https?:)/.test(icon));
    const iconSizeSteps = [16, 20, 28, 40];
    const selectedKind = item?.kind || "binary";
    const selectedKindOption = KIND_OPTIONS.find((option) => option.kind === selectedKind) || KIND_OPTIONS[0];
    const selectedUnit = item?.unit || selectedKindOption.defaultUnit;
    const selectedRecordStep = getRecordStep(selectedKind, selectedUnit, item?.recordStep);
    const editorTarget = item?.target || (selectedKind === "duration" && selectedUnit === "小时" ? 0.5 : selectedKindOption.step);
    /* 仅编辑已有项目时计算历史达成天数；新建表单无需扫描事件。 */
    const completedDays = item ? countCompletedDays(ctx.store, item, currentCalendarDate()) : 0;
    const groupSuggestions = [...new Set([
        ...ctx.store.items.map((candidate) => candidate.group || ""),
        ...CHECKIN_TEMPLATES.map((template) => template.group),
    ].filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
    const anchorChoices = collectAnchorChoices(ctx.store.items);
    const anchorChoiceMarkup = anchorChoices.length
        ? anchorChoices.map((choice) => `<button type="button" class="lc-checkin__anchor-choice" data-anchor-choice="${escapeHtml(choice.blockId)}" data-anchor-search-text="${escapeHtml([choice.blockId, ...choice.labels].join(" "))}"><strong>${escapeHtml(choice.labels.join("、") || t("editor.anchorUntitled"))}</strong><small>${escapeHtml(choice.blockId)}</small></button>`).join("")
        : `<p class="lc-checkin__anchor-empty" data-anchor-empty>${t("editor.anchorNoKnown")}</p>`;
    const templateGroups = [...new Set(CHECKIN_TEMPLATES.map((template) => template.group))];
    const templateChip = (template: (typeof CHECKIN_TEMPLATES)[number], index: number, options: {overflow?: boolean; identity?: boolean} = {}): string => {
        const searchText = [templateName(template), templateNote(template), templateGroupLabel(template.group), template.unit, t(KIND_LABELS[template.kind]), t(SCHEDULE_LABELS[template.schedule.type])].join(" ");
        const summary = template.target === 1 && template.kind === "binary" ? t(SCHEDULE_LABELS[template.schedule.type]) : `${template.target} ${template.unit} · ${t(SCHEDULE_LABELS[template.schedule.type])}`;
        /* data-template-index 仅主列表携带（文档内唯一，供筛选/溢出/定位）；
           应用钩子统一为 data-template-apply，供委托点击与最近使用/精选行复用。 */
        const identity = options.identity ? ` data-template-index="${index}"` : "";
        const overflow = options.overflow ? " hidden data-template-overflow" : "";
        return `<button class="lc-checkin__template" type="button" data-template-apply="${index}"${identity} data-template-group-value="${escapeHtml(template.group)}" data-template-search-text="${escapeHtml(searchText)}" title="${escapeHtml(templateNote(template))}" aria-label="${t("item.useTemplate", {name: templateName(template)})}" aria-pressed="false"${overflow}><span>${escapeHtml(template.icon)}</span><strong>${escapeHtml(templateName(template))}</strong><small>${escapeHtml(summary)}</small></button>`;
    };
    const recentIndexes = (ctx.recentTemplates || [])
        .map((name) => CHECKIN_TEMPLATES.findIndex((template) => template.name === name))
        .filter((index) => index >= 0)
        .slice(0, 6);
    const recentMarkup = recentIndexes.length ? `<div class="lc-checkin__field-heading" data-template-recent-heading><span>${t("editor.recentTemplates")}</span></div><div class="lc-checkin__templates" data-template-recent>${recentIndexes.map((index) => templateChip(CHECKIN_TEMPLATES[index], index, {})).join("")}</div>` : "";
    /* T-1357：精选推荐位——没有最近使用时展示跨类别精选，帮助新用户快速起步。 */
    const recommendedIndexes = recentIndexes.length ? [] : RECOMMENDED_TEMPLATES
        .map((name) => CHECKIN_TEMPLATES.findIndex((template) => template.name === name))
        .filter((index) => index >= 0);
    const recommendedMarkup = recommendedIndexes.length ? `<div class="lc-checkin__field-heading" data-template-recommended-heading><span>${t("editor.recommendedTemplates")}</span></div><div class="lc-checkin__templates" data-template-recommended>${recommendedIndexes.map((index) => templateChip(CHECKIN_TEMPLATES[index], index, {})).join("")}</div>` : "";
    /* T-1454：场景组合包——可预览的成组模板（应用仍逐条走表单确认）。 */
    const packsMarkup = `<div class="lc-checkin__field-heading" data-pack-heading><span>${t("editor.packs")}</span><small>${t("editor.packsHint")}</small></div><div class="lc-checkin__templates" data-template-packs>${TEMPLATE_PACKS.map((pack) => `<button class="lc-checkin__template" type="button" data-pack-chip="${escapeHtml(pack.id)}" aria-pressed="false"><span>${escapeHtml(pack.icon)}</span><strong>${escapeHtml(templatePackName(pack))}</strong><small>${t("editor.packCount", {n: pack.templates.length})}</small></button>`).join("")}</div><div data-pack-preview hidden></div>`;
    const userTemplateMarkup = ctx.userTemplates.length ? `<div class="lc-checkin__field-heading"><span>${t("item.myTemplates")}</span><small>${t("item.templateCount", {n: ctx.userTemplates.length})}</small></div><div class="lc-checkin__templates" data-user-template-list>${ctx.userTemplates.map((template) => `<div class="lc-checkin__template-wrap"><button class="lc-checkin__template" type="button" data-user-template-id="${escapeHtml(template.id)}" data-template-group-value="${escapeHtml(template.group)}" data-template-search-text="${escapeHtml([template.name, template.group, template.note, template.unit, t(KIND_LABELS[template.kind]), t(SCHEDULE_LABELS[template.schedule.type])].join(" "))}" title="${escapeHtml(template.note)}" aria-label="${t("item.useMyTemplate", {name: template.name})}"><span>${renderIconMarkup(template.icon)}</span><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(template.kind === "binary" ? t(SCHEDULE_LABELS[template.schedule.type]) : `${template.target} ${template.unit} · ${t(SCHEDULE_LABELS[template.schedule.type])}`)}</small></button><button class="lc-checkin__template-delete" type="button" data-user-template-delete="${escapeHtml(template.id)}" aria-label="${t("item.deleteTemplate", {name: template.name})}">${t("item.delete")}</button></div>`).join("")}</div>` : "";
    const initialPriority = item?.priority || "medium";
    const initialTimeSlot = item?.timeSlot || "any";
    const initialCompletionSource: CompletionSource = item?.completionSource === "tomato" ? "tomato" : "manual";
    const initialTomatoMode: TomatoValueMode = item?.tomatoMode === "sessions" ? "sessions" : "minutes";
    const previewActions = describeEditorPreviewActions({
        kind: selectedKind, unit: selectedUnit, recordStep: selectedRecordStep,
        scheduleType: schedule.type, quotaCountMode, completionSource: initialCompletionSource,
        directionAtMost: item?.direction === "atMost",
    });
    const previewMeta = describeEditorPreviewMeta({
        kind: selectedKind, unit: selectedUnit, target: editorTarget,
        scheduleType: schedule.type, scheduleLabel: formatScheduleLabel(schedule), quotaAmount, quotaCountMode,
        directionAtMost: item?.direction === "atMost",
    });
    const advancedSummary = [
        item?.group || t("review.ungrouped"),
        PRIORITY_LABELS[initialPriority] && t(PRIORITY_LABELS[initialPriority]),
        initialTimeSlot === "any" ? "" : t(TIME_SLOT_LABELS[initialTimeSlot]),
        initialCompletionSource === "tomato" ? t("source.tomato") : t("source.manual"),
        formatScheduleLabel(schedule),
    ].filter(Boolean).join(" · ");
    const templates = !item ? `<details class="lc-checkin__template-section" data-template-disclosure>
            <summary class="lc-checkin__template-summary"><span>${t("editor.templateHeading")}</span><em>${CHECKIN_TEMPLATES.length}</em><small>${t("editor.templateHint")}</small><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary>
            <div class="lc-checkin__template-browser">
            ${recentMarkup}
            ${recommendedMarkup}
            ${packsMarkup}
            <div class="lc-checkin__field-heading"><span>${t("editor.templateHeading")}</span><small>${t("editor.templateHint")}</small></div>
            <label class="lc-checkin__search-field">
                <span class="lc-checkin__visually-hidden">${t("editor.templateSearchAria")}</span>
                <span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span>
                <input type="search" data-template-query autocomplete="off" placeholder="${t("editor.templateSearchPh")}" />
                <button type="button" data-action="clear-template-query" aria-label="${t("editor.clearTemplateSearch")}" title="${t("editor.clear")}" hidden>×</button>
            </label>
            <div class="lc-checkin__filter-row" role="group" aria-label="${t("editor.templateGroups")}">
                <button class="is-selected" type="button" data-template-group="all" aria-pressed="true">${t("editor.groupAll")}</button>
                ${templateGroups.map((group) => `<button type="button" data-template-group="${escapeHtml(group)}" aria-pressed="false">${escapeHtml(templateGroupLabel(group))}</button>`).join("")}
            </div>
            <div class="lc-checkin__result-line"><span data-template-count aria-live="polite">${t("editor.templateCount", {n: CHECKIN_TEMPLATES.length})}</span><button type="button" data-action="clear-template-filter" hidden>${t("review.clearFilters")}</button></div>
            <div class="lc-checkin__templates" data-template-list>${CHECKIN_TEMPLATES.map((template, index) => templateChip(template, index, {overflow: index >= TEMPLATE_BATCH_SIZE, identity: true})).join("")}</div>
            <button class="lc-checkin__text-button" type="button" data-action="template-show-all" aria-expanded="false"${CHECKIN_TEMPLATES.length > TEMPLATE_BATCH_SIZE ? "" : " hidden"}>${t("editor.templateShowAll", {n: CHECKIN_TEMPLATES.length})}</button>
            ${userTemplateMarkup}
            <div class="lc-checkin__search-empty" data-template-empty hidden><strong>${t("editor.templateEmpty")}</strong><span>${t("editor.templateEmptyHint")}</span><button type="button" data-action="clear-template-filter">${t("editor.viewAll")}</button></div>
            </div>
        </details>` : "";
    return `<div class="lc-checkin lc-checkin--editor" data-appearance="${ctx.appearance}">
            <header class="lc-checkin__editor-header">
                <button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button>
                <h1 class="lc-checkin__title">${item ? t("editor.edit") : t("editor.create")}</h1>
            </header>
            <form class="lc-checkin__form">
                <div class="lc-checkin__editor-columns">
                <div class="lc-checkin__form-scroll">
                    ${templates}
                    <label class="lc-checkin__field lc-checkin__field--name"><span>${t("occ.name")}</span><input name="name" type="text" required maxlength="40" placeholder="${t("editor.namePlaceholder")}" value="${escapeHtml(item?.name || "")}" /></label>
                    <div class="lc-checkin__field lc-checkin__field--icons">
                        <span>${t("editor.icon")}</span>
                        <details class="lc-checkin__icon-popup" data-icon-popup>
                        <summary type="button"><span class="lc-checkin__popup-current" data-popup-current-icon>${renderIconMarkup(selectedIcon)}</span><span class="lc-checkin__popup-summary-text">${t("editor.changeIcon")}</span><span class="lc-checkin__popup-arrow" aria-hidden="true">⌄</span></summary>
                        <div class="lc-checkin__popup-body">
                        <label class="lc-checkin__search-field lc-checkin__search-field--icon">
                            <span class="lc-checkin__visually-hidden">${t("editor.iconSearchAria")}</span>
                            <span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span>
                            <input type="search" data-icon-query autocomplete="off" placeholder="${t("editor.iconSearchPh")}" />
                            <button type="button" data-action="clear-icon-query" aria-label="${t("editor.clearIconSearch")}" title="${t("editor.clear")}" hidden>×</button>
                        </label>
                        <div class="lc-checkin__icon-tabs" role="group" aria-label="${t("editor.iconGroups")}"><button type="button" data-icon-group="all" aria-pressed="${selectedIconGroup === "all" ? "true" : "false"}" class="${selectedIconGroup === "all" ? "is-selected" : ""}">${t("editor.iconAll")}<small>${allIconCount}</small></button><button type="button" data-icon-group="mine" aria-pressed="${selectedIconGroup === "mine" ? "true" : "false"}" class="${selectedIconGroup === "mine" ? "is-selected" : ""}">${t("editor.iconMine")}<small>${ctx.customIconLibrary.length}</small></button>${ICON_GROUPS.map((group) => `<button type="button" data-icon-group="${group.id}" aria-pressed="${selectedIconGroup === group.id ? "true" : "false"}" class="${selectedIconGroup === group.id ? "is-selected" : ""}">${t(`iconGroup.${group.id}`)}<small>${group.icons.length}</small></button>`).join("")}</div>
                        <div class="lc-checkin__result-line"><span data-icon-count aria-live="polite">${t("editor.iconCount", {name: t("editor.iconAll"), n: allIconCount})}</span></div>
                        <div class="lc-checkin__icon-size-strip" data-icon-size-strip role="img" aria-label="${t("editor.iconSizePreview")}">${iconSizeSteps.map((size) => `<span class="lc-checkin__size-cell" style="--size-preview-px: ${size}px"><i class="lc-checkin__size-icon">${renderIconMarkup(selectedIcon)}</i><small>${size}</small></span>`).join("")}</div>
                        <div class="lc-checkin__icon-results" data-icon-results>${ICON_GROUPS.map((group) => `<section class="lc-checkin__icon-panel" data-icon-panel="${group.id}" data-icon-group-search="${escapeHtml([group.name, ...group.keywords].join(" "))}" ${selectedIconGroup === "all" || selectedIconGroup === group.id ? "" : "hidden"}><small class="lc-checkin__icon-panel-heading">${t(`iconGroup.${group.id}`)}</small><div class="lc-checkin__icon-grid">${group.icons.map((icon) => {
        const keywords = ICON_SEARCH_KEYWORDS[icon] || "";
        return `<button class="lc-checkin__icon-option ${selectedIcon === icon ? "is-selected" : ""}" type="button" data-icon="${escapeHtml(icon)}" data-icon-search-text="${escapeHtml([icon, group.name, ...group.keywords, keywords].join(" "))}" aria-label="${t("editor.iconSelectAria", {label: t(`iconGroup.${group.id}`), icon})}" title="${escapeHtml(keywords || group.name)}">${escapeHtml(icon)}</button>`;
    }).join("")}</div></section>`).join("")}${ctx.customIconLibrary.length ? `<section class="lc-checkin__icon-panel" data-icon-panel="mine" data-icon-group-search="${escapeHtml(t("editor.iconMine"))}" ${selectedIconGroup === "mine" ? "" : "hidden"}><small class="lc-checkin__icon-panel-heading">${t("editor.iconMine")}</small>${imageIcons.length ? `<div class="lc-checkin__icon-subgroup"><small>${t("editor.customImageIcons")}</small><div class="lc-checkin__icon-grid">${imageIcons.map((icon) => `<button class="lc-checkin__icon-option" type="button" data-library-icon="${escapeHtml(icon)}" data-icon="${escapeHtml(icon)}" data-icon-search-text="${escapeHtml(`${t("editor.iconMine")} ${t("editor.customImageIcons")}`)}" aria-label="${t("editor.useCustomIcon")}">${renderIconMarkup(icon)}</button>`).join("")}</div></div>` : ""}${textIcons.length ? `<div class="lc-checkin__icon-subgroup"><small>${t("editor.customTextIcons")}</small><div class="lc-checkin__icon-grid">${textIcons.map((icon) => `<button class="lc-checkin__icon-option" type="button" data-library-icon="${escapeHtml(icon)}" data-icon="${escapeHtml(icon)}" data-icon-search-text="${escapeHtml(`${t("editor.iconMine")} ${t("editor.customTextIcons")}`)}" aria-label="${t("editor.useCustomIcon")}">${renderIconMarkup(icon)}</button>`).join("")}</div></div>` : ""}</section>` : ""}</div>
                        <div class="lc-checkin__search-empty lc-checkin__search-empty--compact" data-icon-empty hidden><strong>${t("editor.iconEmpty")}</strong><button type="button" data-action="clear-icon-query">${t("review.clearFilters")}</button></div>
                        <div class="lc-checkin__custom-icon" data-custom-icon-panel ${selectedIconGroup === "mine" ? "" : "hidden"}>
                            <div class="lc-checkin__custom-icon-heading"><strong>${t("editor.customIcon")}</strong><small>${t("editor.customIconHint")}</small></div>
                            <div class="lc-checkin__custom-icon-row"><input type="text" data-custom-icon-input maxlength="500" value="${escapeHtml(ICON_GROUPS.some((group) => group.icons.includes(selectedIcon)) ? "" : selectedIcon)}" placeholder="${t("editor.customIconPh")}" aria-label="${t("editor.customIcon")}" /><button type="button" data-action="apply-custom-icon">${t("editor.apply")}</button></div>
                            <div class="lc-checkin__custom-icon-tools"><label class="lc-checkin__file-button"><input type="file" data-custom-icon-file accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" />${t("editor.uploadImage")}</label><button type="button" data-action="download-custom-icon">${t("editor.saveRemote")}</button><button type="button" data-action="open-iconfont">${t("editor.iconfont")}</button></div>
                            <div class="lc-checkin__custom-icon-tools"><label class="lc-checkin__file-button"><input type="file" data-custom-icon-library accept=".json,.txt,application/json,text/plain" />${t("editor.importLibrary")}</label><small>${t("editor.importLibraryHint")}</small></div>
                            ${ctx.customIconLibrary.length ? "" : `<small class="lc-checkin__custom-library-empty">${t("editor.customLibraryEmpty")}</small>`}
                        </div>
                        </div>
                        </details>
                        <input name="icon" type="hidden" value="${escapeHtml(selectedIcon)}" />
                    </div>
                    <fieldset class="lc-checkin__kind-field"><legend>${t("occ.kind")}</legend><div class="lc-checkin__kind-grid">${KIND_OPTIONS.map((option) => `<label class="lc-checkin__kind-option"><input type="radio" name="kind" value="${option.kind}" ${selectedKind === option.kind ? "checked" : ""}/><span><strong>${t(KIND_LABELS[option.kind])}</strong><small>${t(`kindDesc.${option.kind}`)}</small></span></label>`).join("")}</div></fieldset>
                    <div class="lc-checkin__kind-help" data-kind-help>${t(`kindDesc.${selectedKind}`)}</div>
                    <div class="lc-checkin__form-row" data-value-fields>
                        <label class="lc-checkin__field"><span data-target-label>${escapeHtml(getTargetLabel(selectedKind))}</span><input name="target" type="number" min="${getEditorStep(selectedKind, selectedUnit)}" step="${getEditorStep(selectedKind, selectedUnit)}" required value="${escapeHtml(editorTarget.toString())}" /></label>
                        <label class="lc-checkin__field"><span>${t("occ.unit")}</span><input name="unit" type="text" maxlength="12" placeholder="${escapeHtml(selectedKindOption.defaultUnit)}" value="${escapeHtml(selectedUnit)}" /><span class="lc-checkin__unit-options" data-unit-options>${selectedKindOption.units.map((unit) => `<button type="button" data-unit="${escapeHtml(unit)}" aria-pressed="${selectedUnit === unit ? "true" : "false"}" class="${selectedUnit === unit ? "is-selected" : ""}">${escapeHtml(unit)}</button>`).join("")}</span></label>
                        <label class="lc-checkin__field" data-record-step-field><span>${t("editor.recordStepLabel")}</span><input name="recordStep" type="number" min="${getRecordStepInputStep(selectedKind, selectedUnit)}" step="${getRecordStepInputStep(selectedKind, selectedUnit)}" required value="${formatNumber(selectedRecordStep)}" /><small>${t("editor.recordStepHint")}</small></label>
                    </div>
                </div>
                <aside class="lc-checkin__editor-side">
                    <section class="lc-checkin__editor-preview" aria-label="${t("editor.previewLabel")}">
                        <div class="lc-checkin__field-heading"><span>${t("editor.previewLabel")}</span><small>${t("editor.previewHint")}</small></div>
                        <article class="lc-checkin__preview-card" data-editor-preview>
                            <span class="lc-checkin__preview-icon" data-preview-icon>${renderIconMarkup(selectedIcon)}</span>
                            <div class="lc-checkin__preview-body"><strong data-preview-name>${escapeHtml(item?.name || t("editor.unnamed"))}</strong><small data-preview-meta>${escapeHtml(previewMeta)}</small><small data-preview-record-step ${previewActions.detail ? "" : "hidden"}>${escapeHtml(previewActions.detail)}</small><span class="lc-checkin__preview-progress" data-preview-progress ${selectedKind === "binary" && schedule.type !== "quota" ? "hidden" : ""}><i></i></span></div>
                            <span class="lc-checkin__preview-action" data-preview-action>${escapeHtml(previewActions.label)}</span>
                        </article>
                    </section>
                    <details class="lc-checkin__advanced" data-advanced ${item ? "open" : ""}>
                        <summary><span><strong>${t("editor.advanced")}</strong><small data-advanced-summary>${escapeHtml(advancedSummary)}</small></span><span class="lc-checkin__advanced-arrow" aria-hidden="true">⌄</span></summary>
                        <div class="lc-checkin__advanced-content">
                            ${item ? `<div class="lc-checkin__editor-history-summary" data-editor-completed-days aria-label="${t("editor.completedDays", {n: completedDays})}"><span>${t("editor.completedDaysLabel")}</span><strong>${completedDays}</strong></div>` : ""}
                            <div class="lc-checkin__organization-fields">
                                <label class="lc-checkin__field"><span>${t("editor.group")}</span><input name="group" type="text" maxlength="32" placeholder="${t("editor.groupPlaceholder")}" value="${escapeHtml(item?.group || "")}" /><span class="lc-checkin__group-options">${groupSuggestions.slice(0, 8).map((group) => `<button type="button" data-group-value="${escapeHtml(group)}">${escapeHtml(group)}</button>`).join("")}</span></label>
                                <label class="lc-checkin__field"><span>${t("editor.priorityLabel")}</span><select name="priority">${(["high", "medium", "low"] as CheckinPriority[]).map((priority) => `<option value="${priority}" ${initialPriority === priority ? "selected" : ""}>${t(PRIORITY_LABELS[priority])}</option>`).join("")}</select></label>
                                <label class="lc-checkin__field"><span>${t("editor.slotLabel")}</span><select name="timeSlot">${(["any", "morning", "afternoon", "evening"] as CheckinTimeSlot[]).map((slot) => `<option value="${slot}" ${initialTimeSlot === slot ? "selected" : ""}>${t(TIME_SLOT_LABELS[slot])}</option>`).join("")}</select></label>
                                <label class="lc-checkin__field"><span>${t("editor.autoArchiveLabel")}</span><input name="autoArchiveDays" type="number" inputmode="numeric" min="1" max="1000000" step="1" value="${item?.autoArchive?.afterDays ?? ""}" placeholder="${t("editor.autoArchiveOff")}" aria-label="${t("editor.autoArchiveLabel")}" /><small>${t("editor.autoArchiveHint")}</small></label>
                                <label class="lc-checkin__field"><span>${t("editor.streakToleranceLabel")}</span><input name="streakToleranceDays" type="number" inputmode="numeric" min="1" max="30" step="1" value="${item?.streakTolerance ?? ""}" placeholder="${t("editor.streakToleranceOff")}" aria-label="${t("editor.streakToleranceLabel")}" /><small>${t("editor.streakToleranceHint")}</small></label>
                                <label class="lc-checkin__field lc-checkin__field-check lc-checkin__field-check--direction" data-direction-at-most-field ${schedule.type === "daily" ? "" : "hidden"}><input name="directionAtMost" type="checkbox" ${item?.direction === "atMost" ? "checked" : ""} /><span>${t("editor.directionAtMost")}</span><small>${t("editor.directionAtMostHint")}</small></label>
                                <label class="lc-checkin__field"><span>${t("editor.completionSource")}</span><select name="completionSource"><option value="manual" ${initialCompletionSource === "manual" ? "selected" : ""}>${t("source.manual")}</option><option value="tomato" ${initialCompletionSource === "tomato" ? "selected" : ""}>${t("source.tomato")}</option></select></label>
                                <label class="lc-checkin__field" data-tomato-mode-field ${initialCompletionSource === "tomato" ? "" : "hidden"}><span>${t("editor.tomatoModeLabel")}</span><select name="tomatoMode"><option value="minutes" ${initialTomatoMode === "minutes" ? "selected" : ""}>${t("editor.tomatoMinutesOpt")}</option><option value="sessions" ${initialTomatoMode === "sessions" ? "selected" : ""}>${t("editor.tomatoSessionsOpt")}</option></select></label>
                                <p class="lc-checkin__integration-help" data-tomato-help ${initialCompletionSource === "tomato" ? "" : "hidden"}>${t("editor.tomatoHelp")}</p>
                                <div class="lc-checkin__field lc-checkin__anchor-field" data-anchor-picker>
                                    <span>${t("editor.anchorTitle")}</span>
                                    <div class="lc-checkin__anchor-input-row"><input name="anchorBlockId" type="text" maxlength="64" placeholder="${t("editor.anchorPlaceholder")}" value="${escapeHtml(item?.noteAnchor?.blockId || "")}" /><button type="button" class="lc-checkin__field-action" data-action="anchor-open-picker">${t("editor.anchorChoose")}</button><button type="button" class="lc-checkin__field-action" data-action="anchor-clear" aria-label="${t("editor.anchorClear")}" title="${t("editor.anchorClear")}">×</button></div>
                                    <small>${t("editor.anchorHint")}</small>
                                    <div class="lc-checkin__anchor-browser" data-anchor-browser hidden>
                                        <div class="lc-checkin__anchor-browser-tools"><input type="search" data-anchor-query placeholder="${t("editor.anchorSearch")}" aria-label="${t("editor.anchorSearch")}" /><button type="button" class="lc-checkin__field-action" data-action="anchor-create">${t("editor.anchorCreate")}</button></div>
                                        <div class="lc-checkin__anchor-create-row" data-anchor-create-row hidden><label><span>${t("editor.anchorNotebook")}</span><select data-anchor-notebook><option value="">${t("editor.anchorNotebookLoading")}</option></select></label><label><span>${t("editor.anchorDocTitle")}</span><input type="text" data-anchor-doc-title value="${escapeHtml(item?.name || "")}" /></label><button type="button" class="lc-checkin__field-action" data-action="anchor-create-confirm">${t("common.confirm")}</button></div>
                                        <div class="lc-checkin__anchor-options" data-anchor-options>${anchorChoiceMarkup}</div>
                                        <p class="lc-checkin__anchor-empty" data-anchor-filter-empty hidden>${t("editor.anchorNoMatches")}</p>
                                    </div>
                                </div>
                                ${ctx.anchorSuspended && item?.noteAnchor ? `<p class="lc-checkin__integration-help" role="alert">${t("editor.anchorSuspended")}</p>` : ""}
                                <label class="lc-checkin__field lc-checkin__field-check lc-checkin__field-check--anchor" data-anchor-append-field><input name="anchorAppendNotes" type="checkbox" ${item?.noteAnchor?.appendNotes ? "checked" : ""} ${item?.noteAnchor?.blockId ? "" : "disabled"} /><span>${t("editor.anchorAppend")}</span><small>${t("editor.anchorAppendHint")}</small></label>
                                <label class="lc-checkin__field lc-checkin__field-check" data-taskhorizon-visible-field><input name="taskHorizonVisible" type="checkbox" ${item?.taskHorizonCalendarVisible !== false ? "checked" : ""} aria-label="${t("editor.thVisible")}" /><span>${t("editor.thVisible")}</span><small>${t("editor.thVisibleHint")}</small></label>
                            </div>
                            <div class="lc-checkin__editor-schedule-fields">
                            <div class="lc-checkin__field"><span>${t("editor.scheduleLabel")}</span><select name="schedule" aria-label="${t("editor.scheduleLabel")}">${Object.entries(SCHEDULE_LABELS).map(([value, label]) => `<option value="${value}" ${schedule.type === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></div>
                            <div class="lc-checkin__weekdays" data-weekdays>${weekdaysFromSunday().map((day, index) => `<label><input type="checkbox" name="weekday" value="${index}" ${weekdays.includes(index) ? "checked" : ""}/><span>${day}</span></label>`).join("")}</div>
                            <div class="lc-checkin__form-row" data-interval-schedule hidden>
                                <label class="lc-checkin__field"><span>${t("editor.intervalDays")}</span><input name="intervalDays" type="number" min="1" max="3650" step="1" value="${intervalDays}" /></label>
                                <label class="lc-checkin__field"><span>${t("editor.anchorDate")}</span><input name="anchorDate" type="date" value="${escapeHtml(anchorDate)}" /><button class="lc-checkin__field-action" type="button" data-action="anchor-today">${t("review.tabDay")}</button></label>
                            </div>
                            <div class="lc-checkin__quota-schedule" data-quota-schedule hidden>
                                <div class="lc-checkin__form-row">
                                    <label class="lc-checkin__field"><span>${t("editor.quotaPeriodLabel")}</span><select name="quotaPeriod"><option value="week" ${quotaPeriod === "week" ? "selected" : ""}>${t("editor.quotaWeekly")}</option><option value="month" ${quotaPeriod === "month" ? "selected" : ""}>${t("editor.quotaMonthly")}</option></select></label>
                                    <label class="lc-checkin__field"><span data-quota-amount-label>${t("editor.quotaAmountLabel")}</span><input name="quotaAmount" type="number" min="1" step="1" value="${formatNumber(quotaAmount)}" /></label>
                                </div>
                                <label class="lc-checkin__field"><span>${t("editor.countModeLabel")}</span><select name="quotaCountMode"><option value="dates" ${quotaCountMode === "dates" ? "selected" : ""}>${t("editor.countModeDates")}</option><option value="value" ${quotaCountMode === "value" ? "selected" : ""}>${t("editor.countModeValue")}</option></select></label>
                                <small class="lc-checkin__quota-help" data-quota-help>${t("editor.quotaHelp")}</small>
                            </div>
                            </div>
                        </div>
                    </details>
                </aside>
                <div class="lc-checkin__editor-actions">
                    <button class="lc-checkin__save-button" type="submit">${item ? t("editor.save") : t("editor.saveNew")}</button>
                    <button class="lc-checkin__text-button" type="button" data-action="save-template">${t("editor.saveTemplate")}</button>
                    ${item ? `<button class="lc-checkin__archive-button" type="button" data-action="archive">${item.archived ? t("editor.restore") : t("editor.archive")}</button><button class="lc-checkin__delete-button" type="button" data-action="delete-item" aria-label="${t("editor.deleteItemAria")}" title="${t("editor.deleteItemAria")}">${t("editor.deleteItem")}</button>` : ""}
            ${renderSaveStatusView(ctx.saveState)}
            ${renderSyncNoticeView(ctx.syncNoticeActive)}
                </div>
            </form>
        </div>`;
}
