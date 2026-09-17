/* 页面导航与回顾/归档控件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindPageNavigationHost 结构化接口声明。 */
import {t} from "../i18n";
import {buildWeeklyReportMarkdown} from "../features/report";
import {buildCustomSummaryContext, buildSummaryContext} from "../analytics";
import {getActiveItemById, getEventById, getItemById, removeEvents, updateEventNote} from "../model";
import {captureActionMoment} from "../shared";
import {renderAnalysisDiffPanel} from "./analysis-diff";
import {Dialog, showMessage} from "siyuan";

export interface BindPageNavigationHost {
    store: import("../types").CheckinStore;
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";
    insightsItemId?: string;
    insightsReturnPage: "today" | "review";
    historyQuery: string;
    historySource: "all" | "manual" | "tomato" | "import" | "api";
    historyOrder: "newest" | "oldest";
    selectedHistoryDate: string;
    archivedQuery: string;
    summaryRange: "day" | "week" | "month";
    summaryCustomRange?: {startDate: string; endDate: string};
    summaryText?: string;
    suggestionWorkflow?: import("../features/suggestion-workflow").SuggestionWorkflowState;
    handleSuggestionDecision(decision: "confirm" | "cancel"): Promise<void> | void;
    undoSuggestionWorkflow(): Promise<void> | void;
    persistSuggestionWorkflow(): Promise<void> | void;
    summaryRefreshing: boolean;
    analysisHistory: import("../agent-suggestions").AgentAnalysisSnapshot[];
    summaryRequestId: number;
    editingHistoryNoteId?: string;
    disposed: boolean;
    disposing: boolean;
    bindDialogClose(root: HTMLElement): void;
    bindMobileNav(root: HTMLElement): void;
    showReview(): void;
    showToday(): void;
    showArchived(): void;
    showOccasions(): void;
    showInsights(item?: import("../types").CheckinItem): void;
    render(): void;
    persistViewPreferences(): Promise<void>;
    reviewFoldSections: Set<string>;
    reviewFoldTouched: boolean;
    changeHistoryMonth(offset: number): void;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    persist(): Promise<void>;
    invalidateSummary(): void;
    broadcast(event: unknown): void;
    renderBackgroundUpdate(): void;
    restoreItem(itemId: string): Promise<void>;
    deleteArchivedItem(itemId: string): Promise<boolean> | void;
    generateSummary(): Promise<void> | void;
    downloadExport(format: "json" | "csv"): void;
    reminderFilter: import("../reminders").ReminderFilter;
    reminderUserAction(id: string, action: "snooze" | "skip" | "restore"): void;
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean): Promise<boolean>;
}

const pinnedSubnavScrollers = new WeakSet<HTMLElement>();

/** 回顾二级导航滚动钉住（D-159）：宿主界面缩放形成 zoom 子树后，合成器滚动
    不会重定位 position:sticky（Chromium 已知缺陷，真机实测滚动后导航条消失）。
    导航条因此保持 relative 布局，由滚动同步用 transform 主动钉在滚动区顶部，
    缩放与非缩放环境行为一致。返回同步函数供跳转点击在 scrollIntoView 后
    显式调用（其滚动事件可能不触发本监听）。 */
function pinReviewSubnavRail(root: HTMLElement, host: BindPageNavigationHost): () => void {
    const subnav = root.querySelector<HTMLElement>(".lc-checkin__review-subnav");
    const scroller = subnav?.closest<HTMLElement>(".lc-checkin");
    const sync = () => {
        if (host.disposed || host.disposing || !subnav || !subnav.isConnected || !scroller) return;
        subnav.style.transform = "";
        const anchor = subnav.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        const offset = scroller.scrollTop - anchor;
        if (offset > 0.5) subnav.style.transform = `translateY(${offset}px)`;
    };
    if (!subnav || !scroller) return sync;
    sync();
    if (!pinnedSubnavScrollers.has(scroller)) {
        pinnedSubnavScrollers.add(scroller);
        scroller.addEventListener("scroll", sync, {passive: true});
    }
    return sync;
}

export function bindPageNavigationHandlers(root: HTMLElement, host: BindPageNavigationHost): void {
    host.bindDialogClose(root);
    host.bindMobileNav(root);
    /* 回顾页折叠状态持久化（T-117）：与今日页 data-review-fold 绑定一致。 */
    root.querySelectorAll<HTMLDetailsElement>("details[data-review-fold]").forEach((details) => details.addEventListener("toggle", () => {
        const id = details.dataset.reviewFold || "";
        if (details.open) host.reviewFoldSections.add(id);
        else host.reviewFoldSections.delete(id);
        host.reviewFoldTouched = true;
        void host.persistViewPreferences();
    }));
    /* 逾期历史「展开全部」（T-117）：解除折叠容器的 hidden 并移除按钮。 */
    root.querySelector<HTMLElement>("[data-overdue-expand]")?.addEventListener("click", (event) => {
        (event.currentTarget as HTMLElement).remove();
        root.querySelector<HTMLElement>("[data-overdue-more]")?.removeAttribute("hidden");
    });
    /* 逾期历史一键补记（T-101）：把该次逾期标记为已完成，历史随之消掉。
       补记成功弹 6 秒可撤销提示条（T-110），撤销即回滚该次标记。 */
    const showCatchUpToast = (name: string, occasionId: string, date: string) => {
        const surface = root.querySelector<HTMLElement>(".lc-checkin");
        if (!surface) return;
        surface.querySelector(".lc-checkin__catchup-toast")?.remove();
        const toast = document.createElement("div");
        toast.className = "lc-checkin__catchup-toast";
        const label = document.createElement("span");
        label.textContent = t("review.catchUpDone", {name, date});
        const undoButton = document.createElement("button");
        undoButton.type = "button";
        undoButton.className = "lc-checkin__small-button";
        undoButton.textContent = t("review.undo");
        undoButton.addEventListener("click", () => { toast.remove(); void host.setOccasionCompleted(occasionId, date, false); });
        toast.append(label, undoButton);
        surface.appendChild(toast);
        window.setTimeout(() => toast.remove(), 6000);
    };
    root.querySelectorAll<HTMLButtonElement>("[data-occasion-complete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionId || "";
        const occurrenceDate = button.dataset.occasionDate || "";
        if (!id || !occurrenceDate) return;
        button.disabled = true;
        const name = button.closest<HTMLElement>("[data-overdue-occasion]")?.querySelector("strong")?.textContent || "";
        void host.setOccasionCompleted(id, occurrenceDate, true).then((ok) => {
            if (ok) showCatchUpToast(name, id, occurrenceDate);
        }).finally(() => { button.disabled = false; });
    }));
    root.querySelector<HTMLSelectElement>("[data-insight-item]")?.addEventListener("change", (event) => {
        const itemId = (event.currentTarget as HTMLSelectElement).value;
        if (!host.store.items.some((item) => item.id === itemId && !item.archived)) return;
        host.insightsItemId = itemId;
        void host.persistViewPreferences();
        host.render();
    });
    root.querySelector<HTMLSelectElement>("[data-reminder-filter]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "all" || value === "overdue" || value === "today" || value === "upcoming" || value === "completed") {
            host.reminderFilter = value;
            host.render();
        }
    });
    /* 11.0-C 提醒延期/跳过/恢复：动作交回宿主（持久化 + 重渲染），按钮本身无状态。 */
    root.querySelectorAll<HTMLButtonElement>("[data-reminder-action]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.reminderId || "";
        const action = button.dataset.reminderAction;
        if (!id || (action !== "snooze" && action !== "skip" && action !== "restore")) return;
        host.reminderUserAction(id, action);
    }));
    root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => {
        if (host.currentPage === "insights" && host.insightsReturnPage === "review") host.showReview();
        else host.showToday();
    });
    root.querySelector<HTMLElement>("[data-action='archived']")?.addEventListener("click", () => host.showArchived());
    root.querySelector<HTMLElement>("[data-action='occasions']")?.addEventListener("click", () => host.showOccasions());
    root.querySelectorAll<HTMLElement>("[data-review-insights-id]").forEach((button) => button.addEventListener("click", () => {
        const item = getActiveItemById(host.store, button.dataset.reviewInsightsId);
        if (item) host.showInsights(item);
    }));
    /* 跳转按 fold id 定位：区块列表里混有年度热力图 details，按下标取会整体
       错位一位（真机实测"趋势"跳到提醒）。瞬时滚动确保钉住同步立即生效。 */
    /* 跳转按 fold id 定位：区块列表里混有年度热力图 details，按下标取会整体
       错位一位（真机实测"趋势"跳到提醒）。不用 scrollIntoView——其滚动落地
       是异步的，钉住同步会拿到旧位置（真机实测 transform 滞后 1058px）；
       这里同步直写 scroller.scrollTop，随后显式同步钉住。 */
    const syncSubnavPin = pinReviewSubnavRail(root, host);
    root.querySelectorAll<HTMLElement>("[data-review-jump]").forEach((button) => button.addEventListener("click", () => {
        const foldId = button.dataset.reviewJump || "";
        const target = root.querySelector<HTMLElement>(`.lc-checkin__review-sections > details[data-review-fold="${foldId}"]`);
        const scroller = target?.closest<HTMLElement>(".lc-checkin");
        if (!target || !scroller) return;
        if (target instanceof HTMLDetailsElement) target.open = true;
        const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        scroller.scrollTop = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - margin;
        syncSubnavPin();
    }));
    root.querySelectorAll<HTMLElement>("[data-history-insights-id]").forEach((button) => button.addEventListener("click", () => {
        const item = getActiveItemById(host.store, button.dataset.historyInsightsId);
        if (item) host.showInsights(item);
    }));
    const historySearch = root.querySelector<HTMLInputElement>("[data-history-search]");
    let historySearchTimer: number | undefined;
    historySearch?.addEventListener("input", () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        const value = historySearch.value;
        historySearchTimer = window.setTimeout(() => {
            if (host.disposed || host.disposing || host.currentPage !== "review") return;
            host.historyQuery = value;
            host.render();
            const nextSearch = root.querySelector<HTMLInputElement>("[data-history-search]");
            nextSearch?.focus();
            nextSearch?.setSelectionRange(value.length, value.length);
        }, 120);
    });
    root.querySelector<HTMLElement>("[data-action='clear-history-query']")?.addEventListener("click", () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        host.historyQuery = "";
        host.render();
        root.querySelector<HTMLInputElement>("[data-history-search]")?.focus();
    });
    root.querySelector<HTMLElement>("[data-action='clear-history-filters']")?.addEventListener("click", () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        host.historyQuery = "";
        host.historySource = "all";
        host.historyOrder = "newest";
        host.render();
        root.querySelector<HTMLInputElement>("[data-history-search]")?.focus();
    });
    root.querySelector<HTMLSelectElement>("[data-history-source]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "all" || value === "manual" || value === "tomato" || value === "import" || value === "api") {
            host.historySource = value;
            host.render();
            root.querySelector<HTMLSelectElement>("[data-history-source]")?.focus();
        }
    });
    root.querySelector<HTMLSelectElement>("[data-history-order]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "newest" || value === "oldest") {
            host.historyOrder = value;
            host.render();
            root.querySelector<HTMLSelectElement>("[data-history-order]")?.focus();
        }
    });
    root.querySelectorAll<HTMLElement>("[data-history-month]").forEach((button) => button.addEventListener("click", () => {
        host.changeHistoryMonth(Number(button.dataset.historyMonth));
    }));
    root.querySelectorAll<HTMLElement>("[data-history-date]").forEach((button) => button.addEventListener("click", () => {
        const value = button.dataset.historyDate;
        if (value) {
            host.selectedHistoryDate = value;
            host.render();
        }
    }));
    root.querySelectorAll<HTMLElement>("[data-history-event-id]").forEach((button) => button.addEventListener("click", () => {
        const eventId = button.dataset.historyEventId;
        const event = getEventById(host.store, eventId);
        if (!event) return;
        const moment = captureActionMoment();
        void host.enqueueMutation(async () => {
            const previous = host.store;
            const next = removeEvents(host.store, [event], moment.occurredAt);
            if (next === host.store) return;
            host.store = next;
            try { await host.persist(); } catch { host.store = previous; showMessage(t("msg.undoFail")); return; }
            host.invalidateSummary();
            host.broadcast({type: "event-deleted", item: getItemById(host.store, event.itemId), deletedEvents: [event]});
            host.renderBackgroundUpdate();
        });
    }));
    root.querySelector<HTMLElement>("[data-history-expand]")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const extra = root.querySelector<HTMLElement>("[data-history-extra]");
        if (!extra) return;
        extra.hidden = false;
        button.remove();
    });
    root.querySelector<HTMLElement>("[data-log-expand]")?.addEventListener("click", (event) => {
        root.querySelectorAll<HTMLElement>("[data-log-extra]").forEach((row) => row.hidden = false);
        (event.currentTarget as HTMLElement).remove();
    });
    root.querySelectorAll<HTMLElement>("[data-edit-history-event-id]").forEach((button) => button.addEventListener("click", () => {
        const event = getEventById(host.store, button.dataset.editHistoryEventId);
        if (!event) return;
        host.editingHistoryNoteId = event.id;
        host.render();
    }));
    root.querySelectorAll<HTMLElement>("[data-save-history-note-id]").forEach((button) => button.addEventListener("click", () => {
        const event = getEventById(host.store, button.dataset.saveHistoryNoteId);
        const input = root.querySelector<HTMLTextAreaElement>(`[data-history-note-input='${button.dataset.saveHistoryNoteId}']`);
        if (!event || !input) return;
        const note = input.value.trim();
        void host.enqueueMutation(async () => {
            const previous = host.store;
            const next = updateEventNote(host.store, event.id, note);
            if (next === host.store) return;
            host.store = next;
            try { await host.persist(); } catch { host.store = previous; showMessage(t("msg.noteSaveFail")); return; }
            host.invalidateSummary();
            host.editingHistoryNoteId = undefined;
            host.renderBackgroundUpdate();
        });
    }));
    const archivedSearch = root.querySelector<HTMLInputElement>("[data-archived-search]");
    let archivedSearchTimer: number | undefined;
    archivedSearch?.addEventListener("input", () => {
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        const value = archivedSearch.value;
        archivedSearchTimer = window.setTimeout(() => {
            if (host.disposed || host.disposing || host.currentPage !== "archived") return;
            host.archivedQuery = value;
            host.render();
            const nextSearch = root.querySelector<HTMLInputElement>("[data-archived-search]");
            nextSearch?.focus();
            nextSearch?.setSelectionRange(value.length, value.length);
        }, 120);
    });
    root.querySelector<HTMLElement>("[data-action='clear-archived-query']")?.addEventListener("click", () => {
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        host.archivedQuery = "";
        host.render();
        root.querySelector<HTMLInputElement>("[data-archived-search]")?.focus();
    });
    /* 归档搜索框内按 Esc = 清除筛选并回到列表（与清除按钮同一条路径）。 */
    archivedSearch?.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !archivedSearch.value) return;
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        host.archivedQuery = "";
        host.render();
        root.querySelector<HTMLInputElement>("[data-archived-search]")?.focus();
    });
    root.querySelectorAll<HTMLButtonElement>("[data-restore-id]").forEach((button) => button.addEventListener("click", () => {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        void host.restoreItem(button.dataset.restoreId || "");
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-archived-delete]").forEach((button) => button.addEventListener("click", () => {
        button.disabled = true;
        void host.deleteArchivedItem(button.dataset.archivedDelete || "");
    }));
    root.querySelectorAll<HTMLElement>("[data-summary-range]").forEach((button) => button.addEventListener("click", () => {
        const range = button.dataset.summaryRange;
        if (range === "day" || range === "week" || range === "month") {
            host.summaryRange = range;
            host.summaryCustomRange = undefined;
            host.summaryText = undefined;
            host.suggestionWorkflow = undefined;
            void host.persistSuggestionWorkflow();
            host.summaryRefreshing = false;
            host.summaryRequestId += 1;
            host.render();
        }
    }));
    root.querySelector<HTMLElement>("[data-action='generate-summary']")?.addEventListener("click", () => { if (!host.summaryRefreshing) void host.generateSummary(); });
    const suggestionBusyButtons = new WeakSet<HTMLElement>();
    const finishSuggestionButton = (button: HTMLElement) => {
        suggestionBusyButtons.delete(button);
        if (button.isConnected) {
            button.removeAttribute("aria-busy");
            button.removeAttribute("disabled");
        }
        root.querySelector<HTMLElement>("[data-suggestion-workflow] [data-suggestion-undo]:not([disabled])")?.focus();
    };
    root.querySelectorAll<HTMLElement>("[data-suggestion-decision]").forEach((button) => {
        button.addEventListener("click", () => {
            const decision = button.dataset.suggestionDecision;
            if (decision !== "confirm" && decision !== "cancel") return;
            if (suggestionBusyButtons.has(button)) return;
            suggestionBusyButtons.add(button);
            button.setAttribute("aria-busy", "true");
            button.setAttribute("disabled", "true");
            Promise.resolve().then(() => host.handleSuggestionDecision(decision)).finally(() => finishSuggestionButton(button)).catch(() => undefined);
        });
    });
    root.querySelector<HTMLElement>("[data-suggestion-undo]")?.addEventListener("click", () => {
        const button = root.querySelector<HTMLElement>("[data-suggestion-undo]");
        if (!button) return;
        if (suggestionBusyButtons.has(button)) return;
        suggestionBusyButtons.add(button);
        button.setAttribute("aria-busy", "true");
        button.setAttribute("disabled", "true");
        Promise.resolve().then(() => host.undoSuggestionWorkflow()).finally(() => finishSuggestionButton(button)).catch(() => undefined);
    });
    root.querySelector<HTMLElement>("[data-action='view-analysis-history']")?.addEventListener("click", () => {
        type HistoryRow = import("../agent-suggestions").AgentAnalysisSnapshot;
        const rows: HistoryRow[] = host.analysisHistory.filter((row) => row && typeof row.text === "string");
        const safe = (value: unknown) => String(value ?? "").replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c] || c));
        const sourceLabel = (source: HistoryRow["source"]) => t(source === "agent" ? "agent.historyAgent" : "agent.historyLocal");
        const rangeLabel = (range: HistoryRow["range"]) => range === "custom" ? t("review.custom") : t(`review.tab${range === "day" ? "Day" : range === "month" ? "Month" : "Week"}`);
        const list = rows.map((row, index) => `<li><strong>${t("agent.historyVersion", {n: index + 1})} · ${safe(row.asOf)}</strong><span>${safe(t("agent.historyMeta", {asOf: row.asOf, range: rangeLabel(row.range), source: sourceLabel(row.source), generatedAt: row.generatedAt}))}</span></li>`).join("");
        const baseIndex = Math.max(0, rows.length - 2);
        const targetIndex = Math.max(0, rows.length - 1);
        const options = rows.map((_, index) => `<option value="${index}" ${index === baseIndex ? "selected" : ""}>${t("agent.historyVersion", {n: index + 1})}</option>`).join("");
        const targetOptions = rows.map((_, index) => `<option value="${index}" ${index === targetIndex ? "selected" : ""}>${t("agent.historyVersion", {n: index + 1})}</option>`).join("");
        const canCompare = rows.length > 1;
        const dialog = new Dialog({title: t("agent.historyTitle"), content: `<div class="lc-checkin__agent-preview"><div class="lc-agent-compare-select"><label>${t("agent.historyBase")}<select data-analysis-base aria-label="${t("agent.historyBase")}" ${canCompare ? "" : "disabled"}>${options}</select></label><label>${t("agent.historyTarget")}<select data-analysis-target aria-label="${t("agent.historyTarget")}" ${canCompare ? "" : "disabled"}>${targetOptions}</select></label><button class="b3-button" type="button" data-analysis-swap aria-label="${t("agent.historySwap")}" ${canCompare ? "" : "disabled"}>${t("agent.historySwap")}</button><button class="b3-button" type="button" data-analysis-compare ${canCompare ? "" : "disabled"}>${t("agent.historyCompare")}</button></div><ul class="lc-agent-suggestion-changes">${list || `<li>${t("agent.historyEmpty")}</li>`}</ul><p data-analysis-compare-status aria-live="polite">${t("agent.historyReadOnly")}</p><div data-analysis-compare-result hidden></div></div>`});
        const base = dialog.element.querySelector<HTMLSelectElement>("[data-analysis-base]");
        const target = dialog.element.querySelector<HTMLSelectElement>("[data-analysis-target]");
        const status = dialog.element.querySelector<HTMLElement>("[data-analysis-compare-status]");
        const result = dialog.element.querySelector<HTMLElement>("[data-analysis-compare-result]");
        dialog.element.querySelector<HTMLElement>("[data-analysis-swap]")?.addEventListener("click", () => {
            if (base && target) [base.value, target.value] = [target.value, base.value];
        });
        dialog.element.querySelector<HTMLElement>("[data-analysis-compare]")?.addEventListener("click", () => {
            const baseIndex = Number(base?.value);
            const targetIndex = Number(target?.value);
            if (!status || !result) return;
            if (!Number.isInteger(baseIndex) || !Number.isInteger(targetIndex) || !rows[baseIndex] || !rows[targetIndex]) {
                status.textContent = t("agent.historyInvalid");
                result.hidden = true;
                return;
            }
            if (baseIndex === targetIndex) {
                status.textContent = t("agent.historySameVersion");
                result.hidden = true;
                return;
            }
            const left = rows[baseIndex];
            const right = rows[targetIndex];
            result.innerHTML = `<p class="lc-agent-compare-direction">${t("agent.historyDirection", {base: baseIndex + 1, target: targetIndex + 1})}</p><p class="lc-agent-compare-meta">${safe(t("agent.historyMeta", {asOf: left.asOf, range: rangeLabel(left.range), source: sourceLabel(left.source), generatedAt: left.generatedAt}))}<br />${safe(t("agent.historyMeta", {asOf: right.asOf, range: rangeLabel(right.range), source: sourceLabel(right.source), generatedAt: right.generatedAt}))}</p>${renderAnalysisDiffPanel(left.text || t("agent.historyNoText"), right.text || t("agent.historyNoText"))}`;
            result.hidden = false;
            status.textContent = t("agent.historyReady");
        });
    });
    root.querySelector<HTMLElement>("[data-action='preview-agent-suggestion']")?.addEventListener("click", (event) => { const button = event.currentTarget as HTMLElement; const item = button.dataset.suggestionItem; const rate = button.dataset.suggestionRate; const preview = new Dialog({title: t("agent.previewTitle"), content: `<div class="lc-checkin__agent-preview"><strong>${t("agent.previewDisclaimer")}</strong>${item ? `<p>${t("agent.previewFocus", {name: item || "", rate: rate || "0"})}</p><p>${t("agent.previewAdvice")}</p>` : `<p>${t("agent.previewNone")}</p>`}<p>${t("agent.previewSafety")}</p><div class="lc-checkin__agent-preview-actions"><button class="b3-button" type="button" data-agent-preview-close>${t("agent.previewDefer")}</button><button class="b3-button" type="button" disabled title="${t("agent.previewPendingTitle")}">${t("agent.previewPendingButton")}</button></div></div>`}); preview.element.querySelector<HTMLElement>("[data-agent-preview-close]")?.addEventListener("click", () => preview.destroy()); });
    root.querySelector<HTMLElement>("[data-action='copy-weekly-report']")?.addEventListener("click", async () => {
        const summary = host.summaryCustomRange ? buildCustomSummaryContext(host.store, host.summaryCustomRange) : buildSummaryContext(host.store, host.summaryRange);
        const label = host.summaryRange === "day" ? "今日报告" : host.summaryRange === "month" ? "本月报告" : "本周报告";
        const markdown = buildWeeklyReportMarkdown(summary, `${label}（${summary.startDate} ~ ${summary.endDate}）`);
        try {
            await navigator.clipboard.writeText(markdown);
            showMessage(t("msg.reportCopied"));
        } catch {
            showMessage(t("msg.clipboardFail"));
        }
    });
    root.querySelector<HTMLElement>("[data-action='export-csv']")?.addEventListener("click", () => host.downloadExport("csv"));
    root.querySelector<HTMLElement>("[data-action='export-json']")?.addEventListener("click", () => host.downloadExport("json"));
}
