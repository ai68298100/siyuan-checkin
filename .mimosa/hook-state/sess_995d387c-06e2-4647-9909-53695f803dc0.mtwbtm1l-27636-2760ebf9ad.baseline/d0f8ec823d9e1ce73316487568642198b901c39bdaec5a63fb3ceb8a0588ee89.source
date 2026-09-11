import type {UserTemplate} from "../types";
import {deleteUserTemplate, upsertUserTemplate} from "./templates";

export interface TemplateManagerState {query: string; editingId?: string; confirmDeleteId?: string; statusMessage?: string;}

export function createTemplateManagerState(): TemplateManagerState { return {query: ""}; }

export function selectTemplates(store: readonly UserTemplate[], query = ""): UserTemplate[] {
    const normalized = query.trim().toLocaleLowerCase();
    return store.filter((template) => !normalized || [template.name, template.group, template.note, template.unit].join(" ").toLocaleLowerCase().includes(normalized)).map((template) => ({...template}));
}

export function renderTemplateManager(store: readonly UserTemplate[], state: TemplateManagerState): string {
    const templates = selectTemplates(store, state.query);
    const editing = state.editingId ? store.find((template) => template.id === state.editingId) : undefined;
    const clear = state.query.trim() ? `<button type="button" data-template-action="clear-search" aria-label="清除模板筛选">清除筛选</button>` : "";
    return `<section class="lc-template-manager" aria-labelledby="template-manager-title"><header><div><span class="lc-checkin__eyebrow">我的模板</span><h2 id="template-manager-title">常用打卡模板</h2><p>保存自己的打卡方式，下次新建时直接套用。</p></div><button type="button" data-template-action="new" aria-label="新建模板">新建模板</button></header>${state.statusMessage ? `<p class="lc-template-manager__status" role="status">${escapeHtml(state.statusMessage)}</p>` : ""}<label class="lc-template-manager__search"><span>搜索模板</span><input type="search" data-template-query value="${escapeHtml(state.query)}" placeholder="搜索名称、分组或备注" aria-controls="template-manager-list" />${clear}</label>${editing ? renderTemplateForm(editing) : ""}<div class="lc-template-manager__count" aria-live="polite">${templates.length} 个模板</div><div class="lc-template-manager__list" id="template-manager-list">${templates.length ? templates.map((template) => renderTemplateCard(template, state.confirmDeleteId)).join("") : `<p class="lc-template-manager__empty" role="status">${state.query.trim() ? "没有匹配的模板" : "还没有自定义模板"}</p>`}</div></section>`;
}

export function saveManagedTemplate(store: readonly UserTemplate[], input: Partial<UserTemplate>): UserTemplate[] { return upsertUserTemplate(store, input); }
export function removeManagedTemplate(store: readonly UserTemplate[], id: string): UserTemplate[] { return deleteUserTemplate(store, id); }

function renderTemplateCard(template: UserTemplate, confirmDeleteId?: string): string { const confirming = confirmDeleteId === template.id; return `<article class="lc-template-card" data-template-id="${escapeHtml(template.id)}" aria-labelledby="template-title-${escapeHtml(template.id)}"><span class="lc-template-card__icon" aria-hidden="true">${escapeHtml(template.icon)}</span><div><h3 id="template-title-${escapeHtml(template.id)}">${escapeHtml(template.name)}</h3><p>${escapeHtml(template.group || "未分组")} · ${escapeHtml(template.target === 1 && template.kind === "binary" ? "完成一次" : `${template.target} ${template.unit}`)}</p>${template.note ? `<small>${escapeHtml(template.note)}</small>` : ""}</div><div class="lc-template-card__actions">${confirming ? `<span role="alert">确定删除？</span><button type="button" data-template-action="delete-confirm" data-template-id="${escapeHtml(template.id)}" aria-label="确认删除${escapeHtml(template.name)}">确认</button><button type="button" data-template-action="delete-cancel" data-template-id="${escapeHtml(template.id)}" aria-label="取消删除${escapeHtml(template.name)}">取消</button>` : `<button type="button" data-template-action="edit" data-template-id="${escapeHtml(template.id)}" aria-label="编辑${escapeHtml(template.name)}">编辑</button><button type="button" data-template-action="delete" data-template-id="${escapeHtml(template.id)}" aria-label="删除${escapeHtml(template.name)}">删除</button>`}</div></article>`; }
function renderTemplateForm(template: UserTemplate): string { return `<form class="lc-template-form" data-template-form><h3>编辑模板</h3><input type="hidden" name="id" value="${escapeHtml(template.id)}" /><label>名称<input name="name" required maxlength="64" value="${escapeHtml(template.name)}" /></label><label>分组<input name="group" maxlength="32" value="${escapeHtml(template.group)}" /></label><label>备注<textarea name="note" maxlength="240">${escapeHtml(template.note)}</textarea></label><div><button type="submit">保存</button><button type="button" data-template-action="cancel">取消</button></div></form>`; }
function escapeHtml(value: unknown): string { return String(value).replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[character] || character)); }
