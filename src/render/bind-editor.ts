/* 编辑器事件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindEditorHost 接口声明（含索引签名以兼容类内私有状态）；
   index.ts 通过 bindEditorHandlers(root, this as unknown as BindEditorHost) 接线。 */
import {t} from "../i18n";
import {dateKey, getItemRevisionForDate, getEventsForDay, makeId} from "../model";
import {currentCalendarDate, captureActionMoment, calendarDateFromKey, escapeHtml, formatNumber, formatScheduleLabel, getEditorStep, getRecordStep, getTargetLabel, renderIconMarkup, matchesSearch, normalizeCustomIcon, normalizeCustomIconLibrary, parseCustomIconLibrary} from "../shared";
import {getRecordStepInputStep, normalizeRecordStep} from "../record-step";
import {CHECKIN_TEMPLATES, ICON_GROUPS, ICON_SEARCH_KEYWORDS, KIND_OPTIONS, templateName} from "../catalog";
import {KIND_LABELS, PRIORITY_LABELS, SCHEDULE_LABELS, TIME_SLOT_LABELS} from "../ui/labels";
import {validateEditorInput} from "../editor-validation";
import {normalizePriorityInput, normalizeTimeSlotInput} from "../shared";
import {upsertUserTemplate, deleteUserTemplate} from "../features/templates";
import {RECENT_TEMPLATES_LIMIT} from "../view-preferences";
import {fetchSyncPost, showMessage} from "siyuan";
import {buildAnchorDocumentPath, filterAnchorChoices} from "../features/note-anchor-picker";
import {describeEditorPreviewActions, describeEditorPreviewMeta} from "./editor";
import type {CheckinItem, CheckinKind, CheckinSchedule, CheckinStore, ScheduleType, UserTemplate} from "../types";

/* 存储名与 index.ts 保持一致（历史常量，避免跨模块导出）。 */
const CUSTOM_ICON_LIBRARY_NAME = "checkin-custom-icon-library";
const USER_TEMPLATES_NAME = "checkin-user-templates";
const MAX_CUSTOM_ICON_BYTES = 240_000;

export interface BindEditorHost {
    store: CheckinStore;
    userTemplates: UserTemplate[];
    customIconLibrary: string[];
    editingId?: string;
    editingFingerprint?: string;
    summaryCustomRange?: {startDate: string; endDate: string};
    summaryText?: string;
    suggestionWorkflow?: import("../features/suggestion-workflow").SuggestionWorkflowState;
    summaryRefreshing?: boolean;
    summaryRequestId: number;
    pendingAttachments: Map<string, string>;
    bindMobileNav(root: HTMLElement): void;
    bindDialogClose(root: HTMLElement): void;
    retrySave(): Promise<void> | void;
    showToday(): void;
    archiveEditingItem(): Promise<void> | void;
    deleteEditingItem(): Promise<boolean> | void;
    saveData(name: string, value: unknown): Promise<void>;
    render(): void;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    saveForm(data: FormData, editingId: string | undefined, submittedAt: {occurredAt: string; localDate: string}, expectedFingerprint?: string): Promise<unknown>;
    revisionFingerprint(item: CheckinItem, date: Date): string;
    /** T-1359：待检查的智能体项目草案（存在时编辑器预填，检查后由用户手动保存）。 */
    pendingProjectDraft?: import("../features/project-draft").ProjectDraft;
    clearPendingProjectDraft(): void;
    /** T-1349：模板套用后更新「最近使用」偏好并持久化（宿主内去重置顶、容量 6）。 */
    recordRecentTemplateUse(name: string): void;
    [key: string]: unknown;
}

export function bindEditorHandlers(root: HTMLElement, host: BindEditorHost): void {
    host.bindMobileNav(root);
    host.bindDialogClose(root);
    root.querySelector<HTMLElement>("[data-action='retry-save']")?.addEventListener("click", () => {
        void host.retrySave();
    });
    const ensureEditorVisible = (element?: HTMLElement | null) => {
        if (!element) return;
        window.setTimeout(() => element.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"}), 80);
    };
    let activeIconGroup = root.querySelector<HTMLElement>("[data-icon-group].is-selected")?.dataset.iconGroup || "all";
    const ICON_SIZE_STEPS = [16, 20, 28, 40];
    const allIconCount = ICON_GROUPS.reduce((sum, group) => sum + group.icons.length, 0);
    const iconPopup = root.querySelector<HTMLDetailsElement>("[data-icon-popup]");
    const iconPopupSummary = iconPopup?.querySelector<HTMLElement>("summary");
    iconPopup?.addEventListener("toggle", () => { if (!iconPopup.open) iconPopupSummary?.focus(); });
    /* 尺寸预览条（T-116）：把选中图标按列表/标签/卡片/大图四档真实尺寸同时呈现。 */
    const renderIconSizeStrip = (icon: string) => {
        const strip = root.querySelector<HTMLElement>("[data-icon-size-strip]");
        if (!strip) return;
        strip.replaceChildren(...ICON_SIZE_STEPS.map((size) => {
            const cell = document.createElement("span");
            cell.className = "lc-checkin__size-cell";
            cell.style.setProperty("--size-preview-px", `${size}px`);
            const glyph = document.createElement("i");
            glyph.className = "lc-checkin__size-icon";
            glyph.innerHTML = renderIconMarkup(icon || "✓");
            const label = document.createElement("small");
            label.textContent = String(size);
            cell.append(glyph, label);
            return cell;
        }));
    };
    const selectIcon = (icon: string) => {
        root.querySelectorAll("[data-icon].is-selected").forEach((selected) => selected.classList.remove("is-selected"));
        const input = root.querySelector<HTMLInputElement>("input[name='icon']");
        if (input) input.value = icon || "✓";
        root.querySelectorAll<HTMLButtonElement>("[data-icon]").forEach((button) => {
            if (button.dataset.icon === icon) button.classList.add("is-selected");
        });
        const current = root.querySelector<HTMLElement>("[data-popup-current-icon]");
        if (current) current.innerHTML = renderIconMarkup(icon || "✓");
        renderIconSizeStrip(icon || "✓");
    };
    const selectIconGroup = (groupId: string) => {
        activeIconGroup = groupId === "all" || groupId === "mine" || ICON_GROUPS.some((group) => group.id === groupId) ? groupId : "all";
        const query = root.querySelector<HTMLInputElement>("[data-icon-query]");
        if (query) query.value = "";
        root.querySelectorAll<HTMLElement>("[data-icon-group]").forEach((button) => {
            const selected = button.dataset.iconGroup === activeIconGroup;
            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        applyIconFilter();
    };
    const applyIconFilter = () => {
        const queryInput = root.querySelector<HTMLInputElement>("[data-icon-query]");
        const query = queryInput?.value || "";
        const hasQuery = Boolean(query.trim());
        let matchCount = 0;
        root.querySelectorAll<HTMLElement>("[data-icon-panel]").forEach((panel) => {
            let panelMatchCount = 0;
            panel.querySelectorAll<HTMLButtonElement>("[data-icon]").forEach((button) => {
                const matches = !hasQuery || matchesSearch(button.dataset.iconSearchText || button.dataset.icon || "", query);
                button.hidden = !matches;
                if (matches) panelMatchCount += 1;
            });
            matchCount += panelMatchCount;
            panel.hidden = hasQuery ? panelMatchCount === 0
                : activeIconGroup === "all" ? false
                    : panel.dataset.iconPanel !== activeIconGroup;
        });
        const activeGroup = ICON_GROUPS.find((group) => group.id === activeIconGroup) || ICON_GROUPS[0];
        const count = root.querySelector<HTMLElement>("[data-icon-count]");
        if (count) {
            const mineCount = root.querySelectorAll("[data-icon-panel='mine'] [data-icon]:not([hidden])").length;
            count.textContent = hasQuery ? t("editor.iconMatched", {n: matchCount})
                : activeIconGroup === "all" ? t("editor.iconCount", {name: t("editor.iconAll"), n: allIconCount})
                : activeIconGroup === "mine" ? t("editor.iconCount", {name: t("editor.iconMine"), n: mineCount})
                : t("editor.iconCount", {name: activeGroup.name, n: activeGroup.icons.length});
        }
        const empty = root.querySelector<HTMLElement>("[data-icon-empty]");
        if (empty) empty.hidden = matchCount > 0;
        root.querySelector<HTMLElement>("[data-icon-results]")?.classList.toggle("is-searching", hasQuery);
        root.querySelector<HTMLButtonElement>("[data-action='clear-icon-query']")?.toggleAttribute("hidden", !hasQuery);
        /* 「我的」管理工具（上传/导入）只在我的页签展示；搜索时聚焦图标本身 */
        const customPanel = root.querySelector<HTMLElement>("[data-custom-icon-panel]");
        if (customPanel) customPanel.hidden = activeIconGroup !== "mine";
    };
    root.querySelectorAll<HTMLButtonElement>("[data-icon]").forEach((button) => button.addEventListener("click", () => selectIcon(button.dataset.icon || "✓")));
    root.querySelectorAll<HTMLButtonElement>("[data-icon-group]").forEach((button) => button.addEventListener("click", () => selectIconGroup(button.dataset.iconGroup || ICON_GROUPS[0].id)));
    const iconQuery = root.querySelector<HTMLInputElement>("[data-icon-query]");
    iconQuery?.addEventListener("input", applyIconFilter);
    root.querySelectorAll<HTMLElement>("[data-action='clear-icon-query']").forEach((button) => button.addEventListener("click", () => {
        if (iconQuery) {
            iconQuery.value = "";
            iconQuery.focus();
        }
        applyIconFilter();
    }));
    root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => host.showToday());
    root.querySelector<HTMLElement>("[data-action='archive']")?.addEventListener("click", () => host.archiveEditingItem());
    root.querySelector<HTMLElement>("[data-action='delete-item']")?.addEventListener("click", () => host.deleteEditingItem());
    const scheduleSelect = root.querySelector<HTMLSelectElement>("select[name='schedule']");
    const directionField = root.querySelector<HTMLElement>("[data-direction-at-most-field]");
    const anchorInput = root.querySelector<HTMLInputElement>("input[name='anchorBlockId']");
    const anchorAppendInput = root.querySelector<HTMLInputElement>("input[name='anchorAppendNotes']");
    const anchorBrowser = root.querySelector<HTMLElement>("[data-anchor-browser]");
    const anchorQuery = root.querySelector<HTMLInputElement>("[data-anchor-query]");
    const anchorCreateRow = root.querySelector<HTMLElement>("[data-anchor-create-row]");
    const anchorOptions = [...root.querySelectorAll<HTMLElement>("[data-anchor-choice]")];
    const anchorFilterEmpty = root.querySelector<HTMLElement>("[data-anchor-filter-empty]");
    const knownAnchorChoices = anchorOptions.map((button) => ({blockId: button.dataset.anchorChoice || "", labels: [button.dataset.anchorSearchText || ""]})).filter((choice) => choice.blockId);
    const updateAnchorInputState = () => {
        const hasAnchor = Boolean(anchorInput?.value.trim());
        if (anchorAppendInput) {
            anchorAppendInput.disabled = !hasAnchor;
            if (!hasAnchor) anchorAppendInput.checked = false;
        }
        const filtered = filterAnchorChoices(knownAnchorChoices, anchorQuery?.value || "");
        anchorOptions.forEach((button) => { button.hidden = !filtered.some((choice) => choice.blockId === button.dataset.anchorChoice); });
        if (anchorFilterEmpty) anchorFilterEmpty.hidden = filtered.length > 0 || !knownAnchorChoices.length;
    };
    const loadAnchorNotebooks = async () => {
        const select = root.querySelector<HTMLSelectElement>("[data-anchor-notebook]");
        if (!select || select.dataset.loaded === "true") return;
        try {
            const response = await fetchSyncPost("/api/notebook/lsNotebooks", {}) as unknown as {code?: number; data?: {notebooks?: Array<{id?: string; name?: string; closed?: boolean}>}};
            const notebooks = (response.code === 0 ? response.data?.notebooks : undefined)?.filter((notebook) => notebook.id && !notebook.closed) || [];
            select.replaceChildren(...notebooks.map((notebook) => { const option = document.createElement("option"); option.value = notebook.id || ""; option.textContent = notebook.name || notebook.id || ""; return option; }));
            if (!notebooks.length) { const option = document.createElement("option"); option.value = ""; option.textContent = t("editor.anchorNoNotebook"); select.append(option); }
            select.dataset.loaded = "true";
        } catch {
            select.replaceChildren();
            const option = document.createElement("option"); option.value = ""; option.textContent = t("editor.anchorNotebookFailed"); select.append(option);
        }
    };
    const openAnchorPicker = () => {
        if (!anchorBrowser) return;
        anchorBrowser.toggleAttribute("hidden");
        if (!anchorBrowser.hidden) { updateAnchorInputState(); void loadAnchorNotebooks(); anchorQuery?.focus(); }
    };
    root.querySelector<HTMLElement>("[data-action='anchor-open-picker']")?.addEventListener("click", openAnchorPicker);
    root.querySelector<HTMLElement>("[data-action='anchor-clear']")?.addEventListener("click", () => { if (anchorInput) anchorInput.value = ""; updateAnchorInputState(); anchorInput?.focus(); });
    anchorInput?.addEventListener("input", updateAnchorInputState);
    anchorQuery?.addEventListener("input", updateAnchorInputState);
    anchorOptions.forEach((button) => button.addEventListener("click", () => { if (anchorInput) anchorInput.value = button.dataset.anchorChoice || ""; anchorBrowser?.setAttribute("hidden", ""); updateAnchorInputState(); }));
    root.querySelector<HTMLElement>("[data-action='anchor-create']")?.addEventListener("click", () => { anchorCreateRow?.toggleAttribute("hidden"); if (!anchorCreateRow?.hidden) { void loadAnchorNotebooks(); root.querySelector<HTMLInputElement>("[data-anchor-doc-title]")?.focus(); } });
    root.querySelector<HTMLElement>("[data-action='anchor-create-confirm']")?.addEventListener("click", async () => {
        const notebook = root.querySelector<HTMLSelectElement>("[data-anchor-notebook]")?.value || "";
        const title = root.querySelector<HTMLInputElement>("[data-anchor-doc-title]")?.value || "";
        const path = buildAnchorDocumentPath(title);
        if (!notebook || !path) { showMessage(t("editor.anchorCreateInvalid")); return; }
        try {
            const response = await fetchSyncPost("/api/filetree/createDocWithMd", {notebook, path, markdown: ""}) as unknown as {code?: number; msg?: string; data?: unknown};
            const blockId = response.code === 0 && typeof response.data === "string" ? response.data : "";
            if (!blockId) throw new Error(response.msg || "create-anchor-failed");
            if (anchorInput) anchorInput.value = blockId;
            anchorCreateRow?.setAttribute("hidden", "");
            anchorBrowser?.setAttribute("hidden", "");
            updateAnchorInputState();
            showMessage(t("editor.anchorCreated"));
        } catch (error) { showMessage(`${t("editor.anchorCreateFailed")} ${String(error instanceof Error ? error.message : error)}`); }
    });
    const unitInput = root.querySelector<HTMLInputElement>("input[name='unit']");
    const targetInput = root.querySelector<HTMLInputElement>("input[name='target']");
    const recordStepInput = root.querySelector<HTMLInputElement>("input[name='recordStep']");
    const getKind = () => (root.querySelector<HTMLInputElement>("input[name='kind']:checked")?.value || "binary") as CheckinKind;
    const updateEditorPreview = () => {
        const kind = getKind();
        const option = KIND_OPTIONS.find((candidate) => candidate.kind === kind) || KIND_OPTIONS[0];
        const name = root.querySelector<HTMLInputElement>("input[name='name']")?.value.trim() || t("editor.unnamed");
        const icon = root.querySelector<HTMLInputElement>("input[name='icon']")?.value || "✓";
        const unit = unitInput?.value.trim() || option.defaultUnit;
        const target = Number(targetInput?.value || option.step);
        const configuredRecordStep = Number(recordStepInput?.value);
        const scheduleType = (scheduleSelect?.value || "daily") as ScheduleType;
        const quotaCountMode = root.querySelector<HTMLSelectElement>("select[name='quotaCountMode']")?.value === "value" ? "value" : "dates";
        const quotaAmount = Number(root.querySelector<HTMLInputElement>("input[name='quotaAmount']")?.value || 1);
        const directionAtMost = root.querySelector<HTMLInputElement>("input[name='directionAtMost']")?.checked;
        const previewActions = describeEditorPreviewActions({
            kind, unit, recordStep: getRecordStep(kind, unit, configuredRecordStep), scheduleType,
            quotaCountMode, directionAtMost,
            completionSource: root.querySelector<HTMLSelectElement>("select[name='completionSource']")?.value === "tomato" ? "tomato" : "manual",
        });
        let scheduleLabel = t(SCHEDULE_LABELS[scheduleType] || SCHEDULE_LABELS.daily);
        if (scheduleType === "interval") {
            const days = Math.max(1, Number(root.querySelector<HTMLInputElement>("input[name='intervalDays']")?.value || 1));
            scheduleLabel = t("schedule.intervalN", {n: formatNumber(days)});
        } else if (scheduleType === "quota") {
            const period = root.querySelector<HTMLSelectElement>("select[name='quotaPeriod']")?.value === "month" ? t("editor.quotaMonthly") : t("editor.quotaWeekly");
            const mode = quotaCountMode === "value" ? unit : t("editor.quotaDayUnit");
            scheduleLabel = `${period} ${formatNumber(quotaAmount)} ${mode}`;
        }
        const previewName = root.querySelector<HTMLElement>("[data-preview-name]");
        const previewIcon = root.querySelector<HTMLElement>("[data-preview-icon]");
        const previewMeta = root.querySelector<HTMLElement>("[data-preview-meta]");
        const previewAction = root.querySelector<HTMLElement>("[data-preview-action]");
        const previewRecordStep = root.querySelector<HTMLElement>("[data-preview-record-step]");
        const previewProgress = root.querySelector<HTMLElement>("[data-preview-progress]");
        if (previewName) previewName.textContent = name;
        if (previewIcon) previewIcon.innerHTML = renderIconMarkup(icon);
        if (previewMeta) previewMeta.textContent = describeEditorPreviewMeta({
            kind, unit, target: Number.isFinite(target) ? target : option.step,
            scheduleType, scheduleLabel, quotaAmount, quotaCountMode, directionAtMost,
        });
        if (previewAction) previewAction.textContent = previewActions.label;
        if (previewRecordStep) {
            previewRecordStep.textContent = previewActions.detail;
            previewRecordStep.hidden = !previewActions.detail;
        }
        if (previewProgress) previewProgress.hidden = kind === "binary" && scheduleType !== "quota";
    };
    const applyCustomIcon = () => {
        const input = root.querySelector<HTMLInputElement>("[data-custom-icon-input]");
        const customIcon = normalizeCustomIcon(input?.value || "");
        if (!customIcon) {
            showMessage(t("msg.iconInvalid"));
            input?.focus();
            return;
        }
        selectIcon(customIcon);
        if (input) input.value = customIcon;
        updateEditorPreview();
    };
    const applyLocalIcon = (icon: string, storageLabel: string) => {
        if (icon.length > MAX_CUSTOM_ICON_BYTES) {
            showMessage(t("msg.iconTooLarge", {action: storageLabel, kb: Math.round(MAX_CUSTOM_ICON_BYTES / 1024)}));
            return;
        }
        const sizeKb = Math.max(1, Math.round(icon.length * 0.75 / 1024));
        if (!window.confirm(t("msg.iconSaveConfirm", {kb: sizeKb}))) return;
        selectIcon(icon);
        const input = root.querySelector<HTMLInputElement>("[data-custom-icon-input]");
        if (input) input.value = icon;
        updateEditorPreview();
    };
    const readImageBlob = async (file: Blob): Promise<string> => {
        if (!file.type.startsWith("image/")) throw new Error(t("editor.errPickImage"));
        if (file.size > MAX_CUSTOM_ICON_BYTES) throw new Error(t("editor.errImageTooLarge", {n: Math.round(MAX_CUSTOM_ICON_BYTES / 1024)}));
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error(t("editor.errImageRead")));
            reader.onerror = () => reject(new Error(t("editor.errImageRead")));
            reader.readAsDataURL(file);
        });
    };
    root.querySelector<HTMLElement>("[data-action='apply-custom-icon']")?.addEventListener("click", applyCustomIcon);
    root.querySelector<HTMLInputElement>("[data-custom-icon-input]")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); applyCustomIcon(); }
    });
    root.querySelector<HTMLInputElement>("[data-custom-icon-file]")?.addEventListener("change", async (event) => {
        const file = (event.currentTarget as HTMLInputElement).files?.[0];
        if (!file) return;
        try { applyLocalIcon(await readImageBlob(file), t("msg.upload")); } catch (error) { showMessage(`[小驴打卡] ${String(error instanceof Error ? error.message : error)}`); }
    });
    root.querySelector<HTMLElement>("[data-action='download-custom-icon']")?.addEventListener("click", async () => {
        const input = root.querySelector<HTMLInputElement>("[data-custom-icon-input]");
        const url = normalizeCustomIcon(input?.value || "");
        if (!url || !/^https:\/\//i.test(url)) { showMessage(t("msg.iconUrlNeeded")); input?.focus(); return; }
        try {
            const response = await fetch(url, {credentials: "omit"});
            if (!response.ok) throw new Error(`下载失败（${response.status}）`);
            const blob = await response.blob();
            if (!blob.type.startsWith("image/")) throw new Error("地址返回的不是图片");
            applyLocalIcon(await readImageBlob(blob), t("msg.download"));
        } catch (error) {
            showMessage(t("msg.iconDownloadFail", {error: String(error instanceof Error ? error.message : error)}));
        }
    });
    root.querySelector<HTMLElement>("[data-action='open-iconfont']")?.addEventListener("click", () => {
        window.open("https://www.iconfont.cn/", "_blank", "noopener,noreferrer");
    });
    root.querySelectorAll<HTMLButtonElement>("[data-library-icon]").forEach((button) => button.addEventListener("click", () => {
        const icon = button.dataset.libraryIcon || "";
        if (icon) { selectIcon(icon); const input = root.querySelector<HTMLInputElement>("[data-custom-icon-input]"); if (input) input.value = icon; updateEditorPreview(); }
    }));
    root.querySelector<HTMLInputElement>("[data-custom-icon-library]")?.addEventListener("change", async (event) => {
        const file = (event.currentTarget as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
            const parsed = parseCustomIconLibrary(await file.text());
            if (!parsed.length) throw new Error("没有找到可用图标");
            const merged = normalizeCustomIconLibrary([...host.customIconLibrary, ...parsed]);
            const added = merged.length - host.customIconLibrary.length;
            if (!added) throw new Error("图标库中没有新的图标");
            const sizeKb = Math.max(1, Math.round(merged.reduce((sum, icon) => sum + icon.length, 0) * 0.75 / 1024));
            if (!window.confirm(t("msg.iconImportConfirm", {n: added, kb: sizeKb}))) return;
            host.customIconLibrary = merged;
            await host.saveData(CUSTOM_ICON_LIBRARY_NAME, host.customIconLibrary);
            showMessage(t("msg.iconImported", {n: added}));
            host.render();
        } catch (error) { showMessage(t("msg.iconImportFail", {error: String(error instanceof Error ? error.message : error)})); }
    });
    let previousKind = getKind();
    const bindUnitOptions = () => {
        root.querySelectorAll<HTMLButtonElement>("[data-unit]").forEach((button) => button.addEventListener("click", () => {
            const nextUnit = button.dataset.unit || "";
            const previousUnit = unitInput?.value || "";
            if (targetInput && getKind() === "duration" && previousUnit !== nextUnit) {
                const currentTarget = Number(targetInput.value);
                if (Number.isFinite(currentTarget) && previousUnit === "分钟" && nextUnit === "小时") targetInput.value = formatNumber(currentTarget / 60);
                if (Number.isFinite(currentTarget) && previousUnit === "小时" && nextUnit === "分钟") targetInput.value = formatNumber(currentTarget * 60);
                const currentRecordStep = Number(recordStepInput?.value);
                if (recordStepInput && Number.isFinite(currentRecordStep) && previousUnit === "分钟" && nextUnit === "小时") recordStepInput.value = formatNumber(currentRecordStep / 60);
                if (recordStepInput && Number.isFinite(currentRecordStep) && previousUnit === "小时" && nextUnit === "分钟") recordStepInput.value = formatNumber(currentRecordStep * 60);
            }
            if (unitInput) unitInput.value = nextUnit;
            root.querySelectorAll<HTMLButtonElement>("[data-unit]").forEach((candidate) => {
                const selected = candidate.dataset.unit === nextUnit;
                candidate.classList.toggle("is-selected", selected);
                candidate.setAttribute("aria-pressed", String(selected));
            });
            unitInput?.dispatchEvent(new Event("change", {bubbles: true}));
        }));
    };
    const updateConditionalFields = (useKindDefault = false) => {
        const kind = getKind();
        const kindOption = KIND_OPTIONS.find((option) => option.kind === kind) || KIND_OPTIONS[0];
        const oldDefaultUnit = KIND_OPTIONS.find((option) => option.kind === previousKind)?.defaultUnit;
        if (unitInput && useKindDefault && (!unitInput.value.trim() || unitInput.value === oldDefaultUnit)) {
            unitInput.value = kindOption.defaultUnit;
        }
        const valueFields = root.querySelector<HTMLElement>("[data-value-fields]");
        const weekdays = root.querySelector<HTMLElement>("[data-weekdays]");
        const intervalSchedule = root.querySelector<HTMLElement>("[data-interval-schedule]");
        const quotaSchedule = root.querySelector<HTMLElement>("[data-quota-schedule]");
        if (valueFields) {
            valueFields.hidden = kind === "binary";
        }
        if (weekdays) {
            weekdays.hidden = scheduleSelect?.value !== "weekly" && scheduleSelect?.value !== "custom";
            if (!weekdays.hidden && !weekdays.querySelector<HTMLInputElement>("input[name='weekday']:checked")) {
                const today = (new Date().getDay() + 6) % 7;
                const fallback = weekdays.querySelector<HTMLInputElement>(`input[name='weekday'][value='${today}']`);
                if (fallback) fallback.checked = true;
            }
        }
        if (intervalSchedule) intervalSchedule.hidden = scheduleSelect?.value !== "interval";
        if (quotaSchedule) quotaSchedule.hidden = scheduleSelect?.value !== "quota";
        if (directionField) directionField.hidden = scheduleSelect?.value !== "daily";
        const quotaMode = root.querySelector<HTMLSelectElement>("select[name='quotaCountMode']")?.value || "dates";
        const quotaAmount = root.querySelector<HTMLInputElement>("input[name='quotaAmount']");
        const quotaAmountLabel = root.querySelector<HTMLElement>("[data-quota-amount-label]");
        const quotaHelp = root.querySelector<HTMLElement>("[data-quota-help]");
        if (quotaAmount) {
            quotaAmount.min = quotaMode === "dates" ? "1" : String(getEditorStep(kind, unitInput?.value || kindOption.defaultUnit));
            quotaAmount.step = quotaMode === "dates" ? "1" : String(getEditorStep(kind, unitInput?.value || kindOption.defaultUnit));
        }
        if (quotaAmountLabel) quotaAmountLabel.textContent = quotaMode === "dates" ? "周期天数" : `周期${getTargetLabel(kind).replace(/^目标/, "")}`;
        if (quotaHelp) quotaHelp.textContent = quotaMode === "dates" ? "同一自然日多次记录只计 1 天，适合“每周运动 3 天”。" : "按当前单位累加周期内记录值，适合“每月阅读 600 分钟”。";
        const help = root.querySelector<HTMLElement>("[data-kind-help]");
        if (help) help.textContent = t(`kindDesc.${kind}`);
        const targetLabel = root.querySelector<HTMLElement>("[data-target-label]");
        if (targetLabel) targetLabel.textContent = getTargetLabel(kind);
        if (targetInput) {
            const step = getRecordStepInputStep(kind, unitInput?.value || kindOption.defaultUnit);
            targetInput.min = String(step);
            targetInput.step = String(step);
            const current = Number(targetInput.value);
            if (!Number.isFinite(current) || current < step) {
                targetInput.value = String(step);
            } else {
                const aligned = Math.ceil(current / step - 1e-9) * step;
                const precision = step < 1 ? 2 : 6;
                targetInput.value = String(Number(aligned.toFixed(precision)));
            }
        }
        const recordStepField = root.querySelector<HTMLElement>("[data-record-step-field]");
        if (recordStepField) recordStepField.hidden = kind === "binary";
        if (recordStepInput && kind !== "binary") {
            const step = getEditorStep(kind, unitInput?.value || kindOption.defaultUnit);
            recordStepInput.min = String(step);
            recordStepInput.step = String(step);
            if (useKindDefault || !Number.isFinite(Number(recordStepInput.value)) || Number(recordStepInput.value) <= 0) {
                recordStepInput.value = String(getRecordStep(kind, unitInput?.value || kindOption.defaultUnit));
            }
        }
        if (unitInput) {
            unitInput.placeholder = kindOption.defaultUnit;
        }
        const unitOptions = root.querySelector<HTMLElement>("[data-unit-options]");
        if (unitOptions) {
            const selectedUnitValue = unitInput?.value || kindOption.defaultUnit;
            unitOptions.innerHTML = kindOption.units.map((unit) => `<button type="button" data-unit="${escapeHtml(unit)}" aria-pressed="${selectedUnitValue === unit ? "true" : "false"}" class="${selectedUnitValue === unit ? "is-selected" : ""}">${escapeHtml(unit)}</button>`).join("");
            bindUnitOptions();
        }
        previousKind = kind;
        updateEditorPreview();
    };
    root.querySelectorAll<HTMLInputElement>("input[name='kind']").forEach((input) => input.addEventListener("change", () => {
        updateConditionalFields(true);
        ensureEditorVisible(input.closest<HTMLElement>(".lc-checkin__kind-option"));
    }));
    scheduleSelect?.addEventListener("change", () => updateConditionalFields(false));
    unitInput?.addEventListener("change", () => updateConditionalFields(false));
    root.querySelector<HTMLInputElement>("input[name='name']")?.addEventListener("input", updateEditorPreview);
    root.querySelector<HTMLInputElement>("input[name='target']")?.addEventListener("input", updateEditorPreview);
    recordStepInput?.addEventListener("input", updateEditorPreview);
    root.querySelector<HTMLInputElement>("input[name='intervalDays']")?.addEventListener("input", updateEditorPreview);
    root.querySelector<HTMLInputElement>("input[name='quotaAmount']")?.addEventListener("input", updateEditorPreview);
    root.querySelector<HTMLSelectElement>("select[name='quotaCountMode']")?.addEventListener("change", () => updateConditionalFields(false));
    root.querySelector<HTMLSelectElement>("select[name='quotaPeriod']")?.addEventListener("change", updateEditorPreview);
    root.querySelector<HTMLElement>("[data-action='anchor-today']")?.addEventListener("click", () => {
        const anchor = root.querySelector<HTMLInputElement>("input[name='anchorDate']");
        if (!anchor) return;
        anchor.value = dateKey(new Date());
        anchor.dispatchEvent(new Event("change", {bubbles: true}));
        updateAdvancedSummary();
        ensureEditorVisible(anchor);
    });
    bindUnitOptions();
    root.querySelectorAll<HTMLButtonElement>("[data-group-value]").forEach((button) => button.addEventListener("click", () => {
        const input = root.querySelector<HTMLInputElement>("input[name='group']");
        if (input) input.value = button.dataset.groupValue || "";
        updateAdvancedSummary();
    }));
    const templateQuery = root.querySelector<HTMLInputElement>("[data-template-query]");
    let activeTemplateGroup = "all";
    let templateOverflowRevealed = false;
    const collapseTemplateDisclosure = () => {
        const disclosure = root.querySelector<HTMLDetailsElement>("[data-template-disclosure]");
        if (disclosure) disclosure.open = false;
    };
    const applyTemplateFilter = () => {
        const query = templateQuery?.value || "";
        const hasQuery = Boolean(query.trim());
        const filtered = hasQuery || activeTemplateGroup !== "all";
        let matchCount = 0;
        root.querySelectorAll<HTMLButtonElement>("[data-template-list] [data-template-index]").forEach((button) => {
            const matches = (activeTemplateGroup === "all" || button.dataset.templateGroupValue === activeTemplateGroup)
                && (!hasQuery || matchesSearch(button.dataset.templateSearchText || "", query));
            if (matches) matchCount += 1;
            /* T-1349：未展开全量时超出首批的模板保持隐藏；搜索/分组筛选态自动全显。 */
            button.hidden = !matches || (!templateOverflowRevealed && !filtered && button.hasAttribute("data-template-overflow"));
        });
        const count = root.querySelector<HTMLElement>("[data-template-count]");
        if (count) count.textContent = t("editor.templateCount", {n: matchCount});
        root.querySelector<HTMLElement>("[data-template-empty]")?.toggleAttribute("hidden", matchCount > 0);
        root.querySelector<HTMLButtonElement>("[data-action='clear-template-query']")?.toggleAttribute("hidden", !hasQuery);
        root.querySelector<HTMLButtonElement>("[data-action='clear-template-filter']")?.toggleAttribute("hidden", !filtered);
        const expander = root.querySelector<HTMLButtonElement>("[data-action='template-show-all']");
        if (expander) expander.hidden = templateOverflowRevealed || filtered;
    };
    /* T-1349：「显示全部」展开超出首批的模板；会话内保持展开，不写入偏好。 */
    root.querySelector<HTMLButtonElement>("[data-action='template-show-all']")?.addEventListener("click", () => {
        templateOverflowRevealed = true;
        applyTemplateFilter();
        root.querySelector<HTMLButtonElement>("[data-template-list] [data-template-overflow]:not([hidden])")?.focus();
    });
    /* T-1349：套用后把模板芯片提升到「最近使用」行；芯片缺失时惰性建行，克隆芯片经委托自动获得同一处理。 */
    const refreshRecentTemplates = (button: HTMLButtonElement) => {
        const list = root.querySelector<HTMLElement>("[data-template-list]");
        const browser = list?.parentElement;
        if (!browser) return;
        let heading = browser.querySelector<HTMLElement>("[data-template-recent-heading]");
        let row = browser.querySelector<HTMLElement>("[data-template-recent]");
        if (!heading || !row) {
            browser.insertAdjacentHTML("afterbegin", `<div class="lc-checkin__field-heading" data-template-recent-heading><span>${t("editor.recentTemplates")}</span></div><div class="lc-checkin__templates" data-template-recent></div>`);
            heading = browser.querySelector<HTMLElement>("[data-template-recent-heading]");
            row = browser.querySelector<HTMLElement>("[data-template-recent]");
        }
        if (!heading || !row) return;
        const index = button.dataset.templateIndex || "";
        const existing = index ? row.querySelector<HTMLButtonElement>(`[data-template-index='${index}']`) : null;
        if (existing) {
            row.insertBefore(existing, row.firstChild);
            return;
        }
        const clone = button.cloneNode(true) as HTMLButtonElement;
        clone.removeAttribute("hidden");
        clone.removeAttribute("data-template-overflow");
        clone.setAttribute("aria-pressed", "false");
        row.insertBefore(clone, row.firstChild);
        while (row.children.length > RECENT_TEMPLATES_LIMIT) row.lastElementChild?.remove();
    };
    templateQuery?.addEventListener("input", applyTemplateFilter);
    root.querySelectorAll<HTMLButtonElement>("[data-template-group]").forEach((button) => button.addEventListener("click", () => {
        activeTemplateGroup = button.dataset.templateGroup || "all";
        root.querySelectorAll<HTMLButtonElement>("[data-template-group]").forEach((candidate) => {
            const selected = candidate.dataset.templateGroup === activeTemplateGroup;
            candidate.setAttribute("aria-pressed", String(selected));
            candidate.classList.toggle("is-selected", selected);
        });
        applyTemplateFilter();
    }));
    root.querySelectorAll<HTMLElement>("[data-action='clear-template-query']").forEach((button) => button.addEventListener("click", () => {
        if (templateQuery) {
            templateQuery.value = "";
            templateQuery.focus();
        }
        applyTemplateFilter();
    }));
    root.querySelectorAll<HTMLElement>("[data-action='clear-template-filter']").forEach((button) => button.addEventListener("click", () => {
        activeTemplateGroup = "all";
        if (templateQuery) templateQuery.value = "";
        root.querySelectorAll<HTMLButtonElement>("[data-template-group]").forEach((candidate) => {
            const selected = candidate.dataset.templateGroup === "all";
            candidate.setAttribute("aria-pressed", String(selected));
            candidate.classList.toggle("is-selected", selected);
        });
        applyTemplateFilter();
        templateQuery?.focus();
    }));
    /* T-1349：委托绑定——「最近使用」克隆芯片无需重新绑定即可复用同一套用流程。 */
    root.addEventListener("click", (event) => {
        const button = event.target instanceof HTMLElement ? event.target.closest<HTMLButtonElement>("[data-template-index]") : null;
        if (!button) return;
        const template = CHECKIN_TEMPLATES[Number(button.dataset.templateIndex)];
        if (!template) return;
        root.querySelectorAll<HTMLButtonElement>("[data-template-index]").forEach((candidate) => {
            const selected = candidate === button;
            candidate.classList.toggle("is-selected", selected);
            candidate.setAttribute("aria-pressed", String(selected));
        });
        const setInput = (name: string, value: string) => {
            const control = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`);
            if (control) control.value = value;
        };
        setInput("name", templateName(template));
        setInput("target", String(template.target));
        setInput("unit", template.unit);
        setInput("recordStep", String(getRecordStep(template.kind, template.unit, template.recordStep)));
        setInput("group", template.group);
        setInput("priority", template.priority);
        setInput("timeSlot", template.timeSlot || "any");
        setInput("completionSource", template.completionSource || "manual");
        setInput("tomatoMode", template.tomatoMode || "minutes");
        setInput("schedule", template.schedule.type);
        /* T-1239：戒除类模板同步方向开关。 */
        const atMostInput = root.querySelector<HTMLInputElement>("input[name='directionAtMost']");
        if (atMostInput) atMostInput.checked = template.direction === "atMost";
        const kindInput = root.querySelector<HTMLInputElement>(`input[name='kind'][value='${template.kind}']`);
        if (kindInput) kindInput.checked = true;
        root.querySelectorAll<HTMLInputElement>("input[name='weekday']").forEach((input) => {
            input.checked = (template.schedule.weekdays || []).includes(Number(input.value));
        });
        selectIcon(template.icon);
        const iconGroup = ICON_GROUPS.find((group) => group.icons.includes(template.icon));
        if (iconGroup) selectIconGroup(iconGroup.id);
        updateConditionalFields(false);
        root.querySelector<HTMLElement>("[data-tomato-mode-field]")?.toggleAttribute("hidden", template.completionSource !== "tomato");
        root.querySelector<HTMLElement>("[data-tomato-help]")?.toggleAttribute("hidden", template.completionSource !== "tomato");
        updateEditorPreview();
        updateAdvancedSummary();
        const advanced = root.querySelector<HTMLDetailsElement>("[data-advanced]");
        if (advanced) advanced.open = true;
        host.recordRecentTemplateUse(template.name);
        refreshRecentTemplates(button);
        collapseTemplateDisclosure();
        ensureEditorVisible(root.querySelector<HTMLInputElement>("input[name='name']"));
        root.querySelector<HTMLInputElement>("input[name='name']")?.focus();
    });
    root.querySelectorAll<HTMLButtonElement>("[data-user-template-id]").forEach((button) => button.addEventListener("click", () => {
        const template = host.userTemplates.find((candidate) => candidate.id === button.dataset.userTemplateId);
        if (!template) return;
        const setInput = (name: string, value: string) => {
            const control = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`);
            if (control) control.value = value;
        };
        setInput("name", templateName(template)); setInput("target", String(template.target)); setInput("unit", template.unit); setInput("recordStep", String(getRecordStep(template.kind, template.unit, template.recordStep))); setInput("group", template.group); setInput("priority", template.priority); setInput("timeSlot", template.timeSlot || "any"); setInput("completionSource", template.completionSource || "manual"); setInput("tomatoMode", template.tomatoMode || "minutes"); setInput("schedule", template.schedule.type);
        const kindInput = root.querySelector<HTMLInputElement>(`input[name='kind'][value='${template.kind}']`); if (kindInput) kindInput.checked = true;
        root.querySelectorAll<HTMLInputElement>("input[name='weekday']").forEach((input) => { input.checked = (template.schedule.weekdays || []).includes(Number(input.value)); });
        selectIcon(template.icon); updateConditionalFields(false); root.querySelector<HTMLElement>("[data-tomato-mode-field]")?.toggleAttribute("hidden", template.completionSource !== "tomato"); root.querySelector<HTMLElement>("[data-tomato-help]")?.toggleAttribute("hidden", template.completionSource !== "tomato"); updateEditorPreview(); updateAdvancedSummary();
        collapseTemplateDisclosure();
        ensureEditorVisible(root.querySelector<HTMLInputElement>("input[name='name']"));
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-user-template-delete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.userTemplateDelete;
        const template = host.userTemplates.find((candidate) => candidate.id === id);
        if (!id || !template || !window.confirm(t("msg.templateDeleteConfirm", {name: template.name}))) return;
        const nextTemplates = deleteUserTemplate(host.userTemplates, id);
        void host.saveData(USER_TEMPLATES_NAME, nextTemplates).then(() => {
            host.userTemplates = nextTemplates;
            showMessage(t("msg.templateDeleted"));
            host.render();
        }).catch(() => showMessage(t("msg.templateDeleteFail")));
    }));
    root.querySelector<HTMLButtonElement>("[data-action='save-template']")?.addEventListener("click", () => {
        const form = root.querySelector<HTMLFormElement>("form");
        if (!form) return;
        const data = new FormData(form);
        const name = String(data.get("name") || "").trim();
        const kind = String(data.get("kind") || "binary") as CheckinKind;
        const scheduleType = String(data.get("schedule") || "daily") as ScheduleType;
        const target = kind === "binary" ? 1 : Number(data.get("target"));
        const unit = kind === "binary" ? "次" : String(data.get("unit") || "").trim();
        const recordStep = normalizeRecordStep(kind, data.get("recordStep"));
        const validation = validateEditorInput({name, kind, target, unit, schedule: scheduleType, weekdays: data.getAll("weekday").map(Number), quotaAmount: Number(data.get("quotaAmount"))});
        if (!validation.valid) {
            showMessage(`[小驴打卡] ${validation.errors.name || validation.errors.target || validation.errors.unit || validation.errors.schedule || t("msg.formInvalid")}`);
            return;
        }
        const existing = host.userTemplates.find((template) => template.name === name);
        const weekdays = data.getAll("weekday").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
        const intervalDays = Math.max(1, Math.min(3650, Math.round(Number(data.get("intervalDays")) || 1)));
        const anchorDate = String(data.get("anchorDate") || dateKey(currentCalendarDate()));
        const quotaPeriod = data.get("quotaPeriod") === "month" ? "month" : "week";
        const quotaCountMode = data.get("quotaCountMode") === "value" ? "value" : "dates";
        const quotaAmount = Math.max(quotaCountMode === "dates" ? 1 : 0.1, Number(data.get("quotaAmount")) || 1);
        const schedule: CheckinSchedule = scheduleType === "interval"
            ? {type: "interval", intervalDays, anchorDate}
            : scheduleType === "quota"
                ? {type: "quota", quota: {period: quotaPeriod, amount: quotaAmount, countMode: quotaCountMode, ...(quotaPeriod === "week" ? {weekStartsOn: 1 as const} : {})}}
                : {type: scheduleType, weekdays: scheduleType === "weekly" || scheduleType === "custom" ? weekdays : undefined};
        const now = new Date().toISOString();
        const template: UserTemplate = {
            id: existing?.id || makeId("template"), name, icon: String(data.get("icon") || "✓"), kind,
            target: kind === "binary" ? 1 : Math.max(0.1, target || 1), unit: unit || "次",
            ...(recordStep ? {recordStep} : {}),
            schedule, group: String(data.get("group") || "").trim(),
            priority: normalizePriorityInput(data.get("priority")), timeSlot: normalizeTimeSlotInput(data.get("timeSlot")), completionSource: data.get("completionSource") === "tomato" ? "tomato" : "manual", tomatoMode: data.get("tomatoMode") === "sessions" ? "sessions" : "minutes", note: "来自编辑器保存", createdAt: existing?.createdAt || now, updatedAt: now,
        };
        host.userTemplates = upsertUserTemplate(host.userTemplates, template);
        void host.saveData(USER_TEMPLATES_NAME, host.userTemplates).then(() => { showMessage(t("msg.templateSaved")); host.render(); }).catch(() => {
            showMessage(t("msg.templateSaveFail"));
        });
    });
    const updateAdvancedSummary = () => {
        const group = root.querySelector<HTMLInputElement>("input[name='group']")?.value.trim() || t("review.ungrouped");
        const priority = normalizePriorityInput(root.querySelector<HTMLSelectElement>("select[name='priority']")?.value || null);
        const timeSlot = normalizeTimeSlotInput(root.querySelector<HTMLSelectElement>("select[name='timeSlot']")?.value || null);
        const linkedToTomato = root.querySelector<HTMLSelectElement>("select[name='completionSource']")?.value === "tomato";
        const completionSource = linkedToTomato ? `番茄钟·${root.querySelector<HTMLSelectElement>("select[name='tomatoMode']")?.value === "sessions" ? "次数" : "分钟"}` : "手动记录";
        const schedule = root.querySelector<HTMLSelectElement>("select[name='schedule']")?.value as ScheduleType || "daily";
        const interval = Number(root.querySelector<HTMLInputElement>("input[name='intervalDays']")?.value || 1);
        const scheduleLabel = schedule === "interval" ? t("schedule.intervalN", {n: Math.max(1, Math.round(interval))}) : t(SCHEDULE_LABELS[schedule]);
        const pieces = [group, t(PRIORITY_LABELS[priority]), timeSlot === "any" ? "" : t(TIME_SLOT_LABELS[timeSlot]), completionSource, scheduleLabel].filter(Boolean);
        root.querySelector<HTMLElement>("[data-advanced-summary]")?.replaceChildren(document.createTextNode(pieces.join(" · ")));
    };
    const updateTomatoFields = () => {
        const linked = root.querySelector<HTMLSelectElement>("select[name='completionSource']")?.value === "tomato";
        root.querySelector<HTMLElement>("[data-tomato-mode-field]")?.toggleAttribute("hidden", !linked);
        root.querySelector<HTMLElement>("[data-tomato-help]")?.toggleAttribute("hidden", !linked);
        updateAdvancedSummary();
        updateEditorPreview();
    };
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".lc-checkin__advanced input, .lc-checkin__advanced select").forEach((control) => control.addEventListener("input", updateAdvancedSummary));
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".lc-checkin__advanced input, .lc-checkin__advanced select").forEach((control) => control.addEventListener("change", updateAdvancedSummary));
    root.querySelector<HTMLSelectElement>("select[name='completionSource']")?.addEventListener("change", updateTomatoFields);
    root.querySelector<HTMLInputElement>("input[name='directionAtMost']")?.addEventListener("change", updateEditorPreview);
    root.querySelector<HTMLSelectElement>("select[name='tomatoMode']")?.addEventListener("change", updateAdvancedSummary);
    updateConditionalFields();
    updateAnchorInputState();
    updateEditorPreview();
    applyIconFilter();
    applyTemplateFilter();
    updateTomatoFields();
    updateAdvancedSummary();
    root.querySelector<HTMLFormElement>("form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        form.dataset.submitBound = "true";
        if (form.dataset.submitting === "true") return;
        form.dataset.submitting = "true";
        const data = new FormData(form);
        const editingId = host.editingId;
        const submittedAt = captureActionMoment();
        const expectedFingerprint = editingId ? host.editingFingerprint : undefined;
        const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
        if (submitButton) submitButton.disabled = true;
        const resetSubmitting = () => {
            form.dataset.submitting = "false";
            if (submitButton) submitButton.disabled = false;
        };
        void host.enqueueMutation(() => host.saveForm(data, editingId, submittedAt, expectedFingerprint)).then(resetSubmitting, resetSubmitting);
    });

    /* T-1359：智能体项目草案预填——存在待检查草案时套用到新建表单，
       用户在编辑器内检查/修改后手动保存；预填不写 store，检查后即清除。 */
    const draft = host.pendingProjectDraft;
    if (draft) {
        host.clearPendingProjectDraft();
        const setInput = (name: string, value: string) => {
            const control = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`);
            if (control) control.value = value;
        };
        setInput("name", draft.name);
        setInput("target", String(draft.target));
        setInput("unit", draft.unit);
        setInput("recordStep", String(getRecordStep(draft.kind, draft.unit)));
        setInput("group", draft.group);
        setInput("priority", draft.priority);
        setInput("timeSlot", draft.timeSlot);
        setInput("completionSource", "manual");
        setInput("tomatoMode", "minutes");
        setInput("schedule", draft.schedule.type);
        if (draft.schedule.quota) {
            setInput("quotaAmount", String(draft.schedule.quota.amount));
            setInput("quotaPeriod", draft.schedule.quota.period);
            setInput("quotaCountMode", draft.schedule.quota.countMode);
        }
        if (draft.schedule.intervalDays) setInput("intervalDays", String(draft.schedule.intervalDays));
        const atMostInput = root.querySelector<HTMLInputElement>("input[name='directionAtMost']");
        if (atMostInput) atMostInput.checked = false;
        const kindInput = root.querySelector<HTMLInputElement>(`input[name='kind'][value='${draft.kind}']`);
        if (kindInput) kindInput.checked = true;
        root.querySelectorAll<HTMLInputElement>("input[name='weekday']").forEach((input) => {
            input.checked = (draft.schedule.weekdays || []).includes(Number(input.value));
        });
        selectIcon(draft.icon);
        updateConditionalFields(false);
        updateEditorPreview();
        updateAdvancedSummary();
        ensureEditorVisible(root.querySelector<HTMLInputElement>("input[name='name']"));
        root.querySelector<HTMLInputElement>("input[name='name']")?.focus();
    }
}
