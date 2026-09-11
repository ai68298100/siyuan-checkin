/* 事项页视图：从 index.ts 外置；依赖以 OccasionsViewContext 显式传入。 */
import {t} from "../i18n";
import {dateKey} from "../model";
import {currentCalendarDate, escapeHtml, parseLocalDateKey} from "../shared";
import {describeRecurrence, getOccurrenceDate, occasionTemplateName, OCCASION_TEMPLATES, weekdayName} from "../occasions";
import type {MonthlySubtype, Occasion, OccasionKind, OccasionRecurrence, OccasionStore} from "../occasions";

export interface OccasionsViewContext {
    occasionStore: OccasionStore;
    editingOccasionId?: string;
    occasionSearchQuery: string;
    appearance: "light" | "dark";
}

export function renderOccasionsView(ctx: OccasionsViewContext): string {
    const editing = ctx.editingOccasionId ? ctx.occasionStore.occasions.find((item) => item.id === ctx.editingOccasionId) : undefined;
    const occasionQuery = (ctx.occasionSearchQuery || "").trim().toLocaleLowerCase();
    const allOccasions = [...ctx.occasionStore.occasions].sort((left, right) => left.date.localeCompare(right.date));
    const filteredOccasions = occasionQuery ? allOccasions.filter((item) => item.name.toLocaleLowerCase().includes(occasionQuery)) : allOccasions;
    const rows = filteredOccasions.length ? filteredOccasions.map((item) => {
        const icon = item.kind === "birthday" ? "🎂" : item.kind === "anniversary" ? "💍" : "◷";
        const kind = item.kind === "birthday" ? "生日" : item.kind === "anniversary" ? "纪念日" : "定时事项";
        const next = getOccurrenceDate(item, dateKey(currentCalendarDate()));
        const countdown = next ? `${next} · ${t("occ.daysAway", {n: Math.max(0, Math.round((parseLocalDateKey(next).getTime() - parseLocalDateKey(dateKey(currentCalendarDate())).getTime()) / 86400000))})}` : t("occ.ended");
        const recurrence = describeRecurrence(item);
        return `<article class="lc-checkin__occasion-manager-row ${item.enabled ? "" : "is-disabled"}"><span class="lc-checkin__occasion-icon" aria-hidden="true">${icon}</span><div class="lc-checkin__occasion-row-body"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(kind)} · ${escapeHtml(recurrence)} · ${escapeHtml(countdown)}</small>${item.note ? `<small class="lc-checkin__occasion-row-note">${escapeHtml(item.note)}</small>` : ""}</div><button class="lc-checkin__text-button" type="button" data-occasion-toitem="${escapeHtml(item.id)}">${t("occ.toItem")}</button><button class="lc-checkin__text-button" type="button" data-occasion-edit="${escapeHtml(item.id)}">${t("occ.editBtn")}</button><button class="lc-checkin__small-button" type="button" data-occasion-toggle="${escapeHtml(item.id)}" aria-label="${t("occ.toggleAria", {name: item.name})}">${item.enabled ? "✓" : "○"}</button><button class="lc-checkin__small-button" type="button" data-occasion-delete="${escapeHtml(item.id)}" aria-label="${t("occ.deleteAria", {name: item.name})}" title="${t("common.delete")}">×</button></article>`;
    }).join("") : (occasionQuery ? `<div class="lc-checkin__empty-description">${t("occ.searchEmpty")}</div>` : `<div class="lc-checkin__empty-description">${t("occ.empty")}</div>`);
    const date = editing?.date || dateKey(currentCalendarDate());
    const editLabel = editing ? t("occ.edit") : t("occ.create");
    const kind: OccasionKind = editing?.kind || "scheduled";
    const recurrence: OccasionRecurrence = editing?.recurrence || "annual";
    const calendar = editing?.calendar || "solar";
    const annualSubtype = editing?.annualSubtype || "byday";
    const monthlySubtype: MonthlySubtype = editing?.monthlySubtype || "byday";
    const sel = (value: string, current: string | undefined): string => value === current ? " selected" : "";
    const templateChips = OCCASION_TEMPLATES.map((template, index) => `<button type="button" class="lc-checkin__occasion-template" data-occasion-template="${index}" title="${describeRecurrence({...template, id: "", date: template.date || dateKey(currentCalendarDate()), remindBeforeDays: template.remindBeforeDays, note: template.note || "", enabled: true, completedDates: [], createdAt: "", updatedAt: ""} as Occasion)}"><span aria-hidden="true">${template.icon}</span>${occasionTemplateName(template)}</button>`).join("");
    const weekdayOptions = [0, 1, 2, 3, 4, 5, 6].map((value) => `<option value="${value}"${Number(editing?.weekday ?? 0) === value ? " selected" : ""}>${weekdayName(value)}</option>`).join("");
    const monthOptions = Array.from({length: 12}, (_, index) => `<option value="${index + 1}"${Number(editing?.month ?? 1) === index + 1 ? " selected" : ""}>${t("date.monthN", {n: index + 1})}</option>`).join("");
    const nthOptions = [1, 2, 3, 4, 5].map((value) => `<option value="${value}"${Number(editing?.nthWeek ?? 1) === value ? " selected" : ""}>${t(`occ.nth${value}`)}</option>`).join("");
    return `<div class="lc-checkin lc-checkin--occasions" data-appearance="${ctx.appearance}">
            <header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button><div><div class="lc-checkin__eyebrow">${t("occasions.eyebrow")}</div><h1 class="lc-checkin__title">${t("occasions.title")}</h1></div><button class="lc-checkin__icon-button" type="button" data-action="new-occasion" aria-label="${t("occ.newAria")}" title="${t("common.add")}">+</button></header>
            <div class="lc-checkin__occasion-manager">
                <section class="lc-checkin__occasion-form-panel">
                    <div class="lc-checkin__section-heading"><div><span class="lc-checkin__section-kicker">${editLabel}</span><strong>${t("occ.heading")}</strong></div></div>
                    <div class="lc-checkin__occasion-templates" aria-label="常用模板">${templateChips}</div>
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
                    <div class="lc-checkin__section-heading"><div><span class="lc-checkin__section-kicker">${t("occ.listKicker")}</span><strong>${t("occ.listHeading")}</strong></div><span class="lc-checkin__section-count">${filteredOccasions.length}/${ctx.occasionStore.occasions.length}</span></div>
                    <label class="lc-checkin__occasion-search"><input type="search" data-occasion-search value="${escapeHtml(ctx.occasionSearchQuery)}" placeholder="${t("occ.searchPlaceholder")}" aria-label="${t("occ.searchAria")}" /></label>
                    <div class="lc-checkin__occasion-manager-list">${rows}</div>
                </section>
            </div>
        </div>`;
}

export type {Occasion};
