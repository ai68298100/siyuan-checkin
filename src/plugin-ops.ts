/* 插件零散操作：从 index.ts 外置（T-022）。
   含后台渲染、今日快捷项、导航绑定、月份切换、项目恢复、导出、搜索聚焦、同步提示与就绪结算。 */
import {t} from "./i18n";
import {saveGeneratedFile} from "./download";
import {dateKey, getEventDateKey, isItemAvailableOnDate, isScheduledToday, normalizeItem as normalizeCheckinItem, makeId, serializeStoreAudit, serializeStoreSnapshotHistory, sortCheckinItems, type StoreAuditEntry} from "./model";
import {addDays} from "./date-keys";
import {getEventsInDateRange} from "./model";
import {serializeSuggestionAuditExport} from "./agent-suggestions";
import {serializeDiagnostics} from "./features/diagnostics";
import {serializeCsv, serializeJson, serializeJsonMigrationReport, type JsonMigrationReport} from "./export";
import {auditExportSensitiveFields, hasSensitiveContent} from "./features/privacy-scope";
import {serializeLoopCheckmarksCsv, serializeLoopHabitsCsv, type LoopImportPlan} from "./features/loop-csv";
import {buildObsidianExportFiles, obsidianExternalRef, obsidianHabitName, type ObsidianImportPlan} from "./features/obsidian-habits";
import {currentCalendarDate, captureActionMoment} from "./shared";
import {toggleQuickDialogFullscreenFor, type QuickDialogHost} from "./render/quick-dialog";
import {showMessage} from "siyuan";
import type {CheckinEvent, CheckinItem, CheckinStore} from "./types";
import {serializeDockTomatoDiagnostics, type DockTomatoProviderDiagnostics} from "./dock-tomato";

export interface PluginOpsHost {
    store: CheckinStore;
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";
    disposed: boolean;
    disposing: boolean;
    /** T-1445：今日页输入聚焦期间有被挂起的后台渲染，失焦后补渲染。 */
    pendingRenderAfterTyping?: boolean;
    /** T-1445：今日页输入聚焦检测（填写数值/备注输入框），由宿主实现。 */
    isTypingInTodayInput?(): boolean;
    dockElement?: HTMLElement;
    tabElement?: HTMLElement;
    quickDialogElement?: HTMLElement;
    quickDialog?: {element: HTMLElement} | undefined;
    quickDialogFullscreen: boolean;
    historyMonth: Date;
    selectedHistoryDate: string;
    syncNoticeTimer?: number;
    lastExportAt?: string;
    summaryRequestId: number;
    summaryText?: string;
    readyResolver?: (ready: boolean) => void;
    render(): void;
    renderInto(root: HTMLElement): void;
    renderBackgroundUpdate(): void;
    closeQuickDialog(): void;
    showToday(): void;
    showReview(): void;
    showInsights(item?: CheckinItem): void;
    showArchived(): void;
    showOccasions(): void;
    showSettings(): void;
    showEditor(item?: CheckinItem): void;
    persistViewPreferences(): Promise<void>;
    cloneStore(store?: CheckinStore): CheckinStore;
    itemFingerprint(item: CheckinItem): string;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    setItemArchived(itemId: string, archived: boolean, moment: {occurredAt: string; localDate: string}, expectedFingerprint?: string): Promise<boolean>;
}

export function renderBackgroundUpdateFor(host: PluginOpsHost): void {
    /* T-1445：今日页输入（填写数值/备注）聚焦期间挂起后台全量重渲染——
       整树重建会丢焦点导致输入法反复弹出（手机端不可输入）。
       数据已持久化，仅推迟视觉刷新；挂起时在当前输入框上登记一次性
       focusout 补渲染（T-1455：显式渲染通道不再被挂起，防止死锁）。 */
    if (host.currentPage === "today" && host.isTypingInTodayInput?.()) {
        const active = document.activeElement as HTMLElement | null;
        if (active && !active.dataset.pendingRenderFlush) {
            active.dataset.pendingRenderFlush = "true";
            active.addEventListener("focusout", () => {
                delete active.dataset.pendingRenderFlush;
                host.render();
            }, {once: true});
        }
        host.pendingRenderAfterTyping = true;
        return;
    }
    if (host.currentPage !== "editor") {
        host.render();
    }
}

export function getQuickTodayItems(store: CheckinStore): CheckinItem[] {
    const date = currentCalendarDate();
    return sortCheckinItems(store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, date) && isScheduledToday(item, date)), "priority");
}

export function bindDialogCloseFor(host: PluginOpsHost, root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>("[data-action='close-dialog']").forEach((button) => {
        if (button.dataset.bound === "true") return;
        button.dataset.bound = "true";
        button.addEventListener("click", () => host.closeQuickDialog());
    });
    root.querySelector<HTMLElement>("[data-action='toggle-fullscreen']")?.addEventListener("click", () => toggleQuickDialogFullscreenFor(host as unknown as QuickDialogHost, root));
    /* Esc 关闭快速弹窗（T-113）：只在弹窗表面绑定（dock/页签是常驻面板，Esc 不该关它们）；
       焦点在弹窗内时生效——焦点被弹窗打开逻辑收进容器后（T-107），打开即可用 Esc 关闭。
       root 级监听会随每次重渲染叠加，必须防重入。 */
    if (root !== host.quickDialogElement || root.dataset.escCloseBound === "true") return;
    root.dataset.escCloseBound = "true";
    root.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        host.closeQuickDialog();
    });
}

export function bindMobileNavFor(host: PluginOpsHost, root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>("[data-mobile-nav]").forEach((button) => button.addEventListener("click", () => {
        const page = button.dataset.mobileNav;
        if (page === "today") host.showToday();
        else if (page === "review" || page === "history" || page === "summary") host.showReview();
        else if (page === "insights") host.showInsights();
        else if (page === "archived") host.showArchived();
        else if (page === "occasions") host.showOccasions();
        else if (page === "settings") host.showSettings();
        else if (page === "add") host.showEditor();
    }));
}

export function changeHistoryMonthFor(host: PluginOpsHost, offset: number): void {
    if (!Number.isInteger(offset) || !offset) {
        return;
    }
    const candidate = new Date(host.historyMonth.getFullYear(), host.historyMonth.getMonth() + offset, 1);
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (candidate > currentMonth) {
        return;
    }
    host.historyMonth = candidate;
    const prefix = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, "0")}-`;
    const latestRecordedDay = host.store.events.map(getEventDateKey).filter((key) => key.startsWith(prefix)).sort().reverse()[0];
    host.selectedHistoryDate = candidate.getTime() === currentMonth.getTime() ? dateKey(new Date()) : latestRecordedDay || dateKey(candidate);
    host.render();
}

export async function restoreItemFor(host: PluginOpsHost, itemId: string): Promise<void> {
    const moment = captureActionMoment();
    const expectedItem = host.store.items.find((item) => item.id === itemId);
    const expectedFingerprint = expectedItem ? host.itemFingerprint(expectedItem) : undefined;
    let restored = false;
    await host.enqueueMutation(async () => { restored = await host.setItemArchived(itemId, false, moment, expectedFingerprint); });
    if (restored && expectedItem) showMessage(t("msg.restoredNamed", {name: expectedItem.name}));
}

/* T-1430 · R-A10：导出前敏感字段审计——备注/图片/头像照片如实披露给用户。 */
export function downloadExportFor(host: PluginOpsHost, format: "json" | "csv", scopeDays?: number): void {
    host.lastExportAt = new Date().toISOString();
    void host.persistViewPreferences();
    const cloned = host.cloneStore();
    /* T-1436 · R-A8：范围导出——CSV 可选相对天数窗口；JSON 恒为全量备份语义。 */
    if (format === "csv" && Number.isFinite(scopeDays) && (scopeDays as number) >= 1) {
        const days = Math.min(730, Math.floor(scopeDays as number));
        const today = dateKey(new Date());
        const startDate = addDays(today, -(days - 1));
        if (startDate) {
            const keep = new Set(getEventsInDateRange(cloned, startDate, today).map((event) => event.id));
            cloned.events = cloned.events.filter((event) => keep.has(event.id));
        }
    }
    const content = format === "json" ? serializeJson(cloned) : serializeCsv(cloned);
    const audit = auditExportSensitiveFields(cloned);
    if (hasSensitiveContent(audit)) {
        showMessage(t("msg.exportSensitiveAudit", {notes: audit.notes, attachments: audit.attachments, avatar: audit.avatarImages}), 3200);
    }
    void saveGeneratedFile({fileName: `siyuan-checkin-${dateKey(new Date())}.${format}`, content, mime: format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8"});
}

export function downloadMigrationReportFor(report: JsonMigrationReport): void {
    void saveGeneratedFile({fileName: `siyuan-checkin-migration-${dateKey(new Date())}.json`, content: serializeJsonMigrationReport(report), mime: "application/json;charset=utf-8"});
}

/* T-1217：本地生成的 Markdown 报告与其他导出共用同一条保存通道。 */
export function downloadReportMarkdownFor(markdown: string): void {
    void saveGeneratedFile({fileName: `siyuan-checkin-report-${dateKey(new Date())}.md`, content: markdown, mime: "text/markdown;charset=utf-8"});
}

/* T-1218：Loop 同构导出是两个文件（Habits.csv + Checkmarks.csv）。
   原生容器下必须顺序保存，两个保存面板叠上来会互相吞掉；对外保持同步签名。 */
export function downloadLoopExportFor(store: CheckinStore): void {
    void saveLoopExportPair(store);
}

async function saveLoopExportPair(store: CheckinStore): Promise<void> {
    const stamp = Date.now();
    const files: Array<{name: string; content: string}> = [
        {name: `siyuan-checkin-loop-Habits-${dateKey(new Date())}.csv`, content: serializeLoopHabitsCsv(store)},
        {name: `siyuan-checkin-loop-Checkmarks-${dateKey(new Date())}.csv`, content: serializeLoopCheckmarksCsv(store)},
    ];
    for (const file of files) {
        await saveGeneratedFile({fileName: file.name, content: file.content, mime: "text/csv;charset=utf-8"}, stamp);
    }
}

export function downloadStoreAuditFor(entries: readonly StoreAuditEntry[]): void {
    void saveGeneratedFile({fileName: `siyuan-checkin-audit-${dateKey(new Date())}.json`, content: serializeStoreAudit(entries), mime: "application/json;charset=utf-8"});
}

/** T-1362：智能体建议审计导出（版本化诊断 JSON，走统一安全导出通道）。 */
export function downloadSuggestionAuditFor(envelope: import("./agent-suggestions").AgentSuggestionEnvelope, audits: readonly import("./agent-suggestions").AgentSuggestionAudit[]): void {
    void saveGeneratedFile({fileName: `siyuan-checkin-agent-audit-${dateKey(new Date())}.json`, content: serializeSuggestionAuditExport(envelope, audits), mime: "application/json;charset=utf-8"});
}

/** T-1361：会话诊断导出（版本化原因码 JSON，走统一安全导出通道）。 */
export function downloadDiagnosticsFor(entries: readonly import("./features/diagnostics").CheckinDiagnostic[]): void {
    void saveGeneratedFile({fileName: `siyuan-checkin-diagnostics-${dateKey(new Date())}.json`, content: serializeDiagnostics(entries), mime: "application/json;charset=utf-8"});
}

export function downloadSnapshotHistoryFor(history: unknown): void {
    void saveGeneratedFile({fileName: `siyuan-checkin-snapshots-${dateKey(new Date())}.json`, content: serializeStoreSnapshotHistory(history), mime: "application/json;charset=utf-8"});
}

export function downloadDockTomatoDiagnosticsFor(provider: DockTomatoProviderDiagnostics): void {
    void saveGeneratedFile({fileName: `siyuan-checkin-focus-diagnostics-${dateKey(new Date())}.json`, content: serializeDockTomatoDiagnostics(provider), mime: "application/json;charset=utf-8"});
}

export function focusTodaySearchFor(host: PluginOpsHost, selection?: number): void {
    window.setTimeout(() => {
        const roots = [host.dockElement, host.tabElement, host.quickDialogElement].filter((element): element is HTMLElement => Boolean(element));
        const input = roots.map((element) => element.querySelector<HTMLInputElement>("[data-today-search]")).find((candidate): candidate is HTMLInputElement => Boolean(candidate));
        input?.focus();
        if (selection !== undefined) input?.setSelectionRange(selection, selection);
    }, 0);
}

export function showSyncNoticeFor(host: PluginOpsHost): void {
    if (host.disposed || host.disposing) return;
    if (host.syncNoticeTimer !== undefined) window.clearTimeout(host.syncNoticeTimer);
    host.syncNoticeTimer = window.setTimeout(() => {
        host.syncNoticeTimer = undefined;
        if (!host.disposed && !host.disposing) host.renderBackgroundUpdate();
    }, 4200);
}

export function settleReadyFor(host: PluginOpsHost, ready: boolean): void {
    host.readyResolver?.(ready);
    host.readyResolver = undefined;
}

export function invalidateSummaryFor(host: PluginOpsHost): void {
    host.summaryRequestId += 1;
    host.summaryText = undefined;
}

/** CSV 行导入：返回新 store 与统计，不直接改动宿主引用。 */
export function importCsvRowsInto(store: CheckinStore, rows: Array<{name: string; date: string; value: number; unit: string; binary: boolean}>): {store: CheckinStore; itemsCreated: number; eventsCreated: number; duplicates: number} {
    const byName = new Map<string, CheckinItem>();
    let itemsCreated = 0;
    const now = new Date().toISOString();
    const today = dateKey(new Date());
    const resolveItem = (name: string, unit: string, binary: boolean): CheckinItem => {
        const existing = byName.get(name) || store.items.find((candidate) => !candidate.archived && candidate.name === name);
        if (existing) return existing;
        const created = normalizeCheckinItem({
            id: makeId("item"),
            name,
            icon: "✓",
            kind: binary ? "binary" : "count",
            target: 1,
            unit: binary ? "次" : unit,
            schedule: {type: "daily"},
            createdDate: today,
            createdAt: now,
            updatedAt: now,
        })!;
        byName.set(name, created);
        itemsCreated += 1;
        return created;
    };
    const resolved: CheckinItem[] = [];
    const events: CheckinEvent[] = [];
    let eventsCreated = 0;
    let duplicates = 0;
    for (const row of rows) {
        const item = resolveItem(row.name, row.unit, row.binary);
        resolved.push(item);
        const date = row.date;
        const duplicate = store.events.some((event) => event.itemId === item.id && event.localDate === date && event.value === row.value && event.unit === row.unit)
            || events.some((event) => event.itemId === item.id && event.localDate === date && event.value === row.value && event.unit === row.unit);
        if (duplicate) { duplicates += 1; continue; }
        events.push({
            id: makeId("event"),
            itemId: item.id,
            occurredAt: new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12, 0).toISOString(),
            localDate: date,
            value: row.value,
            unit: row.unit || item.unit,
            source: "import",
        });
        eventsCreated += 1;
    }
    const items = [...store.items, ...resolved.filter((item) => !store.items.some((existing) => existing.id === item.id))];
    return {
        store: {...store, items, events: [...store.events, ...events]},
        itemsCreated,
        eventsCreated,
        duplicates,
    };
}

/* T-1218：按 Loop 导入计划落库——MEASURABLE 只建项目（历史数值降级不导入），
   YES_NO 完成日写 source=import 事件并按 (item,date,value,unit) 去重；
   上层在 persist 前调用，恢复点由既有持久化管线自动生成。 */
export function importLoopPlanInto(store: CheckinStore, plan: LoopImportPlan): {store: CheckinStore; itemsCreated: number; eventsCreated: number; duplicates: number} {
    const now = new Date().toISOString();
    const today = dateKey(new Date());
    const items = [...store.items];
    const itemByName = new Map<string, CheckinItem>();
    let itemsCreated = 0;
    for (const habit of plan.habits) {
        const existing = items.find((candidate) => candidate.name === habit.name && !candidate.archived) || itemByName.get(habit.name);
        if (existing) { itemByName.set(habit.name, existing); continue; }
        const created = normalizeCheckinItem({
            id: makeId("item"),
            name: habit.name,
            icon: "✓",
            kind: habit.measurable ? "quantity" : "binary",
            target: habit.target > 0 ? habit.target : 1,
            unit: habit.measurable ? (habit.unit || "次") : "次",
            schedule: habit.schedule || {type: "daily"},
            createdDate: today,
            createdAt: now,
            updatedAt: now,
            archived: habit.archived ? true : undefined,
        })!;
        items.push(created);
        itemByName.set(habit.name, created);
        itemsCreated += 1;
    }
    const events = [...store.events];
    let eventsCreated = 0;
    let duplicates = 0;
    for (const row of plan.rows) {
        const item = itemByName.get(row.name);
        if (!item) continue;
        const duplicate = events.some((event) => event.itemId === item.id && event.localDate === row.date && event.value === row.value && event.unit === item.unit);
        if (duplicate) { duplicates += 1; continue; }
        events.push({
            id: makeId("event"),
            itemId: item.id,
            occurredAt: new Date(Number(row.date.slice(0, 4)), Number(row.date.slice(5, 7)) - 1, Number(row.date.slice(8, 10)), 12, 0).toISOString(),
            localDate: row.date,
            value: row.value,
            unit: item.unit,
            source: "import",
        });
        eventsCreated += 1;
    }
    return {store: {...store, items, events}, itemsCreated, eventsCreated, duplicates};
}

/* T-1279：按 Obsidian Habit Tracker 21 导入计划落库——一习惯一文件映射为每日二值项目,
   完成日写 source=import 事件并带 obsidian21:<filename>:<date> 幂等身份;
   颜色与 maxGap 容忍不迁移（降级已在确认文案说明）;上层 persist 前调用。 */
export function importObsidianHabitsInto(store: CheckinStore, plan: ObsidianImportPlan): {store: CheckinStore; itemsCreated: number; eventsCreated: number; duplicates: number} {
    const now = new Date().toISOString();
    const today = dateKey(new Date());
    const items = [...store.items];
    const itemByName = new Map<string, CheckinItem>();
    let itemsCreated = 0;
    for (const habit of plan.habits) {
        const name = obsidianHabitName(habit);
        const existing = items.find((candidate) => candidate.name === name && !candidate.archived) || itemByName.get(name);
        if (existing) {
            itemByName.set(name, existing);
            continue;
        }
        const created = normalizeCheckinItem({
            id: makeId("item"),
            name,
            icon: "✓",
            kind: "binary",
            target: 1,
            unit: "次",
            schedule: {type: "daily"},
            createdDate: today,
            createdAt: now,
            updatedAt: now,
        })!;
        items.push(created);
        itemByName.set(name, created);
        itemsCreated += 1;
    }
    const knownRefs = new Set(store.events.map((event) => event.externalRef || "").filter(Boolean));
    const events = [...store.events];
    let eventsCreated = 0;
    let duplicates = 0;
    for (const habit of plan.habits) {
        const name = obsidianHabitName(habit);
        const item = itemByName.get(name);
        if (!item) continue;
        for (const date of habit.dates) {
            const externalRef = obsidianExternalRef(habit, date);
            if (knownRefs.has(externalRef)) {
                duplicates += 1;
                continue;
            }
            knownRefs.add(externalRef);
            const sameDay = events.some((event) => event.itemId === item.id && event.localDate === date && event.kind !== "skip");
            if (sameDay) {
                duplicates += 1;
                continue;
            }
            events.push({
                id: makeId("event"),
                itemId: item.id,
                occurredAt: new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12, 0).toISOString(),
                localDate: date,
                value: 1,
                unit: item.unit,
                source: "import",
                externalRef,
            });
            eventsCreated += 1;
        }
    }
    return {store: {...store, items, events}, itemsCreated, eventsCreated, duplicates};
}

/* T-1283：导出活跃项目为 Habit Tracker 21 习惯 .md 文件（顺序多文件下载,上限 30）。 */
export async function downloadObsidianExportFor(store: CheckinStore): Promise<{files: number; skippedItems: number}> {
    const plan = buildObsidianExportFiles(store);
    const stamp = Date.now();
    for (const file of plan.files) {
        await saveGeneratedFile({fileName: file.filename, content: file.content, mime: "text/markdown;charset=utf-8"}, stamp);
    }
    return {files: plan.files.length, skippedItems: plan.skippedItems};
}
