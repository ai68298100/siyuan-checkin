/* 设置页视图：从 index.ts 外置；依赖以 SettingsViewContext 显式传入。 */
import {t} from "../i18n";
import {escapeHtml} from "../shared";
import {SORT_LABELS} from "../ui/labels";
import {PLUGIN_VERSION} from "../version";
import type {CheckinAppearance, CheckinPalette, DialogSizeMode, TodayGroupMode} from "../view-preferences";
import type {CheckinItemSortMode, CheckinStore} from "../types";

export interface SettingsViewContext {
    store: CheckinStore;
    auditEntries: Array<{type: "conflict" | "merge" | "restore" | "migration"; at: string; details: Record<string, unknown>}>;
    customIconLibrary: string[];
    agentCapabilityRegistered: boolean;
    appearance: CheckinAppearance;
    reducedMotion: boolean;
    palette: CheckinPalette;
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
    const agentStatus = ctx.agentCapabilityRegistered ? t("set.agentOn") : t("set.agentOff");
    const photoEvents = ctx.store.events.filter((event) => event.attachment);
    const photoKb = Math.max(0, Math.round(photoEvents.reduce((sum, event) => sum + (event.attachment?.length || 0), 0) * 0.75 / 1024));
    const iconKb = Math.max(0, Math.round(ctx.customIconLibrary.reduce((sum, icon) => sum + icon.length, 0) * 0.75 / 1024));
    const storageKb = Math.max(1, Math.round((ctx.store.events.length * 160 + ctx.store.items.length * 320) * 0.75 / 1024) + photoKb + iconKb);
    const auditLabel = (type: string) => type === "conflict" ? t("set.auditConflict") : type === "merge" ? t("set.auditMerge") : type === "restore" ? t("set.auditRestore") : t("set.auditMigration");
    const auditRows = ctx.auditEntries.slice(-5).reverse().map((entry) => `<li><strong>${auditLabel(entry.type)}</strong><small>${escapeHtml(new Date(entry.at).toLocaleString())} · ${escapeHtml(JSON.stringify(entry.details))}</small></li>`).join("");
    const kbdRow = (label: string, hint: string, keys: string[]) => `<div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${label}</span><small>${hint}</small></span><span class="lc-checkin__kbd-group">${keys.map((key) => `<kbd class="lc-checkin__kbd">${key}</kbd>`).join('<span class="lc-checkin__kbd-plus" aria-hidden="true">+</span>')}</span></div>`;
    const groups: Array<{id: string; label: string; body: string}> = [
        {
            id: "appearance",
            label: t("set.groupAppearance"),
            body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.theme")}</span><small>${t("set.themeHint")}</small></span><select data-setting-appearance aria-label="${t("set.theme")}"><option value="system" ${ctx.appearance === "system" ? "selected" : ""}>${t("set.themeSystem")}</option><option value="light" ${ctx.appearance === "light" ? "selected" : ""}>${t("set.themeLight")}</option><option value="dark" ${ctx.appearance === "dark" ? "selected" : ""}>${t("set.themeDark")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reduceMotion")}</span><small>${t("set.reduceMotionHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-motion ${ctx.reducedMotion ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.accent")}</span><small>${t("set.accentHint")}</small></span><select data-setting-palette aria-label="${t("set.accent")}"><option value="lavender"${ctx.palette === "lavender" ? " selected" : ""}>${t("set.paletteLavender")}</option><option value="ocean"${ctx.palette === "ocean" ? " selected" : ""}>${t("set.paletteOcean")}</option><option value="forest"${ctx.palette === "forest" ? " selected" : ""}>${t("set.paletteForest")}</option><option value="sunset"${ctx.palette === "sunset" ? " selected" : ""}>${t("set.paletteSunset")}</option></select></label>`,
        },
        {
            id: "today",
            label: t("set.groupToday"),
            body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.groupModeLabel")}</span><small>${t("set.groupModeHint")}</small></span><select data-setting-group aria-label="${t("set.groupModeLabel")}"><option value="none"${ctx.todayGroupMode === "none" ? " selected" : ""}>${t("set.groupNone")}</option><option value="group"${ctx.todayGroupMode === "group" ? " selected" : ""}>${t("set.groupCustom")}</option><option value="time" ${ctx.todayGroupMode === "time" ? "selected" : ""}>${t("set.groupTime")}</option><option value="priority" ${ctx.todayGroupMode === "priority" ? "selected" : ""}>${t("set.groupPriority")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.sortModeLabel")}</span><small>${t("set.sortModeHint")}</small></span><select data-setting-sort aria-label="${t("set.sortModeLabel")}">${Object.entries(SORT_LABELS).map(([value, label]) => `<option value="${value}" ${ctx.todaySortMode === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.expandCompleted")}</span><small>${t("set.expandCompletedHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-completed ${!ctx.completedCollapsed ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.weekStrip")}</span><small>${t("set.weekStripHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-weekstrip ${ctx.weekStripVisible ? "checked" : ""} /></label>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.resetView")}</span><small>${t("set.resetViewHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="reset-view-preferences">${t("set.reset")}</button></div>`,
        },
        {
            id: "dialog",
            label: t("set.groupDialog"),
            body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.dialogSize")}</span><small>${t("set.dialogSizeHint")}</small></span><select data-setting-dialog-mode aria-label="${t("set.dialogSize")}"><option value="auto" ${ctx.dialogSizeMode === "auto" ? "selected" : ""}>${t("set.dialogAuto")}</option><option value="percent" ${ctx.dialogSizeMode === "percent" ? "selected" : ""}>${t("set.dialogPercent")}</option><option value="fullscreen" ${ctx.dialogSizeMode === "fullscreen" ? "selected" : ""}>${t("set.dialogFullscreen")}</option><option value="fixed" ${ctx.dialogSizeMode === "fixed" ? "selected" : ""}>${t("set.dialogFixed")}</option></select></label>
                    <label class="lc-checkin__settings-row" data-dialog-scale-row ${ctx.dialogSizeMode === "percent" ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.scaleLabel")}</span><small>${t("set.scaleCurrent", {n: ctx.dialogScale})}</small></span><input type="range" min="50" max="100" step="5" value="${ctx.dialogScale}" data-setting-dialog-scale aria-label="${t("set.scaleLabel")}" /></label>
                    <div class="lc-checkin__settings-row" data-dialog-reset-row ${ctx.dialogSizeMode === "auto" && ctx.dialogHasCustomFrame ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.dialogFrame")}</span><small>${t("set.dialogFrameHint")}</small></span><button type="button" class="lc-checkin__small-button" data-action="reset-dialog-frame">${t("set.dialogFrameReset")}</button></div>
                    <div class="lc-checkin__settings-row" data-dialog-fixed-row ${ctx.dialogSizeMode === "fixed" ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.fixedWH")}</span><small>${t("set.fixedWHHint")}</small></span><span class="lc-checkin__settings-inline"><input type="number" min="320" max="2560" step="20" value="${ctx.dialogFixedSize.width}" data-setting-dialog-width aria-label="${t("set.dialogWidthAria")}" aria-describedby="lc-checkin-dialog-width-unit" /><span id="lc-checkin-dialog-width-unit">×</span><input type="number" min="240" max="2048" step="20" value="${ctx.dialogFixedSize.height}" data-setting-dialog-height aria-label="${t("set.dialogHeightAria")}" aria-describedby="lc-checkin-dialog-width-unit" /></span></div>`,
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
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importJson")}</span><small>${t("set.importJsonHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-import-json accept=".json,application/json" />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.restoreSnapshot")}</span><small>${t("set.restoreSnapshotHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="restore-backup">${t("set.restoreSnapshotBtn")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.audit")}</span><small>${t("set.auditHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="clear-audit">${t("set.clearAudit")}</button></div>
                    <div class="lc-checkin__audit-list" aria-label="${t("set.audit")}">${auditRows ? `<ul>${auditRows}</ul>` : `<small>${t("set.auditEmpty")}</small>`}</div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importCsv")}</span><small>${t("set.importCsvHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-import-csv accept=".csv,text/csv" />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.resetPrefs")}</span><small>${t("set.resetPrefsHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="reset-all-preferences">${t("set.resetDefaults")}</button></div>`,
        },
        {
            id: "integrations",
            label: t("set.groupIntegrations"),
            body: `
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.tomato")}</span><small>${t("set.tomatoHint")}</small></span><span class="lc-checkin__settings-value">${t("set.tomatoPending")}</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.agent")}</span><small>${t("set.agentHint")}</small></span><span class="lc-checkin__settings-value">${agentStatus}</span></div>
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
            <div class="lc-checkin__settings-layout">
                <nav class="lc-checkin__settings-nav" aria-label="设置分组">${groups.map((group, index) => `<button type="button" data-settings-nav="${group.id}" class="${index === 0 ? "is-active" : ""}" aria-current="${index === 0 ? "true" : "false"}">${group.label}</button>`).join("")}</nav>
                <div class="lc-checkin__settings-groups">${groups.map((group) => `<section class="lc-checkin__settings-card" data-settings-group="${group.id}"><h2>${group.label}</h2>${group.body}</section>`).join("")}</div>
            </div>
        </div>`;
}
