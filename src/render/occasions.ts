/* 事项页视图：从 index.ts 外置；依赖以 OccasionsViewContext 显式传入。 */
import {t} from "../i18n";
import {dateKey} from "../model";
import {currentCalendarDate, escapeHtml, parseLocalDateKey} from "../shared";
import {uiIcon} from "../ui/icons";
import {describeRecurrence, getOccurrenceDate, occasionTemplateName, OCCASION_TEMPLATES, weekdayName} from "../occasions";
import type {MonthlySubtype, Occasion, OccasionKind, OccasionRecurrence, OccasionStore, OccasionTemplateCategory} from "../occasions";

export interface OccasionsViewContext {
    occasionStore: OccasionStore;
    editingOccasionId?: string;
    occasionSearchQuery: string;
    occasionStatusFilter: "all" | "enabled" | "disabled";
    occasionKindFilter: "all" | OccasionKind;
    occasionTimeFilter: "all" | "today" | "upcoming" | "ended";
    appearance: "light" | "dark";
    /** 常用模板折叠状态（21 个胶囊摊开时在窄表单里要占 8 行，默认收起）。 */
    occasionTemplatesOpen: boolean;
    occasionTemplateCategory: "all" | OccasionTemplateCategory;
}

export function renderOccasionsView(ctx: OccasionsViewContext): string {
    const editing = ctx.editingOccasionId ? ctx.occasionStore.occasions.find((item) => item.id === ctx.editingOccasionId) : undefined;
    const occasionQuery = (ctx.occasionSearchQuery || "").trim().toLocaleLowerCase();
    const todayKey = dateKey(currentCalendarDate());
    const withNext = ctx.occasionStore.occasions.map((item) => ({item, next: getOccurrenceDate(item, todayKey)}));
    const allOccasions = withNext.sort((left, right) => {
        if (left.item.enabled !== right.item.enabled) return left.item.enabled ? -1 : 1;
        if (left.next !== right.next) return left.next ? (right.next ? left.next.localeCompare(right.next) : -1) : 1;
        return left.item.name.localeCompare(right.item.name);
    });
    const filteredOccasions = allOccasions.filter(({item, next}) => {
        if (occasionQuery && !`${item.name} ${item.note || ""}`.toLocaleLowerCase().includes(occasionQuery)) return false;
        if (ctx.occasionStatusFilter !== "all" && (ctx.occasionStatusFilter === "enabled") !== item.enabled) return false;
        if (ctx.occasionKindFilter !== "all" && item.kind !== ctx.occasionKindFilter) return false;
        if (ctx.occasionTimeFilter === "today" && next !== todayKey) return false;
        if (ctx.occasionTimeFilter === "upcoming" && (!next || next <= todayKey)) return false;
        if (ctx.occasionTimeFilter === "ended" && next) return false;
        return true;
    });
    const enabledCount = ctx.occasionStore.occasions.filter((item) => item.enabled).length;
    const todayCount = withNext.filter(({item, next}) => item.enabled && next === todayKey).length;
    const hasActiveFilters = Boolean(occasionQuery || ctx.occasionStatusFilter !== "all" || ctx.occasionKindFilter !== "all" || ctx.occasionTimeFilter !== "all");
    const activeFilterCount = Number(ctx.occasionStatusFilter !== "all") + Number(ctx.occasionKindFilter !== "all") + Number(ctx.occasionTimeFilter !== "all");
    const filterSelect = (key: string, label: string, value: string, options: Array<[string, string]>): string => `<label class="lc-checkin__occasion-filter"><span>${label}</span><select data-occasion-filter="${key}" aria-label="${label}">${options.map(([optionValue, text]) => `<option value="${optionValue}"${optionValue === value ? " selected" : ""}>${text}</option>`).join("")}</select></label>`;
    const rows = filteredOccasions.length ? filteredOccasions.map(({item, next}) => {
        const icon = item.kind === "birthday" ? "🎂" : item.kind === "anniversary" ? "💍" : "◷";
        const kind = item.kind === "birthday" ? t("occ.kindBirthday") : item.kind === "anniversary" ? t("occ.kindAnniversary") : t("occ.kindScheduled");
        const days = next ? Math.max(0, Math.round((parseLocalDateKey(next).getTime() - parseLocalDateKey(todayKey).getTime()) / 86400000)) : undefined;
        const countdown = next ? t("occ.daysAway", {n: days ?? 0}) : t("occ.ended");
        const recurrence = describeRecurrence(item);
        /* 事项页展示完整事项信息；转为打卡项目后才进入 Today 的打卡卡片。
           将类型、重复、下次日期、倒计时和备注拆开，桌面宽列不再留下无法解释的空白。 */
        const status = !item.enabled ? t("occ.statusDisabled") : next === todayKey ? t("occ.statusToday") : t("occ.statusEnabled");
        /* data-occasion-toitem= / data-occasion-edit= / data-occasion-toggle= / data-occasion-delete= remain explicit action hooks. */
        /* Keep the icon and its text label as separate nodes.  The compact
           action rail hides the label visually, while preserving it in the
           DOM gives wide/assistive surfaces a stable fallback and lets icon
           normalization update only the glyph on re-render. */
        const action = (attr: string, value: string, aria: string, title: string, content: string, extra = "") => `<button class="lc-checkin__small-button${extra ? ` ${escapeHtml(extra)}` : ""}" type="button" ${attr}="${escapeHtml(value)}" aria-label="${escapeHtml(aria)}" title="${escapeHtml(title)}"><span class="lc-checkin__action-icon" aria-hidden="true">${content}</span><span class="lc-checkin__action-label">${escapeHtml(title)}</span></button>`;
        return `<article class="lc-checkin__occasion-manager-row ${item.enabled ? "" : "is-disabled"}"><span class="lc-checkin__occasion-icon" aria-hidden="true">${icon}</span><div class="lc-checkin__occasion-row-body"><div class="lc-checkin__occasion-row-title"><strong>${escapeHtml(item.name)}</strong><span class="lc-checkin__occasion-status">${status}</span></div><div class="lc-checkin__occasion-row-meta"><span>${escapeHtml(kind)}</span><span>${escapeHtml(recurrence)}</span><span>${escapeHtml(next || t("occ.ended"))}</span><span>${escapeHtml(countdown)}</span><span>${t("occ.remindSummary", {n: item.remindBeforeDays})}</span></div>${item.note ? `<small class="lc-checkin__occasion-row-note">${escapeHtml(item.note)}</small>` : ""}</div><div class="lc-checkin__occasion-row-actions">${action("data-occasion-toitem", item.id, t("occ.toItemAria", {name: item.name}), t("occ.toItem"), uiIcon("add"))}${action("data-occasion-edit", item.id, t("occ.editAria", {name: item.name}), t("occ.editBtn"), uiIcon("edit"))}${action("data-occasion-toggle", item.id, t("occ.toggleAria", {name: item.name}), item.enabled ? t("occ.disable") : t("occ.enable"), item.enabled ? "✓" : "○", item.enabled ? "is-on" : "")}${action("data-occasion-delete", item.id, t("occ.deleteAria", {name: item.name}), t("common.delete"), "×")}</div></article>`;
    }).join("") : `<div class="lc-checkin__empty-description">${hasActiveFilters ? t("occ.searchEmpty") : t("occ.empty")}</div>`;
    const date = editing?.date || dateKey(currentCalendarDate());
    const editLabel = editing ? t("occ.edit") : t("occ.create");
    const kind: OccasionKind = editing?.kind || "scheduled";
    const recurrence: OccasionRecurrence = editing?.recurrence || "annual";
    const calendar = editing?.calendar || "solar";
    const annualSubtype = editing?.annualSubtype || "byday";
    const monthlySubtype: MonthlySubtype = editing?.monthlySubtype || "byday";
    const sel = (value: string, current: string | undefined): string => value === current ? " selected" : "";
    const templateDescription = (template: typeof OCCASION_TEMPLATES[number]): string => describeRecurrence({...template, id: "", date: template.date || dateKey(currentCalendarDate()), remindBeforeDays: template.remindBeforeDays, note: template.note || "", enabled: true, completedDates: [], createdAt: "", updatedAt: ""} as Occasion);
    const visibleTemplates = OCCASION_TEMPLATES.map((template, index) => ({template, index})).filter(({template}) => ctx.occasionTemplateCategory === "all" || template.category === ctx.occasionTemplateCategory);
    const templateChips = visibleTemplates.map(({template, index}) => {
        const name = occasionTemplateName(template);
        const recurrenceDescription = templateDescription(template);
        const accessibleName = `${name} · ${recurrenceDescription}`;
        return `<button type="button" class="lc-checkin__occasion-template" data-occasion-template="${index}" aria-label="${escapeHtml(accessibleName)}" title="${escapeHtml(accessibleName)}"><span class="lc-checkin__occasion-template-icon" aria-hidden="true">${escapeHtml(template.icon)}</span><span class="lc-checkin__occasion-template-name">${escapeHtml(name)}</span></button>`;
    }).join("");
    const templateCategories: Array<["all" | OccasionTemplateCategory, string]> = [["all", t("occ.tplCategoryAll")], ["birthday", t("occ.tplCategoryBirthday")], ["anniversary", t("occ.tplCategoryAnniversary")], ["expense", t("occ.tplCategoryExpense")], ["renewal", t("occ.tplCategoryRenewal")], ["health", t("occ.tplCategoryHealth")], ["festival", t("occ.tplCategoryFestival")]];
    const templateCategoryTabs = templateCategories.map(([value, label]) => {
        const count = value === "all" ? OCCASION_TEMPLATES.length : OCCASION_TEMPLATES.filter((template) => template.category === value).length;
        const selected = value === ctx.occasionTemplateCategory;
        return `<button type="button" class="${selected ? "is-active" : ""}" data-occasion-template-category="${value}" aria-label="${escapeHtml(`${label}（${count}）`)}" aria-pressed="${selected}"><span class="lc-checkin__occasion-template-category-label">${escapeHtml(label)}</span><em aria-hidden="true">${count}</em></button>`;
    }).join("");
    const weekdayOptions = [0, 1, 2, 3, 4, 5, 6].map((value) => `<option value="${value}"${Number(editing?.weekday ?? 0) === value ? " selected" : ""}>${weekdayName(value)}</option>`).join("");
    const monthOptions = Array.from({length: 12}, (_, index) => `<option value="${index + 1}"${Number(editing?.month ?? 1) === index + 1 ? " selected" : ""}>${t("date.monthN", {n: index + 1})}</option>`).join("");
    const nthOptions = [1, 2, 3, 4, 5].map((value) => `<option value="${value}"${Number(editing?.nthWeek ?? 1) === value ? " selected" : ""}>${t(`occ.nth${value}`)}</option>`).join("");
    return `<div class="lc-checkin lc-checkin--occasions" data-appearance="${ctx.appearance}">
            <header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button><div><div class="lc-checkin__eyebrow">${t("occasions.eyebrow")}</div><h1 class="lc-checkin__title">${t("occasions.title")}</h1></div><button class="lc-checkin__icon-button" type="button" data-action="new-occasion" aria-label="${t("occ.newAria")}" title="${t("occ.newAria")}">+</button></header>
            <div class="lc-checkin__occasion-manager">
                <section class="lc-checkin__occasion-form-panel">
                    <div class="lc-checkin__section-heading"><div><span class="lc-checkin__section-kicker">${editLabel}</span><strong>${t("occ.heading")}</strong><small class="lc-checkin__occasion-form-hint">${t("occ.formHint")}</small></div><details class="lc-checkin__occasion-help"><summary aria-label="${t("occ.helpAria")}" title="${t("occ.helpAria")}">?</summary><div role="note"><span>${t("occ.templatesHint")}</span><span>${t("occ.newAria")}</span></div></details></div>
                    <details class="lc-checkin__occasion-templates-fold" ${ctx.occasionTemplatesOpen ? "open" : ""}>
                        <summary data-occasion-templates-toggle aria-label="${t("occ.templatesHint")}" title="${t("occ.templatesHint")}"><span>${t("occ.templatesFold")}</span><em>${OCCASION_TEMPLATES.length}</em><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary>
                        <div class="lc-checkin__occasion-template-browser"><div class="lc-checkin__occasion-template-browser-head"><span>${t("occ.templatesHint")}</span><em aria-live="polite">${t("occ.templatesShown", {n: visibleTemplates.length})}</em></div><div class="lc-checkin__occasion-template-categories" aria-label="${t("occ.tplCategoriesAria")}">${templateCategoryTabs}</div><div class="lc-checkin__occasion-templates" aria-label="${t("occ.templatesFold")}">${templateChips}</div></div>
                    </details>
                    <form data-occasion-form>
                        <label class="lc-checkin__field"><span>${t("occ.name")}</span><input name="name" required maxlength="120" placeholder="${t("occ.namePlaceholder")}" value="${escapeHtml(editing?.name || "")}" /></label>
                        <div class="lc-checkin__form-row">
                            <label class="lc-checkin__field"><span>${t("occ.kind")}</span><select name="kind"><option value="birthday"${sel("birthday", kind)}>${t("occ.kindBirthday")}</option><option value="anniversary"${sel("anniversary", kind)}>${t("occ.kindAnniversary")}</option><option value="scheduled"${sel("scheduled", kind)}>${t("occ.kindScheduled")}</option></select></label>
                            <label class="lc-checkin__field"><span>${t("occ.date")}</span><input name="date" type="date" required value="${escapeHtml(date)}" /></label>
                        </div>
                        <div class="lc-checkin__form-row">
                            <label class="lc-checkin__field"><span>${t("occ.recurrence")}</span><select name="recurrence" data-occasion-recurrence>
                                <option value="once"${sel("once", recurrence)}>${t("occ.once")}</option>
                                <option value="annual"${sel("annual", recurrence)}>${t("occ.annual")}</option>
                                <option value="monthly"${sel("monthly", recurrence)}>${t("occ.monthly")}</option>
                                <option value="weekly"${sel("weekly", recurrence)}>${t("occ.weekly")}</option>
                                <option value="quarterly"${sel("quarterly", recurrence)}>${t("occ.quarterly")}</option>
                                <option value="halfyearly"${sel("halfyearly", recurrence)}>${t("occ.halfyearly")}</option>
                                <option value="interval"${sel("interval", recurrence)}>${t("occ.interval")}</option>
                            </select></label>
                            <div class="lc-checkin__field" data-occasion-block="annual-calendar"${recurrence === "annual" ? "" : " hidden"}><span class="lc-checkin__field-label">${t("occ.calendar")}</span><select name="calendar" data-occasion-calendar aria-label="${t("occ.calendar")}"><option value="solar"${sel("solar", calendar)}>${t("occ.solar")}</option><option value="lunar"${sel("lunar", calendar)}>${t("occ.lunar")}</option></select><small class="lc-checkin__field-hint" data-occasion-lunar-hint hidden></small></div>
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="annual-nthweek"${recurrence === "annual" && annualSubtype === "nthweek" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.month")}</span><select name="annualMonth">${monthOptions}</select></label>
                            <label class="lc-checkin__field"><span>${t("occ.weekday")}</span><select name="annualNth">${nthOptions}</select></label>
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="annual-nthweek"${recurrence === "annual" && annualSubtype === "nthweek" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.weekdayNth")}</span><select name="annualWeekday">${weekdayOptions}</select></label>
                            <input type="hidden" name="annualSubtype" value="${annualSubtype}" />
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="monthly-sub"${recurrence === "monthly" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.monthlyMode")}</span><select name="monthlySubtype" data-occasion-monthly-subtype><option value="byday"${sel("byday", monthlySubtype)}>${t("occ.monthlyByday")}</option><option value="nthweek"${sel("nthweek", monthlySubtype)}>${t("occ.monthlyNthweek")}</option><option value="lastday"${sel("lastday", monthlySubtype)}>${t("occ.monthlyLastday")}</option></select></label>
                            <div class="lc-checkin__field" data-occasion-block="monthly-nthweek"${monthlySubtype === "nthweek" ? "" : " hidden"}><span class="lc-checkin__field-label">${t("occ.weekday")}</span><select name="monthlyWeekday" aria-label="${t("occ.weekday")}">${weekdayOptions}</select></div>
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="weekly"${recurrence === "weekly" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.weekday")}</span><select name="weeklyWeekday">${weekdayOptions}</select></label>
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="interval"${recurrence === "interval" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.intervalCount")}</span><input name="intervalCount" type="number" min="1" max="365" step="1" value="${editing?.intervalCount ?? 1}" /></label>
                            <label class="lc-checkin__field"><span>${t("occ.unit")}</span><select name="intervalUnit"><option value="day"${sel("day", editing?.intervalUnit)}>${t("occ.unitDay")}</option><option value="month"${sel("month", editing?.intervalUnit || "month")}>${t("occ.unitMonth")}</option><option value="year"${sel("year", editing?.intervalUnit)}>${t("occ.unitYear")}</option></select></label>
                        </div>
                        <label class="lc-checkin__field"><span>${t("occ.remindDays")}</span><input name="remindBeforeDays" type="number" min="0" max="365" step="1" list="lc-occasion-remind-presets" value="${editing?.remindBeforeDays ?? 3}" /><datalist id="lc-occasion-remind-presets"><option value="0"><option value="1"><option value="3"><option value="7"><option value="14"><option value="30"></datalist></label>
                        <label class="lc-checkin__field"><span>${t("occ.note")}</span><textarea name="note" maxlength="500" rows="2" placeholder="${t("occ.notePlaceholder")}">${escapeHtml(editing?.note || "")}</textarea></label>
                        <div class="lc-checkin__editor-actions"><button class="lc-checkin__primary-button" type="submit">${editing ? t("occ.save") : t("occ.add")}</button>${editing ? `<button class="lc-checkin__text-button" type="button" data-action="cancel-occasion-edit">${t("occ.cancelEdit")}</button>` : ""}</div>
                    </form>
                </section>
                <section class="lc-checkin__occasion-list-panel">
                    <div class="lc-checkin__section-heading"><div><span class="lc-checkin__section-kicker">${t("occ.listKicker")}</span><strong>${t("occ.listHeading")}</strong></div><span class="lc-checkin__section-count">${filteredOccasions.length}/${ctx.occasionStore.occasions.length}</span><details class="lc-checkin__occasion-actions-help"><summary aria-label="${t("occ.helpAria")}" title="${t("occ.helpAria")}">?</summary><div role="note"><span>＋ ${t("occ.toItem")}</span><span>✎ ${t("occ.editBtn")}</span><span>✓/○ ${t("occ.enable")}/${t("occ.disable")}</span><span>× ${t("common.delete")}</span></div></details></div>
                    <div class="lc-checkin__occasion-stats"><span>${t("occ.statsAll", {n: ctx.occasionStore.occasions.length})}</span><span>${t("occ.statsEnabled", {n: enabledCount})}</span><span>${t("occ.statsToday", {n: todayCount})}</span></div>
                    <label class="lc-checkin__occasion-search"><input type="search" data-occasion-search value="${escapeHtml(ctx.occasionSearchQuery)}" placeholder="${t("occ.searchPlaceholder")}" aria-label="${t("occ.searchAria")}" /></label>
                    <details class="lc-checkin__occasion-filter-fold" ${activeFilterCount ? "open" : ""}>
                        <summary><span>${t("occ.filters")}</span>${activeFilterCount ? `<em>${activeFilterCount}</em>` : ""}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary>
                        <div class="lc-checkin__occasion-filters">${filterSelect("status", t("occ.filterStatus"), ctx.occasionStatusFilter, [["all", t("occ.filterAll")], ["enabled", t("occ.filterEnabled")], ["disabled", t("occ.filterDisabled")]])}${filterSelect("kind", t("occ.filterKind"), ctx.occasionKindFilter, [["all", t("occ.filterAll")], ["birthday", t("occ.kindBirthday")], ["anniversary", t("occ.kindAnniversary")], ["scheduled", t("occ.kindScheduled")]])}${filterSelect("time", t("occ.filterTime"), ctx.occasionTimeFilter, [["all", t("occ.filterAll")], ["today", t("occ.filterToday")], ["upcoming", t("occ.filterUpcoming")], ["ended", t("occ.filterEnded")]])}${hasActiveFilters ? `<button class="lc-checkin__text-button" type="button" data-occasion-clear-filters>${t("occ.clearFilters")}</button>` : ""}</div>
                    </details>
                    <div class="lc-checkin__occasion-manager-list">${rows}</div>
                </section>
            </div>
        </div>`;
}

export type {Occasion};
