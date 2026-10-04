/* 事项页事件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindOccasionsHost 结构化接口声明。 */
import {t} from "../i18n";
import {dateKey} from "../model";
import {currentCalendarDate, isValidLocalDateInput} from "../shared";
import {deleteOccasion, occasionTemplateName, OCCASION_TEMPLATES} from "../occasions";
import {formatLunar, solarToLunar} from "../lunar";
import {showMessage} from "siyuan";
import type {Occasion, OccasionStore, OccasionTemplateCategory} from "../occasions";
import {captureOccasionDraftFor, isCurrentOccasionFormSession, isOccasionsRootOpen, nextOccasionFormSession, readOccasionsRootContext, writeOccasionsRootContext, type OccasionsRootContext} from "./occasion-session";

export interface BindOccasionsHost {
    occasionStore: OccasionStore;
    /** T-1583：reduced-motion 与设置页同源，滚动降级 instant。 */
    reducedMotion?: boolean;
    /** T-1613：仅移动端在展开表单后滚动定位（桌面表单常驻可见无需滚动）。 */
    isMobileFrontend?: boolean;
    editingOccasionId?: string;
    occasionSearchQuery: string;
    occasionStatusFilter: "all" | "enabled" | "disabled";
    occasionKindFilter: "all" | "birthday" | "anniversary" | "scheduled";
    occasionTimeFilter: "all" | "today" | "upcoming" | "ended";
    occasionTemplatesOpen: boolean;
    occasionTemplateCategory: "recommended" | OccasionTemplateCategory;
    occasionStateForRoot?(root: HTMLElement): OccasionsRootContext;
    setOccasionStateForRoot?(root: HTMLElement, patch: Partial<OccasionsRootContext>): void;
    isSurfaceRoot?(root: HTMLElement, page?: string): boolean;
    pageForRoot?(root: HTMLElement): string;
    bindDialogClose(root: HTMLElement): void;
    bindMobileNav(root: HTMLElement): void;
    showToday(root?: HTMLElement): void;
    render(root?: HTMLElement): void;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    createOccasionLinkedItem(occasionId: string): Promise<unknown>;
    updateOccasion(item: {enabled: boolean} & Record<string, unknown>, root?: HTMLElement): Promise<unknown>;
    persistOccasions(): Promise<void>;
    /** T-1494：按发生日期标记完成（错过补标记复用既有通道）。 */
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean): Promise<boolean>;
    /** T-1494：单次实例改期（宿主走 setOccasionOverride 既有持久化通道）。 */
    saveOccasionOverride?(id: string, originalDate: string, newDate: string): void;
    syncOccasionLunarHint(form: HTMLFormElement | null): void;
    saveOccasionForm(data: FormData, root?: HTMLElement): Promise<unknown>;
}

export function bindOccasionsHandlers(root: HTMLElement, host: BindOccasionsHost): void {
    const state = readOccasionsRootContext(host, root);
    const currentState = () => readOccasionsRootContext(host, root);
    const writeState = (patch: Partial<OccasionsRootContext>) => writeOccasionsRootContext(host, root, patch);
    const renderRoot = () => host.render(root);
    host.bindDialogClose(root);
    host.bindMobileNav(root);
    root.querySelector<HTMLElement>("[data-action='back'], [data-action='occasion-back']")?.addEventListener("click", () => host.showToday(root));
    /* 手机端列表在前、表单在后（order 交换）：新建/编辑后把表单滚进视口；桌面端表单常驻可见，滚动是无害空操作。 */
    /* T-1613（方案 A）：仅移动端（列表在前/表单在后）在展开表单后滚动定位；桌面表单常驻可见无需滚动。behavior 用 instant 消除 smooth 动画感知。 */
    const revealOccasionForm = () => { const drawer = root.querySelector<HTMLDetailsElement>("[data-occasion-form-drawer]"); if (drawer) drawer.open = true; if (host.isMobileFrontend) root.querySelector<HTMLElement>(".lc-checkin__occasion-form-panel")?.scrollIntoView({block: "start", behavior: "instant"}); };
    root.querySelectorAll<HTMLElement>("[data-action='new-occasion']").forEach((button) => button.addEventListener("click", () => { writeState({editingOccasionId: undefined, formDraft: undefined, formOpen: true, submitting: false, formSession: currentState().formSession + 1}); renderRoot(); revealOccasionForm(); }));
    root.querySelector<HTMLElement>("[data-action='cancel-occasion-edit']")?.addEventListener("click", () => { writeState({editingOccasionId: undefined, formDraft: undefined, formOpen: false, submitting: false, formSession: currentState().formSession + 1}); renderRoot(); });
    root.querySelector<HTMLInputElement>("[data-occasion-search]")?.addEventListener("input", (event) => {
        writeState({occasionSearchQuery: (event.currentTarget as HTMLInputElement).value});
        renderRoot();
        const searchInput = root.querySelector<HTMLInputElement>("[data-occasion-search]");
        if (searchInput) { searchInput.focus(); searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); }
    });
    root.querySelectorAll<HTMLSelectElement>("[data-occasion-filter]").forEach((select) => select.addEventListener("change", () => {
        const key = select.dataset.occasionFilter;
        if (key === "status") writeState({occasionStatusFilter: select.value as BindOccasionsHost["occasionStatusFilter"]});
        if (key === "kind") writeState({occasionKindFilter: select.value as BindOccasionsHost["occasionKindFilter"]});
        if (key === "time") writeState({occasionTimeFilter: select.value as BindOccasionsHost["occasionTimeFilter"]});
        renderRoot();
    }));
    root.querySelector<HTMLElement>("[data-occasion-clear-filters]")?.addEventListener("click", () => {
        writeState({occasionSearchQuery: "", occasionStatusFilter: "all", occasionKindFilter: "all", occasionTimeFilter: "all"}); renderRoot();
    });
    root.querySelectorAll<HTMLElement>("[data-occasion-edit]").forEach((button) => button.addEventListener("click", () => { writeState({editingOccasionId: button.dataset.occasionEdit, formDraft: undefined, formOpen: true, formSession: currentState().formSession + 1}); renderRoot(); revealOccasionForm(); }));
    root.querySelectorAll<HTMLElement>("[data-occasion-toitem]").forEach((button) => button.addEventListener("click", () => {
        void host.enqueueMutation(async () => { await host.createOccasionLinkedItem(button.dataset.occasionToitem || ""); });
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-toggle]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionToggle || "";
        const item = host.occasionStore.occasions.find((candidate) => candidate.id === id);
        if (item) void host.enqueueMutation(() => host.updateOccasion({...item, enabled: !item.enabled}, root));
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-delete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionDelete || "";
        const item = host.occasionStore.occasions.find((candidate) => candidate.id === id);
        if (!item || !window.confirm(t("msg.occasionDeleteConfirm"))) return;
        const current = currentState();
        if (current.deletingOccasionIds.has(id)) return;
        current.deletingOccasionIds.add(id);
        writeState({deletingOccasionIds: current.deletingOccasionIds});
        void host.enqueueMutation(async () => {
            const previous = host.occasionStore;
            host.occasionStore = deleteOccasion(previous, id);
            try { await host.persistOccasions(); } catch { host.occasionStore = previous; showMessage(t("msg.occasionDeleteFail")); }
            if (!isOccasionsRootOpen(host, root)) return;
            const next = currentState();
            next.deletingOccasionIds.delete(id);
            if (next.editingOccasionId === id) next.editingOccasionId = undefined;
            renderRoot();
        });
    }));

    /* T-1494：错过补标记（沿用既有按日期完成通道）+ 单次改期（内联日期行，确认后走宿主覆盖通道）。 */
    root.querySelectorAll<HTMLElement>("[data-occasion-late-complete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionLateId || "";
        const missedDate = button.dataset.occasionLateDate || "";
        if (!id || !missedDate) return;
        void host.enqueueMutation(async () => { await host.setOccasionCompleted(id, missedDate, true); });
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-move-toggle]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionMoveToggle || "";
        const row = root.querySelector<HTMLElement>(`[data-occasion-move-row='${CSS.escape(id) || id}']`);
        if (!row) return;
        row.hidden = !row.hidden;
        button.setAttribute("aria-expanded", row.hidden ? "false" : "true");
        if (!row.hidden) row.querySelector<HTMLInputElement>("[data-occasion-move-date]")?.focus();
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-move-row]").forEach((row) => {
        const id = row.dataset.occasionMoveRow || "";
        const dateInput = row.querySelector<HTMLInputElement>("[data-occasion-move-date]");
        const confirmButton = row.querySelector<HTMLButtonElement>("[data-occasion-move-confirm]");
        if (!dateInput || !confirmButton) return;
        dateInput.addEventListener("change", () => { confirmButton.disabled = !dateInput.value; });
        confirmButton.addEventListener("click", () => {
            if (!dateInput.value || confirmButton.disabled) return;
            if (host.saveOccasionOverride) host.saveOccasionOverride(id, confirmButton.dataset.occasionMoveOrigin || "", dateInput.value);
        });
    });

    const syncBlocks = () => {
        const form = root.querySelector<HTMLFormElement>("[data-occasion-form]");
        if (!form) return;
        const recurrence = form.querySelector<HTMLSelectElement>("[name='recurrence']")?.value || "annual";
        const monthlySubtype = form.querySelector<HTMLSelectElement>("[data-occasion-monthly-subtype]")?.value || "byday";
        form.querySelectorAll<HTMLElement>("[data-occasion-block]").forEach((block) => {
            const key = block.dataset.occasionBlock || "";
            let visible = key === recurrence;
            if (key === "annual-calendar") visible = recurrence === "annual";
            if (key === "annual-nthweek") visible = recurrence === "annual" && form.querySelector<HTMLInputElement>("[name='annualSubtype']")?.value === "nthweek";
            if (key === "nthweek-ordinal") visible = (recurrence === "annual" && form.querySelector<HTMLInputElement>("[name='annualSubtype']")?.value === "nthweek") || (recurrence === "monthly" && monthlySubtype === "nthweek");
            if (key === "monthly-sub") visible = recurrence === "monthly";
            if (key === "monthly-nthweek") visible = recurrence === "monthly" && monthlySubtype === "nthweek";
            block.hidden = !visible;
        });
        host.syncOccasionLunarHint(form);
    };
    root.querySelector<HTMLSelectElement>("[data-occasion-recurrence]")?.addEventListener("change", syncBlocks);
    root.querySelector<HTMLSelectElement>("[data-occasion-monthly-subtype]")?.addEventListener("change", syncBlocks);
    root.querySelector<HTMLInputElement>("[name='date']")?.addEventListener("change", () => host.syncOccasionLunarHint(root.querySelector<HTMLFormElement>("[data-occasion-form]")));
    root.querySelector<HTMLSelectElement>("[data-occasion-calendar]")?.addEventListener("change", () => host.syncOccasionLunarHint(root.querySelector<HTMLFormElement>("[data-occasion-form]")));
    syncBlocks();

    /* 常用模板折叠态要跨重渲染保留：原生 details 会在每次 render 时回到默认收起。 */
    root.querySelector<HTMLElement>("[data-occasion-templates-toggle]")?.parentElement?.addEventListener("toggle", (event) => {
        writeState({occasionTemplatesOpen: (event.currentTarget as HTMLDetailsElement).open});
    });

    root.querySelectorAll<HTMLButtonElement>("[data-occasion-template]").forEach((button) => button.addEventListener("click", () => {
        const template = OCCASION_TEMPLATES[Number(button.dataset.occasionTemplate)];
        if (!template) return;
        const form = root.querySelector<HTMLFormElement>("[data-occasion-form]");
        if (!form) return;
        const set = (name: string, value: string) => { const field = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`); if (field) field.value = value; };
        set("name", occasionTemplateName(template));
        set("kind", template.kind);
        set("date", template.date || dateKey(currentCalendarDate()));
        set("recurrence", template.recurrence);
        set("calendar", template.calendar || "solar");
        set("annualSubtype", template.annualSubtype || "byday");
        set("annualMonth", String(template.month || 1));
        set("annualNth", String(template.nthWeek || 1));
        set("annualWeekday", String(template.weekday ?? 0));
        set("monthlySubtype", template.monthlySubtype || "byday");
        set("monthlyWeekday", String(template.weekday ?? 0));
        set("weeklyWeekday", String(template.weekday ?? 0));
        set("intervalCount", String(template.intervalCount || 1));
        set("intervalUnit", template.intervalUnit || "month");
        set("remindBeforeDays", String(template.remindBeforeDays));
        writeState({editingOccasionId: undefined, formDraft: undefined, formOpen: true, formSession: currentState().formSession + 1});
        syncBlocks();
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-occasion-template-category]").forEach((button) => button.addEventListener("click", () => {
        writeState({occasionTemplateCategory: (button.dataset.occasionTemplateCategory || "recommended") as BindOccasionsHost["occasionTemplateCategory"], occasionTemplatesOpen: true});
        renderRoot();
    }));

    root.querySelector<HTMLFormElement>("[data-occasion-form]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        const data = new FormData(form);
        if (!String(data.get("name") || "").trim() || !isValidLocalDateInput(String(data.get("date") || ""))) {
            showMessage(t("msg.occasionInvalid"));
            return;
        }
        const current = currentState();
        captureOccasionDraftFor(root, current);
        const session = nextOccasionFormSession(current);
        writeState({submitting: true});
        renderRoot();
        void host.enqueueMutation(() => host.saveOccasionForm(data, root)).catch(() => {
            if (isCurrentOccasionFormSession(host, root, session)) writeState({submitting: false});
        });
    });
}
