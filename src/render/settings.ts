/* 设置页视图：从 index.ts 外置；依赖以 SettingsViewContext 显式传入。 */
import {t} from "../i18n";
import {escapeHtml, formatNumber} from "../shared";
import {SORT_LABELS} from "../ui/labels";
import {PLUGIN_VERSION} from "../version";
import type {CheckinAppearance, CheckinPalette, DialogSizeMode, FocusTimerProvider, PluginLanguageSetting, TodayGroupMode} from "../view-preferences";
import type {CheckinItemSortMode, CheckinStore} from "../types";
import type {DockTomatoCompletionIssue, DockTomatoCompletionIssueReason, DockTomatoProviderDiagnostics, DockTomatoProviderState} from "../dock-tomato";
import {dockTomatoCompletionValue, type DockTomatoInboxEntryView} from "../features/docktomato-inbox";
import {collectAnchorChoices} from "../features/note-anchor-picker";

const AVATAR_PRESETS = [
    ["check", "set.avatarPresetCheck"],
    ["star", "set.avatarPresetStar"],
    ["horse", "set.avatarPresetHorse"],
    ["leaf", "set.avatarPresetLeaf"],
    ["sun", "set.avatarPresetSun"],
    ["target", "set.avatarPresetTarget"],
] as const;

let settingsViewSequence = 0;

export interface SettingsViewContext {
    store: CheckinStore;
    auditEntries: Array<{type: "conflict" | "merge" | "restore" | "migration" | "anchor"; at: string; details: Record<string, unknown>}>;
    snapshots: Array<{index: number; capturedAt?: string; legacy: boolean; itemCount: number; eventCount: number}>;
    customIconLibrary: string[];
    agentCapability: {state: "pending" | "registered" | "unsupported" | "failed"; count: number; error?: string};
    appearance: CheckinAppearance;
    pluginLanguage: PluginLanguageSetting;
    reducedMotion: boolean;
    hapticFeedback: boolean;
    /** T-1421 提醒安静时段（可选：旧桩/旧上下文缺省按关闭处理）。 */
    reminderQuietHours?: {enabled: boolean; start: string; end: string};
    /** T-1451 每日提醒调度。 */
    dailyReminder?: {enabled: boolean; slots: string[]};
    focusTimerProvider: FocusTimerProvider;
    focusTimerAdapterCount?: number;
    focusTimerAdapterIds?: readonly string[];
    focusTimerBusy?: boolean;
    dockTomatoDiagnostics?: DockTomatoProviderDiagnostics;
    dockTomatoCompletionIssues?: readonly DockTomatoCompletionIssue[];
    dockTomatoInbox?: {capacity: number; entries: readonly DockTomatoInboxEntryView[]};
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
    /** T-1403 健康收件箱（opt-in 默认关）。 */
    healthInbox: {enabled: boolean; docId: string; stepsItemId: string; weightItemId: string};
    /** T-1402 微信读书联动（opt-in 默认关）；Key 不进渲染上下文，只暴露 wereadKeySet。 */
    wereadIntegration: {enabled: boolean; itemId: string; thresholdMinutes: number; finishItemId: string; notesItemId: string};
    wereadKeySet: boolean;
    wereadLastPull?: {ok: boolean; days: number; written: number; error?: string; upgrade?: string};
    wereadTodayMinutes: number;
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
    /* T-1353：摘要驻留缺省值，同上。 */
    const summaryResident = ctx.summaryResident || {enabled: false, docId: ""};
    /* T-1384：思阅联动缺省值，同上。 */
    const sireader = ctx.sireaderIntegration || {enabled: false, itemId: "", thresholdMinutes: 30};
    const sireaderItemOptions = ctx.store.items.filter((item) => !item.archived).slice(0, 200)
        .map((item) => `<option value="${escapeHtml(item.id)}"${item.id === sireader.itemId ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
    /* T-1385：思播联动缺省值，同上。 */
    const siplayer = ctx.siplayerIntegration || {enabled: false, itemId: "", thresholdMinutes: 30};
    const siplayerTodayMinutes = ctx.siplayerTodayMinutes ?? 0;
    const sireaderTodayMinutes = ctx.sireaderTodayMinutes ?? 0;
    const siplayerItemOptions = ctx.store.items.filter((item) => !item.archived).slice(0, 200)
        .map((item) => `<option value="${escapeHtml(item.id)}"${item.id === siplayer.itemId ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
    /* T-1403：健康收件箱缺省值，同上。 */
    const healthInbox = ctx.healthInbox || {enabled: false, docId: "", stepsItemId: "", weightItemId: ""};
    /* T-1402：微信读书联动缺省值，同上；Key 只呈现「已保存」状态。 */
    const weread = ctx.wereadIntegration || {enabled: false, itemId: "", thresholdMinutes: 30, finishItemId: "", notesItemId: ""};
    const wereadKeySet = ctx.wereadKeySet ?? false;
    const wereadTodayMinutes = ctx.wereadTodayMinutes ?? 0;
    const wereadItemOptions = ctx.store.items.filter((item) => !item.archived).slice(0, 200)
        .map((item) => `<option value="${escapeHtml(item.id)}"${item.id === weread.itemId ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
    const wereadPullStatus = ctx.wereadLastPull
        ? (ctx.wereadLastPull.ok
            ? t("set.wereadPullOk", {days: ctx.wereadLastPull.days, written: ctx.wereadLastPull.written})
            : t("set.wereadPullFail", {message: `${ctx.wereadLastPull.error || ""}${ctx.wereadLastPull.upgrade ? ` · ${ctx.wereadLastPull.upgrade}` : ""}`}))
        : t("set.wereadPullIdle");
    /* T-1386：外部来源面板摘要——启用中的联动数量。 */
    const extSourcesEnabled = [diary.enabled, summaryResident.enabled, sireader.enabled, siplayer.enabled, healthInbox.enabled, weread.enabled].filter(Boolean).length;
    const healthItemOptions = (selectedId: string) => ctx.store.items.filter((item) => !item.archived).slice(0, 200)
        .map((item) => `<option value="${escapeHtml(item.id)}"${item.id === selectedId ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
    const diaryChoices = collectAnchorChoices(ctx.store.items);
    const diaryChoiceOptions = diaryChoices.map((choice) => `<option value="${escapeHtml(choice.blockId)}">${escapeHtml(choice.labels.join("、") || choice.blockId)}</option>`).join("");
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
            id: "appearance",
            label: t("set.groupAppearance"),
            body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.theme")}</span><small>${t("set.themeHint")}</small></span><select data-setting-appearance aria-label="${t("set.theme")}"><option value="system" ${ctx.appearance === "system" ? "selected" : ""}>${t("set.themeSystem")}</option><option value="light" ${ctx.appearance === "light" ? "selected" : ""}>${t("set.themeLight")}</option><option value="dark" ${ctx.appearance === "dark" ? "selected" : ""}>${t("set.themeDark")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.language")}</span><small>${t("set.languageHint")}</small></span><select data-setting-language aria-label="${t("set.language")}"><option value="zh-CN" ${ctx.pluginLanguage === "zh-CN" ? "selected" : ""}>${t("set.languageZh")}</option><option value="en-US" ${ctx.pluginLanguage === "en-US" ? "selected" : ""}>${t("set.languageEn")}</option><option value="follow" ${ctx.pluginLanguage === "follow" ? "selected" : ""}>${t("set.languageFollow")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reduceMotion")}</span><small>${t("set.reduceMotionHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-motion ${ctx.reducedMotion ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.haptic")}</span><small>${t("set.hapticHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-haptic ${ctx.hapticFeedback ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.accent")}</span><small>${t("set.accentHint")}</small></span><select data-setting-palette aria-label="${t("set.accent")}"><option value="lavender"${ctx.palette === "lavender" ? " selected" : ""}>${t("set.paletteLavender")}</option><option value="ocean"${ctx.palette === "ocean" ? " selected" : ""}>${t("set.paletteOcean")}</option><option value="forest"${ctx.palette === "forest" ? " selected" : ""}>${t("set.paletteForest")}</option><option value="sunset"${ctx.palette === "sunset" ? " selected" : ""}>${t("set.paletteSunset")}</option></select></label>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.avatar")}</span><small>${t("set.avatarHint")}</small></span><span class="lc-checkin__settings-inline"><select data-setting-avatar aria-label="${t("set.avatarPresetAria")}"><option value=""${AVATAR_PRESETS.some(([value]) => value === (ctx.avatar || "check")) ? "" : " selected"}>${t("set.avatarCustomOption")}</option>${AVATAR_PRESETS.map(([value, label]) => `<option value="${value}"${value === (ctx.avatar || "check") ? " selected" : ""}>${t(label)}</option>`).join("")}</select><input data-setting-avatar-custom type="text" maxlength="8" value="${!AVATAR_PRESETS.some(([value]) => value === (ctx.avatar || "check")) ? escapeHtml(ctx.avatar || "") : ""}" placeholder="${t("set.avatarCustomPlaceholder")}" aria-label="${t("set.avatarCustomAria")}" /><input data-setting-avatar-file type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="${t("set.avatarUploadAria")}" />${ctx.avatarImage ? `<small>${t("set.avatarPhotoActive")}</small><button class="lc-checkin__text-button" type="button" data-setting-avatar-edit>${t("set.avatarEdit")}</button><button class="lc-checkin__text-button" type="button" data-setting-avatar-clear>${t("set.avatarClear")}</button>` : ""}</span></div>`,
        },
        {
            id: "today",
            label: t("set.groupToday"),
            body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.groupModeLabel")}</span><small>${t("set.groupModeHint")}</small></span><select data-setting-group aria-label="${t("set.groupModeLabel")}"><option value="none"${ctx.todayGroupMode === "none" ? " selected" : ""}>${t("set.groupNone")}</option><option value="group"${ctx.todayGroupMode === "group" ? " selected" : ""}>${t("set.groupCustom")}</option><option value="time" ${ctx.todayGroupMode === "time" ? "selected" : ""}>${t("set.groupTime")}</option><option value="priority" ${ctx.todayGroupMode === "priority" ? "selected" : ""}>${t("set.groupPriority")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.sortModeLabel")}</span><small>${t("set.sortModeHint")}</small></span><select data-setting-sort aria-label="${t("set.sortModeLabel")}">${Object.entries(SORT_LABELS).map(([value, label]) => `<option value="${value}" ${ctx.todaySortMode === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.expandCompleted")}</span><small>${t("set.expandCompletedHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-completed ${!ctx.completedCollapsed ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.weekStrip")}</span><small>${t("set.weekStripHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-weekstrip ${ctx.weekStripVisible ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reminderQuiet")}</span><small>${t("set.reminderQuietHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-quiet ${ctx.reminderQuietHours?.enabled ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reminderQuietWindow")}</span><small>${t("set.reminderQuietWindowHint")}</small></span><span class="lc-checkin__settings-inline"><input data-setting-quiet-start type="time" value="${ctx.reminderQuietHours?.start || "22:00"}" aria-label="${t("set.reminderQuietStartAria")}" />${t("set.reminderQuietUntil")}<input data-setting-quiet-end type="time" value="${ctx.reminderQuietHours?.end || "07:00"}" aria-label="${t("set.reminderQuietEndAria")}" /></span></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reminderSchedule")}</span><small>${t("set.reminderScheduleHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-reminder-toggle ${ctx.dailyReminder?.enabled !== false ? "checked" : ""} aria-label="${t("set.reminderSchedule")}" /></label>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reminderScheduleSlots")}</span><small>${t("set.reminderScheduleSlotsHint")}</small></span><span class="lc-checkin__settings-inline"><input type="text" data-setting-reminder-slots value="${escapeHtml((ctx.dailyReminder?.slots || []).join(", "))}" placeholder="09:00, 21:00" aria-label="${t("set.reminderScheduleSlots")}" /><button class="lc-checkin__text-button" type="button" data-action="save-reminder-slots">${t("set.reminderScheduleSave")}</button></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.resetView")}</span><small>${t("set.resetViewHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="reset-view-preferences">${t("set.reset")}</button></div>`,
        },
        {
            id: "dialog",
            label: t("set.groupDialog"),
            body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.dialogSize")}</span><small>${t("set.dialogSizeHint")}</small></span><select data-setting-dialog-mode aria-label="${t("set.dialogSize")}"><option value="auto" ${ctx.dialogSizeMode === "auto" ? "selected" : ""}>${t("set.dialogAuto")}</option><option value="percent" ${ctx.dialogSizeMode === "percent" ? "selected" : ""}>${t("set.dialogPercent")}</option><option value="fullscreen" ${ctx.dialogSizeMode === "fullscreen" ? "selected" : ""}>${t("set.dialogFullscreen")}</option><option value="fixed" ${ctx.dialogSizeMode === "fixed" ? "selected" : ""}>${t("set.dialogFixed")}</option></select></label>
                    <label class="lc-checkin__settings-row" data-dialog-scale-row ${ctx.dialogSizeMode === "percent" ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.scaleLabel")}</span><small>${t("set.scaleCurrent", {n: ctx.dialogScale})}</small></span><input type="range" min="50" max="100" step="5" value="${ctx.dialogScale}" data-setting-dialog-scale aria-label="${t("set.scaleLabel")}" /></label>
                    <div class="lc-checkin__settings-row" data-dialog-reset-row ${ctx.dialogSizeMode === "auto" && ctx.dialogHasCustomFrame ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.dialogFrame")}</span><small>${t("set.dialogFrameHint")}</small></span><button type="button" class="lc-checkin__small-button" data-action="reset-dialog-frame">${t("set.dialogFrameReset")}</button></div>
                    <div class="lc-checkin__settings-row" data-dialog-fixed-row ${ctx.dialogSizeMode === "fixed" ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.fixedWH")}</span><small>${t("set.fixedWHHint")}</small></span><span class="lc-checkin__settings-inline"><input type="number" min="320" max="2560" step="20" value="${ctx.dialogFixedSize.width}" data-setting-dialog-width aria-label="${t("set.dialogWidthAria")}" aria-describedby="${settingsViewId}-dialog-size-separator" /><span id="${settingsViewId}-dialog-size-separator">×</span><input type="number" min="240" max="2048" step="20" value="${ctx.dialogFixedSize.height}" data-setting-dialog-height aria-label="${t("set.dialogHeightAria")}" aria-describedby="${settingsViewId}-dialog-size-separator" /></span></div>`,
        },
        {
            id: "shortcuts",
            label: t("set.groupShortcuts"),
            body: `
                    ${kbdRow(t("set.shortcutsOpen"), t("set.shortcutsOpenHint"), ["Alt", "Shift", "C"])}
                    ${kbdRow(t("set.shortcutsQuick"), t("set.shortcutsQuickHint"), ["Alt", "1-9"])}
                    ${kbdRow(t("set.shortcutsReorder"), t("set.shortcutsReorderHint"), ["Alt", "↑ / ↓"])}`,
        },
        {
            id: "data",
            label: t("set.groupData"),
            body: `
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.exportRecords")}</span><small>${t("set.exportHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="review">${t("set.openReview")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.storageLabel")}</span><small>${t("set.storageDetail", {items: ctx.store.items.length, events: ctx.store.events.length})}${photoEvents.length ? ` · ${t("set.photosDetail", {n: photoEvents.length, kb: photoKb})}` : ""}${iconKb ? ` · ${t("set.iconsDetail", {kb: iconKb})}` : ""}。</small></span><span class="lc-checkin__settings-value">${storageKb} KB</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importJson")}</span><small>${t("set.importJsonHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-json" data-import-json accept=".json,application/json" />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.restoreSnapshot")}</span><small>${t("set.restoreSnapshotHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="restore-backup">${t("set.restoreSnapshotBtn")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.snapshotManage")}</span><small>${t("set.snapshotManageHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-action="export-snapshots" ${ctx.snapshots.length ? "" : "disabled"}>${t("set.snapshotExport")}</button><button class="lc-checkin__text-button" type="button" data-action="clear-snapshots" ${ctx.snapshots.length ? "" : "disabled"}>${t("set.snapshotClear")}</button></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.snapshotImport")}</span><small>${t("set.snapshotImportHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-snapshots" data-import-snapshots accept=".json,application/json" />${t("set.chooseFile")}</label></div>
                    ${snapshotRows ? `<div class="lc-checkin__audit-list lc-checkin__snapshot-list"><ul>${snapshotRows}</ul></div>` : ""}
                    <details class="lc-checkin__settings-fold" data-recovery-guide><summary>${t("set.recoveryGuide")} · <small>${t("set.recoveryGuideHint")}</small><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><ul class="lc-checkin__recovery-list"><li>${t("set.recoveryPoints")}</li><li>${t("set.recoveryBackup")}</li><li>${t("set.recoveryCorruption")}</li><li>${t("set.recoveryWindows")}</li><li>${t("set.recoveryInbox")}</li><li>${t("set.recoveryDiagnostics")}</li></ul></details>
                    <div class="lc-checkin__settings-row" data-diagnostics><span class="lc-checkin__settings-label"><span>${t("set.diagnosticsTitle")}</span><small>${escapeHtml(ctx.latestDiagnosticText || t("set.diagnosticsEmpty"))}</small></span><span class="lc-checkin__settings-inline"><span class="lc-checkin__settings-value ${ctx.diagnosticsCount ? "is-muted" : ""}">${t("set.diagnosticsCount", {n: ctx.diagnosticsCount})}</span><button class="lc-checkin__text-button" type="button" data-action="export-diagnostics" ${ctx.diagnosticsCount ? "" : "disabled"} aria-label="${t("set.diagnosticsExport")}">${t("set.diagnosticsExport")}</button></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.audit")}</span><small>${t("set.auditHint")}</small></span><span class="lc-checkin__settings-inline"><button class="lc-checkin__text-button" type="button" data-action="export-audit" ${ctx.auditEntries.length ? "" : "disabled"}>${t("set.exportAudit")}</button><button class="lc-checkin__text-button" type="button" data-action="clear-audit" ${ctx.auditEntries.length ? "" : "disabled"}>${t("set.clearAudit")}</button></span></div>
                    <div class="lc-checkin__audit-list" aria-label="${t("set.audit")}">${auditRows ? `<ul>${auditRows}</ul>` : `<small>${t("set.auditEmpty")}</small>`}</div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importCsv")}</span><small>${t("set.importCsvHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-csv" data-import-csv accept=".csv,text/csv" />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importLoop")}</span><small>${t("set.importLoopHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-loop" data-import-loop accept=".csv,text/csv" multiple />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importObsidian")}</span><small>${t("set.importObsidianHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-action="import-obsidian" data-import-obsidian accept=".md,text/markdown" multiple />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.exportLoop")}</span><small>${t("set.exportLoopHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="export-loop">${t("set.exportLoopBtn")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.exportObsidian")}</span><small>${t("set.exportObsidianHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="export-obsidian">${t("set.exportObsidianBtn")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.resetPrefs")}</span><small>${t("set.resetPrefsHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="reset-all-preferences">${t("set.resetDefaults")}</button></div>`,
        },
        {
            id: "integrations",
            label: t("set.groupIntegrations"),
            body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.tomatoDefault")}</span><small>${t("set.tomatoDefaultHint")}</small></span><select data-setting-focus-timer aria-label="${t("set.tomatoDefault")}"><option value="builtin" ${ctx.focusTimerProvider === "builtin" ? "selected" : ""}>${t("set.tomatoBuiltin")}</option><option value="docktomato" ${ctx.focusTimerProvider === "docktomato" ? "selected" : ""}>${t("set.tomatoPlugin")}</option></select></label>
                    <div class="lc-checkin__settings-row" data-focus-provider-state="${diagnosticState}" data-dependency="docktomato" data-dependency-state="${tomatoDependencyState}"><span class="lc-checkin__settings-label"><span>${t("set.tomato")}</span><small>${t("set.tomatoHint")}</small><small>${tomatoDiagnosticDetail}</small><small class="lc-checkin__dependency-recovery">${t("set.tomatoRecovery")}</small></span><span class="lc-checkin__settings-inline"><span class="lc-checkin__settings-value ${tomatoHealthy ? "is-success" : "is-muted"}" role="status">${tomatoStatus}</span>${tomatoFallback}</span></div>
                    ${completionIssueRow}
                    ${inboxRows}
                    <div class="lc-checkin__settings-row" data-agent-state="${ctx.agentCapability.state}" data-dependency="agent" data-dependency-state="${agentDependencyState}"><span class="lc-checkin__settings-label"><span>${t("set.agent")}</span><small>${t("set.agentHint")}</small><small class="lc-checkin__dependency-recovery">${t("set.agentRecovery")}</small>${agentWhere}</span><span class="lc-checkin__settings-value ${ctx.agentCapability.state === "registered" ? "is-success" : ctx.agentCapability.state === "failed" ? "is-error" : "is-muted"}" role="status">${agentStatus}</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.agentAuditTitle")}</span><small>${t("set.agentAuditHint")}</small></span><span class="lc-checkin__settings-inline"><span class="lc-checkin__settings-value ${ctx.suggestionWorkflowAudits ? "is-muted" : ""}">${t("set.agentAuditCount", {n: ctx.suggestionWorkflowAudits})}</span><button class="lc-checkin__text-button" type="button" data-action="export-agent-audit" ${ctx.suggestionWorkflowAudits ? "" : "disabled"} aria-label="${t("set.agentAuditExport")}">${t("set.agentAuditExport")}</button></span></div>
                    <div class="lc-checkin__settings-row" data-dependency="taskhorizon" data-dependency-state="healthy"><span class="lc-checkin__settings-label"><span>${t("set.thTitle")}</span><small>${t("set.thHint")}</small><small class="lc-checkin__dependency-recovery">${t("set.thRecovery")}</small></span><span class="lc-checkin__settings-value is-success" role="status">${t("set.thStatus")}</span></div>
                    <details class="lc-checkin__settings-group" data-external-sources>
                    <summary><span>${t("set.extSourcesTitle")}</span><span class="lc-checkin__settings-group-badge">${t("set.extSourcesCount", {n: extSourcesEnabled})}</span></summary>
                    <div class="lc-checkin__settings-row"><small class="lc-checkin__dependency-recovery">${t("set.extSourcesSetupHint")}</small></div>
                    <div class="lc-checkin__settings-subheader">${t("set.diaryIntegration")}</div>
                    <div class="lc-checkin__settings-row" data-diary-integration><span class="lc-checkin__settings-label"><span>${t("set.diaryTitle")}</span><small>${t("set.diaryHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-diary-toggle ${diary.enabled ? "checked" : ""} aria-label="${t("set.diaryToggle")}" /></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.diaryDoc")}</span><small>${t("set.diaryDocHint")}${diary.docId && !diary.enabled ? ` · ${t("set.diaryDocPending")}` : ""}</small></span><span class="lc-checkin__settings-inline lc-checkin__diary-doc-controls"><input type="search" data-diary-search placeholder="${t("set.diaryDocChoose")}" aria-label="${t("set.diaryDocChoose")}" /><select data-diary-choice aria-label="${t("set.diaryDocChoose")}"><option value="">${t("set.diaryDocChoose")}</option>${diaryChoiceOptions}</select><input type="text" class="lc-checkin__diary-doc" data-diary-doc value="${escapeHtml(diary.docId)}" placeholder="20260101120000-xxxxxxxx" aria-label="${t("set.diaryDoc")}" /><button class="lc-checkin__text-button" type="button" data-action="save-diary-doc">${t("set.diarySave")}</button><button class="lc-checkin__text-button" type="button" data-action="toggle-create-diary-doc">${t("set.diaryCreate")}</button></span><div class="lc-checkin__diary-create" data-diary-create hidden><label><span>${t("set.diaryNotebook")}</span><select data-diary-notebook aria-label="${t("set.diaryNotebook")}" disabled><option value="">${t("set.diaryNotebookLoading")}</option></select></label><label><span>${t("set.diaryCreateTitle")}</span><input type="text" data-diary-create-title placeholder="${t("set.diaryCreateTitle")}" aria-label="${t("set.diaryCreateTitle")}" /></label><button class="lc-checkin__text-button" type="button" data-action="create-diary-doc">${t("common.confirm")}</button></div></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.diaryWriteNow")}</span><small>${t("set.diaryWriteNowHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="write-diary-report" ${diary.enabled && diary.docId ? "" : "disabled"}>${t("set.diaryWriteNow")}</button></div>
                    <div class="lc-checkin__settings-subheader">${t("set.summaryIntegration")}</div>
                    <div class="lc-checkin__settings-row" data-summary-resident><span class="lc-checkin__settings-label"><span>${t("set.summaryTitle")}</span><small>${t("set.summaryHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-summary-toggle ${summaryResident.enabled ? "checked" : ""} aria-label="${t("set.summaryToggle")}" /></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.summaryDoc")}</span><small>${t("set.summaryDocHint")}${summaryResident.docId && !summaryResident.enabled ? ` · ${t("set.summaryDocPending")}` : ""}</small></span><span class="lc-checkin__settings-inline"><input type="text" data-summary-doc value="${escapeHtml(summaryResident.docId)}" placeholder="20260101120000-xxxxxxxx" aria-label="${t("set.summaryDoc")}" /><button class="lc-checkin__text-button" type="button" data-action="save-summary-doc">${t("set.summarySave")}</button></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.summaryWriteNow")}</span><small>${t("set.summaryWriteNowHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="write-summary-now" ${summaryResident.enabled && summaryResident.docId ? "" : "disabled"}>${t("set.summaryWriteNow")}</button></div>
                    <div class="lc-checkin__settings-subheader">${t("set.sireaderIntegration")}</div>
                    <div class="lc-checkin__settings-row" data-sireader-integration><span class="lc-checkin__settings-label"><span>${t("set.sireaderTitle")}</span><small>${t("set.sireaderHint")}${sireader.enabled ? ` · ${t("set.sireaderToday", {n: formatNumber(sireaderTodayMinutes)})}` : ""}</small></span><input type="checkbox" class="lc-checkin__switch" data-sireader-toggle ${sireader.enabled ? "checked" : ""} aria-label="${t("set.sireaderToggle")}" /></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.sireaderItem")}</span><small>${t("set.sireaderItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-sireader-item aria-label="${t("set.sireaderItem")}"><option value="">${t("set.sireaderItemChoose")}</option>${sireaderItemOptions}</select></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.sireaderThreshold")}</span><small>${t("set.sireaderThresholdHint")}</small></span><span class="lc-checkin__settings-inline"><input type="number" min="1" max="1440" step="1" data-sireader-threshold value="${sireader.thresholdMinutes}" aria-label="${t("set.sireaderThreshold")}" /><button class="lc-checkin__text-button" type="button" data-action="save-sireader">${t("set.sireaderSave")}</button></span></div>
                    <div class="lc-checkin__settings-subheader">${t("set.healthIntegration")}</div>
                    <div class="lc-checkin__settings-row" data-health-inbox><span class="lc-checkin__settings-label"><span>${t("set.healthTitle")}</span><small>${t("set.healthHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-health-toggle ${healthInbox.enabled ? "checked" : ""} aria-label="${t("set.healthToggle")}" /></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.healthDoc")}</span><small>${t("set.healthDocHint")}${healthInbox.docId && !healthInbox.enabled ? ` · ${t("set.healthDocPending")}` : ""}</small></span><span class="lc-checkin__settings-inline"><input type="text" data-health-doc value="${escapeHtml(healthInbox.docId)}" placeholder="20260101120000-xxxxxxxx" aria-label="${t("set.healthDoc")}" /><button class="lc-checkin__text-button" type="button" data-action="save-health-doc">${t("set.healthSave")}</button></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.healthStepsItem")}</span><small>${t("set.healthItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-health-steps-item aria-label="${t("set.healthStepsItem")}"><option value="">${t("set.healthItemChoose")}</option>${healthItemOptions(healthInbox.stepsItemId)}</select></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.healthWeightItem")}</span><small>${t("set.healthItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-health-weight-item aria-label="${t("set.healthWeightItem")}"><option value="">${t("set.healthItemChoose")}</option>${healthItemOptions(healthInbox.weightItemId)}</select></span></div>
                    <div class="lc-checkin__settings-subheader">${t("set.siplayerIntegration")}</div>
                    <div class="lc-checkin__settings-row" data-siplayer-integration><span class="lc-checkin__settings-label"><span>${t("set.siplayerTitle")}</span><small>${t("set.siplayerHint")}${siplayer.enabled ? ` · ${t("set.siplayerToday", {n: formatNumber(siplayerTodayMinutes)})}` : ""}</small></span><input type="checkbox" class="lc-checkin__switch" data-siplayer-toggle ${siplayer.enabled ? "checked" : ""} aria-label="${t("set.siplayerToggle")}" /></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.siplayerItem")}</span><small>${t("set.siplayerItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-siplayer-item aria-label="${t("set.siplayerItem")}"><option value="">${t("set.siplayerItemChoose")}</option>${siplayerItemOptions}</select></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.siplayerThreshold")}</span><small>${t("set.siplayerThresholdHint")}</small></span><span class="lc-checkin__settings-inline"><input type="number" min="1" max="1440" step="1" data-siplayer-threshold value="${siplayer.thresholdMinutes}" aria-label="${t("set.siplayerThreshold")}" /><button class="lc-checkin__text-button" type="button" data-action="save-siplayer">${t("set.siplayerSave")}</button></span></div>
                    <div class="lc-checkin__settings-subheader">${t("set.wereadIntegration")}</div>
                    <div class="lc-checkin__settings-row" data-weread-integration><span class="lc-checkin__settings-label"><span>${t("set.wereadTitle")}</span><small>${t("set.wereadHint")}${weread.enabled ? ` · ${t("set.wereadToday", {n: formatNumber(wereadTodayMinutes)})}` : ""}</small></span><input type="checkbox" class="lc-checkin__switch" data-weread-toggle ${weread.enabled ? "checked" : ""} aria-label="${t("set.wereadToggle")}" /></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadItem")}</span><small>${t("set.wereadItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-weread-item aria-label="${t("set.wereadItem")}"><option value="">${t("set.wereadItemChoose")}</option>${wereadItemOptions}</select></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadFinishItem")}</span><small>${t("set.wereadFinishItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-weread-finish-item aria-label="${t("set.wereadFinishItem")}"><option value="">${t("set.wereadFinishItemChoose")}</option>${wereadItemOptions}</select></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadNotesItem")}</span><small>${t("set.wereadNotesItemHint")}</small></span><span class="lc-checkin__settings-inline"><select data-weread-notes-item aria-label="${t("set.wereadNotesItem")}"><option value="">${t("set.wereadNotesItemChoose")}</option>${wereadItemOptions}</select></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadKey")}</span><small>${t("set.wereadKeyHint")}${wereadKeySet ? ` · ${t("set.wereadKeySaved")}` : ""}</small></span><span class="lc-checkin__settings-inline"><input type="password" data-weread-key autocomplete="off" placeholder="${wereadKeySet ? "••••••••" : "wrk-…"}" aria-label="${t("set.wereadKey")}" /></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadThreshold")}</span><small>${t("set.wereadThresholdHint")}</small></span><span class="lc-checkin__settings-inline"><input type="number" min="1" max="1440" step="1" data-weread-threshold value="${weread.thresholdMinutes}" aria-label="${t("set.wereadThreshold")}" /><button class="lc-checkin__text-button" type="button" data-action="save-weread">${t("set.wereadSave")}</button></span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.wereadPull")}</span><small>${wereadPullStatus}</small></span><button class="lc-checkin__text-button" type="button" data-action="weread-pull">${t("set.wereadPull")}</button></div>
                    </details>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.customIcons")}</span><small>${t("set.customIconsHint")}</small></span><span class="lc-checkin__settings-value">${t("set.countSuffix", {n: ctx.customIconLibrary.length})}</span></div>`,
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
            <header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button><div><div class="lc-checkin__eyebrow">${t("set.personal")}</div><h1 class="lc-checkin__title">${t("settings.title")}</h1></div></header>
            <div class="lc-checkin__settings-feedback" data-settings-feedback role="status" aria-live="polite"></div>
            <div class="lc-checkin__settings-layout">
                <nav class="lc-checkin__settings-nav" aria-label="${t("set.groupsAria")}">${groups.map((group, index) => `<button type="button" data-settings-nav="${group.id}" aria-controls="${settingsViewId}-group-${group.id}" class="${index === 0 ? "is-active" : ""}" aria-current="${index === 0 ? "true" : "false"}">${group.label}</button>`).join("")}</nav>
                <div class="lc-checkin__settings-groups">${groups.map((group) => `<section id="${settingsViewId}-group-${group.id}" class="lc-checkin__settings-card" data-settings-group="${group.id}" aria-labelledby="${settingsViewId}-heading-${group.id}"><h2 id="${settingsViewId}-heading-${group.id}">${group.label}</h2>${group.body}</section>`).join("")}</div>
            </div>
        </div>`;
}
