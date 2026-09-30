/* 事项页事件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindOccasionsHost 结构化接口声明。 */
import {t} from "../i18n";
import {dateKey} from "../model";
import {currentCalendarDate, isValidLocalDateInput} from "../shared";
import {deleteOccasion, occasionTemplateName, OCCASION_TEMPLATES} from "../occasions";
import {formatLunar, solarToLunar} from "../lunar";
import {showMessage} from "siyuan";
import type {Occasion, OccasionStore, OccasionTemplateCategory} from "../occasions";

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
    bindDialogClose(root: HTMLElement): void;
    bindMobileNav(root: HTMLElement): void;
    showToday(): void;
    render(): void;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    createOccasionLinkedItem(occasionId: string): Promise<unknown>;
    updateOccasion(item: {enabled: boolean} & Record<string, unknown>): Promise<unknown>;
    persistOccasions(): Promise<void>;
    /** T-1494：按发生日期标记完成（错过补标记复用既有通道）。 */
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean): Promise<boolean>;
    /** T-1494：单次实例改期（宿主走 setOccasionOverride 既有持久化通道）。 */
    saveOccasionOverride?(id: string, originalDate: string, newDate: string): void;
    syncOccasionLunarHint(form: HTMLFormElement | null): void;
    saveOccasionForm(data: FormData): Promise<unknown>;
}

export function bindOccasionsHandlers(root: HTMLElement, host: BindOccasionsHost): void {
    host.bindDialogClose(root);
    host.bindMobileNav(root);
    root.querySelector<HTMLElement>("[data-action='back'], [data-action='occasion-back']")?.addEventListener("click", () => host.showToday());
    /* 手机端列表在前、表单在后（order 交换）：新建/编辑后把表单滚进视口；桌面端表单常驻可见，滚动是无害空操作。 */
    /* T-1613（方案 A）：仅移动端（列表在前/表单在后）在展开表单后滚动定位；桌面表单常驻可见无需滚动。behavior 用 instant 消除 smooth 动画感知。 */
    const revealOccasionForm = () => { const drawer = root.querySelector<HTMLDetailsElement>("[data-occasion-form-drawer]"); if (drawer) drawer.open = true; if (host.isMobileFrontend) root.querySelector<HTMLElement>(".lc-checkin__occasion-form-panel")?.scrollIntoView({block: "start", behavior: "instant"}); };
    root.querySelectorAll<HTMLElement>("[data-action='new-occasion']").forEach((button) => button.addEventListener("click", () => { host.editingOccasionId = undefined; host.render(); revealOccasionForm(); }));
    root.querySelector<HTMLElement>("[data-action='cancel-occasion-edit']")?.addEventListener("click", () => { host.editingOccasionId = undefined; host.render(); });
    root.querySelector<HTMLInputElement>("[data-occasion-search]")?.addEventListener("input", (event) => {
        host.occasionSearchQuery = (event.currentTarget as HTMLInputElement).value;
        host.render();
        const searchInput = root.querySelector<HTMLInputElement>("[data-occasion-search]");
        if (searchInput) { searchInput.focus(); searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); }
    });
    root.querySelectorAll<HTMLSelectElement>("[data-occasion-filter]").forEach((select) => select.addEventListener("change", () => {
        const key = select.dataset.occasionFilter;
        if (key === "status") host.occasionStatusFilter = select.value as BindOccasionsHost["occasionStatusFilter"];
        if (key === "kind") host.occasionKindFilter = select.value as BindOccasionsHost["occasionKindFilter"];
        if (key === "time") host.occasionTimeFilter = select.value as BindOccasionsHost["occasionTimeFilter"];
        host.render();
    }));
    root.querySelector<HTMLElement>("[data-occasion-clear-filters]")?.addEventListener("click", () => {
        host.occasionSearchQuery = ""; host.occasionStatusFilter = "all"; host.occasionKindFilter = "all"; host.occasionTimeFilter = "all"; host.render();
    });
    root.querySelectorAll<HTMLElement>("[data-occasion-edit]").forEach((button) => button.addEventListener("click", () => { host.editingOccasionId = button.dataset.occasionEdit; host.render(); revealOccasionForm(); }));
    root.querySelectorAll<HTMLElement>("[data-occasion-toitem]").forEach((button) => button.addEventListener("click", () => {
        void host.enqueueMutation(async () => { await host.createOccasionLinkedItem(button.dataset.occasionToitem || ""); });
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-toggle]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionToggle || "";
        const item = host.occasionStore.occasions.find((candidate) => candidate.id === id);
        if (item) void host.enqueueMutation(() => host.updateOccasion({...item, enabled: !item.enabled}));
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-delete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionDelete || "";
        const item = host.occasionStore.occasions.find((candidate) => candidate.id === id);
        if (!item || !window.confirm(t("msg.occasionDeleteConfirm"))) return;
        void host.enqueueMutation(async () => { const previous = host.occasionStore; host.occasionStore = deleteOccasion(previous, id); try { await host.persistOccasions(); } catch { host.occasionStore = previous; showMessage(t("msg.occasionDeleteFail")); } if (host.editingOccasionId === id) host.editingOccasionId = undefined; host.render(); });
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
        host.occasionTemplatesOpen = (event.currentTarget as HTMLDetailsElement).open;
    });

    root.querySelectorAll<HTMLButtonElement>("[data-occasion-template]").forEach((button) => button.addEventListener("click", () => {
        const template = OCCASION_TEMPLATES[Number(button.dataset.occasionTemplate)];
        if (!template) return;
        const form = root.querySelector<HTMLFormElement>("[data-occasion-form]");
        if (!form) return;
        /* T-1702（D-349）：编辑既有事项时套用模板=以模板覆写当前表单草案，编辑目标
           （editingOccasionId/历史/关联）保持不变；确认取消零写入。新建路径维持原样
           （模板即新事项起点）。 */
        if (host.editingOccasionId && !window.confirm(t("msg.occasionTemplateOverwrite"))) return;
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
        syncBlocks();
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-occasion-template-category]").forEach((button) => button.addEventListener("click", () => {
        host.occasionTemplateCategory = (button.dataset.occasionTemplateCategory || "recommended") as BindOccasionsHost["occasionTemplateCategory"];
        host.occasionTemplatesOpen = true;
        host.render();
    }));

    /* T-1703（D-349）：提交幂等门——在途提交期间忽略重复 submit（快速双击/Enter 连发
       最多产生一次变更），按钮同步 disabled+aria-busy；失败/完成后释放可重试。
       编辑目标由 saveOccasionForm 从宿主状态在锁内复核。 */
    let occasionSubmitBusy = false;
    root.querySelector<HTMLFormElement>("[data-occasion-form]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (occasionSubmitBusy) return;
        const form = event.currentTarget as HTMLFormElement;
        const data = new FormData(form);
        if (!String(data.get("name") || "").trim() || !isValidLocalDateInput(String(data.get("date") || ""))) {
            showMessage(t("msg.occasionInvalid"));
            return;
        }
        occasionSubmitBusy = true;
        const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
        submitButton?.setAttribute("disabled", "true");
        submitButton?.setAttribute("aria-busy", "true");
        void host.enqueueMutation(() => host.saveOccasionForm(data)).finally(() => {
            occasionSubmitBusy = false;
            submitButton?.removeAttribute("disabled");
            submitButton?.removeAttribute("aria-busy");
        });
    });
}
