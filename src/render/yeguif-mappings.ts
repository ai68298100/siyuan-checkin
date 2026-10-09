import {t} from "../i18n";
import {escapeHtml, matchesSearch} from "../shared";
import {sanitizeDiagnosticDetail} from "../features/diagnostics";
import type {YeguifProjectMapping} from "../features/yeguif-adapter";

export interface YeguifMappingTarget {
    id: string;
    name: string;
    available: boolean;
}

interface MappingRow extends YeguifProjectMapping {
    query: string;
}

interface MappingDraft {
    rows: MappingRow[];
    baseline: string;
    dirty: boolean;
    saving: boolean;
}

const drafts = new WeakMap<HTMLElement, MappingDraft>();
const refreshers = new WeakMap<HTMLElement, () => void>();

export function renderYeguifMappings(): string {
    return `<div class="lc-checkin__yeguif-mappings" data-yeguif-mappings><p>${t("set.yeguifMappingsHint")}</p><div data-yeguif-mapping-rows></div><div class="lc-checkin__settings-inline"><button type="button" class="lc-checkin__text-button" data-yeguif-mapping-add>${t("set.yeguifMappingAdd")}</button><button type="button" class="lc-checkin__small-button" data-yeguif-mapping-save>${t("common.save")}</button><button type="button" class="lc-checkin__text-button" data-yeguif-mapping-reset>${t("set.yeguifMappingReset")}</button></div><p role="status" aria-live="polite" data-yeguif-mapping-status></p></div>`;
}

export function bindYeguifMappings(root: HTMLElement, options: {
    mappings: readonly YeguifProjectMapping[];
    readMappings?: () => readonly YeguifProjectMapping[];
    targets: readonly YeguifMappingTarget[];
    save: (mappings: YeguifProjectMapping[], baseline: string) => Promise<void>;
}): void {
    const editor = root.querySelector<HTMLElement>("[data-yeguif-mappings]");
    if (!editor) return;
    const savedMappings = options.readMappings?.() || options.mappings;
    const saved = JSON.stringify(savedMappings);
    let draft = drafts.get(root);
    if (!draft || (!draft.dirty && draft.baseline !== saved)) {
        draft = {rows: savedMappings.map(mapping => ({...mapping, query: ""})), baseline: saved, dirty: false, saving: false};
        drafts.set(root, draft);
    }
    const current = draft;
    const rows = editor.querySelector<HTMLElement>("[data-yeguif-mapping-rows]")!;
    const status = editor.querySelector<HTMLElement>("[data-yeguif-mapping-status]")!;
    const saveButton = editor.querySelector<HTMLButtonElement>("[data-yeguif-mapping-save]")!;
    const addButton = editor.querySelector<HTMLButtonElement>("[data-yeguif-mapping-add]")!;
    const resetButton = editor.querySelector<HTMLButtonElement>("[data-yeguif-mapping-reset]")!;
    const targets = new Map(options.targets.map(target => [target.id, target]));
    const errorFor = (row: MappingRow): string => {
        const project = row.project.trim().toLocaleLowerCase();
        if (!project || !row.itemId) return t("set.yeguifMappingIncomplete");
        if (current.rows.filter(candidate => candidate.project.trim().toLocaleLowerCase() === project).length > 1) return t("set.yeguifMappingDuplicate");
        if (!targets.get(row.itemId)?.available) return t("set.yeguifMappingTargetInvalid");
        return "";
    };
    const updateStatus = () => {
        const invalid = current.rows.filter(row => errorFor(row)).length;
        status.textContent = current.saving ? t("set.yeguifMappingSaving")
            : invalid ? t("set.yeguifMappingErrors", {n: invalid})
            : t(current.dirty ? "set.yeguifMappingDraft" : "set.yeguifMappingSaved", {n: current.rows.length});
        saveButton.disabled = current.saving || invalid > 0 || !current.dirty;
        addButton.disabled = current.saving;
        resetButton.disabled = current.saving || !current.dirty;
        rows.querySelectorAll<HTMLElement>("[data-yeguif-mapping-row]").forEach((element, index) => {
            const error = errorFor(current.rows[index]);
            element.querySelector<HTMLElement>("[data-yeguif-mapping-error]")!.textContent = error;
            element.querySelector<HTMLInputElement>("[data-yeguif-project]")!.setAttribute("aria-invalid", String(Boolean(error)));
        });
    };
    const targetOptions = (row: MappingRow): string => {
        const candidates = options.targets.filter(target => target.available && matchesSearch(`${target.name} ${target.id}`, row.query));
        const selected = targets.get(row.itemId);
        if (selected && !candidates.some(target => target.id === selected.id)) candidates.unshift(selected);
        const missing = row.itemId && !selected ? `<option value="${escapeHtml(row.itemId)}" selected disabled>${escapeHtml(row.itemId)} · ${t("set.itemMissing")}</option>` : "";
        return `<option value="">${t("set.yeguifMappingChoose")}</option>${missing}${candidates.map(target => `<option value="${escapeHtml(target.id)}"${target.id === row.itemId ? " selected" : ""}${target.available ? "" : " disabled"}>${escapeHtml(target.name)} · ${escapeHtml(target.id)}</option>`).join("")}`;
    };
    const renderRows = () => {
        rows.innerHTML = current.rows.map((row, index) => `<div class="lc-checkin__yeguif-mapping-row" data-yeguif-mapping-row="${index}"><label>${t("set.yeguifMappingProject")}<input type="text" data-yeguif-project maxlength="60" value="${escapeHtml(row.project)}" /></label><label>${t("set.yeguifMappingTarget")}<input type="search" data-yeguif-target-search aria-label="${t("set.yeguifMappingSearch")}" placeholder="${t("set.yeguifMappingSearch")}" value="${escapeHtml(row.query)}" /><select data-yeguif-target aria-label="${t("set.yeguifMappingTarget")}">${targetOptions(row)}</select></label><button type="button" class="lc-checkin__text-button" data-yeguif-mapping-remove aria-label="${escapeHtml(t("set.yeguifMappingRemove", {project: row.project || String(index + 1)}))}">${t("common.delete")}</button><small data-yeguif-mapping-error></small></div>`).join("");
        rows.querySelectorAll<HTMLElement>("[data-yeguif-mapping-row]").forEach((element, index) => {
            const row = current.rows[index];
            element.querySelector<HTMLInputElement>("[data-yeguif-project]")!.addEventListener("input", event => {
                row.project = (event.currentTarget as HTMLInputElement).value;
                current.dirty = true;
                updateStatus();
            });
            element.querySelector<HTMLInputElement>("[data-yeguif-target-search]")!.addEventListener("input", event => {
                row.query = (event.currentTarget as HTMLInputElement).value;
                element.querySelector<HTMLSelectElement>("[data-yeguif-target]")!.innerHTML = targetOptions(row);
                updateStatus();
            });
            element.querySelector<HTMLSelectElement>("[data-yeguif-target]")!.addEventListener("change", event => {
                row.itemId = (event.currentTarget as HTMLSelectElement).value;
                current.dirty = true;
                updateStatus();
            });
            element.querySelector<HTMLButtonElement>("[data-yeguif-mapping-remove]")!.addEventListener("click", () => {
                if (current.saving) return;
                current.rows.splice(index, 1);
                current.dirty = true;
                renderRows();
                addButton.focus();
            });
        });
        rows.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input,select,button").forEach(control => { control.disabled = current.saving; });
        updateStatus();
    };
    addButton.addEventListener("click", () => {
        if (current.saving) return;
        current.rows.push({project: "", itemId: "", query: ""});
        current.dirty = true;
        renderRows();
        rows.querySelector<HTMLElement>("[data-yeguif-mapping-row]:last-child [data-yeguif-project]")?.focus();
    });
    resetButton.addEventListener("click", () => {
        if (current.saving) return;
        const mappings = options.readMappings?.() || options.mappings;
        current.rows = mappings.map(mapping => ({...mapping, query: ""}));
        current.baseline = JSON.stringify(mappings);
        current.dirty = false;
        renderRows();
    });
    saveButton.addEventListener("click", async () => {
        if (current.saving || !current.dirty || current.rows.some(row => errorFor(row))) return;
        const mappings = current.rows.map(row => ({project: row.project.trim(), itemId: row.itemId}));
        current.saving = true;
        renderRows();
        try {
            await options.save(mappings, current.baseline);
            current.baseline = JSON.stringify(mappings);
            current.dirty = false;
            current.rows.forEach(row => { row.project = row.project.trim(); });
        } catch (error) {
            current.saving = false;
            refreshers.get(root)?.();
            const liveStatus = root.querySelector<HTMLElement>("[data-yeguif-mapping-status]");
            const rawDetail = error instanceof Error ? error.message : typeof error === "string" ? error : "";
            if (liveStatus) liveStatus.textContent = sanitizeDiagnosticDetail(rawDetail) || t("msg.prefSaveFail");
            return;
        }
        current.saving = false;
        refreshers.get(root)?.();
    });
    refreshers.set(root, renderRows);
    renderRows();
}
