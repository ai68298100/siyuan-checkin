/* T-1465（D-273）问卷日记弹窗：模板问题表单 + 写入目标配置。
   事实层先行（宿主在 onSubmit 里先 recordEvent），文档写入是尽力而为旁路；
   弹窗复用 siyuan Dialog，宿主类注入沿用 quick-dialog 模式（双主题/移动触控基线生效）。
   提交按钮在等待期间禁用防重复提交；必答题缺失 fail-closed。 */
import {t} from "../i18n";
import {showMessage, Dialog} from "siyuan";
import {escapeHtml} from "../shared";
import {sanitizeDiagnosticDetail} from "../features/diagnostics";
import {resolveJournalQuestionText, type JournalIntegration, type ResolvedJournalTemplate, type JournalTemplateDef} from "../features/journal-templates";

export interface JournalDialogDeps {
    template: ResolvedJournalTemplate;
    /** 当日 localDate：提示词池按 ISO 周轮换取词（与写入文档共用同一实现）。 */
    localDate: string;
    integration: JournalIntegration;
    notebooks: ReadonlyArray<{id: string; name: string}>;
    alreadyWritten: boolean;
    isMobileFrontend: boolean;
    draft?: readonly string[];
    onDraft?(answers: string[], submitted?: readonly string[]): void;
    onPersistIntegration(integration: JournalIntegration): Promise<JournalIntegration | void>;
    onSubmit(answers: readonly string[], integration: JournalIntegration): Promise<boolean>;
    searchDocuments?: (query: string) => Promise<readonly DocumentTargetChoice[]>;
}

export interface DocumentTargetChoice { id?: string; content?: string; hPath?: string }

/** Shared settings/questionnaire picker. A manual edit invalidates pending results too. */
export function bindDocumentTargetPickerFor(field: HTMLInputElement, searchDocuments: (query: string) => Promise<readonly DocumentTargetChoice[]>): void {
    const picker = document.createElement("div");
    picker.className = "lc-checkin__document-picker";
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = t("set.documentSearch");
    search.setAttribute("aria-label", t("set.documentSearch"));
    const choices = document.createElement("select");
    choices.setAttribute("aria-label", t("set.documentResults"));
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "lc-checkin__text-button";
    retry.textContent = t("bind.retry");
    retry.hidden = true;
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    picker.append(search, choices, retry, status);
    field.before(picker);
    let request = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
        choices.replaceChildren(new Option(t("set.documentResults"), ""));
        retry.hidden = true;
        status.textContent = "";
        picker.removeAttribute("aria-busy");
    };
    const run = async (version: number) => {
        const query = search.value.trim();
        if (!query || !field.isConnected || field.disabled) return;
        picker.setAttribute("aria-busy", "true");
        status.textContent = t("bind.checking");
        try {
            const results = await searchDocuments(query);
            if (version !== request || !field.isConnected) return;
            const valid = results.filter(result => result.id).slice(0, 50);
            choices.replaceChildren(new Option(t("set.documentResults"), ""), ...valid.map(result => new Option(`${result.hPath || result.content || result.id} · ${result.id}`, result.id)));
            status.textContent = valid.length ? t("bind.searchCount", {n: valid.length}) : t("bind.searchEmpty");
        } catch {
            if (version !== request || !field.isConnected) return;
            status.textContent = t("msg.diarySearchFailed");
            retry.hidden = false;
        } finally {
            if (version === request) picker.removeAttribute("aria-busy");
        }
    };
    search.addEventListener("input", () => {
        if (timer) clearTimeout(timer);
        const version = ++request;
        reset();
        timer = setTimeout(() => { void run(version); }, 180);
    });
    retry.addEventListener("click", () => { if (field.disabled) return; reset(); void run(++request); });
    field.addEventListener("input", () => { ++request; if (timer) clearTimeout(timer); reset(); });
    choices.addEventListener("change", () => {
        if (!choices.value || field.disabled) return;
        field.value = choices.value;
        field.dispatchEvent(new Event("input", {bubbles: true}));
        field.focus({preventScroll: true});
    });
    reset();
}

/** The text field remains the save boundary; both editors share one draft. */
export function bindJournalBuilder(root: HTMLElement, deps: {
    presets: ResolvedJournalTemplate[];
    parse(text: string): {templates: JournalTemplateDef[]; invalidBlocks: number};
    serialize(templates: JournalTemplateDef[]): string;
}): void {
    const host = root.querySelector<HTMLElement>("[data-journal-builder]");
    const text = root.querySelector<HTMLTextAreaElement>("[data-journal-custom]");
    if (!host || !text) return;
    let templates: JournalTemplateDef[] = [];
    let undo: JournalTemplateDef[] | undefined;
    const sync = () => {
        text.value = deps.serialize(templates);
        text.dispatchEvent(new Event("input", {bubbles: true}));
    };
    const button = (action: string, label: string, disabled = false) => `<button type="button" class="lc-checkin__text-button" data-builder-action="${action}"${disabled ? " disabled" : ""}>${t(label)}</button>`;
    const render = () => {
        /* T-1589：构建器分段——边界说明（保存边界）+ 模板计数/必答摘要（legend 内），不重排既有内核。 */
        const templateSummary = (t2: JournalTemplateDef): string => {
            const required = t2.questions.filter(question => question.required).length;
            return t("journal.templateSummary", {n: t2.questions.length, m: required});
        };
        host.innerHTML = `<h3>${t("journal.builder")}</h3><p class="lc-checkin__journal-builder-boundary" data-builder-boundary role="note">${t("journal.builderBoundary")}</p>${button("undo", "review.undo", !undo)}${templates.map((template, i) => `<fieldset data-builder-template="${i}"><legend>${escapeHtml(template.name || "")}<small>${escapeHtml(templateSummary(template))}</small></legend><label>${t("journal.name")}<input data-builder-name maxlength="60" value="${escapeHtml(template.name || "")}" /></label>${button("remove-template", "journal.remove")}${template.questions.map((q, j) => `<div class="lc-checkin__journal-builder-question" data-builder-question="${j}"><label>${t("journal.question")} ${j + 1}<input data-builder-text maxlength="200" value="${escapeHtml(q.text || "")}" /></label><select data-builder-type aria-label="${t("journal.question")} ${j + 1}">${["text", "textarea", "slider"].map(type => `<option value="${type}"${q.type === type ? " selected" : ""}>${t(type === "text" ? "journal.typeText" : type === "slider" ? "journal.typeSlider" : "journal.typeTextarea")}</option>`).join("")}</select><label><input type="checkbox" data-builder-required${q.required ? " checked" : ""} />${t("journal.required")}</label>${button("up", "journal.moveUp", j === 0)}${button("down", "journal.moveDown", j === template.questions.length - 1)}${button("duplicate-question", "journal.duplicateQuestion", template.questions.length >= 20)}${button("remove-question", "journal.remove", template.questions.length === 1)}</div>`).join("")}${button("add-question", "journal.addQuestion", template.questions.length >= 20)}${button("preview", "journal.preview")}<div data-builder-preview></div></fieldset>`).join("")}${button("add-template", "journal.addTemplate", templates.length >= 10)}<select data-builder-preset aria-label="${t("journal.copyPreset")}">${deps.presets.map((p, i) => `<option value="${i}">${escapeHtml(p.name)}</option>`).join("")}</select>${button("copy-preset", "journal.copyPreset", templates.length >= 10)}`;
    };
    const read = () => {
        const parsed = deps.parse(text.value);
        if (parsed.invalidBlocks) { host.textContent = t("journal.customInvalid", {n: parsed.invalidBlocks}); return; }
        templates = parsed.templates;
        render();
    };
    text.addEventListener("change", read);
    host.addEventListener("input", event => {
        const input = event.target as HTMLInputElement;
        const section = input.closest<HTMLElement>("[data-builder-template]");
        const template = templates[Number(section?.dataset.builderTemplate)];
        if (!template) return;
        if (input.hasAttribute("data-builder-name")) template.name = input.value;
        const row = input.closest<HTMLElement>("[data-builder-question]");
        const question = row ? template.questions[Number(row.dataset.builderQuestion)] : undefined;
        if (question) {
            if (input.hasAttribute("data-builder-text")) question.text = input.value;
            if (input.hasAttribute("data-builder-required")) question.required = input.checked;
            if (input.hasAttribute("data-builder-type")) question.type = input.value as "text" | "textarea" | "slider";
        }
        sync();
    });
    host.addEventListener("click", event => {
        const target = (event.target as Element).closest<HTMLButtonElement>("[data-builder-action]");
        if (!target || target.disabled) return;
        const action = target.dataset.builderAction;
        if (action === "undo" && undo) { templates = undo; undo = undefined; sync(); render(); return; }
        const section = target.closest<HTMLElement>("[data-builder-template]");
        const i = Number(section?.dataset.builderTemplate);
        const template = templates[i];
        const j = Number(target.closest<HTMLElement>("[data-builder-question]")?.dataset.builderQuestion);
        if (action === "preview" && template) {
            const preview = section?.querySelector<HTMLElement>("[data-builder-preview]");
            if (preview) preview.innerHTML = template.questions.map(q => `<label class="lc-checkin__journal-question"><span>${escapeHtml(q.text || "")}${q.required ? " *" : ""}${q.prompts?.length ? ` <small class="lc-checkin__journal-pool-hint">${t("journal.poolVariants", {n: q.prompts.length})}</small>` : ""}</span>${q.type === "textarea" ? `<textarea aria-label="${escapeHtml(q.text || "")}"></textarea>` : `<input type="${q.type === "slider" ? "range" : "text"}" min="1" max="5" aria-label="${escapeHtml(q.text || "")}" />`}</label>`).join("");
            return;
        }
        if (action === "add-template" || action === "copy-preset") {
            undo = structuredClone(templates);
            if (templates.length >= 10) return;
            const preset = action === "copy-preset" ? deps.presets[Number(host.querySelector<HTMLSelectElement>("[data-builder-preset]")?.value)] : undefined;
            const id = `custom-${Array.from(crypto.getRandomValues(new Uint32Array(2)), part => part.toString(36)).join("-")}`;
            templates.push({id, icon: preset?.icon || "📝", name: preset?.name || t("journal.addTemplate"), period: "any", layout: "list", questions: preset ? preset.questions.map(q => ({...q, prompts: q.prompts ? [...q.prompts] : undefined})) : [{text: t("journal.question"), type: "textarea", required: false}]});
        } else if (template) {
            undo = structuredClone(templates);
            if (action === "remove-template") templates.splice(i, 1);
            if (action === "add-question" && template.questions.length < 20) template.questions.push({text: t("journal.question"), type: "textarea", required: false});
            if (action === "remove-question" && template.questions.length > 1) template.questions.splice(j, 1);
            if (action === "up" && j > 0) [template.questions[j - 1], template.questions[j]] = [template.questions[j], template.questions[j - 1]];
            if (action === "down" && j < template.questions.length - 1) [template.questions[j], template.questions[j + 1]] = [template.questions[j + 1], template.questions[j]];
            if (action === "duplicate-question" && template.questions.length < 20) template.questions.splice(j + 1, 0, {...template.questions[j], prompts: template.questions[j].prompts ? [...template.questions[j].prompts] : undefined});
        }
        sync();
        render();
        host.querySelector<HTMLInputElement>(`[data-builder-template="${Math.min(i || 0, templates.length - 1)}"] input`)?.focus({preventScroll: true});
    });
    host.addEventListener("keydown", event => {
        const target = event.target as HTMLElement;
        if (!target.matches("[data-builder-text]")) return;
        const row = target.closest<HTMLElement>("[data-builder-question]");
        const section = target.closest<HTMLElement>("[data-builder-template]");
        if (!row || !section || !(event.ctrlKey || event.metaKey)) return;
        const template = templates[Number(section.dataset.builderTemplate)];
        const index = Number(row.dataset.builderQuestion);
        if (!template || !Number.isInteger(index)) return;
        const move = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
        if (!move || index + move < 0 || index + move >= template.questions.length) return;
        event.preventDefault();
        undo = structuredClone(templates);
        [template.questions[index], template.questions[index + move]] = [template.questions[index + move], template.questions[index]];
        sync();
        render();
        host.querySelector<HTMLInputElement>(`[data-builder-template="${section.dataset.builderTemplate}"] [data-builder-question="${index + move}"] [data-builder-text]`)?.focus({preventScroll: true});
    });
    read();
}

export function openJournalDialogFor(deps: JournalDialogDeps): void {
    const template = deps.template;
    const questionsMarkup = template.questions
        .map((question, index) => {
            /* T-1484：有池按 ISO 周轮换取词，与 buildJournalEntryMarkdown 同一实现（同日一致）。 */
            const promptText = resolveJournalQuestionText(question, deps.localDate);
            const field =
                question.type === "slider"
                    ? `<input class="lc-checkin__journal-answer" data-journal-answer="${index}" type="range" min="1" max="5" step="1" value="3" aria-label="${escapeHtml(promptText)}" />`
                    : question.type === "text"
                        ? `<input class="lc-checkin__journal-answer" data-journal-answer="${index}" type="text" maxlength="500" aria-label="${escapeHtml(promptText)}" />`
                        : `<textarea class="lc-checkin__journal-answer" data-journal-answer="${index}" rows="3" maxlength="2000" aria-label="${escapeHtml(promptText)}"></textarea>`;
            return `<label class="lc-checkin__journal-question"><span>${question.required ? `<em aria-hidden="true">*</em> ` : ""}${escapeHtml(promptText)}</span>${field}</label>`;
        })
        .join("");
    const notebookOptions = `<option value="">${t("journal.notebookLabel")}</option>` + (deps.integration.notebookId && !deps.notebooks.some(book => book.id === deps.integration.notebookId) ? `<option value="${escapeHtml(deps.integration.notebookId)}" selected>${t("bind.notebookUnavailable")} · ${escapeHtml(deps.integration.notebookId)}</option>` : "") + deps.notebooks
        .map((notebook) => `<option value="${escapeHtml(notebook.id)}"${notebook.id === deps.integration.notebookId ? " selected" : ""}>${escapeHtml(notebook.name)}</option>`)
        .join("");
    /* T-1587：目标配置分层——已配置目标时折叠为摘要（答题优先），未配置时自动展开。 */
    const targetConfigured = Boolean(deps.integration.docId || deps.integration.notebookId) || deps.alreadyWritten;
    const targetSummaryText = deps.integration.mode === "doc"
        ? `${t("journal.targetDoc")} · ${deps.integration.docId}`
        : `${t("journal.targetDaily")}${deps.integration.notebookId ? ` · ${deps.integration.notebookId}` : ""}`;
    const configMarkup = `<details class="lc-checkin__journal-config-drawer" data-journal-config-drawer ${targetConfigured ? "" : "open"}><summary><span>${t("journal.configTitle")}</span><small>${escapeHtml(targetSummaryText)}</small></summary>
        <fieldset class="lc-checkin__journal-config"><legend>${t("journal.configTitle")}</legend>
        <label class="lc-checkin__journal-target"><input type="radio" name="journalTarget" value="daily" ${deps.integration.mode === "doc" ? "" : "checked"} /><span>${t("journal.targetDaily")}</span></label>
        <label class="lc-checkin__journal-target"><input type="radio" name="journalTarget" value="doc" ${deps.integration.mode === "doc" ? "checked" : ""} /><span>${t("journal.targetDoc")}</span></label>
        <label class="lc-checkin__journal-notebook"><span>${t("journal.notebookLabel")}</span><select name="journalNotebook" aria-label="${t("journal.notebookLabel")}">${notebookOptions}</select></label>
        <label class="lc-checkin__journal-docid"><span>${t("journal.docIdLabel")}</span><input name="journalDocId" type="text" value="${escapeHtml(deps.integration.docId)}" placeholder="20260926120000-abcdef0" /></label>
        </fieldset></details>`;
    const hostClass = deps.isMobileFrontend ? "lc-checkin-dialog-host lc-checkin-dialog-host--mobile" : "lc-checkin-dialog-host";
    const dialog = new Dialog({
        title: escapeHtml(`${template.icon} ${t("journal.dialogTitle")} · ${template.name}`),
        content: `<div class="${hostClass}"><form class="lc-checkin__journal-form" data-journal-form>${deps.alreadyWritten ? `<p class="lc-checkin__journal-hint" role="status">${t("journal.alreadyHint")}</p>` : ""}${configMarkup}${questionsMarkup}<details class="lc-checkin__journal-preview" data-journal-preview-details><summary>${t("journal.answersPreview")}</summary><pre class="lc-checkin__journal-preview-body" data-journal-preview></pre></details><div class="lc-checkin__journal-results" data-journal-results role="status" aria-live="polite" hidden></div><div class="lc-checkin__journal-actions"><button type="button" class="b3-button" data-journal-cancel>${t("journal.cancel")}</button><button type="submit" class="b3-button b3-button--text" data-journal-submit>${t("journal.submit")}</button></div></form></div>`,
        width: deps.isMobileFrontend ? "92vw" : "560px",
    });
    dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("lc-checkin-dialog");
    dialog.element.querySelector<HTMLElement>(".b3-dialog__body")?.classList.add("lc-checkin__journal-body");
    const form = dialog.element.querySelector<HTMLFormElement>("[data-journal-form]");
    if (!form) return;
    const targetField = form.querySelector<HTMLInputElement>("input[name='journalDocId']");
    if (targetField && deps.searchDocuments) bindDocumentTargetPickerFor(targetField, deps.searchDocuments);
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.querySelector(".lc-checkin__journal-actions")?.before(status);
    const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-journal-answer]"));
    fields.forEach((field, index) => {
        if (deps.draft?.[index] !== undefined) field.value = deps.draft[index];
    });
    const updateTarget = () => {
        const docMode = form.querySelector<HTMLInputElement>("input[name='journalTarget']:checked")?.value === "doc";
        const notebook = form.querySelector<HTMLElement>(".lc-checkin__journal-notebook");
        const doc = form.querySelector<HTMLElement>(".lc-checkin__journal-docid");
        if (notebook) notebook.hidden = docMode;
        if (doc) doc.hidden = !docMode;
    };
    form.querySelectorAll("input[name='journalTarget']").forEach(radio => radio.addEventListener("change", updateTarget));
    updateTarget();
    form.addEventListener("input", () => {
        deps.onDraft?.(fields.map(field => field.value));
        /* T-1588：提交前预览——答案列表与写入目标（写入内容由模板包裹，此处预览答案与去向）。 */
        const previewBody = form.querySelector<HTMLElement>("[data-journal-preview]");
        if (previewBody) {
            const answersNow = template.questions.map((question, index) => {
                const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-journal-answer="${index}"]`);
                return input ? `${index + 1}. ${input.value.trim() || t("common.emptyValue")}` : "";
            }).filter(Boolean);
            const mode = form.querySelector<HTMLInputElement>("input[name='journalTarget']:checked")?.value === "doc" ? t("journal.targetDoc") : t("journal.targetDaily");
            const destination = form.querySelector<HTMLInputElement>("input[name='journalDocId']")?.value?.trim()
                || form.querySelector<HTMLSelectElement>("select[name='journalNotebook']")?.value || "";
            previewBody.textContent = `${t("journal.previewTarget", {target: mode, destination})}\n${answersNow.join("\n")}`;
        }
    });
    form.querySelector<HTMLElement>("[data-journal-cancel]")?.addEventListener("click", () => dialog.destroy());
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const submitButton = form.querySelector<HTMLButtonElement>("[data-journal-submit]");
        if (submitButton?.disabled) return;
        status.textContent = "";
        const answers = template.questions.map((question, index) => {
            const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-journal-answer="${index}"]`);
            const value = input instanceof HTMLInputElement && input.type === "range" ? String(input.value) : (input?.value || "").trim();
            return question.type === "slider" ? `${value}/5` : value;
        });
        const missing = template.questions.findIndex((question, index) => question.required && !answers[index]);
        fields.forEach(field => field.removeAttribute("aria-invalid"));
        if (missing >= 0) {
            fields[missing]?.setAttribute("aria-invalid", "true");
            fields[missing]?.focus();
            showMessage(t("journal.requiredMissing"));
            return;
        }
        const mode = form.querySelector<HTMLInputElement>("input[name='journalTarget']:checked")?.value === "doc" ? "doc" : "daily";
        const notebookId = form.querySelector<HTMLSelectElement>("select[name='journalNotebook']")?.value || "";
        const docId = form.querySelector<HTMLInputElement>("input[name='journalDocId']")?.value?.trim() || "";
        if ((mode === "doc" && !/^\d{14}-[a-z0-9]{7}$/.test(docId)) || (mode === "daily" && !notebookId)) {
            showMessage(t("journal.targetInvalid"));
            return;
        }
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.setAttribute("aria-busy", "true");
        }
        const locked = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")).filter(input => !input.disabled);
        const submittedDraft = fields.map(field => field.value);
        locked.forEach(input => { input.disabled = true; });
        void (async () => {
            try {
                const integration = await deps.onPersistIntegration({mode, notebookId, docId}) || {mode, notebookId, docId};
                if (await deps.onSubmit(answers, integration)) {
                    deps.onDraft?.([], submittedDraft);
                    dialog.destroy();
                } else {
                    /* T-1588：文档失败——页内并列双结果（事实已保存/文档未完成）+ 独立幂等补写入口。 */
                    status.textContent = "";
                    const results = form.querySelector<HTMLElement>("[data-journal-results]");
                    if (results) {
                        results.innerHTML = `<div class="lc-checkin__journal-result-row is-ok">${escapeHtml(t("journal.resultFactSaved"))}</div><div class="lc-checkin__journal-result-row is-fail">${escapeHtml(t("journal.resultDocPending"))}</div>`;
                        results.hidden = false;
                        const backfill = document.createElement("button");
                        backfill.type = "button";
                        backfill.className = "b3-button lc-checkin__journal-backfill";
                        backfill.textContent = t("journal.resultBackfill");
                        backfill.addEventListener("click", () => {
                            backfill.disabled = true;
                            void (async () => {
                                try {
                                    if (await deps.onSubmit(answers, integration)) {
                                        deps.onDraft?.([], submittedDraft);
                                        dialog.destroy();
                                    } else {
                                        backfill.disabled = false;
                                    }
                                } catch { backfill.disabled = false; }
                            })();
                        });
                        results.appendChild(backfill);
                    }
                    showMessage(t("journal.resultDocPending"));
                }
            } catch (error) {
                const rawDetail = error instanceof Error ? error.message : typeof error === "string" ? error : "";
                status.textContent = sanitizeDiagnosticDetail(rawDetail) || t("journal.retryHint");
                showMessage(status.textContent);
            } finally {
                locked.forEach(input => { input.disabled = false; });
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.removeAttribute("aria-busy");
                }
            }
        })();
    });
}
