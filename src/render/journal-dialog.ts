/* T-1465（D-273）问卷日记弹窗：模板问题表单 + 写入目标配置。
   事实层先行（宿主在 onSubmit 里先 recordEvent），文档写入是尽力而为旁路；
   弹窗复用 siyuan Dialog，宿主类注入沿用 quick-dialog 模式（双主题/移动触控基线生效）。
   提交按钮在等待期间禁用防重复提交；必答题缺失 fail-closed。 */
import {t} from "../i18n";
import {showMessage, Dialog} from "siyuan";
import {escapeHtml} from "../shared";
import type {JournalIntegration, ResolvedJournalTemplate} from "../features/journal-templates";

export interface JournalDialogDeps {
    template: ResolvedJournalTemplate;
    integration: JournalIntegration;
    notebooks: ReadonlyArray<{id: string; name: string}>;
    alreadyWritten: boolean;
    isMobileFrontend: boolean;
    onPersistIntegration(integration: JournalIntegration): void;
    onSubmit(answers: readonly string[]): Promise<void>;
}

export function openJournalDialogFor(deps: JournalDialogDeps): void {
    const template = deps.template;
    const questionsMarkup = template.questions
        .map((question, index) => {
            const field =
                question.type === "slider"
                    ? `<input class="lc-checkin__journal-answer" data-journal-answer="${index}" type="range" min="1" max="5" step="1" value="3" aria-label="${escapeHtml(question.text)}" />`
                    : question.type === "text"
                        ? `<input class="lc-checkin__journal-answer" data-journal-answer="${index}" type="text" maxlength="500" aria-label="${escapeHtml(question.text)}" />`
                        : `<textarea class="lc-checkin__journal-answer" data-journal-answer="${index}" rows="3" maxlength="2000" aria-label="${escapeHtml(question.text)}"></textarea>`;
            return `<label class="lc-checkin__journal-question"><span>${question.required ? `<em aria-hidden="true">*</em> ` : ""}${escapeHtml(question.text)}</span>${field}</label>`;
        })
        .join("");
    const notebookOptions = deps.notebooks
        .map((notebook) => `<option value="${escapeHtml(notebook.id)}"${notebook.id === deps.integration.notebookId ? " selected" : ""}>${escapeHtml(notebook.name)}</option>`)
        .join("");
    const configMarkup = `<fieldset class="lc-checkin__journal-config"><legend>${t("journal.configTitle")}</legend>
        <label class="lc-checkin__journal-target"><input type="radio" name="journalTarget" value="daily" ${deps.integration.mode === "doc" ? "" : "checked"} /><span>${t("journal.targetDaily")}</span></label>
        <label class="lc-checkin__journal-target"><input type="radio" name="journalTarget" value="doc" ${deps.integration.mode === "doc" ? "checked" : ""} /><span>${t("journal.targetDoc")}</span></label>
        <label class="lc-checkin__journal-notebook"><span>${t("journal.notebookLabel")}</span><select name="journalNotebook" aria-label="${t("journal.notebookLabel")}">${notebookOptions}</select></label>
        <label class="lc-checkin__journal-docid"><span>${t("journal.docIdLabel")}</span><input name="journalDocId" type="text" value="${escapeHtml(deps.integration.docId)}" placeholder="20260926120000-abcdef0" /></label>
        </fieldset>`;
    const hostClass = deps.isMobileFrontend ? "lc-checkin-dialog-host lc-checkin-dialog-host--mobile" : "lc-checkin-dialog-host";
    const dialog = new Dialog({
        title: `${template.icon} ${t("journal.dialogTitle")} · ${template.name}`,
        content: `<div class="${hostClass}"><form class="lc-checkin__journal-form" data-journal-form>${deps.alreadyWritten ? `<p class="lc-checkin__journal-hint" role="status">${t("journal.alreadyHint")}</p>` : ""}${configMarkup}${questionsMarkup}<div class="lc-checkin__journal-actions"><button type="button" class="b3-button" data-journal-cancel>${t("journal.cancel")}</button><button type="submit" class="b3-button b3-button--text" data-journal-submit>${t("journal.submit")}</button></div></form></div>`,
        width: deps.isMobileFrontend ? "92vw" : "560px",
    });
    dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("lc-checkin-dialog");
    dialog.element.querySelector<HTMLElement>(".b3-dialog__body")?.classList.add("lc-checkin__journal-body");
    const form = dialog.element.querySelector<HTMLFormElement>("[data-journal-form]");
    if (!form) return;
    form.querySelector<HTMLElement>("[data-journal-cancel]")?.addEventListener("click", () => dialog.destroy());
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const submitButton = form.querySelector<HTMLButtonElement>("[data-journal-submit]");
        if (submitButton?.disabled) return;
        const answers = template.questions.map((question, index) => {
            const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-journal-answer="${index}"]`);
            const value = input instanceof HTMLInputElement && input.type === "range" ? String(input.value) : (input?.value || "").trim();
            return question.type === "slider" ? `${value}/5` : value;
        });
        const missing = template.questions.some((question, index) => question.required && !answers[index]);
        if (missing) {
            showMessage(t("journal.requiredMissing"));
            return;
        }
        const mode = form.querySelector<HTMLInputElement>("input[name='journalTarget']:checked")?.value === "doc" ? "doc" : "daily";
        const notebookId = form.querySelector<HTMLSelectElement>("select[name='journalNotebook']")?.value || "";
        const docId = form.querySelector<HTMLInputElement>("input[name='journalDocId']")?.value?.trim() || "";
        deps.onPersistIntegration({mode, notebookId, docId});
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.setAttribute("aria-busy", "true");
        }
        void deps
            .onSubmit(answers)
            .catch(() => undefined)
            .then(() => dialog.destroy());
    });
}
