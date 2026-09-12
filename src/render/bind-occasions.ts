/* 事项页事件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindOccasionsHost 结构化接口声明。 */
import {t} from "../i18n";
import {dateKey} from "../model";
import {currentCalendarDate, isValidLocalDateInput} from "../shared";
import {deleteOccasion, occasionTemplateName, OCCASION_TEMPLATES} from "../occasions";
import {formatLunar, solarToLunar} from "../lunar";
import {showMessage} from "siyuan";
import type {Occasion, OccasionStore} from "../occasions";

export interface BindOccasionsHost {
    occasionStore: OccasionStore;
    editingOccasionId?: string;
    occasionSearchQuery: string;
    occasionTemplatesOpen: boolean;
    bindDialogClose(root: HTMLElement): void;
    bindMobileNav(root: HTMLElement): void;
    showToday(): void;
    render(): void;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    createOccasionLinkedItem(occasionId: string): Promise<unknown>;
    updateOccasion(item: {enabled: boolean} & Record<string, unknown>): Promise<unknown>;
    persistOccasions(): Promise<void>;
    syncOccasionLunarHint(form: HTMLFormElement | null): void;
    saveOccasionForm(data: FormData): Promise<unknown>;
}

export function bindOccasionsHandlers(root: HTMLElement, host: BindOccasionsHost): void {
    host.bindDialogClose(root);
    host.bindMobileNav(root);
    root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => host.showToday());
    /* 手机端列表在前、表单在后（order 交换）：新建/编辑后把表单滚进视口；桌面端表单常驻可见，滚动是无害空操作。 */
    const revealOccasionForm = () => { root.querySelector<HTMLElement>(".lc-checkin__occasion-form-panel")?.scrollIntoView({block: "start", behavior: "smooth"}); };
    root.querySelector<HTMLElement>("[data-action='new-occasion']")?.addEventListener("click", () => { host.editingOccasionId = undefined; host.render(); revealOccasionForm(); });
    root.querySelector<HTMLElement>("[data-action='cancel-occasion-edit']")?.addEventListener("click", () => { host.editingOccasionId = undefined; host.render(); });
    root.querySelector<HTMLInputElement>("[data-occasion-search]")?.addEventListener("input", (event) => {
        host.occasionSearchQuery = (event.currentTarget as HTMLInputElement).value;
        host.render();
        const searchInput = document.querySelector<HTMLInputElement>("[data-occasion-search]");
        if (searchInput) { searchInput.focus(); searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); }
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
        host.editingOccasionId = undefined;
        syncBlocks();
    }));

    root.querySelector<HTMLFormElement>("[data-occasion-form]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        const data = new FormData(form);
        if (!String(data.get("name") || "").trim() || !isValidLocalDateInput(String(data.get("date") || ""))) {
            showMessage(t("msg.occasionInvalid"));
            return;
        }
        void host.enqueueMutation(() => host.saveOccasionForm(data));
    });
}
