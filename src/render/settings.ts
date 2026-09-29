/* 设置页视图：从 index.ts 外置；依赖以 SettingsViewContext 显式传入。 */
import {t} from "../i18n";
import {escapeHtml, formatHistoryDate, formatNumber} from "../shared";
import {SORT_LABELS} from "../ui/labels";
import {PLUGIN_VERSION} from "../version";
import type {CheckinAppearance, CheckinPalette, DialogSizeMode, FocusTimerProvider, PluginLanguageSetting, TodayGroupMode} from "../view-preferences";
import type {CheckinItemSortMode, CheckinStore} from "../types";
import type {DockTomatoCompletionIssue, DockTomatoCompletionIssueReason, DockTomatoProviderDiagnostics, DockTomatoProviderState} from "../dock-tomato";
import {dockTomatoCompletionValue, type DockTomatoInboxEntryView} from "../features/docktomato-inbox";
import type {ExternalPendingEntryView} from "../features/external-pending";
import type {HealthInboxPreference, HealthInboxMetric} from "../features/health-inbox";
import type {NoteQueryPreference} from "../features/note-query";
import type {DocumentSourceKey, SourceIngestReport} from "../features/source-ingest-report";
import {bindingTargetLabel} from "../features/note-bindings";
import {renderPageShellHead} from "./page-shell";

const AVATAR_PRESETS = [
    ["check", "set.avatarPresetCheck"],
    ["star", "set.avatarPresetStar"],
    ["horse", "set.avatarPresetHorse"],
    ["leaf", "set.avatarPresetLeaf"],
    ["sun", "set.avatarPresetSun"],
    ["target", "set.avatarPresetTarget"],
] as const;

let settingsViewSequence = 0;

type IntegrationConfigState = "enabled" | "ready" | "setup" | "rebind";
type IntegrationRuntimeState = "unprobed" | "available" | "missing";
type IntegrationProblemState = "none" | "last-read-failed" | "last-write-failed";

export interface IntegrationStatus {
    configuration: IntegrationConfigState;
    runtime: IntegrationRuntimeState;
    activity: {todayCount: number; lastRead: "unprobed" | "succeeded" | "failed"};
    problem: IntegrationProblemState;
}

/** A saved switch is configuration, not evidence that an external host is reachable. */
export function projectIntegrationStatus(input: {
    enabled: boolean;
    configured: boolean;
    targetAvailable?: boolean;
    hostAvailable?: boolean;
    todayCount?: number;
    lastReadOk?: boolean;
    lastWriteFailed?: boolean;
}): IntegrationStatus {
    const configuration = !input.configured ? "setup" : input.targetAvailable === false ? "rebind" : input.enabled ? "enabled" : "ready";
    const runtime = input.hostAvailable === true ? "available" : input.hostAvailable === false ? "missing" : "unprobed";
    const todayCount = Number.isSafeInteger(input.todayCount) && input.todayCount! > 0 ? Math.min(input.todayCount!, 9999) : 0;
    const lastRead = input.lastReadOk === true ? "succeeded" : input.lastReadOk === false ? "failed" : "unprobed";
    return {configuration, runtime, activity: {todayCount, lastRead}, problem: input.lastWriteFailed ? "last-write-failed" : lastRead === "failed" ? "last-read-failed" : "none"};
}

export interface SettingsViewContext {
    store: CheckinStore;
    /** T-1562 设置首页总览只读投影（需要处理/最近活动；可选：旧桩不渲染总览）。 */
    settingsOverview?: import("../features/settings-overview").SettingsOverview;
    /** T-1559 集中体检最近一次完成时间（会话态；bind 头部展示）。 */
    lastBindingCheckAt?: string;
    /** T-1557 文档目标卡摘要的会话查询缓存（docId→名称/路径；null=查询失败退回 ID）。 */
    targetSummaries?: Map<string, {name?: string; hpath?: string} | null>;
    /** T-1521 保存前变更清单（草稿≠已保存的分节汇总；可选：旧桩按无改动处理）。 */
    settingsChangeSections?: import("../features/settings-change-list").SettingsChangeSection[];
    /** T-1522 迁移重名冲突决策会话（可选：无会话时不渲染面板）。 */
    importConflicts?: {format: string; decisions: import("../features/import-conflicts").ImportConflictDecision[]};
    /** T-1523 样例试算台（会话内存态：正文与结果绝不持久化）。 */
    sourceSandboxTexts?: Partial<Record<"yeguif" | "health" | "notequery", string>>;
    sourceSandboxOutcomes?: Partial<Record<"yeguif" | "health" | "notequery", import("../features/source-sandbox").SandboxOutcome>>;
    auditEntries: Array<{type: "conflict" | "merge" | "restore" | "migration" | "anchor"; at: string; details: Record<string, unknown>}>;
    snapshots: Array<{index: number; capturedAt?: string; legacy: boolean; itemCount: number; eventCount: number}>;
    customIconLibrary: string[];
    agentCapability: {state: "pending" | "registered" | "unsupported" | "failed"; count: number; error?: string};
    appearance: CheckinAppearance;
    pluginLanguage: PluginLanguageSetting;
    /** T-1502 默认打开方式（页签仅桌面可用，移动端固定 quick 且选择行照常显示）。 */
    defaultOpenMode: "quick" | "tab";
    quickEntryNlp: boolean;
    reducedMotion: boolean;
    hapticFeedback: boolean;
    /** T-1421 提醒安静时段（可选：旧桩/旧上下文缺省按关闭处理）。 */
    reminderQuietHours?: {enabled: boolean; start: string; end: string};
    /** T-1451 每日提醒调度。 */
    dailyReminder?: {enabled: boolean; slots: string[]};
    /** T-1495 事项提前提醒「仅一次」（可选：旧桩缺省按关闭处理）。 */
    occasionRemindOnce?: boolean;
    focusTimerProvider: FocusTimerProvider;
    focusTimerAdapterCount?: number;
    focusTimerAdapterIds?: readonly string[];
    focusTimerBusy?: boolean;
    dockTomatoDiagnostics?: DockTomatoProviderDiagnostics;
    publicApiContract?: {version: number; capabilities: readonly string[]; taskHorizonVersion: number};
    dockTomatoCompletionIssues?: readonly DockTomatoCompletionIssue[];
    dockTomatoInbox?: {capacity: number; entries: readonly DockTomatoInboxEntryView[]};
    /** T-1465（D-273）问卷日记：自建模板文本（设置页编辑区，空行分块）。 */
    journalCustomText?: string;
    journalCustomCount?: number;
    journalIntegration?: {mode: "daily" | "doc"; notebookId: string; docId: string};
    /** T-1470 笔记联动总览：集中列出全部文档/笔记本/块绑定（健康检测会话内进行）。 */
    noteBindings?: ReadonlyArray<{key: string; featureKey: string; featureParams?: Readonly<Record<string, string>>; targetKind: "doc" | "block" | "notebook" | "none"; targetId: string; enabled: boolean; required: boolean; sourceSelector: string; itemId?: string}>;
    palette: CheckinPalette;
    avatar: string;
    avatarImage?: string;
    /** T-1352 日记集成（opt-in 默认关）。 */
    diaryReport: {enabled: boolean; docId: string};
    /** T-1353 摘要驻留（opt-in 默认关）。 */
    summaryResident: {enabled: boolean; docId: string};
    /** T-1384 思阅联动（opt-in 默认关）。 */
    sireaderIntegration: {enabled: boolean; itemId: string; thresholdMinutes: number};
    /** T-1386 治理可观测性：思阅/思播当日已写入分钟。 */
    sireaderTodayMinutes: number;
    siplayerTodayMinutes: number;
    /** T-1385 思播联动（实验，opt-in 默认关）。 */
    siplayerIntegration: {enabled: boolean; itemId: string; thresholdMinutes: number};
    /** T-1385 宿主能力探测：仅说明公开 controller 当前是否可调用，不代表已经产生观看事件。 */
    siplayerControllerAvailable?: boolean;
    /** T-1403 健康收件箱（opt-in 默认关）；T-1486 按项目映射（metricBindings）。 */
    healthInbox: HealthInboxPreference;
    /** T-1500 笔记推导打卡（opt-in 默认关；固定只读查询模板）。 */
    noteQuery?: NoteQueryPreference;
    /** T-1402 微信读书联动（opt-in 默认关）；Key 不进渲染上下文，只暴露 wereadKeySet。 */
    wereadIntegration: {enabled: boolean; itemId: string; thresholdMinutes: number; finishItemId: string; notesItemId: string};
    wereadKeySet: boolean;
    wereadLastPull?: {ok: boolean; days: number; written: number; error?: string; upgrade?: string};
    wereadTodayMinutes: number;
    /** T-1457 叶归 LifeLog 联动（opt-in 默认关）。 */
    yeguifIntegration?: {enabled: boolean; itemId: string; notebookId: string; mappings?: Array<{project: string; itemId: string}>};
    /** Keep the source card the user is editing open after a preference save. */
    openSourcePanels?: readonly string[];
    /** T-1442 效果徽标：各来源当日已写入事件数（sireader/siplayer/weread）。 */
    sourceTodayCounts?: Record<string, number>;
    sourceIngestReports?: Partial<Record<DocumentSourceKey, SourceIngestReport>>;
    /** T-1509 外部失败待处理箱：纯数据投影（容量/条目/箱保存失败/启动恢复摘要）。 */
    externalPending?: {capacity: number; count: number; entries: readonly ExternalPendingEntryView[]; saveFailed: boolean; recovery?: {recovered: number; refused: number; kept: number}};
    /** T-1362 智能体建议审计条数（0 时导出入口禁用）。 */
    suggestionWorkflowAudits: number;
    /** T-1361 会话诊断：条数与最新一条的本地化标签（空串 = 无诊断）。 */
    diagnosticsCount: number;
    latestDiagnosticText: string;
    todayGroupMode: TodayGroupMode;
    todaySortMode: CheckinItemSortMode;
    completedCollapsed: boolean;
    weekStripVisible: boolean;
    dialogSizeMode: DialogSizeMode;
    dialogScale: number;
    dialogFixedSize: {width: number; height: number};
    /** True when the user has dragged/resized the dialog: shows the "reset size" row. */
    dialogHasCustomFrame: boolean;
    resolvedAppearanceValue: "light" | "dark";
}

export function renderSettingsView(ctx: SettingsViewContext): string {
    const settingsViewId = `lc-checkin-settings-${++settingsViewSequence}`;
    const agentStatusOf = (state: SettingsViewContext["agentCapability"]["state"], count: number, error?: string): string => {
        if (state === "registered") return count ? t("set.agentOn", {count}) : t("set.agentOnUnknown");
        if (state === "unsupported") return t("set.agentUnsupported");
        if (state === "failed") return t("set.agentFailed", {error: error || ""});
        return t("set.agentPending");
    };
    const agentStatus = agentStatusOf(ctx.agentCapability.state, ctx.agentCapability.count, ctx.agentCapability.error);
    const agentWhere = ctx.agentCapability.state === "registered" ? `<small>${t("set.agentWhere")}</small>` : "";
    const diagnosticState: DockTomatoProviderState = ctx.dockTomatoDiagnostics?.state || "missing";
    const diagnosticKey: Record<DockTomatoProviderState, string> = {
        missing: "set.tomatoStateMissing",
        "incompatible-version": "set.tomatoStateVersion",
        "incomplete-api": "set.tomatoStateApi",
        "missing-capabilities": "set.tomatoStateCapabilities",
        "not-ready": "set.tomatoStateLoading",
        ready: "set.tomatoStateReady",
        running: "set.tomatoStateRunning",
        paused: "set.tomatoStatePaused",
        error: "set.tomatoStateError",
    };
    const tomatoStatus = t(diagnosticKey[diagnosticState]);
    const tomatoHealthy = diagnosticState === "ready" || diagnosticState === "running" || diagnosticState === "paused";
    /* T-1345：三类外部依赖统一状态口径——healthy 可用 / degraded 降级等待 / error 需处理。 */
    const dependencyBucket = (healthyStates: readonly string[], errorStates: readonly string[], state: string): "healthy" | "degraded" | "error" =>
        healthyStates.includes(state) ? "healthy" : errorStates.includes(state) ? "error" : "degraded";
    const tomatoDependencyState = dependencyBucket(["ready", "running", "paused"], ["incompatible-version", "incomplete-api", "missing-capabilities", "error"], diagnosticState);
    const agentDependencyState = dependencyBucket(["registered"], ["failed"], ctx.agentCapability.state);
    const tomatoDiagnosticDetail = ctx.dockTomatoDiagnostics?.apiVersion != null
        ? t("set.tomatoDiagnosticVersion", {version: ctx.dockTomatoDiagnostics.apiVersion})
        : t("set.tomatoDiagnosticInstall");
    const tomatoFallback = ctx.focusTimerProvider === "docktomato" && !tomatoHealthy
        ? `<button class="lc-checkin__text-button" type="button" data-action="use-builtin-focus">${t("set.tomatoUseBuiltin")}</button>`
        : "";
    /* T-1352：日记集成缺省值——旧调用方/测试未传该字段时按「未启用」渲染。 */
    const diary = ctx.diaryReport || {enabled: false, docId: ""};
    /* T-1470 笔记联动总览：行渲染（状态列由「检测全部联动」会话内填充）。
       T-1559：可停用的自动联动行内「停用」就地修复动作（diary 手动/anchor 逐项/journal 不适用）。 */
    const DISABLEABLE_BINDING_KEYS = new Set(["summary-resident", "health-inbox", "note-query", "yeguif-lifelog"]);
    const noteBindings = ctx.noteBindings ?? [];
    const bindingRows = noteBindings.map((row) => {
        const targetLabel = row.targetId ? `${t(`bind.target.${row.targetKind}`)} · ${row.targetId}` : t("bind.targetNone");
        const statusLabel = row.enabled && row.required && !row.targetId ? t("bind.statusMissing") : t("bind.statusUnknown");
        const statusReason = row.enabled && row.required && !row.targetId ? t("bind.reasonMissing") : "";
        const disableAction = row.enabled && DISABLEABLE_BINDING_KEYS.has(row.key) ? `<button class="lc-checkin__text-button" type="button" data-disable-binding="${escapeHtml(row.key)}">${t("bind.disable")}</button>` : "";
        const actions = `${row.targetId && row.targetKind !== "notebook" ? `<button class="lc-checkin__text-button" type="button" data-open-binding="${escapeHtml(row.targetId)}">${t("bind.open")}</button>` : ""}${row.itemId ? `<button class="lc-checkin__text-button" type="button" data-edit-binding="${escapeHtml(row.itemId)}">${t("bind.locate")}</button>` : row.sourceSelector ? `<button class="lc-checkin__text-button" type="button" data-goto-binding="${escapeHtml(row.sourceSelector)}">${t("bind.locate")}</button>` : ""}${disableAction}`;
        return `<div class="lc-checkin__binding-row" data-binding-row="${escapeHtml(row.key)}"><span class="lc-checkin__binding-feature">${escapeHtml(t(row.featureKey, row.featureParams))}</span><span class="lc-checkin__binding-target">${row.enabled ? "" : `<em class="lc-checkin__binding-off">${t("bind.off")}</em>`}<span data-binding-target-label title="${escapeHtml(targetLabel)}">${escapeHtml(targetLabel)}</span></span><span class="lc-checkin__binding-status" data-binding-status${statusReason ? ` title="${escapeHtml(statusReason)}"` : ""}>${statusLabel}</span><span class="lc-checkin__binding-actions">${actions}</span></div>`;
    }).join("");
    /* T-1465（D-273）：问卷日记自建模板缺省值。 */
    const journalCustomText = typeof ctx.journalCustomText === "string" ? ctx.journalCustomText : "";
    const journalCustomCount = ctx.journalCustomCount ?? 0;
    const journalTarget = ctx.journalIntegration ?? {mode: "daily", notebookId: "", docId: ""};
    /* T-1353：摘要驻留缺省值，同上。 */
    const summaryResident = ctx.summaryResident || {enabled: false, docId: ""};
    /* T-1384：思阅联动缺省值，同上。 */
    const sireader = ctx.sireaderIntegration || {enabled: false, itemId: "", thresholdMinutes: 30};
    /* 项目列表有展示上限，但当前绑定项永远保留，避免归档或排到 200 名之外后
       设置页丢失真实绑定；保留项会明确标记，用户可以直接重新绑定。 */
    const projectOptions = (selectedId: string): string => {
        const activeItems = ctx.store.items.filter((item) => !item.archived);
        const visibleItems = activeItems.slice(0, 200);
        const selectedItem = selectedId ? ctx.store.items.find((item) => item.id === selectedId) : undefined;
        const retained = Boolean(selectedItem && !visibleItems.some((item) => item.id === selectedItem.id));
        const items = retained && selectedItem ? [selectedItem, ...visibleItems] : visibleItems;
        const missing = selectedId && !selectedItem
            ? `<option value="${escapeHtml(selectedId)}" selected>${escapeHtml(selectedId)} · ${t("set.itemMissing")}</option>`
            : "";
        return missing + items.map((item) => {
            const marker = item.archived
                ? ` · ${t("set.itemArchived")}`
                : retained && item.id === selectedId ? ` · ${t("set.itemRetained")}` : "";
            return `<option value="${escapeHtml(item.id)}"${item.id === selectedId ? " selected" : ""}>${escapeHtml(item.name)}${marker}</option>`;
        }).join("");
    };
    const sireaderItemOptions = projectOptions(sireader.itemId);
    /* T-1385：思播联动缺省值，同上。 */
    const siplayer = ctx.siplayerIntegration || {enabled: false, itemId: "", thresholdMinutes: 30};
    const siplayerTodayMinutes = ctx.siplayerTodayMinutes ?? 0;
    const sireaderTodayMinutes = ctx.sireaderTodayMinutes ?? 0;
    const siplayerItemOptions = projectOptions(siplayer.itemId);
    const siplayerHostState = ctx.siplayerControllerAvailable === true
        ? "available"
        : ctx.siplayerControllerAvailable === false ? "missing" : "unknown";
    const siplayerHostStatus = t(siplayerHostState === "available"
        ? "set.siplayerHostAvailable"
        : siplayerHostState === "missing" ? "set.siplayerHostMissing" : "set.siplayerHostUnknown");
    /* T-1403：健康收件箱缺省值，同上；T-1486 按项目映射。 */
    const healthInbox = ctx.healthInbox || {enabled: false, docId: "", metricBindings: [], stepsItemId: "", weightItemId: ""};
    const noteQuery = ctx.noteQuery || {enabled: false, template: "frontmatter" as const, scope: "notebook" as const, targetId: "", itemId: "", field: "checkin", value: "done", tag: "checkin"};
    /* T-1402：微信读书联动缺省值，同上；Key 只呈现「已保存」状态。 */
    const weread = ctx.wereadIntegration || {enabled: false, itemId: "", thresholdMinutes: 30, finishItemId: "", notesItemId: ""};
    const wereadKeySet = ctx.wereadKeySet ?? false;
    const wereadTodayMinutes = ctx.wereadTodayMinutes ?? 0;
    const wereadItemOptions = (selectedId: string): string => projectOptions(selectedId);
    const wereadPullStatus = ctx.wereadLastPull
        ? (ctx.wereadLastPull.ok
            ? t("set.wereadPullOk", {days: ctx.wereadLastPull.days, written: ctx.wereadLastPull.written})
            : t("set.wereadPullFail", {message: `${ctx.wereadLastPull.error || ""}${ctx.wereadLastPull.upgrade ? ` · ${ctx.wereadLastPull.upgrade}` : ""}`}))
        : t("set.wereadPullIdle");
    /* T-1457：叶归 LifeLog 缺省值，同上。 */
    const yeguif = ctx.yeguifIntegration || {enabled: false, itemId: "", notebookId: "", mappings: []};
    /* 外部联动统一三态：已启用 / 已配置待启用 / 待配置。配置完成不等于上游已连通，
       因此只在卡片上表达本地配置状态，运行结果由各来源自己的最近结果行表达。 */
    type SourceState = IntegrationConfigState;
    const sourceState = (enabled: boolean, ready: boolean, targetReady = true): SourceState => !ready ? "setup" : !targetReady ? "rebind" : enabled ? "enabled" : "ready";
    const sourceStateLabel = (state: SourceState): string => t(state === "enabled" ? "set.sourceStateEnabled" : state === "ready" ? "set.sourceStateReady" : state === "rebind" ? "set.sourceStateRebind" : "set.sourceStateSetup");
    const sourceStateClass = (state: SourceState): string => state === "enabled" ? "is-on" : state === "ready" ? "is-ready" : state === "rebind" ? "is-warning" : "";
    const projectAvailable = (itemId: string): boolean => Boolean(itemId && ctx.store.items.some((item) => item.id === itemId && !item.archived));
    const diaryState = sourceState(diary.enabled, Boolean(diary.docId));
    const summaryState = sourceState(summaryResident.enabled, Boolean(summaryResident.docId));
    const sireaderState = sourceState(sireader.enabled, Boolean(sireader.itemId), projectAvailable(sireader.itemId));
    const healthReady = Boolean(healthInbox.docId && healthInbox.metricBindings.length > 0);
    const healthTargetsReady = healthInbox.metricBindings.every((binding) => projectAvailable(binding.itemId));
    const healthState = sourceState(healthInbox.enabled, healthReady, healthTargetsReady);
    const noteQueryState = sourceState(noteQuery.enabled, Boolean(noteQuery.targetId && noteQuery.itemId), projectAvailable(noteQuery.itemId));
    const siplayerState = sourceState(siplayer.enabled, Boolean(siplayer.itemId), projectAvailable(siplayer.itemId));
    const wereadTargetsReady = projectAvailable(weread.itemId)
        && (!weread.finishItemId || projectAvailable(weread.finishItemId))
        && (!weread.notesItemId || projectAvailable(weread.notesItemId));
    const wereadState = sourceState(weread.enabled, Boolean(weread.itemId && wereadKeySet), wereadTargetsReady);
    const readingConflictItem = sireader.enabled && weread.enabled && sireader.itemId === weread.itemId && projectAvailable(sireader.itemId)
        ? ctx.store.items.find((item) => item.id === sireader.itemId)
        : undefined;
    const yeguifMappedTargets = (yeguif.mappings || []).map((mapping) => mapping.itemId);
    const yeguifHasTarget = ctx.store.items.some((item) => !item.archived && item.unit === "分钟");
    const yeguifTargetsReady = yeguifMappedTargets.every(projectAvailable);
    const yeguifState = sourceState(yeguif.enabled, Boolean(yeguifHasTarget && yeguif.notebookId), yeguifTargetsReady);
    const sourceStateCounts = (states: readonly SourceState[]) => {
        const enabled = states.filter((state) => state === "enabled").length;
        const ready = states.filter((state) => state !== "setup" && state !== "rebind").length;
        return {enabled, ready, pending: states.length - ready};
    };
    const documentSourceCounts = sourceStateCounts([diaryState, summaryState]);
    const thirdPartySourceCounts = sourceStateCounts([sireaderState, healthState, noteQueryState, siplayerState, wereadState, yeguifState]);
    /* T-1557/T-1558：文档目标卡摘要行——当前目标（会话缓存标签）+ 打开/重新检查/重新选择/清除。
       摘要查询失败退回显示已存 ID；换绑与清除的确认与回滚在 bindSettings 侧。 */
    const targetSummaryRow = (point: "diary" | "summary" | "health", docId: string): string => {
        const label = docId ? bindingTargetLabel(docId, ctx.targetSummaries?.get(docId) ?? undefined) : t("set.targetNone");
        /* T-1615：摘要小字附 title 全值——长名称/路径/ID 悬停可读完整目标，不截断信息。 */
        return `<div class="lc-checkin__settings-row" data-target-summary="${point}"><span class="lc-checkin__settings-label"><span>${t("set.targetSummaryTitle")}</span><small data-target-summary-label="${escapeHtml(docId)}" title="${escapeHtml(label)}">${escapeHtml(label)}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-open-binding="${escapeHtml(docId)}" ${docId ? "" : "disabled"}>${t("set.targetOpen")}</button><button class="lc-checkin__text-button" type="button" data-target-recheck="${point}" ${docId ? "" : "disabled"}>${t("set.targetRecheck")}</button><button class="lc-checkin__text-button" type="button" data-target-edit="${point}">${t("set.targetEdit")}</button><button class="lc-checkin__text-button" type="button" data-target-clear="${point}" ${docId ? "" : "disabled"}>${t("set.targetClear")}</button></span></div>`;
    };
    /* T-1552 五段式之「触发方式 / 最近结果」——触发口径逐卡显式；最近结果读审计
       单一事实（appendStoreAudit type:"anchor" 的 channel 记录），失败注明事实不受影响。 */
    const writeTriggerRow = (point: string, textKey: string, extraAttrs = ""): string => `<div class="lc-checkin__settings-row" data-write-trigger="${point}"${extraAttrs}><span class="lc-checkin__settings-label"><span>${t("set.writeTriggerTitle")}</span></span><span class="lc-checkin__settings-value">${t(textKey)}</span></div>`;
    const latestWriteResult = (channel: string): {ok?: boolean; reason?: string; at: string} | undefined => {
        for (let index = ctx.auditEntries.length - 1; index >= 0; index -= 1) {
            const entry = ctx.auditEntries[index];
            const details = entry.details as {channel?: string; ok?: boolean; reason?: string};
            if (entry.type === "anchor" && details.channel === channel) return {ok: details.ok, reason: details.reason, at: entry.at};
        }
        return undefined;
    };
    const writeResultRow = (point: string, channel: string): string => {
        const last = latestWriteResult(channel);
        const text = !last ? t("set.writeResultNone")
            : last.ok ? t("set.writeResultOk", {time: formatHistoryDate(last.at)})
                : t("set.writeResultFail", {reason: last.reason || "-"});
        return `<div class="lc-checkin__settings-row" data-write-result="${point}"><span class="lc-checkin__settings-label"><span>${t("set.writeResultTitle")}</span></span><span class="lc-checkin__settings-value" role="status">${escapeHtml(text)}</span></div>`;
    };
    /* T-1547 来源→项目闭环：每卡首屏三行事实（产生什么/写入哪些项目/何时触发）+
       查看记录跳转（带来源筛选直达回顾）。写入项目从既有偏好实时推导，未绑定如实显示。 */
    const sourceProjectNames = (ids: readonly string[]): string => {
        const names: string[] = [];
        for (const id of ids) {
            if (!id) continue;
            const item = ctx.store.items.find(candidate => candidate.id === id);
            const label = item ? item.name : t("set.itemMissing");
            if (!names.includes(label)) names.push(label);
        }
        return names.length ? names.join("、") : t("set.targetNone");
    };
    const sourceFactsBlock = (source: "sireader" | "siplayer" | "weread" | "health" | "notequery" | "yeguif", projectIds: readonly string[], extraAction = ""): string => {
        const factRow = (attr: string, labelKey: string, value: string) => `<div class="lc-checkin__settings-row" ${attr}><span class="lc-checkin__settings-label"><span>${t(labelKey)}</span></span><span class="lc-checkin__settings-value">${escapeHtml(value)}</span></div>`;
        return `${factRow(`data-source-fact="${source}-produces"`, "set.sourceFactProduces", t(`set.sourceProduces.${source}`))}
                    ${factRow(`data-source-fact="${source}-projects"`, "set.sourceFactProjects", sourceProjectNames(projectIds))}
                    ${factRow(`data-source-fact="${source}-trigger"`, "set.sourceFactTrigger", t(`set.sourceTrigger.${source}`))}
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.writeResultTitle")}</span></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-review-records-for="${source}">${t("set.sourceViewRecords")}</button>${extraAction}</span></div>`;
    };
    /* T-1560 读取范围与目标所有权：每个绑定点在选择器旁显式声明读写/创建/触发/失败行为
       （文案与 T-1556 规范差异表、T-1545 归属表同源）。 */
    const scopeLineRow = (point: string, textKey: string): string => `<div class="lc-checkin__settings-row" data-scope-line="${point}"><span class="lc-checkin__settings-label"><span>${t("set.scopeTitle")}</span></span><span class="lc-checkin__settings-value">${t(textKey)}</span></div>`;
    const sourceBadge = (state: SourceState) => `<span class="lc-checkin__source-badge ${sourceStateClass(state)}" data-source-state="${state}">${sourceStateLabel(state)}</span>`;
    const statusLine = (status: IntegrationStatus) => `<div class="lc-checkin__source-status" data-config-state="${status.configuration}" data-runtime-state="${status.runtime}" data-activity-count="${status.activity.todayCount}" data-problem-state="${status.problem}"><span>${t("set.integrationRuntime")}: ${t(`set.integrationRuntime.${status.runtime}`)}</span><span>${t("set.integrationActivity")}: ${status.activity.todayCount ? t("set.sourceToday", {n: status.activity.todayCount}) : t(`set.integrationLastRead.${status.activity.lastRead}`)}</span><span>${t("set.integrationProblem")}: ${t(`set.integrationProblem.${status.problem}`)}</span></div>`;
    const integrationStatus = (state: SourceState, count: number, hostAvailable?: boolean, lastReadOk?: boolean, lastWriteFailed = false) => projectIntegrationStatus({enabled: state === "enabled", configured: state !== "setup", targetAvailable: state !== "rebind", hostAvailable, todayCount: count, lastReadOk, lastWriteFailed});
    const reportReadOk = (source: DocumentSourceKey): boolean | undefined => {
        const outcome = ctx.sourceIngestReports?.[source]?.outcome;
        return outcome === "ok" || outcome === "write-failed" ? true : outcome === "read-failed" ? false : undefined;
    };
    const sourceReportLine = (source: DocumentSourceKey): string => {
        const report = ctx.sourceIngestReports?.[source];
        if (!report) return "";
        return `<div class="lc-checkin__source-report" data-source-report="${source}" data-report-mode="${report.mode}" data-report-outcome="${report.outcome}" role="status"><strong>${t(report.mode === "preview" ? "set.sourceReportPreview" : "set.sourceReportIngest")} · ${t(`set.sourceReportOutcome.${report.outcome}`)}</strong><span>${t("set.sourceReportCounts", {scanned: report.scanned, matched: report.matched, planned: report.planned, written: report.written})}</span><small>${t("set.sourceReportSkips", {duplicate: report.duplicate, tombstoned: report.tombstoned, manual: report.manualConflict, invalid: report.invalid, unmatched: report.unmatched, blocked: report.blocked})}</small>${report.windowFull ? `<small class="is-warning">${t("set.sourceReportWindowFull")}</small>` : ""}</div>`;
    };
    /* T-1509 外部失败待处理箱：跨来源只读投影 + 重试/丢弃。
       仅在有待处理条目、箱保存失败或刚完成启动恢复时渲染，不为空箱制造常驻噪音。 */
    const pendingRefuseKeys: Record<string, string> = {
        "storage-failed": "set.externalPendingReasonStorage",
        "target-gone": "set.externalPendingRefuseTarget",
        "source-disabled": "set.externalPendingRefuseSource",
        "tombstoned": "set.externalPendingRefuseTombstone",
        "unit-changed": "set.externalPendingRefuseUnit",
        "future-date": "set.externalPendingRefuseFuture",
    };
    const pendingState = ctx.externalPending;
    const pendingEntries = pendingState?.entries ?? [];
    const renderPendingEntry = (entry: ExternalPendingEntryView) => {
        const reasonLabel = entry.lastReason && pendingRefuseKeys[entry.lastReason] ? t(pendingRefuseKeys[entry.lastReason]) : t("set.externalPendingReasonStorage");
        return `<div class="lc-checkin__inbox-entry" data-pending-id="${escapeHtml(entry.id)}"><small>${escapeHtml(t(`source.${entry.source}`))} · ${escapeHtml(entry.itemName || entry.itemId)} · ${escapeHtml(entry.localDate)} · ${escapeHtml(`${formatNumber(entry.value)} ${entry.unit}`)}</small><small class="lc-checkin__settings-value is-muted">${reasonLabel}${entry.attempts > 0 ? ` · ${t("set.inboxAttempts", {n: entry.attempts})}` : ""}</small><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-pending-retry="${escapeHtml(entry.id)}">${t("set.externalPendingRetry")}</button><button class="lc-checkin__text-button" type="button" data-pending-discard="${escapeHtml(entry.id)}">${t("set.externalPendingDiscard")}</button></span></div>`;
    };
    const pendingRest = pendingEntries.length > 5
        ? `<details class="lc-checkin__settings-fold"><summary>${t("set.inboxMore", {n: pendingEntries.length - 5})}</summary>${pendingEntries.slice(5).map(renderPendingEntry).join("")}</details>`
        : "";
    const pendingRows = pendingEntries.length
        ? `${pendingEntries.slice(0, 5).map(renderPendingEntry).join("")}${pendingRest}`
        : `<small class="lc-checkin__settings-value is-muted">${t("set.externalPendingEmpty")}</small>`;
    const pendingRecovery = pendingState?.recovery ? `<small>${t("set.externalPendingRecovered", pendingState.recovery)}</small>` : "";
    const externalPendingRow = pendingState && (pendingState.count > 0 || pendingState.saveFailed || pendingState.recovery)
        ? `<div class="lc-checkin__settings-row" data-external-pending><div class="lc-checkin__settings-label"><span>${t("set.externalPendingTitle")}</span><small>${t("set.externalPendingHint")}</small><small>${t("set.externalPendingCapacity", {n: pendingState.count, total: pendingState.capacity})}</small>${pendingState.saveFailed ? `<small class="is-warning" role="alert">${t("set.externalPendingSaveFailed")}</small>` : ""}${pendingRecovery}${pendingRows}</div></div>`
        : "";
    /* T-1523 样例试算台：来源卡片内的「用样例检查」——复用生产解析/映射函数，
       零 SQL、零网络、零事件写入；正文仅会话内存。 */
    const sandboxBlock = (source: "yeguif" | "health" | "notequery", placeholderKey: string): string => {
        const outcome = ctx.sourceSandboxOutcomes?.[source];
        const result = outcome ? `<div class="lc-checkin__sandbox-result">${outcome.lines.map((line) => `<div class="lc-checkin__sandbox-line is-${line.state}"><span>${escapeHtml(line.input)}</span><span>${line.state === "matched" && line.targetName ? `→ ${escapeHtml(line.targetName)}` : line.reasonKey ? escapeHtml(t(line.reasonKey)) : ""}</span></div>`).join("")}<small>${escapeHtml(t("today.sandboxSummary", {matched: outcome.matched, unmatched: outcome.unmatched, invalid: outcome.invalid}))}${outcome.truncatedLines ? ` · ${escapeHtml(t("today.sandboxTruncated", {n: outcome.truncatedLines}))}` : ""}</small></div>` : "";
        return `<details class="lc-checkin__sandbox" data-sandbox-details="${source}"><summary><span>${t("today.sandboxTitle")}</span><small>${t("today.sandboxHint")}</small></summary><div class="lc-checkin__sandbox-body"><textarea class="lc-checkin__sandbox-text" data-sandbox-text="${source}" rows="4" placeholder="${t(placeholderKey)}">${escapeHtml(ctx.sourceSandboxTexts?.[source] || "")}</textarea><div class="lc-checkin__share-actions"><button class="lc-checkin__text-button" type="button" data-sandbox-run="${source}">${t("today.sandboxRun")}</button></div>${result}</div></details>`;
    };
    const sourcePanelOpen = (source: string) => ctx.openSourcePanels?.includes(source) ? " open" : "";
    const healthItemOptions = (selectedId: string) => projectOptions(selectedId);
    const yeguifNotebookOption = yeguif.notebookId
        ? `<option value="${escapeHtml(yeguif.notebookId)}" selected>${escapeHtml(yeguif.notebookId)} · ${t("set.yeguifNotebookSaved")}</option>`
        : `<option value="">${t("set.yeguifNotebookLoading")}</option>`;
    const yeguifNotebookDisabled = yeguif.notebookId ? "" : " disabled";
    /* T-1616：统一文档选择器（D-323 设计 §1/§2）——单一搜索框 + 候选行列表
       （名称/路径双行预览，role=listbox + option，键盘 ↑/↓ + Enter，IME 组合态安全），
       候选经 searchDocs 全量查询（有界 50），取代「本地锚点下拉 + 搜索替换选项」旧双框。 */
    const documentChoiceBlock = (point: "diary" | "summary" | "health" | "journal", label: string): string => `<div class="lc-checkin__document-choice" data-document-choice="${point}"><label class="lc-checkin__document-target-field"><span>${label}</span><input type="search" data-choice-search="${point}" placeholder="${label}" aria-label="${label}" role="combobox" aria-expanded="false" aria-controls="document-choices-${point}" aria-autocomplete="list" autocomplete="off" /></label><div class="lc-checkin__document-choices" data-choice-list="${point}" id="document-choices-${point}-${++settingsViewSequence}" role="listbox" aria-label="${label}" hidden></div></div>`;
    const completionIssueKeys: Record<DockTomatoCompletionIssueReason, string> = {
        "invalid-event": "set.tomatoIssueInvalidEvent",
        "unsupported-version": "set.tomatoIssueVersion",
        "invalid-context": "set.tomatoIssueContext",
        "invalid-completion-time": "set.tomatoIssueCompletionTime",
        "missing-item": "set.tomatoIssueMissingItem",
        "archived-item": "set.tomatoIssueArchivedItem",
        "mapping-changed": "set.tomatoIssueMapping",
        "not-scheduled": "set.tomatoIssueNotScheduled",
        "at-most-item": "set.tomatoIssueAtMost",
        "skipped-day": "set.tomatoIssueSkippedDay",
        "invalid-duration": "set.tomatoIssueDuration",
        "missing-identity": "set.tomatoIssueIdentity",
        duplicate: "set.tomatoIssueDuplicate",
        "user-removed": "set.tomatoIssueUserRemoved",
        "write-failed": "set.tomatoIssueWrite",
    };
    const latestCompletionIssue = ctx.dockTomatoCompletionIssues?.length
        ? ctx.dockTomatoCompletionIssues[ctx.dockTomatoCompletionIssues.length - 1]
        : undefined;
    const completionIssueCount = ctx.dockTomatoCompletionIssues?.reduce((sum, issue) => sum + (issue.count || 1), 0) || 0;
    const completionIssueRow = latestCompletionIssue
        ? `<div class="lc-checkin__settings-row" data-focus-completion-issue="${latestCompletionIssue.reason}"><span class="lc-checkin__settings-label"><span>${t("set.tomatoIssueTitle")}</span><small>${t(completionIssueKeys[latestCompletionIssue.reason])}</small><small>${escapeHtml(new Date(latestCompletionIssue.at).toLocaleString())}</small></span><span class="lc-checkin__settings-inline"><span class="lc-checkin__settings-value is-muted">${t("set.tomatoIssueCount", {n: completionIssueCount})}</span><button class="lc-checkin__text-button" type="button" data-action="export-focus-issues">${t("set.tomatoIssueExport")}</button><button class="lc-checkin__text-button" type="button" data-action="clear-focus-issues">${t("set.tomatoIssueClear")}</button></span></div>`
        : "";
    /* 待回写番茄完成收件箱：展示最新若干条，提供重试/丢弃与「撤销跳过并计入」。
       条目内容全部为纯数据投影；identity 经 escapeHtml 后再进属性。 */
    const inboxState = ctx.dockTomatoInbox;
    const renderInboxEntry = (entry: DockTomatoInboxEntryView) => {
        const stateLabel = entry.state === "blocked"
            ? (entry.blockedReason && completionIssueKeys[entry.blockedReason as DockTomatoCompletionIssueReason] ? t(completionIssueKeys[entry.blockedReason as DockTomatoCompletionIssueReason]) : t("set.inboxStateBlocked"))
            : entry.attempts > 0 ? `${t("set.inboxStatePending")} · ${t("set.inboxAttempts", {n: entry.attempts})}` : t("set.inboxStatePending");
        const amount = `${formatNumber(dockTomatoCompletionValue(entry.itemUnit, entry.tomatoMode, entry.durationMinutes) ?? 0)} ${entry.itemUnit}`;
        return `<div class="lc-checkin__inbox-entry" data-inbox-identity="${escapeHtml(entry.identity)}"><small>${escapeHtml(entry.itemName || entry.itemId)} · ${escapeHtml(entry.localDate)} · ${escapeHtml(amount)}</small><small class="lc-checkin__settings-value is-muted">${stateLabel}</small><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-inbox-retry="${escapeHtml(entry.identity)}">${t("set.inboxRetry")}</button>${entry.state === "blocked" && entry.blockedReason === "skipped-day" ? `<button class="lc-checkin__text-button" type="button" data-inbox-undo-skip="${escapeHtml(entry.identity)}">${t("set.inboxUndoSkip")}</button>` : ""}<button class="lc-checkin__text-button" type="button" data-inbox-discard="${escapeHtml(entry.identity)}">${t("set.inboxDiscard")}</button></span></div>`;
    };
    const inboxEntries = inboxState?.entries ?? [];
    const inboxCapacity = inboxState?.capacity ?? 0;
    const renderInboxBatch = (offset: number): string => {
        const next = offset + 5;
        const rows = inboxEntries.slice(offset, next).map(renderInboxEntry).join("");
        return next < inboxEntries.length
            ? `${rows}<details class="lc-checkin__settings-fold lc-checkin__settings-inbox-more"><summary>${t("set.inboxMore", {n: inboxEntries.length - next})}</summary>${renderInboxBatch(next)}</details>`
            : rows;
    };
    const inboxRows = inboxEntries.length
        ? `<div class="lc-checkin__settings-row" data-docktomato-inbox><div class="lc-checkin__settings-label"><span>${t("set.inboxTitle")}</span><small>${t("set.inboxCapacity", {n: inboxEntries.length, total: inboxCapacity})}</small>${renderInboxBatch(0)}</div></div>`
        : "";
    const photoEvents = ctx.store.events.filter((event) => event.attachment);
    const photoKb = Math.max(0, Math.round(photoEvents.reduce((sum, event) => sum + (event.attachment?.length || 0), 0) * 0.75 / 1024));
    const iconKb = Math.max(0, Math.round(ctx.customIconLibrary.reduce((sum, icon) => sum + icon.length, 0) * 0.75 / 1024));
    const storageKb = Math.max(1, Math.round((ctx.store.events.length * 160 + ctx.store.items.length * 320) * 0.75 / 1024) + photoKb + iconKb);
    const auditLabel = (type: string) => type === "conflict" ? t("set.auditConflict") : type === "merge" ? t("set.auditMerge") : type === "restore" ? t("set.auditRestore") : type === "anchor" ? t("set.auditAnchor") : t("set.auditMigration");
    const auditEntries = ctx.auditEntries.slice(-5).reverse();
    const renderAuditRow = (entry: typeof auditEntries[number]) => `<li><strong>${auditLabel(entry.type)}</strong><small>${escapeHtml(new Date(entry.at).toLocaleString())} · ${escapeHtml(JSON.stringify(entry.details))}</small></li>`;
    const auditLatest = auditEntries[0] ? renderAuditRow(auditEntries[0]) : "";
    const auditOlder = auditEntries.slice(1).map(renderAuditRow).join("");
    const auditRows = auditLatest ? `${auditLatest}${auditOlder ? `<li class="lc-checkin__settings-fold-item"><details class="lc-checkin__settings-fold"><summary>${t("set.showOlderAudit", {n: auditEntries.length - 1})}</summary><ul>${auditOlder}</ul></details></li>` : ""}` : "";
    const snapshots = [...ctx.snapshots].reverse();
    const renderSnapshotRow = (snapshot: typeof snapshots[number], latest: boolean) => `<li><span><strong>${latest ? t("set.snapshotLatest") : t("set.snapshotOlder")}</strong><small>${escapeHtml(snapshot.capturedAt ? new Date(snapshot.capturedAt).toLocaleString() : t("set.snapshotLegacy"))} · ${t("set.snapshotCounts", {items: snapshot.itemCount, events: snapshot.eventCount})}</small></span><button class="lc-checkin__text-button" type="button" data-action="restore-snapshot" data-restore-snapshot="${snapshot.index}">${t("set.restoreSnapshotBtn")}</button></li>`;
    const snapshotRows = snapshots[0] ? `${renderSnapshotRow(snapshots[0], true)}${snapshots.length > 1 ? `<li class="lc-checkin__settings-fold-item"><details class="lc-checkin__settings-fold"><summary>${t("set.showOlderSnapshots", {n: snapshots.length - 1})}</summary><ul>${snapshots.slice(1).map((snapshot) => renderSnapshotRow(snapshot, false)).join("")}</ul></details></li>` : ""}` : "";
    const kbdRow = (label: string, hint: string, keys: string[]) => `<div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${label}</span><small>${hint}</small></span><span class="lc-checkin__kbd-group">${keys.map((key) => `<kbd class="lc-checkin__kbd">${key}</kbd>`).join('<span class="lc-checkin__kbd-plus" aria-hidden="true">+</span>')}</span></div>`;
    const groups: Array<{id: string; label: string; body: string}> = [
        {
            /* T-1564：外观与操作单一分区——原 appearance/today/dialog/shortcuts 四组
               合一，内部按职责五小节（外观/今日视图/提醒/快捷键/弹窗与页签）。
               行的 data-* 属性、存储键与保存处理器原样，仅 DOM 归位；
               openMode 归弹窗与页签、NLP 速记归今日视图、提醒独立成节。 */
            id: "appearance",
            label: t("set.groupAppearanceOps"),
            body: `
                    <div class="lc-checkin__source-category" data-appearance-section="look">${t("set.groupAppearance")}</div>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.theme")}</span><small>${t("set.themeHint")}</small></span><select data-setting-appearance aria-label="${t("set.theme")}"><option value="system" ${ctx.appearance === "system" ? "selected" : ""}>${t("set.themeSystem")}</option><option value="light" ${ctx.appearance === "light" ? "selected" : ""}>${t("set.themeLight")}</option><option value="dark" ${ctx.appearance === "dark" ? "selected" : ""}>${t("set.themeDark")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.language")}</span><small>${t("set.languageHint")}</small></span><select data-setting-language aria-label="${t("set.language")}"><option value="zh-CN" ${ctx.pluginLanguage === "zh-CN" ? "selected" : ""}>${t("set.languageZh")}</option><option value="en-US" ${ctx.pluginLanguage === "en-US" ? "selected" : ""}>${t("set.languageEn")}</option><option value="follow" ${ctx.pluginLanguage === "follow" ? "selected" : ""}>${t("set.languageFollow")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reduceMotion")}</span><small>${t("set.reduceMotionHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-motion ${ctx.reducedMotion ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.haptic")}</span><small>${t("set.hapticHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-haptic ${ctx.hapticFeedback ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.accent")}</span><small>${t("set.accentHint")}</small></span><select data-setting-palette aria-label="${t("set.accent")}"><option value="lavender"${ctx.palette === "lavender" ? " selected" : ""}>${t("set.paletteLavender")}</option><option value="ocean"${ctx.palette === "ocean" ? " selected" : ""}>${t("set.paletteOcean")}</option><option value="forest"${ctx.palette === "forest" ? " selected" : ""}>${t("set.paletteForest")}</option><option value="sunset"${ctx.palette === "sunset" ? " selected" : ""}>${t("set.paletteSunset")}</option></select></label>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.avatar")}</span><small>${t("set.avatarHint")}</small></span><span class="lc-checkin__settings-inline"><select data-setting-avatar aria-label="${t("set.avatarPresetAria")}"><option value=""${AVATAR_PRESETS.some(([value]) => value === (ctx.avatar || "check")) ? "" : " selected"}>${t("set.avatarCustomOption")}</option>${AVATAR_PRESETS.map(([value, label]) => `<option value="${value}"${value === (ctx.avatar || "check") ? " selected" : ""}>${t(label)}</option>`).join("")}</select><input data-setting-avatar-custom type="text" maxlength="8" value="${!AVATAR_PRESETS.some(([value]) => value === (ctx.avatar || "check")) ? escapeHtml(ctx.avatar || "") : ""}" placeholder="${t("set.avatarCustomPlaceholder")}" aria-label="${t("set.avatarCustomAria")}" /><input data-setting-avatar-file type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="${t("set.avatarUploadAria")}" />${ctx.avatarImage ? `<small>${t("set.avatarPhotoActive")}</small><button class="lc-checkin__text-button" type="button" data-setting-avatar-edit>${t("set.avatarEdit")}</button><button class="lc-checkin__text-button" type="button" data-setting-avatar-clear>${t("set.avatarClear")}</button>` : ""}</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.customIcons")}</span><small>${t("set.customIconsHint")}</small></span><span class="lc-checkin__settings-value">${t("set.countSuffix", {n: ctx.customIconLibrary.length})}</span></div>
                    <div class="lc-checkin__source-category" data-appearance-section="today">${t("set.groupToday")}</div>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.groupModeLabel")}</span><small>${t("set.groupModeHint")}</small></span><select data-setting-group aria-label="${t("set.groupModeLabel")}"><option value="none"${ctx.todayGroupMode === "none" ? " selected" : ""}>${t("set.groupNone")}</option><option value="group"${ctx.todayGroupMode === "group" ? " selected" : ""}>${t("set.groupCustom")}</option><option value="time" ${ctx.todayGroupMode === "time" ? "selected" : ""}>${t("set.groupTime")}</option><option value="priority" ${ctx.todayGroupMode === "priority" ? "selected" : ""}>${t("set.groupPriority")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.sortModeLabel")}</span><small>${t("set.sortModeHint")}</small></span><select data-setting-sort aria-label="${t("set.sortModeLabel")}">${Object.entries(SORT_LABELS).map(([value, label]) => `<option value="${value}" ${ctx.todaySortMode === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.expandCompleted")}</span><small>${t("set.expandCompletedHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-completed ${!ctx.completedCollapsed ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.weekStrip")}</span><small>${t("set.weekStripHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-weekstrip ${ctx.weekStripVisible ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.quickEntryNlp")}</span><small>${t("set.quickEntryNlpHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-quick-entry-nlp ${ctx.quickEntryNlp ? "checked" : ""} /></label>
                    <div class="lc-checkin__source-category" data-appearance-section="reminders">${t("set.groupReminders")}</div>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reminderQuiet")}</span><small>${t("set.reminderQuietHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-quiet ${ctx.reminderQuietHours?.enabled ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reminderQuietWindow")}</span><small>${t("set.reminderQuietWindowHint")}</small></span><span class="lc-checkin__settings-inline"><input data-setting-quiet-start type="time" value="${ctx.reminderQuietHours?.start || "22:00"}" aria-label="${t("set.reminderQuietStartAria")}" />${t("set.reminderQuietUntil")}<input data-setting-quiet-end type="time" value="${ctx.reminderQuietHours?.end || "07:00"}" aria-label="${t("set.reminderQuietEndAria")}" /></span></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reminderSchedule")}</span><small>${t("set.reminderScheduleHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-reminder-toggle ${ctx.dailyReminder?.enabled !== false ? "checked" : ""} aria-label="${t("set.reminderSchedule")}" /></label>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reminderScheduleSlots")}</span><small>${t("set.reminderScheduleSlotsHint")}</small></span><span class="lc-checkin__settings-inline"><input type="text" data-setting-reminder-slots value="${escapeHtml((ctx.dailyReminder?.slots || []).join(", "))}" placeholder="09:00, 21:00" aria-label="${t("set.reminderScheduleSlots")}" /><button class="lc-checkin__text-button" type="button" data-action="save-reminder-slots">${t("set.reminderScheduleSave")}</button></span></div>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reminderAdvanceOnce")}</span><small>${t("set.reminderAdvanceOnceHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-occasion-once ${ctx.occasionRemindOnce ? "checked" : ""} aria-label="${t("set.reminderAdvanceOnce")}" /></label>
                    <div class="lc-checkin__source-category" data-appearance-section="shortcuts">${t("set.groupShortcuts")}</div>
                    ${kbdRow(t("set.shortcutsOpen"), t("set.shortcutsOpenHint"), ["Alt", "Shift", "C"])}
                    ${kbdRow(t("set.shortcutsQuick"), t("set.shortcutsQuickHint"), ["Alt", "1-9"])}
                    ${kbdRow(t("set.shortcutsReorder"), t("set.shortcutsReorderHint"), ["Alt", "↑ / ↓"])}
                    <div class="lc-checkin__source-category" data-appearance-section="dialog">${t("set.groupDialog")}</div>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.openMode")}</span><small>${t("set.openModeHint")}</small></span><select data-setting-open-mode aria-label="${t("set.openMode")}"><option value="quick" ${ctx.defaultOpenMode === "quick" ? "selected" : ""}>${t("set.openModeQuick")}</option><option value="tab" ${ctx.defaultOpenMode === "tab" ? "selected" : ""}>${t("set.openModeTab")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.dialogSize")}</span><small>${t("set.dialogSizeHint")}</small></span><select data-setting-dialog-mode aria-label="${t("set.dialogSize")}"><option value="auto" ${ctx.dialogSizeMode === "auto" ? "selected" : ""}>${t("set.dialogAuto")}</option><option value="percent" ${ctx.dialogSizeMode === "percent" ? "selected" : ""}>${t("set.dialogPercent")}</option><option value="fullscreen" ${ctx.dialogSizeMode === "fullscreen" ? "selected" : ""}>${t("set.dialogFullscreen")}</option><option value="fixed" ${ctx.dialogSizeMode === "fixed" ? "selected" : ""}>${t("set.dialogFixed")}</option></select></label>
                    <label class="lc-checkin__settings-row" data-dialog-scale-row ${ctx.dialogSizeMode === "percent" ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.scaleLabel")}</span><small>${t("set.scaleCurrent", {n: ctx.dialogScale})}</small></span><input type="range" min="50" max="100" step="5" value="${ctx.dialogScale}" data-setting-dialog-scale aria-label="${t("set.scaleLabel")}" /></label>
                    <div class="lc-checkin__settings-row" data-dialog-reset-row ${ctx.dialogSizeMode === "auto" && ctx.dialogHasCustomFrame ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.dialogFrame")}</span><small>${t("set.dialogFrameHint")}</small></span><button type="button" class="lc-checkin__small-button" data-action="reset-dialog-frame">${t("set.dialogFrameReset")}</button></div>
                    <div class="lc-checkin__settings-row" data-dialog-fixed-row ${ctx.dialogSizeMode === "fixed" ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.fixedWH")}</span><small>${t("set.fixedWHHint")}</small></span><span class="lc-checkin__settings-inline"><input type="number" min="320" max="2560" step="20" value="${ctx.dialogFixedSize.width}" data-setting-dialog-width aria-label="${t("set.dialogWidthAria")}" aria-describedby="${settingsViewId}-dialog-size-separator" /><span id="${settingsViewId}-dialog-size-separator">×</span><input type="number" min="240" max="2048" step="20" value="${ctx.dialogFixedSize.height}" data-setting-dialog-height aria-label="${t("set.dialogHeightAria")}" aria-describedby="${settingsViewId}-dialog-size-separator" /></span></div>`,
        },
        {
            id: "data",
            label: t("set.groupData"),
            body: `
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.exportRecords")}</span><small>${t("set.exportHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="review">${t("set.openReview")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.storageLabel")}</span><small>${t("set.storageDetail", {items: ctx.store.items.length, events: ctx.store.events.length})}${photoEvents.length ? ` · ${t("set.photosDetail", {n: photoEvents.length, kb: photoKb})}` : ""}${iconKb ? ` · ${t("set.iconsDetail", {kb: iconKb})}` : ""}。</small></span><span class="lc-checkin__settings-value">${storageKb} KB</span></div>
                    <div class="lc-checkin__source-category" data-data-section="io">${t("set.dataSectionIO")}</div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importJson")}</span><small>${t("set.importJsonHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-json" data-import-json accept=".json,application/json" />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importCsv")}</span><small>${t("set.importCsvHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-csv" data-import-csv accept=".csv,text/csv" />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importLoop")}</span><small>${t("set.importLoopHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-loop" data-import-loop accept=".csv,text/csv" multiple />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importObsidian")}</span><small>${t("set.importObsidianHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-obsidian" data-import-obsidian accept=".md,text/markdown" multiple />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.exportLoop")}</span><small>${t("set.exportLoopHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="export-loop">${t("set.exportLoopBtn")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.exportObsidian")}</span><small>${t("set.exportObsidianHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="export-obsidian">${t("set.exportObsidianBtn")}</button></div>
                    <div class="lc-checkin__source-category" data-data-section="recovery">${t("set.dataSectionRecovery")}</div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.restoreSnapshot")}</span><small>${t("set.restoreSnapshotHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="restore-backup">${t("set.restoreSnapshotBtn")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.snapshotManage")}</span><small>${t("set.snapshotManageHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-action="export-snapshots" ${ctx.snapshots.length ? "" : "disabled"}>${t("set.snapshotExport")}</button><button class="lc-checkin__text-button" type="button" data-action="clear-snapshots" ${ctx.snapshots.length ? "" : "disabled"}>${t("set.snapshotClear")}</button></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.snapshotImport")}</span><small>${t("set.snapshotImportHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-snapshots" data-import-snapshots accept=".json,application/json" />${t("set.chooseFile")}</label></div>
                    ${snapshotRows ? `<div class="lc-checkin__audit-list lc-checkin__snapshot-list"><ul>${snapshotRows}</ul></div>` : ""}
                    <details class="lc-checkin__settings-fold" data-recovery-guide><summary>${t("set.recoveryGuide")} · <small>${t("set.recoveryGuideHint")}</small><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><ul class="lc-checkin__recovery-list"><li>${t("set.recoveryPoints")}</li><li>${t("set.recoveryBackup")}</li><li>${t("set.recoveryCorruption")}</li><li>${t("set.recoveryWindows")}</li><li>${t("set.recoveryInbox")}</li><li>${t("set.recoveryDiagnostics")}</li></ul></details>
                    <div class="lc-checkin__source-category" data-data-section="diagnostics">${t("set.dataSectionDiagnostics")}</div>
                    <div class="lc-checkin__settings-row" data-diagnostics><span class="lc-checkin__settings-label"><span>${t("set.diagnosticsTitle")}</span><small>${escapeHtml(ctx.latestDiagnosticText || t("set.diagnosticsEmpty"))}</small></span><span class="lc-checkin__settings-inline"><span class="lc-checkin__settings-value ${ctx.diagnosticsCount ? "is-muted" : ""}">${t("set.diagnosticsCount", {n: ctx.diagnosticsCount})}</span><button class="lc-checkin__text-button" type="button" data-action="export-diagnostics" ${ctx.diagnosticsCount ? "" : "disabled"} aria-label="${t("set.diagnosticsExport")}">${t("set.diagnosticsExport")}</button></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.audit")}</span><small>${t("set.auditHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-action="export-audit" ${ctx.auditEntries.length ? "" : "disabled"}>${t("set.exportAudit")}</button><button class="lc-checkin__text-button" type="button" data-action="clear-audit" ${ctx.auditEntries.length ? "" : "disabled"}>${t("set.clearAudit")}</button></span></div>
                    <div class="lc-checkin__audit-list" aria-label="${t("set.audit")}">${auditRows ? `<ul>${auditRows}</ul>` : `<small>${t("set.auditEmpty")}</small>`}</div>
                    <div class="lc-checkin__source-category" data-data-section="reset">${t("set.dataSectionReset")}</div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.resetPrefs")}</span><small>${t("set.resetPrefsHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="reset-all-preferences">${t("set.resetDefaults")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.resetView")}</span><small>${t("set.resetViewHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="reset-view-preferences">${t("set.reset")}</button></div>`,
        },
        {
            /* T-1565：联动与目标单一分区——原 host/documents/external 三组合一，
               内部三小节（宿主能力/思源文档输出/第三方来源自动记录），行原样迁移；
               来源事件、文档写入与公开 API 语义零变化，导航 6→4 项。 */
            id: "external",
            label: t("set.groupIntegration"),
            body: `
                    <div class="lc-checkin__source-category" data-integration-section="host">${t("set.groupHost")}</div>
                    <div class="lc-checkin__source-category" data-host-section="mine">${t("set.hostMine")}</div>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.tomatoDefault")}</span><small>${t("set.tomatoDefaultHint")}</small></span><select data-setting-focus-timer aria-label="${t("set.tomatoDefault")}"><option value="builtin" ${ctx.focusTimerProvider === "builtin" ? "selected" : ""}>${t("set.tomatoBuiltin")}</option><option value="docktomato" ${ctx.focusTimerProvider === "docktomato" ? "selected" : ""}>${t("set.tomatoPlugin")}</option></select></label>
                    <div class="lc-checkin__settings-row" data-contract-center="docktomato" data-contract-state="${diagnosticState}" data-focus-provider-state="${diagnosticState}" data-dependency="docktomato" data-dependency-state="${tomatoDependencyState}"><span class="lc-checkin__settings-label"><span>${t("set.tomato")}</span><small>${t("set.tomatoHint")}</small><small>${tomatoDiagnosticDetail}</small><small>${t("set.contractDiagnostics", {n: ctx.diagnosticsCount})}</small><small class="lc-checkin__dependency-recovery">${t("set.tomatoRecovery")}</small></span><span class="lc-checkin__settings-inline"><span class="lc-checkin__settings-value ${tomatoHealthy ? "is-success" : "is-muted"}" role="status">${tomatoStatus}</span><button class="lc-checkin__text-button" type="button" data-action="export-diagnostics" ${ctx.diagnosticsCount ? "" : "disabled"} aria-label="${t("set.diagnosticsExport")}">${t("set.diagnosticsExport")}</button>${tomatoFallback}</span></div>
                    ${completionIssueRow}
                    ${inboxRows}
                    <div class="lc-checkin__source-category" data-host-section="others">${t("set.hostForOthers")}</div>
                    <div class="lc-checkin__settings-row" data-contract-center="api" data-contract-state="provided"><span class="lc-checkin__settings-label"><span>${t("set.apiContractTitle")}</span><small>${t("set.apiContractDetail", {version: ctx.publicApiContract?.version ?? 5, count: ctx.publicApiContract?.capabilities.length ?? 0})}</small><small>${t("set.apiContractCapabilities")}</small></span><span class="lc-checkin__settings-value is-success" role="status">${t("set.apiContractProvided")}</span></div>
                    <div class="lc-checkin__settings-row" data-contract-center="taskhorizon" data-contract-state="waiting" data-dependency="taskhorizon" data-dependency-state="healthy" data-dependency-kind="provider-contract"><span class="lc-checkin__settings-label"><span>${t("set.thTitle")}</span><small>${t("set.thContractVersion", {version: ctx.publicApiContract?.taskHorizonVersion ?? 1})}</small><small>${t("set.thHint")}</small><small class="lc-checkin__dependency-recovery">${t("set.thRecovery")}</small></span><span class="lc-checkin__settings-value is-muted" role="status">${t("set.thStatus")}</span></div>
                    <div class="lc-checkin__settings-row" data-agent-state="${ctx.agentCapability.state}" data-dependency="agent" data-dependency-state="${agentDependencyState}"><span class="lc-checkin__settings-label"><span>${t("set.agent")}</span><small>${t("set.agentHint")}</small><small class="lc-checkin__dependency-recovery">${t("set.agentRecovery")}</small>${agentWhere}</span><span class="lc-checkin__settings-value ${ctx.agentCapability.state === "registered" ? "is-success" : ctx.agentCapability.state === "failed" ? "is-error" : "is-muted"}" role="status">${agentStatus}</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.agentAuditTitle")}</span><small>${t("set.agentAuditHint")}</small></span><span class="lc-checkin__settings-inline"><span class="lc-checkin__settings-value ${ctx.suggestionWorkflowAudits ? "is-muted" : ""}">${t("set.agentAuditCount", {n: ctx.suggestionWorkflowAudits})}</span><button class="lc-checkin__text-button" type="button" data-action="export-agent-audit" ${ctx.suggestionWorkflowAudits ? "" : "disabled"} aria-label="${t("set.agentAuditExport")}">${t("set.agentAuditExport")}</button></span></div>
                    <div class="lc-checkin__source-category" data-integration-section="doc-output">${t("set.groupDocuments")}</div>
                    <div class="lc-checkin__external-overview" data-document-overview><strong>${t("set.docWritesTitle")}</strong><span>${t("set.docWritesSummary", documentSourceCounts)}</span><small>${t("set.docWritesSetupHint")}</small><small>${t("set.extPrivacyHint")}</small><small>${t("set.sourceRetentionHint")}</small></div>
                    <details class="lc-checkin__settings-group" data-document-writes open>
                    <summary><span>${t("set.docWritesListTitle")}</span><span class="lc-checkin__settings-group-badge">${t("set.extSourcesCount", {n: documentSourceCounts.enabled})}</span></summary>
                    <div class="lc-checkin__settings-row"><small class="lc-checkin__dependency-recovery">${t("set.docWritesSetupHint")}</small><span class="lc-checkin__settings-value" data-document-summary>${t("set.docWritesSummary", documentSourceCounts)}</span></div>
                    <div class="lc-checkin__source-category" data-source-category="document-output">${t("set.sourceCategory.documentOutput")}</div>
                    <details class="lc-checkin__source-panel" data-source-panel="bindings"${sourcePanelOpen("bindings")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("bind.panelTitle")}</strong><span class="lc-checkin__settings-inline"><small>${t("bind.panelHint")}</small></span></summary>
                    <div class="lc-checkin__binding-head"><button class="lc-checkin__text-button" type="button" data-action="check-note-bindings">${t("bind.checkAll")}</button>${ctx.lastBindingCheckAt ? `<small class="lc-checkin__dependency-recovery" data-last-binding-check>${escapeHtml(t("bind.lastCheck", {time: formatHistoryDate(ctx.lastBindingCheckAt)}))}</small>` : ""}</div>
                    <div class="lc-checkin__binding-list" role="list">${bindingRows || `<div class="lc-checkin__history-empty">${t("bind.empty")}</div>`}</div>
                    </details>
                    <details class="lc-checkin__source-panel" data-source-panel="diary" data-source-state="${diaryState}"${sourcePanelOpen("diary")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("set.diaryIntegration")}</strong>${sourceBadge(diaryState)}</summary>
                    ${statusLine(integrationStatus(diaryState, 0))}
                    <ol class="lc-checkin__source-steps"><li>${t("set.stepsDiary1")}</li><li>${t("set.stepsDiary2")}</li><li>${t("set.stepsDiary3")}</li><li>${t("set.stepsDiary4")}</li></ol>
                    <small class="lc-checkin__source-boundary">${t("set.diaryBoundary")}</small>
                    <div class="lc-checkin__document-target-card" data-document-target-card="diary" data-target-state="${diaryState}">
                        <div class="lc-checkin__document-target-heading"><div class="lc-checkin__document-target-copy"><strong>${t("set.diaryDoc")}</strong><small>${t("set.diaryDocHint")}${diary.docId && !diary.enabled ? ` · ${t("set.diaryDocPending")}` : ""}</small></div>${sourceBadge(diaryState)}</div>
                        <div class="lc-checkin__document-target-body">
                            ${targetSummaryRow("diary", diary.docId)}
                            ${scopeLineRow("diary", "set.scope.diary")}
                            ${documentChoiceBlock("diary", t("set.documentChoiceSearch"))}
                            <div class="lc-checkin__document-target-id"><label class="lc-checkin__document-target-field"><span>${t("set.diaryDoc")}</span><input type="text" class="lc-checkin__diary-doc" data-diary-doc value="${escapeHtml(diary.docId)}" placeholder="20260101120000-xxxxxxxx" aria-label="${t("set.diaryDoc")}" /></label><div class="lc-checkin__document-target-actions"><button class="lc-checkin__text-button" type="button" data-action="save-diary-doc">${t("set.diarySave")}</button><button class="lc-checkin__text-button" type="button" data-action="toggle-create-diary-doc">${t("set.diaryCreate")}</button></div></div>
                            <div class="lc-checkin__diary-create" data-diary-create hidden><label><span>${t("set.diaryNotebook")}</span><select data-diary-notebook aria-label="${t("set.diaryNotebook")}" disabled><option value="">${t("set.diaryNotebookLoading")}</option></select></label><label><span>${t("set.diaryCreateTitle")}</span><input type="text" data-diary-create-title placeholder="${t("set.diaryCreateTitle")}" aria-label="${t("set.diaryCreateTitle")}" /></label><button class="lc-checkin__text-button" type="button" data-action="create-diary-doc">${t("common.confirm")}</button></div>
                        </div>
                    </div>
                    ${writeTriggerRow("diary", "set.writeTriggerManual", ' data-diary-integration')}
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.diaryWriteNow")}</span><small>${t("set.diaryWriteNowHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-output-preview-generate="diary">${t("set.outputPreview")}</button><button class="lc-checkin__text-button" type="button" data-action="write-diary-report" ${diary.docId ? "" : "disabled"}>${t("set.diaryWriteNow")}</button></span></div>
                    <details class="lc-checkin__settings-fold" data-output-preview="diary"><summary>${t("set.outputPreview")}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><pre class="lc-checkin__share-preview" data-output-preview-body="diary"></pre></details>
                    ${writeResultRow("diary", "diary-report")}
                    </details>
                    <details class="lc-checkin__source-panel" data-source-panel="journal"${sourcePanelOpen("journal")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("journal.settingsTitle")}</strong><span class="lc-checkin__settings-inline"><small>${t("journal.customCount", {n: journalCustomCount})}</small></span></summary>
                    <small class="lc-checkin__source-boundary">${t("journal.settingsHint")}</small>
                    <div class="lc-checkin__journal-target-card" data-document-target-card="journal">
                        <div class="lc-checkin__document-target-heading"><div class="lc-checkin__document-target-copy"><strong>${t("journal.configTitle")}</strong><small>${t("journal.settingsHint")}</small></div><span class="lc-checkin__document-target-kind">${t(journalTarget.mode === "doc" ? "journal.targetDoc" : "journal.targetDaily")}</span></div>
                        <div class="lc-checkin__journal-target-mode"><label class="lc-checkin__document-target-field"><span>${t("journal.configTitle")}</span><select data-journal-mode><option value="daily"${journalTarget.mode === "daily" ? " selected" : ""}>${t("journal.targetDaily")}</option><option value="doc"${journalTarget.mode === "doc" ? " selected" : ""}>${t("journal.targetDoc")}</option></select></label></div>
                        ${scopeLineRow("journal", "set.scope.journal")}
                        ${documentChoiceBlock("journal", t("journal.docIdLabel"))}
                        <div class="lc-checkin__journal-target-settings"><label class="lc-checkin__document-target-field" data-journal-daily-config><span>${t("journal.notebookLabel")}</span><select data-journal-notebook-id><option value="${escapeHtml(journalTarget.notebookId)}">${escapeHtml(journalTarget.notebookId || t("set.diaryNotebookLoading"))}</option></select></label><label class="lc-checkin__document-target-field" data-journal-doc-config><span>${t("journal.docIdLabel")}</span><input data-journal-target-doc value="${escapeHtml(journalTarget.docId)}" /></label><button type="button" class="lc-checkin__text-button" data-action="save-journal-target">${t("set.diarySave")}</button></div>
                    </div>
                    ${writeTriggerRow("journal", "set.writeTriggerJournal")}
                    <div data-journal-builder></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("journal.customLabel")}</span><small>${t("journal.customHint")}</small></span></div>
                    <div class="lc-checkin__settings-row"><textarea class="lc-checkin__journal-custom" data-journal-custom rows="6" aria-label="${t("journal.customLabel")}">${escapeHtml(journalCustomText)}</textarea></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("journal.customLabel")}</span></span><button class="lc-checkin__text-button" type="button" data-action="save-journal-custom">${t("common.confirm")}</button></div>
                    ${writeResultRow("journal", "journal")}
                    </details>
                    <details class="lc-checkin__source-panel" data-source-panel="summary" data-source-state="${summaryState}"${sourcePanelOpen("summary")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("set.summaryIntegration")}</strong>${sourceBadge(summaryState)}</summary>
                    ${statusLine(integrationStatus(summaryState, 0))}
                    <ol class="lc-checkin__source-steps"><li>${t("set.stepsSummary1")}</li><li>${t("set.stepsSummary2")}</li><li>${t("set.stepsSummary3")}</li><li>${t("set.stepsSummary4")}</li></ol>
                    <small class="lc-checkin__source-boundary">${t("set.summaryBoundary")}</small>
                    <div class="lc-checkin__document-target-card" data-document-target-card="summary" data-target-state="${summaryState}">
                        <div class="lc-checkin__document-target-heading"><div class="lc-checkin__document-target-copy"><strong>${t("set.summaryDoc")}</strong><small>${t("set.summaryDocHint")}${summaryResident.docId && !summaryResident.enabled ? ` · ${t("set.summaryDocPending")}` : ""}</small></div>${sourceBadge(summaryState)}</div>
                        ${targetSummaryRow("summary", summaryResident.docId)}
                        ${scopeLineRow("summary", "set.scope.summary")}
                        ${documentChoiceBlock("summary", t("set.documentChoiceSearch"))}
                        <div class="lc-checkin__document-target-id"><label class="lc-checkin__document-target-field"><span>${t("set.summaryDoc")}</span><input type="text" data-summary-doc value="${escapeHtml(summaryResident.docId)}" placeholder="20260101120000-xxxxxxxx" aria-label="${t("set.summaryDoc")}" /></label><div class="lc-checkin__document-target-actions"><button class="lc-checkin__text-button" type="button" data-action="save-summary-doc">${t("set.summarySave")}</button></div></div>
                    </div>
                    ${writeTriggerRow("summary", "set.writeTriggerResident")}
                    <div class="lc-checkin__settings-row" data-summary-resident><span class="lc-checkin__settings-label"><span>${t("set.summaryTitle")}</span><small>${t("set.summaryHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-summary-toggle ${summaryResident.enabled ? "checked" : ""} aria-label="${t("set.summaryToggle")}" /></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.summaryWriteNow")}</span><small>${t("set.summaryWriteNowHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-output-preview-generate="summary">${t("set.outputPreview")}</button><button class="lc-checkin__text-button" type="button" data-action="write-summary-now" ${summaryResident.enabled && summaryResident.docId ? "" : "disabled"}>${t("set.summaryWriteNow")}</button></span></div>
                    <details class="lc-checkin__settings-fold" data-output-preview="summary"><summary>${t("set.outputPreview")}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><pre class="lc-checkin__share-preview" data-output-preview-body="summary"></pre></details>
                    ${writeResultRow("summary", "summary-resident")}
                    </details>
                    </details>
                    <div class="lc-checkin__source-category" data-integration-section="sources">${t("set.groupExternal")}</div>
                    <div class="lc-checkin__external-overview" data-external-overview><strong>${t("set.thirdPartySourcesTitle")}</strong><span>${t("set.thirdPartySourcesSummary", thirdPartySourceCounts)}</span><small>${t("set.thirdPartySourcesSetupHint")}</small><small>${t("set.extPrivacyHint")}</small><small>${t("set.sourceRetentionHint")}</small>${readingConflictItem ? `<small class="lc-checkin__source-conflict" data-source-conflict="reading-duration">${escapeHtml(t("set.sourceConflictReading", {item: readingConflictItem.name}))}</small>` : ""}</div>
                    <details class="lc-checkin__settings-group" data-external-sources open>
                    <summary><span>${t("set.thirdPartySourcesListTitle")}</span><span class="lc-checkin__settings-group-badge">${t("set.extSourcesCount", {n: thirdPartySourceCounts.enabled})}</span></summary>
                    <div class="lc-checkin__settings-row"><small class="lc-checkin__dependency-recovery">${t("set.thirdPartySourcesSetupHint")}</small><span class="lc-checkin__settings-value" data-external-summary>${t("set.thirdPartySourcesSummary", thirdPartySourceCounts)}</span></div>
                    ${externalPendingRow}
                    <div class="lc-checkin__source-category" data-source-category="plugin-event">${t("set.sourceCategory.pluginEvent")}</div>
                    <details class="lc-checkin__source-panel" data-source-panel="sireader" data-source-state="${sireaderState}"${sourcePanelOpen("sireader")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("set.sireaderIntegration")}</strong><span class="lc-checkin__source-panel-meta">${(ctx.sourceTodayCounts?.sireader ?? 0) > 0 ? `<span class="lc-checkin__source-today">${t("set.sourceToday", {n: ctx.sourceTodayCounts!.sireader})}</span>` : ""}${sourceBadge(sireaderState)}</span></summary>
                    ${statusLine(integrationStatus(sireaderState, ctx.sourceTodayCounts?.sireader ?? 0))}
                    ${sourceFactsBlock("sireader", [sireader.itemId])}
                    <details class="lc-checkin__settings-fold" data-source-advanced><summary>${t("set.sourceAdvanced")}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><ol class="lc-checkin__source-steps"><li>${t("set.stepsSireader1")}</li><li>${t("set.stepsSireader2")}</li><li>${t("set.stepsSireader3")}</li><li>${t("set.stepsSireader4")}</li></ol>
                    <small class="lc-checkin__source-boundary">${t("set.sireaderBoundary")}</small></details>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.sireaderItem")}</span><small>${t("set.sireaderItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-sireader-item aria-label="${t("set.sireaderItem")}"><option value="">${t("set.sireaderItemChoose")}</option>${sireaderItemOptions}</select></span></div>
                    <div class="lc-checkin__settings-row" data-sireader-integration><span class="lc-checkin__settings-label"><span>${t("set.sireaderTitle")}</span><small>${t("set.sireaderHint")}${sireader.enabled ? ` · ${t("set.sireaderToday", {n: formatNumber(sireaderTodayMinutes)})}` : ""}</small></span><input type="checkbox" class="lc-checkin__switch" data-sireader-toggle ${sireader.enabled ? "checked" : ""} aria-label="${t("set.sireaderToggle")}" /></div>
                    </details>
                    <details class="lc-checkin__source-panel" data-source-panel="siplayer" data-source-state="${siplayerState}"${sourcePanelOpen("siplayer")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("set.siplayerIntegration")}</strong><span class="lc-checkin__source-panel-meta">${(ctx.sourceTodayCounts?.siplayer ?? 0) > 0 ? `<span class="lc-checkin__source-today">${t("set.sourceToday", {n: ctx.sourceTodayCounts!.siplayer})}</span>` : ""}${sourceBadge(siplayerState)}</span></summary>
                    ${statusLine(integrationStatus(siplayerState, ctx.sourceTodayCounts?.siplayer ?? 0, ctx.siplayerControllerAvailable))}
                    ${sourceFactsBlock("siplayer", [siplayer.itemId], `<button class="lc-checkin__text-button" type="button" data-action="probe-siplayer">${t("set.siplayerProbe")}</button>`)}
                    <details class="lc-checkin__settings-fold" data-source-advanced><summary>${t("set.sourceAdvanced")}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><ol class="lc-checkin__source-steps"><li>${t("set.stepsSiplayer1")}</li><li>${t("set.stepsSiplayer2")}</li><li>${t("set.stepsSiplayer3")}</li><li>${t("set.stepsSiplayer4")}</li></ol>
                    <small class="lc-checkin__source-boundary">${t("set.siplayerBoundary")}</small></details><small class="lc-checkin__source-boundary" data-siplayer-host-state="${siplayerHostState}">${siplayerHostStatus}</small>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.siplayerItem")}</span><small>${t("set.siplayerItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-siplayer-item aria-label="${t("set.siplayerItem")}"><option value="">${t("set.siplayerItemChoose")}</option>${siplayerItemOptions}</select></span></div>
                    <div class="lc-checkin__settings-row" data-siplayer-integration><span class="lc-checkin__settings-label"><span>${t("set.siplayerTitle")}</span><small>${t("set.siplayerHint")}${siplayer.enabled ? ` · ${t("set.siplayerToday", {n: formatNumber(siplayerTodayMinutes)})}` : ""}</small></span><input type="checkbox" class="lc-checkin__switch" data-siplayer-toggle ${siplayer.enabled ? "checked" : ""} aria-label="${t("set.siplayerToggle")}" /></div>
                    </details>
                    <div class="lc-checkin__source-category" data-source-category="official-pull">${t("set.sourceCategory.officialPull")}</div>
                    <details class="lc-checkin__source-panel" data-source-panel="weread" data-source-state="${wereadState}"${sourcePanelOpen("weread")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("set.wereadIntegration")}</strong><span class="lc-checkin__source-panel-meta">${(ctx.sourceTodayCounts?.weread ?? 0) > 0 ? `<span class="lc-checkin__source-today">${t("set.sourceToday", {n: ctx.sourceTodayCounts!.weread})}</span>` : ""}${sourceBadge(wereadState)}</span></summary>
                    ${statusLine(integrationStatus(wereadState, ctx.sourceTodayCounts?.weread ?? 0, undefined, ctx.wereadLastPull?.ok))}
                    ${sourceFactsBlock("weread", [weread.itemId, weread.finishItemId, weread.notesItemId])}
                    <details class="lc-checkin__settings-fold" data-source-advanced><summary>${t("set.sourceAdvanced")}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><ol class="lc-checkin__source-steps"><li>${t("set.stepsWeread1")}</li><li>${t("set.stepsWeread2")}</li><li>${t("set.stepsWeread3")}</li><li>${t("set.stepsWeread4")}</li></ol>
                    <small class="lc-checkin__source-boundary">${t("set.wereadBoundary")}</small></details>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadItem")}</span><small>${t("set.wereadItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-weread-item aria-label="${t("set.wereadItem")}"><option value="">${t("set.wereadItemChoose")}</option>${wereadItemOptions(weread.itemId)}</select></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadFinishItem")}</span><small>${t("set.wereadFinishItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-weread-finish-item aria-label="${t("set.wereadFinishItem")}"><option value="">${t("set.wereadFinishItemChoose")}</option>${wereadItemOptions(weread.finishItemId)}</select></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadNotesItem")}</span><small>${t("set.wereadNotesItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-weread-notes-item aria-label="${t("set.wereadNotesItem")}"><option value="">${t("set.wereadNotesItemChoose")}</option>${wereadItemOptions(weread.notesItemId)}</select></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadKey")}</span><small>${t("set.wereadKeyHint")}${wereadKeySet ? ` · ${t("set.wereadKeySaved")}` : ""}</small></span><span class="lc-checkin__settings-inline"><input type="password" data-weread-key autocomplete="off" placeholder="${wereadKeySet ? "••••••••" : "wrk-…"}" aria-label="${t("set.wereadKey")}" /><button class="lc-checkin__text-button" type="button" data-action="clear-weread-key" ${wereadKeySet ? "" : "disabled"}>${t("set.wereadClearKey")}</button></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadThreshold")}</span><small>${t("set.wereadThresholdHint")}</small></span><span class="lc-checkin__settings-inline"><input type="number" min="1" max="1440" step="1" data-weread-threshold value="${weread.thresholdMinutes}" aria-label="${t("set.wereadThreshold")}" /><button class="lc-checkin__text-button" type="button" data-action="save-weread">${t("set.wereadSave")}</button></span></div>
                    <div class="lc-checkin__settings-row" data-weread-integration><span class="lc-checkin__settings-label"><span>${t("set.wereadTitle")}</span><small>${t("set.wereadHint")}${weread.enabled ? ` · ${t("set.wereadToday", {n: formatNumber(wereadTodayMinutes)})}` : ""}</small></span><input type="checkbox" class="lc-checkin__switch" data-weread-toggle ${weread.enabled ? "checked" : ""} aria-label="${t("set.wereadToggle")}" /></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadPull")}</span><small>${wereadPullStatus}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-action="weread-pull">${t("set.wereadPull")}</button></span></div>
                    </details>
                    <div class="lc-checkin__source-category" data-source-category="shared-doc">${t("set.sourceCategory.sharedDoc")}</div>
                    <details class="lc-checkin__source-panel" data-source-panel="health" data-source-state="${healthState}"${sourcePanelOpen("health")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("set.healthIntegration")}</strong><span class="lc-checkin__source-panel-meta">${(ctx.sourceTodayCounts?.health ?? 0) > 0 ? `<span class="lc-checkin__source-today">${t("set.sourceToday", {n: ctx.sourceTodayCounts!.health})}</span>` : ""}${sourceBadge(healthState)}</span></summary>
                    ${statusLine(integrationStatus(healthState, ctx.sourceTodayCounts?.health ?? 0, undefined, reportReadOk("health"), ctx.sourceIngestReports?.health?.outcome === "write-failed"))}
                    ${sourceFactsBlock("health", healthInbox.metricBindings.map(binding => binding.itemId))}
                    ${sourceReportLine("health")}
                    <details class="lc-checkin__settings-fold" data-source-advanced><summary>${t("set.sourceAdvanced")}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><ol class="lc-checkin__source-steps"><li>${t("set.stepsHealth1")}</li><li>${t("set.stepsHealth2")}</li><li>${t("set.stepsHealth3")}</li><li>${t("set.stepsHealth4")}</li></ol>
                    <small class="lc-checkin__source-boundary">${t("set.healthBoundary")}</small></details>
                    <div class="lc-checkin__document-target-card" data-document-target-card="health" data-target-state="${healthState}">
                        <div class="lc-checkin__document-target-heading"><div class="lc-checkin__document-target-copy"><strong>${t("set.healthDoc")}</strong><small>${t("set.healthDocHint")}${healthInbox.docId && !healthInbox.enabled ? ` · ${t("set.healthDocPending")}` : ""}</small></div>${sourceBadge(healthState)}</div>
                        ${targetSummaryRow("health", healthInbox.docId)}
                        ${scopeLineRow("health", "set.scope.health")}
                        ${documentChoiceBlock("health", t("set.documentChoiceSearch"))}
                        <div class="lc-checkin__document-target-id"><label class="lc-checkin__document-target-field"><span>${t("set.healthDoc")}</span><input type="text" data-health-doc value="${escapeHtml(healthInbox.docId)}" placeholder="20260101120000-xxxxxxxx" aria-label="${t("set.healthDoc")}" /></label><div class="lc-checkin__document-target-actions"><button class="lc-checkin__text-button" type="button" data-action="save-health-doc">${t("set.healthSave")}</button></div></div>
                    </div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.healthBindings")}</span><small>${t("set.healthBindingsHint")} ${t("set.healthItemHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-action="add-health-binding">${t("set.healthAddBinding")}</button></span></div>
                    <div data-health-bindings>${healthInbox.metricBindings.map((binding) => `<div class="lc-checkin__settings-row" data-health-binding><span class="lc-checkin__settings-inline"><select data-health-binding-metric aria-label="${t("set.healthBindingMetric")}"><option value="steps"${binding.metric === "steps" ? " selected" : ""}>${t("set.healthMetricSteps")}</option><option value="weight"${binding.metric === "weight" ? " selected" : ""}>${t("set.healthMetricWeight")}</option></select><select data-health-binding-item aria-label="${t("set.healthBindingItem")}"><option value="">${t("set.healthItemChoose")}</option>${healthItemOptions(binding.itemId)}</select><button class="lc-checkin__text-button" type="button" data-health-binding-remove aria-label="${t("set.healthBindingRemove")}">×</button></span></div>`).join("")}</div>
                    <template data-health-binding-template><div class="lc-checkin__settings-row" data-health-binding><span class="lc-checkin__settings-inline"><select data-health-binding-metric aria-label="${t("set.healthBindingMetric")}"><option value="steps" selected>${t("set.healthMetricSteps")}</option><option value="weight">${t("set.healthMetricWeight")}</option></select><select data-health-binding-item aria-label="${t("set.healthBindingItem")}"><option value="">${t("set.healthItemChoose")}</option>${healthItemOptions("")}</select><button class="lc-checkin__text-button" type="button" data-health-binding-remove aria-label="${t("set.healthBindingRemove")}">×</button></span></div></template>
                    <div class="lc-checkin__settings-row" data-health-inbox><span class="lc-checkin__settings-label"><span>${t("set.healthTitle")}</span><small>${t("set.healthHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-action="preview-source" data-source="health">${t("set.sourcePreview")}</button><button class="lc-checkin__text-button" type="button" data-action="refresh-source" data-source="health">${t("set.sourceReadNow")}</button><input type="checkbox" class="lc-checkin__switch" data-health-toggle ${healthInbox.enabled ? "checked" : ""} aria-label="${t("set.healthToggle")}" /></span></div>
                    ${sandboxBlock("health", "today.sandboxPlaceholder.health")}
                    </details>
                    <details class="lc-checkin__source-panel" data-source-panel="notequery" data-source-state="${noteQueryState}"${sourcePanelOpen("notequery")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("set.noteQueryIntegration")}</strong><span class="lc-checkin__source-panel-meta">${(ctx.sourceTodayCounts?.notequery ?? 0) > 0 ? `<span class="lc-checkin__source-today">${t("set.sourceToday", {n: ctx.sourceTodayCounts!.notequery})}</span>` : ""}${sourceBadge(noteQueryState)}</span></summary>
                    ${statusLine(integrationStatus(noteQueryState, ctx.sourceTodayCounts?.notequery ?? 0, undefined, reportReadOk("notequery"), ctx.sourceIngestReports?.notequery?.outcome === "write-failed"))}
                    ${sourceFactsBlock("notequery", [noteQuery.itemId])}
                    ${sourceReportLine("notequery")}
                    <details class="lc-checkin__settings-fold" data-source-advanced><summary>${t("set.sourceAdvanced")}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><ol class="lc-checkin__source-steps"><li>${t("set.stepsNoteQuery1")}</li><li>${t("set.stepsNoteQuery2")}</li><li>${t("set.stepsNoteQuery3")}</li></ol>
                    <small class="lc-checkin__source-boundary">${t("set.noteQueryBoundary")}</small></details>
                    ${scopeLineRow("notequery", "set.scope.notequery")}
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.noteQueryTemplate")}</span><small>${t("set.noteQueryTemplateHint")}</small></span><select data-note-query-template aria-label="${t("set.noteQueryTemplate")}"><option value="frontmatter"${noteQuery.template === "frontmatter" ? " selected" : ""}>${t("set.noteQueryFrontmatter")}</option><option value="tag"${noteQuery.template === "tag" ? " selected" : ""}>${t("set.noteQueryTag")}</option></select></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.noteQueryScope")}</span><small>${t("set.noteQueryScopeHint")}</small></span><span class="lc-checkin__settings-inline"><select data-note-query-scope aria-label="${t("set.noteQueryScope")}"><option value="notebook"${noteQuery.scope === "notebook" ? " selected" : ""}>${t("set.noteQueryNotebook")}</option><option value="document"${noteQuery.scope === "document" ? " selected" : ""}>${t("set.noteQueryDocument")}</option></select><input type="text" data-note-query-target value="${escapeHtml(noteQuery.targetId)}" placeholder="20260101120000-xxxxxxxx" aria-label="${t("set.noteQueryTarget")}" /></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.noteQueryItem")}</span><small>${t("set.noteQueryItemHint")}</small></span><select data-note-query-item aria-label="${t("set.noteQueryItem")}"><option value="">${t("set.noteQueryItemChoose")}</option>${projectOptions(noteQuery.itemId)}</select></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.noteQueryField")}</span><small>${t("set.noteQueryFieldHint")}</small></span><span class="lc-checkin__settings-inline"><input type="text" data-note-query-field value="${escapeHtml(noteQuery.field)}" maxlength="40" aria-label="${t("set.noteQueryField")}" /><input type="text" data-note-query-value value="${escapeHtml(noteQuery.value)}" maxlength="40" aria-label="${t("set.noteQueryValue")}" /></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.noteQueryTagField")}</span><small>${t("set.noteQueryTagHint")}</small></span><input type="text" data-note-query-tag value="${escapeHtml(noteQuery.tag)}" maxlength="40" aria-label="${t("set.noteQueryTagField")}" /></div>
                    <div class="lc-checkin__settings-row" data-note-query-integration><span class="lc-checkin__settings-label"><span>${t("set.noteQueryTitle")}</span><small>${t("set.noteQueryHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-action="save-note-query">${t("set.noteQuerySave")}</button><button class="lc-checkin__text-button" type="button" data-action="preview-source" data-source="notequery">${t("set.sourcePreview")}</button><button class="lc-checkin__text-button" type="button" data-action="refresh-source" data-source="notequery">${t("set.sourceReadNow")}</button><input type="checkbox" class="lc-checkin__switch" data-note-query-toggle ${noteQuery.enabled ? "checked" : ""} aria-label="${t("set.noteQueryToggle")}" /></span></div>
                    ${sandboxBlock("notequery", "today.sandboxPlaceholder.notequery")}
                    </details>
                    <details class="lc-checkin__source-panel" data-source-panel="yeguif" data-source-state="${yeguifState}"${sourcePanelOpen("yeguif")}>
                    <summary class="lc-checkin__source-panel-head"><strong>${t("set.yeguifIntegration")}</strong><span class="lc-checkin__source-panel-meta">${(ctx.sourceTodayCounts?.yeguif ?? 0) > 0 ? `<span class="lc-checkin__source-today">${t("set.sourceToday", {n: ctx.sourceTodayCounts!.yeguif})}</span>` : ""}${sourceBadge(yeguifState)}</span></summary>
                    ${statusLine(integrationStatus(yeguifState, ctx.sourceTodayCounts?.yeguif ?? 0, undefined, reportReadOk("yeguif"), ctx.sourceIngestReports?.yeguif?.outcome === "write-failed"))}
                    ${sourceFactsBlock("yeguif", yeguif.mappings?.length ? yeguif.mappings.map(mapping => mapping.itemId) : [yeguif.itemId])}
                    ${sourceReportLine("yeguif")}
                    <details class="lc-checkin__settings-fold" data-source-advanced><summary>${t("set.sourceAdvanced")}<span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><ol class="lc-checkin__source-steps"><li>${t("set.stepsYeguif1")}</li><li>${t("set.stepsYeguif2")}</li><li>${t("set.stepsYeguif3")}</li><li>${t("set.stepsYeguif4")}</li></ol>
                    <small class="lc-checkin__source-boundary">${t("set.yeguifBoundary")}</small></details>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.yeguifMappings")}</span><small>${t("set.yeguifMappingsHint")}</small>${yeguif.itemId && !yeguif.mappings?.length ? `<small class="is-warning">${t("set.yeguifLegacyIgnored")}</small>` : ""}</span><textarea data-yeguif-mappings rows="3" aria-label="${t("set.yeguifMappings")}" placeholder="${escapeHtml(t("set.yeguifMappingsPlaceholder"))}">${(yeguif.mappings || []).map((mapping) => {
                        const target = ctx.store.items.find((item) => item.id === mapping.itemId);
                        const names = target ? ctx.store.items.filter((item) => !item.archived && item.name === target.name) : [];
                        return `${escapeHtml(mapping.project)} = ${escapeHtml(target && names.length === 1 ? target.name : mapping.itemId)}`;
                    }).join("\n")}</textarea></div>
                    <div class="lc-checkin__notebook-target-card" data-document-target-card="yeguif" data-target-state="${yeguifState}">
                        <div class="lc-checkin__document-target-heading"><div class="lc-checkin__document-target-copy"><strong>${t("set.yeguifNotebook")}</strong><small>${t("set.yeguifNotebookHint")}${yeguif.notebookId && !yeguif.enabled ? ` · ${t("set.yeguifNotebookPending")}` : ""}</small></div>${sourceBadge(yeguifState)}</div>
                        ${scopeLineRow("yeguif", "set.scope.yeguif")}
                        <div class="lc-checkin__document-target-actions"><select data-yeguif-notebook aria-label="${t("set.yeguifNotebook")}"${yeguifNotebookDisabled}>${yeguifNotebookOption}</select><button class="lc-checkin__text-button" type="button" data-action="load-yeguif-notebooks">${t("set.yeguifNotebookLoad")}</button></div>
                    </div>
                    <div class="lc-checkin__settings-row" data-yeguif-integration><span class="lc-checkin__settings-label"><span>${t("set.yeguifTitle")}</span><small>${t("set.yeguifHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-action="preview-source" data-source="yeguif">${t("set.sourcePreview")}</button><button class="lc-checkin__text-button" type="button" data-action="refresh-source" data-source="yeguif">${t("set.sourceReadNow")}</button><input type="checkbox" class="lc-checkin__switch" data-yeguif-toggle ${yeguif.enabled ? "checked" : ""} aria-label="${t("set.yeguifToggle")}" /></span></div>
                    ${sandboxBlock("yeguif", "today.sandboxPlaceholder.yeguif")}
                    </details>
                    </details>`,
        },
        {
            id: "about",
            label: t("set.groupAbout"),
            body: `
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.versionLabel")}</span><small>${t("set.versionHint")}</small></span><span class="lc-checkin__settings-value">${PLUGIN_VERSION}</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.homepage")}</span><small>${t("set.homepageHint")}</small></span><a class="lc-checkin__settings-link" href="https://github.com/ai68298100/siyuan-checkin" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div>`,
        },
    ];
    return `<div class="lc-checkin lc-checkin--settings" data-appearance="${ctx.resolvedAppearanceValue}">
            ${renderPageShellHead({eyebrow: t("set.personal"), title: t("settings.title")})}
            <div class="lc-checkin__settings-feedback" data-settings-feedback role="status" aria-live="polite"></div>
            <label class="lc-checkin__settings-search">${t("set.search")}<input type="search" data-settings-search aria-label="${t("set.search")}" /></label>
            <div data-settings-search-status role="status" aria-live="polite"></div>
            ${(() => {
                const overview = ctx.settingsOverview;
                if (!overview) return "";
                /* T-1562 总览：只读聚合（待处理直达控件 / 最近活动 / 配置入口）；
                   文本插值嵌套 i18n（feature/source 名走各自键）。 */
                const problemText = (problem: NonNullable<SettingsViewContext["settingsOverview"]>["problems"][number]): string => {
                    if (problem.labelKey === "set.overviewTargetMissing") return t(problem.labelKey, {feature: t(problem.featureKey || "", problem.featureParams)});
                    if (problem.sourceKey) return t(problem.labelKey, {source: t(problem.sourceKey)});
                    if (problem.labelKey === "set.overviewWriteFailed") return t(problem.labelKey, {feature: t(problem.featureKey || "")});
                    return t(problem.labelKey, problem.featureParams as Record<string, string>);
                };
                const activityText = (activity: NonNullable<SettingsViewContext["settingsOverview"]>["activities"][number]): string => t(activity.labelKey, {feature: t(activity.featureKey)});
                const entries = [["set.overviewEntryNew", "new"], ["set.overviewEntrySources", "external"], ["set.overviewEntryDocs", "external"], ["set.overviewEntryData", "data"]] as const;
                return `<div class="lc-checkin__external-overview" data-settings-overview><strong>${t("set.overviewTitle")}</strong>${overview.problems.length ? overview.problems.map((problem) => `<div class="lc-checkin__settings-row" data-overview-problem="${escapeHtml(problem.key)}"><span class="lc-checkin__settings-label"><span>${escapeHtml(problemText(problem))}</span></span>${problem.selector ? `<button class="lc-checkin__text-button" type="button" data-goto-binding="${escapeHtml(problem.selector)}">${t("bind.locate")}</button>` : ""}</div>`).join("") : `<small data-overview-clear>${t("set.overviewAllClear")}</small>`}<strong>${t("set.overviewRecentTitle")}</strong>${overview.activities.length ? overview.activities.map((activity) => `<small data-overview-activity="${escapeHtml(activity.key)}">${escapeHtml(activityText(activity))}</small>`).join("") : `<small data-overview-activity-empty>${t("set.writeResultNone")}</small>`}<strong>${t("set.overviewEntriesTitle")}</strong><span class="lc-checkin__settings-inline">${entries.map(([labelKey, target]) => target === "new" ? `<button class="lc-checkin__text-button" type="button" data-overview-new-item>${t(labelKey)}</button>` : `<button class="lc-checkin__text-button" type="button" data-overview-jump="${target}">${t(labelKey)}</button>`).join("")}</span></div>`;
            })()}
            ${(() => {
                /* T-1521 保存前变更清单：草稿≠已保存才显示；敏感值遮罩；撤回/分节恢复走草稿通道。 */
                const sections = ctx.settingsChangeSections || [];
                if (!sections.length) return `<p class="lc-checkin__change-empty" data-settings-change-empty role="status">${t("set.changeNone")}</p>`;
                const sectionBlocks = sections.map((section) => `<div class="lc-checkin__change-section" data-change-section="${section.sectionId}"><div class="lc-checkin__change-section-head"><strong>${t(section.labelKey)}</strong><button class="lc-checkin__text-button" type="button" data-revert-section="${section.sectionId}">${t("set.changeRevertSection")}</button></div>${section.entries.map((entry) => `<div class="lc-checkin__change-row"><span>${t(entry.labelKey)}</span><span class="lc-checkin__change-values"><s>${entry.saved}</s> → ${entry.draft}</span><button class="lc-checkin__text-button" type="button" data-revert-setting="${entry.attribute}">${t("set.changeRevertOne")}</button></div>`).join("")}</div>`).join("");
                const total = sections.reduce((sum, section) => sum + section.entries.length, 0);
                return `<details class="lc-checkin__change-list" data-settings-change-list open><summary><span>${t("set.changeTitle", {n: total})}</span><small>${t("set.changeDraftHint")}</small></summary><div class="lc-checkin__change-body">${sectionBlocks}</div></details>`;
            })()}
            ${(() => {
                /* T-1522 迁移重名冲突决策面板：仅在有同名冲突的导入会话时渲染。 */
                const conflicts = ctx.importConflicts;
                if (!conflicts) return "";
                const rows = conflicts.decisions.map((decision) => {
                    const reason = decision.incompatibility === "unit" ? t("set.importIncompatibleUnit") : decision.incompatibility === "kind" ? t("set.importIncompatibleKind") : "";
                    const radios: Array<[string, string, boolean]> = [
                        ["merge", t("set.importConflictMerge"), decision.mergeCompatible],
                        ["createNew", t("set.importConflictCreateNew", {name: decision.createNewName}), true],
                        ["skip", t("set.importConflictSkip"), true],
                    ];
                    const radiosMarkup = radios.map(([value, label, enabled]) => `<label class="lc-checkin__import-option"><input type="radio" name="conflict-${escapeHtml(decision.name)}" value="${value}" data-conflict-name="${escapeHtml(decision.name)}" ${decision.disposition === value ? "checked" : ""} ${enabled ? "" : "disabled"} />${escapeHtml(label)}</label>`).join("");
                    return `<div class="lc-checkin__import-row"><strong>${escapeHtml(decision.name)}</strong><span class="lc-checkin__import-meta">${escapeHtml(t("set.importConflictMeta", {sourceUnit: decision.sourceUnit, existingUnit: decision.existingUnit, dates: decision.dateCount}))}${reason ? ` · ${escapeHtml(reason)}` : ""}</span><span class="lc-checkin__import-radios">${radiosMarkup}</span></div>`;
                }).join("");
                return `<details class="lc-checkin__conflict-panel" data-import-conflict-panel open><summary><span>${t("set.importConflictTitle", {n: conflicts.decisions.length})}</span><small>${t("set.importConflictHint")}</small></summary><div class="lc-checkin__import-list">${rows}</div><div class="lc-checkin__share-actions"><button class="lc-checkin__text-button" type="button" data-import-conflict-confirm>${t("set.importConflictConfirm")}</button><button class="lc-checkin__text-button" type="button" data-import-conflict-cancel>${t("editor.importCancel")}</button></div></details>`;
            })()}
            <div class="lc-checkin__settings-layout">
                <nav class="lc-checkin__settings-nav" aria-label="${t("set.groupsAria")}">${groups.map((group, index) => `<button type="button" data-settings-nav="${group.id}" aria-controls="${settingsViewId}-group-${group.id}" class="${index === 0 ? "is-active" : ""}" aria-current="${index === 0 ? "true" : "false"}">${group.label}</button>`).join("")}</nav>
                <div class="lc-checkin__settings-groups">${groups.map((group) => `<section id="${settingsViewId}-group-${group.id}" class="lc-checkin__settings-card" data-settings-group="${group.id}" aria-labelledby="${settingsViewId}-heading-${group.id}"><h2 id="${settingsViewId}-heading-${group.id}">${group.label}</h2>${group.body}</section>`).join("")}</div>
            </div>
        </div>`;
}
