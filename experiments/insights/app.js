import {createIcons, BookOpen, Activity, Droplets, NotebookPen, Flame, CalendarDays, ChartColumnIncreasing, ArrowDownToLine, FolderOpen, Moon, Sun, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Check, Search, X, Filter, ArrowDownUp, FileSpreadsheet} from "lucide";
import {buildHabitInsights} from "../../src/features/insights";
import {selectInsightRecords, serializeInsightRecordsCsv} from "../../src/features/insight-records";
import {normalizeStore, dateKey, getItemRevisionForDate} from "../../src/model";
import {createExampleStore} from "./fixtures";

const iconSet = {BookOpen, Activity, Droplets, NotebookPen, Flame, CalendarDays, ChartColumnIncreasing, ArrowDownToLine, FolderOpen, Moon, Sun, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Check, Search, X, Filter, ArrowDownUp, FileSpreadsheet};
const knownIcons = new Set(["book-open", "activity", "droplets", "notebook-pen"]);
const today = dateKey(new Date());
const localDate = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const html = (value) => String(value).replace(/[&<>"']/g, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[character]));
const number = (value) => new Intl.NumberFormat("zh-CN", {maximumSignificantDigits: 15}).format(value);
const shortDate = (key) => key.slice(5).replace("-", "/");
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const statusLabels = {complete: "已达标", partial: "部分完成", missed: "未记录", pending: "待记录", off: "非计划日", unavailable: "未启用"};
const sourceLabels = {manual: "手动记录", tomato: "专注记录", import: "导入记录", api: "外部记录"};
const initialRecordFilters = () => ({query: "", source: "all", order: "newest"});
const recordPageSize = 50;
const state = {store: normalizeStore(createExampleStore(localDate(today))), itemId: "reading", days: 84, asOf: today, selection: null, dark: false, source: "示例数据", message: "", recordFilters: initialRecordFilters(), recordLimit: recordPageSize};
let report;

function itemIcon(item) {
    return knownIcons.has(item.icon) ? icon(item.icon) : `<span class="custom-icon">${html(item.icon || "✓")}</span>`;
}

function labelForDay(day) {
    return day.unavailableReason === "paused" ? "归档期间" : day.unavailableReason === "not-started" ? "创建之前" : day.events.length && ["missed", "pending"].includes(day.status) ? "已记录，未达标" : statusLabels[day.status];
}

function render() {
    const selectedItem = state.store.items.find((item) => item.id === state.itemId);
    report = selectedItem ? buildHabitInsights(state.store, state.itemId, {asOf: localDate(state.asOf), days: state.days}) : null;
    document.documentElement.dataset.theme = state.dark ? "dark" : "light";
    document.getElementById("app").innerHTML = `
        <header class="app-header">
            <a class="brand" href="#" aria-label="小驴打卡"><img src="icon.svg" alt="" /><strong>小驴打卡</strong><span>习惯复盘</span></a>
            <div class="header-actions"><span class="data-source" title="${html(state.source)}">${html(state.source)}</span>
                <button class="tool" data-action="import" title="打开打卡数据 JSON（只读）" aria-label="打开打卡数据 JSON（只读）">${icon("folder-open")}</button>
                <button class="tool" data-action="export" title="导出当前复盘 JSON" aria-label="导出当前复盘 JSON" ${report ? "" : "disabled"}>${icon("arrow-down-to-line")}</button>
                <button class="tool" data-action="theme" title="${state.dark ? "浅色" : "深色"}外观" aria-label="${state.dark ? "浅色" : "深色"}外观">${icon(state.dark ? "sun" : "moon")}</button>
                <input id="file-input" type="file" accept=".json,application/json" hidden />
            </div>
        </header>
        <div class="workspace">
            <aside class="sidebar"><div class="sidebar-heading"><span>我的习惯</span><small>${state.store.items.length}</small></div>
                <nav class="habit-list" aria-label="习惯">${state.store.items.map((item) => `<button class="habit ${state.itemId === item.id ? "selected" : ""}" data-item="${html(item.id)}" aria-current="${state.itemId === item.id ? "page" : "false"}">${itemIcon(item)}<span>${html(item.name)}</span>${item.archived ? "<small>已归档</small>" : ""}</button>`).join("")}</nav>
                <div class="source-picker"><label for="dataset">数据</label><select id="dataset"><option value="example" ${state.source === "示例数据" ? "selected" : ""}>示例数据</option><option value="empty" ${state.source === "空白数据" ? "selected" : ""}>空白数据</option>${!["示例数据", "空白数据"].includes(state.source) ? `<option value="imported" selected>本地文件</option>` : ""}</select></div>
            </aside>
            <main class="content">${state.message ? `<div class="message" role="status">${html(state.message)}</div>` : ""}
                ${report ? renderReport(selectedItem) : `<section class="empty"><span class="empty-icon">${icon("calendar-days")}</span><h1>还没有习惯记录</h1><button class="command" data-action="import">${icon("folder-open")}打开打卡数据</button></section>`}
            </main>
        </div>`;
    createIcons({icons: iconSet, attrs: {"stroke-width": 1.7}});
    bind();
}

function renderReport(item) {
    const totals = report.totalsByUnit;
    const stats = report.aggregates;
    const revision = getItemRevisionForDate(item, localDate(state.asOf));
    return `<header class="report-header"><div class="report-title"><span class="habit-emblem">${itemIcon(item)}</span><div><div class="eyebrow">${html(item.group || "习惯详情")}</div><h1>${html(item.name)}</h1><p>${html(revision.kind === "binary" ? "完成一次" : `${number(revision.target)} ${revision.unit}`)}<span>·</span>${html(scheduleLabel(revision.schedule))}</p></div></div>
        <div class="range-controls"><div class="segmented" role="group" aria-label="统计范围">${[28, 84, 180].map((days) => `<button data-range="${days}" aria-pressed="${state.days === days}" class="${state.days === days ? "active" : ""}">${days} 天</button>`).join("")}</div><label class="as-of">截至<input type="date" id="as-of" value="${state.asOf}" min="1900-01-01" max="${today}" aria-label="统计截止日期" /></label></div></header>
        <div class="metrics">
            <div class="metric"><span>${icon("flame")}窗口内当前连续</span><strong data-metric="current-streak">${report.currentStreak}<small>个计划日</small></strong><p>最高连续 ${report.longestStreak} 个计划日</p></div>
            <div class="metric"><span>${icon("chart-column-increasing")}达标率</span><strong data-metric="rate">${stats.completionRate === null ? "暂无" : `${number(stats.completionRate)}%`}</strong><p>${stats.completedDays} / ${stats.eligibleScheduledDays} 个已结算计划日</p></div>
            <div class="metric"><span>${icon("calendar-days")}达标计划日</span><strong>${stats.completedDays}<small>天</small></strong><p>${stats.scheduledDays} 个计划日 · ${state.days} 天内</p></div>
            <div class="metric"><span>${icon("check")}累计投入</span><strong class="totals">${totals.length ? totals.map((total) => `<span>${number(total.value)}<small>${html(total.unit)}</small></span>`).join("") : "0"}</strong><p>${report.records.length} 条原始记录</p></div>
        </div>
        <div class="report-period"><span>${report.startDate} 至 ${report.endDate}</span><span>${report.days.at(-1)?.status === "complete" ? "截止日已达标，计入达标率" : "截止日未达标时，暂不计入达标率"}</span></div>
        <section class="heatmap-section"><div class="section-heading"><h2>坚持的足迹</h2><div class="legend"><span><i class="swatch complete"></i>达标</span><span><i class="swatch partial"></i>部分</span><span><i class="swatch missed"></i>未记录</span><span><i class="swatch off"></i>非计划日</span></div></div>
            ${renderHeatmap()}
        </section>
        <section class="trend-section"><div class="section-heading"><h2>每周达标率</h2><span>按有效计划日统计</span></div>${renderTrend()}</section>
        <section class="records-section" id="records">${renderRecords()}</section>`;
}

function scheduleLabel(schedule) {
    if (schedule.type === "daily") return "每天";
    if (schedule.type === "workdays") return "工作日";
    return `每周${(schedule.weekdays || []).map((day) => ["日", "一", "二", "三", "四", "五", "六"][day]).join("、")}`;
}

function renderHeatmap() {
    const columns = report.weeklyTrend.length;
    const leading = (localDate(report.startDate).getDay() + 6) % 7;
    const cells = report.days.map((day, index) => {
        const column = Math.floor((index + leading) / 7) + 1;
        const row = (index + leading) % 7 + 1;
        const selected = state.selection?.type === "day" && state.selection.key === day.date;
        const description = `${day.date} · ${labelForDay(day)}${day.available ? ` · ${number(day.progress)} / ${number(day.target)} ${day.unit}` : ""}`;
        return `<button class="day ${day.status} ${day.isToday ? "today" : ""} ${selected ? "selected" : ""}" style="grid-column:${column};grid-row:${row}" data-date="${day.date}" aria-label="${html(description)}" title="${html(description)}" aria-pressed="${selected}">${day.isToday ? "<span></span>" : ""}</button>`;
    }).join("");
    return `<div class="heatmap-layout"><div class="weekdays">${["一", "二", "三", "四", "五", "六", "日"].map((day) => `<span>${day}</span>`).join("")}</div><div class="heatmap-scroll"><div class="heatmap-body" style="--columns:${columns}"><div class="week-labels">${report.weeklyTrend.map((week) => `<span>${shortDate(week.observationStartDate)}</span>`).join("")}</div><div class="heatmap" aria-label="每日打卡状态">${cells}</div></div></div></div>`;
}

function renderTrend() {
    return `<div class="trend" style="--weeks:${report.weeklyTrend.length}">${report.weeklyTrend.map((week) => `<button class="week-bar ${state.selection?.type === "week" && state.selection.key === week.startDate ? "selected" : ""}" data-week="${week.startDate}" aria-label="${week.label}，${week.completionRate === null ? "无已结算计划日" : `达标率 ${number(week.completionRate)}%`}" title="${week.label} · ${week.completedDays}/${week.eligibleScheduledDays} 个已结算计划日"><span class="bar-value">${week.completionRate === null ? "--" : `${Math.round(week.completionRate)}%`}</span><span class="bar-track"><span style="height:${week.completionRate || 0}%"></span></span><small>${shortDate(week.observationStartDate)}</small></button>`).join("")}</div>`;
}

function getRecordView() {
    let title = "原始记录";
    let detail = "整个统计范围";
    let records = [...report.records];
    if (state.selection?.type === "day") {
        const day = report.days.find((value) => value.date === state.selection.key);
        records = day?.events || [];
        title = state.selection.key;
        detail = day ? `${labelForDay(day)}${day.available ? ` · ${number(day.progress)} / ${number(day.target)} ${day.unit}` : ""}` : "无记录";
    } else if (state.selection?.type === "week") {
        const week = report.weeklyTrend.find((value) => value.startDate === state.selection.key);
        if (week) {
            records = records.filter((record) => record.localDate >= week.observationStartDate && record.localDate <= week.observationEndDate);
            title = `${shortDate(week.observationStartDate)} 至 ${shortDate(week.observationEndDate)}`;
            detail = `${week.completedDays} / ${week.eligibleScheduledDays} 个已结算计划日达标`;
        }
    }
    return {title, detail, total: records.length, records: selectInsightRecords(records, state.recordFilters)};
}

function recordCount(view) {
    return view.records.length === view.total ? `${view.total} 条` : `${view.records.length} / ${view.total} 条`;
}

function renderRecords() {
    const view = getRecordView();
    const controls = state.selection ? `<button class="tool" data-action="reset-selection" title="查看全部记录" aria-label="查看全部记录">${icon("rotate-ccw")}</button>` : "";
    return `<div class="section-heading"><div><h2>${html(view.title)}</h2><span>${html(view.detail)}</span></div><div class="record-controls">${state.selection?.type === "day" ? `<button class="tool" data-action="previous-day" aria-label="前一天" title="前一天" ${state.selection.key === report.startDate ? "disabled" : ""}>${icon("chevron-left")}</button><button class="tool" data-action="next-day" aria-label="后一天" title="后一天" ${state.selection.key === report.endDate ? "disabled" : ""}>${icon("chevron-right")}</button>` : ""}<small id="record-count" aria-live="polite">${recordCount(view)}</small>${controls}</div></div>
        <div class="record-toolbar">
            <label class="record-search">${icon("search")}<input id="record-query" type="search" value="${html(state.recordFilters.query)}" placeholder="搜索备注、数值、单位" aria-label="搜索记录" /><button class="tool" data-action="clear-record-query" aria-label="清空搜索" title="清空搜索" style="visibility:${state.recordFilters.query ? "visible" : "hidden"}">${icon("x")}</button></label>
            <label class="record-select" title="记录来源">${icon("filter")}<select id="record-source" aria-label="记录来源">${Object.entries({all: "全部来源", ...sourceLabels}).map(([value, label]) => `<option value="${value}" ${state.recordFilters.source === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
            <label class="record-select" title="记录排序">${icon("arrow-down-up")}<select id="record-order" aria-label="记录排序"><option value="newest" ${state.recordFilters.order === "newest" ? "selected" : ""}>最新在前</option><option value="oldest" ${state.recordFilters.order === "oldest" ? "selected" : ""}>最早在前</option></select></label>
            <button class="tool" data-action="export-records" aria-label="导出筛选记录 CSV" title="导出筛选记录 CSV" ${view.records.length ? "" : "disabled"}>${icon("file-spreadsheet")}</button>
        </div><div id="record-results">${renderRecordResults(view)}</div>`;
}

function renderRecordResults(view) {
    const visible = view.records.slice(0, state.recordLimit);
    return `<div class="records-list">${visible.length ? visible.map((record) => `<article class="record" data-record-id="${html(record.id)}"><div class="record-date"><strong>${shortDate(record.localDate)}</strong><small>${new Date(record.occurredAt).toLocaleTimeString("zh-CN", {hour: "2-digit", minute: "2-digit"})}</small></div><div class="record-body"><strong>${number(record.value)} <small>${html(record.unit)}</small></strong>${record.note ? `<p>${html(record.note)}</p>` : ""}<span class="source">${sourceLabels[record.source] || html(record.source)}</span></div></article>`).join("") : `<div class="records-empty">${icon("calendar-days")}<span>${view.total ? "没有匹配的记录" : "此范围没有记录"}</span>${state.recordFilters.query || state.recordFilters.source !== "all" ? '<button class="command" data-action="reset-record-filters">清除筛选</button>' : ""}</div>`}</div>
        ${view.records.length > recordPageSize ? `<div class="records-pagination"><span>已显示 ${visible.length} / ${view.records.length} 条</span>${visible.length < view.records.length ? `<button class="command" data-action="more-records">${icon("chevron-down")}加载更多</button>` : ""}</div>` : ""}`;
}

function refreshRecordResults(preserveScroll = false) {
    const view = getRecordView();
    const scrollTop = preserveScroll ? document.querySelector(".records-list").scrollTop : 0;
    const results = document.getElementById("record-results");
    results.innerHTML = renderRecordResults(view);
    document.getElementById("record-count").textContent = recordCount(view);
    document.querySelector("[data-action='export-records']").disabled = !view.records.length;
    document.querySelector("[data-action='clear-record-query']").style.visibility = state.recordFilters.query ? "visible" : "hidden";
    createIcons({icons: iconSet, attrs: {"stroke-width": 1.7}});
    bindActions(results);
    document.querySelector(".records-list").scrollTop = scrollTop;
}

function bindActions(root = document) {
    root.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => act(button.dataset.action)));
}

function bind() {
    document.querySelector(".brand").addEventListener("click", (event) => {event.preventDefault(); state.selection = null; render();});
    document.querySelectorAll("[data-item]").forEach((button) => button.addEventListener("click", () => {state.itemId = button.dataset.item; state.selection = null; state.recordLimit = recordPageSize; render();}));
    document.querySelectorAll("[data-range]").forEach((button) => button.addEventListener("click", () => {state.days = Number(button.dataset.range); state.selection = null; state.recordLimit = recordPageSize; render();}));
    document.querySelectorAll("[data-date]").forEach((button) => button.addEventListener("click", () => {state.selection = {type: "day", key: button.dataset.date}; state.recordLimit = recordPageSize; render(); document.querySelector(`[data-date='${state.selection.key}']`)?.focus({preventScroll: true});}));
    document.querySelectorAll("[data-week]").forEach((button) => button.addEventListener("click", () => {state.selection = {type: "week", key: button.dataset.week}; state.recordLimit = recordPageSize; render();}));
    bindActions();
    const query = document.getElementById("record-query");
    const updateQuery = () => {state.recordFilters.query = query.value; state.recordLimit = recordPageSize; refreshRecordResults();};
    query?.addEventListener("input", (event) => {if (!event.isComposing) updateQuery();});
    query?.addEventListener("compositionend", updateQuery);
    for (const field of ["source", "order"]) document.getElementById(`record-${field}`)?.addEventListener("change", (event) => {
        state.recordFilters[field] = event.target.value;
        state.recordLimit = recordPageSize;
        refreshRecordResults();
    });
    document.getElementById("file-input").addEventListener("change", importFile);
    document.getElementById("as-of")?.addEventListener("change", (event) => {
        const value = event.target.value;
        if (value && event.target.validity.valid && value <= today && value >= "1900-01-01") {
            state.asOf = value;
            state.selection = null;
            state.recordLimit = recordPageSize;
            render();
        } else {
            event.target.value = state.asOf;
        }
    });
    document.getElementById("dataset").addEventListener("change", (event) => {
        if (event.target.value === "imported") return;
        state.source = event.target.value === "empty" ? "空白数据" : "示例数据";
        state.store = event.target.value === "empty" ? normalizeStore(null) : normalizeStore(createExampleStore(localDate(today)));
        state.itemId = state.store.items[0]?.id;
        state.selection = null;
        state.recordFilters = initialRecordFilters();
        state.recordLimit = recordPageSize;
        state.message = "";
        render();
    });
}

function act(action) {
    if (action === "import") {document.getElementById("file-input").click(); return;}
    if (action === "more-records") {state.recordLimit += recordPageSize; refreshRecordResults(true); return;}
    if (["clear-record-query", "reset-record-filters"].includes(action)) {
        state.recordFilters.query = "";
        if (action === "reset-record-filters") state.recordFilters.source = "all";
        state.recordLimit = recordPageSize;
        document.getElementById("record-query").value = "";
        document.getElementById("record-source").value = state.recordFilters.source;
        refreshRecordResults();
        document.getElementById("record-query").focus({preventScroll: true});
        return;
    }
    if (action === "export-records" && report) {
        const records = getRecordView().records;
        if (records.length) download(serializeInsightRecordsCsv(report.item, records), "text/csv;charset=utf-8", `checkin-records-${state.asOf}.csv`);
        return;
    }
    if (action === "theme") state.dark = !state.dark;
    if (action === "reset-selection") {state.selection = null; state.recordLimit = recordPageSize;}
    if (["previous-day", "next-day"].includes(action) && state.selection?.type === "day") {
        const date = localDate(state.selection.key);
        date.setDate(date.getDate() + (action === "previous-day" ? -1 : 1));
        const key = dateKey(date);
        if (key >= report.startDate && key <= report.endDate) state.selection.key = key;
        state.recordLimit = recordPageSize;
    }
    if (action === "export" && report) {
        download(JSON.stringify({format: "checkin-insights-report", version: 1, dataSource: state.source, ...report}, null, 2), "application/json;charset=utf-8", `checkin-insights-${state.asOf}.json`);
        return;
    }
    render();
}

function download(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        if (file.size > 10 * 1024 * 1024) throw new Error("文件超过 10 MB");
        const value = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
        if (!value || ![1, 2].includes(value.version) || !Array.isArray(value.items) || !Array.isArray(value.events)) throw new Error("请选择小驴打卡导出的数据 JSON");
        const normalized = normalizeStore(value);
        state.store = normalized;
        state.source = file.name;
        state.itemId = normalized.items[0]?.id;
        state.selection = null;
        state.recordFilters = initialRecordFilters();
        state.recordLimit = recordPageSize;
        state.message = `已读取 ${normalized.items.length} 个项目、${normalized.events.length} 条有效记录（只读）`;
    } catch (error) {
        state.message = `读取失败：${error.message}`;
    }
    render();
}

render();
