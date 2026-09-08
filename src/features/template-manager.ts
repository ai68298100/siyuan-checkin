import type {StoredTemplate, TemplateStore} from "./templates";
import {deleteTemplate, listActiveTemplates, upsertTemplate} from "./templates";

export interface TemplateManagerState {query: string; editingId?: string; confirmDeleteId?: string;}

export function createTemplateManagerState(): TemplateManagerState { return {query: ""}; }

export function selectTemplates(store: TemplateStore, query = ""): StoredTemplate[] {
    const normalized = query.trim().toLocaleLowerCase();
    return listActiveTemplates(store).filter((template) => !normalized || [template.name, template.group, template.note, template.unit].join(" ").toLocaleLowerCase().includes(normalized));
}

export function renderTemplateManager(store: TemplateStore, state: TemplateManagerState): string {
    const templates = selectTemplates(store, state.query);
    const editing = state.editingId ? store.templates.find((template) => template.id === state.editingId) : undefined;
    return `<section class="lc-template-manager" aria-labelledby="template-manager-title"><header><div><span class="lc-checkin__eyebrow">我的模板</span><h2 id="template-manager-title">常用打卡模板</h2><p>保存自己的打卡方式，下次新建时直接套用。</p></div><button type="button" data-template-action="new">新建模板</button></header><label class="lc-template-manager__search"><span>搜索模板</span><input type="search" data-template-query value="${escapeHtml(state.query)}" placeholder="搜索名称、分组或备注" /></label>${editing ? renderTemplateForm(editing) : ""}<div class="lc-template-manager__count">${templates.length} 个模板</div><div class="lc-template-manager__list">${templates.length ? templates.map(renderTemplateCard).join("") : `<p class="lc-template-manager__empty">没有匹配的模板</p>`}</div></section>`;
}

export function saveManagedTemplate(store: TemplateStore, input: Partial<StoredTemplate>, now = new Date()): TemplateStore { return upsertTemplate(store, input, now); }
export function removeManagedTemplate(store: TemplateStore, id: string, now = new Date()): TemplateStore { return deleteTemplate(store, id, now); }

function renderTemplateCard(template: StoredTemplate): string { return `<article class="lc-template-card" data-template-id="${escapeHtml(template.id)}"><span class="lc-template-card__icon">${escapeHtml(template.icon)}</span><div><h3>${escapeHtml(template.name)}</h3><p>${escapeHtml(template.group || "未分组")} · ${escapeHtml(template.target === 1 && template.kind === "binary" ? "完成一次" : `${template.target} ${template.unit}`)}</p>${template.note ? `<small>${escapeHtml(template.note)}</small>` : ""}</div><div class="lc-template-card__actions"><button type="button" data-template-action="edit" data-template-id="${escapeHtml(template.id)}" aria-label="编辑${escapeHtml(template.name)}">编辑</button><button type="button" data-template-action="delete" data-template-id="${escapeHtml(template.id)}" aria-label="删除${escapeHtml(template.name)}">删除</button></div></article>`; }
function renderTemplateForm(template: StoredTemplate): string { return `<form class="lc-template-form" data-template-form><h3>编辑模板</h3><input type="hidden" name="id" value="${escapeHtml(template.id)}" /><label>名称<input name="name" required maxlength="64" value="${escapeHtml(template.name)}" /></label><label>分组<input name="group" maxlength="32" value="${escapeHtml(template.group)}" /></label><label>备注<textarea name="note" maxlength="240">${escapeHtml(template.note)}</textarea></label><div><button type="submit">保存</button><button type="button" data-template-action="cancel">取消</button></div></form>`; }
function escapeHtml(value: unknown): string { return String(value).replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[character] || character)); }
