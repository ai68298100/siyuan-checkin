/* 打卡项编辑器视图：从 index.ts 外置；依赖以 EditorViewContext 显式传入。 */
import {t} from "../i18n";
import {dateKey} from "../model";
import {currentCalendarDate, escapeHtml, formatNumber, formatScheduleLabel, getEditorStep, getRecordStep, getTargetLabel, renderIconMarkup} from "../shared";
import {CHECKIN_TEMPLATES, ICON_GROUPS, ICON_SEARCH_KEYWORDS, KIND_OPTIONS, templateGroupLabel, templateName, templateNote} from "../catalog";
import {KIND_LABELS, PRIORITY_LABELS, SCHEDULE_LABELS, TIME_SLOT_LABELS} from "../ui/labels";
import type {TodayGroupMode} from "../view-preferences";
import type {CheckinItem, CheckinPriority, CheckinSchedule, CheckinTimeSlot, CheckinStore, CompletionSource, TomatoValueMode, UserTemplate} from "../types";
import {renderSaveStatusView, renderSyncNoticeView, type SaveState} from "./fragments";

const weekdaysFromSunday = (): string[] => [0, 1, 2, 3, 4, 5, 6].map((index) => t(`date.wd${index}`));

export interface EditorViewContext {
    store: CheckinStore;
    userTemplates: UserTemplate[];
    customIconLibrary: string[];
    editingId?: string;
    appearance: "light" | "dark";
    todayGroupMode: TodayGroupMode;
    saveState: SaveState;
    syncNoticeActive: boolean;
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
    const editorTarget = item?.target || (selectedKind === "duration" && selectedUnit === "小时" ? 0.5 : selectedKindOption.step);
    const groupSuggestions = [...new Set([
        ...ctx.store.items.map((candidate) => candidate.group || ""),
        ...CHECKIN_TEMPLATES.map((template) => template.group),
    ].filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
    const templateGroups = [...new Set(CHECKIN_TEMPLATES.map((template) => template.group))];
    const userTemplateMarkup = ctx.userTemplates.length ? `<div class="lc-checkin__field-heading"><span>${t("item.myTemplates")}</span><small>${t("item.templateCount", {n: ctx.userTemplates.length})}</small></div><div class="lc-checkin__templates" data-user-template-list>${ctx.userTemplates.map((template) => `<div class="lc-checkin__template-wrap"><button class="lc-checkin__template" type="button" data-user-template-id="${escapeHtml(template.id)}" data-template-group-value="${escapeHtml(template.group)}" data-template-search-text="${escapeHtml([template.name, template.group, template.note, template.unit, t(KIND_LABELS[template.kind]), t(SCHEDULE_LABELS[template.schedule.type])].join(" "))}" title="${escapeHtml(template.note)}" aria-label="${t("item.useMyTemplate", {name: template.name})}"><span>${escapeHtml(template.icon)}</span><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(template.kind === "binary" ? t(SCHEDULE_LABELS[template.schedule.type]) : `${template.target} ${template.unit}`)}</small></button><button class="lc-checkin__template-delete" type="button" data-user-template-delete="${escapeHtml(template.id)}" aria-label="${t("item.deleteTemplate", {name: template.name})}">${t("item.delete")}</button></div>`).join("")}</div>` : "";
    const initialPriority = item?.priority || "medium";
    const initialTimeSlot = item?.timeSlot || "any";
    const initialCompletionSource: CompletionSource = item?.completionSource === "tomato" ? "tomato" : "manual";
    const initialTomatoMode: TomatoValueMode = item?.tomatoMode === "sessions" ? "sessions" : "minutes";
    const advancedSummary = [
        item?.group || t("review.ungrouped"),
        PRIORITY_LABELS[initialPriority] && t(PRIORITY_LABELS[initialPriority]),
        initialTimeSlot === "any" ? "" : t(TIME_SLOT_LABELS[initialTimeSlot]),
        initialCompletionSource === "tomato" ? "番茄钟联动" : "手动记录",
        formatScheduleLabel(schedule),
    ].filter(Boolean).join(" · ");
    const templates = !item ? `<section class="lc-checkin__template-section">
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
            <div class="lc-checkin__templates" data-template-list>${CHECKIN_TEMPLATES.map((template, index) => {
        const searchText = [templateName(template), template.note, templateGroupLabel(template.group), template.unit, t(KIND_LABELS[template.kind]), t(SCHEDULE_LABELS[template.schedule.type])].join(" ");
        return `<button class="lc-checkin__template" type="button" data-template-index="${index}" data-template-group-value="${escapeHtml(template.group)}" data-template-search-text="${escapeHtml(searchText)}" title="${escapeHtml(templateNote(template))}" aria-label="${t("item.useTemplate", {name: templateName(template)})}" aria-pressed="false"><span>${escapeHtml(template.icon)}</span><strong>${escapeHtml(templateName(template))}</strong><small>${escapeHtml(template.target === 1 && template.kind === "binary" ? t(SCHEDULE_LABELS[template.schedule.type]) : `${template.target} ${template.unit}`)}</small></button>`;
    }).join("")}</div>${userTemplateMarkup}
            <div class="lc-checkin__search-empty" data-template-empty hidden><strong>${t("editor.templateEmpty")}</strong><span>${t("editor.templateEmptyHint")}</span><button type="button" data-action="clear-template-filter">${t("editor.viewAll")}</button></div>
        </section>` : "";
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
                        <div class="lc-checkin__icon-tabs" role="group" aria-label="${t("editor.iconGroups")}"><button type="button" data-icon-group="all" aria-pressed="${selectedIconGroup === "all" ? "true" : "false"}" class="${selectedIconGroup === "all" ? "is-selected" : ""}">${t("editor.iconAll")}<small>${allIconCount}</small></button>${ICON_GROUPS.map((group) => `<button type="button" data-icon-group="${group.id}" aria-pressed="${selectedIconGroup === group.id ? "true" : "false"}" class="${selectedIconGroup === group.id ? "is-selected" : ""}">${t(`iconGroup.${group.id}`)}<small>${group.icons.length}</small></button>`).join("")}<button type="button" data-icon-group="mine" aria-pressed="${selectedIconGroup === "mine" ? "true" : "false"}" class="${selectedIconGroup === "mine" ? "is-selected" : ""}">${t("editor.iconMine")}<small>${ctx.customIconLibrary.length}</small></button></div>
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
                    </div>
                </div>
                <aside class="lc-checkin__editor-side">
                    <section class="lc-checkin__editor-preview" aria-label="${t("editor.previewLabel")}">
                        <div class="lc-checkin__field-heading"><span>${t("editor.previewLabel")}</span><small>${t("editor.previewHint")}</small></div>
                        <article class="lc-checkin__preview-card" data-editor-preview>
                            <span class="lc-checkin__preview-icon" data-preview-icon>${renderIconMarkup(selectedIcon)}</span>
                            <div class="lc-checkin__preview-body"><strong data-preview-name>${escapeHtml(item?.name || t("editor.unnamed"))}</strong><small data-preview-meta>${escapeHtml(selectedKind === "binary" ? `${t("kind.binary")} · ` + formatScheduleLabel(schedule) : `${t(KIND_LABELS[selectedKind])} · 0 / ${formatNumber(editorTarget)} ${selectedUnit} · ${formatScheduleLabel(schedule)}`)}</small><span class="lc-checkin__preview-progress" data-preview-progress ${selectedKind === "binary" ? "hidden" : ""}><i></i></span></div>
                            <span class="lc-checkin__preview-action" data-preview-action>${selectedKind === "binary" ? t("item.checkin") : `+${formatNumber(getRecordStep(selectedKind, selectedUnit))} ${escapeHtml(selectedUnit)}`}</span>
                        </article>
                    </section>
                    <details class="lc-checkin__advanced" data-advanced ${item ? "open" : ""}>
                        <summary><span><strong>${t("editor.advanced")}</strong><small data-advanced-summary>${escapeHtml(advancedSummary)}</small></span><span class="lc-checkin__advanced-arrow" aria-hidden="true">⌄</span></summary>
                        <div class="lc-checkin__advanced-content">
                            <div class="lc-checkin__organization-fields">
                                <label class="lc-checkin__field"><span>${t("editor.group")}</span><input name="group" type="text" maxlength="32" placeholder="${t("editor.groupPlaceholder")}" value="${escapeHtml(item?.group || "")}" /><span class="lc-checkin__group-options">${groupSuggestions.slice(0, 8).map((group) => `<button type="button" data-group-value="${escapeHtml(group)}">${escapeHtml(group)}</button>`).join("")}</span></label>
                                <label class="lc-checkin__field"><span>${t("editor.priorityLabel")}</span><select name="priority">${(["high", "medium", "low"] as CheckinPriority[]).map((priority) => `<option value="${priority}" ${initialPriority === priority ? "selected" : ""}>${t(PRIORITY_LABELS[priority])}</option>`).join("")}</select></label>
                                <label class="lc-checkin__field"><span>${t("editor.slotLabel")}</span><select name="timeSlot">${(["any", "morning", "afternoon", "evening"] as CheckinTimeSlot[]).map((slot) => `<option value="${slot}" ${initialTimeSlot === slot ? "selected" : ""}>${t(TIME_SLOT_LABELS[slot])}</option>`).join("")}</select></label>
                                <label class="lc-checkin__field"><span>${t("editor.completionSource")}</span><select name="completionSource"><option value="manual" ${initialCompletionSource === "manual" ? "selected" : ""}>${t("source.manual")}</option><option value="tomato" ${initialCompletionSource === "tomato" ? "selected" : ""}>${t("source.tomato")}</option></select></label>
                                <label class="lc-checkin__field" data-tomato-mode-field ${initialCompletionSource === "tomato" ? "" : "hidden"}><span>${t("editor.tomatoModeLabel")}</span><select name="tomatoMode"><option value="minutes" ${initialTomatoMode === "minutes" ? "selected" : ""}>${t("editor.tomatoMinutesOpt")}</option><option value="sessions" ${initialTomatoMode === "sessions" ? "selected" : ""}>${t("editor.tomatoSessionsOpt")}</option></select></label>
                                <p class="lc-checkin__integration-help" data-tomato-help ${initialCompletionSource === "tomato" ? "" : "hidden"}>${t("editor.tomatoHelp")}</p>
                            </div>
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
                    </details>
                </aside>
                <div class="lc-checkin__editor-actions">
                    <button class="lc-checkin__save-button" type="submit">${item ? t("editor.save") : t("editor.saveNew")}</button>
                    <button class="lc-checkin__text-button" type="button" data-action="save-template">${t("editor.saveTemplate")}</button>
                    ${item ? `<button class="lc-checkin__archive-button" type="button" data-action="archive">${item.archived ? t("editor.restore") : t("editor.archive")}</button>` : ""}
            ${renderSaveStatusView(ctx.saveState)}
            ${renderSyncNoticeView(ctx.syncNoticeActive)}
                </aside>
                </div>
            </form>
        </div>`;
}
