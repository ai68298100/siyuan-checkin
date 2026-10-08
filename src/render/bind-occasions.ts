/* 事项页事件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindOccasionsHost 结构化接口声明。 */
import {t} from "../i18n";
import {dateKey} from "../model";
import {currentCalendarDate, escapeHtml, isValidLocalDateInput} from "../shared";
import {deleteOccasion, findSimilarOccasions, normalizeOccasion, occasionTemplateName, OCCASION_TEMPLATES} from "../occasions";
import {buildOccurrencePreview} from "../features/occasion-preview";
import {formSignatureFromData, isEditorFormDirty} from "../features/editor-draft";
import {formatLunar, solarToLunar} from "../lunar";
import {showMessage} from "siyuan";
import type {Occasion, OccasionStore, OccasionTemplateCategory} from "../occasions";
import {captureOccasionDraftFor, isCurrentOccasionFormSession, isOccasionsRootOpen, nextOccasionFormSession, readOccasionsRootContext, writeOccasionsRootContext, type OccasionsRootContext} from "./occasion-session";

export interface BindOccasionsHost {
    disposed?: boolean;
    disposing?: boolean;
    occasionStore: OccasionStore;
    /** T-1583：reduced-motion 与设置页同源，滚动降级 instant。 */
    reducedMotion?: boolean;
    /** T-1613：仅移动端在展开表单后滚动定位（桌面表单常驻可见无需滚动）。 */
    isMobileFrontend?: boolean;
    editingOccasionId?: string;
    /** T-1708（D-354）：事项表单草稿——输入即快照进宿主态，远端重载整页重绘后由
        绑定期恢复（值/编辑目标匹配时）；baseUpdatedAt 用于检测远端更新同事项的
        冲突（confirm：保留草稿继续编辑 / 载入远端数据）。不跨插件重载保留。 */
    occasionDraft?: {editingId?: string; baseUpdatedAt?: string; values: Array<[string, string]>};
    /** T-1714：搜索渲染的卸载门（拆卸期不再重绘）。 */
    /** T-1716：规则预览折叠态（会话态，跨重绘保留）。 */
    occasionPreviewOpen?: boolean;
    occasionSearchQuery: string;
    occasionStatusFilter: "all" | "enabled" | "disabled";
    occasionKindFilter: "all" | "birthday" | "anniversary" | "scheduled";
    occasionTimeFilter: "all" | "today" | "missed" | "upcoming" | "ended";
    /** T-1715：排序模式（缺省 next=近到远既有口径）。 */
    occasionSortMode?: "next" | "name" | "updated";
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
    createOccasionLinkedItem(occasionId: string, root?: HTMLElement): Promise<unknown>;
    updateOccasion(item: {enabled: boolean} & Record<string, unknown>, root?: HTMLElement): Promise<unknown>;
    persistOccasions(root?: HTMLElement): Promise<void>;
    /** T-1494：按发生日期标记完成（错过补标记复用既有通道）。 */
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean, root?: HTMLElement): Promise<boolean>;
    /** T-1720（D-363）：关联项目徽章点击进该项目编辑器（宿主跨页编辑，返回回事项页）。 */
    showEditorForLinkedItem?(itemId: string, root?: HTMLElement): void;
    /** T-1720：关联项目上下文（宿主打卡 store 投影）。 */
    linkedItems?: Array<{id: string; name: string; linkedOccasionId: string; archived: boolean}>;
    /** T-1494：单次实例改期（宿主走 setOccasionOverride 既有持久化通道）。 */
    saveOccasionOverride?(id: string, originalDate: string, newDate?: string, root?: HTMLElement): void;
    syncOccasionLunarHint(form: HTMLFormElement | null): void;
    saveOccasionForm(data: FormData, root?: HTMLElement): Promise<unknown>;
}

export function bindOccasionsHandlers(root: HTMLElement, host: BindOccasionsHost): void {
    const state = readOccasionsRootContext(host, root);
    const boundPage = host.pageForRoot ? host.pageForRoot(root) : "occasions";
    const isCurrentSurface = () => !host.disposed && !host.disposing && root.isConnected !== false
        && boundPage === "occasions"
        && (host.isSurfaceRoot ? host.isSurfaceRoot(root, "occasions") : (!host.pageForRoot || host.pageForRoot(root) === boundPage));
    const currentState = () => readOccasionsRootContext(host, root);
    const writeState = (patch: Partial<OccasionsRootContext>) => writeOccasionsRootContext(host, root, patch);
    const renderRoot = () => { if (isCurrentSurface()) host.render(root); };
    host.bindDialogClose(root);
    host.bindMobileNav(root);
    root.querySelector<HTMLElement>("[data-action='back'], [data-action='occasion-back']")?.addEventListener("click", () => host.showToday(root));
    /* 手机端列表在前、表单在后（order 交换）：新建/编辑后把表单滚进视口；桌面端表单常驻可见，滚动是无害空操作。 */
    /* T-1613（方案 A）：仅移动端（列表在前/表单在后）在展开表单后滚动定位；桌面表单常驻可见无需滚动。behavior 用 instant 消除 smooth 动画感知。 */
    const revealOccasionForm = () => { const drawer = root.querySelector<HTMLDetailsElement>("[data-occasion-form-drawer]"); if (drawer) drawer.open = true; if (host.isMobileFrontend) root.querySelector<HTMLElement>(".lc-checkin__occasion-form-panel")?.scrollIntoView({block: "start", behavior: "instant"}); };
    root.querySelectorAll<HTMLElement>("[data-action='new-occasion']").forEach((button) => button.addEventListener("click", () => { writeState({editingOccasionId: undefined, formDraft: undefined, formOpen: true, submitting: false, formSession: currentState().formSession + 1}); renderRoot(); revealOccasionForm(); }));
    root.querySelector<HTMLElement>("[data-action='cancel-occasion-edit']")?.addEventListener("click", () => { writeState({editingOccasionId: undefined, formDraft: undefined, formOpen: false, submitting: false, formSession: currentState().formSession + 1}); renderRoot(); });
    /* T-1714：搜索输入保留 IME 组合态与光标位置，避免重绘吞输入。 */
    const occasionSearch = root.querySelector<HTMLInputElement>("[data-occasion-search]");
    let occasionComposing = false;
    const applyOccasionSearch = (input: HTMLInputElement) => {
        if (!input.isConnected || host.disposing) return;
        writeState({occasionSearchQuery: input.value});
        const caret = input.selectionStart;
        renderRoot();
        const next = root.querySelector<HTMLInputElement>("[data-occasion-search]");
        if (next) { next.focus(); const position = caret === null ? next.value.length : Math.min(caret, next.value.length); next.setSelectionRange(position, position); }
    };
    occasionSearch?.addEventListener("compositionstart", () => { occasionComposing = true; });
    occasionSearch?.addEventListener("compositionend", () => { occasionComposing = false; applyOccasionSearch(occasionSearch); });
    occasionSearch?.addEventListener("input", (event) => { const input = event.currentTarget as HTMLInputElement; if (occasionComposing || (event as InputEvent).isComposing) return; applyOccasionSearch(input); });
    root.querySelectorAll<HTMLSelectElement>("[data-occasion-filter]").forEach((select) => select.addEventListener("change", () => {
        const key = select.dataset.occasionFilter;
        if (key === "status") writeState({occasionStatusFilter: select.value as BindOccasionsHost["occasionStatusFilter"]});
        if (key === "kind") writeState({occasionKindFilter: select.value as BindOccasionsHost["occasionKindFilter"]});
        if (key === "time") writeState({occasionTimeFilter: select.value as BindOccasionsHost["occasionTimeFilter"]});
        renderRoot();
    }));
    /* T-1715：排序选择（宿主字段，往返自动恢复）。 */
    root.querySelector<HTMLSelectElement>("[data-occasion-sort]")?.addEventListener("change", (event) => {
        const occasionSortMode = (event.currentTarget as HTMLSelectElement).value as BindOccasionsHost["occasionSortMode"];
        writeState({occasionSortMode});
        /* Sort is root-local like the other occasion filters; avoid rendering
           every visible surface when one root changes its order. */
        renderRoot();
    });
    root.querySelector<HTMLElement>("[data-occasion-clear-filters]")?.addEventListener("click", () => {
        writeState({occasionSearchQuery: "", occasionStatusFilter: "all", occasionKindFilter: "all", occasionTimeFilter: "all"}); renderRoot();
    });
    root.querySelectorAll<HTMLElement>("[data-occasion-stat]").forEach((button) => button.addEventListener("click", () => {
        writeState({occasionStatusFilter: (button.dataset.statStatus || "all") as BindOccasionsHost["occasionStatusFilter"], occasionTimeFilter: (button.dataset.statTime || "all") as BindOccasionsHost["occasionTimeFilter"]});
        renderRoot();
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-edit]").forEach((button) => button.addEventListener("click", () => { writeState({editingOccasionId: button.dataset.occasionEdit, formDraft: undefined, formOpen: true, formSession: currentState().formSession + 1}); renderRoot(); revealOccasionForm(); }));
    root.querySelectorAll<HTMLElement>("[data-occasion-toitem]").forEach((button) => button.addEventListener("click", () => {
        void host.enqueueMutation(async () => { await host.createOccasionLinkedItem(button.dataset.occasionToitem || "", root); });
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-toggle]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionToggle || "";
        if (!host.occasionStore.occasions.some((candidate) => candidate.id === id)) return;
        void host.enqueueMutation(async () => {
            const latest = host.occasionStore.occasions.find((candidate) => candidate.id === id);
            if (latest) await host.updateOccasion({...latest, enabled: !latest.enabled}, root);
        });
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
            try { await host.persistOccasions(root); } catch {
                host.occasionStore = previous;
                if (isOccasionsRootOpen(host, root)) showMessage(t("msg.occasionDeleteFail"));
            }
            if (!isOccasionsRootOpen(host, root)) return;
            const next = currentState();
            next.deletingOccasionIds.delete(id);
            const nextMoves = {...next.occurrenceMoves};
            delete nextMoves[id];
            next.occurrenceMoves = nextMoves;
            if (next.editingOccasionId === id) next.editingOccasionId = undefined;
            renderRoot();
        });
    }));

    /* T-1494：错过补标记（沿用既有按日期完成通道）+ 单次改期（内联日期行，确认后走宿主覆盖通道）。 */
    root.querySelectorAll<HTMLElement>("[data-occasion-late-complete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionLateId || "";
        const missedDate = button.dataset.occasionLateDate || "";
        if (!id || !missedDate) return;
        void host.enqueueMutation(async () => { await host.setOccasionCompleted(id, missedDate, true, root); });
    }));
    /* T-1712（D-355）：行内完成/撤销当前可处理发生日——复用 setOccasionCompleted 单一
       通道（与今日横幅/回顾/补标同源），撤销同通道回滚；启停走 data-occasion-toggle
       互不混淆。 */
    root.querySelectorAll<HTMLElement>("[data-occasion-complete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionComplete || "";
        const occurrenceDate = button.dataset.occasionCompleteDate || "";
        const target = button.dataset.occasionCompleteTarget === "true";
        if (!id || !occurrenceDate) return;
        void host.enqueueMutation(async () => { await host.setOccasionCompleted(id, occurrenceDate, target); });
    }));
    /* T-1720（D-363）：关联项目徽章点击进该项目编辑器（跨页编辑，返回回事项页）；
       归档项目只读不可进（先启用再编辑）。 */
    root.querySelectorAll<HTMLElement>("[data-occasion-linked-edit]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionLinkedEdit || "";
        const linked = (host.linkedItems || []).find((entry) => entry.id === id);
        if (linked && !linked.archived && host.showEditorForLinkedItem) host.showEditorForLinkedItem(id, root);
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-move-toggle]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionMoveToggle || "";
        const row = root.querySelector<HTMLElement>(`[data-occasion-move-row='${CSS.escape(id) || id}']`);
        if (!row) return;
        const previous = currentState().occurrenceMoves[id];
        const open = !Boolean(previous?.open);
        writeState({occurrenceMoves: {...currentState().occurrenceMoves, [id]: {open, date: previous?.date || ""}}});
        /* Re-render the owning root so a subsequent filter/action cannot lose
           the move session.  Focus the newly rendered input after the DOM swap. */
        renderRoot();
        if (open) root.querySelector<HTMLElement>(`[data-occasion-move-row='${CSS.escape(id) || id}'] [data-occasion-move-date]`)?.focus();
    }));
    root.querySelectorAll<HTMLElement>("[data-occasion-move-row]").forEach((row) => {
        const id = row.dataset.occasionMoveRow || "";
        const dateInput = row.querySelector<HTMLInputElement>("[data-occasion-move-date]");
        const confirmButton = row.querySelector<HTMLButtonElement>("[data-occasion-move-confirm]");
        if (!dateInput || !confirmButton) return;
        /* T-1718（D-359）：原日→新日可视核对（选日即更新标签）；撞到已完成/其他
           覆盖实例时 confirm 反馈（允许但明确）。 */
        const originLabel = row.querySelector<HTMLElement>("[data-occasion-move-origin-label]");
        const originDate = confirmButton.dataset.occasionMoveOrigin || "";
        dateInput.addEventListener("change", () => {
            /* 保留 root-local 改期草稿；确认前切换筛选或重绘不能吞掉所选日期。 */
            const current = currentState();
            writeState({occurrenceMoves: {...current.occurrenceMoves, [id]: {open: true, date: dateInput.value}}});
            confirmButton.disabled = !dateInput.value;
            if (originLabel && dateInput.value) originLabel.textContent = t("occ.moveTo", {from: originDate, to: dateInput.value});
            if (originLabel && !dateInput.value) originLabel.textContent = t("occ.moveFrom", {date: originDate});
        });
        confirmButton.addEventListener("click", () => {
            if (!dateInput.value || confirmButton.disabled) return;
            const target = host.occasionStore.occasions.find((candidate) => candidate.id === id);
            const clash = target && ((target.completedDates || []).includes(dateInput.value)
                || Object.values(target.overrides || {}).some((override) => override.date === dateInput.value)
                || Boolean(target.overrides?.[dateInput.value]));
            if (clash && !window.confirm(t("msg.occasionMoveClash", {date: dateInput.value}))) return;
            const current = currentState();
            writeState({occurrenceMoves: {...current.occurrenceMoves, [id]: {open: false, date: dateInput.value}}});
            if (host.saveOccasionOverride) host.saveOccasionOverride(id, confirmButton.dataset.occasionMoveOrigin || "", dateInput.value, root);
        });
    });
    /* T-1718：撤销改期——只清本次覆盖（setOccasionOverride 传 undefined），恢复周期
       规则日期；不影响其他周期或历史。 */
    root.querySelectorAll<HTMLElement>("[data-occasion-move-undo]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionMoveUndo || "";
        const origin = button.dataset.occasionMoveUndoOrigin || "";
        if (!id || !origin) return;
        if (!window.confirm(t("msg.occasionMoveUndoConfirm", {origin, next: button.dataset.occasionMoveUndoNext || ""}))) return;
        if (host.saveOccasionOverride) host.saveOccasionOverride(id, origin, undefined);
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
        /* T-1702（D-349）：编辑既有事项时套用模板=以模板覆写当前表单草案，编辑目标
           （editingOccasionId/历史/关联）保持不变；确认取消零写入。新建路径维持原样
           （模板即新事项起点）。 */
        if (host.editingOccasionId && !window.confirm(t("msg.occasionTemplateOverwrite"))) return;
        /* T-1708：模板程序性覆写表单后清草稿——重绘恢复不得盖回模板之前的值。 */
        host.occasionDraft = undefined;
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
        /* 编辑态保留目标；新建态的 editingOccasionId 已由新建入口清空。 */
        writeState({formDraft: undefined, formOpen: true, formSession: currentState().formSession + 1});
        syncBlocks();
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-occasion-template-category]").forEach((button) => button.addEventListener("click", () => {
        writeState({occasionTemplateCategory: (button.dataset.occasionTemplateCategory || "recommended") as BindOccasionsHost["occasionTemplateCategory"], occasionTemplatesOpen: true});
        renderRoot();
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
            if (isCurrentSurface()) showMessage(t("msg.occasionInvalid"));
            return;
        }
        const current = currentState();
        /* T-1717（D-360）：新建前重复/相似提示——只提示不合并，合法重名（不同人的
           生日）确认后保留；编辑既有事项不查。优先读取 root 状态，兼容旧宿主字段。 */
        if (!host.editingOccasionId) {
            const editingOccasionId = current.editingOccasionId ?? host.editingOccasionId;
            if (!editingOccasionId) {
                const duplicates = findSimilarOccasions(host.occasionStore.occasions, String(data.get("name") || ""));
                if (duplicates.length && !window.confirm(t("msg.occasionDuplicate", {names: duplicates.map((item) => item.name).join("、")}))) return;
            }
        }
        captureOccasionDraftFor(root, current);
        const session = nextOccasionFormSession(current);
        occasionSubmitBusy = true;
        const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
        submitButton?.setAttribute("disabled", "true");
        submitButton?.setAttribute("aria-busy", "true");
        writeState({submitting: true});
        renderRoot();
        void host.enqueueMutation(() => host.saveOccasionForm(data, root)).catch(() => {
            if (isCurrentOccasionFormSession(host, root, session)) writeState({submitting: false});
        }).finally(() => {
            occasionSubmitBusy = false;
            submitButton?.removeAttribute("disabled");
            submitButton?.removeAttribute("aria-busy");
        });
    });

    /* T-1708（D-354）：事项表单草稿——输入即快照进宿主态（远端 onDataChanged 整页
       重绘不再吞未保存表单），绑定期按编辑目标匹配恢复；远端更新过同一事项
       （updatedAt 变化）时 confirm 冲突：确定=保留草稿继续编辑，取消=载入远端数据。
       草稿不跨插件重载保留；程序性批量写表单（模板套用等）后必须清草稿。 */
    const occasionDraftForm = root.querySelector<HTMLFormElement>("[data-occasion-form]");
    if (occasionDraftForm) {
        const draft = host.occasionDraft;
        if (draft && (draft.editingId ?? undefined) === (host.editingOccasionId ?? undefined)) {
            const draftTarget = draft.editingId ? host.occasionStore.occasions.find((candidate) => candidate.id === draft.editingId) : undefined;
            const remoteChanged = Boolean(draft.editingId) && draftTarget ? draftTarget.updatedAt !== draft.baseUpdatedAt : false;
            const applyDraft = () => {
                for (const [name, value] of draft.values) {
                    const field = occasionDraftForm.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`);
                    if (field) field.value = value;
                }
            };
            if (remoteChanged && !window.confirm(t("msg.occasionDraftConflict"))) {
                host.occasionDraft = undefined;
            } else {
                applyDraft();
                showMessage(t("msg.occasionDraftRestored"));
                host.occasionDraft = undefined;
            }
        }
        const draftBaseUpdatedAt = host.editingOccasionId
            ? host.occasionStore.occasions.find((candidate) => candidate.id === host.editingOccasionId)?.updatedAt
            : undefined;
        const draftBaseline = formSignatureFromData(new FormData(occasionDraftForm));
        occasionDraftForm.addEventListener("input", () => {
            const data = new FormData(occasionDraftForm);
            if (isEditorFormDirty(data, draftBaseline)) {
                const values: Array<[string, string]> = [];
                data.forEach((value, key) => { if (typeof value === "string") values.push([key, value]); });
                host.occasionDraft = {editingId: host.editingOccasionId, baseUpdatedAt: draftBaseUpdatedAt, values};
            } else if (host.occasionDraft) host.occasionDraft = undefined;
        });
        /* T-1716（D-358）：规则预览实时填充——从表单值构造 normalize 输入（与
           saveOccasionForm 同字段集合），经 buildOccurrencePreview 单一投影渲染
           接下来发生日与提醒出现日；只读、零写入、不触发保存。 */
        const previewBody = root.querySelector<HTMLElement>("[data-occasion-preview-body]");
        const previewDetails = root.querySelector<HTMLDetailsElement>("[data-occasion-preview]");
        previewDetails?.addEventListener("toggle", (event) => { host.occasionPreviewOpen = (event.currentTarget as HTMLDetailsElement).open; });
        const updateOccurrencePreview = () => {
            if (!previewBody) return;
            const data = new FormData(occasionDraftForm);
            const read = (name: string) => String(data.get(name) || "");
            const recurrenceValue = read("recurrence");
            const draftInput = {
                name: read("name") || "预览",
                kind: read("kind") || "scheduled",
                date: read("date"),
                recurrence: ["once", "annual", "monthly", "weekly", "quarterly", "halfyearly", "interval"].includes(recurrenceValue) ? recurrenceValue : "annual",
                calendar: recurrenceValue === "annual" ? read("calendar") || "solar" : "solar",
                annualSubtype: read("annualSubtype") || "byday",
                month: Number(read("annualMonth")) || undefined,
                nthWeek: Number(read("annualNth")) || undefined,
                weekday: Number(read("weekday")) || 0,
                monthlySubtype: read("monthlySubtype") || "byday",
                intervalUnit: read("intervalUnit") || "month",
                intervalCount: Number(read("intervalCount")) || undefined,
                remindBeforeDays: Math.max(0, Math.min(365, Math.round(Number(read("remindBeforeDays")) || 0))),
                note: "",
            };
            const draftOccasion = normalizeOccasion(draftInput);
            if (!draftOccasion) {
                previewBody.innerHTML = `<small>${escapeHtml(t("occ.previewNone"))}</small>`;
                return;
            }
            const preview = buildOccurrencePreview(draftOccasion, currentCalendarDate());
            if (!preview.entries.length) {
                previewBody.innerHTML = `<small>${escapeHtml(t(preview.reasonKey || "occ.previewNone"))}</small>`;
                return;
            }
            previewBody.innerHTML = preview.entries.map((entry) => `<div class="lc-checkin__occasion-preview-row"><time datetime="${escapeHtml(entry.occurrenceDate)}">${escapeHtml(entry.occurrenceDate)}</time><small>${escapeHtml(t("occ.previewRemind", {date: entry.remindDate}))}</small></div>`).join("");
        };
        updateOccurrencePreview();
        occasionDraftForm.addEventListener("input", updateOccurrencePreview);
        occasionDraftForm.addEventListener("change", updateOccurrencePreview);
    }
}
