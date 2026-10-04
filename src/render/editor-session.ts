import type {EditorRootContext} from "../types";

type EditorControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function editorControls(root: HTMLElement): EditorControl[] {
    return [...root.querySelectorAll<EditorControl>("form input[name], form select[name], form textarea[name]")].filter(control => control.type !== "file");
}

export function captureEditorDraft(root: HTMLElement, editor: EditorRootContext): void {
    const controls = editorControls(root);
    if (!controls.length) return;
    const focusIndex = controls.indexOf(document.activeElement as EditorControl);
    const active = focusIndex >= 0 ? controls[focusIndex] : undefined;
    editor.draft = {
        controls: controls.map(control => ({name: control.name, type: control.type, value: control.value,
            ...(control instanceof HTMLInputElement ? {checked: control.checked} : {})})),
        openSections: [...root.querySelectorAll<HTMLDetailsElement>("form details")].map(section => section.open),
        focus: active ? {index: focusIndex,
            start: active instanceof HTMLSelectElement ? null : active.selectionStart,
            end: active instanceof HTMLSelectElement ? null : active.selectionEnd} : undefined,
    };
}

export function restoreEditorDraft(root: HTMLElement, editor: EditorRootContext): void {
    if (!editor.draft) return;
    const controls = editorControls(root);
    editor.draft.controls.forEach((saved, index) => {
        const control = controls[index];
        if (!control || control.name !== saved.name || control.type !== saved.type) return;
        control.value = saved.value;
        if (control instanceof HTMLInputElement && saved.checked !== undefined) control.checked = saved.checked;
    });
    root.querySelectorAll<HTMLDetailsElement>("form details").forEach((section, index) => {
        if (editor.draft?.openSections[index] !== undefined) section.open = editor.draft.openSections[index];
    });
}

export function restoreEditorFocus(root: HTMLElement, editor: EditorRootContext): void {
    const focus = editor.draft?.focus;
    if (!focus) return;
    const control = editorControls(root)[focus.index];
    if (!control) return;
    control.focus({preventScroll: true});
    if (!(control instanceof HTMLSelectElement) && focus.start !== null && focus.end !== null) control.setSelectionRange(focus.start, focus.end);
}
